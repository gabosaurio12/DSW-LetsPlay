const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { createPrismaClient } = require("../src/db/prisma");
const {
    DEMO_USER_ID,
    createVideogameRepository
} = require("../src/repositories/videogameRepository");

const SAMPLE_ID = "11111111-1111-4111-8111-111111111111";

function createMockRepository(overrides = {}) {
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
        },
        async createPublicPostForVideogame() {
            return null;
        },
        ...overrides
    };
}

async function withServer(repository, callback) {
    const app = createApp(repository);
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

describe("videogamesRouter and app", () => {
    it("GET /api/health returns 200 ok and default CORS header", async () => {
        await withServer(createMockRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/health`);
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.deepEqual(body, { ok: true });
            assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
        });
    });

    it("GET /api/videogames forwards query filters and returns videogames", async () => {
        let receivedFilters = null;
        const sampleGames = [
            {
                id_videogame: SAMPLE_ID,
                name: "Hollow Knight",
                description: "Metroidvania adventure",
                genre: "Metroidvania",
                platform: "PC",
                cover_url: null,
                additional_info: null,
                created_at: "2026-01-01T00:00:00.000Z",
                status: "ACTIVE"
            }
        ];

        const repository = createMockRepository({
            async findPublicVideogames(filters) {
                receivedFilters = filters;
                return sampleGames;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(
                `${baseUrl}/api/videogames?genre=Metroidvania&platform=PC&search=Hollow`
            );
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.deepEqual(receivedFilters, {
                genre: "Metroidvania",
                platform: "PC",
                search: "Hollow"
            });
            assert.deepEqual(body, { videogames: sampleGames });
        });
    });

    it("GET /api/videogames/filters returns distinct genres and platforms", async () => {
        const repository = createMockRepository({
            async findPublicVideogameFilters() {
                return {
                    genres: ["Action", "RPG"],
                    platforms: ["PC", "Switch"]
                };
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/filters`);
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.deepEqual(body, {
                genres: ["Action", "RPG"],
                platforms: ["PC", "Switch"]
            });
        });
    });

    it("GET /api/videogames/:id returns 400 for invalid UUID", async () => {
        let called = false;
        const repository = createMockRepository({
            async findPublicVideogameById() {
                called = true;
                return null;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/not-a-uuid`);
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid videogame id" });
            assert.equal(called, false);
        });
    });

    it("GET /api/videogames/:id returns 404 when videogame does not exist", async () => {
        const repository = createMockRepository({
            async findPublicVideogameById() {
                return null;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/${SAMPLE_ID}`);
            const body = await response.json();

            assert.equal(response.status, 404);
            assert.deepEqual(body, { error: "Videogame not found" });
        });
    });

    it("GET /api/videogames/:id returns 200 with videogame when found", async () => {
        const sampleGame = {
            id_videogame: SAMPLE_ID,
            name: "Celeste",
            description: "Precision platformer",
            genre: "Platformer",
            platform: "PC",
            cover_url: null,
            additional_info: null,
            created_at: "2026-01-01T00:00:00.000Z",
            status: "ACTIVE"
        };

        const repository = createMockRepository({
            async findPublicVideogameById(id) {
                return id === SAMPLE_ID ? sampleGame : null;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/${SAMPLE_ID}`);
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.deepEqual(body, { videogame: sampleGame });
        });
    });

    it("GET /api/videogames/:id/communities returns 400 for invalid UUID", async () => {
        let called = false;
        const repository = createMockRepository({
            async findRelatedCommunitiesByVideogameId() {
                called = true;
                return [];
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/not-a-uuid/communities`);
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid videogame id" });
            assert.equal(called, false);
        });
    });

    it("GET /api/videogames/:id/communities returns 200 with related communities", async () => {
        let receivedId = null;
        const sampleCommunities = [
            {
                id_community: "22222222-2222-4222-8222-222222222222",
                name: "Hollow Knight Speedrunners",
                description: "Routing and speedruns",
                type: "PUBLIC",
                image_url: null,
                rules: null,
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
                member_count: 12
            }
        ];

        const repository = createMockRepository({
            async findRelatedCommunitiesByVideogameId(id) {
                receivedId = id;
                return sampleCommunities;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/${SAMPLE_ID}/communities`);
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.equal(receivedId, SAMPLE_ID);
            assert.deepEqual(body, { communities: sampleCommunities });
        });
    });

    it("GET /api/videogames/:id/posts returns 400 for invalid UUID", async () => {
        let called = false;
        const repository = createMockRepository({
            async findPublicPostsByVideogameId() {
                called = true;
                return [];
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/not-a-uuid/posts`);
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid videogame id" });
            assert.equal(called, false);
        });
    });

    it("GET /api/videogames/:id/posts returns 200 with public posts", async () => {
        let receivedId = null;
        const samplePosts = [
            {
                id_post: "33333333-3333-4333-8333-333333333333",
                id_videogame: SAMPLE_ID,
                videogame_name: "Hollow Knight",
                id_community: null,
                community_name: null,
                content: "Great boss fight in City of Tears!",
                image_url: null,
                is_spoiler: false,
                created_at: "2026-01-02T00:00:00.000Z",
                author_username: "knight01",
                author_display_name: "The Knight",
                reaction_count: 4,
                comment_count: 2
            }
        ];

        const repository = createMockRepository({
            async findPublicPostsByVideogameId(id) {
                receivedId = id;
                return samplePosts;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/${SAMPLE_ID}/posts`);
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.equal(receivedId, SAMPLE_ID);
            assert.deepEqual(body, { posts: samplePosts });
        });
    });

    it("POST /api/videogames/:id/posts returns 400 for invalid UUID", async () => {
        let called = false;
        const repository = createMockRepository({
            async createPublicPostForVideogame() {
                called = true;
                return null;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/not-a-uuid/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "Hello" })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid videogame id" });
            assert.equal(called, false);
        });
    });

    it("POST /api/videogames/:id/posts returns 400 when both content and imageUrl are empty", async () => {
        let called = false;
        const repository = createMockRepository({
            async createPublicPostForVideogame() {
                called = true;
                return null;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/${SAMPLE_ID}/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "   ", imageUrl: "" })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Post content or imageUrl is required" });
            assert.equal(called, false);
        });
    });

    it("POST /api/videogames/:id/posts returns 400 when content exceeds 2000 characters", async () => {
        const repository = createMockRepository();

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/${SAMPLE_ID}/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "a".repeat(2001) })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Post content must be 2000 characters or fewer" });
        });
    });

    it("POST /api/videogames/:id/posts returns 400 when imageUrl exceeds 500 characters", async () => {
        const repository = createMockRepository();

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/${SAMPLE_ID}/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: `https://example.com/${"a".repeat(500)}` })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Image URL must be 500 characters or fewer" });
        });
    });

    it("POST /api/videogames/:id/posts returns 400 when userId is not a valid UUID", async () => {
        const repository = createMockRepository();

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/${SAMPLE_ID}/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "Valid post", userId: "bad-user-id" })
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid user id" });
        });
    });

    it("POST /api/videogames/:id/posts returns 404 when videogame does not exist", async () => {
        const repository = createMockRepository({
            async createPublicPostForVideogame() {
                return null;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/${SAMPLE_ID}/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "Great game!" })
            });
            const body = await response.json();

            assert.equal(response.status, 404);
            assert.deepEqual(body, { error: "Videogame not found" });
        });
    });

    it("POST /api/videogames/:id/posts returns 201 with created post", async () => {
        let receivedPayload = null;
        const createdPost = {
            id_post: "55555555-5555-4555-8555-555555555555",
            id_videogame: SAMPLE_ID,
            videogame_name: "Hollow Knight",
            id_community: null,
            community_name: null,
            content: "Watch out for the false floor!",
            image_url: "https://example.com/hk.png",
            is_spoiler: true,
            created_at: "2026-01-03T00:00:00.000Z",
            author_username: "knight01",
            author_display_name: "The Knight",
            reaction_count: 0,
            comment_count: 0
        };

        const repository = createMockRepository({
            async createPublicPostForVideogame(payload) {
                receivedPayload = payload;
                return createdPost;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/${SAMPLE_ID}/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: "  Watch out for the false floor!  ",
                    imageUrl: "  https://example.com/hk.png  ",
                    isSpoiler: true
                })
            });
            const body = await response.json();

            assert.equal(response.status, 201);
            assert.deepEqual(receivedPayload, {
                videogameId: SAMPLE_ID,
                userId: undefined,
                content: "Watch out for the false floor!",
                imageUrl: "https://example.com/hk.png",
                isSpoiler: true
            });
            assert.deepEqual(body, { post: createdPost });
        });
    });

    it("GET /api/videogames/posts/:postId/comments returns 400 for invalid UUID", async () => {
        let called = false;
        const repository = createMockRepository({
            async findCommentsByPostId() {
                called = true;
                return [];
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/posts/not-a-uuid/comments`);
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Invalid post id" });
            assert.equal(called, false);
        });
    });

    it("GET /api/videogames/posts/:postId/comments returns 200 with comments", async () => {
        let receivedPostId = null;
        const sampleComments = [
            {
                id_comment: "44444444-4444-4444-8444-444444444444",
                id_post: SAMPLE_ID,
                content: "Agreed, Watcher Knights are tough!",
                is_spoiler: true,
                created_at: "2026-01-02T01:00:00.000Z",
                author_username: "hornet99",
                author_display_name: "Hornet"
            }
        ];

        const repository = createMockRepository({
            async findCommentsByPostId(postId) {
                receivedPostId = postId;
                return sampleComments;
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames/posts/${SAMPLE_ID}/comments`);
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.equal(receivedPostId, SAMPLE_ID);
            assert.deepEqual(body, { comments: sampleComments });
        });
    });

    it("returns 500 JSON when repository throws an unexpected error", async () => {
        const repository = createMockRepository({
            async findPublicVideogames() {
                throw new Error("Database connection lost");
            }
        });

        await withServer(repository, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/videogames`);
            const body = await response.json();

            assert.equal(response.status, 500);
            assert.deepEqual(body, { error: "Internal server error" });
        });
    });
});

describe("videogameRepository", () => {
    it("queries public videogames with insensitive search and exact filters", async () => {
        const calls = [];
        const prisma = {
            videogames: {
                async findMany(args) {
                    calls.push(args);
                    return [];
                }
            }
        };

        const repository = createVideogameRepository(prisma);
        await repository.findPublicVideogames({
            genre: "RPG",
            platform: "PC",
            search: "Elden"
        });

        assert.equal(calls.length, 1);
        assert.deepEqual(calls[0].where, {
            status: "ACTIVE",
            genre: "RPG",
            platform: "PC",
            OR: [
                { name: { contains: "Elden", mode: "insensitive" } },
                { description: { contains: "Elden", mode: "insensitive" } }
            ]
        });
        assert.deepEqual(calls[0].orderBy, { name: "asc" });
    });

    it("omits unset videogame filters instead of matching null values", async () => {
        const calls = [];
        const prisma = {
            videogames: {
                async findMany(args) {
                    calls.push(args);
                    return [];
                }
            }
        };

        const repository = createVideogameRepository(prisma);
        await repository.findPublicVideogames({ genre: "   ", platform: "" });

        assert.equal(calls[0].where.genre, undefined);
        assert.equal(calls[0].where.platform, undefined);
        assert.equal(calls[0].where.OR, undefined);
        assert.equal(calls[0].where.status, "ACTIVE");
    });

    it("queries distinct genres and platforms and finds a public videogame by id", async () => {
        const calls = [];
        const prisma = {
            videogames: {
                async findMany(args) {
                    calls.push(args);
                    if (args.distinct[0] === "genre") {
                        return [{ genre: "Action" }];
                    }
                    return [{ platform: "PC" }];
                },
                async findFirst(args) {
                    calls.push(args);
                    return { id_videogame: SAMPLE_ID, name: "Hades" };
                }
            }
        };

        const repository = createVideogameRepository(prisma);
        const filters = await repository.findPublicVideogameFilters();
        const game = await repository.findPublicVideogameById(SAMPLE_ID);

        assert.deepEqual(filters, { genres: ["Action"], platforms: ["PC"] });
        assert.deepEqual(game, { id_videogame: SAMPLE_ID, name: "Hades" });
        assert.equal(calls.length, 3);
        assert.deepEqual(calls[0].where, { status: "ACTIVE", genre: { not: null } });
        assert.deepEqual(calls[1].where, { status: "ACTIVE", platform: { not: null } });
        assert.deepEqual(calls[2].where, { id_videogame: SAMPLE_ID, status: "ACTIVE" });
    });

    it("queries public communities related to a videogame and maps member_count", async () => {
        const calls = [];
        const prisma = {
            communities: {
                async findMany(args) {
                    calls.push(args);
                    return [
                        {
                            id_community: "22222222-2222-4222-8222-222222222222",
                            name: "Elden Ring Lore",
                            _count: { CommunityMembers: 5 }
                        }
                    ];
                }
            }
        };

        const repository = createVideogameRepository(prisma);
        const communities = await repository.findRelatedCommunitiesByVideogameId(SAMPLE_ID);

        assert.deepEqual(communities, [
            {
                id_community: "22222222-2222-4222-8222-222222222222",
                name: "Elden Ring Lore",
                member_count: 5
            }
        ]);
        assert.deepEqual(calls[0].where, {
            status: "ACTIVE",
            type: "PUBLIC",
            CommunityVideogames: { some: { id_videogame: SAMPLE_ID } }
        });
        assert.deepEqual(calls[0].orderBy, [{ CommunityMembers: { _count: "desc" } }, { name: "asc" }]);
    });

    it("queries public posts with visibility and block filters and maps counters", async () => {
        const calls = [];
        const viewerId = "77777777-7777-4777-8777-777777777777";
        const prisma = {
            post: {
                async findMany(args) {
                    calls.push(args);
                    return [
                        {
                            id_post: "33333333-3333-4333-8333-333333333333",
                            id_videogame: SAMPLE_ID,
                            id_community: null,
                            content: "Boss tip",
                            image_url: null,
                            is_spoiler: false,
                            created_at: "2026-01-03T00:00:00.000Z",
                            Videogames: { name: "Elden Ring" },
                            Communities: null,
                            User: { username: "gamer", display_name: "Gamer" },
                            _count: { Reaction: 3, Comment: 1 }
                        }
                    ];
                }
            }
        };

        const repository = createVideogameRepository(prisma);
        const posts = await repository.findPublicPostsByVideogameId(SAMPLE_ID, viewerId);

        assert.deepEqual(posts, [
            {
                id_post: "33333333-3333-4333-8333-333333333333",
                id_videogame: SAMPLE_ID,
                videogame_name: "Elden Ring",
                id_community: null,
                community_name: null,
                content: "Boss tip",
                image_url: null,
                is_spoiler: false,
                created_at: "2026-01-03T00:00:00.000Z",
                author_username: "gamer",
                author_display_name: "Gamer",
                reaction_count: 3,
                comment_count: 1
            }
        ]);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].where.id_videogame, SAMPLE_ID);
        assert.equal(calls[0].where.status, "ACTIVE");
        assert.deepEqual(calls[0].where.User, {
            account_status: "ACTIVE",
            OR: [
                { is_private: false },
                { id_user: viewerId },
                { Follows_Follows_id_followedToUser: { some: { id_follower: viewerId } } }
            ],
            Blocks_Blocks_id_blockerToUser: { none: { id_blocked: viewerId } },
            Blocks_Blocks_id_blockedToUser: { none: { id_blocker: viewerId } }
        });
        assert.deepEqual(calls[0].where.OR, [
            { id_community: null },
            { Communities: { status: "ACTIVE", type: "PUBLIC" } }
        ]);
        assert.deepEqual(calls[0].orderBy, { created_at: "desc" });
    });

    it("limits public posts to public accounts when the visitor is anonymous", async () => {
        const calls = [];
        const prisma = {
            post: {
                async findMany(args) {
                    calls.push(args);
                    return [];
                }
            }
        };

        const repository = createVideogameRepository(prisma);
        await repository.findPublicPostsByVideogameId(SAMPLE_ID, null);

        assert.deepEqual(calls[0].where.User, {
            account_status: "ACTIVE",
            is_private: false
        });
    });

    it("queries comments by post id for active users and visible posts", async () => {
        const calls = [];
        const prisma = {
            comment: {
                async findMany(args) {
                    calls.push(args);
                    return [
                        {
                            id_comment: "44444444-4444-4444-8444-444444444444",
                            id_post: SAMPLE_ID,
                            content: "Nice!",
                            is_spoiler: false,
                            created_at: "2026-01-04T00:00:00.000Z",
                            User: { username: "fan", display_name: null }
                        }
                    ];
                }
            }
        };

        const repository = createVideogameRepository(prisma);
        const comments = await repository.findCommentsByPostId(SAMPLE_ID);

        assert.deepEqual(comments, [
            {
                id_comment: "44444444-4444-4444-8444-444444444444",
                id_post: SAMPLE_ID,
                content: "Nice!",
                is_spoiler: false,
                created_at: "2026-01-04T00:00:00.000Z",
                author_username: "fan",
                author_display_name: null
            }
        ]);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].where.id_post, SAMPLE_ID);
        assert.deepEqual(calls[0].where.User, { account_status: "ACTIVE" });
        assert.equal(calls[0].where.Post.status, "ACTIVE");
        assert.deepEqual(calls[0].where.Post.User, { is_private: false });
        assert.deepEqual(calls[0].orderBy, { created_at: "asc" });
    });

    it("createPublicPostForVideogame returns null when videogame is not found", async () => {
        const prisma = {
            videogames: {
                async findFirst() {
                    return null;
                }
            },
            post: {
                async create() {
                    assert.fail("create must not run when the videogame is missing");
                }
            }
        };

        const repository = createVideogameRepository(prisma);
        const post = await repository.createPublicPostForVideogame({
            videogameId: SAMPLE_ID,
            content: "Hello world"
        });

        assert.equal(post, null);
    });

    it("createPublicPostForVideogame creates a Post with generated UUID and demo user", async () => {
        const calls = [];
        const prisma = {
            videogames: {
                async findFirst() {
                    return { id_videogame: SAMPLE_ID, name: "Hollow Knight" };
                }
            },
            post: {
                async create(args) {
                    calls.push(args);
                    return {
                        id_post: args.data.id_post,
                        id_videogame: SAMPLE_ID,
                        id_community: null,
                        content: "Amazing soundtrack",
                        image_url: null,
                        is_spoiler: false,
                        created_at: "2026-01-03T00:00:00.000Z",
                        Videogames: { name: "Hollow Knight" },
                        Communities: null,
                        User: { username: "demo", display_name: "Demo User" },
                        _count: { Reaction: 0, Comment: 0 }
                    };
                }
            }
        };

        const repository = createVideogameRepository(prisma);
        const post = await repository.createPublicPostForVideogame({
            videogameId: SAMPLE_ID,
            content: "Amazing soundtrack"
        });

        assert.equal(post.videogame_name, "Hollow Knight");
        assert.equal(post.community_name, null);
        assert.equal(post.reaction_count, 0);
        assert.equal(calls.length, 1);
        assert.match(
            calls[0].data.id_post,
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        assert.deepEqual(calls[0].data, {
            id_post: calls[0].data.id_post,
            id_user: DEMO_USER_ID,
            id_videogame: SAMPLE_ID,
            content: "Amazing soundtrack",
            image_url: null,
            is_spoiler: false,
            status: "ACTIVE"
        });
    });

    it("createPublicPostForVideogame uses explicit userId, imageUrl, and isSpoiler when provided", async () => {
        const calls = [];
        const customUserId = "77777777-7777-4777-8777-777777777777";
        const prisma = {
            videogames: {
                async findFirst() {
                    return { id_videogame: SAMPLE_ID, name: "Celeste" };
                }
            },
            post: {
                async create(args) {
                    calls.push(args);
                    return {
                        id_post: args.data.id_post,
                        id_videogame: SAMPLE_ID,
                        id_community: null,
                        content: null,
                        image_url: "https://example.com/celeste.png",
                        is_spoiler: true,
                        created_at: "2026-01-03T00:00:00.000Z",
                        Videogames: { name: "Celeste" },
                        Communities: null,
                        User: { username: "custom", display_name: null },
                        _count: { Reaction: 0, Comment: 0 }
                    };
                }
            }
        };

        const repository = createVideogameRepository(prisma);
        await repository.createPublicPostForVideogame({
            videogameId: SAMPLE_ID,
            userId: customUserId,
            content: null,
            imageUrl: "https://example.com/celeste.png",
            isSpoiler: true
        });

        assert.equal(calls.length, 1);
        assert.equal(calls[0].data.id_user, customUserId);
        assert.equal(calls[0].data.content, null);
        assert.equal(calls[0].data.image_url, "https://example.com/celeste.png");
        assert.equal(calls[0].data.is_spoiler, true);
    });
});

describe("createPrismaClient", () => {
    it("should throw an explicit error when DATABASE_URL is missing", () => {
        assert.throws(
            () => createPrismaClient({}),
            /Missing PostgreSQL connection configuration: DATABASE_URL/
        );
    });
});
