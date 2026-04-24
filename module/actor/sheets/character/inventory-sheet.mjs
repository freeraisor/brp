import BRPDialog from '../../../setup/brp-dialog.mjs';
import { BRPContextMenu } from '../../../setup/context-menu.mjs';
import { CURRENCY_ICON_IDS, CURRENCY_ICON_LABEL_KEYS } from './character-sheet-config.mjs';
import { INVENTORY_FILTER_TYPES, INVENTORY_SORT_MODES } from './prepare/inventory.mjs';
import { buildInventoryDomain, INVENTORY_MAX_NESTING_DEPTH } from './prepare/inventory-helpers.mjs';
import {
  captureRefreshWorkspaceScroll,
  escapeHTML,
  getTargetElement,
  numberOrZero,
  persistUiMapFlag,
  readStoredBoolean,
  restoreRefreshWorkspaceScrollSoon
} from './character-sheet-utils.mjs';

export const INVENTORY_SHEET_ACTIONS = {
  inventoryDetailsToggle: onInventoryDetailsToggle,
  inventorySectionToggle: onInventorySectionToggle,
  inventoryFavoriteToggle: onInventoryFavoriteToggle,
  inventoryStatusToggle: onInventoryStatusToggle,
  inventoryArmourWornToggle: onInventoryArmourWornToggle,
  inventoryUseConsumable: onInventoryUseConsumable,
  inventorySplitStack: onInventorySplitStack,
  inventoryCurrencyAdd: onInventoryCurrencyAdd,
  inventoryCurrencyEdit: onInventoryCurrencyEdit,
  inventoryDuplicate: onInventoryDuplicate,
  inventoryDelete: onInventoryDelete,
  inventoryFilterToggle: onInventoryFilterToggle,
  inventorySortToggle: onInventorySortToggle,
  inventorySortSelect: onInventorySortSelect
};

export const inventorySheetMethods = {
  _bindInventoryControls() {
    const root = this.element.querySelector('.brp-items-refresh');
    if (!root) return;

    const searchInput = root.querySelector('.brp-items-refresh-search-input');
    if (searchInput) {
      searchInput.value = this._inventorySearchQuery ?? '';
      searchInput.addEventListener('input', event => {
        this._inventorySearchQuery = event.currentTarget.value;
        this._applyInventorySearch();
      });
    }

    root.querySelectorAll('.brp-items-refresh-filter-input').forEach(input => {
      input.addEventListener('change', event => this._onInventoryFilterChange(event));
    });

    root.addEventListener('click', event => {
      if (!event.target.closest('.brp-items-refresh-sort, .brp-items-refresh-sort-menu')) {
        closeInventorySortMenus(this.element);
      }
    });

    this._applyInventorySearch();
  },

  _applyInventorySearch() {
    const root = this.element.querySelector('.brp-items-refresh');
    if (!root) return;

    const query = (this._inventorySearchQuery ?? '').trim().toLowerCase();
    const isSearching = query.length > 0;
    root.classList.toggle('is-searching', isSearching);

    for (const section of root.querySelectorAll('.brp-items-refresh-section')) {
      let sectionHasMatch = !isSearching;
      const rows = Array.from(section.querySelectorAll(':scope > .brp-items-refresh-list > .brp-items-refresh-row'));

      for (const row of rows) {
        const rowMatches = applyInventorySearchToRow(row, query);
        sectionHasMatch = sectionHasMatch || rowMatches;
      }

      section.classList.toggle('has-search-match', isSearching && sectionHasMatch);
      section.classList.toggle('is-search-hidden', !sectionHasMatch);
    }
  },

  async _onInventoryFilterChange(event) {
    const input = event.currentTarget;
    const settings = getInventorySheetSettings(this.actor);
    const filters = settings.filters;

    if (input.dataset.inventoryFilterType) {
      const type = input.dataset.inventoryFilterType;
      const types = new Set(filters.types);
      if (input.checked) types.add(type);
      else types.delete(type);
      filters.types = INVENTORY_FILTER_TYPES.filter(filterType => types.has(filterType));
    } else if (input.dataset.inventoryFilter) {
      filters[input.dataset.inventoryFilter] = input.checked;
    }

    const scrollTop = captureRefreshWorkspaceScroll(this, input);
    try {
      await this.actor.update({ 'flags.brp.sheet.inventory': settings });
    } finally {
      restoreRefreshWorkspaceScrollSoon(this, scrollTop);
    }
  },

  _bindInventoryContextMenu() {
    if (!this.element.querySelector('.brp-items-refresh-row')) return;

    new BRPContextMenu(this.element, '.brp-items-refresh-row', [], {
      jQuery: false,
      onOpen: target => {
        ui.context.menuItems = this._getInventoryContextOptions(target);
      }
    });
  },

  _bindInventoryCurrencyContextMenu() {
    if (!this.element.querySelector('.brp-items-refresh-currency')) return;

    new BRPContextMenu(this.element, '.brp-items-refresh-currency', [], {
      jQuery: false,
      onOpen: target => {
        ui.context.menuItems = this._getInventoryCurrencyContextOptions(target);
      }
    });
  },

  _getInventoryContextOptions(target) {
    const item = getInventoryItemFromTarget(this.actor, target);
    if (!item) return [];

    const isFavorite = Boolean(item.flags?.brp?.sheet?.favorite);
    const carryLabel = ['carried', 'worn'].includes(item.system?.equipStatus) ? 'BRP.packed' : 'BRP.carried';
    const options = [
      {
        name: 'BRP.view',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: () => item.sheet.render(true)
      },
      {
        name: isFavorite ? 'BRP.skillContextUnfavorite' : 'BRP.skillContextFavorite',
        icon: '<i class="fas fa-star fa-fw"></i>',
        callback: listItem => updateInventoryFavorite(this, listItem ?? target, item, !isFavorite)
      },
      {
        name: carryLabel,
        icon: '<i class="fas fa-hand-holding fa-fw"></i>',
        callback: listItem => updateInventoryEquipStatus(this, listItem ?? target, item, nextInventoryCarryStatus(item))
      }
    ];

    if (item.type === 'armour') {
      options.push({
        name: 'BRP.worn',
        icon: '<i class="fas fa-shirt fa-fw"></i>',
        callback: listItem => updateInventoryEquipStatus(this, listItem ?? target, item, item.system?.equipStatus === 'worn' ? 'carried' : 'worn')
      });
    }

    if (isInventoryConsumable(item)) {
      options.push({
        name: 'BRP.inventoryUse',
        icon: '<i class="fas fa-flask fa-fw"></i>',
        callback: listItem => useInventoryConsumableFromTarget(this, listItem ?? target)
      });
    }

    if (canSplitInventoryStack(item)) {
      options.push({
        name: 'BRP.inventorySplitStack',
        icon: '<i class="fas fa-code-branch fa-fw"></i>',
        callback: listItem => splitInventoryStackFromTarget(this, listItem ?? target)
      });
    }

    options.push(
      {
        name: 'BRP.duplicate',
        icon: '<i class="fas fa-copy fa-fw"></i>',
        callback: listItem => duplicateInventoryItemFromTarget(this, listItem ?? target)
      },
      {
        name: 'BRP.deleteItem',
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: listItem => deleteInventoryItemFromTarget(this, listItem ?? target)
      }
    );

    return options;
  },

  _getInventoryCurrencyContextOptions(target) {
    const currency = getInventoryCurrencyFromTarget(this.actor, target);
    if (!currency) return [];

    return [
      {
        name: 'BRP.inventoryCurrencyEdit',
        icon: '<i class="fas fa-pen fa-fw"></i>',
        callback: listItem => openInventoryCurrencyDialog(this, listItem ?? target, currency.id)
      },
      {
        name: 'BRP.inventoryCurrencyDelete',
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: listItem => deleteInventoryCurrencyFromTarget(this, listItem ?? target)
      }
    ];
  },

  _bindInventoryDragDrop() {
    const root = this.element.querySelector('.brp-items-refresh');
    if (!root) return;

    root.querySelectorAll('[data-inventory-row-drag]').forEach(handle => {
      handle.addEventListener('dragstart', this._onInventoryRowDragStart.bind(this));
      handle.addEventListener('dragend', this._onInventoryDragEnd.bind(this));
    });

    root.querySelectorAll('.brp-items-refresh-row').forEach(row => {
      row.addEventListener('dragover', this._onInventoryRowDragOver.bind(this));
      row.addEventListener('dragleave', this._onInventoryDragLeave.bind(this));
      row.addEventListener('drop', this._onInventoryRowDrop.bind(this));
    });

    root.querySelectorAll('[data-inventory-container-drop]').forEach(zone => {
      zone.addEventListener('dragover', this._onInventoryDropZoneDragOver.bind(this));
      zone.addEventListener('dragleave', this._onInventoryDropZoneDragLeave.bind(this));
      zone.addEventListener('drop', this._onInventoryContainerDrop.bind(this));
    });

    root.querySelectorAll('[data-inventory-top-drop]').forEach(zone => {
      zone.addEventListener('dragover', this._onInventoryDropZoneDragOver.bind(this));
      zone.addEventListener('dragleave', this._onInventoryDropZoneDragLeave.bind(this));
      zone.addEventListener('drop', this._onInventoryTopLevelDrop.bind(this));
    });
  },

  _onInventoryRowDragStart(event) {
    const row = event.currentTarget.closest('.brp-items-refresh-row');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;

    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-brp-inventory-item', itemId);
    this._inventoryDragItemId = itemId;
    row.classList.add('is-dragging');
  },

  _onInventoryDragEnd() {
    this._inventoryDragItemId = null;
    this.element.querySelectorAll('.brp-items-refresh-row.is-dragging, .brp-items-refresh-row.is-drop-target, .brp-items-refresh-row.is-container-drop-target, .brp-items-refresh-drop-zone.is-drop-target').forEach(element => {
      element.classList.remove('is-dragging', 'is-drop-target', 'is-container-drop-target');
    });
  },

  _onInventoryRowDragOver(event) {
    if (!isInventoryItemDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    const isContainerDrop = canDropInventoryItemOnContainerRow(this.actor, event.currentTarget, this._inventoryDragItemId);
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.toggle('is-container-drop-target', isContainerDrop);
    event.currentTarget.classList.add('is-drop-target');
  },

  _onInventoryDragLeave(event) {
    event.currentTarget.classList.remove('is-drop-target', 'is-container-drop-target');
  },

  async _onInventoryRowDrop(event) {
    if (!isInventoryItemDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('is-drop-target', 'is-container-drop-target');

    const sourceItemId = event.dataTransfer.getData('application/x-brp-inventory-item');
    const targetItemId = event.currentTarget.dataset.itemId;
    if (!sourceItemId || !targetItemId || sourceItemId === targetItemId) return;

    const targetContainerId = getInventoryContainerRowDropId(event.currentTarget);
    if (targetContainerId) {
      await this._moveInventoryItemToContainer(sourceItemId, targetContainerId, event.currentTarget);
      return;
    }

    const sourceItem = this.actor.items.get(sourceItemId);
    const targetItem = this.actor.items.get(targetItemId);
    if (!sourceItem || !targetItem) return warnInventoryDrop('inventoryDropInvalid');

    const sourceSection = getInventorySectionIdForItem(sourceItem);
    const targetSection = getInventorySectionIdForItem(targetItem);
    if (!sourceSection || sourceSection !== targetSection) return warnInventoryDrop('inventoryDropWrongSection');

    if (getInventoryItemContainerId(sourceItem) !== getInventoryItemContainerId(targetItem)) {
      return warnInventoryDrop('inventoryDropWrongParent');
    }

    const list = event.currentTarget.closest('.brp-items-refresh-list, .brp-items-refresh-nested-list');
    const inventoryOrder = getInventoryListOrder(list);
    const sourceIndex = inventoryOrder.indexOf(sourceItemId);
    const targetIndex = inventoryOrder.indexOf(targetItemId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    inventoryOrder.splice(sourceIndex, 1);
    inventoryOrder.splice(targetIndex, 0, sourceItemId);

    const settings = getInventorySheetSettings(this.actor);
    settings.sectionSortModes[sourceSection] = 'custom';
    settings.customOrder[sourceSection] = mergeInventoryCustomOrder(settings.customOrder[sourceSection], inventoryOrder);

    const scrollTop = captureRefreshWorkspaceScroll(this, event.currentTarget);
    try {
      await this.actor.update({ 'flags.brp.sheet.inventory': settings });
    } finally {
      restoreRefreshWorkspaceScrollSoon(this, scrollTop);
    }
  },

  _onInventoryDropZoneDragOver(event) {
    if (!isInventoryItemDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('is-drop-target');
  },

  _onInventoryDropZoneDragLeave(event) {
    event.currentTarget.classList.remove('is-drop-target');
  },

  async _onInventoryContainerDrop(event) {
    if (!isInventoryItemDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('is-drop-target');

    const sourceItemId = event.dataTransfer.getData('application/x-brp-inventory-item');
    const targetContainerId = event.currentTarget.dataset.inventoryContainerDrop;
    await this._moveInventoryItemToContainer(sourceItemId, targetContainerId, event.currentTarget);
  },

  async _onInventoryTopLevelDrop(event) {
    if (!isInventoryItemDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('is-drop-target');

    const sourceItemId = event.dataTransfer.getData('application/x-brp-inventory-item');
    const targetSection = event.currentTarget.dataset.inventoryTopDrop;
    await this._moveInventoryItemToContainer(sourceItemId, '', event.currentTarget, { targetSection });
  },

  async _moveInventoryItemToContainer(sourceItemId, targetContainerId, target, { targetSection = null } = {}) {
    const sourceItem = this.actor.items.get(sourceItemId);
    if (!sourceItem) return warnInventoryDrop('inventoryDropInvalid');

    if (!targetContainerId) {
      const sourceSection = getInventorySectionIdForItem(sourceItem);
      if (targetSection && sourceSection !== targetSection) return warnInventoryDrop('inventoryDropWrongSection');
      if (!getInventoryItemContainerId(sourceItem)) return;

      const scrollTop = captureRefreshWorkspaceScroll(this, target);
      try {
        await sourceItem.update({ 'system.containerId': '' });
      } finally {
        restoreRefreshWorkspaceScrollSoon(this, scrollTop);
      }
      return;
    }

    const validationError = validateInventoryContainerDrop(this.actor, sourceItem, targetContainerId);
    if (validationError) return warnInventoryDrop(validationError);
    if (getInventoryItemContainerId(sourceItem) === targetContainerId) return;

    const scrollTop = captureRefreshWorkspaceScroll(this, target);
    try {
      await sourceItem.update({ 'system.containerId': targetContainerId });
    } finally {
      restoreRefreshWorkspaceScrollSoon(this, scrollTop);
    }
  }
};

async function onInventoryDetailsToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const row = getInventoryRowFromTarget(target);
  const details = row?.querySelector('.brp-items-refresh-details');
  if (!row || !details) return;

  const itemId = row.dataset.itemId;
  if (!itemId) return;

  const isOpen = !row.classList.contains('is-details-open');
  row.classList.toggle('is-details-open', isOpen);
  target.classList.toggle('is-active', isOpen);
  details.hidden = !isOpen;
  row.querySelectorAll(':scope > .brp-items-refresh-container-body').forEach(body => {
    body.hidden = !isOpen;
  });

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await persistUiMapFlag(this.actor, 'flags.brp.sheet.inventory.expandedItems', itemId, isOpen);
  } catch (error) {
    row.classList.toggle('is-details-open', !isOpen);
    target.classList.toggle('is-active', !isOpen);
    details.hidden = isOpen;
    row.querySelectorAll(':scope > .brp-items-refresh-container-body').forEach(body => {
      body.hidden = isOpen;
    });
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onInventorySectionToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const section = getTargetElement(target)?.closest?.('.brp-items-refresh-section');
  const sectionId = target.dataset.sectionId || section?.dataset.inventorySection;
  if (!section || !sectionId) return;

  const isCollapsed = section.classList.contains('is-collapsed');
  const nextCollapsed = !isCollapsed;
  section.classList.toggle('is-collapsed', nextCollapsed);
  target.dataset.tooltip = game.i18n.localize(nextCollapsed ? 'BRP.expand' : 'BRP.collapse');

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await persistUiMapFlag(this.actor, 'flags.brp.sheet.inventory.sectionCollapsed', sectionId, nextCollapsed);
  } catch (error) {
    section.classList.toggle('is-collapsed', isCollapsed);
    target.dataset.tooltip = game.i18n.localize(isCollapsed ? 'BRP.expand' : 'BRP.collapse');
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onInventoryFavoriteToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const item = getInventoryItemFromTarget(this.actor, target);
  if (!item) return;

  await updateInventoryFavorite(this, target, item, !Boolean(item.flags?.brp?.sheet?.favorite));
}

async function onInventoryStatusToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const item = getInventoryItemFromTarget(this.actor, target);
  if (!item) return;

  await updateInventoryEquipStatus(this, target, item, nextInventoryCarryStatus(item));
}

async function onInventoryArmourWornToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const item = getInventoryItemFromTarget(this.actor, target);
  if (!item || item.type !== 'armour') return;

  const nextStatus = item.system?.equipStatus === 'worn' ? 'carried' : 'worn';
  await updateInventoryEquipStatus(this, target, item, nextStatus);
}

async function onInventoryUseConsumable(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await useInventoryConsumableFromTarget(this, target);
}

async function onInventorySplitStack(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await splitInventoryStackFromTarget(this, target);
}

async function onInventoryCurrencyAdd(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await openInventoryCurrencyDialog(this, target);
}

async function onInventoryCurrencyEdit(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await openInventoryCurrencyDialog(this, target, target.dataset.currencyId);
}

async function onInventoryDuplicate(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await duplicateInventoryItemFromTarget(this, target);
}

async function onInventoryDelete(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await deleteInventoryItemFromTarget(this, target);
}

function onInventoryFilterToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const root = getTargetElement(target)?.closest?.('.brp-items-refresh');
  const panel = root?.querySelector('.brp-items-refresh-filter-panel');
  if (!panel) return;

  const isOpen = !panel.hidden;
  panel.hidden = isOpen;
  root.classList.toggle('is-filter-open', !isOpen);
  target.classList.toggle('is-active', !isOpen);
}

function onInventorySortToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const section = getTargetElement(target)?.closest?.('.brp-items-refresh-section');
  const menu = section?.querySelector('.brp-items-refresh-sort-menu');
  if (!menu) return;

  const isOpen = !menu.hidden;
  closeInventorySortMenus(this.element);
  menu.hidden = isOpen;
  target.classList.toggle('is-active', !isOpen);
}

async function onInventorySortSelect(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const sectionId = target.dataset.sectionId;
  const mode = target.dataset.sortMode;
  if (!['weapons', 'armour', 'other'].includes(sectionId)) return;
  if (!INVENTORY_SORT_MODES.includes(mode)) return;
  if (mode === 'type-asc' && sectionId !== 'other') return;

  const settings = getInventorySheetSettings(this.actor);
  if (settings.sectionSortModes?.[sectionId] === mode) {
    closeInventorySortMenus(this.element);
    return;
  }

  settings.sectionSortModes[sectionId] = mode;
  closeInventorySortMenus(this.element);

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await this.actor.update({ 'flags.brp.sheet.inventory': settings });
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

function getInventoryRowFromTarget(target) {
  return getTargetElement(target)?.closest?.('.brp-items-refresh-row');
}

function getInventoryItemFromTarget(actor, target) {
  const row = getInventoryRowFromTarget(target);
  const item = actor.items.get(row?.dataset.itemId);
  return ['weapon', 'armour', 'gear'].includes(item?.type) ? item : null;
}

function getInventorySheetSettings(actor) {
  const sheetFlags = foundry.utils.deepClone(actor.getFlag('brp', 'sheet') ?? {});
  const settings = sheetFlags.inventory ?? {};
  settings.sectionCollapsed ??= {};
  settings.sectionSortModes ??= {};
  settings.sectionSortModes.weapons = normalizeInventorySortMode(settings.sectionSortModes.weapons, 'weapons');
  settings.sectionSortModes.armour = normalizeInventorySortMode(settings.sectionSortModes.armour, 'armour');
  settings.sectionSortModes.other = normalizeInventorySortMode(settings.sectionSortModes.other, 'other');
  settings.customOrder = normalizeInventoryCustomOrder(settings.customOrder);
  settings.filters = normalizeInventoryFilters(settings.filters);
  settings.expandedItems ??= {};
  settings.expandedContainers ??= {};
  return settings;
}

function normalizeInventorySortMode(mode, sectionId) {
  if (!INVENTORY_SORT_MODES.includes(mode)) return 'custom';
  if (mode === 'type-asc' && sectionId !== 'other') return 'custom';
  return mode;
}

function normalizeInventoryFilters(filters = {}) {
  const hasTypeFilter = Array.isArray(filters.types);
  const types = hasTypeFilter
    ? Array.from(new Set(filters.types.map(normalizeInventoryFilterType).filter(type => INVENTORY_FILTER_TYPES.includes(type))))
    : [...INVENTORY_FILTER_TYPES];

  return {
    types,
    equipped: Boolean(filters.equipped),
    carried: Boolean(filters.carried),
    favorite: Boolean(filters.favorite),
    hideEmpty: filters.hideEmpty !== false
  };
}

function normalizeInventoryFilterType(type) {
  return type === 'armor' ? 'armour' : type;
}

function normalizeInventoryCustomOrder(customOrder = {}) {
  return {
    weapons: normalizeInventoryOrderIds(customOrder.weapons),
    armour: normalizeInventoryOrderIds(customOrder.armour),
    other: normalizeInventoryOrderIds(customOrder.other)
  };
}

function normalizeInventoryOrderIds(ids) {
  return Array.isArray(ids)
    ? Array.from(new Set(ids.filter(id => typeof id === 'string' && id.length > 0)))
    : [];
}

function applyInventorySearchToRow(row, query) {
  const isSearching = query.length > 0;
  const ownMatch = !isSearching || (row.dataset.searchText || row.textContent || '').toLowerCase().includes(query);
  let childMatch = false;

  const childRows = Array.from(row.querySelectorAll(':scope .brp-items-refresh-nested-list > .brp-items-refresh-row'));
  for (const child of childRows) {
    const childOwnMatch = !isSearching || (child.dataset.searchText || child.textContent || '').toLowerCase().includes(query);
    child.classList.toggle('is-search-hidden', isSearching && !childOwnMatch);
    child.classList.toggle('has-search-match', isSearching && childOwnMatch);
    child.classList.remove('has-search-descendant');
    childMatch = childMatch || childOwnMatch;
  }

  const rowMatches = ownMatch || childMatch;
  row.classList.toggle('is-search-hidden', isSearching && !rowMatches);
  row.classList.toggle('has-search-match', isSearching && ownMatch);
  row.classList.toggle('has-search-descendant', isSearching && childMatch);
  return rowMatches;
}

async function updateInventoryFavorite(sheet, target, item, isFavorite) {
  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  updateInventoryFavoriteMarkup(target, isFavorite);

  try {
    await item.update({ 'flags.brp.sheet.favorite': isFavorite }, { render: false, renderSheet: false });
  } catch (error) {
    updateInventoryFavoriteMarkup(target, !isFavorite);
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

function updateInventoryFavoriteMarkup(target, isFavorite) {
  const row = getInventoryRowFromTarget(target);
  const favorite = row?.querySelector('.brp-items-refresh-favorite');
  const icon = favorite?.querySelector('i');

  row?.classList.toggle('is-favorite', isFavorite);
  favorite?.classList.toggle('is-active', isFavorite);
  icon?.classList.toggle('fas', isFavorite);
  icon?.classList.toggle('far', !isFavorite);
  if (favorite) {
    favorite.dataset.tooltip = game.i18n.localize(isFavorite ? 'BRP.skillContextUnfavorite' : 'BRP.skillContextFavorite');
  }
}

async function updateInventoryEquipStatus(sheet, target, item, equipStatus) {
  if (!equipStatus || item.system?.equipStatus === equipStatus) return;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  await item.update({ 'system.equipStatus': equipStatus });
  sheet.actor.render(false);
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
}

function nextInventoryCarryStatus(item) {
  const current = item.system?.equipStatus;

  if (item.type === 'armour') {
    if (current === 'worn') return 'carried';
    if (current === 'carried') return 'packed';
    return 'carried';
  }

  return current === 'carried' ? 'packed' : 'carried';
}

async function duplicateInventoryItemFromTarget(sheet, target) {
  const item = getInventoryItemFromTarget(sheet.actor, target);
  if (!item) return;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  const data = item.toObject();
  delete data._id;
  data.name = game.i18n.format('BRP.copyOf', { name: item.name });

  await sheet.actor.createEmbeddedDocuments('Item', [data], { renderSheet: false });
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
}

async function deleteInventoryItemFromTarget(sheet, target) {
  const item = getInventoryItemFromTarget(sheet.actor, target);
  if (!item) return;

  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize('BRP.deleteItem') },
    content: `${game.i18n.localize('BRP.deleteConfirm')}<br><strong> ${escapeHTML(item.name)}</strong>`
  });
  if (!confirmation) return;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  await item.delete();
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
}

async function openInventoryCurrencyDialog(sheet, target, currencyId = '') {
  const currencies = getInventoryCurrencies(sheet.actor);
  const currency = currencies.find(entry => entry.id === currencyId) ?? null;
  const selectedIcon = normalizeInventoryCurrencyIcon(currency?.icon);
  const iconOptions = CURRENCY_ICON_IDS.map(icon => {
    const selected = icon === selectedIcon ? ' selected' : '';
    return `<option value="${icon}"${selected}>${escapeHTML(game.i18n.localize(CURRENCY_ICON_LABEL_KEYS[icon]))}</option>`;
  }).join('');
  const html = `
    <div class="brp brp-dialog-form brp-inventory-currency-dialog">
      <label>
        <span>${game.i18n.localize('BRP.inventoryCurrencyName')}</span>
        <input type="text" name="name" value="${escapeHTML(currency?.name ?? '')}" autocomplete="off" />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.inventoryCurrencyAmount')}</span>
        <input type="number" name="amount" min="0" step="1" value="${numberOrZero(currency?.amount)}" />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.inventoryCurrencyIcon')}</span>
        <select name="icon">${iconOptions}</select>
      </label>
    </div>
  `;
  const usage = await BRPDialog.input({
    window: { title: game.i18n.localize(currency ? 'BRP.inventoryCurrencyEdit' : 'BRP.inventoryCurrencyAdd') },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.confirm')
    }
  });
  if (!usage) return;

  const name = String(usage.name ?? '').trim();
  if (!name) {
    ui.notifications.warn(game.i18n.localize('BRP.inventoryCurrencyInvalidName'));
    return;
  }

  const amount = Number(usage.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    ui.notifications.warn(game.i18n.localize('BRP.inventoryCurrencyInvalidAmount'));
    return;
  }

  const icon = normalizeInventoryCurrencyIcon(usage.icon);
  const nextCurrencies = currency
    ? currencies.map(entry => entry.id === currency.id ? { ...entry, name, amount, icon } : entry)
    : [
      ...currencies,
      {
        id: createInventoryCurrencyId(currencies),
        name,
        icon,
        amount,
        sortOrder: getNextInventoryCurrencySortOrder(currencies)
      }
    ];

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  await sheet.actor.update({ 'system.currencies': nextCurrencies });
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
}

async function deleteInventoryCurrencyFromTarget(sheet, target) {
  const currency = getInventoryCurrencyFromTarget(sheet.actor, target);
  if (!currency) return;

  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize('BRP.inventoryCurrencyDelete') },
    content: game.i18n.format('BRP.inventoryCurrencyDeleteConfirm', { name: escapeHTML(currency.name) })
  });
  if (!confirmation) return;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  const nextCurrencies = getInventoryCurrencies(sheet.actor).filter(entry => entry.id !== currency.id);
  await sheet.actor.update({ 'system.currencies': nextCurrencies });
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
}

function getInventoryCurrencyFromTarget(actor, target) {
  const element = getTargetElement(target);
  const currencyId = element?.closest?.('.brp-items-refresh-currency')?.dataset.currencyId;
  if (!currencyId) return null;

  return getInventoryCurrencies(actor).find(currency => currency.id === currencyId) ?? null;
}

function getInventoryCurrencies(actor) {
  const currencies = Array.isArray(actor.system?.currencies) ? actor.system.currencies : [];
  return currencies
    .map((currency, index) => {
      const source = currency && typeof currency === 'object' ? currency : {};
      return {
        ...source,
        id: String(source.id || `currency-${index}`),
        name: String(source.name ?? ''),
        icon: normalizeInventoryCurrencyIcon(source.icon),
        amount: numberOrZero(source.amount),
        sortOrder: Number.isFinite(Number(source.sortOrder)) ? Number(source.sortOrder) : index
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

function normalizeInventoryCurrencyIcon(icon) {
  return CURRENCY_ICON_IDS.includes(icon) ? icon : 'coin';
}

function createInventoryCurrencyId(currencies) {
  const existingIds = new Set(currencies.map(currency => currency.id));
  let id = '';
  do {
    const randomId = foundry.utils.randomID?.(8) ?? Math.random().toString(36).slice(2, 10);
    id = `currency-${randomId}`;
  } while (existingIds.has(id));
  return id;
}

function getNextInventoryCurrencySortOrder(currencies) {
  if (!currencies.length) return 0;
  return Math.max(...currencies.map(currency => numberOrZero(currency.sortOrder))) + 10;
}

async function useInventoryConsumableFromTarget(sheet, target) {
  const item = getInventoryItemFromTarget(sheet.actor, target);
  if (!isInventoryConsumable(item)) return;

  const quantity = numberOrZero(item.system?.quantity);
  if (item.system?.stackable && quantity <= 0) {
    ui.notifications.warn(game.i18n.format('BRP.inventoryConsumableEmpty', { item: item.name }));
    return;
  }

  const updates = {};
  if (item.system?.stackable) updates['system.quantity'] = Math.max(0, quantity - 1);

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  if (Object.keys(updates).length) await item.update(updates);
  await createInventoryUseMessage(sheet.actor, item);
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
}

async function splitInventoryStackFromTarget(sheet, target) {
  const item = getInventoryItemFromTarget(sheet.actor, target);
  if (!canSplitInventoryStack(item)) return;

  const quantity = numberOrZero(item.system?.quantity);
  const maxAmount = quantity - 1;
  const html = `
    <div class="brp brp-dialog-form brp-inventory-split-dialog">
      <label>
        <span>${game.i18n.localize('BRP.inventorySplitAmount')}</span>
        <input type="number" name="amount" min="1" max="${maxAmount}" value="1" />
      </label>
    </div>
  `;
  const usage = await BRPDialog.input({
    window: { title: game.i18n.localize('BRP.inventorySplitStack') },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.confirm')
    }
  });
  if (!usage) return;

  const amount = Math.floor(Number(usage.amount));
  if (!Number.isFinite(amount) || amount < 1 || amount > maxAmount) {
    ui.notifications.warn(game.i18n.format('BRP.inventorySplitInvalid', { max: maxAmount }));
    return;
  }

  const data = item.toObject();
  delete data._id;
  data.name = game.i18n.format('BRP.copyOf', { name: item.name });
  foundry.utils.setProperty(data, 'system.quantity', amount);
  foundry.utils.unsetProperty(data, 'flags.brp.sheet.favorite');

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  await item.update({ 'system.quantity': quantity - amount }, { render: false, renderSheet: false });
  await sheet.actor.createEmbeddedDocuments('Item', [data], { renderSheet: false });
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
}

async function createInventoryUseMessage(actor, item) {
  const effect = inventoryUseEffectLabel(item.system?.useEffect);
  const content = `<p>${escapeHTML(game.i18n.format('BRP.inventoryConsumableUsed', {
    item: item.name,
    effect
  }))}</p>`;
  await ChatMessage.create({
    user: game.user.id,
    content,
    speaker: ChatMessage.getSpeaker({ actor })
  });
}

function isInventoryConsumable(item) {
  return item?.type === 'gear' && item.system?.inventoryKind === 'consumable';
}

function canSplitInventoryStack(item) {
  return item?.type === 'gear' && Boolean(item.system?.stackable) && numberOrZero(item.system?.quantity) > 1;
}

function inventoryUseEffectLabel(useEffect) {
  const key = {
    consume: 'BRP.inventoryUseEffectConsume',
    message: 'BRP.inventoryUseEffectMessage'
  }[useEffect] ?? 'BRP.none';
  return game.i18n.localize(key);
}

function closeInventorySortMenus(element) {
  element?.querySelectorAll('.brp-items-refresh-sort-menu').forEach(menu => {
    menu.hidden = true;
  });
  element?.querySelectorAll('.brp-items-refresh-sort.is-active').forEach(button => {
    button.classList.remove('is-active');
  });
}

function isInventoryItemDrag(event) {
  return Array.from(event.dataTransfer?.types ?? []).includes('application/x-brp-inventory-item');
}

function getInventoryContainerRowDropId(row) {
  return typeof row?.dataset?.inventoryContainerRowDrop === 'string'
    ? row.dataset.inventoryContainerRowDrop.trim()
    : '';
}

function canDropInventoryItemOnContainerRow(actor, row, sourceItemId) {
  const targetContainerId = getInventoryContainerRowDropId(row);
  if (!targetContainerId || targetContainerId === sourceItemId) return false;

  return isInventoryContainerItem(actor.items.get(targetContainerId));
}

function getInventoryListOrder(list) {
  return Array.from(list?.querySelectorAll(':scope > .brp-items-refresh-row') ?? [])
    .map(row => row.dataset.itemId)
    .filter(Boolean);
}

function mergeInventoryCustomOrder(existingOrder = [], orderedIds = []) {
  const orderedSet = new Set(orderedIds);
  return [
    ...orderedIds,
    ...existingOrder.filter(id => !orderedSet.has(id))
  ];
}

function getInventorySectionIdForItem(item) {
  if (item?.type === 'weapon') return 'weapons';
  if (item?.type === 'armour') return 'armour';
  if (item?.type === 'gear') return 'other';
  return null;
}

function getInventoryItemContainerId(item) {
  return typeof item?.system?.containerId === 'string'
    ? item.system.containerId.trim()
    : '';
}

function isInventoryContainerItem(item) {
  return item?.type === 'gear' && (item.system?.inventoryKind || 'equipment') === 'container';
}

function validateInventoryContainerDrop(actor, sourceItem, targetContainerId) {
  const targetItem = actor.items.get(targetContainerId);
  if (!targetItem || !isInventoryContainerItem(targetItem)) return 'inventoryDropNotContainer';
  if (sourceItem.id === targetContainerId) return 'inventoryDropInvalid';

  const domain = buildInventoryDomain(actor.items);
  const sourceRow = domain.rowsById.get(sourceItem.id);
  const targetRow = domain.rowsById.get(targetContainerId);
  if (!sourceRow || !targetRow) return 'inventoryDropInvalid';
  if (isInventoryRowDescendant(sourceRow, targetContainerId)) return 'inventoryDropCycle';

  const proposedDepth = targetRow.depth + 1 + getInventorySubtreeDepth(sourceRow);
  if (proposedDepth > INVENTORY_MAX_NESTING_DEPTH) return 'inventoryDropDepth';

  const capacity = Number(targetItem.system?.capacityEnc);
  const alreadyContained = sourceRow.parentId === targetContainerId || isInventoryRowDescendant(targetRow, sourceRow.id);
  if (Number.isFinite(capacity) && capacity > 0 && !alreadyContained) {
    const proposedContentEnc = Number(targetRow.contentEnc ?? 0) + Number(sourceRow.effectiveEnc ?? 0);
    if (proposedContentEnc > capacity) return 'inventoryDropCapacity';
  }

  return null;
}

function isInventoryRowDescendant(row, descendantId) {
  if (!row || !descendantId) return false;
  return row.children.some(child => child.id === descendantId || isInventoryRowDescendant(child, descendantId));
}

function getInventorySubtreeDepth(row) {
  if (!row?.children?.length) return 0;
  return 1 + Math.max(...row.children.map(getInventorySubtreeDepth));
}

function warnInventoryDrop(key) {
  ui.notifications.warn(game.i18n.localize(`BRP.${key}`));
}
