import {
  acceptDrop,
  directDropBlockedMessage,
  duplicateItemMessage,
  getItemBrpid,
  hasActorItemByBrpid,
  hasPendingItemByBrpid,
  loadBestItemByBrpid,
  rejectDrop,
  requiredPowerMessage
} from './helpers.mjs';
import { hitLocationDialog, promptSkillSpecialism } from './dialogs.mjs';
import { dropPersonalityLikeItem } from './personality.mjs';
import { calculateSkillBase } from './skills.mjs';

const DIRECT_DROP_BLOCKED_TYPES = new Set(['powerMod', 'faction']);
const POWER_DEPENDENT_TYPES = new Set(['magic', 'mutation', 'psychic', 'sorcery', 'super']);
const DUPLICATE_BY_TYPE_TYPES = new Set(['power', 'magic', 'mutation', 'psychic', 'sorcery', 'super', 'hit-location', 'skillcat']);

export async function prepareDroppedItemsForActor(actor, itemData) {
  const preparedItems = [];
  const droppedItems = Array.isArray(itemData) ? itemData : [itemData];

  for (const droppedItem of droppedItems) {
    const item = droppedItem.toObject();
    const result = await validateDroppedItem(actor, item, preparedItems);

    if (!result.allowed) {
      ui.notifications.warn(result.message);
      continue;
    }

    preparedItems.push(...(result.additions ?? []), result.item);
  }

  return preparedItems;
}

async function validateDroppedItem(actor, item, pendingItems) {
  if (item.type === 'gear') return acceptDrop(item);
  if (DIRECT_DROP_BLOCKED_TYPES.has(item.type)) return rejectDrop(directDropBlockedMessage(item));

  if (item.type === 'armour') {
    const armourResult = await prepareDroppedArmour(actor, item);
    if (!armourResult.allowed) return armourResult;
  }

  if (item.type === 'skill') {
    const skillResult = await prepareDroppedSkill(actor, item);
    if (!skillResult.allowed) return skillResult;
  }

  if (item.type === 'weapon' && actor.type === 'character') {
    const weaponResult = await prepareDroppedWeapon(actor, item, pendingItems);
    if (!weaponResult.allowed) return weaponResult;
    pendingItems = [...pendingItems, ...(weaponResult.additions ?? [])];
  }

  if (['personality', 'profession', 'culture'].includes(item.type)) {
    const result = await dropPersonalityLikeItem(item, actor);
    if (result.reqResult !== 1) return rejectDrop(result.errMsg);
  }

  if (item.type === 'failing' && actor.system?.super === "") {
    return rejectDrop(`${item.name} : ${game.i18n.localize('BRP.needPower')} (${game.i18n.localize('BRP.super')})`);
  }

  if (item.type === 'power' && !game.settings.get('brp', item.system?.category)) {
    return rejectDrop(`${item.name} : ${game.i18n.localize('BRP.nopower')}`);
  }

  if (item.type === 'allegiance') {
    const allegianceResult = validateUniqueSocialItem(actor, item, {
      settingKey: 'useAlleg',
      disabledMessage: `${item.name} : ${game.i18n.localize('BRP.noAlleg')}`
    });
    if (!allegianceResult.allowed) return allegianceResult;
  }

  if (item.type === 'reputation') {
    const reputationResult = validateReputationItem(actor, item);
    if (!reputationResult.allowed) return reputationResult;
  }

  if (item.type === 'persTrait') {
    const persTraitResult = validateUniqueSocialItem(actor, item, {
      settingKey: 'usePersTrait',
      disabledMessage: `${item.name} : ${game.i18n.localize('BRP.noPersTrait')}`
    });
    if (!persTraitResult.allowed) return persTraitResult;
  }

  if (item.type === 'passion') {
    const passionResult = validateUniqueSocialItem(actor, item, {
      settingKey: 'usePassion',
      disabledMessage: `${item.name} : ${game.i18n.localize('BRP.noPassion')}`
    });
    if (!passionResult.allowed) return passionResult;
  }

  if (POWER_DEPENDENT_TYPES.has(item.type) && actor.system?.[item.type] === "") {
    return rejectDrop(requiredPowerMessage(item));
  }

  if (DUPLICATE_BY_TYPE_TYPES.has(item.type) && hasActorItemByBrpid(actor, getItemBrpid(item), { type: item.type })) {
    return rejectDrop(duplicateItemMessage(item));
  }

  if (item.type === 'hit-location' && !game.settings.get('brp', 'useHPL') && item.system?.locType !== 'general') {
    return rejectDrop(`${item.name} : ${game.i18n.localize('BRP.noHPL')}`);
  }

  return acceptDrop(item);
}

async function prepareDroppedArmour(actor, item) {
  if (game.settings.get('brp', 'useHPL') && item.system?.HPL) {
    return rejectDrop(`${item.name} : ${game.i18n.localize('BRP.armourNotHPL')}`);
  }

  if (!game.settings.get('brp', 'useHPL')) return acceptDrop(item);

  const usage = await hitLocationDialog(actor);
  if (!usage) {
    return rejectDrop(`${item.name} : ${game.i18n.localize('BRP.armourNoHitLoc')}`);
  }

  item.system.hitlocID = usage.hitLoc;
  return acceptDrop(item);
}

async function prepareDroppedSkill(actor, item) {
  if (item.system?.group) {
    return rejectDrop(`${item.name}(${getItemBrpid(item)}): ${game.i18n.localize('BRP.stopGroupSkill')}`);
  }

  if (item.system?.specialism && !item.system?.chosen) {
    const specialized = await promptSkillSpecialism(foundry.utils.duplicate(item));
    if (!specialized) return rejectDrop(`${item.name}: ${game.i18n.localize('BRP.stopGroupSkill')}`);
    item = specialized;
  }

  if (hasActorItemByBrpid(actor, getItemBrpid(item), { type: 'skill' })) {
    return rejectDrop(duplicateItemMessage(item));
  }

  item.system.base = await calculateSkillBase(item, actor);
  return acceptDrop(item);
}

async function prepareDroppedWeapon(actor, item, pendingItems) {
  if (!item.system?.skill1 || item.system.skill1 === 'none') {
    return rejectDrop(`${item.name} : ${game.i18n.localize('BRP.weaponNeedsSkill')}`);
  }

  item.system.equipStatus = 'carried';
  item.system.actEnc = item.system.enc;
  item.system.hpCurr = item.system.hp;

  const additions = [];
  for (const skillField of ['skill1', 'skill2']) {
    const brpid = String(item.system?.[skillField] ?? '').trim();
    if (!brpid || brpid === 'none') continue;
    if (hasActorItemByBrpid(actor, brpid, { type: 'skill' })) continue;
    if (hasPendingItemByBrpid([...pendingItems, ...additions], brpid, { type: 'skill' })) continue;

    const skill = await loadBestItemByBrpid(brpid);
    if (!skill) continue;

    skill.system.base = await calculateSkillBase(skill, actor);
    additions.push(skill);
  }

  return acceptDrop(item, additions);
}

function validateUniqueSocialItem(actor, item, { settingKey, disabledMessage }) {
  if (!game.settings.get('brp', settingKey)) return rejectDrop(disabledMessage);
  if (hasActorItemByBrpid(actor, getItemBrpid(item), { type: item.type })) return rejectDrop(duplicateItemMessage(item));
  return acceptDrop(item);
}

function validateReputationItem(actor, item) {
  const reputationMode = String(game.settings.get('brp', 'useReputation'));
  if (reputationMode === "0") {
    return rejectDrop(`${item.name} : ${game.i18n.localize('BRP.noRep')}`);
  }

  if (reputationMode === "1" && actor.items.filter(actorItem => actorItem.type === 'reputation').length > 0) {
    return rejectDrop(`${item.name} : ${game.i18n.localize('BRP.oneRep')}`);
  }

  if (reputationMode !== "1" && hasActorItemByBrpid(actor, getItemBrpid(item), { type: 'reputation' })) {
    return rejectDrop(duplicateItemMessage(item));
  }

  return acceptDrop(item);
}
