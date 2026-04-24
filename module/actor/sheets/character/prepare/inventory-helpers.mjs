export const INVENTORY_MAX_NESTING_DEPTH = 3;

const INVENTORY_ITEM_TYPES = new Set(['gear', 'weapon', 'armour']);
const GEAR_INVENTORY_KINDS = new Set(['container', 'consumable', 'tool', 'equipment', 'loot']);

export function buildInventoryDomain(items, { maxDepth = INVENTORY_MAX_NESTING_DEPTH } = {}) {
  const rows = Array.from(items ?? [])
    .filter(item => INVENTORY_ITEM_TYPES.has(item.type))
    .map(normalizeInventoryItem);

  const rowsById = new Map(rows.map(row => [row.id, row]));
  const proposedParents = new Map();

  for (const row of rows) {
    const parentId = row.containerId;
    if (!parentId) continue;
    if (parentId === row.id) {
      addIssue(row, 'self-container');
      continue;
    }

    const parent = rowsById.get(parentId);
    if (!parent) {
      addIssue(row, 'missing-container');
      continue;
    }
    if (!parent.isContainer) {
      addIssue(row, 'non-container-parent');
      continue;
    }

    proposedParents.set(row.id, parentId);
  }

  for (const row of rows) {
    const ancestry = getAncestry(row.id, proposedParents, rowsById);
    if (ancestry.cycle) {
      for (const rowId of ancestry.path) addIssue(rowsById.get(rowId), 'container-cycle');
      proposedParents.delete(row.id);
      continue;
    }

    row.depth = ancestry.depth;
    if (row.depth > maxDepth) {
      addIssue(row, 'max-depth');
      proposedParents.delete(row.id);
      row.depth = 0;
    }
  }

  for (const [rowId, parentId] of proposedParents.entries()) {
    const row = rowsById.get(rowId);
    const parent = rowsById.get(parentId);
    if (!row || !parent) continue;
    row.parentId = parentId;
    parent.children.push(row);
  }

  const topLevelRows = rows.filter(row => !row.parentId);
  for (const row of topLevelRows) computeEffectiveEnc(row);

  const totalEnc = roundEnc(topLevelRows.reduce((total, row) => total + row.effectiveEnc, 0));
  const invalidRows = rows.filter(row => row.issues.length > 0);

  return {
    rows,
    rowsById,
    topLevelRows,
    invalidRows,
    totalEnc,
    maxDepth,
    hasInvalidContainers: invalidRows.length > 0
  };
}

export function normalizeInventoryItem(item) {
  const mockType = normalizeInventoryMockType(item);
  const quantity = computeStackQuantity(item);
  const status = adaptEquipStatus(item);
  const row = {
    id: item.id ?? item._id,
    uuid: item.uuid,
    item,
    name: item.name,
    type: item.type,
    mockType,
    inventoryKind: mockType === 'armor' || mockType === 'weapon' ? mockType : normalizeGearInventoryKind(item),
    isContainer: mockType === 'container',
    containerId: normalizeContainerId(item.system?.containerId),
    parentId: '',
    children: [],
    depth: 0,
    quantity,
    empty: quantity <= 0,
    status,
    bonuses: Array.isArray(item.system?.bonuses) ? item.system.bonuses : [],
    ownEnc: computeOwnEnc(item, status, quantity),
    contentEnc: 0,
    effectiveEnc: null,
    issues: []
  };

  return row;
}

export function normalizeInventoryMockType(item) {
  if (item.type === 'weapon') return 'weapon';
  if (item.type === 'armour') return 'armor';
  if (item.type === 'gear') return normalizeGearInventoryKind(item);
  return item.type;
}

export function normalizeGearInventoryKind(item) {
  const kind = item.system?.inventoryKind || 'equipment';
  return GEAR_INVENTORY_KINDS.has(kind) ? kind : 'equipment';
}

export function adaptEquipStatus(item) {
  const equipStatus = item.system?.equipStatus || 'carried';
  if (item.type === 'armour') {
    return {
      equipStatus,
      carried: equipStatus === 'carried' || equipStatus === 'worn',
      equipped: equipStatus === 'worn'
    };
  }

  if (item.type === 'weapon') {
    return {
      equipStatus,
      carried: equipStatus === 'carried',
      equipped: equipStatus === 'carried'
    };
  }

  return {
    equipStatus,
    carried: equipStatus === 'carried',
    equipped: false
  };
}

export function computeStackQuantity(item) {
  const quantity = Number(item.system?.quantity);
  return Number.isFinite(quantity) ? quantity : 1;
}

export function isInventoryRowEmpty(item) {
  return computeStackQuantity(item) <= 0;
}

export function validateInventoryNesting(items, { maxDepth = INVENTORY_MAX_NESTING_DEPTH } = {}) {
  const domain = buildInventoryDomain(items, { maxDepth });
  return {
    valid: !domain.hasInvalidContainers,
    invalidRows: domain.invalidRows,
    maxDepth
  };
}

export function computeInventoryTotalEnc(items, options) {
  return buildInventoryDomain(items, options).totalEnc;
}

export function computeContainerContentEnc(row) {
  return roundEnc((row?.children ?? []).reduce((total, child) => {
    const childEnc = Number.isFinite(child.effectiveEnc) ? child.effectiveEnc : computeEffectiveEnc(child);
    return total + childEnc;
  }, 0));
}

export function computeEffectiveContainerEnc(row) {
  if (!row?.isContainer) return roundEnc(row?.ownEnc ?? 0);
  if (!row.status?.carried) return 0;

  const reduction = clampPercent(row.item?.system?.encReductionPct);
  return roundEnc((row.ownEnc ?? 0) + (computeContainerContentEnc(row) * (1 - reduction / 100)));
}

function computeEffectiveEnc(row) {
  row.contentEnc = computeContainerContentEnc(row);

  if (row.isContainer) {
    row.effectiveEnc = computeEffectiveContainerEnc(row);
    return row.effectiveEnc;
  }

  row.effectiveEnc = roundEnc(row.ownEnc);
  return row.effectiveEnc;
}

function computeOwnEnc(item, status, quantity) {
  if (item.type === 'armour') return computeArmourEnc(item);
  if (!status.carried) return 0;

  const enc = Number(item.system?.enc);
  return roundEnc((Number.isFinite(enc) ? enc : 0) * quantity);
}

function computeArmourEnc(item) {
  const actualEnc = Number(item.system?.actlEnc);
  if (Number.isFinite(actualEnc)) return roundEnc(actualEnc);
  if (item.system?.equipStatus !== 'carried') return 0;

  const quantity = computeStackQuantity(item);
  const enc = Number(item.system?.enc);
  return roundEnc((Number.isFinite(enc) ? enc : 0) * quantity);
}

function getAncestry(rowId, proposedParents, rowsById) {
  const visited = new Set();
  const path = [];
  let currentId = rowId;
  let depth = 0;

  while (proposedParents.has(currentId)) {
    if (visited.has(currentId)) {
      path.push(currentId);
      return { cycle: true, depth, path };
    }

    visited.add(currentId);
    path.push(currentId);
    currentId = proposedParents.get(currentId);
    if (!rowsById.has(currentId)) break;
    depth += 1;
  }

  return { cycle: false, depth, path };
}

function normalizeContainerId(containerId) {
  return typeof containerId === 'string' ? containerId.trim() : '';
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(99, Math.max(0, number));
}

function roundEnc(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function addIssue(row, issue) {
  if (!row || row.issues.includes(issue)) return;
  row.issues.push(issue);
}
