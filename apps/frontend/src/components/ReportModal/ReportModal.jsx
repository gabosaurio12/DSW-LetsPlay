import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation.js";
import {
    createReport,
    REPORT_CONTENT_TYPES,
    REPORT_REASONS,
} from "../../services/reportService.js";
import "./ReportModal.css";

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_EXCERPT_LENGTH = 160;

/**
 * Truncates reported content preview text to keep the modal compact.
 *
 * @param {string|null|undefined} text - Raw post or comment text.
 * @returns {string} Trimmed and optionally ellipsized excerpt.
 */
function formatExcerpt(text) {
    if (typeof text !== "string") {
        return "";
    }
    const normalized = text.trim().replace(/\s+/g, " ");
    if (normalized.length <= MAX_EXCERPT_LENGTH) {
        return normalized;
    }
    return `${normalized.slice(0, MAX_EXCERPT_LENGTH - 1)}…`;
}

/**
 * Reusable moderation report modal aligned with Figma (75:745).
 *
 * @param {Object} props - Component props.
 * @param {boolean} props.isOpen - Whether the modal is visible.
 * @param {Object|null} props.target - Reported content metadata.
 * @param {"POST"|"COMMENT"} [props.target.contentType] - Kind of reported content.
 * @param {string|number} [props.target.reportedContentId] - Identifier of the reported item.
 * @param {string} [props.target.author] - Author display name or handle.
 * @param {string} [props.target.excerpt] - Content snippet shown in the preview box.
 * @param {string} props.language - Active UI language code ("es" | "en").
 * @param {Function} props.onClose - Callback invoked when the modal is dismissed.
 * @param {Function} [props.onSubmitted] - Optional callback invoked after successful submission.
 * @returns {JSX.Element|null} The rendered modal dialog or null when closed.
 */
/**
 * Inner dialog body mounted only while open so form state resets cleanly per target.
 *
 * @param {Object} props - Component props.
 * @returns {JSX.Element} The rendered modal dialog.
 */
function ReportModalContent({ target, language, onClose, onSubmitted }) {
    const translate = useTranslation(language);
    const titleId = useId();
    const reasonId = useId();
    const descriptionId = useId();
    const [reason, setReason] = useState(REPORT_REASONS[0]);
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const submitControllerRef = useRef(null);

    const contentType = target?.contentType ?? REPORT_CONTENT_TYPES.POST;
    const reportedContentId = target?.reportedContentId ?? "";
    const author = target?.author || "?";
    const excerpt = formatExcerpt(target?.excerpt);

    useEffect(() => {
        return () => {
            if (submitControllerRef.current) {
                submitControllerRef.current.abort();
                submitControllerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape" && !isSubmitting) {
                onClose();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isSubmitting, onClose]);

    function handleOverlayClick(event) {
        if (event.target === event.currentTarget && !isSubmitting) {
            onClose();
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        const trimmedDescription = description.trim();
        if (trimmedDescription === "") {
            setSubmitError(translate("report.descriptionRequired"));
            return;
        }

        if (submitControllerRef.current) {
            submitControllerRef.current.abort();
        }
        const controller = new AbortController();
        submitControllerRef.current = controller;

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const report = await createReport(
                {
                    contentType,
                    reportedContentId,
                    reason,
                    description: trimmedDescription,
                },
                { signal: controller.signal },
            );
            setIsSubmitting(false);
            setIsSubmitted(true);
            onSubmitted?.(report);
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }
            setSubmitError(translate("report.submitError"));
            setIsSubmitting(false);
        } finally {
            if (submitControllerRef.current === controller) {
                submitControllerRef.current = null;
            }
        }
    }

    const previewHeader = contentType === REPORT_CONTENT_TYPES.COMMENT
        ? translate("report.previewComment", { author })
        : translate("report.previewPost", { author });

    return (
        <div
            className="report-modal-overlay"
            onClick={handleOverlayClick}
            role="presentation"
        >
            <div
                className="report-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <header className="report-modal-header">
                    <h2 id={titleId} className="report-modal-title">
                        {translate("report.title")}
                    </h2>
                    <button
                        type="button"
                        className="report-modal-close"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label={translate("report.close")}
                    >
                        ✕
                    </button>
                </header>

                <div className="report-modal-preview">
                    <span className="report-modal-preview-meta">{previewHeader}</span>
                    <p className="report-modal-preview-excerpt">
                        {excerpt ? `"${excerpt}"` : translate("report.previewEmpty")}
                    </p>
                </div>

                {isSubmitted ? (
                    <div className="report-modal-success" role="status">
                        <p className="report-modal-success-title">
                            {translate("report.successTitle")}
                        </p>
                        <p className="report-modal-success-message">
                            {translate("report.successMessage")}
                        </p>
                        <div className="report-modal-footer">
                            <button
                                type="button"
                                className="report-modal-btn report-modal-btn--primary"
                                onClick={onClose}
                            >
                                {translate("report.done")}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form className="report-modal-form" onSubmit={handleSubmit}>
                        <div className="report-modal-field">
                            <label htmlFor={reasonId} className="report-modal-label">
                                {translate("report.reasonLabel")}
                            </label>
                            <select
                                id={reasonId}
                                className="report-modal-select"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                disabled={isSubmitting}
                            >
                                {REPORT_REASONS.map((reasonKey) => (
                                    <option key={reasonKey} value={reasonKey}>
                                        {translate(`report.reasons.${reasonKey}`)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="report-modal-field">
                            <label htmlFor={descriptionId} className="report-modal-label">
                                {translate("report.descriptionLabel")}
                            </label>
                            <textarea
                                id={descriptionId}
                                className="report-modal-textarea"
                                rows={3}
                                maxLength={MAX_DESCRIPTION_LENGTH}
                                value={description}
                                placeholder={translate("report.descriptionPlaceholder")}
                                onChange={(event) => {
                                    setDescription(event.target.value);
                                    if (submitError) {
                                        setSubmitError(null);
                                    }
                                }}
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        {submitError && (
                            <p className="report-modal-error" role="alert">
                                {submitError}
                            </p>
                        )}

                        <footer className="report-modal-footer">
                            <button
                                type="button"
                                className="report-modal-btn report-modal-btn--outline"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                {translate("report.cancel")}
                            </button>
                            <button
                                type="submit"
                                className="report-modal-btn report-modal-btn--primary"
                                disabled={isSubmitting || description.trim() === ""}
                            >
                                {isSubmitting
                                    ? translate("report.submitting")
                                    : translate("report.submit")}
                            </button>
                        </footer>
                    </form>
                )}
            </div>
        </div>
    );
}

/**
 * Reusable moderation report modal aligned with Figma (75:745).
 *
 * @param {Object} props - Component props.
 * @param {boolean} props.isOpen - Whether the modal is visible.
 * @param {Object|null} props.target - Reported content metadata.
 * @param {"POST"|"COMMENT"} [props.target.contentType] - Kind of reported content.
 * @param {string|number} [props.target.reportedContentId] - Identifier of the reported item.
 * @param {string} [props.target.author] - Author display name or handle.
 * @param {string} [props.target.excerpt] - Content snippet shown in the preview box.
 * @param {string} props.language - Active UI language code ("es" | "en").
 * @param {Function} props.onClose - Callback invoked when the modal is dismissed.
 * @param {Function} [props.onSubmitted] - Optional callback invoked after successful submission.
 * @returns {JSX.Element|null} The rendered modal dialog or null when closed.
 */
function ReportModal({ isOpen, target, language, onClose, onSubmitted }) {
    if (!isOpen || !target) {
        return null;
    }

    const modalKey = `${target.contentType ?? REPORT_CONTENT_TYPES.POST}-${target.reportedContentId ?? "unknown"}`;

    return (
        <ReportModalContent
            key={modalKey}
            target={target}
            language={language}
            onClose={onClose}
            onSubmitted={onSubmitted}
        />
    );
}

export default ReportModal;
