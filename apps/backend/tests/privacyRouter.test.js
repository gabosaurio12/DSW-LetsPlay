const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_COOKIE = "letsplay_session=valid-token";

function createFollowsRepository() {
    const calls = { privacy: [], decisions: [] };
    return {
        calls,
        async findPrivacy() {
            return false;
        },
        async updatePrivacy(userId, isPrivate) {
            calls.privacy.push({ userId, isPrivate });
            return isPrivate;
        },
        async listIncomingRequests(userId) {
            assert.equal(userId, VIEWER_ID);
            return [{ id_user: OTHER_ID, username: "requester" }];
        },
        async countIncomingRequests() {
            return 1;
        },
        async resolveFollowRequest(recipientId, requesterId, action) {
            calls.decisions.push({ recipientId, requesterId, action });
            return true;
        }
    };
}

async function withPrivacyServer(followsRepository, callback) {
    const app = createApp({
        videogameRepository: { async findPublicVideogames() { return []; } },
        authRepository: {
            async findActiveSessionUser(tokenHash) {
                return tokenHash ? { id_user: VIEWER_ID } : null;
            }
        },
        followsRepository
    });
    const server = await new Promise((resolve) => {
        const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });
    try {
        await callback(`http://127.0.0.1:${server.address().port}`);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    }
}

function request(baseUrl, path, options = {}) {
    return fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { Cookie: SESSION_COOKIE, ...options.headers }
    });
}

describe("privacyRouter", () => {
    it("should read the privacy setting of the session account", async () => {
        await withPrivacyServer(createFollowsRepository(), async (baseUrl) => {
            const response = await request(baseUrl, "/api/me/privacy");
            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), { isPrivate: false });
        });
    });

    it("should update privacy for the session account", async () => {
        const repository = createFollowsRepository();
        await withPrivacyServer(repository, async (baseUrl) => {
            const response = await request(baseUrl, "/api/me/privacy", {
                method: "PATCH",
                headers: {
                    Origin: "http://localhost:5173",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ isPrivate: true, userId: OTHER_ID })
            });
            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), { isPrivate: true });
            assert.deepEqual(repository.calls.privacy, [{ userId: VIEWER_ID, isPrivate: true }]);
        });
    });

    it("should reject a non boolean privacy value", async () => {
        await withPrivacyServer(createFollowsRepository(), async (baseUrl) => {
            const response = await request(baseUrl, "/api/me/privacy", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPrivate: "true" })
            });
            assert.equal(response.status, 400);
        });
    });

    it("should list incoming requests only for the session account", async () => {
        await withPrivacyServer(createFollowsRepository(), async (baseUrl) => {
            const response = await request(baseUrl, "/api/users/me/follow-requests");
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.equal(body.total, 1);
            assert.equal(body.users[0].id_user, OTHER_ID);
        });
    });

    it("should resolve a request as the session account", async () => {
        const repository = createFollowsRepository();
        await withPrivacyServer(repository, async (baseUrl) => {
            const response = await request(
                baseUrl,
                `/api/users/me/follow-requests/${OTHER_ID}`,
                {
                    method: "PATCH",
                    headers: {
                        Origin: "http://localhost:5173",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ action: "accept" })
                }
            );
            assert.equal(response.status, 200);
            assert.deepEqual(repository.calls.decisions, [{
                recipientId: VIEWER_ID,
                requesterId: OTHER_ID,
                action: "accept"
            }]);
        });
    });
});
