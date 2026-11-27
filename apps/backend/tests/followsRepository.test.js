const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createFollowsRepository } = require("../src/repositories/followsRepository");

const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const THIRD_ID = "33333333-3333-4333-8333-333333333333";

function createFakePool() {
    const state = {
        users: new Map(),
        blocks: [],
        follows: new Set(),
        queries: []
    };
    const pool = {
        async query(sql, params) {
            state.queries.push({ sql, params });
            if (sql.includes('AS "followers"')) {
                return { rows: [stateCounts(state, params[0], params[1])] };
            }
            if (sql.includes("ANY($2::uuid[])")) {
                return { rows: params[1]
                    .filter((id) => state.follows.has(`${params[0]}|${id}`))
                    .map((id) => ({ id_followed: id })) };
            }
            if (sql.includes("SELECT EXISTS")) {
                return {
                    rows: [{ following: state.follows.has(`${params[0]}|${params[1]}`) }]
                };
            }
            if (sql.includes('INSERT INTO "Follows"')) {
                return insertFollow(state, params);
            }
            if (sql.includes('DELETE FROM "Follows"')) {
                const key = `${params[0]}|${params[1]}`;
                const deleted = state.follows.delete(key);
                const rows = deleted ? [{ id_follower: params[0] }] : [];
                return { rows, rowCount: rows.length };
            }
            if (sql.includes("FROM \"Follows\" f")) {
                const isFollowers = sql.includes('WHERE f."id_followed" = $1');
                return { rows: listFollows(state, params, isFollowers) };
            }
            return { rows: findUsers(state, params), rowCount: 0 };
        }
    };
    return { pool, state };
}

function isBlocked(state, firstId, secondId) {
    return state.blocks.some((block) =>
        (block.blocker === firstId && block.blocked === secondId)
        || (block.blocker === secondId && block.blocked === firstId)
    );
}

function findUsers(state, params) {
    const [userId, viewerId] = params;
    const user = state.users.get(userId);
    if (!user || user.account_status !== "ACTIVE" || isBlocked(state, userId, viewerId)) {
        return [];
    }
    return [user];
}

function stateCounts(state, userId, viewerId) {
    const visibleFollowers = [...state.follows]
        .filter((key) => key.endsWith(`|${userId}`))
        .map((key) => key.split("|")[0])
        .filter((id) => state.users.get(id)?.account_status === "ACTIVE")
        .filter((id) => !isBlocked(state, id, viewerId)).length;
    const visibleFollowing = [...state.follows]
        .filter((key) => key.startsWith(`${userId}|`))
        .map((key) => key.split("|")[1])
        .filter((id) => state.users.get(id)?.account_status === "ACTIVE")
        .filter((id) => !isBlocked(state, id, viewerId)).length;
    return { followers: String(visibleFollowers), following: String(visibleFollowing) };
}

function insertFollow(state, params) {
    const [followerId, followedId] = params;
    const target = state.users.get(followedId);
    const allowed = followerId !== followedId
        && target?.account_status === "ACTIVE"
        && !isBlocked(state, followerId, followedId)
        && !state.follows.has(`${followerId}|${followedId}`);
    if (!allowed) {
        return { rows: [], rowCount: 0 };
    }
    state.follows.add(`${followerId}|${followedId}`);
    return { rows: [{ id_follower: followerId }], rowCount: 1 };
}

function listFollows(state, params, isFollowers) {
    const [userId, viewerId, limit, offset] = params;
    return [...state.follows]
        .filter((key) => isFollowers ? key.endsWith(`|${userId}`) : key.startsWith(`${userId}|`))
        .map((key) => state.users.get(isFollowers ? key.split("|")[0] : key.split("|")[1]))
        .filter((user) => user?.account_status === "ACTIVE")
        .filter((user) => !isBlocked(state, user.id_user, viewerId))
        .sort((a, b) => a.username.localeCompare(b.username))
        .slice(offset, offset + limit);
}

function seed() {
    const { pool, state } = createFakePool();
    state.users.set(VIEWER_ID, {
        id_user: VIEWER_ID, username: "viewer", account_status: "ACTIVE"
    });
    state.users.set(OTHER_ID, { id_user: OTHER_ID, username: "ana", account_status: "ACTIVE" });
    state.users.set(THIRD_ID, { id_user: THIRD_ID, username: "luis", account_status: "ACTIVE" });
    return { repository: createFollowsRepository(pool), state };
}

describe("followsRepository", () => {
    it("should not return a profile blocked with the viewer", async () => {
        const { repository, state } = seed();
        state.blocks.push({ blocker: OTHER_ID, blocked: VIEWER_ID });
        assert.equal(await repository.findVisibleUser(OTHER_ID, VIEWER_ID), null);
    });

    it("should not return an inactive profile", async () => {
        const { repository, state } = seed();
        state.users.get(OTHER_ID).account_status = "SUSPENDED";
        assert.equal(await repository.findVisibleUser(OTHER_ID, VIEWER_ID), null);
    });

    it("should reject self follows and duplicate relationships", async () => {
        const { repository } = seed();
        assert.equal(await repository.addFollow(OTHER_ID, OTHER_ID), false);
        assert.equal(await repository.addFollow(VIEWER_ID, OTHER_ID), true);
        assert.equal(await repository.addFollow(VIEWER_ID, OTHER_ID), false);
    });

    it("should cast the insert parameters to uuid", async () => {
        const { repository, state } = seed();
        await repository.addFollow(VIEWER_ID, OTHER_ID);
        const insert = state.queries.find((entry) => entry.sql.includes("INSERT INTO"));
        assert.ok(insert.sql.includes("$1::uuid") && insert.sql.includes("$2::uuid"));
    });

    it("should reject follows between blocked accounts", async () => {
        const { repository, state } = seed();
        state.blocks.push({ blocker: OTHER_ID, blocked: VIEWER_ID });
        assert.equal(await repository.addFollow(VIEWER_ID, OTHER_ID), false);
    });

    it("should return only the batch ids followed by the viewer", async () => {
        const { repository } = seed();
        await repository.addFollow(VIEWER_ID, OTHER_ID);
        const followed = await repository.findFollowStates(VIEWER_ID, [OTHER_ID, THIRD_ID]);
        assert.deepEqual(followed, [OTHER_ID]);
    });

    it("should count only visible relationships", async () => {
        const { repository, state } = seed();
        state.follows.add(`${VIEWER_ID}|${OTHER_ID}`);
        state.follows.add(`${OTHER_ID}|${VIEWER_ID}`);
        state.follows.add(`${THIRD_ID}|${VIEWER_ID}`);
        state.blocks.push({ blocker: THIRD_ID, blocked: VIEWER_ID });
        assert.deepEqual(await repository.countFollows(VIEWER_ID, VIEWER_ID), {
            followers: 1,
            following: 1
        });
    });

    it("should exclude blocked third parties from the follower list", async () => {
        const { repository, state } = seed();
        state.follows.add(`${VIEWER_ID}|${OTHER_ID}`);
        state.follows.add(`${THIRD_ID}|${OTHER_ID}`);
        state.blocks.push({ blocker: THIRD_ID, blocked: VIEWER_ID });
        const users = await repository.listFollowers(OTHER_ID, VIEWER_ID, 20, 0);
        assert.deepEqual(users.map((user) => user.username), ["viewer"]);
    });

    it("should remove only the outgoing relationship", async () => {
        const { repository, state } = seed();
        state.follows.add(`${VIEWER_ID}|${OTHER_ID}`);
        state.follows.add(`${OTHER_ID}|${VIEWER_ID}`);
        assert.equal(await repository.removeFollow(VIEWER_ID, OTHER_ID), true);
        assert.equal(state.follows.has(`${VIEWER_ID}|${OTHER_ID}`), false);
        assert.equal(state.follows.has(`${OTHER_ID}|${VIEWER_ID}`), true);
    });
});
