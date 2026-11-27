const { Pool } = require("pg");

/**
 * Creates a PostgreSQL connection pool from environment variables.
 * Supports either DATABASE_URL or discrete PG* variables.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] - Environment variables object.
 * @returns {import("pg").Pool} Configured PostgreSQL pool instance.
 */
function createPool(env = process.env) {
    if (env.DATABASE_URL && env.DATABASE_URL.trim() !== "") {
        return new Pool({
            connectionString: env.DATABASE_URL
        });
    }

    const requiredVars = ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"];
    const missing = requiredVars.filter((key) => !env[key] || String(env[key]).trim() === "");
    if (missing.length > 0) {
        throw new Error(`Missing PostgreSQL connection configuration: ${missing.join(", ")}`);
    }

    const port = Number(env.PGPORT);
    if (!Number.isInteger(port) || port <= 0) {
        throw new Error("Invalid PGPORT value: must be a positive integer");
    }

    return new Pool({
        host: env.PGHOST,
        port,
        database: env.PGDATABASE,
        user: env.PGUSER,
        password: env.PGPASSWORD
    });
}

module.exports = {
    createPool
};
