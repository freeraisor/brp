import { BRPItemSheetV2 } from "./base-item-sheet.mjs";
import {
  buildStandardItemSheetParts,
  configureStandardItemSheetParts,
  prepareStandardItemSheetContext,
  prepareStandardItemSheetPartContext
} from './shared/standard-detail-sheet.mjs';

export class BRPAllegianceSheet extends BRPItemSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['allegiance'],
    position: {
      width: 520,
      height: 600
    },
  }

  static PARTS = buildStandardItemSheetParts('systems/brp/templates/item/allegiance.detail.hbs', {
    benefits: { template: 'systems/brp/templates/item/allegiance.benefits.hbs' }
  });

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.rankTextValue = this.item.system.rankText || this.item.system.rank || '';
    context.enemyIdValue = this.item.system.enemyId || '';
    context.enemyAllegianceOptions = prepareEnemyAllegianceOptions(this.item);
    return prepareStandardItemSheetContext(this, options, context, {
      tabLabels: {
        benefits: 'BRP.benefits'
      }
    });
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
        },
        benefits: {
          fieldPath: 'system.benefits',
          contextKey: 'enrichedBenefits'
        }
      }
    });
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    configureStandardItemSheetParts(options, {
      extraParts: ['benefits']
    });
  }
}

function prepareEnemyAllegianceOptions(item) {
  const options = {
    '': '-'
  };
  const actor = item.parent instanceof Actor ? item.parent : null;
  if (!actor) return options;

  const currentEnemyId = String(item.system?.enemyId ?? '').trim();
  const allegiances = actor.items
    .filter(candidate => candidate.type === 'allegiance' && candidate.id !== item.id)
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const allegiance of allegiances) {
    options[allegiance.id] = allegiance.name;
  }

  if (currentEnemyId && !Object.hasOwn(options, currentEnemyId)) {
    options[currentEnemyId] = `[Missing link] ${currentEnemyId}`;
  }

  return options;
}
