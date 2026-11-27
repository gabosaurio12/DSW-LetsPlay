const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createFollowsRepository } = require("../src/repositories/followsRepository");

const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const THIRD_ID = "33333333-3333-4333-8333-333333333333";

const NOT_BLOCKED_FILTER = {
    Blocks_Blocks_id_blockerToUser: { none: { id_blocked: VIEWER_ID } },
    Blocks_Blocks_id_blockedToUser: { none: { id_blocker: VIEWER_ID } }
};

function createFakePrisma(overrides = {}) {
    const prisma = {
        user: {
            async findFirst() {
                return null;
            },
            async update() {
                throw Object.assign(new Error("Record not found"), { code: "P2025" });
            }
        },
        follows: {
            async findUnique() {
                return null;
            },
            async findMany() {
                return [];
            },
            async count() {
                return 0;
            },
            async createMany() {
                return { count: 0 };
            },
            async deleteMany() {
                return { count: 0 };
            }
        },
        followRequests: {
            async findUnique() {
                return null;
            },
            async findMany() {
                return [];
            },
            async count() {
                return 0;
            },
            async createMany() {
                return { count: 0 };
            },
            async deleteMany() {
                return { count: 0 };
            }
        },
        blocks: {
            async findFirst() {
                return null;
            }
        },
        async $queryRaw() {
            return [];
        }
    };

    for (const [model, methods] of Object.entries(overrides)) {
        if (model === "$queryRaw") {
            prisma.$queryRaw = methods;
        } else {
            prisma[model] = { ...prisma[model], ...methods };
        }
    }
    prisma.$transaction = async (work) => work(prisma);
    return prisma;
}

describe("followsRepository", () => {
    it("should filter out a profile blocked with the viewer when reading it", async () => {
        const queries = [];
        const prisma = createFakePrisma({
            user: {
                async findFirst(args) {
                    queries.push(args);
                    return null;
                }
            }
        });

        const profile = await createFollowsRepository(prisma).findVisibleUser(OTHER_ID, VIEWER_ID);

        assert.equal(profile, null);
        assert.equal(queries[0].where.id_user, OTHER_ID);
        assert.equal(queries[0].where.account_status, "ACTIVE");
        assert.deepEqual(queries[0].where.Blocks_Blocks_id_blockerToUser, NOT_BLOCKED_FILTER.Blocks_Blocks_id_blockerToUser);
        assert.deepEqual(queries[0].where.Blocks_Blocks_id_blockedToUser, NOT_BLOCKED_FILTER.Blocks_Blocks_id_blockedToUser);
    });

    it("should reject self follows when the target account is public", async () => {
        const createCalls = [];
        const prisma = createFakePrisma({
            user: {
                async findFirst() {
                    return { is_private: false };
                }
            },
            follows: {
                async createMany(args) {
                    createCalls.push(args);
                    return { count: 1 };
                }
            }
        });

        const result = await createFollowsRepository(prisma).addFollow(OTHER_ID, OTHER_ID);

        assert.equal(result, null);
        assert.equal(createCalls.length, 0);
    });

    it("should report the existing state when the relationship is already stored", async () => {
        const prisma = createFakePrisma({
            user: {
                async findFirst() {
                    return { is_private: false };
                }
            },
            follows: {
                async findUnique() {
                    return { id_follower: VIEWER_ID };
                }
            }
        });

        const result = await createFollowsRepository(prisma).addFollow(VIEWER_ID, OTHER_ID);

        assert.equal(result, "following");
    });

    it("should insert follows with skipDuplicates so concurrent duplicates are ignored", async () => {
        const createCalls = [];
        const prisma = createFakePrisma({
            user: {
                async findFirst() {
                    return { is_private: false };
                }
            },
            follows: {
                async createMany(args) {
                    createCalls.push(args);
                    return { count: 1 };
                }
            }
        });

        const result = await createFollowsRepository(prisma).addFollow(VIEWER_ID, OTHER_ID);

        assert.equal(result, "following");
        assert.deepEqual(createCalls[0], {
            data: [{ id_follower: VIEWER_ID, id_followed: OTHER_ID }],
            skipDuplicates: true
        });
    });

    it("should reject follows between blocked accounts", async () => {
        const prisma = createFakePrisma({
            user: {
                async findFirst() {
                    return { is_private: false };
                }
            },
            blocks: {
                async findFirst() {
                    return { id_blocker: OTHER_ID };
                }
            }
        });

        const result = await createFollowsRepository(prisma).addFollow(VIEWER_ID, OTHER_ID);

        assert.equal(result, null);
    });

    it("should return only the batch ids followed by the viewer", async () => {
        const queries = [];
        const prisma = createFakePrisma({
            follows: {
                async findMany(args) {
                    queries.push(args);
                    return [{ id_followed: OTHER_ID }];
                }
            }
        });

        const followed = await createFollowsRepository(prisma).findFollowStates(VIEWER_ID, [OTHER_ID, THIRD_ID]);

        assert.deepEqual(followed, [OTHER_ID]);
        assert.deepEqual(queries[0].where, {
            id_follower: VIEWER_ID,
            id_followed: { in: [OTHER_ID, THIRD_ID] }
        });
    });

    it("should count only relationships with active accounts that are not blocked", async () => {
        const counts = [];
        const prisma = createFakePrisma({
            follows: {
                async count(args) {
                    counts.push(args);
                    return 1;
                }
            }
        });

        const totals = await createFollowsRepository(prisma).countFollows(VIEWER_ID, VIEWER_ID);

        assert.deepEqual(totals, { followers: 1, following: 1 });
        assert.equal(counts.length, 2);
        assert.equal(counts[0].where.id_followed, VIEWER_ID);
        assert.equal(counts[0].where.User_Follows_id_followerToUser.account_status, "ACTIVE");
        assert.deepEqual(
            counts[0].where.User_Follows_id_followerToUser.Blocks_Blocks_id_blockerToUser,
            NOT_BLOCKED_FILTER.Blocks_Blocks_id_blockerToUser
        );
        assert.equal(counts[1].where.id_follower, VIEWER_ID);
    });

    it("should exclude blocked third parties from the follower list", async () => {
        const queries = [];
        const prisma = createFakePrisma({
            follows: {
                async findMany(args) {
                    queries.push(args);
                    return [{ User_Follows_id_followerToUser: { id_user: VIEWER_ID, username: "viewer" } }];
                }
            }
        });

        const users = await createFollowsRepository(prisma).listFollowers(OTHER_ID, VIEWER_ID, 20, 0);

        assert.deepEqual(users.map((user) => user.username), ["viewer"]);
        assert.equal(queries[0].where.id_followed, OTHER_ID);
        assert.deepEqual(
            queries[0].where.User_Follows_id_followerToUser.Blocks_Blocks_id_blockedToUser,
            NOT_BLOCKED_FILTER.Blocks_Blocks_id_blockedToUser
        );
        assert.equal(queries[0].take, 20);
        assert.equal(queries[0].skip, 0);
    });

    it("should remove only the outgoing relationship", async () => {
        const deletes = [];
        const prisma = createFakePrisma({
            follows: {
                async deleteMany(args) {
                    deletes.push({ model: "follows", args });
                    return { count: 1 };
                }
            },
            followRequests: {
                async deleteMany(args) {
                    deletes.push({ model: "followRequests", args });
                    return { count: 0 };
                }
            }
        });

        const removed = await createFollowsRepository(prisma).removeFollow(VIEWER_ID, OTHER_ID);

        assert.equal(removed, true);
        assert.deepEqual(deletes[0], {
            model: "follows",
            args: { where: { id_follower: VIEWER_ID, id_followed: OTHER_ID } }
        });
        assert.deepEqual(deletes[1], {
            model: "followRequests",
            args: { where: { id_follower: VIEWER_ID, id_followed: OTHER_ID } }
        });
    });

    it("should create a pending request when the target account is private", async () => {
        const requestCalls = [];
        const prisma = createFakePrisma({
            user: {
                async findFirst() {
                    return { is_private: true };
                }
            },
            followRequests: {
                async createMany(args) {
                    requestCalls.push(args);
                    return { count: 1 };
                }
            }
        });

        const result = await createFollowsRepository(prisma).addFollow(VIEWER_ID, OTHER_ID);

        assert.equal(result, "pending");
        assert.deepEqual(requestCalls[0].data, [{ id_follower: VIEWER_ID, id_followed: OTHER_ID }]);
    });

    it("should skip the follow when the accepted request is blocked", async () => {
        const createCalls = [];
        const prisma = createFakePrisma({
            followRequests: {
                async deleteMany() {
                    return { count: 1 };
                }
            },
            blocks: {
                async findFirst() {
                    return { id_blocker: OTHER_ID };
                }
            },
            follows: {
                async createMany(args) {
                    createCalls.push(args);
                    return { count: 1 };
                }
            }
        });

        const resolved = await createFollowsRepository(prisma).resolveFollowRequest(VIEWER_ID, OTHER_ID, "accept");

        assert.equal(resolved, false);
        assert.equal(createCalls.length, 0);
    });

    it("should return null from updatePrivacy when the account is unavailable", async () => {
        const prisma = createFakePrisma({
            user: {
                async update() {
                    throw Object.assign(new Error("Record not found"), { code: "P2025" });
                }
            }
        });

        const saved = await createFollowsRepository(prisma).updatePrivacy(VIEWER_ID, true);

        assert.equal(saved, null);
    });
});
