import { normalizeSectionStateMap } from '../../character-sheet-utils.mjs';

export const SECTION_ORDER = ['allegiance', 'reputation', 'contacts', 'factions'];

const DEFAULT_VISIBILITY = {
  allegiance: true,
  reputation: true,
  contacts: true,
  factions: true
};

const REPUTATION_CATEGORY_ORDER = {
  reputation: 0,
  honor: 1,
  status: 2
};

const CONTACT_RELATION_ORDER = {
  ally: 0,
  friend: 1,
  neutral: 2,
  suspect: 3,
  enemy: 4
};

export function createSectionView({
  id,
  label,
  visible,
  collapsed,
  rulesEnabled,
  disabledReason,
  createAction = null,
  linkAction = null,
  canCreate = false,
  canLink = false,
  createDisabledReason = '',
  linkDisabledReason = '',
  emptyText = '',
  rows = []
}) {
  return {
    id,
    label,
    visible,
    collapsed,
    rulesEnabled,
    disabledReason,
    count: rows.length,
    hasRows: rows.length > 0,
    emptyText,
    createAction,
    linkAction,
    canCreate,
    canLink,
    createDisabledReason,
    linkDisabledReason,
    rows
  };
}

export function createDocAction(type) {
  return {
    action: 'createDoc',
    documentClass: 'Item',
    type
  };
}

export function createEmbeddedItemAction(itemId) {
  return {
    action: 'viewDoc',
    itemId,
    documentClass: 'Item'
  };
}

export function createSocialAction(action, data = {}) {
  return {
    action,
    ...data
  };
}

export function createSocialRowKey(track, id) {
  return `${track}-${String(id ?? '').trim()}`;
}

export function getSocialSheetFlags(context) {
  return context.actor?.getFlag?.('brp', 'sheet')?.social
    ?? context.flags?.brp?.sheet?.social
    ?? {};
}

export function buildSectionVisibility(sectionVisibility) {
  return SECTION_ORDER.reduce((visibility, sectionId) => {
    visibility[sectionId] = readStoredBoolean(sectionVisibility?.[sectionId], DEFAULT_VISIBILITY[sectionId]);
    return visibility;
  }, {});
}

export function buildCollapsedSectionsState(collapsedSections, options = {}) {
  return normalizeSectionStateMap(SECTION_ORDER, collapsedSections, {
    fallback: false,
    ...options
  });
}

export function sanitizePrimaryAllegiance(primaryAllegiance, allegiances) {
  const value = stringValue(primaryAllegiance);
  if (!value) return '';
  return allegiances.some(item => item.id === value) ? value : '';
}

export async function resolveLinkedActor(uuid, cache) {
  const key = stringValue(uuid);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  let document = null;
  try {
    document = await fromUuid(key);
  } catch (error) {
    console.warn(`BRP | Failed to resolve linked actor (${key})`, error);
    cache.set(key, null);
    return null;
  }

  const actor = document instanceof Actor ? document : null;
  cache.set(key, actor);
  return actor;
}

export async function resolveFactionItem(uuid, cache) {
  const key = stringValue(uuid);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  let document = null;
  try {
    document = await fromUuid(key);
  } catch (error) {
    console.warn(`BRP | Failed to resolve faction item (${key})`, error);
    cache.set(key, null);
    return null;
  }

  const faction = document instanceof Item && document.type === 'faction' ? document : null;
  cache.set(key, faction);
  return faction;
}

export function resolveEnemyAllegiance(item, itemsById) {
  const enemyId = stringValue(item.system?.enemyId);
  if (!enemyId || enemyId === item.id) return null;

  const enemy = itemsById.get(enemyId);
  return enemy?.type === 'allegiance' ? enemy : null;
}

export function normalizeFactionMemberships(memberships) {
  if (!Array.isArray(memberships)) return [];

  return memberships.map((entry, index) => {
    const source = entry && typeof entry === 'object' ? entry : {};
    return {
      index,
      uuid: stringValue(source.uuid),
      role: stringValue(source.role),
      rank: stringValue(source.rank),
      reputationWithin: numberOrNull(source.reputationWithin),
      notes: stringValue(source.notes),
      sort: numberOrNull(source.sort),
      improve: readStoredBoolean(source.improve, false)
    };
  }).filter(entry =>
    entry.uuid
    || entry.role
    || entry.rank
    || entry.notes
    || entry.reputationWithin != null
    || entry.improve
  );
}

export function getAllegianceDisplayRank(item) {
  const manualRank = stringValue(item.system?.rankText);
  if (manualRank) return manualRank;
  if (item.system?.allegApoth) return game.i18n.localize('BRP.allegApoth');
  if (item.system?.allegAllied) return game.i18n.localize('BRP.allegAllied');
  return stringValue(item.system?.rank);
}

export function getReputationCategoryLabel(category) {
  const keys = {
    reputation: 'BRP.socialCategoryReputation',
    honor: 'BRP.socialCategoryHonor',
    status: 'BRP.socialCategoryStatus'
  };
  return localizeText(keys[category], category);
}

export function getContactRelationLabel(relation) {
  const keys = {
    ally: 'BRP.contactRelationAlly',
    friend: 'BRP.contactRelationFriend',
    neutral: 'BRP.contactRelationNeutral',
    suspect: 'BRP.contactRelationSuspect',
    enemy: 'BRP.contactRelationEnemy'
  };
  return localizeText(keys[relation], relation);
}

export function getReputationDisabledReason(reputationMode) {
  return reputationMode > 0 ? '' : game.i18n.localize('BRP.noRep');
}

export function getReputationCreateDisabledReason(reputationMode, reputationCount) {
  if (reputationMode < 1) return game.i18n.localize('BRP.noRep');
  if (reputationMode === 1 && reputationCount > 0) return game.i18n.localize('BRP.oneRep');
  return '';
}

export function canCreateReputation(reputationMode, reputationCount) {
  return reputationMode > 0 && !(reputationMode === 1 && reputationCount > 0);
}

export function compareFactionRows(left, right) {
  const leftHasSort = left.sort != null;
  const rightHasSort = right.sort != null;
  if (leftHasSort || rightHasSort) {
    if (leftHasSort && rightHasSort) {
      return compareNumber(left.sort, right.sort)
        || compareNumber(numberOrZero(right.reputationWithin), numberOrZero(left.reputationWithin))
        || compareText(left.name, right.name);
    }
    return leftHasSort ? -1 : 1;
  }

  return compareNumber(numberOrZero(right.reputationWithin), numberOrZero(left.reputationWithin))
    || compareText(left.name, right.name);
}

export function normalizeReputationCategory(category) {
  const value = stringValue(category).toLowerCase();
  return Object.hasOwn(REPUTATION_CATEGORY_ORDER, value) ? value : 'reputation';
}

export function normalizeContactRelation(relation) {
  const value = stringValue(relation).toLowerCase();
  return Object.hasOwn(CONTACT_RELATION_ORDER, value) ? value : 'neutral';
}

export function buildInitials(name) {
  const parts = stringValue(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

export function addImproveForItem(item, improve, opp) {
  if (!item.system?.improve) return;

  addImprove(improve, {
    item,
    name: item.name,
    score: item.system?.total,
    opp
  });
}

export function addImprove(improve, { item, name, score, opp }) {
  improve.push({
    _id: item._id,
    name,
    typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
    score,
    opp
  });
}

export function sortByName(items) {
  return items.sort((left, right) => compareText(left.name, right.name));
}

export function readStoredBoolean(value, fallback) {
  if (value === undefined) return fallback;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  return Boolean(value);
}

export function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

export function compareNumber(left, right) {
  const safeLeft = Number(left ?? 0);
  const safeRight = Number(right ?? 0);
  if (safeLeft < safeRight) return -1;
  if (safeLeft > safeRight) return 1;
  return 0;
}

export function compareBoolean(left, right) {
  return compareNumber(Boolean(left), Boolean(right));
}

export function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function stringValue(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

export function displayValue(value) {
  const text = stringValue(value);
  return text || EMPTY_DISPLAY;
}

export function percentDisplay(value) {
  return `${numberOrZero(value)}%`;
}

export function clampProgressValue(value) {
  return Math.max(0, Math.min(100, numberOrZero(value)));
}

export function stripHtml(value = '') {
  return String(value ?? '').replace(/(<([^>]+)>)/g, '').trim();
}

export function localizeText(key, fallback = '') {
  if (!key) return fallback;
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
}

const EMPTY_DISPLAY = '-';
