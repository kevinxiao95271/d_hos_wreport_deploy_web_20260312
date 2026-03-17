<template>
  <div class="dht-wrapper">
    <el-table
      :data="dataRows"
      border
      stripe
      style="width: 100%"
    >
      <!-- 序号列 -->
      <el-table-column type="index" label="序号" width="55" align="center" fixed />

      <!-- 动态列（仅叶子节点） -->
      <el-table-column
        v-for="leaf in leafNodes"
        :key="leaf.id"
        :label="headerLabel(leaf)"
        :prop="leaf.id"
        :min-width="colMinWidth(leaf)"
        :align="colAlign(leaf)"
      >
        <template #header>
          <el-tooltip :content="headerLabel(leaf)" placement="top" :disabled="!hasPath(leaf)">
            <div>
              <div class="col-full-path" v-if="hasPath(leaf)">{{ headerLabel(leaf) }}</div>
              <div v-else>{{ leaf.itemName }}</div>
              <span v-if="leaf.unit" class="unit-label">（{{ leaf.unit }}）</span>
              <span v-if="leaf.requireAttachment === 1" style="color:red"> *</span>
            </div>
          </el-tooltip>
        </template>
        <template #default="{ row, $index }">
          <!-- 编辑模式 -->
          <template v-if="editable">
            <!-- 字典下拉（优先级最高） -->
            <el-select
              v-if="leaf.dictCode"
              v-model="row[leaf.id]"
              style="width:100%"
              clearable
              @change="emitChange"
            >
              <el-option
                v-for="opt in dictsCache[leaf.dictCode] || []"
                :key="opt.itemValue"
                :label="opt.itemLabel"
                :value="opt.itemValue"
              />
            </el-select>
            <!-- 普通控件 -->
            <el-input
              v-else-if="leaf.valueType === 'text'"
              v-model="row[leaf.id]"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 8 }"
              :placeholder="leaf.placeholder || ''"
              @change="emitChange"
            />
            <el-input
              v-else-if="leaf.valueType === 'number'"
              v-model="row[leaf.id]"
              type="number"
              :placeholder="leaf.placeholder || ''"
              @change="emitChange"
            />
            <el-date-picker
              v-else-if="leaf.valueType === 'date'"
              v-model="row[leaf.id]"
              type="date"
              value-format="YYYY-MM-DD"
              style="width:100%"
              @change="emitChange"
            />
            <el-select
              v-else-if="leaf.valueType === 'select'"
              v-model="row[leaf.id]"
              style="width:100%"
              @change="emitChange"
            >
              <el-option
                v-for="opt in parseOptions(leaf.placeholder)"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <el-input v-else v-model="row[leaf.id]" @change="emitChange" />
          </template>
          <!-- 只读模式：字典字段显示 label，文本类型自动换行 -->
          <div v-else :class="leaf.valueType === 'text' ? 'cell-text-ro' : 'cell-val-ro'">
            {{ dictLabel(leaf, row[leaf.id]) }}
          </div>
        </template>
      </el-table-column>

      <!-- 操作列（编辑模式） -->
      <el-table-column v-if="editable" label="操作" width="80" align="center" fixed="right">
        <template #default="{ $index }">
          <el-button
            type="danger"
            link
            :disabled="dataRows.length <= 1"
            @click="removeRow($index)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="editable" class="add-row-btn">
      <el-button type="primary" plain @click="addRow">
        <el-icon><Plus /></el-icon> 新增行
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getLeafNodes, valuesToMap, getRowIndices } from '@/utils/headerTree'
import { getDictItems } from '@/api/dict'

const props = defineProps({
  items:    { type: Array, default: () => [] },
  values:   { type: Array, default: () => [] },
  editable: { type: Boolean, default: false }
})

const emit = defineEmits(['update:rows'])

const leafNodes = computed(() => getLeafNodes(props.items))

// dictCode → [{itemLabel, itemValue}]
const dictsCache = ref({})
watch(leafNodes, async (leaves) => {
  const codes = [...new Set(leaves.filter(l => l.dictCode).map(l => l.dictCode))]
  for (const code of codes) {
    if (!dictsCache.value[code]) {
      try {
        const res = await getDictItems(code)
        dictsCache.value[code] = res.data || []
      } catch { dictsCache.value[code] = [] }
    }
  }
}, { immediate: true })

// Internal row data: array of objects { [itemId]: value }
const dataRows = ref([])

watch(
  [() => props.items, () => props.values],
  () => initRows(),
  { immediate: true }
)

function initRows() {
  if (!props.items.length) return
  const leaves = getLeafNodes(props.items)
  const indices = getRowIndices(props.values)
  const vmap = valuesToMap(props.values)

  if (indices.length === 0) {
    dataRows.value = [makeEmptyRow(leaves)]
  } else {
    dataRows.value = indices.map(idx => {
      const row = makeEmptyRow(leaves)
      leaves.forEach(l => { row[l.id] = vmap[idx]?.[l.id] ?? '' })
      return row
    })
  }
  emitChange()
}

function makeEmptyRow(leaves) {
  const row = {}
  leaves.forEach(l => { row[l.id] = '' })
  return row
}

function addRow() {
  const leaves = getLeafNodes(props.items)
  dataRows.value.push(makeEmptyRow(leaves))
  emitChange()
}

function removeRow(index) {
  dataRows.value.splice(index, 1)
  emitChange()
}

function emitChange() {
  const rows = dataRows.value.map((row, idx) => ({
    rowIndex: idx + 1,
    cells: getLeafNodes(props.items).map(l => ({
      itemId: l.id,
      value: String(row[l.id] ?? '')
    }))
  }))
  emit('update:rows', rows)
}

function colMinWidth(leaf) {
  if (leaf.valueType === 'text') return 220
  if (leaf.valueType === 'date') return 150
  if (leaf.valueType === 'select' || leaf.dictCode) return 140
  return 120
}

function colAlign(leaf) {
  return leaf.valueType === 'text' ? 'left' : 'center'
}

function parseOptions(placeholder) {
  if (!placeholder) return []
  return placeholder.split(',').map(s => s.trim()).filter(Boolean)
}

// headerPath 可能是数组或字符串，统一转为 "A / B / C" 格式
// 只读时将字典值转回 label 展示
function dictLabel(leaf, val) {
  if (!leaf.dictCode || val == null || val === '') return val || '—'
  const opts = dictsCache.value[leaf.dictCode] || []
  const opt = opts.find(o => o.itemValue === val)
  return opt ? opt.itemLabel : val || '—'
}

function headerLabel(leaf) {
  const p = leaf.headerPath
  if (!p) return leaf.itemName
  if (Array.isArray(p)) return p.join(' / ')
  return String(p)
}

// 是否有多级路径（超过1段才显示路径）
function hasPath(leaf) {
  const p = leaf.headerPath
  if (!p) return false
  return Array.isArray(p) ? p.length > 1 : false
}
</script>

<style scoped>
.dht-wrapper { width: 100%; }
.unit-label { font-size: 12px; color: #999; }
.add-row-btn { margin-top: 10px; }
.col-full-path {
  font-size: 12px;
  line-height: 1.5;
  white-space: normal;
  word-break: break-word;
  color: #303133;
}

/* 覆盖 el-table 默认 white-space:nowrap，让单元格内容可换行 */
:deep(.el-table .cell) {
  padding: 8px 10px;
  white-space: normal !important;
  word-break: break-word;
}
:deep(.el-textarea__inner) {
  padding: 6px 8px;
  line-height: 1.6;
}
/* 只读：文本类型左对齐、保留换行 */
.cell-text-ro {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  text-align: left;
  min-height: 44px;
}
/* 只读：数值/下拉等居中即可 */
.cell-val-ro {
  line-height: 1.6;
}
</style>
