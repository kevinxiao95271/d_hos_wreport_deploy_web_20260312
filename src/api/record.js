import request from '@/utils/request'

export const getAdminRecordPage = params => request.get('/wr/record/admin/page', { params })
export const getAdminAggregate  = params => request.get('/wr/record/admin/aggregate', { params })
export const getMyRecord        = taskId => request.get(`/wr/record/my/${taskId}`)
export const getMyRecordPage    = params => request.get('/wr/record/my/page', { params })
export const getRecordDetail    = id     => request.get(`/wr/record/detail/${id}`)
export const saveRecord         = data   => request.post('/wr/record/save', data)
export const submitRecord       = data   => request.post('/wr/record/submit', data)
export const auditRecord        = data   => request.post('/wr/record/audit', data)
export const getCrossView       = params => request.get('/wr/record/admin/crossview', { params })
export const getCharCount       = recordId => request.get(`/wr/record/charcount/${recordId}`)
export const getRecordScore     = recordId => request.get(`/wr/record/score/${recordId}`)

export const exportRecord = async (taskId, taskName) => {
  const token = localStorage.getItem('wr_token') || ''
  const baseURL = import.meta.env.VITE_API_PREFIX || ''
  const url = `${baseURL}/wr/record/export/${encodeURIComponent(taskId)}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: token
    }
  })

  if (!res.ok) {
    let msg = '导出失败'
    try {
      const err = await res.json()
      msg = err?.message || err?.msg || msg
    } catch {
      // ignore json parse errors
    }
    throw new Error(msg)
  }

  const blob = await res.blob()
  const safeTaskName = String(taskName || `任务_${taskId}`).replace(/[\\/:*?"<>|]/g, '_').trim()
  const fileName = `${safeTaskName || `任务_${taskId}`}_上报数据.xlsx`

  const downloadUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(downloadUrl)
}
