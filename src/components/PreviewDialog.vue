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

    <div v-else-if="isWordLike" class="preview-docx-wrap">
      <div v-if="docxLoading" class="docx-loading">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <p>正在解析文档…</p>
      </div>
      <div v-if="docxError" class="docx-error">
        <el-result icon="warning" :title="docxError">
          <template #sub-title v-if="docxErrorHint">
            <p class="docx-error-hint">{{ docxErrorHint }}</p>
          </template>
          <template #extra>
            <el-button type="primary" :loading="downloading" @click="handleDownload">下载查看</el-button>
          </template>
        </el-result>
      </div>
      <div ref="docxContainer" class="docx-container" />
    </div>

    <div v-else class="preview-unsupported">
      <el-result icon="info" title="该格式不支持在线预览">
        <template #extra>
          <el-button type="primary" :loading="downloading" @click="handleDownload">下载查看</el-button>
        </template>
      </el-result>
    </div>

    <template #footer>
      <el-button plain :loading="downloading" @click="handleDownload">
        <el-icon><Download /></el-icon> 下载
      </el-button>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { Download, Loading } from '@element-plus/icons-vue'
import { downloadDwAttachment, downloadFileByUrl } from '@/utils/dwFileDownload'

const visible  = ref(false)
const fileUrl  = ref('')
const fileName = ref('')
const attachmentId = ref(null)

const docxContainer = ref(null)
const docxLoading   = ref(false)
const docxError     = ref('')
const docxErrorHint = ref('')
const downloading   = ref(false)

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
const PDF_EXTS   = ['pdf']
const WORD_EXTS  = ['docx', 'doc']

function ext(name) { return (name || '').split('.').pop().toLowerCase() }

const isImage = computed(() => IMAGE_EXTS.includes(ext(fileName.value)))
const isPdf   = computed(() => PDF_EXTS.includes(ext(fileName.value)))
const isWordLike = computed(() => WORD_EXTS.includes(ext(fileName.value)))

/** 按文件头识别：docx 是 ZIP(PK)，旧版 doc 是 OLE 二进制 */
function detectOfficeFormat(buffer) {
  const u8 = new Uint8Array(buffer)
  if (u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4B) return 'ooxml'
  if (u8.length >= 4 && u8[0] === 0xD0 && u8[1] === 0xCF && u8[2] === 0x11 && u8[3] === 0xE0) return 'ole'
  return 'unknown'
}

watch(visible, async (val) => {
  if (!val || !isWordLike.value) return
  await nextTick()
  renderWord()
})

async function renderWord() {
  docxLoading.value = true
  docxError.value   = ''
  docxErrorHint.value = ''
  if (docxContainer.value) {
    docxContainer.value.innerHTML = ''
  }
  try {
    const res = await fetch(fileUrl.value)
    if (!res.ok) throw new Error(`下载失败 (${res.status})`)
    const buffer = await res.arrayBuffer()
    const format = detectOfficeFormat(buffer)

    if (format === 'ole') {
      docxError.value = '旧版 Word 文档（.doc）不支持在线预览'
      docxErrorHint.value = '该文件为 Word 97-2003 二进制格式，浏览器无法直接解析。请在 Word/WPS 中打开后另存为 .docx 再上传，或直接下载查看。'
      return
    }

    const { renderAsync } = await import('docx-preview')
    const blob = new Blob([buffer])
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
    const extName = ext(fileName.value)
    docxError.value = '文档解析失败'
    if (extName === 'doc') {
      docxErrorHint.value = '仅支持在线预览 .docx（Office 2007+）格式。若文件实际为旧版 .doc，请另存为 .docx 后重新上传。'
    } else {
      docxErrorHint.value = e?.message || '文件可能已损坏或不是有效的 Word 文档，请下载后本地查看。'
    }
  } finally {
    docxLoading.value = false
  }
}

async function handleDownload() {
  if (downloading.value) return
  downloading.value = true
  try {
    if (attachmentId.value) {
      await downloadDwAttachment(attachmentId.value, fileName.value)
      return
    }
    await downloadFileByUrl(fileUrl.value, fileName.value)
  } finally {
    downloading.value = false
  }
}

function show(url, name, id = null) {
  fileUrl.value = url
  fileName.value = name
  attachmentId.value = id
  docxError.value = ''
  docxErrorHint.value = ''
  visible.value = true
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
.docx-error-hint {
  max-width: 520px;
  margin: 0 auto;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}
</style>

<style>
.preview-dialog .el-dialog__body { padding: 12px 20px; }
.docx-render { font-family: "SimSun", serif; }
</style>
