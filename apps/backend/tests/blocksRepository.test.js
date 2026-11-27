const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createBlocksRepository } = require("../src/repositories/blocksRepository");

const BLOCKER_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_ID = "22222222-2222-4222-8222-222222222222";

function createFakePool() {
    const state = {
        users: new Set([BLOCKER_ID, TARGET_ID]),
        blocks: new Set(),
        follows: new Set([`${BLOCKER_ID}|${TARGET_ID}`, `${TARGET_ID}|${BLOCKER_ID}`]),
        requests: new Set([`${BLOCKER_ID}|${TARGET_ID}`, `${TARGET_ID}|${BLOCKER_ID}`]),
        statements: []
    };
    const query = async (sql, params = []) => {
        state.statements.push(sql);
        if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql.trim()) || sql.includes("FOR UPDATE")) {
            return { rows: [], rowCount: 0 };
        }
        if (sql.includes('SELECT "id_user" FROM "User"')) {
            const exists = state.users.has(params[0]);
            return { rows: exists ? [{ id_user: params[0] }] : [], rowCount: Number(exists) };
        }
        if (sql.includes('INSERT INTO "Blocks"')) {
            const key = `${params[0]}|${params[1]}`;
            const inserted = !state.blocks.has(key);
            state.blocks.add(key);
            const rows = inserted ? [{ id_blocker: params[0] }] : [];
            return { rows, rowCount: rows.length };
        }
        if (sql.includes('DELETE FROM "Follows"')) {
            const before = state.follows.size;
            state.follows.delete(`${params[0]}|${params[1]}`);
            state.follows.delete(`${params[1]}|${params[0]}`);
            return { rows: [], rowCount: before - state.follows.size };
        }
        if (sql.includes('DELETE FROM "FollowRequests"')) {
            state.requests.delete(`${params[0]}|${params[1]}`);
            state.requests.delete(`${params[1]}|${params[0]}`);
            return { rows: [], rowCount: 2 };
        }
        if (sql.includes('DELETE FROM "Blocks"')) {
            const deleted = state.blocks.delete(`${params[0]}|${params[1]}`);
            return { rows: [], rowCount: Number(deleted) };
        }
        if (sql.includes('SELECT EXISTS')) {
            return {
                rows: [{
                    blocked: state.blocks.has(`${params[0]}|${params[1]}`)
                }]
            };
        }
        if (sql.includes('FROM "Blocks" b')) {
            return { rows: [{ id_user: TARGET_ID, username: "target" }] };
        }
        return { rows: [] };
    };
    return {
        state,
        pool: {
            query,
            async connect() {
                return { query, release() {} };
            }
        }
    };
}

describe("blocksRepository", () => {
    it("should atomically remove both follow directions and requests when blocking", async () => {
        const { pool, state } = createFakePool();
        const repository = createBlocksRepository(pool);
        assert.equal(await repository.blockUser(BLOCKER_ID, TARGET_ID), true);
        assert.equal(state.blocks.has(`${BLOCKER_ID}|${TARGET_ID}`), true);
        assert.equal(state.follows.size, 0);
        assert.equal(state.requests.size, 0);
        assert.ok(state.statements.includes("COMMIT"));
    });

    it("should return false when the account is already blocked", async () => {
        const { pool, state } = createFakePool();
        state.blocks.add(`${BLOCKER_ID}|${TARGET_ID}`);
        const repository = createBlocksRepository(pool);
        assert.equal(await repository.blockUser(BLOCKER_ID, TARGET_ID), false);
    });

    it("should not restore follows when unblocking", async () => {
        const { pool, state } = createFakePool();
        state.blocks.add(`${BLOCKER_ID}|${TARGET_ID}`);
        state.follows.clear();
        const repository = createBlocksRepository(pool);
        assert.equal(await repository.unblockUser(BLOCKER_ID, TARGET_ID), true);
        assert.equal(state.blocks.size, 0);
        assert.equal(state.follows.size, 0);
    });

    it("should reject a blocked account when the target does not exist", async () => {
        const { pool } = createFakePool();
        const repository = createBlocksRepository(pool);
        const missingUserId = "33333333-3333-4333-8333-333333333333";
        assert.equal(await repository.blockUser(BLOCKER_ID, missingUserId), null);
    });
});
