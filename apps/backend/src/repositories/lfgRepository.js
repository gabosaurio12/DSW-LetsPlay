const crypto = require("node:crypto");
const { caseInsensitiveEquals } = require("../db/prisma");
const {
    buildVisibleAccountFilter,
    buildNotBlockedFilter
} = require("./visibilityFilters");

// Temporary demo user until authentication is implemented.
const DEMO_USER_ID = "10000000-0000-4000-8000-000000000001";
const PLAY_STYLES = ["CASUAL", "COMPETITIVE", "COOPERATIVE", "INDIFFERENT"];

const PREFERENCE_SELECT = {
    favorite_genres: true,
    active_platforms: true,
    availability: true,
    preferred_style: true,
    looking_to_play: true
};

const CANDIDATE_SELECT = {
    id_user: true,
    username: true,
    display_name: true,
    profile_photo_url: true,
    description: true,
    GamerPreference: { select: PREFERENCE_SELECT }
};

const LFG_POST_SELECT = {
    id_lfg: true,
    id_user: true,
    id_videogame: true,
    platform: true,
    spots_available: true,
    scheduled_time: true,
    description: true,
    accepts_beginners: true,
    status: true,
    created_at: true,
    User: { select: { username: true, display_name: true, profile_photo_url: true } },
    Videogames: { select: { name: true, cover_url: true } }
};

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

    if (gameScore === 0 && currentGameSet.size > 0) {
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
 * Converts a Prisma LFG post row into the public shape used by the API.
 *
 * @param {object} post - LFG post row selected with LFG_POST_SELECT.
 * @returns {object} LFG post with flattened author and videogame fields.
 */
function mapLfgPost(post) {
    return {
        id_lfg: post.id_lfg,
        id_user: post.id_user,
        id_videogame: post.id_videogame,
        platform: post.platform,
        spots_available: post.spots_available,
        scheduled_time: post.scheduled_time,
        description: post.description,
        accepts_beginners: post.accepts_beginners,
        status: post.status,
        created_at: post.created_at,
        author_username: post.User.username,
        author_display_name: post.User.display_name,
        author_profile_photo_url: post.User.profile_photo_url,
        videogame_name: post.Videogames.name,
        videogame_cover_url: post.Videogames.cover_url
    };
}

/**
 * Flattens a candidate row, whose preference may be missing, into one object.
 *
 * @param {{ GamerPreference: object|null }} candidate - Candidate row with its preference relation.
 * @returns {object} Candidate with preference fields at the top level.
 */
function flattenCandidate({ GamerPreference, ...user }) {
    return { ...user, ...(GamerPreference ?? {}) };
}

/**
 * Builds the preference filter for candidates. Accounts without a preference row
 * only match when no preference filter is requested.
 *
 * @param {{ onlyAvailable?: boolean, style?: string }} filters - Matchmaking filters.
 * @returns {object|null} Prisma GamerPreference filter, or null when none applies.
 */
function buildCandidatePreferenceFilter({ onlyAvailable, style }) {
    const conditions = {};
    if (onlyAvailable === true) {
        conditions.looking_to_play = true;
    }
    if (style) {
        conditions.preferred_style = style.toUpperCase();
    }
    return Object.keys(conditions).length > 0 ? conditions : null;
}

/**
 * Creates a reusable repository for LFG matchmaking players and posts.
 *
 * @param {import("@prisma/client").PrismaClient} prisma - Prisma client instance.
 * @returns {{
 *   findCompatiblePlayers: Function,
 *   findOpenLfgPosts: Function,
 *   createLfgPost: Function
 * }} LFG repository methods.
 */
function createLfgRepository(prisma) {
    /**
     * Lists the active games of an account that are public.
     *
     * @param {string} userId - Account uuid.
     * @returns {Promise<Array<{ id_videogame: string, name: string }>>} Owned public games.
     */
    async function findOwnPublicGames(userId) {
        const rows = await prisma.userVideogames.findMany({
            where: { id_user: userId, Videogames: { status: "ACTIVE" } },
            select: { id_videogame: true, Videogames: { select: { name: true } } }
        });
        return rows.map((row) => ({ id_videogame: row.id_videogame, name: row.Videogames.name }));
    }

    /**
     * Lists the public games of several accounts, grouped by account and ordered by name.
     *
     * @param {Array<string>} userIds - Account uuids.
     * @returns {Promise<Map<string, Array<{ id_videogame: string, name: string }>>>} Games by account.
     */
    async function findGamesByUser(userIds) {
        const rows = await prisma.userVideogames.findMany({
            where: { id_user: { in: userIds }, Videogames: { status: "ACTIVE" } },
            select: { id_user: true, id_videogame: true, Videogames: { select: { name: true } } },
            orderBy: { Videogames: { name: "asc" } }
        });

        return rows.reduce((gamesByUser, row) => {
            const games = gamesByUser.get(row.id_user) || [];
            games.push({ id_videogame: row.id_videogame, name: row.Videogames.name });
            return gamesByUser.set(row.id_user, games);
        }, new Map());
    }

    /**
     * Finds active, visible, non-blocked accounts that are candidates for matchmaking.
     *
     * @param {string} viewerId - Account that searches for players.
     * @param {{ onlyAvailable?: boolean, style?: string }} filters - Preference filters.
     * @returns {Promise<Array<object>>} Candidate profiles with preference fields.
     */
    async function findActiveCandidates(viewerId, filters) {
        const preferenceFilter = buildCandidatePreferenceFilter(filters);
        const candidates = await prisma.user.findMany({
            where: {
                account_status: "ACTIVE",
                id_user: { not: viewerId },
                ...buildVisibleAccountFilter(viewerId),
                ...buildNotBlockedFilter(viewerId),
                ...(preferenceFilter ? { GamerPreference: preferenceFilter } : {})
            },
            select: CANDIDATE_SELECT
        });
        return candidates.map(flattenCandidate);
    }

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

        const [currentPref, currentGames] = await Promise.all([
            prisma.gamerPreference.findUnique({
                where: { id_user: resolvedUserId },
                select: { active_platforms: true, availability: true }
            }),
            findOwnPublicGames(resolvedUserId)
        ]);

        const currentPlatforms = toStringArray(currentPref?.active_platforms);
        const currentAvailability = toStringArray(currentPref?.availability);
        const currentGameIds = toGameIdSet(currentGames);
        const currentPlatformSet = toNormalizedSet(currentPlatforms);
        const currentAvailabilitySet = toNormalizedSet(currentAvailability);

        const candidates = await findActiveCandidates(resolvedUserId, filters);

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

        const gamesByUser = candidates.length > 0
            ? await findGamesByUser(candidates.map((c) => c.id_user))
            : new Map();

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
            if (currentGames.length > 0 && sharedGames.length === 0) {
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
     * @param {{ gameId?: string, platform?: string, viewerId?: string }} [filters] - Optional filters.
     * @returns {Promise<Array<object>>} Open LFG posts ordered by newest first.
     */
    async function findOpenLfgPosts(filters = {}) {
        const viewerId = filters.viewerId || DEMO_USER_ID;
        const posts = await prisma.lfgPost.findMany({
            where: {
                status: "OPEN",
                User: { account_status: "ACTIVE", ...buildVisibleAccountFilter(viewerId) },
                Videogames: { status: "ACTIVE" },
                id_videogame: filters.gameId || undefined,
                platform: filters.platform ? caseInsensitiveEquals(filters.platform.trim()) : undefined
            },
            select: LFG_POST_SELECT,
            orderBy: { created_at: "desc" }
        });
        return posts.map(mapLfgPost);
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
        const videogame = await prisma.videogames.findFirst({
            where: { id_videogame: videogameId, status: "ACTIVE" },
            select: { id_videogame: true }
        });
        if (videogame === null) {
            return null;
        }

        // Replace DEMO_USER_ID with the authenticated user id once auth is implemented.
        const post = await prisma.lfgPost.create({
            data: {
                id_lfg: crypto.randomUUID(),
                id_user: userId || DEMO_USER_ID,
                id_videogame: videogameId,
                platform,
                spots_available: spotsAvailable,
                scheduled_time: scheduledTime,
                description,
                accepts_beginners: acceptsBeginners === undefined ? true : Boolean(acceptsBeginners),
                status: "OPEN"
            },
            select: LFG_POST_SELECT
        });
        return mapLfgPost(post);
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
