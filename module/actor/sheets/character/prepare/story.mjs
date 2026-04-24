import { STORY_SECTION_IDS } from '../character-sheet-config.mjs';
import { readStoredBoolean } from '../character-sheet-utils.mjs';
import {
  buildStoryCollapsedSectionsState,
  compareStoryRealDateDesc,
  compareStoryText,
  compareStoryTimelineEventAsc,
  compareStoryTimelineEventDesc,
  createStoryAction,
  createStoryPreparation as createPreparationState,
  getStoryLinkKindLabel,
  getStorySheetFlags,
  getStoryStatusLabel,
  getStoryTypeConfig,
  getStoryTypeLabel,
  localizeText,
  normalizeQuestStatus,
  normalizeQuestUpdates,
  normalizeStoryLinks,
  parseStoryLink,
  previewText,
  sanitizeStoryFilters,
  sanitizeTimelineView,
  stringValue,
  stripHtml
} from './story/shared.mjs';

export function createStoryPreparation(actor) {
  return createPreparationState(actor);
}

export async function finalizeStoryPreparation(context, actor, state) {
  const storyFlags = getStorySheetFlags(context);
  const stateInitialized = readStoredBoolean(storyFlags.stateInitialized, false);
  const collapsedSections = buildStoryCollapsedSectionsState(storyFlags.collapsedSections, {
    initialized: stateInitialized,
    ignoreAllTrueUnlessInitialized: true
  });
  const filters = sanitizeStoryFilters(storyFlags.filters);
  const timelineView = sanitizeTimelineView(storyFlags.timelineView);

  const { quests, missingQuestLinks } = await resolveQuestLinks(state.questLinks, state.questCache);
  const linkContext = { actor, context, entries: state.entries, quests, linkCache: state.linkCache };
  const storyLinkedIndex = await buildStoryLinkedIndex(linkContext);
  const activeQuestRows = buildActiveQuestRows(context, quests, storyLinkedIndex);
  const journalEntryRows = await buildJournalRows(context, state.entries, quests, storyLinkedIndex);
  const journalTypeCounts = buildJournalTypeCounts(journalEntryRows);
  const filterChips = buildJournalFilterChips(filters.types, journalTypeCounts);
  const filteredJournalRows = filterJournalRows(journalEntryRows, filters);
  const allStoryEvents = buildAllStoryEvents(context, state.entries, quests, storyLinkedIndex);
  const timeline = buildTimelineDataset(allStoryEvents, timelineView);
  const sections = {
    quests: {
      id: 'quests',
      title: localizeText('BRP.storyActiveQuests', 'Active Quests'),
      visible: true,
      collapsed: collapsedSections.quests,
      count: activeQuestRows.length,
      totalCount: activeQuestRows.length,
      hasRows: activeQuestRows.length > 0,
      rows: activeQuestRows,
      emptyText: localizeText('BRP.storyEmptyActiveQuests', 'No active quests yet.'),
      canCreate: !context.isLocked,
      createDisabledReason: context.isLocked ? localizeText('BRP.locked', 'Locked') : '',
      createAction: createStoryAction('storyQuestCreate')
    },
    journal: {
      id: 'journal',
      title: localizeText('BRP.storyJournal', 'Journal'),
      visible: true,
      collapsed: collapsedSections.journal,
      count: filteredJournalRows.length,
      totalCount: journalEntryRows.length,
      hasRows: filteredJournalRows.length > 0,
      rows: filteredJournalRows,
      allRows: journalEntryRows,
      emptyText: localizeText('BRP.storyEmptyJournal', 'No journal entries yet.'),
      canCreate: !context.isLocked,
      createDisabledReason: context.isLocked ? localizeText('BRP.locked', 'Locked') : '',
      createAction: createStoryAction('storyJournalCreate'),
      filters: {
        ...filters,
        chips: filterChips,
        activeTypeCount: filters.types.length,
        hasSearch: Boolean(filters.search)
      },
      typeCounts: journalTypeCounts
    }
  };

  context.storyLinkedIndex = storyLinkedIndex;
  context.storyRefresh = {
    title: localizeText('BRP.story', 'Story'),
    isLocked: Boolean(context.isLocked),
    sectionOrder: [...STORY_SECTION_IDS],
    sections,
    orderedSections: STORY_SECTION_IDS.map(sectionId => sections[sectionId]).filter(Boolean),
    state: {
      stateInitialized,
      collapsedSections,
      filters,
      timelineView
    },
    timeline,
    datasets: {
      activeQuestRows,
      journalEntryRows,
      journalRows: journalEntryRows,
      filteredJournalRows,
      journalTypeCounts,
      allStoryEvents,
      storyLinkedIndex,
      missingQuestLinks
    },
    linkedIndex: storyLinkedIndex,
    warnings: {
      missingQuestLinks
    },
    actions: {
      openTimeline: createStoryAction('storyTimelineOpen')
    }
  };
}

async function resolveQuestLinks(questLinks, cache) {
  const quests = [];
  const missingQuestLinks = [];

  for (const questLink of questLinks) {
    const quest = await resolveQuestItem(questLink.uuid, cache);
    if (!quest) {
      missingQuestLinks.push({
        uuid: questLink.uuid,
        sortOrder: questLink.sortOrder,
        index: questLink.index
      });
      continue;
    }

    quests.push({
      id: quest.id,
      uuid: quest.uuid,
      name: quest.name,
      item: quest,
      status: normalizeQuestStatus(quest.system?.status),
      statusLabel: getStoryStatusLabel(quest.system?.status),
      objective: stringValue(quest.system?.objective),
      objectivePreview: previewText(quest.system?.objective, 160),
      sessionGiven: stringValue(quest.system?.sessionGiven),
      updates: normalizeQuestUpdates(quest.system?.updates).sort(compareStoryTimelineEventDesc),
      linked: normalizeStoryLinks(quest.system?.linked),
      description: String(quest.system?.description ?? ''),
      gmDescription: String(quest.system?.gmDescription ?? ''),
      sortOrder: questLink.sortOrder,
      linkIndex: questLink.index
    });
  }

  return {
    quests,
    missingQuestLinks
  };
}

async function resolveQuestItem(uuid, cache) {
  const key = stringValue(uuid);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  let document = null;
  try {
    document = await fromUuid(key);
  } catch (error) {
    console.warn(`BRP | Failed to resolve quest item (${key})`, error);
    cache.set(key, null);
    return null;
  }

  const quest = document instanceof Item && document.type === 'quest' ? document : null;
  cache.set(key, quest);
  return quest;
}

async function buildStoryLinkedIndex({ actor, entries, quests, linkCache }) {
  const uniqueLinks = new Set();
  for (const entry of entries) {
    for (const link of entry.linked) uniqueLinks.add(link);
  }
  for (const quest of quests) {
    for (const link of quest.linked) uniqueLinks.add(link);
  }

  const index = {};
  for (const link of uniqueLinks) {
    index[link] = await resolveStoryLinkedReference({ actor, entries, link, linkCache });
  }
  return index;
}

async function resolveStoryLinkedReference({ actor, entries, link, linkCache }) {
  const parsed = parseStoryLink(link);
  if (!parsed.key) return createStoryLinkRecord(parsed, null, null, false);
  if (linkCache.has(parsed.key)) return linkCache.get(parsed.key);

  if (parsed.kind === 'entry') {
    const entry = entries.find(candidate => candidate.id === parsed.uuid) ?? null;
    const record = createStoryLinkRecord(parsed, null, entry, Boolean(entry));
    linkCache.set(parsed.key, record);
    return record;
  }

  let document = null;
  try {
    document = await fromUuid(parsed.uuid);
  } catch (error) {
    console.warn(`BRP | Failed to resolve story linked reference (${parsed.key})`, error);
  }

  const resolved = validateStoryLinkedDocument(parsed.kind, document);
  const record = createStoryLinkRecord(parsed, resolved, null, Boolean(resolved), actor);
  linkCache.set(parsed.key, record);
  return record;
}

function validateStoryLinkedDocument(kind, document) {
  if (kind === 'contact') return document instanceof Item && document.type === 'contact' ? document : null;
  if (kind === 'faction') return document instanceof Item && document.type === 'faction' ? document : null;
  if (kind === 'quest') return document instanceof Item && document.type === 'quest' ? document : null;
  if (kind === 'item') return document instanceof Item ? document : null;
  return null;
}

function createStoryLinkRecord(parsed, document, entry, resolved, actor = null) {
  const kindLabel = getStoryLinkKindLabel(parsed.kind);
  const label = entry
    ? entry.title || localizeText('BRP.characterCustomFieldUntitled', 'Untitled')
    : document?.name || parsed.uuid || kindLabel;

  return {
    key: parsed.key,
    kind: parsed.kind,
    kindLabel,
    uuid: parsed.uuid,
    label,
    displayLabel: label,
    resolved,
    orphan: !resolved,
    documentClass: document?.documentName ?? '',
    itemId: document?.id ?? '',
    itemType: document?.type ?? '',
    entryId: entry?.id ?? '',
    actorId: actor?.id ?? '',
    action: resolved ? createStoryAction('storyOpenLinked', { link: parsed.key, kind: parsed.kind, uuid: parsed.uuid }) : null
  };
}

function buildActiveQuestRows(context, quests, storyLinkedIndex) {
  return quests
    .filter(quest => quest.status === 'active')
    .map(quest => createActiveQuestRow(context, quest, storyLinkedIndex))
    .sort(compareActiveQuestRows);
}

function createActiveQuestRow(context, quest, storyLinkedIndex) {
  return {
    id: quest.id,
    rowId: `active-quest-${quest.id}`,
    type: 'quest',
    name: quest.name,
    title: quest.name,
    status: quest.status,
    statusLabel: quest.statusLabel,
    objective: quest.objective,
    objectivePreview: quest.objectivePreview,
    sessionGiven: quest.sessionGiven,
    linked: mapStoryLinkedRows(quest.linked, storyLinkedIndex),
    linkedCount: quest.linked.length,
    updates: quest.updates.slice(0, 2).map(update => ({
      ...update,
      preview: previewText(update.text, 120)
    })),
    updatesCount: quest.updates.length,
    canMutate: !context.isLocked,
    actions: {
      open: createStoryAction('storyQuestOpen', { questUuid: quest.uuid, questId: quest.id }),
      menu: createStoryAction('storyQuestMenu', { questUuid: quest.uuid, questId: quest.id }),
      addUpdate: createStoryAction('storyQuestUpdateCreate', { questUuid: quest.uuid, questId: quest.id }),
      unlink: createStoryAction('storyQuestUnlink', { questUuid: quest.uuid, questId: quest.id })
    },
    quest
  };
}

async function buildJournalRows(context, entries, quests, storyLinkedIndex) {
  const entryRows = await buildJournalEntryRows(context, entries, storyLinkedIndex);
  const archivedQuestRows = quests
    .filter(quest => quest.status !== 'active')
    .map(quest => createArchivedQuestJournalRow(context, quest, storyLinkedIndex));

  return [...entryRows, ...archivedQuestRows].sort(compareJournalRows);
}

async function buildJournalEntryRows(context, entries, storyLinkedIndex) {
  const visibleEntries = entries.filter(entry => context.isGM || !entry.gmOnly);
  const rows = [];

  for (const entry of visibleEntries) {
    const typeConfig = getStoryTypeConfig(entry.type);
    const enrichedContent = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      entry.content,
      {
        async: true,
        secrets: context.editable,
        rollData: context.actor?.getRollData?.(),
        relativeTo: context.actor
      }
    );

    rows.push({
      id: entry.id,
      rowId: `journal-entry-${entry.id}`,
      type: entry.type,
      typeLabel: getStoryTypeLabel(entry.type),
      icon: typeConfig.icon,
      title: entry.title || localizeText('BRP.characterCustomFieldUntitled', 'Untitled'),
      content: entry.content,
      enrichedContent,
      contentPreview: previewText(entry.content),
      searchText: `${entry.title} ${stripHtml(entry.content)}`.trim(),
      session: entry.session,
      inGameDate: entry.inGameDate,
      realDate: entry.realDate,
      realDateValue: entry.realDateValue,
      pinned: entry.pinned,
      linked: mapStoryLinkedRows(entry.linked, storyLinkedIndex),
      linkedCount: entry.linked.length,
      sortIndex: entry.sortIndex,
      gmOnly: entry.gmOnly,
      canMutate: !context.isLocked,
      source: 'entry',
      actions: {
        open: createStoryAction('storyJournalEdit', { entryId: entry.id }),
        menu: createStoryAction('storyJournalMenu', { entryId: entry.id }),
        pin: createStoryAction('storyJournalPinToggle', { entryId: entry.id })
      }
    });
  }

  return rows;
}

function createArchivedQuestJournalRow(context, quest, storyLinkedIndex) {
  const latestUpdate = quest.updates[0] ?? null;
  const content = quest.objective || previewText(quest.description, 180);

  return {
    id: quest.id,
    rowId: `journal-quest-${quest.id}`,
    type: 'quest',
    typeLabel: getStoryTypeLabel('quest'),
    icon: getStoryTypeConfig('quest').icon,
    title: quest.name,
    content,
    enrichedContent: content,
    contentPreview: previewText(content, 180),
    searchText: `${quest.name} ${content}`.trim(),
    session: latestUpdate?.session || quest.sessionGiven,
    inGameDate: latestUpdate?.inGameDate || '',
    realDate: latestUpdate?.realDate || '',
    realDateValue: latestUpdate?.realDateValue ?? null,
    pinned: false,
    linked: mapStoryLinkedRows(quest.linked, storyLinkedIndex),
    linkedCount: quest.linked.length,
    sortIndex: quest.sortOrder ?? quest.linkIndex ?? 0,
    status: quest.status,
    statusLabel: quest.statusLabel,
    updatesCount: quest.updates.length,
    canMutate: !context.isLocked,
    source: 'quest',
    questUuid: quest.uuid,
    actions: {
      open: createStoryAction('storyQuestOpen', { questUuid: quest.uuid, questId: quest.id }),
      menu: createStoryAction('storyQuestMenu', { questUuid: quest.uuid, questId: quest.id }),
      unlink: createStoryAction('storyQuestUnlink', { questUuid: quest.uuid, questId: quest.id })
    }
  };
}

function buildJournalTypeCounts(rows) {
  const counts = Object.fromEntries([
    ['session-log', 0],
    ['quest', 0],
    ['npc-encounter', 0],
    ['discovery', 0],
    ['decision', 0],
    ['milestone', 0],
    ['note', 0]
  ]);

  for (const row of rows) {
    counts[row.type] = (counts[row.type] ?? 0) + 1;
  }

  return counts;
}

function buildJournalFilterChips(activeTypes, counts) {
  return Object.keys(counts).map(type => ({
    id: type,
    label: getStoryTypeLabel(type),
    count: counts[type] ?? 0,
    active: activeTypes.includes(type),
    icon: getStoryTypeConfig(type).icon
  }));
}

function filterJournalRows(rows, filters) {
  const activeTypes = new Set(filters.types);
  const search = stringValue(filters.search).toLowerCase();

  return rows.filter(row => {
    if (!activeTypes.has(row.type)) return false;
    if (!search) return true;
    return String(row.searchText ?? '').toLowerCase().includes(search);
  });
}

function buildAllStoryEvents(context, entries, quests, storyLinkedIndex) {
  const events = [];

  for (const entry of entries) {
    if (!context.isGM && entry.gmOnly) continue;

    events.push({
      id: `entry:${entry.id}`,
      source: 'entry',
      type: entry.type,
      typeLabel: getStoryTypeLabel(entry.type),
      icon: getStoryTypeConfig(entry.type).icon,
      title: entry.title || localizeText('BRP.characterCustomFieldUntitled', 'Untitled'),
      contentPreview: previewText(entry.content, 120),
      session: entry.session,
      inGameDate: entry.inGameDate,
      realDate: entry.realDate,
      realDateValue: entry.realDateValue,
      sortIndex: entry.sortIndex,
      linked: mapStoryLinkedRows(entry.linked, storyLinkedIndex),
      action: createStoryAction('storyJournalEdit', { entryId: entry.id })
    });
  }

  for (const quest of quests) {
    if (quest.sessionGiven || quest.objective) {
      events.push({
        id: `quest:${quest.id}:given`,
        source: 'quest',
        type: 'quest',
        typeLabel: getStoryTypeLabel('quest'),
        icon: getStoryTypeConfig('quest').icon,
        title: quest.name,
        contentPreview: quest.objectivePreview,
        session: quest.sessionGiven,
        inGameDate: '',
        realDate: '',
        realDateValue: null,
        sortIndex: quest.sortOrder ?? quest.linkIndex ?? 0,
        linked: mapStoryLinkedRows(quest.linked, storyLinkedIndex),
        action: createStoryAction('storyQuestOpen', { questUuid: quest.uuid, questId: quest.id })
      });
    }

    for (const [index, update] of quest.updates.entries()) {
      events.push({
        id: `quest:${quest.id}:update:${update.id || index}`,
        source: 'quest-update',
        type: 'quest',
        typeLabel: getStoryTypeLabel('quest'),
        icon: getStoryTypeConfig('quest').icon,
        title: quest.name,
        contentPreview: previewText(update.text, 120),
        session: update.session || quest.sessionGiven,
        inGameDate: update.inGameDate,
        realDate: update.realDate,
        realDateValue: update.realDateValue,
        sortIndex: (quest.sortOrder ?? quest.linkIndex ?? 0) + index + 1,
        linked: mapStoryLinkedRows(quest.linked, storyLinkedIndex),
        action: createStoryAction('storyQuestOpen', { questUuid: quest.uuid, questId: quest.id })
      });
    }
  }

  return events.sort(compareStoryTimelineEventAsc);
}

function buildTimelineDataset(events, view) {
  const sessions = buildTimelineSessions(events);
  const markers = buildTimelineMarkers(sessions);

  return {
    title: localizeText('BRP.storyTimelineTitle', 'Story Timeline'),
    view,
    viewOptions: [
      {
        id: 'horizontal',
        label: localizeText('BRP.storyTimelineViewSessions', 'Sessions'),
        icon: 'fas fa-arrows-alt-h',
        active: view === 'horizontal'
      },
      {
        id: 'lanes',
        label: localizeText('BRP.storyTimelineViewLanes', 'Parallel lanes'),
        icon: 'fas fa-bars',
        active: view === 'lanes'
      }
    ],
    sessions,
    markers,
    lanes: buildTimelineLanes(events, markers),
    hasEvents: events.length > 0,
    events
  };
}

function buildTimelineSessions(events) {
  const groups = new Map();

  for (const event of events) {
    const label = stringValue(event.session) || localizeText('BRP.storyTimelineUnknownSession', 'Unassigned');
    const key = label.toLowerCase();
    const group = groups.get(key) ?? {
      id: key,
      label,
      count: 0,
      events: []
    };

    group.events.push(event);
    group.count += 1;
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map(group => {
      const sortedEvents = [...group.events].sort(compareStoryTimelineEventAsc);
      return {
        ...group,
        events: sortedEvents,
        sortEvent: sortedEvents[0] ?? null,
        displayDate: getTimelineSessionDateLabel(sortedEvents[0] ?? null)
      };
    })
    .sort((left, right) => compareStoryTimelineEventAsc(left.sortEvent, right.sortEvent) || compareStoryText(left.label, right.label));
}

function buildTimelineMarkers(sessions) {
  if (!sessions.length) return [];

  return sessions.map((session, index) => ({
    id: session.id,
    label: session.label,
    count: session.count,
    position: sessions.length === 1
      ? 0
      : Number(((100 * index) / sessions.length).toFixed(2)),
    eventPosition: Number((((index + 0.5) / sessions.length) * 100).toFixed(2))
  }));
}

function buildTimelineLanes(events, markers) {
  const grouped = new Map();
  const types = ['session-log', 'quest', 'npc-encounter', 'discovery', 'decision', 'milestone', 'note'];
  const markerLookup = new Map(markers.map(marker => [marker.id, marker]));

  for (const type of types) {
    grouped.set(type, {
      id: type,
      label: getStoryTypeLabel(type),
      icon: getStoryTypeConfig(type).icon,
      count: 0,
      events: []
    });
  }

  for (const event of events) {
    const lane = grouped.get(event.type);
    if (!lane) continue;
    const marker = resolveTimelineMarker(event, markerLookup);
    lane.events.push({
      ...event,
      position: marker.eventPosition ?? marker.position,
      sessionLabel: marker.label
    });
    lane.count += 1;
  }

  return types.map(type => {
    const lane = grouped.get(type);
    return {
      ...lane,
      events: lane.events.sort(compareStoryTimelineEventAsc)
    };
  });
}

function resolveTimelineMarker(event, markerLookup) {
  const sessionLabel = stringValue(event?.session) || localizeText('BRP.storyTimelineUnknownSession', 'Unassigned');
  const marker = markerLookup.get(sessionLabel.toLowerCase());

  return marker ?? {
    id: sessionLabel.toLowerCase(),
    label: sessionLabel,
    position: 0,
    eventPosition: 50
  };
}

function getTimelineSessionDateLabel(event) {
  if (!event) return '';
  return stringValue(event.inGameDate) || stringValue(event.realDate);
}

function mapStoryLinkedRows(links, storyLinkedIndex) {
  return links.map(link => storyLinkedIndex[link] ?? {
    key: link,
    kind: '',
    kindLabel: '',
    uuid: link,
    label: link,
    displayLabel: link,
    resolved: false,
    orphan: true,
    action: null
  });
}

function compareActiveQuestRows(left, right) {
  if (left.quest.sortOrder != null || right.quest.sortOrder != null) {
    if (left.quest.sortOrder != null && right.quest.sortOrder != null && left.quest.sortOrder !== right.quest.sortOrder) {
      return left.quest.sortOrder - right.quest.sortOrder;
    }
    return left.quest.sortOrder != null ? -1 : 1;
  }

  return compareStoryText(left.sessionGiven, right.sessionGiven)
    || compareStoryText(left.name, right.name);
}

function compareJournalRows(left, right) {
  if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;

  const byDate = compareStoryRealDateDesc(left, right);
  if (byDate !== 0) return byDate;

  const leftSort = Number(left.sortIndex ?? 0);
  const rightSort = Number(right.sortIndex ?? 0);
  if (leftSort !== rightSort) return rightSort - leftSort;

  return compareStoryText(left.title ?? left.id, right.title ?? right.id);
}
