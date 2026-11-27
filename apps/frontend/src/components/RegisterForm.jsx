import { useState } from "react";
import AuthBrand from "./AuthBrand.jsx";
import { register } from "../services/authService.js";

/**
 * Registration form conforming to the Figma specification.
 *
 * @param {Object} props - Component props.
 * @param {Function} props.translate - Translation helper.
 * @param {Function} props.onNavigate - Navigation callback between auth screens.
 * @param {Function} props.onLoginSuccess - Callback executed upon successful registration.
 * @returns {JSX.Element} The rendered registration form card.
 */
function RegisterForm({ translate, onNavigate, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    birthDate: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const { username, email, birthDate, gender, password, confirmPassword } = formData;

    if (!username.trim()) {
      setErrorMessage(translate("auth.register.errors.usernameRequired"));
      return;
    }
    if (username.trim().length > 12) {
      setErrorMessage(translate("auth.register.errors.usernameTooLong"));
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setErrorMessage(translate("auth.register.errors.usernameInvalid"));
      return;
    }
    if (!email.trim()) {
      setErrorMessage(translate("auth.register.errors.emailRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage(translate("auth.register.errors.emailInvalid"));
      return;
    }
    if (!birthDate) {
      setErrorMessage(translate("auth.register.errors.birthDateRequired"));
      return;
    }
    if (!gender) {
      setErrorMessage(translate("auth.register.errors.genderRequired"));
      return;
    }
    if (!password) {
      setErrorMessage(translate("auth.register.errors.passwordRequired"));
      return;
    }
    if (password.length < 8) {
      setErrorMessage(translate("auth.register.errors.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(translate("auth.register.errors.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register({
        username,
        email,
        birthDate,
        gender,
        password,
      });

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        const key = result.errorKey ? `auth.register.errors.${result.errorKey}` : "auth.register.errors.userExists";
        setErrorMessage(translate(key));
      }
    } catch {
      setErrorMessage(translate("auth.register.errors.userExists"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-card-wrapper">
      <AuthBrand />
      <div className="auth-card">
        <h1 className="auth-card-title">{translate("auth.register.title")}</h1>
        <p className="auth-card-subtitle">{translate("auth.register.subtitle")}</p>

        {errorMessage && (
          <div className="auth-alert auth-alert--error" role="alert">
            {errorMessage}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="register-username">
              {translate("auth.register.username")}
            </label>
            <input
              id="register-username"
              type="text"
              maxLength={12}
              className="auth-input"
              value={formData.username}
              onChange={(e) => handleChange("username", e.target.value)}
              placeholder={translate("auth.register.usernamePlaceholder")}
              autoComplete="username"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="register-email">
              {translate("auth.register.email")}
            </label>
            <input
              id="register-email"
              type="email"
              className="auth-input"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder={translate("auth.register.emailPlaceholder")}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-grid-row">
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-birthdate">
                {translate("auth.register.birthDate")}
              </label>
              <input
                id="register-birthdate"
                type="date"
                className="auth-input"
                value={formData.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="register-gender">
                {translate("auth.register.gender")}
              </label>
              <select
                id="register-gender"
                className="auth-select"
                value={formData.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                required
              >
                <option value="" disabled>
                  {translate("auth.register.genderPlaceholder")}
                </option>
                <option value="male">{translate("auth.register.genderOptions.male")}</option>
                <option value="female">{translate("auth.register.genderOptions.female")}</option>
                <option value="nonBinary">{translate("auth.register.genderOptions.nonBinary")}</option>
                <option value="other">{translate("auth.register.genderOptions.other")}</option>
              </select>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="register-password">
              {translate("auth.register.password")}
            </label>
            <input
              id="register-password"
              type="password"
              className="auth-input"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder={translate("auth.register.passwordPlaceholder")}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="register-confirm-password">
              {translate("auth.register.confirmPassword")}
            </label>
            <input
              id="register-confirm-password"
              type="password"
              className="auth-input"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              placeholder={translate("auth.register.confirmPasswordPlaceholder")}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button auth-button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? translate("auth.register.submitting") : translate("auth.register.submit")}
          </button>

          <div className="auth-link-container">
            <button
              type="button"
              className="auth-link-button"
              onClick={() => onNavigate("login")}
            >
              {translate("auth.register.hasAccount")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterForm;
