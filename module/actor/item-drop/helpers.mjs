export function getItemBrpid(item) {
  return String(item?.flags?.brp?.brpidFlag?.id ?? '').trim();
}

export function findActorItemByBrpid(actor, brpid, { type = null } = {}) {
  const normalizedBrpid = String(brpid ?? '').trim();
  if (!normalizedBrpid) return null;

  return actor.items.find(item => {
    if (type && item.type !== type) return false;
    return getItemBrpid(item) === normalizedBrpid;
  }) ?? null;
}

export function hasActorItemByBrpid(actor, brpid, options = {}) {
  return Boolean(findActorItemByBrpid(actor, brpid, options));
}

export function hasPendingItemByBrpid(items, brpid, { type = null } = {}) {
  const normalizedBrpid = String(brpid ?? '').trim();
  if (!normalizedBrpid) return false;

  return items.some(item => {
    if (type && item.type !== type) return false;
    return getItemBrpid(item) === normalizedBrpid;
  });
}

export function isDuplicateActorItem(actor, item, type = item?.type) {
  const brpid = getItemBrpid(item);
  if (!brpid) return false;
  return hasActorItemByBrpid(actor, brpid, { type });
}

export function duplicateItemMessage(item) {
  return `${item.name}(${getItemBrpid(item)}): ${game.i18n.localize('BRP.dupItem')}`;
}

export function directDropBlockedMessage(item) {
  return `${game.i18n.localize(`BRP.${item.type}`)}(${item.name}): ${game.i18n.localize('BRP.noDirectDrop')}`;
}

export function requiredPowerMessage(item) {
  return `${item.name} : ${game.i18n.localize('BRP.needPower')} (${game.i18n.localize(`BRP.${item.type}`)})`;
}

export function rejectDrop(message) {
  return {
    allowed: false,
    message
  };
}

export function acceptDrop(item, additions = []) {
  return {
    allowed: true,
    item,
    additions
  };
}

export async function loadBestItemByBrpid(brpid) {
  const matches = await game.system.api.brpid.fromBRPIDBest({ brpid });
  return matches?.[0] ?? null;
}

export async function loadItemsByRegex(options) {
  return game.system.api.brpid.fromBRPIDRegexBest(options);
}

export function cloneItemData(item) {
  return foundry.utils.duplicate(item);
}
