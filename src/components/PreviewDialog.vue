<template>
  <el-dialog
    v-model="visible"
    :title="fileName"
    width="88%"
    destroy-on-close
    :close-on-click-modal="true"
    class="preview-dialog"
  >
    <!-- 图片 -->
    <div v-if="isImage" class="preview-image-wrap">
      <img :src="fileUrl" class="preview-image" :alt="fileName" />
    </div>

    <!-- PDF -->
    <div v-else-if="isPdf" class="preview-pdf-wrap">
      <iframe :src="fileUrl" class="preview-iframe" :title="fileName" />
    </div>

    <!-- 不支持预览 -->
    <div v-else class="preview-unsupported">
      <el-result icon="info" title="该格式不支持在线预览">
        <template #extra>
          <el-button type="primary" tag="a" :href="fileUrl" target="_blank">下载查看</el-button>
        </template>
      </el-result>
    </div>

    <template #footer>
      <el-button tag="a" :href="fileUrl" target="_blank" plain>
        <el-icon><Download /></el-icon> 下载
      </el-button>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Download } from '@element-plus/icons-vue'

const visible = ref(false)
const fileUrl = ref('')
const fileName = ref('')

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
const PDF_EXTS   = ['pdf']

function ext(name) {
  return (name || '').split('.').pop().toLowerCase()
}

const isImage = computed(() => IMAGE_EXTS.includes(ext(fileName.value)))
const isPdf   = computed(() => PDF_EXTS.includes(ext(fileName.value)))

function show(url, name) {
  fileUrl.value  = url
  fileName.value = name
  visible.value  = true
}

defineExpose({ show })
</script>

<style scoped>
.preview-image-wrap {
  text-align: center;
  max-height: 75vh;
  overflow: auto;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 12px;
}
.preview-image {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 2px;
}
.preview-pdf-wrap {
  height: 75vh;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 4px;
}
.preview-unsupported {
  padding: 24px 0;
}
</style>

<style>
.preview-dialog .el-dialog__body {
  padding: 12px 20px;
}
</style>
