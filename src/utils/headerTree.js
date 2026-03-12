/** Build a tree from flat items array using parentId */
export function buildTree(items) {
  const map = {}
  items.forEach(item => { map[item.id] = { ...item, children: [] } })
  const roots = []
  items.forEach(item => {
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(map[item.id])
    } else {
      roots.push(map[item.id])
    }
  })
  return roots
}

/** Get all leaf nodes (isLeaf === 1) sorted by colIndex */
export function getLeafNodes(items) {
  return items.filter(i => i.isLeaf === 1).sort((a, b) => a.colIndex - b.colIndex)
}

/** Group items by headerRow, sort each group by colIndex */
export function getHeaderRows(items) {
  const rows = {}
  items.forEach(item => {
    const r = item.headerRow || 1
    if (!rows[r]) rows[r] = []
    rows[r].push(item)
  })
  return Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b)
    .map(r => rows[r].sort((a, b) => a.colIndex - b.colIndex))
}

/** Max header depth */
export function getMaxHeaderRow(items) {
  return items.reduce((max, i) => Math.max(max, i.headerRow || 1), 1)
}

/** Convert values array [{itemId, rowIndex, cellValue}] to map: rowIndex -> itemId -> cellValue */
export function valuesToMap(values) {
  const map = {}
  if (!values) return map
  values.forEach(v => {
    if (!map[v.rowIndex]) map[v.rowIndex] = {}
    map[v.rowIndex][v.itemId] = v.cellValue
  })
  return map
}

/** Get distinct row indices from values array */
export function getRowIndices(values) {
  const set = new Set((values || []).map(v => v.rowIndex))
  return [...set].sort((a, b) => a - b)
}
