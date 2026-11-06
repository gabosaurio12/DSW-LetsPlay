import { APPROVED_VIDEOGAMES, createEmptyProfile } from "../data/profileFormData.js";

const STORAGE_KEY = "letsPlay.userProfile";

/**
 * Validates that a parsed profile has the expected shape: text fields and a
 * list of selected videogames taken from the approved catalogue.
 *
 * @param {unknown} profile - The parsed profile to validate.
 * @returns {boolean} True when the profile can be used to seed the form.
 */
function isValidProfile(profile) {
  if (profile === null || typeof profile !== "object") {
    return false;
  }
  const isTextField = (value) => typeof value === "string";
  const approvedIds = APPROVED_VIDEOGAMES.map((videogame) => videogame.id);
  const { visibleName, bio, avatarUrl, selectedVideogames } = profile;
  return isTextField(visibleName)
    && isTextField(bio)
    && isTextField(avatarUrl)
    && Array.isArray(selectedVideogames)
    && selectedVideogames.every((videogameId) => approvedIds.includes(videogameId));
}

/**
 * Loads the saved user profile from local storage.
 *
 * @returns {Promise<Object|null>} The stored profile, or null when there is
 * nothing saved or the stored data is corrupted.
 */
export async function loadProfile() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (storedValue === null) {
      return null;
    }
    // Old or corrupted data must not block the form, so it is treated as absent.
    const parsedValue = JSON.parse(storedValue);
    if (!isValidProfile(parsedValue)) {
      return null;
    }
    return parsedValue;
  } catch {
    // localStorage and JSON.parse failures degrade to "no saved profile".
    return null;
  }
}

/**
 * Saves the user profile in local storage.
 *
 * @param {Object} profile - The profile draft to persist.
 * @returns {Promise<boolean>} True when the profile was saved successfully.
 */
export async function saveProfile(profile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    // Storage can be full or blocked (private mode); the caller must show an error.
    return false;
  }
}

/**
 * Builds an empty profile merged with a stored one, so missing fields from
 * older versions of the form still render correctly.
 *
 * @param {Object|null} storedProfile - The stored profile, or null.
 * @returns {Object} A complete profile draft.
 */
export function mergeStoredProfile(storedProfile) {
  if (storedProfile === null) {
    return createEmptyProfile();
  }
  return { ...createEmptyProfile(), ...storedProfile };
}
