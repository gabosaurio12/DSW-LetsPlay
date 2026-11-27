import SurveyOptionChip from "./SurveyOptionChip.jsx";

/**
 * One survey question with its option chips and its validation message.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.step - The survey question definition.
 * @param {string[]} props.selection - The selected option ids for the question.
 * @param {Object|null} props.error - The validation error descriptor, or null.
 * @param {(key: string, values?: Object|null) => string} props.translate - The translation function.
 * @param {(step: Object, optionId: string) => void} props.onToggleOption - Toggle callback.
 * @returns {JSX.Element} The rendered question group.
 */
export function SurveyOptionGroup({ step, selection, error, translate, onToggleOption }) {
  const errorMessage = error === null ? null : translate(error.key, error.values);
  const errorId = `survey-error-${step.id}`;
  return (
    <fieldset
      id={`survey-group-${step.id}`}
      className="survey-group"
      tabIndex={-1}
      aria-describedby={errorMessage === null ? undefined : errorId}
    >
      <legend className="survey-question">{translate(step.titleTranslationKey)}</legend>
      <div className="survey-option-list">
        {step.options.map((option) => (
          <SurveyOptionChip
            key={option.id}
            optionId={option.id}
            optionLabel={translate(`${step.optionsTranslationKey}.${option.id}`)}
            isSelected={selection.includes(option.id)}
            onToggle={(optionId) => onToggleOption(step, optionId)}
          />
        ))}
      </div>
      {errorMessage !== null && (
        <p id={errorId} className="survey-error" role="alert">{errorMessage}</p>
      )}
    </fieldset>
  );
}
