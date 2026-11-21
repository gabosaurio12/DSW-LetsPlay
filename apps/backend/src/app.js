const path = require("node:path");
const express = require("express");
const { createVideogamesRouter } = require("./routes/videogamesRouter");
const { createCommentsRouter } = require("./routes/commentsRouter");
const { createReportsRouter } = require("./routes/reportsRouter");
const { createLfgRouter } = require("./routes/lfgRouter");
const { createUploadsRouter } = require("./routes/uploadsRouter");

/**
 * Resolves app dependencies while remaining retrocompatible with callers
 * that pass videogameRepository directly.
 *
 * @param {object} dependencies - Either { videogameRepository, commentRepository, reportRepository, lfgRepository, uploadDir } or videogameRepository.
 * @returns {{ videogameRepository: object, commentRepository?: object, reportRepository?: object, lfgRepository?: object, uploadDir?: string }} Resolved repositories.
 */
function resolveRepositories(dependencies) {
    if (dependencies && typeof dependencies === "object" && "videogameRepository" in dependencies) {
        return {
            videogameRepository: dependencies.videogameRepository,
            commentRepository: dependencies.commentRepository,
            reportRepository: dependencies.reportRepository,
            lfgRepository: dependencies.lfgRepository,
            uploadDir: dependencies.uploadDir
        };
    }

    return {
        videogameRepository: dependencies,
        commentRepository: undefined,
        reportRepository: undefined,
        lfgRepository: undefined,
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
        uploadDir
    } = resolveRepositories(dependencies);
    const resolvedUploadDir = uploadDir || path.join(__dirname, "../../uploads");
    const app = express();
    const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

    app.use(express.json());

    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
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

    app.use("/api/videogames", createVideogamesRouter(videogameRepository));

    if (commentRepository) {
        app.use("/api/posts", createCommentsRouter(commentRepository));
    }

    if (reportRepository) {
        app.use("/api/reports", createReportsRouter(reportRepository));
    }

    if (lfgRepository) {
        app.use("/api/lfg", createLfgRouter(lfgRepository));
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
