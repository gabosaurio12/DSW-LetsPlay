const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

const SESSION_COOKIE = "letsplay_session=valid-token";
const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const THIRD_ID = "33333333-3333-4333-8333-333333333333";

const USER = {
    id_user: OTHER_ID,
    username: "ana_play",
    display_name: "Ana Ruiz",
    description: "Juego FPS cooperativo",
    profile_photo_url: null
};

function createMockAuthRepository() {
    return {
        async findActiveSessionUser(tokenHash) {
            return tokenHash ? { id_user: VIEWER_ID, username: "viewer" } : null;
        }
    };
}

function createMockFollowsRepository(overrides = {}) {
    const calls = { added: [], removed: [] };
    return {
        calls,
        async findVisibleUser() {
            return overrides.hidden === true ? null : USER;
        },
        async findFollowState() {
            return overrides.following === true;
        },
        async findConnectionState() {
            return overrides.connectionState || (overrides.following ? "following" : "none");
        },
        async findFollowStates() {
            return overrides.followedIds || [];
        },
        async findPendingStates() {
            return overrides.pendingIds || [];
        },
        async findPrivacy() {
            return false;
        },
        async updatePrivacy(_userId, isPrivate) {
            return isPrivate;
        },
        async listIncomingRequests() {
            return [];
        },
        async countIncomingRequests() {
            return 0;
        },
        async resolveFollowRequest() {
            return true;
        },
        async countFollows() {
            return { followers: 128, following: 64 };
        },
        async addFollow(followerId, followedId) {
            calls.added.push({ followerId, followedId });
            return overrides.insertFailed === true ? null : "following";
        },
        async removeFollow(followerId, followedId) {
            calls.removed.push({ followerId, followedId });
            return true;
        },
        async listFollowers() {
            return [{ id_user: THIRD_ID, username: "luis_play", display_name: "Luis Pérez" }];
        },
        async listFollowing() {
            return [];
        }
    };
}

async function withFollowsServer(followsRepository, callback, authRepository) {
    const app = createApp({
        videogameRepository: { async findPublicVideogames() { return []; } },
        authRepository: authRepository || createMockAuthRepository(),
        followsRepository
    });
    const server = await new Promise((resolve) => {
        const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    try {
        await callback(baseUrl);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    }
}

function request(baseUrl, path, options = {}) {
    return fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { Cookie: SESSION_COOKIE, ...options.headers }
    });
}

describe("followsRouter", () => {
    it("should return 401 when the request has no session cookie", async () => {
        await withFollowsServer(createMockFollowsRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/users/${OTHER_ID}`);
            assert.equal(response.status, 401);
        });
    });

    it("should return 400 when the user id is not a uuid", async () => {
        await withFollowsServer(createMockFollowsRepository(), async (baseUrl) => {
            const response = await request(baseUrl, "/api/users/not-a-uuid");
            assert.equal(response.status, 400);
        });
    });

    it("should return 200 with the profile, state and counts", async () => {
        const repository = createMockFollowsRepository({ following: true });
        await withFollowsServer(repository, async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}`);
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.deepEqual(body, {
                user: USER,
                connectionState: "following",
                isFollowedBy: true,
                counts: { followers: 128, following: 64 },
                canViewConnections: true
            });
        });
    });

    it("should return 404 for a profile hidden by a block", async () => {
        await withFollowsServer(createMockFollowsRepository({ hidden: true }), async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}`);
            assert.equal(response.status, 404);
        });
    });

    it("should return 400 when a user tries to follow themselves", async () => {
        const repository = createMockFollowsRepository();
        await withFollowsServer(repository, async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${VIEWER_ID}/follow`, {
                method: "PUT"
            });
            assert.equal(response.status, 400);
            assert.equal(repository.calls.added.length, 0);
        });
    });

    it("should return 403 for a write coming from another origin", async () => {
        const repository = createMockFollowsRepository();
        await withFollowsServer(repository, async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}/follow`, {
                method: "PUT",
                headers: { Origin: "https://example.com" }
            });
            assert.equal(response.status, 403);
            assert.equal(repository.calls.added.length, 0);
        });
    });

    it("should store a follow using the session account as follower", async () => {
        const repository = createMockFollowsRepository();
        await withFollowsServer(repository, async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}/follow`, {
                method: "PUT"
            });
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.deepEqual(body, { connectionState: "following" });
            assert.deepEqual(repository.calls.added, [
                { followerId: VIEWER_ID, followedId: OTHER_ID }
            ]);
        });
    });

    it("should not insert again when the relationship already exists", async () => {
        const repository = createMockFollowsRepository({ following: true });
        await withFollowsServer(repository, async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}/follow`, {
                method: "PUT"
            });
            assert.equal(response.status, 200);
            assert.equal(repository.calls.added.length, 1);
        });
    });

    it("should return 404 when a new follow is blocked by a concurrent change", async () => {
        const repository = createMockFollowsRepository({ insertFailed: true });
        await withFollowsServer(repository, async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}/follow`, {
                method: "PUT"
            });
            assert.equal(response.status, 404);
        });
    });

    it("should remove only the outgoing relationship on delete", async () => {
        const repository = createMockFollowsRepository();
        await withFollowsServer(repository, async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}/follow`, {
                method: "DELETE"
            });
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.deepEqual(body, { connectionState: "none" });
            assert.deepEqual(repository.calls.removed, [
                { followerId: VIEWER_ID, followedId: OTHER_ID }
            ]);
        });
    });

    it("should return the ids followed by the session account", async () => {
        const repository = createMockFollowsRepository({ followedIds: [OTHER_ID] });
        await withFollowsServer(repository, async (baseUrl) => {
            const path = `/api/users/follow-states?ids=${OTHER_ID},${THIRD_ID}`;
            const response = await request(baseUrl, path);
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.deepEqual(body, { followedIds: [OTHER_ID], pendingIds: [] });
        });
    });

    it("should return 400 for a batch containing an invalid id", async () => {
        await withFollowsServer(createMockFollowsRepository(), async (baseUrl) => {
            const path = `/api/users/follow-states?ids=${OTHER_ID},bad`;
            const response = await request(baseUrl, path);
            assert.equal(response.status, 400);
        });
    });

    it("should return 400 for a non numeric pagination value", async () => {
        await withFollowsServer(createMockFollowsRepository(), async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}/followers?limit=many`);
            assert.equal(response.status, 400);
        });
    });

    it("should return 200 with a bounded list and pagination values", async () => {
        await withFollowsServer(createMockFollowsRepository(), async (baseUrl) => {
            const path = `/api/users/${OTHER_ID}/followers?limit=500&offset=5`;
            const response = await request(baseUrl, path);
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.equal(body.limit, 50);
            assert.equal(body.offset, 5);
            assert.equal(body.users.length, 1);
        });
    });

    it("should return 404 for a hidden profile's following list", async () => {
        await withFollowsServer(createMockFollowsRepository({ hidden: true }), async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}/following`);
            assert.equal(response.status, 404);
        });
    });
});
