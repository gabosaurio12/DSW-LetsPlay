const crypto = require("crypto");

// Temporary demo user until authentication is implemented.
const DEMO_USER_ID = "10000000-0000-4000-8000-000000000001";

const FIND_PUBLIC_VIDEOGAMES_SQL = `
SELECT "id_videogame", "name", "description", "genre", "platform",
       "cover_url", "additional_info", "created_at", "status"
FROM "v_public_videogame"
WHERE ($1::text IS NULL OR "genre" = $1)
  AND ($2::text IS NULL OR "platform" = $2)
  AND (
      $3::text IS NULL
      OR "name" ILIKE $3
      OR "description" ILIKE $3
  )
ORDER BY "name" ASC
`;

const FIND_PUBLIC_GENRES_SQL = `
SELECT DISTINCT "genre"
FROM "v_public_videogame"
WHERE "genre" IS NOT NULL
ORDER BY "genre" ASC
`;

const FIND_PUBLIC_PLATFORMS_SQL = `
SELECT DISTINCT "platform"
FROM "v_public_videogame"
WHERE "platform" IS NOT NULL
ORDER BY "platform" ASC
`;

const FIND_PUBLIC_VIDEOGAME_BY_ID_SQL = `
SELECT "id_videogame", "name", "description", "genre", "platform",
       "cover_url", "additional_info", "created_at", "status"
FROM "v_public_videogame"
WHERE "id_videogame" = $1
`;

const FIND_RELATED_COMMUNITIES_BY_VIDEOGAME_ID_SQL = `
SELECT c."id_community", c."name", c."description", c."type", c."image_url",
       c."rules", c."created_at", c."updated_at",
       COUNT(cm."id_user")::int AS "member_count"
FROM "v_public_community" c
INNER JOIN "CommunityVideogames" cv ON cv."id_community" = c."id_community"
LEFT JOIN "CommunityMembers" cm ON cm."id_community" = c."id_community"
WHERE cv."id_videogame" = $1
GROUP BY c."id_community", c."name", c."description", c."type", c."image_url",
         c."rules", c."created_at", c."updated_at"
ORDER BY "member_count" DESC, c."name" ASC
`;

const FIND_PUBLIC_POSTS_BY_VIDEOGAME_ID_SQL = `
SELECT p."id_post", p."id_videogame", v."name" AS "videogame_name",
       p."id_community", c."name" AS "community_name",
       p."content", p."image_url", p."is_spoiler", p."created_at",
       u."username" AS "author_username",
       u."display_name" AS "author_display_name",
       COUNT(DISTINCT r."id_user")::int AS "reaction_count",
       COUNT(DISTINCT cm."id_comment")::int AS "comment_count"
FROM "Post" p
INNER JOIN "User" u ON u."id_user" = p."id_user"
INNER JOIN "Videogames" v ON v."id_videogame" = p."id_videogame"
LEFT JOIN "v_public_community" c ON c."id_community" = p."id_community"
LEFT JOIN "Reaction" r ON r."id_post" = p."id_post"
LEFT JOIN "Comment" cm ON cm."id_post" = p."id_post"
WHERE p."id_videogame" = $1
  AND p."status" = 'ACTIVE'
  AND u."account_status" = 'ACTIVE'
  AND (
    NOT u."is_private"
    OR u."id_user" = $2
    OR EXISTS (
      SELECT 1 FROM "Follows" f
      WHERE f."id_follower" = $2 AND f."id_followed" = u."id_user"
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = u."id_user" AND b."id_blocked" = $2)
       OR (b."id_blocker" = $2 AND b."id_blocked" = u."id_user")
  )
  AND (
      p."id_community" IS NULL
      OR EXISTS (
          SELECT 1
          FROM "v_public_community" pc
          WHERE pc."id_community" = p."id_community"
      )
  )
GROUP BY p."id_post", p."id_videogame", v."name", p."id_community", c."name",
         p."content", p."image_url", p."is_spoiler", p."created_at",
         u."username", u."display_name"
ORDER BY p."created_at" DESC
`;

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

const INSERT_PUBLIC_POST_SQL = `
WITH inserted AS (
    INSERT INTO "Post" (
        "id_post",
        "id_user",
        "id_videogame",
        "id_community",
        "content",
        "image_url",
        "is_spoiler",
        "status"
    )
    VALUES ($1, $2, $3, NULL, $4, $5, $6, 'ACTIVE')
    RETURNING "id_post", "id_user", "id_videogame", "id_community",
              "content", "image_url", "is_spoiler", "created_at"
)
SELECT ins."id_post", ins."id_videogame", v."name" AS "videogame_name",
       ins."id_community", NULL::text AS "community_name",
       ins."content", ins."image_url", ins."is_spoiler", ins."created_at",
       u."username" AS "author_username",
       u."display_name" AS "author_display_name",
       0::int AS "reaction_count",
       0::int AS "comment_count"
FROM inserted ins
INNER JOIN "User" u ON u."id_user" = ins."id_user"
INNER JOIN "v_public_videogame" v ON v."id_videogame" = ins."id_videogame"
`;

function normalizeFilter(value) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
}

/**
 * Creates a repository for querying the public videogame catalog view.
 *
 * @param {import("pg").Pool} pool - PostgreSQL pool instance.
 * @returns {{
 *   findPublicVideogames: Function,
 *   findPublicVideogameFilters: Function,
 *   findPublicVideogameById: Function,
 *   findRelatedCommunitiesByVideogameId: Function,
 *   findPublicPostsByVideogameId: Function,
 *   findCommentsByPostId: Function,
 *   createPublicPostForVideogame: Function
 * }} Videogame repository methods.
 */
function createVideogameRepository(pool) {
    /**
     * Finds public videogames with optional exact genre/platform filters and text search.
     *
     * @param {{ genre?: string, platform?: string, search?: string }} [filters={}] - Query filters.
     * @returns {Promise<Array<object>>} Matching public videogames ordered by name.
     */
    async function findPublicVideogames({ genre, platform, search } = {}) {
        const genreParam = normalizeFilter(genre);
        const platformParam = normalizeFilter(platform);
        const searchTerm = normalizeFilter(search);
        const searchParam = searchTerm ? `%${searchTerm}%` : null;

        const result = await pool.query(FIND_PUBLIC_VIDEOGAMES_SQL, [
            genreParam,
            platformParam,
            searchParam
        ]);

        return result.rows;
    }

    /**
     * Returns distinct non-null genres and platforms available in the public catalog.
     *
     * @returns {Promise<{ genres: Array<string>, platforms: Array<string> }>} Filter options.
     */
    async function findPublicVideogameFilters() {
        const [genresResult, platformsResult] = await Promise.all([
            pool.query(FIND_PUBLIC_GENRES_SQL),
            pool.query(FIND_PUBLIC_PLATFORMS_SQL)
        ]);

        return {
            genres: genresResult.rows.map((row) => row.genre),
            platforms: platformsResult.rows.map((row) => row.platform)
        };
    }

    /**
     * Finds a single public videogame by its UUID.
     *
     * @param {string} id - Videogame UUID.
     * @returns {Promise<object|null>} Matching videogame or null when not found.
     */
    async function findPublicVideogameById(id) {
        const result = await pool.query(FIND_PUBLIC_VIDEOGAME_BY_ID_SQL, [id]);
        return result.rows[0] || null;
    }

    /**
     * Finds public communities related to a videogame ordered by member count and name.
     *
     * @param {string} id - Videogame UUID.
     * @returns {Promise<Array<object>>} Related public communities with member counts.
     */
    async function findRelatedCommunitiesByVideogameId(id) {
        const result = await pool.query(FIND_RELATED_COMMUNITIES_BY_VIDEOGAME_ID_SQL, [id]);
        return result.rows;
    }

    /**
     * Finds public posts for a videogame with author info, reaction count and comment count.
     *
     * @param {string} id - Videogame UUID.
     * @param {string} viewerId - Current account UUID.
     * @returns {Promise<Array<object>>} Public posts ordered by newest first.
     */
    async function findPublicPostsByVideogameId(id, viewerId) {
        const result = await pool.query(FIND_PUBLIC_POSTS_BY_VIDEOGAME_ID_SQL, [id, viewerId]);
        return result.rows;
    }

    /**
     * Finds comments for an active public post ordered chronologically.
     *
     * @param {string} postId - Post UUID.
     * @param {string} viewerId - Current account UUID.
     * @returns {Promise<Array<object>>} Post comments ordered oldest first.
     */
    async function findCommentsByPostId(postId, viewerId) {
        const result = await pool.query(FIND_COMMENTS_BY_POST_ID_SQL, [postId, viewerId]);
        return result.rows;
    }

    /**
     * Creates a public post for an active videogame and returns it with author and game metadata.
     *
     * @param {{
     *   videogameId: string,
     *   userId?: string,
     *   content?: string|null,
     *   imageUrl?: string|null,
     *   isSpoiler?: boolean
     * }} params - Post creation payload.
     * @returns {Promise<object|null>} Created post or null when the videogame is not found.
     */
    async function createPublicPostForVideogame({ videogameId, userId, content, imageUrl, isSpoiler }) {
        const videogameResult = await pool.query(FIND_PUBLIC_VIDEOGAME_BY_ID_SQL, [videogameId]);
        if (videogameResult.rows.length === 0) {
            return null;
        }

        const postId = crypto.randomUUID();
        // Replace DEMO_USER_ID with the authenticated user id once auth is implemented.
        const resolvedUserId = userId || DEMO_USER_ID;
        const normalizedContent = normalizeFilter(content);
        const normalizedImageUrl = normalizeFilter(imageUrl);
        const spoilerFlag = Boolean(isSpoiler);

        const result = await pool.query(INSERT_PUBLIC_POST_SQL, [
            postId,
            resolvedUserId,
            videogameId,
            normalizedContent,
            normalizedImageUrl,
            spoilerFlag
        ]);

        return result.rows[0] || null;
    }

    return {
        findPublicVideogames,
        findPublicVideogameFilters,
        findPublicVideogameById,
        findRelatedCommunitiesByVideogameId,
        findPublicPostsByVideogameId,
        findCommentsByPostId,
        createPublicPostForVideogame
    };
}

module.exports = {
    DEMO_USER_ID,
    createVideogameRepository
};
