const crypto = require("node:crypto");
const {
    buildVisibleAccountFilter,
    buildNotBlockedFilter,
    buildPublicCommunityConditions
} = require("./visibilityFilters");

// Temporary demo user until authentication is implemented.
const DEMO_USER_ID = "10000000-0000-4000-8000-000000000001";

const COMMENT_SELECT = {
    id_comment: true,
    id_post: true,
    content: true,
    is_spoiler: true,
    created_at: true,
    User: { select: { username: true, display_name: true } }
};

/**
 * Converts a Prisma comment row into the public comment shape used by the API.
 *
 * @param {object} comment - Comment row selected with COMMENT_SELECT.
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
 * Builds the filter for comments that the viewer may read: an active author and post,
 * a visible post owner, no blocks with the viewer, and a public or no community.
 *
 * @param {string} postId - Post UUID.
 * @param {string} viewerId - Current account UUID.
 * @returns {object} Prisma where clause.
 */
function buildVisibleCommentWhere(postId, viewerId) {
    return {
        id_post: postId,
        User: { account_status: "ACTIVE", ...buildNotBlockedFilter(viewerId) },
        Post: {
            status: "ACTIVE",
            User: { ...buildVisibleAccountFilter(viewerId), ...buildNotBlockedFilter(viewerId) },
            OR: buildPublicCommunityConditions()
        }
    };
}

/**
 * Creates a reusable repository for querying and creating post comments.
 *
 * @param {import("@prisma/client").PrismaClient} prisma - Prisma client instance.
 * @returns {{
 *   findCommentsByPostId: Function,
 *   createComment: Function
 * }} Comment repository methods.
 */
function createCommentRepository(prisma) {
    /**
     * Finds active comments for an active post ordered chronologically.
     *
     * @param {string} postId - Post UUID.
     * @param {string} viewerId - Current account UUID.
     * @returns {Promise<Array<object>>} Matching comments with author metadata.
     */
    async function findCommentsByPostId(postId, viewerId) {
        const comments = await prisma.comment.findMany({
            where: buildVisibleCommentWhere(postId, viewerId),
            select: COMMENT_SELECT,
            orderBy: { created_at: "asc" }
        });
        return comments.map(mapComment);
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
        const post = await prisma.post.findFirst({
            where: {
                id_post: postId,
                status: "ACTIVE",
                User: { ...buildVisibleAccountFilter(resolvedViewerId), ...buildNotBlockedFilter(resolvedViewerId) }
            },
            select: { id_post: true }
        });
        if (post === null) {
            return null;
        }

        // Replace DEMO_USER_ID with the authenticated user id once auth is implemented.
        const comment = await prisma.comment.create({
            data: {
                id_comment: crypto.randomUUID(),
                id_post: postId,
                id_user: viewerId || userId || DEMO_USER_ID,
                content,
                is_spoiler: Boolean(isSpoiler)
            },
            select: COMMENT_SELECT
        });
        return mapComment(comment);
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
