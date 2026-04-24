export const DEFAULT_ITEM_IMAGE_BY_TYPE = {
  powerMod: 'systems/brp/assets/Icons/broken-shield.svg',
  failing: 'systems/brp/assets/Icons/drama-masks.svg',
  'hit-location': 'systems/brp/assets/Icons/arm-bandage.svg',
  magic: 'systems/brp/assets/Icons/scroll-unfurled.svg',
  mutation: 'systems/brp/assets/Icons/dna1.svg',
  personality: 'systems/brp/assets/Icons/inner-self.svg',
  power: 'systems/brp/assets/Icons/lightning-helix.svg',
  profession: 'systems/brp/assets/Icons/blacksmith.svg',
  psychic: 'systems/brp/assets/Icons/suspicious.svg',
  skill: 'systems/brp/assets/Icons/skills.svg',
  sorcery: 'systems/brp/assets/Icons/bolt-spell-cast.svg',
  super: 'systems/brp/assets/Icons/deadly-strike.svg',
  armour: 'systems/brp/assets/Icons/lamellar.svg',
  gear: 'systems/brp/assets/Icons/knapsack.svg',
  weapon: 'systems/brp/assets/Icons/saber-and-pistol.svg',
  wound: 'systems/brp/assets/Icons/drop.svg',
  allegiance: 'systems/brp/assets/Icons/all-seeing-eye.svg',
  passion: 'systems/brp/assets/Icons/shining-heart.svg',
  persTrait: 'systems/brp/assets/Icons/scales.svg',
  reputation: 'systems/brp/assets/Icons/throne-king.svg',
  contact: 'systems/brp/assets/Icons/cowled.svg',
  faction: 'systems/brp/assets/Icons/inverse-aura.svg',
  quest: 'systems/brp/assets/Icons/scroll-unfurled.svg',
  skillcat: 'systems/brp/assets/Icons/classical-knowledge.svg',
  culture: 'systems/brp/assets/Icons/earth-africa-europe.svg'
};

export function applyDefaultItemImage(data) {
  if (typeof data?.img !== 'undefined') return;

  const defaultImage = DEFAULT_ITEM_IMAGE_BY_TYPE[data.type];
  if (defaultImage) data.img = defaultImage;
}

export function prepareItemResourceLabels(systemData, settings = game.settings) {
  systemData.powerLabel = getSettingLabel(settings, 'ppLabelLong', 'BRP.pp');
  systemData.powerLabelAbbr = getSettingLabel(settings, 'ppLabelShort', 'BRP.ppShort');
  systemData.healthLabelAbbr = getSettingLabel(settings, 'hpLabelShort', 'BRP.hp');
}

function getSettingLabel(settings, key, fallback) {
  const value = settings.get('brp', key);
  return value || game.i18n.localize(fallback);
}
