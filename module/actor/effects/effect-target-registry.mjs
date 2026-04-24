import { sanitizeEffectTargetType } from '../sheets/character/prepare/effects/shared.mjs';

export const EFFECT_TARGET_CATEGORY_IDS = [
  'skill-category',
  'specific-skill',
  'characteristic',
  'derived',
  'armour',
  'resource',
  'other'
];

export const EFFECT_TARGET_CATEGORY_LABEL_KEYS = {
  'skill-category': 'BRP.effectsCategorySkillCategory',
  'specific-skill': 'BRP.effectsCategorySpecificSkill',
  characteristic: 'BRP.effectsCategoryCharacteristic',
  derived: 'BRP.effectsCategoryDerived',
  armour: 'BRP.effectsCategoryArmour',
  resource: 'BRP.effectsCategoryResource',
  other: 'BRP.effectsCategoryOther'
};

const TARGET_KEY_PREFIX = 'brp.targets';

const CHARACTERISTIC_TARGETS = [
  createStaticTarget('characteristic', 'str', 'system.stats.str.effects', 'BRP.StatsStrAbbr', 'STR', { kind: 'stat-effects', statId: 'str', accumulatorPath: 'system.stats.str.effects' }),
  createStaticTarget('characteristic', 'con', 'system.stats.con.effects', 'BRP.StatsConAbbr', 'CON', { kind: 'stat-effects', statId: 'con', accumulatorPath: 'system.stats.con.effects' }),
  createStaticTarget('characteristic', 'int', 'system.stats.int.effects', 'BRP.StatsIntAbbr', 'INT', { kind: 'stat-effects', statId: 'int', accumulatorPath: 'system.stats.int.effects' }),
  createStaticTarget('characteristic', 'siz', 'system.stats.siz.effects', 'BRP.StatsSizAbbr', 'SIZ', { kind: 'stat-effects', statId: 'siz', accumulatorPath: 'system.stats.siz.effects' }),
  createStaticTarget('characteristic', 'pow', 'system.stats.pow.effects', 'BRP.StatsPowAbbr', 'POW', { kind: 'stat-effects', statId: 'pow', accumulatorPath: 'system.stats.pow.effects' }),
  createStaticTarget('characteristic', 'dex', 'system.stats.dex.effects', 'BRP.StatsDexAbbr', 'DEX', { kind: 'stat-effects', statId: 'dex', accumulatorPath: 'system.stats.dex.effects' }),
  createStaticTarget('characteristic', 'cha', 'system.stats.cha.effects', 'BRP.StatsChaAbbr', 'CHA', { kind: 'stat-effects', statId: 'cha', accumulatorPath: 'system.stats.cha.effects' }),
  createStaticTarget('characteristic', 'edu', 'system.stats.edu.effects', 'BRP.StatsEduAbbr', 'EDU', { kind: 'stat-effects', statId: 'edu', accumulatorPath: 'system.stats.edu.effects' })
];

const RESOURCE_TARGETS = [
  createStaticTarget('resource', 'health-max', 'system.health.effects', 'BRP.effectsResourceHealthMax', 'HP max', { kind: 'resource-max-effects', resourceId: 'health', accumulatorPath: 'system.health.effects' }),
  createStaticTarget('resource', 'power-max', 'system.power.effects', 'BRP.effectsResourcePowerMax', 'PP max', { kind: 'resource-max-effects', resourceId: 'power', accumulatorPath: 'system.power.effects' }),
  createStaticTarget('resource', 'fatigue-max', 'system.fatigue.effects', 'BRP.effectsResourceFatigueMax', 'FP max', { kind: 'resource-max-effects', resourceId: 'fatigue', accumulatorPath: 'system.fatigue.effects' }),
  createStaticTarget('resource', 'health-current', `${TARGET_KEY_PREFIX}.resource.health-current`, 'BRP.effectsResourceHealthCurrent', 'HP current', { kind: 'resource-current', resourceId: 'health' }),
  createStaticTarget('resource', 'sanity-max', `${TARGET_KEY_PREFIX}.resource.sanity-max`, 'BRP.effectsResourceSanityMax', 'Sanity max', { kind: 'resource-max', resourceId: 'sanity' }),
  createStaticTarget('resource', 'health-per-round', `${TARGET_KEY_PREFIX}.resource.health-per-round`, 'BRP.effectsResourceHealthPerRound', 'HP per round', { kind: 'resource-rate', resourceId: 'health' }),
  createStaticTarget('resource', 'power-per-round', `${TARGET_KEY_PREFIX}.resource.power-per-round`, 'BRP.effectsResourcePowerPerRound', 'PP per round', { kind: 'resource-rate', resourceId: 'power' })
];

const DERIVED_TARGETS = [
  createStaticTarget('derived', 'move', `${TARGET_KEY_PREFIX}.derived.move`, 'BRP.effectsDerivedMove', 'MOV', { kind: 'derived', derivedId: 'move' }),
  createStaticTarget('derived', 'damage-bonus', `${TARGET_KEY_PREFIX}.derived.damage-bonus`, 'BRP.effectsDerivedDamageBonus', 'Damage Bonus', { kind: 'derived', derivedId: 'damage-bonus' }),
  createStaticTarget('derived', 'xp-bonus', `${TARGET_KEY_PREFIX}.derived.xp-bonus`, 'BRP.effectsDerivedXpBonus', 'XP Bonus', { kind: 'derived', derivedId: 'xp-bonus' }),
  createStaticTarget('derived', 'total-enc', `${TARGET_KEY_PREFIX}.derived.total-enc`, 'BRP.effectsDerivedTotalEnc', 'Total ENC', { kind: 'derived', derivedId: 'total-enc' }),
  createStaticTarget('derived', 'health-bonus', `${TARGET_KEY_PREFIX}.derived.health-bonus`, 'BRP.effectsDerivedHealthBonus', 'HP Bonus', { kind: 'resource-max-effects', resourceId: 'health', accumulatorPath: 'system.health.effects' }),
  createStaticTarget('derived', 'power-bonus', `${TARGET_KEY_PREFIX}.derived.power-bonus`, 'BRP.effectsDerivedPowerBonus', 'PP Bonus', { kind: 'resource-max-effects', resourceId: 'power', accumulatorPath: 'system.power.effects' }),
  createStaticTarget('derived', 'fatigue-bonus', `${TARGET_KEY_PREFIX}.derived.fatigue-bonus`, 'BRP.effectsDerivedFatigueBonus', 'FP Bonus', { kind: 'resource-max-effects', resourceId: 'fatigue', accumulatorPath: 'system.fatigue.effects' })
];

const ARMOUR_TARGETS = [
  createStaticTarget('armour', 'all', `${TARGET_KEY_PREFIX}.armour.all`, 'BRP.effectsArmourAllLocations', 'All locations', { kind: 'armour', locationId: 'all' }),
  createStaticTarget('armour', 'head', `${TARGET_KEY_PREFIX}.armour.head`, 'BRP.effectsArmourHead', 'Head', { kind: 'armour', locationId: 'head' }),
  createStaticTarget('armour', 'chest', `${TARGET_KEY_PREFIX}.armour.chest`, 'BRP.effectsArmourChest', 'Chest', { kind: 'armour', locationId: 'chest' }),
  createStaticTarget('armour', 'abdomen', `${TARGET_KEY_PREFIX}.armour.abdomen`, 'BRP.effectsArmourAbdomen', 'Abdomen', { kind: 'armour', locationId: 'abdomen' }),
  createStaticTarget('armour', 'arms', `${TARGET_KEY_PREFIX}.armour.arms`, 'BRP.effectsArmourArms', 'Arms', { kind: 'armour', locationId: 'arms' }),
  createStaticTarget('armour', 'legs', `${TARGET_KEY_PREFIX}.armour.legs`, 'BRP.effectsArmourLegs', 'Legs', { kind: 'armour', locationId: 'legs' })
];

const DEFAULT_SKILL_CATEGORY_TARGETS = [
  createStaticTarget('skill-category', 'i.skillcat.physical', `${TARGET_KEY_PREFIX}.skill-category.i.skillcat.physical`, 'BRP.physical', 'Physical', { kind: 'skill-category', categoryId: 'i.skillcat.physical' }),
  createStaticTarget('skill-category', 'i.skillcat.mental', `${TARGET_KEY_PREFIX}.skill-category.i.skillcat.mental`, 'BRP.mntlmod', 'Mental', { kind: 'skill-category', categoryId: 'i.skillcat.mental' }),
  createStaticTarget('skill-category', 'i.skillcat.communication', `${TARGET_KEY_PREFIX}.skill-category.i.skillcat.communication`, 'BRP.cmmnmod', 'Communication', { kind: 'skill-category', categoryId: 'i.skillcat.communication' }),
  createStaticTarget('skill-category', 'i.skillcat.perception', `${TARGET_KEY_PREFIX}.skill-category.i.skillcat.perception`, 'BRP.percmod', 'Perception', { kind: 'skill-category', categoryId: 'i.skillcat.perception' }),
  createStaticTarget('skill-category', 'i.skillcat.combat', `${TARGET_KEY_PREFIX}.skill-category.i.skillcat.combat`, 'BRP.combat', 'Combat', { kind: 'skill-category', categoryId: 'i.skillcat.combat' }),
  createStaticTarget('skill-category', 'all-skills', `${TARGET_KEY_PREFIX}.skill-category.all-skills`, 'BRP.effectsTargetAllSkills', 'All skills', { kind: 'skill-category', categoryId: 'all-skills' })
];

const LEGACY_KEY_ENTRIES = new Map([
  ...CHARACTERISTIC_TARGETS.map(entry => [entry.key, entry]),
  ...RESOURCE_TARGETS.filter(entry => entry.key.startsWith('system.')).map(entry => [entry.key, entry])
]);

export function getEffectTargetCategories(actor) {
  return EFFECT_TARGET_CATEGORY_IDS.map(categoryId => ({
    id: categoryId,
    label: localizeText(EFFECT_TARGET_CATEGORY_LABEL_KEYS[categoryId], categoryId),
    options: getEffectTargetRegistry(actor).filter(entry => entry.categoryId === categoryId)
  }));
}

export function getEffectTargetRegistry(actor) {
  const entries = [
    ...CHARACTERISTIC_TARGETS,
    ...mergeSkillCategoryTargets(actor),
    ...buildSpecificSkillTargets(actor),
    ...DERIVED_TARGETS,
    ...ARMOUR_TARGETS,
    ...RESOURCE_TARGETS
  ];

  return entries.map(entry => materializeTargetEntry(entry, actor));
}

export function resolveEffectTarget(actor, categoryId, targetId, options = {}) {
  const normalizedCategory = sanitizeEffectTargetCategoryId(categoryId);
  if (normalizedCategory === 'other') {
    return createRawTargetEntry(options.rawPath ?? targetId);
  }

  const registry = getEffectTargetRegistry(actor);
  const match = registry.find(entry =>
    entry.categoryId === normalizedCategory
    && String(entry.targetId) === String(targetId)
  );

  return match ?? (options.allowRawFallback ? createRawTargetEntry(options.rawPath ?? '') : null);
}

export function reverseEffectTarget(actor, key, metadata = {}) {
  const normalizedKey = String(key ?? '').trim();
  if (!normalizedKey) return createRawTargetEntry('');

  if (LEGACY_KEY_ENTRIES.has(normalizedKey)) {
    return materializeTargetEntry(LEGACY_KEY_ENTRIES.get(normalizedKey), actor);
  }

  const skillCategoryMatch = normalizedKey.match(/^brp\.targets\.skill-category\.(.+)$/);
  if (skillCategoryMatch) {
    return resolveEffectTarget(actor, 'skill-category', skillCategoryMatch[1], { allowRawFallback: true, rawPath: normalizedKey });
  }

  const skillMatch = normalizedKey.match(/^brp\.targets\.skill\.(.+)$/);
  if (skillMatch) {
    return resolveEffectTarget(actor, 'specific-skill', skillMatch[1], { allowRawFallback: true, rawPath: normalizedKey });
  }

  const derivedMatch = normalizedKey.match(/^brp\.targets\.derived\.(.+)$/);
  if (derivedMatch) {
    return resolveEffectTarget(actor, 'derived', derivedMatch[1], { allowRawFallback: true, rawPath: normalizedKey });
  }

  const armourMatch = normalizedKey.match(/^brp\.targets\.armour\.(.+)$/);
  if (armourMatch) {
    return resolveEffectTarget(actor, 'armour', armourMatch[1], { allowRawFallback: true, rawPath: normalizedKey });
  }

  const resourceMatch = normalizedKey.match(/^brp\.targets\.resource\.(.+)$/);
  if (resourceMatch) {
    return resolveEffectTarget(actor, 'resource', resourceMatch[1], { allowRawFallback: true, rawPath: normalizedKey });
  }

  const legacySkillCategoryMatch = normalizedKey.match(/^system\.skillcategory\.(.+)$/);
  if (legacySkillCategoryMatch) {
    return resolveEffectTarget(actor, 'skill-category', legacySkillCategoryMatch[1], { allowRawFallback: true, rawPath: normalizedKey });
  }

  const legacyStatMatch = normalizedKey.match(/^system\.stats\.([^.]+)\.effects$/);
  if (legacyStatMatch) {
    return resolveEffectTarget(actor, 'characteristic', legacyStatMatch[1], { allowRawFallback: true, rawPath: normalizedKey });
  }

  const metadataMatch = matchTargetByMetadata(actor, metadata);
  if (metadataMatch) return metadataMatch;

  return createRawTargetEntry(normalizedKey);
}

export function sanitizeEffectTargetCategoryId(value) {
  return sanitizeEffectTargetType(value);
}

function matchTargetByMetadata(actor, metadata = {}) {
  const categoryId = sanitizeEffectTargetCategoryId(metadata.targetType);
  const label = String(metadata.targetLabel ?? '').trim().toLowerCase();
  if (!categoryId || !label) return null;

  return getEffectTargetRegistry(actor).find(entry =>
    entry.categoryId === categoryId
    && entry.label.toLowerCase() === label
  ) ?? null;
}

function buildSpecificSkillTargets(actor) {
  const skills = Array.from(actor?.items ?? [])
    .filter(item => item?.type === 'skill');

  return skills.map(skill => {
    const targetId = getDocumentTargetId(skill);
    return createStaticTarget(
      'specific-skill',
      targetId,
      `${TARGET_KEY_PREFIX}.skill.${targetId}`,
      null,
      skill.name,
      {
        kind: 'specific-skill',
        itemId: skill.id,
        brpid: getBrpId(skill)
      }
    );
  });
}

function mergeSkillCategoryTargets(actor) {
  const categoryMap = new Map(DEFAULT_SKILL_CATEGORY_TARGETS.map(entry => [entry.targetId, entry]));

  for (const skillCategory of Array.from(actor?.items ?? []).filter(item => item?.type === 'skillcat')) {
    const targetId = getDocumentTargetId(skillCategory);
    categoryMap.set(targetId, createStaticTarget(
      'skill-category',
      targetId,
      `${TARGET_KEY_PREFIX}.skill-category.${targetId}`,
      null,
      skillCategory.name,
      {
        kind: 'skill-category',
        itemId: skillCategory.id,
        brpid: getBrpId(skillCategory)
      }
    ));
  }

  return Array.from(categoryMap.values());
}

function createStaticTarget(categoryId, targetId, key, labelKey, fallbackLabel, projection) {
  return {
    categoryId,
    targetId,
    key,
    labelKey,
    fallbackLabel,
    projection
  };
}

function materializeTargetEntry(entry, actor) {
  return {
    ...entry,
    actor,
    label: entry.fallbackLabel && !entry.labelKey
      ? entry.fallbackLabel
      : localizeText(entry.labelKey, entry.fallbackLabel || entry.targetId)
  };
}

function createRawTargetEntry(key) {
  return {
    categoryId: 'other',
    targetId: 'raw',
    key: String(key ?? '').trim(),
    label: String(key ?? '').trim(),
    labelKey: null,
    fallbackLabel: String(key ?? '').trim(),
    projection: {
      kind: 'raw-path',
      path: String(key ?? '').trim()
    }
  };
}

function getBrpId(document) {
  return String(document?.flags?.brp?.brpidFlag?.id ?? '').trim();
}

function getDocumentTargetId(document) {
  return getBrpId(document) || String(document?.id ?? '').trim();
}

function localizeText(key, fallback = '') {
  if (!key) return fallback;
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
}
