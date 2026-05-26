<!-- 国家/省质量安全报告：近3年勾选 + 按年上传 -->
<template>
  <div class="year-report-module">
    <PreviewDialog ref="previewRef" />
    <p v-if="moduleConfig.uploadHint" class="upload-hint-global">{{ moduleConfig.uploadHint }}</p>
    <p v-if="!reportYears.length" class="year-empty-hint">请先确认任务已配置统计年度</p>
    <div v-for="year in reportYears" :key="year" class="year-block">
      <el-checkbox
        :model-value="checkedMap[year]"
        :disabled="!editable"
        @change="(val) => onToggleYear(year, val)"
      >
        {{ year }}年
      </el-checkbox>
      <div v-if="checkedMap[year]" class="year-upload">
        <DwAttachSlot
          :files="getYearFiles(year)"
          :record-id="recordId"
          :module-type="moduleKey"
          :slot_="yearSlotKey(year)"
          :editable="editable"
          accept=".pdf,.docx,.doc"
          format-hint="支持 PDF / DOCX"
          :label="`${year}年证明材料`"
          @uploaded="$emit('uploaded')"
          @deleted="$emit('deleted')"
          @preview="(url, name, id) => previewRef.show(url, name, id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { saveDwFieldValues } from '@/api/dailywork'
import DwAttachSlot from './DwAttachSlot.vue'
import PreviewDialog from '@/components/PreviewDialog.vue'
import {
  buildReportYears,
  yearSlotKey,
  yearCheckedFieldKey,
  isYearChecked,
} from '@/utils/dwReportYears'

const props = defineProps({
  moduleKey: { type: String, required: true },
  moduleConfig: { type: Object, default: () => ({}) },
  record: { type: Object, required: true },
  recordId: { type: [String, Number], required: true },
  editable: { type: Boolean, default: true },
})
defineEmits(['uploaded', 'deleted'])

const previewRef = ref(null)
const checkedMap = ref({})

const filesRecordKey = computed(() =>
  props.moduleKey === 'national_report' ? 'nationalReportFiles' : 'provReportFiles'
)
const extraKey = computed(() =>
  props.moduleKey === 'national_report' ? 'nationalReportExtra' : 'provReportExtra'
)

const reportYears = computed(() => buildReportYears(props.record?.statYear))

function syncCheckedFromExtra() {
  const extra = props.record?.[extraKey.value] || {}
  const map = {}
  reportYears.value.forEach((year) => {
    map[year] = isYearChecked(extra, year)
  })
  checkedMap.value = map
}

watch([() => props.record, extraKey, reportYears], syncCheckedFromExtra, { immediate: true, deep: true })

function getYearFiles(year) {
  const bucket = props.record?.[filesRecordKey.value]
  if (!bucket || typeof bucket !== 'object') return []
  return bucket[yearSlotKey(year)] || []
}

async function onToggleYear(year, checked) {
  checkedMap.value = { ...checkedMap.value, [year]: !!checked }
  if (!props.editable) return
  try {
    await saveDwFieldValues({
      recordId: String(props.recordId),
      moduleKey: props.moduleKey,
      subRecordId: null,
      values: { [yearCheckedFieldKey(year)]: checked ? '1' : '0' },
    })
  } catch {
    syncCheckedFromExtra()
  }
}
</script>

<style scoped>
.upload-hint-global { font-size: 13px; color: #909399; margin-bottom: 10px; }
.year-empty-hint { font-size: 13px; color: #e6a23c; margin-bottom: 8px; }
.year-block { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed #ebeef5; }
.year-block:last-child { border-bottom: none; margin-bottom: 0; }
.year-upload { margin-top: 8px; margin-left: 24px; }
</style>
