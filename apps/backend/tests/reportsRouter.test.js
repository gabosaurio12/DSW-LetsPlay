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

function createFakePrisma(models) {
    const prisma = { ...models };
    prisma.$transaction = async (work) => work(prisma);
    return prisma;
}

const UNEXPECTED_LOOKUP = async () => {
    assert.fail("no content lookup is expected for this content type");
};

describe("reportRepository", () => {
    it("createReport returns null when neither active post nor open LFG post is found", async () => {
        const lookups = [];
        const prisma = createFakePrisma({
            post: {
                async findFirst(args) {
                    lookups.push(args);
                    return null;
                }
            },
            lfgPost: {
                async findFirst(args) {
                    lookups.push(args);
                    return null;
                }
            },
            report: {
                async create() {
                    assert.fail("create must not run when the content is missing");
                }
            }
        });

        const repository = createReportRepository(prisma);
        const result = await repository.createReport({
            contentType: "POST",
            reportedContentId: SAMPLE_CONTENT_ID,
            reason: "SPAM",
            description: "Spam link"
        });

        assert.equal(result, null);
        assert.equal(lookups.length, 2);
        assert.deepEqual(lookups[0].where, { id_post: SAMPLE_CONTENT_ID, status: "ACTIVE" });
        assert.deepEqual(lookups[1].where, { id_lfg: SAMPLE_CONTENT_ID, status: "OPEN" });
    });

    it("createReport accepts an open LfgPost when no active Post is found", async () => {
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
        const creates = [];
        const prisma = createFakePrisma({
            post: {
                async findFirst() {
                    return null;
                }
            },
            lfgPost: {
                async findFirst() {
                    return { id_lfg: SAMPLE_CONTENT_ID };
                }
            },
            report: {
                async create(args) {
                    creates.push(args);
                    return createdRow;
                }
            }
        });

        const repository = createReportRepository(prisma);
        const result = await repository.createReport({
            contentType: "POST",
            reportedContentId: SAMPLE_CONTENT_ID,
            reason: "TOXICITY",
            description: "Toxic LFG listing"
        });

        assert.deepEqual(result, createdRow);
        assert.equal(creates.length, 1);
        assert.equal(creates[0].data.content_type, "POST");
        assert.equal(creates[0].data.id_reported_content, SAMPLE_CONTENT_ID);
    });

    it("createReport returns null when comment is not found", async () => {
        const lookups = [];
        const prisma = createFakePrisma({
            comment: {
                async findFirst(args) {
                    lookups.push(args);
                    return null;
                }
            },
            report: {
                async create() {
                    assert.fail("create must not run when the comment is missing");
                }
            }
        });

        const repository = createReportRepository(prisma);
        const result = await repository.createReport({
            contentType: "COMMENT",
            reportedContentId: SAMPLE_CONTENT_ID,
            reason: "TOXICITY",
            description: "Insult"
        });

        assert.equal(result, null);
        assert.equal(lookups.length, 1);
        assert.deepEqual(lookups[0].where, { id_comment: SAMPLE_CONTENT_ID });
    });

    it("createReport inserts with generated UUID, demo user, and PENDING status when reporterId is omitted", async () => {
        const creates = [];
        const prisma = createFakePrisma({
            post: {
                async findFirst() {
                    return { id_post: SAMPLE_CONTENT_ID };
                }
            },
            lfgPost: {
                async findFirst() {
                    return null;
                }
            },
            report: {
                async create(args) {
                    creates.push(args);
                    return { id_report: args.data.id_report };
                }
            }
        });

        const repository = createReportRepository(prisma);
        await repository.createReport({
            contentType: "POST",
            reportedContentId: SAMPLE_CONTENT_ID,
            reason: "PIRACY",
            description: "Pirated link"
        });

        assert.equal(creates.length, 1);
        assert.match(creates[0].data.id_report, UUID_REGEX);
        assert.deepEqual(creates[0].data, {
            id_report: creates[0].data.id_report,
            id_reporter: DEMO_USER_ID,
            content_type: "POST",
            id_reported_content: SAMPLE_CONTENT_ID,
            reason: "PIRACY",
            description: "Pirated link",
            status: "PENDING"
        });
    });

    it("createReport uses explicit reporterId for USER or COMMUNITY without content lookup", async () => {
        const creates = [];
        const prisma = createFakePrisma({
            post: { findFirst: UNEXPECTED_LOOKUP },
            comment: { findFirst: UNEXPECTED_LOOKUP },
            report: {
                async create(args) {
                    creates.push(args);
                    return { id_report: args.data.id_report };
                }
            }
        });

        const repository = createReportRepository(prisma);
        await repository.createReport({
            reporterId: SAMPLE_REPORTER_ID,
            contentType: "COMMUNITY",
            reportedContentId: SAMPLE_CONTENT_ID,
            reason: "OTHER",
            description: "Off-topic community"
        });

        assert.equal(creates.length, 1);
        assert.equal(creates[0].data.id_reporter, SAMPLE_REPORTER_ID);
        assert.equal(creates[0].data.content_type, "COMMUNITY");
    });

    it("findReports maps reporter, reviewer, and reported content with optional status filter", async () => {
        const reportQueries = [];
        const reportRow = {
            id_report: SAMPLE_REPORT_ID,
            id_reporter: SAMPLE_REPORTER_ID,
            content_type: "POST",
            id_reported_content: SAMPLE_CONTENT_ID,
            reason: "SPAM",
            description: "Spam",
            evidence_url: null,
            status: "PENDING",
            id_reviewed_by: null,
            review_comment: null,
            created_at: "2026-01-01T00:00:00.000Z",
            reviewed_at: null,
            User_Report_id_reporterToUser: { username: "reporter", display_name: "Reporter" },
            User_Report_id_reviewed_byToUser: null
        };
        const prisma = createFakePrisma({
            report: {
                async findMany(args) {
                    reportQueries.push(args);
                    return [reportRow];
                }
            },
            post: {
                async findMany() {
                    return [{ id_post: SAMPLE_CONTENT_ID, content: "Buy now", status: "ACTIVE" }];
                }
            },
            lfgPost: {
                async findMany() {
                    return [];
                }
            },
            comment: {
                async findMany() {
                    return [];
                }
            }
        });

        const repository = createReportRepository(prisma);
        const allReports = await repository.findReports();
        await repository.findReports({ status: "PENDING" });

        assert.equal(allReports.length, 1);
        assert.deepEqual(allReports[0], {
            id_report: SAMPLE_REPORT_ID,
            id_reporter: SAMPLE_REPORTER_ID,
            content_type: "POST",
            id_reported_content: SAMPLE_CONTENT_ID,
            reason: "SPAM",
            description: "Spam",
            evidence_url: null,
            status: "PENDING",
            id_reviewed_by: null,
            review_comment: null,
            created_at: "2026-01-01T00:00:00.000Z",
            reviewed_at: null,
            reporter_username: "reporter",
            reporter_display_name: "Reporter",
            reviewer_username: null,
            reviewer_display_name: null,
            reported_content_preview: "Buy now",
            reported_content_status: "ACTIVE"
        });
        assert.equal(reportQueries[0].where, undefined);
        assert.deepEqual(reportQueries[0].orderBy, { created_at: "desc" });
        assert.deepEqual(reportQueries[1].where, { status: "PENDING" });
    });

    it("updateReportStatus sets reviewer and reviewed_at and returns null when missing", async () => {
        const updates = [];
        const updatedRow = {
            id_report: SAMPLE_REPORT_ID,
            status: "IN_REVIEW",
            id_reviewed_by: DEMO_USER_ID,
            review_comment: "Checking"
        };
        const prisma = createFakePrisma({
            report: {
                async update(args) {
                    updates.push(args);
                    if (updates.length === 1) {
                        throw Object.assign(new Error("Record not found"), { code: "P2025" });
                    }
                    return updatedRow;
                }
            }
        });

        const repository = createReportRepository(prisma);
        const missing = await repository.updateReportStatus({
            reportId: SAMPLE_REPORT_ID,
            status: "IN_REVIEW"
        });
        const updated = await repository.updateReportStatus({
            reportId: SAMPLE_REPORT_ID,
            status: "IN_REVIEW",
            reviewComment: "  Checking  "
        });

        assert.equal(missing, null);
        assert.deepEqual(updated, updatedRow);
        assert.deepEqual(updates[1].where, { id_report: SAMPLE_REPORT_ID });
        assert.equal(updates[1].data.status, "IN_REVIEW");
        assert.equal(updates[1].data.review_comment, "Checking");
        assert.equal(updates[1].data.id_reviewed_by, DEMO_USER_ID);
        assert.ok(updates[1].data.reviewed_at instanceof Date);
    });

    it("updateReportStatus rethrows unexpected database errors", async () => {
        const prisma = createFakePrisma({
            report: {
                async update() {
                    throw new Error("DB failure");
                }
            }
        });

        const repository = createReportRepository(prisma);
        await assert.rejects(
            () => repository.updateReportStatus({ reportId: SAMPLE_REPORT_ID, status: "CLOSED" }),
            /DB failure/
        );
    });

    it("removeReportedContentAndAttend soft-deletes a Post and attends the report in a transaction", async () => {
        const calls = [];
        const attendedRow = {
            id_report: SAMPLE_REPORT_ID,
            status: "ATTENDED",
            id_reviewed_by: SAMPLE_REVIEWER_ID,
            review_comment: "Content removed by moderator"
        };
        const prisma = createFakePrisma({
            report: {
                async findUnique() {
                    return {
                        id_report: SAMPLE_REPORT_ID,
                        content_type: "POST",
                        id_reported_content: SAMPLE_CONTENT_ID,
                        review_comment: null
                    };
                },
                async update(args) {
                    calls.push({ model: "report", args });
                    return attendedRow;
                }
            },
            post: {
                async updateMany(args) {
                    calls.push({ model: "post", args });
                    return { count: 1 };
                }
            },
            lfgPost: {
                async updateMany() {
                    assert.fail("LFG post must not be cancelled when the Post was updated");
                }
            }
        });

        const repository = createReportRepository(prisma);
        const result = await repository.removeReportedContentAndAttend({
            reportId: SAMPLE_REPORT_ID,
            reviewerId: SAMPLE_REVIEWER_ID
        });

        assert.deepEqual(result, attendedRow);
        assert.deepEqual(calls[0], {
            model: "post",
            args: { where: { id_post: SAMPLE_CONTENT_ID }, data: { status: "DELETED" } }
        });
        assert.equal(calls[1].model, "report");
        assert.equal(calls[1].args.data.status, "ATTENDED");
        assert.equal(calls[1].args.data.id_reviewed_by, SAMPLE_REVIEWER_ID);
        assert.equal(calls[1].args.data.review_comment, "Content removed by moderator");
    });

    it("removeReportedContentAndAttend cancels the LfgPost when no Post was updated", async () => {
        const lfgUpdates = [];
        const reportUpdates = [];
        const prisma = createFakePrisma({
            report: {
                async findUnique() {
                    return {
                        id_report: SAMPLE_REPORT_ID,
                        content_type: "POST",
                        id_reported_content: SAMPLE_CONTENT_ID,
                        review_comment: "Earlier note"
                    };
                },
                async update(args) {
                    reportUpdates.push(args);
                    return { id_report: SAMPLE_REPORT_ID, status: "ATTENDED" };
                }
            },
            post: {
                async updateMany() {
                    return { count: 0 };
                }
            },
            lfgPost: {
                async updateMany(args) {
                    lfgUpdates.push(args);
                    return { count: 1 };
                }
            }
        });

        const repository = createReportRepository(prisma);
        const result = await repository.removeReportedContentAndAttend({
            reportId: SAMPLE_REPORT_ID,
            reviewComment: "Cancelled LFG"
        });

        assert.deepEqual(result, { id_report: SAMPLE_REPORT_ID, status: "ATTENDED" });
        assert.deepEqual(lfgUpdates[0], {
            where: { id_lfg: SAMPLE_CONTENT_ID },
            data: { status: "CANCELLED" }
        });
        assert.equal(reportUpdates[0].data.review_comment, "Cancelled LFG");
    });

    it("removeReportedContentAndAttend keeps the existing review comment when none is sent", async () => {
        const reportUpdates = [];
        const prisma = createFakePrisma({
            report: {
                async findUnique() {
                    return {
                        id_report: SAMPLE_REPORT_ID,
                        content_type: "COMMENT",
                        id_reported_content: SAMPLE_CONTENT_ID,
                        review_comment: "Earlier note"
                    };
                },
                async update(args) {
                    reportUpdates.push(args);
                    return { id_report: SAMPLE_REPORT_ID, status: "ATTENDED" };
                }
            },
            comment: {
                async deleteMany(args) {
                    assert.deepEqual(args, { where: { id_comment: SAMPLE_CONTENT_ID } });
                    return { count: 1 };
                }
            }
        });

        const repository = createReportRepository(prisma);
        await repository.removeReportedContentAndAttend({ reportId: SAMPLE_REPORT_ID });

        assert.equal(reportUpdates[0].data.review_comment, "Earlier note");
    });

    it("removeReportedContentAndAttend returns null when the report does not exist", async () => {
        const prisma = createFakePrisma({
            report: {
                async findUnique() {
                    return null;
                },
                async update() {
                    assert.fail("update must not run when the report is missing");
                }
            }
        });

        const repository = createReportRepository(prisma);
        const result = await repository.removeReportedContentAndAttend({ reportId: SAMPLE_REPORT_ID });

        assert.equal(result, null);
    });

    it("removeReportedContentAndAttend propagates errors so the transaction can roll back", async () => {
        const prisma = createFakePrisma({
            report: {
                async findUnique() {
                    throw new Error("DB failure");
                }
            }
        });

        const repository = createReportRepository(prisma);
        await assert.rejects(
            () => repository.removeReportedContentAndAttend({ reportId: SAMPLE_REPORT_ID }),
            /DB failure/
        );
    });
});
