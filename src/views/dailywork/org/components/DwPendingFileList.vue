<!-- 待上传文件列表（选择后、保存/提交前） -->
<template>
  <div v-if="files?.length" class="pending-file-list">
    <div v-for="(file, idx) in files" :key="idx" class="pending-file-chip">
      <el-icon class="chip-icon"><Document /></el-icon>
      <span class="chip-name" :title="fileName(file)">{{ fileName(file) }}</span>
      <el-button
        type="danger"
        link
        size="small"
        class="chip-remove"
        aria-label="移除"
        @click="$emit('remove', idx)"
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Document, Close } from '@element-plus/icons-vue'

defineProps({
  files: { type: Array, default: () => [] },
})
defineEmits(['remove'])

function fileName(file) {
  return file?.name || file?.fileName || '未命名文件'
}
</script>

<style scoped>
.pending-file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 6px;
  min-width: 0;
  max-width: 100%;
}
.pending-file-chip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  padding: 4px 8px 4px 10px;
  font-size: 13px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}
.chip-icon { color: #409eff; flex-shrink: 0; }
.chip-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}
.chip-remove {
  flex-shrink: 0;
  padding: 0 4px;
  margin: 0;
  min-width: auto;
}
</style>
