const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createBlocksRepository } = require("../src/repositories/blocksRepository");

const BLOCKER_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_ID = "22222222-2222-4222-8222-222222222222";
const BOTH_DIRECTIONS = [
    { id_follower: BLOCKER_ID, id_followed: TARGET_ID },
    { id_follower: TARGET_ID, id_followed: BLOCKER_ID }
];

function createFakePrisma(overrides = {}) {
    const prisma = {
        user: {
            async findFirst() {
                return { id_user: TARGET_ID };
            }
        },
        blocks: {
            async createMany() {
                return { count: 1 };
            },
            async deleteMany() {
                return { count: 1 };
            },
            async findMany() {
                return [];
            },
            async count() {
                return 0;
            },
            async findUnique() {
                return null;
            }
        },
        follows: {
            async deleteMany() {
                return { count: 0 };
            },
            async createMany() {
                return { count: 0 };
            }
        },
        followRequests: {
            async deleteMany() {
                return { count: 0 };
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

describe("blocksRepository", () => {
    it("should atomically remove both follow directions and requests when blocking", async () => {
        const calls = [];
        const prisma = createFakePrisma({
            blocks: {
                async createMany(args) {
                    calls.push({ step: "block", args });
                    return { count: 1 };
                }
            },
            follows: {
                async deleteMany(args) {
                    calls.push({ step: "follows", args });
                    return { count: 1 };
                }
            },
            followRequests: {
                async deleteMany(args) {
                    calls.push({ step: "requests", args });
                    return { count: 1 };
                }
            }
        });

        const blocked = await createBlocksRepository(prisma).blockUser(BLOCKER_ID, TARGET_ID);

        assert.equal(blocked, true);
        assert.deepEqual(calls[0].args, {
            data: [{ id_blocker: BLOCKER_ID, id_blocked: TARGET_ID }],
            skipDuplicates: true
        });
        assert.deepEqual(calls[1], { step: "follows", args: { where: { OR: BOTH_DIRECTIONS } } });
        assert.deepEqual(calls[2], { step: "requests", args: { where: { OR: BOTH_DIRECTIONS } } });
    });

    it("should return false when the account is already blocked", async () => {
        const prisma = createFakePrisma({
            blocks: {
                async createMany() {
                    return { count: 0 };
                }
            }
        });

        const blocked = await createBlocksRepository(prisma).blockUser(BLOCKER_ID, TARGET_ID);

        assert.equal(blocked, false);
    });

    it("should not restore follows when unblocking", async () => {
        const prisma = createFakePrisma({
            follows: {
                async createMany() {
                    assert.fail("unblocking must not recreate follows");
                }
            }
        });

        const unblocked = await createBlocksRepository(prisma).unblockUser(BLOCKER_ID, TARGET_ID);

        assert.equal(unblocked, true);
    });

    it("should reject a blocked account when the target does not exist", async () => {
        const missingUserId = "33333333-3333-4333-8333-333333333333";
        const prisma = createFakePrisma({
            user: {
                async findFirst() {
                    return null;
                }
            },
            blocks: {
                async createMany() {
                    assert.fail("no block must be created for a missing target");
                }
            }
        });

        const blocked = await createBlocksRepository(prisma).blockUser(BLOCKER_ID, missingUserId);

        assert.equal(blocked, null);
    });

    it("should reject blocking the same account when the ids match ignoring case", async () => {
        const prisma = createFakePrisma({
            blocks: {
                async createMany() {
                    assert.fail("an account must not block itself");
                }
            }
        });

        const blocked = await createBlocksRepository(prisma).blockUser(BLOCKER_ID, BLOCKER_ID.toUpperCase());

        assert.equal(blocked, null);
    });

    it("should list blocked accounts with the block date and only active profiles", async () => {
        const queries = [];
        const blockedAt = new Date("2026-01-02T00:00:00.000Z");
        const prisma = createFakePrisma({
            blocks: {
                async findMany(args) {
                    queries.push(args);
                    return [{
                        blocked_at: blockedAt,
                        User_Blocks_id_blockedToUser: {
                            id_user: TARGET_ID,
                            username: "target",
                            display_name: null,
                            profile_photo_url: null
                        }
                    }];
                }
            }
        });

        const blockedUsers = await createBlocksRepository(prisma).listBlockedUsers(BLOCKER_ID, 20, 0);

        assert.deepEqual(blockedUsers, [{
            id_user: TARGET_ID,
            username: "target",
            display_name: null,
            profile_photo_url: null,
            blocked_at: blockedAt
        }]);
        assert.deepEqual(queries[0].where, {
            id_blocker: BLOCKER_ID,
            User_Blocks_id_blockedToUser: { account_status: "ACTIVE" }
        });
        assert.equal(queries[0].take, 20);
        assert.equal(queries[0].skip, 0);
    });

    it("should report whether the actor blocks the target", async () => {
        const prisma = createFakePrisma({
            blocks: {
                async findUnique(args) {
                    assert.deepEqual(args.where, {
                        id_blocker_id_blocked: { id_blocker: BLOCKER_ID, id_blocked: TARGET_ID }
                    });
                    return { id_blocker: BLOCKER_ID };
                }
            }
        });

        assert.equal(await createBlocksRepository(prisma).hasBlocked(BLOCKER_ID, TARGET_ID), true);
    });
});
