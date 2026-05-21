<!-- 纯上传模块（年度工作 / 信息化 / 工作计划 / 行政指令 / 活动报备） -->
<template>
  <div>
    <PreviewDialog ref="previewRef" />

    <p v-if="moduleConfig.uploadHint" class="upload-hint-global">{{ moduleConfig.uploadHint }}</p>

    <!-- 单 slot 模块 -->
    <template v-if="singleSlot">
      <DwAttachSlot
        :files="getFiles(singleSlot.field)"
        :record-id="recordId"
        :module-type="moduleKey"
        :slot_="singleSlot.slot"
        :editable="editable"
        :accept="singleSlot.accept"
        :format-hint="singleSlot.hint"
        @uploaded="$emit('uploaded')"
        @deleted="$emit('deleted')"
        @preview="(url, name) => previewRef.show(url, name)"
      />
    </template>

    <!-- 多 slot 模块（work_plan: plan + summary；activity_report: pre_report + post_report） -->
    <template v-else>
      <div v-for="s in multiSlots" :key="s.slot" class="multi-slot-block">
        <DwAttachSlot
          :files="getFiles(s.field)"
          :record-id="recordId"
          :module-type="moduleKey"
          :slot_="s.slot"
          :editable="editable"
          :label="s.label"
          :accept="s.accept"
          :format-hint="s.hint"
          @uploaded="$emit('uploaded')"
          @deleted="$emit('deleted')"
          @preview="(url, name) => previewRef.show(url, name)"
        />
      </div>
    </template>

    <!-- 扩展字段 -->
    <template v-if="moduleConfig.extraFields?.length">
      <el-form label-width="140px" style="max-width:560px">
        <DwExtraFields
          :fields="moduleConfig.extraFields"
          v-model="extraLocal"
          :editable="editable"
          @save="saveExtra"
        />
      </el-form>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { saveDwFieldValues } from '@/api/dailywork'
import DwAttachSlot  from './DwAttachSlot.vue'
import DwExtraFields from './DwExtraFields.vue'
import PreviewDialog from '@/components/PreviewDialog.vue'

const props = defineProps({
  moduleKey:    { type: String, required: true },
  moduleConfig: { type: Object, required: true },
  record:       { type: Object, required: true },
  recordId:     { type: [String, Number], required: true },
  editable:     { type: Boolean, default: true },
})
defineEmits(['uploaded', 'deleted'])

const previewRef = ref(null)
const extraLocal = ref({})

// 格式常量
const FMT = {
  pdfDocx: { accept: '.pdf,.docx,.doc',           hint: '支持 PDF / DOCX（须加盖公章）' },
  imgPdf:  { accept: '.jpg,.jpeg,.png,.gif,.pdf',  hint: '支持 JPG / PNG / GIF / PDF' },
}

// 模块 key → record 字段 / slot 映射
const SLOT_MAP = {
  annual_work:        { type: 'single', slot: 'evidence', field: 'annualWorkFiles',        extraKey: 'annualWorkExtra',        ...FMT.pdfDocx },
  it_construction:    { type: 'single', slot: 'evidence', field: 'itConstructionFiles',    extraKey: 'itConstructionExtra',    ...FMT.pdfDocx },
  admin_response:     { type: 'single', slot: 'evidence', field: 'adminResponseFiles',     extraKey: 'adminResponseExtra',     ...FMT.pdfDocx },
  indicator_db:       { type: 'single', slot: 'evidence', field: 'indicatorDbFiles',       extraKey: 'indicatorDbExtra',       ...FMT.pdfDocx },
  indicator_monitor:  { type: 'single', slot: 'evidence', field: 'indicatorMonitorFiles',  extraKey: 'indicatorMonitorExtra',  ...FMT.pdfDocx },
  work_plan: {
    type: 'multi',
    recordKey: 'workPlanFiles',
    slots: [
      { slot: 'plan',    field: 'plan',    label: '年度工作计划（word上传，注意格式）', accept: '.pdf,.docx,.doc' },
      { slot: 'summary', field: 'summary', label: '年度工作总结（word上传，注意格式）', accept: '.pdf,.docx,.doc' },
    ],
    extraKey: 'workPlanExtra',
  },
  activity_report: {
    type: 'multi',
    recordKey: 'activityReportFiles',
    slots: [
      { slot: 'pre_report',  field: 'pre_report',  label: '活动报备事前截图', ...FMT.imgPdf },
      { slot: 'post_report', field: 'post_report', label: '活动报备事后截图', ...FMT.imgPdf },
    ],
    extraKey: 'activityReportExtra',
  },
  bonus_admin: {
    type: 'multi',
    recordKey: 'bonusAdminFiles',
    slots: [
      { slot: 'national_task', field: 'national_task', label: '国家工作任务证明材料', accept: '.pdf,.docx,.doc', hint: '支持 PDF / DOCX' },
      { slot: 'prov_task',     field: 'prov_task',     label: '浙江省工作任务证明材料', accept: '.pdf,.docx,.doc', hint: '支持 PDF / DOCX' },
    ],
    extraKey: 'bonusAdminExtra',
  },
}

const slotConfig = computed(() => SLOT_MAP[props.moduleKey] || { type: 'single', slot: 'evidence', field: 'annualWorkFiles', extraKey: '' })
const singleSlot = computed(() => slotConfig.value.type === 'single' ? slotConfig.value : null)
const multiSlots = computed(() => slotConfig.value.type === 'multi'  ? slotConfig.value.slots : [])

function getFiles(field) {
  const cfg = slotConfig.value
  if (cfg.type === 'single') return props.record[cfg.field] || []
  // multi: use recordKey to locate the nested object in the record (e.g. workPlanFiles.plan)
  return props.record[cfg.recordKey]?.[field] || []
}

watch(() => {
  const cfg = slotConfig.value
  return props.record[cfg.extraKey] || {}
}, (v) => { extraLocal.value = { ...v } }, { immediate: true })

async function saveExtra(vals) {
  if (!props.editable) return
  try {
    await saveDwFieldValues({ recordId: String(props.recordId), moduleKey: props.moduleKey, values: vals })
  } catch { /* ignore */ }
}
</script>

<style scoped>
.upload-hint-global { font-size: 13px; color: #909399; margin-bottom: 10px; }
.multi-slot-block   { margin-bottom: 16px; }
</style>
