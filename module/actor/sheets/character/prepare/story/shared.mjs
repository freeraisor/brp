import { STORY_SECTION_IDS } from '../../character-sheet-config.mjs';
import { normalizeSectionStateMap, numberOrNull, numberOrZero, readStoredBoolean } from '../../character-sheet-utils.mjs';

export const STORY_ROW_TYPE_IDS = ['session-log', 'quest', 'npc-encounter', 'discovery', 'decision', 'milestone', 'note'];
export const STORY_TIMELINE_VIEW_IDS = ['horizontal', 'lanes'];
export const STORY_QUEST_STATUS_IDS = ['active', 'completed', 'failed', 'abandoned'];

const STORY_TYPE_CONFIG = {
  'session-log': { icon: 'fas fa-book-open', label: 'BRP.storyEntryTypeSessionLog' },
  quest: { icon: 'fas fa-scroll', label: 'BRP.storyEntryTypeQuest' },
  'npc-encounter': { icon: 'fas fa-user-group', label: 'BRP.storyEntryTypeNpcEncounter' },
  discovery: { icon: 'fas fa-compass', label: 'BRP.storyEntryTypeDiscovery' },
  decision: { icon: 'fas fa-code-branch', label: 'BRP.storyEntryTypeDecision' },
  milestone: { icon: 'fas fa-star', label: 'BRP.storyEntryTypeMilestone' },
  note: { icon: 'fas fa-note-sticky', label: 'BRP.storyEntryTypeNote' }
};

export function createStoryPreparation(actor) {
  return {
    entries: normalizeStoryEntries(actor.system?.story?.entries),
    questLinks: normalizeQuestLinks(actor.system?.story?.questLinks),
    linkCache: new Map(),
    questCache: new Map()
  };
}

export function getStorySheetFlags(context) {
  return context.actor?.getFlag?.('brp', 'sheet')?.story
    ?? context.flags?.brp?.sheet?.story
    ?? {};
}

export function buildStoryCollapsedSectionsState(collapsedSections, options = {}) {
  return normalizeSectionStateMap(STORY_SECTION_IDS, collapsedSections, {
    fallback: false,
    ...options
  });
}

export function sanitizeStoryFilters(filters) {
  const source = filters && typeof filters === 'object' ? filters : {};
  const hasExplicitTypes = Array.isArray(source.types);
  const allowedTypes = Array.isArray(source.types)
    ? source.types.map(type => normalizeStoryEntryType(type, '')).filter(Boolean)
    : [];

  return {
    types: hasExplicitTypes ? Array.from(new Set(allowedTypes)) : [...STORY_ROW_TYPE_IDS],
    search: stringValue(source.search)
  };
}

export function sanitizeTimelineView(value) {
  const normalized = stringValue(value).toLowerCase();
  return STORY_TIMELINE_VIEW_IDS.includes(normalized) ? normalized : 'horizontal';
}

export function normalizeStoryEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries.map((entry, index) => {
    const source = entry && typeof entry === 'object' ? entry : {};
    const realDate = stringValue(source.realDate);

    return {
      id: stringValue(source.id) || `story-entry-${index}`,
      type: normalizeStoryEntryType(source.type),
      title: stringValue(source.title),
      content: String(source.content ?? ''),
      session: stringValue(source.session),
      inGameDate: stringValue(source.inGameDate),
      realDate,
      realDateValue: parseStoryDate(realDate),
      pinned: readStoredBoolean(source.pinned, false),
      linked: normalizeStoryLinks(source.linked),
      gmOnly: readStoredBoolean(source.gmOnly, false),
      sortIndex: numberOrNull(source.sortIndex) ?? (index * 10),
      index
    };
  });
}

export function normalizeQuestLinks(questLinks) {
  if (!Array.isArray(questLinks)) return [];

  const seen = new Set();
  const normalized = [];

  for (const [index, questLink] of questLinks.entries()) {
    const source = questLink && typeof questLink === 'object' ? questLink : {};
    const uuid = stringValue(source.uuid);
    if (!uuid || seen.has(uuid)) continue;

    seen.add(uuid);
    normalized.push({
      uuid,
      sortOrder: numberOrNull(source.sortOrder),
      index
    });
  }

  return normalized;
}

export function normalizeQuestStatus(value) {
  const normalized = stringValue(value).toLowerCase();
  return STORY_QUEST_STATUS_IDS.includes(normalized) ? normalized : 'active';
}

export function normalizeQuestUpdates(updates) {
  if (!Array.isArray(updates)) return [];

  const normalized = updates.map((update, index) => {
    const source = update && typeof update === 'object' ? update : {};
    const realDate = stringValue(source.realDate);

    return {
      id: stringValue(source.id) || `quest-update-${index}`,
      session: stringValue(source.session),
      inGameDate: stringValue(source.inGameDate),
      realDate,
      realDateValue: parseStoryDate(realDate),
      text: String(source.text ?? ''),
      index
    };
  });

  normalized.sort(compareStoryTimelineEventAsc);
  return normalized;
}

export function normalizeStoryEntryType(value, fallback = 'note') {
  const normalized = stringValue(value).toLowerCase();
  return STORY_ROW_TYPE_IDS.includes(normalized) ? normalized : fallback;
}

export function normalizeStoryLinks(links) {
  if (!Array.isArray(links)) return [];

  const normalized = [];
  const seen = new Set();

  for (const link of links) {
    const value = stringValue(link);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

export function parseStoryLink(link) {
  const value = stringValue(link);
  if (!value) {
    return {
      key: '',
      kind: '',
      uuid: ''
    };
  }

  const separatorIndex = value.indexOf(':');
  if (separatorIndex < 0) {
    return {
      key: value,
      kind: '',
      uuid: value
    };
  }

  return {
    key: value,
    kind: value.slice(0, separatorIndex).trim().toLowerCase(),
    uuid: value.slice(separatorIndex + 1).trim()
  };
}

export function getStoryTypeConfig(type) {
  return STORY_TYPE_CONFIG[normalizeStoryEntryType(type)] ?? STORY_TYPE_CONFIG.note;
}

export function getStoryTypeLabel(type) {
  const config = getStoryTypeConfig(type);
  return localizeText(config.label, type);
}

export function getStoryLinkKindLabel(kind) {
  const labels = {
    contact: localizeText('BRP.contact', 'Contact'),
    faction: localizeText('BRP.faction', 'Faction'),
    quest: localizeText('TYPES.Item.quest', 'Quest'),
    item: localizeText('BRP.items', 'Item'),
    entry: 'Entry'
  };

  return labels[stringValue(kind).toLowerCase()] ?? stringValue(kind);
}

export function getStoryStatusLabel(status) {
  const labels = {
    active: localizeText('BRP.storyQuestStatusActive', 'Active'),
    completed: localizeText('BRP.storyQuestStatusCompleted', 'Completed'),
    failed: localizeText('BRP.storyQuestStatusFailed', 'Failed'),
    abandoned: localizeText('BRP.storyQuestStatusAbandoned', 'Abandoned')
  };

  return labels[normalizeQuestStatus(status)] ?? labels.active;
}

export function createStoryAction(action, data = {}) {
  return {
    action,
    ...data
  };
}

export function stripHtml(value = '') {
  return String(value ?? '').replace(/(<([^>]+)>)/g, ' ').replace(/\s+/g, ' ').trim();
}

export function previewText(value, maxLength = 180) {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function parseStoryDate(value) {
  const text = stringValue(value);
  if (!text) return null;

  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function compareStoryText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base'
  });
}

export function compareStoryRealDateDesc(left, right) {
  const leftValue = left?.realDateValue;
  const rightValue = right?.realDateValue;
  if (leftValue == null && rightValue == null) return 0;
  if (leftValue == null) return 1;
  if (rightValue == null) return -1;
  return rightValue - leftValue;
}

export function compareStoryTimelineEventAsc(left, right) {
  const leftValue = left?.realDateValue;
  const rightValue = right?.realDateValue;

  if (leftValue != null || rightValue != null) {
    if (leftValue == null) return 1;
    if (rightValue == null) return -1;
    if (leftValue !== rightValue) return leftValue - rightValue;
  }

  const leftSort = numberOrZero(left?.sortIndex);
  const rightSort = numberOrZero(right?.sortIndex);
  if (leftSort !== rightSort) return leftSort - rightSort;

  return compareStoryText(left?.title ?? left?.id, right?.title ?? right?.id);
}

export function compareStoryTimelineEventDesc(left, right) {
  return compareStoryTimelineEventAsc(right, left);
}

export function stringValue(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

export function localizeText(key, fallback = '') {
  if (!key) return fallback;
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
}
