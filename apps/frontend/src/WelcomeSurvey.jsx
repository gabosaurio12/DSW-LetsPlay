import { useState } from "react";
import { WELCOME_SURVEY_STEPS, createEmptySelection } from "./data/welcomeSurveyData.js";
import { saveWelcomeSurvey } from "./services/welcomeSurveyService.js";
import { useTranslation } from "./hooks/useTranslation.js";
import AuthBrand from "./components/AuthBrand.jsx";
import { SurveyOptionGroup } from "./components/WelcomeSurveyPanels.jsx";
import "./WelcomeSurvey.css";

const UNAUTHORIZED_STATUS = 401;

/**
 * Builds the validation error for a question, or null when its selection is valid.
 *
 * @param {Object} step - The survey question definition.
 * @param {string[]} selection - The option ids selected for that question.
 * @returns {Object|null} An error descriptor with a translation key, or null.
 */
function getSelectionError(step, selection) {
  if (selection.length < step.minSelections) {
    return { key: "survey.errors.minSelections", values: { count: step.minSelections } };
  }
  return null;
}

/**
 * Computes the selection after the user toggles one option. Selecting the exclusive
 * option clears the others, and selecting any other option clears the exclusive one.
 *
 * @param {Object} step - The survey question definition.
 * @param {string[]} selection - The option ids currently selected for the question.
 * @param {string} optionId - The option id the user toggled.
 * @returns {{ nextSelection: string[], error: Object|null }} The resulting selection and
 * an error descriptor when the change is not allowed.
 */
function getNextSelection(step, selection, optionId) {
  if (selection.includes(optionId)) {
    return { nextSelection: selection.filter((currentId) => currentId !== optionId), error: null };
  }
  if (optionId === step.exclusiveOptionId) {
    return { nextSelection: [optionId], error: null };
  }
  const withoutExclusive = selection.filter((currentId) => currentId !== step.exclusiveOptionId);
  if (step.maxSelections !== null && withoutExclusive.length >= step.maxSelections) {
    return {
      nextSelection: selection,
      error: { key: "survey.errors.maxSelections", values: { count: step.maxSelections } },
    };
  }
  return { nextSelection: [...withoutExclusive, optionId], error: null };
}

/**
 * Gamer preferences form: genres, platforms and availability, answered on a single form.
 * It is used for the welcome survey and, in edit mode, from the profile.
 *
 * @param {Object} props - The component props.
 * @param {string} props.language - The current application language code.
 * @param {"onboarding"|"edit"} [props.mode="onboarding"] - Welcome flow or profile editor.
 * @param {{ genres: string[], platforms: string[], availability: string[] }|null} [props.initialSelection] - Saved answers to pre-fill.
 * @param {() => void} [props.onCompleted] - Called right after the answers are saved successfully.
 * @param {() => void} [props.onCancel] - Called when the user leaves the editor without saving; edit mode only.
 * @param {() => void} [props.onSessionExpired] - Called when the server reports that the session has expired.
 * @returns {JSX.Element} The rendered survey.
 */
function WelcomeSurvey({ language, mode = "onboarding", initialSelection = null, onCompleted, onCancel, onSessionExpired }) {
  const translate = useTranslation(language);
  const [selection, setSelection] = useState(() => ({ ...createEmptySelection(), ...initialSelection }));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = mode === "edit";

  const handleToggleOption = (step, optionId) => {
    const { nextSelection, error } = getNextSelection(step, selection[step.id], optionId);
    setSelection({ ...selection, [step.id]: nextSelection });
    setErrors({ ...errors, [step.id]: error });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    const nextErrors = Object.fromEntries(
      WELCOME_SURVEY_STEPS.map((step) => [step.id, getSelectionError(step, selection[step.id])])
    );
    setErrors(nextErrors);
    const firstInvalidStep = WELCOME_SURVEY_STEPS.find((step) => nextErrors[step.id] !== null);
    if (firstInvalidStep) {
      document.getElementById(`survey-group-${firstInvalidStep.id}`)?.focus();
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveWelcomeSurvey(selection);
      onCompleted?.();
    } catch (error) {
      console.error("WelcomeSurvey.handleSubmit", error);
      if (error.status === UNAUTHORIZED_STATUS) {
        onSessionExpired?.();
        return;
      }
      setSaveError(translate("survey.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  const formContent = (
    <form className="survey-card" onSubmit={handleSubmit} noValidate>
      <header className="survey-header">
        <h1 className="survey-title">
          {translate(isEditing ? "survey.editTitle" : "survey.title")}
        </h1>
        <p className="survey-intro">{translate("survey.intro")}</p>
      </header>
      {WELCOME_SURVEY_STEPS.map((step) => (
        <SurveyOptionGroup
          key={step.id}
          step={step}
          selection={selection[step.id]}
          error={errors[step.id] ?? null}
          translate={translate}
          onToggleOption={handleToggleOption}
        />
      ))}
      <hr className="survey-divider" />
      {saveError !== null && <p className="survey-error" role="alert">{saveError}</p>}
      <button type="submit" className="survey-submit" disabled={isSaving}>
        {isSaving ? translate("survey.actions.saving") : translate("survey.actions.submit")}
      </button>
      {isEditing && (
        <button type="button" className="survey-cancel" onClick={onCancel}>
          {translate("survey.actions.cancel")}
        </button>
      )}
    </form>
  );

  return (
    <div className="survey">
      {!isEditing && <AuthBrand />}
      {formContent}
    </div>
  );
}

export default WelcomeSurvey;
