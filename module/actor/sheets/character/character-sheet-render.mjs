import { BRPActorSheetV2 } from '../base-actor-sheet.mjs';
import { prepareCharacterSheetContext } from './character-context.mjs';
import { applyCharacterSheetTheme } from './character-theme.mjs';
import { getCharacterParts, getCharacterTabs } from './character-tabs.mjs';
import { CHARACTER_SHEET_PARTS, CHARACTER_TAB_PART_IDS } from './character-sheet-config.mjs';
import {
  dataIds,
  restoreRefreshWorkspaceScroll
} from './character-sheet-utils.mjs';

export const characterSheetRenderMethods = {
  _configureRenderOptions(options) {
    BRPActorSheetV2.prototype._configureRenderOptions.call(this, options);
    options.parts = getCharacterParts(this.actor, game.settings);
  },

  async _preparePartContext(partId, context) {
    if (CHARACTER_TAB_PART_IDS.has(partId)) {
      context.tab = context.tabs[partId];
    }
    return context;
  },

  _onFirstRender(context, options) {
    BRPActorSheetV2.prototype._onFirstRender.call(this, context, options);
    this._renderRefreshContainers();
  },

  _renderRefreshContainers() {
    const containerElements = Array.from(this.element.querySelectorAll('[data-container-id]'));
    const containers = Object.fromEntries(containerElements.map(element => [element.dataset.containerId, element]));

    if (!containerElements.length) {
      console.warn('BRP | No refresh containers found while rendering character sheet');
    }

    for (const [part, config] of Object.entries(CHARACTER_SHEET_PARTS)) {
      if (!config.container?.id) continue;
      const element = this.element.querySelector(`[data-application-part="${part}"]`);
      if (!element) {
        console.warn(`BRP | Missing rendered part element for ${part}`);
        continue;
      }

      const container = containers[config.container.id];
      if (!container) {
        console.warn(`BRP | Missing refresh container ${config.container.id} for part ${part}`);
        continue;
      }
      if (element.parentElement !== container) container.append(element);
    }
  },

  _captureTransientUiState() {
    return {
      ...BRPActorSheetV2.prototype._captureTransientUiState.call(this),
      characterRefresh: captureCharacterRefreshUiState(this.element)
    };
  },

  _restoreTransientUiState(state) {
    BRPActorSheetV2.prototype._restoreTransientUiState.call(this, state);
    restoreCharacterRefreshUiState(this.element, state?.characterRefresh);
  },

  _getTabs(parts, context) {
    const tabGroup = 'primary';
    if (!this.tabGroups[tabGroup]) {
      this.tabGroups[tabGroup] = 'combat';
    }
    return getCharacterTabs(parts, context, this.tabGroups[tabGroup], tabGroup);
  },

  async _prepareContext(options) {
    const context = await BRPActorSheetV2.prototype._prepareContext.call(this, options);
    return prepareCharacterSheetContext(this, options, context);
  },

  _onRender(context, options) {
    this._renderRefreshContainers();
    BRPActorSheetV2.prototype._onRender.call(this, context, options);
    this._dragDrop.forEach(handler => handler.bind(this.element));
    this.element.querySelectorAll('.inline-edit').forEach(node => node.addEventListener("change", BRPActorSheetV2.skillInline.bind(this)));
    this._bindSkillSearch();
    this._bindSkillContextMenu();
    this._bindSkillCategoryOrdering();
    this._bindCombatSortMenu();
    this._bindCombatWeaponOrdering();
    this._bindInventoryControls();
    this._bindInventoryDragDrop();
    this._bindInventoryContextMenu();
    this._bindInventoryCurrencyContextMenu();
    this._bindCharacterCoreContextMenu();
    try {
      this._bindPersControls();
      this._bindPersContextMenu();
    } catch (error) {
      console.error('BRP | Failed to bind personality sheet controls', error);
    }
    this._bindSocialControls();
    this._bindSocialContextMenu();
    try {
      this._bindStoryControls();
      this._bindStoryContextMenu();
    } catch (error) {
      console.error('BRP | Failed to bind story sheet controls', error);
    }
    try {
      this._bindEffectsControls();
    } catch (error) {
      console.error('BRP | Failed to bind effects sheet controls', error);
    }
    this._bindCharacterCustomFieldDragDrop();
    applyCharacterSheetTheme(this.element, context.theme);
    restoreRefreshWorkspaceScroll(this);
  }
};

function captureCharacterRefreshUiState(element) {
  return {
    combat: captureCombatUiState(element),
    health: captureHealthUiState(element),
    inventory: captureInventoryUiState(element),
    skills: captureSkillUiState(element),
    social: captureSocialUiState(element),
    story: captureStoryUiState(element)
  };
}

function restoreCharacterRefreshUiState(element, state = {}) {
  restoreCombatUiState(element, state.combat);
  restoreHealthUiState(element, state.health);
  restoreInventoryUiState(element, state.inventory);
  restoreSkillUiState(element, state.skills);
  restoreSocialUiState(element, state.social);
  restoreStoryUiState(element, state.story);
}

function captureCombatUiState(element) {
  const root = element?.querySelector('.brp-combat-refresh');
  if (!root) return {};

  return {
    detailsOpen: dataIds(root.querySelectorAll('.brp-combat-refresh-weapon.is-details-open[data-item-id]'), 'itemId'),
    sortMenuOpen: Boolean(root.querySelector('.brp-combat-refresh-sort-menu:not([hidden])'))
  };
}

function restoreCombatUiState(element, state = {}) {
  if (!element) return;

  const detailsOpen = new Set(state.detailsOpen ?? []);
  element.querySelectorAll('.brp-combat-refresh-weapon[data-item-id]').forEach(row => {
    const isOpen = detailsOpen.has(row.dataset.itemId);
    row.classList.toggle('is-details-open', isOpen);
    row.querySelectorAll('.brp-combat-refresh-weapon-details').forEach(details => {
      details.hidden = !isOpen;
    });
    row.querySelectorAll('.brp-combat-refresh-details-toggle').forEach(toggle => {
      toggle.classList.toggle('is-active', isOpen);
    });
  });

  const sortMenu = element.querySelector('.brp-combat-refresh-sort-menu');
  const sortButton = element.querySelector('.brp-combat-refresh-sort-button');
  if (sortMenu && typeof state.sortMenuOpen === 'boolean') {
    sortMenu.hidden = !state.sortMenuOpen;
    sortButton?.classList.toggle('is-active', state.sortMenuOpen);
  }
}

function captureHealthUiState(element) {
  const root = element?.querySelector('.brp-health-tab');
  if (!root) return {};

  return {
    locationsCollapsed: root.querySelector('.brp-health-location-section')?.classList.contains('is-collapsed') ?? null,
    locationsExpanded: dataIds(root.querySelectorAll('.brp-health-location.is-expanded[data-item-id]'), 'itemId'),
    woundsExpanded: dataIds(root.querySelectorAll('.brp-health-wound.is-expanded[data-wound-id]'), 'woundId')
  };
}

function restoreHealthUiState(element, state = {}) {
  if (!element) return;

  const locationsExpanded = new Set(state.locationsExpanded ?? []);
  const woundsExpanded = new Set(state.woundsExpanded ?? []);

  if (typeof state.locationsCollapsed === 'boolean') {
    const section = element.querySelector('.brp-health-location-section');
    const toggle = section?.querySelector('[data-action="healthLocationToggle"]');
    section?.classList.toggle('is-collapsed', state.locationsCollapsed);
    toggle?.setAttribute('aria-expanded', String(!state.locationsCollapsed));
    if (toggle) {
      toggle.dataset.tooltip = game.i18n.localize(state.locationsCollapsed ? 'BRP.expand' : 'BRP.collapse');
    }
  }

  element.querySelectorAll('.brp-health-location[data-item-id]').forEach(row => {
    row.classList.toggle('is-expanded', locationsExpanded.has(row.dataset.itemId));
  });

  element.querySelectorAll('.brp-health-wound[data-wound-id]').forEach(row => {
    row.classList.toggle('is-expanded', woundsExpanded.has(row.dataset.woundId));
  });
}

function captureInventoryUiState(element) {
  const root = element?.querySelector('.brp-items-refresh');
  if (!root) return {};

  return {
    filterOpen: root.classList.contains('is-filter-open'),
    sectionsCollapsed: Object.fromEntries(Array.from(root.querySelectorAll('.brp-items-refresh-section[data-inventory-section]'))
      .map(section => [section.dataset.inventorySection, section.classList.contains('is-collapsed')])),
    detailsOpen: dataIds(root.querySelectorAll('.brp-items-refresh-row.is-details-open[data-item-id]'), 'itemId'),
    sortMenusOpen: dataIds(root.querySelectorAll('.brp-items-refresh-section[data-inventory-section] .brp-items-refresh-sort-menu:not([hidden])'), 'inventorySection', menu => menu.closest('.brp-items-refresh-section'))
  };
}

function restoreInventoryUiState(element, state = {}) {
  if (!element) return;

  const root = element.querySelector('.brp-items-refresh');
  if (!root) return;

  const filterOpen = Boolean(state.filterOpen);
  root.classList.toggle('is-filter-open', filterOpen);
  const filterPanel = root.querySelector('.brp-items-refresh-filter-panel');
  if (filterPanel) filterPanel.hidden = !filterOpen;
  root.querySelector('[data-action="inventoryFilterToggle"]')?.classList.toggle('is-active', filterOpen);

  const collapsedSections = state.sectionsCollapsed ?? {};
  const detailsOpen = new Set(state.detailsOpen ?? []);

  root.querySelectorAll('.brp-items-refresh-section[data-inventory-section]').forEach(section => {
    const isCollapsed = Boolean(collapsedSections[section.dataset.inventorySection]);
    section.classList.toggle('is-collapsed', isCollapsed);
    section.querySelectorAll('.brp-items-refresh-section-toggle').forEach(toggle => {
      toggle.dataset.tooltip = game.i18n.localize(isCollapsed ? 'BRP.expand' : 'BRP.collapse');
    });
  });

  root.querySelectorAll('.brp-items-refresh-row[data-item-id]').forEach(row => {
    const isOpen = detailsOpen.has(row.dataset.itemId);
    row.classList.toggle('is-details-open', isOpen);
    row.querySelectorAll(':scope > .brp-items-refresh-details, :scope > .brp-items-refresh-container-body').forEach(section => {
      section.hidden = !isOpen;
    });
    row.querySelectorAll('.brp-items-refresh-chevron').forEach(toggle => {
      toggle.classList.toggle('is-active', isOpen);
    });
  });

  root.querySelectorAll('.brp-items-refresh-sort-menu').forEach(menu => {
    menu.hidden = true;
  });
  root.querySelectorAll('.brp-items-refresh-sort.is-active').forEach(button => {
    button.classList.remove('is-active');
  });
  for (const sectionId of state.sortMenusOpen ?? []) {
    const section = root.querySelector(`.brp-items-refresh-section[data-inventory-section="${sectionId}"]`);
    const menu = section?.querySelector('.brp-items-refresh-sort-menu');
    const button = section?.querySelector('.brp-items-refresh-sort');
    if (!menu) continue;
    menu.hidden = false;
    button?.classList.add('is-active');
  }
}

function captureSkillUiState(element) {
  const root = element?.querySelector('.brp-skill-groups');
  if (!root) return {};

  return {
    collapsedCategories: Object.fromEntries(Array.from(root.querySelectorAll('.brp-skill-group[data-category-id]'))
      .map(group => [group.dataset.categoryId, group.classList.contains('is-collapsed')]))
  };
}

function restoreSkillUiState(element, state = {}) {
  if (!element) return;

  const collapsedCategories = state.collapsedCategories ?? {};
  element.querySelectorAll('.brp-skill-group[data-category-id]').forEach(group => {
    group.classList.toggle('is-collapsed', Boolean(collapsedCategories[group.dataset.categoryId]));
  });
}

function captureSocialUiState(element) {
  const root = element?.querySelector('.brp-social-refresh');
  if (!root) return {};

  return {
    settingsOpen: root.classList.contains('is-settings-open'),
    openRows: dataIds(root.querySelectorAll('[data-social-row-key].is-actions-open'), 'socialRowKey')
  };
}

function restoreSocialUiState(element, state = {}) {
  if (!element) return;

  const root = element.querySelector('.brp-social-refresh');
  if (!root) return;

  const settingsOpen = Boolean(state.settingsOpen);
  root.classList.toggle('is-settings-open', settingsOpen);
  const settingsButton = root.querySelector('.brp-social-refresh-settings-button');
  if (settingsButton) settingsButton.setAttribute('aria-expanded', String(settingsOpen));
  const settingsMenu = root.querySelector('.brp-social-refresh-settings-menu');
  if (settingsMenu) settingsMenu.hidden = !settingsOpen;

  const openRows = new Set(state.openRows ?? []);
  root.querySelectorAll('[data-social-row-key]').forEach(row => {
    const isOpen = openRows.has(row.dataset.socialRowKey);
    row.classList.toggle('is-actions-open', isOpen);
    row.querySelectorAll('.brp-social-refresh-action-tray').forEach(tray => {
      tray.hidden = !isOpen;
    });
    row.querySelectorAll('.brp-social-refresh-row-toggle').forEach(toggle => {
      toggle.classList.toggle('is-active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

function captureStoryUiState(element) {
  const root = element?.querySelector('.brp-story-refresh');
  if (!root) return {};

  const timeline = root.querySelector('[data-story-timeline]');
  return {
    timelineOpen: timeline ? !timeline.hidden : false
  };
}

function restoreStoryUiState(element, state = {}) {
  if (!element) return;

  const root = element.querySelector('.brp-story-refresh');
  if (!root) return;

  const timeline = root.querySelector('[data-story-timeline]');
  if (timeline && typeof state.timelineOpen === 'boolean') {
    timeline.hidden = !state.timelineOpen;
  }
}
