import { BRPSelectLists } from '../../../../apps/select-lists.mjs';
import { getCharacterSheetThemeSettings } from '../character-theme.mjs';

const CONTEXT_SETTING_MAP = {
  logo: 'charSheetLogo',
  useWealth: 'useWealth',
  wealthLabel: 'wealthLabel',
  useEDU: 'useEDU',
  useFP: 'useFP',
  useSAN: 'useSAN',
  useRES5: 'useRes5',
  useHPL: 'useHPL',
  useAlleg: 'useAlleg',
  usePassion: 'usePassion',
  usePersTrait: 'usePersTrait',
  useReputation: 'useReputation',
  useAVRand: 'useAVRand',
  background1: 'background1',
  background2: 'background2',
  background3: 'background3'
};

const POWER_LABEL_SETTINGS = [
  ['magicLabel', 'magicLabel', 'BRP.magic'],
  ['superLabel', 'superLabel', 'BRP.super'],
  ['psychicLabel', 'psychicLabel', 'BRP.psychic'],
  ['mutationLabel', 'mutationLabel', 'BRP.mutation'],
  ['sorceryLabel', 'sorceryLabel', 'BRP.sorcery']
];

export async function prepareSheetSettings(context, actorData, settings = game.settings) {
  context.theme = getCharacterSheetThemeSettings(settings);
  applyMappedSettings(context, settings);

  prepareWealth(context, actorData);
  context.wealthOptions = await BRPSelectLists.getWealthOptions(0, 4);
  prepareLockState(context, actorData, settings);
  prepareOptionalTabFlags(context);
  prepareResourceCount(context);
  preparePowerLabels(context, settings);
  prepareDevelopmentLabels(context, settings);
}

function applyMappedSettings(context, settings) {
  for (const [contextKey, settingKey] of Object.entries(CONTEXT_SETTING_MAP)) {
    context[contextKey] = settings.get('brp', settingKey);
  }
}

function prepareWealth(context, actorData) {
  context.wealthName = actorData.system.wealth;
  if (actorData.system.wealth >= 0 && actorData.system.wealth <= 4 && actorData.system.wealth != "") {
    context.wealthName = game.i18n.localize(`BRP.wealthLevel.${actorData.system.wealth}`);
  }
}

function prepareLockState(context, actorData, settings) {
  context.statLocked = true;
  if (!actorData.system.lock && settings.get('brp', 'development')) context.statLocked = false;
}

function prepareOptionalTabFlags(context) {
  context.useSocialTab = true;
  context.usePersTab = Boolean(context.usePersTrait || context.usePassion);
}

function prepareResourceCount(context) {
  let resource = 2;
  if (context.useFP) resource++;
  if (context.useSAN) resource++;
  if (context.useRES5) resource++;
  context.resource = resource;
}

function preparePowerLabels(context, settings) {
  for (const [contextKey, settingKey, fallbackKey] of POWER_LABEL_SETTINGS) {
    context[contextKey] = getSettingLabel(settings, settingKey, fallbackKey);
  }
}

function prepareDevelopmentLabels(context, settings) {
  context.xpFixed = `+${settings.get('brp', 'xpFixed')}%`;
  context.xpFormula = `+${settings.get('brp', 'xpFormula')}%`;
}

function getSettingLabel(settings, settingKey, fallbackKey) {
  const label = settings.get('brp', settingKey);
  return label || game.i18n.localize(fallbackKey);
}
