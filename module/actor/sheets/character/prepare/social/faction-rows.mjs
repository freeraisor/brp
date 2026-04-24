import {
  clampProgressValue,
  compareFactionRows,
  createSocialAction,
  createSocialRowKey,
  displayValue,
  normalizeFactionMemberships,
  numberOrNull,
  percentDisplay,
  resolveFactionItem,
  stripHtml
} from './shared.mjs';

export async function buildFactionRows(actor) {
  const itemCache = new Map();
  const memberships = normalizeFactionMemberships(actor?.system?.social?.factionMemberships);
  const rows = await Promise.all(memberships.map(async membership => {
    const faction = await resolveFactionItem(membership.uuid, itemCache);
    const name = faction?.name || membership.uuid || 'Missing faction';
    const reputationWithin = numberOrNull(membership.reputationWithin);
    const rowKey = createSocialRowKey('faction', membership.index);

    return {
      id: `membership-${membership.index}`,
      rowKey,
      membershipIndex: membership.index,
      uuid: membership.uuid,
      name,
      role: membership.role,
      displayRole: displayValue(membership.role),
      rank: membership.rank,
      displayRank: displayValue(membership.rank),
      reputationWithin,
      reputationWithinDisplay: reputationWithin == null ? '-' : percentDisplay(reputationWithin),
      reputationWithinBarPercent: clampProgressValue(reputationWithin),
      notes: membership.notes,
      displayNotes: displayValue(membership.notes),
      sort: membership.sort,
      improve: Boolean(membership.improve),
      linked: Boolean(faction),
      missingReference: !faction,
      itemId: faction?.id ?? '',
      item: faction ?? null,
      description: stripHtml(faction?.system?.description),
      actions: {
        membership: createSocialAction('socialFactionMembershipView', { membershipIndex: membership.index, rowKey }),
        open: faction ? createSocialAction('socialOpenFaction', { uuid: membership.uuid, membershipIndex: membership.index }) : null,
        unlink: createSocialAction('socialFactionUnlink', { membershipIndex: membership.index, uuid: membership.uuid }),
        menu: createSocialAction('socialSectionMenu', { sectionId: 'factions', membershipIndex: membership.index, uuid: membership.uuid }),
        toggle: createSocialAction('socialRowToggle', { rowKey }),
        improve: createSocialAction('socialImproveToggle', { socialTrack: 'faction', membershipIndex: membership.index }),
        increase: createSocialAction('socialAdjustValue', { socialTrack: 'faction', membershipIndex: membership.index, direction: 'increase' }),
        decrease: createSocialAction('socialAdjustValue', { socialTrack: 'faction', membershipIndex: membership.index, direction: 'decrease' })
      }
    };
  }));

  rows.sort(compareFactionRows);
  return rows;
}
