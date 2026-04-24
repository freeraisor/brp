export const BRP = {};

BRP.stats = {
  "str": "BRP.StatsStr",
  "con": "BRP.StatsCon",
  "siz": "BRP.StatsSiz",
  "int": "BRP.StatsInt",
  "pow": "BRP.StatsPow",
  "dex": "BRP.StatsDex",
  "cha": "BRP.StatsCha",
  "edu": "BRP.StatsEdu"
};

BRP.statsAbbreviations = {
  "str": "BRP.StatsStrAbbr",
  "con": "BRP.StatsConAbbr",
  "siz": "BRP.StatsSizAbbr",
  "int": "BRP.StatsIntAbbr",
  "pow": "BRP.StatsPowAbbr",
  "dex": "BRP.StatsDexAbbr",
  "cha": "BRP.StatsChaAbbr",
  "edu": "BRP.StatsEduAbbr",
  "fixed": "BRP.fixed",
  "none": "BRP.none",
};

BRP.statsDerived = {
  "str": "BRP.StatsStrDeriv",
  "con": "BRP.StatsConDeriv",
  "siz": "BRP.StatsSizDeriv",
  "int": "BRP.StatsIntDeriv",
  "pow": "BRP.StatsPowDeriv",
  "dex": "BRP.StatsDexDeriv",
  "cha": "BRP.StatsChaDeriv",
  "edu": "BRP.StatsEduDeriv",
};

BRP.effectsSheet = {
  actorFlagPath: 'flags.brp.sheet.effects',
  effectFlagPath: 'flags.brp.sheet.effects',
  filters: {
    all: 'BRP.effectsFilterAll',
    'active-only': 'BRP.effectsFilterActiveOnly',
    temporary: 'BRP.effectsFilterTemporary',
    hidden: 'BRP.effectsFilterHidden'
  },
  groups: {
    items: 'BRP.effectsGroupItems',
    status: 'BRP.effectsGroupStatus',
    wounds: 'BRP.effectsGroupWounds',
    magic: 'BRP.effectsGroupMagic',
    injuries: 'BRP.effectsGroupInjuries',
    manual: 'BRP.effectsGroupManual'
  },
  durations: {
    permanent: 'BRP.effectsDurationPermanent',
    timed: 'BRP.effectsDurationTimed',
    conditional: 'BRP.effectsDurationConditional'
  },
  targetCategories: {
    'skill-category': 'BRP.effectsCategorySkillCategory',
    'specific-skill': 'BRP.effectsCategorySpecificSkill',
    characteristic: 'BRP.effectsCategoryCharacteristic',
    derived: 'BRP.effectsCategoryDerived',
    armour: 'BRP.effectsCategoryArmour',
    resource: 'BRP.effectsCategoryResource',
    other: 'BRP.effectsCategoryOther'
  }
};

BRP.keysActiveEffects = {
  'system.stats.str.effects': 'BRP.StatsStrAbbr',
  'system.stats.con.effects': 'BRP.StatsConAbbr',
  'system.stats.int.effects': 'BRP.StatsIntAbbr',
  'system.stats.siz.effects': 'BRP.StatsSizAbbr',
  'system.stats.pow.effects': 'BRP.StatsPowAbbr',
  'system.stats.dex.effects': 'BRP.StatsDexAbbr',
  'system.stats.cha.effects': 'BRP.StatsChaAbbr',
  'system.stats.edu.effects': 'BRP.StatsEduAbbr',
  'system.health.effects': 'BRP.health',
  'system.power.effects': 'BRP.mp',
  'system.fatigue.effects': 'BRP.fatigue',
};
