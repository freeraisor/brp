import { getProjectedArmourBonus } from '../actor/effects/effect-projector.mjs';

export const BRP_WOUND_STATUSES = [
  'fresh',
  'bleeding',
  'treated',
  'healing',
  'infected',
  'healed',
  'scarred'
];

const DEFAULT_DAMAGE_TYPE = 'other';
const TREATED_STATUSES = new Set(['treated', 'healing', 'healed', 'scarred']);
const FIRST_AID_METHODS = new Set(['medical', 'firstAid']);

function duplicate(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  if (globalThis.structuredClone) return structuredClone(value);
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveNumber(value, fallback = 0) {
  return Math.max(0, toNumber(value, fallback));
}

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}

function asArray(value) {
  return Array.isArray(value) ? duplicate(value) : [];
}

function timestamp() {
  return Math.floor(Date.now() / 1000);
}

function dateKey() {
  return new Date().toISOString().slice(0, 10);
}

export class BRPHealth {
  static normalizeWoundSystem(woundOrSystem = {}, overrides = {}) {
    const system = woundOrSystem.system ?? woundOrSystem ?? {};
    const legacyValue = positiveNumber(system.value, 0);
    const damageRemaining = positiveNumber(
      firstDefined(overrides.damageRemaining, overrides.value, system.damageRemaining, legacyValue),
      legacyValue
    );
    const damage = positiveNumber(
      firstDefined(overrides.damage, overrides.value, system.damage, legacyValue, damageRemaining),
      damageRemaining
    );
    let status = firstDefined(overrides.status, system.status, system.treated ? 'treated' : 'fresh');
    if (!BRP_WOUND_STATUSES.includes(status)) status = 'fresh';
    if (damageRemaining <= 0 && status !== 'scarred') status = 'healed';

    const firstAidUsed = Boolean(firstDefined(overrides.firstAidUsed, system.firstAidUsed, system.treated, false));
    const treated = Boolean(firstDefined(
      overrides.treated,
      system.treated,
      firstAidUsed,
      TREATED_STATUSES.has(status)
    )) || TREATED_STATUSES.has(status);

    return {
      value: damageRemaining,
      damage,
      damageRemaining,
      damageType: firstDefined(overrides.damageType, system.damageType, DEFAULT_DAMAGE_TYPE),
      status,
      locId: firstDefined(overrides.locId, system.locId, ''),
      isMajor: Boolean(firstDefined(overrides.isMajor, system.isMajor, false)),
      firstAidUsed,
      medicineLastDay: firstDefined(overrides.medicineLastDay, system.medicineLastDay, ''),
      source: firstDefined(overrides.source, system.source, 'manual'),
      armorApplied: positiveNumber(firstDefined(overrides.armorApplied, system.armorApplied, 0), 0),
      armorFormula: firstDefined(overrides.armorFormula, system.armorFormula, ''),
      armorRolls: asArray(firstDefined(overrides.armorRolls, system.armorRolls, [])),
      createdAt: toNumber(firstDefined(overrides.createdAt, system.createdAt, 0), 0),
      createdLabel: firstDefined(overrides.createdLabel, system.createdLabel, ''),
      history: asArray(firstDefined(overrides.history, system.history, [])),
      treated,
      created: Boolean(firstDefined(overrides.created, system.created, false))
    };
  }

  static buildWoundUpdate(woundOrSystem = {}, overrides = {}) {
    const normalized = this.normalizeWoundSystem(woundOrSystem, overrides);
    return {
      'system.value': normalized.value,
      'system.damage': normalized.damage,
      'system.damageRemaining': normalized.damageRemaining,
      'system.damageType': normalized.damageType,
      'system.status': normalized.status,
      'system.locId': normalized.locId,
      'system.isMajor': normalized.isMajor,
      'system.firstAidUsed': normalized.firstAidUsed,
      'system.medicineLastDay': normalized.medicineLastDay,
      'system.source': normalized.source,
      'system.armorApplied': normalized.armorApplied,
      'system.armorFormula': normalized.armorFormula,
      'system.armorRolls': normalized.armorRolls,
      'system.createdAt': normalized.createdAt,
      'system.createdLabel': normalized.createdLabel,
      'system.history': normalized.history,
      'system.treated': normalized.treated,
      'system.created': normalized.created
    };
  }

  static migrateLegacyWoundData(wound) {
    return this.buildWoundUpdate(wound, {});
  }

  static getWoundDamageRemaining(wound) {
    return this.normalizeWoundSystem(wound).damageRemaining;
  }

  static isActiveWound(wound) {
    const normalized = this.normalizeWoundSystem(wound);
    return normalized.damageRemaining > 0 && !['healed', 'scarred'].includes(normalized.status);
  }

  static async updateWound(wound, overrides = {}) {
    return wound.update(this.buildWoundUpdate(wound, overrides));
  }

  static normalizeHealingMethod(method = 'medical') {
    if (method === 'magical') return 'magic';
    if (method === 'first-aid') return 'firstAid';
    return method || 'medical';
  }

  static createHistoryEntry({
    action = 'healing',
    method = 'manual',
    amount = 0,
    before = 0,
    after = 0,
    result = '',
    formula = '',
    note = '',
    source = 'manual',
    at = timestamp()
  } = {}) {
    return {
      at,
      action,
      method: this.normalizeHealingMethod(method),
      amount: toNumber(amount, 0),
      before: positiveNumber(before, 0),
      after: positiveNumber(after, 0),
      result,
      formula,
      note,
      source
    };
  }

  static async healWound(wound, {
    healing = 0,
    method = 'medical',
    result = '',
    formula = '',
    note = '',
    source = 'manual'
  } = {}) {
    const amount = toNumber(healing, 0);
    if (amount === 0) return { wound, before: this.getWoundDamageRemaining(wound), after: this.getWoundDamageRemaining(wound), healing: amount };

    const normalized = this.normalizeWoundSystem(wound);
    const methodId = this.normalizeHealingMethod(method);
    const before = normalized.damageRemaining;
    const after = positiveNumber(before - amount, 0);
    const history = [
      ...normalized.history,
      this.createHistoryEntry({
        method: methodId,
        amount,
        before,
        after,
        result,
        formula,
        note,
        source
      })
    ];
    const update = {
      damage: amount < 0 ? Math.max(normalized.damage, after) : normalized.damage,
      damageRemaining: after,
      status: this.statusAfterHealing(normalized.status, after, amount, methodId),
      treated: amount > 0 || normalized.treated || FIRST_AID_METHODS.has(methodId),
      firstAidUsed: normalized.firstAidUsed || FIRST_AID_METHODS.has(methodId),
      medicineLastDay: methodId === 'medicine' ? dateKey() : normalized.medicineLastDay,
      history
    };

    await this.updateWound(wound, update);
    return { wound, before, after, healing: amount, update };
  }

  static statusAfterHealing(currentStatus, after, amount, method) {
    if (after <= 0) return 'healed';
    if (amount < 0) return ['healed', 'scarred'].includes(currentStatus) ? 'fresh' : currentStatus;
    return method === 'natural' ? 'healing' : 'treated';
  }

  static async distributeNaturalHealing(actor, { healing = 0, note = '', source = 'natural-healing' } = {}) {
    let remaining = positiveNumber(healing, 0);
    const results = [];
    if (remaining < 1) return { results, spent: 0, remaining };

    const wounds = actor.items
      .filter(item => item.type === 'wound' && this.isActiveWound(item))
      .sort((a, b) => this.getWoundDamageRemaining(a) - this.getWoundDamageRemaining(b));

    const initial = remaining;
    for (const wound of wounds) {
      if (remaining < 1) break;
      const damageRemaining = this.getWoundDamageRemaining(wound);
      const woundHealing = Math.min(remaining, damageRemaining);
      results.push(await this.healWound(wound, {
        healing: woundHealing,
        method: 'natural',
        note,
        source
      }));
      remaining -= woundHealing;
    }

    return { results, spent: initial - remaining, remaining };
  }

  static async healAllWounds(actor, { note = '', source = 'heal-all' } = {}) {
    const wounds = actor.items.filter(item => {
      if (item.type !== 'wound') return false;
      return this.isActiveWound(item) || !['healed', 'scarred'].includes(item.system?.status);
    });
    const results = [];

    for (const wound of wounds) {
      const healing = this.getWoundDamageRemaining(wound);
      if (healing < 1) {
        const update = { damageRemaining: 0, status: 'healed' };
        await this.updateWound(wound, update);
        results.push({ wound, before: 0, after: 0, healing: 0, update });
        continue;
      }
      results.push(await this.healWound(wound, {
        healing,
        method: 'manual',
        note,
        source
      }));
    }

    return { healed: results.length, results };
  }

  static async reduceArmorEnergy(actor, armorOrId, amount = 1, { source = 'manual' } = {}) {
    const armor = typeof armorOrId === 'string' ? actor?.items?.get?.(armorOrId) : armorOrId;
    if (!armor || armor.type !== 'armour') return null;

    const before = positiveNumber(armor.system?.ppCurr, 0);
    const max = positiveNumber(armor.system?.ppMax, 0);
    const spent = Math.min(before, positiveNumber(amount, 0));
    const after = positiveNumber(before - spent, 0);

    if (spent <= 0) return { armor, before, after, spent: 0, max, source };

    await armor.update({ 'system.ppCurr': after });
    return { armor, before, after, spent, max, source };
  }

  static async addArmorEnergy(actor, armorOrId, amount = 1, { source = 'manual' } = {}) {
    const armor = typeof armorOrId === 'string' ? actor?.items?.get?.(armorOrId) : armorOrId;
    if (!armor || armor.type !== 'armour') return null;

    const before = positiveNumber(armor.system?.ppCurr, 0);
    const max = positiveNumber(armor.system?.ppMax, 0);
    const requested = positiveNumber(amount, 0);
    const after = max > 0 ? Math.min(max, before + requested) : before + requested;
    const added = after - before;

    if (added <= 0) return { armor, before, after, added: 0, max, source };

    await armor.update({ 'system.ppCurr': after });
    return { armor, before, after, added, max, source };
  }

  static woundSystemData(overrides = {}) {
    return this.normalizeWoundSystem({}, {
      value: overrides.damageRemaining ?? overrides.damage ?? overrides.value,
      damage: overrides.damage ?? overrides.value,
      damageRemaining: overrides.damageRemaining ?? overrides.damage ?? overrides.value,
      ...overrides
    });
  }

  static async createWound(actor, data = {}) {
    const damage = positiveNumber(firstDefined(data.damageRemaining, data.damage, data.value, 0), 0);
    if (damage < 1) return null;

    const itemData = {
      name: data.name || game.i18n.localize('BRP.wound'),
      type: 'wound',
      system: {
        ...this.woundSystemData({
          locId: data.locationId ?? data.locId ?? '',
          damage,
          damageRemaining: damage,
          damageType: data.damageType ?? DEFAULT_DAMAGE_TYPE,
          status: data.status ?? 'fresh',
          isMajor: data.isMajor ?? false,
          source: data.source ?? 'manual',
          armorApplied: data.armorApplied ?? 0,
          armorFormula: data.armorFormula ?? '',
          armorRolls: data.armorRolls ?? [],
          createdAt: data.createdAt ?? Math.floor(Date.now() / 1000),
          createdLabel: data.createdLabel ?? '',
          history: data.history ?? []
        }),
        description: data.description ?? ''
      }
    };

    const newItem = await Item.create(itemData, { parent: actor });
    const key = await game.system.api.brpid.guessId(newItem);
    await newItem.update({
      'flags.brp.brpidFlag.id': key,
      'flags.brp.brpidFlag.lang': game.i18n.lang,
      'flags.brp.brpidFlag.priority': 0
    });
    return newItem;
  }

  static async applyDamage(actor, {
    locationId = 'total',
    rawDamage = 0,
    damageType = DEFAULT_DAMAGE_TYPE,
    appliesArmor = true,
    armorOverride = null,
    ballisticArmor = false,
    woundName = '',
    description = '',
    source = 'manual'
  } = {}) {
    const raw = positiveNumber(rawDamage, 0);
    if (raw < 1) return { wound: null, finalDamage: 0, rawDamage: raw, armorApplied: 0 };

    const useHPL = globalThis.game?.settings?.get?.('brp', 'useHPL') ?? false;
    const location = useHPL ? actor.items.get(locationId) : null;
    const armor = appliesArmor
      ? await this.rollArmorForLocation(actor, locationId, { armorOverride, ballistic: ballisticArmor })
      : { applied: 0, formula: '', rolls: [], ballistic: ballisticArmor };
    const finalDamage = Math.max(0, raw - armor.applied);

    if (finalDamage === 0) {
      await this.createDamageChatMessage(actor, {
        location,
        locationId,
        rawDamage: raw,
        finalDamage,
        armor,
        absorbed: true
      });
      return { wound: null, finalDamage, rawDamage: raw, armorApplied: armor.applied, armor };
    }

    const isMajor = useHPL ? false : await this.applyNonHplMajorWound(actor, finalDamage);
    const wound = await this.createWound(actor, {
      name: woundName || game.i18n.localize('BRP.wound'),
      locationId: useHPL ? locationId : 'total',
      damage: finalDamage,
      damageType,
      isMajor,
      description,
      source,
      armorApplied: armor.applied,
      armorFormula: armor.formula,
      armorRolls: armor.rolls
    });

    await this.createDamageChatMessage(actor, {
      location,
      locationId,
      rawDamage: raw,
      finalDamage,
      damageType,
      armor,
      wound,
      isMajor,
      absorbed: false
    });

    return { wound, finalDamage, rawDamage: raw, armorApplied: armor.applied, armor, isMajor };
  }

  static async rollArmorForLocation(actor, locationId, { armorOverride = null, ballistic = false } = {}) {
    if (armorOverride !== null && armorOverride !== undefined && armorOverride !== '') {
      const applied = positiveNumber(armorOverride, 0);
      return {
        applied,
        formula: String(applied),
        rolls: [{ itemId: '', itemName: game.i18n.localize('BRP.manual'), formula: String(applied), total: applied }],
        ballistic
      };
    }

    const useHPL = globalThis.game?.settings?.get?.('brp', 'useHPL') ?? false;
    const useRandomArmor = globalThis.game?.settings?.get?.('brp', 'useAVRand') ?? false;
    const fixedField = ballistic ? 'av2' : 'av1';
    const randomField = ballistic ? 'avr2' : 'avr1';
    const wornArmors = actor.items.filter(item => {
      if (item.type !== 'armour' || item.system.equipStatus !== 'worn') return false;
      return !useHPL || item.system.hitlocID === locationId;
    });

    let applied = 0;
    const formulaParts = [];
    const rolls = [];

    for (const armor of wornArmors) {
      const randomFormula = String(armor.system[randomField] ?? '').trim();
      if (useRandomArmor && randomFormula) {
        const rollResult = await this.rollArmorFormula(randomFormula);
        applied += rollResult.total;
        formulaParts.push(rollResult.formula);
        rolls.push({
          itemId: armor.id,
          itemName: armor.name,
          formula: rollResult.formula,
          total: rollResult.total,
          dice: rollResult.dice
        });
      } else {
        const fixed = positiveNumber(armor.system[fixedField], 0);
        if (fixed <= 0) continue;
        applied += fixed;
        formulaParts.push(String(fixed));
        rolls.push({
          itemId: armor.id,
          itemName: armor.name,
          formula: String(fixed),
          total: fixed,
          dice: ''
        });
      }
    }

    const projectedBonus = ballistic ? 0 : getProjectedArmourBonus(actor, useHPL ? locationId : 'all');
    if (projectedBonus !== 0) {
      applied += projectedBonus;
      formulaParts.push(String(projectedBonus));
      rolls.push({
        itemId: '',
        itemName: game.i18n.localize('BRP.effects'),
        formula: String(projectedBonus),
        total: projectedBonus,
        dice: ''
      });
    }

    return {
      applied,
      formula: formulaParts.join(' + '),
      rolls,
      ballistic
    };
  }

  static async rollArmorFormula(formula) {
    const normalizedFormula = String(formula ?? '').trim().replace(/^\+/, '');
    if (!normalizedFormula) return { formula: '', total: 0, dice: '' };

    if (!globalThis.Roll) {
      const total = positiveNumber(normalizedFormula, 0);
      return { formula: normalizedFormula, total, dice: String(total) };
    }

    const roll = new Roll(normalizedFormula);
    await roll.evaluate();
    const dice = roll.dice
      .flatMap(die => die.results.map(result => result.result))
      .join(',');
    return {
      formula: roll.formula,
      total: positiveNumber(roll.total, 0),
      dice
    };
  }

  static async applyNonHplMajorWound(actor, damage) {
    const threshold = positiveNumber(actor.system.health?.mjrwnd, 0);
    const daily = positiveNumber(actor.system.health?.daily, 0);
    const update = {};
    let isMajor = false;

    if (threshold > 0 && damage >= threshold) {
      isMajor = true;
      update['system.majorWnd'] = true;
      update['system.health.daily'] = 0;
    } else if (threshold > 0 && daily + damage >= threshold) {
      update['system.minorWnd'] = true;
      update['system.health.daily'] = 0;
    } else if (!actor.system.minorWnd && !actor.system.majorWnd) {
      update['system.health.daily'] = daily + damage;
    }

    if (Object.keys(update).length) await actor.update(update);
    return isMajor;
  }

  static async createDamageChatMessage(actor, data) {
    if (!globalThis.ChatMessage) return;

    const locationName = data.location?.system?.displayName
      ?? (data.locationId === 'total' ? game.i18n.localize('BRP.general') : data.locationId);
    const armorType = data.armor?.ballistic ? game.i18n.localize('BRP.ballistic') : game.i18n.localize('BRP.armour');
    const armorLabel = data.armor?.applied > 0
      ? `${armorType} ${data.armor.applied}${data.armor.formula ? ` (${data.armor.formula})` : ''}`
      : `${armorType} ${game.i18n.localize('BRP.none')}`;
    const major = data.isMajor
      ? `<p><strong>${game.i18n.localize('BRP.majorWound')}</strong>: ${game.i18n.localize('BRP.healthMajorWoundManual')}</p>`
      : '';
    const content = `
      <div class="brp chat-card">
        <h3>${data.absorbed ? game.i18n.localize('BRP.healthArmorAbsorbed') : game.i18n.localize('BRP.healthDamageApplied')}</h3>
        <p><strong>${game.i18n.localize('BRP.hitLoc')}</strong>: ${locationName}</p>
        <p><strong>${game.i18n.localize('BRP.damage')}</strong>: ${data.rawDamage} - ${armorLabel} = ${data.finalDamage}</p>
        ${major}
      </div>
    `;

    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content
    });
  }

  static computeAutoConditions(actor, { useHPL = globalThis.game?.settings?.get?.('brp', 'useHPL') ?? false } = {}) {
    const conditions = new Map();
    const addCondition = (id, label, icon, causes = [], options = {}) => {
      if (!options.active && causes.length === 0) return;
      conditions.set(id, {
        id,
        label,
        icon,
        active: true,
        auto: true,
        source: 'auto',
        causes,
        detailTab: 'health',
        tooltipText: this.conditionTooltip(label, causes)
      });
    };

    const system = actor.system ?? {};
    const activeWounds = actor.items.filter(item => item.type === 'wound' && this.isActiveWound(item));

    if (useHPL) {
      const locationStates = actor.items
        .filter(item => item.type === 'hit-location')
        .map(location => ({
          location,
          health: this.computeLocationHealth(actor, location),
          name: this.locationDisplayName(location),
          locType: String(location.system?.locType ?? '')
        }));
      const disabled = locationStates.filter(state => state.locType !== 'general' && state.health.disabled);
      const destroyed = locationStates.filter(state => {
        const max = Math.max(positiveNumber(state.health.max, 0), 1);
        return state.health.value <= -max || state.location.system?.severed;
      });
      const bleeding = [
        ...locationStates.filter(state => state.location.system?.bleeding).map(state => state.name),
        ...activeWounds
          .filter(wound => this.normalizeWoundSystem(wound).status === 'bleeding')
          .map(wound => this.locationDisplayName(this.getActorItem(actor, wound.system.locId)) || wound.name)
      ].filter(Boolean);
      const prone = disabled.filter(state => this.isLegLocation(state.location) || this.isLocationType(state.location, 'abdomen'));
      const unconscious = locationStates.filter(state => state.health.disabled && this.isLocationType(state.location, 'head'));
      const incapacitated = locationStates.filter(state => state.health.disabled && this.isLocationType(state.location, 'chest'));
      const injured = disabled.filter(state => this.isLocationType(state.location, 'limb') || this.isLocationType(state.location, 'abdomen'));

      addCondition('disabled-location', 'BRP.healthDisabledLocations', 'fas fa-circle-exclamation', disabled.map(state => state.name));
      addCondition('injured', 'BRP.injured', 'fas fa-face-head-bandage', injured.map(state => state.name));
      addCondition('prone', 'BRP.prone', 'fas fa-person-falling', prone.map(state => state.name));
      addCondition('unconscious', 'BRP.unconscious', 'fas fa-snooze', [
        ...unconscious.map(state => state.name),
        ...(system.unconscious ? [game.i18n.localize('BRP.manual')] : [])
      ]);
      addCondition('incapacitated', 'BRP.incapacitated', 'fas fa-face-dizzy', [
        ...incapacitated.map(state => state.name),
        ...(system.incapacitated ? [game.i18n.localize('BRP.manual')] : [])
      ]);
      addCondition('severed', 'BRP.severed', 'fas fa-bone-break', destroyed.map(state => state.name));
      addCondition('bleeding', 'BRP.bleeding', 'fas fa-droplet', [
        ...bleeding,
        ...(system.bleeding ? [game.i18n.localize('BRP.manual')] : [])
      ]);
      addCondition('dead', 'BRP.dead', 'fas fa-skull', [
        ...locationStates.filter(state => state.location.system?.dead).map(state => state.name),
        ...(system.dead ? [game.i18n.localize('BRP.manual')] : [])
      ]);
    } else {
      const majorWounds = activeWounds.filter(wound => this.normalizeWoundSystem(wound).isMajor);
      addCondition('major-wound', 'BRP.majorWound', 'fas fa-crutches', majorWounds.map(wound => wound.name));
      addCondition('bleeding', 'BRP.bleeding', 'fas fa-droplet', activeWounds
        .filter(wound => this.normalizeWoundSystem(wound).status === 'bleeding')
        .map(wound => wound.name));
    }

    return Array.from(conditions.values());
  }

  static conditionTooltip(label, causes = []) {
    const labelText = game.i18n.localize(label);
    return causes.length ? `${labelText}: ${causes.join(', ')}` : labelText;
  }

  static locationDisplayName(location) {
    if (!location) return '';
    return location.system?.displayName || location.name || location.id || location._id || '';
  }

  static getActorItem(actor, itemId) {
    if (!itemId) return null;
    return actor.items.get?.(itemId) ?? actor.items.find?.(item => item.id === itemId || item._id === itemId) ?? null;
  }

  static isLocationType(location, type) {
    return String(location.system?.locType ?? '').toLowerCase() === type;
  }

  static isLegLocation(location) {
    const locType = String(location.system?.locType ?? '').toLowerCase();
    const text = [
      locType,
      location.system?.displayName,
      location.name,
      location.flags?.brp?.brpidFlag?.id
    ].filter(Boolean).join(' ').toLowerCase();
    return text.includes('leg') || text.includes('pierna') || text.includes('jambe');
  }

  static computeActorHealth(actor) {
    const max = positiveNumber(actor.system?.health?.max, 0);
    const activeWounds = actor.items.filter(item => item.type === 'wound' && this.isActiveWound(item));
    const damage = activeWounds.reduce((total, wound) => total + this.getWoundDamageRemaining(wound), 0);
    const value = max - damage;
    const pct = max > 0 ? Math.max(0, Math.min(100, Math.round(value / max * 100))) : 0;

    return {
      value,
      max,
      pct,
      damage,
      activeWounds,
      activeWoundCount: activeWounds.length,
      majorWounds: activeWounds.filter(wound => this.normalizeWoundSystem(wound).isMajor).length,
      worstWound: activeWounds.reduce((worst, wound) => {
        if (!worst) return wound;
        return this.getWoundDamageRemaining(wound) > this.getWoundDamageRemaining(worst) ? wound : worst;
      }, null)
    };
  }

  static computeLocationHealth(actor, hitLocation) {
    const max = positiveNumber(hitLocation.system?.maxHP, 0);
    const activeWounds = actor.items.filter(item => {
      return item.type === 'wound' && item.system.locId === hitLocation.id && this.isActiveWound(item);
    });
    const damage = activeWounds.reduce((total, wound) => total + this.getWoundDamageRemaining(wound), 0);
    const value = max - damage;
    const pct = max > 0 ? Math.max(0, Math.min(100, Math.round(value / max * 100))) : 0;

    return {
      value,
      max,
      pct,
      damage,
      critical: value <= Math.ceil(max / 2),
      disabled: value <= 0,
      wounds: activeWounds
    };
  }
}
