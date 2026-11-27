const { MIN_PASSWORD_LENGTH, isPasswordWithinBcryptLimit } = require("./passwordHasher");

const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIRTH_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_USERNAME_LENGTH = 12;
const MAX_EMAIL_LENGTH = 255;
const REGISTRATION_GENDERS = ["MALE", "FEMALE", "NON_BINARY", "OTHER"];

/**
 * Reads a string field from a request body, trimming surrounding spaces.
 *
 * @param {object} body - Parsed request body.
 * @param {string} field - Name of the field to read.
 * @returns {string} The trimmed value, or an empty string when the field is not a string.
 */
function readTrimmedString(body, field) {
    return typeof body[field] === "string" ? body[field].trim() : "";
}

/**
 * Checks that a birth date is a real calendar date that is not in the future.
 *
 * @param {string} birthDate - Date in YYYY-MM-DD format.
 * @param {Date} [today=new Date()] - Reference date for the future check.
 * @returns {boolean} True when the date is valid.
 */
function isValidBirthDate(birthDate, today = new Date()) {
    if (!BIRTH_DATE_REGEX.test(birthDate)) {
        return false;
    }
    const parsed = new Date(`${birthDate}T00:00:00Z`);
    return parsed.toISOString().slice(0, 10) === birthDate && parsed <= today;
}

/**
 * Validates the registration body and normalizes its fields.
 *
 * @param {object} body - Parsed request body with username, email, birthDate, gender and password.
 * @returns {{ username: string, email: string, birthDate: string, gender: string, password: string } | null}
 * The normalized registration data, or null when any field is invalid.
 */
function parseRegistrationInput(body) {
    const input = body || {};
    const username = readTrimmedString(input, "username");
    const email = readTrimmedString(input, "email").toLowerCase();
    const birthDate = readTrimmedString(input, "birthDate");
    const { gender } = input;
    const password = typeof input.password === "string" ? input.password : "";

    const isValid = username.length > 0
        && username.length <= MAX_USERNAME_LENGTH
        && USERNAME_REGEX.test(username)
        && email.length <= MAX_EMAIL_LENGTH
        && EMAIL_REGEX.test(email)
        && isValidBirthDate(birthDate)
        && REGISTRATION_GENDERS.includes(gender)
        && password.length >= MIN_PASSWORD_LENGTH
        && isPasswordWithinBcryptLimit(password);

    return isValid ? { username, email, birthDate, gender, password } : null;
}

/**
 * Validates the login body. Identifiers are matched case-insensitively against
 * usernames and emails.
 *
 * @param {object} body - Parsed request body with identifier and password.
 * @returns {{ identifier: string, password: string } | null} The login data, or null when invalid.
 */
function parseLoginInput(body) {
    const input = body || {};
    const identifier = readTrimmedString(input, "identifier");
    const password = typeof input.password === "string" ? input.password : "";

    const isValid = identifier.length > 0
        && identifier.length <= MAX_EMAIL_LENGTH
        && password.length > 0
        && isPasswordWithinBcryptLimit(password);

    return isValid ? { identifier, password } : null;
}

module.exports = {
    MAX_USERNAME_LENGTH,
    parseRegistrationInput,
    parseLoginInput
};
