import { BRPItemSheetV2 } from "./base-item-sheet.mjs";
import {
  buildStandardItemSheetParts,
  configureStandardItemSheetParts,
  prepareStandardItemSheetContext,
  prepareStandardItemSheetPartContext
} from './shared/standard-detail-sheet.mjs';

export class BRPPassionSheet extends BRPItemSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['passion'],
    position: {
      width: 520,
      height: 600
    },
    actions: {
      passionOpenLinkedFocus: this._onPassionOpenLinkedFocus
    },
    form: {
      handler: this._handleSubmit
    }
  }

  static PARTS = buildStandardItemSheetParts('systems/brp/templates/item/passion.detail.hbs');

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.passionView = await preparePassionSheetView(this.item);
    context.item.system.total = context.passionView.total;
    return prepareStandardItemSheetContext(this, options, context);
  }

  async _preparePartContext(partId, context) {
    return prepareStandardItemSheetPartContext(this, partId, context, {
      enrichedParts: {
        description: {
          fieldPath: 'system.description',
          contextKey: 'enrichedDescription'
        },
        gmNotes: {
          fieldPath: 'system.gmDescription',
          contextKey: 'enrichedGMDescription'
        }
      }
    });
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    configureStandardItemSheetParts(options);
  }

  static async _onPassionOpenLinkedFocus(event) {
    event.preventDefault();

    const focusLink = await resolvePassionFocusLink(this.item.system?.focusLinkType, this.item.system?.focusLinkUuid);
    if (!focusLink?.uuid) {
      ui.notifications.warn(game.i18n.localize('BRP.persLinkedFocusMissing'));
      return;
    }

    const document = await fromUuid(focusLink.uuid);
    if (!document?.sheet) {
      ui.notifications.warn(game.i18n.localize('BRP.persLinkedFocusMissing'));
      return;
    }

    document.sheet.render(true);
  }

  static async _handleSubmit(_event, _form, formData) {
    const updates = { ...formData.object };
    const system = foundry.utils.expandObject(formData.object)?.system ?? {};

    updates['system.type'] = normalizePassionType(system.type);

    const focusLinkType = normalizeFocusLinkType(system.focusLinkType);
    const focusLinkUuid = String(system.focusLinkUuid ?? '').trim();
    if (!focusLinkType || !focusLinkUuid) {
      updates['system.focusLinkType'] = '';
      updates['system.focusLinkUuid'] = '';
    } else {
      updates['system.focusLinkType'] = focusLinkType;
      updates['system.focusLinkUuid'] = focusLinkUuid;
    }

    await this.document.update(updates);
  }
}

async function preparePassionSheetView(item) {
  const type = normalizePassionType(item.system?.type);
  const ownerActor = item.parent instanceof Actor ? item.parent : null;
  const focusLinkType = normalizeFocusLinkType(item.system?.focusLinkType);
  const focusLinkUuid = String(item.system?.focusLinkUuid ?? '').trim();
  const focusLink = await resolvePassionFocusLink(focusLinkType, focusLinkUuid);

  return {
    total: Number(item.system?.base ?? 0) + Number(item.system?.xp ?? 0),
    type,
    typeOptions: {
      love: game.i18n.localize('BRP.passionTypeLove'),
      hate: game.i18n.localize('BRP.passionTypeHate'),
      loyalty: game.i18n.localize('BRP.passionTypeLoyalty'),
      fear: game.i18n.localize('BRP.passionTypeFear'),
      devotion: game.i18n.localize('BRP.passionTypeDevotion'),
      other: game.i18n.localize('BRP.passionTypeOther')
    },
    focusLinkType,
    focusLinkTypeOptions: {
      '': game.i18n.localize('BRP.persFocusLinkNone'),
      contact: game.i18n.localize('BRP.persFocusLinkContact'),
      faction: game.i18n.localize('BRP.persFocusLinkFaction')
    },
    focusLinkUuid,
    contactOptions: await buildPassionContactOptions(ownerActor, focusLinkType === 'contact' ? focusLinkUuid : ''),
    factionOptions: await buildPassionFactionOptions(ownerActor, focusLinkType === 'faction' ? focusLinkUuid : ''),
    hasOwnerActor: Boolean(ownerActor),
    linkedFocus: focusLink
  };
}

async function buildPassionContactOptions(actor, currentUuid = '') {
  const options = {
    '': '-'
  };

  if (actor instanceof Actor) {
    const contacts = actor.items
      .filter(item => item.type === 'contact')
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const contact of contacts) {
      options[contact.uuid] = contact.name;
    }
  }

  if (currentUuid && !Object.hasOwn(options, currentUuid)) {
    const current = await resolvePassionFocusLink('contact', currentUuid);
    options[currentUuid] = current?.label ?? `[Missing link] ${currentUuid}`;
  }

  return options;
}

async function buildPassionFactionOptions(actor, currentUuid = '') {
  const options = {
    '': '-'
  };

  if (actor instanceof Actor) {
    const memberships = Array.isArray(actor.system?.social?.factionMemberships)
      ? actor.system.social.factionMemberships
      : [];
    const added = new Set();

    for (const membership of memberships) {
      const uuid = String(membership?.uuid ?? '').trim();
      if (!uuid || added.has(uuid)) continue;
      added.add(uuid);

      const focusLink = await resolvePassionFocusLink('faction', uuid);
      options[uuid] = focusLink?.label ?? `[Missing link] ${uuid}`;
    }
  }

  if (currentUuid && !Object.hasOwn(options, currentUuid)) {
    const current = await resolvePassionFocusLink('faction', currentUuid);
    options[currentUuid] = current?.label ?? `[Missing link] ${currentUuid}`;
  }

  return options;
}

async function resolvePassionFocusLink(type, uuid) {
  const normalizedType = normalizeFocusLinkType(type);
  const normalizedUuid = String(uuid ?? '').trim();
  if (!normalizedType || !normalizedUuid) return null;

  let document = null;
  try {
    document = await fromUuid(normalizedUuid);
  } catch (error) {
    console.warn(`BRP | Failed to resolve passion focus link (${normalizedUuid})`, error);
    return null;
  }

  if (!(document instanceof Item)) return null;
  if (normalizedType === 'contact' && document.type !== 'contact') return null;
  if (normalizedType === 'faction' && document.type !== 'faction') return null;

  return {
    type: normalizedType,
    uuid: normalizedUuid,
    label: document.name
  };
}

function normalizePassionType(type) {
  const normalizedType = String(type ?? '').trim().toLowerCase();
  return ['love', 'hate', 'loyalty', 'fear', 'devotion', 'other'].includes(normalizedType)
    ? normalizedType
    : 'other';
}

function normalizeFocusLinkType(type) {
  const normalizedType = String(type ?? '').trim().toLowerCase();
  return ['contact', 'faction'].includes(normalizedType) ? normalizedType : '';
}

