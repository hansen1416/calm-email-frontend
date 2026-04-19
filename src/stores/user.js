import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '@/utils/request'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refresh_token') || '')
  const username = ref('')

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
      // ºöÂÔ´íÎó
    }
    token.value = ''
    refreshToken.value = ''
    username.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
  }

  function setToken(accessToken) {
    token.value = accessToken
    localStorage.setItem('token', accessToken)
  }

  return { token, refreshToken, username, login, register, logout, setToken }
})
