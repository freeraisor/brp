export function createListRow({
  id,
  documentType = 'Item',
  title = '',
  subtitle = '',
  img = null,
  rollAction = null,
  cells = {},
  actions = [],
  flags = {},
  item = null,
  ...extra
} = {}) {
  return {
    id,
    documentType,
    title,
    subtitle,
    img,
    rollAction,
    cells,
    actions,
    flags,
    item,
    ...extra
  };
}
