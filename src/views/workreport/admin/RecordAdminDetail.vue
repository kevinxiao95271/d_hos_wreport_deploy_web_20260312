<template>
  <div>
    <el-page-header @back="router.back()">
      <template #content>上报详情</template>
    </el-page-header>

    <el-row :gutter="16" style="margin-top:16px" v-loading="loading">
      <el-col :span="24">
        <!-- 基本信息卡 -->
        <el-card shadow="never">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="机构名称">{{ record.orgName || `ID:${record.orgId}` }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ record.submitTime || '未提交' }}</el-descriptions-item>
            <el-descriptions-item label="当前状态">
              <el-tag :type="statusType(record.status)">{{ record.statusLabel || statusLabel(record.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="record.auditTime" label="审核时间">{{ record.auditTime }}</el-descriptions-item>
            <el-descriptions-item v-if="record.auditRemark" label="审核意见" :span="2">{{ record.auditRemark }}</el-descriptions-item>
            <el-descriptions-item v-if="record.resubmitDeadline" label="重提截止">{{ record.resubmitDeadline }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 填报数据卡 -->
        <el-card shadow="never" style="margin-top:12px">
          <template #header>
            <span>填报数据</span>
            <el-tag v-if="isMatrix" type="warning" size="small" style="margin-left:8px">勾选矩阵</el-tag>
          </template>
          <CheckboxMatrixTable
            v-if="isMatrix"
            :items="templateItems"
            :rows="templateRows"
            :values="recordValues"
            :editable="false"
          />
          <DynamicHeaderTable
            v-else
            :items="templateItems"
            :values="recordValues"
            :editable="false"
          />
        </el-card>

        <!-- 附件区 -->
        <el-card v-if="attachments.length" shadow="never" style="margin-top:12px">
          <template #header><span>附件列表</span></template>
          <el-table :data="attachments" border size="small">
            <el-table-column prop="attachName" label="文件名" min-width="200" />
            <el-table-column label="所属节点" min-width="150">
              <template #default="{ row }">{{ itemNameMap[row.itemId] || '整体附件' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-link type="primary" :href="row.attachPath" target="_blank">下载</el-link>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 审核操作栏（status=1 待审核时显示） -->
        <el-card v-if="record.status === 1" shadow="never" style="margin-top:12px">
          <template #header><span>审核操作</span></template>
          <el-form :model="auditForm" label-width="100px">
            <el-form-item label="审核意见">
              <el-input v-model="auditForm.auditRemark" type="textarea" :rows="3" placeholder="请输入审核意见（驳回时必填）" />
            </el-form-item>
            <el-form-item v-if="auditForm.auditResult === 2" label="重提截止日期">
              <el-date-picker
                v-model="auditForm.resubmitDeadline"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择重新提交截止日期"
                style="width:240px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="success" :loading="auditing" @click="doAudit(1)">
                <el-icon><Check /></el-icon> 审核通过
              </el-button>
              <el-button type="danger" :loading="auditing" @click="auditForm.auditResult = 2; doAudit(2)">
                <el-icon><Close /></el-icon> 驳回
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRecordDetail, auditRecord } from '@/api/record'
import { getAttachments } from '@/api/attachment'
import DynamicHeaderTable from '@/components/DynamicHeaderTable.vue'
import CheckboxMatrixTable from '@/components/CheckboxMatrixTable.vue'

const route  = useRoute()
const router = useRouter()
const recordId = route.query.recordId

const loading  = ref(true)
const auditing = ref(false)
const record   = ref({})
const recordValues  = ref([])
const templateItems = ref([])
const templateRows  = ref([])
const attachments   = ref([])

const auditForm = reactive({ auditResult: 1, auditRemark: '', resubmitDeadline: '' })

const isMatrix = computed(() =>
  templateItems.value.some(i => i.valueType === 'checkbox')
)

const itemNameMap = computed(() => {
  const m = {}
  templateItems.value.forEach(i => { m[i.id] = i.itemName })
  return m
})

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const [detailRes, attachRes] = await Promise.all([
      getRecordDetail(recordId),
      getAttachments(recordId)
    ])
    const detail = detailRes.data
    record.value        = detail.record
    recordValues.value  = detail.values || []
    templateRows.value  = detail.rows   || []
    templateItems.value = detail.items  || []
    attachments.value   = attachRes.data || []
  } finally { loading.value = false }
}

async function doAudit(result) {
  if (result === 2) {
    if (!auditForm.auditRemark) { ElMessage.warning('驳回时请填写审核意见'); return }
    if (!auditForm.resubmitDeadline) { ElMessage.warning('驳回时请选择重新提交截止日期'); return }
    try {
      await ElMessageBox.confirm('确认驳回该上报记录？', '确认驳回', { type: 'warning' })
    } catch { return }
  } else {
    try {
      await ElMessageBox.confirm('确认审核通过？', '确认', { type: 'warning' })
    } catch { return }
  }
  auditing.value = true
  try {
    const payload = { recordId, auditResult: result, auditRemark: auditForm.auditRemark }
    if (result === 2) payload.resubmitDeadline = auditForm.resubmitDeadline
    await auditRecord(payload)
    ElMessage.success(result === 1 ? '已通过' : '已驳回')
    loadAll()
  } finally { auditing.value = false }
}

const statusLabel = s => ({ 0: '草稿', 1: '待审核', 2: '已通过', 3: '已驳回' }[s] ?? '—')
const statusType  = s => ({ 0: 'info',  1: 'warning', 2: 'success', 3: 'danger' }[s] ?? '')
</script>
