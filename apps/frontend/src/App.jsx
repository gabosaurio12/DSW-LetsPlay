import { useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from "./i18n/i18n.js";
import { useTranslation } from "./hooks/useTranslation.js";
import WelcomeSurvey from "./WelcomeSurvey.jsx";
import "./App.css";

/**
 * Application root: renders the welcome survey with a language switch.
 *
 * @returns {JSX.Element} The rendered application.
 */
function App() {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const translate = useTranslation(language);
  return (
    <div className="app">
      <header className="app-header">
        <p className="app-brand">
          <span className="app-brand-name">{translate("header.title")}</span>
        </p>
        <div className="app-language-toggle" role="group" aria-label={translate("header.languageToggle")}>
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
      </header>
      <main className="app-main">
        <WelcomeSurvey language={language} />
      </main>
    </div>
  );
}

export default App;
