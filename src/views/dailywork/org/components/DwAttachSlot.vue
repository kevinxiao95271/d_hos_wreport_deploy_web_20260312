<!-- 单个 slot 的附件上传 + 预览组件 -->
<template>
  <div class="attach-slot">
    <div v-if="label" class="slot-label">{{ label }}</div>
    <div class="file-list">
      <div
        v-for="file in files"
        :key="file.id"
        class="file-chip"
      >
        <el-icon class="chip-icon"><Document /></el-icon>
        <span class="chip-name" :title="file.fileName">{{ file.fileName }}</span>
        <div class="chip-actions">
          <el-button
            v-if="canPreview(file.fileName)"
            type="primary" link size="small"
            @click="$emit('preview', file.fileUrl, file.fileName)"
          >预览</el-button>
          <el-button
            type="primary" link size="small"
            tag="a" :href="file.fileUrl" target="_blank"
          >下载</el-button>
          <el-button
            v-if="editable"
            type="danger" link size="small"
            :loading="deletingId === file.id"
            @click="handleDelete(file)"
          >删除</el-button>
        </div>
      </div>
    </div>
    <div v-if="editable" class="slot-upload-row">
      <el-upload
        :show-file-list="false"
        :before-upload="() => false"
        :on-change="handleChange"
        :accept="accept"
        class="slot-upload"
      >
        <el-button size="small" plain :icon="UploadFilled">点击上传</el-button>
      </el-upload>
      <span v-if="formatHint || hint" class="format-hint">{{ formatHint || hint }}</span>
    </div>
    <div v-if="uploading" class="upload-progress">
      <el-icon class="is-loading"><Loading /></el-icon> 上传中…
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, UploadFilled, Loading } from '@element-plus/icons-vue'
import { uploadDwAttachment, deleteDwAttachment } from '@/api/dailywork'

const props = defineProps({
  files:       { type: Array,   default: () => [] },
  recordId:    { type: [String, Number], required: true },
  moduleType:  { type: String, required: true },
  slot_:       { type: String, required: true },    // 'slot' is reserved word
  subRecordId: { type: [String, Number], default: null },
  editable:    { type: Boolean, default: true },
  hint:        { type: String, default: '' },       // 整体模块上传提示（来自 moduleConfig）
  label:       { type: String, default: '' },       // 当前 slot 名称
  accept:      { type: String, default: '' },       // 文件格式限制，如 ".pdf,.docx"
  formatHint:  { type: String, default: '' },       // 显示给用户的格式说明
})
const emit = defineEmits(['uploaded', 'deleted', 'preview'])

const uploading  = ref(false)
const deletingId = ref(null)

const IMAGE_EXTS  = ['jpg','jpeg','png','gif','webp','bmp','svg']
const PDF_EXTS    = ['pdf']
const DOCX_EXTS   = ['docx','doc']
function ext(name) { return (name || '').split('.').pop().toLowerCase() }
function canPreview(name) {
  const e = ext(name)
  return IMAGE_EXTS.includes(e) || PDF_EXTS.includes(e) || DOCX_EXTS.includes(e)
}

async function handleChange(file) {
  uploading.value = true
  try {
    await uploadDwAttachment(props.recordId, props.moduleType, props.slot_, file.raw, props.subRecordId)
    emit('uploaded')
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function handleDelete(file) {
  deletingId.value = file.id
  try {
    await deleteDwAttachment(file.id)
    emit('deleted')
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  } finally {
    deletingId.value = null
  }
}
</script>

<style scoped>
.attach-slot { margin-bottom: 8px; }
.slot-label  { font-size: 13px; color: #606266; margin-bottom: 6px; font-weight: 500; }
.file-list   { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; min-width: 0; }
.file-chip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  background: #f4f4f5;
  border: 1px solid #e9e9eb;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 13px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
}
.chip-icon   { color: #909399; flex-shrink: 0; }
.chip-name   { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  white-space: nowrap;
}
.slot-upload-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.slot-upload :deep(.el-upload) { display: inline-flex; }
.format-hint { font-size: 11px; color: #909399; }
.upload-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #409eff;
  font-size: 13px;
  margin-top: 4px;
}
</style>
