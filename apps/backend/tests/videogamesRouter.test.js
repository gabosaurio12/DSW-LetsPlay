const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { createPool } = require("../src/db/pool");
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
    it("queries v_public_videogame with parameterized filters", async () => {
        const calls = [];
        const mockPool = {
            async query(sql, params) {
                calls.push({ sql, params });
                return { rows: [] };
            }
        };

        const repository = createVideogameRepository(mockPool);
        await repository.findPublicVideogames({
            genre: "RPG",
            platform: "PC",
            search: "Elden"
        });

        assert.equal(calls.length, 1);
        assert.match(calls[0].sql, /FROM "v_public_videogame"/);
        assert.deepEqual(calls[0].params, ["RPG", "PC", "%Elden%"]);
    });

    it("queries v_public_videogame for distinct filters and by id", async () => {
        const calls = [];
        const mockPool = {
            async query(sql, params) {
                calls.push({ sql, params });
                if (sql.includes('DISTINCT "genre"')) {
                    return { rows: [{ genre: "Action" }] };
                }
                if (sql.includes('DISTINCT "platform"')) {
                    return { rows: [{ platform: "PC" }] };
                }
                return { rows: [{ id_videogame: SAMPLE_ID, name: "Hades" }] };
            }
        };

        const repository = createVideogameRepository(mockPool);
        const filters = await repository.findPublicVideogameFilters();
        const game = await repository.findPublicVideogameById(SAMPLE_ID);

        assert.deepEqual(filters, { genres: ["Action"], platforms: ["PC"] });
        assert.deepEqual(game, { id_videogame: SAMPLE_ID, name: "Hades" });
        assert.equal(calls.length, 3);
        for (const call of calls) {
            assert.match(call.sql, /FROM "v_public_videogame"/);
        }
        assert.deepEqual(calls[2].params, [SAMPLE_ID]);
    });

    it("queries v_public_community for related communities by videogame id", async () => {
        const calls = [];
        const expectedCommunities = [
            {
                id_community: "22222222-2222-4222-8222-222222222222",
                name: "Elden Ring Lore",
                member_count: 5
            }
        ];
        const mockPool = {
            async query(sql, params) {
                calls.push({ sql, params });
                return { rows: expectedCommunities };
            }
        };

        const repository = createVideogameRepository(mockPool);
        const communities = await repository.findRelatedCommunitiesByVideogameId(SAMPLE_ID);

        assert.deepEqual(communities, expectedCommunities);
        assert.equal(calls.length, 1);
        assert.match(calls[0].sql, /FROM "v_public_community" c/);
        assert.match(calls[0].sql, /INNER JOIN "CommunityVideogames" cv ON cv\."id_community" = c\."id_community"/);
        assert.match(calls[0].sql, /LEFT JOIN "CommunityMembers" cm ON cm\."id_community" = c\."id_community"/);
        assert.match(calls[0].sql, /WHERE cv\."id_videogame" = \$1/);
        assert.match(calls[0].sql, /COUNT\(cm\."id_user"\)::int AS "member_count"/);
        assert.match(calls[0].sql, /ORDER BY "member_count" DESC, c\."name" ASC/);
        assert.deepEqual(calls[0].params, [SAMPLE_ID]);
    });

    it("queries public posts by videogame id with reaction and comment counts", async () => {
        const calls = [];
        const expectedPosts = [
            {
                id_post: "33333333-3333-4333-8333-333333333333",
                content: "Boss tip",
                reaction_count: 3,
                comment_count: 1
            }
        ];
        const mockPool = {
            async query(sql, params) {
                calls.push({ sql, params });
                return { rows: expectedPosts };
            }
        };

        const repository = createVideogameRepository(mockPool);
        const posts = await repository.findPublicPostsByVideogameId(SAMPLE_ID);

        assert.deepEqual(posts, expectedPosts);
        assert.equal(calls.length, 1);
        assert.match(calls[0].sql, /FROM "Post" p/);
        assert.match(calls[0].sql, /INNER JOIN "User" u ON u\."id_user" = p\."id_user"/);
        assert.match(calls[0].sql, /INNER JOIN "Videogames" v ON v\."id_videogame" = p\."id_videogame"/);
        assert.match(calls[0].sql, /LEFT JOIN "v_public_community" c ON c\."id_community" = p\."id_community"/);
        assert.match(calls[0].sql, /LEFT JOIN "Reaction" r ON r\."id_post" = p\."id_post"/);
        assert.match(calls[0].sql, /LEFT JOIN "Comment" cm ON cm\."id_post" = p\."id_post"/);
        assert.match(calls[0].sql, /COUNT\(DISTINCT r\."id_user"\)::int AS "reaction_count"/);
        assert.match(calls[0].sql, /COUNT\(DISTINCT cm\."id_comment"\)::int AS "comment_count"/);
        assert.match(calls[0].sql, /p\."status" = 'ACTIVE'/);
        assert.match(calls[0].sql, /u\."account_status" = 'ACTIVE'/);
        assert.match(calls[0].sql, /ORDER BY p\."created_at" DESC/);
        assert.deepEqual(calls[0].params, [SAMPLE_ID, undefined]);
    });

    it("queries comments by post id for active users and posts", async () => {
        const calls = [];
        const expectedComments = [
            {
                id_comment: "44444444-4444-4444-8444-444444444444",
                id_post: SAMPLE_ID,
                content: "Nice!",
                is_spoiler: false
            }
        ];
        const mockPool = {
            async query(sql, params) {
                calls.push({ sql, params });
                return { rows: expectedComments };
            }
        };

        const repository = createVideogameRepository(mockPool);
        const comments = await repository.findCommentsByPostId(SAMPLE_ID);

        assert.deepEqual(comments, expectedComments);
        assert.equal(calls.length, 1);
        assert.match(calls[0].sql, /FROM "Comment" cm/);
        assert.match(calls[0].sql, /INNER JOIN "User" u ON u\."id_user" = cm\."id_user"/);
        assert.match(calls[0].sql, /INNER JOIN "Post" p ON p\."id_post" = cm\."id_post"/);
        assert.match(calls[0].sql, /WHERE cm\."id_post" = \$1/);
        assert.match(calls[0].sql, /u\."account_status" = 'ACTIVE'/);
        assert.match(calls[0].sql, /p\."status" = 'ACTIVE'/);
        assert.match(calls[0].sql, /ORDER BY cm\."created_at" ASC/);
        assert.deepEqual(calls[0].params, [SAMPLE_ID, undefined]);
    });

    it("createPublicPostForVideogame returns null when videogame is not found", async () => {
        const calls = [];
        const mockPool = {
            async query(sql, params) {
                calls.push({ sql, params });
                return { rows: [] };
            }
        };

        const repository = createVideogameRepository(mockPool);
        const post = await repository.createPublicPostForVideogame({
            videogameId: SAMPLE_ID,
            content: "Hello world"
        });

        assert.equal(post, null);
        assert.equal(calls.length, 1);
        assert.match(calls[0].sql, /FROM "v_public_videogame"/);
        assert.deepEqual(calls[0].params, [SAMPLE_ID]);
    });

    it("createPublicPostForVideogame inserts into Post with generated UUID and demo user", async () => {
        const calls = [];
        const createdPost = {
            id_post: "66666666-6666-4666-8666-666666666666",
            id_videogame: SAMPLE_ID,
            videogame_name: "Hollow Knight",
            id_community: null,
            community_name: null,
            content: "Amazing soundtrack",
            image_url: null,
            is_spoiler: false,
            created_at: "2026-01-03T00:00:00.000Z",
            author_username: "demo",
            author_display_name: "Demo User",
            reaction_count: 0,
            comment_count: 0
        };
        const mockPool = {
            async query(sql, params) {
                calls.push({ sql, params });
                if (calls.length === 1) {
                    return { rows: [{ id_videogame: SAMPLE_ID, name: "Hollow Knight" }] };
                }
                return { rows: [createdPost] };
            }
        };

        const repository = createVideogameRepository(mockPool);
        const post = await repository.createPublicPostForVideogame({
            videogameId: SAMPLE_ID,
            content: "Amazing soundtrack"
        });

        assert.deepEqual(post, createdPost);
        assert.equal(calls.length, 2);
        assert.match(calls[0].sql, /FROM "v_public_videogame"/);
        assert.match(calls[1].sql, /INSERT INTO "Post"/);
        assert.match(calls[1].sql, /VALUES \(\$1, \$2, \$3, NULL, \$4, \$5, \$6, 'ACTIVE'\)/);
        assert.match(
            calls[1].params[0],
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        assert.equal(calls[1].params[1], DEMO_USER_ID);
        assert.equal(calls[1].params[2], SAMPLE_ID);
        assert.equal(calls[1].params[3], "Amazing soundtrack");
        assert.equal(calls[1].params[4], null);
        assert.equal(calls[1].params[5], false);
    });

    it("createPublicPostForVideogame uses explicit userId, imageUrl, and isSpoiler when provided", async () => {
        const calls = [];
        const customUserId = "77777777-7777-4777-8777-777777777777";
        const mockPool = {
            async query(sql, params) {
                calls.push({ sql, params });
                if (calls.length === 1) {
                    return { rows: [{ id_videogame: SAMPLE_ID, name: "Celeste" }] };
                }
                return { rows: [{ id_post: params[0], id_videogame: SAMPLE_ID }] };
            }
        };

        const repository = createVideogameRepository(mockPool);
        await repository.createPublicPostForVideogame({
            videogameId: SAMPLE_ID,
            userId: customUserId,
            content: null,
            imageUrl: "https://example.com/celeste.png",
            isSpoiler: true
        });

        assert.equal(calls.length, 2);
        assert.equal(calls[1].params[1], customUserId);
        assert.equal(calls[1].params[2], SAMPLE_ID);
        assert.equal(calls[1].params[3], null);
        assert.equal(calls[1].params[4], "https://example.com/celeste.png");
        assert.equal(calls[1].params[5], true);
    });
});

describe("createPool", () => {
    it("throws an explicit error when connection configuration is missing", () => {
        assert.throws(
            () => createPool({}),
            /Missing PostgreSQL connection configuration/
        );
    });
});
