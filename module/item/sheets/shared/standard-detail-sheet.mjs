const DEFAULT_TAB_GROUP = 'primary';
const DEFAULT_TAB_LABELS = {
  details: 'BRP.details',
  description: 'BRP.description',
  gmNotes: 'BRP.gmNotes'
};

export function buildStandardItemSheetParts(detailsTemplate, extraParts = {}) {
  return {
    header: { template: 'systems/brp/templates/item/item.header.hbs' },
    tabs: { template: 'systems/brp/templates/global/parts/tab-navigation.hbs' },
    details: {
      template: detailsTemplate,
      scrollable: ['']
    },
    description: { template: 'systems/brp/templates/item/item.description.hbs' },
    gmNotes: { template: 'systems/brp/templates/item/item.gmnotes.hbs' },
    ...extraParts
  };
}

export function prepareStandardItemSheetContext(sheet, options, context, { tabLabels = {} } = {}) {
  context.tabs = getStandardItemSheetTabs(sheet, options.parts, tabLabels);
  return context;
}

export async function prepareStandardItemSheetPartContext(sheet, partId, context, { enrichedParts = {} } = {}) {
  if (!context.tabs?.[partId]) return context;

  context.tab = context.tabs[partId];
  const enrichConfig = enrichedParts[partId];
  if (!enrichConfig) return context;

  context[enrichConfig.contextKey] = await enrichItemHtml(sheet, enrichConfig.fieldPath);
  return context;
}

export function getStandardItemSheetTabs(sheet, parts, tabLabels = {}) {
  ensureDefaultTab(sheet);

  const labels = {
    ...DEFAULT_TAB_LABELS,
    ...tabLabels
  };

  return parts.reduce((tabs, partId) => {
    if (partId === 'header' || partId === 'tabs') return tabs;

    tabs[partId] = {
      cssClass: sheet.tabGroups[DEFAULT_TAB_GROUP] === partId ? 'active' : '',
      group: DEFAULT_TAB_GROUP,
      id: partId,
      icon: '',
      label: labels[partId] ?? `BRP.${partId}`,
    };
    return tabs;
  }, {});
}

export function configureStandardItemSheetParts(options, { includeDescription = true, extraParts = [] } = {}) {
  options.parts = ['header', 'tabs', 'details'];
  if (includeDescription) options.parts.push('description');
  options.parts.push(...extraParts);
  if (game.user.isGM) options.parts.push('gmNotes');
}

async function enrichItemHtml(sheet, fieldPath) {
  const source = foundry.utils.getProperty(sheet.item, fieldPath);
  return foundry.applications.ux.TextEditor.implementation.enrichHTML(source, {
    secrets: sheet.document.isOwner,
    rollData: sheet.document.getRollData(),
    relativeTo: sheet.document,
  });
}

function ensureDefaultTab(sheet) {
  if (sheet.tabGroups[DEFAULT_TAB_GROUP]) return;
  sheet.tabGroups[DEFAULT_TAB_GROUP] = game.settings.get('brp', 'defaultTab') ? 'description' : 'details';
}
