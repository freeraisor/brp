import { BRPActorSheetV2 } from "./base-actor-sheet.mjs";
import { CHARACTER_SHEET_ACTIONS } from './character/character-sheet-actions.mjs';
import { CHARACTER_SHEET_PARTS } from './character/character-sheet-config.mjs';
import { characterCoreSheetMethods } from './character/character-core-sheet.mjs';
import { characterSheetRenderMethods } from './character/character-sheet-render.mjs';
import { combatSheetMethods } from './character/combat-sheet.mjs';
import { effectsSheetMethods } from './character/effects-sheet.mjs';
import { inventorySheetMethods } from './character/inventory-sheet.mjs';
import { persSheetMethods } from './character/pers-sheet.mjs';
import { skillSheetMethods } from './character/skills-sheet.mjs';
import { socialSheetMethods } from './character/social-sheet.mjs';
import { storySheetMethods } from './character/story-sheet.mjs';

export class BRPCharacterSheet extends BRPActorSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['character'],
    position: {
      width: 865,
      height: 850
    },
    window: {
      resizable: true,
    },
    actions: CHARACTER_SHEET_ACTIONS,
  }

  static PARTS = CHARACTER_SHEET_PARTS
}

Object.assign(
  BRPCharacterSheet.prototype,
  characterSheetRenderMethods,
  characterCoreSheetMethods,
  skillSheetMethods,
  combatSheetMethods,
  effectsSheetMethods,
  inventorySheetMethods,
  persSheetMethods,
  socialSheetMethods,
  storySheetMethods
);
