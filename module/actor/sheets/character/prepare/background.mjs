// Deprecated legacy Story/background bridge. The Story rebase moves canonical storage to
// system.story and will replace backgroundView/storySections with storyRefresh.
export async function prepareBackground(context) {
  context.storySections = await buildStorySections(context);
  context.backgroundView = buildBackgroundView(context);
}

async function buildStorySections(context) {
  if (!(context.system.stories instanceof Array) || !context.system.stories.length) {
    return [];
  }

  const sections = [];
  const untitledLabel = labelText('BRP.characterCustomFieldUntitled', 'Untitled');

  for (const [index, story] of context.system.stories.entries()) {
    const title = normalizeText(story?.title);
    const value = story?.value ?? '';
    sections.push({
      id: index,
      index,
      title,
      displayTitle: title || untitledLabel,
      value,
      enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        value,
        {
          async: true,
          secrets: context.editable
        }
      ),
      editable: context.editable
    });
  }

  sections[0].isFirst = true;
  sections[sections.length - 1].isLast = true;
  return sections;
}

function buildBackgroundView(context) {
  return {
    title: labelText('BRP.story', 'Story'),
    hasSections: context.storySections.length > 0,
    emptyLabel: labelText('BRP.backgroundEmpty', 'No story sections'),
    sections: context.storySections
  };
}

function labelText(key, fallback = '') {
  return game.i18n.has(key) ? game.i18n.localize(key) : fallback;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}
