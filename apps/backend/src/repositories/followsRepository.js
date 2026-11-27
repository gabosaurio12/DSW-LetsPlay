const { lockUserPair } = require("./userPairLock");
const { buildNotBlockedFilter, isBlockedBetween } = require("./visibilityFilters");

const RECORD_NOT_FOUND_CODE = "P2025";

const USER_SELECT = {
    id_user: true,
    username: true,
    display_name: true,
    description: true,
    profile_photo_url: true,
    is_private: true
};

/**
 * Resolves an outgoing relationship to its public state.
 *
 * @param {import("@prisma/client").PrismaClient|import("@prisma/client").Prisma.TransactionClient} client - Prisma client or transaction.
 * @param {string} followerId - Follower account.
 * @param {string} followedId - Target account.
 * @returns {Promise<"following"|"pending"|"none">} Relationship state.
 */
async function resolveConnectionState(client, followerId, followedId) {
    const key = { id_follower_id_followed: { id_follower: followerId, id_followed: followedId } };
    const [follow, request] = await Promise.all([
        client.follows.findUnique({ where: key, select: { id_follower: true } }),
        client.followRequests.findUnique({ where: key, select: { id_follower: true } })
    ]);
    if (follow) {
        return "following";
    }
    return request ? "pending" : "none";
}

/**
 * Creates the repository that owns all follow relationship queries. Every read
 * hides accounts linked by a block in either direction with the viewer.
 *
 * @param {import("@prisma/client").PrismaClient} prisma - Prisma client instance.
 * @returns {{
 *   findVisibleUser: Function,
 *   findFollowState: Function,
 *   findConnectionState: Function,
 *   findPrivacy: Function,
 *   updatePrivacy: Function,
 *   resolveFollowRequest: Function,
 *   listIncomingRequests: Function,
 *   countIncomingRequests: Function,
 *   findFollowStates: Function,
 *   findPendingStates: Function,
 *   countFollows: Function,
 *   addFollow: Function,
 *   removeFollow: Function,
 *   listFollowers: Function,
 *   listFollowing: Function
 * }} Follow repository operations.
 */
function createFollowsRepository(prisma) {
    /**
     * Finds an active account that is not blocked with the viewer.
     *
     * @param {string} userId - Account to inspect.
     * @param {string} viewerId - Account that performs the request.
     * @returns {Promise<object|null>} The visible profile or null.
     */
    async function findVisibleUser(userId, viewerId) {
        return prisma.user.findFirst({
            where: {
                id_user: userId,
                account_status: "ACTIVE",
                ...buildNotBlockedFilter(viewerId)
            },
            select: USER_SELECT
        });
    }

    /**
     * Checks whether one account follows another.
     *
     * @param {string} followerId - Follower account.
     * @param {string} followedId - Followed account.
     * @returns {Promise<boolean>} True when the relationship exists.
     */
    async function findFollowState(followerId, followedId) {
        const follow = await prisma.follows.findUnique({
            where: { id_follower_id_followed: { id_follower: followerId, id_followed: followedId } },
            select: { id_follower: true }
        });
        return follow !== null;
    }

    /**
     * Resolves an outgoing follow relationship to its public state.
     *
     * @param {string} followerId - Follower account.
     * @param {string} followedId - Target account.
     * @returns {Promise<"following"|"pending"|"none">} Relationship state.
     */
    async function findConnectionState(followerId, followedId) {
        return resolveConnectionState(prisma, followerId, followedId);
    }

    /**
     * Reads an active account's privacy setting.
     *
     * @param {string} userId - Account uuid.
     * @returns {Promise<boolean|null>} Privacy setting or null for unavailable accounts.
     */
    async function findPrivacy(userId) {
        const user = await prisma.user.findFirst({
            where: { id_user: userId, account_status: "ACTIVE" },
            select: { is_private: true }
        });
        return user?.is_private ?? null;
    }

    /**
     * Changes privacy while serializing against the account's own row lock.
     *
     * @param {string} userId - Account uuid.
     * @param {boolean} isPrivate - New privacy setting.
     * @returns {Promise<boolean|null>} Saved state or null for unavailable accounts.
     */
    async function updatePrivacy(userId, isPrivate) {
        return prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT "id_user" FROM "User" WHERE "id_user" = ${userId}::uuid FOR UPDATE`;
            try {
                const user = await tx.user.update({
                    where: { id_user: userId, account_status: "ACTIVE" },
                    data: { is_private: isPrivate, updated_at: new Date() },
                    select: { is_private: true }
                });
                return user.is_private;
            } catch (error) {
                if (error.code === RECORD_NOT_FOUND_CODE) {
                    return null;
                }
                throw error;
            }
        });
    }

    /**
     * Accepts or rejects a pending follow request on behalf of its recipient.
     *
     * @param {string} recipientId - Account that owns the request.
     * @param {string} requesterId - Account that sent the request.
     * @param {"accept"|"reject"} decision - Request decision.
     * @returns {Promise<boolean>} Whether a pending request was resolved.
     */
    async function resolveFollowRequest(recipientId, requesterId, decision) {
        return prisma.$transaction(async (tx) => {
            await lockUserPair(tx, recipientId, requesterId);
            const deleted = await tx.followRequests.deleteMany({
                where: { id_follower: requesterId, id_followed: recipientId }
            });
            if (deleted.count === 0) {
                return false;
            }
            if (decision === "accept") {
                if (await isBlockedBetween(tx, recipientId, requesterId)) {
                    return false;
                }
                await tx.follows.createMany({
                    data: [{ id_follower: requesterId, id_followed: recipientId }],
                    skipDuplicates: true
                });
            }
            return true;
        });
    }

    /**
     * Lists pending requests received by an account.
     *
     * @param {string} recipientId - Account that received requests.
     * @param {number} limit - Maximum number of rows.
     * @param {number} offset - Rows to skip.
     * @returns {Promise<Array<object>>} Pending requester profiles.
     */
    async function listIncomingRequests(recipientId, limit, offset) {
        const requests = await prisma.followRequests.findMany({
            where: {
                id_followed: recipientId,
                User_FollowRequests_id_followerToUser: {
                    account_status: "ACTIVE",
                    ...buildNotBlockedFilter(recipientId)
                }
            },
            select: {
                requested_at: true,
                User_FollowRequests_id_followerToUser: {
                    select: { id_user: true, username: true, display_name: true, profile_photo_url: true }
                }
            },
            orderBy: [{ requested_at: "asc" }, { User_FollowRequests_id_followerToUser: { id_user: "asc" } }],
            skip: offset,
            take: limit
        });

        return requests.map((request) => ({
            ...request.User_FollowRequests_id_followerToUser,
            requested_at: request.requested_at
        }));
    }

    /**
     * Counts pending requests visible to the recipient.
     *
     * @param {string} recipientId - Account that received requests.
     * @returns {Promise<number>} Pending request count.
     */
    async function countIncomingRequests(recipientId) {
        return prisma.followRequests.count({
            where: {
                id_followed: recipientId,
                User_FollowRequests_id_followerToUser: {
                    account_status: "ACTIVE",
                    ...buildNotBlockedFilter(recipientId)
                }
            }
        });
    }

    /**
     * Checks which accounts of a batch are followed by the viewer.
     *
     * @param {string} viewerId - Follower account.
     * @param {Array<string>} userIds - Candidate accounts.
     * @returns {Promise<Array<string>>} Ids of accounts followed by the viewer.
     */
    async function findFollowStates(viewerId, userIds) {
        const follows = await prisma.follows.findMany({
            where: { id_follower: viewerId, id_followed: { in: userIds } },
            select: { id_followed: true }
        });
        return follows.map((follow) => follow.id_followed);
    }

    /**
     * Checks which accounts of a batch have a pending request from the viewer.
     *
     * @param {string} viewerId - Requesting account.
     * @param {Array<string>} userIds - Candidate accounts.
     * @returns {Promise<Array<string>>} Ids with pending requests.
     */
    async function findPendingStates(viewerId, userIds) {
        const requests = await prisma.followRequests.findMany({
            where: { id_follower: viewerId, id_followed: { in: userIds } },
            select: { id_followed: true }
        });
        return requests.map((request) => request.id_followed);
    }

    /**
     * Counts visible followers and followed accounts of a profile.
     *
     * @param {string} userId - Profile owner.
     * @param {string} viewerId - Account that performs the request.
     * @returns {Promise<{followers: number, following: number}>} Visible totals.
     */
    async function countFollows(userId, viewerId) {
        const [followers, following] = await Promise.all([
            prisma.follows.count({
                where: {
                    id_followed: userId,
                    User_Follows_id_followerToUser: {
                        account_status: "ACTIVE",
                        ...buildNotBlockedFilter(viewerId)
                    }
                }
            }),
            prisma.follows.count({
                where: {
                    id_follower: userId,
                    User_Follows_id_followedToUser: {
                        account_status: "ACTIVE",
                        ...buildNotBlockedFilter(viewerId)
                    }
                }
            })
        ]);
        return { followers, following };
    }

    /**
     * Creates a follow relationship or a pending request for private accounts.
     * Writes run inside a pair lock so concurrent requests cannot both succeed.
     *
     * @param {string} followerId - Account that follows.
     * @param {string} followedId - Account to follow.
     * @returns {Promise<"following"|"pending"|null>} Resulting state, or null when the follow is not allowed.
     */
    async function addFollow(followerId, followedId) {
        return prisma.$transaction(async (tx) => {
            await lockUserPair(tx, followerId, followedId);
            const target = await tx.user.findFirst({
                where: { id_user: followedId, account_status: "ACTIVE" },
                select: { is_private: true }
            });
            if (!target || await isBlockedBetween(tx, followerId, followedId)) {
                return null;
            }

            const state = await resolveConnectionState(tx, followerId, followedId);
            if (state === "following" || state === "pending") {
                return state;
            }
            if (target.is_private) {
                await tx.followRequests.createMany({
                    data: [{ id_follower: followerId, id_followed: followedId }],
                    skipDuplicates: true
                });
                return "pending";
            }
            if (followerId === followedId) {
                return null;
            }
            const created = await tx.follows.createMany({
                data: [{ id_follower: followerId, id_followed: followedId }],
                skipDuplicates: true
            });
            return created.count === 0 ? null : "following";
        });
    }

    /**
     * Deletes the outgoing follow relationship of an account.
     *
     * @param {string} followerId - Account that stops following.
     * @param {string} followedId - Account to stop following.
     * @returns {Promise<boolean>} True when the write completed.
     */
    async function removeFollow(followerId, followedId) {
        return prisma.$transaction(async (tx) => {
            await lockUserPair(tx, followerId, followedId);
            await tx.follows.deleteMany({ where: { id_follower: followerId, id_followed: followedId } });
            await tx.followRequests.deleteMany({ where: { id_follower: followerId, id_followed: followedId } });
            return true;
        });
    }

    /**
     * Lists the visible followers of a profile.
     *
     * @param {string} userId - Profile owner.
     * @param {string} viewerId - Account that performs the request.
     * @param {number} limit - Maximum number of rows.
     * @param {number} offset - Rows to skip.
     * @returns {Promise<Array<object>>} Visible follower profiles.
     */
    async function listFollowers(userId, viewerId, limit, offset) {
        const follows = await prisma.follows.findMany({
            where: {
                id_followed: userId,
                User_Follows_id_followerToUser: {
                    account_status: "ACTIVE",
                    ...buildNotBlockedFilter(viewerId)
                }
            },
            select: { User_Follows_id_followerToUser: { select: USER_SELECT } },
            orderBy: [
                { User_Follows_id_followerToUser: { username: "asc" } },
                { User_Follows_id_followerToUser: { id_user: "asc" } }
            ],
            skip: offset,
            take: limit
        });

        return follows.map((follow) => follow.User_Follows_id_followerToUser);
    }

    /**
     * Lists the visible accounts followed by a profile.
     *
     * @param {string} userId - Profile owner.
     * @param {string} viewerId - Account that performs the request.
     * @param {number} limit - Maximum number of rows.
     * @param {number} offset - Rows to skip.
     * @returns {Promise<Array<object>>} Visible followed profiles.
     */
    async function listFollowing(userId, viewerId, limit, offset) {
        const follows = await prisma.follows.findMany({
            where: {
                id_follower: userId,
                User_Follows_id_followedToUser: {
                    account_status: "ACTIVE",
                    ...buildNotBlockedFilter(viewerId)
                }
            },
            select: { User_Follows_id_followedToUser: { select: USER_SELECT } },
            orderBy: [
                { User_Follows_id_followedToUser: { username: "asc" } },
                { User_Follows_id_followedToUser: { id_user: "asc" } }
            ],
            skip: offset,
            take: limit
        });

        return follows.map((follow) => follow.User_Follows_id_followedToUser);
    }

    return {
        findVisibleUser,
        findFollowState,
        findConnectionState,
        findPrivacy,
        updatePrivacy,
        resolveFollowRequest,
        listIncomingRequests,
        countIncomingRequests,
        findFollowStates,
        findPendingStates,
        countFollows,
        addFollow,
        removeFollow,
        listFollowers,
        listFollowing
    };
}

module.exports = {
    createFollowsRepository
};
