import { translateText } from "../i18n/i18n.js";

/**
 * Provides the translation function for the current application language.
 *
 * @param {string} language - The current application language code.
 * @returns {(key: string, values?: Object|null) => string} The translation function.
 */
export function useTranslation(language) {
  const translate = (key, values) => translateText(language, key, values);
  return translate;
}
