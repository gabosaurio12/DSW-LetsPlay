import { useState } from "react";
import AuthBrand from "./AuthBrand.jsx";
import { login } from "../services/authService.js";

/**
 * Sign-in form conforming to the Figma specification.
 *
 * @param {Object} props - Component props.
 * @param {Function} props.translate - Translation helper.
 * @param {Function} props.onNavigate - Navigation callback between auth screens.
 * @param {Function} props.onLoginSuccess - Callback executed upon successful authentication.
 * @returns {JSX.Element} The rendered login form card.
 */
function LoginForm({ translate, onNavigate, onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!identifier.trim()) {
      setErrorMessage(translate("auth.login.errors.identifierRequired"));
      return;
    }
    if (!password) {
      setErrorMessage(translate("auth.login.errors.passwordRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(identifier, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        const key = result.errorKey ? `auth.login.errors.${result.errorKey}` : "auth.login.errors.invalidCredentials";
        setErrorMessage(translate(key));
      }
    } catch {
      setErrorMessage(translate("auth.login.errors.invalidCredentials"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-card-wrapper">
      <AuthBrand />
      <div className="auth-card">
        <h1 className="auth-card-title">{translate("auth.login.title")}</h1>
        <p className="auth-card-subtitle">{translate("auth.login.subtitle")}</p>

        {errorMessage && (
          <div className="auth-alert auth-alert--error" role="alert">
            {errorMessage}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-identifier">
              {translate("auth.login.identifier")}
            </label>
            <input
              id="login-identifier"
              type="text"
              className="auth-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={translate("auth.login.identifierPlaceholder")}
              autoComplete="username email"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">
              {translate("auth.login.password")}
            </label>
            <input
              id="login-password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={translate("auth.login.passwordPlaceholder")}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button auth-button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? translate("auth.login.submitting") : translate("auth.login.submit")}
          </button>

          <div className="auth-link-container">
            <button
              type="button"
              className="auth-link-button"
              onClick={() => onNavigate("recovery")}
            >
              {translate("auth.login.forgotPassword")}
            </button>
          </div>

          <div className="auth-divider" />

          <button
            type="button"
            className="auth-button auth-button--secondary"
            onClick={() => onNavigate("register")}
          >
            {translate("auth.login.createAccount")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginForm;
