import esDictionary from "./es.js";
import enDictionary from "./en.js";

const LANGUAGES = {
  es: esDictionary,
  en: enDictionary,
};

export const DEFAULT_LANGUAGE = "es";
export const LANGUAGE_CODES = Object.keys(LANGUAGES);

/**
 * Resolves a dot-separated key against a dictionary object.
 *
 * @param {Object} dictionary - The dictionary to search.
 * @param {string[]} keyParts - The key split by dots, from outermost to innermost.
 * @returns {string|undefined} The translated text, or undefined when the key does not exist.
 */
function resolveKeyPath(dictionary, keyParts) {
  let currentValue = dictionary;
  for (const keyPart of keyParts) {
    if (currentValue === null || typeof currentValue !== "object") {
      return undefined;
    }
    currentValue = currentValue[keyPart];
  }
  return typeof currentValue === "string" ? currentValue : undefined;
}

/**
 * Replaces "{name}" placeholders in a text with the provided values.
 *
 * @param {string} text - The text containing placeholders.
 * @param {Object|null} values - The placeholder values.
 * @returns {string} The text with all placeholders resolved.
 */
function fillPlaceholders(text, values) {
  if (values === null || typeof values !== "object") {
    return text;
  }
  return text.replace(/\{(\w+)\}/g, (pattern, placeholder) => {
    const replacement = values[placeholder];
    if (replacement === undefined) {
      return pattern;
    }
    return String(replacement);
  });
}

/**
 * Translates a key into the given language, falling back to the default language.
 *
 * @param {string} language - The target language code.
 * @param {string} key - The dot-separated translation key.
 * @param {Object|null} values - Optional placeholder values for the text.
 * @returns {string} The translated text, or the key itself when it cannot be resolved.
 */
export function translateText(language, key, values) {
  const keyParts = key.split(".");
  const translated = resolveKeyPath(LANGUAGES[language], keyParts)
    ?? resolveKeyPath(LANGUAGES[DEFAULT_LANGUAGE], keyParts);
  if (translated === undefined) {
    return key;
  }
  return fillPlaceholders(translated, values);
}
