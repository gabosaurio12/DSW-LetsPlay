const { readSessionToken } = require("./sessionCookie");
const { hashSessionToken } = require("./sessionToken");
const { canModerate } = require("./moderationPolicy");

const SAFE_HTTP_METHODS = ["GET", "HEAD", "OPTIONS"];

/**
 * Creates middleware that resolves the account of the session cookie into
 * req.currentUser and rejects requests without a valid, unexpired session.
 *
 * @param {{ findActiveSessionUser: Function }} authRepository - Auth repository instance.
 * @returns {import("express").RequestHandler} Express middleware.
 */
function createRequireSession(authRepository) {
    return async function requireSession(req, res, next) {
        try {
            const token = readSessionToken(req.headers.cookie);
            const user = token === null
                ? null
                : await authRepository.findActiveSessionUser(hashSessionToken(token));
            if (user === null) {
                res.status(401).json({ error: "Authentication required" });
                return;
            }
            req.currentUser = user;
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Creates middleware that requires a session whose account has moderation permission.
 *
 * @param {{ findActiveSessionUser: Function }} authRepository - Auth repository instance.
 * @returns {import("express").RequestHandler} Express middleware.
 */
function createRequireModerator(authRepository) {
    const requireSession = createRequireSession(authRepository);
    return function requireModerator(req, res, next) {
        requireSession(req, res, () => {
            if (!canModerate(req.currentUser)) {
                res.status(403).json({ error: "Moderation permission required" });
                return;
            }
            next();
        });
    };
}

/**
 * Creates middleware that rejects state-changing requests coming from another origin,
 * which blocks cross-site form posts against the session cookie.
 *
 * @param {string} allowedOrigin - Origin of the frontend application.
 * @returns {import("express").RequestHandler} Express middleware.
 */
function createOriginGuard(allowedOrigin) {
    return function originGuard(req, res, next) {
        const origin = req.headers.origin;
        if (SAFE_HTTP_METHODS.includes(req.method) || origin === undefined || origin === allowedOrigin) {
            next();
            return;
        }
        res.status(403).json({ error: "Origin not allowed" });
    };
}

module.exports = {
    createRequireSession,
    createRequireModerator,
    createOriginGuard
};
