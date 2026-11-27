const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_UPLOAD_SIZE = "5mb";

/**
 * Detects the image format by inspecting magic bytes rather than trusting headers.
 *
 * @param {Buffer} buffer - Raw file bytes.
 * @returns {{ ext: string, mime: string } | null} Detected image metadata or null if unsupported.
 */
function detectImageType(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return null;
    }

    if (
        buffer.length >= PNG_SIGNATURE.length
        && PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)
    ) {
        return { ext: "png", mime: "image/png" };
    }

    if (
        buffer.length >= 3
        && buffer[0] === 0xff
        && buffer[1] === 0xd8
        && buffer[2] === 0xff
    ) {
        return { ext: "jpg", mime: "image/jpeg" };
    }

    if (buffer.length >= 6) {
        const gifHeader = buffer.subarray(0, 6).toString("ascii");
        if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
            return { ext: "gif", mime: "image/gif" };
        }
    }

    if (
        buffer.length >= 12
        && buffer.subarray(0, 4).toString("ascii") === "RIFF"
        && buffer.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
        return { ext: "webp", mime: "image/webp" };
    }

    return null;
}

/**
 * Creates the Express router for secure image upload endpoints.
 *
 * @param {{ uploadDir: string }} options - Router configuration.
 * @returns {import("express").Router} Configured Express router.
 */
function createUploadsRouter({ uploadDir }) {
    const router = express.Router();

    router.post(
        "/image",
        express.raw({ type: "*/*", limit: MAX_UPLOAD_SIZE }),
        (req, res) => {
            if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
                res.status(400).json({ error: "Image file is required" });
                return;
            }

            const detected = detectImageType(req.body);
            if (!detected) {
                res.status(400).json({
                    error: "Unsupported or invalid image file. Allowed: PNG, JPEG, WEBP, GIF"
                });
                return;
            }

            const filename = `${crypto.randomUUID()}.${detected.ext}`;
            fs.mkdirSync(uploadDir, { recursive: true });
            fs.writeFileSync(path.join(uploadDir, filename), req.body);

            res.status(201).json({ imageUrl: `/uploads/${filename}` });
        }
    );

    return router;
}

module.exports = {
    detectImageType,
    createUploadsRouter
};
