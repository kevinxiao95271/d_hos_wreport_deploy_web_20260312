import request from '@/utils/request'

export const getAdminRecordPage = params => request.get('/wr/record/admin/page', { params })
export const getAdminAggregate  = params => request.get('/wr/record/admin/aggregate', { params })
export const getMyRecord        = taskId => request.get(`/wr/record/my/${taskId}`)
export const getMyRecordPage    = params => request.get('/wr/record/my/page', { params })
export const getRecordDetail    = id     => request.get(`/wr/record/detail/${id}`)
export const saveRecord         = data   => request.post('/wr/record/save', data)
export const submitRecord       = data   => request.post('/wr/record/submit', data)
export const auditRecord        = data   => request.post('/wr/record/audit', data)
export const exportRecord       = taskId => {
  return request.get(`/wr/record/export/${taskId}`, { responseType: 'blob' })
    .then(response => {
      const url = URL.createObjectURL(new Blob([response]))
      const a = document.createElement('a')
      a.href = url
      a.download = `上报数据_${taskId}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    })
    .catch(() => {
      // fallback: open in new tab
      const token = localStorage.getItem('wr_token')
      window.open(`/wr/record/export/${taskId}?token=${encodeURIComponent(token)}`)
    })
}
