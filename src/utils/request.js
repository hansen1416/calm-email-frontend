import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// Token 刷新逻辑
let isRefreshing = false
let refreshSubscribers = []

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback)
}

function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach(callback => callback(newToken))
  refreshSubscribers = []
}

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 设置默认 Content-Type 为 application/json
    if (!config.headers['Content-Type'] && config.method === 'post') {
      config.headers['Content-Type'] = 'application/json'
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  res => {
    // 检查后端返回的统一格式
    if (res.data && typeof res.data.success !== 'undefined' && !res.data.success) {
      const message = res.data.message || '操作失败'
      ElMessage.error(message)
      return Promise.reject(new Error(message))
    }
    return res
  },
  async err => {
    const { response } = err
    const originalRequest = err.config

    // 401 未授权错误
    if (response?.status === 401) {
      // 判断是否是刷新 Token 的请求
      if (originalRequest.url === '/auth/refresh') {
        // 刷新失败，需要重新登录
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        ElMessage.error('登录已过期，请重新登录')
        router.push('/login')
        return Promise.reject(err)
      }

      // 尝试刷新 Token
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        localStorage.removeItem('token')
        router.push('/login')
        return Promise.reject(err)
      }

      // 避免重复刷新
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const res = await axios.post('/api/auth/refresh', {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }
          })
          const { access_token } = res.data
          localStorage.setItem('token', access_token)
          onTokenRefreshed(access_token)
          isRefreshing = false
          
          // 重试原请求
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return request(originalRequest)
        } catch (refreshErr) {
          isRefreshing = false
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          ElMessage.error('登录已过期，请重新登录')
          router.push('/login')
          return Promise.reject(refreshErr)
        }
      }

      // 正在刷新中，等待新 Token
      return new Promise(resolve => {
        subscribeTokenRefresh(newToken => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          resolve(request(originalRequest))
        })
      })
    }

    // 其他错误处理
    const errorCode = response?.data?.code
    const errorMessage = response?.data?.message || response?.data?.msg || '请求失败'
    
    // 根据错误码显示不同提示
    switch (errorCode) {
      case 'RATE_LIMIT_EXCEEDED':
        ElMessage.warning('请求过于频繁，请稍后重试')
        break
      case 'FORBIDDEN':
        ElMessage.error('权限不足')
        break
      case 'NOT_FOUND':
        ElMessage.error('请求的资源不存在')
        break
      case 'INTERNAL_ERROR':
        ElMessage.error('服务器内部错误，请稍后重试')
        break
      default:
        ElMessage.error(errorMessage)
    }

    return Promise.reject(err)
  }
)

export default request
