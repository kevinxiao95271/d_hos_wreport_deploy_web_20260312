<template>
  <div>
    <template v-if="singleSlot">
      <div class="file-list">
        <div v-for="f in getFiles(singleSlot.field)" :key="f.id" class="file-chip">
          <el-icon><Document /></el-icon>
          <span class="chip-name">{{ f.fileName }}</span>
          <el-button v-if="canPreview(f.fileName)" type="primary" link size="small" @click="$emit('preview', f.fileUrl, f.fileName)">预览</el-button>
          <el-button type="primary" link size="small" tag="a" :href="f.fileUrl" target="_blank">下载</el-button>
        </div>
        <span v-if="!getFiles(singleSlot.field).length" style="color:#c0c4cc;font-size:13px">暂无文件</span>
      </div>
    </template>
    <template v-else>
      <div v-for="s in multiSlots" :key="s.slot" style="margin-bottom:10px">
        <div class="slot-label">{{ s.label }}</div>
        <div class="file-list">
          <div v-for="f in getFiles(s.field)" :key="f.id" class="file-chip">
            <el-icon><Document /></el-icon>
            <span class="chip-name">{{ f.fileName }}</span>
            <el-button v-if="canPreview(f.fileName)" type="primary" link size="small" @click="$emit('preview', f.fileUrl, f.fileName)">预览</el-button>
            <el-button type="primary" link size="small" tag="a" :href="f.fileUrl" target="_blank">下载</el-button>
          </div>
          <span v-if="!getFiles(s.field).length" style="color:#c0c4cc;font-size:13px">暂无文件</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Document } from '@element-plus/icons-vue'
const props = defineProps({ moduleKey: String, record: Object })
defineEmits(['preview'])
const SLOT_MAP = {
  annual_work:       { type: 'single', field: 'annualWorkFiles' },
  it_construction:   { type: 'single', field: 'itConstructionFiles' },
  admin_response:    { type: 'single', field: 'adminResponseFiles' },
  indicator_db:      { type: 'single', field: 'indicatorDbFiles' },
  indicator_monitor: { type: 'single', field: 'indicatorMonitorFiles' },
  national_report:   { type: 'single', field: 'nationalReportFiles' },
  prov_report:       { type: 'single', field: 'provReportFiles' },
  network_build:     { type: 'nested', recordKey: 'networkBuild', nestedField: 'evidences' },
  work_plan:         { type: 'multi', recordKey: 'workPlanFiles',       slots: [{ slot: 'plan', field: 'plan', label: '年度计划' }, { slot: 'summary', field: 'summary', label: '年度总结' }] },
  activity_report:   { type: 'multi', recordKey: 'activityReportFiles', slots: [{ slot: 'pre_report', field: 'pre_report', label: '事前截图' }, { slot: 'post_report', field: 'post_report', label: '事后截图' }] },
  bonus_admin:       { type: 'multi', recordKey: 'bonusAdminFiles',     slots: [{ slot: 'national_task', field: 'national_task', label: '国家工作任务' }, { slot: 'prov_task', field: 'prov_task', label: '浙江省工作任务' }] },
}
const cfg        = computed(() => SLOT_MAP[props.moduleKey] || { type: 'single', field: 'annualWorkFiles' })
const singleSlot = computed(() => cfg.value.type === 'single' ? cfg.value : null)
const multiSlots = computed(() => cfg.value.type === 'multi'  ? cfg.value.slots : [])
function getFiles(field) {
  const c = cfg.value
  if (c.type === 'single') return props.record[c.field] || []
  if (c.type === 'nested') return props.record[c.recordKey]?.[c.nestedField] || []
  // multi: use recordKey
  return props.record[c.recordKey]?.[field] || []
}
const IMAGE_EXTS=['jpg','jpeg','png','gif','webp'], PDF_EXTS=['pdf'], DOCX_EXTS=['docx','doc']
function ext(n){return(n||'').split('.').pop().toLowerCase()}
function canPreview(n){const e=ext(n);return IMAGE_EXTS.includes(e)||PDF_EXTS.includes(e)||DOCX_EXTS.includes(e)}
</script>
<style scoped>
.slot-label{font-size:12px;color:#909399;margin-bottom:4px}
.file-list{display:flex;flex-wrap:wrap;gap:6px}
.file-chip{display:flex;align-items:center;gap:6px;background:#f4f4f5;border-radius:4px;padding:3px 8px;font-size:13px}
.chip-name{max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style>
