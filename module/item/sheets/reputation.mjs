import { BRPItemSheetV2 } from "./base-item-sheet.mjs";
import {
  buildStandardItemSheetParts,
  configureStandardItemSheetParts,
  prepareStandardItemSheetContext,
  prepareStandardItemSheetPartContext
} from './shared/standard-detail-sheet.mjs';

export class BRPReputationSheet extends BRPItemSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['reputation'],
    position: {
      width: 520,
      height: 520
    },
  }

  static PARTS = buildStandardItemSheetParts('systems/brp/templates/item/reputation.detail.hbs');

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const itemData = context.item;
    itemData.system.total = itemData.system.base;
    context.categoryOptions = {
      reputation: game.i18n.localize('BRP.socialCategoryReputation'),
      honor: game.i18n.localize('BRP.socialCategoryHonor'),
      status: game.i18n.localize('BRP.socialCategoryStatus')
    };
    context.reputationCategory = itemData.system.category || 'reputation';
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
