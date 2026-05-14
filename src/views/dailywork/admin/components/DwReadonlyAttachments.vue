<!-- 只读附件展示（用于管理端详情） -->
<template>
  <div class="attach-grid">
    <template v-for="s in slotDef" :key="s.slot">
      <div v-if="files(s.field).length" class="slot-block">
        <div class="slot-label">{{ s.label }}</div>
        <div class="file-list">
          <div v-for="f in files(s.field)" :key="f.id" class="file-chip">
            <el-icon class="chip-icon"><Document /></el-icon>
            <span class="chip-name" :title="f.fileName">{{ f.fileName }}</span>
            <div class="chip-actions">
              <el-button v-if="canPreview(f.fileName)" type="primary" link size="small" @click="$emit('preview', f.fileUrl, f.fileName)">预览</el-button>
              <el-button type="primary" link size="small" tag="a" :href="f.fileUrl" target="_blank">下载</el-button>
            </div>
          </div>
        </div>
      </div>
    </template>
    <el-empty v-if="!hasAny" description="暂无附件" :image-size="40" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Document } from '@element-plus/icons-vue'

const props = defineProps({
  item:      { type: Object, required: true },
  moduleKey: { type: String, required: true },
})
defineEmits(['preview'])

const SLOT_DEF = {
  meeting:  [{ slot: 'minutes', field: 'minutes', label: '会议纪要/通知稿' }, { slot: 'photo', field: 'photos', label: '现场照片(原图发送)' }, { slot: 'signin', field: 'signins', label: '签到表' }],
  training: [{ slot: 'material', field: 'materials', label: '培训通知' }, { slot: 'photo', field: 'photos', label: '现场照片(原图发送)' }],
  guidance: [{ slot: 'evidence', field: 'evidences', label: '佐证材料' }],
  survey:               [{ slot: 'report', field: 'reports', label: '调研报告' }, { slot: 'photo', field: 'photos', label: '现场照片(原图发送)' }],
  data_analysis_report: [{ slot: 'file',   field: 'files',   label: '报告文件' }],
}

const slotDef = computed(() => SLOT_DEF[props.moduleKey] || [])
const files   = (field) => props.item[field] || []
const hasAny  = computed(() => slotDef.value.some(s => files(s.field).length > 0))

const IMAGE_EXTS = ['jpg','jpeg','png','gif','webp','bmp','svg']
const PDF_EXTS   = ['pdf']
const DOCX_EXTS  = ['docx','doc']
function ext(name) { return (name || '').split('.').pop().toLowerCase() }
function canPreview(name) { const e = ext(name); return IMAGE_EXTS.includes(e) || PDF_EXTS.includes(e) || DOCX_EXTS.includes(e) }
</script>

<style scoped>
.attach-grid  { display: flex; flex-wrap: wrap; gap: 12px; }
.slot-block   { min-width: 220px; }
.slot-label   { font-size: 12px; color: #909399; margin-bottom: 4px; }
.file-list    { display: flex; flex-direction: column; gap: 4px; }
.file-chip    { display: flex; align-items: center; gap: 6px; background: #f4f4f5; border-radius: 4px; padding: 3px 8px; font-size: 13px; }
.chip-icon    { color: #909399; flex-shrink: 0; }
.chip-name    { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }
.chip-actions { display: flex; gap: 2px; flex-shrink: 0; }
</style>
