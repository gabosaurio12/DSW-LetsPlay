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

    router.get("/me/follow-requests", async (req, res, next) => {
        try {
            const pagination = parsePagination(req.query);
            if (pagination === null) {
                res.status(400).json({ error: "Invalid pagination" });
                return;
            }
            const userId = currentUserId(req);
            const [users, total] = await Promise.all([
                followsRepository.listIncomingRequests(
                    userId,
                    pagination.limit,
                    pagination.offset
                ),
                followsRepository.countIncomingRequests(userId)
            ]);
            res.status(200).json({ users, total, ...pagination });
        } catch (error) {
            next(error);
        }
    });

    router.patch("/me/follow-requests/:requesterId", async (req, res, next) => {
        try {
            const { requesterId } = req.params;
            const { action } = req.body || {};
            if (!UUID_REGEX.test(requesterId)
                || (action !== "accept" && action !== "reject")) {
                res.status(400).json({ error: "Invalid follow request action" });
                return;
            }
            const resolved = await followsRepository.resolveFollowRequest(
                currentUserId(req),
                requesterId,
                action
            );
            if (!resolved) {
                res.status(404).json({ error: "Follow request not found" });
                return;
            }
            res.status(200).json({ action, resolved: true });
        } catch (error) {
            next(error);
        }
    });

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
            const [followedIds, pendingIds] = await Promise.all([
                followsRepository.findFollowStates(currentUserId(req), userIds),
                followsRepository.findPendingStates(currentUserId(req), userIds)
            ]);
            res.status(200).json({ followedIds, pendingIds });
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
            const [counts, connectionState, isFollowedBy] = await Promise.all([
                followsRepository.countFollows(userId, currentUserId(req)),
                followsRepository.findConnectionState(currentUserId(req), userId),
                followsRepository.findFollowState(userId, currentUserId(req))
            ]);
            const canViewConnections = !user.is_private
                || userId === currentUserId(req)
                || connectionState === "following";
            res.status(200).json({
                user: canViewConnections
                    ? user
                    : { ...user, description: null },
                connectionState,
                isFollowedBy,
                counts: canViewConnections ? counts : null,
                canViewConnections
            });
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
            if (userId.toLowerCase() === viewerId.toLowerCase()) {
                res.status(400).json({ error: "A user cannot follow themselves" });
                return;
            }
            const user = await followsRepository.findVisibleUser(userId, viewerId);
            if (user === null) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            const connectionState = await followsRepository.addFollow(viewerId, userId);
            if (connectionState === null) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            res.status(200).json({ connectionState });
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
            res.status(200).json({ connectionState: "none" });
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
        if (user.is_private
            && userId !== viewerId
            && await followsRepository.findConnectionState(viewerId, userId) !== "following") {
            res.status(403).json({ error: "Connections are private" });
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
