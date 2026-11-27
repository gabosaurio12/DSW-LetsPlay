const crypto = require("crypto");

// Temporary demo user until authentication is implemented.
const DEMO_USER_ID = "10000000-0000-4000-8000-000000000001";
const PLAY_STYLES = ["CASUAL", "COMPETITIVE", "COOPERATIVE", "INDIFFERENT"];

const FIND_CURRENT_USER_PREF_SQL = `
SELECT "active_platforms", "availability", "preferred_style", "looking_to_play"
FROM "GamerPreference"
WHERE "id_user" = $1
`;

const FIND_USER_GAMES_SQL = `
SELECT uv."id_videogame", vg."name"
FROM "UserVideogames" uv
INNER JOIN "v_public_videogame" vg ON vg."id_videogame" = uv."id_videogame"
WHERE uv."id_user" = $1
`;

const FIND_ACTIVE_CANDIDATES_SQL = `
SELECT u."id_user", u."username", u."display_name", u."profile_photo_url",
       u."description", gp."favorite_genres", gp."active_platforms", gp."availability",
       gp."preferred_style", gp."looking_to_play"
FROM "User" u
LEFT JOIN "GamerPreference" gp ON gp."id_user" = u."id_user"
WHERE u."account_status" = 'ACTIVE'
  AND u."id_user" <> $1
  AND NOT EXISTS (
      SELECT 1
      FROM "Blocks" b
      WHERE (b."id_blocker" = $1 AND b."id_blocked" = u."id_user")
         OR (b."id_blocker" = u."id_user" AND b."id_blocked" = $1)
  )
`;

const FIND_CANDIDATES_GAMES_SQL = `
SELECT uv."id_user", uv."id_videogame", vg."name"
FROM "UserVideogames" uv
INNER JOIN "v_public_videogame" vg ON vg."id_videogame" = uv."id_videogame"
WHERE uv."id_user" = ANY($1::uuid[])
ORDER BY vg."name" ASC
`;

const FIND_OPEN_LFG_POSTS_BASE_SQL = `
SELECT lp."id_lfg", lp."id_user", lp."id_videogame", lp."platform",
       lp."spots_available", lp."scheduled_time", lp."description",
       lp."accepts_beginners", lp."status", lp."created_at",
       u."username" AS "author_username",
       u."display_name" AS "author_display_name",
       u."profile_photo_url" AS "author_profile_photo_url",
       vg."name" AS "videogame_name",
       vg."cover_url" AS "videogame_cover_url"
FROM "LfgPost" lp
INNER JOIN "User" u ON u."id_user" = lp."id_user"
INNER JOIN "v_public_videogame" vg ON vg."id_videogame" = lp."id_videogame"
WHERE lp."status" = 'OPEN'
  AND u."account_status" = 'ACTIVE'
`;

const FIND_ACTIVE_VIDEOGAME_SQL = `
SELECT "id_videogame"
FROM "v_public_videogame"
WHERE "id_videogame" = $1
`;

const INSERT_LFG_POST_SQL = `
WITH inserted AS (
    INSERT INTO "LfgPost" (
        "id_lfg", "id_user", "id_videogame", "platform",
        "spots_available", "scheduled_time", "description",
        "accepts_beginners", "status"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN')
    RETURNING "id_lfg", "id_user", "id_videogame", "platform",
              "spots_available", "scheduled_time", "description",
              "accepts_beginners", "status", "created_at"
)
SELECT ins."id_lfg", ins."id_user", ins."id_videogame", ins."platform",
       ins."spots_available", ins."scheduled_time", ins."description",
       ins."accepts_beginners", ins."status", ins."created_at",
       u."username" AS "author_username",
       u."display_name" AS "author_display_name",
       u."profile_photo_url" AS "author_profile_photo_url",
       vg."name" AS "videogame_name",
       vg."cover_url" AS "videogame_cover_url"
FROM inserted ins
INNER JOIN "User" u ON u."id_user" = ins."id_user"
INNER JOIN "v_public_videogame" vg ON vg."id_videogame" = ins."id_videogame"
`;

/**
 * Normalizes a list of game IDs or game objects into a Set of string IDs.
 *
 * @param {Array<string|{ id_videogame: string }>} games - Games list.
 * @returns {Set<string>} Normalized set of game IDs.
 */
function toGameIdSet(games) {
    if (!Array.isArray(games)) {
        return new Set();
    }

    const ids = new Set();
    for (const item of games) {
        if (typeof item === "string" && item.trim()) {
            ids.add(item.trim().toLowerCase());
        } else if (item && typeof item.id_videogame === "string" && item.id_videogame.trim()) {
            ids.add(item.id_videogame.trim().toLowerCase());
        }
    }

    return ids;
}

/**
 * Normalizes a list of string values into a lowercase Set.
 *
 * @param {Array<string>} values - Raw string list.
 * @returns {Set<string>} Normalized lowercase Set.
 */
function toNormalizedSet(values) {
    if (!Array.isArray(values)) {
        return new Set();
    }

    const normalized = new Set();
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            normalized.add(value.trim().toLowerCase());
        }
    }

    return normalized;
}

/**
 * Computes deterministic LFG compatibility score (0..100) using RN-28 weights:
 * 50% shared games (or selected game match), 30% common platforms, 20% common availability.
 *
 * @param {{
 *   currentGames?: Array<string|{ id_videogame: string }>,
 *   currentPlatforms?: Array<string>,
 *   currentAvailability?: Array<string>,
 *   targetGames?: Array<string|{ id_videogame: string }>,
 *   targetPlatforms?: Array<string>,
 *   targetAvailability?: Array<string>,
 *   selectedGameId?: string
 * }} params - Compatibility calculation inputs.
 * @returns {number} Compatibility percentage between 0 and 100.
 */
function calculateCompatibilityScore({
    currentGames = [],
    currentPlatforms = [],
    currentAvailability = [],
    targetGames = [],
    targetPlatforms = [],
    targetAvailability = [],
    selectedGameId
}) {
    const currentGameSet = toGameIdSet(currentGames);
    const targetGameSet = toGameIdSet(targetGames);
    const currentPlatformSet = toNormalizedSet(currentPlatforms);
    const targetPlatformSet = toNormalizedSet(targetPlatforms);
    const currentAvailabilitySet = toNormalizedSet(currentAvailability);
    const targetAvailabilitySet = toNormalizedSet(targetAvailability);

    let gameScore = 0;
    if (typeof selectedGameId === "string" && selectedGameId.trim()) {
        if (targetGameSet.has(selectedGameId.trim().toLowerCase())) {
            gameScore = 50;
        }
    } else if (currentGameSet.size > 0) {
        let sharedGamesCount = 0;
        for (const gameId of currentGameSet) {
            if (targetGameSet.has(gameId)) {
                sharedGamesCount += 1;
            }
        }
        gameScore = (sharedGamesCount / currentGameSet.size) * 50;
    }

    if (gameScore === 0) {
        return 0;
    }

    let platformScore = 0;
    if (currentPlatformSet.size > 0) {
        let sharedPlatformsCount = 0;
        for (const platform of currentPlatformSet) {
            if (targetPlatformSet.has(platform)) {
                sharedPlatformsCount += 1;
            }
        }
        platformScore = (sharedPlatformsCount / currentPlatformSet.size) * 30;
    }

    let availabilityScore = 0;
    if (currentAvailabilitySet.size > 0) {
        for (const slot of currentAvailabilitySet) {
            if (targetAvailabilitySet.has(slot)) {
                availabilityScore = 20;
                break;
            }
        }
    }

    return Math.min(100, Math.round(gameScore + platformScore + availabilityScore));
}

/**
 * Safely parses a JSONB array field into an array of strings.
 *
 * @param {unknown} value - Raw JSONB column value.
 * @returns {Array<string>} Array of strings.
 */
function toStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}

/**
 * Creates a reusable repository for LFG matchmaking players and posts.
 *
 * @param {import("pg").Pool} pool - PostgreSQL pool instance.
 * @returns {{
 *   findCompatiblePlayers: Function,
 *   findOpenLfgPosts: Function,
 *   createLfgPost: Function
 * }} LFG repository methods.
 */
function createLfgRepository(pool) {
    /**
     * Finds compatible active, non-blocked players sorted by compatibility score.
     *
     * @param {{
     *   userId?: string,
     *   gameId?: string,
     *   platform?: string,
     *   availability?: string,
     *   style?: string,
     *   onlyAvailable?: boolean
     * }} [filters] - Matchmaking filter options.
     * @returns {Promise<{
     *   players: Array<object>,
     *   filters: { platforms: Array<string>, availabilities: Array<string>, styles: Array<string> }
     * }>} Compatible players and available filter options.
     */
    async function findCompatiblePlayers(filters = {}) {
        const resolvedUserId = filters.userId || DEMO_USER_ID;

        const [currentPrefResult, currentGamesResult] = await Promise.all([
            pool.query(FIND_CURRENT_USER_PREF_SQL, [resolvedUserId]),
            pool.query(FIND_USER_GAMES_SQL, [resolvedUserId])
        ]);

        const currentPref = currentPrefResult.rows[0] || {};
        const currentPlatforms = toStringArray(currentPref.active_platforms);
        const currentAvailability = toStringArray(currentPref.availability);
        const currentGames = currentGamesResult.rows || [];
        const currentGameIds = toGameIdSet(currentGames);
        const currentPlatformSet = toNormalizedSet(currentPlatforms);
        const currentAvailabilitySet = toNormalizedSet(currentAvailability);

        const candidateConditions = [];
        const candidateParams = [resolvedUserId];

        if (filters.onlyAvailable === true) {
            candidateConditions.push(`gp."looking_to_play" = true`);
        }

        if (filters.style) {
            candidateParams.push(filters.style.toUpperCase());
            candidateConditions.push(`gp."preferred_style" = $${candidateParams.length}`);
        }

        const candidateSql = candidateConditions.length > 0
            ? `${FIND_ACTIVE_CANDIDATES_SQL}  AND ${candidateConditions.join("\n  AND ")}\n`
            : FIND_ACTIVE_CANDIDATES_SQL;

        const candidatesResult = await pool.query(candidateSql, candidateParams);
        const candidates = candidatesResult.rows || [];

        const platformOptions = new Set();
        const availabilityOptions = new Set();

        for (const candidate of candidates) {
            for (const p of toStringArray(candidate.active_platforms)) {
                platformOptions.add(p);
            }
            for (const a of toStringArray(candidate.availability)) {
                availabilityOptions.add(a);
            }
        }

        let gamesByUser = new Map();
        if (candidates.length > 0) {
            const candidateIds = candidates.map((c) => c.id_user);
            const candidateGamesResult = await pool.query(FIND_CANDIDATES_GAMES_SQL, [candidateIds]);
            gamesByUser = new Map();
            for (const row of candidateGamesResult.rows || []) {
                if (!gamesByUser.has(row.id_user)) {
                    gamesByUser.set(row.id_user, []);
                }
                gamesByUser.get(row.id_user).push({
                    id_videogame: row.id_videogame,
                    name: row.name
                });
            }
        }

        const normalizedPlatformFilter = filters.platform ? filters.platform.trim().toLowerCase() : null;
        const normalizedAvailabilityFilter = filters.availability ? filters.availability.trim().toLowerCase() : null;
        const normalizedGameFilter = filters.gameId ? filters.gameId.trim().toLowerCase() : null;

        const players = [];
        for (const candidate of candidates) {
            const targetGames = gamesByUser.get(candidate.id_user) || [];
            const targetPlatforms = toStringArray(candidate.active_platforms);
            const targetAvailability = toStringArray(candidate.availability);

            if (normalizedGameFilter && !targetGames.some((g) => g.id_videogame.toLowerCase() === normalizedGameFilter)) {
                continue;
            }

            if (normalizedPlatformFilter && !targetPlatforms.some((p) => p.toLowerCase() === normalizedPlatformFilter)) {
                continue;
            }

            if (normalizedAvailabilityFilter && !targetAvailability.some((a) => a.toLowerCase() === normalizedAvailabilityFilter)) {
                continue;
            }

            const sharedGames = targetGames.filter((g) => currentGameIds.has(g.id_videogame.toLowerCase()));
            if (sharedGames.length === 0) {
                continue;
            }

            const matchPercentage = calculateCompatibilityScore({
                currentGames,
                currentPlatforms,
                currentAvailability,
                targetGames,
                targetPlatforms,
                targetAvailability,
                selectedGameId: filters.gameId
            });

            const sharedPlatforms = targetPlatforms.filter((p) => currentPlatformSet.has(p.trim().toLowerCase()));
            const sharedAvailability = targetAvailability.filter((a) => currentAvailabilitySet.has(a.trim().toLowerCase()));

            players.push({
                id_user: candidate.id_user,
                username: candidate.username,
                display_name: candidate.display_name,
                profile_photo_url: candidate.profile_photo_url,
                description: candidate.description || null,
                favorite_genres: toStringArray(candidate.favorite_genres),
                active_platforms: targetPlatforms,
                availability: targetAvailability,
                preferred_style: candidate.preferred_style || "INDIFFERENT",
                looking_to_play: Boolean(candidate.looking_to_play),
                games: targetGames,
                shared_games: sharedGames,
                shared_platforms: sharedPlatforms,
                shared_availability: sharedAvailability,
                match_percentage: matchPercentage
            });
        }

        players.sort((a, b) => {
            if (b.match_percentage !== a.match_percentage) {
                return b.match_percentage - a.match_percentage;
            }

            const nameA = (a.display_name || a.username || "").toLowerCase();
            const nameB = (b.display_name || b.username || "").toLowerCase();
            return nameA.localeCompare(nameB);
        });

        return {
            players,
            filters: {
                platforms: Array.from(platformOptions).sort((a, b) => a.localeCompare(b)),
                availabilities: Array.from(availabilityOptions).sort((a, b) => a.localeCompare(b)),
                styles: [...PLAY_STYLES]
            }
        };
    }

    /**
     * Finds open LFG posts with author and videogame metadata.
     *
     * @param {{ gameId?: string, platform?: string }} [filters] - Optional post filters.
     * @returns {Promise<Array<object>>} Open LFG posts ordered by newest first.
     */
    async function findOpenLfgPosts(filters = {}) {
        const conditions = [];
        const params = [];

        if (filters.gameId) {
            params.push(filters.gameId);
            conditions.push(`lp."id_videogame" = $${params.length}`);
        }

        if (filters.platform) {
            params.push(filters.platform.trim());
            conditions.push(`LOWER(lp."platform") = LOWER($${params.length})`);
        }

        const whereExtension = conditions.length > 0 ? `  AND ${conditions.join("\n  AND ")}\n` : "";
        const sql = `${FIND_OPEN_LFG_POSTS_BASE_SQL}${whereExtension}ORDER BY lp."created_at" DESC`;

        const result = await pool.query(sql, params);
        return result.rows;
    }

    /**
     * Creates a new open LFG post for an active videogame.
     *
     * @param {{
     *   userId?: string,
     *   videogameId: string,
     *   platform: string,
     *   spotsAvailable: number,
     *   scheduledTime: string,
     *   description: string,
     *   acceptsBeginners?: boolean
     * }} params - LFG post creation payload.
     * @returns {Promise<object|null>} Created LFG post or null if the videogame is not found/active.
     */
    async function createLfgPost({
        userId,
        videogameId,
        platform,
        spotsAvailable,
        scheduledTime,
        description,
        acceptsBeginners
    }) {
        const gameResult = await pool.query(FIND_ACTIVE_VIDEOGAME_SQL, [videogameId]);
        if (gameResult.rows.length === 0) {
            return null;
        }

        const lfgId = crypto.randomUUID();
        // Replace DEMO_USER_ID with the authenticated user id once auth is implemented.
        const resolvedUserId = userId || DEMO_USER_ID;
        const acceptsBeginnersFlag = acceptsBeginners === undefined ? true : Boolean(acceptsBeginners);

        const result = await pool.query(INSERT_LFG_POST_SQL, [
            lfgId,
            resolvedUserId,
            videogameId,
            platform,
            spotsAvailable,
            scheduledTime,
            description,
            acceptsBeginnersFlag
        ]);

        return result.rows[0] || null;
    }

    return {
        findCompatiblePlayers,
        findOpenLfgPosts,
        createLfgPost
    };
}

module.exports = {
    DEMO_USER_ID,
    PLAY_STYLES,
    calculateCompatibilityScore,
    createLfgRepository
};
