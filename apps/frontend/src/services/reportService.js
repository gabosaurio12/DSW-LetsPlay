export const REPORT_CONTENT_TYPES = {
    POST: "POST",
    COMMENT: "COMMENT",
};

export const REPORT_STATUSES = {
    PENDING: "PENDING",
    IN_REVIEW: "IN_REVIEW",
    ATTENDED: "ATTENDED",
    CLOSED: "CLOSED",
};

const VALID_REPORT_STATUSES = Object.values(REPORT_STATUSES);

export const REPORT_REASONS = [
    "TOXICITY",
    "INAPPROPRIATE",
    "SPAM",
    "SPOILER",
    "PIRACY",
    "OTHER",
];

/**
 * Normalizes and validates a non-empty identifier before sending to the API.
 *
 * @param {string|number} value - Identifier to normalize.
 * @param {string} errorMessage - Error message if the identifier is empty.
 * @returns {string} Trimmed non-empty identifier.
 */
function normalizeRequiredId(value, errorMessage) {
    const normalized = typeof value === "string"
        ? value.trim()
        : String(value ?? "").trim();
    if (normalized === "") {
        throw new Error(errorMessage);
    }
    return normalized;
}

/**
 * Builds an Error instance from a failed HTTP response, preserving status code.
 *
 * @param {Response} response - Fetch response object.
 * @param {string} fallbackMessage - Fallback message when server returns no details.
 * @returns {Promise<Error>} Error with `.status` attached.
 */
async function buildApiError(response, fallbackMessage) {
    const errorPayload = await response.json().catch(() => null);
    const serverMessage = errorPayload?.error || errorPayload?.message;
    const error = new Error(serverMessage || `${fallbackMessage} (${response.status})`);
    error.status = response.status;
    return error;
}

/**
 * Submits a moderation report for a post or comment to the backend API.
 *
 * @param {Object} payload - Report submission payload.
 * @param {"POST"|"COMMENT"} payload.contentType - Kind of content being reported.
 * @param {string|number} payload.reportedContentId - Identifier of the reported post or comment.
 * @param {string} payload.reason - Selected report_reason enum value.
 * @param {string} payload.description - Additional explanation provided by the user.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Object>} Created report record or API response payload.
 */
export async function createReport(payload = {}, options = {}) {
    const contentType = payload.contentType;
    if (contentType !== REPORT_CONTENT_TYPES.POST && contentType !== REPORT_CONTENT_TYPES.COMMENT) {
        throw new Error("Invalid report content type");
    }

    const reportedContentId = normalizeRequiredId(
        payload.reportedContentId,
        "Reported content id is required"
    );
    const reason = payload.reason;
    if (!REPORT_REASONS.includes(reason)) {
        throw new Error("Invalid report reason");
    }

    const description = typeof payload.description === "string" ? payload.description.trim() : "";
    if (description === "") {
        throw new Error("Report description is required");
    }

    const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contentType,
            reportedContentId,
            reason,
            description,
        }),
        signal: options.signal,
    });

    if (!response.ok) {
        throw await buildApiError(response, "Failed to submit report");
    }

    const data = await response.json().catch(() => ({}));
    return data.report ?? data;
}

/**
 * Fetches moderation reports from the backend API, optionally filtered by a single status.
 *
 * @param {Object} [filters] - Optional query filters.
 * @param {string} [filters.status] - Single report status to filter by.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Array<Object>>} List of report records.
 */
export async function fetchReports(filters = {}, options = {}) {
    const searchParams = new URLSearchParams();
    if (typeof filters.status === "string" && filters.status.trim() !== "") {
        searchParams.set("status", filters.status.trim());
    }

    const queryString = searchParams.toString();
    const url = queryString ? `/api/reports?${queryString}` : "/api/reports";

    const response = await fetch(url, {
        signal: options.signal,
    });

    if (!response.ok) {
        throw await buildApiError(response, "Failed to load reports");
    }

    const data = await response.json().catch(() => ({}));
    return Array.isArray(data) ? data : (data.reports ?? []);
}

/**
 * Updates the moderation status and optional review notes of a report.
 *
 * @param {string|number} reportId - Identifier of the report to update.
 * @param {Object} payload - Status update payload.
 * @param {"PENDING"|"IN_REVIEW"|"ATTENDED"|"CLOSED"} payload.status - Target report status.
 * @param {string} [payload.reviewComment] - Optional internal review notes.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Object>} Updated report record.
 */
export async function updateReportStatus(reportId, payload = {}, options = {}) {
    const normalizedReportId = normalizeRequiredId(reportId, "Report id is required");
    const status = payload.status;
    if (!VALID_REPORT_STATUSES.includes(status)) {
        throw new Error("Invalid report status");
    }

    const reviewComment = typeof payload.reviewComment === "string"
        ? payload.reviewComment.trim()
        : "";

    const response = await fetch(`/api/reports/${encodeURIComponent(normalizedReportId)}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            status,
            reviewComment,
        }),
        signal: options.signal,
    });

    if (!response.ok) {
        throw await buildApiError(response, "Failed to update report status");
    }

    const data = await response.json().catch(() => ({}));
    return data.report ?? data;
}

/**
 * Removes the reported post or comment and marks the report as attended.
 *
 * @param {string|number} reportId - Identifier of the report whose content will be removed.
 * @param {Object} [payload] - Optional review metadata.
 * @param {string} [payload.reviewComment] - Optional internal review notes.
 * @param {Object} [options] - Optional fetch configuration.
 * @param {AbortSignal} [options.signal] - Signal to cancel the request.
 * @returns {Promise<Object>} Updated report or removal confirmation payload.
 */
export async function removeReportedContent(reportId, payload = {}, options = {}) {
    const normalizedReportId = normalizeRequiredId(reportId, "Report id is required");
    const reviewComment = typeof payload.reviewComment === "string"
        ? payload.reviewComment.trim()
        : "";

    const response = await fetch(
        `/api/reports/${encodeURIComponent(normalizedReportId)}/remove-content`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                reviewComment,
            }),
            signal: options.signal,
        }
    );

    if (!response.ok) {
        throw await buildApiError(response, "Failed to remove reported content");
    }

    const data = await response.json().catch(() => ({}));
    return data.report ?? data;
}
