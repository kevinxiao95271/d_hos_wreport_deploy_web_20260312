<template>
  <el-dialog
    v-model="visible"
    :title="fileName"
    width="88%"
    destroy-on-close
    :close-on-click-modal="true"
    class="preview-dialog"
  >
    <div v-if="isImage" class="preview-image-wrap">
      <img :src="fileUrl" class="preview-image" :alt="fileName" />
    </div>

    <div v-else-if="isPdf" class="preview-pdf-wrap">
      <iframe :src="fileUrl" class="preview-iframe" :title="fileName" />
    </div>

    <div v-else-if="isDocx" class="preview-docx-wrap">
      <div v-if="docxLoading" class="docx-loading">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <p>正在解析文档…</p>
      </div>
      <div v-if="docxError" class="docx-error">
        <el-result icon="warning" :title="docxError">
          <template #extra>
            <el-button type="primary" tag="a" :href="fileUrl" target="_blank">下载查看</el-button>
          </template>
        </el-result>
      </div>
      <div ref="docxContainer" class="docx-container" />
    </div>

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
import { ref, computed, nextTick, watch } from 'vue'
import { Download, Loading } from '@element-plus/icons-vue'

const visible  = ref(false)
const fileUrl  = ref('')
const fileName = ref('')

const docxContainer = ref(null)
const docxLoading   = ref(false)
const docxError     = ref('')

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
const PDF_EXTS   = ['pdf']
const DOCX_EXTS  = ['docx', 'doc']

function ext(name) { return (name || '').split('.').pop().toLowerCase() }

const isImage = computed(() => IMAGE_EXTS.includes(ext(fileName.value)))
const isPdf   = computed(() => PDF_EXTS.includes(ext(fileName.value)))
const isDocx  = computed(() => DOCX_EXTS.includes(ext(fileName.value)))

// Render DOCX when dialog opens and content is docx
watch(visible, async (val) => {
  if (!val || !isDocx.value) return
  await nextTick()
  renderDocx()
})

async function renderDocx() {
  docxLoading.value = true
  docxError.value   = ''
  try {
    const { renderAsync } = await import('docx-preview')
    const res  = await fetch(fileUrl.value)
    if (!res.ok) throw new Error(`下载失败 (${res.status})`)
    const blob = await res.blob()
    await renderAsync(blob, docxContainer.value, null, {
      className: 'docx-render',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      useBase64URL: true,
    })
  } catch (e) {
    docxError.value = `文档解析失败：${e.message}`
  } finally {
    docxLoading.value = false
  }
}

function show(url, name) {
  fileUrl.value   = url
  fileName.value  = name
  docxError.value = ''
  visible.value   = true
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
.preview-pdf-wrap { height: 75vh; }
.preview-iframe { width: 100%; height: 100%; border: none; border-radius: 4px; }
.preview-docx-wrap {
  height: 75vh;
  overflow-y: auto;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 12px;
}
.docx-container { background: #fff; }
.docx-loading, .docx-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: #909399;
}
.preview-unsupported { padding: 24px 0; }
</style>

<style>
.preview-dialog .el-dialog__body { padding: 12px 20px; }
.docx-render { font-family: "SimSun", serif; }
</style>
