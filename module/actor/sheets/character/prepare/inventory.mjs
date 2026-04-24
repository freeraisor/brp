import { createListCell, createListColumn } from '../view-model/list-column.mjs';
import { createListRow } from '../view-model/list-row.mjs';
import { createListSection } from '../view-model/sections.mjs';
import { createArmourIcon } from './armour-icons.mjs';
import { buildInventoryDomain } from './inventory-helpers.mjs';
import { buildCombatWeaponRow } from './combat.mjs';

export const INVENTORY_FILTER_TYPES = ['weapon', 'armour', 'container', 'consumable', 'tool', 'equipment', 'loot'];
export const INVENTORY_SORT_MODES = ['custom', 'name-asc', 'name-desc', 'type-asc', 'enc-desc', 'enc-asc'];
const DEFAULT_INVENTORY_FILTERS = {
  types: INVENTORY_FILTER_TYPES,
  equipped: false,
  carried: false,
  favorite: false,
  hideEmpty: true
};

export function createInventoryPreparation() {
  return {
    gears: [],
    armours: []
  };
}

export function prepareGearItem(item, state) {
  item.system.equippedName = game.i18n.localize('BRP.' + item.system.equipStatus);
  state.gears.push(item);
}

export function prepareArmourItem(context, actor, item, state) {
  item.system.hide = false;

  if (item.system.hitlocID) {
    let hitLocTemp = actor.items.get(item.system.hitlocID);
    if (hitLocTemp) {
      item.system.hitlocName = hitLocTemp.system.displayName;
      item.system.lowRoll = hitLocTemp.system.lowRoll;
      if (context.useHPL) {
        item.system.hide = hitLocTemp.system.hide;
      }
    }
  }

  item.system.equippedName = game.i18n.localize('BRP.' + item.system.equipStatus);
  item.system.list = 1;
  state.armours.push(item);
}

export function finalizeInventoryPreparation(context, state) {
  context.inventoryDomain = buildInventoryDomain(context.actor?.items);
  sortArmours(state.armours);
  context.armours = prepareHPLArmours(context, state.armours);
  context.gears = state.gears.sort(function (a, b) {return a.name.localeCompare(b.name)});
  context.inventoryView = buildInventoryView(context);
}

function sortArmours(armours) {
  armours.sort(function (a, b) {
    let x = a.system.lowRoll;
    let y = b.system.lowRoll;
    let p = a.system.list;
    let q = b.system.list;
    if (x < y) { return 1 };
    if (x > y) { return -1 };
    if (p < q) { return -1 };
    if (p > q) { return 1 };
    return 0;
  });
}

function prepareHPLArmours(context, armours) {
  if (!context.useHPL) return armours;

  let locID = "";
  let newArmours = [];
  for (let item of armours) {
    if (item.system.list === 0) {
      let armList = armours.filter(armour => armour.system.list === 1 && armour.system.hitlocID === item._id);
      item.system.length = armList.length;
    } else {
      if (item.system.hitlocID != locID) {
        item.system.show = true;
        locID = item.system.hitlocID;
      } else {
        item.system.show = false;
      }
    }
    newArmours.push(item);
  }

  return newArmours;
}

function buildInventoryView(context) {
  const armourRows = context.armours.map(armourRow);
  const armourSection = buildArmourSection(armourRows);
  const gearSection = buildGearSection(context);
  const settings = normalizeInventorySettings(context.actor?.getFlag('brp', 'sheet')?.inventory);
  const refreshSections = buildRefreshSections(context, settings);

  return {
    domain: context.inventoryDomain,
    sections: refreshSections,
    sectionList: [
      refreshSections.weapons,
      refreshSections.armour,
      refreshSections.other
    ],
    currencies: buildCurrencyRows(context),
    encumbrance: {
      current: context.system?.enc ?? 0,
      preview: context.inventoryDomain?.totalEnc ?? context.system?.enc ?? 0,
      usesPreview: false,
      source: 'actor'
    },
    settings,
    filters: buildInventoryFilterView(settings.filters),
    armour: armourSection,
    gear: gearSection,
    legacySections: [
      armourSection,
      gearSection
    ]
  };
}

function buildRefreshSections(context, settings) {
  const topLevelRows = context.inventoryDomain?.topLevelRows ?? [];
  const weapons = topLevelRows.filter(row => row.mockType === 'weapon').map(row => weaponInventoryRow(row, settings));
  const armours = topLevelRows.filter(row => row.mockType === 'armor').map(row => armourInventoryRow(row, settings));
  const other = topLevelRows
    .filter(row => row.type === 'gear')
    .map(row => gearInventoryRow(row, settings));
  const weaponRows = filterInventoryRows(weapons, settings.filters);
  const armourRows = filterInventoryRows(armours, settings.filters);
  const otherRows = filterInventoryRows(other, settings.filters);

  return {
    weapons: createListSection({
      id: 'weapons',
      label: 'BRP.weapons',
      createAction: { action: 'createDoc', documentClass: 'Item', type: 'weapon' },
      collapsed: Boolean(settings.sectionCollapsed.weapons),
      sort: buildInventorySortState('weapons', settings.sectionSortModes.weapons),
      rows: sortInventoryRows(weaponRows, settings.sectionSortModes.weapons, settings.customOrder.weapons)
    }),
    armour: createListSection({
      id: 'armour',
      label: 'BRP.armour',
      createAction: { action: 'createDoc', documentClass: 'Item', type: 'armour' },
      collapsed: Boolean(settings.sectionCollapsed.armour),
      sort: buildInventorySortState('armour', settings.sectionSortModes.armour),
      rows: sortInventoryRows(armourRows, settings.sectionSortModes.armour, settings.customOrder.armour)
    }),
    other: createListSection({
      id: 'other',
      label: 'BRP.other',
      createAction: { action: 'createDoc', documentClass: 'Item', type: 'gear' },
      collapsed: Boolean(settings.sectionCollapsed.other),
      sort: buildInventorySortState('other', settings.sectionSortModes.other),
      rows: sortInventoryRows(otherRows, settings.sectionSortModes.other, settings.customOrder.other),
      kindGroups: groupInventoryRowsByKind(otherRows)
    })
  };
}

function weaponInventoryRow(domainRow, settings) {
  const weapon = domainRow.item;
  const combatRow = buildCombatWeaponRow(weapon);
  const row = baseInventoryRow(domainRow, {
    icon: combatRow.icon,
    typeLabel: game.i18n.localize('BRP.weapon'),
    subtitle: combatRow.skillName,
    stats: [
      inventoryStat('damage', 'BRP.damage', combatRow.damage.label, combatRow.damage.tooltip),
      inventoryStat('chance', 'BRP.chance', combatRow.skillScore),
      inventoryStat('encumbrance', 'BRP.enc', domainRow.effectiveEnc)
    ],
    details: combatRow.details,
    weapon: combatRow,
    sort: {
      custom: numberOrZero(weapon.system.sortOrder),
      name: sortName(weapon.name),
      type: 'weapon',
      encumbrance: domainRow.effectiveEnc
    }
  }, settings);

  row.searchText = buildSearchText(row, [
    combatRow.skillName,
    weapon.system.weaponType,
    combatRow.combatKind,
    weapon.system.ammoType
  ]);
  return row;
}

function armourInventoryRow(domainRow, settings) {
  const armour = domainRow.item;
  const hitLocation = armour.system.hitlocID ? armour.parent?.items?.get?.(armour.system.hitlocID) : null;
  const ap = armour.system.avr1 && armour.system.avr1 !== ''
    ? armour.system.avr1
    : armour.system.av1;
  const backup = armour.system.avr2 && armour.system.avr2 !== ''
    ? armour.system.avr2
    : armour.system.av2;
  const skillModifierLabel = [
    armour.system.mnplmod,
    armour.system.percmod,
    armour.system.physmod,
    armour.system.stealthmod
  ].join('/');

  const row = baseInventoryRow(domainRow, {
    icon: createArmourIcon(armour, hitLocation),
    typeLabel: game.i18n.localize('BRP.armour'),
    subtitle: armour.system.hitlocName,
    stats: [
      inventoryStat('ap', 'BRP.ap', ap),
      inventoryStat('backup', 'BRP.bap', backup, null, Number(backup) > 0 || backup !== ''),
      inventoryStat('encumbrance', 'BRP.enc', domainRow.effectiveEnc),
      inventoryStat('skillMod', 'BRP.skillMod', skillModifierLabel)
    ],
    armour: {
      ap,
      backup,
      randomAp: armour.system.avr1,
      randomBackup: armour.system.avr2,
      skillModifiers: {
        manipulation: armour.system.mnplmod,
        perception: armour.system.percmod,
        physical: armour.system.physmod,
        stealth: armour.system.stealthmod
      },
      skillModifierLabel,
      hitLocationId: armour.system.hitlocID,
      hitLocationName: armour.system.hitlocName
    },
    sort: {
      custom: numberOrZero(armour.system.sortOrder),
      name: sortName(armour.name),
      type: 'armor',
      encumbrance: domainRow.effectiveEnc
    }
  }, settings);

  row.searchText = buildSearchText(row, [
    armour.system.hitlocName,
    armour.system.coverage,
    skillModifierLabel
  ]);
  return row;
}

function gearInventoryRow(domainRow, settings) {
  const gear = domainRow.item;
  const kind = domainRow.mockType;
  const containerCapacity = numberOrZero(gear.system.capacityEnc);
  const configuredReduction = numberOrZero(gear.system.encReductionPct);
  const appliedReduction = domainRow.status.carried ? configuredReduction : 0;
  const overCapacity = domainRow.isContainer && containerCapacity > 0 && domainRow.contentEnc > containerCapacity;
  const bonusRows = prepareInventoryBonusRows(domainRow.bonuses, domainRow.status.carried);
  const row = baseInventoryRow(domainRow, {
    icon: gearInventoryIcon(kind),
    typeLabel: gearInventoryTypeLabel(kind),
    subtitle: gearSubtitle(domainRow, bonusRows),
    stats: gearInventoryStats(domainRow),
    container: domainRow.isContainer ? {
      contentEnc: domainRow.contentEnc,
      effectiveEnc: domainRow.effectiveEnc,
      capacityEnc: containerCapacity,
      capacityLabel: containerHoldsLabel(domainRow),
      encReductionPct: appliedReduction,
      configuredEncReductionPct: configuredReduction,
      overCapacity,
      children: domainRow.children.map(child => child.id)
    } : null,
    consumable: kind === 'consumable' ? {
      quantity: domainRow.quantity,
      useEffect: gear.system.useEffect ?? '',
      useEffectLabel: inventoryUseEffectLabel(gear.system.useEffect),
      usesRemaining: numberOrZero(gear.system.usesRemaining),
      stackable: Boolean(gear.system.stackable),
      canUse: !gear.system.stackable || domainRow.quantity > 0,
      canSplit: Boolean(gear.system.stackable) && domainRow.quantity > 1
    } : null,
    tool: kind === 'tool' ? {
      bonuses: domainRow.bonuses,
      bonusRows
    } : null,
    loot: kind === 'loot' ? {
      value: gear.system.value ?? ''
    } : null,
    sort: {
      custom: numberOrZero(gear.system.sortOrder),
      name: sortName(gear.name),
      type: kind,
      encumbrance: domainRow.effectiveEnc
    }
  }, settings);

  row.searchText = buildSearchText(row, [
    kind,
    gear.system.value,
    gear.system.useEffect,
    bonusesSearchText(domainRow.bonuses)
  ]);
  if (overCapacity) row.flags.overCapacity = true;
  row.children = flattenInventoryChildRows(domainRow.children, settings);
  return row;
}

function flattenInventoryChildRows(domainRows, settings) {
  const directRows = sortInventoryRows(
    filterInventoryRows(domainRows.map(child => inventoryRowFromDomain(child, settings)), settings.filters),
    settings.sectionSortModes.other,
    settings.customOrder.other
  );
  return directRows.flatMap(row => [row, ...(row.children ?? [])]);
}

function inventoryRowFromDomain(domainRow, settings) {
  if (domainRow.mockType === 'weapon') return weaponInventoryRow(domainRow, settings);
  if (domainRow.mockType === 'armor') return armourInventoryRow(domainRow, settings);
  return gearInventoryRow(domainRow, settings);
}

function baseInventoryRow(domainRow, extra = {}, settings = normalizeInventorySettings()) {
  const item = domainRow.item;
  const isFavorite = Boolean(item.flags?.brp?.sheet?.favorite);
  const isDetailsOpen = Boolean(settings.expandedItems[domainRow.id]);
  const bonusRows = extra.bonusRows ?? prepareInventoryBonusRows(domainRow.bonuses, domainRow.status.carried);
  const row = createListRow({
    id: domainRow.id,
    title: item.name,
    name: item.name,
    item,
    img: item.img,
    subtitle: extra.subtitle ?? '',
    flags: {
      hasEffects: item.system?.hasEffects,
      empty: domainRow.empty,
      carried: domainRow.status.carried,
      equipped: domainRow.status.equipped,
      favorite: isFavorite,
      detailsOpen: isDetailsOpen,
      containerOpen: Boolean(settings.expandedContainers[domainRow.id]),
      contained: Boolean(domainRow.parentId),
      invalidContainer: domainRow.issues.length > 0
    },
    actions: inventoryRowActions(domainRow),
    mockType: domainRow.mockType,
    inventoryKind: domainRow.inventoryKind,
    typeLabel: extra.typeLabel,
    icon: extra.icon,
    depth: domainRow.depth,
    parentId: domainRow.parentId,
    containerId: domainRow.containerId,
    quantity: domainRow.quantity,
    isFavorite,
    isDetailsOpen,
    empty: domainRow.empty,
    status: domainRow.status,
    equipStatus: domainRow.status.equipStatus,
    equippedName: item.system?.equippedName,
    encumbrance: domainRow.effectiveEnc,
    ownEnc: domainRow.ownEnc,
    contentEnc: domainRow.contentEnc,
    bonuses: domainRow.bonuses,
    bonusRows,
    bonusPreviewRows: bonusRows.slice(0, 3),
    bonusOverflow: Math.max(0, bonusRows.length - 3),
    hasBonuses: bonusRows.length > 0,
    issues: domainRow.issues,
    stats: (extra.stats ?? []).filter(stat => stat.enabled !== false),
    details: extra.details ?? [],
    sort: extra.sort ?? defaultInventorySort(domainRow)
  });

  return {
    ...row,
    ...extra,
    searchText: buildSearchText(row)
  };
}

function normalizeInventorySettings(settings = {}) {
  const filters = normalizeInventoryFilters(settings.filters);
  return {
    sectionCollapsed: {
      weapons: Boolean(settings.sectionCollapsed?.weapons),
      armour: Boolean(settings.sectionCollapsed?.armour),
      other: Boolean(settings.sectionCollapsed?.other)
    },
    sectionSortModes: {
      weapons: normalizeInventorySortMode(settings.sectionSortModes?.weapons),
      armour: normalizeInventorySortMode(settings.sectionSortModes?.armour),
      other: normalizeInventorySortMode(settings.sectionSortModes?.other)
    },
    customOrder: normalizeInventoryCustomOrder(settings.customOrder),
    filters,
    activeFilterCount: countActiveInventoryFilters(filters),
    expandedItems: settings.expandedItems && typeof settings.expandedItems === 'object'
      ? settings.expandedItems
      : {},
    expandedContainers: settings.expandedContainers && typeof settings.expandedContainers === 'object'
      ? settings.expandedContainers
      : {}
  };
}

function normalizeInventoryFilters(filters = {}) {
  const hasTypeFilter = Array.isArray(filters.types);
  const types = hasTypeFilter
    ? Array.from(new Set(filters.types.map(normalizeInventoryFilterType).filter(type => INVENTORY_FILTER_TYPES.includes(type))))
    : [...DEFAULT_INVENTORY_FILTERS.types];

  return {
    types,
    equipped: Boolean(filters.equipped),
    carried: Boolean(filters.carried),
    favorite: Boolean(filters.favorite),
    hideEmpty: filters.hideEmpty !== false
  };
}

function normalizeInventorySortMode(mode) {
  return INVENTORY_SORT_MODES.includes(mode) ? mode : 'custom';
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

function countActiveInventoryFilters(filters) {
  let count = 0;
  if (filters.types.length !== INVENTORY_FILTER_TYPES.length) count += 1;
  if (filters.equipped) count += 1;
  if (filters.carried) count += 1;
  if (filters.favorite) count += 1;
  if (!filters.hideEmpty) count += 1;
  return count;
}

function buildInventoryFilterView(filters) {
  return {
    ...filters,
    activeCount: countActiveInventoryFilters(filters),
    typeOptions: INVENTORY_FILTER_TYPES.map(type => ({
      id: type,
      label: inventoryFilterTypeLabel(type),
      checked: filters.types.includes(type)
    }))
  };
}

function inventoryFilterTypeLabel(type) {
  return {
    weapon: 'BRP.weapon',
    armour: 'BRP.armour',
    container: 'BRP.inventoryKindContainer',
    consumable: 'BRP.inventoryKindConsumable',
    tool: 'BRP.inventoryKindTool',
    equipment: 'BRP.inventoryKindEquipment',
    loot: 'BRP.inventoryKindLoot'
  }[type] ?? 'BRP.other';
}

function filterInventoryRows(rows, filters) {
  return rows.filter(row => inventoryRowMatchesFilters(row, filters));
}

function inventoryRowMatchesFilters(row, filters) {
  if (!filters.types.includes(inventoryRowFilterType(row))) return false;
  if (filters.equipped && !row.flags.equipped) return false;
  if (filters.carried && !row.flags.carried) return false;
  if (filters.favorite && !row.flags.favorite) return false;
  if (filters.hideEmpty && row.flags.empty) return false;
  return true;
}

function normalizeInventoryFilterType(type) {
  return type === 'armor' ? 'armour' : type;
}

function inventoryRowFilterType(row) {
  return normalizeInventoryFilterType(row.mockType);
}

function buildInventorySortState(sectionId, mode) {
  const options = INVENTORY_SORT_MODES
    .filter(option => option !== 'type-asc' || sectionId === 'other')
    .map(option => ({
      mode: option,
      label: inventorySortLabel(option),
      icon: inventorySortIcon(option),
      active: option === mode
    }));

  return {
    mode,
    label: inventorySortLabel(mode),
    icon: inventorySortIcon(mode),
    options
  };
}

function inventorySortLabel(mode) {
  return {
    custom: 'BRP.inventorySortCustom',
    'name-asc': 'BRP.inventorySortNameAsc',
    'name-desc': 'BRP.inventorySortNameDesc',
    'type-asc': 'BRP.inventorySortType',
    'enc-desc': 'BRP.inventorySortEncDesc',
    'enc-asc': 'BRP.inventorySortEncAsc'
  }[mode] ?? 'BRP.inventorySortCustom';
}

function inventorySortIcon(mode) {
  return {
    custom: 'fas fa-grip-lines',
    'name-asc': 'fas fa-arrow-down-a-z',
    'name-desc': 'fas fa-arrow-down-z-a',
    'type-asc': 'fas fa-layer-group',
    'enc-desc': 'fas fa-arrow-down-wide-short',
    'enc-asc': 'fas fa-arrow-up-wide-short'
  }[mode] ?? 'fas fa-grip-lines';
}

function inventoryRowActions(domainRow) {
  const actions = [
    { id: 'view', action: 'viewDoc', documentType: domainRow.type },
    { id: 'toggle-carry', action: 'itemToggle', property: 'equipStatus' }
  ];

  if (domainRow.mockType === 'weapon' || domainRow.mockType === 'armor') {
    actions.push({ id: 'toggle-equip', action: 'itemToggle', property: 'equipStatus' });
  }

  return actions;
}

function gearInventoryStats(domainRow) {
  const gear = domainRow.item;
  const kind = domainRow.mockType;
  const stats = [
    inventoryStat('quantity', 'BRP.quantity', domainRow.quantity),
    inventoryStat('encumbrance', 'BRP.enc', domainRow.effectiveEnc)
  ];

  if (kind === 'container') {
    stats.push(
      inventoryStat('holds', 'BRP.capacityEnc', containerHoldsLabel(domainRow)),
      inventoryStat('reduction', 'BRP.encReductionPct', numberOrZero(gear.system.encReductionPct) + '%')
    );
  }

  if (kind === 'consumable') {
    stats.push(
      inventoryStat('uses', 'BRP.usesRemaining', numberOrZero(gear.system.usesRemaining)),
      inventoryStat('useEffect', 'BRP.useEffect', gear.system.useEffect || '-')
    );
  }

  if (kind === 'tool') {
    stats.push(inventoryStat('bonuses', 'BRP.bonuses', domainRow.bonuses.length));
  }

  if (kind === 'loot') {
    stats.push(inventoryStat('value', 'BRP.value', gear.system.value || '-'));
  }

  return stats;
}

function inventoryUseEffectLabel(useEffect) {
  const key = {
    consume: 'BRP.inventoryUseEffectConsume',
    message: 'BRP.inventoryUseEffectMessage'
  }[useEffect] ?? 'BRP.none';
  return game.i18n.localize(key);
}

function inventoryStat(id, label, value, tooltip = null, enabled = true) {
  return { id, label, value, tooltip, enabled };
}

function prepareInventoryBonusRows(bonuses, isCarried = true) {
  if (!Array.isArray(bonuses)) return [];

  return bonuses
    .map((bonus, index) => prepareInventoryBonusRow(bonus, index, isCarried))
    .filter(Boolean);
}

function prepareInventoryBonusRow(bonus, index, isCarried) {
  if (typeof bonus === 'string') {
    const label = bonus.trim();
    if (!label) return null;
    return inventoryBonusRow({
      mode: 'text',
      label,
      requiresCarried: false,
      isCarried,
      index
    });
  }
  if (!bonus || typeof bonus !== 'object') return null;

  const mode = normalizeInventoryBonusMode(bonus.mode ?? bonus.type ?? bonus.kind);
  const requiresCarried = Boolean(bonus.requiresCarried);
  const skill = firstInventoryBonusString(bonus.skill, bonus.skillName, bonus.target, bonus.targetSkill, bonus.targetName);
  const text = firstInventoryBonusString(bonus.text, bonus.label, bonus.name, bonus.description, bonus.note);
  let label = '';

  if (mode === 'flat') {
    const value = formatInventoryFlatBonus(bonus.value ?? bonus.amount ?? bonus.modifier ?? bonus.bonus ?? bonus.percent);
    label = [value, skill || text].filter(Boolean).join(' ');
  } else if (mode === 'difficulty') {
    const difficulty = formatInventoryDifficultyBonus(bonus.difficulty ?? bonus.level ?? bonus.value ?? bonus.amount);
    label = [difficulty, skill || text].filter(Boolean).join(' - ');
  } else {
    label = text || skill || bonusesSearchText([bonus]);
  }

  if (!label) return null;
  return inventoryBonusRow({
    mode,
    label,
    requiresCarried,
    isCarried,
    index
  });
}

function inventoryBonusRow({ mode, label, requiresCarried, isCarried, index }) {
  const inactive = requiresCarried && !isCarried;
  return {
    id: `bonus-${index}`,
    mode,
    label,
    compactLabel: truncateInventoryBonusLabel(label, 28),
    detailLabel: label,
    requiresCarried,
    inactive,
    tooltip: inactive ? game.i18n.localize('BRP.inventoryBonusRequiresCarried') : label
  };
}

function normalizeInventoryBonusMode(mode) {
  const normalized = String(mode ?? '').toLowerCase();
  if (normalized === 'flat' || normalized === 'difficulty' || normalized === 'text') return normalized;
  if (normalized === 'modifier' || normalized === 'mod') return 'flat';
  return 'text';
}

function firstInventoryBonusString(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function formatInventoryFlatBonus(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';

  const number = Number(text);
  if (Number.isFinite(number)) return `${number > 0 ? '+' : ''}${number}%`;
  return text;
}

function formatInventoryDifficultyBonus(value) {
  const text = String(value ?? '').trim();
  if (!text || ['none', 'normal', 'average'].includes(text.toLowerCase())) return '';
  const key = {
    easy: 'BRP.easy',
    difficult: 'BRP.difficult',
    hard: 'BRP.difficult',
    impossible: 'BRP.impossible'
  }[text.toLowerCase()];
  return key ? game.i18n.localize(key) : text;
}

function truncateInventoryBonusLabel(label, maxLength) {
  const text = String(label ?? '');
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 1)).trimEnd() + '...';
}

function buildCurrencyRows(context) {
  const currencies = Array.isArray(context.system?.currencies)
    ? context.system.currencies
    : [];

  return currencies.map((currency, index) => ({
    id: currency.id || `currency-${index}`,
    name: currency.name || '',
    icon: currency.icon || 'coin',
    amount: Number(currency.amount) || 0,
    sortOrder: Number(currency.sortOrder) || index,
    searchText: [currency.name, currency.icon, currency.amount].filter(Boolean).join(' ').toLowerCase()
  })).sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

function groupInventoryRowsByKind(rows) {
  const groups = new Map();
  for (const row of rows) {
    const kind = row.inventoryKind || 'equipment';
    if (!groups.has(kind)) {
      groups.set(kind, {
        id: kind,
        label: gearInventoryTypeLabel(kind),
        rows: []
      });
    }
    groups.get(kind).rows.push(row);
  }
  return Array.from(groups.values());
}

function sortInventoryRows(rows, mode, customOrder = []) {
  const sortedRows = [...rows];
  const customOrderIndex = new Map(customOrder.map((id, index) => [id, index]));
  sortedRows.sort((left, right) => {
    if (mode === 'name-asc') return compareInventoryName(left, right);
    if (mode === 'name-desc') return compareInventoryName(right, left);
    if (mode === 'type-asc') return compareInventoryType(left, right) || compareInventoryName(left, right);
    if (mode === 'enc-desc') return compareInventoryEnc(right, left) || compareInventoryName(left, right);
    if (mode === 'enc-asc') return compareInventoryEnc(left, right) || compareInventoryName(left, right);
    return compareInventoryCustom(left, right, customOrderIndex) || compareInventoryType(left, right) || compareInventoryName(left, right);
  });
  return sortedRows;
}

function compareInventoryName(left, right) {
  return String(left.sort?.name ?? '').localeCompare(String(right.sort?.name ?? ''));
}

function compareInventoryType(left, right) {
  return String(left.sort?.type ?? '').localeCompare(String(right.sort?.type ?? ''));
}

function compareInventoryEnc(left, right) {
  return Number(left.sort?.encumbrance ?? 0) - Number(right.sort?.encumbrance ?? 0);
}

function compareInventoryCustom(left, right, customOrderIndex) {
  const leftIndex = customOrderIndex.has(left.id) ? customOrderIndex.get(left.id) : Number.MAX_SAFE_INTEGER;
  const rightIndex = customOrderIndex.has(right.id) ? customOrderIndex.get(right.id) : Number.MAX_SAFE_INTEGER;
  if (leftIndex !== rightIndex) return leftIndex - rightIndex;
  return Number(left.sort?.custom ?? 0) - Number(right.sort?.custom ?? 0);
}

function defaultInventorySort(domainRow) {
  return {
    custom: numberOrZero(domainRow.item.system?.sortOrder),
    name: sortName(domainRow.name),
    type: domainRow.mockType,
    encumbrance: domainRow.effectiveEnc
  };
}

function buildSearchText(row, extra = []) {
  const item = row.item;
  return [
    row.name,
    row.title,
    row.subtitle,
    row.typeLabel,
    row.mockType,
    row.inventoryKind,
    item?.system?.description,
    bonusesSearchText(row.bonuses),
    ...extra
  ].filter(Boolean).join(' ').toLowerCase();
}

function bonusesSearchText(bonuses) {
  if (!Array.isArray(bonuses) || bonuses.length === 0) return '';
  return bonuses.map(bonus => {
    if (bonus == null) return '';
    if (typeof bonus === 'string') return bonus;
    return Object.values(bonus).filter(value => value != null).join(' ');
  }).join(' ');
}

function containerHoldsLabel(domainRow) {
  const capacity = numberOrZero(domainRow.item.system?.capacityEnc);
  return capacity > 0 ? `${domainRow.contentEnc} / ${capacity}` : String(domainRow.contentEnc);
}

function gearSubtitle(domainRow, bonusRows = prepareInventoryBonusRows(domainRow.bonuses, domainRow.status.carried)) {
  if (domainRow.mockType === 'container') return containerHoldsLabel(domainRow);
  if (domainRow.mockType === 'loot') return domainRow.item.system?.value ?? '';
  if (domainRow.mockType === 'tool') return bonusRows.map(bonus => bonus.compactLabel).join(', ');
  if (domainRow.mockType === 'consumable') return domainRow.item.system?.useEffect ?? '';
  return '';
}

function gearInventoryIcon(kind) {
  if (kind === 'container') return 'fas fa-box-open';
  if (kind === 'consumable') return 'fas fa-flask';
  if (kind === 'tool') return 'fas fa-screwdriver-wrench';
  if (kind === 'loot') return 'fas fa-gem';
  return 'fas fa-suitcase';
}

function gearInventoryTypeLabel(kind) {
  const key = {
    container: 'BRP.inventoryKindContainer',
    consumable: 'BRP.inventoryKindConsumable',
    tool: 'BRP.inventoryKindTool',
    equipment: 'BRP.inventoryKindEquipment',
    loot: 'BRP.inventoryKindLoot'
  }[kind] ?? 'BRP.inventoryKindEquipment';
  return game.i18n.localize(key);
}

function sortName(name) {
  return String(name ?? '').toLowerCase();
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function armourRow(armour) {
  return createListRow({
    id: armour._id,
    title: armour.name,
    name: armour.name,
    item: armour,
    flags: {
      hasEffects: armour.system.hasEffects
    },
    isHitLocationSummary: armour.system.list === 0,
    hidden: armour.system.hide,
    showToggle: armour.system.show,
    hitLocationId: armour.system.hitlocID,
    hitLocationName: armour.system.hitlocName,
    lowRoll: armour.system.lowRoll,
    armourCount: armour.system.length,
    protection: {
      ap: armour.system.av1,
      backup: armour.system.av2,
      randomAp: armour.system.avr1,
      randomBackup: armour.system.avr2,
      variable: armour.system.armVar,
      balanced: armour.system.armBal,
      summaryVisible: armour.system.avr1 !== "" || armour.system.avr2 !== ""
    },
    energy: {
      current: armour.system.ppCurr,
      max: armour.system.ppMax,
      editable: armour.system.armVar
    },
    powerStore: {
      current: armour.system.pSCurr,
      max: armour.system.pSMax,
      enabled: armour.system.pSMax > 0
    },
    encumbrance: armour.system.actlEnc ?? armour.system.enc,
    skillModifiers: {
      manipulation: armour.system.mnplmod,
      perception: armour.system.percmod,
      physical: armour.system.physmod,
      stealth: armour.system.stealthmod
    },
    skillModifierLabel: [armour.system.mnplmod, armour.system.percmod, armour.system.physmod, armour.system.stealthmod].join('/'),
    equipStatus: armour.system.equipStatus,
    equippedName: armour.system.equippedName,
    hasEffects: armour.system.hasEffects
  });
}

function buildArmourSection(rows) {
  return createListSection({
    id: 'armour',
    label: 'BRP.armour',
    createAction: { action: 'createDoc', documentClass: 'Item', type: 'armour' },
    rows
  });
}

function gearRow(gear) {
  return createListRow({
    id: gear._id,
    title: gear.name,
    name: gear.name,
    item: gear,
    cells: {
      quantity: createListCell({
        value: gear.system.quantity,
        editable: true,
        field: 'quantity',
        align: 'center'
      }),
      encumbrance: createListCell({
        value: gear.system.actlEnc,
        align: 'center'
      }),
      powerStoreCurrent: createListCell({
        value: gear.system.pSCurr,
        editable: true,
        enabled: gear.system.pSMax > 0,
        field: 'pSCurr',
        align: 'center'
      }),
      powerStoreMax: createListCell({
        value: gear.system.pSMax,
        enabled: gear.system.pSMax > 0,
        align: 'center'
      }),
      equipStatus: createListCell({
        value: gear.system.equipStatus,
        label: gear.system.equippedName,
        action: 'itemToggle',
        field: 'equipStatus',
        align: 'center'
      })
    },
    actions: [
      { id: 'view', action: 'viewDoc', documentType: 'gear' },
      { id: 'toggle-equip', action: 'itemToggle', property: 'equipStatus' }
    ],
    flags: {
      hasEffects: gear.system.hasEffects
    },
    quantity: gear.system.quantity,
    encumbrance: gear.system.actlEnc,
    powerStore: {
      current: gear.system.pSCurr,
      max: gear.system.pSMax,
      enabled: gear.system.pSMax > 0
    },
    equipStatus: gear.system.equipStatus,
    equippedName: gear.system.equippedName,
    hasEffects: gear.system.hasEffects
  });
}

function buildGearSection(context) {
  return createListSection({
    id: 'gear',
    label: 'BRP.equipment',
    createAction: { action: 'createDoc', documentClass: 'Item', type: 'gear' },
    actions: [
      { id: 'create', action: 'createDoc', documentClass: 'Item', type: 'gear', tooltip: 'BRP.addGear' }
    ],
    columns: [
      createListColumn({ id: 'name', label: 'BRP.equipment' }),
      createListColumn({ id: 'quantity', label: 'BRP.quantity', align: 'center' }),
      createListColumn({ id: 'encumbrance', label: 'BRP.enc', align: 'center' }),
      createListColumn({
        id: 'powerStore',
        label: context.system.power.labelAbbr,
        tooltip: 'BRP.ppStoreHint',
        align: 'center'
      }),
      createListColumn({ id: 'equipStatus', label: 'BRP.status', tooltip: 'BRP.equipStatusHint', align: 'center' })
    ],
    rows: context.gears.map(gearRow)
  });
}
