import BRPDialog from '../../../setup/brp-dialog.mjs';
import { BRPContextMenu } from '../../../setup/context-menu.mjs';
import { DEFAULT_SKILL_SORT_MODE, SKILL_SORT_MODES } from './prepare/skills.mjs';
import {
  captureRefreshWorkspaceScroll,
  getTargetElement,
  persistUiMapFlag,
  restoreRefreshWorkspaceScrollSoon
} from './character-sheet-utils.mjs';

export const SKILL_SHEET_ACTIONS = {
  skillSortCycle: onSkillSortCycle,
  skillCategoryToggle: onSkillCategoryToggle,
  skillFavoriteToggle: onSkillFavoriteToggle,
  skillImproveToggle: onSkillImproveToggle,
  skillDescriptionToggle: onSkillDescriptionToggle,
  skillDuplicate: onSkillDuplicate,
  skillDelete: onSkillDelete
};

export const skillSheetMethods = {
  _bindSkillSearch() {
    const searchInput = this.element.querySelector('.brp-skill-search-input');
    if (!searchInput) return;

    searchInput.value = this._skillSearchQuery ?? '';
    searchInput.addEventListener('input', event => {
      this._skillSearchQuery = event.currentTarget.value;
      this._applySkillSearch();
    });
    this._applySkillSearch();
  },

  _applySkillSearch() {
    const groupsElement = this.element.querySelector('.brp-skill-groups');
    if (!groupsElement) return;

    const query = (this._skillSearchQuery ?? '').trim().toLowerCase();
    groupsElement.classList.toggle('is-searching', query.length > 0);

    for (const group of groupsElement.querySelectorAll('.brp-skill-group')) {
      let groupHasMatch = query.length === 0;

      for (const row of group.querySelectorAll('.brp-skill-refresh-row')) {
        const searchText = (row.dataset.searchText || row.textContent || '').toLowerCase();
        const rowMatches = query.length === 0 || searchText.includes(query);
        row.classList.toggle('is-search-hidden', !rowMatches);
        groupHasMatch = groupHasMatch || rowMatches;
      }

      group.classList.toggle('has-search-match', query.length > 0 && groupHasMatch);
      group.classList.toggle('is-search-hidden', !groupHasMatch);
    }
  },

  _bindSkillContextMenu() {
    if (!this.element.querySelector('.brp-skill-refresh-row')) return;

    new BRPContextMenu(this.element, '.brp-skill-refresh-row', [], {
      jQuery: false,
      onOpen: target => {
        ui.context.menuItems = this._getSkillContextOptions(target);
      }
    });
  },

  _getSkillContextOptions(target) {
    const item = getSkillItemFromTarget(this.actor, target);
    if (!item) return [];

    const isFavorite = Boolean(item.flags?.brp?.sheet?.favorite);
    return [
      {
        name: 'BRP.skillContextView',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: () => item.sheet.render(true)
      },
      {
        name: isFavorite ? 'BRP.skillContextUnfavorite' : 'BRP.skillContextFavorite',
        icon: '<i class="fas fa-star fa-fw"></i>',
        callback: listItem => updateSkillFavorite(this, listItem ?? target, item, !isFavorite)
      },
      {
        name: 'BRP.skillContextDuplicate',
        icon: '<i class="fas fa-copy fa-fw"></i>',
        callback: listItem => duplicateSkillFromTarget(this.actor, listItem)
      },
      {
        name: 'BRP.skillContextDelete',
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: listItem => deleteSkillFromTarget(this.actor, listItem)
      }
    ];
  },

  _bindSkillCategoryOrdering() {
    const groupsElement = this.element.querySelector('.brp-skill-groups');
    if (!groupsElement) return;

    groupsElement.querySelectorAll('[data-category-order-drag]').forEach(handle => {
      handle.addEventListener('dragstart', this._onSkillCategoryDragStart.bind(this));
      handle.addEventListener('dragend', this._onSkillCategoryDragEnd.bind(this));
    });

    groupsElement.querySelectorAll('.brp-skill-group').forEach(group => {
      group.addEventListener('dragover', this._onSkillCategoryDragOver.bind(this));
      group.addEventListener('dragleave', this._onSkillCategoryDragLeave.bind(this));
      group.addEventListener('drop', this._onSkillCategoryDrop.bind(this));
    });
  },

  _onSkillCategoryDragStart(event) {
    const categoryId = event.currentTarget.dataset.categoryOrderDrag;
    if (!categoryId) return;

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-brp-skill-category', categoryId);
  },

  _onSkillCategoryDragEnd() {
    this.element.querySelectorAll('.brp-skill-group.is-drop-target').forEach(group => {
      group.classList.remove('is-drop-target');
    });
  },

  _onSkillCategoryDragOver(event) {
    if (!isSkillCategoryDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('is-drop-target');
  },

  _onSkillCategoryDragLeave(event) {
    event.currentTarget.classList.remove('is-drop-target');
  },

  async _onSkillCategoryDrop(event) {
    if (!isSkillCategoryDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('is-drop-target');

    const sourceCategoryId = event.dataTransfer.getData('application/x-brp-skill-category');
    const targetCategoryId = event.currentTarget.dataset.categoryId;
    if (!sourceCategoryId || !targetCategoryId || sourceCategoryId === targetCategoryId) return;

    const categoryOrder = Array.from(this.element.querySelectorAll('.brp-skill-group'))
      .map(group => group.dataset.categoryId)
      .filter(Boolean);
    const sourceIndex = categoryOrder.indexOf(sourceCategoryId);
    const targetIndex = categoryOrder.indexOf(targetCategoryId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    categoryOrder.splice(sourceIndex, 1);
    categoryOrder.splice(targetIndex, 0, sourceCategoryId);

    await this.actor.update({ 'flags.brp.sheet.skillCategoryOrder': categoryOrder });
  }
};

async function onSkillSortCycle(event, target) {
  event.preventDefault();

  const currentMode = target.dataset.sortMode || this.actor.getFlag('brp', 'sheet')?.skillSortMode || DEFAULT_SKILL_SORT_MODE;
  const currentIndex = SKILL_SORT_MODES.indexOf(currentMode);
  const nextMode = SKILL_SORT_MODES[(currentIndex + 1) % SKILL_SORT_MODES.length] ?? DEFAULT_SKILL_SORT_MODE;

  await this.actor.update({ 'flags.brp.sheet.skillSortMode': nextMode });
}

async function onSkillCategoryToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const group = target.closest('.brp-skill-group');
  const categoryId = target.dataset.categoryId || group?.dataset.categoryId;
  if (!categoryId) return;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  const storedCollapsed = Boolean(this.actor.getFlag('brp', 'sheet')?.collapsedSkillCategories?.[categoryId]);
  const isCollapsed = group?.classList.contains('is-collapsed') ?? storedCollapsed;
  const nextCollapsed = !isCollapsed;
  group?.classList.toggle('is-collapsed', nextCollapsed);

  try {
    await persistUiMapFlag(this.actor, 'flags.brp.sheet.collapsedSkillCategories', categoryId, nextCollapsed);
  } catch (error) {
    group?.classList.toggle('is-collapsed', isCollapsed);
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onSkillFavoriteToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const item = getSkillItemFromTarget(this.actor, target);
  if (!item) return;

  await updateSkillFavorite(this, target, item, !Boolean(item.flags?.brp?.sheet?.favorite));
}

async function onSkillImproveToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const item = getSkillItemFromTarget(this.actor, target);
  if (!item) return;

  await updateSkillImprove(this, target, item, !Boolean(item.system?.improve));
}

async function onSkillDescriptionToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const row = getTargetElement(target)?.closest?.('.brp-skill-refresh-row');
  const description = row?.querySelector('.brp-skill-description');
  const itemId = row?.dataset.itemId;
  if (!description || !itemId) return;

  const isOpen = !row.classList.contains('is-description-open');
  row.classList.toggle('is-description-open', isOpen);
  target.classList.toggle('is-active', isOpen);
  description.hidden = !isOpen;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await persistUiMapFlag(this.actor, 'flags.brp.sheet.expandedSkillDescriptions', itemId, isOpen);
  } catch (error) {
    row.classList.toggle('is-description-open', !isOpen);
    target.classList.toggle('is-active', !isOpen);
    description.hidden = isOpen;
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onSkillDuplicate(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await duplicateSkillFromTarget(this.actor, target);
}

async function onSkillDelete(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await deleteSkillFromTarget(this.actor, target);
}

function getSkillItemFromTarget(actor, target) {
  const element = getTargetElement(target);
  const row = element?.closest?.('.item');
  const item = actor.items.get(row?.dataset.itemId);
  return item?.type === 'skill' ? item : null;
}

async function updateSkillFavorite(sheet, target, item, isFavorite) {
  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  updateSkillFavoriteMarkup(target, isFavorite);

  try {
    await item.update({ 'flags.brp.sheet.favorite': isFavorite }, { render: false, renderSheet: false });
  } catch (error) {
    updateSkillFavoriteMarkup(target, !isFavorite);
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function updateSkillImprove(sheet, target, item, isImproving) {
  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  updateSkillImproveMarkup(target, isImproving);

  try {
    await item.update({ 'system.improve': isImproving }, { render: false, renderSheet: false });
  } catch (error) {
    updateSkillImproveMarkup(target, !isImproving);
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

function updateSkillFavoriteMarkup(target, isFavorite) {
  const element = getTargetElement(target);
  const row = element?.closest?.('.brp-skill-refresh-row');
  const favorite = row?.querySelector('.brp-skill-favorite');
  const icon = favorite?.querySelector('i');

  row?.classList.toggle('is-favorite', isFavorite);
  favorite?.classList.toggle('is-active', isFavorite);
  icon?.classList.toggle('fas', isFavorite);
  icon?.classList.toggle('far', !isFavorite);
}

function updateSkillImproveMarkup(target, isImproving) {
  const element = getTargetElement(target);
  const row = element?.closest?.('.brp-skill-refresh-row');
  const improve = row?.querySelector('.brp-skill-improve');
  const icon = improve?.querySelector('i');

  row?.classList.toggle('is-improving', isImproving);
  improve?.classList.toggle('is-active', isImproving);
  icon?.classList.toggle('fa-square-check', isImproving);
  icon?.classList.toggle('fa-square', !isImproving);
}

async function duplicateSkillFromTarget(actor, target) {
  const item = getSkillItemFromTarget(actor, target);
  if (!item) return;

  const data = item.toObject();
  delete data._id;
  data.name = game.i18n.format('BRP.copyOf', { name: item.name });

  await actor.createEmbeddedDocuments('Item', [data], { renderSheet: false });
}

async function deleteSkillFromTarget(actor, target) {
  const item = getSkillItemFromTarget(actor, target);
  if (!item) return;

  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize('BRP.deleteItem') },
    content: `${game.i18n.localize('BRP.deleteConfirm')}<br><strong> ${item.name}</strong>`
  });
  if (!confirmation) return;

  await item.delete();
}

function isSkillCategoryDrag(event) {
  return Array.from(event.dataTransfer?.types ?? []).includes('application/x-brp-skill-category');
}
