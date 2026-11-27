const express = require("express");
const { createRequireSession } = require("../auth/authMiddleware");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 50;
const MAX_BATCH_IDS = 50;

/**
 * Parses a paginated query string into bounded numeric values.
 *
 * @param {object} query - Express request query object.
 * @returns {{limit: number, offset: number}|null} Bounded pagination or null when invalid.
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
    if (limit === null || offset === null || limit < 1 || !Number.isSafeInteger(offset)) {
        return null;
    }
    return { limit: Math.min(limit, MAX_LIST_LIMIT), offset };
}

/**
 * Creates the Express router for public follow relationships and connection lists.
 *
 * @param {{ findActiveSessionUser: Function }} authRepository - Auth repository instance.
 * @param {object} followsRepository - Follow repository instance.
 * @returns {import("express").Router} Configured Express router.
 */
function createFollowsRouter(authRepository, followsRepository) {
    const router = express.Router();
    const requireSession = createRequireSession(authRepository);
    const currentUserId = (req) => req.currentUser.id_user;

    router.use(requireSession);

    router.get("/follow-states", async (req, res, next) => {
        try {
            const { ids } = req.query;
            if (typeof ids !== "string" || ids.trim() === "") {
                res.status(400).json({ error: "Invalid user ids" });
                return;
            }
            const userIds = ids.split(",");
            if (userIds.length > MAX_BATCH_IDS || userIds.some((id) => !UUID_REGEX.test(id))) {
                res.status(400).json({ error: "Invalid user ids" });
                return;
            }
            const followedIds = await followsRepository.findFollowStates(
                currentUserId(req),
                userIds
            );
            res.status(200).json({ followedIds });
        } catch (error) {
            next(error);
        }
    });

    router.get("/:userId", async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (!UUID_REGEX.test(userId)) {
                res.status(400).json({ error: "Invalid user id" });
                return;
            }
            const user = await followsRepository.findVisibleUser(userId, currentUserId(req));
            if (user === null) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            const [counts, isFollowing] = await Promise.all([
                followsRepository.countFollows(userId, currentUserId(req)),
                followsRepository.findFollowState(currentUserId(req), userId)
            ]);
            res.status(200).json({ user, isFollowing, counts });
        } catch (error) {
            next(error);
        }
    });

    router.put("/:userId/follow", async (req, res, next) => {
        try {
            const { userId } = req.params;
            const viewerId = currentUserId(req);
            if (!UUID_REGEX.test(userId)) {
                res.status(400).json({ error: "Invalid user id" });
                return;
            }
            if (userId === viewerId) {
                res.status(400).json({ error: "A user cannot follow themselves" });
                return;
            }
            const user = await followsRepository.findVisibleUser(userId, viewerId);
            if (user === null) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            const alreadyFollowing = await followsRepository.findFollowState(viewerId, userId);
            if (!alreadyFollowing) {
                const inserted = await followsRepository.addFollow(viewerId, userId);
                if (!inserted) {
                    res.status(404).json({ error: "User not found" });
                    return;
                }
            }
            res.status(200).json({ isFollowing: true });
        } catch (error) {
            next(error);
        }
    });

    router.delete("/:userId/follow", async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (!UUID_REGEX.test(userId)) {
                res.status(400).json({ error: "Invalid user id" });
                return;
            }
            await followsRepository.removeFollow(currentUserId(req), userId);
            res.status(200).json({ isFollowing: false });
        } catch (error) {
            next(error);
        }
    });

    async function sendFollowList(req, res, listType) {
        const { userId } = req.params;
        if (!UUID_REGEX.test(userId)) {
            res.status(400).json({ error: "Invalid user id" });
            return;
        }
        const pagination = parsePagination(req.query);
        if (pagination === null) {
            res.status(400).json({ error: "Invalid pagination" });
            return;
        }
        const viewerId = currentUserId(req);
        const user = await followsRepository.findVisibleUser(userId, viewerId);
        if (user === null) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const listArgs = [userId, viewerId, pagination.limit, pagination.offset];
        const list = listType === "followers"
            ? await followsRepository.listFollowers(...listArgs)
            : await followsRepository.listFollowing(...listArgs);
        res.status(200).json({ users: list, ...pagination });
    }

    router.get("/:userId/followers", async (req, res, next) => {
        try {
            await sendFollowList(req, res, "followers");
        } catch (error) {
            next(error);
        }
    });

    router.get("/:userId/following", async (req, res, next) => {
        try {
            await sendFollowList(req, res, "following");
        } catch (error) {
            next(error);
        }
    });

    return router;
}

module.exports = {
    createFollowsRouter
};
