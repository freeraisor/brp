const STYLE_SETTINGS = [
  ['actorFontColour', '--brp-colour-primary'],
  ['actorTitleColour', '--brp-colour-secondary'],
  ['actorTertiaryColour', '--brp-colour-tertiary'],
  ['brpIconPrimary', '--brp-icon-primary'],
  ['secBackColour', '--brp-labelback'],
  ['actorRollableColour', '--actor-rollable-colour'],
  ['actorRollableShadowColour', '--actor-rollable-shadow'],
  ['actorBackColour', '--actor-sheet-back'],
  ['actorTabNameColour', '--actor-tab-name-colour']
];

const FONT_SIZE_SETTINGS = [
  ['charSheetMainFontSize', '--actor-main-font-size'],
  ['charSheetTitleFontSize', '--actor-title-font-size']
];

const FONT_SETTINGS = [
  ['charSheetMainFont', '--actor-main-font', 'customSheetFont'],
  ['charSheetTitleFont', '--actor-title-font', 'customTitleFont']
];

const REFRESH_THEME_PROPERTIES = {
  '--brp-refresh-bg-base': '#1a1210',
  '--brp-refresh-bg-card': '#241a18',
  '--brp-refresh-bg-elevated': '#2d211f',
  '--brp-refresh-bg-hover': '#3a2a26',
  '--brp-refresh-border': '#4a1f1f',
  '--brp-refresh-border-soft': '#33211f',
  '--brp-refresh-red': '#c8302e',
  '--brp-refresh-red-bright': '#e24b4a',
  '--brp-refresh-red-muted': '#8a2a28',
  '--brp-refresh-mint': '#9ad8c4',
  '--brp-refresh-mint-dim': '#6fa894',
  '--brp-refresh-blue': '#5b8fd8',
  '--brp-refresh-amber': '#d4a04a',
  '--brp-refresh-green': '#7fb355',
  '--brp-refresh-text': '#e8e2dc',
  '--brp-refresh-text-dim': '#a89d94',
  '--brp-refresh-text-muted': '#6e6560',
  '--brp-refresh-font-display': '"Cinzel", "Modesto", Georgia, serif',
  '--brp-refresh-font-body': '"Inter", "Roboto", system-ui, sans-serif'
};

export function getCharacterSheetThemeSettings(settings = game.settings) {
  const properties = { ...REFRESH_THEME_PROPERTIES };
  const fonts = [];

  for (const [settingName, propertyName] of STYLE_SETTINGS) {
    properties[propertyName] = settings.get('brp', settingName);
  }

  for (const [settingName, propertyName] of FONT_SIZE_SETTINGS) {
    const fontSize = settings.get('brp', settingName);
    properties[propertyName] = fontSize ? fontSize + 'px' : '';
  }

  const backgroundImage = settings.get('brp', 'actorSheetBackground');
  properties['--actor-back-img'] = backgroundImage ? "url(/" + backgroundImage + ")" : '';

  for (const [settingName, propertyName, familyName] of FONT_SETTINGS) {
    const fontPath = settings.get('brp', settingName);
    fonts.push({
      propertyName,
      familyName,
      source: fontPath ? "url(/" + fontPath + ")" : ''
    });
  }

  return { preset: 'refresh', properties, fonts };
}

export function applyCharacterSheetTheme(element, theme) {
  if (!theme) return;

  const ownerDocument = element?.ownerDocument ?? document;
  const sheetElements = ownerDocument.querySelectorAll('.brp.actor');

  for (const [propertyName, value] of Object.entries(theme.properties ?? {})) {
    if (!value) continue;
    sheetElements.forEach(el => el.style.setProperty(propertyName, value));
  }

  for (const font of theme.fonts ?? []) {
    if (!font.source) continue;
    loadSheetFont(font);
    sheetElements.forEach(el => el.style.setProperty(font.propertyName, font.familyName));
  }
}

function loadSheetFont(font) {
  const customFont = new FontFace(
    font.familyName,
    font.source
  );

  customFont
    .load()
    .then(function (loadedFace) {
      document.fonts.add(loadedFace);
    })
    .catch(function (error) {
      ui.notifications.error(error);
    });
}
