const path = require("node:path");
const express = require("express");
const { createVideogamesRouter } = require("./routes/videogamesRouter");
const { createCommentsRouter } = require("./routes/commentsRouter");
const { createReportsRouter } = require("./routes/reportsRouter");
const { createLfgRouter } = require("./routes/lfgRouter");
const { createUploadsRouter } = require("./routes/uploadsRouter");
const { createAuthRouter } = require("./routes/authRouter");
const { createGamerPreferencesRouter } = require("./routes/gamerPreferencesRouter");
const { createFollowsRouter } = require("./routes/followsRouter");
const { createBlocksRouter } = require("./routes/blocksRouter");
const { createPrivacyRouter } = require("./routes/privacyRouter");
const { createRequireModerator, createOriginGuard } = require("./auth/authMiddleware");

/**
 * Resolves app dependencies while remaining retrocompatible with callers
 * that pass videogameRepository directly.
 *
 * @param {object} dependencies - Either a repositories object or videogameRepository.
 * @returns {object} Resolved repositories and optional middleware overrides.
 */
function resolveRepositories(dependencies) {
    if (dependencies && typeof dependencies === "object" && "videogameRepository" in dependencies) {
        return {
            videogameRepository: dependencies.videogameRepository,
            commentRepository: dependencies.commentRepository,
            reportRepository: dependencies.reportRepository,
            lfgRepository: dependencies.lfgRepository,
            authRepository: dependencies.authRepository,
            gamerPreferencesRepository: dependencies.gamerPreferencesRepository,
            followsRepository: dependencies.followsRepository,
            blocksRepository: dependencies.blocksRepository,
            requireModerator: dependencies.requireModerator,
            uploadDir: dependencies.uploadDir
        };
    }

    return {
        videogameRepository: dependencies,
        commentRepository: undefined,
        reportRepository: undefined,
        lfgRepository: undefined,
        authRepository: undefined,
        gamerPreferencesRepository: undefined,
        followsRepository: undefined,
        blocksRepository: undefined,
        requireModerator: undefined,
        uploadDir: undefined
    };
}

/**
 * Creates the Express application with CORS, health check, videogame routes,
 * comment routes, report routes, LFG routes, upload routes, and error handler.
 *
 * @param {object} dependencies - Repositories object or videogameRepository.
 * @returns {import("express").Express} Configured Express app.
 */
function createApp(dependencies) {
    const {
        videogameRepository,
        commentRepository,
        reportRepository,
        lfgRepository,
        authRepository,
        gamerPreferencesRepository,
        followsRepository,
        blocksRepository,
        requireModerator,
        uploadDir
    } = resolveRepositories(dependencies);
    const resolvedUploadDir = uploadDir || path.join(__dirname, "../../uploads");
    const app = express();
    const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
    const secureCookies = process.env.NODE_ENV === "production";

    app.use(express.json());

    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            res.status(204).end();
            return;
        }

        next();
    });

    app.get("/api/health", (_req, res) => {
        res.status(200).json({ ok: true });
    });

    app.use(
        "/api/videogames",
        createVideogamesRouter(videogameRepository, authRepository)
    );

    if (commentRepository) {
        app.use("/api/posts", createCommentsRouter(commentRepository, authRepository));
    }

    if (authRepository) {
        const originGuard = createOriginGuard(allowedOrigin);
        app.use("/api/auth", originGuard, createAuthRouter(authRepository, { secureCookies }));
        app.use(
            "/api/me/gamer-preferences",
            originGuard,
            createGamerPreferencesRouter(authRepository, gamerPreferencesRepository)
        );
        if (followsRepository) {
            const followsRouter = createFollowsRouter(authRepository, followsRepository);
            app.use("/api/users", originGuard, followsRouter);
            app.use(
                "/api/me/privacy",
                originGuard,
                createPrivacyRouter(authRepository, followsRepository)
            );
        }
        if (blocksRepository) {
            app.use(
                "/api",
                originGuard,
                createBlocksRouter(authRepository, blocksRepository)
            );
        }
    }

    if (reportRepository) {
        const resolvedRequireModerator = requireModerator || createRequireModerator(authRepository);
        app.use("/api/reports", createReportsRouter(reportRepository, resolvedRequireModerator));
    }

    if (lfgRepository) {
        app.use("/api/lfg", createLfgRouter(lfgRepository, authRepository));
    }

    app.use("/api/uploads", createUploadsRouter({ uploadDir: resolvedUploadDir }));
    app.use("/uploads", express.static(resolvedUploadDir, {
        setHeaders: (res) => {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("Content-Security-Policy", "default-src 'none'");
        }
    }));

    app.use((err, _req, res, _next) => {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    });

    return app;
}

module.exports = {
    createApp
};
