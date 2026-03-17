import request from '@/utils/request'

export const getDictTypes   = ()             => request.get('/wr/dict/types')
export const getDictItems   = code           => request.get(`/wr/dict/items/${code}`)
export const saveDictType   = data           => request.post('/wr/dict/type/save', data)
export const deleteDictType = id             => request.post(`/wr/dict/type/delete/${id}`)
export const saveDictItems  = (typeId, items)=> request.post(`/wr/dict/items/save/${typeId}`, items)
