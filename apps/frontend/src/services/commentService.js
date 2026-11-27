/**
 * Normalizes and validates a post identifier before building API URLs.
 *
 * @param {string|number} postId - Post identifier.
 * @returns {string} Trimmed non-empty post identifier.
 */
function normalizePostId(postId) {
    const normalized = typeof postId === "string" ? postId.trim() : String(postId ?? "").trim();
    if (normalized === "") {
        throw new Error("Post id is required");
    }
    return normalized;
}

/**
 * Fetches comments for a specific post from the backend API.
 *
 * @param {string} postId - Post UUID.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Array<Object>>} List of post comment records.
 */
export async function fetchPostComments(postId, options = {}) {
    const normalizedPostId = normalizePostId(postId);
    const response = await fetch(`/api/posts/${encodeURIComponent(normalizedPostId)}/comments`, {
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

/**
 * Creates a new comment on a specific post via the backend API.
 *
 * @param {string} postId - Post UUID.
 * @param {Object} payload - Comment data to publish.
 * @param {string} payload.content - Comment body text.
 * @param {boolean} [payload.isSpoiler] - Whether the comment contains spoilers.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Object>} Newly created comment record.
 */
export async function createPostComment(postId, payload = {}, options = {}) {
    const normalizedPostId = normalizePostId(postId);
    const trimmedContent = typeof payload.content === "string" ? payload.content.trim() : "";
    if (trimmedContent === "") {
        throw new Error("Comment content is required");
    }

    const response = await fetch(`/api/posts/${encodeURIComponent(normalizedPostId)}/comments`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            content: trimmedContent,
            isSpoiler: Boolean(payload.isSpoiler),
        }),
        signal: options.signal,
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const serverMessage = errorPayload?.error || errorPayload?.message;
        const error = new Error(serverMessage || `Failed to create post comment (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const data = await response.json();
    return data.comment ?? data;
}
