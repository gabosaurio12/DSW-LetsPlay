const MAX_BATCH_IDS = 50;

/**
 * Reads an error payload from a failed follow request.
 *
 * @param {Response} response - Fetch response.
 * @returns {Promise<{status: number, message: string}>} Normalized error.
 */
async function toFollowError(response) {
    const fallback = `Follow request failed (${response.status})`;
    const payload = await response.json().catch(() => null);
    return {
        status: response.status,
        message: payload?.error || fallback
    };
}

/**
 * Requests the public profile of another account.
 *
 * @param {string} userId - Account uuid.
 * @param {{signal?: AbortSignal}} [options] - Optional fetch configuration.
 * @returns {Promise<{user: Object, isFollowing: boolean, counts: Object}>} Profile payload.
 * @throws {{status: number, message: string}} When the server rejects the request.
 */
export async function fetchUserProfile(userId, options = {}) {
    const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        signal: options.signal
    });
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Checks whether the signed-in account has blocked a profile.
 *
 * @param {string} userId - Account uuid.
 * @param {{signal?: AbortSignal}} [options] - Optional fetch configuration.
 * @returns {Promise<{isBlocked: boolean}>} Directed block state.
 */
export async function fetchBlockState(userId, options = {}) {
    const response = await fetch(
        `/api/users/${encodeURIComponent(userId)}/block-state`,
        { signal: options.signal }
    );
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Loads the signed-in account's privacy setting.
 *
 * @param {{signal?: AbortSignal}} [options] - Optional fetch configuration.
 * @returns {Promise<{isPrivate: boolean}>} Privacy setting.
 */
export async function fetchPrivacy(options = {}) {
    const response = await fetch("/api/me/privacy", { signal: options.signal });
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Updates the signed-in account's privacy setting.
 *
 * @param {boolean} isPrivate - Whether the account requires follow approval.
 * @returns {Promise<{isPrivate: boolean}>} Saved setting.
 */
export async function updatePrivacy(isPrivate) {
    const response = await fetch("/api/me/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrivate })
    });
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Loads pending follow requests received by the signed-in account.
 *
 * @param {{limit?: number, offset?: number, signal?: AbortSignal}} [options] - Pagination options.
 * @returns {Promise<{users: Array<Object>, total: number}>} Pending requests.
 */
export async function fetchFollowRequests(options = {}) {
    const params = new URLSearchParams();
    if (options.limit !== undefined) {
        params.set("limit", String(options.limit));
    }
    if (options.offset !== undefined) {
        params.set("offset", String(options.offset));
    }
    const query = params.toString();
    const response = await fetch(`/api/users/me/follow-requests${query ? `?${query}` : ""}`, {
        signal: options.signal
    });
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Accepts or rejects a pending follow request.
 *
 * @param {string} requesterId - Account that sent the request.
 * @param {"accept"|"reject"} action - Decision.
 * @returns {Promise<{action: string, resolved: boolean}>} Resolution result.
 */
export async function resolveFollowRequest(requesterId, action) {
    const response = await fetch(
        `/api/users/me/follow-requests/${encodeURIComponent(requesterId)}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action })
        }
    );
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Loads accounts blocked by the signed-in account.
 *
 * @param {{limit?: number, offset?: number, signal?: AbortSignal}} [options] - Pagination options.
 * @returns {Promise<{users: Array<Object>}>} Blocked accounts.
 */
export async function fetchBlockedUsers(options = {}) {
    const params = new URLSearchParams();
    if (options.limit !== undefined) {
        params.set("limit", String(options.limit));
    }
    if (options.offset !== undefined) {
        params.set("offset", String(options.offset));
    }
    const query = params.toString();
    const response = await fetch(`/api/me/blocks${query ? `?${query}` : ""}`, {
        signal: options.signal
    });
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Blocks another account.
 *
 * @param {string} userId - Account to block.
 * @returns {Promise<{isBlocked: boolean}>} Updated block state.
 */
export async function blockUser(userId) {
    const response = await fetch(`/api/users/${encodeURIComponent(userId)}/block`, {
        method: "PUT"
    });
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Removes a block created by the signed-in account.
 *
 * @param {string} userId - Previously blocked account.
 * @returns {Promise<{isBlocked: boolean}>} Updated block state.
 */
export async function unblockUser(userId) {
    const response = await fetch(`/api/me/blocks/${encodeURIComponent(userId)}`, {
        method: "DELETE"
    });
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Creates a follow relationship from the signed-in account.
 *
 * @param {string} userId - Account uuid to follow.
 * @param {{signal?: AbortSignal}} [options] - Optional fetch configuration.
 * @returns {Promise<{isFollowing: boolean}>} Follow state after the write.
 * @throws {{status: number, message: string}} When the server rejects the request.
 */
export async function followUser(userId, options = {}) {
    return changeFollow(userId, "PUT", options);
}

/**
 * Deletes the outgoing follow relationship of the signed-in account.
 *
 * @param {string} userId - Account uuid to stop following.
 * @param {{signal?: AbortSignal}} [options] - Optional fetch configuration.
 * @returns {Promise<{isFollowing: boolean}>} Follow state after the write.
 * @throws {{status: number, message: string}} When the server rejects the request.
 */
export async function unfollowUser(userId, options = {}) {
    return changeFollow(userId, "DELETE", options);
}

/**
 * Sends a follow state change.
 *
 * @param {string} userId - Account uuid.
 * @param {string} method - HTTP method.
 * @param {{signal?: AbortSignal}} options - Fetch configuration.
 * @returns {Promise<{isFollowing: boolean}>} Follow state after the write.
 */
async function changeFollow(userId, method, options) {
    const response = await fetch(`/api/users/${encodeURIComponent(userId)}/follow`, {
        method,
        signal: options.signal
    });
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Fetches one connections list in pages.
 *
 * @param {string} userId - Profile owner uuid.
 * @param {string} listType - Either "followers" or "following".
 * @param {{limit?: number, offset?: number, signal?: AbortSignal}} [options] - Pagination options.
 * @returns {Promise<{users: Array<Object>, limit: number, offset: number}>} Visible list page.
 * @throws {{status: number, message: string}} When the server rejects the request.
 */
export async function fetchFollowList(userId, listType, options = {}) {
    const params = new URLSearchParams();
    if (options.limit !== undefined) {
        params.set("limit", String(options.limit));
    }
    if (options.offset !== undefined) {
        params.set("offset", String(options.offset));
    }
    const query = params.toString();
    const path = `/api/users/${encodeURIComponent(userId)}/${listType}${query ? `?${query}` : ""}`;
    const response = await fetch(path, { signal: options.signal });
    if (!response.ok) {
        throw await toFollowError(response);
    }
    return response.json();
}

/**
 * Fetches the accounts followed by the signed-in account from a batch of ids.
 *
 * @param {Array<string>} userIds - Candidate account uuids.
 * @param {{signal?: AbortSignal}} [options] - Optional fetch configuration.
 * @returns {Promise<{followedIds: Set<string>, pendingIds: Set<string>}>} Current states.
 */
export async function fetchFollowedIds(userIds, options = {}) {
    const ids = userIds.filter((id) => typeof id === "string" && id !== "").slice(0, MAX_BATCH_IDS);
    if (ids.length === 0) {
        return { followedIds: new Set(), pendingIds: new Set() };
    }
    const response = await fetch(`/api/users/follow-states?ids=${ids.join(",")}`, {
        signal: options.signal
    });
    if (!response.ok) {
        throw await toFollowError(response);
    }
    const data = await response.json();
    return {
        followedIds: new Set(Array.isArray(data.followedIds) ? data.followedIds : []),
        pendingIds: new Set(Array.isArray(data.pendingIds) ? data.pendingIds : [])
    };
}

/**
 * Returns the initials shown in an avatar placeholder.
 *
 * @param {string} name - Display name or username.
 * @returns {string} One or two uppercase initials.
 */
export function getProfileInitials(name) {
    if (typeof name !== "string" || name.trim() === "") {
        return "?";
    }
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
