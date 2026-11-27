const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { WebSocket } = require("ws");
const { createApp, resolveAllowedOrigin } = require("../src/app");
const { createMessageHub } = require("../src/realtime/messageHub");
const { hashSessionToken } = require("../src/auth/sessionToken");

const VALID_TOKEN = "valid-token";
const SESSION_COOKIE = `letsplay_session=${VALID_TOKEN}`;
const ALLOWED_ORIGIN = resolveAllowedOrigin();
const PARTICIPANT_ID = "11111111-1111-4111-8111-111111111111";
const PEER_ID = "22222222-2222-4222-8222-222222222222";
const OUTSIDER_ID = "33333333-3333-4333-8333-333333333333";
const SOCKET_PATH = "/ws/messages";
const EVENT_TIMEOUT_MS = 2000;
const SILENCE_WINDOW_MS = 100;

function createMockAuthRepository() {
    const validHash = hashSessionToken(VALID_TOKEN);
    return {
        async findActiveSessionUser(tokenHash) {
            return tokenHash === validHash ? { id_user: PARTICIPANT_ID } : null;
        }
    };
}

async function withHubServer(callback) {
    const authRepository = createMockAuthRepository();
    const hub = createMessageHub({ authRepository, allowedOrigin: ALLOWED_ORIGIN });
    const app = createApp({
        videogameRepository: { async findPublicVideogames() { return []; } },
        authRepository,
        messagesRepository: {},
        messageHub: hub
    });
    const server = http.createServer(app);
    server.on("upgrade", hub.handleUpgrade);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `ws://127.0.0.1:${server.address().port}${SOCKET_PATH}`;

    try {
        await callback({ hub, url });
    } finally {
        await new Promise((resolve) => {
            server.closeAllConnections();
            server.close(resolve);
        });
    }
}

function connect(url, headers = {}) {
    return new WebSocket(url, { headers });
}

function waitForOpen(socket) {
    return new Promise((resolve, reject) => {
        socket.once("open", resolve);
        socket.once("error", reject);
    });
}

function waitForEvent(socket) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timed out")), EVENT_TIMEOUT_MS);
        socket.once("message", (data) => {
            clearTimeout(timer);
            resolve(JSON.parse(data.toString()));
        });
    });
}

function waitForRejection(socket) {
    return new Promise((resolve) => {
        socket.once("unexpected-response", (_request, response) => resolve(response.statusCode));
    });
}

describe("messageHub", () => {
    it("should reject the upgrade with 401 when the request has no session cookie", async () => {
        await withHubServer(async ({ url }) => {
            const socket = connect(url, { Origin: ALLOWED_ORIGIN });
            const statusCode = await waitForRejection(socket);
            assert.equal(statusCode, 401);
        });
    });

    it("should reject the upgrade with 403 when the origin is not the frontend origin", async () => {
        await withHubServer(async ({ url }) => {
            const socket = connect(url, { Cookie: SESSION_COOKIE, Origin: "https://evil.example" });
            const statusCode = await waitForRejection(socket);
            assert.equal(statusCode, 403);
        });
    });

    it("should push the event to the connected participant when a message is published", async () => {
        await withHubServer(async ({ hub, url }) => {
            const socket = connect(url, { Cookie: SESSION_COOKIE, Origin: ALLOWED_ORIGIN });
            await waitForOpen(socket);
            const event = waitForEvent(socket);
            hub.publishToUsers([PEER_ID, PARTICIPANT_ID], { type: "message.created", id: 1 });
            assert.deepEqual(await event, { type: "message.created", id: 1 });
            socket.close();
        });
    });

    it("should not push the event to accounts outside the conversation when a message is published", async () => {
        await withHubServer(async ({ hub, url }) => {
            const socket = connect(url, { Cookie: SESSION_COOKIE, Origin: ALLOWED_ORIGIN });
            await waitForOpen(socket);
            let received = false;
            socket.on("message", () => {
                received = true;
            });
            hub.publishToUsers([PEER_ID, OUTSIDER_ID], { type: "message.created", id: 2 });
            await new Promise((resolve) => setTimeout(resolve, SILENCE_WINDOW_MS));
            assert.equal(received, false);
            socket.close();
        });
    });
});
