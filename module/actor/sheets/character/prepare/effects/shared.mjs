import { normalizeSectionStateMap, readStoredBoolean } from '../../character-sheet-utils.mjs';

export const EFFECTS_SHEET_FLAG_PATH = 'flags.brp.sheet.effects';
export const EFFECTS_FILTER_IDS = ['all', 'active-only', 'temporary', 'hidden'];
export const EFFECTS_GROUP_IDS = ['items', 'status', 'wounds', 'magic', 'injuries', 'manual'];
export const EFFECTS_DURATION_IDS = ['permanent', 'timed', 'conditional'];
export const EFFECTS_MODE_IDS = ['add', 'multiply', 'downgrade', 'upgrade', 'override', 'custom'];

export const EFFECTS_FILTER_LABEL_KEYS = {
  all: 'BRP.effectsFilterAll',
  'active-only': 'BRP.effectsFilterActiveOnly',
  temporary: 'BRP.effectsFilterTemporary',
  hidden: 'BRP.effectsFilterHidden'
};

export const EFFECTS_GROUP_LABEL_KEYS = {
  items: 'BRP.effectsGroupItems',
  status: 'BRP.effectsGroupStatus',
  wounds: 'BRP.effectsGroupWounds',
  magic: 'BRP.effectsGroupMagic',
  injuries: 'BRP.effectsGroupInjuries',
  manual: 'BRP.effectsGroupManual'
};

export const EFFECTS_DURATION_LABEL_KEYS = {
  permanent: 'BRP.effectsDurationPermanent',
  timed: 'BRP.effectsDurationTimed',
  conditional: 'BRP.effectsDurationConditional'
};

export const EFFECTS_MODE_LABELS = {
  add: { key: 'BRP.add', fallback: 'Add' },
  multiply: { key: 'BRP.multiply', fallback: 'Multiply' },
  downgrade: { key: '', fallback: 'Downgrade' },
  upgrade: { key: '', fallback: 'Upgrade' },
  override: { key: '', fallback: 'Override' },
  custom: { key: '', fallback: 'Custom' }
};

const EFFECTS_FILTER_ALIASES = {
  active: 'active-only',
  hiddenplayer: 'hidden',
  hiddenfromplayer: 'hidden',
  temp: 'temporary',
  timed: 'temporary'
};

const EFFECTS_SOURCE_TYPE_ALIASES = {
  item: 'items',
  items: 'items',
  magic: 'magic',
  manual: 'manual',
  status: 'status',
  statuses: 'status',
  wound: 'wounds',
  wounds: 'wounds',
  injury: 'injuries',
  injuries: 'injuries'
};

const EFFECTS_DURATION_TYPE_ALIASES = {
  conditional: 'conditional',
  none: 'permanent',
  permanent: 'permanent',
  temporary: 'timed',
  timed: 'timed'
};

const EFFECTS_TARGET_TYPE_ALIASES = {
  armour: 'armour',
  armor: 'armour',
  characteristic: 'characteristic',
  characteristics: 'characteristic',
  derived: 'derived',
  other: 'other',
  raw: 'other',
  resource: 'resource',
  resources: 'resource',
  'skill category': 'skill-category',
  skillcategory: 'skill-category',
  'skill-category': 'skill-category',
  'specific skill': 'specific-skill',
  specificskill: 'specific-skill',
  'specific-skill': 'specific-skill'
};

export function getEffectsSheetFlags(contextOrActor) {
  const actor = contextOrActor?.actor ?? contextOrActor;
  const sheetFlags = actor?.getFlag?.('brp', 'sheet')
    ?? contextOrActor?.flags?.brp?.sheet
    ?? {};
  const settings = foundry.utils.deepClone(sheetFlags.effects ?? {});
  settings.filter = sanitizeEffectsFilter(settings.filter);
  settings.stateInitialized = readStoredBoolean(settings.stateInitialized, false);
  settings.collapsedGroups = buildEffectsCollapsedGroupsState(settings.collapsedGroups, {
    initialized: settings.stateInitialized,
    ignoreAllTrueUnlessInitialized: true
  });
  return settings;
}

export function buildEffectsCollapsedGroupsState(collapsedGroups, options = {}) {
  return normalizeSectionStateMap(EFFECTS_GROUP_IDS, collapsedGroups, {
    fallback: false,
    ...options
  });
}

export function sanitizeEffectsFilter(value) {
  const normalized = stringValue(value).toLowerCase().replace(/\s+/g, '-');
  const effectFilter = EFFECTS_FILTER_ALIASES[normalized] ?? normalized;
  return EFFECTS_FILTER_IDS.includes(effectFilter) ? effectFilter : 'all';
}

export function sanitizeEffectSourceType(value) {
  const normalized = stringValue(value).toLowerCase().replace(/[_\s]+/g, '');
  return EFFECTS_SOURCE_TYPE_ALIASES[normalized] ?? '';
}

export function sanitizeEffectDurationType(value) {
  const normalized = stringValue(value).toLowerCase().replace(/[_\s]+/g, '');
  return EFFECTS_DURATION_TYPE_ALIASES[normalized] ?? '';
}

export function sanitizeEffectTargetType(value) {
  const normalized = stringValue(value).toLowerCase().replace(/[_]+/g, '-');
  const compact = normalized.replace(/-/g, '');
  return EFFECTS_TARGET_TYPE_ALIASES[normalized] ?? EFFECTS_TARGET_TYPE_ALIASES[compact] ?? '';
}

export function getEffectSheetMetadata(effect) {
  const effectFlags = effect?.flags ?? {};
  const current = effectFlags.brp?.sheet?.effects && typeof effectFlags.brp.sheet.effects === 'object'
    ? effectFlags.brp.sheet.effects
    : {};
  const legacy = effectFlags['brp-sheet'] && typeof effectFlags['brp-sheet'] === 'object'
    ? effectFlags['brp-sheet']
    : {};

  return {
    sourceType: sanitizeEffectSourceType(current.sourceType ?? legacy.source_type),
    sourceLabel: stringValue(current.sourceLabel ?? legacy.sourceLabel ?? legacy.source_display_name),
    targetType: sanitizeEffectTargetType(current.targetType ?? current.targetCategory ?? legacy.target_type ?? legacy.target_category),
    targetLabel: stringValue(current.targetLabel ?? current.targetDisplayName ?? legacy.targetLabel ?? legacy.target_display_name),
    durationType: sanitizeEffectDurationType(current.durationType ?? legacy.duration_type),
    timerNote: stringValue(current.timerNote ?? legacy.timer_note),
    hidden: readStoredBoolean(current.hidden ?? legacy.hidden, false)
  };
}

export function sanitizeEffectSheetMetadata(metadata = {}) {
  const source = metadata && typeof metadata === 'object' ? metadata : {};
  return {
    sourceType: sanitizeEffectSourceType(source.sourceType),
    sourceLabel: stringValue(source.sourceLabel),
    targetType: sanitizeEffectTargetType(source.targetType),
    targetLabel: stringValue(source.targetLabel),
    durationType: sanitizeEffectDurationType(source.durationType),
    timerNote: stringValue(source.timerNote),
    hidden: readStoredBoolean(source.hidden, false)
  };
}

export function buildEffectSheetMetadataUpdate(metadata = {}) {
  const normalized = sanitizeEffectSheetMetadata(metadata);
  return {
    'flags.brp.sheet.effects.sourceType': normalized.sourceType,
    'flags.brp.sheet.effects.sourceLabel': normalized.sourceLabel,
    'flags.brp.sheet.effects.targetType': normalized.targetType,
    'flags.brp.sheet.effects.targetLabel': normalized.targetLabel,
    'flags.brp.sheet.effects.durationType': normalized.durationType,
    'flags.brp.sheet.effects.timerNote': normalized.timerNote,
    'flags.brp.sheet.effects.hidden': normalized.hidden
  };
}

export function getEffectsFilterLabel(filterId) {
  return localizeText(EFFECTS_FILTER_LABEL_KEYS[sanitizeEffectsFilter(filterId)], filterId);
}

export function getEffectsGroupLabel(groupId) {
  return localizeText(EFFECTS_GROUP_LABEL_KEYS[sanitizeEffectSourceType(groupId)], groupId);
}

export function getEffectsDurationLabel(durationId) {
  return localizeText(EFFECTS_DURATION_LABEL_KEYS[sanitizeEffectDurationType(durationId)], durationId);
}

export function getEffectsModeLabel(modeId) {
  const normalizedMode = sanitizeEffectModeId(modeId);
  const descriptor = EFFECTS_MODE_LABELS[normalizedMode] ?? EFFECTS_MODE_LABELS.add;
  return localizeText(descriptor.key, descriptor.fallback);
}

export function sanitizeEffectModeId(modeId) {
  const normalized = stringValue(modeId).toLowerCase().replace(/[_\s]+/g, '-');
  if (EFFECTS_MODE_IDS.includes(normalized)) return normalized;
  return 'add';
}

export function activeEffectModeToId(mode) {
  switch (Number(mode)) {
    case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
      return 'multiply';
    case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
      return 'downgrade';
    case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
      return 'upgrade';
    case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
      return 'override';
    case CONST.ACTIVE_EFFECT_MODES.CUSTOM:
      return 'custom';
    case CONST.ACTIVE_EFFECT_MODES.ADD:
    default:
      return 'add';
  }
}

export function localizeText(key, fallback = '') {
  if (!key) return fallback;
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
}

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}
