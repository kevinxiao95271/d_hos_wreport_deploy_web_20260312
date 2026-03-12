<template>
  <div class="matrix-wrap">
    <div class="matrix-scroll">
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="label-th" rowspan="1">项目</th>
            <th v-for="col in items" :key="col.id" class="col-th">
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
              'row-l3': row.rowLevel === 3,
              'row-select-all': isSelectAllRow(row)
            }"
          >
            <td class="label-td">
              <span :style="{ paddingLeft: levelIndent[row.rowLevel] + 'px' }">
                {{ row.rowLabel }}
                <el-tooltip v-if="editable && isSelectAllRow(row)" content="勾选后该列所有行自动全选" placement="right">
                  <el-icon style="vertical-align:middle;margin-left:4px;color:#e6a23c"><InfoFilled /></el-icon>
                </el-tooltip>
              </span>
            </td>
            <td v-for="col in items" :key="col.id" class="cell-td">
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
import { ref, watch } from 'vue'
import { Select, InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
  items:    { type: Array,   default: () => [] },
  rows:     { type: Array,   default: () => [] },
  values:   { type: Array,   default: () => [] },
  editable: { type: Boolean, default: false }
})

const emit = defineEmits(['update:rows'])

const levelIndent = { 1: 0, 2: 16, 3: 32 }

// valueMap: `${itemId}_${rowIndex}` -> boolean
const valueMap = ref({})

watch(
  () => props.values,
  vals => {
    const map = {}
    vals.forEach(v => {
      if (v.cellValue === '1') map[`${v.itemId}_${v.rowIndex}`] = true
    })
    valueMap.value = map
  },
  { immediate: true }
)

function getVal(itemId, rowIndex) {
  return !!valueMap.value[`${itemId}_${rowIndex}`]
}

// "省市县全部成立" 行：勾选 → 整列全选，取消 → 整列清空
function isSelectAllRow(row) {
  return row.rowLevel === 1 && row.rowLabel?.includes('省市县全部成立')
}

function setVal(itemId, rowIndex, checked, row) {
  const key = `${itemId}_${rowIndex}`
  if (checked) {
    valueMap.value[key] = true
  } else {
    delete valueMap.value[key]
  }

  if (row && isSelectAllRow(row)) {
    props.rows.forEach(r => {
      const k = `${itemId}_${r.rowIndex}`
      if (checked) {
        valueMap.value[k] = true
      } else {
        delete valueMap.value[k]
      }
    })
  }

  emitChange()
}

function emitChange() {
  const rowMap = {}
  Object.keys(valueMap.value).forEach(key => {
    const sep = key.lastIndexOf('_')
    const itemId   = key.substring(0, sep)
    const rowIndex = Number(key.substring(sep + 1))
    if (!rowMap[rowIndex]) rowMap[rowIndex] = []
    rowMap[rowIndex].push({ itemId, value: '1' })
  })
  const rows = Object.entries(rowMap).map(([ri, cells]) => ({
    rowIndex: Number(ri),
    cells
  }))
  emit('update:rows', rows)
}
</script>

<style scoped>
.matrix-wrap {
  width: 100%;
  overflow: hidden;
}
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
.cell-td {
  min-width: 44px;
}
.row-l1 > .label-td,
.row-l1 > td {
  background: #f0f4ff;
  font-weight: 600;
}
.row-l1 > .label-td {
  background: #f0f4ff;
}
.row-l3 > .label-td,
.row-l3 > td {
  color: #555;
}
.row-select-all > .label-td,
.row-select-all > td {
  background: #fdf6ec !important;
  border-top: 2px solid #e6a23c;
  border-bottom: 2px solid #e6a23c;
}
.unchecked {
  color: #c0c4cc;
  font-size: 12px;
}
</style>
