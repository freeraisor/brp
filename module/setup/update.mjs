/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs.
 * @param {object} [options={}]
 * @param {boolean} [options.bypassVersionCheck=false]  Bypass certain migration restrictions gated behind system
 *                                                      version stored in item stats.
 * @returns {Promise}      A Promise which resolves once the migration is completed
 */
import { BRPHealth } from '../combat/health.mjs';

const STORY_MIGRATION_VERSION = '13.1.57'

// Deprecated legacy Story sources stay available for compatibility until the Story rebase
// removes the old editor flow. New work should use system.story as the canonical storage.
export const DEPRECATED_STORY_SOURCE_PATHS = Object.freeze([
  'actor.system.background',
  'actor.system.backstory',
  'actor.system.stories'
])

export const DEPRECATED_STORY_HANDLER_NAMES = Object.freeze([
  '.addNewSection',
  '.move-section-up',
  '.move-section-down',
  '.delete-section',
  '.bio-section-*',
  'BRPActorSheetV2.createBioSection',
  'BRPActorSheetV2.updateBioValue',
  'BRPActorSheetV2.updateBioTitle',
  'BRPActorSheetV2.deleteBioSection',
  'BRPActorSheetV2.moveBioSectionUp',
  'BRPActorSheetV2.moveBioSectionDown'
])

export async function updateWorld({ bypassVersionCheck = false } = {}) {
  const currentVersion = game.settings.get("brp", "gameVersion");
  const targetVersion = game.system.version;
  console.log("UPDATE", currentVersion, targetVersion)

    //Migration to 13.1.53
    if (foundry.utils.isNewerVersion('13.1.53', currentVersion ?? '0')) {
      let response = await updateDialog('systems/brp/templates/updates/update13.1.53.hbs')
      if (!response) {
        ui.notifications.warn("Item Migration to Version 13.1.53 cancelled");
        return
      }
      await v13153()
    }

    //Migration to 13.1.56
    if (foundry.utils.isNewerVersion('13.1.56', currentVersion ?? '0')) {
      let response = await updateDialog('systems/brp/templates/updates/update13.1.56.hbs')
      if (!response) {
        ui.notifications.warn("Health Wound Migration to Version 13.1.56 cancelled");
        return
      }
      await v13156()
    }

    if (foundry.utils.isNewerVersion(STORY_MIGRATION_VERSION, currentVersion ?? '0')) {
      let response = await updateDialog('systems/brp/templates/updates/update13.1.57.hbs')
      if (!response) {
        ui.notifications.warn(game.i18n.localize('BRP.storyMigrationCancelled'));
        return
      }
      await v13157()
    }

  await game.settings.set("brp", "gameVersion", targetVersion);
}

export async function updateDialog(msg) {
  const content = await foundry.applications.handlebars.renderTemplate(msg)
  const response = await foundry.applications.api.DialogV2.prompt({
    position: {
      width: 500,
      height: 450,
    },
    classes: ['brp', 'item'],
    window: {
      title: "Update",
    },
    content,
    modal: true
  })
  return response
}



export async function v13153() {
  console.log("Updating  NPC & Character Notes")
  for (let actor of game.actors) {
    if (actor.type === 'npc') {
      let newNotes = actor.system.description
      if (newNotes === "") { continue }
      if (actor.system.extDesc != "") {
        newNotes = actor.system.extDesc + "<p><strong>Legacy Notes</strong)</p><p>" + newNotes + "</p>"
      }
      await actor.update({
        'system.extDesc': newNotes,
        'system.description': ""
      })
    } else if (actor.type === 'character') {
        let newStories = actor.system.stories
              ? foundry.utils.duplicate(actor.system.stories)
              : []
        if (actor.system.background != "") {
          newStories.push({
            title: game.settings.get('brp', 'background1'),
            value: actor.system.background
          })
        }
        if (typeof actor.system.biography === 'string' && actor.system.biography != "") {
          newStories.push({
            title: game.settings.get('brp', 'background1'),
            value: actor.system.biography
          })
        }
        if (actor.system.backstory != "") {
          newStories.push({
            title: game.settings.get('brp', 'background1'),
            value: actor.system.backstory
          })
        }
        await actor.update({"system.stories": newStories})
    }
  }

  //Migrate Compendium Packs
  for (const pack of game.packs) {
    if (pack.metadata.packageType === "system") { continue }
    if (pack.documentName != "Actor") { continue }
    console.log("Updating: ",pack.metadata.packageName)
    // Unlock the pack for editing
    const wasLocked = pack.locked;
    await pack.configure({ locked: false });
    // Begin by requesting server-side data model migration and get the migrated content
    const documents = await pack.getDocuments();
    for (let doc of documents) {
      if (doc.type === 'npc') {
        let newNotes = doc.system.description
        if (newNotes === "") { continue }
        if (doc.system.extDesc != "") {
          newNotes = doc.system.extDesc + "<p><strong>Legacy Notes</strong)</p>" + newNotes
        }
        await doc.update({
          'system.extDesc': newNotes,
          'system.description': ""
        })
      } else if (doc.type === 'character') {
        let newStories = doc.system.stories
              ? foundry.utils.duplicate(doc.system.stories)
              : []
        if (doc.system.background != "") {
          newStories.push({
            title: game.settings.get('brp', 'background1'),
            value: doc.system.background
          })
        }
        if (typeof doc.system.biography === 'string' && doc.system.biography != "") {
          newStories.push({
            title: game.settings.get('brp', 'background1'),
            value: doc.system.biography
          })
        }
        if (doc.system.backstory != "") {
          newStories.push({
            title: game.settings.get('brp', 'background1'),
            value: doc.system.backstory
          })
        }
        await doc.update({"system.stories": newStories})
      }
    }
    await pack.configure({ locked: wasLocked });
  }
  console.log("Update Complete")

}

export async function v13156() {
  console.log("Updating Health Wound Data")
  for (let actor of game.actors) {
    await migrateActorWounds(actor)
  }

  //Migrate Compendium Packs
  for (const pack of game.packs) {
    if (pack.metadata.packageType === "system") { continue }
    if (pack.documentName != "Actor") { continue }
    console.log("Updating: ", pack.metadata.packageName)
    const wasLocked = pack.locked;
    await pack.configure({ locked: false });
    const documents = await pack.getDocuments();
    for (let doc of documents) {
      await migrateActorWounds(doc)
    }
    await pack.configure({ locked: wasLocked });
  }
  console.log("Health Wound Update Complete")
}

export async function v13157() {
  console.log("Updating Story Data")
  for (let actor of game.actors) {
    await migrateActorStoryData(actor)
  }

  for (const pack of game.packs) {
    if (pack.metadata.packageType === "system") { continue }
    if (pack.documentName != "Actor") { continue }
    console.log("Updating: ", pack.metadata.packageName)
    const wasLocked = pack.locked;
    await pack.configure({ locked: false });
    const documents = await pack.getDocuments();
    for (let doc of documents) {
      await migrateActorStoryData(doc)
    }
    await pack.configure({ locked: wasLocked });
  }
  console.log("Story Update Complete")
}

async function migrateActorWounds(actor) {
  const updates = actor.items
    .filter(item => item.type === 'wound')
    .map(wound => ({
      _id: wound.id,
      ...BRPHealth.migrateLegacyWoundData(wound)
    }));

  if (updates.length) {
    await actor.updateEmbeddedDocuments('Item', updates);
  }
}

async function migrateActorStoryData(actor) {
  if (actor.type !== 'character') return

  const update = getStoryMigrationUpdate(actor)
  if (!update) return

  await actor.update(update)
}

function getStoryMigrationUpdate(actor) {
  const update = {}
  const existingEntries = actor.system.story?.entries
  const existingQuestLinks = actor.system.story?.questLinks

  if (!Array.isArray(existingQuestLinks)) {
    update['system.story.questLinks'] = []
  }

  if (Array.isArray(existingEntries) && existingEntries.length > 0) {
    return Object.keys(update).length ? update : null
  }

  const migratedEntries = collectLegacyStoryEntries(actor)

  if (!Array.isArray(existingEntries) || migratedEntries.length > 0) {
    update['system.story.entries'] = migratedEntries
  }

  return Object.keys(update).length ? update : null
}

function collectLegacyStoryEntries(actor) {
  const entries = []
  const legacyStories = Array.isArray(actor.system.stories) ? actor.system.stories : []
  const migratedContent = new Set()
  let sortIndex = 0

  for (const story of legacyStories) {
    const entry = createMigratedStoryEntry({
      title: normalizeLegacyStoryTitle(story?.title),
      content: story?.value ?? '',
      sortIndex
    })
    if (!entry) continue

    entries.push(entry)
    migratedContent.add(createStoryContentSignature(entry.content))
    sortIndex += 10
  }

  const backgroundEntry = createMigratedStoryEntry({
    title: getStoryMigrationLabel('background1', 'Background'),
    content: actor.system.background,
    sortIndex
  })
  if (backgroundEntry && !migratedContent.has(createStoryContentSignature(backgroundEntry.content))) {
    entries.push(backgroundEntry)
    migratedContent.add(createStoryContentSignature(backgroundEntry.content))
    sortIndex += 10
  }

  const backstoryEntry = createMigratedStoryEntry({
    title: getStoryMigrationLabel('background3', 'Backstory'),
    content: actor.system.backstory,
    sortIndex
  })
  if (backstoryEntry && !migratedContent.has(createStoryContentSignature(backstoryEntry.content))) {
    entries.push(backstoryEntry)
  }

  return entries
}

function createMigratedStoryEntry({ title = '', content = '', sortIndex = 0 } = {}) {
  const normalizedContent = String(content ?? '')
  const normalizedTitle = normalizeLegacyStoryTitle(title)
  if (!normalizedContent.trim() && !normalizedTitle) return null

  return {
    id: foundry.utils.randomID(),
    type: 'note',
    title: normalizedTitle,
    content: normalizedContent,
    session: '',
    inGameDate: '',
    realDate: '',
    pinned: false,
    linked: [],
    gmOnly: false,
    sortIndex
  }
}

function normalizeLegacyStoryTitle(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function createStoryContentSignature(value) {
  return String(value ?? '').trim()
}

function getStoryMigrationLabel(settingKey, fallback) {
  try {
    const value = game.settings.get('brp', settingKey)
    return value || fallback
  } catch (_error) {
    return fallback
  }
}
