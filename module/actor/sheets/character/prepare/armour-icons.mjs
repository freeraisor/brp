export function createArmourIcon(armour, hitLocation = null) {
  return {
    type: 'svg-path',
    viewBox: '0 0 24 24',
    path: armourIconPath(armour, hitLocation)
  };
}

function armourIconPath(armour, hitLocation) {
  const text = [
    armour.name,
    armour.system?.hitlocName,
    hitLocation?.name,
    hitLocation?.system?.displayName,
    hitLocation?.system?.locType,
    hitLocation?.flags?.brp?.brpidFlag?.id
  ].filter(Boolean).join(' ').toLocaleLowerCase();

  if (text.includes('head') || text.includes('helmet') || text.includes('helm') || text.includes('casque') || text.includes('casco')) {
    return 'M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z';
  }

  if (text.includes('chest') || text.includes('abdomen') || text.includes('torso') || text.includes('vest') || text.includes('body') || text.includes('corps') || text.includes('pecho')) {
    return 'M6 4h12l-1 6 3 3v8H4v-8l3-3z';
  }

  if (text.includes('arm') || text.includes('leg') || text.includes('guard') || text.includes('limb') || text.includes('bras') || text.includes('jambe') || text.includes('brazo') || text.includes('pierna')) {
    return 'M8 2h8l-1 8h-6zM8 10v12h8V10';
  }

  return 'M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z';
}
