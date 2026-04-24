import BRPDialog from '../../../setup/brp-dialog.mjs';
import { BRPContextMenu } from '../../../setup/context-menu.mjs';
import { STORY_SECTION_IDS } from './character-sheet-config.mjs';
import {
  buildStoryCollapsedSectionsState,
  getStoryTypeLabel,
  normalizeQuestLinks,
  normalizeQuestStatus,
  normalizeStoryEntryType,
  normalizeStoryLinks,
  parseStoryLink,
  sanitizeStoryFilters,
  sanitizeTimelineView,
  stringValue
} from './prepare/story/shared.mjs';
import {
  captureRefreshWorkspaceScroll,
  cssEscape,
  escapeHTML,
  getTargetElement,
  readStoredBoolean,
  restoreRefreshWorkspaceScrollSoon
} from './character-sheet-utils.mjs';

const STORY_CONTEXT_SELECTORS = {
  quest: '.brp-story-refresh-quest-card[data-quest-id], .brp-story-refresh-journal-entry[data-story-source="quest"][data-quest-id]',
  journal: '.brp-story-refresh-journal-entry[data-story-source="entry"][data-entry-id]'
};

const STORY_QUEST_STATUS_ACTIONS = [
  ['completed', 'BRP.storyQuestMarkCompleted'],
  ['failed', 'BRP.storyQuestMarkFailed'],
  ['abandoned', 'BRP.storyQuestMarkAbandoned']
];

export const STORY_SHEET_ACTIONS = {
  storySectionToggle: onStorySectionToggle,
  storyQuestCreate: onStoryQuestCreate,
  storyQuestMenu: onStoryQuestMenu,
  storyQuestOpen: onStoryQuestOpen,
  storyQuestUpdateCreate: onStoryQuestUpdateCreate,
  storyQuestUnlink: onStoryQuestUnlink,
  storyJournalCreate: onStoryJournalCreate,
  storyJournalEdit: onStoryJournalEdit,
  storyJournalPinToggle: onStoryJournalPinToggle,
  storyJournalMenu: onStoryJournalMenu,
  storyFilterTypeToggle: onStoryFilterTypeToggle,
  storyFilterSearch: onStoryFilterSearch,
  storyOpenLinked: onStoryOpenLinked,
  storyTimelineOpen: onStoryTimelineOpen,
  storyTimelineClose: onStoryTimelineClose,
  storyTimelineViewSet: onStoryTimelineViewSet
};

export const storySheetMethods = {
  _bindStoryControls() {
    const root = this.element.querySelector('.brp-story-refresh');
    if (!root) return;

    root.querySelectorAll(STORY_CONTEXT_SELECTORS.quest).forEach(row => {
      row.addEventListener('dblclick', event => {
        if (event.target.closest('.brp-story-refresh-quest-actions, .brp-story-refresh-journal-actions, .brp-story-refresh-linked-chip')) return;
        onStoryQuestOpen.call(this, event, event.currentTarget);
      });
    });

    root.querySelectorAll(STORY_CONTEXT_SELECTORS.journal).forEach(row => {
      row.addEventListener('dblclick', event => {
        if (event.target.closest('.brp-story-refresh-journal-actions, .brp-story-refresh-linked-chip')) return;
        onStoryJournalEdit.call(this, event, event.currentTarget);
      });
    });

    root.querySelectorAll('.brp-story-refresh-search-input').forEach(input => {
      input.addEventListener('input', event => {
        onStoryFilterSearch.call(this, event, event.currentTarget);
      });
    });

    applyStoryJournalFilters(root, readStoryFiltersFromDom(root));
  },

  _bindStoryContextMenu() {
    const bindings = [
      [STORY_CONTEXT_SELECTORS.quest, target => this._getStoryQuestContextOptions(target)],
      [STORY_CONTEXT_SELECTORS.journal, target => this._getStoryJournalContextOptions(target)]
    ];

    for (const [selector, getter] of bindings) {
      if (!selector || !this.element.querySelector(selector)) continue;

      new BRPContextMenu(this.element, selector, [], {
        jQuery: false,
        onOpen: target => {
          ui.context.menuItems = getter(target);
        }
      });
    }
  },

  _getStoryQuestContextOptions(target) {
    const quest = getStoryQuestFromTarget(target);
    if (!quest) return [];

    const status = normalizeQuestStatus(quest.system?.status);
    const options = [
      {
        name: 'BRP.view',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: () => quest.sheet?.render(true)
      }
    ];

    if (!this.actor.system.lock) {
      options.push({
        name: game.i18n.localize('BRP.storyQuestAddUpdate'),
        icon: '<i class="fas fa-plus fa-fw"></i>',
        callback: listItem => openStoryQuestUpdateDialog(this, listItem ?? target)
      });

      for (const [nextStatus, labelKey] of STORY_QUEST_STATUS_ACTIONS) {
        if (nextStatus === status) continue;
        options.push({
          name: game.i18n.localize(labelKey),
          icon: '<i class="fas fa-flag fa-fw"></i>',
          callback: listItem => setStoryQuestStatus(this, listItem ?? target, nextStatus)
        });
      }

      options.push({
        name: game.i18n.localize('BRP.storyQuestUnlink'),
        icon: '<i class="fas fa-unlink fa-fw"></i>',
        callback: listItem => unlinkStoryQuestFromCharacter(this, listItem ?? target)
      });
    }

    return options;
  },

  _getStoryJournalContextOptions(target) {
    const entry = getStoryEntryFromTarget(this.actor, target);
    if (!entry) return [];

    const options = [
      {
        name: game.i18n.localize(this.actor.system.lock ? 'BRP.view' : 'BRP.storyEditEntry'),
        icon: '<i class="fas fa-pen fa-fw"></i>',
        callback: listItem => openStoryJournalEntryDialog(this, listItem ?? target)
      }
    ];

    if (!this.actor.system.lock) {
      options.push({
        name: entry.pinned ? game.i18n.localize('BRP.storyUnpinEntry') : game.i18n.localize('BRP.storyPinEntry'),
        icon: '<i class="fas fa-star fa-fw"></i>',
        callback: listItem => toggleStoryJournalPinned(this, listItem ?? target)
      });
      options.push({
        name: game.i18n.localize('BRP.duplicate'),
        icon: '<i class="fas fa-copy fa-fw"></i>',
        callback: listItem => duplicateStoryJournalEntry(this, listItem ?? target)
      });
      options.push({
        name: game.i18n.localize('BRP.delete'),
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: listItem => deleteStoryJournalEntry(this, listItem ?? target)
      });
    }

    return options;
  }
};

async function onStorySectionToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const section = getStorySectionFromTarget(this.element, target);
  const sectionId = getStorySectionId(target);
  if (!section || !STORY_SECTION_IDS.includes(sectionId)) return;

  const settings = getStorySheetSettings(this.actor);
  const isCollapsed = section.classList.contains('is-collapsed');
  const nextCollapsed = !isCollapsed;
  updateStorySectionCollapsedMarkup(section, target, nextCollapsed);

  settings.collapsedSections[sectionId] = nextCollapsed;
  settings.stateInitialized = true;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await this.actor.update({ 'flags.brp.sheet.story': settings }, { render: false, renderSheet: false });
  } catch (error) {
    updateStorySectionCollapsedMarkup(section, target, isCollapsed);
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onStoryQuestCreate(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await openStoryQuestAttachDialog(this, target);
}

function onStoryQuestMenu(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const owner = getStoryQuestContextOwner(target);
  if (!owner) return;
  dispatchStoryContextMenu(owner, target);
}

async function onStoryQuestOpen(event, target) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const quest = getStoryQuestFromTarget(target);
  quest?.sheet?.render(true);
}

async function onStoryQuestUpdateCreate(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await openStoryQuestUpdateDialog(this, target);
}

async function onStoryQuestUnlink(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await unlinkStoryQuestFromCharacter(this, target);
}

async function onStoryJournalCreate(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await openStoryJournalEntryDialog(this, target);
}

async function onStoryJournalEdit(event, target) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  await openStoryJournalEntryDialog(this, target);
}

async function onStoryJournalPinToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await toggleStoryJournalPinned(this, target);
}

function onStoryJournalMenu(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const owner = getStoryJournalContextOwner(target);
  if (!owner) return;
  dispatchStoryContextMenu(owner, target);
}

async function onStoryFilterTypeToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const button = getTargetElement(target);
  const root = getStoryRoot(this, button);
  if (!button || !root) return;

  const nextActive = !button.classList.contains('is-active');
  updateStoryFilterChipMarkup(button, nextActive);

  const filters = readStoryFiltersFromDom(root);
  applyStoryJournalFilters(root, filters);
  await persistStoryFilters(this, button, filters);
}

async function onStoryFilterSearch(event, target) {
  event?.stopPropagation?.();

  const input = getTargetElement(target);
  const root = getStoryRoot(this, input);
  if (!input || !root) return;

  const filters = readStoryFiltersFromDom(root);
  applyStoryJournalFilters(root, filters);
  await persistStoryFilters(this, input, filters);
}

async function onStoryOpenLinked(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const element = getTargetElement(target);
  const parsed = parseStoryLink(element?.dataset?.link || `${element?.dataset?.kind ?? ''}:${element?.dataset?.uuid ?? ''}`);
  if (!parsed.key) return;

  if (parsed.kind === 'entry') {
    const root = getStoryRoot(this, element);
    const row = root?.querySelector?.(`.brp-story-refresh-journal-entry[data-entry-id="${cssEscape(parsed.uuid)}"]`);
    if (row && row.hidden !== true) {
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      row.classList.add('is-linked-target');
      globalThis.setTimeout(() => row.classList.remove('is-linked-target'), 1200);
      return;
    }

    await openStoryJournalEntryDialog(this, { dataset: { entryId: parsed.uuid } });
    return;
  }

  let document = null;
  try {
    document = await fromUuid(parsed.uuid);
  } catch (error) {
    console.warn(`BRP | Failed to open story linked reference (${parsed.key})`, error);
  }

  if (!document?.sheet) {
    ui.notifications.warn(game.i18n.localize('BRP.storyLinkedTargetMissing'));
    return;
  }

  document.sheet.render(true);
}

function onStoryTimelineOpen(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const root = getStoryRoot(this, target);
  if (!root) return;

  updateStoryTimelineMarkup(root, true);
  this._rememberUiState?.();
}

function onStoryTimelineClose(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const root = getStoryRoot(this, target);
  if (!root) return;

  updateStoryTimelineMarkup(root, false);
  this._rememberUiState?.();
}

async function onStoryTimelineViewSet(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const view = sanitizeTimelineView(getTargetElement(target)?.dataset?.view);
  const root = getStoryRoot(this, target);
  if (!root) return;

  updateStoryTimelineViewMarkup(root, view);
  await persistStoryTimelineView(this, target, view);
  this._rememberUiState?.();
}

function getStorySectionId(target) {
  const element = getTargetElement(target);
  return String(
    element?.dataset?.sectionId
    ?? element?.closest?.('[data-section-id]')?.dataset?.sectionId
    ?? element?.closest?.('.brp-story-refresh-section[data-story-section]')?.dataset?.storySection
    ?? ''
  ).trim();
}

function getStorySectionFromTarget(root, target) {
  const sectionId = getStorySectionId(target);
  if (!sectionId) return null;
  return root?.querySelector?.(`.brp-story-refresh-section[data-story-section="${cssEscape(sectionId)}"]`) ?? null;
}

function getStoryRoot(sheetOrTarget, target = null) {
  return getTargetElement(target)?.closest?.('.brp-story-refresh')
    ?? getTargetElement(sheetOrTarget)?.closest?.('.brp-story-refresh')
    ?? sheetOrTarget?.element?.querySelector?.('.brp-story-refresh');
}

function getStoryQuestContextOwner(target) {
  return getTargetElement(target)?.closest?.('.brp-story-refresh-quest-card[data-quest-id], .brp-story-refresh-journal-entry[data-story-source="quest"][data-quest-id]') ?? null;
}

function getStoryJournalContextOwner(target) {
  return getTargetElement(target)?.closest?.('.brp-story-refresh-journal-entry[data-story-source="entry"][data-entry-id]') ?? null;
}

function getStoryQuestFromTarget(target) {
  const owner = getStoryQuestContextOwner(target);
  const element = getTargetElement(target);
  const questId = owner?.dataset?.questId ?? element?.dataset?.questId;
  const quest = game.items.get(questId);
  return quest?.type === 'quest' ? quest : null;
}

function getStoryEntryIdFromTarget(target) {
  const owner = getStoryJournalContextOwner(target);
  const element = getTargetElement(target);
  return String(owner?.dataset?.entryId ?? element?.dataset?.entryId ?? '').trim();
}

function getStoryEntries(actor) {
  return Array.isArray(actor.system?.story?.entries)
    ? foundry.utils.deepClone(actor.system.story.entries)
    : [];
}

function getStoryEntryFromTarget(actor, target) {
  const entryId = getStoryEntryIdFromTarget(target);
  if (!entryId) return null;
  return getStoryEntries(actor).find(entry => String(entry?.id ?? '') === entryId) ?? null;
}

function getStorySheetSettings(actor) {
  const sheetFlags = foundry.utils.deepClone(actor.getFlag('brp', 'sheet') ?? {});
  const settings = sheetFlags.story ?? {};
  settings.stateInitialized = readStoredBoolean(settings.stateInitialized, false);
  settings.collapsedSections = buildStoryCollapsedSectionsState(settings.collapsedSections, {
    initialized: settings.stateInitialized,
    ignoreAllTrueUnlessInitialized: true
  });
  settings.filters = sanitizeStoryFilters(settings.filters);
  settings.timelineView = sanitizeTimelineView(settings.timelineView);
  return settings;
}

function updateStorySectionCollapsedMarkup(section, toggle, isCollapsed) {
  section?.classList.toggle('is-collapsed', isCollapsed);
  const body = section?.querySelector?.('.brp-story-refresh-section-body');
  if (body) body.hidden = isCollapsed;
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.dataset.tooltip = game.i18n.localize(isCollapsed ? 'BRP.expand' : 'BRP.collapse');
  }
}

function dispatchStoryContextMenu(owner, target) {
  const button = getTargetElement(target);
  const rect = button?.getBoundingClientRect?.();
  owner.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    view: globalThis.window,
    clientX: rect?.right ?? 0,
    clientY: rect?.bottom ?? 0
  }));
}

function readStoryFiltersFromDom(root) {
  return sanitizeStoryFilters({
    types: Array.from(root?.querySelectorAll?.('.brp-story-refresh-type-chip.is-active') ?? [])
      .map(button => String(button.dataset.type ?? '').trim())
      .filter(Boolean),
    search: root?.querySelector?.('.brp-story-refresh-search-input')?.value ?? ''
  });
}

function updateStoryFilterChipMarkup(button, isActive) {
  button?.classList.toggle('is-active', isActive);
  button?.setAttribute('aria-pressed', String(isActive));
}

function applyStoryJournalFilters(root, filters) {
  const journalSection = root?.querySelector?.('.brp-story-refresh-section[data-story-section="journal"]');
  if (!journalSection) return;

  const rows = Array.from(journalSection.querySelectorAll('.brp-story-refresh-journal-entry'));
  if (!rows.length) return;

  const allowedTypes = new Set(filters.types);
  const search = stringValue(filters.search).toLowerCase();
  let visibleCount = 0;

  for (const row of rows) {
    const type = String(row.dataset.storyType ?? '').trim();
    const searchText = String(row.dataset.searchText ?? row.textContent ?? '').toLowerCase();
    const visible = allowedTypes.has(type) && (!search || searchText.includes(search));
    row.hidden = !visible;
    if (visible) visibleCount += 1;
  }

  const count = journalSection.querySelector('.brp-story-refresh-section-count');
  if (count) count.textContent = String(visibleCount);

  const feed = journalSection.querySelector('.brp-story-refresh-journal-feed');
  if (feed) feed.hidden = visibleCount === 0;

  let empty = journalSection.querySelector('[data-story-journal-empty]');
  if (!empty && feed) {
    empty = document.createElement('div');
    empty.className = 'brp-story-refresh-empty';
    empty.dataset.storyJournalEmpty = 'true';
    empty.hidden = true;
    feed.insertAdjacentElement('afterend', empty);
  }

  if (empty) {
    empty.hidden = visibleCount !== 0;
    empty.textContent = rows.length
      ? game.i18n.localize('BRP.storyNoMatches')
      : game.i18n.localize('BRP.storyEmptyJournal');
  }
}

async function persistStoryFilters(sheet, target, filters) {
  const settings = getStorySheetSettings(sheet.actor);
  settings.filters = filters;
  settings.stateInitialized = true;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'flags.brp.sheet.story': settings }, { render: false, renderSheet: false });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

function updateStoryTimelineMarkup(root, isOpen) {
  const overlay = root?.querySelector?.('[data-story-timeline]');
  if (!overlay) return;
  overlay.hidden = !isOpen;
}

function updateStoryTimelineViewMarkup(root, view) {
  const overlay = root?.querySelector?.('[data-story-timeline]');
  if (!overlay) return;

  overlay.classList.remove('is-view-horizontal', 'is-view-lanes');
  overlay.classList.add(`is-view-${view}`);

  overlay.querySelectorAll('.brp-story-refresh-timeline-switch[data-view]').forEach(button => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

async function persistStoryTimelineView(sheet, target, view) {
  const settings = getStorySheetSettings(sheet.actor);
  settings.timelineView = view;
  settings.stateInitialized = true;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'flags.brp.sheet.story': settings }, { render: false, renderSheet: false });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

function getCharacterQuestLinks(actor) {
  return normalizeQuestLinks(actor.system?.story?.questLinks);
}

function getNextStoryQuestSortOrder(questLinks) {
  if (!questLinks.length) return 0;
  const sortOrders = questLinks
    .map(entry => Number(entry?.sortOrder))
    .filter(Number.isFinite);
  return sortOrders.length ? Math.max(...sortOrders) + 10 : questLinks.length * 10;
}

async function openStoryQuestAttachDialog(sheet, target) {
  const linkedQuestUuids = new Set(getCharacterQuestLinks(sheet.actor).map(entry => String(entry?.uuid ?? '').trim()).filter(Boolean));
  const candidates = game.items.contents
    .filter(item => item.type === 'quest' && !linkedQuestUuids.has(item.uuid))
    .sort((left, right) => left.name.localeCompare(right.name));
  const canLink = candidates.length > 0;

  const html = `
    <div class="brp brp-dialog-form brp-story-quest-dialog">
      <label>
        <span>${game.i18n.localize('BRP.storyQuestAttachMode')}</span>
        <select name="mode">
          <option value="create">${game.i18n.localize('BRP.storyQuestCreateNew')}</option>
          ${canLink ? `<option value="link">${game.i18n.localize('BRP.storyQuestLinkExisting')}</option>` : ''}
        </select>
      </label>
      <label>
        <span>${game.i18n.localize('BRP.name')}</span>
        <input type="text" name="name" autocomplete="off" />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.storyQuestLinkExisting')}</span>
        <select name="questId" ${canLink ? '' : 'disabled'}>
          ${canLink
            ? candidates.map((quest, index) => `<option value="${escapeHTML(quest.id)}" ${index === 0 ? 'selected' : ''}>${escapeHTML(quest.name)}</option>`).join('')
            : `<option value="">${escapeHTML(game.i18n.localize('BRP.storyQuestNoAvailableToLink'))}</option>`}
        </select>
      </label>
    </div>
  `;
  const usage = await BRPDialog.input({
    window: { title: game.i18n.localize('BRP.storyAddQuest') },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.confirm')
    }
  });
  if (!usage) return;

  const mode = String(usage.mode ?? 'create').trim();
  if (mode === 'link') {
    const quest = game.items.get(String(usage.questId ?? ''));
    if (!(quest instanceof Item) || quest.type !== 'quest') {
      ui.notifications.warn(game.i18n.localize('BRP.storyQuestSelectExisting'));
      return;
    }
    await attachQuestToCharacter(sheet, target, quest);
    return;
  }

  const name = String(usage.name ?? '').trim();
  if (!name) {
    ui.notifications.warn(game.i18n.localize('BRP.storyQuestNameRequired'));
    return;
  }

  const ItemCls = getDocumentClass('Item');
  const quest = await ItemCls.create({
    name,
    type: 'quest'
  });
  if (!quest) return;

  await initializeWorldItemBrpid(quest);
  await attachQuestToCharacter(sheet, target, quest);
  quest.sheet?.render(true);
}

async function initializeWorldItemBrpid(item) {
  const key = await game.system.api.brpid.guessId(item);
  await item.update({
    'flags.brp.brpidFlag.id': key || '',
    'flags.brp.brpidFlag.lang': game.i18n.lang,
    'flags.brp.brpidFlag.priority': 0
  });
}

async function attachQuestToCharacter(sheet, target, quest) {
  const questLinks = getCharacterQuestLinks(sheet.actor);
  if (questLinks.some(entry => entry.uuid === quest.uuid)) {
    ui.notifications.warn(game.i18n.localize('BRP.dupItem'));
    return false;
  }

  questLinks.push({
    uuid: quest.uuid,
    sortOrder: getNextStoryQuestSortOrder(questLinks)
  });

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'system.story.questLinks': questLinks });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }

  return true;
}

async function openStoryQuestUpdateDialog(sheet, target) {
  const quest = getStoryQuestFromTarget(target);
  if (!quest) return;

  const html = `
    <div class="brp brp-dialog-form brp-story-quest-update-dialog">
      <label>
        <span>${game.i18n.localize('BRP.storySession')}</span>
        <input type="text" name="session" value="${escapeHTML(getStorySuggestedSession(sheet.actor, quest.system?.sessionGiven))}" autocomplete="off" />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.storyInGameDate')}</span>
        <input type="text" name="inGameDate" autocomplete="off" />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.storyRealDate')}</span>
        <input type="text" name="realDate" value="${escapeHTML(getCurrentStoryDateString())}" autocomplete="off" />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.storyQuestUpdateText')}</span>
        <textarea name="text" rows="6"></textarea>
      </label>
    </div>
  `;
  const usage = await BRPDialog.input({
    window: { title: game.i18n.format('BRP.storyQuestAddUpdateTitle', { name: quest.name }) },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.confirm')
    }
  });
  if (!usage) return;

  const text = String(usage.text ?? '').trim();
  if (!text) {
    ui.notifications.warn(game.i18n.localize('BRP.storyQuestUpdateTextRequired'));
    return;
  }

  const updates = Array.isArray(quest.system?.updates)
    ? foundry.utils.deepClone(quest.system.updates)
    : [];
  updates.push({
    id: foundry.utils.randomID(),
    session: String(usage.session ?? '').trim(),
    inGameDate: String(usage.inGameDate ?? '').trim(),
    realDate: String(usage.realDate ?? '').trim(),
    text
  });

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await quest.update({ 'system.updates': updates });
    await rerenderStorySheetAfterQuestMutation(sheet, target);
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function setStoryQuestStatus(sheet, target, status) {
  const quest = getStoryQuestFromTarget(target);
  if (!quest) return;

  const nextStatus = normalizeQuestStatus(status);
  if (normalizeQuestStatus(quest.system?.status) === nextStatus) return;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await quest.update({ 'system.status': nextStatus });
    await rerenderStorySheetAfterQuestMutation(sheet, target);
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function rerenderStorySheetAfterQuestMutation(sheet, target) {
  if (!sheet?.isRendered && !sheet?.rendered) return;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  sheet._rememberUiState?.();
  await sheet.render(false);
  restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
}

async function unlinkStoryQuestFromCharacter(sheet, target) {
  const quest = getStoryQuestFromTarget(target);
  if (!quest) return;

  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize('BRP.storyQuestUnlink') },
    content: game.i18n.format('BRP.storyQuestUnlinkConfirm', { name: escapeHTML(quest.name) })
  });
  if (!confirmation) return;

  const questLinks = getCharacterQuestLinks(sheet.actor)
    .filter(entry => entry.uuid !== quest.uuid);

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'system.story.questLinks': questLinks });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function openStoryJournalEntryDialog(sheet, target) {
  const entries = getStoryEntries(sheet.actor);
  const entryId = getStoryEntryIdFromTarget(target);
  const existing = entryId
    ? entries.find(entry => String(entry?.id ?? '') === entryId) ?? null
    : null;
  if (entryId && !existing) return;

  const readOnly = Boolean(sheet.actor.system.lock);
  const storyEntry = normalizeStoryEntryForDialog(existing, entries.length);
  const html = buildStoryJournalEntryDialogContent(storyEntry, readOnly, sheet.actor);
  const usage = await BRPDialog.input({
    window: {
      title: game.i18n.localize(
        readOnly
          ? 'BRP.storyViewEntry'
          : existing
            ? 'BRP.storyEditEntry'
            : 'BRP.storyCreateEntry'
      )
    },
    content: html,
    ok: {
      label: game.i18n.localize(readOnly ? 'BRP.closeCard' : 'BRP.confirm')
    }
  });
  if (!usage || readOnly) return;

  const nextEntry = buildStoryEntryFromUsage(usage, existing, entries);
  if (!nextEntry) {
    ui.notifications.warn(game.i18n.localize('BRP.storyEntryInvalid'));
    return;
  }

  const nextEntries = existing
    ? entries.map(entry => String(entry?.id ?? '') === existing.id ? nextEntry : entry)
    : [...entries, nextEntry];

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'system.story.entries': nextEntries });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

function normalizeStoryEntryForDialog(entry, index = 0) {
  const source = entry && typeof entry === 'object' ? entry : {};
  const entryId = String(source.id ?? '');
  const realDate = String(source.realDate ?? '').trim();
  return {
    id: entryId,
    type: normalizeStoryEntryType(source.type),
    title: String(source.title ?? '').trim(),
    content: String(source.content ?? ''),
    session: String(source.session ?? '').trim(),
    inGameDate: String(source.inGameDate ?? '').trim(),
    realDate: realDate || (entryId ? '' : getCurrentStoryDateString()),
    pinned: readStoredBoolean(source.pinned, false),
    linked: normalizeStoryLinks(source.linked),
    gmOnly: readStoredBoolean(source.gmOnly, false),
    sortIndex: Number.isFinite(Number(source.sortIndex)) ? Number(source.sortIndex) : index * 10
  };
}

function buildStoryJournalEntryDialogContent(entry, readOnly, actor) {
  const disabled = readOnly ? 'disabled' : '';
  const linkedValue = entry.linked.join('\n');
  const sessionValue = entry.session || (!entry.id ? getStorySuggestedSession(actor) : '');
  const typeOptions = [
    'session-log',
    'npc-encounter',
    'discovery',
    'decision',
    'milestone',
    'note'
  ].map(type => `
    <option value="${type}" ${entry.type === type ? 'selected' : ''}>${escapeHTML(getStoryTypeLabel(type))}</option>
  `).join('');

  return `
    <div class="brp brp-dialog-form brp-story-entry-dialog">
      <label>
        <span>${game.i18n.localize('BRP.storyEntryType')}</span>
        <select name="type" ${disabled}>
          ${typeOptions}
        </select>
      </label>
      <label>
        <span>${game.i18n.localize('BRP.name')}</span>
        <input type="text" name="title" value="${escapeHTML(entry.title)}" autocomplete="off" ${disabled} />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.storySession')}</span>
        <input type="text" name="session" value="${escapeHTML(sessionValue)}" autocomplete="off" ${disabled} />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.storyInGameDate')}</span>
        <input type="text" name="inGameDate" value="${escapeHTML(entry.inGameDate)}" autocomplete="off" ${disabled} />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.storyRealDate')}</span>
        <input type="text" name="realDate" value="${escapeHTML(entry.realDate)}" autocomplete="off" ${disabled} />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.storyContent')}</span>
        <textarea name="content" rows="7" ${disabled}>${escapeHTML(entry.content)}</textarea>
      </label>
      <label>
        <span>${game.i18n.localize('BRP.storyLinkedReferences')}</span>
        <textarea name="linked" rows="4" placeholder="contact:Item.xxxxx\nfaction:Item.xxxxx\nquest:Item.xxxxx" ${disabled}>${escapeHTML(linkedValue)}</textarea>
      </label>
      <div class="brp-dialog-checkboxes">
        <label>
          <input type="checkbox" name="pinned" ${entry.pinned ? 'checked' : ''} ${disabled} />
          <span>${game.i18n.localize('BRP.storyPinEntry')}</span>
        </label>
        <label>
          <input type="checkbox" name="gmOnly" ${entry.gmOnly ? 'checked' : ''} ${disabled} />
          <span>${game.i18n.localize('BRP.storyGMOnly')}</span>
        </label>
      </div>
    </div>
  `;
}

function buildStoryEntryFromUsage(usage, existing, entries) {
  const title = String(usage.title ?? '').trim();
  const content = String(usage.content ?? '');
  if (!title && !String(content).trim()) return null;
  const submittedRealDate = String(usage.realDate ?? '').trim();
  const realDate = submittedRealDate || (existing ? String(existing?.realDate ?? '').trim() : getCurrentStoryDateString());

  return {
    id: existing?.id || foundry.utils.randomID(),
    type: normalizeStoryEntryType(usage.type),
    title,
    content,
    session: String(usage.session ?? '').trim(),
    inGameDate: String(usage.inGameDate ?? '').trim(),
    realDate,
    pinned: readStoredBoolean(usage.pinned, false),
    linked: parseStoryLinkList(usage.linked),
    gmOnly: readStoredBoolean(usage.gmOnly, false),
    sortIndex: existing?.sortIndex ?? getNextStoryEntrySortIndex(entries)
  };
}

function getNextStoryEntrySortIndex(entries) {
  if (!entries.length) return 0;
  const maxSort = Math.max(...entries.map(entry => Number(entry?.sortIndex)).filter(Number.isFinite));
  return Number.isFinite(maxSort) ? maxSort + 10 : entries.length * 10;
}

function parseStoryLinkList(value) {
  return normalizeStoryLinks(
    String(value ?? '')
      .split(/[\n,]+/)
      .map(entry => String(entry ?? '').trim())
      .filter(Boolean)
  );
}

async function toggleStoryJournalPinned(sheet, target) {
  const entry = getStoryEntryFromTarget(sheet.actor, target);
  if (!entry) return;

  const entries = getStoryEntries(sheet.actor).map(candidate => {
    if (String(candidate?.id ?? '') !== entry.id) return candidate;
    return {
      ...candidate,
      pinned: !readStoredBoolean(candidate?.pinned, false)
    };
  });

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'system.story.entries': entries });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function duplicateStoryJournalEntry(sheet, target) {
  const entry = getStoryEntryFromTarget(sheet.actor, target);
  if (!entry) return;

  const entries = getStoryEntries(sheet.actor);
  const duplicateLabel = game.i18n.localize('BRP.duplicate');
  entries.push({
    ...entry,
    id: foundry.utils.randomID(),
    title: entry.title ? `${entry.title} (${duplicateLabel})` : duplicateLabel,
    pinned: false,
    realDate: getCurrentStoryDateString(),
    sortIndex: getNextStoryEntrySortIndex(entries)
  });

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'system.story.entries': entries });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function deleteStoryJournalEntry(sheet, target) {
  const entry = getStoryEntryFromTarget(sheet.actor, target);
  if (!entry) return;

  const title = entry.title || game.i18n.localize('BRP.characterCustomFieldUntitled');
  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize('BRP.storyDeleteEntry') },
    content: game.i18n.format('BRP.storyDeleteEntryConfirm', { title: escapeHTML(title) })
  });
  if (!confirmation) return;

  const entries = getStoryEntries(sheet.actor)
    .filter(candidate => String(candidate?.id ?? '') !== entry.id);

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'system.story.entries': entries });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

function getStorySuggestedSession(actor, fallback = '') {
  const entries = getStoryEntries(actor)
    .map(entry => String(entry?.session ?? '').trim())
    .filter(Boolean);

  return entries.at(-1) || String(fallback ?? '').trim();
}

function getCurrentStoryDateString() {
  const date = new Date();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
