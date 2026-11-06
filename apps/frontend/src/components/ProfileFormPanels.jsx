import SelectableChip from "./SelectableChip.jsx";

/**
 * Input field of the profile form: label, control and validation message.
 *
 * @param {Object} props - The component props.
 * @param {string} props.id - The id linking the label with the control.
 * @param {string} props.label - The translated field label.
 * @param {string} props.value - The current field value.
 * @param {string} props.placeholder - The translated placeholder text.
 * @param {string|null} props.error - The validation message, or null when valid.
 * @param {boolean} [props.isMultiline] - Renders a textarea instead of an input.
 * @param {(value: string) => void} props.onChange - Callback fired on every change.
 * @returns {JSX.Element} The rendered field.
 */
export function ProfileField({
  id,
  label,
  value,
  placeholder,
  error,
  isMultiline = false,
  onChange,
}) {
  const errorClass = error === null ? "" : " profile-field--invalid";
  const handleChange = (event) => onChange(event.target.value);
  return (
    <div className={`profile-field${errorClass}`}>
      <label className="profile-label" htmlFor={id}>{label}</label>
      {isMultiline ? (
        <textarea
          id={id}
          className="profile-textarea"
          value={value}
          placeholder={placeholder}
          aria-invalid={error !== null}
          onChange={handleChange}
        />
      ) : (
        <input
          id={id}
          className="profile-input"
          type="text"
          value={value}
          placeholder={placeholder}
          aria-invalid={error !== null}
          onChange={handleChange}
        />
      )}
      {error !== null && <p className="profile-error" role="alert">{error}</p>}
    </div>
  );
}

/**
 * Grid of selectable videogames for the personal library.
 *
 * @param {Object} props - The component props.
 * @param {Object[]} props.videogames - The approved videogame catalogue.
 * @param {string[]} props.selectedVideogames - The currently selected videogame ids.
 * @param {(key: string) => string} props.translate - The translation function.
 * @param {(videogameId: string) => void} props.onToggle - Toggle callback.
 * @returns {JSX.Element} The rendered videogame grid.
 */
export function VideogameGrid({ videogames, selectedVideogames, translate, onToggle }) {
  return (
    <div className="profile-chip-grid">
      {videogames.map((videogame) => (
        <SelectableChip
          key={videogame.id}
          optionId={videogame.id}
          optionLabel={translate(`profile.videogames.${videogame.id}`)}
          isSelected={selectedVideogames.includes(videogame.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

/**
 * Read-only summary of the saved profile shown on the confirmation screen.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.profile - The saved profile.
 * @param {Object[]} props.videogames - The approved videogame catalogue.
 * @param {(key: string) => string} props.translate - The translation function.
 * @returns {JSX.Element} The rendered summary list.
 */
export function ProfileSummary({ profile, translate }) {
  const selectedNames = profile.selectedVideogames.map((videogameId) =>
    translate(`profile.videogames.${videogameId}`));
  return (
    <dl className="profile-summary-list">
      <div className="profile-summary-row">
        <dt className="profile-summary-label">{translate("profile.fields.visibleName")}</dt>
        <dd className="profile-summary-value">{profile.visibleName}</dd>
      </div>
      <div className="profile-summary-row">
        <dt className="profile-summary-label">{translate("profile.fields.bio")}</dt>
        <dd className="profile-summary-value">{profile.bio || translate("profile.summary.empty")}</dd>
      </div>
      <div className="profile-summary-row">
        <dt className="profile-summary-label">{translate("profile.fields.avatarUrl")}</dt>
        <dd className="profile-summary-value">{profile.avatarUrl || translate("profile.summary.empty")}</dd>
      </div>
      <div className="profile-summary-row">
        <dt className="profile-summary-label">{translate("profile.summary.videogames")}</dt>
        <dd className="profile-summary-chips">
          {selectedNames.map((name) => (
            <span key={name} className="profile-summary-chip">{name}</span>
          ))}
        </dd>
      </div>
    </dl>
  );
}

/**
 * Confirmation screen shown right after the profile is saved.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.profile - The saved profile.
 * @param {(key: string) => string} props.translate - The translation function.
 * @param {() => void} props.onEdit - Edit action.
 * @returns {JSX.Element} The rendered confirmation panel.
 */
export function ConfirmedProfilePanel({ profile, translate, onEdit }) {
  return (
    <section className="profile-card profile-card--confirmed" aria-labelledby="profile-confirmed-title">
      <span className="profile-confirmed-mark" aria-hidden="true">★</span>
      <h2 id="profile-confirmed-title" className="profile-section-title">
        {translate("profile.confirmed.title")}
      </h2>
      <p className="profile-section-description">{translate("profile.confirmed.message")}</p>
      <ProfileSummary profile={profile} translate={translate} />
      <div className="profile-actions">
        <button type="button" className="profile-button profile-button--primary" onClick={onEdit}>
          {translate("profile.confirmed.edit")}
        </button>
      </div>
    </section>
  );
}
