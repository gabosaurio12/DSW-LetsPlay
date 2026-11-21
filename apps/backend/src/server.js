const { createPool } = require("./db/pool");
const { createVideogameRepository } = require("./repositories/videogameRepository");
const { createCommentRepository } = require("./repositories/commentRepository");
const { createReportRepository } = require("./repositories/reportRepository");
const { createLfgRepository } = require("./repositories/lfgRepository");
const { createApp } = require("./app");

/**
 * Starts the HTTP server using environment configuration.
 *
 * @returns {import("http").Server} Running HTTP server instance.
 */
function startServer() {
    const port = Number(process.env.PORT) || 3001;
    const pool = createPool();
    const videogameRepository = createVideogameRepository(pool);
    const commentRepository = createCommentRepository(pool);
    const reportRepository = createReportRepository(pool);
    const lfgRepository = createLfgRepository(pool);
    const app = createApp({ videogameRepository, commentRepository, reportRepository, lfgRepository });

    return app.listen(port, () => {
        console.log(`Backend server listening on port ${port}`);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = {
    startServer
};
