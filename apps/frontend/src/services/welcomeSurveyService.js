const GAMER_PREFERENCES_PATH = "/api/me/gamer-preferences";

/**
 * Creates an error that carries the HTTP status, so callers can tell an expired
 * session (401) from a failed request.
 *
 * @param {string} message - Description of the failure.
 * @param {number} status - HTTP status returned by the server.
 * @returns {Error} The error with a numeric status property.
 */
function createRequestError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Loads the gamer preferences saved for the signed-in account.
 *
 * @returns {Promise<{ genres: string[], platforms: string[], availability: string[] } | null>}
 * The saved selection, or null when the account has not answered the survey yet.
 * @throws {Error} When the request fails. Its status property is 401 when the session has expired.
 */
export async function loadWelcomeSurvey() {
  const response = await fetch(GAMER_PREFERENCES_PATH);
  if (!response.ok) {
    throw createRequestError(`Failed to load gamer preferences (${response.status})`, response.status);
  }
  const body = await response.json();
  return body.preferences;
}

/**
 * Saves the gamer preferences of the signed-in account, replacing the previous ones.
 *
 * @param {{ genres: string[], platforms: string[], availability: string[] }} selection - Selected option ids per question.
 * @returns {Promise<void>} Resolves when the server has stored the selection.
 * @throws {Error} When the request fails. Its status property is 401 when the session has expired.
 */
export async function saveWelcomeSurvey(selection) {
  const response = await fetch(GAMER_PREFERENCES_PATH, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(selection),
  });
  if (!response.ok) {
    throw createRequestError(`Failed to save gamer preferences (${response.status})`, response.status);
  }
}
