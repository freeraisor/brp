import BRPDialog from '../../../setup/brp-dialog.mjs';
import { buildEffectBuilderModel } from '../../effects/effect-normalize.mjs';
import {
  normalizeActorEffectChange,
  resolveEffectOriginDocument
} from '../../effects/effect-compatibility.mjs';
import {
  resolveEffectTarget,
  reverseEffectTarget
} from '../../effects/effect-target-registry.mjs';
import {
  buildEffectSheetMetadataUpdate,
  getEffectSheetMetadata,
  getEffectsGroupLabel,
  getEffectsSheetFlags,
  sanitizeEffectsFilter
} from './prepare/effects/shared.mjs';
import {
  captureRefreshWorkspaceScroll,
  cssEscape,
  escapeHTML,
  getTargetElement,
  restoreRefreshWorkspaceScrollSoon
} from './character-sheet-utils.mjs';

const DEFAULT_EFFECT_ICON = 'icons/svg/aura.svg';
const SUPPORTED_BUILDER_EFFECT_MODES = new Set([
  CONST.ACTIVE_EFFECT_MODES.ADD,
  CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
  CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
  CONST.ACTIVE_EFFECT_MODES.UPGRADE,
  CONST.ACTIVE_EFFECT_MODES.DOWNGRADE
]);

export const EFFECTS_SHEET_ACTIONS = {
  effectsFilterSet: onEffectsFilterSet,
  effectsGroupToggle: onEffectsGroupToggle,
  effectsCreate: onEffectsCreate,
  effectsEdit: onEffectsEdit,
  effectsDuplicate: onEffectsDuplicate,
  effectsDelete: onEffectsDelete,
  effectsMenu: onEffectsMenu,
  effectsToggleActive: onEffectsToggleActive,
  effectsToggleHidden: onEffectsToggleHidden,
  effectsModalClose: onEffectsModalClose,
  effectsBuilderToggleAdvanced: onEffectsBuilderToggleAdvanced,
  effectsBuilderSave: onEffectsBuilderSave
};

export const effectsSheetMethods = {
  _bindEffectsControls() {
    const root = getEffectsRoot(this);
    if (!root) return;

    this._effectsContextMenuState = null;

    root.addEventListener('click', event => {
      if (!event.target.closest('.brp-effects-refresh-context-menu, [data-action="effectsMenu"]')) {
        closeEffectsContextMenu(this, root);
      }
    });

    root.querySelectorAll('.brp-effects-refresh-group-header').forEach(header => {
      header.addEventListener('click', event => {
        if (event.target.closest('[data-action]')) return;
        header.querySelector('[data-action="effectsGroupToggle"]')?.click();
      });
    });

    root.querySelectorAll('.brp-effects-refresh-card[data-effects-row-id]').forEach(card => {
      card.addEventListener('dblclick', event => onEffectsCardDoubleClick.call(this, event, event.currentTarget));
      card.addEventListener('contextmenu', event => onEffectsCardContextMenu.call(this, event, event.currentTarget));
    });

    const menu = getEffectsContextMenu(root);
    menu?.querySelectorAll('[data-effects-menu-item]').forEach(item => {
      item.addEventListener('click', event => onEffectsContextMenuItemClick.call(this, event, event.currentTarget));
    });

    const overlay = getEffectsModalOverlay(root);
    overlay?.addEventListener('click', event => {
      if (event.target === overlay) closeEffectsModal(this, root);
    });
    overlay?.addEventListener('input', event => {
      const field = event.target.closest?.('[data-effects-field]');
      if (!field) return;
      onEffectsBuilderFieldInput.call(this, event, field);
    });
    overlay?.addEventListener('change', event => {
      const field = event.target.closest?.('[data-effects-field]');
      if (!field) return;
      onEffectsBuilderFieldInput.call(this, event, field);
    });

    syncEffectsBuilderControls(this, root);
  }
};

async function onEffectsFilterSet(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const nextFilter = sanitizeEffectsFilter(target.dataset.filter);
  const settings = getEffectsSheetFlags(this.actor);
  if (settings.filter === nextFilter) return;

  closeEffectsContextMenu(this);
  closeEffectsModal(this);

  settings.filter = nextFilter;
  settings.stateInitialized = true;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await this.actor.update({ 'flags.brp.sheet.effects': settings }, { render: false, renderSheet: false });
    await this.render(false);
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onEffectsGroupToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const section = getEffectsGroupSection(this, target);
  const groupId = getEffectsGroupId(target);
  if (!section || !groupId) return;

  const wasCollapsed = section.classList.contains('is-collapsed');
  const nextCollapsed = !wasCollapsed;
  updateEffectsGroupMarkup(section, target, nextCollapsed);

  const updateData = {
    'flags.brp.sheet.effects.stateInitialized': true
  };
  if (nextCollapsed) {
    updateData[`flags.brp.sheet.effects.collapsedGroups.${groupId}`] = true;
  } else {
    updateData[`flags.brp.sheet.effects.collapsedGroups.-=${groupId}`] = null;
  }

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await this.actor.update(updateData, { render: false, renderSheet: false });
  } catch (error) {
    updateEffectsGroupMarkup(section, target, wasCollapsed);
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onEffectsCreate(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  closeEffectsContextMenu(this);
  await openEffectsBuilderModal(this, {
    mode: 'create',
    target
  });
}

async function onEffectsEdit(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  const row = resolveEffectsRowFromTarget(this, target);
  if (!row) return;

  closeEffectsContextMenu(this);
  await openEffectsBuilderModal(this, {
    mode: 'edit',
    row,
    target
  });
}

async function onEffectsDuplicate(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  const row = resolveEffectsRowFromTarget(this, target);
  if (!row) return;

  await duplicateEffectsRowChange(this, row, target);
}

async function onEffectsDelete(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  const row = resolveEffectsRowFromTarget(this, target);
  if (!row) return;

  closeEffectsContextMenu(this);
  await deleteEffectsRowChange(this, row, target);
}

function onEffectsMenu(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const row = resolveEffectsRowFromTarget(this, target);
  if (!row) return;
  openEffectsContextMenu(this, row, { anchor: target });
}

async function onEffectsToggleActive(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const effect = getEffectsParentEffect(this, target);
  if (!effect || this.actor.system.lock) return;

  closeEffectsContextMenu(this);

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await effect.update({ disabled: !effect.disabled });
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onEffectsToggleHidden(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  const row = resolveEffectsRowFromTarget(this, target);
  if (!row) return;

  await toggleEffectsRowHidden(this, row, target);
}

function onEffectsModalClose(event, target) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  closeEffectsModal(this, getEffectsRoot(this, target));
}

function onEffectsBuilderToggleAdvanced(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const root = getEffectsRoot(this, target);
  if (!root) return;

  const currentState = this._effectsBuilderState ?? {};
  this._effectsBuilderState = {
    ...currentState,
    isAdvanced: !currentState.isAdvanced
  };
  syncEffectsBuilderControls(this, root);
}

async function onEffectsBuilderSave(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;

  const root = getEffectsRoot(this, target);
  if (!root) return;

  const builderData = readEffectsBuilderSubmission(this, root);
  if (!builderData) return;

  closeEffectsContextMenu(this, root);
  closeEffectsModal(this, root);

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    if (builderData.operation === 'edit') {
      await updateEffectFromBuilder(this, builderData);
    } else {
      await createEffectFromBuilder(this, builderData);
    }
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onEffectsCardDoubleClick(event, row) {
  if (event.target.closest('.brp-effects-refresh-card-actions, .brp-effects-refresh-source-link')) return;
  if (!row?.dataset?.effectId || this.actor.system.lock) return;

  event.preventDefault();
  event.stopPropagation();
  closeEffectsContextMenu(this);
  await openEffectsBuilderModal(this, {
    mode: 'edit',
    row,
    target: row
  });
}

function onEffectsCardContextMenu(event, row) {
  if (!row?.dataset?.effectId) return;

  event.preventDefault();
  event.stopPropagation();
  openEffectsContextMenu(this, row, {
    clientX: event.clientX,
    clientY: event.clientY
  });
}

async function onEffectsContextMenuItemClick(event, item) {
  event.preventDefault();
  event.stopPropagation();

  const row = resolveEffectsRowFromTarget(this, item);
  if (!row) {
    closeEffectsContextMenu(this);
    return;
  }

  switch (item.dataset.effectsMenuItem) {
    case 'edit':
      await onEffectsEdit.call(this, event, row);
      break;
    case 'toggle-hidden':
      await onEffectsToggleHidden.call(this, event, row);
      break;
    case 'duplicate':
      await onEffectsDuplicate.call(this, event, row);
      break;
    case 'open-source':
      closeEffectsContextMenu(this);
      await openEffectsSourceFromRow(this, row);
      break;
    case 'open-effect':
      closeEffectsContextMenu(this);
      openEffectsParentEffectFromRow(this, row);
      break;
    case 'delete':
      await onEffectsDelete.call(this, event, row);
      break;
  }
}

function onEffectsBuilderFieldInput(_event, field) {
  const root = getEffectsRoot(this, field);
  if (!root) return;

  if (field.dataset.effectsField === 'categoryId') {
    syncEffectsBuilderControls(this, root, { keepSelectedTarget: false });
    return;
  }

  if (field.dataset.effectsField === 'durationId') {
    updateEffectsTimerNoteVisibility(root);
  }

  updateEffectsBuilderPreview(this, root);
}

async function openEffectsBuilderModal(sheet, { mode = 'create', row = null, target = null } = {}) {
  const root = getEffectsRoot(sheet, target);
  if (!root) return;

  const initialState = mode === 'edit'
    ? await buildEffectsEditState(sheet, row)
    : buildEffectsCreateState(sheet);
  if (!initialState) return;

  sheet._effectsBuilderState = initialState;
  populateEffectsBuilderForm(root, initialState);
  syncEffectsBuilderControls(sheet, root, {
    keepSelectedTarget: true
  });

  const overlay = getEffectsModalOverlay(root);
  if (!overlay) return;
  overlay.hidden = false;
  root.classList.add('is-effects-modal-open');
  root.querySelector('[data-effects-field="name"]')?.focus?.();
}

function closeEffectsModal(sheet, root = getEffectsRoot(sheet)) {
  const overlay = getEffectsModalOverlay(root);
  if (overlay) overlay.hidden = true;
  root?.classList?.remove('is-effects-modal-open');
  sheet._effectsBuilderState = null;
}

function openEffectsContextMenu(sheet, row, { anchor = null, clientX = null, clientY = null } = {}) {
  const root = getEffectsRoot(sheet, row);
  const menu = getEffectsContextMenu(root);
  if (!root || !menu) return;

  const rowId = String(row?.dataset?.effectsRowId ?? '').trim();
  if (!rowId) return;

  const hasVisibleItems = configureEffectsContextMenu(sheet, row, menu);
  if (!hasVisibleItems) {
    closeEffectsContextMenu(sheet, root);
    return;
  }

  menu.hidden = false;
  positionEffectsContextMenu(root, menu, { anchor, clientX, clientY });
  sheet._effectsContextMenuState = { rowId };
}

function closeEffectsContextMenu(sheet, root = getEffectsRoot(sheet)) {
  const menu = getEffectsContextMenu(root);
  if (menu) menu.hidden = true;
  sheet._effectsContextMenuState = null;
}

function configureEffectsContextMenu(sheet, row, menu) {
  const effect = getEffectsParentEffect(sheet, row);
  const canMutate = Boolean(effect) && game.user?.isGM && sheet.actor.system.lock !== true;
  const hidden = effect ? getEffectSheetMetadata(effect).hidden === true : false;
  const canOpenSource = hasEffectsSourceLink(row, effect);
  const canOpenEffect = Boolean(effect);

  const visibility = {
    edit: canMutate,
    'toggle-hidden': canMutate,
    duplicate: canMutate,
    'open-source': canOpenSource,
    'open-effect': canOpenEffect,
    delete: canMutate
  };

  for (const item of menu.querySelectorAll('[data-effects-menu-item]')) {
    const itemId = item.dataset.effectsMenuItem;
    item.hidden = visibility[itemId] !== true;
    if (itemId === 'toggle-hidden') {
      item.querySelector('span').textContent = game.i18n.localize(hidden ? 'BRP.effectsActionToggleVisible' : 'BRP.effectsActionToggleHidden');
    }
  }

  return Object.values(visibility).some(Boolean);
}

function positionEffectsContextMenu(root, menu, { anchor = null, clientX = null, clientY = null } = {}) {
  const rootRect = root.getBoundingClientRect();
  let left = 0;
  let top = 0;

  if (anchor?.getBoundingClientRect) {
    const anchorRect = anchor.getBoundingClientRect();
    left = anchorRect.right - rootRect.left - 16;
    top = anchorRect.bottom - rootRect.top + 4;
  } else {
    left = Number(clientX ?? rootRect.left) - rootRect.left;
    top = Number(clientY ?? rootRect.top) - rootRect.top;
  }

  menu.style.left = '0px';
  menu.style.top = '0px';

  const menuRect = menu.getBoundingClientRect();
  const maxLeft = Math.max(8, root.clientWidth - menuRect.width - 8);
  const maxTop = Math.max(8, root.clientHeight - menuRect.height - 8);
  menu.style.left = `${Math.min(Math.max(8, left), maxLeft)}px`;
  menu.style.top = `${Math.min(Math.max(8, top), maxTop)}px`;
}

function syncEffectsBuilderControls(sheet, root, { keepSelectedTarget = true } = {}) {
  const state = sheet._effectsBuilderState ?? buildEffectsCreateState(sheet);
  const fields = getEffectsBuilderFields(root);
  if (!fields) return;

  const model = getEffectsBuilderModel(sheet);
  const selectedTargetId = keepSelectedTarget
    ? String(fields.targetId?.dataset?.preferredTargetId ?? fields.targetId?.value ?? state.targetId ?? '').trim()
    : '';
  updateEffectsTargetOptions(model, fields, selectedTargetId);
  if (fields.targetId?.dataset) delete fields.targetId.dataset.preferredTargetId;
  updateEffectsAdvancedModeMarkup(root, state.isAdvanced === true);
  updateEffectsTimerNoteVisibility(root);
  updateEffectsBuilderHeader(root, state.operation === 'edit');
  updateEffectsBuilderPreview(sheet, root);
}

function updateEffectsTargetOptions(model, fields, selectedTargetId = '') {
  const categoryId = String(fields.categoryId?.value ?? model.categories[0]?.id ?? '').trim();
  const category = model.categories.find(entry => entry.id === categoryId) ?? model.categories[0];
  if (!category || !fields.targetId) return;

  const options = category.options ?? [];
  fields.targetId.innerHTML = options.map(option => `<option value="${escapeHTML(option.id)}">${escapeHTML(option.label)}</option>`).join('');

  const nextTargetId = options.some(option => String(option.id) === selectedTargetId)
    ? selectedTargetId
    : options[0]?.id ?? '';
  fields.targetId.value = nextTargetId;

  if (fields.categoryId && category.id && fields.categoryId.value !== category.id) {
    fields.categoryId.value = category.id;
  }
}

function updateEffectsAdvancedModeMarkup(root, isAdvanced) {
  const toggle = root.querySelector('[data-action="effectsBuilderToggleAdvanced"]');
  toggle?.setAttribute('aria-pressed', String(isAdvanced));
  toggle?.classList.toggle('is-active', isAdvanced);

  const simple = root.querySelector('[data-effects-builder-simple]');
  const advanced = root.querySelector('[data-effects-builder-advanced]');
  if (simple) simple.hidden = isAdvanced;
  if (advanced) advanced.hidden = !isAdvanced;
}

function updateEffectsTimerNoteVisibility(root) {
  const fields = getEffectsBuilderFields(root);
  const isTimed = String(fields?.durationId?.value ?? '') === 'timed';
  const timerField = fields?.timerNote?.closest?.('[data-effects-timer-note]');
  if (timerField) timerField.hidden = !isTimed;
}

function updateEffectsBuilderHeader(root, isEdit) {
  const title = root.querySelector('#brp-effects-refresh-modal-title span');
  if (!title) return;

  title.textContent = isEdit
    ? game.i18n.localize('BRP.effectsActionEdit')
    : `${game.i18n.localize('BRP.addItem')} ${game.i18n.localize('BRP.effect')}`;
}

function updateEffectsBuilderPreview(sheet, root) {
  const preview = buildEffectsPreviewState(sheet, root);
  const target = root.querySelector('.brp-effects-refresh-preview-target');
  const modifier = root.querySelector('.brp-effects-refresh-preview-modifier');

  if (target) target.textContent = preview.targetText;
  if (modifier) modifier.textContent = preview.modifierText;
}

function buildEffectsPreviewState(sheet, root) {
  const model = getEffectsBuilderModel(sheet);
  const fields = getEffectsBuilderFields(root);
  const state = sheet._effectsBuilderState ?? {};
  const isAdvanced = state.isAdvanced === true;

  let targetText = 'No target selected';
  if (isAdvanced) {
    const rawPath = String(fields?.rawPath?.value ?? '').trim();
    targetText = rawPath ? `Raw path: ${rawPath}` : 'Raw path: —';
  } else {
    const category = model.categories.find(entry => entry.id === String(fields?.categoryId?.value ?? '').trim()) ?? model.categories[0];
    const option = category?.options?.find(entry => entry.id === String(fields?.targetId?.value ?? '').trim()) ?? category?.options?.[0] ?? null;
    if (category && option) {
      targetText = `${category.label}: ${option.label}`;
    }
  }

  const modeLabel = fields?.mode?.selectedOptions?.[0]?.textContent?.trim() || game.i18n.localize('BRP.add');
  const rawValue = String(fields?.value?.value ?? '').trim();
  const numericValue = Number(rawValue);
  const valueText = Number.isFinite(numericValue)
    ? formatEffectsPreviewValue(Number(fields?.mode?.value ?? CONST.ACTIVE_EFFECT_MODES.ADD), numericValue)
    : (rawValue || '0');

  return {
    targetText,
    modifierText: `${valueText} (${modeLabel})`
  };
}

function populateEffectsBuilderForm(root, state) {
  const fields = getEffectsBuilderFields(root);
  if (!fields) return;

  fields.name.value = state.name ?? '';
  fields.icon.value = state.icon ?? '';
  fields.description.value = state.description ?? '';
  fields.categoryId.value = state.categoryId ?? fields.categoryId.value;
  if (fields.targetId?.dataset) fields.targetId.dataset.preferredTargetId = state.targetId ?? '';
  fields.rawPath.value = state.rawPath ?? '';
  fields.mode.value = String(state.modeValue ?? fields.mode.value);
  fields.value.value = state.value ?? '0';
  fields.priority.value = String(state.priority ?? fields.priority.value ?? '');
  fields.durationId.value = state.durationId ?? fields.durationId.value;
  fields.timerNote.value = state.timerNote ?? '';
  fields.hidden.checked = state.hidden === true;
  fields.active.checked = state.active !== false;
}

function buildEffectsCreateState(sheet) {
  const model = getEffectsBuilderModel(sheet);
  return {
    operation: 'create',
    effectId: '',
    changeIndex: 0,
    sourceType: 'manual',
    sourceLabel: getManualEffectSourceLabel(),
    name: '',
    icon: '',
    description: '',
    categoryId: model.categories[0]?.id ?? '',
    targetId: model.categories[0]?.options?.[0]?.id ?? '',
    rawPath: '',
    isAdvanced: false,
    modeValue: model.defaults.mode,
    value: '0',
    priority: model.defaults.priority,
    durationId: model.defaults.durationId,
    timerNote: '',
    hidden: false,
    active: true,
    origin: sheet.actor?.uuid ?? ''
  };
}

async function buildEffectsEditState(sheet, row) {
  const effect = getEffectsParentEffect(sheet, row);
  if (!effect) return null;

  const changeIndex = getEffectsChangeIndex(row);
  const change = effect.changes?.[changeIndex];
  if (!change) {
    ui.notifications.warn('The selected effect change no longer exists.');
    return null;
  }

  const sourceDocument = await resolveEffectOriginDocument(effect, new Map());
  const normalized = normalizeActorEffectChange(effect, change, sheet.actor, { sourceDocument });
  if (!SUPPORTED_BUILDER_EFFECT_MODES.has(normalized.mode)) {
    ui.notifications.warn('This effect mode is not editable in the Effects builder yet.');
    effect.sheet?.render?.(true);
    return null;
  }

  const target = reverseEffectTarget(sheet.actor, normalized.key, {
    targetType: normalized.targetType,
    targetLabel: normalized.targetLabel
  });
  const model = getEffectsBuilderModel(sheet);
  const category = model.categories.find(entry => entry.id === target?.categoryId);
  const hasSimpleTarget = Boolean(category?.options?.some(option => option.id === target?.targetId));

  return {
    operation: 'edit',
    effectId: effect.id,
    changeIndex,
    origin: String(effect.origin ?? sheet.actor?.uuid ?? '').trim(),
    sourceType: normalized.sourceType,
    sourceLabel: normalized.sourceLabel,
    name: String(effect.name ?? '').trim(),
    icon: String(effect.img ?? effect.icon ?? '').trim(),
    description: String(effect.description ?? '').trim(),
    categoryId: hasSimpleTarget ? target.categoryId : (model.categories[0]?.id ?? ''),
    targetId: hasSimpleTarget ? target.targetId : (model.categories[0]?.options?.[0]?.id ?? ''),
    rawPath: normalized.key,
    isAdvanced: !hasSimpleTarget,
    modeValue: normalized.mode,
    value: String(change.value ?? '').trim(),
    priority: Number.isFinite(Number(change.priority))
      ? Number(change.priority)
      : getDefaultEffectPriority(model, normalized.mode),
    durationId: normalized.durationType,
    timerNote: normalized.timerNote,
    hidden: normalized.hidden,
    active: effect.disabled !== true
  };
}

function readEffectsBuilderSubmission(sheet, root) {
  const state = sheet._effectsBuilderState ?? buildEffectsCreateState(sheet);
  const fields = getEffectsBuilderFields(root);
  if (!fields) return null;

  const isAdvanced = state.isAdvanced === true;
  const resolvedTarget = isAdvanced
    ? null
    : resolveEffectTarget(
      sheet.actor,
      fields.categoryId?.value,
      fields.targetId?.value,
      { allowRawFallback: false }
    );

  const rawPath = String(fields.rawPath?.value ?? '').trim();
  if (isAdvanced && !rawPath) {
    ui.notifications.warn('Enter a raw path for the effect target.');
    return null;
  }
  if (!isAdvanced && !resolvedTarget) {
    ui.notifications.warn('Choose a valid effect target.');
    return null;
  }

  const mode = Number(fields.mode?.value ?? CONST.ACTIVE_EFFECT_MODES.ADD);
  const rawValue = String(fields.value?.value ?? '').trim();
  const numericValue = Number(rawValue);
  if (!Number.isFinite(mode) || !SUPPORTED_BUILDER_EFFECT_MODES.has(mode)) {
    ui.notifications.warn('Choose a supported modifier mode.');
    return null;
  }
  if (!rawValue.length || !Number.isFinite(numericValue)) {
    ui.notifications.warn('Enter a valid modifier value.');
    return null;
  }

  const targetLabel = isAdvanced
    ? rawPath
    : resolvedTarget?.label ?? '';
  const targetType = isAdvanced
    ? 'other'
    : resolvedTarget?.categoryId ?? 'other';
  const name = String(fields.name?.value ?? '').trim() || targetLabel || game.i18n.localize('BRP.effect');
  const priority = parseEffectPriority(fields.priority?.value, getDefaultEffectPriority(getEffectsBuilderModel(sheet), mode));
  const durationId = String(fields.durationId?.value ?? 'permanent').trim() || 'permanent';
  const timerNote = durationId === 'timed'
    ? String(fields.timerNote?.value ?? '').trim()
    : '';

  return {
    operation: state.operation === 'edit' ? 'edit' : 'create',
    effectId: String(state.effectId ?? '').trim(),
    changeIndex: Number.isInteger(Number(state.changeIndex)) ? Number(state.changeIndex) : 0,
    name,
    icon: String(fields.icon?.value ?? '').trim() || DEFAULT_EFFECT_ICON,
    description: String(fields.description?.value ?? ''),
    active: fields.active?.checked !== false,
    hidden: fields.hidden?.checked === true,
    durationId,
    timerNote,
    sourceType: state.sourceType || 'manual',
    sourceLabel: state.sourceLabel || getManualEffectSourceLabel(),
    targetType,
    targetLabel,
    origin: String(state.origin ?? sheet.actor?.uuid ?? '').trim() || sheet.actor.uuid,
    key: isAdvanced ? rawPath : resolvedTarget.key,
    modeValue: mode,
    value: String(numericValue),
    priority
  };
}

async function createEffectFromBuilder(sheet, builderData) {
  await sheet.actor.createEmbeddedDocuments('ActiveEffect', [buildEffectDocumentData({
    ...builderData,
    origin: String(builderData.origin ?? '').trim() || sheet.actor.uuid
  })], {
    renderSheet: false
  });
}

async function updateEffectFromBuilder(sheet, builderData) {
  const effect = sheet.actor.effects.get(builderData.effectId);
  if (!effect) {
    ui.notifications.warn('The selected effect no longer exists.');
    return;
  }

  const changes = foundry.utils.deepClone(effect.changes ?? []);
  if (!changes[builderData.changeIndex]) {
    ui.notifications.warn('The selected effect change no longer exists.');
    return;
  }

  changes[builderData.changeIndex] = {
    ...changes[builderData.changeIndex],
    key: builderData.key,
    mode: builderData.modeValue,
    value: builderData.value,
    priority: builderData.priority
  };

  await effect.update({
    name: builderData.name,
    img: builderData.icon,
    description: builderData.description,
    disabled: builderData.active !== true,
    changes,
    ...buildSharedEffectMetadataUpdate(builderData)
  });
}

async function duplicateEffectsRowChange(sheet, row, target) {
  const effect = getEffectsParentEffect(sheet, row);
  if (!effect) return;

  const changeIndex = getEffectsChangeIndex(row);
  const change = effect.changes?.[changeIndex];
  if (!change) {
    ui.notifications.warn('The selected effect change no longer exists.');
    return;
  }

  closeEffectsContextMenu(sheet);

  const sourceDocument = await resolveEffectOriginDocument(effect, new Map());
  const normalized = normalizeActorEffectChange(effect, change, sheet.actor, { sourceDocument });
  const duplicateLabel = game.i18n.format('BRP.copyOf', {
    name: effect.name || game.i18n.localize('BRP.effect')
  });
  const payload = {
    operation: 'create',
    name: duplicateLabel,
    icon: String(effect.img ?? effect.icon ?? '').trim() || DEFAULT_EFFECT_ICON,
    description: String(effect.description ?? '').trim(),
    active: effect.disabled !== true,
    hidden: normalized.hidden === true,
    durationId: normalized.durationType || 'permanent',
    timerNote: normalized.timerNote || '',
    sourceType: 'manual',
    sourceLabel: getManualEffectSourceLabel(),
    targetType: normalized.targetType || 'other',
    targetLabel: normalized.targetLabel || String(change.key ?? '').trim(),
    origin: sheet.actor.uuid,
    key: String(change.key ?? '').trim(),
    modeValue: Number(change.mode ?? CONST.ACTIVE_EFFECT_MODES.ADD),
    value: String(change.value ?? '0').trim(),
    priority: parseEffectPriority(change.priority, Number(change.mode ?? CONST.ACTIVE_EFFECT_MODES.ADD) * 10)
  };

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target ?? row);
  try {
    await sheet.actor.createEmbeddedDocuments('ActiveEffect', [buildEffectDocumentData(payload)], {
      renderSheet: false
    });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function deleteEffectsRowChange(sheet, row, target) {
  const effect = getEffectsParentEffect(sheet, row);
  if (!effect) return;

  const changeIndex = getEffectsChangeIndex(row);
  if (!effect.changes?.[changeIndex]) {
    ui.notifications.warn('The selected effect change no longer exists.');
    return;
  }

  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize('BRP.delete') },
    content: `${game.i18n.localize('BRP.deleteConfirm')}<br><strong> ${escapeHTML(effect.name || game.i18n.localize('BRP.effect'))}</strong>`
  });
  if (!confirmation) return;

  closeEffectsContextMenu(sheet);

  const changes = foundry.utils.deepClone(effect.changes ?? []);
  changes.splice(changeIndex, 1);

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target ?? row);
  try {
    if (changes.length) {
      await effect.update({ changes });
    } else {
      await effect.delete();
    }
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function toggleEffectsRowHidden(sheet, row, target) {
  const effect = getEffectsParentEffect(sheet, row);
  if (!effect) return;

  closeEffectsContextMenu(sheet);

  const metadata = getEffectSheetMetadata(effect);
  const scrollTop = captureRefreshWorkspaceScroll(sheet, target ?? row);
  try {
    await effect.update(buildEffectSheetMetadataUpdate({
      ...metadata,
      hidden: metadata.hidden !== true
    }));
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function openEffectsSourceFromRow(sheet, row) {
  const button = row?.querySelector?.('.brp-effects-refresh-source-link');
  const itemId = String(button?.dataset?.itemId ?? '').trim();
  if (itemId) {
    sheet.actor.items.get(itemId)?.sheet?.render?.(true);
    return;
  }

  const effect = getEffectsParentEffect(sheet, row);
  const origin = String(effect?.origin ?? '').trim();
  if (!origin) return;

  try {
    const source = await fromUuid(origin);
    source?.sheet?.render?.(true);
  } catch (error) {
    console.warn(`BRP | Failed to open effect source (${origin})`, error);
  }
}

function openEffectsParentEffectFromRow(sheet, row) {
  getEffectsParentEffect(sheet, row)?.sheet?.render?.(true);
}

function buildEffectDocumentData(builderData) {
  const effectData = {
    name: builderData.name,
    img: builderData.icon || DEFAULT_EFFECT_ICON,
    description: builderData.description,
    disabled: builderData.active !== true,
    changes: [
      {
        key: builderData.key,
        mode: builderData.modeValue,
        value: builderData.value,
        priority: builderData.priority
      }
    ],
    flags: {
      brp: {
        sheet: {
          effects: buildSharedEffectMetadata(builderData)
        }
      }
    }
  };

  const origin = String(builderData.origin ?? '').trim();
  if (origin) effectData.origin = origin;

  return effectData;
}

function buildSharedEffectMetadata(builderData) {
  return {
    sourceType: builderData.sourceType || 'manual',
    sourceLabel: builderData.sourceLabel || getManualEffectSourceLabel(),
    targetType: builderData.targetType || 'other',
    targetLabel: builderData.targetLabel || String(builderData.key ?? '').trim(),
    durationType: builderData.durationId || 'permanent',
    timerNote: builderData.durationId === 'timed' ? builderData.timerNote || '' : '',
    hidden: builderData.hidden === true
  };
}

function buildSharedEffectMetadataUpdate(builderData) {
  return buildEffectSheetMetadataUpdate(buildSharedEffectMetadata(builderData));
}

function parseEffectPriority(value, fallback = CONST.ACTIVE_EFFECT_MODES.ADD * 10) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getDefaultEffectPriority(model, mode) {
  const match = model.modes.find(entry => Number(entry.mode) === Number(mode));
  return Number.isFinite(Number(match?.priority)) ? Number(match.priority) : CONST.ACTIVE_EFFECT_MODES.ADD * 10;
}

function getManualEffectSourceLabel() {
  return getEffectsGroupLabel('manual');
}

function formatEffectsPreviewValue(mode, value) {
  if (mode === CONST.ACTIVE_EFFECT_MODES.MULTIPLY) return `x${value}`;
  if (value > 0) return `+${value}`;
  return String(value);
}

function getEffectsBuilderModel(sheet) {
  return buildEffectBuilderModel(sheet.actor);
}

function getEffectsRoot(sheetOrTarget, target = null) {
  return getTargetElement(target)?.closest?.('.brp-effects-refresh')
    ?? getTargetElement(sheetOrTarget)?.closest?.('.brp-effects-refresh')
    ?? sheetOrTarget?.element?.querySelector?.('.brp-effects-refresh');
}

function getEffectsModalOverlay(root) {
  return root?.querySelector?.('[data-effects-modal-overlay]') ?? null;
}

function getEffectsContextMenu(root) {
  return root?.querySelector?.('[data-effects-context-menu]') ?? null;
}

function getEffectsBuilderFields(root) {
  if (!root) return null;

  return {
    name: root.querySelector('[data-effects-field="name"]'),
    icon: root.querySelector('[data-effects-field="icon"]'),
    description: root.querySelector('[data-effects-field="description"]'),
    categoryId: root.querySelector('[data-effects-field="categoryId"]'),
    targetId: root.querySelector('[data-effects-field="targetId"]'),
    rawPath: root.querySelector('[data-effects-field="rawPath"]'),
    mode: root.querySelector('[data-effects-field="mode"]'),
    value: root.querySelector('[data-effects-field="value"]'),
    priority: root.querySelector('[data-effects-field="priority"]'),
    durationId: root.querySelector('[data-effects-field="durationId"]'),
    timerNote: root.querySelector('[data-effects-field="timerNote"]'),
    hidden: root.querySelector('[data-effects-field="hidden"]'),
    active: root.querySelector('[data-effects-field="active"]')
  };
}

function getEffectsGroupId(target) {
  const element = getTargetElement(target);
  return String(
    element?.dataset?.groupId
    ?? element?.closest?.('[data-group-id]')?.dataset?.groupId
    ?? element?.closest?.('[data-effects-group]')?.dataset?.effectsGroup
    ?? ''
  ).trim();
}

function getEffectsGroupSection(sheet, target) {
  const groupId = getEffectsGroupId(target);
  if (!groupId) return null;

  const root = getEffectsRoot(sheet, target);
  return root?.querySelector?.(`.brp-effects-refresh-group[data-effects-group="${cssEscape(groupId)}"]`) ?? null;
}

function updateEffectsGroupMarkup(section, toggle, isCollapsed) {
  section?.classList.toggle('is-collapsed', isCollapsed);
  const body = section?.querySelector('.brp-effects-refresh-group-body');
  if (body) body.hidden = isCollapsed;

  const button = getTargetElement(toggle)?.closest?.('.brp-effects-refresh-group-toggle')
    ?? section?.querySelector?.('.brp-effects-refresh-group-toggle');
  if (button) {
    button.setAttribute('aria-expanded', String(!isCollapsed));
    button.dataset.tooltip = game.i18n.localize(isCollapsed ? 'BRP.expand' : 'BRP.collapse');
  }
}

function resolveEffectsRowFromTarget(sheet, target) {
  const row = getTargetElement(target)?.closest?.('.brp-effects-refresh-card[data-effects-row-id]');
  if (row) return row;

  const rowId = String(sheet._effectsContextMenuState?.rowId ?? '').trim();
  if (!rowId) return null;

  return getEffectsRoot(sheet)?.querySelector?.(`.brp-effects-refresh-card[data-effects-row-id="${cssEscape(rowId)}"]`) ?? null;
}

function getEffectsParentEffect(sheet, target) {
  const row = target?.classList?.contains?.('brp-effects-refresh-card')
    ? target
    : resolveEffectsRowFromTarget(sheet, target);
  const effectId = String(
    row?.dataset?.effectId
    ?? getTargetElement(target)?.dataset?.effectId
    ?? ''
  ).trim();
  return effectId ? sheet.actor.effects.get(effectId) ?? null : null;
}

function getEffectsChangeIndex(target) {
  const row = target?.classList?.contains?.('brp-effects-refresh-card')
    ? target
    : getTargetElement(target)?.closest?.('.brp-effects-refresh-card[data-effects-row-id]');
  const rawValue = row?.dataset?.changeIndex ?? getTargetElement(target)?.dataset?.changeIndex;
  const index = Number(rawValue);
  return Number.isInteger(index) && index >= 0 ? index : 0;
}

function hasEffectsSourceLink(row, effect) {
  if (row?.querySelector?.('.brp-effects-refresh-source-link')) return true;
  return Boolean(String(effect?.origin ?? '').trim());
}
