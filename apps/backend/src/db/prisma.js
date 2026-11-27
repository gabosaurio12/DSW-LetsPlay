const { PrismaClient } = require("@prisma/client");

/**
 * Creates the Prisma client used by every repository.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] - Environment variables object.
 * @returns {import("@prisma/client").PrismaClient} Prisma client bound to DATABASE_URL.
 * @throws {Error} When DATABASE_URL is missing or empty.
 */
function createPrismaClient(env = process.env) {
    if (!env.DATABASE_URL || env.DATABASE_URL.trim() === "") {
        throw new Error("Missing PostgreSQL connection configuration: DATABASE_URL");
    }

    return new PrismaClient({
        datasources: {
            db: { url: env.DATABASE_URL }
        }
    });
}

module.exports = {
    createPrismaClient
};
