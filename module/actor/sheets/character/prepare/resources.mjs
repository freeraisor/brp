export function prepareResources(context) {
  const system = context.system;
  const resources = [
    resource('health', system.health, {
      enabled: true,
      editableValue: false,
      editableMax: false,
      actions: {
        decrease: { action: 'addDamage', tooltip: 'BRP.addWound', icon: 'fas fa-sword' },
        increase: { action: 'healWound', tooltip: 'BRP.healWound', icon: 'fas fa-heart' }
      },
      hint: context.useHPL ? '' : 'BRP.dailyHP'
    }),
    resource('power', system.power, {
      enabled: true,
      editableValue: true,
      editableMax: false,
      field: 'system.power.value',
      actions: {
        restore: { action: 'restorePower', tooltip: 'BRP.restoreAll' },
        spend: { action: 'attribute', att: 'power', adj: 'spend', tooltip: 'BRP.ppSpend', icon: 'fas fa-bolt' },
        recover: { action: 'attribute', att: 'power', adj: 'recover', tooltip: 'BRP.ppRecover', icon: 'fas fa-circle-bolt' }
      },
      store: {
        value: system.psCurr,
        max: system.psMax,
        tooltip: 'BRP.storedPower'
      }
    }),
    resource('fatigue', system.fatigue, {
      enabled: context.useFP,
      editableValue: true,
      editableMax: false,
      field: 'system.fatigue.value',
      actions: {
        restore: { action: 'restoreFatigue', tooltip: 'BRP.restoreAll' },
        spend: { action: 'attribute', att: 'fatigue', adj: 'spend', tooltip: 'BRP.ppSpend', icon: 'fas fa-person-running' },
        recover: { action: 'attribute', att: 'fatigue', adj: 'recover', tooltip: 'BRP.ppRecover', icon: 'fas fa-bed-empty' }
      }
    }),
    resource('sanity', system.sanity, {
      enabled: context.useSAN,
      editableValue: true,
      editableMax: true,
      field: 'system.sanity.value',
      maxField: 'system.sanity.max'
    }),
    resource('res5', system.res5, {
      enabled: context.useRES5,
      editableValue: true,
      editableMax: true,
      field: 'system.res5.value',
      maxField: 'system.res5.max'
    })
  ];

  return resources.filter(res => res.enabled);
}

function resource(id, data, options) {
  return {
    id,
    label: data.label,
    shortLabel: data.labelAbbr,
    value: data.value,
    max: data.max,
    enabled: options.enabled,
    editable: {
      value: options.editableValue ?? false,
      max: options.editableMax ?? false
    },
    fields: {
      value: options.field ?? '',
      max: options.maxField ?? ''
    },
    actions: options.actions ?? {},
    store: options.store ?? null,
    hint: options.hint ?? '',
    meter: meter(data.value, data.max)
  };
}

function meter(value, max) {
  const current = Number(value);
  const maximum = Number(max);
  const percentage = Number.isFinite(current) && Number.isFinite(maximum) && maximum > 0
    ? Math.min(100, Math.max(0, Math.round((current / maximum) * 100)))
    : 0;

  return {
    current: value,
    max,
    percentage
  };
}
