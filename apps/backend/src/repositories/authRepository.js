const crypto = require("node:crypto");

const ACCOUNT_COLUMNS_SQL = `
u."id_user", u."username", u."email", u."birth_date"::text AS "birth_date", u."gender"
`;

const FIND_ACCOUNT_BY_LOGIN_SQL = `
SELECT ${ACCOUNT_COLUMNS_SQL}, u."password_hash", u."account_status"
FROM "User" u
WHERE lower(u."username") = lower($1)
   OR lower(u."email") = lower($1)
LIMIT 1
`;

const FIND_CONFLICTING_ACCOUNT_SQL = `
SELECT u."id_user"
FROM "User" u
WHERE lower(u."username") = lower($1)
   OR u."email" = $2
LIMIT 1
`;

const INSERT_ACCOUNT_SQL = `
INSERT INTO "User" ("id_user", "username", "email", "birth_date", "gender", "password_hash", "account_status")
VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
RETURNING "id_user", "username", "email", "birth_date"::text AS "birth_date", "gender"
`;

const INSERT_SESSION_SQL = `
INSERT INTO "ActiveSessions" ("token_hash", "id_user", "expires_at")
VALUES ($1, $2, $3)
`;

const FIND_ACTIVE_SESSION_USER_SQL = `
SELECT ${ACCOUNT_COLUMNS_SQL}
FROM "ActiveSessions" s
INNER JOIN "User" u ON u."id_user" = s."id_user"
WHERE s."token_hash" = $1
  AND s."expires_at" > now()
  AND u."account_status" = 'ACTIVE'
`;

const DELETE_SESSION_SQL = `
DELETE FROM "ActiveSessions"
WHERE "token_hash" = $1
`;

/**
 * Creates the auth repository. It owns every SQL statement used for accounts and sessions.
 *
 * @param {import("pg").Pool} pool - PostgreSQL connection pool.
 * @returns {{
 *   findAccountByLogin: Function,
 *   findConflictingAccount: Function,
 *   createAccountWithSession: Function,
 *   createSession: Function,
 *   findActiveSessionUser: Function,
 *   deleteSession: Function
 * }} Auth repository operations.
 */
function createAuthRepository(pool) {
    async function findAccountByLogin(identifier) {
        const result = await pool.query(FIND_ACCOUNT_BY_LOGIN_SQL, [identifier]);
        return result.rows[0] || null;
    }

    async function findConflictingAccount(username, email) {
        const result = await pool.query(FIND_CONFLICTING_ACCOUNT_SQL, [username, email]);
        return result.rows[0] || null;
    }

    async function createAccountWithSession(account, session) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const result = await client.query(INSERT_ACCOUNT_SQL, [
                crypto.randomUUID(),
                account.username,
                account.email,
                account.birthDate,
                account.gender,
                account.passwordHash
            ]);
            await client.query(INSERT_SESSION_SQL, [session.tokenHash, result.rows[0].id_user, session.expiresAt]);
            await client.query("COMMIT");
            return result.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async function createSession(userId, session) {
        await pool.query(INSERT_SESSION_SQL, [session.tokenHash, userId, session.expiresAt]);
    }

    async function findActiveSessionUser(tokenHash) {
        const result = await pool.query(FIND_ACTIVE_SESSION_USER_SQL, [tokenHash]);
        return result.rows[0] || null;
    }

    async function deleteSession(tokenHash) {
        await pool.query(DELETE_SESSION_SQL, [tokenHash]);
    }

    return {
        findAccountByLogin,
        findConflictingAccount,
        createAccountWithSession,
        createSession,
        findActiveSessionUser,
        deleteSession
    };
}

module.exports = {
    createAuthRepository
};
