const MIN_SPOTS = 1;
const MAX_SPOTS = 16;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Builds URLSearchParams from a plain filter object, omitting empty values.
 *
 * @param {Object} filters - Key-value filter pairs.
 * @returns {URLSearchParams} Populated search parameters.
 */
function buildFilterParams(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (typeof value === "boolean") {
            if (value) {
                params.set(key, "true");
            }
            return;
        }
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed !== "") {
                params.set(key, trimmed);
            }
        }
    });
    return params;
}

/**
 * Fetches compatible players and available filter options for LFG matchmaking from the backend API.
 *
 * @param {Object} [filters] - Optional LFG player filter criteria.
 * @param {string} [filters.gameId] - Videogame UUID to filter by.
 * @param {string} [filters.platform] - Platform name to filter by.
 * @param {string} [filters.availability] - Gaming availability slot to filter by.
 * @param {string} [filters.style] - Preferred play style enum value.
 * @param {boolean} [filters.onlyAvailable] - When true, only return players actively looking to play.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<{players: Array<Object>, filters: {platforms: Array<string>, availabilities: Array<string>, styles: Array<string>}}>} Compatible players and filter options.
 */
export async function fetchLfgPlayers(filters = {}, options = {}) {
    const params = buildFilterParams({
        gameId: filters.gameId,
        platform: filters.platform,
        availability: filters.availability,
        style: filters.style,
        onlyAvailable: Boolean(filters.onlyAvailable),
    });

    const queryString = params.toString();
    const url = queryString === "" ? "/api/lfg/players" : `/api/lfg/players?${queryString}`;
    const response = await fetch(url, { signal: options.signal });

    if (!response.ok) {
        const error = new Error(`Failed to fetch LFG players (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const data = await response.json();
    const players = Array.isArray(data.players)
        ? data.players
        : Array.isArray(data)
            ? data
            : [];
    const responseFilters = data && typeof data.filters === "object" && data.filters !== null
        ? {
            platforms: Array.isArray(data.filters.platforms) ? data.filters.platforms : [],
            availabilities: Array.isArray(data.filters.availabilities) ? data.filters.availabilities : [],
            styles: Array.isArray(data.filters.styles) ? data.filters.styles : [],
        }
        : { platforms: [], availabilities: [], styles: [] };

    return { players, filters: responseFilters };
}

/**
 * Fetches active LFG recruitment posts from the backend API.
 *
 * @param {Object} [filters] - Optional LFG post filter criteria.
 * @param {string} [filters.gameId] - Videogame UUID to filter by.
 * @param {string} [filters.platform] - Platform name to filter by.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Array<Object>>} List of LFG post records.
 */
export async function fetchLfgPosts(filters = {}, options = {}) {
    const params = buildFilterParams({
        gameId: filters.gameId,
        platform: filters.platform,
    });

    const queryString = params.toString();
    const url = queryString === "" ? "/api/lfg/posts" : `/api/lfg/posts?${queryString}`;
    const response = await fetch(url, { signal: options.signal });

    if (!response.ok) {
        const error = new Error(`Failed to fetch LFG posts (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const data = await response.json();
    if (Array.isArray(data.posts)) {
        return data.posts;
    }
    return Array.isArray(data) ? data : [];
}

/**
 * Creates a new LFG recruitment post via the backend API.
 *
 * @param {Object} payload - LFG post payload.
 * @param {string} payload.videogameId - Target videogame UUID.
 * @param {string} payload.platform - Target gaming platform.
 * @param {number} payload.spotsAvailable - Number of open spots (1 to 16).
 * @param {string} payload.scheduledTime - Planned session schedule.
 * @param {string} payload.description - Recruitment description (10 to 500 chars).
 * @param {boolean} [payload.acceptsBeginners=true] - Whether beginners are welcome.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Object>} Created LFG post record.
 */
export async function createLfgPost(payload = {}, options = {}) {
    const videogameId = typeof payload.videogameId === "string" ? payload.videogameId.trim() : "";
    if (videogameId === "") {
        throw new Error("Videogame is required");
    }

    const platform = typeof payload.platform === "string" ? payload.platform.trim() : "";
    if (platform === "") {
        throw new Error("Platform is required");
    }

    const spotsAvailable = Number(payload.spotsAvailable);
    if (!Number.isInteger(spotsAvailable) || spotsAvailable < MIN_SPOTS || spotsAvailable > MAX_SPOTS) {
        throw new Error(`Spots available must be between ${MIN_SPOTS} and ${MAX_SPOTS}`);
    }

    const scheduledTime = typeof payload.scheduledTime === "string" ? payload.scheduledTime.trim() : "";
    if (scheduledTime === "") {
        throw new Error("Scheduled time is required");
    }

    const description = typeof payload.description === "string" ? payload.description.trim() : "";
    if (description.length < MIN_DESCRIPTION_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) {
        throw new Error(`Description must be between ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    const acceptsBeginners = payload.acceptsBeginners !== undefined ? Boolean(payload.acceptsBeginners) : true;

    const response = await fetch("/api/lfg/posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            videogameId,
            platform,
            spotsAvailable,
            scheduledTime,
            description,
            acceptsBeginners,
        }),
        signal: options.signal,
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const serverMessage = errorPayload?.error || errorPayload?.message;
        const error = new Error(serverMessage || `Failed to create LFG post (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const data = await response.json().catch(() => ({}));
    return data.post ?? data;
}
