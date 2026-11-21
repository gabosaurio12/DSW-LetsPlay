import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation.js";
import { createPostComment, fetchPostComments } from "../../services/commentService.js";
import { REPORT_CONTENT_TYPES } from "../../services/reportService.js";
import ReportModal from "../ReportModal/ReportModal.jsx";
import "./PostComments.css";

const MAX_COMMENT_LENGTH = 500;

/**
 * Computes up to two uppercase initials from an author name for avatar fallback.
 *
 * @param {string} name - Author display name or username.
 * @returns {string} One or two uppercase initials.
 */
function getAuthorInitials(name) {
    if (typeof name !== "string" || name.trim() === "") {
        return "?";
    }
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

/**
 * Formats an ISO timestamp into a localized medium date string.
 *
 * @param {string|null|undefined} isoDate - Timestamp string from the API.
 * @param {string} language - Active UI language code.
 * @returns {string|null} Formatted date or null if unavailable/invalid.
 */
function formatCommentDate(isoDate, language) {
    if (!isoDate) {
        return null;
    }
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(parsed);
}

/**
 * Modular, reusable comment thread and composer for any post.
 *
 * @param {Object} props - Component props.
 * @param {string} props.postId - Post identifier.
 * @param {string} props.language - Active UI language code ("es" | "en").
 * @param {boolean} props.isOpen - Whether the comment thread is expanded.
 * @param {Function} [props.onCommentAdded] - Callback invoked with the new comment after creation.
 * @param {Function} [props.onReportComment] - Optional external handler when reporting a comment.
 * @returns {JSX.Element|null} The rendered comment thread and form, or null when closed.
 */
function PostComments({ postId, language, isOpen, onCommentAdded, onReportComment }) {
    const translate = useTranslation(language);
    const textareaId = useId();
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [retryCounter, setRetryCounter] = useState(0);
    const [revealedSpoilers, setRevealedSpoilers] = useState({});
    const [openMenuCommentId, setOpenMenuCommentId] = useState(null);
    const [reportTarget, setReportTarget] = useState(null);
    const [content, setContent] = useState("");
    const [isSpoiler, setIsSpoiler] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const loadedPostIdRef = useRef(null);
    const lastRetryRef = useRef(0);
    const submitControllerRef = useRef(null);

    useEffect(() => {
        if (openMenuCommentId === null) {
            return undefined;
        }

        function handleOutsideClick(event) {
            if (!event.target.closest?.(".post-comments-menu-wrapper")) {
                setOpenMenuCommentId(null);
            }
        }

        function handleEscapeKey(event) {
            if (event.key === "Escape") {
                setOpenMenuCommentId(null);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("keydown", handleEscapeKey);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            window.removeEventListener("keydown", handleEscapeKey);
        };
    }, [openMenuCommentId]);

    useEffect(() => {
        return () => {
            if (submitControllerRef.current) {
                submitControllerRef.current.abort();
                submitControllerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!isOpen || !postId) {
            return undefined;
        }

        const shouldFetch = loadedPostIdRef.current !== postId
            || retryCounter !== lastRetryRef.current;
        if (!shouldFetch) {
            return undefined;
        }

        const controller = new AbortController();

        async function loadComments() {
            if (loadedPostIdRef.current !== postId) {
                setComments([]);
                setRevealedSpoilers({});
            }
            lastRetryRef.current = retryCounter;
            setIsLoading(true);
            setHasError(false);

            try {
                const items = await fetchPostComments(postId, { signal: controller.signal });
                setComments(items);
                loadedPostIdRef.current = postId;
                setIsLoading(false);
            } catch (error) {
                if (error?.name === "AbortError") {
                    return;
                }
                setHasError(true);
                setIsLoading(false);
            }
        }

        loadComments();

        return () => {
            controller.abort();
        };
    }, [isOpen, postId, retryCounter]);

    if (!isOpen) {
        return null;
    }

    function handleRetry() {
        setRetryCounter((prev) => prev + 1);
    }

    function handleToggleSpoiler(commentId) {
        setRevealedSpoilers((prev) => ({
            ...prev,
            [commentId]: !prev[commentId],
        }));
    }

    function handleToggleMenu(commentId) {
        setOpenMenuCommentId((prev) => (prev === commentId ? null : commentId));
    }

    function handleReportClick(comment, commentId, commentAuthor) {
        setOpenMenuCommentId(null);
        if (onReportComment) {
            onReportComment(comment);
            return;
        }
        setReportTarget({
            contentType: REPORT_CONTENT_TYPES.COMMENT,
            reportedContentId: commentId,
            author: commentAuthor,
            excerpt: comment.content || "",
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const trimmedContent = content.trim();
        if (trimmedContent === "" || isSubmitting) {
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
            const createdComment = await createPostComment(
                postId,
                { content: trimmedContent, isSpoiler },
                { signal: controller.signal },
            );
            setComments((prev) => [...prev, createdComment]);
            loadedPostIdRef.current = postId;
            setHasError(false);
            setContent("");
            setIsSpoiler(false);
            setIsSubmitting(false);
            onCommentAdded?.(createdComment);
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }
            setSubmitError(translate("comments.submitError"));
            setIsSubmitting(false);
        } finally {
            if (submitControllerRef.current === controller) {
                submitControllerRef.current = null;
            }
        }
    }

    const isSubmitDisabled = content.trim() === "" || isSubmitting;

    return (
        <section className="post-comments" aria-label={translate("comments.listLabel")}>
            {isLoading && (
                <p className="post-comments-status" role="status">
                    {translate("comments.loading")}
                </p>
            )}

            {!isLoading && hasError && (
                <div className="post-comments-error" role="alert">
                    <span>{translate("comments.error")}</span>
                    <button
                        type="button"
                        className="post-comments-retry"
                        onClick={handleRetry}
                    >
                        {translate("comments.retry")}
                    </button>
                </div>
            )}

            {!isLoading && !hasError && comments.length === 0 && (
                <p className="post-comments-status">
                    {translate("comments.empty")}
                </p>
            )}

            {!isLoading && !hasError && comments.length > 0 && (
                <ul className="post-comments-list">
                    {comments.map((comment, index) => {
                        const commentId = comment.id_comment ?? comment.id ?? `comment-${index}`;
                        const commentAuthor = comment.author_display_name
                            || comment.author_username
                            || "?";
                        const commentDate = formatCommentDate(comment.created_at, language);
                        const hideSpoiler = Boolean(comment.is_spoiler) && !revealedSpoilers[commentId];
                        const isMenuOpen = openMenuCommentId === commentId;

                        return (
                            <li key={commentId} className="post-comments-item">
                                <div className="post-comments-avatar" aria-hidden="true">
                                    {getAuthorInitials(commentAuthor)}
                                </div>
                                <div className="post-comments-content-col">
                                    <div className="post-comments-header-row">
                                        <div className="post-comments-meta">
                                            <span className="post-comments-author">{commentAuthor}</span>
                                            {comment.author_username && (
                                                <span className="post-comments-handle">
                                                    @{comment.author_username}
                                                </span>
                                            )}
                                            {commentDate && (
                                                <span className="post-comments-date">· {commentDate}</span>
                                            )}
                                        </div>
                                        <div className="post-comments-menu-wrapper">
                                            <button
                                                type="button"
                                                className="post-comments-menu-trigger"
                                                aria-haspopup="menu"
                                                aria-expanded={isMenuOpen}
                                                aria-label={translate("report.moreOptions")}
                                                onClick={() => handleToggleMenu(commentId)}
                                            >
                                                •••
                                            </button>
                                            {isMenuOpen && (
                                                <div className="post-comments-menu-dropdown" role="menu">
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        className="post-comments-menu-item"
                                                        onClick={() => handleReportClick(comment, commentId, commentAuthor)}
                                                    >
                                                        {translate("report.reportComment")}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {hideSpoiler ? (
                                        <div className="post-comments-spoiler">
                                            <span>{translate("comments.spoilerWarning")}</span>
                                            <button
                                                type="button"
                                                className="post-comments-spoiler-toggle"
                                                onClick={() => handleToggleSpoiler(commentId)}
                                            >
                                                {translate("comments.revealSpoiler")}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="post-comments-text">{comment.content}</p>
                                            {Boolean(comment.is_spoiler) && (
                                                <button
                                                    type="button"
                                                    className="post-comments-spoiler-toggle"
                                                    onClick={() => handleToggleSpoiler(commentId)}
                                                >
                                                    {translate("comments.hideSpoiler")}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <form className="post-comments-form" onSubmit={handleSubmit}>
                <label htmlFor={textareaId} className="post-comments-sr-only">
                    {translate("comments.formLabel")}
                </label>
                <textarea
                    id={textareaId}
                    className="post-comments-textarea"
                    rows={2}
                    maxLength={MAX_COMMENT_LENGTH}
                    value={content}
                    placeholder={translate("comments.placeholder")}
                    onChange={(event) => setContent(event.target.value)}
                    disabled={isSubmitting}
                />

                {submitError && (
                    <p className="post-comments-submit-error" role="alert">
                        {submitError}
                    </p>
                )}

                <div className="post-comments-form-footer">
                    <div className="post-comments-form-options">
                        <label className="post-comments-spoiler-checkbox">
                            <input
                                type="checkbox"
                                checked={isSpoiler}
                                onChange={(event) => setIsSpoiler(event.target.checked)}
                                disabled={isSubmitting}
                            />
                            <span>{translate("comments.markAsSpoiler")}</span>
                        </label>
                        <span className="post-comments-char-counter">
                            {translate("comments.charCount", {
                                current: content.length,
                                max: MAX_COMMENT_LENGTH,
                            })}
                        </span>
                    </div>

                    <button
                        type="submit"
                        className="post-comments-submit"
                        disabled={isSubmitDisabled}
                    >
                        {isSubmitting
                            ? translate("comments.submitting")
                            : translate("comments.submit")}
                    </button>
                </div>
            </form>

            <ReportModal
                isOpen={Boolean(reportTarget)}
                target={reportTarget}
                language={language}
                onClose={() => setReportTarget(null)}
            />
        </section>
    );
}

export default PostComments;
