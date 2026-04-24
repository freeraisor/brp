import { BRPID } from '../brpid/brpid.mjs';
import { applyDefaultItemImage, prepareItemResourceLabels } from './item-defaults.mjs';
import { rollItemDocument } from './item-rolls.mjs';

export class BRPItem extends Item {
  constructor(data, context) {
    applyDefaultItemImage(data);
    super(data, context)
  }

  prepareData() {
    super.prepareData();
  }

  prepareDerivedData() {
    prepareItemResourceLabels(this.system);
  }

  getRollData() {
    if (!this.actor) return null;
    const rollData = this.actor.getRollData();
    rollData.item = foundry.utils.deepClone(this.system);
    return rollData;
  }

  async roll() {
    await rollItemDocument(this);
  }

  static async createDocuments(data = [], context = {}) {
    if (context.keepEmbeddedIds === undefined) context.keepEmbeddedIds = false;
    const created = await super.createDocuments(data, context);

    for (const item of created) {
      if (!game.settings.get('brp', "itemBRPID")) continue;

      const tempID = await BRPID.guessId(item)
      if (!tempID) continue;

      await item.update({ 'flags.brp.brpidFlag.id': tempID })
      const html = $(item.sheet.element).find('header.window-header a.header-button.edit-brpid-warning,header.window-header a.header-button.edit-brpid-exisiting')
      if (html.length) {
        html.css({
          color: 'orange'
        })
      }
      item.render()
    }
    return created
  }

  static async createDialog(data = {}, createOptions = {}, { types, ...options } = {}) {
    const invalid = ["wound"];
    if (!types) types = this.TYPES.filter(type => !invalid.includes(type));
    else types = types.filter(type => !invalid.includes(type));
    return super.createDialog(data, createOptions, { types, ...options });
  }

  async _preDelete(options, user) {
    if (this.parent) {
      const ids = this.parent.effects.filter(effect => effect.origin === this.uuid).map(effect => effect.id)
      if (ids.length) {
        await this.parent.deleteEmbeddedDocuments('ActiveEffect', ids)
      }
    }
    return super._preDelete(options, user);
  }

  static async _onCreateOperation(documents, operation, user) {
    super._onCreateOperation(documents, operation, user)
    if (!(operation.parent instanceof ActorDelta) || !CONFIG.ActiveEffect.legacyTransferral || !user.isSelf) return;
    const cls = getDocumentClass("ActiveEffect");

    const toCreate = [];
    for (const item of documents) {
      for (const effect of item.effects) {
        if (!effect.transfer) continue;
        const effectData = effect.toJSON();
        effectData.origin = item.uuid;
        toCreate.push(effectData);
      }
    }

    operation = { ...operation };
    delete operation.data;
    operation.renderSheet = false;
    cls.createDocuments(toCreate, operation);
  }
}
