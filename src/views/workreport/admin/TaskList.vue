<template>
  <div>
    <el-card class="search-card" shadow="never">
      <el-form inline :model="query">
        <el-form-item label="任务名称">
          <el-input v-model="query.taskName" placeholder="请输入" clearable style="width:200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:120px">
            <el-option label="草稿" :value="0" />
            <el-option label="进行中" :value="1" />
            <el-option label="已结束" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="统计年度">
          <el-date-picker v-model="query.statYear" type="year" value-format="YYYY" placeholder="选择年份" style="width:130px" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList(1)"><el-icon><Search /></el-icon> 查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>任务列表</span>
          <el-button type="primary" @click="openDrawer(null)"><el-icon><Plus /></el-icon> 新建任务</el-button>
        </div>
      </template>

      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="taskName" label="任务名称" min-width="200" />
        <el-table-column label="类型/模板" min-width="160">
          <template #default="{ row }">
            <template v-if="row.taskType === 'daily_work'">
              <el-tag v-if="row.statQuarter == null" type="warning" size="small">年度任务</el-tag>
              <el-tag v-else type="success" size="small">Q{{ row.statQuarter }} 季度任务</el-tag>
            </template>
            <span v-else>{{ templateMap[row.templateId] || row.templateId || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="statYear" label="统计年度" width="100" align="center" />
        <el-table-column prop="deadline" label="截止日期" width="160" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160" />
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="openDrawer(row)" :disabled="row.status === 2">编辑</el-button>
            <el-button v-if="row.status === 0" type="success" text size="small" @click="changeStatus(row, 1)">发布</el-button>
            <el-button v-if="row.status === 1" type="warning" text size="small" @click="changeStatus(row, 2)">结束</el-button>
            <el-button type="primary" text size="small" @click="openScopeDialog(row)">分配机构</el-button>
            <el-button type="danger" text size="small" @click="handleDelete(row)" :disabled="row.status !== 0">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="loadList"
        />
      </div>
    </el-card>

    <!-- 新建/编辑抽屉 -->
    <el-drawer v-model="drawerVisible" :title="editData ? '编辑任务' : '新建任务'" size="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="任务类型">
          <el-radio-group v-model="form.taskType" :disabled="!!editData">
            <el-radio label="normal">普通模板上报</el-radio>
            <el-radio label="daily_work">日常工作填报</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="任务名称" prop="taskName">
          <el-input v-model="form.taskName" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item v-if="form.taskType === 'normal'" label="关联模板" prop="templateId">
          <el-select v-model="form.templateId" placeholder="请选择模板" style="width:100%">
            <el-option v-for="t in templateList" :key="t.id" :label="t.templateName" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.taskType === 'daily_work'" label="">
          <el-alert type="info" :closable="false" show-icon
            title="日常工作任务使用内置固定模块，无需选择模板" style="padding:6px 12px" />
        </el-form-item>
        <el-form-item v-if="form.taskType === 'daily_work'" label="任务周期">
          <el-radio-group v-model="form.dwPeriod" :disabled="!!editData">
            <el-radio label="quarter">季度任务（Q1–Q4）</el-radio>
            <el-radio label="annual">年度任务（全年汇总）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.taskType === 'daily_work'" label="统计年度" prop="statYear">
          <el-date-picker v-model="form.statYear" type="year" value-format="YYYY" style="width:100%" />
        </el-form-item>
        <el-form-item v-if="form.taskType === 'daily_work' && form.dwPeriod === 'quarter'" label="统计季度" prop="statQuarter">
          <el-select v-model="form.statQuarter" placeholder="请选择季度" style="width:100%" :disabled="!!editData">
            <el-option label="第一季度（Q1）" :value="1" />
            <el-option label="第二季度（Q2）" :value="2" />
            <el-option label="第三季度（Q3）" :value="3" />
            <el-option label="第四季度（Q4）" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="form.deadline" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-drawer>

    <!-- 分配机构对话框 -->
    <el-dialog
      v-model="scopeVisible"
      :title="scopeTaskName ? `分配上报机构 · ${scopeTaskName}` : '分配上报机构'"
      width="780px"
      top="6vh"
      class="scope-dialog"
      destroy-on-close
    >
      <div class="scope-dialog-body">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="未勾选任何机构并保存时，表示全部机构均可填报"
          style="margin-bottom: 14px"
        />

        <div class="scope-assigned">
          <div class="scope-assigned-head">
            <span class="scope-section-title">已分配机构</span>
            <span class="scope-section-count">{{ selectedOrgPreview.length }} 家</span>
          </div>
          <div v-if="selectedOrgPreview.length" class="assigned-org-tags">
            <el-tag
              v-for="o in selectedOrgPreview"
              :key="o.orgId"
              size="small"
              type="info"
              effect="plain"
              class="assigned-org-tag"
            >
              {{ o.orgName || '-' }}
            </el-tag>
          </div>
          <div v-else class="assigned-org-empty">暂未分配，保存后将视为全部机构可填报</div>
        </div>

        <div class="scope-section">
          <div class="scope-section-head">
            <span class="scope-section-title">选择机构</span>
            <span class="scope-section-count">可选 {{ filteredUsers.length }} 家</span>
          </div>
          <el-input
            v-model="scopeKeyword"
            placeholder="搜索机构名称"
            clearable
            class="scope-search"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <div class="scope-select-all">
            <el-checkbox
              v-model="allChecked"
              :indeterminate="isIndeterminate"
              @change="toggleAll"
            >全选当前列表（{{ selectedInFilteredCount }}/{{ filteredFreeUsers.length }}）</el-checkbox>
          </div>
          <el-divider style="margin: 8px 0" />
          <el-checkbox-group v-model="selectedOrgIds" class="scope-list">
            <div v-for="u in filteredUsers" :key="u.orgId" class="scope-item">
              <el-tooltip
                :content="isOrgLocked(u) ? '请先驳回后再移出' : ''"
                :disabled="!isOrgLocked(u)"
                placement="right"
              >
                <el-checkbox :value="u.orgId" :disabled="isOrgLocked(u)">
                  {{ u.orgName || '-' }}
                  <el-tag v-if="isOrgLocked(u)" size="small" type="warning" style="margin-left: 4px">已提交</el-tag>
                </el-checkbox>
              </el-tooltip>
            </div>
          </el-checkbox-group>
          <el-empty v-if="!filteredUsers.length" description="未找到匹配的机构" :image-size="56" />
        </div>
      </div>
      <template #footer>
        <el-button @click="scopeVisible = false">取消</el-button>
        <el-button type="primary" :loading="scopeSaving" @click="saveScope">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTaskPage, addTask, updateTask, deleteTask, updateTaskStatus, getTaskScope, setTaskScope } from '@/api/task'
import { setDwTaskModules } from '@/api/dailywork'
import { getTemplateList } from '@/api/template'
import { getUsers } from '@/api/auth'
import { DW_QUARTER_MODULES, DW_ANNUAL_MODULES } from '@/utils/dwTaskModules'
import { filterAssignableQcOrgs } from '@/utils/qcOrgAssign'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ pageNo: 1, pageSize: 10, taskName: '', status: null, statYear: null })

const drawerVisible = ref(false)
const submitting = ref(false)
const editData = ref(null)
const formRef = ref()
// dwPeriod: 'quarter' | 'annual'（仅 daily_work 时有效）
const form = reactive({ taskType: 'normal', dwPeriod: 'quarter', taskName: '', templateId: '', statYear: '', statQuarter: null, deadline: '', remark: '' })
const rules = computed(() => ({
  taskName:    [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  templateId:  form.taskType === 'normal'
    ? [{ required: true, message: '请选择关联模板', trigger: 'change' }]
    : [],
  statYear:    form.taskType === 'daily_work'
    ? [{ required: true, message: '请选择统计年度', trigger: 'change' }]
    : [],
  statQuarter: (form.taskType === 'daily_work' && form.dwPeriod === 'quarter')
    ? [{ required: true, message: '请选择统计季度', trigger: 'change' }]
    : [],
}))

watch(() => form.dwPeriod, (p) => {
  if (p === 'annual') form.statQuarter = null
})

const templateList = ref([])
const templateMap = computed(() => {
  const m = {}
  templateList.value.forEach(t => { m[t.id] = t.templateName })
  return m
})

const scopeVisible      = ref(false)
const scopeSaving       = ref(false)
const scopeTaskId       = ref(null)
const scopeTaskName     = ref('')
const selectedOrgIds    = ref([])
const userList          = ref([])
const scopeKeyword      = ref('')
// orgId(string) -> recordStatus，用于判断是否锁定
const scopeOrgStatusMap = ref({})

const filteredUsers = computed(() => {
  const kw = scopeKeyword.value.trim().toLowerCase()
  if (!kw) return userList.value
  return userList.value.filter(u => (u.orgName || '').toLowerCase().includes(kw))
})

const selectedOrgPreview = computed(() => {
  const idSet = new Set((selectedOrgIds.value || []).map(id => String(id)))
  return userList.value
    .filter(u => idSet.has(String(u.orgId)))
    .map(u => ({ orgId: u.orgId, orgName: u.orgName }))
})

// 未锁定的机构（recordStatus < 1 或 null）
const filteredFreeUsers = computed(() =>
  filteredUsers.value.filter(u => !isOrgLocked(u))
)
const selectedInFilteredCount = computed(() =>
  filteredFreeUsers.value.filter(u => selectedOrgIds.value.includes(u.orgId)).length
)
const allChecked = computed(() =>
  filteredFreeUsers.value.length > 0 &&
  filteredFreeUsers.value.every(u => selectedOrgIds.value.includes(u.orgId))
)
const isIndeterminate = computed(() =>
  selectedInFilteredCount.value > 0 && !allChecked.value
)
function toggleAll(val) {
  const lockedIds = userList.value.filter(isOrgLocked).map(u => u.orgId)
  const filteredIds = filteredFreeUsers.value.map(u => u.orgId)
  const selectedSet = new Set(selectedOrgIds.value)
  if (val) {
    filteredIds.forEach(id => selectedSet.add(id))
  } else {
    filteredIds.forEach(id => selectedSet.delete(id))
  }
  lockedIds.forEach(id => selectedSet.add(id))
  selectedOrgIds.value = [...selectedSet]
}
function isOrgLocked(u) {
  const status = scopeOrgStatusMap.value[String(u.orgId)]
  return status != null && status >= 1
}

onMounted(() => { loadList(); loadTemplates() })

async function loadList(page) {
  if (page) query.pageNo = page
  loading.value = true
  try {
    const params = { pageNo: query.pageNo, pageSize: query.pageSize }
    if (query.taskName) params.taskName = query.taskName
    if (query.status !== null && query.status !== '') params.status = query.status
    if (query.statYear) params.statYear = query.statYear
    const res = await getTaskPage(params)
    list.value = res.data.records
    total.value = Number(res.data.total)
  } finally { loading.value = false }
}

async function loadTemplates() {
  const res = await getTemplateList()
  templateList.value = res.data || []
}

function resetQuery() { query.taskName = ''; query.status = null; query.statYear = null; loadList(1) }

function openDrawer(row) {
  editData.value = row
  if (row) {
    const dwPeriod = (row.taskType === 'daily_work' && row.statQuarter == null) ? 'annual' : 'quarter'
    Object.assign(form, {
      taskType: row.taskType || 'normal',
      dwPeriod,
      taskName: row.taskName,
      templateId: row.templateId || '',
      statYear: row.statYear || '',
      statQuarter: row.statQuarter ?? null,
      deadline: row.deadline || '',
      remark: row.remark || '',
    })
  } else {
    Object.assign(form, { taskType: 'normal', dwPeriod: 'quarter', taskName: '', templateId: '', statYear: '', statQuarter: null, deadline: '', remark: '' })
  }
  drawerVisible.value = true
}

async function handleSubmit() {
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    const payload = {
      taskName:    form.taskName,
      taskType:    form.taskType,
      templateId:  form.taskType === 'normal' ? form.templateId : undefined,
      statYear:    form.taskType === 'daily_work' ? form.statYear : undefined,
      statQuarter: (form.taskType === 'daily_work' && form.dwPeriod === 'quarter') ? Number(form.statQuarter) : null,
      deadline:    form.deadline,
      remark:      form.remark,
    }
    let taskId
    if (editData.value) {
      await updateTask({ id: editData.value.id, ...payload })
      taskId = editData.value.id
      ElMessage.success('编辑成功')
    } else {
      const res = await addTask(payload)
      taskId = res.data
      ElMessage.success('创建成功')
    }
    // 日常工作任务：自动设置模块范围
    if (form.taskType === 'daily_work' && taskId) {
      const moduleKeys = form.dwPeriod === 'annual' ? DW_ANNUAL_MODULES : DW_QUARTER_MODULES
      await setDwTaskModules(taskId, moduleKeys).catch(() => {})
    }
    drawerVisible.value = false
    loadList()
  } catch { /* interceptor handles message */ } finally { submitting.value = false }
}

async function changeStatus(row, newStatus) {
  const labels = { 1: '发布（进行中）', 2: '结束' }
  await ElMessageBox.confirm(`确认将任务状态变更为「${labels[newStatus]}」？此操作不可逆。`, '确认操作', { type: 'warning' })
  await updateTaskStatus(row.id, newStatus)
  ElMessage.success('操作成功')
  loadList()
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确认删除该草稿任务？', '警告', { type: 'warning' })
  await deleteTask(row.id)
  ElMessage.success('删除成功')
  loadList()
}

async function openScopeDialog(row) {
  scopeTaskId.value = row.id
  scopeTaskName.value = row.taskName || ''
  scopeKeyword.value = ''
  const usersRes = await getUsers()
  userList.value = filterAssignableQcOrgs(usersRes.data || [])
  const assignableIdSet = new Set(userList.value.map(u => String(u.orgId)))
  const res = await getTaskScope(row.id)
  const orgsWithStatus = res.data?.orgs || []
  const statusMap = {}
  orgsWithStatus.forEach(o => { statusMap[String(o.orgId)] = o.recordStatus })
  scopeOrgStatusMap.value = statusMap
  selectedOrgIds.value = [...(res.data?.orgIds || [])].filter(id => assignableIdSet.has(String(id)))
  scopeVisible.value = true
}

async function saveScope() {
  scopeSaving.value = true
  try {
    await setTaskScope(scopeTaskId.value, { orgIds: selectedOrgIds.value })
    ElMessage.success('分配成功')
    scopeVisible.value = false
  } finally { scopeSaving.value = false }
}

const statusLabel = s => ({ 0: '草稿', 1: '进行中', 2: '已结束' }[s] ?? s)
const statusType  = s => ({ 0: 'info', 1: 'success', 2: 'danger' }[s] ?? 'info')
const recordStatusLabel = s => {
  if (s == null) return '未开始'
  return ({ 0: '草稿', 1: '已提交', 2: '已审核', 3: '已驳回' }[s] ?? s)
}
const recordStatusType = s => {
  if (s == null) return 'info'
  return ({ 0: '', 1: 'warning', 2: 'success', 3: 'danger' }[s] ?? 'info')
}
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }

.scope-dialog-body {
  max-height: 72vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.scope-assigned {
  padding: 10px 12px;
  background: linear-gradient(180deg, #f8fafc 0%, #f5f7fa 100%);
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
.scope-assigned-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.scope-section {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 14px;
  background: #fff;
}
.scope-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.scope-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.scope-section-count {
  font-size: 12px;
  color: #909399;
}
.assigned-org-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 84px;
  overflow-y: auto;
  padding-right: 2px;
}
.assigned-org-tag {
  max-width: 100%;
}
.assigned-org-tag :deep(.el-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.assigned-org-empty {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}
.scope-search { margin-bottom: 10px; }
.scope-select-all { padding: 2px 0 4px; }
.scope-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.scope-item { padding: 6px 0; }
</style>
