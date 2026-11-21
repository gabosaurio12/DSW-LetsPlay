/**
 * Fetches the public catalog of approved videogames from the backend API.
 *
 * @param {Object} [filters] - Optional catalog filter criteria.
 * @param {string} [filters.genre] - Exact genre to filter by.
 * @param {string} [filters.platform] - Exact platform to filter by.
 * @param {string} [filters.search] - Text query matching name or description.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Array<Object>>} List of public videogame records.
 */
export async function fetchVideogames(filters = {}, options = {}) {
    const params = new URLSearchParams();
    const trimmedGenre = typeof filters.genre === "string" ? filters.genre.trim() : "";
    const trimmedPlatform = typeof filters.platform === "string" ? filters.platform.trim() : "";
    const trimmedSearch = typeof filters.search === "string" ? filters.search.trim() : "";

    if (trimmedGenre !== "") {
        params.set("genre", trimmedGenre);
    }
    if (trimmedPlatform !== "") {
        params.set("platform", trimmedPlatform);
    }
    if (trimmedSearch !== "") {
        params.set("search", trimmedSearch);
    }

    const queryString = params.toString();
    const url = queryString === "" ? "/api/videogames" : `/api/videogames?${queryString}`;
    const response = await fetch(url, { signal: options.signal });

    if (!response.ok) {
        throw new Error(`Failed to fetch videogames (${response.status})`);
    }

    const data = await response.json();
    return Array.isArray(data.videogames) ? data.videogames : [];
}

/**
 * Fetches distinct genres and platforms available in the public videogame catalog.
 *
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<{genres: Array<string>, platforms: Array<string>}>} Available filter options.
 */
export async function fetchVideogameFilters(options = {}) {
    const response = await fetch("/api/videogames/filters", { signal: options.signal });

    if (!response.ok) {
        throw new Error(`Failed to fetch videogame filters (${response.status})`);
    }

    const data = await response.json();
    return {
        genres: Array.isArray(data.genres) ? data.genres : [],
        platforms: Array.isArray(data.platforms) ? data.platforms : [],
    };
}

/**
 * Fetches a single public videogame by its identifier from the backend API.
 *
 * @param {string} id - Videogame UUID.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Object|null>} Public videogame record, or null if missing.
 */
export async function fetchVideogameById(id, options = {}) {
    const normalizedId = typeof id === "string" ? id.trim() : String(id ?? "").trim();
    if (normalizedId === "") {
        throw new Error("Videogame id is required");
    }

    const response = await fetch(`/api/videogames/${encodeURIComponent(normalizedId)}`, {
        signal: options.signal,
    });

    if (!response.ok) {
        const error = new Error(`Failed to fetch videogame (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const data = await response.json();
    return data.videogame ?? null;
}

/**
 * Fetches public communities related to a specific videogame from the backend API.
 *
 * @param {string} id - Videogame UUID.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Array<Object>>} List of related public community records.
 */
export async function fetchVideogameCommunities(id, options = {}) {
    const normalizedId = typeof id === "string" ? id.trim() : String(id ?? "").trim();
    if (normalizedId === "") {
        throw new Error("Videogame id is required");
    }

    const response = await fetch(`/api/videogames/${encodeURIComponent(normalizedId)}/communities`, {
        signal: options.signal,
    });

    if (!response.ok) {
        const error = new Error(`Failed to fetch videogame communities (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const payload = await response.json();
    return Array.isArray(payload.communities) ? payload.communities : [];
}

/**
 * Fetches public posts related to a specific videogame from the backend API.
 *
 * @param {string} id - Videogame UUID.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Array<Object>>} List of public post records.
 */
export async function fetchVideogamePosts(id, options = {}) {
    const normalizedId = typeof id === "string" ? id.trim() : String(id ?? "").trim();
    if (normalizedId === "") {
        throw new Error("Videogame id is required");
    }

    const response = await fetch(`/api/videogames/${encodeURIComponent(normalizedId)}/posts`, {
        signal: options.signal,
    });

    if (!response.ok) {
        const error = new Error(`Failed to fetch videogame posts (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const payload = await response.json();
    return Array.isArray(payload.posts) ? payload.posts : [];
}

export const ALLOWED_POST_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Validates and uploads a post image file to the backend API.
 *
 * @param {File} file - Image file selected or dropped by the user.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<string>} Public or relative image URL returned by the backend.
 */
export async function uploadPostImage(file, options = {}) {
    if (!file || typeof file.type !== "string" || typeof file.size !== "number") {
        const error = new Error("A valid image file is required");
        error.code = "INVALID_FILE";
        throw error;
    }

    if (!ALLOWED_POST_IMAGE_TYPES.includes(file.type)) {
        const error = new Error("Only PNG, JPEG, WEBP, or GIF images are allowed");
        error.code = "INVALID_IMAGE_TYPE";
        throw error;
    }

    if (file.size <= 0 || file.size > MAX_POST_IMAGE_BYTES) {
        const error = new Error("Image file size must be 5 MB or less");
        error.code = "IMAGE_TOO_LARGE";
        throw error;
    }

    const response = await fetch("/api/uploads/image", {
        method: "POST",
        headers: {
            "Content-Type": file.type,
        },
        body: file,
        signal: options.signal,
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const serverMessage = errorPayload?.error || errorPayload?.message;
        const error = new Error(serverMessage || `Failed to upload post image (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const data = await response.json();
    if (!data || typeof data.imageUrl !== "string" || data.imageUrl.trim() === "") {
        throw new Error("Upload response did not include an imageUrl");
    }

    return data.imageUrl;
}

/**
 * Creates a new public post associated with a specific videogame via the backend API.
 *
 * @param {string} id - Videogame UUID.
 * @param {Object} payload - Post creation payload.
 * @param {string} payload.content - Post body text (up to 2000 characters).
 * @param {string|null} [payload.imageUrl] - Optional image URL attached to the post.
 * @param {boolean} [payload.isSpoiler=false] - Whether the post contains spoilers.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Object>} Created post record from the API.
 */
export async function createVideogamePost(id, payload = {}, options = {}) {
    const normalizedId = typeof id === "string" ? id.trim() : String(id ?? "").trim();
    if (normalizedId === "") {
        throw new Error("Videogame id is required");
    }

    const trimmedContent = typeof payload.content === "string" ? payload.content.trim() : "";
    if (trimmedContent === "") {
        throw new Error("Post content is required");
    }

    const trimmedImageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
    const response = await fetch(`/api/videogames/${encodeURIComponent(normalizedId)}/posts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            content: trimmedContent,
            imageUrl: trimmedImageUrl === "" ? null : trimmedImageUrl,
            isSpoiler: Boolean(payload.isSpoiler),
        }),
        signal: options.signal,
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const serverMessage = errorPayload?.error || errorPayload?.message;
        const error = new Error(serverMessage || `Failed to create videogame post (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const data = await response.json();
    return data.post ?? data;
}

/**
 * Fetches active comments for a specific post from the backend API.
 *
 * @param {string} postId - Post UUID.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Array<Object>>} List of post comment records.
 */
export async function fetchPostComments(postId, options = {}) {
    const normalizedPostId = typeof postId === "string" ? postId.trim() : String(postId ?? "").trim();
    if (normalizedPostId === "") {
        throw new Error("Post id is required");
    }

    const response = await fetch(`/api/videogames/posts/${encodeURIComponent(normalizedPostId)}/comments`, {
        signal: options.signal,
    });

    if (!response.ok) {
        const error = new Error(`Failed to fetch post comments (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const payload = await response.json();
    return Array.isArray(payload.comments) ? payload.comments : [];
}
