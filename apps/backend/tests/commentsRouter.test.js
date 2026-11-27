const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { DEMO_USER_ID, createCommentRepository } = require("../src/repositories/commentRepository");

const SAMPLE_POST_ID = "33333333-3333-4333-8333-333333333333";
const SAMPLE_USER_ID = "22222222-2222-4222-8222-222222222222";
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

function createMockCommentRepository(overrides = {}) {
    return {
        async findCommentsByPostId() {
            return [];
        },
        async createComment() {
            return null;
        },
        ...overrides
    };
}

async function withServer(commentRepository, callback, authRepository) {
    const app = createApp({
        videogameRepository: createMockVideogameRepository(),
        commentRepository,
        authRepository
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

describe("commentsRouter", () => {
    it("should require a session when reading comments in the authenticated app", async () => {
        await withServer(createMockCommentRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/posts/${SAMPLE_POST_ID}/comments`);
            assert.equal(response.status, 401);
        }, {
            async findActiveSessionUser() {
                return null;
            }
        });
    });

    it("should use the session account when creating a comment", async () => {
        let submittedComment;
        await withServer(createMockCommentRepository({
            async createComment(payload) {
                submittedComment = payload;
                return { id_comment: SAMPLE_POST_ID };
            }
        }), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/posts/${SAMPLE_POST_ID}/comments`, {
                method: "POST",
                headers: {
                    Cookie: "letsplay_session=valid-token",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    content: "A comment",
                    userId: SAMPLE_USER_ID
                })
            });
            assert.equal(response.status, 201);
            assert.equal(submittedComment.userId, undefined);
            assert.equal(submittedComment.viewerId, SAMPLE_USER_ID);
        }, {
            async findActiveSessionUser() {
                return { id_user: SAMPLE_USER_ID };
            }
        });
    });

    it("GET /api/posts/:postId/comments returns 400 for invalid UUID", async () => {
        await withServer(createMockCommentRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/posts/not-a-uuid/comments`);
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid post id" });
        });
    });

    it("GET /api/posts/:postId/comments returns 200 with comments", async () => {
        const expectedComments = [
            {
                id_comment: "44444444-4444-4444-8444-444444444444",
                id_post: SAMPLE_POST_ID,
                content: "Great guide!",
                is_spoiler: false,
                created_at: "2026-01-01T00:00:00.000Z",
                author_username: "gamer1",
                author_display_name: "Gamer One"
            }
        ];

        const repository = createMockCommentRepository({
            async findCommentsByPostId(postId) {
                assert.equal(postId, SAMPLE_POST_ID);
                return expectedComments;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/posts/${SAMPLE_POST_ID}/comments`);
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.deepEqual(body, { comments: expectedComments });
        });
    });

    it("POST /api/posts/:postId/comments returns 400 for invalid UUID", async () => {
        await withServer(createMockCommentRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/posts/not-a-uuid/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "Hello" })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid post id" });
        });
    });

    it("POST /api/posts/:postId/comments returns 400 for empty or whitespace content", async () => {
        await withServer(createMockCommentRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/posts/${SAMPLE_POST_ID}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "   " })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Comment content is required" });
        });
    });

    it("POST /api/posts/:postId/comments returns 400 when content exceeds 500 characters", async () => {
        await withServer(createMockCommentRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/posts/${SAMPLE_POST_ID}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "a".repeat(501) })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Comment content must be 500 characters or fewer" });
        });
    });

    it("POST /api/posts/:postId/comments returns 400 when userId is not a valid UUID", async () => {
        await withServer(createMockCommentRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/posts/${SAMPLE_POST_ID}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "Valid comment", userId: "bad-user-id" })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid user id" });
        });
    });

    it("POST /api/posts/:postId/comments returns 404 when post does not exist or is inactive", async () => {
        const repository = createMockCommentRepository({
            async createComment() {
                return null;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/posts/${SAMPLE_POST_ID}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "Nice run!" })
            });
            const body = await response.json();

            assert.equal(response.status, 404);
            assert.deepEqual(body, { error: "Post not found" });
        });
    });

    it("POST /api/posts/:postId/comments returns 201 with created comment", async () => {
        let receivedPayload = null;
        const createdComment = {
            id_comment: "55555555-5555-4555-8555-555555555555",
            id_post: SAMPLE_POST_ID,
            content: "Watch out for phase 2",
            is_spoiler: true,
            created_at: "2026-01-01T00:00:00.000Z",
            author_username: "demo",
            author_display_name: "Demo Player"
        };

        const repository = createMockCommentRepository({
            async createComment(payload) {
                receivedPayload = payload;
                return createdComment;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/posts/${SAMPLE_POST_ID}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: "  Watch out for phase 2  ",
                    isSpoiler: true
                })
            });
            const body = await response.json();

            assert.equal(response.status, 201);
            assert.deepEqual(receivedPayload, {
                postId: SAMPLE_POST_ID,
                userId: undefined,
                content: "Watch out for phase 2",
                isSpoiler: true
            });
            assert.deepEqual(body, { comment: createdComment });
        });
    });
});

describe("commentRepository", () => {
    it("findCommentsByPostId queries active comments for active users and posts", async () => {
        const calls = [];
        const prisma = {
            comment: {
                async findMany(args) {
                    calls.push(args);
                    return [
                        {
                            id_comment: "44444444-4444-4444-8444-444444444444",
                            id_post: SAMPLE_POST_ID,
                            content: "Nice!",
                            is_spoiler: false,
                            created_at: "2026-01-01T00:00:00.000Z",
                            User: { username: "gamer1", display_name: "Gamer One" }
                        }
                    ];
                }
            }
        };

        const repository = createCommentRepository(prisma);
        const comments = await repository.findCommentsByPostId(SAMPLE_POST_ID);

        assert.deepEqual(comments, [
            {
                id_comment: "44444444-4444-4444-8444-444444444444",
                id_post: SAMPLE_POST_ID,
                content: "Nice!",
                is_spoiler: false,
                created_at: "2026-01-01T00:00:00.000Z",
                author_username: "gamer1",
                author_display_name: "Gamer One"
            }
        ]);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].where.id_post, SAMPLE_POST_ID);
        assert.deepEqual(calls[0].where.User, { account_status: "ACTIVE" });
        assert.equal(calls[0].where.Post.status, "ACTIVE");
        assert.deepEqual(calls[0].where.Post.OR, [
            { id_community: null },
            { Communities: { status: "ACTIVE", type: "PUBLIC" } }
        ]);
        assert.deepEqual(calls[0].orderBy, { created_at: "asc" });
    });

    it("createComment returns null when active post is not found", async () => {
        const lookups = [];
        const prisma = {
            post: {
                async findFirst(args) {
                    lookups.push(args);
                    return null;
                }
            },
            comment: {
                async create() {
                    assert.fail("create must not run when the post is unavailable");
                }
            }
        };

        const repository = createCommentRepository(prisma);
        const result = await repository.createComment({
            postId: SAMPLE_POST_ID,
            content: "Hello"
        });

        assert.equal(result, null);
        assert.equal(lookups[0].where.id_post, SAMPLE_POST_ID);
        assert.equal(lookups[0].where.status, "ACTIVE");
        assert.deepEqual(lookups[0].where.User.OR, [
            { is_private: false },
            { id_user: DEMO_USER_ID },
            { Follows_Follows_id_followedToUser: { some: { id_follower: DEMO_USER_ID } } }
        ]);
    });

    it("createComment inserts with generated UUID and demo user when userId is omitted", async () => {
        const creates = [];
        const prisma = {
            post: {
                async findFirst() {
                    return { id_post: SAMPLE_POST_ID };
                }
            },
            comment: {
                async create(args) {
                    creates.push(args);
                    return {
                        id_comment: args.data.id_comment,
                        id_post: SAMPLE_POST_ID,
                        content: "GG!",
                        is_spoiler: false,
                        created_at: "2026-01-01T00:00:00.000Z",
                        User: { username: "demo", display_name: "Demo Player" }
                    };
                }
            }
        };

        const repository = createCommentRepository(prisma);
        const result = await repository.createComment({
            postId: SAMPLE_POST_ID,
            content: "GG!"
        });

        assert.deepEqual(result, {
            id_comment: creates[0].data.id_comment,
            id_post: SAMPLE_POST_ID,
            content: "GG!",
            is_spoiler: false,
            created_at: "2026-01-01T00:00:00.000Z",
            author_username: "demo",
            author_display_name: "Demo Player"
        });
        assert.equal(creates.length, 1);
        assert.match(creates[0].data.id_comment, UUID_REGEX);
        assert.deepEqual(creates[0].data, {
            id_comment: creates[0].data.id_comment,
            id_post: SAMPLE_POST_ID,
            id_user: DEMO_USER_ID,
            content: "GG!",
            is_spoiler: false
        });
    });

    it("createComment uses explicit userId and isSpoiler when provided", async () => {
        const creates = [];
        const prisma = {
            post: {
                async findFirst() {
                    return { id_post: SAMPLE_POST_ID };
                }
            },
            comment: {
                async create(args) {
                    creates.push(args);
                    return {
                        id_comment: args.data.id_comment,
                        id_post: SAMPLE_POST_ID,
                        content: args.data.content,
                        is_spoiler: args.data.is_spoiler,
                        created_at: "2026-01-01T00:00:00.000Z",
                        User: { username: "player", display_name: null }
                    };
                }
            }
        };

        const repository = createCommentRepository(prisma);
        await repository.createComment({
            postId: SAMPLE_POST_ID,
            userId: SAMPLE_USER_ID,
            content: "Spoiler alert",
            isSpoiler: true
        });

        assert.equal(creates.length, 1);
        assert.equal(creates[0].data.id_user, SAMPLE_USER_ID);
        assert.equal(creates[0].data.content, "Spoiler alert");
        assert.equal(creates[0].data.is_spoiler, true);
    });
});
