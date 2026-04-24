import {
  addImproveForItem,
  clampProgressValue,
  compareNumber,
  compareText,
  createEmbeddedItemAction,
  createSocialAction,
  createSocialRowKey,
  displayValue,
  getReputationCategoryLabel,
  normalizeReputationCategory,
  numberOrZero,
  percentDisplay
} from './shared.mjs';

const REPUTATION_CATEGORY_SORT = {
  reputation: 0,
  honor: 1,
  status: 2
};

export function prepareReputationItem(item, state) {
  if (item.system.total == null) item.system.total = item.system.base;
  state.reputations.push(item);
  addImproveForItem(item, state.improve, false);
}

export function buildReputationRows(items) {
  const rows = items.map(item => {
    const category = normalizeReputationCategory(item.system?.category);
    const total = numberOrZero(item.system?.total ?? item.system?.base);
    const rowKey = createSocialRowKey('reputation', item.id);

    return {
      id: item.id,
      rowKey,
      itemId: item.id,
      documentClass: 'Item',
      type: item.type,
      item,
      name: item.name,
      category,
      categoryLabel: getReputationCategoryLabel(category),
      scope: item.system?.scope ?? '',
      displayScope: displayValue(item.system?.scope),
      total,
      totalDisplay: percentDisplay(total),
      totalBarPercent: clampProgressValue(total),
      improve: Boolean(item.system?.improve),
      actions: {
        open: createEmbeddedItemAction(item.id),
        menu: createSocialAction('socialSectionMenu', { sectionId: 'reputation', itemId: item.id }),
        roll: createSocialAction('reputationRoll', { itemId: item.id }),
        toggle: createSocialAction('socialRowToggle', { rowKey }),
        improve: createSocialAction('socialImproveToggle', { socialTrack: 'reputation', itemId: item.id }),
        increase: createSocialAction('socialAdjustValue', { socialTrack: 'reputation', itemId: item.id, direction: 'increase' }),
        decrease: createSocialAction('socialAdjustValue', { socialTrack: 'reputation', itemId: item.id, direction: 'decrease' })
      }
    };
  });

  rows.sort((left, right) =>
    compareNumber(REPUTATION_CATEGORY_SORT[left.category] ?? 99, REPUTATION_CATEGORY_SORT[right.category] ?? 99)
    || compareNumber(right.total, left.total)
    || compareText(left.name, right.name)
  );

  return rows;
}
