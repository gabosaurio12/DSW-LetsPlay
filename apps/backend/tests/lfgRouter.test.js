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

describe("lfgRepository", () => {
    it("findCompatiblePlayers excludes blocks and inactive accounts, applies filters, and sorts by score", async () => {
        const queries = [];
        const pool = {
            async query(sql, params) {
                queries.push({ sql, params });

                if (sql.includes("FROM \"GamerPreference\"")) {
                    return {
                        rows: [{
                            active_platforms: ["PC", "PlayStation"],
                            availability: ["Weeknights"],
                            preferred_style: "COOPERATIVE",
                            looking_to_play: true
                        }]
                    };
                }

                if (sql.includes("WHERE uv.\"id_user\" = $1")) {
                    return {
                        rows: [{ id_videogame: SAMPLE_GAME_ID_1, name: "Halo Infinite" }]
                    };
                }

                if (sql.includes("FROM \"User\" u")) {
                    return {
                        rows: [
                            {
                                id_user: SAMPLE_USER_ID_1,
                                username: "zara",
                                display_name: "Zara",
                                profile_photo_url: null,
                                favorite_genres: ["FPS"],
                                active_platforms: ["PC", "PlayStation"],
                                availability: ["Weeknights"],
                                preferred_style: "COOPERATIVE",
                                looking_to_play: true
                            },
                            {
                                id_user: SAMPLE_USER_ID_2,
                                username: "alex",
                                display_name: "Alex",
                                profile_photo_url: null,
                                favorite_genres: ["RPG"],
                                active_platforms: ["PC"],
                                availability: ["Mornings"],
                                preferred_style: "COOPERATIVE",
                                looking_to_play: true
                            },
                            {
                                id_user: SAMPLE_USER_ID_3,
                                username: "bruno",
                                display_name: "Bruno",
                                profile_photo_url: null,
                                favorite_genres: ["FPS"],
                                active_platforms: ["PC"],
                                availability: ["Mornings"],
                                preferred_style: "COOPERATIVE",
                                looking_to_play: true
                            }
                        ]
                    };
                }

                if (sql.includes("ANY($1::uuid[])")) {
                    return {
                        rows: [
                            { id_user: SAMPLE_USER_ID_1, id_videogame: SAMPLE_GAME_ID_1, name: "Halo Infinite" },
                            { id_user: SAMPLE_USER_ID_2, id_videogame: SAMPLE_GAME_ID_2, name: "Elden Ring" },
                            { id_user: SAMPLE_USER_ID_3, id_videogame: SAMPLE_GAME_ID_1, name: "Halo Infinite" }
                        ]
                    };
                }

                return { rows: [] };
            }
        };

        const repo = createLfgRepository(pool);
        const result = await repo.findCompatiblePlayers({
            onlyAvailable: true,
            style: "COOPERATIVE",
            platform: "PC"
        });

        const candidateQuery = queries.find((q) => q.sql.includes("FROM \"User\" u"));
        assert.ok(candidateQuery.sql.includes("u.\"account_status\" = 'ACTIVE'"));
        assert.ok(candidateQuery.sql.includes("u.\"id_user\" <> $1"));
        assert.ok(candidateQuery.sql.includes("FROM \"Blocks\" b"));
        assert.ok(candidateQuery.sql.includes("gp.\"looking_to_play\" = true"));
        assert.ok(candidateQuery.sql.includes("gp.\"preferred_style\" = $2"));
        assert.deepEqual(candidateQuery.params, [DEMO_USER_ID, "COOPERATIVE"]);

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

    it("findCompatiblePlayers excludes candidates without shared games even when platforms and availability match", async () => {
        const pool = {
            async query(sql) {
                if (sql.includes("FROM \"GamerPreference\"")) {
                    return {
                        rows: [{
                            active_platforms: ["PC"],
                            availability: ["Weeknights"],
                            preferred_style: "CASUAL",
                            looking_to_play: true
                        }]
                    };
                }

                if (sql.includes("WHERE uv.\"id_user\" = $1")) {
                    return {
                        rows: [{ id_videogame: SAMPLE_GAME_ID_1, name: "Halo Infinite" }]
                    };
                }

                if (sql.includes("FROM \"User\" u")) {
                    return {
                        rows: [
                            {
                                id_user: SAMPLE_USER_ID_2,
                                username: "alex",
                                display_name: "Alex",
                                profile_photo_url: null,
                                favorite_genres: ["RPG"],
                                active_platforms: ["PC"],
                                availability: ["Weeknights"],
                                preferred_style: "CASUAL",
                                looking_to_play: true
                            }
                        ]
                    };
                }

                if (sql.includes("ANY($1::uuid[])")) {
                    return {
                        rows: [
                            { id_user: SAMPLE_USER_ID_2, id_videogame: SAMPLE_GAME_ID_2, name: "Elden Ring" }
                        ]
                    };
                }

                return { rows: [] };
            }
        };

        const repo = createLfgRepository(pool);
        const result = await repo.findCompatiblePlayers();

        assert.equal(result.players.length, 0);
    });

    it("findOpenLfgPosts queries open posts with optional gameId and platform filters", async () => {
        const captured = [];
        const pool = {
            async query(sql, params) {
                captured.push({ sql, params });
                return { rows: [{ id_lfg: "lfg-1" }] };
            }
        };

        const repo = createLfgRepository(pool);
        const posts = await repo.findOpenLfgPosts({ gameId: SAMPLE_GAME_ID_1, platform: "PC" });

        assert.equal(posts.length, 1);
        assert.ok(captured[0].sql.includes("lp.\"status\" = 'OPEN'"));
        assert.ok(captured[0].sql.includes("lp.\"id_videogame\" = $1"));
        assert.ok(captured[0].sql.includes("LOWER(lp.\"platform\") = LOWER($2)"));
        assert.deepEqual(captured[0].params, [SAMPLE_GAME_ID_1, "PC"]);
    });

    it("createLfgPost returns null when active videogame is not found", async () => {
        const pool = {
            async query() {
                return { rows: [] };
            }
        };

        const repo = createLfgRepository(pool);
        const post = await repo.createLfgPost({
            videogameId: SAMPLE_GAME_ID_1,
            platform: "PC",
            spotsAvailable: 3,
            scheduledTime: "Tonight 9 PM",
            description: "Looking for relaxed teammates with mic."
        });

        assert.equal(post, null);
    });

    it("createLfgPost inserts with generated UUID, demo user, and OPEN status", async () => {
        const queries = [];
        const pool = {
            async query(sql, params) {
                queries.push({ sql, params });
                if (sql.includes("FROM \"v_public_videogame\"")) {
                    return { rows: [{ id_videogame: SAMPLE_GAME_ID_1 }] };
                }
                return {
                    rows: [{
                        id_lfg: params[0],
                        id_user: params[1],
                        id_videogame: params[2],
                        platform: params[3],
                        spots_available: params[4],
                        scheduled_time: params[5],
                        description: params[6],
                        accepts_beginners: params[7],
                        status: "OPEN"
                    }]
                };
            }
        };

        const repo = createLfgRepository(pool);
        const post = await repo.createLfgPost({
            videogameId: SAMPLE_GAME_ID_1,
            platform: "PC",
            spotsAvailable: 4,
            scheduledTime: "Friday 8 PM",
            description: "Co-op campaign run from the beginning."
        });

        assert.equal(queries.length, 2);
        assert.match(post.id_lfg, UUID_REGEX);
        assert.equal(post.id_user, DEMO_USER_ID);
        assert.equal(post.accepts_beginners, true);
        assert.equal(post.status, "OPEN");
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
