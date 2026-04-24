import { BRPHealth } from '../../../../combat/health.mjs';
import { createArmourIcon } from './armour-icons.mjs';
import { averageArmorValue, createHealthSilhouette } from './health-silhouette.mjs';

export function createHealthPreparation() {
  return {
    hitlocs: [],
    wounds: []
  };
}

export function prepareHitLocationItem(context, item, state, armours) {
  state.hitlocs.push(item);

  if (context.useHPL) {
    item.system.list = 0;
    item.system.count = 0;
    item.system.hitlocID = item._id;
    armours.push(item);
  }
}

export function prepareWoundItem(item, state) {
  state.wounds.push(item);
}

export function finalizeHealthPreparation(context, state) {
  state.hitlocs.sort(function (a, b) {
    let x = a.system.lowRoll;
    let y = b.system.lowRoll;
    if (x < y) { return 1 };
    if (x > y) { return -1 };
    return 0;
  });

  const activeWounds = state.wounds.filter(wound => BRPHealth.isActiveWound(wound));
  const hitLocations = state.hitlocs.map(hitLocation => hitLocationRow(context, hitLocation, activeWounds));
  const actorHealth = BRPHealth.computeActorHealth(context.actor);
  const autoConditions = BRPHealth.computeAutoConditions(context.actor, { useHPL: context.useHPL });
  const silhouette = createHealthSilhouette(context, hitLocations, actorHealth);
  const sheetFlags = context.actor.getFlag?.('brp', 'sheet') ?? context.actor.flags?.brp?.sheet ?? {};
  const expandedLocations = sheetFlags.health?.expandedLocations ?? {};
  const expandedWounds = sheetFlags.health?.expandedWounds ?? {};
  const healingActionList = healingActions(context);
  const mappedHitLocations = hitLocations.map(location => {
    const silhouettePart = silhouette.mapping[location.id] ?? '';
    const mappedWounds = (location.wounds ?? []).map(wound => ({
      ...wound,
      expanded: Boolean(expandedWounds[wound.id])
    }));
    return {
      ...location,
      wounds: mappedWounds,
      silhouettePart,
      isMappedToSilhouette: silhouettePart !== '',
      expanded: Boolean(expandedLocations[location.id])
    };
  });
  const unmatchedLocations = mappedHitLocations.filter(location => !location.isMappedToSilhouette);
  const woundedLocationIds = new Set(activeWounds.map(wound => wound.system.locId).filter(Boolean));
  const decorateWoundRow = wound => ({
    ...wound,
    expanded: Boolean(expandedWounds[wound.id])
  });

  context.healthView = {
    useHPL: context.useHPL,
    modeLabel: context.useHPL ? 'BRP.hitLoc' : 'BRP.health',
    hitLocations: mappedHitLocations,
    locations: mappedHitLocations,
    unmatchedLocations,
    wounds: activeWounds.map(wound => decorateWoundRow(woundRow(wound, context))),
    allWounds: state.wounds.map(wound => decorateWoundRow(woundRow(wound, context))),
    wornArmor: wornArmorRows(context),
    healingActions: healingActionList.filter(action => action.primary),
    healingUtilityActions: healingActionList.filter(action => !action.primary),
    summary: {
      useHPL: context.useHPL,
      hp: {
        value: actorHealth.value,
        max: actorHealth.max,
        pct: clampPercent(actorHealth.pct),
        color: healthBarColor(actorHealth.pct)
      },
      activeWounds: actorHealth.activeWoundCount,
      woundedLocations: woundedLocationIds.size,
      majorThreshold: context.system.health.mjrwnd,
      majorWounds: actorHealth.majorWounds,
      worstWound: actorHealth.worstWound ? woundRow(actorHealth.worstWound, context) : null,
      naturalHealingRate: context.system.health.daily,
      naturalHealingLabel: `${context.system.health.daily || 0} / wk`,
      disabledLocations: mappedHitLocations.filter(location => location.hp.disabled).length,
      activeConditions: autoConditions,
      majorWound: context.system.health.mjrwnd,
      armourPrimary: context.useAVRand ? context.system.avr1 : context.system.av1,
      armourSecondary: context.useAVRand ? context.system.avr2 : context.system.av2,
      armourRollable: context.useAVRand
    },
    silhouette,
    settings: {
      locationsCollapsed: Boolean(sheetFlags.healthLocationsCollapsed)
    },
    detailTab: 'health'
  };
}

function hitLocationRow(context, hitLocation, wounds) {
  const locationWounds = wounds.filter(wound => wound.system.locId === hitLocation._id);
  const locationHealth = BRPHealth.computeLocationHealth(context.actor, hitLocation);

  return {
    id: hitLocation._id,
    name: hitLocation.system.displayName,
    brpid: hitLocation.flags.brp?.brpidFlag?.id ?? '',
    item: hitLocation,
    locType: hitLocation.system.locType,
    range: hitLocation.system.lowRoll === hitLocation.system.highRoll
      ? hitLocation.system.lowRoll
      : hitLocation.system.lowRoll + " - " + hitLocation.system.highRoll,
    lowRoll: hitLocation.system.lowRoll,
    highRoll: hitLocation.system.highRoll,
    hp: {
      value: locationHealth.value,
      max: locationHealth.max,
      pct: clampPercent(locationHealth.pct),
      color: healthBarColor(locationHealth.pct),
      critical: locationHealth.critical,
      disabled: locationHealth.disabled
    },
    armour: {
      value: hitLocation.system.av1,
      backup: hitLocation.system.av2,
      randomValue: hitLocation.system.avr1,
      randomBackup: hitLocation.system.avr2,
      display: context.useAVRand ? hitLocation.system.avr1 : hitLocation.system.av1,
      average: averageArmorValue({
        armour: {
          value: hitLocation.system.av1,
          randomValue: hitLocation.system.avr1
        }
      })
    },
    status: {
      injured: hitLocation.system.injured,
      bleeding: hitLocation.system.bleeding,
      incapacitated: hitLocation.system.incapacitated,
      dead: hitLocation.system.dead,
      severed: hitLocation.system.severed,
      unconscious: hitLocation.system.unconscious
    },
    wounds: locationWounds.map(wound => woundRow(wound, context)),
    woundCount: locationWounds.length,
    searchText: [
      hitLocation.name,
      hitLocation.system.displayName,
      hitLocation.flags.brp?.brpidFlag?.id
    ].filter(Boolean).join(' ').toLocaleLowerCase()
  };
}

function woundRow(wound, context = {}) {
  const normalized = BRPHealth.normalizeWoundSystem(wound);
  const statusLabel = woundStatusLabel(normalized.status);
  const damageTypeLabel = game.i18n.localize(`BRP.${normalized.damageType}`);
  const location = normalized.locId ? context.actor?.items?.get?.(normalized.locId) : null;
  const locationName = location?.system?.displayName ?? location?.name ?? '';
  const tooltipParts = [
    statusLabel,
    damageTypeLabel,
    normalized.isMajor ? game.i18n.localize('BRP.majorWound') : '',
    normalized.firstAidUsed ? game.i18n.localize('BRP.woundFirstAidUsed') : ''
  ].filter(Boolean);

  return {
    id: wound._id,
    name: wound.name,
    item: wound,
    value: normalized.damageRemaining,
    damage: normalized.damage,
    damageRemaining: normalized.damageRemaining,
    damageType: normalized.damageType,
    damageTypeLabel,
    status: normalized.status,
    statusClass: normalized.status,
    statusLabel,
    locId: normalized.locId,
    locationName,
    isMajor: normalized.isMajor,
    firstAidUsed: normalized.firstAidUsed,
    historyCount: normalized.history.length,
    treated: normalized.treated,
    untreated: !normalized.treated,
    tooltip: tooltipParts.join(' | ')
  };
}

function woundStatusLabel(status) {
  return game.i18n.localize(`BRP.woundStatus${status.charAt(0).toUpperCase()}${status.slice(1)}`);
}

function wornArmorRows(context) {
  return context.actor.items
    .filter(item => item.type === 'armour' && item.system.equipStatus === 'worn')
    .map(armour => {
      const hitLocation = armour.system.hitlocID ? context.actor.items.get(armour.system.hitlocID) : null;
      const icon = createArmourIcon(armour, hitLocation);
      const energyMax = Math.max(0, Number(armour.system.ppMax) || 0);
      const energyCurrent = Math.max(0, Number(armour.system.ppCurr) || 0);
      return {
        id: armour._id,
        item: armour,
        name: armour.name,
        icon,
        hitLocationId: armour.system.hitlocID,
        hitLocationName: hitLocation?.system.displayName ?? armour.system.hitlocName ?? '',
        ap: armour.system.av1,
        bap: armour.system.av2,
        randomAp: armour.system.avr1,
        randomBap: armour.system.avr2,
        average: averageArmorValue({
          armour: {
            value: armour.system.av1,
            randomValue: armour.system.avr1
          }
        }),
        enc: armour.system.actlEnc ?? armour.system.enc,
        display: context.useAVRand ? armour.system.avr1 : armour.system.av1,
        energy: {
          enabled: energyMax > 0,
          current: energyCurrent,
          max: energyMax,
          pct: energyMax > 0 ? clampPercent(energyCurrent / energyMax * 100) : 0
        },
        rollable: context.useAVRand
      };
    });
}

function healingActions(context) {
  const actions = [
    { id: 'firstAid', action: 'healthHealWound', healing: 'medical', tooltip: 'BRP.firstAid', label: 'BRP.firstAid', sub: '1D3 HP - once per wound', icon: 'fas fa-kit-medical', primary: true },
    { id: 'medicine', action: 'healthHealWound', healing: 'medicine', tooltip: 'BRP.medicine', label: 'BRP.medicine', sub: '2D3 HP - once per day', icon: 'fas fa-briefcase-medical', primary: true },
    { id: 'natural', action: 'healthNaturalHeal', tooltip: 'BRP.naturalHealing', label: 'BRP.naturalHealing', sub: '1D3 HP per week', icon: 'fas fa-droplet', primary: true },
    { id: 'other', action: 'healthOtherHeal', healing: 'manual', tooltip: 'BRP.other', label: 'BRP.other', sub: 'Magic - tech - custom', icon: 'fas fa-bolt', primary: true },
    { id: 'all', action: 'healthAllHeal', tooltip: 'BRP.allHeal', label: 'BRP.allHeal', sub: 'Clear all active wounds', icon: 'fas fa-staff-snake', primary: false }
  ];

  if (!context.useHPL) {
    actions.push({ id: 'reset', action: 'healthResetDaily', tooltip: 'BRP.resetDaily', label: 'BRP.resetDaily', sub: 'Reset daily healing', icon: 'fas fa-sunrise', primary: false });
  }

  return actions;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function healthBarColor(pct) {
  const value = Number(pct) || 0;
  if (value <= 0) return 'var(--brp-refresh-red-muted)';
  if (value <= 25) return 'var(--brp-refresh-red-bright)';
  if (value <= 50) return 'var(--brp-refresh-amber)';
  if (value <= 75) return 'color-mix(in srgb, var(--brp-refresh-amber) 76%, var(--brp-refresh-green))';
  return 'var(--brp-refresh-green)';
}
