export function createSkillsPreparation(actor, improve) {
  actor.system.totalProf = 0;
  actor.system.totalPers = 0;
  actor.system.totalXP = 0;

  return {
    skills: [],
    skillsDev: [],
    skillsAlpha: [],
    improve
  };
}

export function prepareSkillItem(actor, item, state) {
  state.skillsDev.push(item);

  if (item.system.improve) {
    addImprove(state.improve, {
      item,
      typeLabel: game.i18n.localize('TYPES.Item.' + item.type),
      score: item.system.total - item.system.effects,
      opp: false
    });
  }

  prepareSkillTotals(actor, item);
  prepareSkillSortKeys(item);
  state.skillsAlpha.push(item);
  state.skills.push(item);
}

export function prepareSkillCategoryItem(item, state) {
  state.skills.push(skillCategoryRow(item, state.skills));
  state.skillsAlpha.push(skillCategoryRow(item, state.skillsAlpha));
}

export function prepareSkillLikeItem(actor, item, state, typeLabel) {
  prepareSkillTotals(actor, item);

  if (item.system.improve) {
    addImprove(state.improve, {
      item,
      typeLabel,
      score: item.system.total - item.system.effects,
      opp: false
    });
  }
}

export function finalizeSkillsPreparation(context, actor, state) {
  sortSkillsByCategory(state.skills);
  markCategorySpecialisations(state.skills);

  sortSkillsAlphabetically(state.skillsAlpha);
  markAlphaSpecialisations(state.skillsAlpha);

  context.skills = state.skills;
  context.skillsDev = state.skillsDev;
  context.skillsAlpha = state.skillsAlpha;
  context.skillsView = buildSkillsView(context, actor, state);
}

export const DEFAULT_SKILL_SORT_MODE = 'az';

export const SKILL_SORT_MODES = ['az', 'za', 'percentDesc', 'percentAsc'];

const SKILL_SORT_MODE_DETAILS = {
  az: { label: 'A-Z', icon: 'fas fa-arrow-down-a-z' },
  za: { label: 'Z-A', icon: 'fas fa-arrow-down-z-a' },
  percentDesc: { label: '%↓', icon: 'fas fa-arrow-down-9-1' },
  percentAsc: { label: '%↑', icon: 'fas fa-arrow-down-1-9' }
};

function prepareSkillTotals(actor, item) {
  item.system.grandTotal = item.system.total + (actor.system.skillcategory[item.system.category] ?? 0);
  actor.system.totalProf = actor.system.totalProf + item.system.profession;
  actor.system.totalPers = actor.system.totalPers + item.system.personal;
  actor.system.totalXP = actor.system.totalXP + item.system.xp;
}

function prepareSkillSortKeys(item) {
  let orderName = item.name.toLowerCase();
  if (item.system.specialism) {
    orderName = item.system.specName.toLowerCase();
  }
  item.system.orderName = orderName;
}

function skillCategoryRow(item, rows) {
  return {
    name: item.name,
    isType: true,
    count: rows.filter(row => row.isType).length,
    flags: { brp: { brpidFlag: { id: item.flags.brp.brpidFlag.id } } },
    system: { category: item.flags.brp.brpidFlag.id, total: item.system.total },
    _id: item._id
  };
}

function sortSkillsByCategory(skills) {
  skills.sort(function (a, b) {
    let x = a.name.toLowerCase();
    let y = b.name.toLowerCase();
    let r = a.isType ? a.isType : false;
    let s = b.isType ? b.isType : false;
    let p = a.system.category;
    let q = b.system.category;
    if (p < q) { return -1 };
    if (p > q) { return 1 };
    if (r < s) { return 1 };
    if (s < r) { return -1 };
    if (x < y) { return -1 };
    if (x > y) { return 1 };
    return 0;
  });
}

function markCategorySpecialisations(skills) {
  let previousSpec = "";
  for (let skill of skills) {
    skill.isSpecialisation = false;
    if (skill.system.specialism && (previousSpec != skill.system.mainName)) {
      previousSpec = skill.system.mainName;
      skill.isSpecialisation = true;
    }
  }
}

function sortSkillsAlphabetically(skillsAlpha) {
  skillsAlpha.sort(function (a, b) {
    let x = a.system.orderName;
    let y = b.system.orderName;
    let r = a.isType ? a.isType : false;
    let s = b.isType ? b.isType : false;
    let p = a.system.category;
    let q = b.system.category;
    if (p < q) { return -1 };
    if (p > q) { return 1 };
    if (r < s) { return 1 };
    if (s < r) { return -1 };
    if (x < y) { return -1 };
    if (x > y) { return 1 };
    return 0;
  });
}

function markAlphaSpecialisations(skillsAlpha) {
  let alphaPreviousSpec = "";
  for (let alphaskill of skillsAlpha) {
    alphaskill.isAlphaSpecialisation = false;
    if (!alphaskill.system.specialism) {
      alphaPreviousSpec = "";
    }
    if (alphaskill.system.specialism && (alphaPreviousSpec != alphaskill.system.mainName)) {
      alphaPreviousSpec = alphaskill.system.mainName;
      alphaskill.isAlphaSpecialisation = true;
    }
  }
}

function buildSkillsView(context, actor, state) {
  const skillState = getSkillSheetState(context, actor);
  const rowOptions = { expandedDescriptions: skillState.expandedDescriptions };
  const rows = state.skills.map(skill => skillRow(skill, 'isSpecialisation', rowOptions));
  const alphaRows = state.skillsAlpha.map(skill => skillRow(skill, 'isAlphaSpecialisation', rowOptions));

  return {
    characteristics: buildCharacteristicSkills(context.characteristics),
    play: {
      sortMode: skillState.sortMode,
      sortLabel: SKILL_SORT_MODE_DETAILS[skillState.sortMode]?.label ?? SKILL_SORT_MODE_DETAILS[DEFAULT_SKILL_SORT_MODE].label,
      sortIcon: SKILL_SORT_MODE_DETAILS[skillState.sortMode]?.icon ?? SKILL_SORT_MODE_DETAILS[DEFAULT_SKILL_SORT_MODE].icon,
      sortModes: SKILL_SORT_MODES,
      legacySortMode: context.system.skillOrder ? 'category' : 'alpha',
      groups: buildSkillGroups(state.skills, skillState),
      rows,
      alphaRows,
      activeRows: context.system.skillOrder ? rows : alphaRows
    },
    development: {
      columns: [
        { id: 'name', label: 'BRP.skill' },
        { id: 'base', label: 'BRP.base' },
        { id: 'personality', label: 'BRP.personalityShort', tooltip: 'BRP.personality' },
        { id: 'profession', label: 'BRP.profShort', tooltip: 'BRP.profession' },
        { id: 'culture', label: 'BRP.cultureAbbr', tooltip: 'BRP.culture' },
        { id: 'personal', label: 'BRP.personalShort', tooltip: 'BRP.psp' },
        { id: 'xp', label: 'BRP.xp', tooltip: 'BRP.experience' },
        { id: 'effects', label: 'BRP.effectsShort', tooltip: 'BRP.effects' },
        { id: 'category', label: 'BRP.categoryShort', tooltip: 'BRP.category' },
        { id: 'total', label: 'BRP.total' }
      ],
      rows: state.skillsDev.map(skillDevelopmentRow),
      totals: {
        profession: actor.system.totalProf,
        personal: actor.system.totalPers,
        xp: actor.system.totalXP
      }
    }
  };
}

function getSkillSheetState(context, actor) {
  const sheetFlags = actor.getFlag?.('brp', 'sheet') ?? context.flags?.brp?.sheet ?? {};
  const sortMode = SKILL_SORT_MODES.includes(sheetFlags.skillSortMode)
    ? sheetFlags.skillSortMode
    : DEFAULT_SKILL_SORT_MODE;

  return {
    sortMode,
    collapsedCategories: sheetFlags.collapsedSkillCategories ?? {},
    expandedDescriptions: sheetFlags.expandedSkillDescriptions ?? {},
    categoryOrder: Array.isArray(sheetFlags.skillCategoryOrder) ? sheetFlags.skillCategoryOrder : []
  };
}

function buildCharacteristicSkills(characteristics = []) {
  return characteristics.map(characteristic => {
    const isDamageBonus = characteristic.key === 'siz';

    return {
      id: 'characteristic-' + characteristic.key,
      characteristicKey: characteristic.key,
      title: characteristic.derivedLabel,
      value: characteristic.derivedValue,
      valueDisplay: characteristic.derivedDisplay,
      baseLabel: characteristic.shortLabel,
      baseValue: characteristic.total,
      formulaLabel: isDamageBonus ? characteristic.derivedLabel : characteristic.shortLabel + ' x 5',
      action: isDamageBonus ? '' : characteristic.actions.roll.action,
      rollable: !isDamageBonus,
      tooltip: isDamageBonus ? '' : 'BRP.charHint',
      todo: isDamageBonus
    };
  });
}

function skillDevelopmentRow(skill) {
  return {
    ...skillRow(skill, 'isSpecialisation'),
    itemType: skill.type,
    cells: [
      developmentInputCell('base', skill.system.base),
      developmentInputCell('personality', skill.system.personality, {
        className: skill.system.prsnlty ? 'skill-prsnlty' : ''
      }),
      developmentInputCell('profession', skill.system.profession, {
        className: skill.system.occupation ? 'skill-occ' : ''
      }),
      developmentInputCell('culture', skill.system.culture, {
        className: skill.system.cultural ? 'skill-prsnlty' : ''
      }),
      developmentInputCell('personal', skill.system.personal, {
        className: 'skill-pers'
      }),
      developmentInputCell('xp', skill.system.xp, {
        className: skill.system.improve ? 'skillExp' : ''
      }),
      developmentReadCell('effects', skill.system.effects),
      developmentReadCell('category', skill.system.catBonus),
      developmentReadCell('total', skill.system.grandTotal, {
        rollable: true,
        action: 'skillRoll',
        tooltip: 'BRP.skillHint',
        className: 'lightgrey'
      })
    ]
  };
}

function developmentInputCell(id, value, { className = '' } = {}) {
  return {
    id,
    field: id,
    value,
    editable: true,
    className
  };
}

function developmentReadCell(id, value, { rollable = false, action = null, tooltip = null, className = '' } = {}) {
  return {
    id,
    value,
    editable: false,
    rollable,
    action,
    tooltip,
    className
  };
}

function buildSkillGroups(skills, state) {
  const categories = skills.filter(skill => skill.isType);
  const rowOptions = { expandedDescriptions: state.expandedDescriptions };
  const rows = skills
    .filter(skill => !skill.isType)
    .map(skill => skillRow(skill, 'isSpecialisation', rowOptions));

  const groups = categories.map((category, index) => {
    const categoryId = category.system.category;
    const groupRows = sortSkillRows(
      rows.filter(row => row.categoryId === categoryId),
      state.sortMode
    );

    return {
      id: category._id,
      categoryId,
      title: category.name,
      label: category.name,
      count: groupRows.length,
      collapsed: Boolean(state.collapsedCategories[categoryId] ?? state.collapsedCategories[category._id]),
      rows: groupRows,
      order: getCategoryOrder(categoryId, category._id, index, state.categoryOrder),
      total: category.system.total
    };
  });

  groups.sort((left, right) => left.order - right.order);
  return groups;
}

function getCategoryOrder(categoryId, itemId, fallback, categoryOrder) {
  const categoryIndex = categoryOrder.indexOf(categoryId);
  if (categoryIndex !== -1) return categoryIndex;

  const itemIndex = categoryOrder.indexOf(itemId);
  if (itemIndex !== -1) return itemIndex;

  return fallback;
}

function sortSkillRows(rows, mode) {
  const sortedRows = [...rows];

  sortedRows.sort((left, right) => {
    if (mode === 'percentDesc') return compareSkillPercent(right, left) || compareSkillName(left, right);
    if (mode === 'percentAsc') return compareSkillPercent(left, right) || compareSkillName(left, right);
    if (mode === 'za') return compareSkillName(right, left);
    return compareSkillName(left, right);
  });

  return sortedRows;
}

function compareSkillName(left, right) {
  const leftMain = (left.mainName || left.title || '').toLowerCase();
  const rightMain = (right.mainName || right.title || '').toLowerCase();
  const mainCompare = leftMain.localeCompare(rightMain);
  if (mainCompare !== 0) return mainCompare;

  const leftSpecialism = (left.specialismName || '').toLowerCase();
  const rightSpecialism = (right.specialismName || '').toLowerCase();
  return leftSpecialism.localeCompare(rightSpecialism);
}

function compareSkillPercent(left, right) {
  return Number(left.grandTotal ?? 0) - Number(right.grandTotal ?? 0);
}

function skillRow(skill, specialisationFlag, { expandedDescriptions = {} } = {}) {
  if (skill.isType) {
    return {
      id: skill._id,
      type: 'category',
      title: skill.name,
      categoryId: skill.system.category,
      count: skill.count ?? 0,
      total: skill.system.total,
      item: skill
    };
  }

  const descriptionText = stripHtml(skill.system.description);

  return {
    id: skill._id,
    type: 'skill',
    title: skill.name,
    displayName: skill.system.specialism ? skill.system.specName : skill.name,
    mainName: skill.system.mainName,
    specialismName: skill.system.specName,
    categoryId: skill.system.category,
    categoryBonus: skill.system.catBonus,
    base: skill.system.base,
    personality: skill.system.personality,
    profession: skill.system.profession,
    culture: skill.system.culture,
    personal: skill.system.personal,
    xp: skill.system.xp,
    effects: skill.system.effects,
    total: skill.system.total,
    grandTotal: skill.system.grandTotal,
    canImprove: !skill.system.noXP,
    isImproving: skill.system.improve,
    isFavorite: Boolean(skill.flags?.brp?.sheet?.favorite),
    isSpecialism: skill.system.specialism,
    startsSpecialisation: skill[specialisationFlag] ?? false,
    description: skill.system.description ?? '',
    descriptionText,
    descriptionOpen: Boolean(expandedDescriptions[skill._id]),
    searchText: [
      skill.name,
      skill.system.mainName,
      skill.system.specName
    ].filter(Boolean).join(' '),
    rollable: true,
    item: skill
  };
}

function stripHtml(value = '') {
  return String(value).replace(/(<([^>]+)>)/g, '').trim();
}

function addImprove(improve, { item, typeLabel, score, opp }) {
  improve.push({
    _id: item._id,
    name: item.name,
    typeLabel,
    score,
    opp
  });
}
