<template>
  <div class="dht-wrapper">
    <el-table
      :data="dataRows"
      border
      stripe
      style="width: 100%"
    >
      <!-- 序号列：score 模式下隐藏 -->
      <el-table-column v-if="!isScore" type="index" label="序号" width="55" align="center" fixed />

      <!-- 动态列（仅叶子节点） -->
      <el-table-column
        v-for="leaf in leafNodes"
        :key="leaf.id"
        :label="headerLabel(leaf)"
        :prop="leaf.id"
        :min-width="colMinWidth(leaf)"
        :align="isScore ? 'left' : colAlign(leaf)"
      >
        <template #header>
          <el-tooltip :content="headerLabel(leaf)" placement="top" :disabled="!hasPath(leaf)">
            <div>
              <div class="col-full-path" v-if="hasPath(leaf)">{{ headerLabel(leaf) }}</div>
              <div v-else>{{ leaf.itemName }}</div>
              <span v-if="leaf.unit && !isScore" class="unit-label">（{{ leaf.unit }}）</span>
              <!-- score 模式：列头显示约束提示 -->
              <div v-if="isScore" class="score-col-constraint">{{ scoreConstraintText(leaf) }}</div>
              <span v-else-if="leaf.requireAttachment === 1" style="color:red"> *</span>
            </div>
          </el-tooltip>
        </template>

        <template #default="{ row, $index }">

          <!-- ══ SCORE 模式：上传格子 ══ -->
          <template v-if="isScore">
            <div class="score-cell">
              <!-- 状态行 -->
              <div class="score-cell-top">
                <span class="score-badge" :class="scoreBadgeClass(leaf)">
                  {{ scoreBadgeText(leaf) }}
                </span>
              </div>
              <!-- placeholder 说明 -->
              <div v-if="leaf.placeholder" class="score-hint">{{ leaf.placeholder }}</div>
              <!-- 已上传文件 chips -->
              <div v-if="cellAttachments(leaf.id).length" class="score-chips">
                <div
                  v-for="att in cellAttachments(leaf.id)"
                  :key="att.id"
                  class="score-chip"
                >
                  <el-icon size="12" color="#409eff"><Document /></el-icon>
                  <el-link
                    :href="att.attachPath"
                    target="_blank"
                    type="primary"
                    class="chip-name"
                    :title="att.attachName"
                  >{{ att.attachName }}</el-link>
                  <el-button
                    v-if="editable"
                    type="danger" text size="small"
                    class="chip-del"
                    :loading="deleting[att.id]"
                    @click="handleScoreDelete(att.id)"
                  >删</el-button>
                </div>
              </div>
              <div v-else class="score-empty">暂无文件</div>
              <!-- 上传按钮 -->
              <el-upload
                v-if="editable"
                :show-file-list="false"
                :disabled="scoreIsDisabled(leaf) || uploading[leaf.id]"
                :http-request="(opts) => handleScoreUpload(opts.file, leaf.id)"
                style="margin-top:6px"
              >
                <el-button
                  size="small" plain
                  :type="scoreIsDisabled(leaf) ? 'info' : 'primary'"
                  :disabled="scoreIsDisabled(leaf)"
                  :loading="uploading[leaf.id]"
                >
                  {{ scoreIsDisabled(leaf) ? '已达上限' : '+ 上传文件' }}
                </el-button>
              </el-upload>
            </div>
          </template>

          <!-- ══ FORM 模式：文本/下拉/日期格子 ══ -->
          <template v-else>
            <!-- 编辑模式 -->
            <template v-if="editable">
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
            <!-- 只读模式 -->
            <div v-else :class="leaf.valueType === 'text' ? 'cell-text-ro' : 'cell-val-ro'">
              {{ dictLabel(leaf, row[leaf.id]) }}
            </div>

            <!-- form 模式内联附件（requireAttachment>0 且传了 attachments prop） -->
            <template v-if="inlineFormAttach && leaf.requireAttachment > 0 && $index === 0">
              <div class="inline-attach">
                <div
                  v-for="att in cellAttachments(leaf.id)"
                  :key="att.id"
                  class="inline-attach-row"
                >
                  <el-icon size="13" color="#409eff"><Document /></el-icon>
                  <el-link :href="att.attachPath" target="_blank" type="primary" class="attach-name">
                    {{ att.attachName }}
                  </el-link>
                  <el-button
                    v-if="editable"
                    type="danger" text size="small"
                    style="padding:0 2px"
                    @click="emit('delete-file', att.id)"
                  >删</el-button>
                </div>
                <el-upload
                  v-if="editable"
                  :show-file-list="false"
                  :http-request="(opts) => { emit('upload-file', opts.file, leaf.id); return Promise.resolve() }"
                  style="display:inline-block;margin-top:4px"
                >
                  <el-button size="small" plain style="font-size:11px;padding:2px 8px">
                    <el-icon><Upload /></el-icon> 上传
                    <el-tag
                      v-if="leaf.requireAttachment === 1"
                      type="danger" size="small"
                      style="margin-left:4px;transform:scale(.85)"
                    >必传</el-tag>
                  </el-button>
                </el-upload>
              </div>
            </template>
          </template>

        </template>
      </el-table-column>

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
import { computed, ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Upload } from '@element-plus/icons-vue'
import { getLeafNodes, valuesToMap, getRowIndices } from '@/utils/headerTree'
import { getDictItems } from '@/api/dict'
import { uploadAttachment, deleteAttachment } from '@/api/attachment'

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

const isScore = computed(() => props.templateType === 'score')

// form 模式内联附件开关（attachments 不为 null 时激活）
const inlineFormAttach = computed(() => !isScore.value && props.attachments !== null)

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
  if (isScore.value) return
  const rows = dataRows.value.map((row, idx) => ({
    rowIndex: idx + 1,
    cells: getLeafNodes(props.items).map(l => ({
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
  if (!min) return cnt > 0 ? `✓ ${cnt} 个` : '可选'
  if (cnt === 0)    return '✗ 未上传'
  if (cnt < min)    return `⚠ 还需 ${min - cnt} 个`
  return `✓ ${cnt} 个`
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
    emit('upload-file', res.data)      // 传 attachment 对象给父组件
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

// ── 通用工具 ────────────────────────────────────────────
function colMinWidth(leaf) {
  if (isScore.value)                   return 180
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

function headerLabel(leaf) {
  const p = leaf.headerPath
  if (!p) return leaf.itemName
  if (Array.isArray(p)) return p.join(' / ')
  return String(p)
}

function hasPath(leaf) {
  const p = leaf.headerPath
  if (!p) return false
  return Array.isArray(p) ? p.length > 1 : false
}

// 供父组件查 score 进度
const scoreProgress = computed(() => {
  if (!isScore.value) return null
  const leaves = leafNodes.value
  const reached = leaves.filter(scoreIsReached).length
  return { reached, total: leaves.length }
})
defineExpose({ scoreProgress })
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
.score-col-constraint {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

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
.cell-text-ro { white-space: pre-wrap; word-break: break-word; line-height: 1.6; text-align: left; min-height: 44px; }
.cell-val-ro  { line-height: 1.6; }

/* ── Score 单元格 ── */
.score-cell { padding: 2px 0; }
.score-cell-top { margin-bottom: 6px; }

.score-badge { font-size: 12px; font-weight: 500; padding: 1px 7px; border-radius: 10px; }
.badge-ok   { color: #67c23a; background: #f0f9eb; }
.badge-warn { color: #e6a23c; background: #fdf6ec; }
.badge-fail { color: #f56c6c; background: #fef0f0; }
.badge-none { color: #909399; background: #f5f5f5; }

.score-hint  { font-size: 11px; color: #c0c4cc; margin-bottom: 6px; line-height: 1.4; }
.score-empty { font-size: 12px; color: #c0c4cc; margin: 4px 0; }

.score-chips { display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px; }
.score-chip {
  display: flex; align-items: center; gap: 5px;
  background: #f5f7fa; border: 1px solid #e4e7ed;
  border-radius: 4px; padding: 3px 7px;
  font-size: 12px;
}
.chip-name {
  flex: 1; font-size: 12px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 150px;
}
.chip-del { padding: 0 2px; font-size: 11px; flex-shrink: 0; }

/* ── Form 内联附件 ── */
.inline-attach { margin-top: 6px; border-top: 1px dashed #e4e7ed; padding-top: 6px; }
.inline-attach-row { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
.attach-name { font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
