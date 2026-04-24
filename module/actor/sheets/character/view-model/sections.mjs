export function createListSection({
  id,
  label,
  icon = null,
  actions = [],
  columns = [],
  rows = [],
  empty = null,
  ...extra
} = {}) {
  return {
    id,
    label,
    icon,
    actions,
    columns,
    rows,
    empty,
    ...extra
  };
}
