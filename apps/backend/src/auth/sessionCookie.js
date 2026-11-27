const SESSION_COOKIE_NAME = "letsplay_session";
const SECONDS_PER_MS = 1000;

/**
 * Reads the session token from the Cookie request header.
 *
 * @param {string|undefined} cookieHeader - Raw value of the Cookie header.
 * @returns {string|null} The session token, or null when the cookie is absent.
 */
function readSessionToken(cookieHeader) {
    if (typeof cookieHeader !== "string") {
        return null;
    }
    const prefix = `${SESSION_COOKIE_NAME}=`;
    const entry = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));
    if (!entry) {
        return null;
    }
    const token = entry.slice(prefix.length);
    return token === "" ? null : token;
}

/**
 * Builds the Set-Cookie header value that stores the session in the browser.
 * The cookie is HttpOnly so scripts cannot read it.
 *
 * @param {string} token - Raw session token.
 * @param {number} maxAgeMs - Lifetime of the cookie in milliseconds.
 * @param {boolean} secure - Whether to mark the cookie as HTTPS-only.
 * @returns {string} The Set-Cookie header value.
 */
function buildSessionCookie(token, maxAgeMs, secure) {
    const maxAgeSeconds = Math.floor(maxAgeMs / SECONDS_PER_MS);
    return serializeCookie(`${SESSION_COOKIE_NAME}=${token}; Max-Age=${maxAgeSeconds}`, secure);
}

/**
 * Builds the Set-Cookie header value that removes the session cookie from the browser.
 *
 * @param {boolean} secure - Whether the original cookie was marked as HTTPS-only.
 * @returns {string} The Set-Cookie header value.
 */
function buildExpiredSessionCookie(secure) {
    return serializeCookie(`${SESSION_COOKIE_NAME}=; Max-Age=0`, secure);
}

/**
 * Appends the attributes shared by every session cookie.
 *
 * @param {string} nameAndValue - Cookie name, value and lifetime attributes.
 * @param {boolean} secure - Whether to append the Secure attribute.
 * @returns {string} The complete Set-Cookie header value.
 */
function serializeCookie(nameAndValue, secure) {
    const attributes = [nameAndValue, "Path=/", "HttpOnly", "SameSite=Lax"];
    if (secure) {
        attributes.push("Secure");
    }
    return attributes.join("; ");
}

module.exports = {
    SESSION_COOKIE_NAME,
    readSessionToken,
    buildSessionCookie,
    buildExpiredSessionCookie
};
