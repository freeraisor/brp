import { BRPSelectLists } from '../../apps/select-lists.mjs';
import BRPDialog from '../../setup/brp-dialog.mjs';
import {
  cloneItemData,
  findActorItemByBrpid,
  loadBestItemByBrpid
} from './helpers.mjs';
import { selectFromRadio, selectGroupSkill, selectSkillGroup, promptSkillSpecialism } from './dialogs.mjs';
import { calculateSkillBase } from './skills.mjs';

const DELETE_CONFIG = {
  personality: {
    dialogKey: 'BRP.deletePersonality',
    reset: {
      'system.personality': 0,
      'system.prsnlty': false
    }
  },
  profession: {
    dialogKey: 'BRP.deleteProfession',
    reset: {
      'system.profession': 0,
      'system.occupation': false
    },
    actorUpdates: {
      'system.wealth': ""
    }
  },
  culture: {
    dialogKey: 'BRP.deleteCulture',
    reset: {
      'system.culture': 0,
      'system.cultural': false
    },
    actorUpdates: {
      'system.stats.str.formula': "",
      'system.stats.con.formula': "",
      'system.stats.int.formula': "",
      'system.stats.siz.formula': "",
      'system.stats.pow.formula': "",
      'system.stats.dex.formula': "",
      'system.stats.cha.formula': "",
      'system.stats.edu.formula': "",
      'system.stats.str.culture': 0,
      'system.stats.con.culture': 0,
      'system.stats.int.culture': 0,
      'system.stats.siz.culture': 0,
      'system.stats.pow.culture': 0,
      'system.stats.dex.culture': 0,
      'system.stats.cha.culture': 0,
      'system.stats.edu.culture': 0,
      'system.move': 0
    }
  }
};

export async function dropPersonalityLikeItem(item, actor) {
  if (actor.items.some(actorItem => actorItem.type === item.type)) {
    return {
      reqResult: 0,
      errMsg: `${item.name} : ${game.i18n.format('BRP.stopPersonality', { type: game.i18n.localize(`BRP.${item.type}`) })}`
    };
  }

  const addItems = [];
  const updateItems = [];
  const powerItems = await resolveProfessionPowerItems(item, actor);
  const selectedSkills = await collectSelectedSkills(item, actor);

  for (const skill of selectedSkills) {
    const preparedSkill = await preparePersonalitySkill(item.type, skill);
    if (!preparedSkill) continue;

    const actorSkill = findActorItemByBrpid(actor, preparedSkill.flags?.brp?.brpidFlag?.id);
    if (actorSkill) {
      const update = buildPersonalitySkillUpdate(item.type, actorSkill, preparedSkill);
      if (update) updateItems.push(update);
      continue;
    }

    preparedSkill.system.base = await calculateSkillBase(preparedSkill, actor);
    addItems.push(preparedSkill);
  }

  await Item.createDocuments(addItems, { parent: actor });
  await Item.createDocuments(powerItems, { parent: actor });
  await Item.updateDocuments(updateItems, { parent: actor });

  if (item.type === 'culture') {
    await applyCultureActorUpdates(item, actor);
  }

  if (item.type === 'profession' && game.settings.get('brp', 'useWealth')) {
    await assignProfessionWealth(item, actor);
  }

  return {
    reqResult: 1,
    errMsg: ""
  };
}

export async function personalityDelete(_event, actor) {
  return deletePersonalityLikeItem(actor, 'personality');
}

export async function professionDelete(_event, actor) {
  return deletePersonalityLikeItem(actor, 'profession');
}

export async function cultureDelete(_event, actor) {
  return deletePersonalityLikeItem(actor, 'culture');
}

async function resolveProfessionPowerItems(item, actor) {
  if (item.type !== 'profession') return [];

  const powerItems = [];
  for (const powerReference of item.system?.powers ?? []) {
    const power = await loadBestItemByBrpid(powerReference.brpid);
    if (!power) continue;

    if (!game.settings.get('brp', power.system?.category)) {
      ui.notifications.warn(`${power.name} : ${game.i18n.localize('BRP.nopower')}`);
      continue;
    }

    if (findActorItemByBrpid(actor, power.flags?.brp?.brpidFlag?.id)) continue;
    powerItems.push(cloneItemData(power));
  }

  return powerItems;
}

async function collectSelectedSkills(item, actor) {
  const skills = [];

  for (const group of item.system?.groups ?? []) {
    const selectedSkills = await selectSkillGroup(group);
    if (!selectedSkills?.length) continue;

    for (const selected of selectedSkills) {
      const prepared = await resolveSelectedSkill(selected.brpid ?? selected.id, selected.bonus, item.type, actor);
      if (prepared) skills.push(prepared);
    }
  }

  for (const skillReference of item.system?.skills ?? []) {
    const prepared = await resolveSelectedSkill(skillReference.brpid, skillReference.bonus, item.type, actor);
    if (prepared) skills.push(prepared);
  }

  return skills;
}

async function resolveSelectedSkill(brpid, bonus, sourceType, actor) {
  let skill = await loadBestItemByBrpid(brpid);
  if (!skill) return null;

  if (skill.system?.group) {
    const selected = await selectGroupSkill(skill, actor, 1);
    if (!selected?.length) return null;
    skill = await loadBestItemByBrpid(selected[0].id);
    if (!skill) return null;
  }

  const preparedSkill = cloneItemData(skill);
  if (sourceType === 'culture') preparedSkill.system.culture = bonus ?? 0;
  return preparedSkill;
}

async function preparePersonalitySkill(sourceType, skill) {
  let preparedSkill = skill;
  if (preparedSkill.system?.specialism && !preparedSkill.system?.chosen) {
    preparedSkill = await promptSkillSpecialism(preparedSkill);
    if (!preparedSkill) return null;
  }

  if (sourceType === 'personality') {
    preparedSkill.system.personality = 20;
    preparedSkill.system.prsnlty = true;
  }

  if (sourceType === 'profession') {
    preparedSkill.system.occupation = true;
  }

  if (sourceType === 'culture') {
    preparedSkill.system.cultural = true;
  }

  return preparedSkill;
}

function buildPersonalitySkillUpdate(sourceType, actorSkill, preparedSkill) {
  if (sourceType === 'personality') {
    return {
      _id: actorSkill.id,
      'system.personality': preparedSkill.system.personality,
      'system.prsnlty': preparedSkill.system.prsnlty
    };
  }

  if (sourceType === 'profession') {
    return {
      _id: actorSkill.id,
      'system.occupation': preparedSkill.system.occupation
    };
  }

  if (sourceType === 'culture') {
    return {
      _id: actorSkill.id,
      'system.culture': preparedSkill.system.culture,
      'system.cultural': preparedSkill.system.cultural
    };
  }

  return null;
}

async function applyCultureActorUpdates(item, actor) {
  const changes = {};

  for (const [key, stat] of Object.entries(item.system?.stats ?? {})) {
    if (stat.formula !== "") {
      changes[`system.stats.${key}.formula`] = stat.formula;
    }
    changes[`system.stats.${key}.culture`] = Number(stat.mod) ?? 0;
  }

  changes['system.move'] = Number(item.system?.move ?? 0);
  await actor.update(changes);
}

async function assignProfessionWealth(item, actor) {
  const wealthOptions = await BRPSelectLists.getWealthOptions(item.system?.minWealth, item.system?.maxWealth);
  const selected = await selectFromRadio(wealthOptions, "Select Wealth Level");
  if (selected !== false) {
    await actor.update({ 'system.wealth': selected });
  }
}

async function deletePersonalityLikeItem(actor, type) {
  const config = DELETE_CONFIG[type];
  if (!config) return;

  const confirmation = await BRPDialog.confirm({
    window: { title: game.i18n.localize(config.dialogKey) },
    content: game.i18n.localize("BRP.deleteConfirm")
  });
  if (!confirmation) return;

  const skillUpdates = actor.items
    .filter(item => ['skill', 'magic', 'psychic'].includes(item.type))
    .map(item => ({
      _id: item.id,
      ...config.reset
    }));

  await Item.updateDocuments(skillUpdates, { parent: actor });
  if (config.actorUpdates) await actor.update(config.actorUpdates);

  const ids = actor.items
    .filter(item => item.type === type)
    .map(item => item.id);

  await Item.deleteDocuments(ids, { parent: actor });
}
