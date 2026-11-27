const express = require("express");
const { createRequireSession } = require("../auth/authMiddleware");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_COMMENT_LENGTH = 500;

/**
 * Creates the Express router for post comments endpoints.
 *
 * @param {{
 *   findCommentsByPostId: Function,
 *   createComment: Function
 * }} commentRepository - Comment repository instance.
 * @returns {import("express").Router} Configured Express router.
 */
function createCommentsRouter(commentRepository, authRepository) {
    const router = express.Router();
    const requireSession = authRepository
        ? createRequireSession(authRepository)
        : (_req, _res, next) => next();

    router.get("/:postId/comments", requireSession, async (req, res, next) => {
        try {
            const { postId } = req.params;
            if (!UUID_REGEX.test(postId)) {
                res.status(400).json({ error: "Invalid post id" });
                return;
            }

            const comments = await commentRepository.findCommentsByPostId(
                postId,
                req.currentUser?.id_user
            );
            res.status(200).json({ comments });
        } catch (error) {
            next(error);
        }
    });

    router.post("/:postId/comments", requireSession, async (req, res, next) => {
        try {
            const { postId } = req.params;
            if (!UUID_REGEX.test(postId)) {
                res.status(400).json({ error: "Invalid post id" });
                return;
            }

            const { content, isSpoiler, userId } = req.body || {};
            if (typeof content !== "string" || content.trim().length === 0) {
                res.status(400).json({ error: "Comment content is required" });
                return;
            }

            const trimmedContent = content.trim();
            if (trimmedContent.length > MAX_COMMENT_LENGTH) {
                res.status(400).json({ error: "Comment content must be 500 characters or fewer" });
                return;
            }

            if (userId !== undefined && userId !== null
                && (typeof userId !== "string" || !UUID_REGEX.test(userId))) {
                res.status(400).json({ error: "Invalid user id" });
                return;
            }

            const comment = await commentRepository.createComment({
                postId,
                userId: authRepository ? undefined : userId ?? undefined,
                ...(req.currentUser ? { viewerId: req.currentUser.id_user } : {}),
                content: trimmedContent,
                isSpoiler: Boolean(isSpoiler)
            });

            if (!comment) {
                res.status(404).json({ error: "Post not found" });
                return;
            }

            res.status(201).json({ comment });
        } catch (error) {
            next(error);
        }
    });

    return router;
}

module.exports = {
    createCommentsRouter
};
