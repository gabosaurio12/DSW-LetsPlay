/**
 * Toggleable chip for selecting one option in a form.
 *
 * @param {Object} props - The component props.
 * @param {string} props.optionId - The language-neutral id of the option.
 * @param {string} props.optionLabel - The translated label shown to the user.
 * @param {boolean} props.isSelected - Whether the option is currently selected.
 * @param {boolean} [props.isDisabled] - Whether the option cannot be selected right now.
 * @param {(optionId: string) => void} props.onToggle - Callback fired when the chip is pressed.
 * @returns {JSX.Element} The rendered option chip.
 */
function SelectableChip({ optionId, optionLabel, isSelected, isDisabled = false, onToggle }) {
  const selectedClass = isSelected ? " option-chip--selected" : "";
  return (
    <button
      type="button"
      className={`option-chip${selectedClass}`}
      aria-pressed={isSelected}
      disabled={isDisabled}
      onClick={() => onToggle(optionId)}
    >
      {optionLabel}
    </button>
  );
}

export default SelectableChip;
