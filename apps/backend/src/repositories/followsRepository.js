const USER_COLUMNS = `
    u."id_user", u."username", u."display_name", u."description",
    u."profile_photo_url", u."is_private"
`;

const FIND_USER_SQL = `
SELECT ${USER_COLUMNS}
FROM "User" u
WHERE u."id_user" = $1
  AND u."account_status" = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = $2 AND b."id_blocked" = u."id_user")
       OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $2)
  )
`;

const COUNT_FOLLOWS_SQL = `
SELECT
  (
    SELECT count(*) FROM "Follows" f
    INNER JOIN "User" u ON u."id_user" = f."id_follower"
    WHERE f."id_followed" = $1
      AND u."account_status" = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM "Blocks" b
        WHERE (b."id_blocker" = $2 AND b."id_blocked" = u."id_user")
           OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $2)
      )
  ) AS "followers",
  (
    SELECT count(*) FROM "Follows" f
    INNER JOIN "User" u ON u."id_user" = f."id_followed"
    WHERE f."id_follower" = $1
      AND u."account_status" = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM "Blocks" b
        WHERE (b."id_blocker" = $2 AND b."id_blocked" = u."id_user")
           OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $2)
      )
  ) AS "following"
`;

const FIND_FOLLOW_STATE_SQL = `
SELECT EXISTS (
    SELECT 1 FROM "Follows"
    WHERE "id_follower" = $1 AND "id_followed" = $2
) AS "following"
`;

const FIND_CONNECTION_STATE_SQL = `
SELECT
    EXISTS (
        SELECT 1 FROM "Follows"
        WHERE "id_follower" = $1 AND "id_followed" = $2
    ) AS "following",
    EXISTS (
        SELECT 1 FROM "FollowRequests"
        WHERE "id_follower" = $1 AND "id_followed" = $2
    ) AS "pending"
`;

const FIND_PRIVACY_SQL = `
SELECT "is_private" FROM "User" WHERE "id_user" = $1 AND "account_status" = 'ACTIVE'
`;

const UPDATE_PRIVACY_SQL = `
UPDATE "User" SET "is_private" = $2, "updated_at" = now()
WHERE "id_user" = $1 AND "account_status" = 'ACTIVE'
RETURNING "is_private"
`;

const INSERT_REQUEST_SQL = `
INSERT INTO "FollowRequests" ("id_follower", "id_followed")
SELECT $1::uuid, $2::uuid
WHERE EXISTS (
    SELECT 1 FROM "User"
    WHERE "id_user" = $2::uuid AND "account_status" = 'ACTIVE' AND "is_private"
)
AND NOT EXISTS (
    SELECT 1 FROM "Blocks"
    WHERE ("id_blocker" = $1::uuid AND "id_blocked" = $2::uuid)
       OR ("id_blocker" = $2::uuid AND "id_blocked" = $1::uuid)
)
ON CONFLICT ("id_follower", "id_followed") DO NOTHING
RETURNING "id_follower"
`;

const INSERT_ACCEPTED_FOLLOW_SQL = `
INSERT INTO "Follows" ("id_follower", "id_followed")
VALUES ($1::uuid, $2::uuid)
ON CONFLICT ("id_follower", "id_followed") DO NOTHING
`;

const FIND_INCOMING_REQUESTS_SQL = `
SELECT u."id_user", u."username", u."display_name", u."profile_photo_url",
       r."requested_at"
FROM "FollowRequests" r
INNER JOIN "User" u ON u."id_user" = r."id_follower"
WHERE r."id_followed" = $1
  AND u."account_status" = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = $1 AND b."id_blocked" = u."id_user")
       OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $1)
  )
ORDER BY r."requested_at" ASC, u."id_user" ASC
LIMIT $2 OFFSET $3
`;

const FIND_FOLLOW_STATES_SQL = `
SELECT "id_followed" FROM "Follows"
WHERE "id_follower" = $1 AND "id_followed" = ANY($2::uuid[])
`;

const FIND_PENDING_STATES_SQL = `
SELECT "id_followed" FROM "FollowRequests"
WHERE "id_follower" = $1 AND "id_followed" = ANY($2::uuid[])
`;

const ADD_FOLLOW_SQL = `
INSERT INTO "Follows" ("id_follower", "id_followed")
SELECT $1::uuid, $2::uuid
WHERE $1::uuid <> $2::uuid
  AND EXISTS (
    SELECT 1 FROM "User"
    WHERE "id_user" = $2::uuid AND "account_status" = 'ACTIVE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks"
    WHERE ("id_blocker" = $1::uuid AND "id_blocked" = $2::uuid)
       OR ("id_blocker" = $2::uuid AND "id_blocked" = $1::uuid)
  )
ON CONFLICT ("id_follower", "id_followed") DO NOTHING
RETURNING "id_follower"
`;

const REMOVE_FOLLOW_SQL = `
DELETE FROM "Follows"
WHERE "id_follower" = $1 AND "id_followed" = $2
RETURNING "id_follower"
`;

const LIST_FOLLOWERS_SQL = `
SELECT ${USER_COLUMNS}
FROM "Follows" f
INNER JOIN "User" u ON u."id_user" = f."id_follower"
WHERE f."id_followed" = $1
  AND u."account_status" = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = $2 AND b."id_blocked" = u."id_user")
       OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $2)
  )
ORDER BY u."username" ASC, u."id_user" ASC
LIMIT $3 OFFSET $4
`;

const LIST_FOLLOWING_SQL = `
SELECT ${USER_COLUMNS}
FROM "Follows" f
INNER JOIN "User" u ON u."id_user" = f."id_followed"
WHERE f."id_follower" = $1
  AND u."account_status" = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = $2 AND b."id_blocked" = u."id_user")
       OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $2)
  )
ORDER BY u."username" ASC, u."id_user" ASC
LIMIT $3 OFFSET $4
`;

/**
 * Creates the repository that owns all follow relationship SQL. Every read
 * hides accounts linked by a block in either direction with the viewer.
 *
 * @param {import("pg").Pool} pool - PostgreSQL connection pool.
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
function createFollowsRepository(pool) {
    /**
     * Finds an active account that is not blocked with the viewer.
     *
     * @param {string} userId - Account to inspect.
     * @param {string} viewerId - Account that performs the request.
     * @returns {Promise<object|null>} The visible profile or null.
     */
    async function findVisibleUser(userId, viewerId) {
        const result = await pool.query(FIND_USER_SQL, [userId, viewerId]);
        return result.rows[0] || null;
    }

    /**
     * Checks whether one account follows another.
     *
     * @param {string} followerId - Follower account.
     * @param {string} followedId - Followed account.
     * @returns {Promise<boolean>} True when the relationship exists.
     */
    async function findFollowState(followerId, followedId) {
        const result = await pool.query(FIND_FOLLOW_STATE_SQL, [followerId, followedId]);
        return result.rows[0].following;
    }

    /**
     * Resolves an outgoing follow relationship to its public state.
     *
     * @param {string} followerId - Follower account.
     * @param {string} followedId - Target account.
     * @returns {Promise<"following"|"pending"|"none">} Relationship state.
     */
    async function findConnectionState(followerId, followedId) {
        const result = await pool.query(FIND_CONNECTION_STATE_SQL, [followerId, followedId]);
        const row = result.rows[0];
        if (row.following) {
            return "following";
        }
        return row.pending ? "pending" : "none";
    }

    /**
     * Reads an active account's privacy setting.
     *
     * @param {string} userId - Account uuid.
     * @returns {Promise<boolean|null>} Privacy setting or null for unavailable accounts.
     */
    async function findPrivacy(userId) {
        const result = await pool.query(FIND_PRIVACY_SQL, [userId]);
        return result.rows[0]?.is_private ?? null;
    }

    /**
     * Changes privacy while serializing against pair relationship writes.
     *
     * @param {string} userId - Account uuid.
     * @param {boolean} isPrivate - New privacy setting.
     * @returns {Promise<boolean|null>} Saved state or null for unavailable accounts.
     */
    async function updatePrivacy(userId, isPrivate) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(
                `SELECT "id_user" FROM "User" WHERE "id_user" = $1 FOR UPDATE`,
                [userId]
            );
            const result = await client.query(UPDATE_PRIVACY_SQL, [userId, isPrivate]);
            await client.query("COMMIT");
            return result.rows[0]?.is_private ?? null;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
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
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await lockUserPair(client, recipientId, requesterId);
            const requestResult = await client.query(
                `DELETE FROM "FollowRequests"
                 WHERE "id_follower" = $1 AND "id_followed" = $2
                 RETURNING "id_follower"`,
                [requesterId, recipientId]
            );
            if (requestResult.rowCount === 0) {
                await client.query("COMMIT");
                return false;
            }
            if (decision === "accept") {
                const blocked = await client.query(
                    `SELECT 1 FROM "Blocks"
                     WHERE ("id_blocker" = $1 AND "id_blocked" = $2)
                        OR ("id_blocker" = $2 AND "id_blocked" = $1)`,
                    [recipientId, requesterId]
                );
                if (blocked.rowCount > 0) {
                    await client.query("COMMIT");
                    return false;
                }
                await client.query(INSERT_ACCEPTED_FOLLOW_SQL, [requesterId, recipientId]);
            }
            await client.query("COMMIT");
            return true;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
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
        const result = await pool.query(FIND_INCOMING_REQUESTS_SQL, [
            recipientId,
            limit,
            offset
        ]);
        return result.rows;
    }

    /**
     * Counts pending requests visible to the recipient.
     *
     * @param {string} recipientId - Account that received requests.
     * @returns {Promise<number>} Pending request count.
     */
    async function countIncomingRequests(recipientId) {
        const result = await pool.query(
            `SELECT count(*) FROM "FollowRequests" r
             INNER JOIN "User" u ON u."id_user" = r."id_follower"
             WHERE r."id_followed" = $1 AND u."account_status" = 'ACTIVE'
               AND NOT EXISTS (
                 SELECT 1 FROM "Blocks" b
                 WHERE (b."id_blocker" = $1 AND b."id_blocked" = u."id_user")
                    OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $1)
               )`,
            [recipientId]
        );
        return Number(result.rows[0].count);
    }

    /**
     * Checks which accounts of a batch are followed by the viewer.
     *
     * @param {string} viewerId - Follower account.
     * @param {Array<string>} userIds - Candidate accounts.
     * @returns {Promise<Array<string>>} Ids of accounts followed by the viewer.
     */
    async function findFollowStates(viewerId, userIds) {
        const result = await pool.query(FIND_FOLLOW_STATES_SQL, [viewerId, userIds]);
        return result.rows.map((row) => row.id_followed);
    }

    /**
     * Checks which accounts of a batch have a pending request from the viewer.
     *
     * @param {string} viewerId - Requesting account.
     * @param {Array<string>} userIds - Candidate accounts.
     * @returns {Promise<Array<string>>} Ids with pending requests.
     */
    async function findPendingStates(viewerId, userIds) {
        const result = await pool.query(FIND_PENDING_STATES_SQL, [viewerId, userIds]);
        return result.rows.map((row) => row.id_followed);
    }

    /**
     * Counts visible followers and followed accounts of a profile.
     *
     * @param {string} userId - Profile owner.
     * @param {string} viewerId - Account that performs the request.
     * @returns {Promise<{followers: number, following: number}>} Visible totals.
     */
    async function countFollows(userId, viewerId) {
        const result = await pool.query(COUNT_FOLLOWS_SQL, [userId, viewerId]);
        return {
            followers: Number(result.rows[0].followers),
            following: Number(result.rows[0].following)
        };
    }

    /**
     * Creates a follow relationship. Concurrency is resolved by the primary key.
     *
     * @param {string} followerId - Account that follows.
     * @param {string} followedId - Account to follow.
     * @returns {Promise<boolean>} True when a new relationship was stored.
     */
    async function addFollow(followerId, followedId) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await lockUserPair(client, followerId, followedId);
            const target = await client.query(
                `SELECT "is_private" FROM "User"
                 WHERE "id_user" = $1 AND "account_status" = 'ACTIVE'`,
                [followedId]
            );
            if (target.rowCount === 0) {
                await client.query("ROLLBACK");
                return null;
            }
            const blocked = await client.query(
                `SELECT 1 FROM "Blocks"
                 WHERE ("id_blocker" = $1 AND "id_blocked" = $2)
                    OR ("id_blocker" = $2 AND "id_blocked" = $1)`,
                [followerId, followedId]
            );
            if (blocked.rowCount > 0) {
                await client.query("ROLLBACK");
                return null;
            }
            const state = await client.query(FIND_CONNECTION_STATE_SQL, [
                followerId,
                followedId
            ]);
            if (state.rows[0].following) {
                await client.query("COMMIT");
                return "following";
            }
            if (state.rows[0].pending) {
                await client.query("COMMIT");
                return "pending";
            }
            if (target.rows[0].is_private) {
                await client.query(INSERT_REQUEST_SQL, [followerId, followedId]);
                await client.query("COMMIT");
                return "pending";
            }
            const result = await client.query(ADD_FOLLOW_SQL, [followerId, followedId]);
            if (result.rowCount === 0) {
                await client.query("ROLLBACK");
                return null;
            }
            await client.query("COMMIT");
            return "following";
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Deletes the outgoing follow relationship of an account.
     *
     * @param {string} followerId - Account that stops following.
     * @param {string} followedId - Account to stop following.
     * @returns {Promise<boolean>} True when a relationship was removed.
     */
    async function removeFollow(followerId, followedId) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await lockUserPair(client, followerId, followedId);
            await client.query(REMOVE_FOLLOW_SQL, [followerId, followedId]);
            await client.query(
                `DELETE FROM "FollowRequests"
                 WHERE "id_follower" = $1 AND "id_followed" = $2`,
                [followerId, followedId]
            );
            await client.query("COMMIT");
            return true;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
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
        const result = await pool.query(LIST_FOLLOWERS_SQL, [userId, viewerId, limit, offset]);
        return result.rows;
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
        const result = await pool.query(LIST_FOLLOWING_SQL, [userId, viewerId, limit, offset]);
        return result.rows;
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
const { lockUserPair } = require("./userPairLock");
