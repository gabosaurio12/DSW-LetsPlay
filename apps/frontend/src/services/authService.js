const AUTH_API_PATH = "/api/auth";
const NO_CONTENT_STATUS = 204;
const UNAUTHORIZED_STATUS = 401;
const SERVICE_UNAVAILABLE_KEY = "serviceUnavailable";

/**
 * Sends a JSON request to the auth API.
 *
 * @param {string} path - Endpoint path relative to the auth API.
 * @param {{ method?: string, body?: Object }} [options] - Request method and optional JSON body.
 * @returns {Promise<{ status: number, payload: Object|null }>} HTTP status and parsed body.
 * @throws {TypeError} When the network request fails.
 */
async function requestAuth(path, { method = "GET", body } = {}) {
  const response = await fetch(`${AUTH_API_PATH}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = response.status === NO_CONTENT_STATUS ? null : await response.json();
  return { status: response.status, payload };
}

/**
 * Reads the account of the current session from the server.
 *
 * @returns {Promise<Object|null>} The session user, or null when there is no valid session.
 * @throws {Error} When the server cannot be reached or answers with an unexpected status.
 */
export async function fetchCurrentUser() {
  const { status, payload } = await requestAuth("/session");
  if (status === UNAUTHORIZED_STATUS) {
    return null;
  }
  if (status !== 200) {
    throw new Error(`Failed to read session (${status})`);
  }
  return payload.user;
}

/**
 * Authenticates an account by username or email. The server sets the session cookie.
 *
 * @param {string} identifier - Username or email.
 * @param {string} password - Raw password entered by the user.
 * @returns {Promise<{ success: boolean, user?: Object, errorKey?: string }>} Result of login.
 */
export async function login(identifier, password) {
  try {
    const { status, payload } = await requestAuth("/login", {
      method: "POST",
      body: { identifier, password },
    });
    if (status === 200) {
      return { success: true, user: payload.user };
    }
    return { success: false, errorKey: payload.errorKey || SERVICE_UNAVAILABLE_KEY };
  } catch (error) {
    console.error("authService.login", error);
    return { success: false, errorKey: SERVICE_UNAVAILABLE_KEY };
  }
}

/**
 * Registers a new account and starts its session. The server sets the session cookie.
 *
 * @param {Object} userData - Registration fields: username, email, birthDate, gender and password.
 * @returns {Promise<{ success: boolean, user?: Object, errorKey?: string }>} Result of registration.
 */
export async function register(userData) {
  try {
    const { status, payload } = await requestAuth("/register", {
      method: "POST",
      body: userData,
    });
    if (status === 201) {
      return { success: true, user: payload.user };
    }
    return { success: false, errorKey: payload.errorKey || SERVICE_UNAVAILABLE_KEY };
  } catch (error) {
    console.error("authService.register", error);
    return { success: false, errorKey: SERVICE_UNAVAILABLE_KEY };
  }
}

/**
 * Ends the current session on the server and clears its cookie.
 * The local state is cleared by the caller even when the request fails.
 *
 * @returns {Promise<boolean>} Always resolves to true.
 */
export async function logout() {
  try {
    await requestAuth("/logout", { method: "POST" });
  } catch (error) {
    console.error("authService.logout", error);
  }
  return true;
}
