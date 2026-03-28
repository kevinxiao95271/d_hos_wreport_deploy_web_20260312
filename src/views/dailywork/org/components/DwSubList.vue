<!-- 多条记录型模块（会议 / 培训 / 指导 / 调研）列表 -->
<template>
  <div>
    <PreviewDialog ref="previewRef" />

    <!-- ① 已有记录：折叠列表 -->
    <template v-if="items.length">
      <el-collapse v-model="openIds">
        <el-collapse-item
          v-for="item in items"
          :key="item.id"
          :name="item.id"
        >
          <template #title>
            <div class="collapse-title">
              <span class="item-title">{{ itemTitle(item) }}</span>
              <div class="title-actions" @click.stop>
                <el-button v-if="editable" type="primary" link size="small" @click="openEdit(item)">编辑</el-button>
                <el-button v-if="editable" type="danger"  link size="small" :loading="deletingId === item.id" @click="handleDelete(item)">删除</el-button>
              </div>
            </div>
          </template>

          <!-- 固定字段预览 -->
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item
              v-for="fd in fixedFields"
              :key="fd.key"
              :label="fd.label"
            >{{ formatFixed(item, fd) }}</el-descriptions-item>
          </el-descriptions>

          <!-- 扩展字段预览 -->
          <template v-if="moduleConfig.extraFields?.length">
            <el-divider content-position="left" style="margin:12px 0 8px">扩展信息</el-divider>
            <el-descriptions :column="2" size="small" border>
              <el-descriptions-item
                v-for="ef in moduleConfig.extraFields"
                :key="ef.fieldKey"
                :label="ef.fieldName"
              >{{ item.extraValues?.[ef.fieldKey] ?? '—' }}</el-descriptions-item>
            </el-descriptions>
          </template>

          <!-- 附件区 -->
          <el-divider content-position="left" style="margin:12px 0 8px">附件</el-divider>
          <div class="attach-grid">
            <DwAttachSlot
              v-for="s in slotDef"
              :key="s.slot"
              :files="item[s.field] || []"
              :record-id="recordId"
              :module-type="moduleKey"
              :slot_="s.slot"
              :sub-record-id="item.id"
              :editable="editable"
              :label="s.label"
              :accept="s.accept"
              :format-hint="s.hint"
              @uploaded="$emit('saved')"
              @deleted="$emit('deleted')"
              @preview="(url, name) => previewRef.show(url, name)"
            />
          </div>
        </el-collapse-item>
      </el-collapse>

      <!-- 有记录时，新增按钮打开弹窗 -->
      <el-button v-if="editable" type="primary" plain style="margin-top:12px" @click="openDialog(null)">
        <el-icon><Plus /></el-icon> 新增
      </el-button>
    </template>

    <!-- ② 无记录 + 可编辑：直接展示内联表单 -->
    <template v-else-if="editable">
      <div class="inline-form-wrap">
        <el-form :model="form" label-width="120px" :rules="rules" ref="formRef" @submit.prevent>
          <el-form-item
            v-for="fd in fixedFields"
            :key="fd.key"
            :label="fd.label"
            :prop="fd.key"
          >
            <el-input
              v-if="fd.type === 'text'"
              v-model="form[fd.key]"
              :placeholder="fd.placeholder"
              type="textarea"
              :autosize="{ minRows: 2 }"
            />
            <el-date-picker
              v-else-if="fd.type === 'date'"
              v-model="form[fd.key]"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width:100%"
            />
            <el-select v-else-if="fd.type === 'select'" v-model="form[fd.key]" style="width:100%">
              <el-option v-for="o in fd.options" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
            <el-input-number
              v-else-if="fd.type === 'number'"
              v-model="form[fd.key]"
              :min="0"
              :placeholder="fd.placeholder"
              style="width:100%"
              controls-position="right"
            />
            <el-input-number
              v-else-if="fd.type === 'percent'"
              v-model="form[fd.key]"
              :min="0" :max="100" :precision="1"
              style="width:100%"
              controls-position="right"
            >
              <template #suffix>%</template>
            </el-input-number>
          </el-form-item>

          <!-- 扩展字段 -->
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
    <el-empty v-else description="暂无记录" :image-size="60" />

    <!-- 编辑/新增（有列表时用）弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑' : '新增'" width="620px" destroy-on-close>
      <el-form :model="form" label-width="120px" :rules="rules" ref="formRef">
        <el-form-item
          v-for="fd in fixedFields"
          :key="fd.key"
          :label="fd.label"
          :prop="fd.key"
        >
          <el-input
            v-if="fd.type === 'text'"
            v-model="form[fd.key]"
            :placeholder="fd.placeholder"
            type="textarea"
            :autosize="{ minRows: 2 }"
          />
          <el-date-picker
            v-else-if="fd.type === 'date'"
            v-model="form[fd.key]"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width:100%"
          />
          <el-select v-else-if="fd.type === 'select'" v-model="form[fd.key]" style="width:100%">
            <el-option v-for="o in fd.options" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-input-number
            v-else-if="fd.type === 'number'"
            v-model="form[fd.key]"
            :min="0"
            :placeholder="fd.placeholder"
            style="width:100%"
            controls-position="right"
          />
          <el-input-number
            v-else-if="fd.type === 'percent'"
            v-model="form[fd.key]"
            :min="0" :max="100" :precision="1"
            style="width:100%"
            controls-position="right"
          >
            <template #suffix>%</template>
          </el-input-number>
        </el-form-item>

        <!-- 扩展字段 -->
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
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  saveMeeting, deleteMeeting,
  saveTraining, deleteTraining,
  saveGuidance, deleteGuidance,
  saveSurvey, deleteSurvey,
  saveDwFieldValues
} from '@/api/dailywork'
import DwAttachSlot  from './DwAttachSlot.vue'
import DwExtraFields from './DwExtraFields.vue'
import PreviewDialog from '@/components/PreviewDialog.vue'

const props = defineProps({
  moduleKey:    { type: String, required: true },
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
const form          = ref({})
const pendingOpenId = ref(null)   // 内联保存后待展开的记录 id

// ── 按模块定义固定字段 ──────────────────────────────────────
const FIXED_FIELDS = {
  meeting: [
    { key: 'meetingName',    label: '会议名称',   type: 'text',    placeholder: '请输入会议名称' },
    { key: 'meetingTime',    label: '会议时间',   type: 'date' },
    { key: 'meetingForm',    label: '会议形式',   type: 'select',  options: [{ label: '线下', value: 'offline' }, { label: '线上', value: 'online' }, { label: '线上+线下', value: 'hybrid' }] },
    { key: 'attendeeCount',  label: '参会人数',   type: 'number',  placeholder: '人' },
    { key: 'attendanceRate', label: '出勤率(%)',  type: 'percent' },
    { key: 'meetingContent', label: '会议内容',   type: 'text',    placeholder: '简要描述' },
  ],
  training: [
    { key: 'trainingName',    label: '培训名称',   type: 'text',    placeholder: '请输入培训名称' },
    { key: 'trainingTime',    label: '培训时间',   type: 'date' },
    { key: 'trainingForm',    label: '培训形式',   type: 'select',  options: [{ label: '线下', value: 'offline' }, { label: '线上', value: 'online' }] },
    { key: 'attendeeCount',   label: '参训人数',   type: 'number',  placeholder: '人' },
    { key: 'coverageRate',    label: '覆盖率(%)',  type: 'percent' },
    { key: 'trainingContent', label: '培训内容',   type: 'text',    placeholder: '简要描述' },
  ],
  guidance: [
    { key: 'guidanceTime',      label: '指导时间',     type: 'date' },
    { key: 'guidanceForm',      label: '指导形式',     type: 'select', options: [{ label: '现场', value: 'onsite' }, { label: '线上', value: 'online' }] },
    { key: 'cityCenterCount',   label: '省→市 机构数', type: 'number', placeholder: '家' },
    { key: 'countyCenterCount', label: '省→县 机构数', type: 'number', placeholder: '家' },
    { key: 'hospitalCount',     label: '医院数',       type: 'number', placeholder: '家' },
    { key: 'guidanceContent',   label: '指导内容',     type: 'text',   placeholder: '简要描述' },
  ],
  survey: [
    { key: 'surveyTime',    label: '调研时间',   type: 'date' },
    { key: 'surveyTarget',  label: '调研对象',   type: 'text',    placeholder: '请输入' },
    { key: 'surveyType',    label: '调研类型',   type: 'select',  options: [{ label: '基线调研', value: 'baseline' }, { label: '专项调研', value: 'special' }] },
    { key: 'surveyForm',    label: '调研方式',   type: 'select',  options: [{ label: '现场', value: 'onsite' }, { label: '线上', value: 'online' }] },
    { key: 'surveyContent', label: '调研内容',   type: 'text',    placeholder: '简要描述' },
  ],
}

// 格式常量
const FMT = {
  pdfDocx:        { accept: '.pdf,.docx,.doc',                              hint: '支持 PDF / DOCX' },
  imgPdf:         { accept: '.jpg,.jpeg,.png,.gif,.pdf',                    hint: '支持 JPG / PNG / GIF / PDF' },
  imgPdfDocxXlsx: { accept: '.jpg,.jpeg,.png,.gif,.pdf,.docx,.doc,.xlsx',   hint: '支持 JPG / PNG / GIF / PDF / DOCX / XLSX' },
}

// 每个模块的附件 slot 定义（含格式限制）
const SLOT_DEF = {
  meeting: [
    { slot: 'minutes', field: 'minutes',  label: '会议纪要 / 通知文稿', ...FMT.pdfDocx },
    { slot: 'photo',   field: 'photos',   label: '现场照片',             ...FMT.imgPdf },
    { slot: 'signin',  field: 'signins',  label: '签到表',               ...FMT.imgPdfDocxXlsx },
  ],
  training: [
    { slot: 'material', field: 'materials', label: '培训材料',  ...FMT.pdfDocx },
    { slot: 'photo',    field: 'photos',    label: '现场照片',  ...FMT.imgPdf },
  ],
  guidance: [
    { slot: 'evidence', field: 'evidences', label: '佐证材料', ...FMT.pdfDocx },
  ],
  survey: [
    { slot: 'report', field: 'reports', label: '调研报告', ...FMT.pdfDocx },
    { slot: 'photo',  field: 'photos',  label: '现场照片', ...FMT.imgPdf },
  ],
}

const SAVE_FN   = { meeting: saveMeeting,   training: saveTraining,   guidance: saveGuidance,   survey: saveSurvey }
const DELETE_FN = { meeting: deleteMeeting, training: deleteTraining, guidance: deleteGuidance, survey: deleteSurvey }

const fixedFields = computed(() => FIXED_FIELDS[props.moduleKey] || [])
const slotDef     = computed(() => SLOT_DEF[props.moduleKey]     || [])

const FORM_LABEL = { meeting: 'meetingName', training: 'trainingName', guidance: 'guidanceContent', survey: 'surveyTarget' }
function itemTitle(item) {
  const key = FORM_LABEL[props.moduleKey]
  return item[key] || `记录 ${item.id}`
}

const FORM_LABEL_MAP = {
  offline: '线下', online: '线上', hybrid: '线上+线下',
  onsite: '现场', baseline: '基线调研', special: '专项调研',
}
function formatFixed(item, fd) {
  const v = item[fd.key]
  if (v === null || v === undefined || v === '') return '—'
  if (fd.type === 'select') return FORM_LABEL_MAP[v] || v
  if (fd.type === 'percent') return `${v}%`
  return v
}

const rules = computed(() => {
  const r = {}
  fixedFields.value.forEach(fd => {
    if (fd.type !== 'number' && fd.type !== 'percent') {
      r[fd.key] = [{ required: true, message: `${fd.label}不能为空`, trigger: 'blur' }]
    }
  })
  return r
})

function initBlankForm() {
  const blank = { recordId: props.recordId, extraValues: {} }
  fixedFields.value.forEach(fd => { blank[fd.key] = null })
  form.value = blank
  editingItem.value = null
}

// 监听 items 变化：空→有记录时自动展开刚保存的记录；有→空时重置内联表单
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

// 打开弹窗（有记录时新增 or 编辑）
function openDialog(item) {
  editingItem.value = item
  if (item) {
    form.value = { ...item, extraValues: { ...item.extraValues } }
  } else {
    initBlankForm()
  }
  dialogVisible.value = true
}

// 兼容旧调用：编辑现有记录
function openEdit(item) {
  openDialog(item)
}

async function handleSave() {
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload = { ...form.value, recordId: props.recordId }
    delete payload.extraValues
    const res = await SAVE_FN[props.moduleKey](payload)
    const savedId = res.data?.id

    const extraVals = form.value.extraValues || {}
    if (savedId && Object.keys(extraVals).length) {
      await saveDwFieldValues({
        recordId: String(props.recordId),
        moduleKey: props.moduleKey,
        subRecordId: String(savedId),
        values: extraVals,
      })
    }

    ElMessage.success('保存成功')
    if (dialogVisible.value) {
      dialogVisible.value = false
    } else if (savedId) {
      // 内联保存：父组件 reload 后自动展开该记录
      pendingOpenId.value = savedId
    }
    emit('saved')
  } finally {
    saving.value = false
  }
}

async function handleDelete(item) {
  await ElMessageBox.confirm('确认删除该条记录？', '提示', { type: 'warning' })
  deletingId.value = item.id
  try {
    await DELETE_FN[props.moduleKey](item.id)
    emit('deleted')
  } finally {
    deletingId.value = null
  }
}
</script>

<style scoped>
.collapse-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 12px;
}
.item-title  { font-weight: 500; color: #303133; }
.title-actions { display: flex; gap: 4px; }
.attach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

/* 内联表单样式 */
.inline-form-wrap {
  background: #f9fafb;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  padding: 16px 16px 12px;
}
.inline-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
.inline-attach-hint { font-size: 12px; color: #909399; }
</style>
