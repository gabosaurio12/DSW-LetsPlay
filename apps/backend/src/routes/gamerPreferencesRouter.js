const express = require("express");
const { createRequireSession } = require("../auth/authMiddleware");
const {
    parseGamerPreferenceSelection,
    toStoredPreferences,
    fromStoredPreferences
} = require("../gamerPreferenceCatalog");

/**
 * Creates the Express router for the signed-in account's gamer preferences.
 * Every route works only on the account of the session, never on an id sent by the client.
 *
 * @param {{ findActiveSessionUser: Function }} authRepository - Auth repository instance.
 * @param {{ findGamerPreferencesByUserId: Function, upsertGamerPreferences: Function }} gamerPreferencesRepository - Preferences repository instance.
 * @returns {import("express").Router} Configured Express router.
 */
function createGamerPreferencesRouter(authRepository, gamerPreferencesRepository) {
    const router = express.Router();
    const requireSession = createRequireSession(authRepository);

    router.get("/", requireSession, async (req, res, next) => {
        try {
            const row = await gamerPreferencesRepository.findGamerPreferencesByUserId(req.currentUser.id_user);
            const preferences = row === null ? null : fromStoredPreferences(row);
            res.status(200).json({ preferences });
        } catch (error) {
            next(error);
        }
    });

    router.put("/", requireSession, async (req, res, next) => {
        try {
            const selection = parseGamerPreferenceSelection(req.body);
            if (selection === null) {
                res.status(400).json({ error: "Invalid gamer preferences" });
                return;
            }
            await gamerPreferencesRepository.upsertGamerPreferences(
                req.currentUser.id_user,
                toStoredPreferences(selection)
            );
            res.status(200).json({ preferences: selection });
        } catch (error) {
            next(error);
        }
    });

    return router;
}

module.exports = {
    createGamerPreferencesRouter
};
