const STORAGE_KEY_CURRENT_USER = "letsPlay.currentUser";
const STORAGE_KEY_REGISTERED_USERS = "letsPlay.registeredUsers";

/**
 * Default mock user to allow instant testing without prior registration.
 */
const DEFAULT_USERS = [
  {
    id: "usr-001",
    username: "seth_play",
    email: "correo@ejemplo.com",
    password: "password123",
    birthDate: "2000-01-01",
    gender: "male",
  },
];

/**
 * Loads registered users from local storage, falling back to default seed users.
 *
 * @returns {Array<Object>} List of users stored locally.
 */
function getStoredUsers() {
  try {
    const rawData = window.localStorage.getItem(STORAGE_KEY_REGISTERED_USERS);
    if (!rawData) {
      window.localStorage.setItem(STORAGE_KEY_REGISTERED_USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : DEFAULT_USERS;
  } catch {
    // If local storage is disabled or corrupted, fall back to in-memory defaults.
    return DEFAULT_USERS;
  }
}

/**
 * Saves the updated list of users to local storage.
 *
 * @param {Array<Object>} users - The list of users to persist.
 */
function saveStoredUsers(users) {
  try {
    window.localStorage.setItem(STORAGE_KEY_REGISTERED_USERS, JSON.stringify(users));
  } catch {
    // Gracefully handle storage errors (e.g. quota exceeded or incognito mode).
  }
}

/**
 * Retrieves the currently authenticated user from local storage.
 *
 * @returns {Object|null} The active user session, or null if logged out.
 */
export function getCurrentUser() {
  try {
    const rawData = window.localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (!rawData) {
      return null;
    }
    const user = JSON.parse(rawData);
    return user && typeof user === "object" && user.username ? user : null;
  } catch {
    return null;
  }
}

/**
 * Authenticates a user against local records by email or username.
 *
 * @param {string} identifier - Email or username.
 * @param {string} password - Raw password entered by user.
 * @returns {Promise<{ success: boolean, user?: Object, errorKey?: string }>} Result of login.
 */
export async function login(identifier, password) {
  const users = getStoredUsers();
  const trimmedId = identifier.trim().toLowerCase();

  const user = users.find((u) => {
    const matchUsername = u.username.toLowerCase() === trimmedId;
    const matchEmail = u.email.toLowerCase() === trimmedId;
    return (matchUsername || matchEmail) && u.password === password;
  });

  if (!user) {
    return { success: false, errorKey: "invalidCredentials" };
  }

  // Sanitize password before writing to session state.
  const sessionUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    birthDate: user.birthDate,
    gender: user.gender,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));
  } catch {
    // Storage issue, but login can still succeed in memory.
  }

  return { success: true, user: sessionUser };
}

/**
 * Registers a new user account and starts their active session.
 *
 * @param {Object} userData - Registration fields.
 * @returns {Promise<{ success: boolean, user?: Object, errorKey?: string }>} Result of registration.
 */
export async function register(userData) {
  const users = getStoredUsers();
  const cleanUsername = userData.username.trim();
  const cleanEmail = userData.email.trim().toLowerCase();

  const exists = users.some((u) => (
    u.username.toLowerCase() === cleanUsername.toLowerCase()
    || u.email.toLowerCase() === cleanEmail
  ));

  if (exists) {
    return { success: false, errorKey: "userExists" };
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    username: cleanUsername,
    email: cleanEmail,
    birthDate: userData.birthDate,
    gender: userData.gender,
    password: userData.password,
  };

  users.push(newUser);
  saveStoredUsers(users);

  const sessionUser = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    birthDate: newUser.birthDate,
    gender: newUser.gender,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));
  } catch {
    // Fallback if local storage fails.
  }

  return { success: true, user: sessionUser };
}

/**
 * Clears the active session from local storage to log out.
 *
 * @returns {Promise<boolean>} Always resolves to true.
 */
export async function logout() {
  try {
    window.localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
  } catch {
    // Storage removal error can be ignored safely.
  }
  return true;
}

/**
 * Resets a user's password when given a valid email and 6-digit verification code.
 *
 * @param {string} email - Account email.
 * @param {string} code - Verification code (mocked as 6 digits).
 * @param {string} newPassword - New password to set.
 * @returns {Promise<{ success: boolean, errorKey?: string }>} Result of password reset.
 */
export async function recoverPassword(email, code, newPassword) {
  const users = getStoredUsers();
  const cleanEmail = email.trim().toLowerCase();

  const userIndex = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  if (userIndex === -1) {
    return { success: false, errorKey: "userNotFound" };
  }

  // Update password in local records
  users[userIndex].password = newPassword;
  saveStoredUsers(users);

  return { success: true };
}
