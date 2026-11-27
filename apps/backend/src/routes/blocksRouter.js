const express = require("express");
const { createRequireSession } = require("../auth/authMiddleware");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 50;

/**
 * Parses bounded pagination options.
 *
 * @param {object} query - Express query object.
 * @returns {{limit: number, offset: number}|null} Parsed options or null.
 */
function parsePagination(query) {
    const parse = (value, fallback) => {
        if (value === undefined) {
            return fallback;
        }
        if (typeof value !== "string" || !/^\d+$/.test(value)) {
            return null;
        }
        return Number(value);
    };
    const limit = parse(query.limit, DEFAULT_LIST_LIMIT);
    const offset = parse(query.offset, 0);
    if (!Number.isSafeInteger(limit) || limit < 1
        || !Number.isSafeInteger(offset) || offset < 0) {
        return null;
    }
    return { limit: Math.min(limit, MAX_LIST_LIMIT), offset };
}

/**
 * Creates authenticated block and blocked-account routes.
 *
 * @param {{findActiveSessionUser: Function}} authRepository - Session repository.
 * @param {object} blocksRepository - Block persistence operations.
 * @returns {import("express").Router} Configured block router.
 */
function createBlocksRouter(authRepository, blocksRepository) {
    const router = express.Router();
    const requireSession = createRequireSession(authRepository);
    router.use(requireSession);

    router.get("/me/blocks", async (req, res, next) => {
        try {
            const pagination = parsePagination(req.query);
            if (pagination === null) {
                res.status(400).json({ error: "Invalid pagination" });
                return;
            }
            const [users, total] = await Promise.all([
                blocksRepository.listBlockedUsers(
                    req.currentUser.id_user,
                    pagination.limit,
                    pagination.offset
                ),
                blocksRepository.countBlockedUsers(req.currentUser.id_user)
            ]);
            res.status(200).json({ users, total, ...pagination });
        } catch (error) {
            next(error);
        }
    });

    router.put("/users/:userId/block", async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (!UUID_REGEX.test(userId)) {
                res.status(400).json({ error: "Invalid user id" });
                return;
            }
            if (req.currentUser.id_user.toLowerCase() === userId.toLowerCase()) {
                res.status(400).json({ error: "A user cannot block themselves" });
                return;
            }
            const blocked = await blocksRepository.blockUser(req.currentUser.id_user, userId);
            if (blocked === null) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            res.status(200).json({ isBlocked: true });
        } catch (error) {
            next(error);
        }
    });

    router.delete("/me/blocks/:userId", async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (!UUID_REGEX.test(userId)) {
                res.status(400).json({ error: "Invalid user id" });
                return;
            }
            await blocksRepository.unblockUser(req.currentUser.id_user, userId);
            res.status(200).json({ isBlocked: false });
        } catch (error) {
            next(error);
        }
    });

    router.get("/users/:userId/block-state", async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (!UUID_REGEX.test(userId)) {
                res.status(400).json({ error: "Invalid user id" });
                return;
            }
            res.status(200).json({
                isBlocked: await blocksRepository.hasBlocked(req.currentUser.id_user, userId)
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}

module.exports = {
    createBlocksRouter
};
