const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_COOKIE = "letsplay_session=valid-token";

function createBlocksRepository() {
    const calls = { blocked: [], unblocked: [] };
    return {
        calls,
        async blockUser(blockerId, blockedId) {
            calls.blocked.push({ blockerId, blockedId });
            return true;
        },
        async unblockUser(blockerId, blockedId) {
            calls.unblocked.push({ blockerId, blockedId });
            return true;
        },
        async listBlockedUsers() {
            return [{ id_user: OTHER_ID, username: "other" }];
        },
        async countBlockedUsers() {
            return 1;
        },
        async hasBlocked(blockerId, blockedId) {
            return blockerId === VIEWER_ID && blockedId === OTHER_ID;
        }
    };
}

async function withBlocksServer(blocksRepository, callback) {
    const app = createApp({
        videogameRepository: { async findPublicVideogames() { return []; } },
        authRepository: {
            async findActiveSessionUser(tokenHash) {
                return tokenHash ? { id_user: VIEWER_ID } : null;
            }
        },
        blocksRepository
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

describe("blocksRouter", () => {
    it("should require a session when reading blocked accounts", async () => {
        await withBlocksServer(createBlocksRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/me/blocks`);
            assert.equal(response.status, 401);
        });
    });

    it("should block an account using the session account as blocker", async () => {
        const repository = createBlocksRepository();
        await withBlocksServer(repository, async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}/block`, {
                method: "PUT",
                headers: { Origin: "http://localhost:5173" }
            });
            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), { isBlocked: true });
            assert.deepEqual(repository.calls.blocked, [{
                blockerId: VIEWER_ID,
                blockedId: OTHER_ID
            }]);
        });
    });

    it("should reject self blocking", async () => {
        await withBlocksServer(createBlocksRepository(), async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${VIEWER_ID}/block`, {
                method: "PUT"
            });
            assert.equal(response.status, 400);
        });
    });

    it("should return the signed-in account's blocked users", async () => {
        await withBlocksServer(createBlocksRepository(), async (baseUrl) => {
            const response = await request(baseUrl, "/api/me/blocks");
            assert.equal(response.status, 200);
            assert.deepEqual((await response.json()).users, [
                { id_user: OTHER_ID, username: "other" }
            ]);
        });
    });

    it("should unblock only the relationship owned by the session account", async () => {
        const repository = createBlocksRepository();
        await withBlocksServer(repository, async (baseUrl) => {
            const response = await request(baseUrl, `/api/me/blocks/${OTHER_ID}`, {
                method: "DELETE",
                headers: { Origin: "http://localhost:5173" }
            });
            assert.equal(response.status, 200);
            assert.deepEqual(repository.calls.unblocked, [{
                blockerId: VIEWER_ID,
                blockedId: OTHER_ID
            }]);
        });
    });

    it("should report whether the session account blocked a profile", async () => {
        await withBlocksServer(createBlocksRepository(), async (baseUrl) => {
            const response = await request(baseUrl, `/api/users/${OTHER_ID}/block-state`);
            assert.deepEqual(await response.json(), { isBlocked: true });
        });
    });
});
