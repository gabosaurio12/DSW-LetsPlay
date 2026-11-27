const crypto = require("node:crypto");
const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

/**
 * Checks that a password fits in the 72-byte bcrypt input. Longer passwords are
 * rejected because bcrypt would silently ignore the extra bytes.
 *
 * @param {string} password - Raw password entered by the user.
 * @returns {boolean} True when the password can be hashed without truncation.
 */
function isPasswordWithinBcryptLimit(password) {
    return Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES;
}

/**
 * Hashes a password with bcrypt using a salt generated for each call.
 *
 * @param {string} password - Raw password to hash.
 * @returns {Promise<string>} The bcrypt hash to store in User.password_hash.
 */
async function hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compares a raw password against a stored bcrypt hash.
 *
 * @param {string} password - Raw password entered by the user.
 * @param {string} passwordHash - Hash read from User.password_hash.
 * @returns {Promise<boolean>} True when the password matches the hash.
 */
async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

let dummyPasswordHashPromise = null;

/**
 * Returns a hash of a random password. Login checks it when the account does not
 * exist, so unknown and known accounts take a similar time to answer.
 *
 * @returns {Promise<string>} A bcrypt hash that no user can match.
 */
function getDummyPasswordHash() {
    dummyPasswordHashPromise ??= hashPassword(crypto.randomUUID());
    return dummyPasswordHashPromise;
}

module.exports = {
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_BYTES,
    isPasswordWithinBcryptLimit,
    hashPassword,
    verifyPassword,
    getDummyPasswordHash
};
