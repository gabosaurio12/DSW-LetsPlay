const MIN_GENRE_SELECTIONS = 1;
const MAX_GENRE_SELECTIONS = 5;
const MIN_PLATFORM_SELECTIONS = 1;
const MAX_PLATFORM_SELECTIONS = 5;
const MIN_AVAILABILITY_SELECTIONS = 1;
const ANY_TIME_OPTION_ID = "anyTime";

// Stored labels match the values LFG filters on, so survey answers reach the matchmaking.
const GENRE_LABELS = {
    rpg: "RPG",
    shooter: "Shooter / FPS",
    platformer: "Platformer",
    strategy: "Strategy",
    fighting: "Fighting",
    sports: "Sports",
    indie: "Indie",
    simulation: "Simulation"
};

const PLATFORM_LABELS = {
    pc: "PC",
    xbox: "Xbox Series X|S",
    playstation: "PlayStation 5",
    nintendoSwitch: "Nintendo Switch",
    mobile: "Mobile",
    vr: "VR"
};

const AVAILABILITY_LABELS = {
    weekdayMornings: "Weekday mornings",
    weekdayAfternoons: "Afternoons (16:00-19:00)",
    weekdayNights: "Weeknights (20:00-23:00)",
    weekendMornings: "Weekends (10:00-14:00)",
    weekendAfternoons: "Weekend afternoons",
    weekendNights: "Weekend nights",
    [ANY_TIME_OPTION_ID]: "Always available"
};

/**
 * Checks that a value is an array of unique strings, each one a known option id.
 *
 * @param {unknown} value - Value received from the client.
 * @param {Object<string, string>} labels - Catalogue of accepted option ids.
 * @returns {boolean} True when the value is a valid list of option ids.
 */
function isValidOptionList(value, labels) {
    return Array.isArray(value)
        && value.every((optionId) => typeof optionId === "string" && Object.hasOwn(labels, optionId))
        && new Set(value).size === value.length;
}

/**
 * Validates a gamer preference selection sent by the survey or the profile editor.
 *
 * @param {object} body - Parsed request body with genres, platforms and availability id lists.
 * @returns {{ genres: string[], platforms: string[], availability: string[] } | null}
 * The validated selection, or null when any rule of RN-27 is broken.
 */
function parseGamerPreferenceSelection(body) {
    const input = body || {};
    const { genres, platforms, availability } = input;

    const isValid = isValidOptionList(genres, GENRE_LABELS)
        && genres.length >= MIN_GENRE_SELECTIONS
        && genres.length <= MAX_GENRE_SELECTIONS
        && isValidOptionList(platforms, PLATFORM_LABELS)
        && platforms.length >= MIN_PLATFORM_SELECTIONS
        && platforms.length <= MAX_PLATFORM_SELECTIONS
        && isValidOptionList(availability, AVAILABILITY_LABELS)
        && availability.length >= MIN_AVAILABILITY_SELECTIONS
        && (!availability.includes(ANY_TIME_OPTION_ID) || availability.length === 1);

    return isValid ? { genres, platforms, availability } : null;
}

/**
 * Converts a validated selection into the labels stored in GamerPreference.
 *
 * @param {{ genres: string[], platforms: string[], availability: string[] }} selection - Validated selection.
 * @returns {{ favoriteGenres: string[], activePlatforms: string[], availability: string[] }} Stored labels.
 */
function toStoredPreferences(selection) {
    return {
        favoriteGenres: selection.genres.map((optionId) => GENRE_LABELS[optionId]),
        activePlatforms: selection.platforms.map((optionId) => PLATFORM_LABELS[optionId]),
        availability: selection.availability.map((optionId) => AVAILABILITY_LABELS[optionId])
    };
}

/**
 * Maps stored labels back to survey option ids. Labels outside the catalogue are dropped.
 *
 * @param {{ favorite_genres: string[], active_platforms: string[], availability: string[] }} row - Stored row.
 * @returns {{ genres: string[], platforms: string[], availability: string[] } | null}
 * The selection, or null when any group has no option the survey can show.
 */
function fromStoredPreferences(row) {
    const genres = toOptionIds(row.favorite_genres, GENRE_LABELS);
    const platforms = toOptionIds(row.active_platforms, PLATFORM_LABELS);
    const availability = toOptionIds(row.availability, AVAILABILITY_LABELS);
    const isComplete = genres.length > 0 && platforms.length > 0 && availability.length > 0;
    return isComplete ? { genres, platforms, availability } : null;
}

/**
 * Finds the option ids whose stored label appears in a list.
 *
 * @param {string[]} storedLabels - Labels read from the database.
 * @param {Object<string, string>} labels - Catalogue of option ids and labels.
 * @returns {string[]} The matching option ids, in catalogue order.
 */
function toOptionIds(storedLabels, labels) {
    const knownLabels = new Set(Array.isArray(storedLabels) ? storedLabels : []);
    return Object.keys(labels).filter((optionId) => knownLabels.has(labels[optionId]));
}

module.exports = {
    parseGamerPreferenceSelection,
    toStoredPreferences,
    fromStoredPreferences
};
