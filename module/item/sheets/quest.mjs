import { BRPItemSheetV2 } from "./base-item-sheet.mjs";
import {
  buildStandardItemSheetParts,
  configureStandardItemSheetParts,
  prepareStandardItemSheetContext,
  prepareStandardItemSheetPartContext
} from './shared/standard-detail-sheet.mjs';

export class BRPQuestSheet extends BRPItemSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['quest'],
    position: {
      width: 520,
      height: 560
    },
  }

  static PARTS = buildStandardItemSheetParts('systems/brp/templates/item/quest.detail.hbs');

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.questStatusOptions = {
      active: game.i18n.localize('BRP.storyQuestStatusActive'),
      completed: game.i18n.localize('BRP.storyQuestStatusCompleted'),
      failed: game.i18n.localize('BRP.storyQuestStatusFailed'),
      abandoned: game.i18n.localize('BRP.storyQuestStatusAbandoned')
    };
    context.questStatus = this.item.system.status || 'active';
    context.updatesCount = Array.isArray(this.item.system.updates) ? this.item.system.updates.length : 0;
    context.linkedCount = Array.isArray(this.item.system.linked) ? this.item.system.linked.length : 0;
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
}
