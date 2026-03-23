<template>
  <div class="score-card-wrap">
    <!-- ── 顶部进度摘要 ── -->
    <div class="score-summary">
      <div class="summary-left">
        <div class="summary-label">整体进度</div>
        <div class="summary-value">
          <span :class="allRequired ? 'ok' : 'warn'">{{ reachedCount }}</span>
          <span class="dim"> / {{ totalLeaves }} 项已达标</span>
        </div>
      </div>
      <div class="summary-divider" />
      <div class="summary-right">
        <div class="summary-label">预计得分</div>
        <div class="summary-value">
          <span :class="earnedScore >= maxScore ? 'ok' : 'warn'">{{ earnedScore }}</span>
          <span class="dim"> / {{ maxScore }} 分</span>
        </div>
      </div>
    </div>

    <!-- ── 卡片列表 ── -->
    <div
      v-for="section in sections"
      :key="section.id"
      class="section-card"
      :class="{ 'card-complete': isSectionComplete(section) }"
    >
      <!-- 卡片标题 -->
      <div class="card-header">
        <span class="card-title">{{ section.itemName }}</span>
        <el-tag
          v-if="section.scoreValue > 0"
          :type="isSectionComplete(section) ? 'success' : 'info'"
          size="small"
        >
          <template v-if="isSectionComplete(section)">✓ </template>
          {{ section.scoreValue }} 分
        </el-tag>
      </div>

      <!-- 叶子上传区 -->
      <div
        v-for="leaf in section.leaves"
        :key="leaf.id"
        class="upload-zone"
      >
        <!-- 上传区标题行 -->
        <div class="zone-header">
          <span class="zone-name">【{{ leaf.itemName }}】</span>
          <span class="zone-constraint">{{ constraintText(leaf) }}</span>
          <!-- 状态徽章 -->
          <span class="zone-badge" :class="badgeClass(leaf)">
            {{ badgeText(leaf) }}
          </span>
        </div>

        <!-- placeholder 说明 -->
        <div v-if="leaf.placeholder" class="zone-hint">{{ leaf.placeholder }}</div>

        <!-- 文件列表 -->
        <div v-if="leafFiles(leaf.id).length" class="file-chips">
          <div
            v-for="att in leafFiles(leaf.id)"
            :key="att.id"
            class="file-chip"
          >
            <el-icon size="13" color="#409eff"><Document /></el-icon>
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
              :loading="deleting[att.id]"
              class="chip-del"
              @click="handleDelete(att.id)"
            >删除</el-button>
          </div>
        </div>
        <div v-else-if="!editable" class="no-file">—</div>

        <!-- 上传按钮 -->
        <div v-if="editable" class="zone-upload-btn">
          <el-upload
            :show-file-list="false"
            :disabled="isDisabled(leaf)"
            :http-request="(opts) => handleUpload(opts.file, leaf.id)"
          >
            <el-button
              size="small"
              :type="isDisabled(leaf) ? 'info' : 'primary'"
              plain
              :disabled="isDisabled(leaf)"
              :loading="uploading[leaf.id]"
            >
              <el-icon v-if="!isDisabled(leaf)"><Upload /></el-icon>
              {{ isDisabled(leaf) ? '已达上限' : '+ 上传文件' }}
            </el-button>
          </el-upload>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Upload } from '@element-plus/icons-vue'
import { uploadAttachment, deleteAttachment } from '@/api/attachment'

const props = defineProps({
  items:       { type: Array,   default: () => [] },
  attachments: { type: Array,   default: () => [] },
  recordId:    { type: String,  default: null },
  editable:    { type: Boolean, default: true }
})

const emit = defineEmits(['attachment-added', 'attachment-removed', 'need-record'])

const uploading = reactive({})
const deleting  = reactive({})

// ── 树结构处理 ──────────────────────────────────────────
const idSet = computed(() => new Set(props.items.map(i => String(i.id))))

// 顶层节点（没有 parentId，或 parentId 不在本批 items 里）
const topLevel = computed(() =>
  props.items.filter(i => !i.parentId || !idSet.value.has(String(i.parentId)))
    .sort((a, b) => (a.sortNum || 0) - (b.sortNum || 0))
)

// 按 parentId 收集叶子
function getLeaves(node) {
  if (node.isLeaf === 1) return [node]
  const children = props.items
    .filter(i => String(i.parentId) === String(node.id))
    .sort((a, b) => (a.sortNum || 0) - (b.sortNum || 0))
  if (!children.length) return [node]   // 无子节点时自身视为叶子
  return children.flatMap(getLeaves)
}

// 每个顶层节点对应一张卡片
const sections = computed(() =>
  topLevel.value.map(s => ({ ...s, leaves: getLeaves(s) }))
)

const allLeaves = computed(() => sections.value.flatMap(s => s.leaves))

// ── 附件 & 状态 ──────────────────────────────────────────
function leafFiles(itemId) {
  return props.attachments.filter(a => String(a.itemId) === String(itemId))
}

function uploadedCount(leaf) { return leafFiles(leaf.id).length }

function isReached(leaf) {
  if (!leaf.minAttachments) return true
  return uploadedCount(leaf) >= leaf.minAttachments
}

function isDisabled(leaf) {
  return leaf.maxAttachments > 0 && uploadedCount(leaf) >= leaf.maxAttachments
}

function isSectionComplete(section) {
  return section.leaves.every(isReached)
}

// ── 进度 & 得分 ──────────────────────────────────────────
const totalLeaves  = computed(() => allLeaves.value.length)
const reachedCount = computed(() => allLeaves.value.filter(isReached).length)
const allRequired  = computed(() => reachedCount.value === totalLeaves.value)

const maxScore = computed(() =>
  sections.value.reduce((s, sec) => s + (sec.scoreValue || 0), 0)
)
const earnedScore = computed(() =>
  sections.value
    .filter(isSectionComplete)
    .reduce((s, sec) => s + (sec.scoreValue || 0), 0)
)

// 供父组件提交前检查
const canSubmit = computed(() =>
  allLeaves.value
    .filter(l => l.minAttachments > 0)
    .every(l => uploadedCount(l) >= l.minAttachments)
)
defineExpose({ canSubmit })

// ── 文案 ──────────────────────────────────────────────────
function constraintText(leaf) {
  const min = leaf.minAttachments || 0
  const max = leaf.maxAttachments || 0
  if (min === 0 && max === 0) return '可选'
  if (min > 0 && max === 1)   return `必须上传 1 个`
  if (min > 0 && max === 0)   return `至少上传 ${min} 个，数量不限`
  if (min > 0 && max > 1)     return `需上传 ${min}～${max} 个`
  if (min === 0 && max > 0)   return `最多 ${max} 个`
  return ''
}

function badgeClass(leaf) {
  const cnt = uploadedCount(leaf)
  const min = leaf.minAttachments || 0
  if (min === 0) return cnt > 0 ? 'badge-ok' : 'badge-none'
  if (cnt === 0)      return 'badge-fail'
  if (cnt < min)      return 'badge-warn'
  return 'badge-ok'
}

function badgeText(leaf) {
  const cnt = uploadedCount(leaf)
  const min = leaf.minAttachments || 0
  if (min === 0) return cnt > 0 ? `✓ 已上传 ${cnt} 个` : '可选'
  if (cnt === 0)      return '✗ 未上传'
  if (cnt < min)      return `⚠ 还需 ${min - cnt} 个`
  return `✓ 已上传 ${cnt} 个`
}

// ── 操作 ──────────────────────────────────────────────────
async function handleUpload(file, itemId) {
  if (!props.recordId) {
    emit('need-record', { file, itemId })
    return Promise.resolve()
  }
  uploading[itemId] = true
  try {
    const res = await uploadAttachment(props.recordId, itemId, file)
    emit('attachment-added', res.data)
    ElMessage.success('上传成功')
  } catch { /* interceptor handles */ } finally {
    uploading[itemId] = false
  }
  return Promise.resolve()
}

async function handleDelete(attachId) {
  deleting[attachId] = true
  try {
    await deleteAttachment(attachId)
    emit('attachment-removed', attachId)
  } catch { /* interceptor handles */ } finally {
    deleting[attachId] = false
  }
}
</script>

<style scoped>
/* ── 顶部摘要条 ── */
.score-summary {
  display: flex;
  align-items: center;
  background: #f8f9fc;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 14px 24px;
  margin-bottom: 20px;
  gap: 0;
}
.summary-left, .summary-right {
  flex: 1;
  text-align: center;
}
.summary-divider {
  width: 1px;
  height: 36px;
  background: #dcdfe6;
  margin: 0 24px;
}
.summary-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.summary-value { font-size: 20px; font-weight: 700; }
.summary-value .ok   { color: #67c23a; }
.summary-value .warn { color: #e6a23c; }
.summary-value .dim  { font-size: 13px; font-weight: 400; color: #909399; }

/* ── 卡片 ── */
.section-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.section-card.card-complete { border-color: #b3e19d; }
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}
.card-title { font-weight: 600; font-size: 14px; color: #303133; }

/* ── 上传区 ── */
.upload-zone {
  padding: 14px 16px;
  border-bottom: 1px dashed #f0f0f0;
}
.upload-zone:last-child { border-bottom: none; }

.zone-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
.zone-name       { font-weight: 500; font-size: 13px; color: #303133; }
.zone-constraint { font-size: 12px; color: #909399; }
.zone-hint       { font-size: 12px; color: #c0c4cc; margin-bottom: 8px; }

/* 状态徽章 */
.zone-badge { font-size: 12px; font-weight: 500; padding: 1px 6px; border-radius: 10px; }
.badge-ok   { color: #67c23a; background: #f0f9eb; }
.badge-warn { color: #e6a23c; background: #fdf6ec; }
.badge-fail { color: #f56c6c; background: #fef0f0; }
.badge-none { color: #909399; background: #f5f5f5; }

/* 文件列表（chip 样式） */
.file-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.file-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  max-width: 260px;
}
.chip-name {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.chip-del { padding: 0 2px; font-size: 11px; }
.no-file  { font-size: 12px; color: #c0c4cc; margin-bottom: 8px; }

.zone-upload-btn { margin-top: 4px; }
</style>
