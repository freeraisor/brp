export function finalizeDevelopmentPreparation(context, improve) {
  sortImprove(improve);
  context.improve = improve;
  context.developmentView = buildDevelopmentView(context, improve);
}

function buildDevelopmentView(context, improve) {
  const canImprovePower = context.actor.system.stats.pow.improve;

  return {
    xp: {
      fixed: context.xpFixed,
      formula: context.xpFormula
    },
    actions: [
      developmentAction({
        id: 'all-fixed',
        label: 'BRP.fixedAll',
        tooltip: context.xpFixed,
        icon: 'fas fa-feather-pointed',
        action: 'xpRolls',
        prop: 'all',
        roll: 'fixed'
      }),
      developmentAction({
        id: 'all-formula',
        label: 'BRP.formulaAll',
        tooltip: context.xpFormula,
        icon: 'fas fa-dice',
        action: 'xpRolls',
        prop: 'all',
        roll: 'formula'
      }),
      developmentAction({
        id: 'pow-fixed',
        label: 'BRP.powImproveFixed',
        tooltip: '+1',
        icon: 'fas fa-bolt-lightning',
        action: 'powImprove',
        roll: 'fixed',
        enabled: canImprovePower
      }),
      developmentAction({
        id: 'pow-formula',
        label: 'BRP.powImproveFormula',
        tooltip: '+1D3-1',
        icon: 'fas fa-cloud-bolt',
        action: 'powImprove',
        roll: 'formula',
        enabled: canImprovePower
      })
    ],
    improve: {
      columns: [
        { id: 'name', label: 'BRP.improve' },
        { id: 'type', label: 'BRP.type' },
        { id: 'score', label: '%' },
        { id: 'fixed', label: 'BRP.fixed', tooltip: context.xpFixed },
        { id: 'random', label: 'BRP.random', tooltip: context.xpFormula }
      ],
      rows: improve.map(improveRow)
    }
  };
}

function developmentAction({
  id,
  label,
  tooltip,
  icon,
  action,
  prop = null,
  roll,
  enabled = true
}) {
  return {
    id,
    label,
    tooltip,
    icon,
    action,
    prop,
    roll,
    enabled
  };
}

function improveRow(improve) {
  return {
    id: improve._id,
    documentType: 'Item',
    name: improve.name,
    typeLabel: improve.typeLabel,
    score: improve.score,
    opposite: improve.opp,
    actions: [
      developmentAction({
        id: 'single-fixed',
        label: 'BRP.fixed',
        tooltip: '',
        icon: 'fas fa-feather-pointed',
        action: 'xpRolls',
        prop: 'single',
        roll: 'fixed'
      }),
      developmentAction({
        id: 'single-formula',
        label: 'BRP.random',
        tooltip: '',
        icon: 'fas fa-dice',
        action: 'xpRolls',
        prop: 'single',
        roll: 'formula'
      })
    ]
  };
}

function sortImprove(improve) {
  improve.sort(function (a, b) {
    let x = a.typeLabel;
    let y = b.typeLabel;
    let p = a.name;
    let q = b.name;
    if (x < y) { return -1 };
    if (x > y) { return 1 };
    if (p < q) { return -1 };
    if (p > q) { return 1 };
    return 0;
  });
}
