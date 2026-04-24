import { addBRPIDSheetHeaderButton } from '../../brpid/brpid-button.mjs'
import { BRPActiveEffectSheet } from "../../sheets/brp-active-effect-sheet.mjs";
import { BRPItemSheetV2 } from "./base-item-sheet.mjs";
import { BRPHealth, BRP_WOUND_STATUSES } from '../../combat/health.mjs';

const DAMAGE_TYPES = ['piercing', 'slashing', 'blunt', 'burn', 'cold', 'energy', 'poison', 'disease', 'other'];
const METHOD_LABELS = {
  magic: 'BRP.magic',
  magical: 'BRP.magic',
  manual: 'BRP.manual',
  medicine: 'BRP.medicine',
  medical: 'BRP.firstAid',
  firstAid: 'BRP.firstAid',
  natural: 'BRP.naturalHealing'
};

export class BRPWoundSheet extends BRPItemSheetV2 {
  constructor(options = {}) {
    super(options)
  }

  static DEFAULT_OPTIONS = {
    classes: ['wound'],
    position: {
      width: 520,
      height: 480
    },
    form: {
      handler: BRPWoundSheet.myWoundHandler
    },
    actions: {
      itemToggle: this._onWoundToggle
    }
  }

  static PARTS = {
    header: { template: 'systems/brp/templates/item/item.header.hbs' },
    tabs: { template: 'systems/brp/templates/global/parts/tab-navigation.hbs' },
    details: {
      template: 'systems/brp/templates/item/wound.detail.hbs',
      scrollable: ['']
    },
    effects: {template: 'systems/brp/templates/item/item.active-effects.hbs'}
  }

  async _prepareContext(options) {
    let context = await super._prepareContext(options)
    context.effects = BRPActiveEffectSheet.getItemEffectsFromSheet(this.document)
    const changesActiveEffects = BRPActiveEffectSheet.getEffectChangesFromSheet(this.document)
    context.effectKeys = changesActiveEffects.effectKeys
    context.effectChanges = changesActiveEffects.effectChanges
    context.woundView = BRPWoundSheet.getWoundView(this.document)
    context.tabs = this._getTabs(options.parts);
    return context
  }

  static getWoundView(wound) {
    const normalized = BRPHealth.normalizeWoundSystem(wound);
    return {
      ...normalized,
      damageTypes: DAMAGE_TYPES.reduce((options, type) => {
        options[type] = game.i18n.localize(`BRP.${type}`);
        return options;
      }, {}),
      statuses: BRP_WOUND_STATUSES.reduce((options, status) => {
        options[status] = BRPWoundSheet.localizeStatus(status);
        return options;
      }, {}),
      damageTypeLabel: game.i18n.localize(`BRP.${normalized.damageType}`),
      statusLabel: BRPWoundSheet.localizeStatus(normalized.status),
      history: normalized.history
        .map(entry => BRPWoundSheet.historyEntryView(entry))
        .reverse()
    };
  }

  static localizeStatus(status) {
    return game.i18n.localize(`BRP.woundStatus${status.charAt(0).toUpperCase()}${status.slice(1)}`);
  }

  static historyEntryView(entry) {
    const method = BRPHealth.normalizeHealingMethod(entry.method);
    const amount = Number(entry.amount) || 0;
    const signedAmount = amount > 0 ? `+${amount}` : String(amount);
    const result = entry.result === undefined || entry.result === null ? '' : String(entry.result);
    return {
      ...entry,
      methodLabel: game.i18n.localize(METHOD_LABELS[method] ?? 'BRP.manual'),
      amountLabel: signedAmount,
      resultLabel: result === '' ? '' : game.i18n.localize(`BRP.resultLevel.${result}`),
      atLabel: entry.at ? new Date(entry.at * 1000).toLocaleString() : ''
    };
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'details':
      case 'effects':
        context.tab = context.tabs[partId];
        break;
    }
    return context;
  }

  _getTabs(parts) {
    const tabGroup = 'primary';
    //Default tab
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'details';
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        id: '',
        icon: '',
        label: 'BRP.',
      };
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs;
        case 'details':
          tab.id = 'details';
          tab.label += 'details';
          break;
        case 'effects':
            tab.id = 'effects';
            tab.label += 'effects';
            break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    //Only show GM tab if you are GM
    options.parts = ['header', 'tabs', 'details','effects'];
  }

  //Activate event listeners using the prepared sheet HTML
  _onRender(context, _options) {
    BRPActiveEffectSheet.activateListeners(this)
  }

  //--------------------HANDLER----------------------------------
  static async myWoundHandler(event, form, formData) {
    const formObject = formData.object;
    const expanded = foundry.utils.expandObject(formObject);
    const systemPatch = expanded.system ?? {};
    const update = {
      ...formObject,
      ...BRPHealth.buildWoundUpdate(this.document, systemPatch)
    };
    await this.document.update(update)
  }


  //-----------------------ACTIONS-----------------------------------
  static async _onWoundToggle(event, target) {
    if (target.dataset.property !== 'treated') return super._onItemToggle(event, target)
    event.preventDefault();
    const treated = !this.item.system.treated;
    await BRPHealth.updateWound(this.item, {
      treated,
      status: treated ? 'treated' : 'fresh',
      firstAidUsed: treated ? this.item.system.firstAidUsed : false
    })
  }

}

