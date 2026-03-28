<template>
  <div class="dht-wrapper">
    <PreviewDialog ref="previewRef" />
    <el-table
      :data="dataRows"
      border
      stripe
      style="width: 100%"
    >
      <!-- 序号列：score 模式下隐藏 -->
      <el-table-column v-if="!isScore" type="index" label="序号" width="55" align="center" fixed />

      <!-- 树形列（递归渲染多级表头） -->
      <TableColumnGroup
        v-for="node in colTree"
        :key="node.id"
        :node="node"
      />

      <!-- 操作列（form 编辑模式） -->
      <el-table-column v-if="editable && !isScore" label="操作" width="80" align="center" fixed="right">
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

    <!-- 新增行按钮（form 模式） -->
    <div v-if="editable && !isScore" class="add-row-btn">
      <el-button type="primary" plain @click="addRow">
        <el-icon><Plus /></el-icon> 新增行
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, reactive, watch, provide } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Upload, Plus } from '@element-plus/icons-vue'
import { getLeafNodesFromTree, valuesToMap, getRowIndices } from '@/utils/headerTree'
import { getDictItems } from '@/api/dict'
import { uploadAttachment, deleteAttachment } from '@/api/attachment'
import TableColumnGroup from './TableColumnGroup.vue'
import PreviewDialog from './PreviewDialog.vue'

const props = defineProps({
  items:        { type: Array,   default: () => [] },
  values:       { type: Array,   default: () => [] },
  editable:     { type: Boolean, default: false },
  templateType: { type: String,  default: 'form' },  // 'form' | 'score'
  recordId:     { type: String,  default: null },
  // 可选：传入时在 form 模式叶子下内联显示附件
  attachments:  { type: Array,   default: null }
})

const emit = defineEmits(['update:rows', 'upload-file', 'delete-file', 'need-record'])

const previewRef = ref(null)
function previewFile(url, name) { previewRef.value?.show(url, name) }

const leafNodes = computed(() => getLeafNodesFromTree(props.items))

// 后端已返回嵌套树，直接使用（无需再 buildTree）
const colTree = computed(() => props.items)

// 任意叶子含 attachment 类型即为上传模式（不依赖 templateType 字段）
const isScore = computed(() =>
  props.templateType === 'score' ||
  leafNodes.value.some(l => l.valueType === 'attachment')
)

// form 模式内联附件：仅对非 attachment 叶子开启
const inlineFormAttach = computed(() => !isScore.value && props.attachments !== null)

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

// ── FORM 模式行数据 ──────────────────────────────────────
const dataRows = ref([])

watch(
  [() => props.items, () => props.values, isScore],
  () => {
    if (isScore.value) {
      dataRows.value = [{ _score: true }]   // 单占位行，仅用于渲染格子
    } else {
      initRows()
    }
  },
  { immediate: true }
)

function initRows() {
  if (!props.items.length) return
  const leaves = getLeafNodesFromTree(props.items)
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
  const leaves = getLeafNodesFromTree(props.items)
  dataRows.value.push(makeEmptyRow(leaves))
  emitChange()
}

function removeRow(index) {
  dataRows.value.splice(index, 1)
  emitChange()
}

function emitChange() {
  if (isScore.value) return
  const rows = dataRows.value.map((row, idx) => ({
    rowIndex: idx + 1,
    cells: getLeafNodesFromTree(props.items).map(l => ({
      itemId: l.id,
      value: String(row[l.id] ?? '')
    }))
  }))
  emit('update:rows', rows)
}

// ── SCORE 模式附件逻辑 ────────────────────────────────────
const uploading = reactive({})
const deleting  = reactive({})

function cellAttachments(itemId) {
  return (props.attachments || []).filter(a => String(a.itemId) === String(itemId))
}

function scoreUploadedCount(leaf) { return cellAttachments(leaf.id).length }

function scoreIsReached(leaf) {
  return !leaf.minAttachments || scoreUploadedCount(leaf) >= leaf.minAttachments
}

function scoreIsDisabled(leaf) {
  return leaf.maxAttachments > 0 && scoreUploadedCount(leaf) >= leaf.maxAttachments
}

function scoreBadgeClass(leaf) {
  const cnt = scoreUploadedCount(leaf)
  const min = leaf.minAttachments || 0
  if (!min) return cnt > 0 ? 'badge-ok' : 'badge-none'
  if (cnt === 0)    return 'badge-fail'
  if (cnt < min)    return 'badge-warn'
  return 'badge-ok'
}

function scoreBadgeText(leaf) {
  const cnt = scoreUploadedCount(leaf)
  const min = leaf.minAttachments || 0
  if (!min) return cnt > 0 ? `✓ 已上传 ${cnt} 个` : '可选'
  if (cnt === 0)    return '✗ 未上传'
  if (cnt < min)    return `⚠ 还需 ${min - cnt} 个`
  return `✓ 已上传 ${cnt} 个`
}

function scoreConstraintText(leaf) {
  const min = leaf.minAttachments || 0
  const max = leaf.maxAttachments || 0
  if (!min && !max) return '可选'
  if (min > 0 && max === 1) return '必须 1 个'
  if (min > 0 && max === 0) return `至少 ${min} 个`
  if (min > 0 && max > 1)   return `${min}～${max} 个`
  if (!min && max > 0)      return `最多 ${max} 个`
  return ''
}

async function handleScoreUpload(file, itemId) {
  if (!props.recordId) {
    emit('need-record', { file, itemId })
    return Promise.resolve()
  }
  uploading[itemId] = true
  try {
    const res = await uploadAttachment(props.recordId, itemId, file)
    emit('upload-file', res.data)
    ElMessage.success('上传成功')
  } catch { /* interceptor handles */ } finally {
    uploading[itemId] = false
  }
  return Promise.resolve()
}

async function handleScoreDelete(attachId) {
  deleting[attachId] = true
  try {
    await deleteAttachment(attachId)
    emit('delete-file', attachId)
    ElMessage.success('已删除')
  } catch { /* interceptor handles */ } finally {
    deleting[attachId] = false
  }
}

// form 内联附件事件代理
function onFormUploadFile(file, itemId) { emit('upload-file', file, itemId) }
function onFormDeleteFile(attachId)     { emit('delete-file', attachId) }

// ── 通用工具 ────────────────────────────────────────────
function colMinWidth(leaf) {
  if (leaf.valueType === 'attachment') return 180
  if (leaf.valueType === 'text')       return 220
  if (leaf.valueType === 'date')       return 150
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

function dictLabel(leaf, val) {
  if (!leaf.dictCode || val == null || val === '') return val || '—'
  const opts = dictsCache.value[leaf.dictCode] || []
  const opt = opts.find(o => o.itemValue === val)
  return opt ? opt.itemLabel : val || '—'
}

// 供父组件查 score 进度
const scoreProgress = computed(() => {
  if (!isScore.value) return null
  const leaves = leafNodes.value.filter(l => l.valueType === 'attachment')
  const reached = leaves.filter(scoreIsReached).length
  return { reached, total: leaves.length }
})
defineExpose({ scoreProgress })

// ── provide 给 TableColumnGroup ──────────────────────────
provide('dhtCtx', {
  editable:      computed(() => props.editable),
  isScore,
  inlineFormAttach,
  dictsCache,
  uploading,
  deleting,
  cellAttachments,
  scoreIsDisabled,
  scoreBadgeClass,
  scoreBadgeText,
  scoreConstraintText,
  colMinWidth,
  colAlign,
  dictLabel,
  parseOptions,
  handleScoreUpload,
  handleScoreDelete,
  onFormUploadFile,
  onFormDeleteFile,
  emitChange,
  previewFile,
})
</script>

<style scoped>
.dht-wrapper { width: 100%; }
.add-row-btn { margin-top: 10px; }

/* 覆盖 el-table 默认 white-space:nowrap */
:deep(.el-table .cell) {
  padding: 8px 10px;
  white-space: normal !important;
  word-break: break-word;
}
:deep(.el-textarea__inner) {
  padding: 6px 8px;
  line-height: 1.6;
}
</style>
