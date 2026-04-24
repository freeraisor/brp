import { CHARACTER_GM_ONLY_TAB_IDS } from './character-sheet-config.mjs';

const TAB_GROUP = 'primary';

const BASE_PARTS = ['shell', 'sidebar', 'tabs', 'skills', 'combat', 'health', 'items'];
const TRAILING_PARTS = ['statistics', 'background'];
const POWER_PARTS = ['magic', 'mutations', 'psychics', 'sorcery', 'super'];

const POWER_TABS = {
  magic: 'magicLabel',
  mutations: 'mutationLabel',
  psychics: 'psychicLabel',
  sorcery: 'sorceryLabel',
  super: 'superLabel'
};

export const CHARACTER_RAIL_ORDER = [
  'skills',
  'combat',
  'health',
  'items',
  'character',
  'social',
  'story',
  'effects',
  'dev'
];

const TAB_METADATA = {
  skills: {
    icon: 'fas fa-dice',
    label: 'BRP.TABS.skills',
    railId: 'skills',
    railLabel: 'BRP.skills',
    order: 10,
    targetGroup: 'skills',
    tooltip: 'BRP.skills'
  },
  combat: {
    icon: 'fas fa-swords',
    label: 'BRP.TABS.combat',
    railId: 'combat',
    railLabel: 'BRP.combat',
    order: 20,
    targetGroup: 'combat',
    tooltip: 'BRP.combat'
  },
  health: {
    icon: 'fas fa-kit-medical',
    label: 'BRP.health',
    railId: 'health',
    railLabel: 'BRP.health',
    order: 30,
    targetGroup: 'health',
    tooltip: 'BRP.health'
  },
  items: {
    icon: 'fas fa-treasure-chest',
    label: 'BRP.TABS.items',
    railId: 'items',
    railLabel: 'BRP.items',
    order: 40,
    targetGroup: 'items',
    tooltip: 'BRP.items'
  },
  statistics: {
    icon: 'fas fa-user',
    label: 'BRP.TABS.statistics',
    railId: 'character',
    railLabel: 'BRP.character',
    order: 50,
    targetGroup: 'character',
    tooltip: 'BRP.statistics'
  },
  social: {
    icon: 'fas fa-scale-balanced',
    label: 'BRP.TABS.social',
    railId: 'social',
    railLabel: 'BRP.social',
    order: 60,
    targetGroup: 'social',
    tooltip: 'BRP.social'
  },
  pers: {
    icon: 'fas fa-heart',
    label: 'BRP.TABS.pers',
    railId: 'social-personality',
    railLabel: 'BRP.pers',
    order: 61,
    targetGroup: 'social',
    tooltip: 'BRP.pers'
  },
  background: {
    icon: 'fas fa-book-open',
    label: 'BRP.TABS.background',
    railId: 'story',
    railLabel: 'BRP.story',
    order: 70,
    targetGroup: 'story',
    tooltip: 'BRP.story'
  },
  effects: {
    icon: 'fas fa-wand-magic',
    label: 'BRP.TABS.effects',
    railId: 'effects',
    railLabel: 'BRP.effects',
    order: 80,
    targetGroup: 'effects',
    tooltip: 'BRP.effects'
  },
  dev: {
    icon: 'fas fa-gear',
    label: 'BRP.TABS.dev',
    railId: 'dev',
    railLabel: 'BRP.TABS.dev',
    order: 90,
    targetGroup: 'dev',
    tooltip: 'BRP.TABS.dev'
  }
};

const POWER_TAB_METADATA = {
  magic: { icon: 'fas fa-wand-magic', tooltip: 'BRP.magic' },
  mutations: { icon: 'fas fa-burst', tooltip: 'BRP.mutations' },
  psychics: { icon: 'fa-regular fa-lightbulb', tooltip: 'BRP.psychics' },
  sorcery: { icon: 'fas fa-book', tooltip: 'BRP.sorcery' },
  super: { icon: 'fas fa-hand-sparkles', tooltip: 'BRP.super' }
};

export function getCharacterParts(actor, settings = game.settings) {
  const parts = [...BASE_PARTS];
  const system = actor.system;

  for (const powerPart of POWER_PARTS) {
    if (system[normalizePowerSystemKey(powerPart)] != "") parts.push(powerPart);
  }

  parts.push('social');
  if (settings.get('brp', 'usePersTrait') || settings.get('brp', 'usePassion') > 0) parts.push('pers');

  parts.push(...TRAILING_PARTS);
  if (canViewCharacterTab('effects')) parts.push('effects');
  if (settings.get('brp', 'development')) parts.push('dev');

  return parts;
}

export function getCharacterTabs(parts, context, activeTab, tabGroup = TAB_GROUP) {
  const tabs = parts.reduce((tabList, partId) => {
    if (partId === 'shell' || partId === 'sidebar' || partId === 'header' || partId === 'tabs') return tabList;

    const tab = getCharacterTab(partId, context, tabGroup);
    if (!tab) return tabList;

    if (activeTab === tab.id) tab.cssClass = 'active';
    tabList.push(tab);
    return tabList;
  }, []);

  tabs.sort((left, right) => left.order - right.order);
  return Object.fromEntries(tabs.map(tab => [tab.id, tab]));
}

function getCharacterTab(partId, context, tabGroup) {
  if (!canViewCharacterTab(partId)) return null;

  const definition = TAB_METADATA[partId];
  if (definition) {
    return {
      cssClass: '',
      group: tabGroup,
      id: partId,
      icon: definition.icon,
      label: definition.label,
      order: definition.order,
      railId: definition.railId,
      railLabel: definition.railLabel,
      targetGroup: definition.targetGroup,
      tooltip: game.i18n.localize(definition.tooltip)
    };
  }

  const powerLabelKey = POWER_TABS[partId];
  if (!powerLabelKey) return null;

  const powerMetadata = POWER_TAB_METADATA[partId] ?? {};
  const label = context[powerLabelKey] ?? '';
  return {
    cssClass: '',
    group: tabGroup,
    id: partId,
    icon: powerMetadata.icon ?? '',
    label: label.slice(0, 5),
    order: 75,
    railId: partId,
    railLabel: label,
    targetGroup: 'powers',
    tooltip: label
  };
}

function normalizePowerSystemKey(partId) {
  if (partId === 'mutations') return 'mutation';
  if (partId === 'psychics') return 'psychic';
  return partId;
}

function canViewCharacterTab(partId, user = game.user) {
  if (!CHARACTER_GM_ONLY_TAB_IDS.has(partId)) return true;
  return Boolean(user?.isGM);
}
