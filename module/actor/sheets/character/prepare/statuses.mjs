import { BRPHealth } from '../../../../combat/health.mjs';

export function prepareStatuses(context) {
  const system = context.system;
  const autoConditions = BRPHealth.computeAutoConditions(context.actor, { useHPL: context.useHPL });

  const hplStatuses = [
    status('disabled-location', 'BRP.healthDisabledLocations', 'fas fa-circle-exclamation', false),
    status('bleeding', 'BRP.bleeding', 'fas fa-droplet', system.bleeding),
    status('incapacitated', 'BRP.incapacitated', 'fas fa-face-dizzy', system.incapacitated),
    status('injured', 'BRP.injured', 'fas fa-face-head-bandage', system.injured),
    status('severed', 'BRP.severed', 'fas fa-bone-break', system.severed)
  ];

  const woundStatuses = [
    status('minor-wound', 'BRP.minorWnd', 'fas fa-crutch', system.minorWnd, {
      action: 'actorToggle',
      property: 'minorWnd',
      source: 'actor'
    }),
    status('major-wound', 'BRP.majorWound', 'fas fa-crutches', system.majorWnd, {
      action: 'actorToggle',
      property: 'majorWnd',
      source: 'actor'
    })
  ];

  return applyAutoConditions([
    ...(context.useHPL ? hplStatuses : woundStatuses),
    status('unconscious', 'BRP.unconscious', 'fas fa-snooze', system.unconscious),
    status('dead', 'BRP.dead', 'fas fa-skull', system.dead),
    status('stunned', 'BRP.stunned', 'fas fa-star-of-life', false, { todo: true }),
    status('prone', 'BRP.prone', 'fas fa-person-falling', false, { todo: true }),
    status('grappled', 'BRP.grappled', 'fas fa-link', false, { todo: true })
  ], autoConditions);
}

function status(id, label, icon, active, options = {}) {
  const toggleable = Boolean(options.action && options.property);

  return {
    id,
    label,
    icon,
    active: Boolean(active),
    source: options.source ?? '',
    action: options.action ?? '',
    property: options.property ?? '',
    detailTab: options.detailTab ?? 'health',
    toggleable,
    tooltip: options.tooltip ?? label,
    tooltipText: options.tooltipText ?? '',
    auto: Boolean(options.auto),
    todo: options.todo ?? false
  };
}

function applyAutoConditions(statuses, autoConditions) {
  for (const condition of autoConditions) {
    const existing = statuses.find(status => status.id === condition.id);
    if (existing) {
      existing.active = true;
      existing.auto = true;
      existing.todo = false;
      existing.source = 'auto';
      existing.tooltipText = condition.tooltipText;
      continue;
    }

    statuses.push(status(condition.id, condition.label, condition.icon, true, {
      source: 'auto',
      detailTab: condition.detailTab,
      tooltipText: condition.tooltipText,
      auto: true
    }));
  }

  return statuses;
}
