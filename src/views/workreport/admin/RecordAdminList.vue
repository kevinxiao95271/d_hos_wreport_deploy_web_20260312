<template>
  <div>
    <!-- 任务选择 -->
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="选择任务">
          <el-select
            v-model="selectedTaskId"
            placeholder="请选择任务"
            style="width:300px"
            @change="onTaskChange"
          >
            <el-option v-for="t in taskList" :key="t.id" :label="t.taskName" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="selectedTaskId">
          <el-button type="success" @click="handleExport" :loading="exporting">
            <el-icon><Download /></el-icon> 导出 Excel
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <template v-if="selectedTaskId">
      <!-- 状态统计卡 -->
      <el-row :gutter="12" style="margin-top:12px">
        <el-col :span="4" v-for="item in statCards" :key="item.key">
          <el-card
            shadow="never"
            class="stat-card"
            :class="[item.class, { 'stat-card--active': isStatActive(item.key) }]"
            @click="onStatCardClick(item.key)"
          >
            <div class="stat-num">{{ stats[item.key] ?? 0 }}</div>
            <div class="stat-label">{{ item.label }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 机构提交情况表格 -->
      <el-card shadow="never" style="margin-top:12px">
        <template #header>
          <div class="card-header">
            <span>机构提交情况</span>
            <el-input
              v-model="orgFilter"
              placeholder="按机构名筛选"
              clearable
              style="width:200px"
              @change="onOrgFilterChange"
            />
          </div>
        </template>

        <el-table :data="list" border stripe v-loading="loading">
          <el-table-column prop="orgName" label="机构名称" min-width="180">
            <template #default="{ row }">{{ row.orgName || `机构ID: ${row.orgId}` }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="recordStatusType(row.status)">{{ recordStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="撤回申请" width="110" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.rejectApplyStatus === 1" type="warning" size="small">待处理</el-tag>
              <span v-else style="color:#c0c4cc">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="rejectApplyReason" label="申请原因" min-width="140" show-overflow-tooltip />
          <el-table-column prop="submitTime" label="提交时间" width="160" />
          <el-table-column prop="auditTime" label="审核时间" width="160" />
          <el-table-column prop="auditRemark" label="审核意见" min-width="130" show-overflow-tooltip />
          <el-table-column label="操作" width="180" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" text size="small" @click="goDetail(row)">查看</el-button>
              <el-button
                v-if="row.rejectApplyStatus === 1"
                type="danger"
                text
                size="small"
                @click="openHandleReject(row)"
              >同意撤回</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="pageNo"
            v-model:page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            @change="loadRecords"
          />
        </div>
      </el-card>
    </template>

    <el-empty v-else description="请先选择一个任务" style="margin-top:40px" />

    <el-dialog v-model="handleVisible" title="处理撤回申请" width="560px" destroy-on-close>
      <el-descriptions v-if="handleRow" :column="1" border size="small" style="margin-bottom:12px">
        <el-descriptions-item label="机构">{{ handleRow.orgName || handleRow.orgId }}</el-descriptions-item>
        <el-descriptions-item label="申请原因">{{ handleRow.rejectApplyReason || '—' }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ handleRow.rejectApplyTime || '—' }}</el-descriptions-item>
      </el-descriptions>
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="处理意见" required>
          <el-input
            v-model="handleForm.handleRemark"
            type="textarea"
            :rows="3"
            placeholder="同意撤回时请填写处理意见"
          />
        </el-form-item>
        <el-form-item label="重提截止">
          <el-date-picker
            v-model="handleForm.resubmitDeadline"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="不填则默认 7 天后"
            style="width:240px"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button @click="submitHandleReject(false)">拒绝申请</el-button>
        <el-button type="danger" :loading="handleSaving" @click="submitHandleReject(true)">同意撤回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getTaskPage } from '@/api/task'
import { getAdminRecordPage, getAdminAggregate, exportRecord, handleRejectApply } from '@/api/record'

const router = useRouter()
const taskList = ref([])
const selectedTaskId = ref(null)
const loading = ref(false)
const exporting = ref(false)
const list = ref([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)
const orgFilter = ref('')
const statusFilter = ref(null)
const stats = ref({})
const handleVisible = ref(false)
const handleSaving = ref(false)
const handleRow = ref(null)
const handleForm = reactive({ handleRemark: '', resubmitDeadline: defaultDeadline() })

const statCards = [
  { key: 'total',     label: '应报总数', class: 'card-total' },
  { key: 'draft',     label: '草稿',     class: 'card-draft' },
  { key: 'submitted', label: '待审核',   class: 'card-submitted' },
  { key: 'approved',  label: '审核通过', class: 'card-approved' },
  { key: 'rejected',  label: '已驳回',   class: 'card-rejected' },
  { key: 'pendingRejectApply', label: '待处理撤回', class: 'card-pending-apply' }
]

const STATUS_FILTER_MAP = {
  draft: 0,
  submitted: 1,
  approved: 2,
  rejected: 3,
}

function isStatActive(key) {
  if (key === 'total') return !statusFilter.value
  return statusFilter.value === key
}

function onStatCardClick(key) {
  if (key === 'total') {
    statusFilter.value = null
  } else if (statusFilter.value === key) {
    statusFilter.value = null
  } else {
    statusFilter.value = key
  }
  pageNo.value = 1
  loadRecords()
}

function onOrgFilterChange() {
  pageNo.value = 1
  loadRecords()
}

function buildRecordQueryParams() {
  const params = {
    taskId: selectedTaskId.value,
    pageNum: pageNo.value,
    pageSize: pageSize.value,
  }
  if (orgFilter.value?.trim()) {
    params.orgName = orgFilter.value.trim()
  }
  if (statusFilter.value === 'pendingRejectApply') {
    params.rejectApplyStatus = 1
  } else if (statusFilter.value && STATUS_FILTER_MAP[statusFilter.value] != null) {
    params.status = STATUS_FILTER_MAP[statusFilter.value]
  }
  return params
}

async function onTaskChange() {
  pageNo.value = 1
  statusFilter.value = null
  orgFilter.value = ''
  await Promise.all([loadRecords(), loadStats()])
}

async function loadRecords() {
  if (!selectedTaskId.value) return
  loading.value = true
  try {
    const res = await getAdminRecordPage(buildRecordQueryParams())
    list.value = res.data.records
    total.value = Number(res.data.total)
  } finally { loading.value = false }
}

function defaultDeadline() {
  return dayjs().add(7, 'day').format('YYYY-MM-DD HH:mm:ss')
}

onMounted(loadTaskList)

async function loadTaskList() {
  const res = await getTaskPage({ pageNo: 1, pageSize: 100 })
  taskList.value = res.data.records || []
}

async function loadStats() {
  if (!selectedTaskId.value) return
  try {
    const res = await getAdminAggregate({ taskId: selectedTaskId.value })
    stats.value = res.data || {}
  } catch { /* ignore */ }
}

async function handleExport() {
  exporting.value = true
  try {
    const task = taskList.value.find(t => t.id === selectedTaskId.value)
    await exportRecord(selectedTaskId.value, task?.taskName)
  } finally {
    exporting.value = false
  }
}

function goDetail(row) {
  const task = taskList.value.find(t => t.id === selectedTaskId.value)
  if (task?.taskType === 'daily_work') {
    router.push({ path: '/admin/dw-view', query: { recordId: row.id } })
  } else {
    router.push({ path: '/admin/record-detail', query: { recordId: row.id, taskId: selectedTaskId.value } })
  }
}

function openHandleReject(row) {
  handleRow.value = row
  handleForm.handleRemark = ''
  handleForm.resubmitDeadline = defaultDeadline()
  handleVisible.value = true
}

async function submitHandleReject(approved) {
  const handleRemark = (handleForm.handleRemark || '').trim()
  if (approved && !handleRemark) {
    ElMessage.warning('同意撤回时请填写处理意见')
    return
  }
  const actionText = approved ? '同意撤回' : '拒绝该申请'
  try {
    await ElMessageBox.confirm(`确认${actionText}？`, '确认', { type: 'warning' })
  } catch {
    return
  }
  handleSaving.value = true
  try {
    const payload = {
      recordId: handleRow.value.id,
      approved,
      handleRemark
    }
    if (approved && handleForm.resubmitDeadline) {
      payload.resubmitDeadline = handleForm.resubmitDeadline
    }
    await handleRejectApply(payload)
    ElMessage.success(approved ? '已同意撤回，机构可重新填报' : '已拒绝申请')
    handleVisible.value = false
    await Promise.all([loadRecords(), loadStats()])
  } finally {
    handleSaving.value = false
  }
}

const recordStatusLabel = s => ({ 0: '草稿', 1: '待审核', 2: '已通过', 3: '已驳回' }[s] ?? '未提交')
const recordStatusType  = s => ({ 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }[s] ?? '')
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.stat-card { text-align: center; cursor: pointer; transition: box-shadow 0.2s, transform 0.15s; }
.stat-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.stat-card--active {
  box-shadow: 0 0 0 2px #409eff inset;
  transform: translateY(-1px);
}
.stat-card--active .stat-label { color: #409eff; font-weight: 600; }
.stat-num { font-size: 28px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }
.card-total :deep(.el-card__body) { background: #f0f9ff; }
.card-draft :deep(.el-card__body) { background: #f5f5f5; }
.card-submitted :deep(.el-card__body) { background: #fff7e6; }
.card-approved :deep(.el-card__body) { background: #f6ffed; }
.card-rejected :deep(.el-card__body) { background: #fff1f0; }
.card-pending-apply :deep(.el-card__body) { background: #fff7e6; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
