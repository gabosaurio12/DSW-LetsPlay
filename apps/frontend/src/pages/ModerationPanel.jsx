import { useEffect, useState } from "react";
import { useTranslation } from "../hooks/useTranslation.js";
import {
    fetchReports,
    removeReportedContent,
    REPORT_CONTENT_TYPES,
    REPORT_STATUSES,
    updateReportStatus,
} from "../services/reportService.js";
import "./ModerationPanel.css";

const TABS = {
    PENDING: "pending",
    HISTORY: "history",
};

const TAB_STATUS_FILTERS = {
    [TABS.PENDING]: [REPORT_STATUSES.PENDING, REPORT_STATUSES.IN_REVIEW],
    [TABS.HISTORY]: [REPORT_STATUSES.ATTENDED, REPORT_STATUSES.CLOSED],
};

/**
 * Normalizes a report record from either snake_case or camelCase API payloads.
 *
 * @param {Object} raw - Raw report object from API.
 * @returns {Object} Normalized report object for UI rendering.
 */
function normalizeReport(raw) {
    const id = raw?.id_report ?? raw?.id ?? "";
    const contentType = raw?.content_type ?? raw?.contentType ?? "POST";
    const status = raw?.status ?? REPORT_STATUSES.PENDING;
    const reason = raw?.reason ?? "OTHER";
    const description = raw?.description ?? "";
    const reviewComment = raw?.review_comment ?? raw?.reviewComment ?? "";
    const createdAt = raw?.created_at ?? raw?.createdAt ?? null;
    const reporterName =
        raw?.reporter_display_name ??
        raw?.reporter_username ??
        raw?.reporter_name ??
        raw?.reporterName ??
        raw?.id_reporter ??
        raw?.reporterId ??
        "";
    const reviewerName =
        raw?.reviewer_display_name ??
        raw?.reviewer_username ??
        raw?.reviewer_name ??
        raw?.reviewerName ??
        "";
    const reportedContent = raw?.reported_content ?? raw?.reportedContent ?? null;
    const contentPreview =
        raw?.reported_content_preview ??
        raw?.content_preview ??
        raw?.contentPreview ??
        reportedContent?.content ??
        reportedContent?.title ??
        reportedContent?.description ??
        "";
    const contentAuthor =
        raw?.content_author ??
        raw?.contentAuthor ??
        reportedContent?.author_name ??
        reportedContent?.authorName ??
        "";
    const contentStatus =
        raw?.reported_content_status ??
        raw?.content_status ??
        raw?.contentStatus ??
        reportedContent?.status ??
        "UNKNOWN";

    return {
        id: String(id),
        contentType,
        status,
        reason,
        description,
        reviewComment,
        createdAt,
        reporterName,
        reviewerName,
        contentPreview,
        contentAuthor,
        contentStatus,
    };
}

/**
 * Formats a short readable report identifier (e.g. "#R-1A2B3C").
 *
 * @param {string} reportId - Full report UUID or identifier.
 * @returns {string} Short display identifier.
 */
function formatShortReportId(reportId) {
    if (!reportId) {
        return "#R-000";
    }
    if (reportId.startsWith("#")) {
        return reportId;
    }
    return `#R-${reportId.slice(0, 6).toUpperCase()}`;
}

/**
 * Formats an ISO timestamp into a localized short date/time string.
 *
 * @param {string|null} isoDate - Date string from API.
 * @param {string} language - Active UI language code.
 * @returns {string} Formatted date string or empty string if unavailable.
 */
function formatDate(isoDate, language) {
    if (!isoDate) {
        return "";
    }
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }
    const locale = language === "en" ? "en-US" : "es-MX";
    return parsed.toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

/**
 * Returns the CSS modifier class for a report status pill.
 *
 * @param {string} status - Report status enum value.
 * @returns {string} CSS class name for the status pill.
 */
function getStatusPillClass(status) {
    if (status === REPORT_STATUSES.ATTENDED) {
        return "mod-status-pill mod-status-pill--attended";
    }
    if (status === REPORT_STATUSES.CLOSED) {
        return "mod-status-pill mod-status-pill--closed";
    }
    return "mod-status-pill";
}

/**
 * Moderation and administration panel aligned with Figma node 75:766.
 * Displays pending reports and action history in a two-column split view
 * with internal review notes, status updates, and inline content removal.
 *
 * @param {Object} props - Component props.
 * @param {string} props.language - Active i18n language code ("es" or "en").
 * @returns {JSX.Element} Rendered moderation panel.
 */
export default function ModerationPanel({ language }) {
    const translate = useTranslation(language);
    const [activeTab, setActiveTab] = useState(TABS.PENDING);
    const [allReports, setAllReports] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reviewComment, setReviewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [hasLoadError, setHasLoadError] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [reloadToken, setReloadToken] = useState(0);
    const [submittingAction, setSubmittingAction] = useState("");
    const [confirmingRemove, setConfirmingRemove] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    useEffect(() => {
        const controller = new AbortController();

        async function loadReports() {
            setLoading(true);
            setHasLoadError(false);
            setLoadError("");

            try {
                const rawReports = await fetchReports({}, { signal: controller.signal });
                const normalized = rawReports.map(normalizeReport);
                setAllReports(normalized);
                setConfirmingRemove(false);
            } catch (error) {
                if (error.name === "AbortError") {
                    return;
                }
                setHasLoadError(true);
                setLoadError(error.message || "");
                setAllReports([]);
                setSelectedReportId(null);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadReports();

        return () => controller.abort();
    }, [reloadToken]);

    const pendingReports = allReports.filter((item) =>
        TAB_STATUS_FILTERS[TABS.PENDING].includes(item.status)
    );
    const historyReports = allReports.filter((item) =>
        TAB_STATUS_FILTERS[TABS.HISTORY].includes(item.status)
    );
    const reports = activeTab === TABS.PENDING ? pendingReports : historyReports;

    const selectedReport =
        reports.find((item) => item.id === selectedReportId) || reports[0] || null;
    const effectiveSelectedId = selectedReport ? selectedReport.id : null;
    const effectiveReviewComment =
        selectedReport && selectedReport.id !== selectedReportId
            ? selectedReport.reviewComment || ""
            : reviewComment;

    function handleTabChange(nextTab) {
        if (nextTab === activeTab) {
            return;
        }
        const nextReports = nextTab === TABS.PENDING ? pendingReports : historyReports;
        const nextFirst = nextReports[0] || null;
        setActiveTab(nextTab);
        setSelectedReportId(nextFirst ? nextFirst.id : null);
        setReviewComment(nextFirst ? nextFirst.reviewComment || "" : "");
        setFeedback({ type: "", message: "" });
        setConfirmingRemove(false);
    }

    function handleSelectReport(report) {
        setSelectedReportId(report.id);
        setReviewComment(report.reviewComment || "");
        setConfirmingRemove(false);
        setFeedback({ type: "", message: "" });
    }

    async function handleStatusUpdate(targetStatus) {
        if (!selectedReport || submittingAction) {
            return;
        }
        setSubmittingAction(targetStatus);
        setFeedback({ type: "", message: "" });

        try {
            const updatedRaw = await updateReportStatus(selectedReport.id, {
                status: targetStatus,
                reviewComment: effectiveReviewComment,
            });
            const updated = normalizeReport({
                ...selectedReport,
                ...updatedRaw,
                status: updatedRaw?.status || targetStatus,
                reviewComment: effectiveReviewComment,
            });
            setAllReports((prev) => {
                const nextAll = prev.map((item) => (item.id === updated.id ? updated : item));
                const nextInTab = nextAll.filter((item) =>
                    TAB_STATUS_FILTERS[activeTab].includes(item.status)
                );
                const stillInTab = nextInTab.find((item) => item.id === updated.id);
                const nextSelected = stillInTab || nextInTab[0] || null;
                setSelectedReportId(nextSelected ? nextSelected.id : null);
                setReviewComment(nextSelected ? nextSelected.reviewComment || "" : "");
                return nextAll;
            });
            setConfirmingRemove(false);
            setFeedback({
                type: "success",
                message: translate("moderation.detail.statusUpdated"),
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message: error.message || translate("moderation.detail.actionError"),
            });
        } finally {
            setSubmittingAction("");
        }
    }

    async function handleConfirmRemoveContent() {
        if (!selectedReport || submittingAction) {
            return;
        }
        setSubmittingAction("REMOVE");
        setFeedback({ type: "", message: "" });

        try {
            const updatedRaw = await removeReportedContent(selectedReport.id, {
                reviewComment: effectiveReviewComment,
            });
            const updatedStatus = updatedRaw?.status || REPORT_STATUSES.ATTENDED;
            const updated = normalizeReport({
                ...selectedReport,
                ...updatedRaw,
                status: updatedStatus,
                reported_content_status: "REMOVED",
                reviewComment: effectiveReviewComment,
            });
            setAllReports((prev) => {
                const nextAll = prev.map((item) => (item.id === updated.id ? updated : item));
                const nextInTab = nextAll.filter((item) =>
                    TAB_STATUS_FILTERS[activeTab].includes(item.status)
                );
                const stillInTab = nextInTab.find((item) => item.id === updated.id);
                const nextSelected = stillInTab || nextInTab[0] || null;
                setSelectedReportId(nextSelected ? nextSelected.id : null);
                setReviewComment(nextSelected ? nextSelected.reviewComment || "" : "");
                return nextAll;
            });
            setConfirmingRemove(false);
            setFeedback({
                type: "success",
                message: translate("moderation.detail.contentRemoved"),
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message: error.message || translate("moderation.detail.actionError"),
            });
        } finally {
            setSubmittingAction("");
        }
    }

    function getContentTypeLabel(contentType) {
        return translate(`moderation.contentTypes.${contentType}`) || contentType;
    }

    function getStatusLabel(status) {
        return translate(`moderation.statuses.${status}`) || status;
    }

    function getReasonLabel(reason) {
        return translate(`report.reasons.${reason}`) || reason;
    }

    function getContentStatusLabel(contentStatus) {
        const key = String(contentStatus || "UNKNOWN").toUpperCase();
        return translate(`moderation.contentStatuses.${key}`) || contentStatus;
    }

    const inboxTitle = activeTab === TABS.PENDING
        ? translate("moderation.inbox.pendingTitle", { count: reports.length })
        : translate("moderation.inbox.historyTitle", { count: reports.length });

    const canRemoveSelected = Boolean(
        selectedReport &&
        (selectedReport.contentType === REPORT_CONTENT_TYPES.POST ||
            selectedReport.contentType === REPORT_CONTENT_TYPES.COMMENT) &&
        !["REMOVED", "DELETED"].includes(String(selectedReport.contentStatus).toUpperCase())
    );

    const isContentRemoved = Boolean(
        selectedReport &&
        ["REMOVED", "DELETED"].includes(String(selectedReport.contentStatus).toUpperCase())
    );

    return (
        <section className="mod-page" aria-labelledby="moderation-panel-title">
            <header className="mod-header">
                <h1 id="moderation-panel-title" className="mod-title">
                    {translate("moderation.title")}
                </h1>
                <p className="mod-subtitle">
                    {translate("moderation.subtitle")}
                </p>
            </header>

            <div className="mod-tabs" role="tablist" aria-label={translate("moderation.tabsLabel")}>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === TABS.PENDING}
                    className={`mod-tab${activeTab === TABS.PENDING ? " mod-tab--active" : ""}`}
                    onClick={() => handleTabChange(TABS.PENDING)}
                >
                    {`${translate("moderation.tabs.pending")} (${pendingReports.length})`}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === TABS.HISTORY}
                    className={`mod-tab${activeTab === TABS.HISTORY ? " mod-tab--active" : ""}`}
                    onClick={() => handleTabChange(TABS.HISTORY)}
                >
                    {`${translate("moderation.tabs.history")} (${historyReports.length})`}
                </button>
            </div>

            <div className="mod-split">
                <div className="mod-card">
                    <h2 className="mod-card-title">{inboxTitle}</h2>

                    {loading ? (
                        <div className="mod-state-box" role="status" aria-live="polite">
                            <p className="mod-state-message">{translate("moderation.inbox.loading")}</p>
                        </div>
                    ) : hasLoadError ? (
                        <div className="mod-state-box" role="alert">
                            <p className="mod-state-title">{translate("moderation.inbox.errorTitle")}</p>
                            <p className="mod-state-message">
                                {loadError || translate("moderation.inbox.errorMessage")}
                            </p>
                            <button
                                type="button"
                                className="mod-btn mod-btn--primary"
                                onClick={() => setReloadToken((prev) => prev + 1)}
                            >
                                {translate("moderation.inbox.retry")}
                            </button>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="mod-state-box">
                            <p className="mod-state-title">
                                {activeTab === TABS.PENDING
                                    ? translate("moderation.inbox.emptyPendingTitle")
                                    : translate("moderation.inbox.emptyHistoryTitle")}
                            </p>
                            <p className="mod-state-message">
                                {activeTab === TABS.PENDING
                                    ? translate("moderation.inbox.emptyPendingMessage")
                                    : translate("moderation.inbox.emptyHistoryMessage")}
                            </p>
                        </div>
                    ) : (
                        <div className="mod-inbox-list">
                            {reports.map((report) => {
                                const isSelected = report.id === effectiveSelectedId;
                                const shortId = formatShortReportId(report.id);
                                return (
                                    <button
                                        key={report.id}
                                        type="button"
                                        aria-pressed={isSelected}
                                        className={`mod-report-item${isSelected ? " mod-report-item--selected" : ""}`}
                                        onClick={() => handleSelectReport(report)}
                                    >
                                        <div className="mod-report-item-top">
                                            <span className="mod-report-item-id">
                                                {`${shortId} · ${getContentTypeLabel(report.contentType)}`}
                                            </span>
                                            <span className={getStatusPillClass(report.status)}>
                                                {getStatusLabel(report.status)}
                                            </span>
                                        </div>
                                        <p className="mod-report-item-reason">
                                            {translate("moderation.inbox.reasonLabel", {
                                                reason: getReasonLabel(report.reason),
                                            })}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mod-card mod-card--detail">
                    {!selectedReport ? (
                        <div className="mod-state-box">
                            <p className="mod-state-message">
                                {translate("moderation.detail.emptySelection")}
                            </p>
                        </div>
                    ) : (
                        <>
                            <h2 className="mod-card-title">
                                {translate("moderation.detail.heading", {
                                    id: formatShortReportId(selectedReport.id),
                                })}
                            </h2>

                            <p className="mod-detail-meta">
                                {activeTab === TABS.PENDING
                                    ? translate("moderation.detail.statusFlow", {
                                        status: getStatusLabel(selectedReport.status),
                                    })
                                    : translate("moderation.detail.statusCurrent", {
                                        status: getStatusLabel(selectedReport.status),
                                    })}
                            </p>

                            <div className="mod-detail-info-row">
                                <span>
                                    {translate("moderation.detail.reasonLabel", {
                                        reason: getReasonLabel(selectedReport.reason),
                                    })}
                                </span>
                                {selectedReport.reporterName && (
                                    <span>
                                        {translate("moderation.detail.reporterLabel", {
                                            reporter: selectedReport.reporterName,
                                        })}
                                    </span>
                                )}
                                {selectedReport.createdAt && (
                                    <span>
                                        {translate("moderation.detail.reportedAt", {
                                            date: formatDate(selectedReport.createdAt, language),
                                        })}
                                    </span>
                                )}
                            </div>

                            {selectedReport.description && (
                                <div className="mod-detail-block">
                                    <span className="mod-detail-label">
                                        {translate("moderation.detail.reportDescriptionLabel")}
                                    </span>
                                    <p className="mod-detail-description">{selectedReport.description}</p>
                                </div>
                            )}

                            <div className="mod-detail-block">
                                <span className="mod-detail-label">
                                    {translate("moderation.detail.previewTitle")}
                                </span>
                                <div className="mod-preview-box">
                                    <div className="mod-preview-header">
                                        <span className="mod-preview-type">
                                            {getContentTypeLabel(selectedReport.contentType)}
                                        </span>
                                        <span
                                            className={`mod-preview-status${isContentRemoved ? " mod-preview-status--removed" : ""}`}
                                        >
                                            {translate("moderation.detail.contentStatusLabel", {
                                                status: getContentStatusLabel(selectedReport.contentStatus),
                                            })}
                                        </span>
                                    </div>
                                    {selectedReport.contentAuthor && (
                                        <p className="mod-preview-author">
                                            {translate("moderation.detail.previewAuthor", {
                                                author: selectedReport.contentAuthor,
                                            })}
                                        </p>
                                    )}
                                    <p className="mod-preview-text">
                                        {selectedReport.contentPreview || translate("moderation.detail.noPreview")}
                                    </p>
                                </div>
                            </div>

                            <div className="mod-detail-block">
                                <label htmlFor="mod-review-notes" className="mod-detail-label">
                                    {translate("moderation.detail.notesLabel")}
                                </label>
                                <textarea
                                    id="mod-review-notes"
                                    className="mod-notes-textarea"
                                    value={effectiveReviewComment}
                                    onChange={(event) => {
                                        if (selectedReport && selectedReport.id !== selectedReportId) {
                                            setSelectedReportId(selectedReport.id);
                                        }
                                        setReviewComment(event.target.value);
                                    }}
                                    placeholder={translate("moderation.detail.notesPlaceholder")}
                                    disabled={Boolean(submittingAction)}
                                />
                            </div>

                            {feedback.message && (
                                <p
                                    className={`mod-feedback mod-feedback--${feedback.type}`}
                                    role={feedback.type === "error" ? "alert" : "status"}
                                >
                                    {feedback.message}
                                </p>
                            )}

                            {confirmingRemove && (
                                <div className="mod-confirm-box" role="alertdialog" aria-label={translate("moderation.detail.removeContent")}>
                                    <p className="mod-confirm-text">
                                        {translate("moderation.detail.confirmRemovePrompt")}
                                    </p>
                                    <div className="mod-actions">
                                        <button
                                            type="button"
                                            className="mod-btn mod-btn--danger-solid"
                                            disabled={Boolean(submittingAction)}
                                            onClick={handleConfirmRemoveContent}
                                        >
                                            {submittingAction === "REMOVE"
                                                ? translate("moderation.detail.removing")
                                                : translate("moderation.detail.confirmRemove")}
                                        </button>
                                        <button
                                            type="button"
                                            className="mod-btn mod-btn--outline"
                                            disabled={Boolean(submittingAction)}
                                            onClick={() => setConfirmingRemove(false)}
                                        >
                                            {translate("moderation.detail.cancelRemove")}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="mod-actions">
                                <button
                                    type="button"
                                    className="mod-btn mod-btn--tinted"
                                    disabled={
                                        Boolean(submittingAction) ||
                                        selectedReport.status === REPORT_STATUSES.IN_REVIEW
                                    }
                                    onClick={() => handleStatusUpdate(REPORT_STATUSES.IN_REVIEW)}
                                >
                                    {submittingAction === REPORT_STATUSES.IN_REVIEW
                                        ? translate("moderation.detail.saving")
                                        : translate("moderation.detail.markInReview")}
                                </button>
                                <button
                                    type="button"
                                    className="mod-btn mod-btn--primary"
                                    disabled={
                                        Boolean(submittingAction) ||
                                        selectedReport.status === REPORT_STATUSES.CLOSED
                                    }
                                    onClick={() => handleStatusUpdate(REPORT_STATUSES.CLOSED)}
                                >
                                    {submittingAction === REPORT_STATUSES.CLOSED
                                        ? translate("moderation.detail.saving")
                                        : translate("moderation.detail.saveAndClose")}
                                </button>
                                {canRemoveSelected && !confirmingRemove && (
                                    <button
                                        type="button"
                                        className="mod-btn mod-btn--danger"
                                        disabled={Boolean(submittingAction)}
                                        onClick={() => setConfirmingRemove(true)}
                                    >
                                        {translate("moderation.detail.removeContent")}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
