export const CHARACTER_SHEET_PARTS = {
  shell: { template: 'systems/brp/templates/actor/character.shell.hbs' },
  sidebar: {
    template: 'systems/brp/templates/actor/character.sidebar.hbs',
    container: { id: 'brp-refresh-sidebar' }
  },
  tabs: {
    template: 'systems/brp/templates/global/parts/actor-tab-navigation.hbs',
    container: { id: 'brp-refresh-rail' }
  },
  background: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.background.hbs',
    scrollable: ['']
  },
  combat: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.combat.hbs',
    scrollable: [''],
  },
  health: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.health.hbs',
    scrollable: [''],
  },
  effects: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.effects.hbs',
    scrollable: [''],
  },
  items: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.items.hbs',
    scrollable: [''],
  },
  magic: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.magic.hbs',
    scrollable: [''],
  },
  mutations: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.mutations.hbs',
    scrollable: [''],
  },
  pers: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.pers.hbs',
    scrollable: [''],
  },
  psychics: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.psychics.hbs',
    scrollable: [''],
  },
  skills: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.skills.hbs',
    scrollable: [''],
  },
  social: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.social.hbs',
    scrollable: [''],
  },
  sorcery: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.sorcery.hbs',
    scrollable: [''],
  },
  statistics: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.statistics.hbs',
    scrollable: [''],
  },
  super: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.super.hbs',
    scrollable: [''],
  },
  dev: {
    container: { id: 'brp-refresh-workspace' },
    template: 'systems/brp/templates/actor/character.dev.hbs',
    scrollable: [''],
  },
};

export const CHARACTER_TAB_PART_IDS = new Set([
  'skills',
  'combat',
  'health',
  'items',
  'social',
  'pers',
  'statistics',
  'effects',
  'magic',
  'mutations',
  'psychics',
  'sorcery',
  'super',
  'background',
  'dev'
]);

export const CHARACTER_GM_ONLY_TAB_IDS = new Set(['effects']);

export const CHARACTER_SECTION_IDS = ['core', 'biography', 'characteristics', 'derived', 'powers', 'custom'];

export const CURRENCY_ICON_IDS = ['coin', 'bill', 'card', 'crypto', 'gem', 'token'];

export const CURRENCY_ICON_LABEL_KEYS = {
  bill: 'BRP.currencyIconBill',
  card: 'BRP.currencyIconCard',
  coin: 'BRP.currencyIconCoin',
  crypto: 'BRP.currencyIconCrypto',
  gem: 'BRP.currencyIconGem',
  token: 'BRP.currencyIconToken'
};

export const SOCIAL_SECTION_IDS = ['allegiance', 'reputation', 'contacts', 'factions'];

export const SOCIAL_CONTEXT_SELECTORS = {
  allegiance: '.brp-social-refresh-allegiance-card[data-item-id]',
  reputation: '.brp-social-refresh-reputation-row[data-item-id]',
  contacts: '.brp-social-refresh-contact-row[data-item-id]',
  factions: '.brp-social-refresh-faction-card[data-membership-index]'
};

export const PERS_SECTION_IDS = ['traits', 'passions'];

export const PERS_CONTEXT_SELECTORS = {
  traits: '.brp-pers-refresh-trait-card[data-item-id]',
  passions: '.brp-pers-refresh-passion-card[data-item-id]'
};

export const STORY_SECTION_IDS = ['quests', 'journal'];
