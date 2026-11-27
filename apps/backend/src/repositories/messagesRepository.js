const { randomUUID } = require("node:crypto");
const { lockUserPair } = require("./userPairLock");

const PEER_COLUMNS = `
    u."id_user", u."username", u."display_name", u."profile_photo_url", u."is_private"
`;

const FIND_VISIBLE_PEER_SQL = `
SELECT ${PEER_COLUMNS}
FROM "User" u
WHERE u."id_user" = $1
  AND u."account_status" = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = $2 AND b."id_blocked" = u."id_user")
       OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $2)
  )
`;

const FIND_SEND_STATE_SQL = `
SELECT
    (SELECT "is_private" FROM "User" WHERE "id_user" = $1) AS "sender_private",
    r."is_private" AS "recipient_private",
    r."account_status" AS "recipient_status",
    EXISTS (
        SELECT 1 FROM "Blocks"
        WHERE ("id_blocker" = $1 AND "id_blocked" = $2)
           OR ("id_blocker" = $2 AND "id_blocked" = $1)
    ) AS "blocked",
    EXISTS (
        SELECT 1 FROM "Follows" WHERE "id_follower" = $1 AND "id_followed" = $2
    ) AS "sender_follows",
    EXISTS (
        SELECT 1 FROM "Follows" WHERE "id_follower" = $2 AND "id_followed" = $1
    ) AS "recipient_follows"
FROM "User" r
WHERE r."id_user" = $2
`;

const UPSERT_CONVERSATION_SQL = `
INSERT INTO "Conversation" ("id_conversation", "id_user_1", "id_user_2")
VALUES ($1::uuid, LEAST($2::uuid, $3::uuid), GREATEST($2::uuid, $3::uuid))
ON CONFLICT ("id_user_1", "id_user_2") DO UPDATE SET "id_user_1" = EXCLUDED."id_user_1"
RETURNING "id_conversation"
`;

const INSERT_MESSAGE_SQL = `
INSERT INTO "Message" ("id_message", "id_conversation", "id_sender", "id_recipient", "content")
VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5)
RETURNING "id_message", "id_sender", "id_recipient", "content", "sent_at"
`;

const LIST_CONVERSATIONS_SQL = `
SELECT c."id_conversation", ${PEER_COLUMNS},
       last."content" AS "last_content", last."sent_at" AS "last_sent_at",
       last."id_sender" AS "last_sender_id"
FROM "Conversation" c
INNER JOIN "User" u ON u."id_user" = CASE
    WHEN c."id_user_1" = $1::uuid THEN c."id_user_2"
    ELSE c."id_user_1"
END
INNER JOIN LATERAL (
    SELECT m."content", m."sent_at", m."id_sender"
    FROM "Message" m
    WHERE m."id_conversation" = c."id_conversation"
    ORDER BY m."sent_at" DESC, m."id_message" DESC
    LIMIT 1
) last ON true
WHERE (c."id_user_1" = $1::uuid OR c."id_user_2" = $1::uuid)
  AND u."account_status" = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = $1::uuid AND b."id_blocked" = u."id_user")
       OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $1::uuid)
  )
ORDER BY last."sent_at" DESC, c."id_conversation" DESC
LIMIT $2 OFFSET $3
`;

const COUNT_CONVERSATIONS_SQL = `
SELECT count(*) FROM "Conversation" c
INNER JOIN "User" u ON u."id_user" = CASE
    WHEN c."id_user_1" = $1::uuid THEN c."id_user_2"
    ELSE c."id_user_1"
END
WHERE (c."id_user_1" = $1::uuid OR c."id_user_2" = $1::uuid)
  AND u."account_status" = 'ACTIVE'
  AND EXISTS (SELECT 1 FROM "Message" m WHERE m."id_conversation" = c."id_conversation")
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = $1::uuid AND b."id_blocked" = u."id_user")
       OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $1::uuid)
  )
`;

const THREAD_FILTER_SQL = `
FROM "Message" m
INNER JOIN "Conversation" c ON c."id_conversation" = m."id_conversation"
WHERE c."id_user_1" = LEAST($1::uuid, $2::uuid)
  AND c."id_user_2" = GREATEST($1::uuid, $2::uuid)
`;

const LIST_THREAD_MESSAGES_SQL = `
SELECT * FROM (
    SELECT m."id_message", m."id_sender", m."id_recipient", m."content", m."sent_at"
    ${THREAD_FILTER_SQL}
    ORDER BY m."sent_at" DESC, m."id_message" DESC
    LIMIT $3 OFFSET $4
) recent
ORDER BY "sent_at" ASC, "id_message" ASC
`;

const COUNT_THREAD_MESSAGES_SQL = `
SELECT count(*) ${THREAD_FILTER_SQL}
`;

/**
 * Creates the repository for private conversations and their messages. Every read
 * hides accounts blocked in either direction and deactivated accounts.
 *
 * @param {import("pg").Pool} pool - PostgreSQL connection pool.
 * @returns {object} Message repository operations.
 */
function createMessagesRepository(pool) {
    /**
     * Finds an active peer that is not blocked with the viewer.
     *
     * @param {string} peerId - Account to inspect.
     * @param {string} viewerId - Account that performs the request.
     * @returns {Promise<object|null>} The visible peer or null.
     */
    async function findVisiblePeer(peerId, viewerId) {
        const result = await pool.query(FIND_VISIBLE_PEER_SQL, [peerId, viewerId]);
        return result.rows[0] || null;
    }

    /**
     * Evaluates the rules that gate a send: recipient availability, blocks and
     * mutual follow when either account is private.
     *
     * @param {import("pg").PoolClient} client - Transaction client holding the pair lock.
     * @param {string} senderId - Account that sends the message.
     * @param {string} recipientId - Account that receives the message.
     * @returns {Promise<"allowed"|"unavailable"|"follow_required">} Send decision.
     */
    async function evaluateSend(client, senderId, recipientId) {
        const result = await client.query(FIND_SEND_STATE_SQL, [senderId, recipientId]);
        const state = result.rows[0];
        if (!state || state.recipient_status !== "ACTIVE" || state.blocked) {
            return "unavailable";
        }
        const requiresMutualFollow = state.sender_private || state.recipient_private;
        if (requiresMutualFollow && !(state.sender_follows && state.recipient_follows)) {
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
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await lockUserPair(client, senderId, recipientId);
            const decision = await evaluateSend(client, senderId, recipientId);
            if (decision !== "allowed") {
                await client.query("ROLLBACK");
                return { status: decision };
            }
            const conversation = await client.query(UPSERT_CONVERSATION_SQL, [
                randomUUID(),
                senderId,
                recipientId
            ]);
            const message = await client.query(INSERT_MESSAGE_SQL, [
                randomUUID(),
                conversation.rows[0].id_conversation,
                senderId,
                recipientId,
                content
            ]);
            await client.query("COMMIT");
            return { status: "sent", message: message.rows[0] };
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
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
        const result = await pool.query(LIST_CONVERSATIONS_SQL, [userId, limit, offset]);
        return result.rows;
    }

    /**
     * Counts the visible conversations of an account.
     *
     * @param {string} userId - Account that owns the inbox.
     * @returns {Promise<number>} Number of visible conversations.
     */
    async function countConversations(userId) {
        const result = await pool.query(COUNT_CONVERSATIONS_SQL, [userId]);
        return Number(result.rows[0].count);
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
        const result = await pool.query(LIST_THREAD_MESSAGES_SQL, [
            viewerId,
            peerId,
            limit,
            offset
        ]);
        return result.rows;
    }

    /**
     * Counts all stored messages between two accounts.
     *
     * @param {string} viewerId - One participant.
     * @param {string} peerId - The other participant.
     * @returns {Promise<number>} Message count.
     */
    async function countThreadMessages(viewerId, peerId) {
        const result = await pool.query(COUNT_THREAD_MESSAGES_SQL, [viewerId, peerId]);
        return Number(result.rows[0].count);
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
