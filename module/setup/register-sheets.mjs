import { BRPCharacterSheet } from '../actor/sheets/character.mjs';
import { BRPNPCSheetV2 } from '../actor/sheets/npcV2.mjs';
import { BRPAllegianceSheet } from '../item/sheets/allegiance.mjs';
import { BRPArmourSheet } from '../item/sheets/armour.mjs';
import { BRPContactSheet } from '../item/sheets/contact.mjs';
import { BRPCultureSheet } from '../item/sheets/culture.mjs';
import { BRPFailingSheet } from '../item/sheets/failing.mjs';
import { BRPFactionSheet } from '../item/sheets/faction.mjs';
import { BRPGearSheet } from '../item/sheets/gear.mjs';
import { BRPHitLocSheet } from '../item/sheets/hit-location.mjs';
import { BRPMagicSheet } from '../item/sheets/magic.mjs';
import { BRPMutationSheet } from '../item/sheets/mutation.mjs';
import { BRPPassionSheet } from '../item/sheets/passion.mjs';
import { BRPPersonalitySheet } from '../item/sheets/personality.mjs';
import { BRPPersTraitSheet } from '../item/sheets/persTrait.mjs';
import { BRPPowerSheet } from '../item/sheets/power.mjs';
import { BRPPowerModSheet } from '../item/sheets/powerMod.mjs';
import { BRPProfessionSheet } from '../item/sheets/profession.mjs';
import { BRPPsychicSheet } from '../item/sheets/psychic.mjs';
import { BRPQuestSheet } from '../item/sheets/quest.mjs';
import { BRPReputationSheet } from '../item/sheets/reputation.mjs';
import { BRPSkillSheet } from '../item/sheets/skill.mjs';
import { BRPSkillCategory } from '../item/sheets/skillcat.mjs';
import { BRPSorcerySheet } from '../item/sheets/sorcery.mjs';
import { BRPSuperSheet } from '../item/sheets/super.mjs';
import { BRPWeaponSheet } from '../item/sheets/weapon.mjs';
import { BRPWoundSheet } from '../item/sheets/wound.mjs';
import { BRPJournalSheet } from '../sheets/brp-journal-sheet.mjs';
import { BRPRollTableConfig } from '../sheets/brp-roll-table-config.mjs';

const ACTOR_SHEETS = [
  { types: ['character'], sheetClass: BRPCharacterSheet },
  { types: ['npc'], sheetClass: BRPNPCSheetV2 }
];

const ITEM_SHEETS = [
  { types: ['gear'], sheetClass: BRPGearSheet },
  { types: ['skill'], sheetClass: BRPSkillSheet },
  { types: ['hit-location'], sheetClass: BRPHitLocSheet },
  { types: ['personality'], sheetClass: BRPPersonalitySheet },
  { types: ['profession'], sheetClass: BRPProfessionSheet },
  { types: ['power'], sheetClass: BRPPowerSheet },
  { types: ['magic'], sheetClass: BRPMagicSheet },
  { types: ['mutation'], sheetClass: BRPMutationSheet },
  { types: ['psychic'], sheetClass: BRPPsychicSheet },
  { types: ['sorcery'], sheetClass: BRPSorcerySheet },
  { types: ['super'], sheetClass: BRPSuperSheet },
  { types: ['failing'], sheetClass: BRPFailingSheet },
  { types: ['powerMod'], sheetClass: BRPPowerModSheet },
  { types: ['armour'], sheetClass: BRPArmourSheet },
  { types: ['weapon'], sheetClass: BRPWeaponSheet },
  { types: ['wound'], sheetClass: BRPWoundSheet },
  { types: ['allegiance'], sheetClass: BRPAllegianceSheet },
  { types: ['passion'], sheetClass: BRPPassionSheet },
  { types: ['persTrait'], sheetClass: BRPPersTraitSheet },
  { types: ['reputation'], sheetClass: BRPReputationSheet },
  { types: ['contact'], sheetClass: BRPContactSheet },
  { types: ['faction'], sheetClass: BRPFactionSheet },
  { types: ['quest'], sheetClass: BRPQuestSheet },
  { types: ['skillcat'], sheetClass: BRPSkillCategory },
  { types: ['culture'], sheetClass: BRPCultureSheet }
];

export function registerSheets() {
  const { sheets } = foundry.applications;
  const { collections } = foundry.documents;

  collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  if (sheets.ActorSheetV2) {
    collections.Actors.unregisterSheet("core", sheets.ActorSheetV2);
  }
  registerSheetList(foundry.documents.collections.Actors, ACTOR_SHEETS);

  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet)
  collections.Items.unregisterSheet("core", sheets.ItemSheetV2);
  registerSheetList(foundry.documents.collections.Items, ITEM_SHEETS);

  foundry.documents.collections.RollTables.unregisterSheet('core', foundry.applications.sheets.RollTableSheet)
  foundry.documents.collections.RollTables.registerSheet('brp', BRPRollTableConfig, {
    makeDefault: true
  })

  foundry.documents.collections.Journal.unregisterSheet('core', foundry.appv1.sheets.JournalSheet)
  foundry.documents.collections.Journal.registerSheet('brp', BRPJournalSheet, {
    makeDefault: true
  })
}

function registerSheetList(collection, registrations) {
  for (const { sheetClass, types } of registrations) {
    collection.registerSheet('brp', sheetClass, {
      types,
      makeDefault: true
    });
  }
}
