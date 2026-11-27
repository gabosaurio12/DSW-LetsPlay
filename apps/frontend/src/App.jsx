import { useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from "./i18n/i18n.js";
import { useTranslation } from "./hooks/useTranslation.js";
import { getCurrentUser, logout } from "./services/authService.js";
import LoginForm from "./components/LoginForm.jsx";
import RegisterForm from "./components/RegisterForm.jsx";
import RecoveryForm from "./components/RecoveryForm.jsx";
import ProfileForm from "./ProfileForm.jsx";
import WelcomeSurvey from "./WelcomeSurvey.jsx";
import { loadWelcomeSurvey } from "./services/welcomeSurveyService.js";
import "./App.css";
import "./Auth.css";

/**
 * Root component that orchestrates authentication flows (login, register,
 * recovery, logout). While there is no session it renders the auth views;
 * once authenticated it enforces the welcome survey when it has not been
 * completed yet and renders the main user profile view otherwise.
 *
 * @returns {JSX.Element} The rendered application.
 */
function App() {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [authView, setAuthView] = useState("login");
  // Null until the stored survey answers of the session are read.
  const [surveyCompleted, setSurveyCompleted] = useState(null);
  const translate = useTranslation(language);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }
    let isActive = true;
    const checkSurveyCompletion = async () => {
      const storedSelection = await loadWelcomeSurvey();
      if (isActive) {
        setSurveyCompleted(storedSelection !== null);
      }
    };
    checkSurveyCompletion();
    return () => {
      isActive = false;
    };
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setSurveyCompleted(null);
    setAuthView("login");
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleSurveyCompleted = () => {
    setSurveyCompleted(true);
  };

  const renderMainView = () => {
    if (!currentUser) {
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
          {authView === "recovery" && (
            <RecoveryForm
              translate={translate}
              onNavigate={setAuthView}
            />
          )}
        </div>
      );
    }
    if (surveyCompleted === null) {
      // The stored answers are read asynchronously before choosing a view.
      return null;
    }
    if (!surveyCompleted) {
      return (
        <WelcomeSurvey language={language} onCompleted={handleSurveyCompleted} />
      );
    }
    return <ProfileForm language={language} />;
  };

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-brand">
          <span className="app-brand-name">{translate("header.title")}</span>
        </p>

        <div className="app-header-actions">
          {currentUser && (
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
          )}

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
        </div>
      </header>

      <main className="app-main">{renderMainView()}</main>
    </div>
  );
}

export default App;
