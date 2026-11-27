const { randomUUID } = require("node:crypto");
const { lockUserPair } = require("./userPairLock");
const {
    buildNotBlockedFilter,
    isBlockedBetween
} = require("./visibilityFilters");

const PEER_SELECT = {
    id_user: true,
    username: true,
    display_name: true,
    profile_photo_url: true,
    is_private: true
};

const MESSAGE_SELECT = {
    id_message: true,
    id_sender: true,
    id_recipient: true,
    content: true,
    sent_at: true
};

const CONVERSATION_LIST_SELECT = {
    id_conversation: true,
    id_user_1: true,
    User_Conversation_id_user_1ToUser: { select: PEER_SELECT },
    User_Conversation_id_user_2ToUser: { select: PEER_SELECT },
    Message: {
        select: { id_sender: true, content: true, sent_at: true },
        orderBy: [{ sent_at: "desc" }, { id_message: "desc" }],
        take: 1
    }
};

/**
 * Orders two account ids the way Conversation stores them (id_user_1 before id_user_2).
 *
 * @param {string} firstUserId - One participant uuid.
 * @param {string} secondUserId - The other participant uuid.
 * @returns {{ id_user_1: string, id_user_2: string }} Stored pair of participants.
 */
function orderPair(firstUserId, secondUserId) {
    const [userOneId, userTwoId] = [firstUserId, secondUserId].map((id) => id.toLowerCase()).sort();
    return { id_user_1: userOneId, id_user_2: userTwoId };
}

/**
 * Builds the filter for conversations of an account whose peer is active and not blocked.
 *
 * @param {string} userId - Account that owns the inbox.
 * @returns {object} Prisma where clause.
 */
function buildConversationWhere(userId) {
    return {
        Message: { some: {} },
        OR: [
            {
                id_user_1: userId,
                User_Conversation_id_user_2ToUser: { account_status: "ACTIVE", ...buildNotBlockedFilter(userId) }
            },
            {
                id_user_2: userId,
                User_Conversation_id_user_1ToUser: { account_status: "ACTIVE", ...buildNotBlockedFilter(userId) }
            }
        ]
    };
}

/**
 * Converts a conversation row into the inbox shape, using the peer and the latest message.
 *
 * @param {object} conversation - Conversation row selected with CONVERSATION_LIST_SELECT.
 * @param {string} userId - Account that owns the inbox.
 * @returns {object} Inbox entry with peer fields and last message fields.
 */
function mapConversation(conversation, userId) {
    const isFirstParticipant = conversation.id_user_1 === userId.toLowerCase();
    const peer = isFirstParticipant
        ? conversation.User_Conversation_id_user_2ToUser
        : conversation.User_Conversation_id_user_1ToUser;
    const [lastMessage] = conversation.Message;

    return {
        id_conversation: conversation.id_conversation,
        ...peer,
        last_content: lastMessage.content,
        last_sent_at: lastMessage.sent_at,
        last_sender_id: lastMessage.id_sender
    };
}

/**
 * Sorts inbox entries by last message date, newest first, breaking ties by conversation id.
 *
 * @param {object} first - Inbox entry.
 * @param {object} second - Inbox entry.
 * @returns {number} Sort order for Array.prototype.sort.
 */
function compareNewestFirst(first, second) {
    const byDate = second.last_sent_at - first.last_sent_at;
    if (byDate !== 0) {
        return byDate;
    }
    return first.id_conversation < second.id_conversation ? 1 : -1;
}

/**
 * Checks whether the follower account follows the followed account.
 *
 * @param {import("@prisma/client").Prisma.TransactionClient} tx - Transaction client.
 * @param {string} followerId - Follower account.
 * @param {string} followedId - Followed account.
 * @returns {Promise<boolean>} True when the follow exists.
 */
async function isFollowing(tx, followerId, followedId) {
    const follow = await tx.follows.findUnique({
        where: { id_follower_id_followed: { id_follower: followerId, id_followed: followedId } },
        select: { id_follower: true }
    });
    return follow !== null;
}

/**
 * Creates the repository for private conversations and their messages. Every read
 * hides accounts blocked in either direction and deactivated accounts.
 *
 * @param {import("@prisma/client").PrismaClient} prisma - Prisma client instance.
 * @returns {object} Message repository operations.
 */
function createMessagesRepository(prisma) {
    /**
     * Finds an active peer that is not blocked with the viewer.
     *
     * @param {string} peerId - Account to inspect.
     * @param {string} viewerId - Account that performs the request.
     * @returns {Promise<object|null>} The visible peer or null.
     */
    async function findVisiblePeer(peerId, viewerId) {
        return prisma.user.findFirst({
            where: { id_user: peerId, account_status: "ACTIVE", ...buildNotBlockedFilter(viewerId) },
            select: PEER_SELECT
        });
    }

    /**
     * Evaluates the rules that gate a send: recipient availability, blocks and
     * mutual follow when either account is private.
     *
     * @param {import("@prisma/client").Prisma.TransactionClient} tx - Transaction holding the pair lock.
     * @param {string} senderId - Account that sends the message.
     * @param {string} recipientId - Account that receives the message.
     * @returns {Promise<"allowed"|"unavailable"|"follow_required">} Send decision.
     */
    async function evaluateSend(tx, senderId, recipientId) {
        const [sender, recipient, blocked, senderFollows, recipientFollows] = await Promise.all([
            tx.user.findUnique({ where: { id_user: senderId }, select: { is_private: true } }),
            tx.user.findUnique({
                where: { id_user: recipientId },
                select: { is_private: true, account_status: true }
            }),
            isBlockedBetween(tx, senderId, recipientId),
            isFollowing(tx, senderId, recipientId),
            isFollowing(tx, recipientId, senderId)
        ]);
        if (!recipient || recipient.account_status !== "ACTIVE" || blocked) {
            return "unavailable";
        }
        const requiresMutualFollow = sender?.is_private || recipient.is_private;
        if (requiresMutualFollow && !(senderFollows && recipientFollows)) {
            return "follow_required";
        }
        return "allowed";
    }

    /**
     * Stores a message and creates its conversation when it is the first one.
     * The whole send runs in one transaction serialized with follows and blocks.
     *
     * @param {string} senderId - Account that sends the message.
     * @param {string} recipientId - Account that receives the message.
     * @param {string} content - Trimmed message text.
     * @returns {Promise<{status: "sent", message: object}|{status: "unavailable"|"follow_required"}>}
     * Send outcome.
     */
    async function sendMessage(senderId, recipientId, content) {
        return prisma.$transaction(async (tx) => {
            await lockUserPair(tx, senderId, recipientId);
            const decision = await evaluateSend(tx, senderId, recipientId);
            if (decision !== "allowed") {
                return { status: decision };
            }
            const pair = orderPair(senderId, recipientId);
            const conversation = await tx.conversation.upsert({
                where: { id_user_1_id_user_2: pair },
                create: { id_conversation: randomUUID(), ...pair },
                update: {},
                select: { id_conversation: true }
            });
            const message = await tx.message.create({
                data: {
                    id_message: randomUUID(),
                    id_conversation: conversation.id_conversation,
                    id_sender: senderId,
                    id_recipient: recipientId,
                    content
                },
                select: MESSAGE_SELECT
            });
            return { status: "sent", message };
        });
    }

    /**
     * Lists the visible conversations of an account, most recent first.
     *
     * @param {string} userId - Account that owns the inbox.
     * @param {number} limit - Maximum number of rows.
     * @param {number} offset - Rows to skip.
     * @returns {Promise<Array<object>>} Conversations with peer and last message.
     */
    async function listConversations(userId, limit, offset) {
        const conversations = await prisma.conversation.findMany({
            where: buildConversationWhere(userId),
            select: CONVERSATION_LIST_SELECT
        });

        return conversations
            .map((conversation) => mapConversation(conversation, userId))
            .sort(compareNewestFirst)
            .slice(offset, offset + limit);
    }

    /**
     * Counts the visible conversations of an account.
     *
     * @param {string} userId - Account that owns the inbox.
     * @returns {Promise<number>} Number of visible conversations.
     */
    async function countConversations(userId) {
        return prisma.conversation.count({ where: buildConversationWhere(userId) });
    }

    /**
     * Reads one page of the history between two accounts, oldest first within the page.
     *
     * @param {string} viewerId - Participant that requests the history.
     * @param {string} peerId - The other participant.
     * @param {number} limit - Maximum number of messages.
     * @param {number} offset - Messages to skip counting from the newest.
     * @returns {Promise<Array<object>>} Messages in chronological order.
     */
    async function listThreadMessages(viewerId, peerId, limit, offset) {
        const messages = await prisma.message.findMany({
            where: { Conversation: orderPair(viewerId, peerId) },
            select: MESSAGE_SELECT,
            orderBy: [{ sent_at: "desc" }, { id_message: "desc" }],
            skip: offset,
            take: limit
        });
        return messages.toReversed();
    }

    /**
     * Counts all stored messages between two accounts.
     *
     * @param {string} viewerId - One participant.
     * @param {string} peerId - The other participant.
     * @returns {Promise<number>} Message count.
     */
    async function countThreadMessages(viewerId, peerId) {
        return prisma.message.count({ where: { Conversation: orderPair(viewerId, peerId) } });
    }

    return {
        findVisiblePeer,
        sendMessage,
        listConversations,
        countConversations,
        listThreadMessages,
        countThreadMessages
    };
}

module.exports = {
    createMessagesRepository
};
