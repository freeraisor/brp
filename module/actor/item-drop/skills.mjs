import {
  loadBestItemByBrpid,
  hasActorItemByBrpid
} from './helpers.mjs';

export async function calculateSkillBase(item, actor) {
  await ensureSkillCategory(item, actor);

  if (!item.system?.variable) return item.system.base;

  const first = calculateSkillBaseFormulaValue(actor, item.system.baseFormula?.[1]);
  const second = calculateSkillBaseFormulaValue(actor, item.system.baseFormula?.[2]);

  if (item.system.baseFormula?.Func === 'and') return first + second;
  return Math.max(first, second);
}

export async function ensureSkillCategory(skill, actor) {
  if (hasActorItemByBrpid(actor, skill.system?.category)) return;

  const skillCategory = await loadBestItemByBrpid(skill.system?.category);
  if (!skillCategory) {
    const errorMessage = game.i18n.format('BRP.noSkillCat', {
      skillCat: skill.system?.category,
      skillName: skill.name
    });
    ui.notifications.warn(errorMessage);
    return;
  }

  await Item.createDocuments([skillCategory], { parent: actor });
}

function calculateSkillBaseFormulaValue(actor, formulaEntry) {
  const stat = String(formulaEntry?.stat ?? '');
  const multiplier = Number(formulaEntry?.value ?? 0);
  if (!stat || stat === 'fixed') return 0;
  if (stat === 'edu' && !game.settings.get('brp', 'useEDU')) return 0;

  const actorStat = actor.system?.stats?.[stat];
  const base = Number(actorStat?.base ?? 0);
  const redist = Number(actorStat?.redist ?? 0);
  const culture = Number(actorStat?.culture ?? 0);
  return Math.ceil((base + redist + culture) * multiplier);
}
