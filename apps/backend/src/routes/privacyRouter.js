const express = require("express");
const { createRequireSession } = require("../auth/authMiddleware");

/**
 * Creates the current account's privacy settings endpoint.
 *
 * @param {{findActiveSessionUser: Function}} authRepository - Session repository.
 * @param {object} followsRepository - Account privacy persistence operations.
 * @returns {import("express").Router} Configured privacy router.
 */
function createPrivacyRouter(authRepository, followsRepository) {
    const router = express.Router();
    const requireSession = createRequireSession(authRepository);

    router.get("/", requireSession, async (req, res, next) => {
        try {
            const isPrivate = await followsRepository.findPrivacy(req.currentUser.id_user);
            if (isPrivate === null) {
                res.status(404).json({ error: "Account not found" });
                return;
            }
            res.status(200).json({ isPrivate });
        } catch (error) {
            next(error);
        }
    });

    router.patch("/", requireSession, async (req, res, next) => {
        try {
            const { isPrivate } = req.body || {};
            if (typeof isPrivate !== "boolean") {
                res.status(400).json({ error: "Invalid privacy setting" });
                return;
            }
            const savedValue = await followsRepository.updatePrivacy(
                req.currentUser.id_user,
                isPrivate
            );
            if (savedValue === null) {
                res.status(404).json({ error: "Account not found" });
                return;
            }
            res.status(200).json({ isPrivate: savedValue });
        } catch (error) {
            next(error);
        }
    });

    return router;
}

module.exports = {
    createPrivacyRouter
};
