import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 开发环境 VITE_API_PREFIX 为空，走 vite proxy
// 生产环境 VITE_API_PREFIX=/wreport-api，走 nginx 代理
const request = axios.create({
  baseURL: import.meta.env.VITE_API_PREFIX || '',
  timeout: 30000
})

request.interceptors.request.use(config => {
  const token = localStorage.getItem('wr_token')
  if (token) config.headers['Authorization'] = token
  return config
})

request.interceptors.response.use(
  response => {
    const data = response.data
    if (data.code === 200) return data
    ElMessage.error(data.message || '请求失败')
    return Promise.reject(new Error(data.message))
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.clear()
      router.push('/login')
    }
    ElMessage.error(error.message || '网络异常')
    return Promise.reject(error)
  }
)

export default request
