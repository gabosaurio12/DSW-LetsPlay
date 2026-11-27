const { lockUserPair } = require("./userPairLock");

const BLOCKED_USER_SELECT = {
    id_user: true,
    username: true,
    display_name: true,
    profile_photo_url: true
};

/**
 * Builds the filter for a relationship stored in either direction between two accounts.
 *
 * @param {string} firstUserId - First account uuid.
 * @param {string} secondUserId - Second account uuid.
 * @returns {Array<object>} Prisma OR conditions over the follower and followed columns.
 */
function bothDirections(firstUserId, secondUserId) {
    return [
        { id_follower: firstUserId, id_followed: secondUserId },
        { id_follower: secondUserId, id_followed: firstUserId }
    ];
}

/**
 * Creates the repository for directed blocks and their relationship cleanup.
 *
 * @param {import("@prisma/client").PrismaClient} prisma - Prisma client instance.
 * @returns {object} Block repository operations.
 */
function createBlocksRepository(prisma) {
    /**
     * Blocks an account and atomically deletes follows and requests both ways.
     *
     * @param {string} blockerId - Account performing the block.
     * @param {string} blockedId - Account to block.
     * @returns {Promise<boolean|null>} True when inserted, false if already blocked,
     * or null when the target is unavailable.
     */
    async function blockUser(blockerId, blockedId) {
        return prisma.$transaction(async (tx) => {
            await lockUserPair(tx, blockerId, blockedId);
            const target = await tx.user.findFirst({
                where: { id_user: blockedId, account_status: "ACTIVE" },
                select: { id_user: true }
            });
            if (blockerId.toLowerCase() === blockedId.toLowerCase() || target === null) {
                return null;
            }
            const inserted = await tx.blocks.createMany({
                data: [{ id_blocker: blockerId, id_blocked: blockedId }],
                skipDuplicates: true
            });
            await tx.follows.deleteMany({ where: { OR: bothDirections(blockerId, blockedId) } });
            await tx.followRequests.deleteMany({ where: { OR: bothDirections(blockerId, blockedId) } });
            return inserted.count > 0;
        });
    }

    /**
     * Removes only the block created by the actor. It does not restore follows.
     *
     * @param {string} blockerId - Account removing its block.
     * @param {string} blockedId - Previously blocked account.
     * @returns {Promise<boolean>} Whether a block was removed.
     */
    async function unblockUser(blockerId, blockedId) {
        return prisma.$transaction(async (tx) => {
            await lockUserPair(tx, blockerId, blockedId);
            const result = await tx.blocks.deleteMany({
                where: { id_blocker: blockerId, id_blocked: blockedId }
            });
            return result.count > 0;
        });
    }

    /**
     * Lists the accounts blocked by the actor.
     *
     * @param {string} blockerId - Account that owns the list.
     * @param {number} limit - Maximum number of rows.
     * @param {number} offset - Rows to skip.
     * @returns {Promise<Array<object>>} Blocked account profiles.
     */
    async function listBlockedUsers(blockerId, limit, offset) {
        const blocks = await prisma.blocks.findMany({
            where: {
                id_blocker: blockerId,
                User_Blocks_id_blockedToUser: { account_status: "ACTIVE" }
            },
            select: {
                blocked_at: true,
                User_Blocks_id_blockedToUser: { select: BLOCKED_USER_SELECT }
            },
            orderBy: [
                { blocked_at: "desc" },
                { User_Blocks_id_blockedToUser: { id_user: "asc" } }
            ],
            skip: offset,
            take: limit
        });

        return blocks.map((block) => ({
            ...block.User_Blocks_id_blockedToUser,
            blocked_at: block.blocked_at
        }));
    }

    /**
     * Counts active accounts blocked by the actor.
     *
     * @param {string} blockerId - Account that owns the list.
     * @returns {Promise<number>} Number of blocked accounts.
     */
    async function countBlockedUsers(blockerId) {
        return prisma.blocks.count({
            where: {
                id_blocker: blockerId,
                User_Blocks_id_blockedToUser: { account_status: "ACTIVE" }
            }
        });
    }

    /**
     * Checks whether the actor blocks the target.
     *
     * @param {string} blockerId - Account that may have created the block.
     * @param {string} blockedId - Target account.
     * @returns {Promise<boolean>} True when the directed block exists.
     */
    async function hasBlocked(blockerId, blockedId) {
        const block = await prisma.blocks.findUnique({
            where: { id_blocker_id_blocked: { id_blocker: blockerId, id_blocked: blockedId } },
            select: { id_blocker: true }
        });
        return block !== null;
    }

    return {
        blockUser,
        unblockUser,
        listBlockedUsers,
        countBlockedUsers,
        hasBlocked
    };
}

module.exports = {
    createBlocksRepository
};
