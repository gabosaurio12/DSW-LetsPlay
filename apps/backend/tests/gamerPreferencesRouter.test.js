const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

const SESSION_COOKIE = "letsplay_session=valid-token";
const ACCOUNT_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_ACCOUNT_ID = "55555555-5555-4555-8555-555555555555";

const VALID_SELECTION = {
    genres: ["rpg", "indie"],
    platforms: ["pc", "playstation"],
    availability: ["weekdayNights", "weekendMornings"]
};

const STORED_ROW = {
    favorite_genres: ["RPG", "Indie"],
    active_platforms: ["PC", "PlayStation 5"],
    availability: ["Weeknights (20:00-23:00)", "Weekends (10:00-14:00)"]
};

function createMockAuthRepository(userId = ACCOUNT_ID) {
    return {
        async findActiveSessionUser(tokenHash) {
            return tokenHash ? { id_user: userId, username: "seth_play" } : null;
        }
    };
}

function createMockGamerPreferencesRepository(row = null) {
    const calls = { upserts: [] };
    return {
        calls,
        async findGamerPreferencesByUserId(userId) {
            calls.lastFindUserId = userId;
            return row;
        },
        async upsertGamerPreferences(userId, preferences) {
            calls.upserts.push({ userId, preferences });
            return null;
        }
    };
}

async function withPreferencesServer(options, callback) {
    const app = createApp({
        videogameRepository: { async findPublicVideogames() { return []; } },
        authRepository: options.authRepository || createMockAuthRepository(),
        gamerPreferencesRepository: options.gamerPreferencesRepository
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

function putPreferences(baseUrl, body, cookie = SESSION_COOKIE) {
    return fetch(`${baseUrl}/api/me/gamer-preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify(body)
    });
}

describe("gamerPreferencesRouter read", () => {
    it("should return 401 when the request has no session cookie", async () => {
        await withPreferencesServer({
            gamerPreferencesRepository: createMockGamerPreferencesRepository()
        }, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/me/gamer-preferences`);
            assert.equal(response.status, 401);
        });
    });

    it("should return 200 with null preferences when the account has not answered the survey", async () => {
        await withPreferencesServer({
            gamerPreferencesRepository: createMockGamerPreferencesRepository(null)
        }, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/me/gamer-preferences`, {
                headers: { Cookie: SESSION_COOKIE }
            });
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.equal(body.preferences, null);
        });
    });

    it("should return survey ids when the stored labels match the catalogue", async () => {
        await withPreferencesServer({
            gamerPreferencesRepository: createMockGamerPreferencesRepository(STORED_ROW)
        }, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/me/gamer-preferences`, {
                headers: { Cookie: SESSION_COOKIE }
            });
            const body = await response.json();
            assert.deepEqual(body.preferences, {
                genres: ["rpg", "indie"],
                platforms: ["pc", "playstation"],
                availability: ["weekdayNights", "weekendMornings"]
            });
        });
    });

    it("should return null preferences when a stored group has no label the survey knows", async () => {
        const row = { ...STORED_ROW, active_platforms: ["Steam Deck"] };
        await withPreferencesServer({
            gamerPreferencesRepository: createMockGamerPreferencesRepository(row)
        }, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/me/gamer-preferences`, {
                headers: { Cookie: SESSION_COOKIE }
            });
            const body = await response.json();
            assert.equal(body.preferences, null);
        });
    });

    it("should query only the account of the session when reading preferences", async () => {
        const gamerPreferencesRepository = createMockGamerPreferencesRepository(null);
        await withPreferencesServer({
            authRepository: createMockAuthRepository(OTHER_ACCOUNT_ID),
            gamerPreferencesRepository
        }, async (baseUrl) => {
            await fetch(`${baseUrl}/api/me/gamer-preferences`, { headers: { Cookie: SESSION_COOKIE } });
            assert.equal(gamerPreferencesRepository.calls.lastFindUserId, OTHER_ACCOUNT_ID);
        });
    });
});

describe("gamerPreferencesRouter write", () => {
    it("should return 200 and store the labels when the selection follows RN-27", async () => {
        const gamerPreferencesRepository = createMockGamerPreferencesRepository();
        await withPreferencesServer({ gamerPreferencesRepository }, async (baseUrl) => {
            const response = await putPreferences(baseUrl, VALID_SELECTION);
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.deepEqual(body.preferences, VALID_SELECTION);
            assert.deepEqual(gamerPreferencesRepository.calls.upserts[0].preferences, {
                favoriteGenres: ["RPG", "Indie"],
                activePlatforms: ["PC", "PlayStation 5"],
                availability: ["Weeknights (20:00-23:00)", "Weekends (10:00-14:00)"]
            });
        });
    });

    it("should ignore any user id sent in the body and write to the session account", async () => {
        const gamerPreferencesRepository = createMockGamerPreferencesRepository();
        await withPreferencesServer({
            authRepository: createMockAuthRepository(ACCOUNT_ID),
            gamerPreferencesRepository
        }, async (baseUrl) => {
            await putPreferences(baseUrl, { ...VALID_SELECTION, userId: OTHER_ACCOUNT_ID });
            assert.equal(gamerPreferencesRepository.calls.upserts[0].userId, ACCOUNT_ID);
        });
    });

    it("should return 400 when no genre is selected", async () => {
        await withPreferencesServer({
            gamerPreferencesRepository: createMockGamerPreferencesRepository()
        }, async (baseUrl) => {
            const response = await putPreferences(baseUrl, { ...VALID_SELECTION, genres: [] });
            assert.equal(response.status, 400);
        });
    });

    it("should return 400 when more than five platforms are selected", async () => {
        await withPreferencesServer({
            gamerPreferencesRepository: createMockGamerPreferencesRepository()
        }, async (baseUrl) => {
            const platforms = ["pc", "xbox", "playstation", "nintendoSwitch", "mobile", "vr"];
            const response = await putPreferences(baseUrl, { ...VALID_SELECTION, platforms });
            assert.equal(response.status, 400);
        });
    });

    it("should return 400 when an unknown genre id is sent", async () => {
        await withPreferencesServer({
            gamerPreferencesRepository: createMockGamerPreferencesRepository()
        }, async (baseUrl) => {
            const response = await putPreferences(baseUrl, { ...VALID_SELECTION, genres: ["unknown"] });
            assert.equal(response.status, 400);
        });
    });

    it("should return 400 when duplicated platforms are sent", async () => {
        await withPreferencesServer({
            gamerPreferencesRepository: createMockGamerPreferencesRepository()
        }, async (baseUrl) => {
            const response = await putPreferences(baseUrl, { ...VALID_SELECTION, platforms: ["pc", "pc"] });
            assert.equal(response.status, 400);
        });
    });

    it("should return 400 when anyTime is combined with other availability options", async () => {
        await withPreferencesServer({
            gamerPreferencesRepository: createMockGamerPreferencesRepository()
        }, async (baseUrl) => {
            const availability = ["anyTime", "weekdayNights"];
            const response = await putPreferences(baseUrl, { ...VALID_SELECTION, availability });
            assert.equal(response.status, 400);
        });
    });

    it("should return 401 and store nothing when the request has no session cookie", async () => {
        const gamerPreferencesRepository = createMockGamerPreferencesRepository();
        await withPreferencesServer({ gamerPreferencesRepository }, async (baseUrl) => {
            const response = await putPreferences(baseUrl, VALID_SELECTION, "");
            assert.equal(response.status, 401);
            assert.equal(gamerPreferencesRepository.calls.upserts.length, 0);
        });
    });
});
