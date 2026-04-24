import { prepareSkillLikeItem } from './skills.mjs';
import { createListCell } from '../view-model/list-column.mjs';
import { createListRow } from '../view-model/list-row.mjs';

export function createPowersPreparation() {
  return {
    magics: [],
    mutations: [],
    psychics: [],
    sorceries: [],
    superpowers: [],
    failings: []
  };
}

export function prepareMagicItem(actor, item, skillState, context, state) {
  prepareSkillLikeItem(actor, item, skillState, context.magicLabel);
  state.magics.push(item);
}

export function prepareMutationItem(item, state) {
  state.mutations.push(item);
}

export function preparePsychicItem(actor, item, skillState, context, state) {
  prepareSkillLikeItem(actor, item, skillState, context.psychicLabel);
  state.psychics.push(item);
}

export function prepareSorceryItem(item, state) {
  item.system.ppCost = item.system.currLvl * item.system.pppl
  if (item.system.mem) {
    item.system.ppCost = item.system.memLvl * item.system.pppl
  }
  state.sorceries.push(item);
}

export function prepareSuperItem(item, state) {
  state.superpowers.push(item);
}

export function prepareFailingItem(item, state) {
  state.failings.push(item);
}

export function finalizePowersPreparation(context, state) {
  context.magics = sortByName(state.magics);
  context.mutations = sortByName(state.mutations);
  context.psychics = sortByName(state.psychics);
  context.sorceries = sortByName(state.sorceries);
  context.superpowers = sortByName(state.superpowers);
  context.failings = sortByName(state.failings);
  context.powersView = buildPowersView(context);
}

function buildPowersView(context) {
  const powerLabel = context.system?.power?.labelAbbr ?? '';
  const magicRows = context.magics.map(item => powerRow(item, {
    actions: [improveAction(item), memorizedAction(item)],
    summaryCells: magicCells(item, powerLabel)
  }));
  const mutationRows = context.mutations.map(item => powerRow(item, {
    summaryCells: mutationCells(item)
  }));
  const psychicRows = context.psychics.map(item => powerRow(item, {
    actions: [improveAction(item)],
    summaryCells: psychicCells(item, powerLabel)
  }));
  const sorceryRows = context.sorceries.map(item => powerRow(item, {
    actions: [memorizedAction(item)],
    summaryCells: sorceryCells(item, powerLabel)
  }));
  const superRows = context.superpowers.map(item => powerRow(item, {
    summaryCells: superCells(item, powerLabel)
  }));
  const failingRows = context.failings.map(item => powerRow(item, {
    displayTitle: item.system.shortDesc ? item.system.shortDesc : item.name
  }));

  return {
    magic: createPowerSection({
      label: context.magicLabel,
      type: 'magic',
      rows: magicRows
    }),
    mutations: createPowerSection({
      label: context.mutationLabel,
      type: 'mutation',
      rows: mutationRows
    }),
    psychics: createPowerSection({
      label: context.psychicLabel,
      type: 'psychic',
      rows: psychicRows
    }),
    sorcery: createPowerSection({
      label: context.sorceryLabel,
      type: 'sorcery',
      rows: sorceryRows
    }),
    super: {
      label: context.superLabel,
      createAction: createDocAction('super'),
      addTooltip: 'BRP.addItem',
      failingLabel: 'BRP.failing',
      failingTypeLabel: 'TYPES.Item.failing',
      failingCreateAction: createDocAction('failing'),
      powers: superRows,
      failings: failingRows
    }
  };
}

function createPowerSection({ label, type, rows }) {
  return {
    label,
    createAction: createDocAction(type),
    addTooltip: 'BRP.addItem',
    rows
  };
}

function createDocAction(type) {
  return { action: 'createDoc', documentClass: 'Item', type };
}

function powerRow(item, { actions = [], summaryCells = [], displayTitle = item.name } = {}) {
  return createListRow({
    id: item._id,
    title: item.name,
    displayTitle,
    name: item.name,
    type: item.type,
    item,
    actions,
    summaryCells,
    flags: {
      hasEffects: item.system.hasEffects
    },
    improve: item.system.improve,
    total: item.system.total,
    grandTotal: item.system.grandTotal,
    range: item.system.range,
    duration: item.system.duration,
    pppl: item.system.pppl,
    damage: item.system.damage,
    damageRollable: item.system.damage != null && item.system.damage !== "",
    mem: item.system.mem,
    level: item.system.level,
    currentLevel: item.system.currLvl,
    memorizedLevel: item.system.memLvl,
    variableLevel: item.system.var,
    levelLabel: item.system.var ? item.system.currLvl + "(" + item.system.memLvl + ")" : item.system.currLvl,
    powerPoints: item.system.ppCost,
    powerCost: item.system.powCost,
    impact: item.system.impact,
    impactLabel: item.system.impact === 'adv' ? 'BRP.adv' : 'BRP.dis',
    minor: item.system.minor,
    scaleLabel: item.system.minor ? 'BRP.minor' : 'BRP.major',
    shortDescription: item.system.shortDesc,
    displayName: item.system.shortDesc ? item.system.shortDesc : item.name,
    development: {
      base: item.system.base,
      personality: item.system.personality,
      profession: item.system.profession,
      culture: item.system.culture,
      personal: item.system.personal,
      xp: item.system.xp,
      effects: item.system.effects,
      categoryBonus: item.system.catBonus,
      personalityHighlight: item.system.prsnlty,
      professionHighlight: item.system.occupation,
      cultureHighlight: item.system.cultural
    },
    hasEffects: item.system.hasEffects
  });
}

function magicCells(item, powerLabel) {
  return [
    percentCell('BRP.total', item.system.grandTotal, 'skillRoll', 'BRP.skillHint'),
    textCell('BRP.range', item.system.range),
    textCell('BRP.duration', item.system.duration),
    textCell(null, item.system.pppl, { label: powerLabel }),
    impactCell(item.system.damage, item.system.damage != null && item.system.damage !== "")
  ];
}

function mutationCells(item) {
  return [
    createListCell({
      labelKey: 'BRP.type',
      valueKey: item.system.impact === 'adv' ? 'BRP.adv' : 'BRP.dis'
    }),
    createListCell({
      labelKey: 'BRP.StatsStr',
      valueKey: item.system.minor ? 'BRP.minor' : 'BRP.major'
    })
  ];
}

function psychicCells(item, powerLabel) {
  return [
    textCell('BRP.range', item.system.range, { tooltipKey: 'BRP.rangePsyHint' }),
    textCell('BRP.duration', item.system.duration),
    textCell(null, item.system.pppl, { label: powerLabel }),
    impactCell(item.system.damage, item.system.damage != null && item.system.damage !== ""),
    percentCell('BRP.total', item.system.grandTotal, 'skillRoll', 'BRP.skillHint')
  ];
}

function sorceryCells(item, powerLabel) {
  return [
    textCell('BRP.range', item.system.range),
    textCell('BRP.level', item.system.var ? item.system.currLvl + "(" + item.system.memLvl + ")" : item.system.currLvl, { tooltipKey: 'BRP.spellLvlHint' }),
    textCell(null, item.system.ppCost, { label: powerLabel }),
    textCell('BRP.powCost', item.system.powCost, { tooltipKey: 'BRP.spellCost' })
  ];
}

function superCells(item, powerLabel) {
  return [
    textCell('BRP.range', item.system.range, { tooltipKey: 'BRP.rangePsyHint' }),
    textCell('BRP.duration', item.system.duration),
    textCell(null, item.system.pppl, { label: powerLabel }),
    textCell('BRP.level', item.system.level)
  ];
}

function textCell(labelKey, value, { label = null, tooltipKey = null } = {}) {
  return createListCell({
    label,
    labelKey,
    tooltipKey,
    value: displayValue(value)
  });
}

function percentCell(labelKey, value, action, tooltipKey) {
  return createListCell({
    labelKey,
    tooltipKey,
    value: value != null && value !== '' ? value + '%' : '',
    rollable: true,
    action
  });
}

function impactCell(value, rollable) {
  return createListCell({
    labelKey: 'BRP.impact',
    tooltipKey: 'BRP.impactHint',
    value: displayValue(value),
    rollable,
    action: rollable ? 'impactRoll' : null
  });
}

function improveAction(item) {
  return toggleAction({
    property: 'improve',
    active: item.system.improve,
    tooltipKey: 'BRP.improve',
    activeIcon: 'fa-regular fa-square-check',
    inactiveIcon: 'fa-regular fa-square'
  });
}

function memorizedAction(item) {
  return toggleAction({
    property: 'mem',
    active: item.system.mem,
    tooltipKey: 'BRP.memHint',
    activeIcon: 'fa-solid fa-book-open-cover',
    inactiveIcon: 'fa-light fa-book-open-cover'
  });
}

function toggleAction({ property, active, tooltipKey, activeIcon, inactiveIcon }) {
  return {
    action: 'itemToggle',
    property,
    active,
    tooltipKey,
    activeIcon,
    inactiveIcon
  };
}

function displayValue(value) {
  return value == null ? '' : value;
}

function sortByName(items) {
  return items.sort(function (a, b) {return a.name.localeCompare(b.name)});
}
