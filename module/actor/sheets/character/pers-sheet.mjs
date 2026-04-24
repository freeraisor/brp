import BRPDialog from '../../../setup/brp-dialog.mjs';
import { BRPContextMenu } from '../../../setup/context-menu.mjs';
import { PERS_CONTEXT_SELECTORS, PERS_SECTION_IDS } from './character-sheet-config.mjs';
import {
  captureRefreshWorkspaceScroll,
  cssEscape,
  escapeHTML,
  getTargetElement,
  normalizeSectionStateMap,
  readStoredBoolean,
  restoreRefreshWorkspaceScrollSoon
} from './character-sheet-utils.mjs';

const SORT_MODES = ['name', 'name-desc', 'value-desc', 'value-asc'];
const DEFAULT_SORT_MODES = {
  traits: 'name',
  passions: 'value-desc'
};

export const PERS_SHEET_ACTIONS = {
  persSectionToggle: onPersSectionToggle,
  persSortCycle: onPersSortCycle,
  persCardMenu: onPersCardMenu,
  persImpCheckToggle: onPersImpCheckToggle,
  persOpenFocus: onPersOpenFocus
};

export const persSheetMethods = {
  _bindPersControls() {
    const root = this.element.querySelector('.brp-pers-refresh');
    if (!root) return;

    root.querySelectorAll('.brp-pers-refresh-trait-card[data-item-id]').forEach(card => {
      card.addEventListener('dblclick', event => {
        if (event.target.closest('.brp-pers-refresh-card-actions, .brp-pers-refresh-check, .brp-pers-refresh-trait-value')) return;
        const item = getPersEmbeddedItemFromTarget(this.actor, event.currentTarget, ['persTrait']);
        item?.sheet?.render(true);
      });
    });

    root.querySelectorAll('.brp-pers-refresh-passion-card[data-item-id]').forEach(card => {
      card.addEventListener('dblclick', event => {
        if (event.target.closest('.brp-pers-refresh-card-actions, .brp-pers-refresh-check, .brp-pers-refresh-passion-roll, .brp-pers-refresh-passion-focus-link')) return;
        const item = getPersEmbeddedItemFromTarget(this.actor, event.currentTarget, ['passion']);
        item?.sheet?.render(true);
      });
    });
  },

  _bindPersContextMenu() {
    const bindings = [
      ['traits', target => this._getPersTraitContextOptions(target)],
      ['passions', target => this._getPersPassionContextOptions(target)]
    ];

    for (const [sectionId, getter] of bindings) {
      const selector = PERS_CONTEXT_SELECTORS[sectionId];
      if (!selector || !this.element.querySelector(selector)) continue;

      new BRPContextMenu(this.element, selector, [], {
        jQuery: false,
        onOpen: target => {
          ui.context.menuItems = getter(target);
        }
      });
    }
  },

  _getPersTraitContextOptions(target) {
    const item = getPersEmbeddedItemFromTarget(this.actor, target, ['persTrait']);
    if (!item) return [];

    const impCheck = isPersTraitImpCheck(item);
    const canMutate = !this.actor.system.lock && Boolean(game.settings.get('brp', 'usePersTrait'));
    const options = [
      {
        name: 'BRP.view',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: () => item.sheet.render(true)
      }
    ];

    if (canMutate) {
      options.push({
        name: impCheck ? 'BRP.persRemoveImpCheck' : 'BRP.persAddImpCheck',
        icon: '<i class="fas fa-check fa-fw"></i>',
        callback: listItem => togglePersImpCheck(this, listItem ?? target, item)
      });
      options.push({
        name: 'Remove from character',
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: listItem => deletePersEmbeddedItemFromCharacter(this, listItem ?? target)
      });
    }

    return options;
  },

  _getPersPassionContextOptions(target) {
    const item = getPersEmbeddedItemFromTarget(this.actor, target, ['passion']);
    if (!item) return [];

    const options = [
      {
        name: 'BRP.view',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: () => item.sheet.render(true)
      }
    ];

    options.push(...getPersOpenFocusOptions(target, item));

    if (!this.actor.system.lock && Boolean(game.settings.get('brp', 'usePassion'))) {
      options.push({
        name: item.system?.improve ? 'BRP.persRemoveImpCheck' : 'BRP.persAddImpCheck',
        icon: '<i class="fas fa-check fa-fw"></i>',
        callback: listItem => togglePersImpCheck(this, listItem ?? target, item)
      });
      options.push({
        name: 'Remove from character',
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: listItem => deletePersEmbeddedItemFromCharacter(this, listItem ?? target)
      });
    }

    return options;
  }
};

async function onPersSectionToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const section = getPersSectionFromTarget(this.element, target);
  const sectionId = getPersSectionId(target);
  if (!section || !PERS_SECTION_IDS.includes(sectionId)) return;

  const settings = getPersSheetSettings(this.actor);
  const isCollapsed = section.classList.contains('is-collapsed');
  const nextCollapsed = !isCollapsed;
  updatePersSectionCollapsedMarkup(section, target, nextCollapsed);

  settings.collapsedSections[sectionId] = nextCollapsed;
  settings.stateInitialized = true;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await this.actor.update({ 'flags.brp.sheet.pers': settings }, { render: false, renderSheet: false });
  } catch (error) {
    updatePersSectionCollapsedMarkup(section, target, isCollapsed);
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onPersSortCycle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const sectionId = getPersSectionId(target);
  if (!PERS_SECTION_IDS.includes(sectionId)) return;

  const settings = getPersSheetSettings(this.actor);
  const currentMode = sanitizeSortMode(sectionId, settings.sortModes[sectionId]);
  const nextMode = SORT_MODES[(SORT_MODES.indexOf(currentMode) + 1) % SORT_MODES.length];
  settings.sortModes[sectionId] = nextMode;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await this.actor.update({ 'flags.brp.sheet.pers': settings });
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

function onPersCardMenu(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const owner = getPersContextOwner(target);
  if (!owner) return;

  const button = getTargetElement(target);
  const rect = button?.getBoundingClientRect?.();
  owner.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    view: globalThis.window,
    clientX: rect?.right ?? 0,
    clientY: rect?.bottom ?? 0
  }));
}

async function onPersImpCheckToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await togglePersImpCheck(this, target);
}

async function onPersOpenFocus(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const item = getPersEmbeddedItemFromTarget(this.actor, target, ['passion']);
  if (!item) return;

  await openPersLinkedFocus(item);
}

async function openPersLinkedFocus(item) {
  const focus = await resolvePassionFocusDocument(item);
  if (!focus) {
    ui.notifications.warn(game.i18n.localize('BRP.persLinkedFocusMissing'));
    return;
  }

  focus.sheet?.render(true);
}

function getPersSectionId(target) {
  const element = getTargetElement(target);
  return String(
    element?.dataset?.sectionId
    ?? element?.closest?.('[data-section-id]')?.dataset?.sectionId
    ?? element?.closest?.('.brp-pers-refresh-section[data-pers-section]')?.dataset?.persSection
    ?? ''
  ).trim();
}

function getPersSectionFromTarget(root, target) {
  const sectionId = getPersSectionId(target);
  if (!sectionId) return null;
  return root?.querySelector?.(`.brp-pers-refresh-section[data-pers-section="${cssEscape(sectionId)}"]`) ?? null;
}

function getPersEmbeddedItemFromTarget(actor, target, allowedTypes = ['persTrait', 'passion']) {
  const element = getTargetElement(target);
  const row = element?.closest?.('[data-item-id]');
  const itemId = row?.dataset?.itemId ?? element?.dataset?.itemId;
  const item = actor.items.get(itemId);
  return allowedTypes.includes(item?.type) ? item : null;
}

function getPersContextOwner(target) {
  const sectionId = getPersSectionId(target);
  const selector = PERS_CONTEXT_SELECTORS[sectionId];
  if (!selector) return null;
  return getTargetElement(target)?.closest?.(selector);
}

function getPersSheetSettings(actor) {
  const sheetFlags = foundry.utils.deepClone(actor.getFlag('brp', 'sheet') ?? {});
  const settings = sheetFlags.pers ?? {};
  settings.stateInitialized = readStoredBoolean(settings.stateInitialized, false);
  settings.collapsedSections = normalizeSectionStateMap(PERS_SECTION_IDS, settings.collapsedSections, {
    initialized: settings.stateInitialized,
    ignoreAllTrueUnlessInitialized: true
  });
  settings.sortModes ??= {};

  for (const sectionId of PERS_SECTION_IDS) {
    settings.sortModes[sectionId] = sanitizeSortMode(sectionId, settings.sortModes[sectionId]);
  }

  return settings;
}

function updatePersSectionCollapsedMarkup(section, toggle, isCollapsed) {
  section?.classList.toggle('is-collapsed', isCollapsed);
  const body = section?.querySelector?.('.brp-pers-refresh-section-body');
  if (body) body.hidden = isCollapsed;
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.dataset.tooltip = game.i18n.localize(isCollapsed ? 'BRP.expand' : 'BRP.collapse');
  }
}

function sanitizeSortMode(sectionId, value) {
  const mode = String(value ?? '').trim();
  return SORT_MODES.includes(mode) ? mode : DEFAULT_SORT_MODES[sectionId];
}

function isPersTraitImpCheck(item) {
  return Boolean(item.system?.improve || item.system?.oppimprove);
}

async function togglePersImpCheck(sheet, target, item = null) {
  const persItem = item ?? getPersEmbeddedItemFromTarget(sheet.actor, target, ['persTrait', 'passion']);
  if (!persItem) return;

  const nextValue = persItem.type === 'persTrait'
    ? !isPersTraitImpCheck(persItem)
    : !Boolean(persItem.system?.improve);
  const updates = persItem.type === 'persTrait'
    ? { 'system.improve': nextValue, 'system.oppimprove': false }
    : { 'system.improve': nextValue };

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await persItem.update(updates);
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function deletePersEmbeddedItemFromCharacter(sheet, target) {
  const item = getPersEmbeddedItemFromTarget(sheet.actor, target, ['persTrait', 'passion']);
  if (!item) return;

  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize('BRP.deleteItem') },
    content: `${game.i18n.localize('BRP.deleteConfirm')}<br><strong> ${escapeHTML(item.name)}</strong>`
  });
  if (!confirmation) return;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await item.delete();
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

function getPersOpenFocusOptions(target, item) {
  const card = getTargetElement(target)?.closest?.('.brp-pers-refresh-passion-card[data-item-id]');
  if (card?.dataset?.focusResolved !== 'true') return [];

  const focusType = String(card.dataset.focusType ?? item.system?.focusLinkType ?? '').trim().toLowerCase();
  const focusLabel = String(card.dataset.focusLabel ?? item.system?.focus ?? item.name ?? '').trim();
  const fallbackName = focusLabel || item.name;
  const name = focusType === 'contact'
    ? game.i18n.format('BRP.persOpenLinkedContact', { name: fallbackName })
    : focusType === 'faction'
      ? game.i18n.format('BRP.persOpenLinkedFaction', { name: fallbackName })
      : game.i18n.localize('BRP.persOpenLinkedFocus');

  return [{
    name,
    icon: '<i class="fas fa-link fa-fw"></i>',
    callback: () => openPersLinkedFocus(item)
  }];
}

async function resolvePassionFocusDocument(item) {
  const focusLinkUuid = String(item.system?.focusLinkUuid ?? '').trim();
  if (!focusLinkUuid) return null;

  const focusLinkType = String(item.system?.focusLinkType ?? '').trim().toLowerCase();
  let document = null;
  try {
    document = await fromUuid(focusLinkUuid);
  } catch (error) {
    console.warn(`BRP | Failed to resolve linked focus document for ${item?.name ?? item?.id ?? 'unknown item'} (${focusLinkUuid})`, error);
    return null;
  }

  if (!(document instanceof Item)) return null;
  if (focusLinkType && document.type !== focusLinkType) return null;
  if (!['contact', 'faction'].includes(document.type)) return null;
  return document;
}
