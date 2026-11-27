const crypto = require("node:crypto");
const {
    buildVisibleAccountFilter,
    buildNotBlockedFilter,
    buildPublicCommunityConditions
} = require("./visibilityFilters");

// Temporary demo user until authentication is implemented.
const DEMO_USER_ID = "10000000-0000-4000-8000-000000000001";

const VIDEOGAME_FIELDS = {
    id_videogame: true,
    name: true,
    description: true,
    genre: true,
    platform: true,
    cover_url: true,
    additional_info: true,
    created_at: true,
    status: true
};

const POST_SELECT = {
    id_post: true,
    id_videogame: true,
    id_community: true,
    content: true,
    image_url: true,
    is_spoiler: true,
    created_at: true,
    Videogames: { select: { name: true } },
    Communities: { select: { name: true } },
    User: { select: { username: true, display_name: true } },
    _count: { select: { Reaction: true, Comment: true } }
};

function normalizeFilter(value) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
}

/**
 * Converts a Prisma post row into the public post shape used by the API.
 *
 * @param {object} post - Post row selected with POST_SELECT.
 * @returns {object} Public post with flattened author, videogame and counters.
 */
function mapPublicPost(post) {
    return {
        id_post: post.id_post,
        id_videogame: post.id_videogame,
        videogame_name: post.Videogames.name,
        id_community: post.id_community,
        community_name: post.Communities?.name ?? null,
        content: post.content,
        image_url: post.image_url,
        is_spoiler: post.is_spoiler,
        created_at: post.created_at,
        author_username: post.User.username,
        author_display_name: post.User.display_name,
        reaction_count: post._count.Reaction,
        comment_count: post._count.Comment
    };
}

/**
 * Converts a Prisma comment row into the public comment shape used by the API.
 *
 * @param {object} comment - Comment row with its author selected.
 * @returns {object} Public comment with flattened author fields.
 */
function mapComment(comment) {
    return {
        id_comment: comment.id_comment,
        id_post: comment.id_post,
        content: comment.content,
        is_spoiler: comment.is_spoiler,
        created_at: comment.created_at,
        author_username: comment.User.username,
        author_display_name: comment.User.display_name
    };
}

/**
 * Builds the Prisma filter for public videogames with optional filters.
 *
 * @param {{ genre: string|null, platform: string|null, search: string|null }} filters - Normalized filters.
 * @returns {object} Prisma where clause.
 */
function buildVideogameWhere({ genre, platform, search }) {
    return {
        status: "ACTIVE",
        genre: genre ?? undefined,
        platform: platform ?? undefined,
        OR: search
            ? [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } }
            ]
            : undefined
    };
}

/**
 * Builds the Prisma filter for public posts of a videogame visible to the viewer.
 *
 * @param {string} videogameId - Videogame UUID.
 * @param {string|null} viewerId - Current account UUID.
 * @returns {object} Prisma where clause.
 */
function buildPublicPostWhere(videogameId, viewerId) {
    return {
        id_videogame: videogameId,
        status: "ACTIVE",
        User: {
            account_status: "ACTIVE",
            ...buildVisibleAccountFilter(viewerId),
            ...buildNotBlockedFilter(viewerId)
        },
        OR: buildPublicCommunityConditions()
    };
}

/**
 * Creates a repository for querying the public videogame catalog.
 *
 * @param {import("@prisma/client").PrismaClient} prisma - Prisma client instance.
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
function createVideogameRepository(prisma) {
    /**
     * Finds public videogames with optional exact genre/platform filters and text search.
     *
     * @param {{ genre?: string, platform?: string, search?: string }} [filters={}] - Query filters.
     * @returns {Promise<Array<object>>} Matching public videogames ordered by name.
     */
    async function findPublicVideogames({ genre, platform, search } = {}) {
        const searchTerm = normalizeFilter(search);

        return prisma.videogames.findMany({
            where: buildVideogameWhere({
                genre: normalizeFilter(genre),
                platform: normalizeFilter(platform),
                search: searchTerm
            }),
            select: VIDEOGAME_FIELDS,
            orderBy: { name: "asc" }
        });
    }

    /**
     * Returns distinct non-null genres and platforms available in the public catalog.
     *
     * @returns {Promise<{ genres: Array<string>, platforms: Array<string> }>} Filter options.
     */
    async function findPublicVideogameFilters() {
        const [genres, platforms] = await Promise.all([
            prisma.videogames.findMany({
                where: { status: "ACTIVE", genre: { not: null } },
                distinct: ["genre"],
                select: { genre: true },
                orderBy: { genre: "asc" }
            }),
            prisma.videogames.findMany({
                where: { status: "ACTIVE", platform: { not: null } },
                distinct: ["platform"],
                select: { platform: true },
                orderBy: { platform: "asc" }
            })
        ]);

        return {
            genres: genres.map((row) => row.genre),
            platforms: platforms.map((row) => row.platform)
        };
    }

    /**
     * Finds a single public videogame by its UUID.
     *
     * @param {string} id - Videogame UUID.
     * @returns {Promise<object|null>} Matching videogame or null when not found.
     */
    async function findPublicVideogameById(id) {
        return prisma.videogames.findFirst({
            where: { id_videogame: id, status: "ACTIVE" },
            select: VIDEOGAME_FIELDS
        });
    }

    /**
     * Finds public communities related to a videogame ordered by member count and name.
     *
     * @param {string} id - Videogame UUID.
     * @returns {Promise<Array<object>>} Related public communities with member counts.
     */
    async function findRelatedCommunitiesByVideogameId(id) {
        const communities = await prisma.communities.findMany({
            where: {
                status: "ACTIVE",
                type: "PUBLIC",
                CommunityVideogames: { some: { id_videogame: id } }
            },
            select: {
                id_community: true,
                name: true,
                description: true,
                type: true,
                image_url: true,
                rules: true,
                created_at: true,
                updated_at: true,
                _count: { select: { CommunityMembers: true } }
            },
            orderBy: [{ CommunityMembers: { _count: "desc" } }, { name: "asc" }]
        });

        return communities.map(({ _count, ...community }) => ({
            ...community,
            member_count: _count.CommunityMembers
        }));
    }

    /**
     * Finds public posts for a videogame with author info, reaction count and comment count.
     *
     * @param {string} id - Videogame UUID.
     * @param {string} viewerId - Current account UUID.
     * @returns {Promise<Array<object>>} Public posts ordered by newest first.
     */
    async function findPublicPostsByVideogameId(id, viewerId) {
        const posts = await prisma.post.findMany({
            where: buildPublicPostWhere(id, viewerId),
            select: POST_SELECT,
            orderBy: { created_at: "desc" }
        });

        return posts.map(mapPublicPost);
    }

    /**
     * Finds comments for an active public post ordered chronologically.
     *
     * @param {string} postId - Post UUID.
     * @param {string} viewerId - Current account UUID.
     * @returns {Promise<Array<object>>} Post comments ordered oldest first.
     */
    async function findCommentsByPostId(postId, viewerId) {
        const comments = await prisma.comment.findMany({
            where: {
                id_post: postId,
                User: { account_status: "ACTIVE", ...buildNotBlockedFilter(viewerId) },
                Post: {
                    status: "ACTIVE",
                    User: {
                        ...buildVisibleAccountFilter(viewerId),
                        ...buildNotBlockedFilter(viewerId)
                    },
                    OR: buildPublicCommunityConditions()
                }
            },
            select: {
                id_comment: true,
                id_post: true,
                content: true,
                is_spoiler: true,
                created_at: true,
                User: { select: { username: true, display_name: true } }
            },
            orderBy: { created_at: "asc" }
        });

        return comments.map(mapComment);
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
        const videogame = await findPublicVideogameById(videogameId);
        if (!videogame) {
            return null;
        }

        // Replace DEMO_USER_ID with the authenticated user id once auth is implemented.
        const post = await prisma.post.create({
            data: {
                id_post: crypto.randomUUID(),
                id_user: userId || DEMO_USER_ID,
                id_videogame: videogameId,
                content: normalizeFilter(content),
                image_url: normalizeFilter(imageUrl),
                is_spoiler: Boolean(isSpoiler),
                status: "ACTIVE"
            },
            select: POST_SELECT
        });

        return mapPublicPost(post);
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
