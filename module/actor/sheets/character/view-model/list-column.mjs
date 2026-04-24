export function createListColumn({
  id,
  label,
  tooltip = null,
  align = 'left',
  hidden = false,
  ...extra
} = {}) {
  return {
    id,
    label,
    tooltip,
    align,
    hidden,
    ...extra
  };
}

export function createListCell({
  value = '',
  label = null,
  tooltip = null,
  align = null,
  rollable = false,
  editable = false,
  enabled = true,
  field = null,
  action = null,
  icon = null,
  ...extra
} = {}) {
  return {
    value,
    label,
    tooltip,
    align,
    rollable,
    editable,
    enabled,
    field,
    action,
    icon,
    ...extra
  };
}
