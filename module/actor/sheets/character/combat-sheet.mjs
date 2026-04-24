import BRPDialog from '../../../setup/brp-dialog.mjs';
import { BRPCheck } from '../../../apps/check.mjs';
import { isCtrlKey } from '../../../apps/helper.mjs';
import { DEFAULT_WEAPON_SORT_MODE, WEAPON_SORT_MODES } from './prepare/combat.mjs';
import {
  captureRefreshWorkspaceScroll,
  escapeHTML,
  getTargetElement,
  numberOrZero,
  persistUiMapFlag,
  restoreRefreshWorkspaceScrollSoon
} from './character-sheet-utils.mjs';

export const COMBAT_SHEET_ACTIONS = {
  combatDetailsToggle: onCombatDetailsToggle,
  combatSortToggle: onCombatSortToggle,
  combatSortSelect: onCombatSortSelect,
  combatDefenseRoll: onCombatDefenseRoll,
  combatDefenseSelect: onCombatDefenseSelect,
  combatWeaponRoll: onCombatWeaponRoll,
  combatWeaponReload: onCombatWeaponReload
};

export const combatSheetMethods = {
  _bindCombatSortMenu() {
    const root = this.element.querySelector('.brp-combat-refresh');
    if (!root) return;

    root.addEventListener('click', event => {
      if (event.target.closest('.brp-combat-refresh-sort-button, .brp-combat-refresh-sort-menu')) return;
      closeCombatSortMenus(this.element);
    });
  },

  _bindCombatWeaponOrdering() {
    const list = this.element.querySelector('.brp-combat-refresh-weapon-list');
    if (!list) return;

    list.querySelectorAll('[data-combat-weapon-drag]').forEach(handle => {
      handle.addEventListener('dragstart', this._onCombatWeaponDragStart.bind(this));
      handle.addEventListener('dragend', this._onCombatWeaponDragEnd.bind(this));
    });

    list.querySelectorAll('.brp-combat-refresh-weapon').forEach(row => {
      row.addEventListener('dragover', this._onCombatWeaponDragOver.bind(this));
      row.addEventListener('dragleave', this._onCombatWeaponDragLeave.bind(this));
      row.addEventListener('drop', this._onCombatWeaponDrop.bind(this));
    });
  },

  _onCombatWeaponDragStart(event) {
    const row = event.currentTarget.closest('.brp-combat-refresh-weapon');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;

    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-brp-combat-weapon', itemId);
    row.classList.add('is-dragging');
  },

  _onCombatWeaponDragEnd() {
    this.element.querySelectorAll('.brp-combat-refresh-weapon.is-dragging, .brp-combat-refresh-weapon.is-drop-target').forEach(row => {
      row.classList.remove('is-dragging', 'is-drop-target');
    });
  },

  _onCombatWeaponDragOver(event) {
    if (!isCombatWeaponDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('is-drop-target');
  },

  _onCombatWeaponDragLeave(event) {
    event.currentTarget.classList.remove('is-drop-target');
  },

  async _onCombatWeaponDrop(event) {
    if (!isCombatWeaponDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('is-drop-target');

    const sourceItemId = event.dataTransfer.getData('application/x-brp-combat-weapon');
    const targetItemId = event.currentTarget.dataset.itemId;
    if (!sourceItemId || !targetItemId || sourceItemId === targetItemId) return;

    const weaponOrder = Array.from(this.element.querySelectorAll('.brp-combat-refresh-weapon'))
      .map(row => row.dataset.itemId)
      .filter(Boolean);
    const sourceIndex = weaponOrder.indexOf(sourceItemId);
    const targetIndex = weaponOrder.indexOf(targetItemId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    weaponOrder.splice(sourceIndex, 1);
    weaponOrder.splice(targetIndex, 0, sourceItemId);

    const updates = weaponOrder.map((id, index) => ({
      _id: id,
      'system.sortOrder': (index + 1) * 10
    }));

    const scrollTop = captureRefreshWorkspaceScroll(this, event.currentTarget);
    try {
      await this.actor.update({ 'flags.brp.sheet.weaponSortMode': 'custom' }, { render: false, renderSheet: false });
      await Item.updateDocuments(updates, { parent: this.actor });
    } finally {
      restoreRefreshWorkspaceScrollSoon(this, scrollTop);
    }
  }
};

async function onCombatDetailsToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const row = getCombatRowFromTarget(target);
  const details = row?.querySelector('.brp-combat-refresh-weapon-details');
  const itemId = row?.dataset.itemId;
  if (!details || !itemId) return;

  const isOpen = !row.classList.contains('is-details-open');
  row.classList.toggle('is-details-open', isOpen);
  target.classList.toggle('is-active', isOpen);
  details.hidden = !isOpen;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await persistUiMapFlag(this.actor, 'flags.brp.sheet.combat.expandedWeapons', itemId, isOpen);
  } catch (error) {
    row.classList.toggle('is-details-open', !isOpen);
    target.classList.toggle('is-active', !isOpen);
    details.hidden = isOpen;
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

function onCombatSortToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const section = getTargetElement(target)?.closest?.('.brp-combat-refresh-weapons');
  const menu = section?.querySelector('.brp-combat-refresh-sort-menu');
  if (!menu) return;

  const isOpen = !menu.hidden;
  closeCombatSortMenus(this.element);
  menu.hidden = isOpen;
  target.classList.toggle('is-active', !isOpen);
}

async function onCombatSortSelect(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const mode = target.dataset.sortMode;
  if (!WEAPON_SORT_MODES.includes(mode)) return;

  const currentMode = this.actor.getFlag('brp', 'sheet')?.weaponSortMode ?? DEFAULT_WEAPON_SORT_MODE;
  closeCombatSortMenus(this.element);
  if (mode === currentMode) return;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await this.actor.update({ 'flags.brp.sheet.weaponSortMode': mode });
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onCombatDefenseRoll(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const skillId = target.dataset.skillId;
  const skill = this.actor.items.get(skillId);
  if (!skill) {
    ui.notifications.warn(game.i18n.localize('BRP.combatDefenseNoDodge'));
    return;
  }

  await triggerSkillRoll(event, this.actor, skill.id);
}

async function onCombatDefenseSelect(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const defenseId = target.dataset.defenseId;
  const candidates = getCombatDefenseCandidates(this.actor, defenseId);
  if (!candidates.length) {
    const key = defenseId === 'shield' ? 'BRP.combatDefenseNoShield' : 'BRP.combatDefenseNoParry';
    ui.notifications.warn(game.i18n.localize(key));
    return;
  }

  const item = await selectCombatDefenseWeapon(this.actor, candidates, defenseId);
  if (!item) return;

  const skillId = getWeaponSkillId(this.actor, item);
  if (this.actor.type !== 'npc' && !skillId) {
    ui.notifications.warn(game.i18n.localize('BRP.noWpnSkill'));
    return;
  }

  await triggerWeaponRoll(event, this.actor, item, skillId);
}

async function onCombatWeaponRoll(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const item = getCombatWeaponItemFromTarget(this.actor, target);
  if (!item) return;

  const skillId = getWeaponSkillId(this.actor, item) || getCombatRowFromTarget(target)?.dataset.skillId;
  if (this.actor.type !== 'npc' && !skillId) {
    ui.notifications.warn(game.i18n.localize('BRP.noWpnSkill'));
    return;
  }

  const canRoll = await consumeCombatWeaponAmmo(this, target, item);
  if (!canRoll) return;

  await triggerWeaponRoll(event, this.actor, item, skillId);
}

async function onCombatWeaponReload(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const item = getCombatWeaponItemFromTarget(this.actor, target);
  if (!item || normalizeCombatAmmoMode(item) !== 'magazine') return;

  const current = numberOrZero(item.system?.ammoCurr);
  const max = numberOrZero(item.system?.ammo);
  const magazineCount = numberOrZero(item.system?.magazineCount);
  if (max <= 0) return;

  if (current >= max) {
    ui.notifications.info(game.i18n.format('BRP.combatReloadFull', { weapon: item.name }));
    return;
  }

  if (magazineCount <= 0) {
    const message = game.i18n.format('BRP.combatReloadNoMagazines', { weapon: item.name });
    ui.notifications.warn(message);
    await createCombatStatusMessage(this.actor, message);
    return;
  }

  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize('BRP.reload') },
    content: game.i18n.format('BRP.combatReloadConfirm', { weapon: escapeHTML(item.name) })
  });
  if (!confirmation) return;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  await item.update({
    'system.ammoCurr': max,
    'system.magazineCount': magazineCount - 1
  }, { render: false, renderSheet: false });

  updateCombatAmmoMarkup(getCombatRowFromTarget(target), item, {
    current: max,
    magazineCount: magazineCount - 1
  });
  restoreRefreshWorkspaceScrollSoon(this, scrollTop);

  await createCombatStatusMessage(this.actor, game.i18n.format('BRP.combatReloaded', { weapon: item.name }));
}

function getCombatRowFromTarget(target) {
  return getTargetElement(target)?.closest?.('.brp-combat-refresh-weapon');
}

function getCombatWeaponItemFromTarget(actor, target) {
  const row = getCombatRowFromTarget(target);
  const item = actor.items.get(row?.dataset.itemId);
  return item?.type === 'weapon' ? item : null;
}

function closeCombatSortMenus(element) {
  element?.querySelectorAll('.brp-combat-refresh-sort-menu').forEach(menu => {
    menu.hidden = true;
  });
  element?.querySelectorAll('.brp-combat-refresh-sort-button.is-active').forEach(button => {
    button.classList.remove('is-active');
  });
}

function getCombatDefenseCandidates(actor, defenseId) {
  return actor.items
    .filter(item => item.type === 'weapon' && item.system?.equipStatus === 'carried')
    .filter(item => {
      if (defenseId === 'shield') return item.system?.weaponType === 'shield';
      if (defenseId === 'parry') return Boolean(item.system?.parry) && item.system?.weaponType !== 'shield';
      return false;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function selectCombatDefenseWeapon(actor, candidates, defenseId) {
  if (candidates.length === 1) return candidates[0];

  const defenseLabel = game.i18n.localize(defenseId === 'shield' ? 'BRP.shield' : 'BRP.parry');
  const title = game.i18n.format('BRP.selectItem', { type: defenseLabel });
  const newList = Object.fromEntries(candidates.map(item => {
    const skill = actor.items.get(getWeaponSkillId(actor, item));
    const label = skill ? `${item.name} (${skill.name})` : item.name;
    return [item.id, label];
  }));
  const html = await foundry.applications.handlebars.renderTemplate('systems/brp/templates/dialog/selectItem.hbs', {
    headTitle: title,
    newList
  });
  const usage = await BRPDialog.input({
    window: { title },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.proceed')
    }
  });

  return candidates.find(item => item.id === usage?.selectItem) ?? null;
}

function getWeaponSkillId(actor, item) {
  const sourceID = item.system?.sourceID;
  if (sourceID && actor.items.get(sourceID)) return sourceID;

  const skill1 = getActorItemByBRPID(actor, item.system?.skill1);
  const skill2 = item.system?.skill2 === 'none' ? null : getActorItemByBRPID(actor, item.system?.skill2);
  if (skill1 && skill2) {
    return numberOrZero(skill2.system?.total) >= numberOrZero(skill1.system?.total) ? skill2.id : skill1.id;
  }
  return skill1?.id ?? skill2?.id ?? '';
}

function getActorItemByBRPID(actor, brpid) {
  if (!brpid || brpid === 'none') return null;
  return actor.items.find(item => item.flags?.brp?.brpidFlag?.id === brpid) ?? null;
}

async function triggerSkillRoll(event, actor, skillId) {
  let shiftKey = event.shiftKey;
  const altKey = event.altKey;
  const ctrlKey = isCtrlKey(event ?? false);
  let cardType = 'NO';
  if (ctrlKey) cardType = 'OP';
  if (altKey) cardType = 'GR';
  if (altKey && ctrlKey) cardType = 'CO';
  if (game.settings.get('brp', 'switchShift')) {
    shiftKey = !shiftKey;
  }

  await BRPCheck._trigger({
    rollType: 'SK',
    cardType,
    skillId,
    shiftKey,
    actor,
    token: actor.token
  });
}

async function triggerWeaponRoll(event, actor, item, skillId) {
  let shiftKey = event.shiftKey;
  let rollType = 'CM';
  let cardType = 'CB';
  if (game.settings.get('brp', 'quickCombat') && shiftKey) {
    rollType = 'QC';
    cardType = 'NO';
    shiftKey = false;
  } else if (game.settings.get('brp', 'switchShift')) {
    shiftKey = !shiftKey;
  }

  await BRPCheck._trigger({
    rollType,
    cardType,
    itemId: item.id,
    skillId,
    shiftKey,
    actor,
    token: actor.token
  });
}

async function consumeCombatWeaponAmmo(sheet, target, item) {
  const mode = normalizeCombatAmmoMode(item);
  if (mode === 'none') return true;

  if (mode === 'count') {
    const quantity = numberOrZero(item.system?.quantity);
    if (quantity <= 0) return notifyCombatNoAmmo(item);

    const nextQuantity = quantity - 1;
    const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
    await item.update({ 'system.quantity': nextQuantity }, { render: false, renderSheet: false });
    updateCombatAmmoMarkup(getCombatRowFromTarget(target), item, { quantity: nextQuantity });
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
    return true;
  }

  const current = numberOrZero(item.system?.ammoCurr);
  if (current <= 0) return notifyCombatNoAmmo(item);

  const nextCurrent = current - 1;
  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  await item.update({ 'system.ammoCurr': nextCurrent }, { render: false, renderSheet: false });
  updateCombatAmmoMarkup(getCombatRowFromTarget(target), item, { current: nextCurrent });
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  return true;
}

function notifyCombatNoAmmo(item) {
  ui.notifications.warn(game.i18n.format('BRP.combatNoAmmo', { weapon: item.name }));
  return false;
}

function updateCombatAmmoMarkup(row, item, values = {}) {
  if (!row) return;

  const ammoBlock = row.querySelector('.brp-combat-refresh-ammo');
  if (!ammoBlock) return;

  const mode = normalizeCombatAmmoMode(item);
  const current = values.current ?? numberOrZero(item.system?.ammoCurr);
  const max = values.max ?? numberOrZero(item.system?.ammo);
  const magazineCount = values.magazineCount ?? numberOrZero(item.system?.magazineCount);
  const quantity = values.quantity ?? numberOrZero(item.system?.quantity);
  const isCritical = (mode === 'count' && quantity <= 0) || ((mode === 'single' || mode === 'magazine') && current <= 0);
  const isLow = mode === 'magazine' && max > 0 && current > 0 && current <= Math.ceil(max * 0.25);

  ammoBlock.querySelectorAll('.brp-combat-refresh-ammo-mag, .brp-combat-refresh-count-pill').forEach(element => {
    element.classList.toggle('is-low', isLow);
    element.classList.toggle('is-critical', isCritical);
  });

  const count = ammoBlock.querySelector('.brp-combat-refresh-count-value');
  if (count) count.textContent = String(quantity);

  const currentElement = ammoBlock.querySelector('.brp-combat-refresh-ammo-current');
  if (currentElement) currentElement.textContent = String(current);

  const maxElement = ammoBlock.querySelector('.brp-combat-refresh-ammo-max');
  if (maxElement) maxElement.textContent = `/ ${max}`;

  const magazineElement = ammoBlock.querySelector('.brp-combat-refresh-mag-count-value');
  if (magazineElement) magazineElement.textContent = String(magazineCount);
}

function normalizeCombatAmmoMode(item) {
  const mode = item.system?.ammoMode;
  if (['none', 'count', 'single', 'magazine'].includes(mode)) return mode;

  if (item.system?.weaponType === 'explosive') return 'count';
  if (['firearm', 'heavy'].includes(item.system?.weaponType)) return 'magazine';
  if (item.system?.weaponType === 'energy') return 'single';
  if (item.system?.weaponType === 'missile') return 'single';
  return 'none';
}

async function createCombatStatusMessage(actor, message) {
  await ChatMessage.create({
    user: game.user.id,
    content: `<p>${escapeHTML(message)}</p>`,
    speaker: ChatMessage.getSpeaker({ actor })
  });
}

function isCombatWeaponDrag(event) {
  return Array.from(event.dataTransfer?.types ?? []).includes('application/x-brp-combat-weapon');
}
