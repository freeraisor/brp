export function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function readStoredBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  return Boolean(value);
}

export function normalizeSectionStateMap(sectionIds, storedState = {}, {
  fallback = false,
  initialized = true,
  ignoreAllTrueUnlessInitialized = false
} = {}) {
  const states = sectionIds.reduce((result, sectionId) => {
    result[sectionId] = readStoredBoolean(storedState?.[sectionId], fallback);
    return result;
  }, {});

  const isInitialized = readStoredBoolean(initialized, true);
  // Older broken builds could persist an "everything collapsed" default.
  if (ignoreAllTrueUnlessInitialized && !isInitialized && sectionIds.length && sectionIds.every(sectionId => states[sectionId] === true)) {
    for (const sectionId of sectionIds) states[sectionId] = fallback;
  }

  return states;
}

export function escapeHTML(value) {
  const text = String(value ?? '');
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, match => htmlEscapes[match] ?? match);
}

export function getTargetElement(target) {
  return target?.currentTarget ?? target;
}

export function elementIds(elements) {
  return Array.from(elements ?? []).map(element => element.id).filter(Boolean);
}

export function dataIds(elements, dataKey, owner = element => element) {
  return Array.from(elements ?? []).map(element => owner(element)?.dataset?.[dataKey]).filter(Boolean);
}

export function cssEscape(value) {
  return globalThis.CSS?.escape?.(String(value ?? '')) ?? String(value ?? '').replace(/"/g, '\\"');
}

export function captureRefreshWorkspaceScroll(sheet, target = null) {
  const workspace = getRefreshWorkspace(sheet, target);
  if (!workspace) return null;
  const scrollTop = workspace.scrollTop;
  sheet._pendingRefreshWorkspaceScrollTop = scrollTop;
  return scrollTop;
}

export function restoreRefreshWorkspaceScroll(sheet) {
  const scrollTop = sheet?._pendingRefreshWorkspaceScrollTop;
  if (scrollTop == null) return;
  const workspace = getRefreshWorkspace(sheet);
  if (workspace) workspace.scrollTop = scrollTop;
}

export function restoreRefreshWorkspaceScrollSoon(sheet, scrollTop) {
  if (scrollTop == null) return;
  sheet._pendingRefreshWorkspaceScrollTop = scrollTop;
  const apply = () => {
    const workspace = getRefreshWorkspace(sheet);
    if (workspace) workspace.scrollTop = scrollTop;
  };

  if (globalThis.requestAnimationFrame) {
    requestAnimationFrame(apply);
    requestAnimationFrame(() => requestAnimationFrame(apply));
  } else {
    setTimeout(apply, 0);
  }
  setTimeout(apply, 60);
}

export function getRefreshWorkspace(sheet, target = null) {
  return getTargetElement(target)?.closest?.('[data-container-id="brp-refresh-workspace"], .brp-refresh-workspace')
    ?? sheet.element?.querySelector('[data-container-id="brp-refresh-workspace"], .brp-refresh-workspace');
}

/**
 * Persist a boolean UI-state entry on a flag map without the Foundry merge
 * pitfall. `actor.update({ 'flags.x.y': { a: true } })` deep-merges into the
 * existing object, so `delete map[key]` in memory never clears the persisted
 * value. Keys may also contain dots (for example BRPID values such as
 * `i.skillcat.physical`), so writing `path.key = true` or `path.-=key = null`
 * would be parsed as nested path segments instead of a literal map key.
 *
 * To stay safe we rebuild the whole map and replace it in one update by first
 * deleting the parent slot and then writing the new object back. Use this for
 * every chevron/row-expand toggle.
 *
 * @param {ClientDocument} doc    Actor or Item to update.
 * @param {string}         path   Full flag path to the map, e.g. `flags.brp.sheet.inventory.expandedItems`.
 * @param {string}         key    Map key (itemId, sectionId, rowKey, ...).
 * @param {boolean}        value  true to remember as expanded/collapsed, false to forget the entry.
 * @param {object}         [options] Extra options forwarded to `doc.update()`.
 */
export async function persistUiMapFlag(doc, path, key, value, options = {}) {
  if (!doc || !path || !key) return;

  const updateOptions = { render: false, renderSheet: false, ...options };
  const current = normalizeUiMapState(foundry.utils.getProperty(doc, path));
  const next = foundry.utils.deepClone(current);

  if (value) next[key] = true;
  else delete next[key];

  const segments = String(path).split('.').filter(Boolean);
  if (!segments.length) return;

  const leafKey = segments.pop();
  const parentPath = segments.join('.');
  const updateData = {};

  if (parentPath && leafKey) {
    updateData[`${parentPath}.-=${leafKey}`] = null;
  }
  updateData[path] = next;

  await doc.update(updateData, updateOptions);
}

function normalizeUiMapState(value, prefix = '', target = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return target;

  for (const [entryKey, entryValue] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${entryKey}` : entryKey;

    if (entryValue && typeof entryValue === 'object' && !Array.isArray(entryValue)) {
      normalizeUiMapState(entryValue, nextKey, target);
      continue;
    }

    if (readStoredBoolean(entryValue, false)) {
      target[nextKey] = true;
    }
  }

  return target;
}
