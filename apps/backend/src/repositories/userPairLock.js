/**
 * Serializes writes involving the same two accounts across follows, requests and blocks.
 *
 * @param {import("pg").PoolClient} client - Transaction client.
 * @param {string} firstUserId - First account uuid.
 * @param {string} secondUserId - Second account uuid.
 * @returns {Promise<void>} Resolves after acquiring the pair lock.
 */
async function lockUserPair(client, firstUserId, secondUserId) {
    await client.query(
        `SELECT "id_user" FROM "User"
         WHERE "id_user" = ANY($1::uuid[])
         ORDER BY "id_user"
         FOR UPDATE`,
        [[firstUserId, secondUserId]]
    );
}

module.exports = {
    lockUserPair
};
