export const DEFAULT_WEAPON_SORT_MODE = 'type';
export const WEAPON_SORT_MODES = ['type', 'name', 'percent', 'custom'];

const DODGE_SKILL_BRPID = 'i.skill.dodge';

const WEAPON_SORT_MODE_DETAILS = {
  type: { label: 'BRP.type', icon: 'fas fa-layer-group' },
  name: { label: 'BRP.name', icon: 'fas fa-arrow-down-a-z' },
  percent: { label: 'BRP.chance', icon: 'fas fa-arrow-down-9-1' },
  custom: { label: 'BRP.customise', icon: 'fas fa-grip-lines' }
};

const COMBAT_KIND_BY_WEAPON_TYPE = {
  artillery: 'ranged',
  energy: 'ranged',
  explosive: 'thrown',
  firearm: 'ranged',
  heavy: 'ranged',
  melee: 'melee',
  missile: 'bow',
  shield: 'shield'
};

const COMBAT_KIND_ORDER = {
  ranged: 0,
  bow: 1,
  thrown: 2,
  melee: 3,
  shield: 4
};

export function createCombatPreparation() {
  return {
    weapons: []
  };
}

export function prepareWeaponItem(actor, item, skills, state) {
  item.system.rangeName = getRangeName(item);
  item.system.dmgName = getDamageName(item);
  item.system.damageHint = game.i18n.localize("BRP." + item.system.special);

  prepareDamageBonusName(item);
  prepareWeaponSkill(actor, item, skills);

  item.system.equippedName = game.i18n.localize('BRP.' + item.system.equipStatus);
  state.weapons.push(item);
}

export function finalizeCombatPreparation(context, state) {
  context.weapons = state.weapons.sort(function (a, b) {return a.name.localeCompare(b.name)});
  context.combatView = buildCombatView(context);
}

function getRangeName(item) {
  if (item.system.range3 != "") {
    return item.system.range1 + "/" + item.system.range2 + "/" + item.system.range3;
  } else if (item.system.range2 != "") {
    return item.system.range1 + "/" + item.system.range2;
  } else {
    return item.system.range1;
  }
}

function getDamageName(item) {
  if (item.system.specialDmg) {
    return game.i18n.localize('BRP.special');
  } else if (item.system.dmg3 != "") {
    return item.system.dmg1 + "/" + item.system.dmg2 + "/" + item.system.dmg3;
  } else if (item.system.dmg2 != "") {
    return item.system.dmg1 + "/" + item.system.dmg2;
  } else {
    return item.system.dmg1;
  }
}

function prepareDamageBonusName(item) {
  item.system.dbName = "-";
  item.system.dbNameHint = game.i18n.localize("BRP.none");
  if (item.system.db === "half") {
    item.system.dbName = "½";
    item.system.dbNameHint = game.i18n.localize("BRP.half");
  } else if (item.system.db === "full") {
    item.system.dbName = game.i18n.localize('BRP.dmgBonusInitials');
    item.system.dbNameHint = game.i18n.localize("BRP.full");
  } else if (item.system.db === "dbl") {
    item.system.dbName = "x2";
    item.system.dbNameHint = game.i18n.localize("BRP.double");
  } else if (item.system.db === "str") {
    item.system.dbName = game.i18n.localize("BRP.StatsStrAbbr");
    item.system.dbNameHint = game.i18n.localize("BRP.strDB");
  } else if (item.system.db === "oneH") {
    item.system.dbName = "1H";
    item.system.dbNameHint = game.i18n.localize("BRP.oneH");
  }
}

function prepareWeaponSkill(actor, item, skills) {
  let skill1Select = "";
  let skill2Select = "";
  skill1Select = skills.filter(nitm => nitm.flags.brp.brpidFlag.id === item.system.skill1)[0];
  skill2Select = skills.filter(nitm => nitm.flags.brp.brpidFlag.id === item.system.skill2)[0];
  if (skill1Select && skill2Select) {
    if (item.system.skill2 === 'none') {
      if (skill1Select) {
        item.system.sourceID = skill1Select._id;
      }
    } else {
      if (skill2Select.system.total >= skill1Select.system.total) {
        item.system.sourceID = skill2Select._id;
      } else {
        item.system.sourceID = skill1Select._id;
      }
    }
  } else if (skill1Select) {
    item.system.sourceID = skill1Select._id;
  } else if (skill2Select) {
    item.system.sourceID = skill2Select._id;
  }

  if (item.system.sourceID) {
    const sourceSkill = actor.items.get(item.system.sourceID);
    item.system.skillScore = sourceSkill.system.total + actor.system.skillcategory[sourceSkill.system.category];
    item.system.skillName = sourceSkill.name;
  } else {
    item.system.skillScore = 0;
    item.system.skillName = game.i18n.localize('BRP.noWpnSkill');
  }
}

function buildCombatView(context) {
  const sheetState = getWeaponSheetState(context);
  const expandedWeapons = context.actor?.getFlag('brp', 'sheet')?.combat?.expandedWeapons ?? {};
  const weaponRows = context.weapons
    .filter(weapon => weapon.system.equipStatus === 'carried')
    .map(weapon => {
      const row = buildCombatWeaponRow(weapon);
      row.detailsOpen = Boolean(expandedWeapons[row.id]);
      return row;
    });

  return {
    defense: buildDefenseView(context, weaponRows),
    weapons: sortWeaponRows(weaponRows, sheetState.sortMode),
    sort: {
      mode: sheetState.sortMode,
      label: WEAPON_SORT_MODE_DETAILS[sheetState.sortMode]?.label ?? WEAPON_SORT_MODE_DETAILS[DEFAULT_WEAPON_SORT_MODE].label,
      icon: WEAPON_SORT_MODE_DETAILS[sheetState.sortMode]?.icon ?? WEAPON_SORT_MODE_DETAILS[DEFAULT_WEAPON_SORT_MODE].icon,
      modes: WEAPON_SORT_MODES,
      options: WEAPON_SORT_MODES.map(mode => ({
        mode,
        label: WEAPON_SORT_MODE_DETAILS[mode].label,
        icon: WEAPON_SORT_MODE_DETAILS[mode].icon,
        active: mode === sheetState.sortMode
      }))
    }
  };
}

function buildDefenseView(context, weaponRows) {
  return [
    dodgeDefenseCard(context),
    weaponDefenseCard({
      id: 'parry',
      label: game.i18n.localize('BRP.parry'),
      emptySubtitle: game.i18n.localize('BRP.combatDefenseNoParry'),
      icon: 'fas fa-swords',
      candidates: weaponRows.filter(weapon => Boolean(weapon.item.system.parry) && weapon.item.system.weaponType !== 'shield')
    }),
    weaponDefenseCard({
      id: 'shield',
      label: game.i18n.localize('BRP.shield'),
      emptySubtitle: game.i18n.localize('BRP.combatDefenseNoShield'),
      icon: 'fas fa-shield-halved',
      candidates: weaponRows.filter(weapon => weapon.item.system.weaponType === 'shield')
    })
  ];
}

function dodgeDefenseCard(context) {
  const skill = findSkillByBRPID(context.skills, DODGE_SKILL_BRPID);
  const percent = skill ? skillPercent(context.actor, skill) : 0;

  return {
    id: 'dodge',
    label: game.i18n.localize('BRP.dodge'),
    subtitle: skill?.name ?? game.i18n.localize('BRP.combatDefenseNoDodge'),
    icon: 'fas fa-person-running',
    available: Boolean(skill),
    percent,
    skillId: skill?._id ?? '',
    action: 'combatDefenseRoll'
  };
}

function weaponDefenseCard({ id, label, emptySubtitle, icon, candidates }) {
  const defenseCandidates = candidates.map(defenseCandidateRow);
  const candidateCount = defenseCandidates.length;

  return {
    id,
    label,
    subtitle: defenseSubtitle(defenseCandidates, emptySubtitle),
    icon,
    available: candidateCount > 0,
    candidates: defenseCandidates,
    defaultItemId: defenseCandidates[0]?.id ?? '',
    action: 'combatDefenseSelect'
  };
}

function defenseCandidateRow(weapon) {
  return {
    id: weapon.id,
    name: weapon.name,
    item: weapon.item,
    sourceID: weapon.sourceID,
    skillName: weapon.skillName,
    skillScore: weapon.skillScore,
    percent: weapon.skillScore,
    weaponType: weapon.type,
    combatKind: weapon.combatKind,
    icon: weapon.icon
  };
}

function defenseSubtitle(candidates, emptySubtitle) {
  if (candidates.length === 0) return emptySubtitle;
  if (candidates.length === 1) return candidates[0].name;
  return game.i18n.format('BRP.combatDefenseOptions', { count: candidates.length });
}

function findSkillByBRPID(skills = [], brpid) {
  return skills.find(skill => skill.type === 'skill' && skill.flags?.brp?.brpidFlag?.id === brpid);
}

function skillPercent(actor, skill) {
  return Number(skill.system.total ?? 0) + Number(actor.system.skillcategory?.[skill.system.category] ?? 0);
}

export function buildCombatWeaponRow(weapon) {
  const combatKind = getCombatKind(weapon);
  const ammo = weaponAmmo(weapon);
  const details = weaponDetails(weapon, combatKind);
  const damageBonus = weaponDamageBonus(weapon);
  const rangeLabel = weaponRangeLabel(weapon, combatKind);

  return {
    id: weapon._id,
    name: weapon.name,
    type: weapon.system.weaponType,
    itemType: weapon.type,
    item: weapon,
    sourceID: weapon.system.sourceID,
    skillName: weapon.system.skillName,
    skillScore: weapon.system.skillScore,
    combatKind,
    icon: weaponIcon(combatKind),
    iconClass: 'brp-combat-kind-' + combatKind,
    rowClass: 'brp-combat-kind-' + combatKind,
    searchText: [
      weapon.name,
      weapon.system.skillName,
      weapon.system.weaponType,
      combatKind,
      weapon.system.ammoType
    ].filter(Boolean).join(' '),
    sort: {
      type: COMBAT_KIND_ORDER[combatKind] ?? 99,
      name: weapon.name.toLowerCase(),
      percent: Number(weapon.system.skillScore ?? 0),
      custom: numberOrZero(weapon.system.sortOrder)
    },
    meta: {
      attacks: weapon.system.att,
      hands: weapon.system.hands,
      crew: weapon.system.crew,
      encumbrance: weapon.system.actlEnc
    },
    damage: {
      label: weapon.system.dmgName,
      tooltip: weapon.system.damageHint,
      rollable: !weapon.system.specialDmg,
      bonusLabel: damageBonus.label,
      showBonus: damageBonus.show
    },
    damageBonus,
    range: {
      label: rangeLabel,
      tooltip: weapon.system.rangeName
    },
    rangeLabel,
    attacks: weapon.system.att,
    rof: weapon.system.rof,
    hands: weapon.system.hands,
    crew: weapon.system.crew,
    powerStore: {
      value: weapon.system.pSCurr,
      max: weapon.system.pSMax,
      enabled: weapon.system.pSMax > 0
    },
    hp: {
      value: weapon.system.hpCurr,
      max: weapon.system.hp,
      enabled: weapon.system.hp > 0
    },
    encumbrance: weapon.system.actlEnc,
    quantity: weapon.system.quantity,
    ammo,
    details,
    notes: weapon.system.description ?? '',
    equipStatus: weapon.system.equipStatus,
    equippedName: weapon.system.equippedName,
    hasEffects: weapon.system.hasEffects
  };
}

function getWeaponSheetState(context) {
  const sheetFlags = context.actor?.getFlag?.('brp', 'sheet') ?? context.flags?.brp?.sheet ?? {};
  const sortMode = WEAPON_SORT_MODES.includes(sheetFlags.weaponSortMode)
    ? sheetFlags.weaponSortMode
    : DEFAULT_WEAPON_SORT_MODE;

  return { sortMode };
}

function sortWeaponRows(rows, mode) {
  const sortedRows = [...rows];

  sortedRows.sort((left, right) => {
    if (mode === 'name') return compareWeaponName(left, right);
    if (mode === 'percent') return compareWeaponPercent(right, left) || compareWeaponName(left, right);
    if (mode === 'custom') return compareWeaponCustom(left, right) || compareWeaponName(left, right);
    return compareWeaponType(left, right) || compareWeaponCustom(left, right) || compareWeaponName(left, right);
  });

  return sortedRows;
}

function compareWeaponType(left, right) {
  return Number(left.sort.type ?? 99) - Number(right.sort.type ?? 99);
}

function compareWeaponName(left, right) {
  return String(left.sort.name ?? '').localeCompare(String(right.sort.name ?? ''));
}

function compareWeaponPercent(left, right) {
  return Number(left.sort.percent ?? 0) - Number(right.sort.percent ?? 0);
}

function compareWeaponCustom(left, right) {
  return Number(left.sort.custom ?? 0) - Number(right.sort.custom ?? 0);
}

function getCombatKind(weapon) {
  return COMBAT_KIND_BY_WEAPON_TYPE[weapon.system.weaponType] ?? 'melee';
}

function weaponIcon(combatKind) {
  if (combatKind === 'shield') return 'fas fa-shield-halved';
  if (combatKind === 'ranged') return 'fas fa-gun';
  if (combatKind === 'bow') return 'fas fa-bullseye';
  if (combatKind === 'thrown') return 'fas fa-bomb';
  return 'fas fa-sword';
}

function weaponAmmo(weapon) {
  const mode = normalizeAmmoMode(weapon);
  const current = numberOrZero(weapon.system.ammoCurr);
  const max = numberOrZero(weapon.system.ammo);
  const magazineCount = numberOrZero(weapon.system.magazineCount);
  const quantity = numberOrZero(weapon.system.quantity);
  const ammoType = String(weapon.system.ammoType ?? '').trim();
  const typeLabel = (ammoType || 'AMMO').toUpperCase();
  const enabled = (mode === 'single' && (current > 0 || ammoType))
    || (mode === 'magazine' && (current > 0 || max > 0 || magazineCount > 0 || ammoType));
  const disabled = (mode === 'count' && quantity <= 0) || ((mode === 'single' || mode === 'magazine') && current <= 0);

  return {
    mode,
    label: ammoLabel({ mode, current, max, magazineCount, quantity, ammoType }),
    current,
    max,
    magazineCount,
    quantity,
    typeLabel,
    value: current,
    low: mode === 'magazine' && max > 0 && current > 0 && current <= Math.ceil(max * 0.25),
    critical: disabled,
    disabled,
    emptyMessage: ammoEmptyMessage(mode),
    enabled
  };
}

function normalizeAmmoMode(weapon) {
  const mode = weapon.system.ammoMode;
  if (['none', 'count', 'single', 'magazine'].includes(mode)) return mode;

  if (weapon.system.weaponType === 'explosive') return 'count';
  if (['firearm', 'heavy'].includes(weapon.system.weaponType)) return 'magazine';
  if (weapon.system.weaponType === 'energy') return 'single';
  if (weapon.system.weaponType === 'missile') return 'single';
  return 'none';
}

function ammoLabel({ mode, current, max, magazineCount, quantity, ammoType }) {
  if (mode === 'count') return 'x ' + quantity;
  if (mode === 'single') return String(current) + (ammoType ? ' ' + ammoType : '');
  if (mode === 'magazine') {
    const ammoText = current + ' / ' + max;
    return ammoType ? ammoText + ' ' + ammoType + ' | MAG ' + magazineCount : ammoText + ' | MAG ' + magazineCount;
  }
  return '';
}

function ammoEmptyMessage(mode) {
  if (mode === 'count') return 'BRP.ammoModeCount';
  if (mode === 'single') return 'BRP.ammoCurr';
  if (mode === 'magazine') return 'BRP.magazineCount';
  return '';
}

function weaponDetails(weapon, combatKind) {
  const details = [
    { label: 'BRP.handCrew', value: weapon.system.weaponType === 'artillery' ? weapon.system.crew : weapon.system.hands },
    { label: 'BRP.enc', value: weapon.system.actlEnc },
    { label: 'BRP.malfunction', value: weapon.system.mal }
  ];

  if (numberOrZero(weapon.system.hp) > 0) {
    details.push({ label: 'BRP.hp', value: weapon.system.hpCurr + ' / ' + weapon.system.hp, valueClass: 'is-hit-points' });
  }

  if (numberOrZero(weapon.system.pSMax) > 0) {
    details.push({ label: 'BRP.pp', value: weapon.system.pSCurr + ' / ' + weapon.system.pSMax });
  }

  if (numberOrZero(weapon.system.radius) > 0) {
    details.push({ label: 'BRP.radius', value: weapon.system.radius });
  }

  if (combatKind === 'melee' || combatKind === 'shield') {
    details.push({ label: 'BRP.parry', value: game.i18n.localize(weapon.system.parry ? 'BRP.yes' : 'BRP.no') });
  }

  return details.filter(detail => detail.value !== '' && detail.value != null);
}

function weaponDamageBonus(weapon) {
  const db = weapon.system.db;
  const show = db != null && db !== '' && db !== 0 && db !== '0' && db !== 'none';

  return {
    label: show ? weapon.system.dbName : '-',
    tooltip: weapon.system.dbNameHint,
    show
  };
}

function weaponRangeLabel(weapon, combatKind) {
  if (combatKind === 'melee' || combatKind === 'shield') return game.i18n.localize('BRP.melee');
  if (combatKind === 'thrown') return game.i18n.localize('BRP.thrown');

  const label = String(weapon.system.rangeName ?? '').trim();
  if (!label) return '-';
  if (/^[0-9./\s-]+$/.test(label)) return label + ' M';
  return label;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
