import { useEffect, useState } from "react";
import { useTranslation } from "../hooks/useTranslation.js";
import { fetchVideogameFilters, fetchVideogames } from "../services/videogameService.js";
import "./ExploreGames.css";

const SEARCH_DEBOUNCE_MS = 250;

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
 * Renders a rectangular 460/215 videogame cover using cover_url when available
 * or an initials fallback on missing/broken images.
 *
 * @param {Object} props - Component props.
 * @param {string|null|undefined} props.coverUrl - Public URL of the videogame cover.
 * @param {string} props.name - Videogame title used for alt text and initials fallback.
 * @returns {JSX.Element} The rendered rectangular cover.
 */
function GameCover({ coverUrl, name }) {
    const [hasImageError, setHasImageError] = useState(false);
    const showImage = Boolean(coverUrl) && !hasImageError;

    return (
        <div className="explore-game-cover-wrapper">
            {showImage ? (
                <img
                    src={coverUrl}
                    alt={name}
                    loading="lazy"
                    className="explore-game-cover-img"
                    onError={() => setHasImageError(true)}
                />
            ) : (
                <div className="explore-game-cover-fallback" aria-hidden="true">
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
        <span className="explore-game-pill">
            <span className="explore-game-pill-dot" aria-hidden="true" />
            <span className="explore-game-pill-text">{label}</span>
        </span>
    );
}

/**
 * Public videogame catalog page aligned with Figma (69:549),
 * featuring horizontal pill filters, 2-column game cards, and local library toggles.
 *
 * @param {Object} props - Component props.
 * @param {string} props.language - Active UI language code.
 * @param {string} [props.searchQuery] - Search query controlled by the shell header.
 * @param {Function} [props.onClearSearch] - Callback to clear the shell search input.
 * @param {Function} [props.onSelectGame] - Callback invoked with a videogame ID when a card is opened.
 * @param {Set<string>} [props.libraryGameIds] - Set of videogame IDs saved in the local library.
 * @param {Function} [props.onToggleLibrary] - Callback to add/remove a videogame from the local library.
 * @returns {JSX.Element} The rendered Explore Games view.
 */
function ExploreGames({
    language,
    searchQuery = "",
    onClearSearch,
    onSelectGame,
    libraryGameIds = new Set(),
    onToggleLibrary,
}) {
    const translate = useTranslation(language);
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery.trim());
    const [selectedGenre, setSelectedGenre] = useState("");
    const [selectedPlatform, setSelectedPlatform] = useState("");
    const [genres, setGenres] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [videogames, setVideogames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryCounter, setRetryCounter] = useState(0);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadFilters() {
            try {
                const filterData = await fetchVideogameFilters({ signal: controller.signal });
                setGenres(filterData.genres);
                setPlatforms(filterData.platforms);
            } catch (error) {
                if (error.name !== "AbortError") {
                    // Filter options are non-blocking; catalog can still render without them.
                    setGenres([]);
                    setPlatforms([]);
                }
            }
        }

        loadFilters();
        return () => controller.abort();
    }, [retryCounter]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadVideogames() {
            setIsLoading(true);
            setHasError(false);

            try {
                const items = await fetchVideogames(
                    {
                        genre: selectedGenre,
                        platform: selectedPlatform,
                        search: debouncedSearch,
                    },
                    { signal: controller.signal }
                );
                setVideogames(items);
                setIsLoading(false);
            } catch (error) {
                if (error.name !== "AbortError") {
                    setHasError(true);
                    setIsLoading(false);
                }
            }
        }

        loadVideogames();
        return () => controller.abort();
    }, [selectedGenre, selectedPlatform, debouncedSearch, retryCounter]);

    const hasActiveFilters =
        searchQuery.trim() !== "" || selectedGenre !== "" || selectedPlatform !== "";

    function handleClearFilters() {
        setSelectedGenre("");
        setSelectedPlatform("");
        setDebouncedSearch("");
        if (onClearSearch) {
            onClearSearch();
        }
    }

    function handleToggleGenre(genre) {
        setSelectedGenre((prev) => (prev === genre ? "" : genre));
    }

    function handleTogglePlatform(platform) {
        setSelectedPlatform((prev) => (prev === platform ? "" : platform));
    }

    function handleRetry() {
        setRetryCounter((prev) => prev + 1);
    }

    return (
        <section className="explore-games" aria-labelledby="explore-games-title">
            <header className="explore-games-header">
                <div className="explore-games-title-group">
                    <h1 id="explore-games-title" className="explore-games-title">
                        {translate("exploreGames.title")}
                    </h1>
                    <p className="explore-games-subtitle">
                        {translate("exploreGames.subtitle")}
                    </p>
                </div>
                <button
                    type="button"
                    className="explore-request-button"
                    disabled
                    title={translate("common.comingSoon")}
                >
                    {translate("exploreGames.requestGame")}
                </button>
            </header>

            <div
                className="explore-filters-groups"
                role="region"
                aria-label={translate("exploreGames.filtersLabel")}
            >
                <div className="explore-filter-group">
                    <span id="explore-genre-filter-label" className="explore-filter-group-label">
                        {translate("exploreGames.genreGroupLabel")}
                    </span>
                    <div
                        className="explore-filters-row"
                        role="group"
                        aria-labelledby="explore-genre-filter-label"
                    >
                        <button
                            type="button"
                            className={`explore-filter-pill${selectedGenre === "" ? " explore-filter-pill--active" : ""}`}
                            aria-pressed={selectedGenre === ""}
                            onClick={() => setSelectedGenre("")}
                        >
                            {translate("exploreGames.allOption")}
                        </button>

                        {genres.map((genre) => {
                            const isActive = selectedGenre === genre;
                            return (
                                <button
                                    key={`genre-${genre}`}
                                    type="button"
                                    className={`explore-filter-pill${isActive ? " explore-filter-pill--active" : ""}`}
                                    aria-pressed={isActive}
                                    onClick={() => handleToggleGenre(genre)}
                                >
                                    {genre}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="explore-filter-group">
                    <span id="explore-platform-filter-label" className="explore-filter-group-label">
                        {translate("exploreGames.platformGroupLabel")}
                    </span>
                    <div
                        className="explore-filters-row"
                        role="group"
                        aria-labelledby="explore-platform-filter-label"
                    >
                        <button
                            type="button"
                            className={`explore-filter-pill${selectedPlatform === "" ? " explore-filter-pill--active" : ""}`}
                            aria-pressed={selectedPlatform === ""}
                            onClick={() => setSelectedPlatform("")}
                        >
                            {translate("exploreGames.allPlatformsOption")}
                        </button>

                        {platforms.map((platform) => {
                            const isActive = selectedPlatform === platform;
                            return (
                                <button
                                    key={`platform-${platform}`}
                                    type="button"
                                    className={`explore-filter-pill${isActive ? " explore-filter-pill--active" : ""}`}
                                    aria-pressed={isActive}
                                    onClick={() => handleTogglePlatform(platform)}
                                >
                                    {platform}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="explore-state-card" role="status" aria-live="polite">
                    <div className="explore-spinner" aria-hidden="true" />
                    <p className="explore-state-description">{translate("exploreGames.loading")}</p>
                </div>
            )}

            {!isLoading && hasError && (
                <div className="explore-state-card" role="alert">
                    <div className="explore-state-icon" aria-hidden="true">!</div>
                    <h2 className="explore-state-title">{translate("exploreGames.errorTitle")}</h2>
                    <p className="explore-state-description">{translate("exploreGames.errorMessage")}</p>
                    <button
                        type="button"
                        className="explore-button-primary"
                        onClick={handleRetry}
                    >
                        {translate("exploreGames.retry")}
                    </button>
                </div>
            )}

            {!isLoading && !hasError && videogames.length === 0 && (
                <div className="explore-state-card">
                    <div className="explore-state-icon" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="7" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <h2 className="explore-state-title">{translate("exploreGames.emptyTitle")}</h2>
                    <p className="explore-state-description">{translate("exploreGames.emptyMessage")}</p>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            className="explore-button-primary"
                            onClick={handleClearFilters}
                        >
                            {translate("exploreGames.clearFilters")}
                        </button>
                    )}
                </div>
            )}

            {!isLoading && !hasError && videogames.length > 0 && (
                <div className="explore-games-grid">
                    {videogames.map((game) => {
                        const isSaved = libraryGameIds.has(game.id_videogame);
                        const metaParts = [game.genre, game.platform].filter(Boolean);
                        return (
                            <article
                                key={game.id_videogame}
                                className={`explore-game-card${onSelectGame ? " explore-game-card--interactive" : ""}`}
                                onClick={onSelectGame ? () => onSelectGame(game.id_videogame) : undefined}
                            >
                                <GameCover
                                    key={game.cover_url ?? "no-cover"}
                                    coverUrl={game.cover_url}
                                    name={game.name}
                                />
                                <div className="explore-game-card-top">
                                    <div className="explore-game-meta">
                                        <h2 className="explore-game-name">{game.name}</h2>
                                        {metaParts.length > 0 && (
                                            <p className="explore-game-subtitle">
                                                {metaParts.join(" · ")}
                                            </p>
                                        )}
                                    </div>
                                    <GamePill label={game.name} />
                                </div>

                                <p className="explore-game-description">{game.description}</p>

                                <div className="explore-game-card-footer">
                                    <span className="explore-game-additional">
                                        {game.additional_info ?? ""}
                                    </span>

                                    <div className="explore-game-actions">
                                        {onToggleLibrary && (
                                            <button
                                                type="button"
                                                aria-pressed={isSaved}
                                                title={isSaved
                                                    ? translate("exploreGames.removeFromLibraryTitle")
                                                    : translate("exploreGames.addToLibraryTitle")}
                                                className={`explore-game-library-button${isSaved ? " explore-game-library-button--saved" : ""}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onToggleLibrary(game);
                                                }}
                                            >
                                                {isSaved
                                                    ? translate("exploreGames.inLibrary")
                                                    : translate("exploreGames.addToLibrary")}
                                            </button>
                                        )}

                                        {onSelectGame && (
                                            <button
                                                type="button"
                                                className="explore-game-view-button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onSelectGame(game.id_videogame);
                                                }}
                                            >
                                                {translate("exploreGames.viewPage")}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default ExploreGames;
