/**
 * Serializes writes involving the same two accounts across follows, requests and blocks.
 * Uses a raw query only because the Prisma Client API cannot express SELECT ... FOR UPDATE.
 *
 * @param {import("@prisma/client").Prisma.TransactionClient} tx - Prisma interactive transaction client.
 * @param {string} firstUserId - First account uuid.
 * @param {string} secondUserId - Second account uuid.
 * @returns {Promise<void>} Resolves after acquiring the pair lock.
 */
async function lockUserPair(tx, firstUserId, secondUserId) {
    await tx.$queryRaw`
        SELECT "id_user" FROM "User"
        WHERE "id_user" IN (${firstUserId}::uuid, ${secondUserId}::uuid)
        ORDER BY "id_user"
        FOR UPDATE
    `;
}

module.exports = {
    lockUserPair
};
