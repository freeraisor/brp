export function prepareCharacteristics(context) {
  const system = context.system;

  return Object.entries(system.stats ?? {}).reduce((characteristics, [key, stat]) => {
    if (!stat.visible) return characteristics;

    characteristics.push({
      key,
      label: stat.label,
      shortLabel: stat.labelShort,
      total: stat.total,
      derivedLabel: stat.labelDeriv,
      derivedValue: getDerivedValue(key, stat, system),
      derivedDisplay: getDerivedDisplay(key, stat, system),
      rollable: true,
      improve: key === 'pow' ? stat.improve : false,
      actions: {
        roll: { action: 'statRoll', characteristic: key },
        improve: key === 'pow' ? { action: 'actorToggle', property: 'powimprove' } : null
      }
    });

    return characteristics;
  }, []);
}

function getDerivedValue(key, stat, system) {
  if (key === 'siz') return system.dmgBonus?.full ?? '';
  return stat.deriv;
}

function getDerivedDisplay(key, stat, system) {
  if (key === 'siz') return system.dmgBonus?.full ?? '';
  return stat.deriv + '%';
}
