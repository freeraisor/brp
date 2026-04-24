import { BRPUtilities } from '../apps/utilities.mjs';
import { BRPactorDetails } from "../apps/actorDetails.mjs";
import BRPDialog from '../setup/brp-dialog.mjs';
import { BRPHealth } from './health.mjs';

const DAMAGE_TYPES = ['piercing', 'slashing', 'blunt', 'burn', 'cold', 'energy', 'poison', 'disease', 'other'];

export class BRPDamage {

  // Add Damage
  static async addDamage(target, actor, token, damage = 0, options = {}) {
    const partic = await BRPactorDetails._getParticipantPriority(token, actor);
    if (!partic) return;

    const useHPL = game.settings.get('brp', 'useHPL');
    const locations = this.damageLocationOptions(partic, useHPL);
    const locationIds = Object.keys(locations);
    if (useHPL && locationIds.length === 0) {
      ui.notifications.warn(game.i18n.localize('BRP.healthNoHitLocations'));
      return;
    }

    const selectedLocationId = this.selectedDamageLocation(target?.dataset?.itemId, partic, locationIds, useHPL);
    const rawDamage = Number(damage) > 0 ? Number(damage) : '';
    const ballisticArmor = Boolean(options.ballisticArmor || target?.dataset?.armorMode === 'ballistic');
    const html = await foundry.applications.handlebars.renderTemplate(
      'systems/brp/templates/dialog/applyDamage.hbs',
      {
        showLocation: useHPL,
        locations,
        selectedLocationId,
        damageTypes: this.damageTypeOptions(),
        selectedDamageType: 'other',
        rawDamage,
        appliesArmor: true,
        ballisticArmor
      }
    );

    const usage = await BRPDialog.input({
      window: { title: game.i18n.localize('BRP.healthApplyDamage') + ": " + partic.name },
      content: html,
      ok: {
        label: game.i18n.localize('BRP.confirm')
      }
    });
    if (!usage) return;

    const rawDamageValue = Number(usage.rawDamage);
    if (!Number.isFinite(rawDamageValue) || rawDamageValue < 1) return;

    await BRPHealth.applyDamage(partic, {
      locationId: useHPL ? usage.locationId || selectedLocationId : 'total',
      rawDamage: rawDamageValue,
      damageType: usage.damageType || 'other',
      appliesArmor: this.isChecked(usage.appliesArmor),
      ballisticArmor: this.isChecked(usage.ballisticArmor) || ballisticArmor,
      woundName: usage.woundName ?? '',
      description: usage.description ?? '',
      source: 'health-tab'
    });
  }

  static damageLocationOptions(actor, useHPL) {
    if (!useHPL) return { total: game.i18n.localize('BRP.general') };

    return actor.items
      .filter(itm => itm.type === 'hit-location')
      .sort(function (a, b) {
        let x = a.system.lowRoll;
        let y = b.system.lowRoll;
        if (x < y) { return 1 };
        if (x > y) { return -1 };
        return 0;
      })
      .reduce((locations, loc) => {
        const lowRoll = loc.system.lowRoll;
        const highRoll = loc.system.highRoll;
        const range = lowRoll === highRoll ? lowRoll : `${lowRoll}-${highRoll}`;
        locations[loc._id] = `${loc.system.displayName || loc.name} (${range})`;
        return locations;
      }, {});
  }

  static selectedDamageLocation(candidateId, actor, locationIds, useHPL) {
    if (!useHPL) return 'total';
    if (candidateId && locationIds.includes(candidateId)) return candidateId;
    const generalLocation = actor.items.find?.(itm => itm.type === 'hit-location' && itm.system.locType === 'general');
    if (generalLocation?._id && locationIds.includes(generalLocation._id)) return generalLocation._id;
    return locationIds[0] ?? '';
  }

  static damageTypeOptions() {
    return DAMAGE_TYPES.reduce((options, type) => {
      options[type] = game.i18n.localize(`BRP.${type}`);
      return options;
    }, {});
  }

  static isChecked(value) {
    return value === true || value === 'true' || value === 'on' || value === '1' || value === 1;
  }

  static async allHeal(el, actor) {
    let confirmation = await BRPUtilities.confirmation('allHeal', 'chatMsg');
    if (confirmation) {
      await BRPHealth.healAllWounds(actor);
      for (let i of actor.items) {
        if (i.type === 'hit-location') {
          await i.update({
            'system.bleeding': false,
            'system.incapacitated': false,
            'system.injured': false,
            'system.unconscious': false
          })
        }
      }
    }
    return
  }

  //Treat a Wound - First Aid or Magic
  static async treatWound(event, actor, dataitem, type) {
    let itemID = ""
    if (dataitem === "itemId" || dataitem === "woundId") {
      itemID = await BRPUtilities.getDataset(event, dataitem)
    }

    let getType = false
    let getWnd = false
    let healTypes = {}
    let wndList = {}
    let selectedWoundName = ''

    if (!['medical', 'magic', 'medicine', 'manual'].includes(type)) {
      getType = true
      healTypes = Object.assign(healTypes, {
        'medical': game.i18n.localize('BRP.firstAid'),
        'medicine': game.i18n.localize('BRP.medicine'),
        'magical': game.i18n.localize('BRP.magical'),
        'manual': game.i18n.localize('BRP.other')
      })
    }
    if (!itemID) {
      let wounds = await actor.items.filter(itm => itm.type === 'wound' && BRPHealth.isActiveWound(itm))
      if (wounds.length === 0) { return }
      if (wounds.length === 1) {
        itemID = wounds[0]._id
        selectedWoundName = this.woundSelectionLabel(actor, wounds[0])
      } else {
        getWnd = true
        wounds.sort(function (a, b) {
          let x = BRPHealth.getWoundDamageRemaining(a);
          let y = BRPHealth.getWoundDamageRemaining(b);
          if (x < y) { return 1 };
          if (x > y) { return -1 };
          return 0;
        });
        for (let wound of wounds) {
          wndList = Object.assign(wndList, { [wound._id]: this.woundSelectionLabel(actor, wound) })
        }
      }
    } else {
      const selectedWound = actor.items.get(itemID);
      if (selectedWound) selectedWoundName = this.woundSelectionLabel(actor, selectedWound)
    }
    let healing = 0
    let usage = await BRPDamage.healingAmount(game.i18n.localize('BRP.treatWound'), getType, getWnd, wndList, healTypes, selectedWoundName)
    if (usage) {
      healing = Number(usage.treatWound);
      if (getType) { type = usage.healType };
      if (getWnd) { itemID = usage.woundId };
    } else if (!usage) return
    type = BRPHealth.normalizeHealingMethod(type)

    const item = actor.items.get(itemID);
    let hitLoc = actor.items.get(item.system.locId)
    if (BRPHealth.normalizeWoundSystem(item).firstAidUsed && type === 'medical') {
      ui.notifications.warn(game.i18n.localize('BRP.woundTreated'));
      return;
    }

    //If amount of healing is zero or invalid then simply ignore and stop
    if (!Number.isFinite(healing) || healing === 0) { return }



    await BRPHealth.healWound(item, {
      healing,
      method: type,
      result: usage.result ?? '',
      note: usage.note ?? '',
      source: 'health-tab'
    })
    if (game.settings.get('brp', 'useHPL') && hitLoc) {
      hitLoc.update({
        'system.bleeding': false,
        'system.incapacitated': false,
        'system.unconscious': false
      })
    }
    actor.render(true)
  }


  static async naturalHeal(event, actor) {
    let usage = await BRPDamage.healingAmount(game.i18n.localize('BRP.naturalHealing'), false, false)
    let healing = 0
    if (usage) {
      healing = Number(usage.treatWound);
    }
    //If amount of healing is zero or invalid then simply ignore and stop
    if (!Number.isFinite(healing) || healing === 0) { return }

    await BRPHealth.distributeNaturalHealing(actor, {
      healing,
      note: usage.note ?? '',
      source: 'natural-healing'
    });
    actor.render(true)
  }


  //Delete any wounds that have zero or less damage - they may not be visible on the character sheet
  static async cleanseWounds(actor) {
    for (let i of actor.items) {
      if (i.type === 'wound' && BRPHealth.getWoundDamageRemaining(i) < 1) {
        await BRPHealth.updateWound(i, { damageRemaining: 0, status: 'healed' });
      }
    }
  }

  // Form to get amount of damage or healing
  static async healingAmount(title, getType, getWnd, wndList = {}, healTypes = {}, selectedWoundName = '') {
    const html = await foundry.applications.handlebars.renderTemplate(
      'systems/brp/templates/dialog/treatWound.hbs',
      {
        getType,
        getWnd,
        wndList,
        healTypes,
        selectedWoundName,
        resultLevels: this.healingResultOptions()
      }
    )
    const dlg = await BRPDialog.input({
      window: {title: title},
      content: html,
      ok: {
        label: game.i18n.localize('BRP.confirm')
      }
    })
    return dlg
  }

  static woundSelectionLabel(actor, wound) {
    const normalized = BRPHealth.normalizeWoundSystem(wound);
    const location = actor.items.get(normalized.locId);
    const locationName = location?.system?.displayName || location?.name || game.i18n.localize('BRP.general');
    const damageRemaining = BRPHealth.getWoundDamageRemaining(wound);
    const treated = normalized.treated ? ` ${game.i18n.localize('BRP.treated')}` : '';
    return `${wound.name} - ${locationName} (${damageRemaining})${treated}`;
  }

  static healingResultOptions() {
    return {
      '': game.i18n.localize('BRP.manual'),
      '0': game.i18n.localize('BRP.resultLevel.0'),
      '1': game.i18n.localize('BRP.resultLevel.1'),
      '2': game.i18n.localize('BRP.resultLevel.2'),
      '3': game.i18n.localize('BRP.resultLevel.3'),
      '4': game.i18n.localize('BRP.resultLevel.4')
    };
  }

  static async resetDaily(event, actor) {
    actor.update({ 'system.health.daily': 0 })
    ui.notifications.warn(game.i18n.localize('BRP.resetDaily')+": "+actor.name)
  }

  //Get New Wound Dialog
  static async getWoundForm(getDam, getLoc, name, locs) {
    let title = game.i18n.localize('BRP.addWound') + ": " + name;
    const html = await foundry.applications.handlebars.renderTemplate(
      'systems/brp/templates/dialog/newWound.hbs',
      {
        getDam,
        getLoc,
        locs
      }
    )

    const dlg = await BRPDialog.input({
      window: {title: title},
      content: html,
      ok: {
        label: game.i18n.localize('BRP.confirm')
      }
    })
    return dlg
  }

  //Treat Wound by UUID
  static async applyHealing(woundUuid, successLevel) {
    let wound = await fromUuid(woundUuid)
    let actor = wound.parent
    let healing = 0
    let healingForm = ""
    switch (successLevel) {
      case 0:
        //Fumble - create a wound
        let locationId = "total"
        if (game.settings.get('brp', 'useHPL')) {
          locationId = await (actor.items.filter(itm => itm.type === 'hit-location').filter(nItm => nItm.system.locType === 'general'))[0]._id
        }
        //If GM create wound routine, otherwise call socket so GM creates wound
        if (game.user.isGM) {
          await BRPDamage.firstAidFumble([actor._id], [actor.type], locationId)
        } else {
          const availableGM = game.users.find(d => d.active && d.isGM)?.id
          if (availableGM) {
            game.socket.emit('system.brp', {
              type: 'firstAidFumble',
              to: availableGM,
              value: { actorId: actor._id, actorType: actor.type, locationId }
            })
          } else {
            ui.notifications.warn(game.i18n.localize('BRP.noAvailableGM'))
          }
        }
        healing = -1
        break
      case 2:
        //Success
        healingForm = "1D3"
        break
      case 3:
        //Special Success
        healingForm = "2D3"
        break
      case 4:
        //Critical Success
        healingForm = "1D3+3"
        break
    }
    if (healingForm != "") {
      let healRoll = new Roll(healingForm)
      await healRoll.evaluate()
      healing = Number(healRoll.total)
      if (game.modules.get('dice-so-nice')?.active) {
        game.dice3d.showForRoll(healRoll, game.user, true, null, false)  //Roll,user,sync,whispher,blind
      }
    }

    if (healing !== 0) {
      await BRPHealth.healWound(wound, {
        healing,
        method: 'medical',
        result: String(successLevel),
        formula: healingForm,
        source: 'card-healing'
      })
      actor.render(true)
    }

    return { value: healing, formula: healingForm }
  }

  //Create First Aid Fumble Wound
  static async firstAidFumble(actorId, actorType, locationId) {

    let actor = await BRPactorDetails._getParticipant(actorId, actorType)
    await BRPHealth.createWound(actor, {
      locationId,
      damage: 1,
      source: 'first-aid-fumble'
    })
  }

}

