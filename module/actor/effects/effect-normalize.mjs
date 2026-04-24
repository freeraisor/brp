import {
  getNativeEffectCompatibilityEntries,
  isNativeEffectCompatibilityEntryActive,
  normalizeActorEffectChange,
  resolveEffectOriginDocument
} from './effect-compatibility.mjs';
import {
  EFFECT_TARGET_CATEGORY_LABEL_KEYS,
  getEffectTargetCategories,
  resolveEffectTarget,
  reverseEffectTarget
} from './effect-target-registry.mjs';
import {
  buildEffectParentActions,
  buildEffectRowActions
} from './effect-row-actions.mjs';
import {
  EFFECTS_DURATION_IDS,
  EFFECTS_GROUP_IDS,
  activeEffectModeToId,
  getEffectsDurationLabel,
  getEffectsGroupLabel,
  getEffectsModeLabel,
  localizeText,
  sanitizeEffectTargetType
} from '../sheets/character/prepare/effects/shared.mjs';

const EFFECT_MODE_OPTIONS = [
  { id: 'add', mode: CONST.ACTIVE_EFFECT_MODES.ADD, priority: CONST.ACTIVE_EFFECT_MODES.ADD * 10 },
  { id: 'multiply', mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY, priority: CONST.ACTIVE_EFFECT_MODES.MULTIPLY * 10 },
  { id: 'override', mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, priority: CONST.ACTIVE_EFFECT_MODES.OVERRIDE * 10 },
  { id: 'upgrade', mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE, priority: CONST.ACTIVE_EFFECT_MODES.UPGRADE * 10 },
  { id: 'downgrade', mode: CONST.ACTIVE_EFFECT_MODES.DOWNGRADE, priority: CONST.ACTIVE_EFFECT_MODES.DOWNGRADE * 10 }
];

export async function buildUnifiedEffectRows(actor) {
  const rows = [];
  const originCache = new Map();

  for (const effect of actor?.effects ?? []) {
    const sourceDocument = await resolveEffectOriginDocument(effect, originCache);

    for (let changeIndex = 0; changeIndex < (effect.changes?.length ?? 0); changeIndex++) {
      const change = effect.changes[changeIndex];
      const normalized = normalizeActorEffectChange(effect, change, actor, { sourceDocument });
      const target = reverseEffectTarget(actor, normalized.key, {
        targetType: normalized.targetType,
        targetLabel: normalized.targetLabel
      });
      rows.push(buildActiveEffectRow(actor, effect, change, changeIndex, normalized, sourceDocument, target));
    }
  }

  for (const item of actor?.items ?? []) {
    for (const entry of getNativeEffectCompatibilityEntries(item)) {
      rows.push(buildNativeCompatibilityRow(actor, item, entry));
    }
  }

  return sortEffectRows(rows);
}

export function buildEffectBuilderModel(actor) {
  const categories = getEffectTargetCategories(actor)
    .filter(category => category.options.length > 0)
    .map(category => ({
      id: category.id,
      label: category.label,
      options: category.options.map(option => ({
        id: option.targetId,
        key: option.key,
        label: option.label,
        categoryId: option.categoryId
      }))
    }));

  return {
    supportsAdvancedTarget: true,
    categories,
    durations: EFFECTS_DURATION_IDS.map(durationId => ({
      id: durationId,
      label: getEffectsDurationLabel(durationId)
    })),
    modes: EFFECT_MODE_OPTIONS.map(option => ({
      id: option.id,
      mode: option.mode,
      priority: option.priority,
      label: getEffectsModeLabel(option.id)
    })),
    defaults: {
      categoryId: categories[0]?.id ?? 'skill-category',
      targetId: categories[0]?.options?.[0]?.id ?? 'raw',
      durationId: 'permanent',
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      priority: CONST.ACTIVE_EFFECT_MODES.ADD * 10
    }
  };
}

function buildActiveEffectRow(actor, effect, change, changeIndex, normalized, sourceDocument, target) {
  const targetCategoryId = sanitizeEffectTargetType(normalized.targetType) || target?.categoryId || 'other';
  const modeId = activeEffectModeToId(normalized.mode);
  const numericValue = toNumber(normalized.value, null);
  const source = buildSourceDescriptor(effect, sourceDocument, normalized.sourceLabel);
  const row = {
    id: `${effect.id}:${changeIndex}`,
    kind: 'active-effect',
    effectId: effect.id,
    effectUuid: effect.uuid,
    parentId: effect.parent?.id ?? actor.id,
    changeIndex,
    key: normalized.key,
    name: String(effect.name ?? '').trim() || normalized.name,
    icon: String(effect.img ?? effect.icon ?? '').trim(),
    sourceType: normalized.sourceType,
    sourceTypeLabel: getEffectsGroupLabel(normalized.sourceType),
    source,
    targetType: targetCategoryId,
    targetCategoryLabel: localizeText(EFFECT_TARGET_CATEGORY_LABEL_KEYS[targetCategoryId], targetCategoryId),
    targetLabel: normalized.targetLabel || String(target?.label ?? normalized.key),
    targetKey: normalized.key,
    modifier: buildModifierDescriptor(modeId, normalized.mode, normalized.value, numericValue),
    duration: {
      id: normalized.durationType,
      label: getEffectsDurationLabel(normalized.durationType),
      timerNote: normalized.timerNote,
      hasTimerNote: Boolean(normalized.timerNote)
    },
    hidden: normalized.hidden,
    isActive: normalized.isActive,
    isParentDisabled: normalized.isDisabled,
    isSourceSuppressed: normalized.isActive !== true && normalized.isDisabled !== true,
    priority: normalized.priority,
    description: String(effect.description ?? '').trim(),
    searchText: [
      effect.name,
      normalized.sourceLabel,
      normalized.targetLabel,
      normalized.key
    ].filter(Boolean).join(' '),
    compatibilityStrategy: '',
    isCompatibilityOnly: false
  };

  row.rowActions = buildEffectRowActions(row, actor);
  row.parentActions = buildEffectParentActions(row, actor);
  return row;
}

function buildNativeCompatibilityRow(actor, item, entry) {
  const target = entry.targetId
    ? resolveEffectTarget(actor, entry.targetType, entry.targetId, { allowRawFallback: true, rawPath: entry.targetId })
    : null;
  const targetCategoryId = sanitizeEffectTargetType(entry.targetType) || target?.categoryId || 'other';
  const source = {
    label: item.name,
    documentClass: 'Item',
    documentId: item.id,
    uuid: item.uuid
  };
  const row = {
    id: `compat:${entry.id}`,
    kind: 'native-compatibility',
    effectId: null,
    effectUuid: '',
    parentId: actor.id,
    changeIndex: 0,
    key: entry.field,
    name: `${item.name}: ${entry.targetLabel}`,
    icon: String(item.img ?? '').trim(),
    sourceType: entry.sourceType,
    sourceTypeLabel: getEffectsGroupLabel(entry.sourceType),
    source,
    targetType: targetCategoryId,
    targetCategoryLabel: localizeText(EFFECT_TARGET_CATEGORY_LABEL_KEYS[targetCategoryId], targetCategoryId),
    targetLabel: entry.targetLabel || String(target?.label ?? entry.field),
    targetKey: entry.targetId || entry.field,
    modifier: buildModifierDescriptor('add', CONST.ACTIVE_EFFECT_MODES.ADD, entry.value, toNumber(entry.value, null)),
    duration: {
      id: 'conditional',
      label: getEffectsDurationLabel('conditional'),
      timerNote: '',
      hasTimerNote: false
    },
    hidden: false,
    isActive: isNativeEffectCompatibilityEntryActive(item, entry),
    isParentDisabled: false,
    isSourceSuppressed: false,
    priority: CONST.ACTIVE_EFFECT_MODES.ADD * 10,
    description: '',
    searchText: [item.name, entry.targetLabel, entry.field].filter(Boolean).join(' '),
    compatibilityStrategy: entry.strategy,
    isCompatibilityOnly: entry.strategy === 'compatibility-only'
  };

  row.rowActions = {
    edit: null,
    duplicate: null,
    delete: null,
    menu: null
  };
  row.parentActions = {
    openEffect: null,
    openSource: {
      action: 'viewDoc',
      label: localizeText('BRP.sourceItem', 'Source'),
      documentClass: 'Item',
      itemId: item.id,
      documentId: item.id
    },
    toggleActive: null,
    toggleHidden: null
  };
  return row;
}

function buildModifierDescriptor(modeId, mode, rawValue, numericValue) {
  return {
    modeId,
    mode,
    modeLabel: getEffectsModeLabel(modeId),
    rawValue: String(rawValue ?? '').trim(),
    value: numericValue,
    valueDisplay: formatModifierValue(modeId, rawValue, numericValue),
    signClass: numericValue == null
      ? 'neutral'
      : numericValue > 0
        ? 'positive'
        : numericValue < 0
          ? 'negative'
          : 'neutral'
  };
}

function buildSourceDescriptor(effect, sourceDocument, fallbackLabel) {
  if (sourceDocument instanceof Item) {
    return {
      label: sourceDocument.name,
      documentClass: 'Item',
      documentId: sourceDocument.id,
      uuid: sourceDocument.uuid
    };
  }

  return {
    label: String(fallbackLabel ?? effect?.name ?? '').trim(),
    documentClass: '',
    documentId: '',
    uuid: String(effect?.origin ?? '').trim()
  };
}

function formatModifierValue(modeId, rawValue, numericValue) {
  if (modeId === 'multiply') {
    if (numericValue == null) return String(rawValue ?? '').trim();
    return `x${numericValue}`;
  }

  if (numericValue == null) return String(rawValue ?? '').trim();
  if (numericValue > 0) return `+${numericValue}`;
  return String(numericValue);
}

function sortEffectRows(rows) {
  return [...rows].sort((left, right) => {
    const groupCompare = EFFECTS_GROUP_IDS.indexOf(left.sourceType) - EFFECTS_GROUP_IDS.indexOf(right.sourceType);
    if (groupCompare !== 0) return groupCompare;

    if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;

    const leftSource = String(left.source?.label ?? '').toLowerCase();
    const rightSource = String(right.source?.label ?? '').toLowerCase();
    if (leftSource !== rightSource) return leftSource.localeCompare(rightSource);

    return String(left.name ?? '').localeCompare(String(right.name ?? ''));
  });
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
