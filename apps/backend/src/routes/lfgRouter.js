const express = require("express");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_PLAY_STYLES = new Set(["CASUAL", "COMPETITIVE", "COOPERATIVE", "INDIFFERENT"]);
const MIN_SPOTS = 1;
const MAX_SPOTS = 16;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_PLATFORM_LENGTH = 50;
const TIME_SCHEDULE_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d(?:\s*-\s*(?:[01]\d|2[0-3]):[0-5]\d)?$/;

/**
 * Creates the Express router for LFG matchmaking and posts endpoints.
 *
 * @param {{
 *   findCompatiblePlayers: Function,
 *   findOpenLfgPosts: Function,
 *   createLfgPost: Function
 * }} lfgRepository - LFG repository instance.
 * @returns {import("express").Router} Configured Express router.
 */
function createLfgRouter(lfgRepository) {
    const router = express.Router();

    router.get("/players", async (req, res) => {
        const { userId, gameId, platform, availability, style, onlyAvailable } = req.query;

        if (userId !== undefined && userId !== "" && (typeof userId !== "string" || !UUID_REGEX.test(userId))) {
            res.status(400).json({ error: "Invalid user id" });
            return;
        }

        if (gameId !== undefined && gameId !== "" && (typeof gameId !== "string" || !UUID_REGEX.test(gameId))) {
            res.status(400).json({ error: "Invalid game id" });
            return;
        }

        let normalizedStyle;
        if (style !== undefined && style !== "") {
            if (typeof style !== "string" || !VALID_PLAY_STYLES.has(style.trim().toUpperCase())) {
                res.status(400).json({ error: "Invalid play style" });
                return;
            }
            normalizedStyle = style.trim().toUpperCase();
        }

        const result = await lfgRepository.findCompatiblePlayers({
            userId: userId || undefined,
            gameId: gameId || undefined,
            platform: typeof platform === "string" && platform.trim() ? platform.trim() : undefined,
            availability: typeof availability === "string" && availability.trim() ? availability.trim() : undefined,
            style: normalizedStyle,
            onlyAvailable: onlyAvailable === "true" || onlyAvailable === true
        });

        res.status(200).json(result);
    });

    router.get("/posts", async (req, res) => {
        const { gameId, platform } = req.query;

        if (gameId !== undefined && gameId !== "" && (typeof gameId !== "string" || !UUID_REGEX.test(gameId))) {
            res.status(400).json({ error: "Invalid game id" });
            return;
        }

        const posts = await lfgRepository.findOpenLfgPosts({
            gameId: gameId || undefined,
            platform: typeof platform === "string" && platform.trim() ? platform.trim() : undefined
        });

        res.status(200).json({ posts });
    });

    router.post("/posts", async (req, res) => {
        const {
            userId,
            videogameId,
            platform,
            spotsAvailable,
            scheduledTime,
            description,
            acceptsBeginners
        } = req.body || {};

        if (userId !== undefined && userId !== null && (typeof userId !== "string" || !UUID_REGEX.test(userId))) {
            res.status(400).json({ error: "Invalid user id" });
            return;
        }

        if (typeof videogameId !== "string" || !UUID_REGEX.test(videogameId)) {
            res.status(400).json({ error: "Invalid videogame id" });
            return;
        }

        if (typeof platform !== "string" || platform.trim().length === 0) {
            res.status(400).json({ error: "Platform is required" });
            return;
        }

        const trimmedPlatform = platform.trim();
        if (trimmedPlatform.length > MAX_PLATFORM_LENGTH) {
            res.status(400).json({ error: "Platform must be 50 characters or fewer" });
            return;
        }

        const parsedSpots = Number(spotsAvailable);
        if (!Number.isInteger(parsedSpots) || parsedSpots < MIN_SPOTS || parsedSpots > MAX_SPOTS) {
            res.status(400).json({ error: "Spots available must be an integer between 1 and 16" });
            return;
        }

        if (typeof scheduledTime !== "string" || scheduledTime.trim().length === 0) {
            res.status(400).json({ error: "Scheduled time is required" });
            return;
        }

        const normalizedScheduledTime = scheduledTime.trim().replace(/\s*-\s*/, "-");
        if (!TIME_SCHEDULE_REGEX.test(normalizedScheduledTime)) {
            res.status(400).json({ error: "scheduledTime must be a valid time or time range (HH:MM or HH:MM-HH:MM)" });
            return;
        }

        if (typeof description !== "string") {
            res.status(400).json({ error: "Description is required" });
            return;
        }

        const trimmedDescription = description.trim();
        if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH || trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
            res.status(400).json({ error: "Description must be between 10 and 500 characters" });
            return;
        }

        const post = await lfgRepository.createLfgPost({
            userId: userId ?? undefined,
            videogameId,
            platform: trimmedPlatform,
            spotsAvailable: parsedSpots,
            scheduledTime: normalizedScheduledTime,
            description: trimmedDescription,
            acceptsBeginners: acceptsBeginners === undefined ? true : Boolean(acceptsBeginners)
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
    TIME_SCHEDULE_REGEX,
    createLfgRouter
};
