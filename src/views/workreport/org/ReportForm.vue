<template>
  <div>
    <el-page-header @back="router.back()">
      <template #content>{{ taskDetail.taskName || '填报表单' }}</template>
    </el-page-header>

    <!-- 驳回横幅 -->
    <el-alert
      v-if="record && record.status === 3"
      type="warning"
      :closable="false"
      style="margin-top:12px"
    >
      <template #title>
        <span>该记录已被驳回，请修改后重新提交。</span>
        <span v-if="record.auditRemark"> 驳回原因：{{ record.auditRemark }}</span>
        <span v-if="record.resubmitDeadline"> 重提截止：{{ record.resubmitDeadline }}</span>
      </template>
    </el-alert>

    <el-card shadow="never" style="margin-top:12px" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div>
            <el-tag v-if="isScore"  type="danger"  style="margin-right:8px">评分细则</el-tag>
            <el-tag v-else-if="isMatrix" type="warning" style="margin-right:8px">勾选矩阵</el-tag>
            <el-tag v-else type="primary" style="margin-right:8px">标准表头</el-tag>
            <span class="task-meta">截止日期：{{ taskDetail.deadline || '无限制' }}</span>
            <span v-if="taskDetail.remark" class="task-meta" style="margin-left:16px">备注：{{ taskDetail.remark }}</span>
          </div>
        </div>
      </template>

      <!-- 字数进度条（仅 form 类型） -->
      <div v-if="!isScore && charLimit.enabled" class="char-limit-bar">
        <span class="char-label">已填字数</span>
        <div class="bar-track">
          <div
            class="bar-fill"
            :class="{ warn: charPct >= 80, over: charLimit.current > charLimit.max }"
            :style="{ width: charPct + '%' }"
          />
        </div>
        <span class="char-count" :class="{ over: charLimit.current > charLimit.max }">
          {{ charLimit.current }} / {{ charLimit.max }} 字
        </span>
      </div>

      <!-- 评分细则进度摘要 -->
      <div v-if="isScore" class="score-progress-bar">
        <span class="sp-label">上传进度：</span>
        <span :class="scoreAllDone ? 'sp-ok' : 'sp-warn'">
          {{ scoreReachedCount }} / {{ scoreLeafCount }} 项已达标
        </span>
      </div>

      <!-- 矩阵填报 -->
      <CheckboxMatrixTable
        v-if="isMatrix"
        :items="templateItems"
        :rows="templateRows"
        :values="recordValues"
        :editable="canEdit"
        @update:rows="onRowsChange"
      />

      <!-- 标准多级表头 / 评分细则（均通过 DynamicHeaderTable 渲染） -->
      <DynamicHeaderTable
        v-else
        ref="tableRef"
        :items="templateItems"
        :values="recordValues"
        :editable="canEdit"
        :template-type="templateType"
        :record-id="recordId"
        :attachments="(isScore || hasAttachLeaves) ? attachments : null"
        @update:rows="onRowsChange"
        @upload-file="onTableUpload"
        @delete-file="onTableDelete"
        @need-record="handleNeedRecord"
      />

      <!-- 格式模板下载提示（inline 附件已嵌入表格，仅保留格式模板入口） -->
      <template v-if="!isMatrix && !isScore">
        <div
          v-for="leaf in requireAttachLeaves.filter(l => l.formatTemplateUrl)"
          :key="leaf.id"
          style="margin-top:8px;font-size:12px;color:#666"
        >
          <el-link type="primary" :href="leaf.formatTemplateUrl" target="_blank">
            下载格式模板：{{ leafHeaderLabel(leaf) }}
          </el-link>
        </div>
      </template>

      <!-- 整体附件（非评分模板） -->
      <template v-if="canEdit && !isScore">
        <div style="margin-top:16px">
          <div class="attach-label"><span>附件（可选）</span></div>
          <el-upload
            multiple
            :http-request="(opts) => uploadFile(opts, null)"
            :file-list="attachFileList(null)"
            :on-remove="(file) => removeAttachment(file, null)"
          >
            <el-button size="small" plain>选择文件</el-button>
          </el-upload>
        </div>
      </template>
    </el-card>

    <!-- 底部操作栏 -->
    <div v-if="canEdit" class="bottom-bar">
      <el-button v-if="!isScore" size="large" :loading="draftSaving" @click="saveDraft">保存草稿</el-button>
      <el-tooltip
        v-if="isScore && !scoreAllDone"
        content="请先完成所有必传指标"
        placement="top"
      >
        <span>
          <el-button type="primary" size="large" disabled>提 交</el-button>
        </span>
      </el-tooltip>
      <el-button
        v-else
        type="primary" size="large"
        :loading="submitting"
        @click="handleSubmit"
      >提 交</el-button>
    </div>

    <div v-else class="bottom-bar">
      <el-tag type="info" size="large">{{ record?.statusLabel || statusLabel(record?.status) }} — 只读模式</el-tag>
      <el-button @click="router.back()">返回</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTaskDetail } from '@/api/task'
import { getTemplateFullDetail, getTemplateDetail } from '@/api/template'
import { getMyRecord, getRecordDetail, saveRecord, submitRecord, getCharCount } from '@/api/record'
import { getAttachments, uploadAttachment, deleteAttachment } from '@/api/attachment'
import DynamicHeaderTable from '@/components/DynamicHeaderTable.vue'
import CheckboxMatrixTable from '@/components/CheckboxMatrixTable.vue'

const route  = useRoute()
const router = useRouter()
const taskId     = route.query.taskId
const templateId = route.query.templateId

const loading     = ref(true)
const draftSaving = ref(false)
const submitting  = ref(false)

// 字数进度条
const charLimit = reactive({ enabled: false, current: 0, max: 0 })
const charPct   = computed(() => charLimit.max > 0 ? Math.min(charLimit.current / charLimit.max * 100, 100) : 0)
let debounceTimer = null

const taskDetail    = ref({})
const templateItems = ref([])
const templateRows  = ref([])
const record        = ref(null)
const recordId      = ref(null)
const recordValues  = ref([])
const currentRows   = ref([])
const attachments   = ref([])

const templateType = ref('form')   // 'form' | 'score'
const isScore  = computed(() => templateType.value === 'score')
const isMatrix = computed(() =>
  !isScore.value && templateItems.value.some(i => i.valueType === 'checkbox')
)

const canEdit = computed(() => {
  const s = record.value?.status
  return s === undefined || s === null || s === 0 || s === 3
})

const requireAttachLeaves = computed(() =>
  templateItems.value.filter(i => i.isLeaf === 1 && i.requireAttachment > 0)
)
const hasAttachLeaves = computed(() => requireAttachLeaves.value.length > 0)

// score 进度
const scoreLeaves = computed(() =>
  isScore.value ? templateItems.value.filter(i => i.isLeaf === 1) : []
)
const scoreLeafCount = computed(() => scoreLeaves.value.length)
const scoreReachedCount = computed(() =>
  scoreLeaves.value.filter(l => {
    const cnt = attachments.value.filter(a => String(a.itemId) === String(l.id)).length
    return !l.minAttachments || cnt >= l.minAttachments
  }).length
)
const scoreAllDone = computed(() =>
  scoreLeafCount.value > 0 && scoreReachedCount.value === scoreLeafCount.value
)

function attachFileList(itemId) {
  return attachments.value
    .filter(a => (itemId ? a.itemId === itemId : !a.itemId))
    .map(a => ({ name: a.attachName, url: a.attachPath, uid: a.id }))
}

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const [taskRes, fullRes, tplRes] = await Promise.all([
      getTaskDetail(taskId),
      getTemplateFullDetail(templateId),
      getTemplateDetail(templateId).catch(() => null)
    ])
    taskDetail.value    = taskRes.data
    templateItems.value = fullRes.data.items || []
    templateRows.value  = fullRes.data.rows  || []
    if (tplRes?.data?.templateType) templateType.value = tplRes.data.templateType

    try {
      const recRes = await getMyRecord(taskId)
      if (recRes.data) {
        record.value   = recRes.data
        recordId.value = recRes.data.id
        const [detailRes, attachRes, countRes] = await Promise.all([
          getRecordDetail(recRes.data.id),
          getAttachments(recRes.data.id),
          getCharCount(recRes.data.id).catch(() => null)
        ])
        recordValues.value = detailRes.data.values || []
        attachments.value  = attachRes.data || []
        if (countRes?.data) {
          charLimit.enabled = countRes.data.enabled
          charLimit.current = countRes.data.currentChars
          charLimit.max     = countRes.data.maxTotalChars
        }
      }
    } catch { /* no record yet, start fresh */ }
  } finally { loading.value = false }
}

function onRowsChange(rows) {
  currentRows.value = rows
  if (!charLimit.enabled || !recordId.value) return
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(autoSaveAndCount, 500)
}

async function autoSaveAndCount() {
  try {
    const payload = { taskId, rows: currentRows.value, recordId: recordId.value }
    await saveRecord(payload)
    const countRes = await getCharCount(recordId.value)
    if (countRes?.data) {
      charLimit.current = countRes.data.currentChars
      charLimit.max     = countRes.data.maxTotalChars
    }
  } catch { /* silent — toast already handled by interceptor */ }
}

onBeforeUnmount(() => clearTimeout(debounceTimer))

async function saveDraft() {
  draftSaving.value = true
  try {
    const payload = { taskId, rows: currentRows.value }
    if (recordId.value) payload.recordId = recordId.value
    const res = await saveRecord(payload)
    if (!recordId.value && res.data) {
      recordId.value = res.data
      record.value = { status: 0 }
      const attachRes = await getAttachments(recordId.value)
      attachments.value = attachRes.data || []
    }
    ElMessage.success('草稿已保存')
  } finally { draftSaving.value = false }
}

async function handleSubmit() {
  if (isScore.value) {
    // score 模式：检查所有 minAttachments > 0 的叶子是否达标
    const missing = templateItems.value.filter(i =>
      i.isLeaf === 1 && i.minAttachments > 0 &&
      attachments.value.filter(a => String(a.itemId) === String(i.id)).length < i.minAttachments
    )
    if (missing.length) {
      ElMessage.warning(`以下指标未满足最少上传数量：${missing.map(i => i.itemName).join('、')}`)
      return
    }
  } else if (!isMatrix.value) {
    const missing = requireAttachLeaves.value.filter(l => {
      if (l.requireAttachment !== 1) return false
      return !attachments.value.some(a => a.itemId === l.id)
    })
    if (missing.length) {
      ElMessage.warning(`请先上传必传附件：${missing.map(l => l.itemName).join('、')}`)
      return
    }
  }

  try {
    await ElMessageBox.confirm('确认提交？提交后将进入审核流程。', '确认提交', { type: 'warning' })
  } catch { return }

  await saveDraft()

  submitting.value = true
  try {
    await submitRecord({ recordId: recordId.value })
    ElMessage.success('提交成功，等待审核')
    router.push('/org/record-list')
  } catch { /* interceptor already shows error toast (incl. 4032 字数超限) */ } finally { submitting.value = false }
}

// score 模式：ScoreUploadForm 需要 recordId 才能上传，先创建草稿
async function handleNeedRecord({ file, itemId }) {
  await saveDraft()
  if (recordId.value) {
    // 草稿创建完毕，重新触发上传
    try {
      const res = await uploadAttachment(recordId.value, itemId, file)
      attachments.value.push(res.data)
      ElMessage.success('上传成功')
    } catch { /* interceptor handles */ }
  }
}

async function uploadFile({ file }, itemId) {
  if (!recordId.value) {
    await saveDraft()
  }
  try {
    const res = await uploadAttachment(recordId.value, itemId, file)
    attachments.value.push(res.data)
    ElMessage.success('上传成功')
  } catch { ElMessage.error('上传失败') }
}

async function removeAttachment(file, itemId) {
  const att = attachments.value.find(a => a.id === file.uid || a.attachName === file.name)
  if (!att) return
  try {
    await deleteAttachment(att.id)
    attachments.value = attachments.value.filter(a => a.id !== att.id)
  } catch { ElMessage.error('删除失败') }
}

async function removeAttachmentById(attachId) {
  try {
    await deleteAttachment(attachId)
    attachments.value = attachments.value.filter(a => a.id !== attachId)
  } catch { ElMessage.error('删除失败') }
}

// DynamicHeaderTable score 模式事件：upload-file 传来的是 attachment 对象
function onTableUpload(attOrFile, itemId) {
  if (isScore.value) {
    // score 模式：DynamicHeaderTable 内部已完成上传，传来的是 attachment 对象
    attachments.value.push(attOrFile)
  } else {
    // form 模式内联附件：传来的是 (file, itemId)
    uploadFile({ file: attOrFile }, itemId)
  }
}
function onTableDelete(attachId) {
  removeAttachmentById(attachId)
}

const statusLabel = s => ({ 0: '草稿', 1: '待审核', 2: '已通过', 3: '已驳回' }[s] ?? '—')

function leafHeaderLabel(leaf) {
  const p = leaf.headerPath
  if (!p) return leaf.itemName
  if (Array.isArray(p)) return p.join(' / ')
  return String(p)
}
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.task-meta { font-size: 13px; color: #666; }
.attach-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}
.score-progress-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: #f8f9fc;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  font-size: 13px;
}
.sp-label { color: #909399; }
.sp-ok    { color: #67c23a; font-weight: 600; }
.sp-warn  { color: #e6a23c; font-weight: 600; }
.bottom-bar {
  position: sticky;
  bottom: 0;
  background: #fff;
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin: 16px -20px -20px;
}
.char-limit-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}
.char-label { font-size: 13px; color: #606266; white-space: nowrap; }
.bar-track {
  flex: 1;
  height: 6px;
  background: #e4e7ed;
  border-radius: 3px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: #4caf50;
  border-radius: 3px;
  transition: width 0.3s, background 0.3s;
}
.bar-fill.warn { background: #ff9800; }
.bar-fill.over { background: #f44336; }
.char-count { font-size: 13px; color: #606266; white-space: nowrap; }
.char-count.over { color: #f44336; font-weight: bold; }
</style>
