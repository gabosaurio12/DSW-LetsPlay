import { useEffect, useState } from "react";
import { WELCOME_SURVEY_STEPS, createEmptySelection } from "./data/welcomeSurveyData.js";
import { loadWelcomeSurvey, saveWelcomeSurvey } from "./services/welcomeSurveyService.js";
import { useTranslation } from "./hooks/useTranslation.js";
import { StepPanel, SummaryPanel, ConfirmedPanel } from "./components/WelcomeSurveyPanels.jsx";
import "./WelcomeSurvey.css";

/**
 * Builds the validation error message for a step, or null when the selection is valid.
 *
 * @param {Object} step - The survey step definition.
 * @param {string[]} selection - The option ids selected for that step.
 * @returns {Object|null} An error descriptor with a translation key, or null.
 */
function getSelectionError(step, selection) {
  if (selection.length < step.minSelections) {
    return { key: "survey.errors.minSelections", values: { count: step.minSelections } };
  }
  if (step.maxSelections !== null && selection.length > step.maxSelections) {
    return { key: "survey.errors.maxSelections", values: { count: step.maxSelections } };
  }
  return null;
}

/**
 * Adds an option id to a selection array without mutating the original.
 *
 * @param {string[]} selection - The current selection for a step.
 * @param {string} optionId - The option id to add.
 * @returns {string[]} A new selection array including the option id.
 */
function addOption(selection, optionId) {
  return [...selection, optionId];
}

/**
 * Removes an option id from a selection array without mutating the original.
 *
 * @param {string[]} selection - The current selection for a step.
 * @param {string} optionId - The option id to remove.
 * @returns {string[]} A new selection array without the option id.
 */
function removeOption(selection, optionId) {
  return selection.filter((currentOptionId) => currentOptionId !== optionId);
}

/**
 * Welcome survey for gamers' preferences: genres, platforms and availability.
 *
 * @param {Object} props - The component props.
 * @param {string} props.language - The current application language code.
 * @returns {JSX.Element} The rendered survey.
 */
function WelcomeSurvey({ language }) {
  const translate = useTranslation(language);
  const [selection, setSelection] = useState(createEmptySelection);
  const [savedResponse, setSavedResponse] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepError, setStepError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let isActive = true;
    const restoreSavedResponse = async () => {
      const storedSelection = await loadWelcomeSurvey();
      if (!isActive) {
        return;
      }
      setSavedResponse(storedSelection);
      if (storedSelection !== null) {
        setSelection({ ...createEmptySelection(), ...storedSelection });
      }
    };
    restoreSavedResponse();
    return () => {
      isActive = false;
    };
  }, []);

  const currentStep = WELCOME_SURVEY_STEPS[currentStepIndex];
  const lastStepIndex = WELCOME_SURVEY_STEPS.length - 1;
  const hasCompletedSurvey = savedResponse !== null && !isEditing;

  const handleToggleOption = (step, optionId) => {
    const currentSelection = selection[step.id];
    const isSelected = currentSelection.includes(optionId);
    const reachMaxSelections = step.maxSelections !== null
      && !isSelected
      && currentSelection.length >= step.maxSelections;
    if (reachMaxSelections) {
      setStepError({ key: "survey.errors.maxSelections", values: { count: step.maxSelections } });
      return;
    }
    const nextSelection = isSelected
      ? removeOption(currentSelection, optionId)
      : addOption(currentSelection, optionId);
    setSelection({ ...selection, [step.id]: nextSelection });
    setStepError(null);
  };

  const handleContinue = () => {
    const selectionError = getSelectionError(currentStep, selection[currentStep.id]);
    if (selectionError !== null) {
      setStepError(selectionError);
      return;
    }
    setStepError(null);
    setCurrentStepIndex(currentStepIndex + 1);
  };

  const handleBack = () => {
    setStepError(null);
    setCurrentStepIndex(currentStepIndex - 1);
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    setSaveError(null);
    const savedSuccessfully = await saveWelcomeSurvey(selection);
    setIsSaving(false);
    if (!savedSuccessfully) {
      setSaveError(translate("survey.errors.save"));
      return;
    }
    setSavedResponse(selection);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setCurrentStepIndex(0);
  };

  if (hasCompletedSurvey) {
    return (
      <SurveyLayout translate={translate}>
        <ConfirmedPanel translate={translate} onEdit={handleEdit} />
      </SurveyLayout>
    );
  }
  if (currentStepIndex === lastStepIndex + 1) {
    return (
      <SurveyLayout translate={translate}>
        <SummaryPanel
          translate={translate}
          steps={WELCOME_SURVEY_STEPS}
          selection={selection}
          onSave={handleConfirm}
          onBack={handleBack}
          isSaving={isSaving}
          saveError={saveError}
        />
      </SurveyLayout>
    );
  }
  return (
    <SurveyLayout translate={translate}>
      <StepPanel
        translate={translate}
        step={currentStep}
        stepIndex={currentStepIndex}
        stepCount={WELCOME_SURVEY_STEPS.length}
        selection={selection}
        stepError={stepError}
        onToggleOption={handleToggleOption}
        onContinue={handleContinue}
        onBack={currentStepIndex === 0 ? undefined : handleBack}
      />
    </SurveyLayout>
  );
}

/**
 * Common layout of every survey screen: header plus the active panel.
 *
 * @param {Object} props - The component props.
 * @param {(key: string, values?: Object|null) => string} props.translate - The translation function.
 * @param {JSX.Element} props.children - The active survey panel.
 * @returns {JSX.Element} The rendered survey layout.
 */
function SurveyLayout({ translate, children }) {
  return (
    <div className="survey">
      <header className="survey-header">
        <h1 className="survey-title">{translate("survey.title")}</h1>
        <p className="survey-intro">{translate("survey.intro")}</p>
      </header>
      {children}
    </div>
  );
}

export default WelcomeSurvey;
