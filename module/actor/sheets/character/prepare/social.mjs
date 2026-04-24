import {
  buildAllegianceRows,
  prepareAllegianceItem
} from './social/allegiance-rows.mjs';
import {
  buildContactRows,
  prepareContactItem
} from './social/contact-rows.mjs';
import { buildFactionRows } from './social/faction-rows.mjs';
import {
  buildReputationRows,
  prepareReputationItem
} from './social/reputation-rows.mjs';
import {
  buildCollapsedSectionsState,
  buildSectionVisibility,
  canCreateReputation,
  createDocAction,
  createSectionView,
  createSocialAction,
  getReputationCreateDisabledReason,
  getReputationDisabledReason,
  getSocialSheetFlags,
  sanitizePrimaryAllegiance,
  SECTION_ORDER,
  sortByName
} from './social/shared.mjs';

export function createSocialPreparation(improve) {
  return {
    allegiances: [],
    reputations: [],
    contacts: [],
    improve
  };
}

export {
  prepareAllegianceItem,
  prepareContactItem,
  prepareReputationItem
};

export async function finalizeSocialPreparation(context, state) {
  context.allegiances = sortByName(state.allegiances);
  context.reputations = sortByName(state.reputations);
  context.contacts = sortByName(state.contacts);

  const socialFlags = getSocialSheetFlags(context);
  const visibility = buildSectionVisibility(socialFlags.sectionVisibility);
  const collapsedSections = buildCollapsedSectionsState(socialFlags.collapsedSections, {
    initialized: socialFlags.stateInitialized,
    ignoreAllTrueUnlessInitialized: true
  });
  const primaryAllegiance = sanitizePrimaryAllegiance(socialFlags.primaryAllegiance, context.allegiances);
  const expandedRows = socialFlags.expandedRows ?? {};
  const sections = await buildSocialSections(context, {
    visibility,
    collapsedSections,
    primaryAllegiance
  });
  applySocialRowExpandedState(sections, expandedRows);

  context.factions = sections.factions.rows;
  context.socialRefresh = {
    visibility,
    sectionOrder: [...SECTION_ORDER],
    orderedSections: SECTION_ORDER.map(sectionId => sections[sectionId]),
    state: {
      collapsedSections,
      primaryAllegiance
    },
    sections
  };
  context.socialView = buildSocialView(context, sections);
}

async function buildSocialSections(context, socialState) {
  const reputationMode = Number(context.useReputation ?? 0);
  const allegianceRows = buildAllegianceRows(context.allegiances, socialState.primaryAllegiance);
  const reputationRows = buildReputationRows(context.reputations);
  const contactRows = await buildContactRows(context.contacts);
  const factionRows = await buildFactionRows(context.actor);

  return {
    allegiance: createSectionView({
      id: 'allegiance',
      label: game.i18n.localize('BRP.allegiance'),
      visible: socialState.visibility.allegiance,
      collapsed: socialState.collapsedSections.allegiance,
      rulesEnabled: Boolean(context.useAlleg),
      disabledReason: context.useAlleg ? '' : game.i18n.localize('BRP.noAlleg'),
      createAction: createDocAction('allegiance'),
      canCreate: Boolean(context.useAlleg),
      emptyText: 'No allegiances yet. Click + to add one.',
      rows: allegianceRows
    }),
    reputation: createSectionView({
      id: 'reputation',
      label: 'Reputation & Status',
      visible: socialState.visibility.reputation,
      collapsed: socialState.collapsedSections.reputation,
      rulesEnabled: reputationMode > 0,
      disabledReason: getReputationDisabledReason(reputationMode),
      createAction: createDocAction('reputation'),
      canCreate: canCreateReputation(reputationMode, reputationRows.length),
      createDisabledReason: getReputationCreateDisabledReason(reputationMode, reputationRows.length),
      emptyText: 'No reputation scores yet. Click + to add one.',
      rows: reputationRows
    }),
    contacts: createSectionView({
      id: 'contacts',
      label: game.i18n.localize('BRP.contact'),
      visible: socialState.visibility.contacts,
      collapsed: socialState.collapsedSections.contacts,
      rulesEnabled: true,
      disabledReason: '',
      createAction: createDocAction('contact'),
      canCreate: true,
      emptyText: 'No contacts yet. Click + to add one.',
      rows: contactRows
    }),
    factions: createSectionView({
      id: 'factions',
      label: game.i18n.localize('BRP.faction'),
      visible: socialState.visibility.factions,
      collapsed: socialState.collapsedSections.factions,
      rulesEnabled: true,
      disabledReason: '',
      createAction: createSocialAction('socialFactionCreate'),
      linkAction: createSocialAction('socialFactionAttach'),
      canCreate: true,
      canLink: true,
      emptyText: 'No factions linked yet. Use create or link to add one.',
      rows: factionRows
    })
  };
}

function applySocialRowExpandedState(sections, expandedRows) {
  if (!sections) return;
  for (const sectionId of ['allegiance', 'reputation', 'factions']) {
    for (const row of sections[sectionId]?.rows ?? []) {
      if (row?.rowKey) row.expanded = Boolean(expandedRows[row.rowKey]);
    }
  }
}

function buildSocialView(context, sections) {
  return {
    allegiances: {
      enabled: sections.allegiance.rulesEnabled,
      rows: context.allegiances.map(socialRow)
    },
    reputations: {
      enabled: sections.reputation.rulesEnabled,
      rows: context.reputations.map(socialRow)
    },
    contacts: {
      enabled: true,
      rows: sections.contacts.rows
    },
    factions: {
      enabled: true,
      rows: sections.factions.rows
    }
  };
}

function socialRow(item) {
  return {
    id: item._id,
    name: item.name,
    type: item.type,
    item,
    total: item.system?.total,
    rank: item.system?.rank,
    canImprove: item.system?.improve,
    oppositeName: item.system?.oppName,
    oppositeImproving: item.system?.oppimprove,
    hasEffects: item.system?.hasEffects
  };
}
