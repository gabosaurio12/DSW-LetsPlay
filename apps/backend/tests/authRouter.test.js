const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { hashSessionToken } = require("../src/auth/sessionToken");
const { hashPassword, isPasswordWithinBcryptLimit } = require("../src/auth/passwordHasher");
const { createAuthRepository } = require("../src/repositories/authRepository");

const VALID_PASSWORD = "correct-horse-battery";
const SESSION_COOKIE_PREFIX = "letsplay_session=";
const LOGIN_LIMIT_ATTEMPTS = 10;
const VALID_REGISTRATION = {
    username: "new_player",
    email: "new@example.com",
    birthDate: "1999-05-20",
    gender: "FEMALE",
    password: VALID_PASSWORD
};

function createMemoryAuthRepository(accounts = []) {
    const storedAccounts = [...accounts];
    const sessions = new Map();

    return {
        storedAccounts,
        async findAccountByLogin(identifier) {
            const normalized = identifier.toLowerCase();
            return storedAccounts.find((account) =>
                account.username.toLowerCase() === normalized || account.email === normalized
            ) || null;
        },
        async findConflictingAccount(username, email) {
            return storedAccounts.find((account) =>
                account.username.toLowerCase() === username.toLowerCase() || account.email === email
            ) || null;
        },
        async createAccountWithSession(account, session) {
            const row = {
                id_user: "44444444-4444-4444-8444-444444444444",
                username: account.username,
                email: account.email,
                birth_date: account.birthDate,
                gender: account.gender,
                password_hash: account.passwordHash,
                account_status: "ACTIVE"
            };
            storedAccounts.push(row);
            sessions.set(session.tokenHash, { userId: row.id_user, expiresAt: session.expiresAt });
            return row;
        },
        async createSession(userId, session) {
            sessions.set(session.tokenHash, { userId, expiresAt: session.expiresAt });
        },
        async findActiveSessionUser(tokenHash) {
            const session = sessions.get(tokenHash);
            if (!session || session.expiresAt <= new Date()) {
                return null;
            }
            return storedAccounts.find((account) => account.id_user === session.userId) || null;
        },
        async deleteSession(tokenHash) {
            sessions.delete(tokenHash);
        }
    };
}

async function createActiveAccount(overrides = {}) {
    return {
        id_user: "33333333-3333-4333-8333-333333333333",
        username: "seth_play",
        email: "seth@example.com",
        birth_date: "2000-01-01",
        gender: "MALE",
        password_hash: await hashPassword(VALID_PASSWORD),
        account_status: "ACTIVE",
        ...overrides
    };
}

async function withAuthServer(authRepository, callback) {
    const app = createApp({
        videogameRepository: { async findPublicVideogames() { return []; } },
        authRepository
    });
    const server = await new Promise((resolve) => {
        const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    try {
        await callback(baseUrl);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    }
}

function postJson(baseUrl, path, body, headers = {}) {
    return fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body)
    });
}

function readSessionCookie(response) {
    const header = response.headers.get("set-cookie") || "";
    return header.split(";")[0];
}

describe("authRouter registration", () => {
    it("should return 201 with an HttpOnly session cookie and no password when registration is valid", async () => {
        await withAuthServer(createMemoryAuthRepository(), async (baseUrl) => {
            const response = await postJson(baseUrl, "/api/auth/register", VALID_REGISTRATION);
            const body = await response.json();
            assert.equal(response.status, 201);
            assert.equal(body.user.username, "new_player");
            assert.equal(body.user.password_hash, undefined);
            assert.match(response.headers.get("set-cookie"), /HttpOnly/);
        });
    });

    it("should store a bcrypt hash instead of the raw password when registration is valid", async () => {
        const authRepository = createMemoryAuthRepository();
        await withAuthServer(authRepository, async (baseUrl) => {
            await postJson(baseUrl, "/api/auth/register", VALID_REGISTRATION);
            const [stored] = authRepository.storedAccounts;
            assert.match(stored.password_hash, /^\$2[aby]\$12\$/);
            assert.notEqual(stored.password_hash, VALID_PASSWORD);
        });
    });

    it("should return 400 when the username contains characters outside letters, digits and underscores", async () => {
        await withAuthServer(createMemoryAuthRepository(), async (baseUrl) => {
            const response = await postJson(baseUrl, "/api/auth/register", {
                ...VALID_REGISTRATION,
                username: "bad name"
            });
            const body = await response.json();
            assert.equal(response.status, 400);
            assert.equal(body.errorKey, "invalidRegistration");
        });
    });

    it("should return 400 when the gender is not one of the stored values", async () => {
        await withAuthServer(createMemoryAuthRepository(), async (baseUrl) => {
            const response = await postJson(baseUrl, "/api/auth/register", {
                ...VALID_REGISTRATION,
                gender: "male"
            });
            assert.equal(response.status, 400);
        });
    });

    it("should return 400 when the password exceeds the 72-byte bcrypt limit", async () => {
        await withAuthServer(createMemoryAuthRepository(), async (baseUrl) => {
            const response = await postJson(baseUrl, "/api/auth/register", {
                ...VALID_REGISTRATION,
                password: "ñ".repeat(37)
            });
            assert.equal(response.status, 400);
        });
    });

    it("should return 409 when the username already exists in another letter case", async () => {
        const authRepository = createMemoryAuthRepository([await createActiveAccount()]);
        await withAuthServer(authRepository, async (baseUrl) => {
            const response = await postJson(baseUrl, "/api/auth/register", {
                ...VALID_REGISTRATION,
                username: "SETH_PLAY",
                email: "other@example.com"
            });
            const body = await response.json();
            assert.equal(response.status, 409);
            assert.equal(body.errorKey, "userExists");
        });
    });
});

describe("authRouter login", () => {
    it("should return 200 with a session cookie when the email and password are valid", async () => {
        await withAuthServer(createMemoryAuthRepository([await createActiveAccount()]), async (baseUrl) => {
            const response = await postJson(baseUrl, "/api/auth/login", {
                identifier: "SETH@example.com",
                password: VALID_PASSWORD
            });
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.equal(body.user.username, "seth_play");
            assert.match(readSessionCookie(response), new RegExp(`^${SESSION_COOKIE_PREFIX}`));
        });
    });

    it("should return 401 with invalidCredentials when the password is wrong", async () => {
        await withAuthServer(createMemoryAuthRepository([await createActiveAccount()]), async (baseUrl) => {
            const response = await postJson(baseUrl, "/api/auth/login", {
                identifier: "seth_play",
                password: "wrong-password"
            });
            const body = await response.json();
            assert.equal(response.status, 401);
            assert.equal(body.errorKey, "invalidCredentials");
        });
    });

    it("should return the same 401 response when the identifier does not exist", async () => {
        await withAuthServer(createMemoryAuthRepository(), async (baseUrl) => {
            const response = await postJson(baseUrl, "/api/auth/login", {
                identifier: "nobody",
                password: VALID_PASSWORD
            });
            const body = await response.json();
            assert.equal(response.status, 401);
            assert.equal(body.errorKey, "invalidCredentials");
        });
    });

    it("should return 401 when the account is deleted even with the right password", async () => {
        const deleted = await createActiveAccount({ account_status: "DELETED" });
        await withAuthServer(createMemoryAuthRepository([deleted]), async (baseUrl) => {
            const response = await postJson(baseUrl, "/api/auth/login", {
                identifier: "seth_play",
                password: VALID_PASSWORD
            });
            assert.equal(response.status, 401);
        });
    });

    it("should return 429 when failed attempts for the identifier reach the limit", async () => {
        await withAuthServer(createMemoryAuthRepository([await createActiveAccount()]), async (baseUrl) => {
            let lastResponse = null;
            for (let attempt = 0; attempt <= LOGIN_LIMIT_ATTEMPTS; attempt += 1) {
                lastResponse = await postJson(baseUrl, "/api/auth/login", {
                    identifier: "seth_play",
                    password: "wrong-password"
                });
            }
            assert.equal(lastResponse.status, 429);
        });
    });
});

describe("authRouter session and logout", () => {
    it("should return 200 with the account when the session cookie is valid", async () => {
        await withAuthServer(createMemoryAuthRepository(), async (baseUrl) => {
            const registered = await postJson(baseUrl, "/api/auth/register", VALID_REGISTRATION);
            const response = await fetch(`${baseUrl}/api/auth/session`, {
                headers: { Cookie: readSessionCookie(registered) }
            });
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.equal(body.user.email, "new@example.com");
        });
    });

    it("should return 401 when the request has no session cookie", async () => {
        await withAuthServer(createMemoryAuthRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/auth/session`);
            assert.equal(response.status, 401);
        });
    });

    it("should return 401 when the session cookie does not match any stored session", async () => {
        await withAuthServer(createMemoryAuthRepository(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/auth/session`, {
                headers: { Cookie: `${SESSION_COOKIE_PREFIX}unknown-token` }
            });
            assert.equal(response.status, 401);
        });
    });

    it("should return 204, expire the cookie and invalidate the session when logging out", async () => {
        await withAuthServer(createMemoryAuthRepository(), async (baseUrl) => {
            const registered = await postJson(baseUrl, "/api/auth/register", VALID_REGISTRATION);
            const cookie = readSessionCookie(registered);
            const response = await fetch(`${baseUrl}/api/auth/logout`, {
                method: "POST",
                headers: { Cookie: cookie }
            });
            const afterLogout = await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: cookie } });
            assert.equal(response.status, 204);
            assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
            assert.equal(afterLogout.status, 401);
        });
    });

    it("should return 403 when a state-changing request comes from another origin", async () => {
        await withAuthServer(createMemoryAuthRepository(), async (baseUrl) => {
            const response = await postJson(baseUrl, "/api/auth/logout", {}, {
                Origin: "https://evil.example.com"
            });
            assert.equal(response.status, 403);
        });
    });
});

describe("passwordHasher and session token helpers", () => {
    it("should accept a password when it is exactly 72 bytes in UTF-8", () => {
        assert.equal(isPasswordWithinBcryptLimit("ñ".repeat(36)), true);
    });

    it("should reject a password when it is 73 bytes in UTF-8", () => {
        assert.equal(isPasswordWithinBcryptLimit("a".repeat(73)), false);
    });

    it("should store a session token hash that differs from the raw token", () => {
        assert.notEqual(hashSessionToken("raw-token"), "raw-token");
    });
});

describe("authRepository", () => {
    it("should match login identifiers literally when they contain LIKE wildcards", async () => {
        const queries = [];
        const prisma = {
            user: {
                async findFirst(args) {
                    queries.push(args);
                    return null;
                }
            }
        };

        const repository = createAuthRepository(prisma);
        const account = await repository.findAccountByLogin("j_hn%");

        assert.equal(account, null);
        assert.deepEqual(queries[0].where.OR[0].username, { equals: "j\\_hn\\%", mode: "insensitive" });
        assert.deepEqual(queries[0].where.OR[1].email, { equals: "j\\_hn\\%", mode: "insensitive" });
    });

    it("should return birth_date as YYYY-MM-DD when finding an account by login", async () => {
        const prisma = {
            user: {
                async findFirst() {
                    return {
                        id_user: "11111111-1111-4111-8111-111111111111",
                        username: "player_one",
                        email: "player@example.com",
                        birth_date: new Date("2000-05-17T00:00:00.000Z"),
                        gender: "UNDEFINED",
                        password_hash: "hash",
                        account_status: "ACTIVE"
                    };
                }
            }
        };

        const repository = createAuthRepository(prisma);
        const account = await repository.findAccountByLogin("player_one");

        assert.equal(account.birth_date, "2000-05-17");
        assert.equal(account.password_hash, "hash");
    });

    it("should return null when the session token is unknown or expired", async () => {
        const queries = [];
        const prisma = {
            activeSessions: {
                async findFirst(args) {
                    queries.push(args);
                    return null;
                }
            }
        };

        const repository = createAuthRepository(prisma);
        const user = await repository.findActiveSessionUser("unknown-hash");

        assert.equal(user, null);
        assert.equal(queries[0].where.token_hash, "unknown-hash");
        assert.deepEqual(queries[0].where.User, { account_status: "ACTIVE" });
        assert.ok(queries[0].where.expires_at.gt instanceof Date);
    });

    it("should create the account and its session in one transaction", async () => {
        const created = [];
        const prisma = {
            async $transaction(work) {
                return work(this);
            },
            user: {
                async create(args) {
                    created.push({ model: "user", args });
                    return {
                        id_user: args.data.id_user,
                        username: args.data.username,
                        email: args.data.email,
                        birth_date: new Date("2001-02-03T00:00:00.000Z"),
                        gender: args.data.gender
                    };
                }
            },
            activeSessions: {
                async create(args) {
                    created.push({ model: "session", args });
                    return args.data;
                }
            }
        };

        const repository = createAuthRepository(prisma);
        const account = await repository.createAccountWithSession(
            {
                username: "new_player",
                email: "new@example.com",
                birthDate: "2001-02-03",
                gender: "OTHER",
                passwordHash: "hash"
            },
            { tokenHash: "token-hash", expiresAt: new Date("2030-01-01T00:00:00.000Z") }
        );

        assert.equal(account.birth_date, "2001-02-03");
        assert.equal(created[0].model, "user");
        assert.equal(created[0].args.data.account_status, "ACTIVE");
        assert.equal(created[1].model, "session");
        assert.equal(created[1].args.data.id_user, account.id_user);
        assert.equal(created[1].args.data.token_hash, "token-hash");
    });
});
