const VALID_VIZ_MODES = new Set(['health', 'armor', 'wounds']);

// TODO: Consider extending silhouette support with additional SVG templates after the humanoid MVP.
export const HUMANOID_SILHOUETTE_PARTS = [
  {
    id: 'head-humanoid',
    label: 'BRP.head',
    brpid: 'i.hit-location.head-humanoid',
    path: 'M50 5 a15 15 0 0 1 0 30 a15 15 0 0 1 0 -30 z',
    labelX: 50,
    labelY: 20
  },
  {
    id: 'chest-humanoid',
    label: 'BRP.chest',
    brpid: 'i.hit-location.chest-humanoid',
    path: 'M30 38 L70 38 L72 78 L28 78 z',
    labelX: 50,
    labelY: 58
  },
  {
    id: 'abdomen-humanoid',
    label: 'BRP.abdomen',
    brpid: 'i.hit-location.abdomen-humanoid',
    path: 'M28 80 L72 80 L70 105 L30 105 z',
    labelX: 50,
    labelY: 93
  },
  {
    id: 'left-arm-humanoid',
    label: 'BRP.leftArm',
    brpid: 'i.hit-location.left-arm-humanoid',
    path: 'M25 40 L20 42 L13 90 L9 120 L16 122 L20 95 L27 55 z',
    labelX: 18,
    labelY: 82
  },
  {
    id: 'right-arm-humanoid',
    label: 'BRP.rightArm',
    brpid: 'i.hit-location.right-arm-humanoid',
    path: 'M75 40 L80 42 L87 90 L91 120 L84 122 L80 95 L73 55 z',
    labelX: 82,
    labelY: 82
  },
  {
    id: 'left-leg-humanoid',
    label: 'BRP.leftLeg',
    brpid: 'i.hit-location.left-leg-humanoid',
    path: 'M30 108 L48 108 L46 175 L32 175 z',
    labelX: 39,
    labelY: 142
  },
  {
    id: 'right-leg-humanoid',
    label: 'BRP.rightLeg',
    brpid: 'i.hit-location.right-leg-humanoid',
    path: 'M52 108 L70 108 L68 175 L54 175 z',
    labelX: 61,
    labelY: 142
  },
  {
    id: 'general-humanoid',
    label: 'BRP.general',
    brpid: 'i.hit-location.general-humanoid',
    path: 'M50 5 a15 15 0 0 1 0 30 a15 15 0 0 1 0 -30 z M25 40 L20 42 L13 90 L9 120 L16 122 L20 95 L28 80 L72 80 L80 95 L84 122 L91 120 L87 90 L80 42 L75 40 L72 78 L28 78 L25 40 z M30 108 L48 108 L46 175 L32 175 z M52 108 L70 108 L68 175 L54 175 z',
    labelX: 50,
    labelY: 90,
    general: true
  }
];

const PART_BY_ID = new Map(HUMANOID_SILHOUETTE_PARTS.map(part => [part.id, part]));
const PART_BY_BRPID = new Map(HUMANOID_SILHOUETTE_PARTS.map(part => [part.brpid, part]));

export function createHealthSilhouette(context, locations, actorHealth) {
  const healthFlags = getHealthFlags(context.actor);
  const vizMode = VALID_VIZ_MODES.has(healthFlags.vizMode) ? healthFlags.vizMode : 'health';

  if (!context.useHPL) {
    const part = createGeneralPart(context, actorHealth, vizMode);
    return {
      type: 'humanoid',
      vizMode,
      modes: createVizModes(vizMode),
      parts: [part],
      mapping: {},
      unmatchedCount: 0,
      unmatchedLocations: [],
      legend: legendForMode(vizMode),
      settingsAction: 'healthSilhouetteSettings'
    };
  }

  const overrideMap = healthFlags.silhouetteMap ?? {};
  const mapping = {};
  const usedLocationIds = new Set();
  const usedPartIds = new Set();

  for (let location of locations) {
    const partId = resolvePartId(location, overrideMap);
    if (!partId || !PART_BY_ID.has(partId) || usedPartIds.has(partId)) continue;
    mapping[location.id] = partId;
    usedLocationIds.add(location.id);
    usedPartIds.add(partId);
  }

  const parts = HUMANOID_SILHOUETTE_PARTS
    .filter(part => !part.general)
    .map(part => {
      const location = locations.find(row => mapping[row.id] === part.id);
      return createPartView(part, location, vizMode);
    });
  const unmatchedLocations = locations.filter(location => !usedLocationIds.has(location.id));

  return {
    type: 'humanoid',
    vizMode,
    modes: createVizModes(vizMode),
    parts,
    mapping,
    unmatchedCount: unmatchedLocations.length,
    unmatchedLocations,
    legend: legendForMode(vizMode),
    settingsAction: 'healthSilhouetteSettings'
  };
}

function getHealthFlags(actor) {
  return actor.getFlag?.('brp', 'health') ?? actor.flags.brp?.health ?? {};
}

function resolvePartId(location, overrideMap) {
  if (Object.prototype.hasOwnProperty.call(overrideMap, location.id)) {
    const override = overrideMap[location.id];
    return ['none', '', null, undefined].includes(override) ? null : override;
  }

  return PART_BY_BRPID.get(location.brpid)?.id ?? null;
}

function createGeneralPart(context, actorHealth, vizMode) {
  const location = {
    id: 'total',
    name: game.i18n.localize('BRP.general'),
    hp: {
      value: actorHealth.value,
      max: actorHealth.max,
      pct: actorHealth.pct,
      critical: actorHealth.value <= Math.ceil(actorHealth.max / 2),
      disabled: actorHealth.value <= 0
    },
    armour: {
      average: Number(context.system.av1) || 0,
      display: context.useAVRand ? context.system.avr1 : context.system.av1
    },
    woundCount: actorHealth.activeWoundCount
  };

  return createPartView(PART_BY_ID.get('general-humanoid'), location, vizMode);
}

function createPartView(part, location, vizMode) {
  const isMapped = Boolean(location);
  const fill = isMapped ? fillForMode(location, vizMode) : 'var(--brp-refresh-bg-card)';
  const tooltip = isMapped
    ? `${location.name}: ${location.hp.value} / ${location.hp.max} HP, AP ${location.armour.display ?? 0}, ${location.woundCount ?? 0} wounds`
    : game.i18n.localize(part.label);

  return {
    ...part,
    locationId: location?.id ?? '',
    locationName: location?.name ?? '',
    isMapped,
    fill,
    tooltip,
    hp: location?.hp,
    armour: location?.armour,
    woundCount: location?.woundCount ?? 0
  };
}

function createVizModes(activeMode) {
  return [
    { id: 'health', label: 'BRP.health', icon: 'fas fa-heart-pulse', active: activeMode === 'health' },
    { id: 'armor', label: 'BRP.armour', icon: 'fas fa-shield-halved', active: activeMode === 'armor' },
    { id: 'wounds', label: 'BRP.wounds', icon: 'fas fa-droplet', active: activeMode === 'wounds' }
  ];
}

function fillForMode(location, mode) {
  switch (mode) {
    case 'armor':
      return armorFill(location.armour.average);
    case 'wounds':
      return woundFill(location.woundCount);
    case 'health':
    default:
      return healthFill(location.hp.pct);
  }
}

function healthFill(pct) {
  if (pct <= 0) return 'var(--brp-refresh-red-muted)';
  if (pct < 25) return 'var(--brp-refresh-red)';
  if (pct <= 50) return 'var(--brp-refresh-amber)';
  if (pct <= 75) return 'color-mix(in srgb, var(--brp-refresh-amber) 76%, var(--brp-refresh-green))';
  return 'var(--brp-refresh-green)';
}

function armorFill(average) {
  const ap = Number(average) || 0;
  if (ap <= 0) return 'var(--brp-refresh-bg-card)';
  if (ap <= 3) return 'color-mix(in srgb, var(--brp-refresh-blue) 35%, var(--brp-refresh-bg-card))';
  if (ap <= 7) return 'var(--brp-refresh-blue)';
  if (ap <= 12) return 'color-mix(in srgb, var(--brp-refresh-blue) 80%, var(--brp-refresh-mint))';
  return 'color-mix(in srgb, var(--brp-refresh-blue) 70%, white)';
}

function woundFill(count) {
  if (count <= 0) return 'var(--brp-refresh-bg-card)';
  if (count === 1) return 'color-mix(in srgb, var(--brp-refresh-red-bright) 45%, var(--brp-refresh-bg-card))';
  if (count === 2) return 'var(--brp-refresh-red)';
  return 'var(--brp-refresh-red-bright)';
}

function legendForMode(mode) {
  return {
    health: 'BRP.healthSilhouetteLegendHealth',
    armor: 'BRP.healthSilhouetteLegendArmor',
    wounds: 'BRP.healthSilhouetteLegendWounds'
  }[mode] ?? 'BRP.healthSilhouetteLegendHealth';
}

export function averageArmorValue(location) {
  if (!location) return 0;
  const fixed = Number(location.armour?.value) || 0;
  const random = averageFormula(location.armour?.randomValue);
  return random || fixed;
}

export function createSilhouetteMappingContext(actor) {
  const healthFlags = getHealthFlags(actor);
  const silhouetteMap = healthFlags.silhouetteMap ?? {};

  return {
    partOptions: createSilhouettePartOptions(),
    locations: actor.items
      .filter(item => item.type === 'hit-location')
      .sort((a, b) => b.system.lowRoll - a.system.lowRoll)
      .map(location => {
        const id = location.id ?? location._id;
        const selectedPartId = Object.prototype.hasOwnProperty.call(silhouetteMap, id)
          ? silhouetteMap[id] || 'none'
          : 'auto';
        return {
          id,
          name: location.system.displayName || location.name,
          brpid: location.flags?.brp?.brpidFlag?.id ?? '',
          selectedPartId
        };
      })
  };
}

export function createSilhouettePartOptions() {
  return HUMANOID_SILHOUETTE_PARTS
    .filter(part => !part.general)
    .reduce((options, part) => {
      options[part.id] = game.i18n.localize(part.label);
      return options;
    }, {
      auto: game.i18n.localize('BRP.healthSilhouetteAuto'),
      none: game.i18n.localize('BRP.healthSilhouetteHidden')
    });
}

export function buildSilhouetteMapFromForm(locations, formObject = {}) {
  return locations.reduce((mapping, location) => {
    const value = formObject[`map-${location.id}`] ?? 'auto';
    if (value !== 'auto') mapping[location.id] = value;
    return mapping;
  }, {});
}

function averageFormula(formula) {
  if (!formula || typeof formula !== 'string') return 0;
  return formula
    .split('+')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((total, part) => total + averageFormulaPart(part), 0);
}

function averageFormulaPart(part) {
  const diceMatch = part.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (diceMatch) {
    const dice = Number(diceMatch[1]) || 1;
    const faces = Number(diceMatch[2]) || 0;
    const mod = Number(diceMatch[3]) || 0;
    return dice * ((faces + 1) / 2) + mod;
  }

  return Number(part) || 0;
}
