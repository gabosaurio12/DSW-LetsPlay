import { useEffect, useRef, useState } from "react";
import PostComments from "../components/PostComments/PostComments.jsx";
import ReportModal from "../components/ReportModal/ReportModal.jsx";
import { useTranslation } from "../hooks/useTranslation.js";
import { REPORT_CONTENT_TYPES } from "../services/reportService.js";
import {
    ALLOWED_POST_IMAGE_TYPES,
    MAX_POST_IMAGE_BYTES,
    createVideogamePost,
    fetchVideogameById,
    fetchVideogameCommunities,
    fetchVideogamePosts,
    uploadPostImage,
} from "../services/videogameService.js";
import "./GameDetail.css";

const TABS = {
    ABOUT: "about",
    POSTS: "posts",
};

const MAX_POST_LENGTH = 2000;

/**
 * Computes up to two uppercase initials from a videogame name for avatar fallback.
 *
 * @param {string} name - The videogame title.
 * @returns {string} One or two uppercase initials.
 */
function getGameInitials(name) {
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
function formatCatalogDate(isoDate, language) {
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
 * Renders the large rectangular videogame cover banner with an initials fallback when missing or broken.
 *
 * @param {Object} props - Component props.
 * @param {string|null|undefined} props.coverUrl - Public URL of the videogame cover.
 * @param {string} props.name - Videogame title used for alt text and initials fallback.
 * @returns {JSX.Element} The rendered banner cover or initials placeholder.
 */
function GameDetailCover({ coverUrl, name }) {
    const [hasImageError, setHasImageError] = useState(false);
    const showImage = Boolean(coverUrl) && !hasImageError;

    return (
        <div className="game-detail-cover-wrapper">
            {showImage ? (
                <img
                    src={coverUrl}
                    alt={name}
                    className="game-detail-cover-img"
                    onError={() => setHasImageError(true)}
                />
            ) : (
                <div className="game-detail-cover-fallback" aria-hidden="true">
                    <span>{getGameInitials(name)}</span>
                </div>
            )}
        </div>
    );
}

/**
 * Renders a pill badge following the Let's Play Game Pill pattern.
 *
 * @param {Object} props - Component props.
 * @param {string} props.label - Text displayed inside the pill.
 * @returns {JSX.Element} The rendered pill badge.
 */
function GamePill({ label }) {
    return (
        <span className="game-detail-pill">
            <span className="game-detail-pill-dot" aria-hidden="true" />
            <span className="game-detail-pill-text">{label}</span>
        </span>
    );
}

/**
 * Inline post composer aligned with Figma (69:739) for creating a new post
 * associated with the current videogame.
 *
 * @param {Object} props - Component props.
 * @returns {JSX.Element} The rendered post composer card.
 */
function GamePostComposer({
    gameName,
    translate,
    textareaRef,
    content,
    onContentChange,
    imagePreviewUrl,
    imageName,
    isUploadingImage,
    imageError,
    onSelectImageFile,
    onRemoveImage,
    isSpoiler,
    onSpoilerChange,
    isSubmitting,
    submitError,
    onSubmit,
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);
    const isSubmitDisabled = content.trim() === "" || isSubmitting || isUploadingImage;

    function handleFileInputChange(event) {
        const selectedFile = event.target.files?.[0];
        event.target.value = "";
        if (selectedFile) {
            onSelectImageFile(selectedFile);
        }
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!isSubmitting && !isUploadingImage) {
            setIsDragOver(true);
        }
    }

    function handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragOver(false);
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);
        if (isSubmitting || isUploadingImage) {
            return;
        }
        const droppedFile = event.dataTransfer?.files?.[0];
        if (droppedFile) {
            onSelectImageFile(droppedFile);
        }
    }

    function handleOpenFilePicker() {
        if (!isSubmitting && !isUploadingImage) {
            fileInputRef.current?.click();
        }
    }

    return (
        <form
            className="game-detail-composer-card"
            onSubmit={onSubmit}
            aria-label={translate("gameDetail.composer.formLabel", { name: gameName })}
        >
            <div className="game-detail-composer-top">
                <div className="game-detail-post-avatar" aria-hidden="true">
                    LP
                </div>
                <div className="game-detail-composer-body">
                    <h2 className="game-detail-composer-title">
                        {translate("gameDetail.composer.title", { name: gameName })}
                    </h2>

                    <label htmlFor="game-detail-post-content" className="game-detail-sr-only">
                        {translate("gameDetail.composer.formLabel", { name: gameName })}
                    </label>
                    <textarea
                        id="game-detail-post-content"
                        ref={textareaRef}
                        className="game-detail-composer-textarea"
                        rows={3}
                        maxLength={MAX_POST_LENGTH}
                        value={content}
                        placeholder={translate("gameDetail.composer.placeholder", { name: gameName })}
                        onChange={(event) => onContentChange(event.target.value)}
                        disabled={isSubmitting}
                    />

                    <input
                        ref={fileInputRef}
                        id="game-detail-post-image-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="game-detail-sr-only"
                        onChange={handleFileInputChange}
                        disabled={isSubmitting || isUploadingImage}
                    />

                    {imagePreviewUrl ? (
                        <div className="game-detail-composer-preview">
                            <img
                                src={imagePreviewUrl}
                                alt={imageName || translate("gameDetail.composer.imagePreviewAlt")}
                                className="game-detail-composer-preview-img"
                            />
                            <div className="game-detail-composer-preview-bar">
                                <span className="game-detail-composer-preview-status">
                                    {isUploadingImage
                                        ? translate("gameDetail.composer.imageUploading")
                                        : translate("gameDetail.composer.imageUploaded")}
                                </span>
                                <button
                                    type="button"
                                    className="game-detail-composer-remove-btn"
                                    onClick={onRemoveImage}
                                    disabled={isSubmitting}
                                >
                                    {translate("gameDetail.composer.imageRemove")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`game-detail-composer-dropzone${isDragOver ? " is-drag-over" : ""}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            role="region"
                            aria-label={translate("gameDetail.composer.imageDropzoneLabel")}
                        >
                            <svg
                                className="game-detail-composer-dropzone-icon"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <div className="game-detail-composer-dropzone-text">
                                <span className="game-detail-composer-dropzone-title">
                                    {translate("gameDetail.composer.imageDropzoneTitle")}
                                </span>
                                <span className="game-detail-composer-dropzone-hint">
                                    {translate("gameDetail.composer.imageDropzoneHint")}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="game-detail-composer-upload-btn"
                                onClick={handleOpenFilePicker}
                                disabled={isSubmitting || isUploadingImage}
                            >
                                {translate("gameDetail.composer.imageSelectButton")}
                            </button>
                        </div>
                    )}

                    {imageError && (
                        <p className="game-detail-composer-error" role="alert">
                            {imageError}
                        </p>
                    )}

                    {submitError && (
                        <p className="game-detail-composer-error" role="alert">
                            {submitError}
                        </p>
                    )}

                    <div className="game-detail-composer-footer">
                        <div className="game-detail-composer-controls">
                            <span className="game-detail-composer-associated-label">
                                {translate("gameDetail.composer.associatedGame")}
                            </span>
                            <GamePill label={gameName} />
                            <label className="game-detail-composer-spoiler">
                                <input
                                    type="checkbox"
                                    checked={isSpoiler}
                                    onChange={(event) => onSpoilerChange(event.target.checked)}
                                    disabled={isSubmitting}
                                />
                                <span>{translate("gameDetail.composer.markAsSpoiler")}</span>
                            </label>
                            <span className="game-detail-composer-counter">
                                {translate("gameDetail.composer.charCount", {
                                    current: content.length,
                                    max: MAX_POST_LENGTH,
                                })}
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="game-detail-composer-submit"
                            disabled={isSubmitDisabled}
                        >
                            {isSubmitting
                                ? translate("gameDetail.composer.submitting")
                                : translate("gameDetail.composer.submit")}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}

/**
 * Renders a single public post card with author header, Game Pill, optional spoiler guard,
 * interactive reaction/comment/share footer pills, and an expandable comment thread.
 *
 * @param {Object} props - Component props.
 * @returns {JSX.Element} The rendered post card.
 */
function GamePostCard({
    post,
    gameName,
    language,
    translate,
    isSpoilerRevealed,
    onToggleSpoiler,
    isVoted,
    onToggleVote,
    isCopied,
    onShare,
    onReportPost,
}) {
    const [hasPostImageError, setHasPostImageError] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [addedCommentsCount, setAddedCommentsCount] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuWrapperRef = useRef(null);
    const postId = post.id_post ?? post.id;
    const authorDisplayName = post.author_display_name || post.author_username || "?";
    const formattedDate = formatCatalogDate(post.created_at, language);
    const baseVotes = Number(post.reaction_count) || 0;
    const displayVotes = isVoted ? baseVotes + 1 : baseVotes;
    const commentCount = (Number(post.comment_count) || 0) + addedCommentsCount;
    const showSpoilerOverlay = Boolean(post.is_spoiler) && !isSpoilerRevealed;

    useEffect(() => {
        if (!isMenuOpen) {
            return undefined;
        }

        function handleOutsideClick(event) {
            if (menuWrapperRef.current && !menuWrapperRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }

        function handleEscapeKey(event) {
            if (event.key === "Escape") {
                setIsMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("keydown", handleEscapeKey);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            window.removeEventListener("keydown", handleEscapeKey);
        };
    }, [isMenuOpen]);

    function handleReportClick() {
        setIsMenuOpen(false);
        onReportPost?.({
            contentType: REPORT_CONTENT_TYPES.POST,
            reportedContentId: postId,
            author: authorDisplayName,
            excerpt: post.content || "",
        });
    }

    return (
        <article className="game-detail-post-card">
            <header className="game-detail-post-header">
                <div className="game-detail-post-author-row">
                    <div className="game-detail-post-avatar" aria-hidden="true">
                        {getGameInitials(authorDisplayName)}
                    </div>
                    <div className="game-detail-post-author-meta">
                        <span className="game-detail-post-author-name">{authorDisplayName}</span>
                        <span className="game-detail-post-meta-line">
                            {post.author_username ? `@${post.author_username}` : ""}
                            {post.author_username && formattedDate ? " · " : ""}
                            {formattedDate ?? ""}
                            {post.community_name
                                ? ` · ${translate("gameDetail.posts.inCommunity", {
                                    community: post.community_name,
                                })}`
                                : ""}
                        </span>
                    </div>
                </div>
                <div className="game-detail-post-badges">
                    {post.is_spoiler && (
                        <span className="game-detail-spoiler-badge">
                            {translate("gameDetail.posts.spoilerBadge")}
                        </span>
                    )}
                    <GamePill label={post.videogame_name || gameName} />
                    <div className="game-detail-post-menu-wrapper" ref={menuWrapperRef}>
                        <button
                            type="button"
                            className="game-detail-post-menu-trigger"
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            aria-label={translate("report.moreOptions")}
                            onClick={() => setIsMenuOpen((prev) => !prev)}
                        >
                            •••
                        </button>
                        {isMenuOpen && (
                            <div className="game-detail-post-menu-dropdown" role="menu">
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="game-detail-post-menu-item"
                                    onClick={handleReportClick}
                                >
                                    {translate("report.reportPost")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="game-detail-post-body">
                {showSpoilerOverlay ? (
                    <div className="game-detail-spoiler-box">
                        <p className="game-detail-spoiler-warning">
                            {translate("gameDetail.posts.spoilerWarning")}
                        </p>
                        <button
                            type="button"
                            className="game-detail-spoiler-button"
                            onClick={() => onToggleSpoiler(postId)}
                        >
                            {translate("gameDetail.posts.revealSpoiler")}
                        </button>
                    </div>
                ) : (
                    <>
                        {post.content && (
                            <p className="game-detail-post-content">{post.content}</p>
                        )}
                        {post.image_url && !hasPostImageError && (
                            <div className="game-detail-post-image-wrapper">
                                <img
                                    src={post.image_url}
                                    alt=""
                                    className="game-detail-post-image"
                                    onError={() => setHasPostImageError(true)}
                                />
                            </div>
                        )}
                        {post.is_spoiler && (
                            <button
                                type="button"
                                className="game-detail-spoiler-hide-link"
                                onClick={() => onToggleSpoiler(postId)}
                            >
                                {translate("gameDetail.posts.hideSpoiler")}
                            </button>
                        )}
                    </>
                )}
            </div>

            <footer className="game-detail-post-footer">
                <button
                    type="button"
                    aria-pressed={isVoted}
                    className={`game-detail-post-action-pill${isVoted ? " game-detail-post-action-pill--active" : ""}`}
                    onClick={() => onToggleVote(postId)}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 19V5" />
                        <path d="M5 12l7-7 7 7" />
                    </svg>
                    <span>
                        {isVoted
                            ? translate("gameDetail.posts.votedAction", { count: displayVotes })
                            : translate("gameDetail.posts.voteAction", { count: displayVotes })}
                    </span>
                </button>

                <button
                    type="button"
                    aria-expanded={isCommentsOpen}
                    className={`game-detail-post-action-pill${isCommentsOpen ? " game-detail-post-action-pill--active" : ""}`}
                    onClick={() => setIsCommentsOpen((prev) => !prev)}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>
                        {isCommentsOpen
                            ? translate("gameDetail.posts.hideComments", { count: commentCount })
                            : translate("gameDetail.posts.showComments", { count: commentCount })}
                    </span>
                </button>

                <button
                    type="button"
                    className={`game-detail-post-action-pill${isCopied ? " game-detail-post-action-pill--active" : ""}`}
                    onClick={() => onShare(postId)}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>
                        {isCopied
                            ? translate("gameDetail.posts.copied")
                            : translate("gameDetail.posts.share")}
                    </span>
                </button>
            </footer>

            <PostComments
                postId={postId}
                language={language}
                isOpen={isCommentsOpen}
                onCommentAdded={() => setAddedCommentsCount((prev) => prev + 1)}
            />
        </article>
    );
}

/**
 * Official public videogame detail page (PJuego) aligned with Figma (69:739),
 * displaying the Game Header Card, 3 attribute pills, synced library CTA,
 * About/Posts tabs, and the 288px "About the game" Right Rail.
 *
 * @param {Object} props - Component props.
 * @param {string} props.gameId - UUID of the videogame to display.
 * @param {string} props.language - Active UI language code.
 * @param {Function} props.onBack - Callback invoked when returning to the catalog.
 * @param {boolean} [props.isInLibrary] - Whether this videogame is in the local library.
 * @param {Function} [props.onToggleLibrary] - Callback to toggle this videogame in the local library.
 * @param {Function} [props.onFindPlayers] - Callback invoked when clicking Find teammates for this game.
 * @returns {JSX.Element} The rendered Game Detail page.
 */
function GameDetail({
    gameId,
    language,
    onBack,
    isInLibrary = false,
    onToggleLibrary,
    onFindPlayers,
}) {
    const translate = useTranslation(language);
    const [videogame, setVideogame] = useState(null);
    const [communities, setCommunities] = useState([]);
    const [posts, setPosts] = useState([]);
    const [activeTab, setActiveTab] = useState(TABS.POSTS);
    const [isLoading, setIsLoading] = useState(true);
    const [errorType, setErrorType] = useState(null);
    const [retryCounter, setRetryCounter] = useState(0);
    const [revealedSpoilers, setRevealedSpoilers] = useState({});
    const [votedPosts, setVotedPosts] = useState({});
    const [copiedPostId, setCopiedPostId] = useState(null);
    const [reportTarget, setReportTarget] = useState(null);
    const [postContent, setPostContent] = useState("");
    const [postImageUrl, setPostImageUrl] = useState("");
    const [postImagePreviewUrl, setPostImagePreviewUrl] = useState("");
    const [postImageName, setPostImageName] = useState("");
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [imageUploadError, setImageUploadError] = useState(null);
    const [isPostSpoiler, setIsPostSpoiler] = useState(false);
    const [isCreatingPost, setIsCreatingPost] = useState(false);
    const [postSubmitError, setPostSubmitError] = useState(null);
    const [focusComposerSignal, setFocusComposerSignal] = useState(0);
    const copyTimeoutRef = useRef(null);
    const composerTextareaRef = useRef(null);
    const createPostControllerRef = useRef(null);
    const uploadImageControllerRef = useRef(null);
    const previewObjectUrlRef = useRef(null);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
            if (createPostControllerRef.current) {
                createPostControllerRef.current.abort();
                createPostControllerRef.current = null;
            }
            if (uploadImageControllerRef.current) {
                uploadImageControllerRef.current.abort();
                uploadImageControllerRef.current = null;
            }
            if (previewObjectUrlRef.current) {
                URL.revokeObjectURL(previewObjectUrlRef.current);
                previewObjectUrlRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (focusComposerSignal === 0 || activeTab !== TABS.POSTS) {
            return;
        }
        const textarea = composerTextareaRef.current;
        if (textarea) {
            textarea.scrollIntoView?.({ behavior: "smooth", block: "center" });
            textarea.focus();
        }
    }, [activeTab, focusComposerSignal]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadVideogame() {
            setIsLoading(true);
            setErrorType(null);
            setRevealedSpoilers({});
            setVotedPosts({});
            setCopiedPostId(null);
            setPostContent("");
            resetPostImageState();
            setIsPostSpoiler(false);
            setPostSubmitError(null);

            try {
                const [record, relatedCommunities, relatedPosts] = await Promise.all([
                    fetchVideogameById(gameId, { signal: controller.signal }),
                    fetchVideogameCommunities(gameId, { signal: controller.signal }).catch((communityError) => {
                        if (communityError.name === "AbortError") {
                            throw communityError;
                        }
                        return [];
                    }),
                    fetchVideogamePosts(gameId, { signal: controller.signal }).catch((postsError) => {
                        if (postsError.name === "AbortError") {
                            throw postsError;
                        }
                        return [];
                    }),
                ]);
                if (!record) {
                    setVideogame(null);
                    setCommunities([]);
                    setPosts([]);
                    setErrorType("notFound");
                } else {
                    setVideogame(record);
                    setCommunities(Array.isArray(relatedCommunities) ? relatedCommunities : []);
                    setPosts(Array.isArray(relatedPosts) ? relatedPosts : []);
                }
                setIsLoading(false);
            } catch (error) {
                if (error.name !== "AbortError") {
                    setVideogame(null);
                    setCommunities([]);
                    setPosts([]);
                    setErrorType(error.status === 404 ? "notFound" : "generic");
                    setIsLoading(false);
                }
            }
        }

        loadVideogame();
        return () => {
            controller.abort();
        };
    }, [gameId, retryCounter]);

    function handleRetry() {
        setRetryCounter((prev) => prev + 1);
    }

    function handleToggleSpoiler(postId) {
        setRevealedSpoilers((prev) => ({
            ...prev,
            [postId]: !prev[postId],
        }));
    }

    function handleToggleVote(postId) {
        setVotedPosts((prev) => ({
            ...prev,
            [postId]: !prev[postId],
        }));
    }

    function handleSharePost(postId) {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(window.location.href).catch(() => {});
        }
        setCopiedPostId(postId);
        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => {
            setCopiedPostId((current) => (current === postId ? null : current));
        }, 2000);
    }

    function handleFocusComposer() {
        setActiveTab(TABS.POSTS);
        setFocusComposerSignal((prev) => prev + 1);
    }

    function resetPostImageState() {
        if (uploadImageControllerRef.current) {
            uploadImageControllerRef.current.abort();
            uploadImageControllerRef.current = null;
        }
        if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
            previewObjectUrlRef.current = null;
        }
        setPostImageUrl("");
        setPostImagePreviewUrl("");
        setPostImageName("");
        setIsUploadingImage(false);
        setImageUploadError(null);
    }

    async function handleSelectImageFile(file) {
        if (!file) {
            return;
        }

        if (!ALLOWED_POST_IMAGE_TYPES.includes(file.type)) {
            setImageUploadError(translate("gameDetail.composer.imageInvalidType"));
            return;
        }

        if (file.size <= 0 || file.size > MAX_POST_IMAGE_BYTES) {
            setImageUploadError(translate("gameDetail.composer.imageTooLarge"));
            return;
        }

        if (uploadImageControllerRef.current) {
            uploadImageControllerRef.current.abort();
        }
        if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
            previewObjectUrlRef.current = null;
        }

        const localPreviewUrl = URL.createObjectURL(file);
        previewObjectUrlRef.current = localPreviewUrl;
        setPostImagePreviewUrl(localPreviewUrl);
        setPostImageName(file.name || "");
        setPostImageUrl("");
        setImageUploadError(null);
        setIsUploadingImage(true);

        const controller = new AbortController();
        uploadImageControllerRef.current = controller;

        try {
            const uploadedImageUrl = await uploadPostImage(file, { signal: controller.signal });
            if (uploadImageControllerRef.current === controller) {
                setPostImageUrl(uploadedImageUrl);
            }
        } catch (error) {
            if (error?.name !== "AbortError" && uploadImageControllerRef.current === controller) {
                if (previewObjectUrlRef.current === localPreviewUrl) {
                    URL.revokeObjectURL(localPreviewUrl);
                    previewObjectUrlRef.current = null;
                }
                setPostImagePreviewUrl("");
                setPostImageName("");
                setPostImageUrl("");

                if (error?.code === "INVALID_IMAGE_TYPE") {
                    setImageUploadError(translate("gameDetail.composer.imageInvalidType"));
                } else if (error?.code === "IMAGE_TOO_LARGE") {
                    setImageUploadError(translate("gameDetail.composer.imageTooLarge"));
                } else {
                    setImageUploadError(translate("gameDetail.composer.imageUploadError"));
                }
            }
        } finally {
            if (uploadImageControllerRef.current === controller) {
                uploadImageControllerRef.current = null;
                setIsUploadingImage(false);
            }
        }
    }

    async function handleCreatePost(event) {
        event.preventDefault();
        const trimmedContent = postContent.trim();
        if (trimmedContent === "" || isCreatingPost || isUploadingImage || !videogame) {
            return;
        }

        if (createPostControllerRef.current) {
            createPostControllerRef.current.abort();
        }
        const controller = new AbortController();
        createPostControllerRef.current = controller;

        setIsCreatingPost(true);
        setPostSubmitError(null);

        try {
            const createdPost = await createVideogamePost(
                videogame.id_videogame ?? gameId,
                {
                    content: trimmedContent,
                    imageUrl: postImageUrl.trim() || null,
                    isSpoiler: isPostSpoiler,
                },
                { signal: controller.signal }
            );
            setPosts((prevPosts) => [createdPost, ...prevPosts]);
            setPostContent("");
            resetPostImageState();
            setIsPostSpoiler(false);
        } catch (error) {
            if (error?.name !== "AbortError") {
                setPostSubmitError(translate("gameDetail.composer.submitError"));
            }
        } finally {
            if (createPostControllerRef.current === controller) {
                createPostControllerRef.current = null;
                setIsCreatingPost(false);
            }
        }
    }

    const formattedCreatedAt = formatCatalogDate(videogame?.created_at, language);

    return (
        <section className="game-detail" aria-label={videogame?.name ?? translate("gameDetail.loading")}>
            <div className="game-detail-topbar">
                <button
                    type="button"
                    className="game-detail-back-button"
                    onClick={onBack}
                >
                    <span aria-hidden="true">&larr;</span>
                    <span>{translate("gameDetail.backToCatalog")}</span>
                </button>
            </div>

            {isLoading && (
                <div className="game-detail-state-card" role="status" aria-live="polite">
                    <div className="game-detail-spinner" aria-hidden="true" />
                    <p className="game-detail-state-description">{translate("gameDetail.loading")}</p>
                </div>
            )}

            {!isLoading && errorType !== null && (
                <div className="game-detail-state-card" role="alert">
                    <div className="game-detail-state-icon" aria-hidden="true">!</div>
                    <h1 className="game-detail-state-title">
                        {errorType === "notFound"
                            ? translate("gameDetail.notFoundTitle")
                            : translate("gameDetail.errorTitle")}
                    </h1>
                    <p className="game-detail-state-description">
                        {errorType === "notFound"
                            ? translate("gameDetail.notFoundMessage")
                            : translate("gameDetail.errorMessage")}
                    </p>
                    <div className="game-detail-state-actions">
                        <button
                            type="button"
                            className="game-detail-button-primary"
                            onClick={handleRetry}
                        >
                            {translate("gameDetail.retry")}
                        </button>
                        <button
                            type="button"
                            className="game-detail-button-outline"
                            onClick={onBack}
                        >
                            {translate("gameDetail.backToCatalog")}
                        </button>
                    </div>
                </div>
            )}

            {!isLoading && errorType === null && videogame && (
                <div className="game-detail-workspace">
                    <div className="game-detail-main-column">
                        <header className="game-detail-header-card">
                            <GameDetailCover
                                key={videogame.cover_url ?? "no-cover"}
                                coverUrl={videogame.cover_url}
                                name={videogame.name}
                            />
                            <div className="game-detail-header-row">
                                <div className="game-detail-identity">
                                    <div className="game-detail-header-info">
                                        <div className="game-detail-title-row">
                                            <h1 className="game-detail-title">{videogame.name}</h1>
                                            <span className="game-detail-official-badge">
                                                <span className="game-detail-official-dot" aria-hidden="true" />
                                                {translate("gameDetail.officialBadge")}
                                            </span>
                                        </div>

                                        <p className="game-detail-summary">
                                            {videogame.description || translate("gameDetail.about.noDescription")}
                                        </p>

                                        <div className="game-detail-meta-row">
                                            {videogame.additional_info && (
                                                <>
                                                    <span>{videogame.additional_info}</span>
                                                    <span aria-hidden="true">&bull;</span>
                                                </>
                                            )}
                                            <span>{translate("gameDetail.managedByPlatform")}</span>
                                        </div>

                                        <div className="game-detail-pills">
                                            <GamePill label={videogame.name} />
                                            {videogame.genre && (
                                                <span className="game-detail-genre-pill">
                                                    {videogame.genre}
                                                </span>
                                            )}
                                            {videogame.platform && (
                                                <span className="game-detail-platform-pill">
                                                    {videogame.platform}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="game-detail-cta-column">
                                    {onToggleLibrary && (
                                        <button
                                            type="button"
                                            aria-pressed={isInLibrary}
                                            title={isInLibrary
                                                ? translate("gameDetail.removeFromLibraryTitle")
                                                : translate("gameDetail.addToLibraryTitle")}
                                            className={`game-detail-library-cta${isInLibrary ? " game-detail-library-cta--saved" : ""}`}
                                            onClick={() => onToggleLibrary(videogame)}
                                        >
                                            {isInLibrary
                                                ? translate("gameDetail.inLibrary")
                                                : translate("gameDetail.addToLibrary")}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="game-detail-post-cta"
                                        onClick={handleFocusComposer}
                                    >
                                        {translate("gameDetail.cta.createPost")}
                                    </button>
                                </div>
                            </div>
                        </header>

                        <div
                            className="game-detail-tabs"
                            role="tablist"
                            aria-label={translate("gameDetail.tabsLabel")}
                        >
                            <button
                                type="button"
                                role="tab"
                                id="game-detail-tab-posts"
                                aria-selected={activeTab === TABS.POSTS}
                                aria-controls="game-detail-panel-posts"
                                className={`game-detail-tab${activeTab === TABS.POSTS ? " game-detail-tab--active" : ""}`}
                                onClick={() => setActiveTab(TABS.POSTS)}
                            >
                                {translate("gameDetail.tabs.posts")}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                id="game-detail-tab-about"
                                aria-selected={activeTab === TABS.ABOUT}
                                aria-controls="game-detail-panel-about"
                                className={`game-detail-tab${activeTab === TABS.ABOUT ? " game-detail-tab--active" : ""}`}
                                onClick={() => setActiveTab(TABS.ABOUT)}
                            >
                                {translate("gameDetail.tabs.about")}
                            </button>
                        </div>

                        {activeTab === TABS.POSTS && (
                            <div
                                role="tabpanel"
                                id="game-detail-panel-posts"
                                aria-labelledby="game-detail-tab-posts"
                                className="game-detail-tab-panel"
                            >
                                <GamePostComposer
                                    gameName={videogame.name}
                                    translate={translate}
                                    textareaRef={composerTextareaRef}
                                    content={postContent}
                                    onContentChange={setPostContent}
                                    imagePreviewUrl={postImagePreviewUrl}
                                    imageName={postImageName}
                                    isUploadingImage={isUploadingImage}
                                    imageError={imageUploadError}
                                    onSelectImageFile={handleSelectImageFile}
                                    onRemoveImage={resetPostImageState}
                                    isSpoiler={isPostSpoiler}
                                    onSpoilerChange={setIsPostSpoiler}
                                    isSubmitting={isCreatingPost}
                                    submitError={postSubmitError}
                                    onSubmit={handleCreatePost}
                                />

                                {posts.length === 0 ? (
                                    <div className="game-detail-state-card">
                                        <div className="game-detail-state-icon" aria-hidden="true">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                        </div>
                                        <h2 className="game-detail-state-title">
                                            {translate("gameDetail.posts.emptyTitle")}
                                        </h2>
                                        <p className="game-detail-state-description">
                                            {translate("gameDetail.posts.emptyMessage")}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="game-detail-posts-list">
                                        {posts.map((post) => {
                                            const postId = post.id_post ?? post.id;
                                            return (
                                                <GamePostCard
                                                    key={postId}
                                                    post={post}
                                                    gameName={videogame.name}
                                                    language={language}
                                                    translate={translate}
                                                    isSpoilerRevealed={Boolean(revealedSpoilers[postId])}
                                                    onToggleSpoiler={handleToggleSpoiler}
                                                    isVoted={Boolean(votedPosts[postId])}
                                                    onToggleVote={handleToggleVote}
                                                    isCopied={copiedPostId === postId}
                                                    onShare={handleSharePost}
                                                    onReportPost={setReportTarget}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === TABS.ABOUT && (
                            <div
                                role="tabpanel"
                                id="game-detail-panel-about"
                                aria-labelledby="game-detail-tab-about"
                                className="game-detail-tab-panel"
                            >
                                <article className="game-detail-card">
                                    <h2 className="game-detail-card-title">
                                        {translate("gameDetail.about.descriptionTitle")}
                                    </h2>
                                    <p className="game-detail-body-text">
                                        {videogame.description || translate("gameDetail.about.noDescription")}
                                    </p>

                                    {videogame.additional_info && (
                                        <div className="game-detail-subsection">
                                            <h3 className="game-detail-subsection-title">
                                                {translate("gameDetail.about.additionalInfoTitle")}
                                            </h3>
                                            <p className="game-detail-body-text">
                                                {videogame.additional_info}
                                            </p>
                                        </div>
                                    )}
                                </article>

                                <article className="game-detail-card game-detail-upcoming-card">
                                    <h2 className="game-detail-card-title">
                                        {translate("gameDetail.about.upcomingTitle")}
                                    </h2>
                                    <p className="game-detail-body-text">
                                        {translate("gameDetail.about.upcomingMessage")}
                                    </p>
                                </article>
                            </div>
                        )}
                    </div>

                    <aside className="game-detail-right-rail" aria-label={translate("gameDetail.sidebar.title")}>
                        <div className="game-detail-card game-detail-rail-about">
                            <h2 className="game-detail-rail-title">
                                {translate("gameDetail.sidebar.title")}
                            </h2>
                            <p className="game-detail-rail-official">
                                {translate("gameDetail.sidebar.officialPublic")}
                            </p>
                            <p className="game-detail-rail-description">
                                {translate("gameDetail.sidebar.publicNotice", { name: videogame.name })}
                            </p>
                            <div className="game-detail-rail-meta">
                                <p className="game-detail-rail-meta-line">
                                    {translate("gameDetail.sidebar.genre")}:{" "}
                                    {videogame.genre || translate("gameDetail.sidebar.notSpecified")}
                                </p>
                                <p className="game-detail-rail-meta-line">
                                    {translate("gameDetail.sidebar.platform")}:{" "}
                                    {videogame.platform || translate("gameDetail.sidebar.notSpecified")}
                                </p>
                                {formattedCreatedAt && (
                                    <p className="game-detail-rail-meta-line">
                                        {translate("gameDetail.sidebar.createdAt")}: {formattedCreatedAt}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="game-detail-card game-detail-rail-communities">
                            <h2 className="game-detail-rail-title">
                                {translate("gameDetail.sidebar.communitiesTitle")}
                            </h2>
                            {communities.length === 0 ? (
                                <p className="game-detail-rail-empty">
                                    {translate("gameDetail.noRelatedCommunities")}
                                </p>
                            ) : (
                                <ul className="game-detail-communities-list">
                                    {communities.map((community) => (
                                        <li
                                            key={community.id_community ?? community.id ?? community.name}
                                            className="game-detail-community-item"
                                        >
                                            <div className="game-detail-community-avatar" aria-hidden="true">
                                                {getGameInitials(community.name)}
                                            </div>
                                            <div className="game-detail-community-info">
                                                <span className="game-detail-community-name">
                                                    {community.name}
                                                </span>
                                                <span className="game-detail-community-meta">
                                                    {translate("gameDetail.memberCount", {
                                                        count: community.member_count ?? 0,
                                                    })}
                                                    {" · "}
                                                    {translate("gameDetail.publicCommunityLabel")}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="game-detail-card game-detail-rail-communities">
                            <h2 className="game-detail-rail-title">
                                {translate("gameDetail.sidebar.lfgTitle")}
                            </h2>
                            <p className="game-detail-rail-empty">
                                {translate("gameDetail.sidebar.lfgDescription")}
                            </p>
                            <button
                                type="button"
                                className="game-detail-button-primary"
                                onClick={() => onFindPlayers?.(videogame.id_videogame)}
                            >
                                {translate("gameDetail.sidebar.lfgCta")}
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            <ReportModal
                isOpen={Boolean(reportTarget)}
                target={reportTarget}
                language={language}
                onClose={() => setReportTarget(null)}
            />
        </section>
    );
}

export default GameDetail;
