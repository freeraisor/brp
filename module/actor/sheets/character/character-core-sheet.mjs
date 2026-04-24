import BRPDialog from '../../../setup/brp-dialog.mjs';
import { BRPContextMenu } from '../../../setup/context-menu.mjs';
import { BRPActorSheetV2 } from '../base-actor-sheet.mjs';
import { CHARACTER_SECTION_IDS } from './character-sheet-config.mjs';
import {
  captureRefreshWorkspaceScroll,
  escapeHTML,
  getTargetElement,
  normalizeSectionStateMap,
  numberOrZero,
  restoreRefreshWorkspaceScrollSoon
} from './character-sheet-utils.mjs';

export const CHARACTER_CORE_SHEET_ACTIONS = {
  characterSectionToggle: onCharacterSectionToggle,
  characteristicToggle: onCharacteristicToggle,
  characterCustomFieldAdd: onCharacterCustomFieldAdd,
  characterCustomFieldEdit: onCharacterCustomFieldEdit,
  characterCustomFieldDelete: onCharacterCustomFieldDelete,
  characterCustomFieldReorder: onCharacterCustomFieldReorder
};

export const characterCoreSheetMethods = {
  _bindCharacterCoreContextMenu() {
    const selector = '.brp-character-refresh-core-card[data-item-id]';
    if (!this.element.querySelector(selector)) return;

    new BRPContextMenu(this.element, selector, [], {
      jQuery: false,
      onOpen: target => {
        ui.context.menuItems = this._getCharacterCoreContextOptions(target);
      }
    });

    this.element.querySelectorAll('.brp-character-refresh-core-menu').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();

        const card = event.currentTarget.closest(selector);
        if (!card) return;

        const rect = event.currentTarget.getBoundingClientRect();
        card.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          view: globalThis.window,
          clientX: rect.right,
          clientY: rect.bottom
        }));
      });
    });

    this.element.querySelectorAll(selector).forEach(card => {
      card.addEventListener('dblclick', event => {
        if (event.target.closest('.brp-character-refresh-core-actions')) return;
        const item = getCharacterCoreItemFromTarget(this.actor, event.currentTarget);
        item?.sheet?.render(true);
      });
    });
  },

  _getCharacterCoreContextOptions(target) {
    const card = getCharacterCoreCardFromTarget(target);
    const item = getCharacterCoreItemFromTarget(this.actor, target);
    if (!card || !item) return [];

    const options = [
      {
        name: 'BRP.view',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: () => item.sheet.render(true)
      }
    ];

    if (card.dataset.removeAction) {
      options.push({
        name: getCharacterCoreRemoveLabel(card.dataset.removeAction),
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: listItem => this._removeCharacterCoreCard(listItem ?? target)
      });
    }

    return options;
  },

  async _removeCharacterCoreCard(target) {
    const card = getCharacterCoreCardFromTarget(target);
    const removeAction = card?.dataset.removeAction;

    if (removeAction === 'deleteProfession') return BRPActorSheetV2._deleteProfession.call(this, null, card);
    if (removeAction === 'deleteCulture') return BRPActorSheetV2._deleteCulture.call(this, null, card);
    if (removeAction === 'deletePersonality') return BRPActorSheetV2._deletePersonality.call(this, null, card);
  },

  _bindCharacterCustomFieldDragDrop() {
    const root = this.element.querySelector('.brp-character-refresh-custom-fields');
    if (!root) return;

    root.querySelectorAll('[data-custom-field-drag]').forEach(handle => {
      handle.addEventListener('dragstart', this._onCharacterCustomFieldDragStart.bind(this));
      handle.addEventListener('dragend', this._onCharacterCustomFieldDragEnd.bind(this));
    });

    root.querySelectorAll('.brp-character-refresh-custom-card').forEach(card => {
      card.addEventListener('dragover', this._onCharacterCustomFieldDragOver.bind(this));
      card.addEventListener('dragleave', this._onCharacterCustomFieldDragLeave.bind(this));
      card.addEventListener('drop', this._onCharacterCustomFieldDrop.bind(this));
    });
  },

  _onCharacterCustomFieldDragStart(event) {
    const card = event.currentTarget.closest('.brp-character-refresh-custom-card');
    const fieldId = card?.dataset.customFieldId;
    if (!fieldId) return;

    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-brp-character-custom-field', fieldId);
    card.classList.add('is-dragging');
  },

  _onCharacterCustomFieldDragEnd() {
    this.element.querySelectorAll('.brp-character-refresh-custom-card.is-dragging, .brp-character-refresh-custom-card.is-drop-target').forEach(card => {
      card.classList.remove('is-dragging', 'is-drop-target');
    });
  },

  _onCharacterCustomFieldDragOver(event) {
    if (!isCharacterCustomFieldDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('is-drop-target');
  },

  _onCharacterCustomFieldDragLeave(event) {
    event.currentTarget.classList.remove('is-drop-target');
  },

  async _onCharacterCustomFieldDrop(event) {
    if (!isCharacterCustomFieldDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('is-drop-target');

    const sourceFieldId = event.dataTransfer.getData('application/x-brp-character-custom-field');
    const targetFieldId = event.currentTarget.dataset.customFieldId;
    if (!sourceFieldId || !targetFieldId || sourceFieldId === targetFieldId) return;

    const fieldOrder = Array.from(this.element.querySelectorAll('.brp-character-refresh-custom-card'))
      .map(card => card.dataset.customFieldId)
      .filter(Boolean);
    const sourceIndex = fieldOrder.indexOf(sourceFieldId);
    const targetIndex = fieldOrder.indexOf(targetFieldId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    fieldOrder.splice(sourceIndex, 1);
    fieldOrder.splice(targetIndex, 0, sourceFieldId);

    const scrollTop = captureRefreshWorkspaceScroll(this, event.currentTarget);
    try {
      const fields = getCharacterCustomFields(this.actor);
      await this.actor.update({ 'system.customFields': reorderCharacterCustomFields(fields, fieldOrder) });
    } finally {
      restoreRefreshWorkspaceScrollSoon(this, scrollTop);
    }
  }
};

async function onCharacterSectionToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const section = getTargetElement(target)?.closest?.('.brp-character-refresh-section[data-character-section]');
  const sectionId = target.dataset.sectionId || section?.dataset.characterSection;
  if (!section || !sectionId) return;

  const characterFlags = foundry.utils.deepClone(this.actor.getFlag('brp', 'sheet')?.character ?? {});
  const collapsedSections = normalizeSectionStateMap(
    CHARACTER_SECTION_IDS,
    characterFlags.collapsedSections,
    {
      initialized: characterFlags.sectionStateInitialized,
      ignoreAllTrueUnlessInitialized: true
    }
  );
  const isCollapsed = section.classList.contains('is-collapsed');
  const nextCollapsed = !isCollapsed;
  updateCharacterSectionCollapsedMarkup(section, target, nextCollapsed);

  collapsedSections[sectionId] = nextCollapsed;
  characterFlags.collapsedSections = collapsedSections;
  characterFlags.sectionStateInitialized = true;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await this.actor.update({ 'flags.brp.sheet.character': characterFlags }, { render: false, renderSheet: false });
  } catch (error) {
    updateCharacterSectionCollapsedMarkup(section, target, isCollapsed);
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onCharacteristicToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const characteristic = target.dataset.characteristic
    || target.closest('.brp-character-refresh-characteristic-card')?.dataset.characteristic;
  if (!characteristic || !this.actor.system?.stats?.[characteristic]?.visible) return;

  const current = this.actor.getFlag('brp', 'sheet')?.character?.expandedCharacteristic ?? '';
  const next = current === characteristic ? '' : characteristic;
  const scrollTop = captureRefreshWorkspaceScroll(this, target);

  try {
    await this.actor.update({ 'flags.brp.sheet.character.expandedCharacteristic': next });
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onCharacterCustomFieldAdd(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await openCharacterCustomFieldDialog(this, target);
}

async function onCharacterCustomFieldEdit(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const element = getTargetElement(target);
  const fieldId = element?.closest?.('.brp-character-refresh-custom-card')?.dataset.customFieldId;
  if (!fieldId) return;

  await openCharacterCustomFieldDialog(this, target, fieldId);
}

async function onCharacterCustomFieldDelete(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await deleteCharacterCustomFieldFromTarget(this, target);
}

function onCharacterCustomFieldReorder(event) {
  event.preventDefault();
  event.stopPropagation();
}

function getCharacterCoreCardFromTarget(target) {
  return getTargetElement(target)?.closest?.('.brp-character-refresh-core-card');
}

function getCharacterCoreItemFromTarget(actor, target) {
  const card = getCharacterCoreCardFromTarget(target);
  const item = actor.items.get(card?.dataset.itemId);
  return ['profession', 'culture', 'personality'].includes(item?.type) ? item : null;
}

function getCharacterCoreRemoveLabel(removeAction) {
  if (removeAction === 'deleteProfession') return 'BRP.deleteProfession';
  if (removeAction === 'deleteCulture') return 'BRP.deleteCulture';
  if (removeAction === 'deletePersonality') return 'BRP.deletePersonality';
  return 'BRP.remove';
}

function updateCharacterSectionCollapsedMarkup(section, toggle, isCollapsed) {
  section?.classList.toggle('is-collapsed', isCollapsed);
  const body = section?.querySelector?.('.brp-character-refresh-section-body');
  if (body) body.hidden = isCollapsed;
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.dataset.tooltip = game.i18n.localize(isCollapsed ? 'BRP.expand' : 'BRP.collapse');
  }
}

async function openCharacterCustomFieldDialog(sheet, target, fieldId = '') {
  const fields = getCharacterCustomFields(sheet.actor);
  const field = fieldId ? fields.find(entry => entry.id === fieldId) ?? null : null;
  if (fieldId && !field) return;

  const html = `
    <div class="brp brp-dialog-form brp-character-custom-field-dialog">
      <label>
        <span>${game.i18n.localize('BRP.characterCustomFieldTitle')}</span>
        <input type="text" name="title" value="${escapeHTML(field?.title ?? '')}" autocomplete="off" />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.characterCustomFieldContent')}</span>
        <textarea name="content" rows="5">${escapeHTML(field?.content ?? '')}</textarea>
      </label>
    </div>
  `;
  const usage = await BRPDialog.input({
    window: { title: game.i18n.localize(field ? 'BRP.characterCustomFieldEdit' : 'BRP.characterCustomFieldAdd') },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.confirm')
    }
  });
  if (!usage) return;

  const title = String(usage.title ?? '').trim();
  const content = String(usage.content ?? '').trim();
  if (!title && !content) {
    ui.notifications.warn(game.i18n.localize('BRP.characterCustomFieldInvalid'));
    return;
  }

  const nextFields = field
    ? fields.map(entry => entry.id === field.id ? { ...entry, title, content } : entry)
    : [
      ...fields,
      {
        id: createCharacterCustomFieldId(fields),
        title,
        content,
        sortOrder: getNextCharacterCustomFieldSortOrder(fields)
      }
    ];

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  await sheet.actor.update({ 'system.customFields': nextFields });
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
}

async function deleteCharacterCustomFieldFromTarget(sheet, target) {
  const field = getCharacterCustomFieldFromTarget(sheet.actor, target);
  if (!field) return;

  const title = field.title || game.i18n.localize('BRP.characterCustomFieldUntitled');
  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize('BRP.characterCustomFieldDelete') },
    content: game.i18n.format('BRP.characterCustomFieldDeleteConfirm', { title: escapeHTML(title) })
  });
  if (!confirmation) return;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  const nextFields = getCharacterCustomFields(sheet.actor).filter(entry => entry.id !== field.id);
  await sheet.actor.update({ 'system.customFields': nextFields });
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
}

function getCharacterCustomFieldFromTarget(actor, target) {
  const element = getTargetElement(target);
  const fieldId = element?.closest?.('.brp-character-refresh-custom-card')?.dataset.customFieldId;
  if (!fieldId) return null;

  return getCharacterCustomFields(actor).find(field => field.id === fieldId) ?? null;
}

function getCharacterCustomFields(actor) {
  const customFields = Array.isArray(actor.system?.customFields) ? actor.system.customFields : [];
  return customFields
    .map((customField, index) => {
      const source = customField && typeof customField === 'object' ? customField : {};
      const sortOrder = Number(source.sortOrder);
      return {
        field: {
          ...source,
          id: String(source.id || `custom-${index}`),
          title: String(source.title ?? ''),
          content: String(source.content ?? ''),
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : index * 10
        },
        index
      };
    })
    .sort((left, right) => left.field.sortOrder - right.field.sortOrder || left.index - right.index)
    .map(entry => entry.field);
}

function createCharacterCustomFieldId(fields) {
  const existingIds = new Set(fields.map(field => field.id));
  let id = '';
  do {
    const randomId = foundry.utils.randomID?.(8) ?? Math.random().toString(36).slice(2, 10);
    id = `custom-${randomId}`;
  } while (existingIds.has(id));
  return id;
}

function getNextCharacterCustomFieldSortOrder(fields) {
  if (!fields.length) return 0;
  return Math.max(...fields.map(field => numberOrZero(field.sortOrder))) + 10;
}

function reorderCharacterCustomFields(fields, fieldOrder) {
  const fieldsById = new Map(fields.map(field => [field.id, field]));
  const orderSet = new Set(fieldOrder);
  const orderedFields = fieldOrder.map(fieldId => fieldsById.get(fieldId)).filter(Boolean);

  for (const field of fields) {
    if (!orderSet.has(field.id)) orderedFields.push(field);
  }

  return orderedFields.map((field, index) => ({
    ...field,
    sortOrder: (index + 1) * 10
  }));
}

function isCharacterCustomFieldDrag(event) {
  return Array.from(event.dataTransfer?.types ?? []).includes('application/x-brp-character-custom-field');
}
