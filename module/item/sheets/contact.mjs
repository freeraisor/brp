import { BRPItemSheetV2 } from "./base-item-sheet.mjs";
import {
  buildStandardItemSheetParts,
  configureStandardItemSheetParts,
  prepareStandardItemSheetContext,
  prepareStandardItemSheetPartContext
} from './shared/standard-detail-sheet.mjs';

export class BRPContactSheet extends BRPItemSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['contact'],
    position: {
      width: 520,
      height: 520
    },
    actions: {
      contactOpenLinkedActor: this._onContactOpenLinkedActor
    }
  }

  static PARTS = buildStandardItemSheetParts('systems/brp/templates/item/contact.detail.hbs');

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.relationOptions = {
      ally: game.i18n.localize('BRP.contactRelationAlly'),
      friend: game.i18n.localize('BRP.contactRelationFriend'),
      neutral: game.i18n.localize('BRP.contactRelationNeutral'),
      suspect: game.i18n.localize('BRP.contactRelationSuspect'),
      enemy: game.i18n.localize('BRP.contactRelationEnemy')
    };
    context.contactRelation = this.item.system.relation || 'neutral';

    const linkedActorUuid = String(this.item.system.linkedActorUuid ?? '').trim();
    context.linkedActorUuid = linkedActorUuid;
    context.linkedActorOptions = prepareLinkedActorOptions(this.item, linkedActorUuid);
    context.linkedActor = linkedActorUuid ? await resolveLinkedActor(linkedActorUuid) : null;

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

  static async _onContactOpenLinkedActor(event) {
    event.preventDefault();

    const linkedActorUuid = String(this.item.system?.linkedActorUuid ?? '').trim();
    if (!linkedActorUuid) return;

    const actor = await resolveLinkedActor(linkedActorUuid);
    if (!(actor instanceof Actor)) {
      ui.notifications.warn('Linked actor not found.');
      return;
    }

    actor.sheet?.render(true);
  }
}

function prepareLinkedActorOptions(item, linkedActorUuid) {
  const options = {
    '': '-'
  };
  const ownerActor = item.parent instanceof Actor ? item.parent : null;
  const actors = game.actors.contents
    .filter(actor => !ownerActor || actor.id !== ownerActor.id)
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const actor of actors) {
    options[actor.uuid] = actor.name;
  }

  if (linkedActorUuid && !Object.hasOwn(options, linkedActorUuid)) {
    options[linkedActorUuid] = `[Missing link] ${linkedActorUuid}`;
  }

  return options;
}

async function resolveLinkedActor(uuid) {
  const actorUuid = String(uuid ?? '').trim();
  if (!actorUuid) return null;

  const document = await fromUuid(actorUuid);
  return document instanceof Actor ? document : null;
}
