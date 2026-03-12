import request from '@/utils/request'

export const getTaskPage   = params => request.get('/wr/task/page', { params })
export const getTaskDetail = id     => request.get(`/wr/task/detail/${id}`)
export const getActiveTasks= ()     => request.get('/wr/task/active')
export const addTask       = data   => request.post('/wr/task/add', data)
export const updateTask    = data   => request.post('/wr/task/update', data)
export const deleteTask    = id     => request.post(`/wr/task/delete/${id}`)
export const updateTaskStatus = (id, status) => request.post(`/wr/task/status/${id}/${status}`)
export const getTaskScope  = taskId => request.get(`/wr/task/scope/${taskId}`)
export const setTaskScope  = (taskId, data) => request.post(`/wr/task/scope/${taskId}`, data)
