/**
 * Brand logo and title shown centered above the authentication cards,
 * matching the Figma prototype layout and color palette.
 *
 * @returns {JSX.Element} The rendered brand header.
 */
function AuthBrand() {
  return (
    <div className="auth-brand" aria-label="Let's Play">
      <div className="auth-brand-logo" aria-hidden="true">
        L
      </div>
      <span className="auth-brand-text">Let's Play</span>
    </div>
  );
}

export default AuthBrand;
