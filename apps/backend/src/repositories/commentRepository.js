const crypto = require("crypto");

// Temporary demo user until authentication is implemented.
const DEMO_USER_ID = "10000000-0000-4000-8000-000000000001";

const FIND_COMMENTS_BY_POST_ID_SQL = `
SELECT cm."id_comment", cm."id_post", cm."content", cm."is_spoiler", cm."created_at",
       u."username" AS "author_username",
       u."display_name" AS "author_display_name"
FROM "Comment" cm
INNER JOIN "User" u ON u."id_user" = cm."id_user"
INNER JOIN "Post" p ON p."id_post" = cm."id_post"
WHERE cm."id_post" = $1
  AND u."account_status" = 'ACTIVE'
  AND p."status" = 'ACTIVE'
  AND (
      NOT EXISTS (
          SELECT 1 FROM "User" owner
          WHERE owner."id_user" = p."id_user" AND owner."is_private"
      )
      OR p."id_user" = $2
      OR EXISTS (
          SELECT 1 FROM "Follows" f
          WHERE f."id_follower" = $2 AND f."id_followed" = p."id_user"
      )
  )
  AND NOT EXISTS (
      SELECT 1 FROM "Blocks" b
      WHERE (b."id_blocker" = p."id_user" AND b."id_blocked" = $2)
         OR (b."id_blocker" = $2 AND b."id_blocked" = p."id_user")
  )
  AND NOT EXISTS (
      SELECT 1 FROM "Blocks" b
      WHERE (b."id_blocker" = cm."id_user" AND b."id_blocked" = $2)
         OR (b."id_blocker" = $2 AND b."id_blocked" = cm."id_user")
  )
  AND (
      p."id_community" IS NULL
      OR EXISTS (
          SELECT 1
          FROM "v_public_community" c
          WHERE c."id_community" = p."id_community"
      )
  )
ORDER BY cm."created_at" ASC
`;

const FIND_ACTIVE_POST_SQL = `
SELECT p."id_post"
FROM "Post" p
WHERE p."id_post" = $1
  AND p."status" = 'ACTIVE'
  AND (
      NOT EXISTS (
          SELECT 1 FROM "User" owner
          WHERE owner."id_user" = p."id_user" AND owner."is_private"
      )
      OR p."id_user" = $2
      OR EXISTS (
          SELECT 1 FROM "Follows" f
          WHERE f."id_follower" = $2 AND f."id_followed" = p."id_user"
      )
  )
  AND NOT EXISTS (
      SELECT 1 FROM "Blocks" b
      WHERE (b."id_blocker" = p."id_user" AND b."id_blocked" = $2)
         OR (b."id_blocker" = $2 AND b."id_blocked" = p."id_user")
  )
`;

const INSERT_COMMENT_SQL = `
WITH inserted AS (
    INSERT INTO "Comment" ("id_comment", "id_post", "id_user", "content", "is_spoiler")
    VALUES ($1, $2, $3, $4, $5)
    RETURNING "id_comment", "id_post", "id_user", "content", "is_spoiler", "created_at"
)
SELECT ins."id_comment", ins."id_post", ins."content", ins."is_spoiler", ins."created_at",
       u."username" AS "author_username",
       u."display_name" AS "author_display_name"
FROM inserted ins
INNER JOIN "User" u ON u."id_user" = ins."id_user"
`;

/**
 * Creates a reusable repository for querying and creating post comments.
 *
 * @param {import("pg").Pool} pool - PostgreSQL pool instance.
 * @returns {{
 *   findCommentsByPostId: Function,
 *   createComment: Function
 * }} Comment repository methods.
 */
function createCommentRepository(pool) {
    /**
     * Finds active comments for an active post ordered chronologically.
     *
     * @param {string} postId - Post UUID.
     * @param {string} viewerId - Current account UUID.
     * @returns {Promise<Array<object>>} Matching comments with author metadata.
     */
    async function findCommentsByPostId(postId, viewerId) {
        const result = await pool.query(FIND_COMMENTS_BY_POST_ID_SQL, [postId, viewerId]);
        return result.rows;
    }

    /**
     * Creates a comment on an active post and returns it with author metadata.
     *
     * @param {{
     *   postId: string,
     *   userId?: string,
     *   viewerId?: string,
     *   content: string,
     *   isSpoiler?: boolean
     * }} params - Comment creation payload.
     * @returns {Promise<object|null>} Created comment or null if the post is unavailable.
     */
    async function createComment({ postId, userId, viewerId, content, isSpoiler }) {
        const resolvedViewerId = viewerId || userId || DEMO_USER_ID;
        const postResult = await pool.query(FIND_ACTIVE_POST_SQL, [postId, resolvedViewerId]);
        if (postResult.rows.length === 0) {
            return null;
        }

        const commentId = crypto.randomUUID();
        // Replace DEMO_USER_ID with the authenticated user id once auth is implemented.
        const resolvedUserId = viewerId || userId || DEMO_USER_ID;
        const spoilerFlag = Boolean(isSpoiler);

        const result = await pool.query(INSERT_COMMENT_SQL, [
            commentId,
            postId,
            resolvedUserId,
            content,
            spoilerFlag
        ]);

        return result.rows[0] || null;
    }

    return {
        findCommentsByPostId,
        createComment
    };
}

module.exports = {
    DEMO_USER_ID,
    createCommentRepository
};
