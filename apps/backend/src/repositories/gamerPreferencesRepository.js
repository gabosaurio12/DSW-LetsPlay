const crypto = require("node:crypto");

const FIND_GAMER_PREFERENCES_SQL = `
SELECT "favorite_genres", "active_platforms", "availability"
FROM "GamerPreference"
WHERE "id_user" = $1
`;

const UPSERT_GAMER_PREFERENCES_SQL = `
INSERT INTO "GamerPreference" ("id_preference", "id_user", "favorite_genres", "active_platforms", "availability")
VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb)
ON CONFLICT ("id_user") DO UPDATE SET
    "favorite_genres" = EXCLUDED."favorite_genres",
    "active_platforms" = EXCLUDED."active_platforms",
    "availability" = EXCLUDED."availability"
RETURNING "favorite_genres", "active_platforms", "availability"
`;

/**
 * Creates the gamer preferences repository. It owns the SQL for GamerPreference.
 *
 * @param {import("pg").Pool} pool - PostgreSQL connection pool.
 * @returns {{ findGamerPreferencesByUserId: Function, upsertGamerPreferences: Function }}
 * Gamer preference repository operations.
 */
function createGamerPreferencesRepository(pool) {
    async function findGamerPreferencesByUserId(userId) {
        const result = await pool.query(FIND_GAMER_PREFERENCES_SQL, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Replaces the three survey lists of an account. Preferred style and the
     * looking-to-play flag are left untouched.
     *
     * @param {string} userId - Account that owns the preferences.
     * @param {{ favoriteGenres: string[], activePlatforms: string[], availability: string[] }} preferences - Stored labels.
     * @returns {Promise<object>} The stored row.
     */
    async function upsertGamerPreferences(userId, preferences) {
        const result = await pool.query(UPSERT_GAMER_PREFERENCES_SQL, [
            crypto.randomUUID(),
            userId,
            JSON.stringify(preferences.favoriteGenres),
            JSON.stringify(preferences.activePlatforms),
            JSON.stringify(preferences.availability)
        ]);
        return result.rows[0];
    }

    return {
        findGamerPreferencesByUserId,
        upsertGamerPreferences
    };
}

module.exports = {
    createGamerPreferencesRepository
};
