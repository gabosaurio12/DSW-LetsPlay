const MESSAGES_API_PATH = "/api/messages";
const MESSAGE_SOCKET_PATH = "/ws/messages";

/**
 * Reads an error payload from a failed message request.
 *
 * @param {Response} response - Fetch response.
 * @returns {Promise<{status: number, message: string}>} Normalized error.
 */
async function toMessageError(response) {
    const payload = await response.json().catch(() => null);
    return {
        status: response.status,
        message: payload?.error || `Message request failed (${response.status})`
    };
}

/**
 * Builds a query string from optional pagination values.
 *
 * @param {{limit?: number, offset?: number}} [options] - Pagination options.
 * @returns {string} Query string including the leading "?" or an empty string.
 */
function buildPaginationQuery(options = {}) {
    const params = new URLSearchParams();
    if (options.limit !== undefined) {
        params.set("limit", String(options.limit));
    }
    if (options.offset !== undefined) {
        params.set("offset", String(options.offset));
    }
    const query = params.toString();
    return query ? `?${query}` : "";
}

/**
 * Loads the private conversations of the signed-in account, most recent first.
 *
 * @param {{limit?: number, offset?: number, signal?: AbortSignal}} [options] - Pagination options.
 * @returns {Promise<{conversations: Array<Object>, total: number}>} Conversation page.
 * @throws {{status: number, message: string}} When the server rejects the request.
 */
export async function fetchConversations(options = {}) {
    const response = await fetch(
        `${MESSAGES_API_PATH}/conversations${buildPaginationQuery(options)}`,
        { signal: options.signal }
    );
    if (!response.ok) {
        throw await toMessageError(response);
    }
    return response.json();
}

/**
 * Loads one page of the history with another account, oldest first within the page.
 *
 * @param {string} peerId - Account uuid of the other participant.
 * @param {{limit?: number, offset?: number, signal?: AbortSignal}} [options] - Pagination options.
 * @returns {Promise<{peer: Object, messages: Array<Object>, total: number}>} History page.
 * @throws {{status: number, message: string}} When the server rejects the request.
 */
export async function fetchThread(peerId, options = {}) {
    const path = `${MESSAGES_API_PATH}/users/${encodeURIComponent(peerId)}`;
    const response = await fetch(`${path}${buildPaginationQuery(options)}`, {
        signal: options.signal
    });
    if (!response.ok) {
        throw await toMessageError(response);
    }
    return response.json();
}

/**
 * Sends a text message to another account, creating the conversation if needed.
 *
 * @param {string} recipientId - Account uuid that receives the message.
 * @param {string} content - Message text, at most 300 words.
 * @returns {Promise<{message: Object}>} The stored message.
 * @throws {{status: number, message: string}} When the server rejects the request.
 */
export async function sendMessage(recipientId, content) {
    const response = await fetch(MESSAGES_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, content })
    });
    if (!response.ok) {
        throw await toMessageError(response);
    }
    return response.json();
}

/**
 * Builds the WebSocket URL of the message channel for the current origin.
 *
 * @returns {string} Absolute ws:// or wss:// URL.
 */
export function buildMessageSocketUrl() {
    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${window.location.host}${MESSAGE_SOCKET_PATH}`;
}
