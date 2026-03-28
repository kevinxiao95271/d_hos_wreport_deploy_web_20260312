<!-- 加分项列表 -->
<template>
  <div>
    <PreviewDialog ref="previewRef" />

    <!-- ① 已有记录：折叠列表 -->
    <template v-if="items.length">
      <el-collapse v-model="openIds">
        <el-collapse-item v-for="item in items" :key="item.id" :name="item.id">
          <template #title>
            <div class="collapse-title">
              <span>{{ bonusType === 'publication' ? item.pubName : item.compName }}</span>
              <div class="title-actions" @click.stop>
                <el-button v-if="editable" type="primary" link size="small" @click="openDialog(item)">编辑</el-button>
                <el-button v-if="editable" type="danger"  link size="small" :loading="deletingId === item.id" @click="handleDelete(item)">删除</el-button>
              </div>
            </div>
          </template>

          <el-descriptions :column="2" size="small" border>
            <template v-if="bonusType === 'publication'">
              <el-descriptions-item label="出版物名称">{{ item.pubName }}</el-descriptions-item>
              <el-descriptions-item label="类别">{{ pubCategoryLabel(item.pubCategory) }}</el-descriptions-item>
              <el-descriptions-item label="出版日期">{{ item.pubDate }}</el-descriptions-item>
            </template>
            <template v-else>
              <el-descriptions-item label="竞赛名称">{{ item.compName }}</el-descriptions-item>
              <el-descriptions-item label="主办类型">{{ compSponsorLabel(item.compSponsor) }}</el-descriptions-item>
              <el-descriptions-item label="竞赛日期">{{ item.compDate }}</el-descriptions-item>
            </template>
          </el-descriptions>

          <el-divider content-position="left" style="margin:10px 0 6px">证明文件</el-divider>
          <DwAttachSlot
            :files="item.evidences || []"
            :record-id="recordId"
            module-type="bonus"
            slot_="evidence"
            :sub-record-id="item.id"
            :editable="editable"
            label="证明文件"
            accept=".pdf,.docx,.doc"
            format-hint="支持 PDF / DOCX"
            @uploaded="$emit('saved')"
            @deleted="$emit('deleted')"
            @preview="(url, name) => previewRef.show(url, name)"
          />
        </el-collapse-item>
      </el-collapse>

      <el-button v-if="editable" type="primary" plain style="margin-top:12px" @click="openDialog(null)">
        <el-icon><Plus /></el-icon> 新增加分项
      </el-button>
    </template>

    <!-- ② 无记录 + 可编辑：直接展示内联表单 -->
    <template v-else-if="editable">
      <div class="inline-form-wrap">
        <el-form :model="form" label-width="110px" ref="formRef" @submit.prevent>
          <template v-if="bonusType === 'publication'">
            <el-form-item label="出版物名称" prop="pubName" :rules="req">
              <el-input v-model="form.pubName" placeholder="书名/指南名/共识名/标准名" />
            </el-form-item>
            <el-form-item label="类别" prop="pubCategory" :rules="req">
              <el-select v-model="form.pubCategory" style="width:100%">
                <el-option label="专著/指南/共识" value="book_guide_consensus" />
                <el-option label="标准/规范" value="standard_norm" />
              </el-select>
            </el-form-item>
            <el-form-item label="出版日期" prop="pubDate" :rules="req">
              <el-date-picker v-model="form.pubDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </template>
          <template v-else>
            <el-form-item label="竞赛名称" prop="compName" :rules="req">
              <el-input v-model="form.compName" placeholder="请输入竞赛名称" />
            </el-form-item>
            <el-form-item label="主办类型" prop="compSponsor" :rules="req">
              <el-select v-model="form.compSponsor" style="width:100%">
                <el-option label="省级联合主办" value="provincial_joint" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
            <el-form-item label="竞赛日期" prop="compDate" :rules="req">
              <el-date-picker v-model="form.compDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </template>
          <DwExtraFields
            v-if="moduleConfig.extraFields?.length"
            :fields="moduleConfig.extraFields"
            v-model="form.extraValues"
            :editable="true"
          />
        </el-form>
        <div class="inline-footer">
          <el-button type="primary" :loading="saving" @click="handleSave">保存本条</el-button>
        </div>
      </div>
    </template>

    <!-- ③ 无记录 + 只读 -->
    <el-empty v-else description="暂无加分项" :image-size="60" />

    <!-- 编辑/新增弹窗（有列表时使用） -->
    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑加分项' : '新增加分项'" width="500px" destroy-on-close>
      <el-form :model="form" label-width="110px" ref="formRef">
        <template v-if="bonusType === 'publication'">
          <el-form-item label="出版物名称" prop="pubName" :rules="req">
            <el-input v-model="form.pubName" placeholder="书名/指南名/共识名/标准名" />
          </el-form-item>
          <el-form-item label="类别" prop="pubCategory" :rules="req">
            <el-select v-model="form.pubCategory" style="width:100%">
              <el-option label="专著/指南/共识" value="book_guide_consensus" />
              <el-option label="标准/规范" value="standard_norm" />
            </el-select>
          </el-form-item>
          <el-form-item label="出版日期" prop="pubDate" :rules="req">
            <el-date-picker v-model="form.pubDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="竞赛名称" prop="compName" :rules="req">
            <el-input v-model="form.compName" placeholder="请输入竞赛名称" />
          </el-form-item>
          <el-form-item label="主办类型" prop="compSponsor" :rules="req">
            <el-select v-model="form.compSponsor" style="width:100%">
              <el-option label="省级联合主办" value="provincial_joint" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="竞赛日期" prop="compDate" :rules="req">
            <el-date-picker v-model="form.compDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
        </template>
        <DwExtraFields
          v-if="moduleConfig.extraFields?.length"
          :fields="moduleConfig.extraFields"
          v-model="form.extraValues"
          :editable="true"
        />
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { saveBonus, deleteBonus, saveDwFieldValues } from '@/api/dailywork'
import DwAttachSlot  from './DwAttachSlot.vue'
import DwExtraFields from './DwExtraFields.vue'
import PreviewDialog from '@/components/PreviewDialog.vue'

const props = defineProps({
  bonusType:    { type: String, required: true },  // 'publication' | 'competition'
  moduleConfig: { type: Object, required: true },
  items:        { type: Array,  default: () => [] },
  recordId:     { type: [String, Number], required: true },
  editable:     { type: Boolean, default: true },
})
const emit = defineEmits(['saved', 'deleted'])

const previewRef    = ref(null)
const dialogVisible = ref(false)
const saving        = ref(false)
const deletingId    = ref(null)
const formRef       = ref(null)
const editingItem   = ref(null)
const openIds       = ref([])
const form          = ref({ extraValues: {} })
const req           = [{ required: true, message: '不能为空', trigger: 'blur' }]
const pendingOpenId = ref(null)

const pubCategoryLabel = v => ({ book_guide_consensus: '专著/指南/共识', standard_norm: '标准/规范' }[v] ?? v)
const compSponsorLabel = v => ({ provincial_joint: '省级联合主办', other: '其他' }[v] ?? v)

function initBlankForm() {
  form.value = { recordId: props.recordId, bonusType: props.bonusType, extraValues: {} }
  editingItem.value = null
}

watch(() => props.items, (newItems) => {
  if (pendingOpenId.value) {
    const match = newItems.find(i => String(i.id) === String(pendingOpenId.value))
    if (match) {
      openIds.value = [match.id]
      pendingOpenId.value = null
    }
  }
  if (newItems.length === 0) initBlankForm()
}, { deep: false })

onMounted(() => {
  if (!props.items.length) initBlankForm()
})

function openDialog(item) {
  editingItem.value = item
  form.value = item
    ? { ...item, extraValues: { ...item.extraValues } }
    : { recordId: props.recordId, bonusType: props.bonusType, extraValues: {} }
  dialogVisible.value = true
}

async function handleSave() {
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload = { ...form.value }
    delete payload.extraValues
    const res = await saveBonus(payload)
    const savedId = res.data?.id
    if (savedId && Object.keys(form.value.extraValues || {}).length) {
      await saveDwFieldValues({
        recordId: String(props.recordId),
        moduleKey: 'bonus',
        subRecordId: String(savedId),
        values: form.value.extraValues,
      })
    }
    ElMessage.success('保存成功')
    if (dialogVisible.value) {
      dialogVisible.value = false
    } else if (savedId) {
      pendingOpenId.value = savedId
    }
    emit('saved')
  } finally { saving.value = false }
}

async function handleDelete(item) {
  await ElMessageBox.confirm('确认删除该加分项？', '提示', { type: 'warning' })
  deletingId.value = item.id
  try {
    await deleteBonus(item.id)
    emit('deleted')
  } finally { deletingId.value = null }
}
</script>

<style scoped>
.collapse-title {
  display: flex; align-items: center;
  justify-content: space-between; width: 100%; padding-right: 12px;
}
.title-actions { display: flex; gap: 4px; }

.inline-form-wrap {
  background: #f9fafb;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  padding: 16px 16px 12px;
}
.inline-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
</style>
