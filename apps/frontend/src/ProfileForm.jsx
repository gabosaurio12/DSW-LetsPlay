import { useEffect, useState } from "react";
import {
  APPROVED_VIDEOGAMES,
  MIN_VIDEOGAME_SELECTIONS,
  MAX_VIDEOGAME_SELECTIONS,
  MAX_VISIBLE_NAME_LENGTH,
  createEmptyProfile,
} from "./data/profileFormData.js";
import { loadProfile, saveProfile, mergeStoredProfile } from "./services/profileService.js";
import { useTranslation } from "./hooks/useTranslation.js";
import { ProfileField, VideogameGrid, ConfirmedProfilePanel } from "./components/ProfileFormPanels.jsx";
import GamerPreferencesSection from "./components/GamerPreferencesSection.jsx";
import FollowListModal from "./components/FollowListModal.jsx";
import { fetchUserProfile } from "./services/followService.js";
import "./ProfileForm.css";

/**
 * Validates the profile draft and returns the first error found, or null.
 *
 * @param {Object} profile - The profile draft to validate.
 * @param {(key: string, values?: Object|null) => string} translate - The translation function.
 * @returns {Object|null} An error descriptor with a translation key, or null.
 */
function getProfileError(profile, translate) {
  if (profile.visibleName.trim() === "") {
    return translate("profile.errors.visibleNameRequired");
  }
  if (profile.visibleName.length > MAX_VISIBLE_NAME_LENGTH) {
    return translate("profile.errors.visibleNameTooLong", { count: MAX_VISIBLE_NAME_LENGTH });
  }
  if (profile.selectedVideogames.length < MIN_VIDEOGAME_SELECTIONS) {
    return translate("profile.errors.videogamesMin", { count: MIN_VIDEOGAME_SELECTIONS });
  }
  if (profile.selectedVideogames.length > MAX_VIDEOGAME_SELECTIONS) {
    return translate("profile.errors.videogamesMax", { count: MAX_VIDEOGAME_SELECTIONS });
  }
  return null;
}

/**
 * Profile form with general information and a personal library of 1 to 5 videogames.
 *
 * @param {Object} props - The component props.
 * @param {string} props.language - The current application language code.
 * @param {string} props.currentUserId - The signed-in account uuid.
 * @param {(userId: string) => void} props.onOpenUserProfile - Opens another account's profile.
 * @param {() => void} [props.onSessionExpired] - Called when the server reports that the session has expired.
 * @returns {JSX.Element} The rendered profile form.
 */
function ProfileForm({ language, currentUserId, onOpenUserProfile, onSessionExpired }) {
  const translate = useTranslation(language);
  const [profile, setProfile] = useState(createEmptyProfile);
  const [savedProfile, setSavedProfile] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [connections, setConnections] = useState({ followers: 0, following: 0 });
  const [openConnectionList, setOpenConnectionList] = useState(null);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();
    fetchUserProfile(currentUserId, { signal: controller.signal })
      .then((data) => {
        if (isActive) {
          setConnections(data.counts || { followers: 0, following: 0 });
        }
      })
      .catch((err) => {
        if (err.status === 401) {
          onSessionExpired();
        }
      });
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [currentUserId, onSessionExpired]);

  useEffect(() => {
    let isActive = true;
    const restoreSavedProfile = async () => {
      const storedProfile = await loadProfile();
      if (!isActive) {
        return;
      }
      setSavedProfile(storedProfile);
      setProfile(mergeStoredProfile(storedProfile));
    };
    restoreSavedProfile();
    return () => {
      isActive = false;
    };
  }, []);

  const hasCompletedProfile = savedProfile !== null && !isEditing;

  const handleFieldChange = (fieldName, value) => {
    setProfile({ ...profile, [fieldName]: value });
    setFormError(null);
  };

  const handleToggleVideogame = (videogameId) => {
    const isSelected = profile.selectedVideogames.includes(videogameId);
    const reachMaxSelections = !isSelected
      && profile.selectedVideogames.length >= MAX_VIDEOGAME_SELECTIONS;
    if (reachMaxSelections) {
      setFormError(translate("profile.errors.videogamesMax", { count: MAX_VIDEOGAME_SELECTIONS }));
      return;
    }
    const nextSelection = isSelected
      ? profile.selectedVideogames.filter((currentId) => currentId !== videogameId)
      : [...profile.selectedVideogames, videogameId];
    setProfile({ ...profile, selectedVideogames: nextSelection });
    setFormError(null);
  };

  const handleSave = async () => {
    const validationError = getProfileError(profile, translate);
    if (validationError !== null) {
      setFormError(validationError);
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    const savedSuccessfully = await saveProfile(profile);
    setIsSaving(false);
    if (!savedSuccessfully) {
      setSaveError(translate("profile.errors.save"));
      return;
    }
    setSavedProfile(profile);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFormError(null);
  };

  if (hasCompletedProfile) {
    return (
      <ProfileLayout translate={translate}>
        <ConfirmedProfilePanel
          profile={savedProfile}
          translate={translate}
          onEdit={handleEdit}
        />
        <GamerPreferencesSection language={language} onSessionExpired={onSessionExpired} />
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout translate={translate}>
      <section className="profile-card" aria-labelledby="profile-form-title">
        <h2 id="profile-form-title" className="profile-section-title">
          {translate("profile.form.title")}
        </h2>
        <p className="profile-section-description">{translate("profile.form.description")}</p>
        <ProfileField
          id="profile-visible-name"
          label={translate("profile.fields.visibleName")}
          placeholder={translate("profile.placeholders.visibleName")}
          value={profile.visibleName}
          error={formError !== null && profile.visibleName.trim() === "" ? formError : null}
          onChange={(value) => handleFieldChange("visibleName", value)}
        />
        <ProfileField
          id="profile-bio"
          label={translate("profile.fields.bio")}
          placeholder={translate("profile.placeholders.bio")}
          value={profile.bio}
          error={null}
          isMultiline
          onChange={(value) => handleFieldChange("bio", value)}
        />
        <ProfileField
          id="profile-avatar-url"
          label={translate("profile.fields.avatarUrl")}
          placeholder={translate("profile.placeholders.avatarUrl")}
          value={profile.avatarUrl}
          error={null}
          onChange={(value) => handleFieldChange("avatarUrl", value)}
        />
        <fieldset className="profile-videogames">
          <legend className="profile-label">{translate("profile.fields.videogames")}</legend>
          <p className="profile-section-description">
            {translate("profile.fields.videogamesHint", { count: MAX_VIDEOGAME_SELECTIONS })}
          </p>
          <VideogameGrid
            videogames={APPROVED_VIDEOGAMES}
            selectedVideogames={profile.selectedVideogames}
            translate={translate}
            onToggle={handleToggleVideogame}
          />
        </fieldset>
        {formError !== null && <p className="profile-error" role="alert">{formError}</p>}
        {saveError !== null && <p className="profile-error" role="alert">{saveError}</p>}
        <div className="profile-actions">
          <button
            type="button"
            className="profile-button profile-button--primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? translate("profile.actions.saving") : translate("profile.actions.save")}
          </button>
        </div>
      </section>
      <div className="profile-connections">
        <button
          type="button"
          className="profile-connections-button"
          onClick={() => setOpenConnectionList("followers")}
        >
          {translate("follows.counts", {
            followers: connections.followers,
            following: connections.following
          })}
        </button>
      </div>
      <GamerPreferencesSection language={language} onSessionExpired={onSessionExpired} />
      {openConnectionList !== null && (
        <FollowListModal
          userId={currentUserId}
          displayName={translate("follows.selfBadge")}
          currentUserId={currentUserId}
          counts={connections}
          translate={translate}
          onClose={() => setOpenConnectionList(null)}
          onOpenProfile={(userId) => {
            setOpenConnectionList(null);
            onOpenUserProfile(userId);
          }}
          onSessionExpired={onSessionExpired}
          onUnfollow={() => setConnections((prev) => ({
            ...prev,
            followers: Math.max(0, prev.followers - 1)
          }))}
        />
      )}
    </ProfileLayout>
  );
}

/**
 * Common layout of every profile screen: header plus the active panel.
 *
 * @param {Object} props - The component props.
 * @param {(key: string, values?: Object|null) => string} props.translate - The translation function.
 * @param {JSX.Element} props.children - The active profile panel.
 * @returns {JSX.Element} The rendered profile layout.
 */
function ProfileLayout({ translate, children }) {
  return (
    <div className="profile">
      <header className="profile-header">
        <h1 className="profile-title">{translate("profile.title")}</h1>
        <p className="profile-intro">{translate("profile.intro")}</p>
      </header>
      {children}
    </div>
  );
}

export default ProfileForm;
