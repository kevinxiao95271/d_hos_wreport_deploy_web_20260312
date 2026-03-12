<template>
  <div class="dht-wrapper">
    <el-table
      :data="dataRows"
      border
      stripe
      size="small"
      style="width: 100%"
    >
      <!-- 序号列 -->
      <el-table-column type="index" label="序号" width="55" align="center" fixed />

      <!-- 动态列（仅叶子节点） -->
      <el-table-column
        v-for="leaf in leafNodes"
        :key="leaf.id"
        :label="leaf.itemName"
        :prop="leaf.id"
        min-width="120"
        align="center"
      >
        <template #header>
          <div>
            <span>{{ leaf.itemName }}</span>
            <span v-if="leaf.unit" class="unit-label">（{{ leaf.unit }}）</span>
            <span v-if="leaf.requireAttachment === 1" style="color:red"> *</span>
          </div>
        </template>
        <template #default="{ row, $index }">
          <!-- 编辑模式 -->
          <template v-if="editable">
            <el-input
              v-if="leaf.valueType === 'text' || leaf.valueType === 'number'"
              v-model="row[leaf.id]"
              :type="leaf.valueType === 'number' ? 'number' : 'text'"
              :placeholder="leaf.placeholder || ''"
              size="small"
              @change="emitChange"
            />
            <el-date-picker
              v-else-if="leaf.valueType === 'date'"
              v-model="row[leaf.id]"
              type="date"
              value-format="YYYY-MM-DD"
              size="small"
              style="width:100%"
              @change="emitChange"
            />
            <el-select
              v-else-if="leaf.valueType === 'select'"
              v-model="row[leaf.id]"
              size="small"
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
            <el-input v-else v-model="row[leaf.id]" size="small" @change="emitChange" />
          </template>
          <!-- 只读模式 -->
          <span v-else>{{ row[leaf.id] || '—' }}</span>
        </template>
      </el-table-column>

      <!-- 操作列（编辑模式） -->
      <el-table-column v-if="editable" label="操作" width="70" align="center" fixed="right">
        <template #default="{ $index }">
          <el-button
            type="danger"
            text
            size="small"
            :disabled="dataRows.length <= 1"
            @click="removeRow($index)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="editable" class="add-row-btn">
      <el-button type="primary" plain size="small" @click="addRow">
        <el-icon><Plus /></el-icon> 新增行
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getLeafNodes, valuesToMap, getRowIndices } from '@/utils/headerTree'

const props = defineProps({
  items:    { type: Array, default: () => [] },
  values:   { type: Array, default: () => [] },
  editable: { type: Boolean, default: false }
})

const emit = defineEmits(['update:rows'])

const leafNodes = computed(() => getLeafNodes(props.items))

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

function parseOptions(placeholder) {
  if (!placeholder) return []
  return placeholder.split(',').map(s => s.trim()).filter(Boolean)
}
</script>

<style scoped>
.dht-wrapper { width: 100%; }
.unit-label { font-size: 11px; color: #999; }
.add-row-btn { margin-top: 8px; }
</style>
