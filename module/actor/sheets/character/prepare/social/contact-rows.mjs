import {
  buildInitials,
  compareNumber,
  compareText,
  createEmbeddedItemAction,
  createSocialAction,
  displayValue,
  getContactRelationLabel,
  normalizeContactRelation,
  resolveLinkedActor,
  stringValue
} from './shared.mjs';

const CONTACT_RELATION_SORT = {
  ally: 0,
  friend: 1,
  neutral: 2,
  suspect: 3,
  enemy: 4
};

export function prepareContactItem(item, state) {
  state.contacts.push(item);
}

export async function buildContactRows(items) {
  const actorCache = new Map();
  const rows = await Promise.all(items.map(async item => {
    const linkedActor = await resolveLinkedActor(item.system?.linkedActorUuid, actorCache);
    const relation = normalizeContactRelation(item.system?.relation);
    const avatarName = linkedActor?.name || item.name;

    return {
      id: item.id,
      itemId: item.id,
      documentClass: 'Item',
      type: item.type,
      item,
      name: item.name,
      role: stringValue(item.system?.role),
      displayRole: displayValue(item.system?.role),
      location: stringValue(item.system?.location),
      displayLocation: displayValue(item.system?.location),
      relation,
      relationLabel: getContactRelationLabel(relation),
      initials: buildInitials(avatarName),
      linkedActor: {
        uuid: stringValue(item.system?.linkedActorUuid),
        name: linkedActor?.name ?? '',
        image: linkedActor?.img ?? '',
        found: Boolean(linkedActor)
      },
      actions: {
        open: createEmbeddedItemAction(item.id),
        openLinked: linkedActor ? createSocialAction('socialOpenLinkedActor', { actorUuid: linkedActor.uuid, itemId: item.id }) : null,
        menu: createSocialAction('socialSectionMenu', { sectionId: 'contacts', itemId: item.id })
      }
    };
  }));

  rows.sort((left, right) =>
    compareNumber(CONTACT_RELATION_SORT[left.relation] ?? 99, CONTACT_RELATION_SORT[right.relation] ?? 99)
    || compareText(left.name, right.name)
  );

  return rows;
}
