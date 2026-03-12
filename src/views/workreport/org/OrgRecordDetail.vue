<template>
  <div>
    <el-page-header @back="router.back()">
      <template #content>上报详情</template>
    </el-page-header>

    <div v-loading="loading" style="margin-top:16px">
      <!-- 驳回横幅 -->
      <el-alert
        v-if="record.status === 3"
        type="warning"
        :closable="false"
        style="margin-bottom:12px"
      >
        <template #title>
          已被驳回。<span v-if="record.auditRemark"> 原因：{{ record.auditRemark }}</span>
          <span v-if="record.resubmitDeadline"> 重提截止：{{ record.resubmitDeadline }}</span>
        </template>
      </el-alert>

      <el-card shadow="never">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="提交时间">{{ record.submitTime || '未提交' }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="statusType(record.status)">{{ record.statusLabel || statusLabel(record.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="record.auditTime" label="审核时间">{{ record.auditTime }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

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

      <el-card v-if="attachments.length" shadow="never" style="margin-top:12px">
        <template #header><span>附件</span></template>
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRecordDetail } from '@/api/record'
import { getAttachments } from '@/api/attachment'
import DynamicHeaderTable from '@/components/DynamicHeaderTable.vue'
import CheckboxMatrixTable from '@/components/CheckboxMatrixTable.vue'

const route  = useRoute()
const router = useRouter()
const recordId = route.query.recordId

const loading       = ref(true)
const record        = ref({})
const recordValues  = ref([])
const templateItems = ref([])
const templateRows  = ref([])
const attachments   = ref([])

const isMatrix = computed(() =>
  templateItems.value.some(i => i.valueType === 'checkbox')
)

const itemNameMap = computed(() => {
  const m = {}
  templateItems.value.forEach(i => { m[i.id] = i.itemName })
  return m
})

onMounted(async () => {
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
})

const statusLabel = s => ({ 0: '草稿', 1: '待审核', 2: '已通过', 3: '已驳回' }[s] ?? '—')
const statusType  = s => ({ 0: 'info',  1: 'warning', 2: 'success', 3: 'danger' }[s] ?? '')
</script>
