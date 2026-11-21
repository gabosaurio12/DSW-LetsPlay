const crypto = require("crypto");

// Temporary demo user until authentication is implemented.
const DEMO_USER_ID = "10000000-0000-4000-8000-000000000001";

const CONTENT_EXISTENCE_QUERIES = {
    // LFG posts share the "POST" report content type so they can be reported without altering the DB enum.
    POST: [
        `
SELECT "id_post"
FROM "Post"
WHERE "id_post" = $1
  AND "status" = 'ACTIVE'
`,
        `
SELECT "id_lfg"
FROM "LfgPost"
WHERE "id_lfg" = $1
  AND "status" = 'OPEN'
`
    ],
    COMMENT: [
        `
SELECT "id_comment"
FROM "Comment"
WHERE "id_comment" = $1
`
    ]
};

const INSERT_REPORT_SQL = `
INSERT INTO "Report" (
    "id_report",
    "id_reporter",
    "content_type",
    "id_reported_content",
    "reason",
    "description",
    "status",
    "id_reviewed_by",
    "reviewed_at"
)
VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NULL, NULL)
RETURNING "id_report", "id_reporter", "content_type", "id_reported_content",
          "reason", "description", "status", "id_reviewed_by", "created_at", "reviewed_at"
`;

const SELECT_REPORTS_BASE_SQL = `
SELECT r."id_report",
       r."id_reporter",
       r."content_type",
       r."id_reported_content",
       r."reason",
       r."description",
       r."evidence_url",
       r."status",
       r."id_reviewed_by",
       r."review_comment",
       r."created_at",
       r."reviewed_at",
       reporter."username" AS "reporter_username",
       reporter."display_name" AS "reporter_display_name",
       reviewer."username" AS "reviewer_username",
       reviewer."display_name" AS "reviewer_display_name",
       COALESCE(p."content", lfg."description", c."content") AS "reported_content_preview",
       COALESCE(
           p."status"::text,
           lfg."status"::text,
           CASE WHEN c."id_comment" IS NOT NULL THEN 'ACTIVE' ELSE NULL END
       ) AS "reported_content_status"
FROM "Report" r
JOIN "User" reporter ON reporter."id_user" = r."id_reporter"
LEFT JOIN "User" reviewer ON reviewer."id_user" = r."id_reviewed_by"
LEFT JOIN "Post" p
       ON r."content_type" = 'POST'
      AND p."id_post" = r."id_reported_content"
LEFT JOIN "LfgPost" lfg
       ON r."content_type" = 'POST'
      AND lfg."id_lfg" = r."id_reported_content"
LEFT JOIN "Comment" c
       ON r."content_type" = 'COMMENT'
      AND c."id_comment" = r."id_reported_content"
`;

const UPDATE_REPORT_STATUS_SQL = `
UPDATE "Report"
SET "status" = $2,
    "review_comment" = COALESCE($3, "review_comment"),
    "id_reviewed_by" = $4,
    "reviewed_at" = now()
WHERE "id_report" = $1
RETURNING "id_report", "id_reporter", "content_type", "id_reported_content",
          "reason", "description", "evidence_url", "status", "id_reviewed_by",
          "review_comment", "created_at", "reviewed_at"
`;

const SELECT_REPORT_TARGET_SQL = `
SELECT "id_report", "content_type", "id_reported_content"
FROM "Report"
WHERE "id_report" = $1
`;

const SOFT_DELETE_POST_SQL = `
UPDATE "Post"
SET "status" = 'DELETED'
WHERE "id_post" = $1
`;

const CANCEL_LFG_POST_SQL = `
UPDATE "LfgPost"
SET "status" = 'CANCELLED'
WHERE "id_lfg" = $1
`;

const DELETE_COMMENT_SQL = `
DELETE FROM "Comment"
WHERE "id_comment" = $1
`;

const ATTEND_REMOVED_REPORT_SQL = `
UPDATE "Report"
SET "status" = 'ATTENDED',
    "id_reviewed_by" = $3,
    "reviewed_at" = now(),
    "review_comment" = COALESCE(NULLIF($2, ''), "review_comment", 'Content removed by moderator')
WHERE "id_report" = $1
RETURNING "id_report", "id_reporter", "content_type", "id_reported_content",
          "reason", "description", "evidence_url", "status", "id_reviewed_by",
          "review_comment", "created_at", "reviewed_at"
`;

/**
 * Creates a reusable repository for persisting and moderating content reports.
 *
 * @param {import("pg").Pool} pool - PostgreSQL pool instance.
 * @returns {{
 *   createReport: Function,
 *   findReports: Function,
 *   updateReportStatus: Function,
 *   removeReportedContentAndAttend: Function
 * }} Report repository methods.
 */
function createReportRepository(pool) {
    async function withTransaction(work) {
        // Use a dedicated client transaction when pool.connect is available; fall back to pool.query for simple unit test mocks.
        if (typeof pool.connect !== "function") {
            return work(pool);
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const result = await work(client);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async function contentExists(contentType, reportedContentId) {
        const queries = CONTENT_EXISTENCE_QUERIES[contentType];
        if (!queries) {
            return true;
        }

        for (const sql of queries) {
            const existenceResult = await pool.query(sql, [reportedContentId]);
            if (existenceResult.rows.length > 0) {
                return true;
            }
        }

        return false;
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

        const reportId = crypto.randomUUID();
        // Replace DEMO_USER_ID with the authenticated user id once auth is implemented.
        const resolvedReporterId = reporterId || DEMO_USER_ID;

        const result = await pool.query(INSERT_REPORT_SQL, [
            reportId,
            resolvedReporterId,
            contentType,
            reportedContentId,
            reason,
            description
        ]);

        return result.rows[0] || null;
    }

    /**
     * Lists moderation reports ordered by creation date descending with reporter, reviewer, and target content info.
     *
     * @param {{ status?: "PENDING" | "IN_REVIEW" | "ATTENDED" | "CLOSED" }} [filters] - Optional status filter.
     * @returns {Promise<object[]>} Matching report rows.
     */
    async function findReports({ status } = {}) {
        const params = [];
        let whereClause = "";

        if (status) {
            params.push(status);
            whereClause = `\nWHERE r."status" = $1`;
        }

        const sql = `${SELECT_REPORTS_BASE_SQL}${whereClause}\nORDER BY r."created_at" DESC`;
        const result = await pool.query(sql, params);
        return result.rows;
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
        const resolvedReviewerId = reviewerId || DEMO_USER_ID;
        const resolvedReviewComment = typeof reviewComment === "string" && reviewComment.trim().length > 0
            ? reviewComment.trim()
            : null;

        const result = await pool.query(UPDATE_REPORT_STATUS_SQL, [
            reportId,
            status,
            resolvedReviewComment,
            resolvedReviewerId
        ]);

        return result.rows[0] || null;
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

        return withTransaction(async (client) => {
            const reportResult = await client.query(SELECT_REPORT_TARGET_SQL, [reportId]);
            if (reportResult.rows.length === 0) {
                return null;
            }

            const report = reportResult.rows[0];

            if (report.content_type === "POST") {
                const postResult = await client.query(SOFT_DELETE_POST_SQL, [report.id_reported_content]);
                if ((postResult.rowCount ?? 0) === 0) {
                    await client.query(CANCEL_LFG_POST_SQL, [report.id_reported_content]);
                }
            } else if (report.content_type === "COMMENT") {
                await client.query(DELETE_COMMENT_SQL, [report.id_reported_content]);
            }

            const updateResult = await client.query(ATTEND_REMOVED_REPORT_SQL, [
                reportId,
                resolvedReviewComment,
                resolvedReviewerId
            ]);

            return updateResult.rows[0] || null;
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
