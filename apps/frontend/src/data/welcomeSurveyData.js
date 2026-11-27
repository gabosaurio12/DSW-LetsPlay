// Rules shared with the product requirements for the personal library (RF-88/RF-89).
const MIN_SELECTIONS = 1;
const MAX_GENRE_SELECTIONS = 5;
const MAX_PLATFORM_SELECTIONS = 5;

/**
 * Catalogue of the welcome survey questions, in display order.
 * Each option only stores its language-neutral id; labels live in the i18n
 * dictionaries under the question's optionsTranslationKey. When exclusiveOptionId
 * is set, that option cannot be combined with any other one of the same question.
 */
export const WELCOME_SURVEY_STEPS = [
  {
    id: "genres",
    titleTranslationKey: "survey.questions.genres",
    optionsTranslationKey: "survey.options.genres",
    minSelections: MIN_SELECTIONS,
    maxSelections: MAX_GENRE_SELECTIONS,
    exclusiveOptionId: null,
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
    titleTranslationKey: "survey.questions.platforms",
    optionsTranslationKey: "survey.options.platforms",
    minSelections: MIN_SELECTIONS,
    maxSelections: MAX_PLATFORM_SELECTIONS,
    exclusiveOptionId: null,
    options: [
      { id: "pc" },
      { id: "xbox" },
      { id: "playstation" },
      { id: "nintendoSwitch" },
      { id: "mobile" },
      { id: "vr" },
    ],
  },
  {
    id: "availability",
    titleTranslationKey: "survey.questions.availability",
    optionsTranslationKey: "survey.options.availability",
    minSelections: MIN_SELECTIONS,
    maxSelections: null,
    exclusiveOptionId: "anyTime",
    options: [
      { id: "weekdayMornings" },
      { id: "weekdayAfternoons" },
      { id: "weekdayNights" },
      { id: "weekendMornings" },
      { id: "weekendAfternoons" },
      { id: "weekendNights" },
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
