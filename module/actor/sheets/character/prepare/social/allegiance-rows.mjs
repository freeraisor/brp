import {
  addImproveForItem,
  clampProgressValue,
  compareBoolean,
  compareNumber,
  compareText,
  createEmbeddedItemAction,
  createSocialAction,
  createSocialRowKey,
  displayValue,
  getAllegianceDisplayRank,
  numberOrZero,
  percentDisplay,
  resolveEnemyAllegiance,
  stringValue
} from './shared.mjs';

export function prepareAllegianceItem(item, state) {
  item.system.rank = getAllegianceDisplayRank(item);
  state.allegiances.push(item);
  addImproveForItem(item, state.improve, false);
}

export function buildAllegianceRows(items, primaryAllegiance) {
  const itemsById = new Map(items.map(item => [item.id, item]));
  const rows = items.map(item => {
    const total = numberOrZero(item.system?.total);
    const enemy = resolveEnemyAllegiance(item, itemsById);
    const enemyFallback = stringValue(item.system?.opposeAlleg);
    const rowKey = createSocialRowKey('allegiance', item.id);

    return {
      id: item.id,
      rowKey,
      itemId: item.id,
      documentClass: 'Item',
      type: item.type,
      item,
      name: item.name,
      total,
      totalDisplay: percentDisplay(total),
      totalBarPercent: clampProgressValue(total),
      displayTitle: displayValue(item.system?.allegTitle),
      displayRank: displayValue(getAllegianceDisplayRank(item)),
      isPrimary: item.id === primaryAllegiance,
      isTranscendent: total >= 75,
      improve: Boolean(item.system?.improve),
      enemy: {
        linked: Boolean(enemy),
        itemId: enemy?.id ?? '',
        name: enemy?.name ?? enemyFallback,
        displayName: displayValue(enemy?.name ?? enemyFallback),
        total: enemy ? numberOrZero(enemy.system?.total) : null,
        totalDisplay: enemy ? percentDisplay(enemy.system?.total) : '-'
      },
      actions: {
        open: createEmbeddedItemAction(item.id),
        menu: createSocialAction('socialSectionMenu', { sectionId: 'allegiance', itemId: item.id }),
        roll: createSocialAction('allegianceRoll', { itemId: item.id }),
        primary: createSocialAction('socialPrimaryAllegianceToggle', { itemId: item.id }),
        toggle: createSocialAction('socialRowToggle', { rowKey }),
        improve: createSocialAction('socialImproveToggle', { socialTrack: 'allegiance', itemId: item.id }),
        increase: createSocialAction('socialAdjustValue', { socialTrack: 'allegiance', itemId: item.id, direction: 'increase' }),
        decrease: createSocialAction('socialAdjustValue', { socialTrack: 'allegiance', itemId: item.id, direction: 'decrease' })
      }
    };
  });

  rows.sort((left, right) =>
    compareBoolean(right.isPrimary, left.isPrimary)
    || compareNumber(right.total, left.total)
    || compareText(left.name, right.name)
  );

  return rows;
}
