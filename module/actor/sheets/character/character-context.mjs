import { prepareCharacterItems } from './character-items.mjs';
import { prepareBackground } from './prepare/background.mjs';
import { prepareCharacterTab } from './prepare/character-tab.mjs';
import { prepareCharacteristics } from './prepare/characteristics.mjs';
import { prepareEffects } from './prepare/effects.mjs';
import { prepareIdentityContext } from './prepare/identity.mjs';
import { prepareResources } from './prepare/resources.mjs';
import { prepareSidebar } from './prepare/sidebar.mjs';
import { prepareSheetSettings } from './prepare/sheet-settings.mjs';
import { prepareStatuses } from './prepare/statuses.mjs';

const CHARACTER_CONTEXT_STEPS = [
  async (sheet, _options, context, actorData) => prepareSheetSettings(context, actorData),
  async (sheet, _options, context, actorData) => prepareIdentityContext(sheet, context, actorData),
  async (_sheet, _options, context) => {
    context.resources = prepareResources(context);
    context.statuses = prepareStatuses(context);
    context.sidebar = prepareSidebar(context);
    context.characteristics = prepareCharacteristics(context);
  },
  async (sheet, _options, context) => prepareCharacterItems(sheet, context),
  async (_sheet, _options, context) => prepareBackground(context),
  async (_sheet, _options, context) => {
    context.characterView = prepareCharacterTab(context);
    context.rollData = context.actor.getRollData();
  },
  async (sheet, _options, context) => prepareEffects(sheet, context)
];

export async function prepareCharacterSheetContext(sheet, options, context) {
  const actorData = sheet.actor.toObject(false);

  for (let index = 0; index < CHARACTER_CONTEXT_STEPS.length; index++) {
    const step = CHARACTER_CONTEXT_STEPS[index];
    try {
      await step(sheet, options, context, actorData);
    } catch (error) {
      console.error(`BRP | Failed character-sheet context step ${index + 1}`, error);
    }
  }

  context.tabs = sheet._getTabs(options.parts, context);
  return context;
}
