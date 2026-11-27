const { createPrismaClient } = require("./db/prisma");
const { createVideogameRepository } = require("./repositories/videogameRepository");
const { createCommentRepository } = require("./repositories/commentRepository");
const { createReportRepository } = require("./repositories/reportRepository");
const { createLfgRepository } = require("./repositories/lfgRepository");
const { createAuthRepository } = require("./repositories/authRepository");
const { createGamerPreferencesRepository } = require("./repositories/gamerPreferencesRepository");
const { createFollowsRepository } = require("./repositories/followsRepository");
const { createBlocksRepository } = require("./repositories/blocksRepository");
const { createMessagesRepository } = require("./repositories/messagesRepository");
const { createMessageHub } = require("./realtime/messageHub");
const { createApp, resolveAllowedOrigin } = require("./app");

/**
 * Starts the HTTP server using environment configuration.
 *
 * @returns {import("http").Server} Running HTTP server instance.
 */
function startServer() {
    const port = Number(process.env.PORT) || 3001;
    const prisma = createPrismaClient();
    const videogameRepository = createVideogameRepository(prisma);
    const commentRepository = createCommentRepository(prisma);
    const reportRepository = createReportRepository(prisma);
    const lfgRepository = createLfgRepository(prisma);
    const authRepository = createAuthRepository(prisma);
    const gamerPreferencesRepository = createGamerPreferencesRepository(prisma);
    const followsRepository = createFollowsRepository(prisma);
    const blocksRepository = createBlocksRepository(prisma);
    const messagesRepository = createMessagesRepository(prisma);
    const messageHub = createMessageHub({
        authRepository,
        allowedOrigin: resolveAllowedOrigin()
    });
    const app = createApp({
        videogameRepository,
        commentRepository,
        reportRepository,
        lfgRepository,
        authRepository,
        gamerPreferencesRepository,
        followsRepository,
        blocksRepository,
        messagesRepository,
        messageHub
    });

    const server = app.listen(port, () => {
        console.log(`Backend server listening on port ${port}`);
    });
    server.on("upgrade", messageHub.handleUpgrade);
    return server;
}

if (require.main === module) {
    startServer();
}

module.exports = {
    startServer
};
