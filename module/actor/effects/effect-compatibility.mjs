import {
  getEffectSheetMetadata,
  sanitizeEffectDurationType,
  sanitizeEffectSourceType,
  sanitizeEffectSheetMetadata,
  sanitizeEffectTargetType
} from '../sheets/character/prepare/effects/shared.mjs';
import { reverseEffectTarget } from './effect-target-registry.mjs';

export const NATIVE_EFFECT_COMPATIBILITY_RULES = [
  {
    id: 'armour-physical',
    itemTypes: ['armour'],
    field: 'physmod',
    strategy: 'project-to-registry',
    sourceType: 'items',
    targetType: 'skill-category',
    targetId: 'i.skillcat.physical',
    targetLabelKey: 'BRP.physical',
    fallbackLabel: 'Physical'
  },
  {
    id: 'armour-perception',
    itemTypes: ['armour'],
    field: 'percmod',
    strategy: 'project-to-registry',
    sourceType: 'items',
    targetType: 'skill-category',
    targetId: 'i.skillcat.perception',
    targetLabelKey: 'BRP.percmod',
    fallbackLabel: 'Perception'
  },
  {
    id: 'armour-manipulation',
    itemTypes: ['armour'],
    field: 'mnplmod',
    strategy: 'compatibility-only',
    sourceType: 'items',
    targetType: 'other',
    targetLabelKey: 'BRP.effectsCompatibilityManipulation',
    fallbackLabel: 'Manipulation'
  },
  {
    id: 'armour-stealth',
    itemTypes: ['armour'],
    field: 'stealthmod',
    strategy: 'compatibility-only',
    sourceType: 'items',
    targetType: 'other',
    targetLabelKey: 'BRP.effectsCompatibilityStealth',
    fallbackLabel: 'Stealth / Hide'
  }
];

export function hasNativeEffectCompatibility(item) {
  return getNativeEffectCompatibilityEntries(item).length > 0;
}

export function getNativeEffectCompatibilityEntries(item) {
  if (!(item instanceof Item)) return [];

  return NATIVE_EFFECT_COMPATIBILITY_RULES.reduce((entries, rule) => {
    if (!rule.itemTypes.includes(item.type)) return entries;

    const value = Number(item.system?.[rule.field] ?? 0);
    if (!Number.isFinite(value) || value === 0) return entries;

    entries.push({
      id: `${item.id}:${rule.id}`,
      itemId: item.id,
      itemUuid: item.uuid,
      itemName: item.name,
      itemType: item.type,
      field: rule.field,
      value,
      sourceType: rule.sourceType,
      targetType: rule.targetType,
      targetId: String(rule.targetId ?? '').trim(),
      targetLabel: localizeText(rule.targetLabelKey, rule.fallbackLabel),
      strategy: rule.strategy
    });
    return entries;
  }, []);
}

export function isNativeEffectCompatibilityEntryActive(item, entry = null) {
  if (!(item instanceof Item)) return false;

  if (item.type === 'armour') {
    if (!entry || entry.field === 'physmod' || entry.field === 'percmod' || entry.field === 'mnplmod' || entry.field === 'stealthmod') {
      return item.system?.equipStatus === 'worn';
    }
  }

  return true;
}

export async function resolveEffectOriginDocument(effect, cache = null) {
  const origin = String(effect?.origin ?? '').trim();
  if (!origin) return null;

  if (cache?.has(origin)) return cache.get(origin);

  let document = null;
  try {
    document = await fromUuid(origin);
  } catch (error) {
    console.warn(`BRP | Failed to resolve effect origin (${origin})`, error);
  }

  cache?.set(origin, document ?? null);
  return document ?? null;
}

export function detectEffectSourceType(effect, sourceDocument = null) {
  const metadata = getEffectSheetMetadata(effect);
  if (metadata.sourceType) return metadata.sourceType;

  if (effect?.statuses?.size) return 'status';

  if (sourceDocument instanceof Item) {
    if (sourceDocument.type === 'wound') return 'wounds';
    if (['magic', 'mutation', 'power', 'psychic', 'sorcery', 'super'].includes(sourceDocument.type)) return 'magic';
    return 'items';
  }

  return 'manual';
}

export function detectEffectDurationType(effect, sourceType = '', sourceDocument = null) {
  const metadata = getEffectSheetMetadata(effect);
  if (metadata.durationType) return metadata.durationType;

  const foundryType = sanitizeEffectDurationType(effect?.duration?.type);
  if (foundryType && foundryType !== 'permanent') return foundryType;

  if (sourceType === 'status' || sourceType === 'wounds') return 'conditional';
  if (sourceType === 'items' && sourceDocument instanceof Item) return 'conditional';

  return 'permanent';
}

export function normalizeEffectSheetMetadata(effect, actor, change, options = {}) {
  const sourceDocument = options.sourceDocument ?? null;
  const base = sanitizeEffectSheetMetadata(getEffectSheetMetadata(effect));
  let sourceType = base.sourceType || detectEffectSourceType(effect, sourceDocument);
  const durationType = base.durationType || detectEffectDurationType(effect, sourceType, sourceDocument);
  if (!base.sourceType && sourceType === 'wounds' && durationType === 'permanent') {
    sourceType = 'injuries';
  }
  const reverseTarget = reverseEffectTarget(actor, change?.key, base);

  return {
    sourceType,
    sourceLabel: base.sourceLabel || sourceDocument?.name || String(effect?.name ?? '').trim(),
    targetType: base.targetType || sanitizeEffectTargetType(reverseTarget?.categoryId),
    targetLabel: base.targetLabel || String(reverseTarget?.label ?? change?.key ?? '').trim(),
    durationType,
    timerNote: base.timerNote,
    hidden: base.hidden
  };
}

export function normalizeActorEffectChange(effect, change, actor, options = {}) {
  const metadata = normalizeEffectSheetMetadata(effect, actor, change, options);
  const numericMode = Number(change?.mode);
  const priority = Number(change?.priority);

  return {
    effectId: effect?.id ?? null,
    effectUuid: effect?.uuid ?? null,
    key: String(change?.key ?? '').trim(),
    name: metadata.targetLabel || String(change?.key ?? '').trim(),
    value: String(change?.value ?? '').trim(),
    mode: Number.isFinite(numericMode) ? numericMode : CONST.ACTIVE_EFFECT_MODES.ADD,
    priority: Number.isFinite(priority) ? priority : null,
    isActive: effect?.active === true,
    isDisabled: effect?.disabled === true,
    sourceType: metadata.sourceType,
    sourceLabel: metadata.sourceLabel,
    targetType: metadata.targetType,
    targetLabel: metadata.targetLabel,
    durationType: metadata.durationType,
    timerNote: metadata.timerNote,
    hidden: metadata.hidden
  };
}

function localizeText(key, fallback = '') {
  if (!key) return fallback;
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
}
