/**
 * Decides whether an authenticated account can moderate reports and content.
 * No account has moderation permission until a permission model is defined, so
 * every account is denied for now.
 *
 * @returns {boolean} True when the account may moderate.
 */
function canModerate() {
    return false;
}

module.exports = {
    canModerate
};
