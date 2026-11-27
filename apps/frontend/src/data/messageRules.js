export const MAX_MESSAGE_WORDS = 300;

export const LOAD_STATE = {
    IDLE: "idle",
    LOADING: "loading",
    READY: "ready",
    ERROR: "error"
};

export const SEND_STATE = {
    IDLE: "idle",
    SENDING: "sending",
    ERROR: "error"
};

/**
 * Counts the words of a message the same way the server validates them.
 *
 * @param {string} text - Raw message text.
 * @returns {number} Number of whitespace-separated words.
 */
export function countMessageWords(text) {
    const trimmed = text.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

/**
 * Validates a draft before it is sent.
 *
 * @param {string} text - Raw draft text.
 * @returns {"empty"|"tooLong"|null} Error category, or null when the draft is valid.
 */
export function validateMessageDraft(text) {
    const words = countMessageWords(text);
    if (words === 0) {
        return "empty";
    }
    return words > MAX_MESSAGE_WORDS ? "tooLong" : null;
}
