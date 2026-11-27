/**
 * Creates an in-memory limiter that blocks an identifier after too many failed logins
 * inside a time window.
 *
 * @param {{ maxAttempts: number, windowMs: number, now?: () => number }} options - Limiter settings.
 * @returns {{ isBlocked: (key: string) => boolean, registerFailure: (key: string) => void, reset: (key: string) => void }}
 * The limiter operations.
 */
function createLoginAttemptLimiter({ maxAttempts, windowMs, now = () => Date.now() }) {
    const failures = new Map();

    function isBlocked(key) {
        const entry = failures.get(key);
        if (!entry) {
            return false;
        }
        if (now() - entry.windowStart > windowMs) {
            failures.delete(key);
            return false;
        }
        return entry.count >= maxAttempts;
    }

    function registerFailure(key) {
        const entry = failures.get(key);
        if (!entry || now() - entry.windowStart > windowMs) {
            failures.set(key, { count: 1, windowStart: now() });
            return;
        }
        entry.count += 1;
    }

    function reset(key) {
        failures.delete(key);
    }

    return { isBlocked, registerFailure, reset };
}

module.exports = {
    createLoginAttemptLimiter
};
