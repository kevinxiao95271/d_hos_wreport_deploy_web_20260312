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
          <tr
            v-for="row in rows"
            :key="row.rowIndex"
            :class="{
              'row-l1': row.rowLevel === 1,
              'row-l2': row.rowLevel === 2,
              'row-l3': row.rowLevel === 3
            }"
          >
            <td class="label-td">
              <span :style="{ paddingLeft: levelIndent[row.rowLevel] + 'px' }">
                {{ row.rowLabel }}
              </span>
            </td>
            <td v-for="col in checkboxItems" :key="col.id" class="cell-td">
              <el-checkbox
                v-if="editable"
                :model-value="getVal(col.id, row.rowIndex)"
                @change="v => setVal(col.id, row.rowIndex, v, row)"
              />
              <template v-else>
                <el-icon v-if="getVal(col.id, row.rowIndex)" color="#67c23a" style="vertical-align:middle"><Select /></el-icon>
                <span v-else class="unchecked">—</span>
              </template>
            </td>
          </tr>
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

// ── 行父子关系（Level 2 ↔ Level 3，仅基于 parentRowIndex） ──
const childrenOf = computed(() => {
  const map = {}
  props.rows.forEach(r => {
    if (r.rowLevel === 3 && r.parentRowIndex != null) {
      if (!map[r.parentRowIndex]) map[r.parentRowIndex] = []
      map[r.parentRowIndex].push(r.rowIndex)
    }
  })
  return map
})

const parentOf = computed(() => {
  const map = {}
  props.rows.forEach(r => {
    if (r.rowLevel === 3 && r.parentRowIndex != null) {
      map[r.rowIndex] = r.parentRowIndex
    }
  })
  return map
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

// ── 写值（含级联） ─────────────────────────────────────────
function setVal(itemId, rowIndex, checked, row) {
  _set(itemId, rowIndex, checked)

  if (row.rowLevel === 2) {
    // 勾选/取消 市 → 其下所有 县区 同步
    const children = childrenOf.value[rowIndex] || []
    children.forEach(ci => _set(itemId, ci, checked))

  } else if (row.rowLevel === 3) {
    const parentRowIndex = parentOf.value[rowIndex]
    if (parentRowIndex != null) {
      const siblings = childrenOf.value[parentRowIndex] || []
      if (checked) {
        // 所有县区都勾选 → 市自动勾选
        const allChecked = siblings.every(
          si => si === rowIndex || !!valueMap.value[`${itemId}_${si}`]
        )
        if (allChecked) _set(itemId, parentRowIndex, true)
      } else {
        // 任一县区取消 → 市取消
        _set(itemId, parentRowIndex, false)
      }
    }
  }

  emitChange()
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

.unchecked { color: #c0c4cc; font-size: 12px; }
</style>
