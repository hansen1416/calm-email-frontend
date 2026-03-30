import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '@/utils/request'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const username = ref('')

  async function login(form) {
    const { data } = await request.post('/auth/login', form)
    token.value = data.token
    username.value = data.username
    localStorage.setItem('token', data.token)
  }

  async function register(form) {
    await request.post('/auth/register', form)
  }

  function logout() {
    token.value = ''
    username.value = ''
    localStorage.removeItem('token')
  }

  return { token, username, login, register, logout }
})
