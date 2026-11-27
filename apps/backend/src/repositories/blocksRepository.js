const { lockUserPair } = require("./userPairLock");

const FIND_ACTIVE_USER_SQL = `
SELECT "id_user" FROM "User"
WHERE "id_user" = $1 AND "account_status" = 'ACTIVE'
`;

const LIST_BLOCKED_USERS_SQL = `
SELECT u."id_user", u."username", u."display_name", u."profile_photo_url", b."blocked_at"
FROM "Blocks" b
INNER JOIN "User" u ON u."id_user" = b."id_blocked"
WHERE b."id_blocker" = $1 AND u."account_status" = 'ACTIVE'
ORDER BY b."blocked_at" DESC, u."id_user" ASC
LIMIT $2 OFFSET $3
`;

const COUNT_BLOCKED_USERS_SQL = `
SELECT count(*) FROM "Blocks" b
INNER JOIN "User" u ON u."id_user" = b."id_blocked"
WHERE b."id_blocker" = $1 AND u."account_status" = 'ACTIVE'
`;

/**
 * Creates the repository for directed blocks and their relationship cleanup.
 *
 * @param {import("pg").Pool} pool - PostgreSQL connection pool.
 * @returns {object} Block repository operations.
 */
function createBlocksRepository(pool) {
    /**
     * Blocks an account and atomically deletes follows and requests both ways.
     *
     * @param {string} blockerId - Account performing the block.
     * @param {string} blockedId - Account to block.
     * @returns {Promise<boolean|null>} True when inserted, false if already blocked,
     * or null when the target is unavailable.
     */
    async function blockUser(blockerId, blockedId) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await lockUserPair(client, blockerId, blockedId);
            const target = await client.query(FIND_ACTIVE_USER_SQL, [blockedId]);
            if (blockerId.toLowerCase() === blockedId.toLowerCase() || target.rowCount === 0) {
                await client.query("ROLLBACK");
                return null;
            }
            const inserted = await client.query(
                `INSERT INTO "Blocks" ("id_blocker", "id_blocked")
                 VALUES ($1::uuid, $2::uuid)
                 ON CONFLICT ("id_blocker", "id_blocked") DO NOTHING
                 RETURNING "id_blocker"`,
                [blockerId, blockedId]
            );
            await client.query(
                `DELETE FROM "Follows"
                 WHERE ("id_follower" = $1 AND "id_followed" = $2)
                    OR ("id_follower" = $2 AND "id_followed" = $1)`,
                [blockerId, blockedId]
            );
            await client.query(
                `DELETE FROM "FollowRequests"
                 WHERE ("id_follower" = $1 AND "id_followed" = $2)
                    OR ("id_follower" = $2 AND "id_followed" = $1)`,
                [blockerId, blockedId]
            );
            await client.query("COMMIT");
            return inserted.rowCount > 0;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Removes only the block created by the actor. It does not restore follows.
     *
     * @param {string} blockerId - Account removing its block.
     * @param {string} blockedId - Previously blocked account.
     * @returns {Promise<boolean>} Whether a block was removed.
     */
    async function unblockUser(blockerId, blockedId) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await lockUserPair(client, blockerId, blockedId);
            const result = await client.query(
                `DELETE FROM "Blocks"
                 WHERE "id_blocker" = $1 AND "id_blocked" = $2
                 RETURNING "id_blocker"`,
                [blockerId, blockedId]
            );
            await client.query("COMMIT");
            return result.rowCount > 0;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
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
        const result = await pool.query(LIST_BLOCKED_USERS_SQL, [blockerId, limit, offset]);
        return result.rows;
    }

    /**
     * Counts active accounts blocked by the actor.
     *
     * @param {string} blockerId - Account that owns the list.
     * @returns {Promise<number>} Number of blocked accounts.
     */
    async function countBlockedUsers(blockerId) {
        const result = await pool.query(COUNT_BLOCKED_USERS_SQL, [blockerId]);
        return Number(result.rows[0].count);
    }

    /**
     * Checks whether the actor blocks the target.
     *
     * @param {string} blockerId - Account that may have created the block.
     * @param {string} blockedId - Target account.
     * @returns {Promise<boolean>} True when the directed block exists.
     */
    async function hasBlocked(blockerId, blockedId) {
        const result = await pool.query(
            `SELECT EXISTS (
                SELECT 1 FROM "Blocks"
                WHERE "id_blocker" = $1 AND "id_blocked" = $2
            ) AS "blocked"`,
            [blockerId, blockedId]
        );
        return result.rows[0].blocked;
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
