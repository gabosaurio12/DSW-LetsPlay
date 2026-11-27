const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { createMessagesRepository } = require("../src/repositories/messagesRepository");

const SESSION_COOKIE = "letsplay_session=valid-token";
const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const PEER_ID = "22222222-2222-4222-8222-222222222222";
const HIDDEN_ID = "33333333-3333-4333-8333-333333333333";
const MESSAGE_ID = "44444444-4444-4444-8444-444444444444";
const SENT_AT = "2026-11-27T10:00:00.000Z";
const PEER = {
    id_user: PEER_ID,
    username: "ana_play",
    display_name: "Ana Ruiz",
    profile_photo_url: null,
    is_private: false
};
const MESSAGE = {
    id_message: MESSAGE_ID,
    id_sender: VIEWER_ID,
    id_recipient: PEER_ID,
    content: "Hola",
    sent_at: SENT_AT
};

function createMockAuthRepository() {
    return {
        async findActiveSessionUser(tokenHash) {
            return tokenHash ? { id_user: VIEWER_ID, username: "viewer" } : null;
        }
    };
}

function createMockMessagesRepository(overrides = {}) {
    return {
        async findVisiblePeer(peerId) {
            return peerId === HIDDEN_ID ? null : PEER;
        },
        async sendMessage() {
            return overrides.sendResult || { status: "sent", message: MESSAGE };
        },
        async listConversations() {
            return [{ id_conversation: "c1", ...PEER, last_content: "Hola" }];
        },
        async countConversations() {
            return 1;
        },
        async listThreadMessages() {
            return [MESSAGE];
        },
        async countThreadMessages() {
            return 1;
        }
    };
}

function createMockRealtime() {
    const calls = [];
    return {
        calls,
        publishToUsers(userIds, payload) {
            calls.push({ userIds, payload });
        }
    };
}

async function withMessagesServer(messagesRepository, realtime, callback) {
    const app = createApp({
        videogameRepository: { async findPublicVideogames() { return []; } },
        authRepository: createMockAuthRepository(),
        messagesRepository,
        messageHub: realtime
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

function request(baseUrl, path, options = {}) {
    return fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            Cookie: SESSION_COOKIE,
            "Content-Type": "application/json",
            ...options.headers
        }
    });
}

function postMessage(baseUrl, body) {
    return request(baseUrl, "/api/messages", {
        method: "POST",
        body: JSON.stringify(body)
    });
}

describe("messagesRouter", () => {
    it("should return 401 when the request has no session cookie", async () => {
        await withMessagesServer(createMockMessagesRepository(), createMockRealtime(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/messages/conversations`);
            assert.equal(response.status, 401);
        });
    });

    it("should return 400 when the conversation pagination is invalid", async () => {
        await withMessagesServer(createMockMessagesRepository(), createMockRealtime(), async (baseUrl) => {
            const response = await request(baseUrl, "/api/messages/conversations?limit=abc");
            assert.equal(response.status, 400);
        });
    });

    it("should return 200 with the visible conversations and total", async () => {
        await withMessagesServer(createMockMessagesRepository(), createMockRealtime(), async (baseUrl) => {
            const response = await request(baseUrl, "/api/messages/conversations");
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.equal(body.total, 1);
            assert.equal(body.conversations[0].username, "ana_play");
        });
    });

    it("should return 404 for a thread whose peer is hidden by a block", async () => {
        await withMessagesServer(createMockMessagesRepository(), createMockRealtime(), async (baseUrl) => {
            const response = await request(baseUrl, `/api/messages/users/${HIDDEN_ID}`);
            assert.equal(response.status, 404);
        });
    });

    it("should return 200 with the peer and the messages when the thread is visible", async () => {
        await withMessagesServer(createMockMessagesRepository(), createMockRealtime(), async (baseUrl) => {
            const response = await request(baseUrl, `/api/messages/users/${PEER_ID}`);
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.equal(body.peer.id_user, PEER_ID);
            assert.deepEqual(body.messages, [MESSAGE]);
        });
    });

    it("should return 400 when the recipient id is not a uuid", async () => {
        await withMessagesServer(createMockMessagesRepository(), createMockRealtime(), async (baseUrl) => {
            const response = await postMessage(baseUrl, { recipientId: "ana", content: "Hola" });
            assert.equal(response.status, 400);
        });
    });

    it("should return 400 when the content is blank", async () => {
        await withMessagesServer(createMockMessagesRepository(), createMockRealtime(), async (baseUrl) => {
            const response = await postMessage(baseUrl, { recipientId: PEER_ID, content: "   " });
            assert.equal(response.status, 400);
        });
    });

    it("should return 400 when the content exceeds 300 words", async () => {
        const content = Array.from({ length: 301 }, () => "juego").join(" ");
        await withMessagesServer(createMockMessagesRepository(), createMockRealtime(), async (baseUrl) => {
            const response = await postMessage(baseUrl, { recipientId: PEER_ID, content });
            assert.equal(response.status, 400);
        });
    });

    it("should return 400 when the sender targets their own account", async () => {
        await withMessagesServer(createMockMessagesRepository(), createMockRealtime(), async (baseUrl) => {
            const response = await postMessage(baseUrl, { recipientId: VIEWER_ID, content: "Hola" });
            assert.equal(response.status, 400);
        });
    });

    it("should return 201 with the stored message when the send succeeds", async () => {
        await withMessagesServer(createMockMessagesRepository(), createMockRealtime(), async (baseUrl) => {
            const response = await postMessage(baseUrl, { recipientId: PEER_ID, content: " Hola " });
            const body = await response.json();
            assert.equal(response.status, 201);
            assert.deepEqual(body, { message: MESSAGE });
        });
    });

    it("should publish the message to both participants when the send succeeds", async () => {
        const realtime = createMockRealtime();
        await withMessagesServer(createMockMessagesRepository(), realtime, async (baseUrl) => {
            await postMessage(baseUrl, { recipientId: PEER_ID, content: "Hola" });
            assert.deepEqual(realtime.calls[0].userIds, [VIEWER_ID, PEER_ID]);
        });
    });

    it("should return 403 when the send needs a mutual follow that does not exist", async () => {
        const repository = createMockMessagesRepository({
            sendResult: { status: "follow_required" }
        });
        await withMessagesServer(repository, createMockRealtime(), async (baseUrl) => {
            const response = await postMessage(baseUrl, { recipientId: PEER_ID, content: "Hola" });
            assert.equal(response.status, 403);
        });
    });

    it("should return 404 when the recipient is unavailable for messages", async () => {
        const repository = createMockMessagesRepository({
            sendResult: { status: "unavailable" }
        });
        await withMessagesServer(repository, createMockRealtime(), async (baseUrl) => {
            const response = await postMessage(baseUrl, { recipientId: PEER_ID, content: "Hola" });
            assert.equal(response.status, 404);
        });
    });
});

function createFakeMessagePrisma(overrides = {}) {
    const prisma = {
        user: {
            async findUnique() {
                return { is_private: false, account_status: "ACTIVE" };
            }
        },
        blocks: {
            async findFirst() {
                return null;
            }
        },
        follows: {
            async findUnique() {
                return null;
            }
        },
        conversation: {
            async upsert() {
                return { id_conversation: "conversation-id" };
            }
        },
        message: {
            async create(args) {
                return { id_message: args.data.id_message, content: args.data.content };
            }
        },
        async $queryRaw() {
            return [];
        }
    };

    for (const [model, methods] of Object.entries(overrides)) {
        if (model === "$queryRaw") {
            prisma.$queryRaw = methods;
        } else {
            prisma[model] = { ...prisma[model], ...methods };
        }
    }
    prisma.$transaction = async (work) => work(prisma);
    return prisma;
}

describe("messagesRepository", () => {
    it("should require mutual follow when the recipient account is private", async () => {
        const prisma = createFakeMessagePrisma({
            user: {
                async findUnique({ where }) {
                    if (where.id_user === PEER_ID) {
                        return { is_private: true, account_status: "ACTIVE" };
                    }
                    return { is_private: false, account_status: "ACTIVE" };
                }
            },
            conversation: {
                async upsert() {
                    assert.fail("no conversation must be created without mutual follow");
                }
            }
        });

        const result = await createMessagesRepository(prisma).sendMessage(VIEWER_ID, PEER_ID, "hola");

        assert.deepEqual(result, { status: "follow_required" });
    });

    it("should reject sends to a blocked recipient", async () => {
        const prisma = createFakeMessagePrisma({
            blocks: {
                async findFirst() {
                    return { id_blocker: PEER_ID };
                }
            },
            message: {
                async create() {
                    assert.fail("no message must be stored when the recipient is blocked");
                }
            }
        });

        const result = await createMessagesRepository(prisma).sendMessage(VIEWER_ID, PEER_ID, "hola");

        assert.deepEqual(result, { status: "unavailable" });
    });

    it("should store the message in the ordered pair conversation when the send is allowed", async () => {
        const upserts = [];
        const messages = [];
        const prisma = createFakeMessagePrisma({
            conversation: {
                async upsert(args) {
                    upserts.push(args);
                    return { id_conversation: "conversation-id" };
                }
            },
            message: {
                async create(args) {
                    messages.push(args);
                    return { id_message: args.data.id_message, content: args.data.content };
                }
            }
        });

        const result = await createMessagesRepository(prisma).sendMessage(VIEWER_ID, PEER_ID, "hola");

        assert.equal(result.status, "sent");
        assert.equal(result.message.content, "hola");
        assert.deepEqual(upserts[0].where, {
            id_user_1_id_user_2: { id_user_1: VIEWER_ID, id_user_2: PEER_ID }
        });
        assert.equal(messages[0].data.id_conversation, "conversation-id");
        assert.equal(messages[0].data.id_sender, VIEWER_ID);
        assert.equal(messages[0].data.id_recipient, PEER_ID);
    });

    it("should read thread messages with the ordered pair and return them oldest first", async () => {
        const queries = [];
        const newer = { id_message: "m2", sent_at: new Date("2026-01-02T00:00:00.000Z") };
        const older = { id_message: "m1", sent_at: new Date("2026-01-01T00:00:00.000Z") };
        const prisma = createFakeMessagePrisma({
            message: {
                async findMany(args) {
                    queries.push(args);
                    return [newer, older];
                }
            }
        });

        const messages = await createMessagesRepository(prisma).listThreadMessages(PEER_ID, VIEWER_ID, 2, 0);

        assert.deepEqual(messages, [older, newer]);
        assert.deepEqual(queries[0].where, {
            Conversation: { id_user_1: VIEWER_ID, id_user_2: PEER_ID }
        });
        assert.deepEqual(queries[0].orderBy, [{ sent_at: "desc" }, { id_message: "desc" }]);
    });

    it("should list conversations with the peer and sort them by the latest message", async () => {
        const older = {
            id_conversation: "c-old",
            id_user_1: VIEWER_ID,
            User_Conversation_id_user_1ToUser: { id_user: VIEWER_ID, username: "viewer" },
            User_Conversation_id_user_2ToUser: { id_user: PEER_ID, username: "peer" },
            Message: [{ id_sender: VIEWER_ID, content: "old", sent_at: new Date("2026-01-01T00:00:00.000Z") }]
        };
        const newer = {
            id_conversation: "c-new",
            id_user_1: "00000000-0000-4000-8000-000000000009",
            User_Conversation_id_user_1ToUser: { id_user: "00000000-0000-4000-8000-000000000009", username: "third" },
            User_Conversation_id_user_2ToUser: { id_user: VIEWER_ID, username: "viewer" },
            Message: [{ id_sender: "00000000-0000-4000-8000-000000000009", content: "new", sent_at: new Date("2026-01-03T00:00:00.000Z") }]
        };
        const prisma = createFakeMessagePrisma({
            conversation: {
                async findMany() {
                    return [older, newer];
                }
            }
        });

        const inbox = await createMessagesRepository(prisma).listConversations(VIEWER_ID, 20, 0);

        assert.deepEqual(inbox.map((entry) => entry.id_conversation), ["c-new", "c-old"]);
        assert.equal(inbox[0].username, "third");
        assert.equal(inbox[0].last_content, "new");
        assert.equal(inbox[1].username, "peer");
    });
});
