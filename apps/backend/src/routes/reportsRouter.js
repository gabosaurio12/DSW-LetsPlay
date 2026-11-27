const express = require("express");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_CONTENT_TYPES = ["POST", "COMMENT", "USER", "COMMUNITY"];
const VALID_REASONS = ["TOXICITY", "INAPPROPRIATE", "SPAM", "SPOILER", "PIRACY", "OTHER"];
const VALID_REPORT_STATUSES = ["PENDING", "IN_REVIEW", "ATTENDED", "CLOSED"];
const VALID_REVIEW_STATUSES = ["IN_REVIEW", "ATTENDED", "CLOSED"];

/**
 * Creates the Express router for content report and moderation endpoints.
 *
 * @param {{
 *   createReport: Function,
 *   findReports: Function,
 *   updateReportStatus: Function,
 *   removeReportedContentAndAttend: Function
 * }} reportRepository - Report repository instance.
 * @returns {import("express").Router} Configured Express router.
 */
function createReportsRouter(reportRepository) {
    const router = express.Router();

    router.get("/", async (req, res) => {
        const { status } = req.query;
        let resolvedStatus;

        if (status !== undefined && status !== "") {
            if (typeof status !== "string" || !VALID_REPORT_STATUSES.includes(status)) {
                res.status(400).json({ error: "Invalid report status" });
                return;
            }
            resolvedStatus = status;
        }

        const reports = await reportRepository.findReports({ status: resolvedStatus });
        res.status(200).json({ reports });
    });

    router.post("/", async (req, res) => {
        const {
            reporterId,
            contentType,
            reportedContentId,
            reason,
            description
        } = req.body || {};

        if (!VALID_CONTENT_TYPES.includes(contentType)) {
            res.status(400).json({ error: "Invalid content type" });
            return;
        }

        if (typeof reportedContentId !== "string" || !UUID_REGEX.test(reportedContentId)) {
            res.status(400).json({ error: "Invalid reported content id" });
            return;
        }

        if (!VALID_REASONS.includes(reason)) {
            res.status(400).json({ error: "Invalid report reason" });
            return;
        }

        if (typeof description !== "string" || description.trim().length === 0) {
            res.status(400).json({ error: "Report description is required" });
            return;
        }

        if (reporterId !== undefined && reporterId !== null && (typeof reporterId !== "string" || !UUID_REGEX.test(reporterId))) {
            res.status(400).json({ error: "Invalid reporter id" });
            return;
        }

        const report = await reportRepository.createReport({
            reporterId: reporterId ?? undefined,
            contentType,
            reportedContentId,
            reason,
            description: description.trim()
        });

        if (!report) {
            res.status(404).json({ error: "Reported content not found" });
            return;
        }

        res.status(201).json({ report });
    });

    router.patch("/:id", async (req, res) => {
        const { id } = req.params;
        if (typeof id !== "string" || !UUID_REGEX.test(id)) {
            res.status(400).json({ error: "Invalid report id" });
            return;
        }

        const { status, reviewComment, reviewerId } = req.body || {};

        if (!VALID_REVIEW_STATUSES.includes(status)) {
            res.status(400).json({ error: "Invalid report status" });
            return;
        }

        if (reviewComment !== undefined && reviewComment !== null && typeof reviewComment !== "string") {
            res.status(400).json({ error: "Invalid review comment" });
            return;
        }

        if (reviewerId !== undefined && reviewerId !== null && (typeof reviewerId !== "string" || !UUID_REGEX.test(reviewerId))) {
            res.status(400).json({ error: "Invalid reviewer id" });
            return;
        }

        const report = await reportRepository.updateReportStatus({
            reportId: id,
            status,
            reviewComment: typeof reviewComment === "string" ? reviewComment.trim() : undefined,
            reviewerId: reviewerId ?? undefined
        });

        if (!report) {
            res.status(404).json({ error: "Report not found" });
            return;
        }

        res.status(200).json({ report });
    });

    router.post("/:id/remove-content", async (req, res) => {
        const { id } = req.params;
        if (typeof id !== "string" || !UUID_REGEX.test(id)) {
            res.status(400).json({ error: "Invalid report id" });
            return;
        }

        const { reviewComment, reviewerId } = req.body || {};

        if (reviewComment !== undefined && reviewComment !== null && typeof reviewComment !== "string") {
            res.status(400).json({ error: "Invalid review comment" });
            return;
        }

        if (reviewerId !== undefined && reviewerId !== null && (typeof reviewerId !== "string" || !UUID_REGEX.test(reviewerId))) {
            res.status(400).json({ error: "Invalid reviewer id" });
            return;
        }

        const report = await reportRepository.removeReportedContentAndAttend({
            reportId: id,
            reviewComment: typeof reviewComment === "string" ? reviewComment.trim() : undefined,
            reviewerId: reviewerId ?? undefined
        });

        if (!report) {
            res.status(404).json({ error: "Report not found" });
            return;
        }

        res.status(200).json({ report, contentRemoved: true });
    });

    return router;
}

module.exports = {
    VALID_CONTENT_TYPES,
    VALID_REASONS,
    VALID_REPORT_STATUSES,
    VALID_REVIEW_STATUSES,
    createReportsRouter
};
