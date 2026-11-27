import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from "./i18n/i18n.js";
import { useTranslation } from "./hooks/useTranslation.js";
import ExploreGames from "./pages/ExploreGames.jsx";
import GameDetail from "./pages/GameDetail.jsx";
import LfgSearch from "./pages/LfgSearch.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import Messages from "./pages/Messages.jsx";
import ModerationPanel from "./pages/ModerationPanel.jsx";
import LoginForm from "./components/LoginForm.jsx";
import RegisterForm from "./components/RegisterForm.jsx";
import { fetchCurrentUser, logout } from "./services/authService.js";
import ProfileForm from "./ProfileForm.jsx";
import WelcomeSurvey from "./WelcomeSurvey.jsx";
import { loadWelcomeSurvey } from "./services/welcomeSurveyService.js";
import "./App.css";
import "./Auth.css";

const VIEWS = {
    EXPLORE: "explore",
    LFG: "lfg",
    PROFILE: "profile",
    USER_PROFILE: "userProfile",
    MESSAGES: "messages",
};

const ADMIN_ROUTES = new Set(["/admin", "/admin/moderation"]);

const SURVEY_CHECK_FAILED = "failed";
const UNAUTHORIZED_STATUS = 401;

const LIBRARY_STORAGE_KEY = "letsPlay.gameLibrary";

const EXPLORE_NAV_ITEMS = [
    { key: "home", view: null },
    { key: "discover", view: null },
    { key: "lfg", view: VIEWS.LFG },
    { key: "games", view: VIEWS.EXPLORE },
    { key: "communities", view: null },
    { key: "createCommunity", view: null },
    { key: "messages", view: VIEWS.MESSAGES },
    { key: "profile", view: VIEWS.PROFILE },
];

const PLACEHOLDER_COMMUNITIES = ["CoopGames", "IndieGames", "SetupGamer"];

/**
 * Checks whether the browser pathname targets the isolated administration shell.
 *
 * @param {string} pathname - Current window.location.pathname value.
 * @returns {boolean} True when the pathname is an admin moderation route.
 */
function isAdminPathname(pathname) {
    return ADMIN_ROUTES.has(pathname);
}

/**
 * Loads the locally persisted videogame library from localStorage,
 * degrading safely to an empty array if missing or malformed.
 *
 * @returns {Array<{id_videogame: string, name: string}>} Saved library items.
 */
function loadLibraryGames() {
    try {
        const rawValue = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
        if (!rawValue) {
            return [];
        }
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(
            (item) =>
                item &&
                typeof item.id_videogame === "string" &&
                item.id_videogame.trim() !== "" &&
                typeof item.name === "string" &&
                item.name.trim() !== ""
        );
    } catch {
        return [];
    }
}

/**
 * Persists the local videogame library list in localStorage.
 *
 * @param {Array<{id_videogame: string, name: string}>} games - Library items to save.
 */
function saveLibraryGames(games) {
    try {
        window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(games));
    } catch {
        // Ignore storage quota or private browsing errors cleanly.
    }
}

/**
 * Application root: gates access behind authentication and the welcome survey,
 * then renders the Figma-aligned Top Header, Left Sidebar, and active workspace
 * view (Explore Games, Game Detail, Profile, LFG, or the admin moderation shell).
 *
 * @returns {JSX.Element} The rendered application.
 */
function App() {
    const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
    // Undefined while the session is checked with the server, null when signed out.
    const [currentUser, setCurrentUser] = useState(undefined);
    const [authView, setAuthView] = useState("login");
    // Null until the saved preferences of the account are read; SURVEY_CHECK_FAILED on error.
    const [surveyCompleted, setSurveyCompleted] = useState(null);
    const [surveyRetryCount, setSurveyRetryCount] = useState(0);
    const [isAdminRoute, setIsAdminRoute] = useState(() =>
        isAdminPathname(window.location.pathname)
    );
    const [activeView, setActiveView] = useState(VIEWS.EXPLORE);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [profileReturnView, setProfileReturnView] = useState(VIEWS.LFG);
    const [selectedGameId, setSelectedGameId] = useState(null);
    const [messagePeerId, setMessagePeerId] = useState(null);
    const [lfgPreselectedGameId, setLfgPreselectedGameId] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [libraryGames, setLibraryGames] = useState(loadLibraryGames);
    const translate = useTranslation(language);

    useEffect(() => {
        function handlePopState() {
            setIsAdminRoute(isAdminPathname(window.location.pathname));
        }

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    useEffect(() => {
        let isActive = true;
        const restoreSession = async () => {
            try {
                const user = await fetchCurrentUser();
                if (isActive) {
                    setCurrentUser(user);
                }
            } catch (error) {
                console.error("App.restoreSession", error);
                if (isActive) {
                    setCurrentUser(null);
                }
            }
        };
        restoreSession();
        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (!currentUser) {
            return undefined;
        }
        let isActive = true;
        const checkSurveyCompletion = async () => {
            try {
                const savedSelection = await loadWelcomeSurvey();
                if (isActive) {
                    setSurveyCompleted(savedSelection !== null);
                }
            } catch (error) {
                console.error("App.checkSurveyCompletion", error);
                if (!isActive) {
                    return;
                }
                if (error.status === UNAUTHORIZED_STATUS) {
                    setCurrentUser(null);
                    return;
                }
                setSurveyCompleted(SURVEY_CHECK_FAILED);
            }
        };
        checkSurveyCompletion();
        return () => {
            isActive = false;
        };
    }, [currentUser, surveyRetryCount]);

    function handleLoginSuccess(user) {
        setCurrentUser(user);
    }

    function handleSurveyCompleted() {
        setSurveyCompleted(true);
    }

    function handleRetrySurveyCheck() {
        setSurveyCompleted(null);
        setSurveyRetryCount((count) => count + 1);
    }

    const handleSessionExpired = useCallback(() => {
        setCurrentUser(null);
        setSurveyCompleted(null);
        setAuthView("login");
        setActiveView(VIEWS.EXPLORE);
        setSelectedGameId(null);
        setSelectedUserId(null);
    }, []);

    async function handleLogout() {
        await logout();
        handleSessionExpired();
    }

    function handleSelectView(view) {
        if (view === VIEWS.LFG) {
            setLfgPreselectedGameId("");
        }
        setActiveView(view);
        setSelectedGameId(null);
        setSelectedUserId(null);
    }

    const handleOpenUserProfile = useCallback((userId) => {
        if (typeof userId !== "string" || userId.trim() === "") {
            return;
        }
        setProfileReturnView(activeView === VIEWS.USER_PROFILE ? profileReturnView : activeView);
        setSelectedUserId(userId);
        setSelectedGameId(null);
        setActiveView(VIEWS.USER_PROFILE);
    }, [activeView, profileReturnView]);

    const handleOpenMessages = useCallback((userId) => {
        if (typeof userId !== "string" || userId.trim() === "") {
            return;
        }
        setMessagePeerId(userId);
        setSelectedGameId(null);
        setSelectedUserId(null);
        setActiveView(VIEWS.MESSAGES);
    }, []);

    function handleFindPlayersForGame(gameId) {
        setLfgPreselectedGameId(gameId || "");
        setSelectedGameId(null);
        setActiveView(VIEWS.LFG);
    }

    function handleSearchChange(event) {
        const nextValue = event.target.value;
        setSearchQuery(nextValue);
        if (activeView !== VIEWS.EXPLORE || selectedGameId !== null) {
            setActiveView(VIEWS.EXPLORE);
            setSelectedGameId(null);
        }
    }

    function handleSelectGame(gameId) {
        setActiveView(VIEWS.EXPLORE);
        setSelectedGameId(gameId);
    }

    function handleToggleLibraryGame(game) {
        if (!game || typeof game.id_videogame !== "string") {
            return;
        }
        setLibraryGames((prev) => {
            const exists = prev.some((item) => item.id_videogame === game.id_videogame);
            const next = exists
                ? prev.filter((item) => item.id_videogame !== game.id_videogame)
                : [...prev, { id_videogame: game.id_videogame, name: game.name }];
            saveLibraryGames(next);
            return next;
        });
    }

    const libraryGameIds = new Set(libraryGames.map((item) => item.id_videogame));

    function renderLanguageToggle() {
        return (
            <div
                className="app-language-toggle"
                role="group"
                aria-label={translate("header.languageToggle")}
            >
                {LANGUAGE_CODES.map((languageCode) => (
                    <button
                        type="button"
                        key={languageCode}
                        className={`app-language-button${language === languageCode ? " app-language-button--active" : ""}`}
                        aria-pressed={language === languageCode}
                        onClick={() => setLanguage(languageCode)}
                    >
                        {languageCode.toUpperCase()}
                    </button>
                ))}
            </div>
        );
    }

    function renderUserBar() {
        return (
            <div className="app-user-bar">
                <div className="app-user-info">
                    <span className="app-user-avatar" aria-hidden="true">
                        {currentUser.username.charAt(0)}
                    </span>
                    <span className="app-user-name">@{currentUser.username}</span>
                </div>
                <button
                    type="button"
                    className="app-logout-button"
                    onClick={handleLogout}
                >
                    {translate("auth.session.logout")}
                </button>
            </div>
        );
    }

    function renderAuthView() {
        return (
            <div className="auth-view-container">
                {authView === "login" && (
                    <LoginForm
                        translate={translate}
                        onNavigate={setAuthView}
                        onLoginSuccess={handleLoginSuccess}
                    />
                )}
                {authView === "register" && (
                    <RegisterForm
                        translate={translate}
                        onNavigate={setAuthView}
                        onLoginSuccess={handleLoginSuccess}
                    />
                )}
            </div>
        );
    }

    function renderSurveyCheckError() {
        return (
            <div className="auth-card-wrapper">
                <p className="survey-error" role="alert">{translate("survey.errors.load")}</p>
                <button type="button" className="survey-submit" onClick={handleRetrySurveyCheck}>
                    {translate("survey.actions.retry")}
                </button>
            </div>
        );
    }

    function renderGateLayout(content) {
        return (
            <div className="app">
                <header className="app-header">
                    <p className="app-brand">
                        <span className="app-brand-name">{translate("header.title")}</span>
                    </p>

                    <div className="app-header-actions">
                        {currentUser && renderUserBar()}
                        {renderLanguageToggle()}
                    </div>
                </header>

                <main className="app-main">{content}</main>
            </div>
        );
    }

    function renderWorkspaceContent() {
        if (activeView === VIEWS.MESSAGES) {
            return (
                <Messages
                    key={messagePeerId ?? "inbox"}
                    language={language}
                    currentUserId={currentUser.id}
                    initialPeerId={messagePeerId}
                    onSessionExpired={handleSessionExpired}
                />
            );
        }
        if (activeView === VIEWS.PROFILE) {
            return (
                <ProfileForm
                    language={language}
                    currentUserId={currentUser.id}
                    onOpenUserProfile={handleOpenUserProfile}
                    onSessionExpired={handleSessionExpired}
                />
            );
        }
        if (activeView === VIEWS.USER_PROFILE && selectedUserId !== null) {
            return (
                <UserProfile
                    key={selectedUserId}
                    userId={selectedUserId}
                    language={language}
                    currentUserId={currentUser.id}
                    onBack={() => handleSelectView(profileReturnView)}
                    onOpenProfile={handleOpenUserProfile}
                    onOpenMessages={handleOpenMessages}
                    onSessionExpired={handleSessionExpired}
                />
            );
        }
        if (activeView === VIEWS.LFG) {
            return (
                <LfgSearch
                    language={language}
                    initialGameId={lfgPreselectedGameId}
                    onOpenUserProfile={handleOpenUserProfile}
                    onOpenMessages={handleOpenMessages}
                />
            );
        }
        if (selectedGameId) {
            return (
                <GameDetail
                    gameId={selectedGameId}
                    language={language}
                    onBack={() => setSelectedGameId(null)}
                    isInLibrary={libraryGameIds.has(selectedGameId)}
                    onToggleLibrary={handleToggleLibraryGame}
                    onFindPlayers={handleFindPlayersForGame}
                />
            );
        }
        return (
            <ExploreGames
                language={language}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery("")}
                onSelectGame={handleSelectGame}
                libraryGameIds={libraryGameIds}
                onToggleLibrary={handleToggleLibraryGame}
            />
        );
    }

    if (currentUser === undefined) {
        return renderGateLayout(null);
    }
    if (!currentUser) {
        return renderGateLayout(renderAuthView());
    }
    if (surveyCompleted === null) {
        return renderGateLayout(null);
    }
    if (surveyCompleted === SURVEY_CHECK_FAILED) {
        return renderGateLayout(renderSurveyCheckError());
    }
    if (!surveyCompleted) {
        return renderGateLayout(
            <WelcomeSurvey
                language={language}
                onCompleted={handleSurveyCompleted}
                onSessionExpired={handleSessionExpired}
            />
        );
    }

    if (isAdminRoute) {
        return (
            <div className="app">
                <header className="app-header app-header--admin">
                    <div className="app-brand app-brand--static">
                        <span className="app-brand-avatar" aria-hidden="true">L</span>
                        <span className="app-brand-name">
                            {translate("header.title")}
                        </span>
                        <span className="app-admin-separator" aria-hidden="true">·</span>
                        <span className="app-admin-badge">
                            {translate("adminHeader.badge")}
                        </span>
                    </div>

                    <div className="app-header-actions">
                        {renderUserBar()}
                        {renderLanguageToggle()}
                        <a href="/" className="app-admin-back-link">
                            {translate("adminHeader.backToApp")}
                        </a>
                    </div>
                </header>

                <main className="app-workspace app-workspace--admin">
                    <ModerationPanel language={language} />
                </main>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="app-header">
                <button
                    type="button"
                    className="app-brand"
                    onClick={() => handleSelectView(VIEWS.EXPLORE)}
                >
                    <span className="app-brand-avatar" aria-hidden="true">L</span>
                    <span className="app-brand-name">{translate("header.title")}</span>
                </button>

                <div className="app-header-search">
                    <label htmlFor="app-global-search" className="app-sr-only">
                        {translate("header.searchLabel")}
                    </label>
                    <input
                        id="app-global-search"
                        type="search"
                        className="app-search-input"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder={translate("header.searchPlaceholder")}
                    />
                </div>

                <div className="app-header-actions">
                    {renderUserBar()}
                    {renderLanguageToggle()}

                    <button
                        type="button"
                        className="app-create-post-button"
                        disabled
                        title={translate("common.comingSoon")}
                    >
                        {translate("header.createPost")}
                    </button>

                    <button
                        type="button"
                        className="app-notif-button"
                        disabled
                        aria-label={translate("header.notifications")}
                        title={translate("common.comingSoon")}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        className={`app-profile-avatar${activeView === VIEWS.PROFILE ? " app-profile-avatar--active" : ""}`}
                        aria-label={translate("header.profileButton")}
                        aria-current={activeView === VIEWS.PROFILE ? "page" : undefined}
                        onClick={() => handleSelectView(VIEWS.PROFILE)}
                    >
                        LP
                    </button>
                </div>
            </header>

            <div className="app-body">
                <aside className="app-sidebar" aria-label={translate("sidebar.navigationLabel")}>
                    <nav className="app-sidebar-section" aria-label={translate("header.nav.navigation")}>
                        <p className="app-sidebar-heading">
                            {translate("sidebar.exploreSection")}
                        </p>
                        {EXPLORE_NAV_ITEMS.map((item) => {
                            const isEnabled = item.view !== null;
                            const isActive = isEnabled && activeView === item.view;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    disabled={!isEnabled}
                                    title={!isEnabled ? translate("common.comingSoon") : undefined}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`app-sidebar-item${isActive ? " app-sidebar-item--active" : ""}${!isEnabled ? " app-sidebar-item--disabled" : ""}`}
                                    onClick={isEnabled ? () => handleSelectView(item.view) : undefined}
                                >
                                    <span
                                        className={`app-sidebar-dot${isActive ? " app-sidebar-dot--active" : ""}`}
                                        aria-hidden="true"
                                    />
                                    <span className="app-sidebar-label">
                                        {translate(`sidebar.items.${item.key}`)}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="app-sidebar-divider" aria-hidden="true" />

                    <div className="app-sidebar-section">
                        <p className="app-sidebar-heading">
                            {translate("sidebar.communitiesSection")}
                        </p>
                        {PLACEHOLDER_COMMUNITIES.map((communityName) => (
                            <button
                                key={communityName}
                                type="button"
                                disabled
                                title={translate("common.comingSoon")}
                                className="app-sidebar-item app-sidebar-item--disabled"
                            >
                                <span className="app-sidebar-dot app-sidebar-dot--community" aria-hidden="true" />
                                <span className="app-sidebar-label">{communityName}</span>
                            </button>
                        ))}
                    </div>

                    <div className="app-sidebar-divider" aria-hidden="true" />

                    <div className="app-sidebar-section">
                        <p className="app-sidebar-heading">
                            {translate("sidebar.yourGamesSection")}
                        </p>
                        {libraryGames.length === 0 ? (
                            <p className="app-sidebar-empty">
                                {translate("sidebar.yourGamesEmpty")}
                            </p>
                        ) : (
                            <div className="app-sidebar-games">
                                {libraryGames.map((game) => (
                                    <button
                                        key={game.id_videogame}
                                        type="button"
                                        className="app-game-pill"
                                        onClick={() => handleSelectGame(game.id_videogame)}
                                    >
                                        <span className="app-game-pill-dot" aria-hidden="true" />
                                        <span className="app-game-pill-text">{game.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                <main className="app-workspace">
                    {renderWorkspaceContent()}
                </main>
            </div>
        </div>
    );
}

export default App;
