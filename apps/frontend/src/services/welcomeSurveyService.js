import { WELCOME_SURVEY_STEPS } from "../data/welcomeSurveyData.js";

const STORAGE_KEY = "letsPlay.welcomeSurvey";

/**
 * Validates that a parsed response has the expected shape: one array of
 * selected option ids per survey step.
 *
 * @param {unknown} response - The parsed response to validate.
 * @returns {boolean} True when the response can be used to seed the survey.
 */
function isValidResponse(response) {
  if (response === null || typeof response !== "object") {
    return false;
  }
  return WELCOME_SURVEY_STEPS.every((step) => {
    const selection = response[step.id];
    if (!Array.isArray(selection)) {
      return false;
    }
    const validOptionIds = step.options.map((option) => option.id);
    return selection.every((optionId) => validOptionIds.includes(optionId));
  });
}

/**
 * Loads the welcome survey answers saved in local storage.
 *
 * @returns {Promise<Object|null>} The stored selection, or null when there is
 * nothing saved or the stored data is corrupted.
 */
export async function loadWelcomeSurvey() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (storedValue === null) {
      return null;
    }
    // Old or corrupted data must not block the survey, so it is treated as absent.
    const parsedValue = JSON.parse(storedValue);
    if (!isValidResponse(parsedValue)) {
      return null;
    }
    return parsedValue;
  } catch {
    // localStorage and JSON.parse failures degrade to "no saved answers".
    return null;
  }
}

/**
 * Saves the welcome survey answers in local storage.
 *
 * @param {Object} selection - An object mapping each step id to its selected option ids.
 * @returns {Promise<boolean>} True when the answers were saved successfully.
 */
export async function saveWelcomeSurvey(selection) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    return true;
  } catch {
    // Storage can be full or blocked (private mode); the caller must show an error.
    return false;
  }
}
