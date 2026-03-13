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
            <el-tag v-if="isMatrix" type="warning" style="margin-right:8px">勾选矩阵</el-tag>
            <el-tag v-else type="primary" style="margin-right:8px">标准表头</el-tag>
            <span class="task-meta">截止日期：{{ taskDetail.deadline || '无限制' }}</span>
            <span v-if="taskDetail.remark" class="task-meta" style="margin-left:16px">备注：{{ taskDetail.remark }}</span>
          </div>
        </div>
      </template>

      <!-- 矩阵填报 -->
      <CheckboxMatrixTable
        v-if="isMatrix"
        :items="templateItems"
        :rows="templateRows"
        :values="recordValues"
        :editable="canEdit"
        @update:rows="onRowsChange"
      />

      <!-- 标准多级表头填报 -->
      <DynamicHeaderTable
        v-else
        ref="tableRef"
        :items="templateItems"
        :values="recordValues"
        :editable="canEdit"
        @update:rows="onRowsChange"
      />

      <!-- 附件上传区（非矩阵模板才有节点级附件） -->
      <template v-if="canEdit && !isMatrix">
        <div v-for="leaf in requireAttachLeaves" :key="leaf.id" style="margin-top:16px">
          <div class="attach-label">
            <span>{{ leafHeaderLabel(leaf) }}</span>
            <el-tag v-if="leaf.requireAttachment === 1" type="danger" size="small">必传</el-tag>
            <el-tag v-else type="info" size="small">可选</el-tag>
            <el-link
              v-if="leaf.formatTemplateUrl"
              type="primary"
              :href="leaf.formatTemplateUrl"
              target="_blank"
              style="margin-left:8px;font-size:12px"
            >下载格式模板</el-link>
          </div>
          <el-upload
            v-if="recordId"
            multiple
            :http-request="(opts) => uploadFile(opts, leaf.id)"
            :file-list="attachFileList(leaf.id)"
            :on-remove="(file) => removeAttachment(file, leaf.id)"
          >
            <el-button size="small" type="primary" plain>选择文件</el-button>
          </el-upload>
        </div>
      </template>

      <!-- 整体附件 -->
      <template v-if="canEdit">
        <div style="margin-top:16px">
          <div class="attach-label"><span>附件（可选）</span></div>
          <el-upload
            v-if="recordId"
            multiple
            :http-request="(opts) => uploadFile(opts, null)"
            :file-list="attachFileList(null)"
            :on-remove="(file) => removeAttachment(file, null)"
          >
            <el-button size="small" plain>选择文件</el-button>
          </el-upload>
          <el-text v-else type="info" size="small">保存草稿后可上传附件</el-text>
        </div>
      </template>
    </el-card>

    <!-- 底部操作栏 -->
    <div v-if="canEdit" class="bottom-bar">
      <el-button size="large" :loading="draftSaving" @click="saveDraft">保存草稿</el-button>
      <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">提 交</el-button>
    </div>

    <div v-else class="bottom-bar">
      <el-tag type="info" size="large">{{ record?.statusLabel || statusLabel(record?.status) }} — 只读模式</el-tag>
      <el-button @click="router.back()">返回</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTaskDetail } from '@/api/task'
import { getTemplateFullDetail } from '@/api/template'
import { getMyRecord, getRecordDetail, saveRecord, submitRecord } from '@/api/record'
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

const taskDetail    = ref({})
const templateItems = ref([])
const templateRows  = ref([])
const record        = ref(null)
const recordId      = ref(null)
const recordValues  = ref([])
const currentRows   = ref([])
const attachments   = ref([])

const isMatrix = computed(() =>
  templateItems.value.some(i => i.valueType === 'checkbox')
)

const canEdit = computed(() => {
  const s = record.value?.status
  return s === undefined || s === null || s === 0 || s === 3
})

const requireAttachLeaves = computed(() =>
  templateItems.value.filter(i => i.isLeaf === 1 && i.requireAttachment > 0)
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
    const [taskRes, fullRes] = await Promise.all([
      getTaskDetail(taskId),
      getTemplateFullDetail(templateId)
    ])
    taskDetail.value    = taskRes.data
    templateItems.value = fullRes.data.items || []
    templateRows.value  = fullRes.data.rows  || []

    try {
      const recRes = await getMyRecord(taskId)
      if (recRes.data) {
        record.value   = recRes.data
        recordId.value = recRes.data.id
        const [detailRes, attachRes] = await Promise.all([
          getRecordDetail(recRes.data.id),
          getAttachments(recRes.data.id)
        ])
        recordValues.value = detailRes.data.values || []
        attachments.value  = attachRes.data || []
      }
    } catch { /* no record yet, start fresh */ }
  } finally { loading.value = false }
}

function onRowsChange(rows) { currentRows.value = rows }

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
  if (!isMatrix.value) {
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
  } finally { submitting.value = false }
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
</style>
