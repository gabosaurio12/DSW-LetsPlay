const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { DEMO_USER_ID, createReportRepository } = require("../src/repositories/reportRepository");

const SAMPLE_CONTENT_ID = "33333333-3333-4333-8333-333333333333";
const SAMPLE_REPORTER_ID = "22222222-2222-4222-8222-222222222222";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createMockVideogameRepository() {
    return {
        async findPublicVideogames() {
            return [];
        },
        async findPublicVideogameFilters() {
            return { genres: [], platforms: [] };
        },
        async findPublicVideogameById() {
            return null;
        },
        async findRelatedCommunitiesByVideogameId() {
            return [];
        },
        async findPublicPostsByVideogameId() {
            return [];
        },
        async findCommentsByPostId() {
            return [];
        }
    };
}

const SAMPLE_REPORT_ID = "44444444-4444-4444-8444-444444444444";
const SAMPLE_REVIEWER_ID = "55555555-5555-4555-8555-555555555555";

function createMockReportRepository(overrides = {}) {
    return {
        async createReport() {
            return null;
        },
        async findReports() {
            return [];
        },
        async updateReportStatus() {
            return null;
        },
        async removeReportedContentAndAttend() {
            return null;
        },
        ...overrides
    };
}

const allowModeration = (req, res, next) => next();

async function withServer(reportRepository, callback, options = {}) {
    const app = createApp({
        videogameRepository: createMockVideogameRepository(),
        reportRepository,
        authRepository: options.authRepository,
        requireModerator: options.enforceModeration ? undefined : allowModeration
    });
    const server = await new Promise((resolve) => {
        const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
        await callback(baseUrl);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    }
}

describe("reportsRouter", () => {
    it("POST /api/reports returns 400 for invalid contentType", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentType: "INVALID",
                    reportedContentId: SAMPLE_CONTENT_ID,
                    reason: "SPAM",
                    description: "Spam post"
                })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid content type" });
        });
    });

    it("POST /api/reports returns 400 for invalid reportedContentId UUID", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentType: "POST",
                    reportedContentId: "not-a-uuid",
                    reason: "SPAM",
                    description: "Spam post"
                })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid reported content id" });
        });
    });

    it("POST /api/reports returns 400 for invalid reason", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentType: "POST",
                    reportedContentId: SAMPLE_CONTENT_ID,
                    reason: "UNKNOWN_REASON",
                    description: "Spam post"
                })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid report reason" });
        });
    });

    it("POST /api/reports returns 400 for empty or whitespace description", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentType: "COMMENT",
                    reportedContentId: SAMPLE_CONTENT_ID,
                    reason: "TOXICITY",
                    description: "   "
                })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Report description is required" });
        });
    });

    it("POST /api/reports returns 400 when reporterId is not a valid UUID", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reporterId: "bad-uuid",
                    contentType: "POST",
                    reportedContentId: SAMPLE_CONTENT_ID,
                    reason: "SPOILER",
                    description: "Unmarked ending spoiler"
                })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid reporter id" });
        });
    });

    it("POST /api/reports returns 404 when reported content does not exist", async () => {
        const repository = createMockReportRepository({
            async createReport() {
                return null;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentType: "POST",
                    reportedContentId: SAMPLE_CONTENT_ID,
                    reason: "INAPPROPRIATE",
                    description: "Inappropriate image"
                })
            });
            const body = await response.json();

            assert.equal(response.status, 404);
            assert.deepEqual(body, { error: "Reported content not found" });
        });
    });

    it("POST /api/reports returns 201 with created report", async () => {
        const expectedReport = {
            id_report: "44444444-4444-4444-8444-444444444444",
            id_reporter: SAMPLE_REPORTER_ID,
            content_type: "POST",
            id_reported_content: SAMPLE_CONTENT_ID,
            reason: "SPOILER",
            description: "Contains boss spoiler",
            status: "PENDING",
            id_reviewed_by: null,
            created_at: "2026-01-01T00:00:00.000Z",
            reviewed_at: null
        };

        let capturedPayload = null;
        const repository = createMockReportRepository({
            async createReport(payload) {
                capturedPayload = payload;
                return expectedReport;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reporterId: SAMPLE_REPORTER_ID,
                    contentType: "POST",
                    reportedContentId: SAMPLE_CONTENT_ID,
                    reason: "SPOILER",
                    description: "  Contains boss spoiler  "
                })
            });
            const body = await response.json();

            assert.equal(response.status, 201);
            assert.deepEqual(body, { report: expectedReport });
            assert.deepEqual(capturedPayload, {
                reporterId: SAMPLE_REPORTER_ID,
                contentType: "POST",
                reportedContentId: SAMPLE_CONTENT_ID,
                reason: "SPOILER",
                description: "Contains boss spoiler"
            });
        });
    });

    it("GET /api/reports returns 400 for invalid status query param", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports?status=INVALID`);
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid report status" });
        });
    });

    it("GET /api/reports returns 200 with reports and forwards optional status", async () => {
        const expectedReports = [
            {
                id_report: SAMPLE_REPORT_ID,
                status: "PENDING",
                reporter_username: "player1",
                reported_content_preview: "Spam message"
            }
        ];

        const capturedFilters = [];
        const repository = createMockReportRepository({
            async findReports(filters) {
                capturedFilters.push(filters);
                return expectedReports;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const allResponse = await fetch(`${baseUrl}/api/reports`);
            const allBody = await allResponse.json();
            assert.equal(allResponse.status, 200);
            assert.deepEqual(allBody, { reports: expectedReports });

            const filteredResponse = await fetch(`${baseUrl}/api/reports?status=IN_REVIEW`);
            const filteredBody = await filteredResponse.json();
            assert.equal(filteredResponse.status, 200);
            assert.deepEqual(filteredBody, { reports: expectedReports });
        });

        assert.deepEqual(capturedFilters, [
            { status: undefined },
            { status: "IN_REVIEW" }
        ]);
    });

    it("PATCH /api/reports/:id returns 400 for invalid report id", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports/not-a-uuid`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "IN_REVIEW" })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid report id" });
        });
    });

    it("PATCH /api/reports/:id returns 400 for invalid status", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports/${SAMPLE_REPORT_ID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "PENDING" })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid report status" });
        });
    });

    it("PATCH /api/reports/:id returns 400 for invalid reviewComment or reviewerId", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const commentResponse = await fetch(`${baseUrl}/api/reports/${SAMPLE_REPORT_ID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CLOSED", reviewComment: 123 })
            });
            assert.equal(commentResponse.status, 400);
            assert.deepEqual(await commentResponse.json(), { error: "Invalid review comment" });

            const reviewerResponse = await fetch(`${baseUrl}/api/reports/${SAMPLE_REPORT_ID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CLOSED", reviewerId: "bad-uuid" })
            });
            assert.equal(reviewerResponse.status, 400);
            assert.deepEqual(await reviewerResponse.json(), { error: "Invalid reviewer id" });
        });
    });

    it("PATCH /api/reports/:id returns 404 when report does not exist", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports/${SAMPLE_REPORT_ID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "ATTENDED", reviewComment: "Handled" })
            });
            const body = await response.json();

            assert.equal(response.status, 404);
            assert.deepEqual(body, { error: "Report not found" });
        });
    });

    it("PATCH /api/reports/:id returns 200 with updated report", async () => {
        const expectedReport = {
            id_report: SAMPLE_REPORT_ID,
            status: "CLOSED",
            id_reviewed_by: SAMPLE_REVIEWER_ID,
            review_comment: "No violation found"
        };

        let capturedPayload = null;
        const repository = createMockReportRepository({
            async updateReportStatus(payload) {
                capturedPayload = payload;
                return expectedReport;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports/${SAMPLE_REPORT_ID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "CLOSED",
                    reviewComment: "  No violation found  ",
                    reviewerId: SAMPLE_REVIEWER_ID
                })
            });
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.deepEqual(body, { report: expectedReport });
            assert.deepEqual(capturedPayload, {
                reportId: SAMPLE_REPORT_ID,
                status: "CLOSED",
                reviewComment: "No violation found",
                reviewerId: SAMPLE_REVIEWER_ID
            });
        });
    });

    it("POST /api/reports/:id/remove-content returns 400 for invalid report id", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports/not-a-uuid/remove-content`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid report id" });
        });
    });

    it("POST /api/reports/:id/remove-content returns 404 when report does not exist", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports/${SAMPLE_REPORT_ID}/remove-content`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reviewComment: "Removed" })
            });
            const body = await response.json();

            assert.equal(response.status, 404);
            assert.deepEqual(body, { error: "Report not found" });
        });
    });

    it("POST /api/reports/:id/remove-content returns 200 with report and contentRemoved true", async () => {
        const expectedReport = {
            id_report: SAMPLE_REPORT_ID,
            status: "ATTENDED",
            id_reviewed_by: SAMPLE_REVIEWER_ID,
            review_comment: "Removed spam post"
        };

        let capturedPayload = null;
        const repository = createMockReportRepository({
            async removeReportedContentAndAttend(payload) {
                capturedPayload = payload;
                return expectedReport;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports/${SAMPLE_REPORT_ID}/remove-content`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reviewComment: "  Removed spam post  ",
                    reviewerId: SAMPLE_REVIEWER_ID
                })
            });
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.deepEqual(body, { report: expectedReport, contentRemoved: true });
            assert.deepEqual(capturedPayload, {
                reportId: SAMPLE_REPORT_ID,
                reviewComment: "Removed spam post",
                reviewerId: SAMPLE_REVIEWER_ID
            });
        });
    });
});

describe("reportsRouter moderation access", () => {
    it("should return 401 for GET /api/reports when the request has no session cookie", async () => {
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports`);
            assert.equal(response.status, 401);
        }, { enforceModeration: true });
    });

    it("should return 403 for PATCH /api/reports/:id when the session account cannot moderate", async () => {
        const authRepository = {
            async findActiveSessionUser() {
                return { id_user: SAMPLE_REPORTER_ID, username: "player_one" };
            }
        };
        await withServer(createMockReportRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/reports/${SAMPLE_CONTENT_ID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Cookie: "letsplay_session=session-token" },
                body: JSON.stringify({ status: "CLOSED" })
            });
            const body = await response.json();
            assert.equal(response.status, 403);
            assert.equal(body.error, "Moderation permission required");
        }, { enforceModeration: true, authRepository });
    });
});

describe("reportRepository", () => {
    it("createReport returns null when neither active post nor open LFG post is found", async () => {
        const queries = [];
        const pool = {
            async query(sql, params) {
                queries.push({ sql, params });
                return { rows: [] };
            }
        };

        const repository = createReportRepository(pool);
        const result = await repository.createReport({
            contentType: "POST",
            reportedContentId: SAMPLE_CONTENT_ID,
            reason: "SPAM",
            description: "Spam link"
        });

        assert.equal(result, null);
        assert.equal(queries.length, 2);
        assert.match(queries[0].sql, /FROM "Post"/);
        assert.match(queries[0].sql, /"status" = 'ACTIVE'/);
        assert.deepEqual(queries[0].params, [SAMPLE_CONTENT_ID]);
        assert.match(queries[1].sql, /FROM "LfgPost"/);
        assert.match(queries[1].sql, /"id_lfg" = \$1/);
        assert.match(queries[1].sql, /"status" = 'OPEN'/);
        assert.deepEqual(queries[1].params, [SAMPLE_CONTENT_ID]);
    });

    it("createReport falls back to open LfgPost when active Post is not found", async () => {
        const queries = [];
        const createdRow = {
            id_report: "generated",
            id_reporter: DEMO_USER_ID,
            content_type: "POST",
            id_reported_content: SAMPLE_CONTENT_ID,
            reason: "TOXICITY",
            description: "Toxic LFG listing",
            status: "PENDING",
            id_reviewed_by: null,
            created_at: "2026-01-01T00:00:00.000Z",
            reviewed_at: null
        };

        const pool = {
            async query(sql, params) {
                queries.push({ sql, params });
                if (queries.length === 1) {
                    return { rows: [] };
                }
                if (queries.length === 2) {
                    return { rows: [{ id_lfg: SAMPLE_CONTENT_ID }] };
                }
                return { rows: [createdRow] };
            }
        };

        const repository = createReportRepository(pool);
        const result = await repository.createReport({
            contentType: "POST",
            reportedContentId: SAMPLE_CONTENT_ID,
            reason: "TOXICITY",
            description: "Toxic LFG listing"
        });

        assert.deepEqual(result, createdRow);
        assert.equal(queries.length, 3);
        assert.match(queries[0].sql, /FROM "Post"/);
        assert.match(queries[1].sql, /FROM "LfgPost"/);
        assert.match(queries[1].sql, /"id_lfg" = \$1/);
        assert.match(queries[1].sql, /"status" = 'OPEN'/);
        assert.deepEqual(queries[1].params, [SAMPLE_CONTENT_ID]);
        assert.match(queries[2].sql, /INSERT INTO "Report"/);
        assert.equal(queries[2].params[2], "POST");
        assert.equal(queries[2].params[3], SAMPLE_CONTENT_ID);
    });

    it("createReport returns null when comment is not found", async () => {
        const queries = [];
        const pool = {
            async query(sql, params) {
                queries.push({ sql, params });
                return { rows: [] };
            }
        };

        const repository = createReportRepository(pool);
        const result = await repository.createReport({
            contentType: "COMMENT",
            reportedContentId: SAMPLE_CONTENT_ID,
            reason: "TOXICITY",
            description: "Insult"
        });

        assert.equal(result, null);
        assert.equal(queries.length, 1);
        assert.match(queries[0].sql, /FROM "Comment"/);
        assert.deepEqual(queries[0].params, [SAMPLE_CONTENT_ID]);
    });

    it("createReport inserts with generated UUID, demo user, and PENDING status when reporterId is omitted", async () => {
        const queries = [];
        const createdRow = {
            id_report: "generated",
            id_reporter: DEMO_USER_ID,
            content_type: "POST",
            id_reported_content: SAMPLE_CONTENT_ID,
            reason: "PIRACY",
            description: "Pirated link",
            status: "PENDING",
            id_reviewed_by: null,
            created_at: "2026-01-01T00:00:00.000Z",
            reviewed_at: null
        };

        const pool = {
            async query(sql, params) {
                queries.push({ sql, params });
                if (queries.length === 1) {
                    return { rows: [{ id_post: SAMPLE_CONTENT_ID }] };
                }
                return { rows: [createdRow] };
            }
        };

        const repository = createReportRepository(pool);
        const result = await repository.createReport({
            contentType: "POST",
            reportedContentId: SAMPLE_CONTENT_ID,
            reason: "PIRACY",
            description: "Pirated link"
        });

        assert.deepEqual(result, createdRow);
        assert.equal(queries.length, 2);
        assert.match(queries[1].sql, /INSERT INTO "Report"/);
        assert.match(queries[1].sql, /'PENDING', NULL, NULL/);
        assert.match(queries[1].params[0], UUID_REGEX);
        assert.equal(queries[1].params[1], DEMO_USER_ID);
        assert.equal(queries[1].params[2], "POST");
        assert.equal(queries[1].params[3], SAMPLE_CONTENT_ID);
        assert.equal(queries[1].params[4], "PIRACY");
        assert.equal(queries[1].params[5], "Pirated link");
    });

    it("createReport uses explicit reporterId for USER or COMMUNITY without post/comment lookup", async () => {
        const queries = [];
        const createdRow = {
            id_report: "generated",
            id_reporter: SAMPLE_REPORTER_ID,
            content_type: "COMMUNITY",
            id_reported_content: SAMPLE_CONTENT_ID,
            reason: "OTHER",
            description: "Off-topic community",
            status: "PENDING",
            id_reviewed_by: null,
            created_at: "2026-01-01T00:00:00.000Z",
            reviewed_at: null
        };

        const pool = {
            async query(sql, params) {
                queries.push({ sql, params });
                return { rows: [createdRow] };
            }
        };

        const repository = createReportRepository(pool);
        const result = await repository.createReport({
            reporterId: SAMPLE_REPORTER_ID,
            contentType: "COMMUNITY",
            reportedContentId: SAMPLE_CONTENT_ID,
            reason: "OTHER",
            description: "Off-topic community"
        });

        assert.deepEqual(result, createdRow);
        assert.equal(queries.length, 1);
        assert.equal(queries[0].params[1], SAMPLE_REPORTER_ID);
        assert.equal(queries[0].params[2], "COMMUNITY");
    });

    it("findReports joins reporter, reviewer, and reported content with optional status filter", async () => {
        const queries = [];
        const rows = [{ id_report: SAMPLE_REPORT_ID, status: "PENDING" }];
        const pool = {
            async query(sql, params) {
                queries.push({ sql, params });
                return { rows };
            }
        };

        const repository = createReportRepository(pool);
        const allReports = await repository.findReports();
        const pendingReports = await repository.findReports({ status: "PENDING" });

        assert.deepEqual(allReports, rows);
        assert.deepEqual(pendingReports, rows);
        assert.equal(queries.length, 2);
        assert.match(queries[0].sql, /FROM "Report" r/);
        assert.match(queries[0].sql, /LEFT JOIN "Post" p/);
        assert.match(queries[0].sql, /LEFT JOIN "LfgPost" lfg/);
        assert.match(queries[0].sql, /LEFT JOIN "Comment" c/);
        assert.match(queries[0].sql, /ORDER BY r\."created_at" DESC/);
        assert.deepEqual(queries[0].params, []);
        assert.match(queries[1].sql, /WHERE r\."status" = \$1/);
        assert.deepEqual(queries[1].params, ["PENDING"]);
    });

    it("updateReportStatus sets reviewer and reviewed_at and returns null when missing", async () => {
        const queries = [];
        const updatedRow = {
            id_report: SAMPLE_REPORT_ID,
            status: "IN_REVIEW",
            id_reviewed_by: DEMO_USER_ID,
            review_comment: "Checking"
        };
        const pool = {
            async query(sql, params) {
                queries.push({ sql, params });
                if (queries.length === 1) {
                    return { rows: [] };
                }
                return { rows: [updatedRow] };
            }
        };

        const repository = createReportRepository(pool);
        const missing = await repository.updateReportStatus({
            reportId: SAMPLE_REPORT_ID,
            status: "IN_REVIEW"
        });
        const updated = await repository.updateReportStatus({
            reportId: SAMPLE_REPORT_ID,
            status: "IN_REVIEW",
            reviewComment: "Checking"
        });

        assert.equal(missing, null);
        assert.deepEqual(updated, updatedRow);
        assert.match(queries[1].sql, /UPDATE "Report"/);
        assert.match(queries[1].sql, /"reviewed_at" = now\(\)/);
        assert.deepEqual(queries[1].params, [SAMPLE_REPORT_ID, "IN_REVIEW", "Checking", DEMO_USER_ID]);
    });

    it("removeReportedContentAndAttend uses a transaction to soft-delete a Post and attend the report", async () => {
        const queries = [];
        let released = false;
        const attendedRow = {
            id_report: SAMPLE_REPORT_ID,
            status: "ATTENDED",
            id_reviewed_by: SAMPLE_REVIEWER_ID,
            review_comment: "Content removed by moderator"
        };

        const pool = {
            async connect() {
                return {
                    async query(sql, params) {
                        queries.push({ sql, params });
                        if (sql.includes('FROM "Report"')) {
                            return {
                                rows: [{
                                    id_report: SAMPLE_REPORT_ID,
                                    content_type: "POST",
                                    id_reported_content: SAMPLE_CONTENT_ID
                                }]
                            };
                        }
                        if (sql.includes('UPDATE "Post"')) {
                            return { rows: [], rowCount: 1 };
                        }
                        if (sql.includes('UPDATE "Report"')) {
                            return { rows: [attendedRow], rowCount: 1 };
                        }
                        return { rows: [], rowCount: 0 };
                    },
                    release() {
                        released = true;
                    }
                };
            }
        };

        const repository = createReportRepository(pool);
        const result = await repository.removeReportedContentAndAttend({
            reportId: SAMPLE_REPORT_ID,
            reviewerId: SAMPLE_REVIEWER_ID
        });

        assert.deepEqual(result, attendedRow);
        assert.equal(released, true);
        assert.equal(queries[0].sql, "BEGIN");
        assert.match(queries[1].sql, /FROM "Report"/);
        assert.match(queries[2].sql, /UPDATE "Post"/);
        assert.match(queries[2].sql, /'DELETED'/);
        assert.match(queries[3].sql, /UPDATE "Report"/);
        assert.match(queries[3].sql, /'ATTENDED'/);
        assert.equal(queries[4].sql, "COMMIT");
    });

    it("removeReportedContentAndAttend falls back to cancelling LfgPost when Post rowCount is 0", async () => {
        const queries = [];
        const attendedRow = { id_report: SAMPLE_REPORT_ID, status: "ATTENDED" };

        const pool = {
            async query(sql, params) {
                queries.push({ sql, params });
                if (sql.includes('FROM "Report"')) {
                    return {
                        rows: [{
                            id_report: SAMPLE_REPORT_ID,
                            content_type: "POST",
                            id_reported_content: SAMPLE_CONTENT_ID
                        }]
                    };
                }
                if (sql.includes('UPDATE "Post"')) {
                    return { rows: [], rowCount: 0 };
                }
                if (sql.includes('UPDATE "LfgPost"')) {
                    return { rows: [], rowCount: 1 };
                }
                return { rows: [attendedRow], rowCount: 1 };
            }
        };

        const repository = createReportRepository(pool);
        const result = await repository.removeReportedContentAndAttend({
            reportId: SAMPLE_REPORT_ID,
            reviewComment: "Cancelled LFG"
        });

        assert.deepEqual(result, attendedRow);
        assert.equal(queries.length, 4);
        assert.match(queries[1].sql, /UPDATE "Post"/);
        assert.match(queries[2].sql, /UPDATE "LfgPost"/);
        assert.match(queries[2].sql, /'CANCELLED'/);
        assert.match(queries[3].sql, /UPDATE "Report"/);
        assert.deepEqual(queries[3].params, [SAMPLE_REPORT_ID, "Cancelled LFG", DEMO_USER_ID]);
    });

    it("removeReportedContentAndAttend deletes Comment and rolls back on failure", async () => {
        const commentQueries = [];
        const attendedRow = { id_report: SAMPLE_REPORT_ID, status: "ATTENDED" };

        const commentPool = {
            async query(sql, params) {
                commentQueries.push({ sql, params });
                if (sql.includes('FROM "Report"')) {
                    return {
                        rows: [{
                            id_report: SAMPLE_REPORT_ID,
                            content_type: "COMMENT",
                            id_reported_content: SAMPLE_CONTENT_ID
                        }]
                    };
                }
                if (sql.includes('DELETE FROM "Comment"')) {
                    return { rows: [], rowCount: 1 };
                }
                return { rows: [attendedRow], rowCount: 1 };
            }
        };

        const commentRepo = createReportRepository(commentPool);
        const commentResult = await commentRepo.removeReportedContentAndAttend({
            reportId: SAMPLE_REPORT_ID
        });

        assert.deepEqual(commentResult, attendedRow);
        assert.match(commentQueries[1].sql, /DELETE FROM "Comment"/);
        assert.deepEqual(commentQueries[1].params, [SAMPLE_CONTENT_ID]);

        const rollbackQueries = [];
        let releasedOnError = false;
        const failingPool = {
            async connect() {
                return {
                    async query(sql) {
                        rollbackQueries.push(sql);
                        if (sql.includes('FROM "Report"')) {
                            throw new Error("DB failure");
                        }
                        return { rows: [] };
                    },
                    release() {
                        releasedOnError = true;
                    }
                };
            }
        };

        const failingRepo = createReportRepository(failingPool);
        await assert.rejects(
            () => failingRepo.removeReportedContentAndAttend({ reportId: SAMPLE_REPORT_ID }),
            /DB failure/
        );
        assert.equal(releasedOnError, true);
        assert.equal(rollbackQueries[0], "BEGIN");
        assert.equal(rollbackQueries[rollbackQueries.length - 1], "ROLLBACK");
    });
});
