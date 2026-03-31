import request from '@/utils/request'

// ── 模块配置 ──────────────────────────────────────────────────
export const getDwModules       = ()       => request.get('/dw/config/modules')
export const updateDwModule     = (data)   => request.post('/dw/config/module/update', data)
export const addDwField         = (data)   => request.post('/dw/config/field/add', data)
export const updateDwField      = (data)   => request.post('/dw/config/field/update', data)
export const deleteDwField      = (id)     => request.post(`/dw/config/field/delete/${id}`)
/** 模块级/子记录扩展字段与自评分（module_self_score）保存；自评分时 subRecordId 传 null */
export const saveDwFieldValues  = (data)   => request.post('/dw/record/field-values', data)

// ── 记录初始化 / 读取 ─────────────────────────────────────────
export const initDwRecord  = (taskId)    => request.get(`/dw/record/init/${taskId}`)
export const getDwRecord   = (recordId)  => request.get(`/dw/record/${recordId}`)
export const submitDwRecord = (recordId) => request.post(`/dw/record/submit/${recordId}`)
export const auditDwRecord  = (recordId, result, remark) =>
  request.post(`/dw/record/audit/${recordId}`, null, { params: { result, remark } })

// ── 子记录 CRUD ───────────────────────────────────────────────
export const saveMeeting    = (data) => request.post('/dw/record/meeting/save', data)
export const deleteMeeting  = (id)   => request.post(`/dw/record/meeting/delete/${id}`)
export const saveTraining   = (data) => request.post('/dw/record/training/save', data)
export const deleteTraining = (id)   => request.post(`/dw/record/training/delete/${id}`)
export const saveGuidance   = (data) => request.post('/dw/record/guidance/save', data)
export const deleteGuidance = (id)   => request.post(`/dw/record/guidance/delete/${id}`)
export const saveSurvey     = (data) => request.post('/dw/record/survey/save', data)
export const deleteSurvey   = (id)   => request.post(`/dw/record/survey/delete/${id}`)
export const saveBonus      = (data) => request.post('/dw/record/bonus/save', data)
export const deleteBonus    = (id)   => request.post(`/dw/record/bonus/delete/${id}`)
export const saveFunding    = (data) => request.post('/dw/record/funding/save', data)

// ── 附件 ──────────────────────────────────────────────────────
export function uploadDwAttachment(recordId, moduleType, slot, file, subRecordId = null) {
  const form = new FormData()
  form.append('file', file)
  const params = { recordId, moduleType, slot }
  // guard against null, undefined, or the literal string "null"
  if (subRecordId != null && subRecordId !== 'null' && subRecordId !== '') {
    params.subRecordId = subRecordId
  }
  return request.post('/dw/record/attachment/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params
  })
}
export const deleteDwAttachment = (id) => request.post(`/dw/record/attachment/delete/${id}`)

export const getGuidanceRegions = () => request.get('/dw/config/guidance/regions')

// 模块评分（管理员）
export const saveDwModuleScore = (data) => request.post('/dw/record/module/score/save', data)
// data: { recordId, moduleKey, actualScore, scoreRemark }
