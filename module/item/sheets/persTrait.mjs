import { BRPItemSheetV2 } from "./base-item-sheet.mjs";
import {
  buildStandardItemSheetParts,
  configureStandardItemSheetParts,
  prepareStandardItemSheetContext,
  prepareStandardItemSheetPartContext
} from './shared/standard-detail-sheet.mjs';

export class BRPPersTraitSheet extends BRPItemSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['persTrait'],
    position: {
      width: 520,
      height: 600
    },
    form: {
      handler: this._handleSubmit
    }
  }

  static PARTS = buildStandardItemSheetParts('systems/brp/templates/item/persTrait.detail.hbs');

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.persTraitView = preparePersTraitSheetView(this.item);
    context.item.system.total = context.persTraitView.total;
    context.item.system.opptotal = context.persTraitView.opposedTotal;
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

  static async _handleSubmit(_event, _form, formData) {
    const updates = { ...formData.object };
    const system = foundry.utils.expandObject(formData.object)?.system ?? {};
    if (Object.hasOwn(system, 'improve')) {
      updates['system.oppimprove'] = false;
    }

    await this.document.update(updates);
  }
}

function preparePersTraitSheetView(item) {
  const total = Math.max(0, Math.min(100, Number(item.system?.base ?? 0) + Number(item.system?.xp ?? 0)));
  return {
    total,
    opposedTotal: 100 - total,
    impCheck: Boolean(item.system?.improve || item.system?.oppimprove)
  };
}
