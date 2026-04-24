import {
  cultureDelete,
  dropPersonalityLikeItem,
  personalityDelete,
  professionDelete
} from './item-drop/personality.mjs';
import {
  calculateSkillBase,
  ensureSkillCategory
} from './item-drop/skills.mjs';
import {
  hitLocationDialog,
  promptSkillSpecialism,
  selectFromRadio,
  selectGroupSkill,
  selectSkillGroup
} from './item-drop/dialogs.mjs';
import { prepareDroppedItemsForActor } from './item-drop/create.mjs';

export class BRPactorItemDrop {
  static async _BRPonDropItemCreate(actor, itemData) {
    return prepareDroppedItemsForActor(actor, itemData);
  }

  static async _calcBase(item, actor) {
    return calculateSkillBase(item, actor);
  }

  static async hitLocationDialog(actor) {
    return hitLocationDialog(actor);
  }

  static async _dropPersonality(item, actor) {
    return dropPersonalityLikeItem(item, actor);
  }

  static async personalityDelete(event, actor) {
    return personalityDelete(event, actor);
  }

  static async professionDelete(event, actor) {
    return professionDelete(event, actor);
  }

  static async cultureDelete(event, actor) {
    return cultureDelete(event, actor);
  }

  static async _selectGroupSkill(newSkill, actor, picks) {
    return selectGroupSkill(newSkill, actor, picks);
  }

  static async _selectSkillGroup(newGroup) {
    return selectSkillGroup(newGroup);
  }

  static async _getSpecialism(newSkill, actor) {
    return promptSkillSpecialism(newSkill, actor);
  }

  static async selectFromRadio(list, title) {
    return selectFromRadio(list, title);
  }

  static async _checkSkillCat(skill, actor) {
    return ensureSkillCategory(skill, actor);
  }
}
