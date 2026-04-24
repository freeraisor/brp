import { BRPCheck } from "../apps/check.mjs";
import { isCtrlKey } from '../apps/helper.mjs';

export async function rollItemDocument(item, triggerEvent = globalThis.event) {
  const actor = item.actor;
  if (!actor) {
    item.sheet.render(true);
    return;
  }

  const rollContext = buildItemRollContext(item, actor, triggerEvent);
  if (!rollContext) {
    item.sheet.render(true);
    return;
  }

  await BRPCheck._trigger({
    ...rollContext,
    actor,
  });
}

function buildItemRollContext(item, actor, triggerEvent) {
  const modifierState = getModifierState(triggerEvent);
  const itemId = item._id;

  switch (item.type) {
    case 'skill':
    case 'magic':
    case 'psychic':
      return {
        rollType: 'SK',
        cardType: getStandardCardType(modifierState),
        skillId: itemId,
        shiftKey: modifierState.shiftKey,
        opp: 'false'
      };
    case 'allegiance':
      return {
        rollType: 'AL',
        cardType: 'NO',
        skillId: itemId,
        shiftKey: modifierState.shiftKey,
        opp: 'false'
      };
    case 'passion':
      return {
        rollType: 'PA',
        cardType: modifierState.ctrlKey ? 'OP' : 'NO',
        skillId: itemId,
        shiftKey: modifierState.shiftKey,
        opp: 'false'
      };
    case 'persTrait':
      return {
        rollType: 'PT',
        cardType: modifierState.ctrlKey ? 'OP' : 'NO',
        skillId: itemId,
        shiftKey: modifierState.shiftKey,
        opp: modifierState.altKey ? 'true' : 'false'
      };
    case 'weapon':
      return {
        rollType: 'CM',
        cardType: 'NO',
        skillId: actor.items.get(itemId)?.system?.sourceID ?? '',
        itemId,
        shiftKey: modifierState.shiftKey,
        opp: 'false'
      };
    case 'reputation':
      return {
        rollType: 'PA',
        cardType: getStandardCardType(modifierState),
        skillId: itemId,
        shiftKey: modifierState.shiftKey,
        opp: 'false'
      };
    default:
      return null;
  }
}

function getModifierState(triggerEvent) {
  let shiftKey = Boolean(triggerEvent?.shiftKey);
  if (game.settings.get('brp', 'switchShift')) {
    shiftKey = !shiftKey;
  }

  return {
    altKey: Boolean(triggerEvent?.altKey),
    ctrlKey: isCtrlKey(triggerEvent ?? false),
    shiftKey
  };
}

function getStandardCardType({ altKey, ctrlKey }) {
  if (altKey && ctrlKey) return 'CO';
  if (altKey) return 'GR';
  if (ctrlKey) return 'OP';
  return 'NO';
}
