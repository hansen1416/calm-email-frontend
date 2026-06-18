import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '@/utils/request'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refresh_token') || '')
  const username = ref('')
  const avatar = ref('avatar-1')
  const email = ref('')
  const notifications = ref([])
  const unreadCount = ref(0)

  async function login(form) {
    const { data } = await request.post('/auth/login', form)
    token.value = data.access_token
    refreshToken.value = data.refresh_token
    username.value = data.username
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
  }

  async function register(form) {
    await request.post('/auth/register', form)
  }

  async function logout() {
    try {
      await request.post('/auth/logout')
    } catch (e) {
      // 忽略错误
    }
    token.value = ''
    refreshToken.value = ''
    username.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
  }

  async function fetchMe() {
    try {
      const { data } = await request.get('/auth/me')
      username.value = data.username
      avatar.value = data.avatar || 'avatar-1'
      email.value = data.email || ''
    } catch { /* ignore */ }
  }

  async function updateProfile(payload) {
    const { data } = await request.put('/auth/profile', payload)
    avatar.value = data.avatar
    email.value = data.email
    return data
  }

  async function changePassword(oldPassword, newPassword) {
    await request.put('/auth/change-password', { old_password: oldPassword, new_password: newPassword })
  }

  async function fetchNotifications() {
    try {
      const { data } = await request.get('/notifications')
      notifications.value = data || []
      unreadCount.value = data.filter(n => !n.is_read).length
    } catch { /* ignore */ }
  }

  return { token, refreshToken, username, avatar, email, notifications, unreadCount, login, register, logout, fetchMe, updateProfile, changePassword, fetchNotifications }
})
