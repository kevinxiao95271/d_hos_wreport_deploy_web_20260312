<template>
  <div class="matrix-wrap">

    <!-- number 类型独立输入框（渲染在矩阵上方） -->
    <div v-if="numberItems.length" class="number-section">
      <div v-for="item in numberItems" :key="item.id" class="number-row">
        <span class="number-label">{{ item.itemName }}</span>
        <el-input-number
          v-if="editable"
          v-model="numberValues[item.id]"
          :min="0"
          :placeholder="item.placeholder || '请输入'"
          size="small"
          style="width:150px"
          @change="emitChange"
        />
        <span v-else class="number-value">{{ numberValues[item.id] ?? '—' }}</span>
      </div>
    </div>

    <!-- 矩阵表格（仅 checkbox 列） -->
    <div class="matrix-scroll">
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="label-th">项目</th>
            <th v-for="col in checkboxItems" :key="col.id" class="col-th">
              <div v-if="editable" class="col-name" :title="col.itemName">{{ col.itemName }}</div>
              <div v-else></div>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- 树B：市级（先渲染） -->
          <template v-for="row in groupB" :key="row.rowIndex">
            <tr :class="rowClass(row)">
              <td class="label-td">
                <span :style="{ paddingLeft: levelIndent[row.rowLevel] + 'px' }">{{ row.rowLabel }}</span>
              </td>
              <td v-for="col in checkboxItems" :key="col.id" class="cell-td">
                <el-checkbox v-if="editable" :model-value="getVal(col.id, row.rowIndex)" @change="v => setVal(col.id, row.rowIndex, v)" />
                <template v-else>
                  <el-icon v-if="getVal(col.id, row.rowIndex)" color="#67c23a" style="vertical-align:middle"><Select /></el-icon>
                  <span v-else class="unchecked">—</span>
                </template>
              </td>
            </tr>
          </template>

          <!-- 分隔行 -->
          <tr v-if="groupB.length && groupA.length" class="group-separator">
            <td :colspan="checkboxItems.length + 1"></td>
          </tr>

          <!-- 树A：省市县（后渲染） -->
          <template v-for="row in groupA" :key="row.rowIndex">
            <tr :class="rowClass(row)">
              <td class="label-td">
                <span :style="{ paddingLeft: levelIndent[row.rowLevel] + 'px' }">{{ row.rowLabel }}</span>
              </td>
              <td v-for="col in checkboxItems" :key="col.id" class="cell-td">
                <el-checkbox v-if="editable" :model-value="getVal(col.id, row.rowIndex)" @change="v => setVal(col.id, row.rowIndex, v)" />
                <template v-else>
                  <el-icon v-if="getVal(col.id, row.rowIndex)" color="#67c23a" style="vertical-align:middle"><Select /></el-icon>
                  <span v-else class="unchecked">—</span>
                </template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Select } from '@element-plus/icons-vue'

const props = defineProps({
  items:    { type: Array,   default: () => [] },
  rows:     { type: Array,   default: () => [] },
  values:   { type: Array,   default: () => [] },
  editable: { type: Boolean, default: false }
})

const emit = defineEmits(['update:rows'])

const levelIndent = { 1: 0, 2: 16, 3: 32 }

// ── 列分类 ───────────────────────────────────────────────
const checkboxItems = computed(() =>
  props.items.filter(i => i.valueType === 'checkbox').sort((a, b) => (a.sortNum || 0) - (b.sortNum || 0))
)
const numberItems = computed(() =>
  props.items.filter(i => i.valueType !== 'checkbox').sort((a, b) => (a.sortNum || 0) - (b.sortNum || 0))
)

// ── 行树结构（通用，基于 parentRowIndex，不限层级） ──────────
const rowMap = computed(() => {
  const m = {}
  props.rows.forEach(r => { m[r.rowIndex] = r })
  return m
})

const childrenOf = computed(() => {
  const m = {}
  props.rows.forEach(r => {
    if (r.parentRowIndex != null) {
      if (!m[r.parentRowIndex]) m[r.parentRowIndex] = []
      m[r.parentRowIndex].push(r.rowIndex)
    }
  })
  return m
})

// 收集某根节点的所有行索引（BFS，保持 props.rows 原始顺序）
function getGroupIndices(rootRowIndex) {
  const visited = new Set()
  const queue = [rootRowIndex]
  while (queue.length) {
    const ri = queue.shift()
    if (visited.has(ri)) continue
    visited.add(ri)
    ;(childrenOf.value[ri] || []).forEach(ci => queue.push(ci))
  }
  return visited
}

// 找两棵树的根：parentRowIndex == null 的行
const roots = computed(() => props.rows.filter(r => r.parentRowIndex == null))

// 树B：rowLabel 含"市级"的根（市级全部成立）
// 树A：其余根（省市县全部成立）
const groupB = computed(() => {
  const root = roots.value.find(r => r.rowLabel?.includes('市级'))
  if (!root) return []
  const idxSet = getGroupIndices(root.rowIndex)
  return props.rows.filter(r => idxSet.has(r.rowIndex))
})

const groupA = computed(() => {
  const bSet = new Set(groupB.value.map(r => r.rowIndex))
  return props.rows.filter(r => !bSet.has(r.rowIndex))
})

// ── 状态 ─────────────────────────────────────────────────
// checkbox valueMap: `${itemId}_${rowIndex}` -> true
const valueMap     = ref({})
// number valueMap:  itemId -> number
const numberValues = ref({})

watch(
  () => props.values,
  vals => {
    const cmap = {}
    const nmap = {}
    vals.forEach(v => {
      const isNullRow = v.rowIndex === null || v.rowIndex === undefined
      if (isNullRow) {
        nmap[v.itemId] = v.cellValue !== '' && v.cellValue != null ? Number(v.cellValue) : null
      } else if (v.cellValue === '1') {
        cmap[`${v.itemId}_${v.rowIndex}`] = true
      }
    })
    valueMap.value     = cmap
    numberValues.value = nmap
  },
  { immediate: true }
)

// ── 读值 ─────────────────────────────────────────────────
function getVal(itemId, rowIndex) {
  return !!valueMap.value[`${itemId}_${rowIndex}`]
}

// ── 写值（含递归级联） ────────────────────────────────────────
function setVal(itemId, rowIndex, checked) {
  _set(itemId, rowIndex, checked)
  cascadeDown(itemId, rowIndex, checked)
  bubbleUp(itemId, rowIndex)
  emitChange()
}

// 向下传播：勾选/取消父节点时，递归同步所有子孙
function cascadeDown(itemId, rowIndex, checked) {
  const children = childrenOf.value[rowIndex] || []
  children.forEach(ci => {
    _set(itemId, ci, checked)
    cascadeDown(itemId, ci, checked)
  })
}

function rowClass(row) {
  return {
    'row-l1': row.rowLevel === 1,
    'row-l2': row.rowLevel === 2,
    'row-l3': row.rowLevel === 3
  }
}

// 向上传播：子节点变更后，检查父节点是否应自动勾选/取消
function bubbleUp(itemId, rowIndex) {
  const row = rowMap.value[rowIndex]
  if (!row || row.parentRowIndex == null) return
  const parentRowIndex = row.parentRowIndex
  const siblings = childrenOf.value[parentRowIndex] || []
  const allChecked = siblings.every(si => !!valueMap.value[`${itemId}_${si}`])
  _set(itemId, parentRowIndex, allChecked)
  bubbleUp(itemId, parentRowIndex)
}

function _set(itemId, rowIndex, checked) {
  const key = `${itemId}_${rowIndex}`
  if (checked) {
    valueMap.value[key] = true
  } else {
    delete valueMap.value[key]
  }
}

// ── emit ──────────────────────────────────────────────────
function emitChange() {
  // checkbox rows
  const rowMap = {}
  Object.keys(valueMap.value).forEach(key => {
    const sep      = key.lastIndexOf('_')
    const itemId   = key.substring(0, sep)
    const rowIndex = Number(key.substring(sep + 1))
    if (!rowMap[rowIndex]) rowMap[rowIndex] = []
    rowMap[rowIndex].push({ itemId, value: '1' })
  })
  const rows = Object.entries(rowMap).map(([ri, cells]) => ({
    rowIndex: Number(ri),
    cells
  }))

  // number rows（rowIndex: null）
  numberItems.value.forEach(item => {
    const val = numberValues.value[item.id]
    if (val !== null && val !== undefined && val !== '') {
      rows.push({ rowIndex: null, cells: [{ itemId: item.id, value: String(val) }] })
    }
  })

  emit('update:rows', rows)
}
</script>

<style scoped>
.matrix-wrap { width: 100%; }

/* number 输入区 */
.number-section {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
  padding: 12px 0 16px;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 12px;
}
.number-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.number-label {
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
}
.number-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

/* 矩阵表格 */
.matrix-scroll {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 600px;
}
.matrix-table {
  border-collapse: collapse;
  font-size: 12px;
  white-space: nowrap;
}
.matrix-table th,
.matrix-table td {
  border: 1px solid #e4e7ed;
  padding: 4px 6px;
  text-align: center;
}
.label-th {
  position: sticky;
  left: 0;
  background: #f5f7fa;
  z-index: 3;
  min-width: 160px;
  max-width: 220px;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
}
.col-th {
  position: sticky;
  top: 0;
  background: #f5f7fa;
  z-index: 2;
  min-width: 80px;
  max-width: 100px;
  font-weight: 600;
  word-break: break-all;
  white-space: normal;
}
.col-name {
  max-width: 96px;
  white-space: normal;
  word-break: break-all;
  font-size: 11px;
  line-height: 1.4;
}
.label-td {
  position: sticky;
  left: 0;
  background: #fff;
  z-index: 1;
  text-align: left;
  min-width: 160px;
  max-width: 220px;
}
.cell-td { min-width: 44px; }

.row-l1 > .label-td,
.row-l1 > td {
  background: #f0f4ff;
  font-weight: 600;
}
.row-l1 > .label-td { background: #f0f4ff; }
.row-l3 > .label-td,
.row-l3 > td { color: #555; }

.group-separator > td {
  height: 6px;
  background: #e4e7ed;
  padding: 0;
  border: none;
}
.unchecked { color: #c0c4cc; font-size: 12px; }
</style>
