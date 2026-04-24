import { normalizeSectionStateMap } from '../character-sheet-utils.mjs';

const SECTION_IDS = ['traits', 'passions'];
const SORT_MODES = ['name', 'name-desc', 'value-desc', 'value-asc'];
const DEFAULT_SORT_MODES = {
  traits: 'name',
  passions: 'value-desc'
};

const PASSION_TYPES = {
  love: {
    label: 'BRP.passionTypeLove',
    icon: 'fas fa-heart'
  },
  hate: {
    label: 'BRP.passionTypeHate',
    icon: 'fas fa-fire'
  },
  loyalty: {
    label: 'BRP.passionTypeLoyalty',
    icon: 'fas fa-shield-halved'
  },
  fear: {
    label: 'BRP.passionTypeFear',
    icon: 'fas fa-eye'
  },
  devotion: {
    label: 'BRP.passionTypeDevotion',
    icon: 'fas fa-star'
  },
  other: {
    label: 'BRP.passionTypeOther',
    icon: 'fas fa-clock'
  }
};

export function createPersPreparation(improve) {
  return {
    passions: [],
    persTraits: [],
    improve
  };
}

export function preparePassionItem(item, state) {
  state.passions.push(item);

  if (item.system?.improve) {
    addImprove(state.improve, {
      item,
      name: item.name,
      score: numberOrZero(item.system?.total),
      opp: false
    });
  }
}

export function preparePersTraitItem(item, state) {
  state.persTraits.push(item);

  if (item.system?.improve) {
    addImprove(state.improve, {
      item,
      name: formatTraitPairNameLabel(item),
      score: numberOrZero(item.system?.total),
      opp: false
    });
    return;
  }

  if (item.system?.oppimprove) {
    addImprove(state.improve, {
      item,
      name: formatTraitPairNameLabel(item),
      score: numberOrZero(item.system?.opptotal ?? 100 - numberOrZero(item.system?.total)),
      opp: true
    });
  }
}

export async function finalizePersPreparation(context, state) {
  context.passions = sortItemsByName(state.passions);
  context.persTraits = sortItemsByName(state.persTraits);

  const settings = getPersSheetSettings(context);
  const visibility = {
    traits: Boolean(context.usePersTrait),
    passions: Boolean(context.usePassion)
  };
  const collapsedSections = buildCollapsedSectionsState(settings.collapsedSections, {
    initialized: settings.stateInitialized,
    ignoreAllTrueUnlessInitialized: true
  });
  const sortModes = buildSortModes(settings.sortModes);

  try {
    const sections = await buildPersSections(context, state, {
      collapsedSections,
      sortModes,
      visibility
    });

    context.persRefresh = {
      sectionOrder: [...SECTION_IDS],
      sections,
      state: {
        collapsedSections,
        sortModes
      }
    };
  } catch (error) {
    console.error('BRP | Failed to prepare personality tab', error);
    context.persRefresh = createFallbackPersRefresh(visibility, collapsedSections, sortModes);
  }
}

async function buildPersSections(context, state, persState) {
  const traitRows = buildTraitRows(state.persTraits, persState.sortModes.traits);
  const passionRows = await buildPassionRows(state.passions, persState.sortModes.passions);

  return {
    traits: createSectionView({
      id: 'traits',
      label: game.i18n.localize('BRP.personalityTraits'),
      visible: persState.visibility.traits,
      collapsed: persState.collapsedSections.traits,
      sortMode: persState.sortModes.traits,
      count: traitRows.length,
      createAction: createDocAction('persTrait'),
      emptyText: game.i18n.localize('BRP.persEmptyTraits'),
      rows: traitRows
    }),
    passions: createSectionView({
      id: 'passions',
      label: game.i18n.localize('BRP.passions'),
      visible: persState.visibility.passions,
      collapsed: persState.collapsedSections.passions,
      sortMode: persState.sortModes.passions,
      count: passionRows.length,
      createAction: createDocAction('passion'),
      emptyText: game.i18n.localize('BRP.persEmptyPassions'),
      rows: passionRows
    })
  };
}

function buildTraitRows(items, sortMode) {
  const rows = items.map(item => {
    const leftValue = clampPercent(item.system?.total);
    const rightValue = clampPercent(item.system?.opptotal ?? 100 - leftValue);
    const dominantSide = leftValue > rightValue ? 'left' : rightValue > leftValue ? 'right' : 'equal';
    const fixatedSide = leftValue === 100 ? 'left' : leftValue === 0 ? 'right' : '';
    const impCheck = isPersTraitImpCheck(item);
    const displayNotes = stringValue(item.system?.notes);

    return {
      item,
      itemId: item.id,
      leftName: stringValue(item.name),
      rightName: stringValue(item.system?.oppName) || game.i18n.localize('BRP.opposedTrait'),
      leftValue,
      rightValue,
      leftValueDisplay: String(leftValue),
      rightValueDisplay: String(rightValue),
      dominantSide,
      fixatedSide,
      fixated: Boolean(fixatedSide),
      impCheck,
      displayNotes,
      hasNotes: Boolean(displayNotes),
      actions: {
        menu: createPersAction('persCardMenu', { itemId: item.id, sectionId: 'traits' }),
        impCheck: createPersAction('persImpCheckToggle', { itemId: item.id })
      }
    };
  });

  return rows.sort(getTraitRowSorter(sortMode));
}

async function buildPassionRows(items, sortMode) {
  const rows = [];

  for (const item of items) {
    try {
      rows.push(await buildPassionRow(item));
    } catch (error) {
      console.error(`BRP | Failed to prepare passion row for ${item?.name ?? item?.id ?? 'unknown item'}`, error);
      rows.push(buildPassionFallbackRow(item));
    }
  }

  return rows.sort(getPassionRowSorter(sortMode));
}

async function buildPassionRow(item) {
  const type = normalizePassionType(item.system?.type);
  const focusLink = await resolvePassionFocusLink(item);
  const storedFocusText = stringValue(item.system?.focus);
  const focusText = storedFocusText || focusLink.label;
  const value = numberOrZero(item.system?.total);
  const typeConfig = PASSION_TYPES[type];

  return {
    item,
    itemId: item.id,
    name: stringValue(item.name),
    type,
    typeIcon: typeConfig.icon,
    typeLabel: game.i18n.localize(typeConfig.label),
    value,
    valueBarPercent: clampPercent(value),
    valueDisplay: `${clampPercent(value)}%`,
    fixated: clampPercent(value) === 100,
    impCheck: Boolean(item.system?.improve),
    focusText,
    hasFocus: Boolean(focusText),
    focusLink,
    focusResolved: focusLink.resolved,
    actions: {
      menu: createPersAction('persCardMenu', { itemId: item.id, sectionId: 'passions' }),
      impCheck: createPersAction('persImpCheckToggle', { itemId: item.id }),
      openFocus: createPersAction('persOpenFocus', { itemId: item.id })
    }
  };
}

async function resolvePassionFocusLink(item) {
  const focusLinkType = normalizeFocusLinkType(item.system?.focusLinkType);
  const focusLinkUuid = stringValue(item.system?.focusLinkUuid);
  if (!focusLinkUuid) {
    return createEmptyFocusLink();
  }

  let document = null;
  try {
    document = await fromUuid(focusLinkUuid);
  } catch (error) {
    console.warn(`BRP | Failed to resolve passion focus link for ${item?.name ?? item?.id ?? 'unknown item'} (${focusLinkUuid})`, error);
    return {
      type: focusLinkType,
      uuid: focusLinkUuid,
      label: '',
      resolved: false
    };
  }

  if (!(document instanceof Item)) {
    return {
      type: focusLinkType,
      uuid: focusLinkUuid,
      label: '',
      resolved: false
    };
  }

  const resolvedType = focusLinkType || normalizeFocusLinkType(document.type);
  if (resolvedType && document.type !== resolvedType) {
    return {
      type: focusLinkType,
      uuid: focusLinkUuid,
      label: '',
      resolved: false
    };
  }

  if (!['contact', 'faction'].includes(document.type)) {
    return {
      type: focusLinkType,
      uuid: focusLinkUuid,
      label: '',
      resolved: false
    };
  }

  return {
    type: document.type,
    uuid: focusLinkUuid,
    label: document.name,
    resolved: true
  };
}

function createEmptyFocusLink() {
  return {
    type: '',
    uuid: '',
    label: '',
    resolved: false
  };
}

function createFallbackPersRefresh(visibility, collapsedSections, sortModes) {
  const sections = {
    traits: createSectionView({
      id: 'traits',
      label: game.i18n.localize('BRP.personalityTraits'),
      visible: visibility.traits,
      collapsed: collapsedSections.traits,
      sortMode: sortModes.traits,
      count: 0,
      createAction: createDocAction('persTrait'),
      emptyText: game.i18n.localize('BRP.persEmptyTraits'),
      rows: []
    }),
    passions: createSectionView({
      id: 'passions',
      label: game.i18n.localize('BRP.passions'),
      visible: visibility.passions,
      collapsed: collapsedSections.passions,
      sortMode: sortModes.passions,
      count: 0,
      createAction: createDocAction('passion'),
      emptyText: game.i18n.localize('BRP.persEmptyPassions'),
      rows: []
    })
  };

  return {
    sectionOrder: [...SECTION_IDS],
    sections,
    state: {
      collapsedSections,
      sortModes
    }
  };
}

function createSectionView({
  id,
  label,
  visible,
  collapsed,
  sortMode,
  count,
  createAction,
  emptyText,
  rows
}) {
  return {
    id,
    label,
    visible,
    collapsed,
    sortMode,
    sortLabel: getSortLabel(sortMode),
    count,
    hasRows: rows.length > 0,
    createAction,
    emptyText,
    rows
  };
}

function createDocAction(type) {
  return {
    action: 'createDoc',
    documentClass: 'Item',
    type
  };
}

function createPersAction(action, data = {}) {
  return {
    action,
    ...data
  };
}

function getPersSheetSettings(context) {
  const sheetFlags = foundry.utils.deepClone(context.actor?.getFlag?.('brp', 'sheet') ?? {});
  const settings = sheetFlags.pers ?? {};
  settings.stateInitialized = readStoredBoolean(settings.stateInitialized, false);
  settings.collapsedSections ??= {};
  settings.sortModes ??= {};
  return settings;
}

function buildCollapsedSectionsState(collapsedSections, options = {}) {
  return normalizeSectionStateMap(SECTION_IDS, collapsedSections, {
    fallback: false,
    ...options
  });
}

function buildSortModes(sortModes) {
  return SECTION_IDS.reduce((state, sectionId) => {
    state[sectionId] = sanitizeSortMode(sectionId, sortModes?.[sectionId]);
    return state;
  }, {});
}

function getTraitRowSorter(sortMode) {
  if (sortMode === 'name-desc') {
    return (left, right) => compareText(right.leftName, left.leftName) || compareNumber(right.leftValue, left.leftValue);
  }
  if (sortMode === 'value-desc') {
    return (left, right) => compareNumber(right.leftValue, left.leftValue) || compareText(left.leftName, right.leftName);
  }
  if (sortMode === 'value-asc') {
    return (left, right) => compareNumber(left.leftValue, right.leftValue) || compareText(left.leftName, right.leftName);
  }
  return (left, right) => compareText(left.leftName, right.leftName) || compareNumber(right.leftValue, left.leftValue);
}

function getPassionRowSorter(sortMode) {
  if (sortMode === 'name-desc') {
    return (left, right) => compareText(right.name, left.name) || compareNumber(right.value, left.value);
  }
  if (sortMode === 'value-desc') {
    return (left, right) => compareNumber(right.value, left.value) || compareText(left.name, right.name);
  }
  if (sortMode === 'value-asc') {
    return (left, right) => compareNumber(left.value, right.value) || compareText(left.name, right.name);
  }
  return (left, right) => compareText(left.name, right.name) || compareNumber(right.value, left.value);
}

function sortItemsByName(items) {
  return [...items].sort((left, right) => compareText(left.name, right.name));
}

function formatTraitPairNameLabel(item) {
  const leftName = stringValue(item.name);
  const rightName = stringValue(item.system?.oppName);
  return rightName ? `${leftName} <-> ${rightName}` : leftName;
}

function addImprove(improve, { item, name, score, opp = false }) {
  improve.push({
    _id: item._id,
    name,
    typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
    score,
    opp
  });
}

function buildPassionFallbackRow(item) {
  const storedFocusText = stringValue(item?.system?.focus);
  const value = numberOrZero(item?.system?.total);
  const type = normalizePassionType(item?.system?.type);
  const typeConfig = PASSION_TYPES[type];

  return {
    item,
    itemId: item?.id ?? '',
    name: stringValue(item?.name),
    type,
    typeIcon: typeConfig.icon,
    typeLabel: game.i18n.localize(typeConfig.label),
    value,
    valueBarPercent: clampPercent(value),
    valueDisplay: `${clampPercent(value)}%`,
    fixated: clampPercent(value) === 100,
    impCheck: Boolean(item?.system?.improve),
    focusText: storedFocusText,
    hasFocus: Boolean(storedFocusText),
    focusLink: createEmptyFocusLink(),
    focusResolved: false,
    actions: {
      menu: createPersAction('persCardMenu', { itemId: item?.id ?? '', sectionId: 'passions' }),
      impCheck: createPersAction('persImpCheckToggle', { itemId: item?.id ?? '' }),
      openFocus: createPersAction('persOpenFocus', { itemId: item?.id ?? '' })
    }
  };
}

function formatTraitPairName(item) {
  return formatTraitPairNameLabel(item);
  const leftName = stringValue(item.name);
  const rightName = stringValue(item.system?.oppName);
  return rightName ? `${leftName} ↔ ${rightName}` : leftName;
}

function getSortLabel(sortMode) {
  const labels = {
    name: game.i18n.localize('BRP.inventorySortNameAsc'),
    'name-desc': game.i18n.localize('BRP.inventorySortNameDesc'),
    'value-desc': game.i18n.localize('BRP.persSortValueDesc'),
    'value-asc': game.i18n.localize('BRP.persSortValueAsc')
  };
  return labels[sortMode] ?? labels[DEFAULT_SORT_MODES.traits];
}

function sanitizeSortMode(sectionId, value) {
  const mode = stringValue(value);
  return SORT_MODES.includes(mode) ? mode : DEFAULT_SORT_MODES[sectionId];
}

function normalizePassionType(value) {
  const type = stringValue(value).toLowerCase();
  return Object.hasOwn(PASSION_TYPES, type) ? type : 'other';
}

function normalizeFocusLinkType(value) {
  const type = stringValue(value).toLowerCase();
  return ['contact', 'faction'].includes(type) ? type : '';
}

function isPersTraitImpCheck(item) {
  return Boolean(item.system?.improve || item.system?.oppimprove);
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, numberOrZero(value)));
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function readStoredBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  return Boolean(value);
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function compareNumber(left, right) {
  const safeLeft = Number(left ?? 0);
  const safeRight = Number(right ?? 0);
  if (safeLeft < safeRight) return -1;
  if (safeLeft > safeRight) return 1;
  return 0;
}

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}
