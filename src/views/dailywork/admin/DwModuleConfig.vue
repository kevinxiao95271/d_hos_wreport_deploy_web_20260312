<template>
  <div>
    <div class="page-title">
      <h3>日常工作模块配置</h3>
      <p class="sub-title">配置各模块名称、分值、附件提示语及动态扩展字段</p>
    </div>

    <el-card shadow="never" v-loading="loading">
      <el-table :data="modules" border stripe>
        <el-table-column prop="sortOrder" label="排序" width="60" align="center" />
        <el-table-column prop="moduleName" label="模块名称" min-width="150" />
        <el-table-column prop="scoreMax" label="满分" width="80" align="center">
          <template #default="{ row }">{{ row.scoreMax }} 分</template>
        </el-table-column>
        <el-table-column label="扩展字段数" width="90" align="center">
          <template #default="{ row }">{{ row.extraFields?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="启用" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openModuleEdit(row)">编辑</el-button>
            <el-button type="primary" link size="small" @click="openFieldManager(row)">扩展字段</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 模块编辑弹窗 -->
    <el-dialog v-model="moduleDialogVisible" title="编辑模块配置" width="520px" destroy-on-close>
      <el-form :model="moduleForm" label-width="110px" ref="moduleFormRef">
        <el-form-item label="模块名称" prop="moduleName" :rules="req">
          <el-input v-model="moduleForm.moduleName" />
        </el-form-item>
        <el-form-item label="满分(分)" prop="scoreMax">
          <el-input-number v-model="moduleForm.scoreMax" :min="0" :precision="2" style="width:160px" />
        </el-form-item>
        <el-form-item label="上传提示语">
          <el-input v-model="moduleForm.uploadHint" type="textarea" :rows="2" placeholder="可选，显示在附件上传区域上方" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="moduleForm.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="moduleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="moduleSaving" @click="saveModule">保存</el-button>
      </template>
    </el-dialog>

    <!-- 扩展字段管理弹窗 -->
    <el-dialog v-model="fieldDialogVisible" :title="`${activeModule?.moduleName} — 扩展字段管理`" width="760px" destroy-on-close>
      <el-table :data="activeModule?.extraFields || []" border size="small" style="margin-bottom:12px">
        <el-table-column prop="sortOrder" label="排序" width="55" align="center" />
        <el-table-column prop="fieldName" label="字段名" min-width="120" />
        <el-table-column prop="fieldKey"  label="Key"    width="140" />
        <el-table-column prop="fieldType" label="类型"   width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ fieldTypeLabel(row.fieldType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isRequired" label="必填" width="60" align="center">
          <template #default="{ row }">{{ row.isRequired ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openFieldEdit(row)">编辑</el-button>
            <el-button type="danger"  link size="small" :loading="deletingFieldId === row.id" @click="deleteField(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-button type="primary" plain @click="openFieldEdit(null)">
        <el-icon><Plus /></el-icon> 新增扩展字段
      </el-button>
    </el-dialog>

    <!-- 扩展字段编辑弹窗 -->
    <el-dialog v-model="fieldEditVisible" :title="editingField ? '编辑字段' : '新增字段'" width="500px" destroy-on-close>
      <el-form :model="fieldForm" label-width="100px" ref="fieldFormRef">
        <el-form-item label="字段名" prop="fieldName" :rules="req">
          <el-input v-model="fieldForm.fieldName" placeholder="如：本次会议经费（元）" />
        </el-form-item>
        <el-form-item label="字段Key" prop="fieldKey" :rules="req">
          <el-input v-model="fieldForm.fieldKey" placeholder="英文小写下划线，如 budget_amount" :disabled="!!editingField" />
        </el-form-item>
        <el-form-item label="字段类型" prop="fieldType" :rules="req">
          <el-select v-model="fieldForm.fieldType" style="width:100%">
            <el-option label="单行文本" value="text" />
            <el-option label="数字"     value="number" />
            <el-option label="单选下拉" value="enum" />
            <el-option label="多选"     value="checkbox" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="fieldForm.fieldType === 'enum' || fieldForm.fieldType === 'checkbox'" label="选项">
          <el-input v-model="fieldOptionsRaw" type="textarea" :rows="3" placeholder='JSON 数组，如 ["选项A","选项B"]' />
          <div style="font-size:12px;color:#909399;margin-top:4px">每个选项用双引号包裹，以逗号分隔</div>
        </el-form-item>
        <el-form-item label="必填">
          <el-switch v-model="fieldForm.isRequired" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="fieldForm.sortOrder" :min="1" style="width:120px" />
        </el-form-item>
        <el-form-item label="占位提示">
          <el-input v-model="fieldForm.placeholder" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fieldEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="fieldSaving" @click="saveField">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getDwModules, updateDwModule, addDwField, updateDwField, deleteDwField } from '@/api/dailywork'

const loading  = ref(true)
const modules  = ref([])

// 模块编辑
const moduleDialogVisible = ref(false)
const moduleSaving        = ref(false)
const moduleFormRef       = ref(null)
const activeModule        = ref(null)
const moduleForm          = ref({})

// 字段管理
const fieldDialogVisible = ref(false)
const fieldEditVisible   = ref(false)
const fieldSaving        = ref(false)
const deletingFieldId    = ref(null)
const fieldFormRef       = ref(null)
const editingField       = ref(null)
const fieldForm          = ref({})
const fieldOptionsRaw    = ref('')

const req = [{ required: true, message: '不能为空', trigger: 'blur' }]
const fieldTypeLabel = t => ({ text: '文本', number: '数字', enum: '下拉', checkbox: '多选' }[t] || t)

async function loadModules() {
  loading.value = true
  try {
    const res = await getDwModules()
    modules.value = res.data || []
  } finally { loading.value = false }
}

function openModuleEdit(row) {
  activeModule.value  = row
  moduleForm.value    = { id: row.id, moduleKey: row.moduleKey, moduleName: row.moduleName, scoreMax: row.scoreMax, uploadHint: row.uploadHint || '', isEnabled: row.isEnabled }
  moduleDialogVisible.value = true
}

async function saveModule() {
  await moduleFormRef.value?.validate()
  moduleSaving.value = true
  try {
    await updateDwModule(moduleForm.value)
    ElMessage.success('保存成功')
    moduleDialogVisible.value = false
    await loadModules()
  } finally { moduleSaving.value = false }
}

function openFieldManager(row) {
  activeModule.value       = row
  fieldDialogVisible.value = true
}

function openFieldEdit(field) {
  editingField.value = field
  if (field) {
    fieldForm.value    = { ...field }
    fieldOptionsRaw.value = field.fieldOptions || ''
  } else {
    fieldForm.value    = { moduleKey: activeModule.value?.moduleKey, fieldName: '', fieldKey: '', fieldType: 'text', isRequired: false, sortOrder: 10, placeholder: '' }
    fieldOptionsRaw.value = ''
  }
  fieldEditVisible.value = true
}

async function saveField() {
  await fieldFormRef.value?.validate()
  fieldSaving.value = true
  try {
    const payload = { ...fieldForm.value }
    if (fieldForm.value.fieldType === 'enum' || fieldForm.value.fieldType === 'checkbox') {
      payload.fieldOptions = fieldOptionsRaw.value || null
    } else {
      payload.fieldOptions = null
    }
    if (editingField.value) {
      await updateDwField(payload)
    } else {
      await addDwField(payload)
    }
    ElMessage.success('保存成功')
    fieldEditVisible.value = false
    await loadModules()
    // 刷新 activeModule 的 extraFields
    activeModule.value = modules.value.find(m => m.moduleKey === activeModule.value?.moduleKey) || activeModule.value
  } finally { fieldSaving.value = false }
}

async function deleteField(field) {
  await ElMessageBox.confirm(`确认删除字段「${field.fieldName}」？历史填写数据不会丢失，仅不再显示。`, '提示', { type: 'warning' })
  deletingFieldId.value = field.id
  try {
    await deleteDwField(field.id)
    ElMessage.success('已删除')
    await loadModules()
    activeModule.value = modules.value.find(m => m.moduleKey === activeModule.value?.moduleKey) || activeModule.value
  } finally { deletingFieldId.value = null }
}

onMounted(loadModules)
</script>

<style scoped>
.page-title { margin-bottom: 16px; }
.page-title h3 { margin: 0 0 4px; font-size: 18px; }
.sub-title  { margin: 0; color: #909399; font-size: 13px; }
</style>
