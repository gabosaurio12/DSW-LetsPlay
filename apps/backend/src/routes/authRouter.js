const express = require("express");
const { parseRegistrationInput, parseLoginInput } = require("../auth/authValidation");
const { createLoginAttemptLimiter } = require("../auth/loginAttemptLimiter");
const {
    hashPassword,
    verifyPassword,
    getDummyPasswordHash
} = require("../auth/passwordHasher");
const { createRequireSession } = require("../auth/authMiddleware");
const {
    SESSION_TTL_MS,
    createSessionToken,
    hashSessionToken,
    getSessionExpiration
} = require("../auth/sessionToken");
const {
    readSessionToken,
    buildSessionCookie,
    buildExpiredSessionCookie
} = require("../auth/sessionCookie");

const UNIQUE_VIOLATION_CODE = "23505";
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/**
 * Maps a database account row to the public session user returned to the client.
 *
 * @param {{ id_user: string, username: string, email: string, birth_date: string, gender: string }} row - Account row.
 * @returns {{ id: string, username: string, email: string, birthDate: string, gender: string }} Session user.
 */
function toSessionUser(row) {
    return {
        id: row.id_user,
        username: row.username,
        email: row.email,
        birthDate: row.birth_date,
        gender: row.gender
    };
}

/**
 * Checks a login password. Unknown accounts are still hashed so the response time
 * does not reveal whether an identifier exists.
 *
 * @param {object|null} account - Account row, or null when the identifier is unknown.
 * @param {string} password - Password sent by the client.
 * @returns {Promise<boolean>} True when the account exists, is active and the password matches.
 */
async function matchesAccountPassword(account, password) {
    const passwordHash = account === null ? await getDummyPasswordHash() : account.password_hash;
    const passwordMatches = await verifyPassword(password, passwordHash);
    return account !== null && account.account_status === "ACTIVE" && passwordMatches;
}

/**
 * Creates the Express router for account registration, login, session and logout.
 *
 * @param {object} authRepository - Auth repository instance.
 * @param {{ secureCookies?: boolean, loginLimiter?: object }} [options] - Cookie and limiter settings.
 * @returns {import("express").Router} Configured Express router.
 */
function createAuthRouter(authRepository, options = {}) {
    const router = express.Router();
    const secureCookies = options.secureCookies === true;
    const loginLimiter = options.loginLimiter || createLoginAttemptLimiter({
        maxAttempts: LOGIN_MAX_ATTEMPTS,
        windowMs: LOGIN_WINDOW_MS
    });
    const requireSession = createRequireSession(authRepository);

    function setSessionCookie(res, token) {
        res.setHeader("Set-Cookie", buildSessionCookie(token, SESSION_TTL_MS, secureCookies));
    }

    async function startSession(res, userId) {
        const token = createSessionToken();
        await authRepository.createSession(userId, {
            tokenHash: hashSessionToken(token),
            expiresAt: getSessionExpiration()
        });
        setSessionCookie(res, token);
    }

    router.post("/register", async (req, res, next) => {
        try {
            const registration = parseRegistrationInput(req.body);
            if (registration === null) {
                res.status(400).json({ errorKey: "invalidRegistration" });
                return;
            }
            const conflict = await authRepository.findConflictingAccount(
                registration.username,
                registration.email
            );
            if (conflict !== null) {
                res.status(409).json({ errorKey: "userExists" });
                return;
            }
            const token = createSessionToken();
            const account = await authRepository.createAccountWithSession(
                {
                    username: registration.username,
                    email: registration.email,
                    birthDate: registration.birthDate,
                    gender: registration.gender,
                    passwordHash: await hashPassword(registration.password)
                },
                {
                    tokenHash: hashSessionToken(token),
                    expiresAt: getSessionExpiration()
                }
            );
            setSessionCookie(res, token);
            res.status(201).json({ user: toSessionUser(account) });
        } catch (error) {
            if (error.code === UNIQUE_VIOLATION_CODE) {
                res.status(409).json({ errorKey: "userExists" });
                return;
            }
            next(error);
        }
    });

    router.post("/login", async (req, res, next) => {
        try {
            const credentials = parseLoginInput(req.body);
            if (credentials === null) {
                res.status(401).json({ errorKey: "invalidCredentials" });
                return;
            }
            const limiterKey = credentials.identifier.toLowerCase();
            if (loginLimiter.isBlocked(limiterKey)) {
                res.status(429).json({ errorKey: "tooManyAttempts" });
                return;
            }
            const account = await authRepository.findAccountByLogin(credentials.identifier);
            const isMatch = await matchesAccountPassword(account, credentials.password);
            if (!isMatch) {
                loginLimiter.registerFailure(limiterKey);
                res.status(401).json({ errorKey: "invalidCredentials" });
                return;
            }
            loginLimiter.reset(limiterKey);
            await startSession(res, account.id_user);
            res.status(200).json({ user: toSessionUser(account) });
        } catch (error) {
            next(error);
        }
    });

    router.get("/session", requireSession, (req, res) => {
        res.status(200).json({ user: toSessionUser(req.currentUser) });
    });

    router.post("/logout", async (req, res, next) => {
        try {
            const token = readSessionToken(req.headers.cookie);
            if (token !== null) {
                await authRepository.deleteSession(hashSessionToken(token));
            }
            res.setHeader("Set-Cookie", buildExpiredSessionCookie(secureCookies));
            res.status(204).end();
        } catch (error) {
            next(error);
        }
    });

    return router;
}

module.exports = {
    createAuthRouter
};
