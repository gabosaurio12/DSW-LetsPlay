const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const {
    DEMO_USER_ID,
    PLAY_STYLES,
    calculateCompatibilityScore,
    createLfgRepository
} = require("../src/repositories/lfgRepository");

const SAMPLE_GAME_ID_1 = "11111111-1111-4111-8111-111111111111";
const SAMPLE_GAME_ID_2 = "22222222-2222-4222-8222-222222222222";
const SAMPLE_USER_ID_1 = "33333333-3333-4333-8333-333333333333";
const SAMPLE_USER_ID_2 = "44444444-4444-4444-8444-444444444444";
const SAMPLE_USER_ID_3 = "55555555-5555-4555-8555-555555555555";
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

function createMockLfgRepository(overrides = {}) {
    return {
        async findCompatiblePlayers() {
            return {
                players: [],
                filters: { platforms: [], availabilities: [], styles: [...PLAY_STYLES] }
            };
        },
        async findOpenLfgPosts() {
            return [];
        },
        async createLfgPost() {
            return null;
        },
        ...overrides
    };
}

async function withServer(lfgRepository, callback) {
    const app = createApp({
        videogameRepository: createMockVideogameRepository(),
        lfgRepository
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
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
}

describe("calculateCompatibilityScore (RN-28 50/30/20)", () => {
    it("returns 100 when games, platforms, and availability match completely", () => {
        const score = calculateCompatibilityScore({
            currentGames: [SAMPLE_GAME_ID_1, SAMPLE_GAME_ID_2],
            currentPlatforms: ["PC", "PlayStation"],
            currentAvailability: ["Weeknights", "Weekends"],
            targetGames: [{ id_videogame: SAMPLE_GAME_ID_1 }, { id_videogame: SAMPLE_GAME_ID_2 }],
            targetPlatforms: ["pc", "playstation", "Switch"],
            targetAvailability: ["weekends"]
        });

        assert.equal(score, 100);
    });

    it("computes proportional 50/30/20 weights for partial matches", () => {
        const score = calculateCompatibilityScore({
            currentGames: [SAMPLE_GAME_ID_1, SAMPLE_GAME_ID_2],
            currentPlatforms: ["PC", "Xbox"],
            currentAvailability: ["Weeknights"],
            targetGames: [SAMPLE_GAME_ID_1],
            targetPlatforms: ["PC"],
            targetAvailability: ["Weeknights"]
        });

        // 1/2 * 50 = 25, 1/2 * 30 = 15, >=1 availability = 20 -> 60
        assert.equal(score, 60);
    });

    it("awards full 50% game weight when selectedGameId matches targetGames", () => {
        const matchScore = calculateCompatibilityScore({
            currentGames: [SAMPLE_GAME_ID_1, SAMPLE_GAME_ID_2],
            currentPlatforms: ["PC"],
            currentAvailability: ["Weeknights"],
            targetGames: [SAMPLE_GAME_ID_2],
            targetPlatforms: [],
            targetAvailability: [],
            selectedGameId: SAMPLE_GAME_ID_2
        });

        const missScore = calculateCompatibilityScore({
            currentGames: [SAMPLE_GAME_ID_1],
            currentPlatforms: ["PC"],
            currentAvailability: ["Weeknights"],
            targetGames: [SAMPLE_GAME_ID_1],
            targetPlatforms: ["PC"],
            targetAvailability: ["Weeknights"],
            selectedGameId: SAMPLE_GAME_ID_2
        });

        assert.equal(matchScore, 50);
        assert.equal(missScore, 0);
    });

    it("returns 0 when platforms and availability overlap but no games are shared", () => {
        const score = calculateCompatibilityScore({
            currentGames: [SAMPLE_GAME_ID_1],
            currentPlatforms: ["PC", "PlayStation"],
            currentAvailability: ["Weeknights"],
            targetGames: [SAMPLE_GAME_ID_2],
            targetPlatforms: ["PC", "PlayStation"],
            targetAvailability: ["Weeknights"]
        });

        assert.equal(score, 0);
    });

    it("returns 0 when nothing overlaps", () => {
        const score = calculateCompatibilityScore({
            currentGames: [SAMPLE_GAME_ID_1],
            currentPlatforms: ["PC"],
            currentAvailability: ["Mornings"],
            targetGames: [SAMPLE_GAME_ID_2],
            targetPlatforms: ["Switch"],
            targetAvailability: ["Nights"]
        });

        assert.equal(score, 0);
    });
});

function createFakeLfgPrisma(overrides = {}) {
    const prisma = {
        gamerPreference: {
            async findUnique() {
                return null;
            }
        },
        userVideogames: {
            async findMany() {
                return [];
            }
        },
        user: {
            async findMany() {
                return [];
            }
        },
        lfgPost: {
            async findMany() {
                return [];
            },
            async create() {
                return null;
            }
        },
        videogames: {
            async findFirst() {
                return null;
            }
        }
    };

    for (const [model, methods] of Object.entries(overrides)) {
        prisma[model] = { ...prisma[model], ...methods };
    }
    return prisma;
}

function candidate(userId, username, preference) {
    return {
        id_user: userId,
        username,
        display_name: username,
        profile_photo_url: null,
        description: null,
        GamerPreference: preference
    };
}

function ownedGame(userId, videogameId, name) {
    return { id_user: userId, id_videogame: videogameId, Videogames: { name } };
}

describe("lfgRepository", () => {
    it("findCompatiblePlayers excludes blocks and inactive accounts, applies filters, and sorts by score", async () => {
        const candidateQueries = [];
        const prisma = createFakeLfgPrisma({
            gamerPreference: {
                async findUnique() {
                    return { active_platforms: ["PC", "PlayStation"], availability: ["Weeknights"] };
                }
            },
            userVideogames: {
                async findMany(args) {
                    if (typeof args.where.id_user === "string") {
                        return [{ id_videogame: SAMPLE_GAME_ID_1, Videogames: { name: "Halo Infinite" } }];
                    }
                    return [
                        ownedGame(SAMPLE_USER_ID_1, SAMPLE_GAME_ID_1, "Halo Infinite"),
                        ownedGame(SAMPLE_USER_ID_2, SAMPLE_GAME_ID_2, "Elden Ring"),
                        ownedGame(SAMPLE_USER_ID_3, SAMPLE_GAME_ID_1, "Halo Infinite")
                    ];
                }
            },
            user: {
                async findMany(args) {
                    candidateQueries.push(args);
                    return [
                        candidate(SAMPLE_USER_ID_1, "zara", {
                            favorite_genres: ["FPS"],
                            active_platforms: ["PC", "PlayStation"],
                            availability: ["Weeknights"],
                            preferred_style: "COOPERATIVE",
                            looking_to_play: true
                        }),
                        candidate(SAMPLE_USER_ID_2, "alex", {
                            favorite_genres: ["RPG"],
                            active_platforms: ["PC"],
                            availability: ["Mornings"],
                            preferred_style: "COOPERATIVE",
                            looking_to_play: true
                        }),
                        candidate(SAMPLE_USER_ID_3, "bruno", {
                            favorite_genres: ["FPS"],
                            active_platforms: ["PC"],
                            availability: ["Mornings"],
                            preferred_style: "COOPERATIVE",
                            looking_to_play: true
                        })
                    ];
                }
            }
        });

        const repo = createLfgRepository(prisma);
        const result = await repo.findCompatiblePlayers({
            onlyAvailable: true,
            style: "COOPERATIVE",
            platform: "PC"
        });

        const where = candidateQueries[0].where;
        assert.equal(where.account_status, "ACTIVE");
        assert.deepEqual(where.id_user, { not: DEMO_USER_ID });
        assert.deepEqual(where.GamerPreference, { looking_to_play: true, preferred_style: "COOPERATIVE" });
        assert.ok(where.Blocks_Blocks_id_blockerToUser);
        assert.ok(where.Blocks_Blocks_id_blockedToUser);

        assert.equal(result.players.length, 2);
        assert.equal(result.players[0].id_user, SAMPLE_USER_ID_1);
        assert.equal(result.players[0].match_percentage, 100);
        assert.deepEqual(result.players[0].shared_platforms, ["PC", "PlayStation"]);
        assert.deepEqual(result.players[0].shared_availability, ["Weeknights"]);
        assert.equal(result.players[1].id_user, SAMPLE_USER_ID_3);
        assert.equal(result.players[1].match_percentage, 65);
        assert.deepEqual(result.players[1].shared_platforms, ["PC"]);
        assert.deepEqual(result.players[1].shared_availability, []);
        assert.deepEqual(result.filters.platforms, ["PC", "PlayStation"]);
        assert.deepEqual(result.filters.availabilities, ["Mornings", "Weeknights"]);
        assert.deepEqual(result.filters.styles, PLAY_STYLES);
    });

    it("should exclude candidates without shared games when the viewer has a library", async () => {
        const prisma = createFakeLfgPrisma({
            gamerPreference: {
                async findUnique() {
                    return { active_platforms: ["PC"], availability: ["Weeknights"] };
                }
            },
            userVideogames: {
                async findMany(args) {
                    if (typeof args.where.id_user === "string") {
                        return [{ id_videogame: SAMPLE_GAME_ID_1, Videogames: { name: "Halo Infinite" } }];
                    }
                    return [ownedGame(SAMPLE_USER_ID_2, SAMPLE_GAME_ID_2, "Elden Ring")];
                }
            },
            user: {
                async findMany() {
                    return [candidate(SAMPLE_USER_ID_2, "alex", {
                        favorite_genres: ["RPG"],
                        active_platforms: ["PC"],
                        availability: ["Weeknights"],
                        preferred_style: "CASUAL",
                        looking_to_play: true
                    })];
                }
            }
        });

        const result = await createLfgRepository(prisma).findCompatiblePlayers();

        assert.equal(result.players.length, 0);
    });

    it("should return platform and schedule matches when the viewer has no library yet", async () => {
        const prisma = createFakeLfgPrisma({
            gamerPreference: {
                async findUnique() {
                    return { active_platforms: ["PC"], availability: ["Weeknights"] };
                }
            },
            user: {
                async findMany() {
                    return [candidate(SAMPLE_USER_ID_2, "alex", {
                        favorite_genres: ["RPG"],
                        active_platforms: ["PC"],
                        availability: ["Weeknights"],
                        preferred_style: "CASUAL",
                        looking_to_play: true
                    })];
                }
            },
            userVideogames: {
                async findMany(args) {
                    if (typeof args.where.id_user === "string") {
                        return [];
                    }
                    return [ownedGame(SAMPLE_USER_ID_2, SAMPLE_GAME_ID_2, "Elden Ring")];
                }
            }
        });

        const result = await createLfgRepository(prisma).findCompatiblePlayers();

        assert.equal(result.players.length, 1);
        assert.equal(result.players[0].id_user, SAMPLE_USER_ID_2);
        assert.equal(result.players[0].match_percentage, 50);
        assert.deepEqual(result.players[0].shared_games, []);
        assert.deepEqual(result.players[0].shared_platforms, ["PC"]);
        assert.deepEqual(result.players[0].shared_availability, ["Weeknights"]);
    });

    it("findOpenLfgPosts filters by game, platform, and the viewer's visible authors", async () => {
        const queries = [];
        const prisma = createFakeLfgPrisma({
            lfgPost: {
                async findMany(args) {
                    queries.push(args);
                    return [];
                }
            }
        });

        await createLfgRepository(prisma).findOpenLfgPosts({ gameId: SAMPLE_GAME_ID_1, platform: "PC" });

        assert.equal(queries[0].where.status, "OPEN");
        assert.equal(queries[0].where.id_videogame, SAMPLE_GAME_ID_1);
        assert.deepEqual(queries[0].where.platform, { equals: "PC", mode: "insensitive" });
        assert.equal(queries[0].where.User.account_status, "ACTIVE");
        assert.deepEqual(queries[0].where.Videogames, { status: "ACTIVE" });
        assert.deepEqual(queries[0].orderBy, { created_at: "desc" });
    });

    it("findOpenLfgPosts matches the platform literally when it contains LIKE wildcards", async () => {
        const queries = [];
        const prisma = createFakeLfgPrisma({
            lfgPost: {
                async findMany(args) {
                    queries.push(args);
                    return [];
                }
            }
        });

        await createLfgRepository(prisma).findOpenLfgPosts({ platform: "P_C" });

        assert.deepEqual(queries[0].where.platform, { equals: "P\\_C", mode: "insensitive" });
        assert.equal(queries[0].where.id_videogame, undefined);
    });

    it("createLfgPost returns null when active videogame is not found", async () => {
        const prisma = createFakeLfgPrisma({
            lfgPost: {
                async create() {
                    assert.fail("create must not run when the videogame is missing");
                }
            }
        });

        const post = await createLfgRepository(prisma).createLfgPost({
            videogameId: SAMPLE_GAME_ID_1,
            platform: "PC",
            spotsAvailable: 3,
            scheduledTime: "Tonight 9 PM",
            description: "Looking for relaxed teammates with mic."
        });

        assert.equal(post, null);
    });

    it("createLfgPost inserts with generated UUID, demo user, and OPEN status", async () => {
        const creates = [];
        const prisma = createFakeLfgPrisma({
            videogames: {
                async findFirst() {
                    return { id_videogame: SAMPLE_GAME_ID_1 };
                }
            },
            lfgPost: {
                async create(args) {
                    creates.push(args);
                    return {
                        id_lfg: args.data.id_lfg,
                        id_user: args.data.id_user,
                        id_videogame: args.data.id_videogame,
                        platform: args.data.platform,
                        spots_available: args.data.spots_available,
                        scheduled_time: args.data.scheduled_time,
                        description: args.data.description,
                        accepts_beginners: args.data.accepts_beginners,
                        status: args.data.status,
                        created_at: "2026-01-01T00:00:00.000Z",
                        User: { username: "demo", display_name: null, profile_photo_url: null },
                        Videogames: { name: "Elden Ring", cover_url: null }
                    };
                }
            }
        });

        const post = await createLfgRepository(prisma).createLfgPost({
            videogameId: SAMPLE_GAME_ID_1,
            platform: "PC",
            spotsAvailable: 4,
            scheduledTime: "Friday 8 PM",
            description: "Co-op campaign run from the beginning."
        });

        assert.equal(creates.length, 1);
        assert.match(post.id_lfg, UUID_REGEX);
        assert.equal(post.id_user, DEMO_USER_ID);
        assert.equal(post.accepts_beginners, true);
        assert.equal(post.status, "OPEN");
        assert.equal(post.videogame_name, "Elden Ring");
        assert.equal(post.author_username, "demo");
    });
});

describe("lfgRouter", () => {
    it("GET /api/lfg/players returns 400 for invalid userId, gameId, or style", async () => {
        await withServer(createMockLfgRepository(), async (baseUrl) => {
            const badUser = await fetch(`${baseUrl}/api/lfg/players?userId=bad-uuid`);
            assert.equal(badUser.status, 400);

            const badGame = await fetch(`${baseUrl}/api/lfg/players?gameId=bad-uuid`);
            assert.equal(badGame.status, 400);

            const badStyle = await fetch(`${baseUrl}/api/lfg/players?style=HARDCORE`);
            assert.equal(badStyle.status, 400);
        });
    });

    it("GET /api/lfg/players forwards filters and returns 200", async () => {
        let receivedFilters;
        const repo = createMockLfgRepository({
            async findCompatiblePlayers(filters) {
                receivedFilters = filters;
                return {
                    players: [{ id_user: SAMPLE_USER_ID_1, match_percentage: 80 }],
                    filters: {
                        platforms: ["PC"],
                        availabilities: ["Weeknights"],
                        styles: [...PLAY_STYLES]
                    }
                };
            }
        });

        await withServer(repo, async (baseUrl) => {
            const res = await fetch(
                `${baseUrl}/api/lfg/players?gameId=${SAMPLE_GAME_ID_1}&platform=PC&availability=Weeknights&style=casual&onlyAvailable=true`
            );
            assert.equal(res.status, 200);
            const body = await res.json();
            assert.equal(body.players.length, 1);
            assert.deepEqual(body.filters.platforms, ["PC"]);
            assert.deepEqual(receivedFilters, {
                userId: undefined,
                gameId: SAMPLE_GAME_ID_1,
                platform: "PC",
                availability: "Weeknights",
                style: "CASUAL",
                onlyAvailable: true
            });
        });
    });

    it("GET /api/lfg/posts returns 400 for invalid gameId and 200 with posts", async () => {
        const repo = createMockLfgRepository({
            async findOpenLfgPosts() {
                return [{ id_lfg: "lfg-1", platform: "PC" }];
            }
        });

        await withServer(repo, async (baseUrl) => {
            const bad = await fetch(`${baseUrl}/api/lfg/posts?gameId=invalid`);
            assert.equal(bad.status, 400);

            const ok = await fetch(`${baseUrl}/api/lfg/posts?gameId=${SAMPLE_GAME_ID_1}`);
            assert.equal(ok.status, 200);
            const body = await ok.json();
            assert.equal(body.posts.length, 1);
        });
    });

    it("POST /api/lfg/posts validates payload (400) and returns 404 when game is missing", async () => {
        await withServer(createMockLfgRepository(), async (baseUrl) => {
            const invalidGame = await fetch(`${baseUrl}/api/lfg/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videogameId: "not-a-uuid",
                    platform: "PC",
                    spotsAvailable: 2,
                    scheduledTime: "20:00-23:00",
                    description: "Valid description with enough chars."
                })
            });
            assert.equal(invalidGame.status, 400);

            const longPlatform = await fetch(`${baseUrl}/api/lfg/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videogameId: SAMPLE_GAME_ID_1,
                    platform: "P".repeat(51),
                    spotsAvailable: 2,
                    scheduledTime: "20:00-23:00",
                    description: "Valid description with enough chars."
                })
            });
            assert.equal(longPlatform.status, 400);

            const invalidSpots = await fetch(`${baseUrl}/api/lfg/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videogameId: SAMPLE_GAME_ID_1,
                    platform: "PC",
                    spotsAvailable: 17,
                    scheduledTime: "20:00-23:00",
                    description: "Valid description with enough chars."
                })
            });
            assert.equal(invalidSpots.status, 400);

            const invalidScheduleText = await fetch(`${baseUrl}/api/lfg/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videogameId: SAMPLE_GAME_ID_1,
                    platform: "PC",
                    spotsAvailable: 2,
                    scheduledTime: "Tonight",
                    description: "Valid description with enough chars."
                })
            });
            assert.equal(invalidScheduleText.status, 400);
            const invalidScheduleTextBody = await invalidScheduleText.json();
            assert.equal(
                invalidScheduleTextBody.error,
                "scheduledTime must be a valid time or time range (HH:MM or HH:MM-HH:MM)"
            );

            const invalidScheduleHour = await fetch(`${baseUrl}/api/lfg/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videogameId: SAMPLE_GAME_ID_1,
                    platform: "PC",
                    spotsAvailable: 2,
                    scheduledTime: "25:00",
                    description: "Valid description with enough chars."
                })
            });
            assert.equal(invalidScheduleHour.status, 400);
            const invalidScheduleHourBody = await invalidScheduleHour.json();
            assert.equal(
                invalidScheduleHourBody.error,
                "scheduledTime must be a valid time or time range (HH:MM or HH:MM-HH:MM)"
            );

            const shortDescription = await fetch(`${baseUrl}/api/lfg/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videogameId: SAMPLE_GAME_ID_1,
                    platform: "PC",
                    spotsAvailable: 2,
                    scheduledTime: "20:00-23:00",
                    description: "Too short"
                })
            });
            assert.equal(shortDescription.status, 400);

            const notFound = await fetch(`${baseUrl}/api/lfg/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videogameId: SAMPLE_GAME_ID_1,
                    platform: "PC",
                    spotsAvailable: 2,
                    scheduledTime: "20:00-23:00",
                    description: "Looking for support with microphone."
                })
            });
            assert.equal(notFound.status, 404);
        });
    });

    it("POST /api/lfg/posts returns 201 with created post for valid single time and normalized time range", async () => {
        const repo = createMockLfgRepository({
            async createLfgPost(payload) {
                return {
                    id_lfg: "99999999-9999-4999-8999-999999999999",
                    id_videogame: payload.videogameId,
                    platform: payload.platform,
                    spots_available: payload.spotsAvailable,
                    scheduled_time: payload.scheduledTime,
                    description: payload.description,
                    accepts_beginners: payload.acceptsBeginners,
                    status: "OPEN"
                };
            }
        });

        await withServer(repo, async (baseUrl) => {
            const singleTimeRes = await fetch(`${baseUrl}/api/lfg/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videogameId: SAMPLE_GAME_ID_1,
                    platform: "PC",
                    spotsAvailable: 3,
                    scheduledTime: "20:00",
                    description: "Looking for chill players for ranked matches.",
                    acceptsBeginners: false
                })
            });

            assert.equal(singleTimeRes.status, 201);
            const singleTimeBody = await singleTimeRes.json();
            assert.equal(singleTimeBody.post.status, "OPEN");
            assert.equal(singleTimeBody.post.spots_available, 3);
            assert.equal(singleTimeBody.post.scheduled_time, "20:00");
            assert.equal(singleTimeBody.post.accepts_beginners, false);

            const rangeTimeRes = await fetch(`${baseUrl}/api/lfg/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videogameId: SAMPLE_GAME_ID_1,
                    platform: "PC",
                    spotsAvailable: 2,
                    scheduledTime: " 20:00 - 23:00 ",
                    description: "Looking for chill players for ranked matches."
                })
            });

            assert.equal(rangeTimeRes.status, 201);
            const rangeTimeBody = await rangeTimeRes.json();
            assert.equal(rangeTimeBody.post.scheduled_time, "20:00-23:00");
        });
    });
});
