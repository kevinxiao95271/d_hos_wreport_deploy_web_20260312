<!-- 国家/省报告只读展示：近3年勾选状态 + 附件 -->
<template>
  <div class="year-report-readonly">
    <p v-if="!reportYears.length" style="color:#c0c4cc;font-size:13px">暂无统计年度</p>
    <div v-for="year in reportYears" :key="year" class="year-block">
      <div class="year-label">
        <el-tag :type="isYearChecked(extra, year) ? 'success' : 'info'" size="small">
          {{ isYearChecked(extra, year) ? '已参与' : '未参与' }}
        </el-tag>
        <span class="year-text">{{ year }}年</span>
      </div>
      <div v-if="isYearChecked(extra, year)" class="file-list">
        <div v-for="f in getYearFiles(year)" :key="f.id" class="file-chip">
          <el-icon><Document /></el-icon>
          <span class="chip-name">{{ f.fileName }}</span>
          <el-button v-if="canPreview(f.fileName)" type="primary" link size="small" @click="$emit('preview', f.fileUrl, f.fileName)">预览</el-button>
          <el-button type="primary" link size="small" @click="downloadFile(f)">下载</el-button>
        </div>
        <span v-if="!getYearFiles(year).length" style="color:#c0c4cc;font-size:13px">暂无文件</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { downloadDwAttachment } from '@/utils/dwFileDownload'
import {
  buildReportYears,
  yearSlotKey,
  isYearChecked,
} from '@/utils/dwReportYears'

const props = defineProps({
  moduleKey: { type: String, required: true },
  record: { type: Object, required: true },
})
defineEmits(['preview'])

const filesRecordKey = computed(() =>
  props.moduleKey === 'national_report' ? 'nationalReportFiles' : 'provReportFiles'
)
const extraKey = computed(() =>
  props.moduleKey === 'national_report' ? 'nationalReportExtra' : 'provReportExtra'
)
const extra = computed(() => props.record?.[extraKey.value] || {})
const reportYears = computed(() => buildReportYears(props.record?.statYear))

function getYearFiles(year) {
  const bucket = props.record?.[filesRecordKey.value]
  if (!bucket || typeof bucket !== 'object') return []
  return bucket[yearSlotKey(year)] || []
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const PDF_EXTS = ['pdf']
const DOCX_EXTS = ['docx', 'doc']
function ext(n) { return (n || '').split('.').pop().toLowerCase() }
function canPreview(n) {
  const e = ext(n)
  return IMAGE_EXTS.includes(e) || PDF_EXTS.includes(e) || DOCX_EXTS.includes(e)
}
function downloadFile(file) { downloadDwAttachment(file.id, file.fileName) }
</script>

<style scoped>
.year-block { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed #ebeef5; }
.year-block:last-child { border-bottom: none; margin-bottom: 0; }
.year-label { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.year-text { font-size: 13px; color: #606266; }
.file-list { display: flex; flex-wrap: wrap; gap: 6px; margin-left: 4px; }
.file-chip { display: flex; align-items: center; gap: 6px; background: #f4f4f5; border-radius: 4px; padding: 3px 8px; font-size: 13px; }
.chip-name { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
