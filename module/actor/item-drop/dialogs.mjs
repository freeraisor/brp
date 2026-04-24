import { BRPSelectLists } from '../../apps/select-lists.mjs';
import { SkillsSelectDialog } from "../../apps/skill-selection.mjs";
import { BRPUtilities } from '../../apps/utilities.mjs';
import BRPDialog from '../../setup/brp-dialog.mjs';
import {
  loadBestItemByBrpid,
  loadItemsByRegex
} from './helpers.mjs';

export async function hitLocationDialog(actor) {
  const hitLocOptions = await BRPSelectLists.getHitLocOptions(actor);
  const data = {
    hitLocOptions,
    label: game.i18n.localize('BRP.chooseHitLoc'),
  };
  const html = await foundry.applications.handlebars.renderTemplate('systems/brp/templates/dialog/hitLocChoice.hbs', data);
  return BRPDialog.input({
    window: { title: game.i18n.localize('BRP.hitLoc') },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.proceed')
    }
  });
}

export async function selectGroupSkill(groupSkill, actor, picks) {
  const selectOptions = [];

  if (Array.isArray(groupSkill.system?.groupSkills) && groupSkill.system.groupSkills.length > 0) {
    for (const skillOption of groupSkill.system.groupSkills) {
      const skill = await loadBestItemByBrpid(skillOption.brpid);
      if (skill) {
        selectOptions.push({
          id: skillOption.brpid,
          selected: false,
          name: skill.name
        });
      }
    }
  } else {
    const skillList = await loadItemsByRegex({ brpidRegExp: new RegExp('^i.skill'), type: 'i' });
    skillList.sort((left, right) => left.name.localeCompare(right.name));

    for (const skill of skillList) {
      selectOptions.push({
        id: skill.flags?.brp?.brpidFlag?.id,
        selected: false,
        name: skill.name
      });
    }
  }

  return SkillsSelectDialog.create(selectOptions, picks, game.i18n.localize('BRP.skills')) || false;
}

export async function selectSkillGroup(group) {
  const selectOptions = [];

  for (const skillOption of group.skills ?? []) {
    const skill = await loadBestItemByBrpid(skillOption.brpid);
    if (!skill) continue;

    selectOptions.push({
      id: skillOption.brpid,
      selected: false,
      name: skill.name,
      bonus: skillOption.bonus ?? 0
    });
  }

  return SkillsSelectDialog.create(selectOptions, group.options, game.i18n.localize('BRP.skills')) || false;
}

export async function promptSkillSpecialism(skill) {
  const title = game.i18n.format('BRP.getSpecialism', { entity: skill.name });
  const usage = await BRPDialog.input({
    window: { title },
    content: `<input class="centre" type="text" name="entry">`,
    ok: {
      label: game.i18n.localize('BRP.proceed')
    }
  });

  const specialization = String(usage?.entry ?? '').trim();
  if (!specialization) return null;

  skill.system.specName = specialization;
  skill.name = `${skill.system.mainName} (${specialization})`;
  skill.flags.brp.brpidFlag.id = `i.skill.${await BRPUtilities.toKebabCase(skill.name)}`;
  skill.system.chosen = true;
  return skill;
}

export async function selectFromRadio(list, title) {
  const entries = list instanceof Map
    ? Array.from(list.entries())
    : Array.isArray(list)
      ? list.map((value, index) => [String(index), value])
      : Object.entries(list ?? {});

  if (!entries.length) return false;
  if (entries.length === 1) return entries[0][0];

  const html = await foundry.applications.handlebars.renderTemplate('systems/brp/templates/dialog/selectItem.hbs', {
    headTitle: title,
    newList: Object.fromEntries(entries)
  });

  const usage = await BRPDialog.input({
    window: { title },
    content: html,
    ok: {
      label: game.i18n.localize('BRP.proceed')
    }
  });

  return usage?.selectItem || false;
}
