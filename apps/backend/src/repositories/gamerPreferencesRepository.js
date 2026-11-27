const crypto = require("node:crypto");

const PREFERENCE_LIST_SELECT = {
    favorite_genres: true,
    active_platforms: true,
    availability: true
};

/**
 * Creates the gamer preferences repository. It owns access to the GamerPreference table.
 *
 * @param {import("@prisma/client").PrismaClient} prisma - Prisma client instance.
 * @returns {{ findGamerPreferencesByUserId: Function, upsertGamerPreferences: Function }}
 * Gamer preference repository operations.
 */
function createGamerPreferencesRepository(prisma) {
    async function findGamerPreferencesByUserId(userId) {
        return prisma.gamerPreference.findUnique({
            where: { id_user: userId },
            select: PREFERENCE_LIST_SELECT
        });
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
        const lists = {
            favorite_genres: preferences.favoriteGenres,
            active_platforms: preferences.activePlatforms,
            availability: preferences.availability
        };

        return prisma.gamerPreference.upsert({
            where: { id_user: userId },
            create: {
                id_preference: crypto.randomUUID(),
                id_user: userId,
                ...lists
            },
            update: lists,
            select: PREFERENCE_LIST_SELECT
        });
    }

    return {
        findGamerPreferencesByUserId,
        upsertGamerPreferences
    };
}

module.exports = {
    createGamerPreferencesRepository
};
