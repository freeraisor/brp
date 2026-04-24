import { CHARACTER_CORE_SHEET_ACTIONS } from './character-core-sheet.mjs';
import { COMBAT_SHEET_ACTIONS } from './combat-sheet.mjs';
import { EFFECTS_SHEET_ACTIONS } from './effects-sheet.mjs';
import { INVENTORY_SHEET_ACTIONS } from './inventory-sheet.mjs';
import { PERS_SHEET_ACTIONS } from './pers-sheet.mjs';
import { SKILL_SHEET_ACTIONS } from './skills-sheet.mjs';
import { SOCIAL_SHEET_ACTIONS } from './social-sheet.mjs';
import { STORY_SHEET_ACTIONS } from './story-sheet.mjs';

export const CHARACTER_SHEET_ACTIONS = {
  ...SKILL_SHEET_ACTIONS,
  ...COMBAT_SHEET_ACTIONS,
  ...INVENTORY_SHEET_ACTIONS,
  ...CHARACTER_CORE_SHEET_ACTIONS,
  ...PERS_SHEET_ACTIONS,
  ...EFFECTS_SHEET_ACTIONS,
  ...SOCIAL_SHEET_ACTIONS,
  ...STORY_SHEET_ACTIONS,
};
