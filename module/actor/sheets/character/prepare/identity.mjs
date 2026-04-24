export async function prepareIdentityContext(sheet, context, actorData) {
  await prepareCulture(sheet, context, actorData);
  await preparePersonality(sheet, context, actorData);
  await prepareProfession(sheet, context, actorData);
  context.identity = prepareIdentity(context, actorData);
}

export function prepareIdentity(context, actorData) {
  const system = actorData.system;

  return {
    name: identityField('name', 'BRP.name', actorData.name ?? context.actor.name, {
      path: 'name',
      editable: true
    }),
    culture: linkedIdentityField('culture', 'BRP.culture', context.culture, {
      path: 'system.culture',
      isLinked: context.cultureUsed,
      itemId: context.cultureId,
      deleteAction: 'deleteCulture',
      editable: !context.isLocked
    }),
    profession: linkedIdentityField('profession', 'BRP.profession', context.profession, {
      path: 'system.professionName',
      isLinked: context.professionUsed,
      itemId: context.professionId,
      deleteAction: 'deleteProfession',
      editable: !context.isLocked
    }),
    personality: linkedIdentityField('personality', 'BRP.personality', context.personality, {
      path: 'system.personalityName',
      isLinked: context.personalityUsed,
      itemId: context.personalityId,
      deleteAction: 'deletePersonality',
      editable: !context.isLocked
    }),
    age: identityField('age', 'BRP.age', system.age, {
      path: 'system.age',
      editable: !context.isLocked,
      dtype: 'Number'
    }),
    gender: identityField('gender', 'BRP.gender', system.gender, {
      path: 'system.gender',
      editable: true
    }),
    hand: identityField('hand', 'BRP.hand', system.hand, {
      path: 'system.hand',
      editable: true
    }),
    height: identityField('height', 'BRP.height', system.height, {
      path: 'system.height',
      editable: true
    }),
    weight: identityField('weight', 'BRP.weight', system.weight, {
      path: 'system.weight',
      editable: true
    }),
    religion: identityField('religion', 'BRP.religion', system.religion, {
      path: 'system.religion',
      editable: true
    }),
    wealth: identityField('wealth', context.useWealth ? 'BRP.wealth' : context.wealthLabel, getWealthValue(context, system), {
      path: context.useWealth ? 'system.wealth' : 'system.wealthValue',
      editable: context.useWealth ? !context.isLocked : true,
      dtype: context.useWealth ? null : 'Number',
      options: context.useWealth ? context.wealthOptions : null
    }),
    move: identityField('move', 'BRP.move', system.move, {
      path: 'system.move',
      editable: true
    })
  };
}

async function prepareCulture(sheet, context, actorData) {
  context.culture = "";
  let tempCult = (await sheet.actor.items.filter(itm => itm.type === 'culture'))[0];
  if (tempCult) {
    context.culture = tempCult.name;
    context.cultureId = tempCult._id;
    context.cultureUsed = true;
  } else {
    context.culture = actorData.system.culture;
    context.cultureUsed = false;
  }
}

async function preparePersonality(sheet, context, actorData) {
  context.personality = "";
  let tempPers = (await sheet.document.items.filter(itm => itm.type === 'personality'))[0];
  if (tempPers) {
    context.personality = tempPers.name;
    context.personalityId = tempPers._id;
    context.personalityUsed = true;
  } else {
    context.personality = actorData.system.personalityName;
    context.personalityUsed = false;
  }
}

async function prepareProfession(sheet, context, actorData) {
  context.profession = "";
  let tempProf = (await sheet.document.items.filter(itm => itm.type === 'profession'))[0];
  if (tempProf) {
    context.profession = tempProf.name;
    context.professionId = tempProf._id;
    context.professionUsed = true;
  } else {
    context.profession = actorData.system.professionName;
    context.professionUsed = false;
  }
}

function linkedIdentityField(id, label, value, options) {
  const isLinked = options.isLinked ?? false;

  return identityField(id, label, value, {
    path: isLinked ? '' : options.path,
    editable: !isLinked && options.editable,
    itemId: isLinked ? options.itemId : '',
    isLinked,
    documentClass: isLinked ? 'Item' : '',
    canDelete: isLinked,
    deleteAction: isLinked ? options.deleteAction : ''
  });
}

function identityField(id, label, value, options = {}) {
  return {
    id,
    label,
    value,
    path: options.path ?? '',
    editable: options.editable ?? false,
    dtype: options.dtype ?? null,
    options: options.options ?? null,
    itemId: options.itemId ?? '',
    isLinked: options.isLinked ?? false,
    documentClass: options.documentClass ?? '',
    canDelete: options.canDelete ?? false,
    deleteAction: options.deleteAction ?? ''
  };
}

function getWealthValue(context, system) {
  if (context.useWealth) return context.wealthName;
  return system.wealthValue;
}
