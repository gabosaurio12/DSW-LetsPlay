import { useState } from "react";
import { useTranslation } from "../hooks/useTranslation.js";
import { loadWelcomeSurvey } from "../services/welcomeSurveyService.js";
import WelcomeSurvey from "../WelcomeSurvey.jsx";

const UNAUTHORIZED_STATUS = 401;

/**
 * Profile section that shows the gaming preferences of the account and opens the
 * survey form in edit mode, pre-filled with the saved answers.
 *
 * @param {Object} props - The component props.
 * @param {string} props.language - The current application language code.
 * @param {() => void} [props.onSessionExpired] - Called when the server reports that the session has expired.
 * @returns {JSX.Element} The rendered preferences section.
 */
function GamerPreferencesSection({ language, onSessionExpired }) {
  const translate = useTranslation(language);
  const [status, setStatus] = useState("idle");
  const [savedSelection, setSavedSelection] = useState(null);

  const handleOpenEditor = async () => {
    setStatus("loading");
    try {
      const selection = await loadWelcomeSurvey();
      setSavedSelection(selection);
      setStatus("editing");
    } catch (error) {
      console.error("GamerPreferencesSection.handleOpenEditor", error);
      if (error.status === UNAUTHORIZED_STATUS) {
        onSessionExpired?.();
        return;
      }
      setStatus("error");
    }
  };

  const handleCloseEditor = () => {
    setSavedSelection(null);
    setStatus("idle");
  };

  return (
    <section className="profile-card" aria-labelledby="gamer-preferences-title">
      <h2 id="gamer-preferences-title" className="profile-section-title">
        {translate("profile.gamerPreferences.title")}
      </h2>
      <p className="profile-section-description">
        {translate("profile.gamerPreferences.description")}
      </p>
      {status === "idle" && (
        <button type="button" className="profile-button profile-button--primary" onClick={handleOpenEditor}>
          {translate("profile.gamerPreferences.edit")}
        </button>
      )}
      {status === "loading" && <p className="profile-section-description">{translate("profile.gamerPreferences.loading")}</p>}
      {status === "error" && (
        <>
          <p className="profile-error" role="alert">{translate("profile.gamerPreferences.loadError")}</p>
          <button type="button" className="profile-button profile-button--primary" onClick={handleOpenEditor}>
            {translate("survey.actions.retry")}
          </button>
        </>
      )}
      {status === "editing" && (
        <WelcomeSurvey
          language={language}
          mode="edit"
          initialSelection={savedSelection}
          onCompleted={handleCloseEditor}
          onCancel={handleCloseEditor}
          onSessionExpired={onSessionExpired}
        />
      )}
    </section>
  );
}

export default GamerPreferencesSection;
