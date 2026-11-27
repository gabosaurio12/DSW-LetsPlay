const crypto = require("node:crypto");

// Temporary demo user until authentication is implemented.
const DEMO_USER_ID = "10000000-0000-4000-8000-000000000001";
const DEFAULT_REMOVAL_COMMENT = "Content removed by moderator";
const RECORD_NOT_FOUND_CODE = "P2025";

const CREATED_REPORT_SELECT = {
    id_report: true,
    id_reporter: true,
    content_type: true,
    id_reported_content: true,
    reason: true,
    description: true,
    status: true,
    id_reviewed_by: true,
    created_at: true,
    reviewed_at: true
};

const UPDATED_REPORT_SELECT = {
    id_report: true,
    id_reporter: true,
    content_type: true,
    id_reported_content: true,
    reason: true,
    description: true,
    evidence_url: true,
    status: true,
    id_reviewed_by: true,
    review_comment: true,
    created_at: true,
    reviewed_at: true
};

const REPORT_LIST_SELECT = {
    ...UPDATED_REPORT_SELECT,
    User_Report_id_reporterToUser: { select: { username: true, display_name: true } },
    User_Report_id_reviewed_byToUser: { select: { username: true, display_name: true } }
};

/**
 * Resolves the reported content preview and status for a report, following the
 * content type. LFG posts share the POST content type.
 *
 * @param {{ content_type: string, id_reported_content: string }} report - Report row.
 * @param {{ posts: Map, lfgPosts: Map, comments: Map }} contentById - Reported content indexed by id.
 * @returns {{ reported_content_preview: string|null, reported_content_status: string|null }}
 * Preview text and status of the reported content.
 */
function resolveReportedContent(report, contentById) {
    if (report.content_type === "POST") {
        const post = contentById.posts.get(report.id_reported_content);
        const lfgPost = contentById.lfgPosts.get(report.id_reported_content);
        return {
            reported_content_preview: post?.content ?? lfgPost?.description ?? null,
            reported_content_status: post?.status ?? lfgPost?.status ?? null
        };
    }

    if (report.content_type === "COMMENT") {
        const comment = contentById.comments.get(report.id_reported_content);
        return {
            reported_content_preview: comment?.content ?? null,
            reported_content_status: comment ? "ACTIVE" : null
        };
    }

    return { reported_content_preview: null, reported_content_status: null };
}

/**
 * Creates a reusable repository for persisting and moderating content reports.
 *
 * @param {import("@prisma/client").PrismaClient} prisma - Prisma client instance.
 * @returns {{
 *   createReport: Function,
 *   findReports: Function,
 *   updateReportStatus: Function,
 *   removeReportedContentAndAttend: Function
 * }} Report repository methods.
 */
function createReportRepository(prisma) {
    function findActivePost(id) {
        return prisma.post.findFirst({
            where: { id_post: id, status: "ACTIVE" },
            select: { id_post: true }
        });
    }

    function findOpenLfgPost(id) {
        return prisma.lfgPost.findFirst({
            where: { id_lfg: id, status: "OPEN" },
            select: { id_lfg: true }
        });
    }

    function findComment(id) {
        return prisma.comment.findFirst({
            where: { id_comment: id },
            select: { id_comment: true }
        });
    }

    const CONTENT_EXISTENCE_CHECKS = {
        // LFG posts share the "POST" report content type so they can be reported without altering the DB enum.
        POST: [findActivePost, findOpenLfgPost],
        COMMENT: [findComment]
    };

    async function contentExists(contentType, reportedContentId) {
        const checks = CONTENT_EXISTENCE_CHECKS[contentType];
        if (!checks) {
            return true;
        }

        const found = await Promise.all(checks.map((check) => check(reportedContentId)));
        return found.some(Boolean);
    }

    async function findReportedContentById(reports) {
        const idsOfType = (type) => reports
            .filter((report) => report.content_type === type)
            .map((report) => report.id_reported_content);
        const postIds = idsOfType("POST");

        const [posts, lfgPosts, comments] = await Promise.all([
            prisma.post.findMany({
                where: { id_post: { in: postIds } },
                select: { id_post: true, content: true, status: true }
            }),
            prisma.lfgPost.findMany({
                where: { id_lfg: { in: postIds } },
                select: { id_lfg: true, description: true, status: true }
            }),
            prisma.comment.findMany({
                where: { id_comment: { in: idsOfType("COMMENT") } },
                select: { id_comment: true, content: true }
            })
        ]);

        return {
            posts: new Map(posts.map((post) => [post.id_post, post])),
            lfgPosts: new Map(lfgPosts.map((lfgPost) => [lfgPost.id_lfg, lfgPost])),
            comments: new Map(comments.map((comment) => [comment.id_comment, comment]))
        };
    }

    async function removeReportedContent(tx, report) {
        if (report.content_type === "POST") {
            const { count } = await tx.post.updateMany({
                where: { id_post: report.id_reported_content },
                data: { status: "DELETED" }
            });
            if (count === 0) {
                await tx.lfgPost.updateMany({
                    where: { id_lfg: report.id_reported_content },
                    data: { status: "CANCELLED" }
                });
            }
        } else if (report.content_type === "COMMENT") {
            await tx.comment.deleteMany({ where: { id_comment: report.id_reported_content } });
        }
    }

    /**
     * Creates a pending report after verifying referenced post, LFG post, or comment existence.
     *
     * @param {{
     *   reporterId?: string,
     *   contentType: "POST" | "COMMENT" | "USER" | "COMMUNITY",
     *   reportedContentId: string,
     *   reason: "TOXICITY" | "INAPPROPRIATE" | "SPAM" | "SPOILER" | "PIRACY" | "OTHER",
     *   description: string
     * }} params - Report creation payload.
     * @returns {Promise<object|null>} Created report row or null if the target content does not exist.
     */
    async function createReport({ reporterId, contentType, reportedContentId, reason, description }) {
        const exists = await contentExists(contentType, reportedContentId);
        if (!exists) {
            return null;
        }

        // Replace DEMO_USER_ID with the authenticated user id once auth is implemented.
        return prisma.report.create({
            data: {
                id_report: crypto.randomUUID(),
                id_reporter: reporterId || DEMO_USER_ID,
                content_type: contentType,
                id_reported_content: reportedContentId,
                reason,
                description,
                status: "PENDING"
            },
            select: CREATED_REPORT_SELECT
        });
    }

    /**
     * Lists moderation reports ordered by creation date descending with reporter, reviewer, and target content info.
     *
     * @param {{ status?: "PENDING" | "IN_REVIEW" | "ATTENDED" | "CLOSED" }} [filters] - Optional status filter.
     * @returns {Promise<object[]>} Matching report rows.
     */
    async function findReports({ status } = {}) {
        const reports = await prisma.report.findMany({
            where: status ? { status } : undefined,
            select: REPORT_LIST_SELECT,
            orderBy: { created_at: "desc" }
        });
        const contentById = await findReportedContentById(reports);

        return reports.map(({ User_Report_id_reporterToUser, User_Report_id_reviewed_byToUser, ...report }) => ({
            ...report,
            reporter_username: User_Report_id_reporterToUser.username,
            reporter_display_name: User_Report_id_reporterToUser.display_name,
            reviewer_username: User_Report_id_reviewed_byToUser?.username ?? null,
            reviewer_display_name: User_Report_id_reviewed_byToUser?.display_name ?? null,
            ...resolveReportedContent(report, contentById)
        }));
    }

    /**
     * Updates a report status and review metadata while satisfying chk_report_status_review.
     *
     * @param {{
     *   reportId: string,
     *   status: "IN_REVIEW" | "ATTENDED" | "CLOSED",
     *   reviewComment?: string,
     *   reviewerId?: string
     * }} params - Status update payload.
     * @returns {Promise<object|null>} Updated report row or null if the report does not exist.
     */
    async function updateReportStatus({ reportId, status, reviewComment, reviewerId }) {
        const resolvedReviewComment = typeof reviewComment === "string" && reviewComment.trim().length > 0
            ? reviewComment.trim()
            : undefined;

        try {
            return await prisma.report.update({
                where: { id_report: reportId },
                data: {
                    status,
                    review_comment: resolvedReviewComment,
                    id_reviewed_by: reviewerId || DEMO_USER_ID,
                    reviewed_at: new Date()
                },
                select: UPDATED_REPORT_SELECT
            });
        } catch (error) {
            if (error.code === RECORD_NOT_FOUND_CODE) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Removes or hides reported content inside a transaction and marks the report as ATTENDED.
     *
     * @param {{
     *   reportId: string,
     *   reviewComment?: string,
     *   reviewerId?: string
     * }} params - Content removal payload.
     * @returns {Promise<object|null>} Updated report row or null if the report does not exist.
     */
    async function removeReportedContentAndAttend({ reportId, reviewComment, reviewerId }) {
        const resolvedReviewerId = reviewerId || DEMO_USER_ID;
        const resolvedReviewComment = typeof reviewComment === "string" ? reviewComment.trim() : "";

        return prisma.$transaction(async (tx) => {
            const report = await tx.report.findUnique({
                where: { id_report: reportId },
                select: { id_report: true, content_type: true, id_reported_content: true, review_comment: true }
            });
            if (!report) {
                return null;
            }

            await removeReportedContent(tx, report);

            return tx.report.update({
                where: { id_report: reportId },
                data: {
                    status: "ATTENDED",
                    id_reviewed_by: resolvedReviewerId,
                    reviewed_at: new Date(),
                    review_comment: resolvedReviewComment || (report.review_comment ?? DEFAULT_REMOVAL_COMMENT)
                },
                select: UPDATED_REPORT_SELECT
            });
        });
    }

    return {
        createReport,
        findReports,
        updateReportStatus,
        removeReportedContentAndAttend
    };
}

module.exports = {
    DEMO_USER_ID,
    createReportRepository
};
