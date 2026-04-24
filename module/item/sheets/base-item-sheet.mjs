import { BRPIDEditor } from "../../brpid/brpid-editor.mjs";

const { api, sheets } = foundry.applications;

export class BRPItemSheetV2 extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  constructor(options = {}) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    classes: ['brp', 'sheet', 'item'],
    position: {
      width: 520,
      height: 620
    },
    window: {
      resizable: true,
    },
    tag: "form",
    form: {
      submitOnChange: true,
      handler: BRPItemSheetV2._updateObject,
    },
    actions: {
      onEditImage: this._onEditImage,
      editBRPid: this._onEditBRPid,
      itemToggle: this._onItemToggle,
      inventoryBonusAdd: this._onInventoryBonusAdd,
      inventoryBonusDelete: this._onInventoryBonusDelete,
    }
  }

  //Add BRPID Editor Button as seperate icon on the Window header
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    //define button
    const sheetBRPID = this.item.flags?.brp?.brpidFlag;
    const noId = (typeof sheetBRPID === 'undefined' || typeof sheetBRPID.id === 'undefined' || sheetBRPID.id === '');
    //add button
    const label = game.i18n.localize("BRP.BRPIDFlag.id");
    const brpidEditor = `<button type="button" class="header-control icon fa-solid fa-fingerprint ${noId ? 'edit-brpid-warning' : 'edit-brpid-exisiting'}"
        data-action="editBRPid" data-tooltip="${label}" aria-label="${label}"></button>`;
    let el = this.window.close;
    while (el.previousElementSibling.localName === 'button') {
      el = el.previousElementSibling;
    }
    el.insertAdjacentHTML("beforebegin", brpidEditor);
    return frame;
  }

  async _prepareContext(options) {
    return {
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      item: this.item,
      flags: this.item.flags,
      system: this.item.system,
      hasOwner: this.item.isEmbedded === true,
      isGM: game.user.isGM,
      itemType: game.i18n.localize('TYPES.Item.' + this.item.type),
      bonusEditorRows: prepareBonusEditorRows(this.item.system.bonuses),
      bonusModeOptions: getBonusModeOptions(),
      bonusDifficultyOptions: getBonusDifficultyOptions(),
      headerDisplay: false,
      useWealth: game.settings.get('brp', 'useWealth'),
      wealthLabel: game.settings.get('brp', 'wealthLabel'),
    }
  }

  //------------ACTIONS-------------------

  // Change Image
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new foundry.applications.apps.FilePicker({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 39,
      left: this.position.left + 9,
    });
    return fp.browse();
  }

  // Handle editBRPid action
  static _onEditBRPid(event, target) {
    event.stopPropagation(); // Don't trigger other events
    if (event.detail > 1) return; // Ignore repeated clicks
    new BRPIDEditor({ document: this.document }, {}).render(true, { focus: true })
  }

  // Toggle something on the item
  static _onItemToggle(event, target) {
    event.preventDefault();
    let checkProp = {};
    const prop = target.dataset.property
    if (['armVar', 'armBal', 'HPL', 'minorOnly', 'basic','noXP', 'specialism', 'variable', 'group', 'chosen', 'combat', 'var', 'parry','burst', 'stun', 'choke',
      'entangle', 'fire', 'pierce', 'sonic', 'poison', 'explosive', 'emp', 'disease', 'spclDmg','cold','acid','constrict'].includes(prop) && !game.user.isGM) {
        return
    };


    if (['allegEnemy', 'allegApoth', 'allegAllied', 'improve', 'armVar', 'armBal', 'HPL', 'dead', 'severed', 'bleeding', 'mem', 'minorOnly', 'minor', 'oppimprove',
       'perLvl', 'noXP', 'specialism', 'variable', 'group', 'chosen', 'basic', 'combat','var', 'parry','burst', 'stun', 'choke', 'entangle', 'fire', 'pierce', 'sonic',
       'poison', 'explosive', 'emp', 'disease', 'spclDmg', 'cold','acid','constrict', 'treated'].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.item.system[prop] }
    } else { return }

    if (prop === 'var' & this.item.type === 'sorcery') {
      if (this.item.system.var) {
        checkProp = {
          'system.var': false,
          'system.currLvl': this.item.system.maxLvl,
          'system.memLvl': this.item.system.maxLvl,
        }
      }
    }
    this.item.update(checkProp)
  }

  static async _onInventoryBonusAdd(event) {
    event.preventDefault();
    const bonuses = normalizeBonusArray(this.item.system.bonuses);
    bonuses.push(createDefaultBonus());
    await this.item.update({ 'system.bonuses': bonuses });
  }

  static async _onInventoryBonusDelete(event, target) {
    event.preventDefault();
    const index = Number(target.dataset.bonusIndex);
    if (!Number.isInteger(index) || index < 0) return;

    const bonuses = normalizeBonusArray(this.item.system.bonuses);
    bonuses.splice(index, 1);
    await this.item.update({ 'system.bonuses': bonuses });
  }

  static async _updateObject(event, form, formData) {
    const updates = formData.object;
    const bonusRows = collectBonusEditorRows(updates);
    if (bonusRows) updates['system.bonuses'] = bonusRows;

    await this.document.update(updates);
  }
}

function getBonusModeOptions() {
  return {
    flat: game.i18n.localize('BRP.inventoryBonusModeFlat'),
    difficulty: game.i18n.localize('BRP.inventoryBonusModeDifficulty'),
    text: game.i18n.localize('BRP.inventoryBonusModeText')
  };
}

function getBonusDifficultyOptions() {
  return {
    '': game.i18n.localize('BRP.none'),
    easy: game.i18n.localize('BRP.easy'),
    difficult: game.i18n.localize('BRP.difficult'),
    impossible: game.i18n.localize('BRP.impossible')
  };
}

function prepareBonusEditorRows(bonuses) {
  return normalizeBonusArray(bonuses).map((bonus, index) => ({
    index,
    mode: normalizeBonusMode(bonus.mode ?? bonus.type ?? bonus.kind),
    skill: firstBonusString(bonus.skill, bonus.skillName, bonus.target, bonus.targetSkill, bonus.targetName),
    value: firstBonusString(bonus.value, bonus.amount, bonus.modifier, bonus.bonus, bonus.percent),
    difficulty: normalizeBonusDifficulty(bonus.difficulty ?? bonus.level ?? bonus.value ?? bonus.amount),
    text: firstBonusString(bonus.text, bonus.label, bonus.name, bonus.description, bonus.note),
    requiresCarried: Boolean(bonus.requiresCarried)
  }));
}

function collectBonusEditorRows(updates) {
  const prefix = 'system.bonusesEditor.';
  if (!('system.bonusesEditor' in updates) && !Object.keys(updates).some(key => key.startsWith(prefix))) return null;

  delete updates['system.bonusesEditor'];
  const rows = {};
  for (const [key, value] of Object.entries({ ...updates })) {
    if (!key.startsWith(prefix)) continue;
    delete updates[key];

    const [, index, field] = key.match(/^system\.bonusesEditor\.(\d+)\.([^.]+)$/) ?? [];
    if (!index || !field) continue;
    rows[index] ??= {};
    rows[index][field] = value;
  }

  return Object.keys(rows)
    .map(Number)
    .sort((left, right) => left - right)
    .map(index => createBonusFromEditorRow(rows[index]));
}

function createBonusFromEditorRow(row) {
  const mode = normalizeBonusMode(row.mode);
  const bonus = { mode };
  const skill = String(row.skill ?? '').trim();
  const value = String(row.value ?? '').trim();
  const difficulty = normalizeBonusDifficulty(row.difficulty);
  const text = String(row.text ?? '').trim();
  const requiresCarried = formValueToBoolean(row.requiresCarried);

  if (skill) bonus.skill = skill;
  if (mode === 'flat' && value) bonus.value = value;
  if (mode === 'difficulty' && difficulty) bonus.difficulty = difficulty;
  if (text) bonus.text = text;
  if (requiresCarried) bonus.requiresCarried = true;

  return bonus;
}

function normalizeBonusArray(bonuses) {
  if (!Array.isArray(bonuses)) return [];
  return bonuses
    .map(normalizeBonusEntry)
    .filter(Boolean);
}

function normalizeBonusEntry(bonus) {
  if (typeof bonus === 'string') return { mode: 'text', text: bonus };
  if (!bonus || typeof bonus !== 'object') return null;
  return { ...bonus };
}

function createDefaultBonus() {
  return {
    mode: 'flat',
    value: '',
    skill: '',
    text: '',
    requiresCarried: true
  };
}

function normalizeBonusMode(mode) {
  const normalized = String(mode ?? '').toLowerCase();
  if (normalized === 'flat' || normalized === 'difficulty' || normalized === 'text') return normalized;
  if (normalized === 'modifier' || normalized === 'mod') return 'flat';
  return 'text';
}

function normalizeBonusDifficulty(difficulty) {
  const normalized = String(difficulty ?? '').toLowerCase();
  if (!normalized || normalized === 'none' || normalized === 'normal' || normalized === 'average') return '';
  if (normalized === 'easy' || normalized === 'difficult' || normalized === 'impossible') return normalized;
  if (normalized === 'hard') return 'difficult';
  return '';
}

function firstBonusString(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function formValueToBoolean(value) {
  return value === true || value === 'true' || value === 'on' || value === '1' || value === 1;
}

