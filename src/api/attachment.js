import request from '@/utils/request'

export const getAttachments  = recordId => request.get(`/wr/attachment/list/${recordId}`)
export const deleteAttachment= id => request.post(`/wr/attachment/delete/${id}`)
export const uploadAttachment = (recordId, itemId, file) => {
  const fd = new FormData()
  fd.append('file', file)
  const params = itemId ? `?recordId=${recordId}&itemId=${itemId}` : `?recordId=${recordId}`
  return request.post(`/wr/attachment/upload${params}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
