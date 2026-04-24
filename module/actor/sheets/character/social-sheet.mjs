import BRPDialog from '../../../setup/brp-dialog.mjs';
import { BRPContextMenu } from '../../../setup/context-menu.mjs';
import { SOCIAL_CONTEXT_SELECTORS, SOCIAL_SECTION_IDS } from './character-sheet-config.mjs';
import { buildCollapsedSectionsState } from './prepare/social/shared.mjs';
import {
  captureRefreshWorkspaceScroll,
  cssEscape,
  escapeHTML,
  getTargetElement,
  numberOrNull,
  numberOrZero,
  persistUiMapFlag,
  readStoredBoolean,
  restoreRefreshWorkspaceScrollSoon
} from './character-sheet-utils.mjs';

export const SOCIAL_SHEET_ACTIONS = {
  socialSettingsToggle: onSocialSettingsToggle,
  socialSectionVisibilityToggle: onSocialSectionVisibilityToggle,
  socialSectionToggle: onSocialSectionToggle,
  socialSectionMenu: onSocialSectionMenu,
  socialRowToggle: onSocialRowToggle,
  socialImproveToggle: onSocialImproveToggle,
  socialAdjustValue: onSocialAdjustValue,
  socialPrimaryAllegianceToggle: onSocialPrimaryAllegianceToggle,
  socialFactionMembershipView: onSocialFactionMembershipView,
  socialOpenLinkedActor: onSocialOpenLinkedActor,
  socialOpenFaction: onSocialOpenFaction,
  socialFactionCreate: onSocialFactionCreate,
  socialFactionAttach: onSocialFactionAttach,
  socialFactionUnlink: onSocialFactionUnlink
};

export const socialSheetMethods = {
  _bindSocialControls() {
    const root = this.element.querySelector('.brp-social-refresh');
    if (!root) return;

    root.addEventListener('click', event => {
      if (event.target.closest('.brp-social-refresh-settings')) return;
      closeSocialSettingsMenu(root);
    });

    root.querySelectorAll('.brp-social-refresh-allegiance-card[data-item-id], .brp-social-refresh-reputation-row[data-item-id]').forEach(card => {
      card.addEventListener('dblclick', event => {
        if (event.target.closest('.brp-social-refresh-card-actions, .brp-social-refresh-primary-toggle, .brp-social-refresh-action-tray')) return;
        const item = getSocialEmbeddedItemFromTarget(this.actor, event.currentTarget, ['allegiance', 'reputation']);
        item?.sheet?.render(true);
      });
    });

    root.querySelectorAll('.brp-social-refresh-contact-row[data-item-id]').forEach(row => {
      row.addEventListener('dblclick', async event => {
        if (event.target.closest('.brp-social-refresh-card-actions')) return;

        const item = getSocialEmbeddedItemFromTarget(this.actor, event.currentTarget, ['contact']);
        const linkedActorUuid = String(item?.system?.linkedActorUuid ?? '').trim();
        if (linkedActorUuid) {
          const linked = await fromUuid(linkedActorUuid);
          if (linked instanceof Actor) return linked.sheet?.render(true);
        }

        item?.sheet?.render(true);
      });
    });

    root.querySelectorAll('.brp-social-refresh-faction-card[data-membership-index]').forEach(card => {
      card.addEventListener('dblclick', event => {
        if (event.target.closest('.brp-social-refresh-card-actions, .brp-social-refresh-action-tray')) return;
        openSocialFactionMembershipDialog(this, event.currentTarget);
      });
    });
  },

  _bindSocialContextMenu() {
    const bindings = [
      ['allegiance', target => this._getSocialAllegianceContextOptions(target)],
      ['reputation', target => this._getSocialReputationContextOptions(target)],
      ['contacts', target => this._getSocialContactContextOptions(target)],
      ['factions', target => this._getSocialFactionContextOptions(target)]
    ];

    for (const [sectionId, getter] of bindings) {
      const selector = SOCIAL_CONTEXT_SELECTORS[sectionId];
      if (!selector || !this.element.querySelector(selector)) continue;

      new BRPContextMenu(this.element, selector, [], {
        jQuery: false,
        onOpen: target => {
          ui.context.menuItems = getter(target);
        }
      });
    }
  },

  _getSocialAllegianceContextOptions(target) {
    const item = getSocialEmbeddedItemFromTarget(this.actor, target, ['allegiance']);
    if (!item) return [];

    const isPrimary = getSocialSheetSettings(this.actor).primaryAllegiance === item.id;
    const canMutate = !this.actor.system.lock && game.settings.get('brp', 'useAlleg');
    const options = [
      {
        name: 'BRP.view',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: () => item.sheet.render(true)
      }
    ];

    if (canMutate) {
      options.push({
        name: isPrimary ? 'Unset primary allegiance' : 'Set as primary allegiance',
        icon: '<i class="fas fa-star fa-fw"></i>',
        callback: listItem => toggleSocialPrimaryAllegiance(this, listItem ?? target, item)
      });
      options.push({
        name: 'Remove from character',
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: listItem => deleteSocialEmbeddedItemFromCharacter(this, listItem ?? target)
      });
    }

    return options;
  },

  _getSocialReputationContextOptions(target) {
    const item = getSocialEmbeddedItemFromTarget(this.actor, target, ['reputation']);
    if (!item) return [];

    const canMutate = !this.actor.system.lock && Number(game.settings.get('brp', 'useReputation') ?? 0) > 0;
    const options = [
      {
        name: 'BRP.view',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: () => item.sheet.render(true)
      }
    ];

    if (canMutate) {
      options.push({
        name: 'Remove from character',
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: listItem => deleteSocialEmbeddedItemFromCharacter(this, listItem ?? target)
      });
    }

    return options;
  },

  _getSocialContactContextOptions(target) {
    const item = getSocialEmbeddedItemFromTarget(this.actor, target, ['contact']);
    if (!item) return [];

    const linkedActorUuid = String(item.system?.linkedActorUuid ?? '').trim();
    const options = [
      {
        name: 'BRP.view',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: () => item.sheet.render(true)
      }
    ];

    if (linkedActorUuid) {
      options.push({
        name: 'Open linked actor',
        icon: '<i class="fas fa-user fa-fw"></i>',
        callback: () => openSocialActorByUuid(linkedActorUuid)
      });
    }

    if (!this.actor.system.lock) {
      options.push({
        name: 'Remove from character',
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: listItem => deleteSocialEmbeddedItemFromCharacter(this, listItem ?? target)
      });
    }

    return options;
  },

  _getSocialFactionContextOptions(target) {
    const card = getSocialFactionCardFromTarget(target);
    if (!card) return [];

    const options = [
      {
        name: 'View membership',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: listItem => openSocialFactionMembershipDialog(this, listItem ?? target)
      }
    ];

    if (String(card.dataset.factionUuid ?? '').trim()) {
      options.push({
        name: 'Open faction',
        icon: '<i class="fas fa-eye fa-fw"></i>',
        callback: () => openSocialFactionByUuid(card.dataset.factionUuid)
      });
    }

    if (!this.actor.system.lock) {
      options.push({
        name: 'Unlink faction',
        icon: '<i class="fas fa-unlink fa-fw"></i>',
        callback: listItem => unlinkFactionFromCharacter(this, listItem ?? target)
      });
    }

    return options;
  }
};

function onSocialSettingsToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const root = getTargetElement(target)?.closest?.('.brp-social-refresh');
  if (!root) return;

  const button = root.querySelector('.brp-social-refresh-settings-button');
  const isOpen = button?.getAttribute('aria-expanded') === 'true';
  updateSocialSettingsMenuMarkup(root, !isOpen);
}

async function onSocialSectionVisibilityToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const sectionId = getSocialSectionId(target);
  if (!SOCIAL_SECTION_IDS.includes(sectionId)) return;

  const settings = getSocialSheetSettings(this.actor);
  settings.sectionVisibility[sectionId] = !Boolean(settings.sectionVisibility[sectionId]);
  const scrollTop = captureRefreshWorkspaceScroll(this, target);

  try {
    await this.actor.update({ 'flags.brp.sheet.social': settings });
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onSocialSectionToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const section = getSocialSectionFromTarget(this.element, target);
  const sectionId = getSocialSectionId(target);
  if (!section || !SOCIAL_SECTION_IDS.includes(sectionId)) return;

  const settings = getSocialSheetSettings(this.actor);
  const isCollapsed = section.classList.contains('is-collapsed');
  const nextCollapsed = !isCollapsed;
  updateSocialSectionCollapsedMarkup(section, target, nextCollapsed);

  settings.collapsedSections[sectionId] = nextCollapsed;
  settings.stateInitialized = true;

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await this.actor.update({ 'flags.brp.sheet.social': settings }, { render: false, renderSheet: false });
  } catch (error) {
    updateSocialSectionCollapsedMarkup(section, target, isCollapsed);
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

function onSocialSectionMenu(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const owner = getSocialContextOwner(target);
  if (!owner) return;

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

async function onSocialRowToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const row = getSocialActionRowFromTarget(target);
  const rowKey = row?.dataset?.socialRowKey || target?.dataset?.rowKey;
  if (!row || !rowKey) return;

  const wasExpanded = row.classList.contains('is-actions-open');
  const nextExpanded = !wasExpanded;
  updateSocialRowExpandedMarkup(row, target, nextExpanded);

  const scrollTop = captureRefreshWorkspaceScroll(this, target);
  try {
    await persistUiMapFlag(this.actor, 'flags.brp.sheet.social.expandedRows', rowKey, nextExpanded);
  } catch (error) {
    updateSocialRowExpandedMarkup(row, target, wasExpanded);
    throw error;
  } finally {
    restoreRefreshWorkspaceScrollSoon(this, scrollTop);
  }
}

async function onSocialImproveToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await toggleSocialImproveCheck(this, target);
}

async function onSocialAdjustValue(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await adjustSocialTrackedValue(this, target);
}

async function onSocialPrimaryAllegianceToggle(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock || !game.settings.get('brp', 'useAlleg')) return;
  await toggleSocialPrimaryAllegiance(this, target);
}

async function onSocialFactionMembershipView(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await openSocialFactionMembershipDialog(this, target);
}

async function onSocialOpenLinkedActor(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await openSocialActorByUuid(target.dataset.actorUuid);
}

async function onSocialOpenFaction(event, target) {
  event.preventDefault();
  event.stopPropagation();

  await openSocialFactionByUuid(target.dataset.uuid ?? target.dataset.factionUuid);
}

async function onSocialFactionCreate(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await createFactionAndAttachToCharacter(this, target);
}

async function onSocialFactionAttach(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await attachExistingFactionToCharacter(this, target);
}

async function onSocialFactionUnlink(event, target) {
  event.preventDefault();
  event.stopPropagation();

  if (this.actor.system.lock) return;
  await unlinkFactionFromCharacter(this, target);
}

function getSocialSectionId(target) {
  const element = getTargetElement(target);
  return String(
    element?.dataset?.sectionId
    ?? element?.closest?.('[data-section-id]')?.dataset?.sectionId
    ?? element?.closest?.('.brp-social-refresh-section[data-social-section]')?.dataset?.socialSection
    ?? ''
  ).trim();
}

function getSocialSectionFromTarget(root, target) {
  const sectionId = getSocialSectionId(target);
  if (!sectionId) return null;
  return root?.querySelector?.(`.brp-social-refresh-section[data-social-section="${cssEscape(sectionId)}"]`) ?? null;
}

function getSocialEmbeddedItemFromTarget(actor, target, allowedTypes = ['allegiance', 'reputation', 'contact']) {
  const element = getTargetElement(target);
  const row = element?.closest?.('[data-item-id]');
  const itemId = row?.dataset?.itemId ?? element?.dataset?.itemId;
  const item = actor.items.get(itemId);
  return allowedTypes.includes(item?.type) ? item : null;
}

function getSocialFactionCardFromTarget(target) {
  return getTargetElement(target)?.closest?.('.brp-social-refresh-faction-card[data-membership-index]');
}

function getSocialActionRowFromTarget(target) {
  return getTargetElement(target)?.closest?.('[data-social-row-key]');
}

function getSocialTrackFromTarget(target) {
  const element = getTargetElement(target);
  return String(
    element?.dataset?.socialTrack
    ?? element?.closest?.('[data-social-track]')?.dataset?.socialTrack
    ?? ''
  ).trim();
}

function getSocialFactionMembershipIndex(target) {
  const index = Number(getSocialFactionCardFromTarget(target)?.dataset?.membershipIndex ?? getTargetElement(target)?.dataset?.membershipIndex);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function getSocialContextOwner(target) {
  const sectionId = getSocialSectionId(target);
  const selector = SOCIAL_CONTEXT_SELECTORS[sectionId];
  if (!selector) return null;
  return getTargetElement(target)?.closest?.(selector);
}

function getSocialSheetSettings(actor) {
  const sheetFlags = foundry.utils.deepClone(actor.getFlag('brp', 'sheet') ?? {});
  const settings = sheetFlags.social ?? {};
  settings.sectionVisibility ??= {};
  settings.stateInitialized = readStoredBoolean(settings.stateInitialized, false);
  settings.collapsedSections = buildCollapsedSectionsState(settings.collapsedSections, {
    initialized: settings.stateInitialized,
    ignoreAllTrueUnlessInitialized: true
  });
  settings.primaryAllegiance = typeof settings.primaryAllegiance === 'string' ? settings.primaryAllegiance : '';

  for (const sectionId of SOCIAL_SECTION_IDS) {
    settings.sectionVisibility[sectionId] = readStoredBoolean(settings.sectionVisibility[sectionId], true);
  }

  return settings;
}

function updateSocialSectionCollapsedMarkup(section, toggle, isCollapsed) {
  section?.classList.toggle('is-collapsed', isCollapsed);
  const body = section?.querySelector?.('.brp-social-refresh-section-body');
  if (body) body.hidden = isCollapsed;
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.dataset.tooltip = game.i18n.localize(isCollapsed ? 'BRP.expand' : 'BRP.collapse');
  }
}

function updateSocialSettingsMenuMarkup(root, isOpen) {
  if (!root) return;
  root.classList.toggle('is-settings-open', isOpen);
  const button = root.querySelector('.brp-social-refresh-settings-button');
  if (button) button.setAttribute('aria-expanded', String(isOpen));
  const menu = root.querySelector('.brp-social-refresh-settings-menu');
  if (menu) menu.hidden = !isOpen;
}

function closeSocialSettingsMenu(rootOrElement) {
  const root = rootOrElement?.closest?.('.brp-social-refresh') ?? rootOrElement;
  if (!root?.classList?.contains('brp-social-refresh')) return;
  updateSocialSettingsMenuMarkup(root, false);
}

function updateSocialRowExpandedMarkup(row, toggle, isExpanded) {
  row?.classList.toggle('is-actions-open', isExpanded);
  row?.querySelectorAll?.('.brp-social-refresh-action-tray').forEach(tray => {
    tray.hidden = !isExpanded;
  });
  if (toggle) {
    toggle.classList.toggle('is-active', isExpanded);
    toggle.setAttribute('aria-expanded', String(isExpanded));
  }
}

async function toggleSocialPrimaryAllegiance(sheet, target, item = null) {
  const allegiance = item ?? getSocialEmbeddedItemFromTarget(sheet.actor, target, ['allegiance']);
  if (!allegiance) return;

  const currentPrimary = getSocialSheetSettings(sheet.actor).primaryAllegiance;
  const nextPrimary = currentPrimary === allegiance.id ? '' : allegiance.id;
  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);

  try {
    await sheet.actor.update({ 'flags.brp.sheet.social.primaryAllegiance': nextPrimary });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function toggleSocialImproveCheck(sheet, target) {
  const descriptor = getSocialProgressDescriptor(sheet, target);
  if (!descriptor?.canMutate) return;

  if (descriptor.kind === 'item') {
    const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
    try {
      await descriptor.item.update({ 'system.improve': !descriptor.improve });
    } finally {
      restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
    }
    return;
  }

  if (descriptor.kind === 'faction') {
    await updateFactionMembershipFromTarget(sheet, target, {
      improve: !descriptor.improve
    });
  }
}

async function adjustSocialTrackedValue(sheet, target) {
  const descriptor = getSocialProgressDescriptor(sheet, target);
  if (!descriptor?.canMutate) return;

  const direction = String(getTargetElement(target)?.dataset?.direction ?? '').trim() === 'decrease' ? -1 : 1;
  const amount = await promptForSocialAdjustment(descriptor, direction);
  if (amount == null) return;

  const nextValue = Math.max(0, descriptor.value + (amount * direction));
  if (descriptor.kind === 'item') {
    const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
    try {
      await descriptor.item.update({ [descriptor.path]: nextValue });
    } finally {
      restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
    }
    return;
  }

  if (descriptor.kind === 'faction') {
    await updateFactionMembershipFromTarget(sheet, target, {
      reputationWithin: nextValue
    });
  }
}

async function deleteSocialEmbeddedItemFromCharacter(sheet, target) {
  const item = getSocialEmbeddedItemFromTarget(sheet.actor, target);
  if (!item) return;

  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize('BRP.deleteItem') },
    content: `${game.i18n.localize('BRP.deleteConfirm')}<br><strong> ${escapeHTML(item.name)}</strong>`
  });
  if (!confirmation) return;

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await item.delete();
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

async function openSocialActorByUuid(uuid) {
  const actorUuid = String(uuid ?? '').trim();
  if (!actorUuid) return;

  const actor = await fromUuid(actorUuid);
  if (!(actor instanceof Actor)) {
    ui.notifications.warn('Linked actor not found.');
    return;
  }

  actor.sheet?.render(true);
}

async function openSocialFactionMembershipDialog(sheet, target) {
  const membershipIndex = getSocialFactionMembershipIndex(target);
  if (membershipIndex == null) return;

  const memberships = getCharacterFactionMemberships(sheet.actor);
  const membership = memberships[membershipIndex];
  if (!membership) return;

  const faction = membership.uuid ? await fromUuid(membership.uuid) : null;
  const membershipName = faction instanceof Item ? faction.name : membership.uuid || 'Faction Membership';
  const reputationWithin = membership.reputationWithin == null ? '' : String(membership.reputationWithin);
  const html = `
    <div class="brp brp-dialog-form brp-social-faction-membership-dialog">
      <label>
        <span>Role</span>
        <input type="text" name="role" value="${escapeHTML(membership.role)}" autocomplete="off" />
      </label>
      <label>
        <span>Rank</span>
        <input type="text" name="rank" value="${escapeHTML(membership.rank)}" autocomplete="off" />
      </label>
      <label>
        <span>Reputation within</span>
        <input type="number" name="reputationWithin" value="${escapeHTML(reputationWithin)}" step="1" />
      </label>
      <label>
        <span>${game.i18n.localize('BRP.notes')}</span>
        <textarea name="notes" rows="4">${escapeHTML(membership.notes)}</textarea>
      </label>
    </div>
  `;
  const usage = await BRPDialog.input({
    window: { title: `View Membership: ${membershipName}` },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.confirm')
    }
  });
  if (!usage) return;

  const reputationWithinRaw = String(usage.reputationWithin ?? '').trim();
  const nextReputationWithin = reputationWithinRaw === '' ? null : Number(reputationWithinRaw);
  if (reputationWithinRaw !== '' && !Number.isFinite(nextReputationWithin)) {
    ui.notifications.warn('Enter a valid reputation value.');
    return;
  }

  await updateFactionMembershipFromTarget(sheet, target, {
    role: String(usage.role ?? '').trim(),
    rank: String(usage.rank ?? '').trim(),
    reputationWithin: nextReputationWithin,
    notes: String(usage.notes ?? '').trim()
  });
}

async function openSocialFactionByUuid(uuid) {
  const factionUuid = String(uuid ?? '').trim();
  if (!factionUuid) return;

  const faction = await fromUuid(factionUuid);
  if (!(faction instanceof Item) || faction.type !== 'faction') {
    ui.notifications.warn('Linked faction not found.');
    return;
  }

  faction.sheet?.render(true);
}

function getCharacterFactionMemberships(actor) {
  const memberships = Array.isArray(actor.system?.social?.factionMemberships) ? actor.system.social.factionMemberships : [];
  return memberships.map(entry => normalizeFactionMembershipEntry(entry));
}

function getNextFactionMembershipSort(memberships) {
  if (!memberships.length) return 0;
  const sorts = memberships
    .map(entry => Number(entry?.sort))
    .filter(Number.isFinite);
  if (!sorts.length) return memberships.length * 10;
  return Math.max(...sorts) + 10;
}

async function attachFactionMembershipByUuid(sheet, target, uuid) {
  const factionUuid = String(uuid ?? '').trim();
  if (!factionUuid) return false;

  const memberships = getCharacterFactionMemberships(sheet.actor);
  if (memberships.some(entry => String(entry?.uuid ?? '').trim() === factionUuid)) {
    ui.notifications.warn('Faction is already linked.');
    return false;
  }

  memberships.push({
    uuid: factionUuid,
    role: '',
    rank: '',
    reputationWithin: null,
    notes: '',
    improve: false,
    sort: getNextFactionMembershipSort(memberships)
  });

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'system.social.factionMemberships': memberships });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }

  return true;
}

async function promptForFactionName() {
  const usage = await BRPDialog.input({
    window: { title: 'Create Faction' },
    content: `
      <div class="brp brp-dialog-form brp-social-faction-create-dialog">
        <label>
          <span>Faction name</span>
          <input type="text" name="name" autocomplete="off" />
        </label>
      </div>
    `,
    ok: {
      label: game.i18n.localize('BRP.confirm')
    }
  });
  if (!usage) return '';

  const name = String(usage.name ?? '').trim();
  if (!name) {
    ui.notifications.warn('Enter a faction name.');
    return '';
  }
  return name;
}

async function initializeWorldItemBrpid(item) {
  const key = await game.system.api.brpid.guessId(item);
  await item.update({
    'flags.brp.brpidFlag.id': key || '',
    'flags.brp.brpidFlag.lang': game.i18n.lang,
    'flags.brp.brpidFlag.priority': 0
  });
}

async function createFactionAndAttachToCharacter(sheet, target) {
  const name = await promptForFactionName();
  if (!name) return;

  const ItemCls = getDocumentClass('Item');
  const faction = await ItemCls.create({
    name,
    type: 'faction'
  });
  if (!faction) return;

  await initializeWorldItemBrpid(faction);
  await attachFactionMembershipByUuid(sheet, target, faction.uuid);
  faction.sheet?.render(true);
}

async function selectFactionForAttachment(actor) {
  const linkedUuids = new Set(getCharacterFactionMemberships(actor).map(entry => String(entry?.uuid ?? '').trim()).filter(Boolean));
  const candidates = game.items.contents
    .filter(item => item.type === 'faction' && !linkedUuids.has(item.uuid))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (!candidates.length) {
    ui.notifications.warn('No unlinked factions available.');
    return null;
  }

  if (candidates.length === 1) return candidates[0];

  const html = await foundry.applications.handlebars.renderTemplate('systems/brp/templates/dialog/selectItem.hbs', {
    headTitle: 'Link Faction',
    newList: Object.fromEntries(candidates.map(item => [item.id, item.name]))
  });
  const usage = await BRPDialog.input({
    window: { title: 'Link Faction' },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.proceed')
    }
  });
  if (!usage?.selectItem) return null;

  return game.items.get(usage.selectItem) ?? null;
}

async function attachExistingFactionToCharacter(sheet, target) {
  const faction = await selectFactionForAttachment(sheet.actor);
  if (!faction) return;
  await attachFactionMembershipByUuid(sheet, target, faction.uuid);
}

async function unlinkFactionFromCharacter(sheet, target) {
  const membershipIndex = getSocialFactionMembershipIndex(target);
  if (membershipIndex == null) return;

  const memberships = getCharacterFactionMemberships(sheet.actor);
  const membership = memberships[membershipIndex];
  if (!membership) return;

  const faction = membership.uuid ? await fromUuid(membership.uuid) : null;
  const name = faction instanceof Item ? faction.name : membership.uuid || 'Faction';
  const confirmation = await BRPDialog.confirm({
    window: { title: 'Unlink Faction' },
    content: `Unlink faction from this character?<br><strong> ${escapeHTML(name)}</strong>`
  });
  if (!confirmation) return;

  memberships.splice(membershipIndex, 1);
  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'system.social.factionMemberships': memberships });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }
}

function getSocialProgressDescriptor(sheet, target) {
  const track = getSocialTrackFromTarget(target);
  if (track === 'allegiance') {
    const item = getSocialEmbeddedItemFromTarget(sheet.actor, target, ['allegiance']);
    if (!item) return null;
    return {
      kind: 'item',
      track,
      item,
      path: 'system.allegPoints',
      name: item.name,
      value: numberOrZero(item.system?.allegPoints),
      improve: Boolean(item.system?.improve),
      canMutate: Boolean(game.settings.get('brp', 'useAlleg')) && !sheet.actor.system.lock
    };
  }

  if (track === 'reputation') {
    const item = getSocialEmbeddedItemFromTarget(sheet.actor, target, ['reputation']);
    if (!item) return null;
    return {
      kind: 'item',
      track,
      item,
      path: 'system.base',
      name: item.name,
      value: numberOrZero(item.system?.base),
      improve: Boolean(item.system?.improve),
      canMutate: Number(game.settings.get('brp', 'useReputation') ?? 0) > 0 && !sheet.actor.system.lock
    };
  }

  if (track === 'faction') {
    const membershipIndex = getSocialFactionMembershipIndex(target);
    if (membershipIndex == null) return null;

    const memberships = getCharacterFactionMemberships(sheet.actor);
    const membership = memberships[membershipIndex];
    if (!membership) return null;

    return {
      kind: 'faction',
      track,
      membershipIndex,
      name: getFactionMembershipNameFromTarget(target),
      value: numberOrZero(membership.reputationWithin),
      improve: Boolean(membership.improve),
      canMutate: !sheet.actor.system.lock
    };
  }

  return null;
}

async function promptForSocialAdjustment(descriptor, direction) {
  const titleVerb = direction < 0 ? 'Decrease' : 'Increase';
  const valueLabel = descriptor.track === 'faction' ? 'reputation within' : 'value';
  const html = `
    <div class="brp brp-dialog-form brp-social-adjustment-dialog">
      <label>
        <span>Adjust ${escapeHTML(valueLabel)} for ${escapeHTML(descriptor.name)}</span>
        <input type="number" name="amount" min="0" step="1" value="1" />
      </label>
    </div>
  `;
  const usage = await BRPDialog.input({
    window: { title: `${titleVerb} ${descriptor.name}` },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.confirm')
    }
  });
  if (!usage) return null;

  const amount = Number(usage.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    ui.notifications.warn('Enter a value greater than 0.');
    return null;
  }

  return amount;
}

function getFactionMembershipNameFromTarget(target) {
  const row = getSocialFactionCardFromTarget(target);
  const label = row?.querySelector('.brp-social-refresh-faction-name')?.textContent;
  const name = String(label ?? '').trim();
  return name || 'Faction';
}

function normalizeFactionMembershipEntry(entry) {
  const source = entry && typeof entry === 'object' ? foundry.utils.deepClone(entry) : {};
  return {
    ...source,
    uuid: String(source.uuid ?? '').trim(),
    role: String(source.role ?? '').trim(),
    rank: String(source.rank ?? '').trim(),
    reputationWithin: numberOrNull(source.reputationWithin),
    notes: String(source.notes ?? '').trim(),
    sort: numberOrNull(source.sort),
    improve: readStoredBoolean(source.improve, false)
  };
}

async function updateFactionMembershipFromTarget(sheet, target, patch = {}) {
  const membershipIndex = getSocialFactionMembershipIndex(target);
  if (membershipIndex == null) return false;

  const memberships = getCharacterFactionMemberships(sheet.actor);
  const membership = memberships[membershipIndex];
  if (!membership) return false;

  memberships[membershipIndex] = {
    ...membership,
    ...patch
  };

  const scrollTop = captureRefreshWorkspaceScroll(sheet, target);
  try {
    await sheet.actor.update({ 'system.social.factionMemberships': memberships });
  } finally {
    restoreRefreshWorkspaceScrollSoon(sheet, scrollTop);
  }

  return true;
}
