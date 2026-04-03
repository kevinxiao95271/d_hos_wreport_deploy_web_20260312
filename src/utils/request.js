import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const request = axios.create({ timeout: 30000 })

request.interceptors.request.use(config => {
  const token = localStorage.getItem('wr_token')
  if (token) config.headers['Authorization'] = token
  return config
})

// 防止多个并发 401 重复跳转 / 重复弹窗
let _redirecting = false
function handleUnauthorized() {
  if (_redirecting) return
  _redirecting = true
  localStorage.clear()
  ElMessage.warning('登录已过期，请重新登录')
  router.push('/login').finally(() => { _redirecting = false })
}

request.interceptors.response.use(
  response => {
    const data = response.data
    if (data.code === 200) return data
    if (data.code === 401) {
      handleUnauthorized()
      return Promise.reject(new Error('unauthorized'))
    }
    // 后端部分错误码使用 msg 字段而非 message，兼容两者
    ElMessage.error(data.message || data.msg || '请求失败')
    return Promise.reject(new Error(data.message || data.msg))
  },
  error => {
    if (error.response?.status === 401) {
      handleUnauthorized()
      return Promise.reject(error)
    }
    ElMessage.error(error.message || '网络异常')
    return Promise.reject(error)
  }
)

export default request
