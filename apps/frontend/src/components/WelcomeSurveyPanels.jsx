import SurveyOptionChip from "./SurveyOptionChip.jsx";

/**
 * Horizontal progress indicator of the wizard steps.
 *
 * @param {Object} props - The component props.
 * @param {number} props.stepIndex - Zero-based index of the current step.
 * @param {number} props.stepCount - Total number of steps.
 * @param {string} props.progressLabel - The translated "step x of y" text.
 * @returns {JSX.Element} The rendered progress indicator.
 */
export function SurveyProgress({ stepIndex, stepCount, progressLabel }) {
  return (
    <div
      className="survey-progress"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={stepCount}
      aria-valuenow={stepIndex + 1}
      aria-label={progressLabel}
    >
      <div className="survey-progress-track">
        {Array.from({ length: stepCount }, (unused, index) => (
          <span
            key={index}
            className={index <= stepIndex ? "survey-progress-dot survey-progress-dot--active" : "survey-progress-dot"}
          />
        ))}
      </div>
      <span className="survey-progress-label">{progressLabel}</span>
    </div>
  );
}

/**
 * Grid of selectable options for a survey step.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.step - The survey step definition.
 * @param {string[]} props.selection - The currently selected option ids.
 * @param {(key: string, values?: Object|null) => string} props.translate - The translation function.
 * @param {(step: Object, optionId: string) => void} props.onToggleOption - Toggle callback.
 * @returns {JSX.Element} The rendered option grid.
 */
export function SurveyOptionGrid({ step, selection, translate, onToggleOption }) {
  const handleToggle = (optionId) => onToggleOption(step, optionId);
  return (
    <div className="survey-option-grid">
      {step.options.map((option) => (
        <SurveyOptionChip
          key={option.id}
          optionId={option.id}
          optionLabel={translate(`${step.optionsTranslationKey}.${option.id}`)}
          isSelected={selection.includes(option.id)}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}

/**
 * Step content of the wizard: one question, its options and the navigation actions.
 *
 * @param {Object} props - The component props.
 * @param {(key: string, values?: Object|null) => string} props.translate - The translation function.
 * @param {Object} props.step - The survey step definition.
 * @param {number} props.stepIndex - Zero-based index of the current step.
 * @param {number} props.stepCount - Total number of steps.
 * @param {Object} props.selection - The full selection state.
 * @param {Object|null} props.stepError - The selection error descriptor, or null.
 * @param {(step: Object, optionId: string) => void} props.onToggleOption - Toggle callback.
 * @param {() => void} props.onContinue - Continue action.
 * @param {() => void} props.onBack - Back action; absent when the step is the first one.
 * @returns {JSX.Element} The rendered step panel.
 */
export function StepPanel({
  translate,
  step,
  stepIndex,
  stepCount,
  selection,
  stepError,
  onToggleOption,
  onContinue,
  onBack,
}) {
  const progressLabel = translate("survey.stepProgress", {
    current: stepIndex + 1,
    total: stepCount,
  });
  const errorValue = stepError === null ? null : translate(stepError.key, stepError.values);
  return (
    <section className="survey-card" aria-labelledby={`survey-step-${step.id}`}>
      <SurveyProgress stepIndex={stepIndex} stepCount={stepCount} progressLabel={progressLabel} />
      <h2 id={`survey-step-${step.id}`} className="survey-step-title">
        {translate(`${step.translationKey}.title`)}
      </h2>
      <p className="survey-step-description">{translate(`${step.translationKey}.description`)}</p>
      <SurveyOptionGrid
        step={step}
        selection={selection[step.id]}
        translate={translate}
        onToggleOption={onToggleOption}
      />
      {stepError !== null && <p className="survey-error" role="alert">{errorValue}</p>}
      <div className="survey-actions">
        {stepIndex > 0 && (
          <button type="button" className="survey-button survey-button--secondary" onClick={onBack}>
            {translate("survey.actions.back")}
          </button>
        )}
        <button type="button" className="survey-button survey-button--primary" onClick={onContinue}>
          {translate("survey.actions.continue")}
        </button>
      </div>
    </section>
  );
}

/**
 * Summary of all selections before saving them.
 *
 * @param {Object} props - The component props.
 * @param {(key: string, values?: Object|null) => string} props.translate - The translation function.
 * @param {Object} props.selection - The full selection state.
 * @param {() => Promise<void>} props.onSave - Confirm action.
 * @param {() => void} props.onBack - Back action.
 * @param {boolean} props.isSaving - Whether the save request is in flight.
 * @param {string|null} props.saveError - The save error message, or null.
 * @param {Array<{id: string, translationKey: string, optionsTranslationKey: string, options: Object[]}>} props.steps - The survey steps.
 * @returns {JSX.Element} The rendered summary panel.
 */
export function SummaryPanel({ translate, selection, onSave, onBack, isSaving, saveError, steps }) {
  return (
    <section className="survey-card" aria-labelledby="survey-summary-title">
      <h2 id="survey-summary-title" className="survey-step-title">
        {translate("survey.summary.title")}
      </h2>
      <dl className="survey-summary-list">
        {steps.map((step) => (
          <SurveySummaryRow
            key={step.id}
            step={step}
            selection={selection[step.id]}
            translate={translate}
          />
        ))}
      </dl>
      {saveError !== null && <p className="survey-error" role="alert">{saveError}</p>}
      <div className="survey-actions">
        <button
          type="button"
          className="survey-button survey-button--secondary"
          onClick={onBack}
        >
          {translate("survey.actions.back")}
        </button>
        <button
          type="button"
          className="survey-button survey-button--primary"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving
            ? translate("survey.actions.saving")
            : translate("survey.actions.confirm")}
        </button>
      </div>
    </section>
  );
}

/**
 * One summary row: plural summary row mapping a step to its selected labels.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.step - The survey step definition.
 * @param {string[]} props.selection - The selected option ids for the step.
 * @param {(key: string, values?: Object|null) => string} props.translate - The translation function.
 * @returns {JSX.Element} The rendered summary row.
 */
function SurveySummaryRow({ step, selection, translate }) {
  const selectedLabels = selection
    .filter((optionId) => step.options.some((option) => option.id === optionId))
    .map((optionId) => ({
      optionId,
      label: translate(`${step.optionsTranslationKey}.${optionId}`),
    }));
  return (
    <div className="survey-summary-row">
      <dt className="survey-summary-label">{translate(`survey.summary.${step.id}`)}</dt>
      <dd className="survey-summary-chips">
        {selectedLabels.map(({ optionId, label }) => (
          <span key={optionId} className="survey-summary-chip">{label}</span>
        ))}
      </dd>
    </div>
  );
}

/**
 * Confirmation screen shown right after the answers are saved.
 *
 * @param {Object} props - The component props.
 * @param {(key: string, values?: Object|null) => string} props.translate - The translation function.
 * @param {() => void} props.onEdit - Edit action.
 * @returns {JSX.Element} The rendered confirmation panel.
 */
export function ConfirmedPanel({ translate, onEdit }) {
  return (
    <section className="survey-card survey-card--confirmed">
      <span className="survey-confirmed-mark" aria-hidden="true">★</span>
      <h2 className="survey-step-title">{translate("survey.confirmed.title")}</h2>
      <p className="survey-step-description">{translate("survey.confirmed.message")}</p>
      <div className="survey-actions">
        <button type="button" className="survey-button survey-button--primary" onClick={onEdit}>
          {translate("survey.confirmed.edit")}
        </button>
      </div>
    </section>
  );
}
