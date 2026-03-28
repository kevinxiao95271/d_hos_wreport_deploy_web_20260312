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
          <el-card shadow="never" class="stat-card" :class="item.class">
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
            <el-input v-model="orgFilter" placeholder="按机构名筛选" clearable style="width:200px" />
          </div>
        </template>

        <el-table :data="filteredList" border stripe v-loading="loading">
          <el-table-column prop="orgName" label="机构名称" min-width="200">
            <template #default="{ row }">{{ row.orgName || `机构ID: ${row.orgId}` }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="recordStatusType(row.status)">{{ recordStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="submitTime" label="提交时间" width="160" />
          <el-table-column prop="auditTime" label="审核时间" width="160" />
          <el-table-column prop="auditRemark" label="审核意见" min-width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="80" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" text size="small" @click="goDetail(row)">查看</el-button>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getTaskPage } from '@/api/task'
import { getAdminRecordPage, getAdminAggregate, exportRecord } from '@/api/record'

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
const stats = ref({})

const statCards = [
  { key: 'total',     label: '应报总数', class: 'card-total' },
  { key: 'draft',     label: '草稿',     class: 'card-draft' },
  { key: 'submitted', label: '待审核',   class: 'card-submitted' },
  { key: 'approved',  label: '审核通过', class: 'card-approved' },
  { key: 'rejected',  label: '已驳回',   class: 'card-rejected' }
]

const filteredList = computed(() => {
  if (!orgFilter.value) return list.value
  return list.value.filter(r => (r.orgName || '').includes(orgFilter.value))
})

onMounted(loadTaskList)

async function loadTaskList() {
  const res = await getTaskPage({ pageNo: 1, pageSize: 100 })
  taskList.value = res.data.records || []
}

async function onTaskChange() {
  pageNo.value = 1
  await Promise.all([loadRecords(), loadStats()])
}

async function loadRecords() {
  if (!selectedTaskId.value) return
  loading.value = true
  try {
    const res = await getAdminRecordPage({ taskId: selectedTaskId.value, pageNo: pageNo.value, pageSize: pageSize.value })
    list.value = res.data.records
    total.value = Number(res.data.total)
  } finally { loading.value = false }
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
  try { await exportRecord(selectedTaskId.value) } finally { exporting.value = false }
}

function goDetail(row) {
  const task = taskList.value.find(t => t.id === selectedTaskId.value)
  if (task?.taskType === 'daily_work') {
    router.push({ path: '/admin/dw-view', query: { recordId: row.id } })
  } else {
    router.push({ path: '/admin/record-detail', query: { recordId: row.id, taskId: selectedTaskId.value } })
  }
}

const recordStatusLabel = s => ({ 0: '草稿', 1: '待审核', 2: '已通过', 3: '已驳回' }[s] ?? '未提交')
const recordStatusType  = s => ({ 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }[s] ?? '')
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.stat-card { text-align: center; cursor: default; }
.stat-num { font-size: 28px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }
.card-total :deep(.el-card__body) { background: #f0f9ff; }
.card-draft :deep(.el-card__body) { background: #f5f5f5; }
.card-submitted :deep(.el-card__body) { background: #fff7e6; }
.card-approved :deep(.el-card__body) { background: #f6ffed; }
.card-rejected :deep(.el-card__body) { background: #fff1f0; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
