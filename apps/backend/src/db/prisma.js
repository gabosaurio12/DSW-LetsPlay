const { PrismaClient } = require("@prisma/client");

const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;

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

/**
 * Builds a case-insensitive exact-match string filter. Prisma compiles it to ILIKE,
 * where "_" and "%" are wildcards, so they are escaped to keep the match literal.
 *
 * @param {string} value - Raw value to compare.
 * @returns {{ equals: string, mode: "insensitive" }} Prisma string filter.
 */
function caseInsensitiveEquals(value) {
    return {
        equals: value.replace(LIKE_SPECIAL_CHARACTERS, "\\$&"),
        mode: "insensitive"
    };
}

module.exports = {
    createPrismaClient,
    caseInsensitiveEquals
};
