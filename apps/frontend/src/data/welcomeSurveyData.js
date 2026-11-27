// Rules shared with the product requirements for the personal library (RF-88/RF-89).
const MIN_SELECTIONS = 1;
const MAX_GENRE_SELECTIONS = 5;
const MAX_PLATFORM_SELECTIONS = 5;

/**
 * Catalogue of the welcome survey steps.
 * Each option only stores its language-neutral id; labels live in the i18n
 * dictionaries under the step's optionsTranslationKey.
 */
export const WELCOME_SURVEY_STEPS = [
  {
    id: "genres",
    translationKey: "survey.steps.genres",
    optionsTranslationKey: "survey.options.genres",
    minSelections: MIN_SELECTIONS,
    maxSelections: MAX_GENRE_SELECTIONS,
    options: [
      { id: "rpg" },
      { id: "shooter" },
      { id: "platformer" },
      { id: "strategy" },
      { id: "fighting" },
      { id: "sports" },
      { id: "indie" },
      { id: "simulation" },
    ],
  },
  {
    id: "platforms",
    translationKey: "survey.steps.platforms",
    optionsTranslationKey: "survey.options.platforms",
    minSelections: MIN_SELECTIONS,
    maxSelections: MAX_PLATFORM_SELECTIONS,
    options: [
      { id: "pc" },
      { id: "playstation" },
      { id: "xbox" },
      { id: "nintendoSwitch" },
      { id: "mobile" },
      { id: "vr" },
    ],
  },
  {
    id: "availability",
    translationKey: "survey.steps.availability",
    optionsTranslationKey: "survey.options.availability",
    minSelections: MIN_SELECTIONS,
    maxSelections: null,
    options: [
      { id: "weekdayNights" },
      { id: "weekendMornings" },
      { id: "weekendNights" },
      { id: "weekdayAfternoons" },
      { id: "anyTime" },
    ],
  },
];

/**
 * Builds a selection state with an empty list for every step.
 *
 * @returns {Object} An object mapping each step id to an empty array.
 */
export function createEmptySelection() {
  const emptySelection = {};
  for (const step of WELCOME_SURVEY_STEPS) {
    emptySelection[step.id] = [];
  }
  return emptySelection;
}
