const crypto = require("node:crypto");

const SESSION_TOKEN_BYTES = 32;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generates a random, URL-safe session token. Only its hash is stored in the database.
 *
 * @returns {string} The raw token to send to the browser in the session cookie.
 */
function createSessionToken() {
    return crypto.randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

/**
 * Hashes a session token so a database leak does not expose usable sessions.
 *
 * @param {string} token - Raw session token received from the cookie.
 * @returns {string} The SHA-256 hex digest stored in ActiveSessions.token_hash.
 */
function hashSessionToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Calculates when a session created now must expire.
 *
 * @param {Date} [now=new Date()] - Creation instant.
 * @returns {Date} The expiration instant.
 */
function getSessionExpiration(now = new Date()) {
    return new Date(now.getTime() + SESSION_TTL_MS);
}

module.exports = {
    SESSION_TTL_MS,
    createSessionToken,
    hashSessionToken,
    getSessionExpiration
};
