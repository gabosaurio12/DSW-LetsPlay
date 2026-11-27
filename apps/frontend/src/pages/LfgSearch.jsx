import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../hooks/useTranslation.js";
import ReportModal from "../components/ReportModal/ReportModal.jsx";
import { REPORT_CONTENT_TYPES } from "../services/reportService.js";
import { fetchVideogames } from "../services/videogameService.js";
import { createLfgPost, fetchLfgPlayers, fetchLfgPosts } from "../services/lfgService.js";
import { fetchFollowedIds, followUser, unfollowUser } from "../services/followService.js";
import "./LfgSearch.css";

const TABS = {
    PLAYERS: "players",
    POSTS: "posts",
};

const DEFAULT_PLATFORM_OPTIONS = ["PC", "PlayStation 5", "Xbox", "Nintendo Switch", "Mobile"];
const MODALITY_OPTIONS = ["CASUAL", "COMPETITIVE", "COOPERATIVE", "INDIFFERENT"];
const SCHEDULE_OPTION_KEYS = {
    "Afternoons (16:00-19:00)": "afternoons",
    "Weeknights (20:00-23:00)": "weeknights",
    "Late Night (23:00-02:00)": "lateNight",
    "Weekends (10:00-14:00)": "weekends",
};
const MIN_SPOTS = 1;
const MAX_SPOTS = 16;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}"
    + "-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const UUID_REGEX = new RegExp(`^${UUID_PATTERN}$`, "i");

/**
 * Computes up to two uppercase initials from a player or author name.
 *
 * @param {string} name - Display name or username.
 * @returns {string} One or two uppercase initials.
 */
function getInitials(name) {
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
 * Renders a pill badge following the Let's Play Game Pill pattern.
 *
 * @param {Object} props - Component props.
 * @param {string} props.label - Videogame name displayed inside the pill.
 * @returns {JSX.Element} The rendered Game Pill.
 */
function GamePill({ label }) {
    return (
        <span className="lfg-game-pill">
            <span className="lfg-game-pill-dot" aria-hidden="true" />
            <span>{label}</span>
        </span>
    );
}

/**
 * Renders a circular 40px avatar using photo URL when available or initials fallback.
 *
 * @param {Object} props - Component props.
 * @param {string|null|undefined} props.avatarUrl - Optional profile photo URL.
 * @param {string} props.name - Player name for alt text and initials fallback.
 * @returns {JSX.Element} The rendered avatar.
 */
function PlayerAvatar({ avatarUrl, name }) {
    const [hasImageError, setHasImageError] = useState(false);
    const showImage = Boolean(avatarUrl) && !hasImageError;

    return (
        <div className="lfg-avatar" aria-hidden={!showImage}>
            {showImage ? (
                <img
                    src={avatarUrl}
                    alt={name}
                    loading="lazy"
                    onError={() => setHasImageError(true)}
                />
            ) : (
                <span>{getInitials(name)}</span>
            )}
        </div>
    );
}

/**
 * Normalizes a shared match array (strings or objects with a name) into trimmed strings.
 *
 * @param {Array<string|Object>|undefined|null} items - Raw shared attribute array.
 * @returns {Array<string>} List of non-empty display labels.
 */
function normalizeSharedList(items) {
    if (!Array.isArray(items)) {
        return [];
    }
    return items
        .map((item) => (typeof item === "string" ? item : item?.name ?? ""))
        .map((label) => label.trim())
        .filter((label) => label !== "");
}

/**
 * Normalizes a player's shared/library games into an array of display names.
 *
 * @param {Object} player - Player record from API.
 * @returns {Array<string>} List of game names.
 */
function getPlayerGames(player) {
    const source = Array.isArray(player?.shared_games)
        ? player.shared_games
        : Array.isArray(player?.games)
            ? player.games
            : [];
    return normalizeSharedList(source);
}

/**
 * Builds localized match breakdown lines from shared games, platforms, and schedules.
 *
 * @param {Object} player - Player record from API.
 * @param {Function} translate - Translation helper.
 * @returns {Array<{ key: string, text: string }>} Non-empty overlap items.
 */
function buildMatchBreakdown(player, translate) {
    const sharedGames = normalizeSharedList(player?.shared_games);
    const sharedPlatforms = normalizeSharedList(player?.shared_platforms);
    const sharedAvailability = normalizeSharedList(player?.shared_availability);
    const items = [];

    if (sharedGames.length > 0) {
        const key = sharedGames.length === 1
            ? "lfg.playerCard.matchSharedGamesOne"
            : "lfg.playerCard.matchSharedGamesMany";
        items.push({
            key: "games",
            text: translate(key, { count: sharedGames.length }),
        });
    }

    if (sharedPlatforms.length > 0) {
        const key = sharedPlatforms.length === 1
            ? "lfg.playerCard.matchSharedPlatformsOne"
            : "lfg.playerCard.matchSharedPlatformsMany";
        items.push({
            key: "platforms",
            text: translate(key, {
                count: sharedPlatforms.length,
                items: sharedPlatforms.join(", "),
            }),
        });
    }

    if (sharedAvailability.length > 0) {
        const key = sharedAvailability.length === 1
            ? "lfg.playerCard.matchSharedAvailabilityOne"
            : "lfg.playerCard.matchSharedAvailabilityMany";
        items.push({
            key: "availability",
            text: translate(key, {
                count: sharedAvailability.length,
                items: sharedAvailability.join(", "),
            }),
        });
    }

    return items;
}

/**
 * Formats a canonical schedule slot into a localized human-friendly label.
 *
 * @param {string} schedule - Canonical schedule slot string.
 * @param {Function} translate - Translation helper.
 * @returns {string} Localized schedule label or the raw value if unknown.
 */
function formatScheduleLabel(schedule, translate) {
    const key = SCHEDULE_OPTION_KEYS[schedule];
    if (!key) {
        return schedule;
    }
    return translate(`lfg.scheduleOptions.${key}`);
}

/**
 * Formats a player's primary platform and gaming schedule for card metadata.
 *
 * @param {Object} player - Player record from API.
 * @param {Function} translate - Translation helper.
 * @returns {string} Formatted metadata line.
 */
function formatPlayerMeta(player, translate) {
    const platform = Array.isArray(player?.active_platforms) && player.active_platforms.length > 0
        ? player.active_platforms[0]
        : player?.platform || "PC";
    const rawSchedule = Array.isArray(player?.availability) && player.availability.length > 0
        ? player.availability[0]
        : player?.schedule || "";
    const schedule = rawSchedule
        ? formatScheduleLabel(rawSchedule, translate)
        : translate("lfg.playerCard.scheduleNotSpecified");
    return `${platform} · ${schedule}`;
}

/**
 * Modal dialog to create a new LFG recruitment post via POST /api/lfg/posts.
 *
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.videogames - Approved videogame catalog options.
 * @param {Function} props.translate - Translation helper.
 * @param {Function} props.onClose - Callback to close the modal.
 * @param {Function} props.onCreated - Callback invoked after successful creation.
 * @returns {JSX.Element} The rendered modal dialog.
 */
function CreateLfgPostModal({ videogames, platformOptions, translate, onClose, onCreated }) {
    const [videogameId, setVideogameId] = useState("");
    const [platform, setPlatform] = useState(platformOptions[0] || "PC");
    const [spotsAvailable, setSpotsAvailable] = useState("2");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [description, setDescription] = useState("");
    const [acceptsBeginners, setAcceptsBeginners] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape" && !isSubmitting) {
                onClose();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSubmitting, onClose]);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorMessage("");

        if (videogameId.trim() === "") {
            setErrorMessage(translate("lfg.modal.errors.gameRequired"));
            return;
        }
        if (platform.trim() === "") {
            setErrorMessage(translate("lfg.modal.errors.platformRequired"));
            return;
        }
        const parsedSpots = Number(spotsAvailable);
        if (!Number.isInteger(parsedSpots) || parsedSpots < MIN_SPOTS || parsedSpots > MAX_SPOTS) {
            setErrorMessage(translate("lfg.modal.errors.spotsRange"));
            return;
        }
        const trimmedStartTime = startTime.trim();
        const trimmedEndTime = endTime.trim();
        if (!TIME_24H_REGEX.test(trimmedStartTime) || (trimmedEndTime !== "" && !TIME_24H_REGEX.test(trimmedEndTime))) {
            setErrorMessage(translate("lfg.modal.errors.scheduleRequired"));
            return;
        }
        const scheduledTime = trimmedEndTime ? `${trimmedStartTime}-${trimmedEndTime}` : trimmedStartTime;
        const trimmedDescription = description.trim();
        if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH || trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
            setErrorMessage(translate("lfg.modal.errors.descriptionLength"));
            return;
        }

        setIsSubmitting(true);
        try {
            const created = await createLfgPost({
                videogameId,
                platform,
                spotsAvailable: parsedSpots,
                scheduledTime,
                description: trimmedDescription,
                acceptsBeginners,
            });
            onCreated(created);
        } catch (err) {
            setErrorMessage(err?.message || translate("lfg.modal.errors.submitFailed"));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div
            className="lfg-modal-overlay"
            role="presentation"
            onClick={(event) => {
                if (event.target === event.currentTarget && !isSubmitting) {
                    onClose();
                }
            }}
        >
            <div
                className="lfg-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lfg-create-modal-title"
            >
                <div className="lfg-modal-header">
                    <h2 id="lfg-create-modal-title" className="lfg-modal-title">
                        {translate("lfg.modal.title")}
                    </h2>
                    <button
                        type="button"
                        className="lfg-modal-close"
                        aria-label={translate("lfg.modal.close")}
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                <form className="lfg-modal-form" onSubmit={handleSubmit} noValidate>
                    <div className="lfg-field">
                        <label htmlFor="lfg-post-game" className="lfg-field-label">
                            {translate("lfg.modal.gameLabel")}
                        </label>
                        <select
                            id="lfg-post-game"
                            className="lfg-select"
                            value={videogameId}
                            onChange={(event) => setVideogameId(event.target.value)}
                            disabled={isSubmitting}
                        >
                            <option value="">{translate("lfg.modal.gamePlaceholder")}</option>
                            {videogames.map((game) => (
                                <option key={game.id_videogame} value={game.id_videogame}>
                                    {game.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="lfg-modal-row">
                        <div className="lfg-field">
                            <label htmlFor="lfg-post-platform" className="lfg-field-label">
                                {translate("lfg.modal.platformLabel")}
                            </label>
                            <select
                                id="lfg-post-platform"
                                className="lfg-select"
                                value={platform}
                                onChange={(event) => setPlatform(event.target.value)}
                                disabled={isSubmitting}
                            >
                                <option value="">{translate("lfg.modal.platformPlaceholder")}</option>
                                {platformOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="lfg-field">
                            <label htmlFor="lfg-post-spots" className="lfg-field-label">
                                {translate("lfg.modal.spotsLabel")}
                            </label>
                            <input
                                id="lfg-post-spots"
                                type="number"
                                min={MIN_SPOTS}
                                max={MAX_SPOTS}
                                className="lfg-input"
                                value={spotsAvailable}
                                onChange={(event) => setSpotsAvailable(event.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="lfg-modal-row">
                        <div className="lfg-field">
                            <label htmlFor="lfg-post-start-time" className="lfg-field-label">
                                {translate("lfg.modal.startTimeLabel")}
                            </label>
                            <input
                                id="lfg-post-start-time"
                                type="time"
                                className="lfg-input"
                                value={startTime}
                                onChange={(event) => setStartTime(event.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div className="lfg-field">
                            <label htmlFor="lfg-post-end-time" className="lfg-field-label">
                                {translate("lfg.modal.endTimeLabel")}
                            </label>
                            <input
                                id="lfg-post-end-time"
                                type="time"
                                className="lfg-input"
                                value={endTime}
                                onChange={(event) => setEndTime(event.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="lfg-field">
                        <label htmlFor="lfg-post-description" className="lfg-field-label">
                            {translate("lfg.modal.descriptionLabel")}
                        </label>
                        <textarea
                            id="lfg-post-description"
                            className="lfg-textarea"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder={translate("lfg.modal.descriptionPlaceholder")}
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            disabled={isSubmitting}
                        />
                        <span className="lfg-char-counter">
                            {translate("lfg.modal.charCount", {
                                current: description.length,
                                max: MAX_DESCRIPTION_LENGTH,
                            })}
                        </span>
                    </div>

                    <label className="lfg-checkbox-row">
                        <input
                            type="checkbox"
                            checked={acceptsBeginners}
                            onChange={(event) => setAcceptsBeginners(event.target.checked)}
                            disabled={isSubmitting}
                        />
                        <span>{translate("lfg.modal.acceptsBeginners")}</span>
                    </label>

                    {errorMessage && (
                        <p className="lfg-modal-error" role="alert">
                            {errorMessage}
                        </p>
                    )}

                    <div className="lfg-modal-actions">
                        <button
                            type="button"
                            className="lfg-button-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            {translate("lfg.modal.cancel")}
                        </button>
                        <button
                            type="submit"
                            className="lfg-button-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? translate("lfg.modal.submitting") : translate("lfg.modal.submit")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/**
 * LFG Teammate Search page aligned with Figma (74:856), featuring
 * game/platform/schedule/modality/availability filters, 2-column player cards
 * with % Match and "Buscando partida" badge, LFG posts tab, and creation modal.
 *
 * @param {Object} props - Component props.
 * @param {string} props.language - Active UI language code.
 * @param {string} [props.initialGameId] - Optional videogame UUID to preselect in the filter.
 * @returns {JSX.Element} The rendered LFG Search page.
 */
function LfgSearch({ language, initialGameId = "", onOpenUserProfile = () => {} }) {
    const translate = useTranslation(language);
    const [activeTab, setActiveTab] = useState(TABS.PLAYERS);
    const [videogames, setVideogames] = useState([]);
    const [selectedVideogameId, setSelectedVideogameId] = useState(initialGameId || "");
    const [prevInitialGameId, setPrevInitialGameId] = useState(initialGameId);
    const [selectedPlatform, setSelectedPlatform] = useState("");
    const [selectedSchedule, setSelectedSchedule] = useState("");
    const [selectedModality, setSelectedModality] = useState("");
    const [availableOnly, setAvailableOnly] = useState(true);

    const [players, setPlayers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [filterOptions, setFilterOptions] = useState({
        platforms: [],
        availabilities: [],
        styles: MODALITY_OPTIONS,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadToken, setReloadToken] = useState(0);

    const [followedPlayerIds, setFollowedPlayerIds] = useState(() => new Set());
    const [busyFollowId, setBusyFollowId] = useState(null);
    const [feedbackBanner, setFeedbackBanner] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [openMenuPostId, setOpenMenuPostId] = useState(null);
    const [reportTarget, setReportTarget] = useState(null);
    const openMenuRef = useRef(null);

    if (initialGameId !== prevInitialGameId) {
        setPrevInitialGameId(initialGameId);
        setSelectedVideogameId(initialGameId || "");
    }

    useEffect(() => {
        if (openMenuPostId === null) {
            return undefined;
        }

        function handleOutsideClick(event) {
            if (openMenuRef.current && !openMenuRef.current.contains(event.target)) {
                setOpenMenuPostId(null);
            }
        }

        function handleEscapeKey(event) {
            if (event.key === "Escape") {
                setOpenMenuPostId(null);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("keydown", handleEscapeKey);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            window.removeEventListener("keydown", handleEscapeKey);
        };
    }, [openMenuPostId]);

    useEffect(() => {
        const controller = new AbortController();
        fetchVideogames({}, { signal: controller.signal })
            .then((items) => {
                setVideogames(items);
            })
            .catch((err) => {
                if (err.name !== "AbortError") {
                    setVideogames([]);
                }
            });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (activeTab !== TABS.PLAYERS || players.length === 0) {
            return undefined;
        }
        const controller = new AbortController();
        const ids = players
            .map((player) => player.id_user)
            .filter((id) => typeof id === "string" && UUID_REGEX.test(id));

        fetchFollowedIds(ids, { signal: controller.signal })
            .then(setFollowedPlayerIds)
            .catch((err) => {
                if (err.name !== "AbortError") {
                    setFollowedPlayerIds(new Set());
                }
            });

        return () => controller.abort();
    }, [players, activeTab]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadLfgData() {
            setIsLoading(true);
            setError(null);

            try {
                if (activeTab === TABS.PLAYERS) {
                    const result = await fetchLfgPlayers(
                        {
                            gameId: selectedVideogameId,
                            platform: selectedPlatform,
                            availability: selectedSchedule,
                            style: selectedModality,
                            onlyAvailable: availableOnly,
                        },
                        { signal: controller.signal }
                    );
                    setPlayers(result.players);
                    if (result.filters) {
                        setFilterOptions((prev) => ({
                            platforms: result.filters.platforms.length > 0 ? result.filters.platforms : prev.platforms,
                            availabilities: result.filters.availabilities.length > 0 ? result.filters.availabilities : prev.availabilities,
                            styles: result.filters.styles.length > 0 ? result.filters.styles : prev.styles,
                        }));
                    }
                } else {
                    const items = await fetchLfgPosts(
                        {
                            gameId: selectedVideogameId,
                            platform: selectedPlatform,
                        },
                        { signal: controller.signal }
                    );
                    setPosts(items);
                }
                setIsLoading(false);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err);
                    setIsLoading(false);
                }
            }
        }

        loadLfgData();
        return () => controller.abort();
    }, [
        activeTab,
        selectedVideogameId,
        selectedPlatform,
        selectedSchedule,
        selectedModality,
        availableOnly,
        reloadToken,
    ]);

    const hasActiveFilters =
        selectedVideogameId !== "" ||
        selectedPlatform !== "" ||
        selectedSchedule !== "" ||
        selectedModality !== "" ||
        !availableOnly;

    function handleClearFilters() {
        setSelectedVideogameId("");
        setSelectedPlatform("");
        setSelectedSchedule("");
        setSelectedModality("");
        setAvailableOnly(true);
    }

    async function handleToggleFollow(playerId) {
        if (!UUID_REGEX.test(playerId) || busyFollowId !== null) {
            return;
        }
        const isFollowing = followedPlayerIds.has(playerId);
        setBusyFollowId(playerId);
        try {
            if (isFollowing) {
                await unfollowUser(playerId);
            } else {
                await followUser(playerId);
            }
            setFollowedPlayerIds((prev) => {
                const next = new Set(prev);
                if (isFollowing) {
                    next.delete(playerId);
                } else {
                    next.add(playerId);
                }
                return next;
            });
        } catch {
            setFeedbackBanner({
                type: "error",
                message: translate("follows.errors.update")
            });
        } finally {
            setBusyFollowId(null);
        }
    }

    function handleOpenProfile(playerId) {
        if (UUID_REGEX.test(playerId)) {
            onOpenUserProfile(playerId);
        }
    }

    function handleComingSoonAction(messageKey) {
        setFeedbackBanner({
            type: "info",
            message: translate(messageKey),
        });
    }

    function handlePostCreated() {
        setIsCreateModalOpen(false);
        setFeedbackBanner({
            type: "success",
            message: translate("lfg.modal.successMessage"),
        });
        setActiveTab(TABS.POSTS);
        setReloadToken((prev) => prev + 1);
    }

    function handleReportLfgPost(post) {
        setOpenMenuPostId(null);
        setReportTarget({
            contentType: REPORT_CONTENT_TYPES.POST,
            reportedContentId: post.id_lfg || post.id,
            author: post.author_display_name || post.author_username || "Player",
            excerpt: post.description || "",
        });
    }

    const platformOptions = filterOptions.platforms.length > 0
        ? filterOptions.platforms
        : DEFAULT_PLATFORM_OPTIONS;
    const availabilityOptions = filterOptions.availabilities;
    const styleOptions = filterOptions.styles.length > 0
        ? filterOptions.styles
        : MODALITY_OPTIONS;

    const activeCount = activeTab === TABS.PLAYERS ? players.length : posts.length;
    const countLabel = activeTab === TABS.PLAYERS
        ? translate("lfg.states.resultsPlayersCount", { count: activeCount })
        : translate("lfg.states.resultsPostsCount", { count: activeCount });

    return (
        <section className="lfg-page" aria-label={translate("lfg.title")}>
            <header className="lfg-header">
                <div className="lfg-title-group">
                    <h1 className="lfg-title">{translate("lfg.title")}</h1>
                    <p className="lfg-subtitle">{translate("lfg.subtitle")}</p>
                </div>
                <button
                    type="button"
                    className="lfg-create-button"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    {translate("lfg.createPostButton")}
                </button>
            </header>

            <div className="lfg-tabs">
                <div className="lfg-tabs-list" role="tablist" aria-label={translate("lfg.tabsLabel")}>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === TABS.PLAYERS}
                        className={`lfg-tab${activeTab === TABS.PLAYERS ? " lfg-tab--active" : ""}`}
                        onClick={() => setActiveTab(TABS.PLAYERS)}
                    >
                        {translate("lfg.tabs.players")}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === TABS.POSTS}
                        className={`lfg-tab${activeTab === TABS.POSTS ? " lfg-tab--active" : ""}`}
                        onClick={() => setActiveTab(TABS.POSTS)}
                    >
                        {translate("lfg.tabs.posts")}
                    </button>
                </div>
                {!isLoading && !error && (
                    <span className="lfg-results-count">{countLabel}</span>
                )}
            </div>

            <div className="lfg-filters-card" role="region" aria-label={translate("lfg.filters.label")}>
                <div className="lfg-filters-row">
                    <div className="lfg-game-select-wrapper">
                        <span className="lfg-game-select-dot" aria-hidden="true" />
                        <select
                            className="lfg-game-select"
                            aria-label={translate("lfg.filters.gameLabel")}
                            value={selectedVideogameId}
                            onChange={(event) => setSelectedVideogameId(event.target.value)}
                        >
                            <option value="">{translate("lfg.filters.gameAll")}</option>
                            {videogames.map((game) => (
                                <option key={game.id_videogame} value={game.id_videogame}>
                                    {game.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <select
                        className="lfg-filter-select"
                        aria-label={translate("lfg.filters.platformLabel")}
                        value={selectedPlatform}
                        onChange={(event) => setSelectedPlatform(event.target.value)}
                    >
                        <option value="">
                            {translate("lfg.filters.platformPrefix", {
                                value: translate("lfg.filters.platformAll"),
                            })}
                        </option>
                        {platformOptions.map((platform) => (
                            <option key={platform} value={platform}>
                                {translate("lfg.filters.platformPrefix", {
                                    value: platform,
                                })}
                            </option>
                        ))}
                    </select>

                    {activeTab === TABS.PLAYERS && (
                        <>
                            <select
                                className="lfg-filter-select"
                                aria-label={translate("lfg.filters.scheduleLabel")}
                                value={selectedSchedule}
                                onChange={(event) => setSelectedSchedule(event.target.value)}
                            >
                                <option value="">
                                    {translate("lfg.filters.schedulePrefix", {
                                        value: translate("lfg.filters.scheduleAll"),
                                    })}
                                </option>
                                {availabilityOptions.map((availability) => (
                                    <option key={availability} value={availability}>
                                        {translate("lfg.filters.schedulePrefix", {
                                            value: formatScheduleLabel(availability, translate),
                                        })}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="lfg-filter-select"
                                aria-label={translate("lfg.filters.modalityLabel")}
                                value={selectedModality}
                                onChange={(event) => setSelectedModality(event.target.value)}
                            >
                                <option value="">
                                    {translate("lfg.filters.modalityPrefix", {
                                        value: translate("lfg.filters.modalityAll"),
                                    })}
                                </option>
                                {styleOptions.map((modality) => (
                                    <option key={modality} value={modality}>
                                        {translate("lfg.filters.modalityPrefix", {
                                            value: translate(`lfg.modalities.${modality}`),
                                        })}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                className={`lfg-available-toggle${availableOnly ? " lfg-available-toggle--active" : ""}`}
                                aria-pressed={availableOnly}
                                onClick={() => setAvailableOnly((prev) => !prev)}
                            >
                                {availableOnly ? `✓ ${translate("lfg.filters.availableOnly")}` : translate("lfg.filters.availableOnly")}
                            </button>
                        </>
                    )}

                    {hasActiveFilters && (
                        <button
                            type="button"
                            className="lfg-clear-filters-btn"
                            onClick={handleClearFilters}
                        >
                            {translate("lfg.filters.clear")}
                        </button>
                    )}
                </div>
            </div>

            {feedbackBanner && (
                <div
                    className={`lfg-feedback-banner${feedbackBanner.type === "success" ? " lfg-feedback-banner--success" : ""}`}
                    role="status"
                >
                    <span>{feedbackBanner.message}</span>
                    <button
                        type="button"
                        className="lfg-feedback-dismiss"
                        aria-label={translate("lfg.modal.close")}
                        onClick={() => setFeedbackBanner(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {isLoading && (
                <div className="lfg-state-card" role="status">
                    <p className="lfg-state-message">
                        {activeTab === TABS.PLAYERS
                            ? translate("lfg.states.loadingPlayers")
                            : translate("lfg.states.loadingPosts")}
                    </p>
                </div>
            )}

            {!isLoading && error && (
                <div className="lfg-state-card" role="alert">
                    <h2 className="lfg-state-title">{translate("lfg.states.errorTitle")}</h2>
                    <p className="lfg-state-message">{translate("lfg.states.errorMessage")}</p>
                    <button
                        type="button"
                        className="lfg-button-primary"
                        onClick={() => setReloadToken((prev) => prev + 1)}
                    >
                        {translate("lfg.states.retry")}
                    </button>
                </div>
            )}

            {!isLoading && !error && activeTab === TABS.PLAYERS && players.length === 0 && (
                <div className="lfg-state-card">
                    <div className="lfg-state-icon" aria-hidden="true">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <h2 className="lfg-state-title">{translate("lfg.states.emptyPlayersTitle")}</h2>
                    <p className="lfg-state-message">{translate("lfg.states.emptyPlayersMessage")}</p>
                    <button
                        type="button"
                        className="lfg-button-primary"
                        onClick={handleClearFilters}
                    >
                        {translate("lfg.filters.clear")}
                    </button>
                </div>
            )}

            {!isLoading && !error && activeTab === TABS.PLAYERS && players.length > 0 && (
                <div className="lfg-grid">
                    {players.map((player) => {
                        const playerId = player.id_user || player.id || player.username;
                        const displayName = player.display_name || player.username || "Player";
                        const sharedGames = getPlayerGames(player);
                        const matchBreakdown = buildMatchBreakdown(player, translate);
                        const matchPercentage = typeof player.match_percentage === "number"
                            ? Math.round(player.match_percentage)
                            : null;
                        const isFollowing = followedPlayerIds.has(playerId);

                        return (
                            <article key={playerId} className="lfg-card">
                                <div className="lfg-card-header">
                                    <div className="lfg-card-user">
                                        <PlayerAvatar avatarUrl={player.profile_photo_url} name={displayName} />
                                        <div className="lfg-user-meta">
                                            <button
                                                type="button"
                                                className="lfg-user-name-button"
                                                aria-label={translate(
                                                    "follows.viewProfile",
                                                    { name: displayName }
                                                )}
                                                onClick={() => handleOpenProfile(player.id_user)}
                                            >
                                                <h2 className="lfg-user-name">{displayName}</h2>
                                            </button>
                                            <p className="lfg-user-subtitle">
                                                {formatPlayerMeta(player, translate)}
                                            </p>
                                        </div>
                                    </div>
                                    {player.looking_to_play && (
                                        <span className="lfg-status-pill">
                                            <span className="lfg-status-dot" aria-hidden="true" />
                                            <span>{translate("lfg.playerCard.lookingToPlay")}</span>
                                        </span>
                                    )}
                                </div>

                                {(sharedGames.length > 0 || matchPercentage !== null) && (
                                    <div className="lfg-tags-row" aria-label={translate("lfg.playerCard.sharedGamesLabel")}>
                                        {sharedGames.map((gameName) => (
                                            <GamePill key={gameName} label={gameName} />
                                        ))}
                                        {matchPercentage !== null && (
                                            <span className="lfg-match-pill">
                                                {translate("lfg.playerCard.matchBadge", { percent: matchPercentage })}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <p className="lfg-card-description">
                                    {player.description && player.description.trim() !== ""
                                        ? player.description
                                        : translate("lfg.playerCard.noBio")}
                                </p>

                                <div className="lfg-match-breakdown">
                                    <p className="lfg-match-breakdown-title">
                                        {translate("lfg.playerCard.matchWhyTitle")}
                                    </p>
                                    {matchBreakdown.length > 0 ? (
                                        <ul className="lfg-match-breakdown-list">
                                            {matchBreakdown.map((item) => (
                                                <li key={item.key} className="lfg-match-breakdown-item">
                                                    <span className="lfg-match-breakdown-dot" aria-hidden="true" />
                                                    <span>{item.text}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="lfg-match-breakdown-empty">
                                            {translate("lfg.playerCard.matchNoDirectOverlap")}
                                        </p>
                                    )}
                                </div>

                                <div className="lfg-card-actions">
                                    <button
                                        type="button"
                                        className={`lfg-btn-follow${isFollowing ? " lfg-btn-follow--active" : ""}`}
                                        aria-pressed={isFollowing}
                                        disabled={busyFollowId === playerId}
                                        onClick={() => handleToggleFollow(playerId)}
                                    >
                                        {isFollowing
                                            ? translate("lfg.playerCard.following")
                                            : translate("lfg.playerCard.follow")}
                                    </button>
                                    <button
                                        type="button"
                                        className="lfg-btn-primary-sm"
                                        onClick={() => handleComingSoonAction("lfg.playerCard.messageSoon")}
                                    >
                                        {translate("lfg.playerCard.sendMessage")}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {!isLoading && !error && activeTab === TABS.POSTS && posts.length === 0 && (
                <div className="lfg-state-card">
                    <div className="lfg-state-icon" aria-hidden="true">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <h2 className="lfg-state-title">{translate("lfg.states.emptyPostsTitle")}</h2>
                    <p className="lfg-state-message">{translate("lfg.states.emptyPostsMessage")}</p>
                    <button
                        type="button"
                        className="lfg-button-primary"
                        onClick={handleClearFilters}
                    >
                        {translate("lfg.filters.clear")}
                    </button>
                </div>
            )}

            {!isLoading && !error && activeTab === TABS.POSTS && posts.length > 0 && (
                <div className="lfg-grid">
                    {posts.map((post) => {
                        const postId = post.id_lfg || post.id;
                        const authorName = post.author_display_name || post.author_username || "Player";
                        const spotsCount = Number(post.spots_available) || 1;
                        const spotsLabel = spotsCount === 1
                            ? translate("lfg.postCard.oneSpotLeft")
                            : translate("lfg.postCard.spotsLeft", { count: spotsCount });
                        const gameName = post.videogame_name || post.game_name || "";
                        const isMenuOpen = openMenuPostId === postId;

                        return (
                            <article key={postId} className="lfg-card">
                                <div className="lfg-card-header">
                                    <div className="lfg-card-user">
                                        <PlayerAvatar avatarUrl={post.author_profile_photo_url} name={authorName} />
                                        <div className="lfg-user-meta">
                                            <h2 className="lfg-user-name">{authorName}</h2>
                                            <p className="lfg-user-subtitle">
                                                {`${post.platform} · ${formatScheduleLabel(post.scheduled_time, translate)}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="lfg-card-header-right">
                                        <span className="lfg-status-pill">
                                            <span className="lfg-status-dot" aria-hidden="true" />
                                            <span>{spotsLabel}</span>
                                        </span>
                                        <div
                                            className="lfg-post-menu-wrapper"
                                            ref={isMenuOpen ? openMenuRef : null}
                                        >
                                            <button
                                                type="button"
                                                className="lfg-post-menu-trigger"
                                                aria-haspopup="menu"
                                                aria-expanded={isMenuOpen}
                                                aria-label={translate("lfg.postCard.moreOptions")}
                                                onClick={() => setOpenMenuPostId(isMenuOpen ? null : postId)}
                                            >
                                                •••
                                            </button>
                                            {isMenuOpen && (
                                                <div className="lfg-post-menu-dropdown" role="menu">
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        className="lfg-post-menu-item"
                                                        onClick={() => handleReportLfgPost(post)}
                                                    >
                                                        {translate("lfg.postCard.reportPost")}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="lfg-tags-row">
                                    {gameName !== "" && <GamePill label={gameName} />}
                                    {post.accepts_beginners && (
                                        <span className="lfg-beginner-pill">
                                            {translate("lfg.postCard.acceptsBeginners")}
                                        </span>
                                    )}
                                </div>

                                <p className="lfg-card-description">{post.description}</p>

                                <div className="lfg-card-actions">
                                    <button
                                        type="button"
                                        className="lfg-btn-primary-sm"
                                        onClick={() => handleComingSoonAction("lfg.postCard.contactSoon")}
                                    >
                                        {translate("lfg.postCard.joinSquad")}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {isCreateModalOpen && (
                <CreateLfgPostModal
                    videogames={videogames}
                    platformOptions={platformOptions}
                    translate={translate}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreated={handlePostCreated}
                />
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

export default LfgSearch;
