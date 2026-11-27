const { WebSocket, WebSocketServer } = require("ws");
const { readSessionToken } = require("../auth/sessionCookie");
const { hashSessionToken } = require("../auth/sessionToken");

const MESSAGE_SOCKET_PATH = "/ws/messages";

/**
 * Writes a minimal HTTP rejection on a socket that is still upgrading.
 *
 * @param {import("net").Socket} socket - Raw socket of the upgrade request.
 * @param {number} statusCode - HTTP status to report.
 * @param {string} statusText - Reason phrase sent with the status.
 */
function rejectUpgrade(socket, statusCode, statusText) {
    socket.write(`HTTP/1.1 ${statusCode} ${statusText}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
}

/**
 * Resolves the account behind an upgrade request from its session cookie.
 *
 * @param {object} authRepository - Session repository.
 * @param {string|undefined} cookieHeader - Raw Cookie header of the request.
 * @returns {Promise<object|null>} The active account or null.
 */
async function findUpgradeUser(authRepository, cookieHeader) {
    const token = readSessionToken(cookieHeader);
    return token === null ? null : authRepository.findActiveSessionUser(hashSessionToken(token));
}

/**
 * Creates the real-time hub that pushes message events to connected accounts.
 * Connections are authenticated with the session cookie during the WebSocket
 * upgrade and only receive events of the accounts they belong to.
 *
 * @param {{authRepository: object, allowedOrigin: string}} options - Session repository and frontend origin.
 * @returns {{
 *   handleUpgrade: Function,
 *   publishToUsers: Function
 * }} Upgrade handler to attach to the HTTP server and the publish operation.
 * @example
 * server.on("upgrade", hub.handleUpgrade);
 * hub.publishToUsers([senderId, recipientId], { type: "message.created", message });
 */
function createMessageHub({ authRepository, allowedOrigin }) {
    const socketServer = new WebSocketServer({ noServer: true });
    const socketsByUser = new Map();

    /**
     * Stores an authenticated socket under its account and removes it on close.
     *
     * @param {string} userId - Account that owns the socket.
     * @param {WebSocket} socket - Authenticated WebSocket connection.
     */
    function register(userId, socket) {
        const sockets = socketsByUser.get(userId) || new Set();
        sockets.add(socket);
        socketsByUser.set(userId, sockets);
        socket.on("close", () => {
            sockets.delete(socket);
            if (sockets.size === 0) {
                socketsByUser.delete(userId);
            }
        });
    }

    /**
     * Authenticates and upgrades a request to the message socket path.
     *
     * @param {import("http").IncomingMessage} request - Upgrade request.
     * @param {import("net").Socket} socket - Raw socket.
     * @param {Buffer} head - Early bytes received after the request headers.
     * @returns {Promise<void>} Resolves once the upgrade is accepted or rejected.
     */
    async function handleUpgrade(request, socket, head) {
        try {
            if (new URL(request.url, "http://localhost").pathname !== MESSAGE_SOCKET_PATH) {
                socket.destroy();
                return;
            }
            if (request.headers.origin !== allowedOrigin) {
                rejectUpgrade(socket, 403, "Forbidden");
                return;
            }
            const user = await findUpgradeUser(authRepository, request.headers.cookie);
            if (user === null) {
                rejectUpgrade(socket, 401, "Unauthorized");
                return;
            }
            socketServer.handleUpgrade(request, socket, head, (ws) => {
                register(user.id_user, ws);
            });
        } catch (error) {
            console.error("messageHub.handleUpgrade", error);
            socket.destroy();
        }
    }

    /**
     * Sends an event to every open socket of the given accounts. Each account
     * is notified once even when it appears more than once in the list.
     *
     * @param {Array<string>} userIds - Accounts that should receive the event.
     * @param {object} payload - JSON-serializable event body.
     */
    function publishToUsers(userIds, payload) {
        const data = JSON.stringify(payload);
        [...new Set(userIds)].forEach((userId) => {
            const sockets = socketsByUser.get(userId) || new Set();
            sockets.forEach((socket) => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(data);
                }
            });
        });
    }

    return { handleUpgrade, publishToUsers };
}

module.exports = {
    createMessageHub,
    MESSAGE_SOCKET_PATH
};
