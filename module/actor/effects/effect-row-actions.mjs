import { localizeText } from '../sheets/character/prepare/effects/shared.mjs';

export function buildEffectRowActions(row, actor) {
  const canMutate = canMutateEffectRow(row, actor);

  return {
    edit: canMutate ? effectRowAction('effectsEdit', 'BRP.edit', 'Edit effect', row) : null,
    duplicate: canMutate ? effectRowAction('effectsDuplicate', 'BRP.duplicate', 'Duplicate', row) : null,
    delete: canMutate ? effectRowAction('effectsDelete', 'BRP.delete', 'Delete', row) : null,
    menu: effectRowAction('effectsMenu', '', 'More', row)
  };
}

export function buildEffectParentActions(row, actor) {
  const canMutate = canMutateEffectParent(row, actor);

  return {
    openEffect: row.effectId ? {
      action: 'viewDoc',
      label: localizeText('BRP.effect', 'Effect'),
      documentClass: 'ActiveEffect',
      parentId: row.parentId,
      effectId: row.effectId
    } : null,
    openSource: row.source?.documentClass && row.source?.documentId ? {
      action: 'viewDoc',
      label: localizeText('BRP.sourceItem', 'Source'),
      documentClass: row.source.documentClass,
      itemId: row.source.documentClass === 'Item' ? row.source.documentId : '',
      documentId: row.source.documentId
    } : null,
    toggleActive: row.effectId ? {
      action: 'effectsToggleActive',
      label: row.isParentDisabled
        ? localizeText('', 'Enable effect')
        : localizeText('', 'Disable effect'),
      effectId: row.effectId,
      parentId: row.parentId,
      disabled: !canMutate,
      active: row.isParentDisabled !== true
    } : null,
    toggleHidden: row.effectId ? {
      action: 'effectsToggleHidden',
      label: row.hidden
        ? localizeText('', 'Unhide from player')
        : localizeText('', 'Hide from player'),
      effectId: row.effectId,
      parentId: row.parentId,
      disabled: !canMutate,
      active: row.hidden === true
    } : null
  };
}

export function canMutateEffectRow(row, actor) {
  return canMutate(actor) && row.kind === 'active-effect' && Boolean(row.effectId);
}

export function canMutateEffectParent(row, actor) {
  return canMutate(actor) && Boolean(row.effectId);
}

function canMutate(actor) {
  return Boolean(game.user?.isGM) && actor?.system?.lock !== true;
}

function effectRowAction(action, key, fallback, row) {
  return {
    action,
    label: localizeText(key, fallback),
    effectId: row.effectId,
    parentId: row.parentId,
    changeIndex: row.changeIndex,
    rowId: row.id
  };
}
