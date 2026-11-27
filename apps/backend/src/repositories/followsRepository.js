const USER_COLUMNS = `
    u."id_user", u."username", u."display_name", u."description", u."profile_photo_url"
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

const FIND_FOLLOW_STATES_SQL = `
SELECT "id_followed" FROM "Follows"
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
 *   findFollowStates: Function,
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
        const result = await pool.query(ADD_FOLLOW_SQL, [followerId, followedId]);
        return result.rowCount > 0;
    }

    /**
     * Deletes the outgoing follow relationship of an account.
     *
     * @param {string} followerId - Account that stops following.
     * @param {string} followedId - Account to stop following.
     * @returns {Promise<boolean>} True when a relationship was removed.
     */
    async function removeFollow(followerId, followedId) {
        const result = await pool.query(REMOVE_FOLLOW_SQL, [followerId, followedId]);
        return result.rowCount > 0;
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
        findFollowStates,
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
