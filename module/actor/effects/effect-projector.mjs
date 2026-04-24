import {
  getNativeEffectCompatibilityEntries,
  isNativeEffectCompatibilityEntryActive
} from './effect-compatibility.mjs';
import { reverseEffectTarget } from './effect-target-registry.mjs';
import { getEffectSheetMetadata } from '../sheets/character/prepare/effects/shared.mjs';

const REGISTRY_KEY_PREFIX = 'brp.targets.';
const SKILL_LIKE_TYPES = new Set(['skill', 'magic', 'psychic']);
const PENDING_DERIVED_KEYS = ['move', 'damage-bonus', 'xp-bonus', 'total-enc'];
const PENDING_RESOURCE_IDS = ['health', 'power', 'fatigue', 'sanity'];
const PENDING_ARMOUR_KEYS = ['all', 'head', 'chest', 'abdomen', 'arms', 'legs'];

export function projectActorEffects(actor) {
  const projection = createProjectionState(actor);
  const operations = collectRegistryOperations(actor);

  for (const operation of operations) {
    applyProjectionOperation(projection, operation);
  }

  applyNativeCompatibilityProjection(projection);
  projection.summary = buildProjectionSummary(projection);
  actor._brpEffectProjection = projection.summary;
  return projection;
}

export function finalizeActorEffectProjection(actor, projection, options = {}) {
  if (!actor || !projection) return projection;

  const system = actor.system ?? {};
  const summary = projection.summary ?? buildProjectionSummary(projection);
  projection.summary = summary;

  applyPendingResourceMaxEffects(system, projection.pending.resourceMax);
  applyPendingResourceCurrentEffects(system, projection.pending.resourceCurrent);
  applyPendingDerivedEffects(actor, projection.pending.derived);
  applyPendingArmourEffects(actor, projection.pending.armour, options);

  if (summary.resourceRates.health !== 0 || summary.resourceRates.power !== 0) {
    system.effectRates ??= {};
    system.effectRates.health = summary.resourceRates.health;
    system.effectRates.power = summary.resourceRates.power;
  }

  actor._brpEffectProjection = summary;
  return projection;
}

export function getProjectedArmourBonus(actor, location = 'all') {
  const armour = actor?._brpEffectProjection?.armour ?? {};
  const locationKey = resolveArmourLocationKey(actor, location);
  const allBonus = Number(armour.all ?? 0) || 0;
  if (!locationKey || locationKey === 'all') return allBonus;
  return allBonus + (Number(armour[locationKey] ?? 0) || 0);
}

function createProjectionState(actor) {
  return {
    actor,
    pending: {
      derived: Object.fromEntries(PENDING_DERIVED_KEYS.map(key => [key, []])),
      resourceCurrent: Object.fromEntries(PENDING_RESOURCE_IDS.map(key => [key, []])),
      resourceMax: Object.fromEntries(PENDING_RESOURCE_IDS.map(key => [key, []])),
      resourceRate: Object.fromEntries(PENDING_RESOURCE_IDS.map(key => [key, []])),
      armour: Object.fromEntries(PENDING_ARMOUR_KEYS.map(key => [key, []]))
    },
    skillCategoryIndex: indexActorItems(actor, item => item?.type === 'skillcat'),
    skillLikeItems: Array.from(actor?.items ?? []).filter(item => SKILL_LIKE_TYPES.has(item?.type)),
    specificSkillIndex: indexActorItems(actor, item => item?.type === 'skill'),
    compatibility: [],
    appliedChangeCount: 0,
    summary: null
  };
}

function collectRegistryOperations(actor) {
  const operations = [];
  let order = 0;

  for (const effect of actor?.effects ?? []) {
    if (effect?.active !== true) continue;

    const metadata = getEffectSheetMetadata(effect);
    for (let changeIndex = 0; changeIndex < (effect.changes?.length ?? 0); changeIndex++) {
      const change = effect.changes[changeIndex];
      const key = String(change?.key ?? '').trim();
      if (!key.startsWith(REGISTRY_KEY_PREFIX)) continue;

      const value = toNumber(change?.value, null);
      if (!Number.isFinite(value)) continue;

      const target = reverseEffectTarget(actor, key, metadata);
      const descriptor = target?.projection ?? {};
      if (!descriptor.kind) continue;

      operations.push({
        order: order++,
        effectId: effect.id,
        changeIndex,
        mode: normalizeMode(change?.mode),
        priority: resolvePriority(change),
        value,
        descriptor
      });
    }
  }

  operations.sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    return left.order - right.order;
  });

  return operations;
}

function applyProjectionOperation(projection, operation) {
  const descriptor = operation.descriptor;

  switch (descriptor.kind) {
    case 'stat-effects':
      applyNumericField(projection.actor?.system?.stats?.[descriptor.statId], 'effects', operation);
      projection.appliedChangeCount += 1;
      return;
    case 'resource-max-effects':
      applyNumericField(projection.actor?.system?.[descriptor.resourceId], 'effects', operation);
      projection.appliedChangeCount += 1;
      return;
    case 'skill-category':
      if (descriptor.categoryId === 'all-skills') {
        for (const item of projection.skillLikeItems) {
          applyNumericField(item?.system, 'effects', operation);
        }
      } else {
        applyNumericField(resolveIndexedItem(projection.skillCategoryIndex, descriptor.categoryId)?.system, 'mod', operation);
      }
      projection.appliedChangeCount += 1;
      return;
    case 'specific-skill':
      applyNumericField(resolveIndexedItem(projection.specificSkillIndex, descriptor.itemId ?? descriptor.brpid)?.system, 'effects', operation);
      projection.appliedChangeCount += 1;
      return;
    case 'resource-current':
      projection.pending.resourceCurrent[descriptor.resourceId]?.push(operation);
      projection.appliedChangeCount += 1;
      return;
    case 'resource-max':
      projection.pending.resourceMax[descriptor.resourceId]?.push(operation);
      projection.appliedChangeCount += 1;
      return;
    case 'resource-rate':
      projection.pending.resourceRate[descriptor.resourceId]?.push(operation);
      projection.appliedChangeCount += 1;
      return;
    case 'derived':
      projection.pending.derived[descriptor.derivedId]?.push(operation);
      projection.appliedChangeCount += 1;
      return;
    case 'armour':
      projection.pending.armour[descriptor.locationId]?.push(operation);
      projection.appliedChangeCount += 1;
      return;
  }
}

function applyNativeCompatibilityProjection(projection) {
  const armourPerception = [];
  const armourPhysical = [];

  for (const item of projection.actor?.items ?? []) {
    const entries = getNativeEffectCompatibilityEntries(item);
    for (const entry of entries) {
      projection.compatibility.push(entry);
      if (!isNativeEffectCompatibilityEntryActive(item, entry)) continue;
      if (entry.strategy !== 'project-to-registry') continue;

      if (entry.targetId === 'i.skillcat.perception') {
        armourPerception.push(createCompatibilityOperation(entry.value));
      } else if (entry.targetId === 'i.skillcat.physical') {
        armourPhysical.push(createCompatibilityOperation(entry.value));
      }
    }
  }

  for (const operation of armourPerception) {
    applyNumericField(resolveIndexedItem(projection.skillCategoryIndex, 'i.skillcat.perception')?.system, 'mod', operation);
  }

  for (const operation of armourPhysical) {
    applyNumericField(resolveIndexedItem(projection.skillCategoryIndex, 'i.skillcat.physical')?.system, 'mod', operation);
  }
}

function buildProjectionSummary(projection) {
  return {
    appliedChangeCount: projection.appliedChangeCount,
    resourceRates: Object.fromEntries(PENDING_RESOURCE_IDS.map(key => [key, evaluateOperations(0, projection.pending.resourceRate[key])])),
    resourceCurrent: Object.fromEntries(PENDING_RESOURCE_IDS.map(key => [key, evaluateOperations(0, projection.pending.resourceCurrent[key])])),
    resourceMax: Object.fromEntries(PENDING_RESOURCE_IDS.map(key => [key, evaluateOperations(0, projection.pending.resourceMax[key])])),
    derived: Object.fromEntries(PENDING_DERIVED_KEYS.map(key => [key, evaluateOperations(0, projection.pending.derived[key])])),
    armour: Object.fromEntries(PENDING_ARMOUR_KEYS.map(key => [key, evaluateOperations(0, projection.pending.armour[key])])),
    compatibility: projection.compatibility.map(entry => ({
      id: entry.id,
      strategy: entry.strategy,
      targetId: entry.targetId,
      value: entry.value
    }))
  };
}

function applyPendingResourceMaxEffects(system, resourceMaxOperations) {
  for (const resourceId of PENDING_RESOURCE_IDS) {
    const operations = resourceMaxOperations[resourceId];
    if (!operations?.length) continue;
    const resource = system?.[resourceId];
    if (!resource || typeof resource !== 'object') continue;
    resource.max = evaluateOperations(toNumber(resource.max, 0), operations);
  }
}

function applyPendingResourceCurrentEffects(system, resourceCurrentOperations) {
  for (const resourceId of PENDING_RESOURCE_IDS) {
    const operations = resourceCurrentOperations[resourceId];
    if (!operations?.length) continue;
    const resource = system?.[resourceId];
    if (!resource || typeof resource !== 'object') continue;
    resource.value = evaluateOperations(toNumber(resource.value, 0), operations);
  }
}

function applyPendingDerivedEffects(actor, derivedOperations) {
  const system = actor?.system ?? {};

  if (derivedOperations.move?.length) {
    system.move = evaluateOperations(toNumber(system.move, 0), derivedOperations.move);
  }

  if (derivedOperations['xp-bonus']?.length) {
    system.xpBonus = evaluateOperations(toNumber(system.xpBonus, 0), derivedOperations['xp-bonus']);
  }

  if (derivedOperations['total-enc']?.length) {
    const encValue = evaluateOperations(toNumber(system.enc, 0), derivedOperations['total-enc']);
    system.enc = encValue.toFixed(2);
    system.fatigue.max = Math.ceil(
      toNumber(system.stats?.str?.total, 0)
      + toNumber(system.stats?.con?.total, 0)
      - encValue
      + toNumber(system.fatigue?.mod, 0)
      + toNumber(system.fatigue?.effects, 0)
    );
  }

  if (derivedOperations['damage-bonus']?.length) {
    const modifier = evaluateOperations(0, derivedOperations['damage-bonus']);
    system.dmgBonus = applyDamageBonusModifier(actor, system.dmgBonus, modifier);
    system.dmgSpecBonus = applyDamageBonusModifier(actor, system.dmgSpecBonus, modifier);
  }
}

function applyPendingArmourEffects(actor, armourOperations, options = {}) {
  const useHPL = options.useHPL ?? game.settings.get('brp', 'useHPL');
  const allBonus = evaluateOperations(0, armourOperations.all);
  if (!useHPL) {
    actor.system.av1 = toNumber(actor.system.av1, 0) + allBonus;
    return;
  }

  const perLocationBonuses = {
    head: evaluateOperations(0, armourOperations.head),
    chest: evaluateOperations(0, armourOperations.chest),
    abdomen: evaluateOperations(0, armourOperations.abdomen),
    arms: evaluateOperations(0, armourOperations.arms),
    legs: evaluateOperations(0, armourOperations.legs)
  };

  for (const location of actor.items.filter(item => item.type === 'hit-location')) {
    const bonus = allBonus + armourBonusForLocation(location, perLocationBonuses);
    if (bonus === 0) continue;
    location.system.av1 = toNumber(location.system.av1, 0) + bonus;
  }
}

function armourBonusForLocation(location, bonuses) {
  const key = resolveArmourLocationKey(null, location);
  if (!key || key === 'all') return 0;
  return bonuses[key] ?? 0;
}

function resolveArmourLocationKey(actor, location) {
  const normalizedLocation = String(location ?? '').trim().toLowerCase();
  if (PENDING_ARMOUR_KEYS.includes(normalizedLocation)) return normalizedLocation;

  const hitLocation = typeof location === 'string'
    ? actor?.items?.get?.(location) ?? null
    : location;
  if (!hitLocation) return '';

  const text = [
    String(hitLocation.system?.locType ?? ''),
    String(hitLocation.system?.displayName ?? ''),
    String(hitLocation.name ?? ''),
    String(hitLocation.flags?.brp?.brpidFlag?.id ?? '')
  ].join(' ').toLowerCase();

  if (text.includes('head')) return 'head';
  if (text.includes('chest')) return 'chest';
  if (text.includes('abdomen')) return 'abdomen';
  if (isArmLocation(text)) return 'arms';
  if (isLegLocation(text)) return 'legs';
  return '';
}

function applyDamageBonusModifier(actor, bonus, modifier) {
  if (!modifier) return bonus;

  const next = foundry.utils.deepClone(bonus ?? actor._damageBonus?.(0) ?? {});
  for (const key of ['half', 'full', 'dbl']) {
    next[key] = appendSignedModifier(next[key], modifier);
  }
  return next;
}

function appendSignedModifier(base, modifier) {
  const baseText = String(base ?? '').trim();
  const modifierText = formatSignedNumber(modifier);
  if (!baseText || baseText === '+0' || baseText === '0') return modifierText;
  if (!modifierText || modifierText === '+0' || modifierText === '0') return baseText;
  return `${baseText} ${modifier > 0 ? '+' : '-'} ${Math.abs(modifier)}`;
}

function createCompatibilityOperation(value) {
  return {
    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
    priority: CONST.ACTIVE_EFFECT_MODES.ADD * 10,
    value: toNumber(value, 0)
  };
}

function applyNumericField(target, field, operation) {
  if (!target || typeof target !== 'object') return;
  const current = toNumber(target[field], 0);
  target[field] = evaluateOperation(current, operation);
}

function evaluateOperations(baseValue, operations = []) {
  return operations.reduce((current, operation) => evaluateOperation(current, operation), toNumber(baseValue, 0));
}

function evaluateOperation(current, operation) {
  const value = toNumber(operation?.value, 0);
  switch (normalizeMode(operation?.mode)) {
    case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
      return current * value;
    case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
      return Math.min(current, value);
    case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
      return Math.max(current, value);
    case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
      return value;
    case CONST.ACTIVE_EFFECT_MODES.CUSTOM:
      return current;
    case CONST.ACTIVE_EFFECT_MODES.ADD:
    default:
      return current + value;
  }
}

function resolveIndexedItem(index, identifier) {
  const key = String(identifier ?? '').trim();
  if (!key) return null;
  return index.get(key) ?? null;
}

function indexActorItems(actor, predicate) {
  const index = new Map();

  for (const item of actor?.items ?? []) {
    if (!predicate(item)) continue;
    const brpId = getBrpId(item);
    if (item.id) index.set(String(item.id), item);
    if (item._id) index.set(String(item._id), item);
    if (brpId) index.set(brpId, item);
  }

  return index;
}

function getBrpId(item) {
  return String(item?.flags?.brp?.brpidFlag?.id ?? '').trim();
}

function resolvePriority(change) {
  const priority = Number(change?.priority);
  if (Number.isFinite(priority)) return priority;
  return normalizeMode(change?.mode) * 10;
}

function normalizeMode(mode) {
  const numericMode = Number(mode);
  return Number.isFinite(numericMode) ? numericMode : CONST.ACTIVE_EFFECT_MODES.ADD;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatSignedNumber(value) {
  const number = toNumber(value, 0);
  if (!number) return '0';
  return number > 0 ? `+${number}` : String(number);
}

function isArmLocation(text) {
  return text.includes('arm') || text.includes('hand') || text.includes('brazo') || text.includes('bras');
}

function isLegLocation(text) {
  return text.includes('leg') || text.includes('foot') || text.includes('pierna') || text.includes('jambe');
}
