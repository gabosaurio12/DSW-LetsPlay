// Limits aligned with RF-88/RF-89: every user keeps between 1 and 5 games.
export const MIN_VIDEOGAME_SELECTIONS = 1;
export const MAX_VIDEOGAME_SELECTIONS = 5;
export const MAX_VISIBLE_NAME_LENGTH = 100;

// Approved videogame catalogue simulated until the backend exposes the real catalog.
export const APPROVED_VIDEOGAMES = [
  { id: "eldenRing" },
  { id: "hollowKnight" },
  { id: "minecraft" },
  { id: "cyberpunk2077" },
  { id: "stardewValley" },
  { id: "baldursGate3" },
  { id: "valorant" },
  { id: "zeldaTearsOfTheKingdom" },
];

/**
 * Builds an empty profile draft.
 *
 * @returns {Object} A profile with empty fields and no selected videogames.
 */
export function createEmptyProfile() {
  return {
    visibleName: "",
    bio: "",
    avatarUrl: "",
    selectedVideogames: [],
  };
}
