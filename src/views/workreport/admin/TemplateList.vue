<template>
  <div>
    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form inline :model="query">
        <el-form-item label="模板名称">
          <el-input v-model="query.templateName" placeholder="请输入" clearable style="width:200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:120px">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
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
          <span>模板列表</span>
          <el-button type="primary" @click="openAddDialog"><el-icon><Plus /></el-icon> 新建模板</el-button>
        </div>
      </template>

      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="templateName" label="模板名称" min-width="180" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160" />
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button type="primary" text size="small" @click="goHeaderEditor(row)">配置表头</el-button>
            <el-button
              :type="row.status === 1 ? 'warning' : 'success'"
              text size="small"
              @click="toggleStatus(row)"
            >{{ row.status === 1 ? '停用' : '启用' }}</el-button>
            <el-button type="danger" text size="small" @click="handleDelete(row)">删除</el-button>
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

    <!-- 新建/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑模板' : '新建模板'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="form.templateName" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板类型">
          <el-radio-group v-model="form.templateType">
            <el-radio value="form">表单录入（附件2）</el-radio>
            <el-radio value="score">评分细则（纯上传）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item v-if="form.templateType !== 'score'" label="字数限制">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <el-checkbox v-model="charLimitEnabled">启用总字数限制</el-checkbox>
            <template v-if="charLimitEnabled">
              <span style="color:#606266;font-size:13px">上限：</span>
              <el-input-number
                v-model="charLimitMax"
                :min="100"
                :step="500"
                style="width:140px"
                placeholder="字数上限"
              />
              <span style="color:#909399;font-size:12px">字</span>
            </template>
          </div>
        </el-form-item>

      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTemplatePage, getTemplateDetail, addTemplate, updateTemplate, deleteTemplate, updateTemplateStatus } from '@/api/template'

const router = useRouter()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ pageNo: 1, pageSize: 10, templateName: '', status: null })

const dialogVisible     = ref(false)
const submitting        = ref(false)
const editId            = ref(null)
const formRef           = ref()
const form              = reactive({ templateName: '', description: '', templateType: 'form' })
const charLimitEnabled  = ref(false)
const charLimitMax      = ref(1000)
const rules = { templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }] }

watch(charLimitEnabled, val => { if (!val) charLimitMax.value = 1000 })

onMounted(() => loadList())

async function loadList(page) {
  if (page) query.pageNo = page
  loading.value = true
  try {
    const params = { pageNo: query.pageNo, pageSize: query.pageSize }
    if (query.templateName) params.templateName = query.templateName
    if (query.status !== null && query.status !== '') params.status = query.status
    const res = await getTemplatePage(params)
    list.value = res.data.records
    total.value = Number(res.data.total)
  } finally { loading.value = false }
}

function resetQuery() {
  query.templateName = ''; query.status = null; loadList(1)
}

function openAddDialog() {
  editId.value = null
  Object.assign(form, { templateName: '', description: '', templateType: 'form' })
  charLimitEnabled.value = false
  charLimitMax.value = 1000
  dialogVisible.value = true
}

async function openEditDialog(row) {
  editId.value = row.id
  Object.assign(form, { templateName: row.templateName, description: row.description, templateType: 'form' })
  charLimitEnabled.value = false
  charLimitMax.value = 1000
  dialogVisible.value = true
  // 拉取详情回显 maxTotalChars 和 templateType
  try {
    const res = await getTemplateDetail(row.id)
    const max = res.data?.maxTotalChars ?? 0
    charLimitEnabled.value = max > 0
    charLimitMax.value = max > 0 ? max : 1000
    if (res.data?.templateType) form.templateType = res.data.templateType
  } catch { /* 不影响编辑流程 */ }
}

async function handleSubmit() {
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  const maxTotalChars = (charLimitEnabled.value && form.templateType !== 'score') ? (charLimitMax.value || 0) : 0
  try {
    if (editId.value) {
      await updateTemplate({ id: editId.value, ...form, maxTotalChars })
      ElMessage.success('编辑成功')
    } else {
      await addTemplate({ ...form, maxTotalChars, items: [] })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadList()
  } catch { /* interceptor handles message */ } finally { submitting.value = false }
}

async function toggleStatus(row) {
  const newStatus = row.status === 1 ? 0 : 1
  const label = newStatus === 1 ? '启用' : '停用'
  await ElMessageBox.confirm(`确认${label}该模板？`, '提示', { type: 'warning' })
  await updateTemplateStatus(row.id, newStatus)
  ElMessage.success(`已${label}`)
  loadList()
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确认删除该模板？删除后不可恢复。', '警告', { type: 'warning' })
  await deleteTemplate(row.id)
  ElMessage.success('删除成功')
  loadList()
}

function goHeaderEditor(row) {
  router.push({ path: '/admin/template-header', query: { id: row.id, name: row.templateName } })
}
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
