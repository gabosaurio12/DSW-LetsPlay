const express = require("express");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POST_CONTENT_LENGTH = 2000;
const MAX_IMAGE_URL_LENGTH = 500;

/**
 * Creates the Express router for public videogame catalog endpoints.
 *
 * @param {{
 *   findPublicVideogames: Function,
 *   findPublicVideogameFilters: Function,
 *   findPublicVideogameById: Function,
 *   findRelatedCommunitiesByVideogameId: Function,
 *   findPublicPostsByVideogameId: Function,
 *   findCommentsByPostId: Function,
 *   createPublicPostForVideogame: Function
 * }} repository - Videogame repository instance.
 * @returns {import("express").Router} Configured Express router.
 */
function createVideogamesRouter(repository) {
    const router = express.Router();

    router.get("/", async (req, res) => {
        const genre = typeof req.query.genre === "string" ? req.query.genre : undefined;
        const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
        const search = typeof req.query.search === "string" ? req.query.search : undefined;

        const videogames = await repository.findPublicVideogames({
            genre,
            platform,
            search
        });

        res.status(200).json({ videogames });
    });

    // Registered before /:id so "filters" is not treated as a videogame UUID.
    router.get("/filters", async (_req, res) => {
        const filters = await repository.findPublicVideogameFilters();
        res.status(200).json(filters);
    });

    // Registered before /:id so "/posts/:postId/comments" is not shadowed.
    router.get("/posts/:postId/comments", async (req, res) => {
        const { postId } = req.params;
        if (!UUID_REGEX.test(postId)) {
            res.status(400).json({ error: "Invalid post id" });
            return;
        }

        const comments = await repository.findCommentsByPostId(postId);
        res.status(200).json({ comments });
    });

    router.get("/:id", async (req, res) => {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            res.status(400).json({ error: "Invalid videogame id" });
            return;
        }

        const videogame = await repository.findPublicVideogameById(id);
        if (!videogame) {
            res.status(404).json({ error: "Videogame not found" });
            return;
        }

        res.status(200).json({ videogame });
    });

    router.get("/:id/communities", async (req, res) => {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            res.status(400).json({ error: "Invalid videogame id" });
            return;
        }

        const communities = await repository.findRelatedCommunitiesByVideogameId(id);
        res.status(200).json({ communities });
    });

    router.get("/:id/posts", async (req, res) => {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            res.status(400).json({ error: "Invalid videogame id" });
            return;
        }

        const posts = await repository.findPublicPostsByVideogameId(id);
        res.status(200).json({ posts });
    });

    router.post("/:id/posts", async (req, res) => {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            res.status(400).json({ error: "Invalid videogame id" });
            return;
        }

        const { content, imageUrl, isSpoiler, userId } = req.body || {};

        if (content !== undefined && content !== null && typeof content !== "string") {
            res.status(400).json({ error: "Invalid post content" });
            return;
        }

        if (imageUrl !== undefined && imageUrl !== null && typeof imageUrl !== "string") {
            res.status(400).json({ error: "Invalid image URL" });
            return;
        }

        const trimmedContent = typeof content === "string" ? content.trim() : "";
        const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";

        if (trimmedContent.length === 0 && trimmedImageUrl.length === 0) {
            res.status(400).json({ error: "Post content or imageUrl is required" });
            return;
        }

        if (trimmedContent.length > MAX_POST_CONTENT_LENGTH) {
            res.status(400).json({ error: "Post content must be 2000 characters or fewer" });
            return;
        }

        if (trimmedImageUrl.length > MAX_IMAGE_URL_LENGTH) {
            res.status(400).json({ error: "Image URL must be 500 characters or fewer" });
            return;
        }

        if (userId !== undefined && userId !== null && (typeof userId !== "string" || !UUID_REGEX.test(userId))) {
            res.status(400).json({ error: "Invalid user id" });
            return;
        }

        const post = await repository.createPublicPostForVideogame({
            videogameId: id,
            userId: userId ?? undefined,
            content: trimmedContent || null,
            imageUrl: trimmedImageUrl || null,
            isSpoiler: Boolean(isSpoiler)
        });

        if (!post) {
            res.status(404).json({ error: "Videogame not found" });
            return;
        }

        res.status(201).json({ post });
    });

    return router;
}

module.exports = {
    createVideogamesRouter
};
