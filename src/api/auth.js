import request from '@/utils/request'

export const login = data => request.post('/api/auth/login', data)
export const getUsers = () => request.get('/wr/org/list')
