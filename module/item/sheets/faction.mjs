import { BRPItemSheetV2 } from "./base-item-sheet.mjs";
import {
  buildStandardItemSheetParts,
  configureStandardItemSheetParts,
  prepareStandardItemSheetContext,
  prepareStandardItemSheetPartContext
} from './shared/standard-detail-sheet.mjs';

export class BRPFactionSheet extends BRPItemSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['faction'],
    position: {
      width: 520,
      height: 480
    },
  }

  static PARTS = buildStandardItemSheetParts('systems/brp/templates/item/faction.detail.hbs');

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
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
