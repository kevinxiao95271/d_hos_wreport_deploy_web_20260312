import { ElMessage } from 'element-plus'

function sanitizeFileName(name) {
  return String(name || 'download').replace(/[\\/:*?"<>|]/g, '_').trim() || 'download'
}

function parseFileNameFromDisposition(disposition) {
  if (!disposition) return ''
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim())
    } catch {
      return utf8Match[1].trim()
    }
  }
  const plainMatch = disposition.match(/filename="([^"]+)"/i)
  return plainMatch?.[1]?.trim() || ''
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = sanitizeFileName(fileName)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 日常工作附件：走后端代理下载，保留原始文件名，不新开页面 */
export async function downloadDwAttachment(attachmentId, fileName) {
  if (!attachmentId) {
    ElMessage.warning('附件不存在')
    return
  }

  const token = localStorage.getItem('wr_token') || ''
  const baseURL = import.meta.env.VITE_API_PREFIX || ''
  const url = `${baseURL}/dw/record/attachment/download/${encodeURIComponent(attachmentId)}`

  let res
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: token } : {},
    })
  } catch (e) {
    ElMessage.error(e.message || '下载失败')
    return
  }

  if (!res.ok) {
    let msg = '下载失败'
    try {
      const err = await res.json()
      msg = err?.message || err?.msg || msg
    } catch {
      // ignore
    }
    ElMessage.error(msg)
    return
  }

  const blob = await res.blob()
  const name = parseFileNameFromDisposition(res.headers.get('Content-Disposition')) || fileName
  triggerBlobDownload(blob, name)
}
