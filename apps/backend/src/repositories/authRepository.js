const crypto = require("node:crypto");

const ACCOUNT_SELECT = {
    id_user: true,
    username: true,
    email: true,
    birth_date: true,
    gender: true
};

const LOGIN_ACCOUNT_SELECT = {
    ...ACCOUNT_SELECT,
    password_hash: true,
    account_status: true
};

const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;
const BIRTH_DATE_LENGTH = 10;

/**
 * Escapes LIKE wildcards so a case-insensitive equality compares the value literally.
 * Prisma compiles insensitive equality to ILIKE, where "_" would match any character.
 *
 * @param {string} value - Raw identifier sent by the client.
 * @returns {{ equals: string, mode: "insensitive" }} Prisma string filter.
 */
function caseInsensitiveEquals(value) {
    return {
        equals: value.replace(LIKE_SPECIAL_CHARACTERS, "\\$&"),
        mode: "insensitive"
    };
}

/**
 * Converts a Prisma account row into the shape used by the auth routes, with birth_date as YYYY-MM-DD.
 *
 * @param {object|null} account - Account row selected with ACCOUNT_SELECT or LOGIN_ACCOUNT_SELECT.
 * @returns {object|null} Account with a string birth_date, or null when there is no account.
 */
function mapAccount(account) {
    if (!account) {
        return null;
    }

    return {
        ...account,
        birth_date: account.birth_date.toISOString().slice(0, BIRTH_DATE_LENGTH)
    };
}

/**
 * Creates the auth repository. It owns every query used for accounts and sessions.
 *
 * @param {import("@prisma/client").PrismaClient} prisma - Prisma client instance.
 * @returns {{
 *   findAccountByLogin: Function,
 *   findConflictingAccount: Function,
 *   createAccountWithSession: Function,
 *   createSession: Function,
 *   findActiveSessionUser: Function,
 *   deleteSession: Function
 * }} Auth repository operations.
 */
function createAuthRepository(prisma) {
    async function findAccountByLogin(identifier) {
        const account = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: caseInsensitiveEquals(identifier) },
                    { email: caseInsensitiveEquals(identifier) }
                ]
            },
            select: LOGIN_ACCOUNT_SELECT
        });
        return mapAccount(account);
    }

    async function findConflictingAccount(username, email) {
        return prisma.user.findFirst({
            where: {
                OR: [{ username: caseInsensitiveEquals(username) }, { email }]
            },
            select: { id_user: true }
        });
    }

    /**
     * Creates an account and its first session in one transaction.
     *
     * @param {{ username: string, email: string, birthDate: string, gender: string, passwordHash: string }} account - Account data.
     * @param {{ tokenHash: string, expiresAt: Date }} session - Session data.
     * @returns {Promise<object>} The created account row.
     */
    async function createAccountWithSession(account, session) {
        return prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    id_user: crypto.randomUUID(),
                    username: account.username,
                    email: account.email,
                    birth_date: new Date(account.birthDate),
                    gender: account.gender,
                    password_hash: account.passwordHash,
                    account_status: "ACTIVE"
                },
                select: ACCOUNT_SELECT
            });
            await tx.activeSessions.create({
                data: {
                    token_hash: session.tokenHash,
                    id_user: user.id_user,
                    expires_at: session.expiresAt
                }
            });
            return mapAccount(user);
        });
    }

    async function createSession(userId, session) {
        await prisma.activeSessions.create({
            data: {
                token_hash: session.tokenHash,
                id_user: userId,
                expires_at: session.expiresAt
            }
        });
    }

    async function findActiveSessionUser(tokenHash) {
        const session = await prisma.activeSessions.findFirst({
            where: {
                token_hash: tokenHash,
                expires_at: { gt: new Date() },
                User: { account_status: "ACTIVE" }
            },
            select: { User: { select: ACCOUNT_SELECT } }
        });
        return mapAccount(session?.User ?? null);
    }

    async function deleteSession(tokenHash) {
        await prisma.activeSessions.deleteMany({ where: { token_hash: tokenHash } });
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
