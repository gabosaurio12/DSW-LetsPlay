const express = require("express");
const { createRequireSession } = require("../auth/authMiddleware");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 50;
const DEFAULT_THREAD_LIMIT = 30;
const MAX_THREAD_LIMIT = 100;
const MAX_MESSAGE_WORDS = 300;
const MESSAGE_CREATED_EVENT = "message.created";

/**
 * Parses bounded pagination options.
 *
 * @param {object} query - Express query object.
 * @param {{defaultLimit: number, maxLimit: number}} bounds - Limit bounds for the list.
 * @returns {{limit: number, offset: number}|null} Parsed options or null when invalid.
 */
function parsePagination(query, { defaultLimit, maxLimit }) {
    const parse = (value, fallback) => {
        if (value === undefined) {
            return fallback;
        }
        if (typeof value !== "string" || !/^\d+$/.test(value)) {
            return null;
        }
        return Number(value);
    };
    const limit = parse(query.limit, defaultLimit);
    const offset = parse(query.offset, 0);
    if (limit === null || offset === null || limit < 1 || !Number.isSafeInteger(offset)) {
        return null;
    }
    return { limit: Math.min(limit, maxLimit), offset };
}

/**
 * Validates the body of a new message.
 *
 * @param {object} body - Parsed request body.
 * @returns {{recipientId: string, content: string}|null} Clean input or null when invalid.
 */
function parseMessageInput(body) {
    const { recipientId, content } = body || {};
    if (typeof recipientId !== "string" || !UUID_REGEX.test(recipientId)
        || typeof content !== "string") {
        return null;
    }
    const trimmed = content.trim();
    if (trimmed === "" || trimmed.split(/\s+/).length > MAX_MESSAGE_WORDS) {
        return null;
    }
    return { recipientId, content: trimmed };
}

/**
 * Sends a message through the repository and maps its outcome to an HTTP response.
 *
 * @param {object} req - Express request with the validated body and current user.
 * @param {object} res - Express response.
 * @param {{messagesRepository: object, realtime: object}} context - Repository and notifier.
 * @returns {Promise<void>} Resolves after the response is written.
 */
async function handleSendMessage(req, res, { messagesRepository, realtime }) {
    const input = parseMessageInput(req.body);
    if (input === null) {
        res.status(400).json({ error: "Invalid message" });
        return;
    }
    const senderId = req.currentUser.id_user;
    if (input.recipientId.toLowerCase() === senderId.toLowerCase()) {
        res.status(400).json({ error: "A user cannot message themselves" });
        return;
    }
    const result = await messagesRepository.sendMessage(senderId, input.recipientId, input.content);
    if (result.status === "unavailable") {
        res.status(404).json({ error: "Recipient not available" });
        return;
    }
    if (result.status === "follow_required") {
        res.status(403).json({ error: "Mutual follow required to message this account" });
        return;
    }
    realtime.publishToUsers([senderId, input.recipientId], {
        type: MESSAGE_CREATED_EVENT,
        message: result.message
    });
    res.status(201).json({ message: result.message });
}

/**
 * Creates the authenticated router for private conversations.
 *
 * @param {{ findActiveSessionUser: Function }} authRepository - Session repository.
 * @param {object} messagesRepository - Message persistence operations.
 * @param {{publishToUsers: Function}} [realtime] - Notifier for connected accounts.
 * @returns {import("express").Router} Configured message router.
 */
function createMessagesRouter(authRepository, messagesRepository, realtime = { publishToUsers() {} }) {
    const router = express.Router();
    const requireSession = createRequireSession(authRepository);
    router.use(requireSession);

    router.get("/conversations", async (req, res, next) => {
        try {
            const pagination = parsePagination(req.query, {
                defaultLimit: DEFAULT_LIST_LIMIT,
                maxLimit: MAX_LIST_LIMIT
            });
            if (pagination === null) {
                res.status(400).json({ error: "Invalid pagination" });
                return;
            }
            const userId = req.currentUser.id_user;
            const [conversations, total] = await Promise.all([
                messagesRepository.listConversations(userId, pagination.limit, pagination.offset),
                messagesRepository.countConversations(userId)
            ]);
            res.status(200).json({ conversations, total, ...pagination });
        } catch (error) {
            next(error);
        }
    });

    router.get("/users/:userId", async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (!UUID_REGEX.test(userId)) {
                res.status(400).json({ error: "Invalid user id" });
                return;
            }
            const pagination = parsePagination(req.query, {
                defaultLimit: DEFAULT_THREAD_LIMIT,
                maxLimit: MAX_THREAD_LIMIT
            });
            if (pagination === null) {
                res.status(400).json({ error: "Invalid pagination" });
                return;
            }
            const viewerId = req.currentUser.id_user;
            const peer = await messagesRepository.findVisiblePeer(userId, viewerId);
            if (peer === null) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            const [messages, total] = await Promise.all([
                messagesRepository.listThreadMessages(
                    viewerId,
                    userId,
                    pagination.limit,
                    pagination.offset
                ),
                messagesRepository.countThreadMessages(viewerId, userId)
            ]);
            res.status(200).json({ peer, messages, total, ...pagination });
        } catch (error) {
            next(error);
        }
    });

    router.post("/", async (req, res, next) => {
        try {
            await handleSendMessage(req, res, { messagesRepository, realtime });
        } catch (error) {
            next(error);
        }
    });

    return router;
}

module.exports = {
    createMessagesRouter
};
