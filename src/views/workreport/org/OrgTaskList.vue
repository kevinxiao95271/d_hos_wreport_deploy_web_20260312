<template>
  <div>
    <div class="page-title">
      <h3>上报任务</h3>
      <p class="sub-title">以下为当前进行中的上报任务，请在截止日期前完成填报</p>
    </div>

    <div v-loading="loading">
      <el-row :gutter="16" v-if="displayTaskList.length">
        <el-col v-for="task in displayTaskList" :key="task.id" :xs="24" :sm="12" :lg="8" style="margin-bottom:16px">
          <el-card
            class="task-card"
            :class="{ 'task-card--disabled': isTaskExpired(task) }"
            shadow="hover"
            @click="handleCardClick(task)"
          >
            <div class="task-header">
              <span class="task-name">{{ task.taskName }}</span>
              <el-tag :type="getRecordStatusType(recordStatusMap[task.id])" size="small">
                {{ getRecordStatusLabel(recordStatusMap[task.id]) }}
              </el-tag>
            </div>
            <div class="task-meta">
              <div><el-icon><Calendar /></el-icon> 统计年度：{{ task.statYear || '—' }}</div>
              <div v-if="task.deadline">
                <el-icon><Clock /></el-icon> 截止：{{ task.deadline }}
                <el-tag v-if="getDaysLeft(task.deadline) <= 3 && getDaysLeft(task.deadline) >= 0" type="danger" size="small" style="margin-left:6px">
                  还剩 {{ getDaysLeft(task.deadline) }} 天
                </el-tag>
                <el-tag v-if="getDaysLeft(task.deadline) < 0" type="danger" size="small" style="margin-left:6px">已截止</el-tag>
              </div>
              <div v-if="task.remark" class="task-remark">
                <el-icon><InfoFilled /></el-icon> {{ task.remark }}
              </div>
            </div>
            <div class="task-footer">
              <el-button type="primary" size="small" :disabled="isTaskExpired(task)">
                {{ recordStatusMap[task.id] === 0 ? '继续填报' : '开始填报' }}
                <el-icon class="el-icon--right"><ArrowRight /></el-icon>
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-else description="暂无进行中的上报任务" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getActiveTasks } from '@/api/task'
import { getMyRecord } from '@/api/record'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const taskList = ref([])
const recordStatusMap = ref({})
const displayTaskList = computed(() =>
  (taskList.value || []).filter(task => {
    const status = recordStatusMap.value[task.id]
    return status === 0 || status === undefined || status === null
  })
)

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const res = await getActiveTasks()
    taskList.value = res.data || []
    // Load record status for each task
    await Promise.allSettled(
      taskList.value.map(async task => {
        try {
          const r = await getMyRecord(task.id)
          if (r.data) recordStatusMap.value[task.id] = r.data.status
        } catch { /* no record yet */ }
      })
    )
  } finally { loading.value = false }
}

function getDaysLeft(deadline) {
  if (!deadline) return 999
  return dayjs(deadline).diff(dayjs(), 'day')
}

function isTaskExpired(task) {
  return !!(task?.deadline && dayjs().isAfter(dayjs(task.deadline)))
}

function handleCardClick(task) {
  if (isTaskExpired(task)) return
  goForm(task)
}

function goForm(task) {
  if (task.taskType === 'daily_work') {
    router.push(`/dw/record/${task.id}`)
  } else {
    router.push({ path: '/org/report-form', query: { taskId: task.id, templateId: task.templateId } })
  }
}

const getRecordStatusLabel = s => ({ 0: '草稿', 1: '待审核', 2: '已通过', 3: '已驳回' }[s] ?? '未填报')
const getRecordStatusType  = s => ({ 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }[s] ?? '')
</script>

<style scoped>
.page-title { margin-bottom: 20px; }
.page-title h3 { margin: 0 0 4px; font-size: 18px; }
.sub-title { margin: 0; color: #666; font-size: 13px; }
.task-card { cursor: pointer; transition: transform .2s; }
.task-card:hover { transform: translateY(-2px); }
.task-card--disabled { cursor: not-allowed; opacity: .72; }
.task-card--disabled:hover { transform: none; }
.task-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.task-name { font-size: 15px; font-weight: 600; color: #1a3a5c; flex: 1; padding-right: 8px; }
.task-meta { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #666; margin-bottom: 16px; }
.task-meta .el-icon { vertical-align: middle; margin-right: 4px; }
.task-remark { color: #999; }
.task-footer { display: flex; justify-content: flex-end; }
</style>
