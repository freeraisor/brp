import { CHARACTER_SECTION_IDS } from '../character-sheet-config.mjs';
import { normalizeSectionStateMap } from '../character-sheet-utils.mjs';

const EMPTY_DISPLAY = '-';
const DEFAULT_MOVE = 10;

export function prepareCharacterTab(context) {
  const characterFlags = getCharacterSheetFlags(context);
  const expandedCharacteristic = getExpandedCharacteristic(characterFlags, context.system);
  const characteristics = buildCharacteristics(context, expandedCharacteristic);
  const collapsedSections = normalizeSectionStateMap(
    CHARACTER_SECTION_IDS,
    characterFlags.collapsedSections,
    {
      initialized: characterFlags.sectionStateInitialized,
      ignoreAllTrueUnlessInitialized: true
    }
  );

  return {
    state: {
      collapsedSections,
      expandedCharacteristic
    },
    title: labelText('BRP.character', 'Character'),
    biographyGroups: buildBiographyGroups(context),
    coreCards: buildCoreCards(context),
    characteristics,
    characteristicRows: buildCharacteristicRows(characteristics),
    derivedStats: buildDerivedStats(context),
    skillPoints: buildSkillPoints(context),
    powerCards: buildPowerCards(context),
    customFields: buildCustomFields(context),
    movement: buildMoveView(context.system)
  };
}

export function buildMoveView(system = {}) {
  const sourceValue = Number(system.move);
  const hasMove = Number.isFinite(sourceValue) && sourceValue > 0;
  const value = hasMove ? sourceValue : DEFAULT_MOVE;
  const runValue = value * 3;

  return {
    label: labelText('BRP.move', 'MOV'),
    shortLabel: 'MOV',
    value,
    displayValue: displayValue(value),
    sourceValue: hasMove ? sourceValue : system.move,
    runValue,
    runDisplay: displayValue(runValue),
    runUnit: 'm/rd',
    isPlaceholder: !hasMove,
    tooltip: hasMove ? '' : labelText('BRP.characterMovePlaceholderTooltip', 'Current system.move is empty; showing baseline placeholder.')
  };
}

function buildBiographyGroups(context) {
  const system = context.system ?? {};
  const biography = getBiographyObject(system);
  const identity = context.identity ?? {};

  return [
    biographyGroup('demographics', labelText('BRP.demographics', 'Demographics'), [
      field('name', 'BRP.name', identity.name?.value ?? context.actor?.name, {
        path: 'name',
        editable: false
      }),
      field('age', 'BRP.age', system.age, {
        path: 'system.age',
        editable: !context.isLocked,
        dtype: 'Number'
      }),
      field('gender', 'BRP.gender', system.gender, {
        path: 'system.gender',
        editable: !context.isLocked
      }),
      field('pronouns', null, biography.pronouns, {
        label: labelText('BRP.pronouns', 'Pronouns'),
        path: 'system.biography.pronouns',
        editable: !context.isLocked
      }),
      field('dateOfBirth', null, biography.dateOfBirth, {
        label: labelText('BRP.dateOfBirth', 'Date of birth'),
        path: 'system.biography.dateOfBirth',
        editable: !context.isLocked
      }),
      field('placeOfBirth', null, biography.placeOfBirth, {
        label: labelText('BRP.placeOfBirth', 'Place of birth'),
        path: 'system.biography.placeOfBirth',
        editable: !context.isLocked
      }),
      linkedField(identity.culture, {
        id: 'culture',
        label: labelText('BRP.nationalityCulture', 'Nationality / Culture'),
        editable: !context.isLocked
      }),
      field('religion', 'BRP.religion', system.religion, {
        path: 'system.religion',
        editable: !context.isLocked
      }),
      field('nativeLanguage', null, biography.nativeLanguage, {
        label: labelText('BRP.nativeLanguage', 'Native language'),
        path: 'system.biography.nativeLanguage',
        editable: !context.isLocked
      })
    ]),
    biographyGroup('physical', labelText('BRP.physical', 'Physical'), [
      field('height', 'BRP.height', system.height, {
        path: 'system.height',
        editable: !context.isLocked
      }),
      field('weight', 'BRP.weight', system.weight, {
        path: 'system.weight',
        editable: !context.isLocked
      }),
      field('build', null, biography.build, {
        label: labelText('BRP.build', 'Build'),
        path: 'system.biography.build',
        editable: !context.isLocked
      }),
      field('eyeColor', null, biography.eyeColor, {
        label: labelText('BRP.eyeColor', 'Eye color'),
        path: 'system.biography.eyeColor',
        editable: !context.isLocked
      }),
      field('hairColor', null, biography.hairColor, {
        label: labelText('BRP.hairColor', 'Hair color'),
        path: 'system.biography.hairColor',
        editable: !context.isLocked
      }),
      field('skinTone', null, biography.skinTone, {
        label: labelText('BRP.skinTone', 'Skin tone'),
        path: 'system.biography.skinTone',
        editable: !context.isLocked
      }),
      field('hand', 'BRP.hand', system.hand, {
        path: 'system.hand',
        editable: !context.isLocked
      }),
      field('distinctiveMarks', null, biography.distinctiveMarks, {
        label: labelText('BRP.distinctiveMarks', 'Distinctive marks'),
        path: 'system.biography.distinctiveMarks',
        editable: !context.isLocked,
        wide: true
      })
    ]),
    biographyGroup('social', labelText('BRP.social', 'Social'), [
      linkedField(identity.profession, {
        id: 'profession',
        label: labelText('BRP.profession', 'Profession'),
        editable: !context.isLocked
      }),
      field('employer', null, biography.employer, {
        label: labelText('BRP.employerFaction', 'Employer / Faction'),
        path: 'system.biography.employer',
        editable: !context.isLocked
      }),
      field('rankTitle', null, biography.rankTitle, {
        label: labelText('BRP.rankTitle', 'Rank / Title'),
        path: 'system.biography.rankTitle',
        editable: !context.isLocked
      }),
      field('maritalStatus', null, biography.maritalStatus, {
        label: labelText('BRP.maritalStatus', 'Marital status'),
        path: 'system.biography.maritalStatus',
        editable: !context.isLocked
      }),
      field('socialClass', null, biography.socialClass, {
        label: labelText('BRP.socialClass', 'Social class'),
        path: 'system.biography.socialClass',
        editable: !context.isLocked
      }),
      field('knownLanguages', null, biography.knownLanguages, {
        label: labelText('BRP.knownLanguages', 'Known languages'),
        path: 'system.biography.knownLanguages',
        editable: !context.isLocked,
        wide: true
      })
    ]),
    biographyGroup('about', labelText('BRP.about', 'About'), [
      field('about', null, biography.about, {
        label: labelText('BRP.about', 'About'),
        path: 'system.biography.about',
        editable: !context.isLocked,
        multiline: true,
        wide: true
      })
    ], { wide: true })
  ];
}

function buildCoreCards(context) {
  return [
    coreCard(context, 'profession', labelText('BRP.classProfession', 'Class / Profession'), context.identity?.profession),
    coreCard(context, 'culture', labelText('BRP.culture', 'Culture'), context.identity?.culture),
    coreCard(context, 'personality', labelText('BRP.personality', 'Personality'), context.identity?.personality)
  ];
}

function coreCard(context, id, label, identityField) {
  const item = identityField?.itemId ? context.actor?.items?.get(identityField.itemId) : null;
  const title = identityField?.value ?? '';
  const empty = isEmptyValue(title);
  const removeAction = identityField?.canDelete ? identityField.deleteAction : '';

  return {
    id,
    label,
    title,
    displayTitle: empty ? EMPTY_DISPLAY : title,
    description: item ? stripHtml(item.system?.description) : '',
    itemId: identityField?.itemId ?? '',
    documentClass: identityField?.documentClass ?? (item ? 'Item' : ''),
    empty,
    linked: Boolean(identityField?.isLinked),
    actions: {
      open: item ? { action: 'viewDoc', itemId: item.id, documentClass: 'Item' } : null,
      menu: item ? { action: 'characterCoreCardMenu', itemId: item.id } : null,
      remove: removeAction ? { action: removeAction } : null,
      replace: null
    }
  };
}

function buildCharacteristics(context, expandedCharacteristic = '') {
  const system = context.system ?? {};
  const stats = system.stats ?? {};

  return Object.entries(stats).reduce((rows, [key, stat]) => {
    if (!stat.visible) return rows;

    rows.push({
      key,
      code: stat.labelShort,
      name: stat.label,
      total: stat.total,
      visible: stat.visible,
      active: expandedCharacteristic === key,
      breakdown: [
        characteristicBreakdownRow('initial', 'BRP.initial', stat.base, {
          editablePath: `system.stats.${key}.base`,
          editable: !context.statLocked
        }),
        characteristicBreakdownRow('redistribute', 'BRP.redistribute', stat.redist, {
          readonly: true,
          className: system.redistTotal === 0 ? '' : 'grid-error'
        }),
        characteristicBreakdownRow('cultural', 'BRP.cultural', stat.culture, {
          editablePath: `system.stats.${key}.culture`,
          editable: !context.statLocked
        }),
        characteristicBreakdownRow('age', 'BRP.age', stat.age, {
          editablePath: `system.stats.${key}.age`,
          editable: !context.statLocked
        }),
        characteristicBreakdownRow('experience', 'BRP.experience', stat.exp, {
          editablePath: `system.stats.${key}.exp`,
          editable: !context.statLocked
        }),
        characteristicBreakdownRow('effects', 'BRP.effects', stat.effects, {
          readonly: true
        }),
        characteristicBreakdownRow('total', 'BRP.total', stat.total, {
          readonly: true,
          total: true
        })
      ],
      formula: stat.formula,
      formulaPath: `system.stats.${key}.formula`,
      formulaEditable: !context.statLocked,
      actions: {
        roll: { action: 'statRoll', characteristic: key },
        increase: { action: 'redistStat', type: 'increase', stat: key },
        decrease: { action: 'redistStat', type: 'decrease', stat: key }
      }
    });

    return rows;
  }, []);
}

function buildCharacteristicRows(characteristics, rowSize = 4) {
  const rows = [];

  for (let index = 0; index < characteristics.length; index += rowSize) {
    const cards = characteristics.slice(index, index + rowSize);
    rows.push({
      id: `row-${Math.floor(index / rowSize)}`,
      cards,
      activeCard: cards.find(card => card.active) ?? null
    });
  }

  return rows;
}

function characteristicBreakdownRow(id, labelKey, value, options = {}) {
  return {
    id,
    label: labelText(labelKey),
    labelKey,
    value,
    displayValue: signedDisplay(value, options.total),
    editablePath: options.editablePath ?? '',
    editable: options.editable ?? false,
    readonly: options.readonly ?? !options.editable,
    total: options.total ?? false,
    className: options.className ?? ''
  };
}

function buildDerivedStats(context) {
  const system = context.system ?? {};
  const stats = system.stats ?? {};
  const moveView = buildMoveView(system);
  const strPlusSiz = numberOrZero(stats.str?.total) + numberOrZero(stats.siz?.total);

  return [
    derivedCard('xpBonus', labelText('BRP.xpBonus', 'XP Bonus'), system.xpBonus, {
      formula: `ceil(${stats.int?.labelShort ?? 'INT'} / 2)`,
      tone: 'mint',
      suffix: '%'
    }),
    derivedCard('hpBonus', formatText('BRP.hpBonus', { label: system.health?.labelAbbr ?? '' }, 'HP Bonus'), system.health?.mod, {
      formula: labelText('BRP.optionalRule', 'Optional rule'),
      path: 'system.health.mod'
    }),
    derivedCard('ppBonus', formatText('BRP.ppBonus', { label: system.power?.labelAbbr ?? '' }, 'PP Bonus'), system.power?.mod, {
      formula: labelText('BRP.optionalRule', 'Optional rule'),
      path: 'system.power.mod'
    }),
    derivedCard('fpBonus', formatText('BRP.fpBonus', { label: system.fatigue?.labelAbbr ?? '' }, 'FP Bonus'), system.fatigue?.mod, {
      formula: labelText('BRP.optionalRule', 'Optional rule'),
      path: 'system.fatigue.mod',
      enabled: context.useFP
    }),
    derivedCard('damageMod', labelText('BRP.dmgBonusShort', 'Damage Mod'), system.dmgBonus?.full, {
      formula: `STR + SIZ = ${strPlusSiz}`,
      tone: 'red'
    }),
    derivedCard('totalEnc', labelText('BRP.totalENC', 'Total ENC'), system.enc, {
      formula: labelText('BRP.currentEnc', 'Current ENC')
    }),
    derivedCard('mov', moveView.shortLabel, moveView.value, {
      formula: moveView.isPlaceholder ? labelText('BRP.characterMoveFormulaPlaceholder', 'Current value placeholder') : 'system.move',
      tone: 'mint',
      placeholder: moveView.isPlaceholder,
      tooltip: moveView.tooltip
    }),
    derivedCard('totalXP', labelText('BRP.totalXP', 'Total SP'), system.totalXP, {
      formula: labelText('BRP.skillXpTotal', 'Skill point total')
    })
  ];
}

function derivedCard(id, label, value, options = {}) {
  return {
    id,
    label,
    value,
    displayValue: displayValue(value, options.suffix),
    formula: options.formula ?? '',
    tone: options.tone ?? '',
    path: options.path ?? '',
    editable: Boolean(options.path),
    enabled: options.enabled ?? true,
    placeholder: options.placeholder ?? false,
    tooltip: options.tooltip ?? '',
    suffix: options.suffix ?? ''
  };
}

function buildSkillPoints(context) {
  const system = context.system ?? {};
  const stats = system.stats ?? {};

  return {
    personal: skillPointCard('personal', labelText('BRP.psp', 'Personal Skill Points'), {
      statCode: stats.int?.labelShort ?? 'INT',
      multiplier: 10,
      total: (numberOrZero(stats.int?.base) + numberOrZero(stats.int?.culture)) * 10,
      used: numberOrZero(system.totalPers)
    }),
    professional: skillPointCard('professional', labelText('BRP.pfsp', 'Professional Skill Points'), {
      statCode: stats.edu?.labelShort ?? 'EDU',
      multiplier: 20,
      total: (numberOrZero(stats.edu?.base) + numberOrZero(stats.edu?.culture)) * 20,
      used: numberOrZero(system.totalProf)
    })
  };
}

function skillPointCard(id, label, { statCode, multiplier, total, used }) {
  const percentage = total > 0 ? Math.round((used / total) * 100) : used > 0 ? 100 : 0;
  const percentageClamped = Math.max(0, Math.min(percentage, 100));

  return {
    id,
    label,
    statCode,
    multiplier,
    total,
    used,
    percentage,
    percentageClamped,
    formula: `${statCode} x ${multiplier} = ${total}`,
    usedDisplay: `${used} / ${total}`,
    overflow: used > total,
    tone: used > total ? 'red' : 'mint'
  };
}

function buildPowerCards(context) {
  const system = context.system ?? {};

  return [
    powerCard('magic', context.magicLabel, context.magics, system.magic, 'magic', 'magic', 'fas fa-wand-magic'),
    powerCard('mutations', context.mutationLabel, context.mutations, system.mutation, 'mutations', 'mutation', 'fas fa-burst'),
    powerCard('psychics', context.psychicLabel, context.psychics, system.psychic, 'psychics', 'psychic', 'fa-regular fa-lightbulb'),
    powerCard('sorcery', context.sorceryLabel, context.sorceries, system.sorcery, 'sorcery', 'sorcery', 'fas fa-book'),
    powerCard('super', context.superLabel, context.superpowers, system.super, 'super', 'super', 'fas fa-hand-sparkles')
  ].filter(card => card.assigned);
}

function powerCard(id, label, items = [], systemId = '', targetTab, itemType, icon) {
  const count = items?.length ?? 0;

  return {
    id,
    label,
    count,
    countDisplay: String(count),
    assigned: !isEmptyValue(systemId),
    targetTab,
    itemType,
    icon,
    actions: {
      open: { action: 'tab', group: 'primary', tab: targetTab },
      create: { action: 'createDoc', documentClass: 'Item', type: itemType }
    }
  };
}

function buildCustomFields(context) {
  const customFields = Array.isArray(context.system?.customFields) ? context.system.customFields : [];

  return customFields
    .map((customField, index) => {
      const source = customField && typeof customField === 'object' ? customField : {};
      const sortOrder = Number(source.sortOrder);
      const title = String(source.title ?? '');
      const content = String(source.content ?? '');

      return {
        id: String(source.id || `custom-${index}`),
        title,
        content,
        displayTitle: isEmptyValue(title) ? labelText('BRP.characterCustomFieldUntitled', 'Untitled') : title,
        displayContent: isEmptyValue(content) ? EMPTY_DISPLAY : content,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : index * 10,
        index,
        empty: isEmptyValue(title) && isEmptyValue(content)
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.index - right.index);
}

function biographyGroup(id, title, fields, options = {}) {
  return {
    id,
    title,
    fields,
    wide: options.wide ?? false
  };
}

function linkedField(identityField, options = {}) {
  return field(options.id ?? identityField?.id ?? '', null, identityField?.value, {
    label: options.label ?? labelText(identityField?.label),
    path: identityField?.path ?? '',
    editable: Boolean(identityField?.path) && options.editable,
    itemId: identityField?.itemId ?? '',
    documentClass: identityField?.documentClass ?? '',
    isLinked: identityField?.isLinked ?? false,
    canDelete: identityField?.canDelete ?? false,
    deleteAction: identityField?.deleteAction ?? ''
  });
}

function field(id, labelKey, value, options = {}) {
  const empty = isEmptyValue(value);

  return {
    id,
    label: options.label ?? labelText(labelKey),
    labelKey,
    value,
    displayValue: empty ? EMPTY_DISPLAY : value,
    empty,
    path: options.path ?? '',
    editable: options.editable ?? false,
    dtype: options.dtype ?? null,
    multiline: options.multiline ?? false,
    wide: options.wide ?? false,
    itemId: options.itemId ?? '',
    documentClass: options.documentClass ?? '',
    isLinked: options.isLinked ?? false,
    canDelete: options.canDelete ?? false,
    deleteAction: options.deleteAction ?? ''
  };
}

function getBiographyObject(system) {
  return system.biography && typeof system.biography === 'object' && !Array.isArray(system.biography)
    ? system.biography
    : {};
}

function getCharacterSheetFlags(context) {
  return context.actor?.getFlag?.('brp', 'sheet')?.character
    ?? context.flags?.brp?.sheet?.character
    ?? {};
}

function getExpandedCharacteristic(characterFlags, system) {
  const key = characterFlags.expandedCharacteristic;
  if (!key || !system?.stats?.[key]?.visible) return '';
  return key;
}

function labelText(labelKey, fallback = '') {
  if (!labelKey) return fallback;
  const localized = globalThis.game?.i18n?.localize?.(labelKey) ?? labelKey;
  return localized === labelKey && fallback ? fallback : localized;
}

function formatText(labelKey, data, fallback = '') {
  const formatted = globalThis.game?.i18n?.format?.(labelKey, data) ?? labelKey;
  return formatted === labelKey && fallback ? fallback : formatted;
}

function displayValue(value, suffix = '') {
  return isEmptyValue(value) ? EMPTY_DISPLAY : `${value}${suffix}`;
}

function signedDisplay(value, forceUnsigned = false) {
  const number = Number(value);
  if (!Number.isFinite(number)) return displayValue(value);
  if (forceUnsigned || number === 0) return String(number);
  return number > 0 ? `+${number}` : String(number);
}

function isEmptyValue(value) {
  return value == null || String(value).trim() === '';
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function stripHtml(value = '') {
  return String(value).replace(/(<([^>]+)>)/g, '').trim();
}
