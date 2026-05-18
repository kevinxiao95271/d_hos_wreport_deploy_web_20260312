<template>
  <div>
    <el-card class="search-card" shadow="never">
      <el-form inline :model="query">
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:120px">
            <el-option label="草稿" :value="0" />
            <el-option label="待审核" :value="1" />
            <el-option label="已通过" :value="2" />
            <el-option label="已驳回" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList(1)"><el-icon><Search /></el-icon> 查询</el-button>
          <el-button @click="query.status = null; loadList(1)">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header><span>我的上报记录</span></template>
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column label="任务名称" min-width="200">
          <template #default="{ row }">{{ taskMap[row.taskId] || `任务:${row.taskId}` }}</template>
        </el-table-column>
        <el-table-column prop="submitTime" label="提交时间" width="160" />
        <el-table-column prop="status" label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="auditRemark" label="审核意见" min-width="150" show-overflow-tooltip />
        <el-table-column prop="resubmitDeadline" label="重提截止" width="160" />
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 0 || row.status === 3"
              type="primary" text size="small"
              @click="goForm(row)"
            >继续填报</el-button>
            <el-button
              v-else
              type="primary" text size="small"
              @click="goDetail(row)"
            >查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @change="loadList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyRecordPage } from '@/api/record'
import { getActiveTasks } from '@/api/task'

const router = useRouter()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ pageNo: 1, pageSize: 10, status: null })
const taskMap = ref({})
const taskInfoMap = ref({})

onMounted(() => { loadList(); loadTaskMap() })

async function loadList(page) {
  if (page) query.pageNo = page
  loading.value = true
  try {
    const params = { pageNo: query.pageNo, pageSize: query.pageSize }
    if (query.status !== null && query.status !== '') params.status = query.status
    const res = await getMyRecordPage(params)
    list.value = res.data.records
    total.value = Number(res.data.total)
  } finally { loading.value = false }
}

async function loadTaskMap() {
  const res = await getActiveTasks()
  ;(res.data || []).forEach(t => {
    taskMap.value[t.id] = t.taskName
    taskInfoMap.value[t.id] = t
  })
}

function goForm(row) {
  const taskInfo = taskInfoMap.value[row.taskId] || {}
  const taskType = row.taskType || taskInfo.taskType
  const templateId = row.templateId || taskInfo.templateId

  if (taskType === 'daily_work') {
    router.push(`/dw/record/${row.taskId}`)
    return
  }

  router.push({ path: '/org/report-form', query: { taskId: row.taskId, templateId } })
}
function goDetail(row) {
  const taskInfo = taskInfoMap.value[row.taskId] || {}
  const taskType = row.taskType || taskInfo.taskType
  if (taskType === 'daily_work') {
    router.push(`/dw/record/${row.taskId}`)
    return
  }
  router.push({ path: '/org/record-detail', query: { recordId: row.id } })
}

const statusLabel = s => ({ 0: '草稿', 1: '待审核', 2: '已通过', 3: '已驳回' }[s] ?? '—')
const statusType  = s => ({ 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }[s] ?? '')
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px 0; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
