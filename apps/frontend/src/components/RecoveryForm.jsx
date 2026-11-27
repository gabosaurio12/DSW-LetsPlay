import { useState } from "react";
import AuthBrand from "./AuthBrand.jsx";
import { recoverPassword } from "../services/authService.js";

/**
 * Password recovery form conforming to the Figma specification.
 *
 * @param {Object} props - Component props.
 * @param {Function} props.translate - Translation helper.
 * @param {Function} props.onNavigate - Navigation callback between auth screens.
 * @returns {JSX.Element} The rendered recovery form card.
 */
function RecoveryForm({ translate, onNavigate }) {
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const { email, code, newPassword, confirmNewPassword } = formData;

    if (!email.trim()) {
      setErrorMessage(translate("auth.recovery.errors.emailRequired"));
      return;
    }
    if (!code.trim()) {
      setErrorMessage(translate("auth.recovery.errors.codeRequired"));
      return;
    }
    if (!newPassword) {
      setErrorMessage(translate("auth.recovery.errors.passwordRequired"));
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage(translate("auth.recovery.errors.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage(translate("auth.recovery.errors.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await recoverPassword(email, code, newPassword);
      if (result.success) {
        setSuccessMessage(translate("auth.recovery.success"));
        setFormData({
          email: "",
          code: "",
          newPassword: "",
          confirmNewPassword: "",
        });
      } else {
        const key = result.errorKey ? `auth.recovery.errors.${result.errorKey}` : "auth.recovery.errors.userNotFound";
        setErrorMessage(translate(key));
      }
    } catch {
      setErrorMessage(translate("auth.recovery.errors.userNotFound"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-card-wrapper">
      <AuthBrand />
      <div className="auth-card">
        <h1 className="auth-card-title">{translate("auth.recovery.title")}</h1>
        <p className="auth-card-subtitle">{translate("auth.recovery.subtitle")}</p>

        {errorMessage && (
          <div className="auth-alert auth-alert--error" role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="auth-alert auth-alert--success" role="status">
            {successMessage}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="recovery-email">
              {translate("auth.recovery.email")}
            </label>
            <input
              id="recovery-email"
              type="email"
              className="auth-input"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder={translate("auth.recovery.emailPlaceholder")}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="recovery-code">
              {translate("auth.recovery.code")}
            </label>
            <input
              id="recovery-code"
              type="text"
              className="auth-input"
              value={formData.code}
              onChange={(e) => handleChange("code", e.target.value)}
              placeholder={translate("auth.recovery.codePlaceholder")}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="recovery-new-password">
              {translate("auth.recovery.newPassword")}
            </label>
            <input
              id="recovery-new-password"
              type="password"
              className="auth-input"
              value={formData.newPassword}
              onChange={(e) => handleChange("newPassword", e.target.value)}
              placeholder={translate("auth.recovery.newPasswordPlaceholder")}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="recovery-confirm-password">
              {translate("auth.recovery.confirmNewPassword")}
            </label>
            <input
              id="recovery-confirm-password"
              type="password"
              className="auth-input"
              value={formData.confirmNewPassword}
              onChange={(e) => handleChange("confirmNewPassword", e.target.value)}
              placeholder={translate("auth.recovery.confirmNewPasswordPlaceholder")}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button auth-button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? translate("auth.recovery.submitting") : translate("auth.recovery.submit")}
          </button>

          <div className="auth-link-container">
            <button
              type="button"
              className="auth-link-button"
              onClick={() => onNavigate("login")}
            >
              {translate("auth.recovery.backToLogin")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecoveryForm;
