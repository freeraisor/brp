import {
  createCombatPreparation,
  finalizeCombatPreparation,
  prepareWeaponItem
} from './prepare/combat.mjs';
import { finalizeDevelopmentPreparation } from './prepare/development.mjs';
import {
  createHealthPreparation,
  finalizeHealthPreparation,
  prepareHitLocationItem,
  prepareWoundItem
} from './prepare/health.mjs';
import {
  createInventoryPreparation,
  finalizeInventoryPreparation,
  prepareArmourItem,
  prepareGearItem
} from './prepare/inventory.mjs';
import {
  createPersPreparation,
  finalizePersPreparation,
  preparePassionItem,
  preparePersTraitItem
} from './prepare/pers.mjs';
import {
  createPowersPreparation,
  finalizePowersPreparation,
  prepareFailingItem,
  prepareMagicItem,
  prepareMutationItem,
  preparePsychicItem,
  prepareSorceryItem,
  prepareSuperItem
} from './prepare/powers.mjs';
import {
  createSkillsPreparation,
  finalizeSkillsPreparation,
  prepareSkillCategoryItem,
  prepareSkillItem
} from './prepare/skills.mjs';
import {
  createStoryPreparation,
  finalizeStoryPreparation
} from './prepare/story.mjs';
import {
  createSocialPreparation,
  finalizeSocialPreparation,
  prepareAllegianceItem,
  prepareContactItem,
  prepareReputationItem
} from './prepare/social.mjs';

const ITEM_PREPARERS = {
  gear: ({ item, states }) => prepareGearItem(item, states.inventory),
  skill: ({ actor, item, states }) => prepareSkillItem(actor, item, states.skills),
  'hit-location': ({ context, item, states }) => prepareHitLocationItem(context, item, states.health, states.inventory.armours),
  wound: ({ item, states }) => prepareWoundItem(item, states.health),
  magic: ({ actor, context, item, states }) => prepareMagicItem(actor, item, states.skills, context, states.powers),
  mutation: ({ item, states }) => prepareMutationItem(item, states.powers),
  psychic: ({ actor, context, item, states }) => preparePsychicItem(actor, item, states.skills, context, states.powers),
  sorcery: ({ item, states }) => prepareSorceryItem(item, states.powers),
  super: ({ item, states }) => prepareSuperItem(item, states.powers),
  failing: ({ item, states }) => prepareFailingItem(item, states.powers),
  armour: ({ actor, context, item, states }) => prepareArmourItem(context, actor, item, states.inventory),
  weapon: ({ actor, item, states }) => prepareWeaponItem(actor, item, states.skills.skills, states.combat),
  allegiance: ({ item, states }) => prepareAllegianceItem(item, states.social),
  passion: ({ item, states }) => preparePassionItem(item, states.pers),
  persTrait: ({ item, states }) => preparePersTraitItem(item, states.pers),
  reputation: ({ item, states }) => prepareReputationItem(item, states.social),
  contact: ({ item, states }) => prepareContactItem(item, states.social),
  skillcat: ({ item, states }) => prepareSkillCategoryItem(item, states.skills)
};

const FINALIZE_STEPS = [
  ({ actor, context, states }) => finalizeSkillsPreparation(context, actor, states.skills),
  ({ context, states }) => finalizeCombatPreparation(context, states.combat),
  ({ context, states }) => finalizeHealthPreparation(context, states.health),
  ({ context, states }) => finalizeInventoryPreparation(context, states.inventory),
  ({ context, states }) => finalizePowersPreparation(context, states.powers),
  async ({ context, states }) => finalizePersPreparation(context, states.pers),
  async ({ context, states }) => finalizeSocialPreparation(context, states.social),
  async ({ actor, context, states }) => finalizeStoryPreparation(context, actor, states.story),
  ({ context, states }) => finalizeDevelopmentPreparation(context, states.improve)
];

export async function prepareCharacterItems(sheet, context) {
  const states = createPreparationState(sheet.actor);
  const handlerContext = {
    actor: sheet.actor,
    context,
    states
  };

  for (const item of sheet.document.items) {
    item.img = item.img || DEFAULT_TOKEN;
    const prepareItem = ITEM_PREPARERS[item.type];
    if (!prepareItem) continue;

    try {
      prepareItem({ ...handlerContext, item });
    } catch (error) {
      console.error(`BRP | Failed to prepare character-sheet item ${item.type}:${item.name} (${item.id})`, error);
    }
  }

  for (let index = 0; index < FINALIZE_STEPS.length; index++) {
    const finalize = FINALIZE_STEPS[index];
    try {
      await finalize(handlerContext);
    } catch (error) {
      console.error(`BRP | Failed character-sheet finalize step ${index + 1}`, error);
    }
  }

  return context;
}

function createPreparationState(actor) {
  const improve = [];
  return {
    improve,
    combat: createCombatPreparation(),
    health: createHealthPreparation(),
    inventory: createInventoryPreparation(),
    powers: createPowersPreparation(),
    pers: createPersPreparation(improve),
    social: createSocialPreparation(improve),
    skills: createSkillsPreparation(actor, improve),
    story: createStoryPreparation(actor)
  };
}
