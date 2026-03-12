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
        <el-table-column label="关联模板" min-width="160">
          <template #default="{ row }">{{ templateMap[row.templateId] || row.templateId }}</template>
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
        <el-form-item label="任务名称" prop="taskName">
          <el-input v-model="form.taskName" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="关联模板" prop="templateId">
          <el-select v-model="form.templateId" placeholder="请选择模板" style="width:100%">
            <el-option v-for="t in templateList" :key="t.id" :label="t.templateName" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="统计年度">
          <el-date-picker v-model="form.statYear" type="year" value-format="YYYY" style="width:100%" />
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
    <el-dialog v-model="scopeVisible" title="分配上报机构" width="500px">
      <el-checkbox-group v-model="selectedOrgIds">
        <div v-for="u in userList" :key="u.user_id" style="margin:6px 0">
          <el-checkbox :label="u.user_id">
            {{ u.orgName || u.account }}（{{ u.account }}）
          </el-checkbox>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="scopeVisible = false">取消</el-button>
        <el-button type="primary" :loading="scopeSaving" @click="saveScope">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTaskPage, addTask, updateTask, deleteTask, updateTaskStatus, getTaskScope, setTaskScope } from '@/api/task'
import { getTemplateList } from '@/api/template'
import { getUsers } from '@/api/auth'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ pageNo: 1, pageSize: 10, taskName: '', status: null, statYear: null })

const drawerVisible = ref(false)
const submitting = ref(false)
const editData = ref(null)
const formRef = ref()
const form = reactive({ taskName: '', templateId: '', statYear: '', deadline: '', remark: '' })
const rules = {
  taskName:   [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  templateId: [{ required: true, message: '请选择关联模板', trigger: 'change' }]
}

const templateList = ref([])
const templateMap = computed(() => {
  const m = {}
  templateList.value.forEach(t => { m[t.id] = t.templateName })
  return m
})

const scopeVisible = ref(false)
const scopeSaving = ref(false)
const scopeTaskId = ref(null)
const selectedOrgIds = ref([])
const userList = ref([])

onMounted(() => { loadList(); loadTemplates(); loadUsers() })

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

async function loadUsers() {
  const res = await getUsers()
  userList.value = (res.data || []).filter(u => u.account !== 'wr_admin' && !u.account.startsWith('test'))
}

function resetQuery() { query.taskName = ''; query.status = null; query.statYear = null; loadList(1) }

function openDrawer(row) {
  editData.value = row
  if (row) {
    Object.assign(form, { taskName: row.taskName, templateId: row.templateId, statYear: row.statYear, deadline: row.deadline, remark: row.remark })
  } else {
    Object.assign(form, { taskName: '', templateId: '', statYear: '', deadline: '', remark: '' })
  }
  drawerVisible.value = true
}

async function handleSubmit() {
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    if (editData.value) {
      await updateTask({ id: editData.value.id, ...form })
      ElMessage.success('编辑成功')
    } else {
      await addTask(form)
      ElMessage.success('创建成功')
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
  const res = await getTaskScope(row.id)
  selectedOrgIds.value = res.data?.orgIds || []
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
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
