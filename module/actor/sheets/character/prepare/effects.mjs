import { buildEffectBuilderModel, buildUnifiedEffectRows } from '../../../effects/effect-normalize.mjs';
import {
  EFFECTS_FILTER_IDS,
  EFFECTS_GROUP_IDS,
  getEffectsFilterLabel,
  getEffectsGroupLabel,
  getEffectsSheetFlags,
  localizeText,
  sanitizeEffectsFilter
} from './effects/shared.mjs';

export async function prepareEffects(sheet, context) {
  const rows = await buildUnifiedEffectRows(sheet.actor);
  const builder = buildEffectBuilderModel(sheet.actor);
  const sheetState = getEffectsSheetFlags(context);

  context.effects = rows;
  context.effectsView = buildEffectsView(rows, sheet.actor, sheetState, builder);
  context.effectsRefresh = context.effectsView;
}

function buildEffectsView(rows, actor, sheetState, builder) {
  const filterId = sanitizeEffectsFilter(sheetState.filter);
  const counts = buildFilterCounts(rows);
  const filteredRows = filterEffectRows(rows, filterId);
  const groups = buildGroups(filteredRows, rows, sheetState);
  const legacyRows = rows.map(buildLegacyRow);

  return {
    count: legacyRows.length,
    hasEffects: legacyRows.length > 0,
    rows: legacyRows,
    sections: buildLegacySections(legacyRows),
    header: {
      title: localizeText('BRP.effects', 'Effects'),
      gmOnlyLabel: localizeText('BRP.effectsGMOnly', 'GM-only'),
      showLock: actor.system.lock === true,
      lockLabel: localizeText('BRP.locked', 'Locked')
    },
    toolbar: {
      filters: EFFECTS_FILTER_IDS.map(candidateId => ({
        id: candidateId,
        label: getEffectsFilterLabel(candidateId),
        count: counts[candidateId] ?? 0,
        active: candidateId === filterId,
        action: 'effectsFilterSet'
      })),
      addAction: {
        action: 'effectsCreate',
        label: localizeText('BRP.addItem', 'Add'),
        disabled: actor.system.lock === true
      }
    },
    groups,
    emptyState: buildEmptyState(rows, filteredRows),
    builder,
    readOnly: actor.system.lock === true,
    gmOnly: true,
    filter: filterId,
    state: {
      collapsedGroups: sheetState.collapsedGroups,
      stateInitialized: sheetState.stateInitialized
    }
  };
}

function buildFilterCounts(rows) {
  return {
    all: rows.length,
    'active-only': rows.filter(row => row.isActive).length,
    temporary: rows.filter(row => row.duration?.id === 'timed').length,
    hidden: rows.filter(row => row.hidden === true).length
  };
}

function filterEffectRows(rows, filterId) {
  switch (filterId) {
    case 'active-only':
      return rows.filter(row => row.isActive);
    case 'temporary':
      return rows.filter(row => row.duration?.id === 'timed');
    case 'hidden':
      return rows.filter(row => row.hidden === true);
    case 'all':
    default:
      return rows;
  }
}

function buildGroups(filteredRows, allRows, sheetState) {
  return EFFECTS_GROUP_IDS.map(groupId => {
    const rows = filteredRows.filter(row => row.sourceType === groupId);
    const totalRows = allRows.filter(row => row.sourceType === groupId);
    return {
      id: groupId,
      label: getEffectsGroupLabel(groupId),
      count: rows.length,
      totalCount: totalRows.length,
      collapsed: Boolean(sheetState.collapsedGroups?.[groupId]),
      hasRows: rows.length > 0,
      action: 'effectsGroupToggle',
      rows
    };
  }).filter(group => group.hasRows);
}

function buildEmptyState(rows, filteredRows) {
  if (!rows.length) {
    return {
      active: true,
      message: localizeText('BRP.effectsEmpty', 'No effects yet.')
    };
  }

  if (!filteredRows.length) {
    return {
      active: true,
      message: localizeText('BRP.effectsNoMatches', 'No effects match the current filter.')
    };
  }

  return {
    active: false,
    message: ''
  };
}

function buildLegacySections(rows) {
  const activeRows = rows.filter(row => row.isActive);
  const inactiveRows = rows.filter(row => !row.isActive);

  return [
    buildLegacySection('active', 'BRP.active', activeRows),
    buildLegacySection('inactive', 'BRP.inactive', inactiveRows)
  ];
}

function buildLegacySection(id, label, rows) {
  return {
    id,
    label,
    count: rows.length,
    hasRows: rows.length > 0,
    rows
  };
}

function buildLegacyRow(row) {
  return {
    id: row.id,
    title: row.name,
    key: row.targetLabel || row.key,
    source: {
      id: row.source?.documentId ?? '',
      uuid: row.source?.uuid ?? '',
      name: row.source?.label ?? '',
      documentType: row.source?.documentClass || 'Item'
    },
    activeEffect: {
      id: row.effectId,
      uuid: row.effectUuid,
      parentId: row.parentId,
      documentType: 'ActiveEffect'
    },
    cells: {
      amount: {
        label: 'BRP.amount',
        value: row.modifier?.valueDisplay ?? ''
      }
    },
    status: {
      label: row.isActive ? 'BRP.active' : 'BRP.inactive',
      icon: 'fas fa-person-rays',
      className: row.isActive ? 'is-active' : 'is-inactive'
    },
    isActive: row.isActive,
    effect: row
  };
}
