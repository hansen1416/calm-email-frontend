<template>
  <div class="login-page">
    <div class="login-card">
      <div class="logo-area">
        <div class="logo-icon">✉</div>
        <h1>{{ $t('common.appName') }}</h1>
        <p class="subtitle">{{ $t('common.subtitle') }}</p>
      </div>
      <div class="form-area">
        <h2>{{ isRegister ? $t('common.createAccount') : $t('common.welcomeBack') }}</h2>
        <div class="field">
          <label>{{ $t('common.username') }}</label>
          <input v-model="form.username" :placeholder="`Please enter ${$t('common.username')}`" />
        </div>
        <div v-if="isRegister" class="field">
          <label>{{ $t('common.email') }}</label>
          <input v-model="form.email" :placeholder="`Please enter ${$t('common.email')}`" />
        </div>
        <div class="field">
          <label>{{ $t('common.password') }}</label>
          <input v-model="form.password" type="password" :placeholder="`Please enter ${$t('common.password')}`" />
        </div>
        <button class="btn-primary" @click="handleSubmit">
          {{ isRegister ? $t('common.register') : $t('common.login') }}
        </button>
        <p class="switch-link" @click="isRegister = !isRegister">
          {{ isRegister ? $t('common.haveAccount') : $t('common.noAccount') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()
const $t = t

const isRegister = ref(false)
const form = ref({ username: '', password: '', email: '' })

async function handleSubmit() {
  try {
    if (isRegister.value) {
      await userStore.register(form.value)
      ElMessage.success(t('common.register') + ' ' + t('common.success') + ', ' + t('common.login'))
      isRegister.value = false
    } else {
      await userStore.login(form.value)
      router.push('/')
    }
  } catch (e) { /* handled */ }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--bg);
}
.login-card {
  display: flex;
  width: 820px;
  min-height: 520px;
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  overflow: hidden;
}
.logo-area {
  flex: 1;
  background: #1a1a1a;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 48px;
}
.logo-icon { font-size: 48px; margin-bottom: 16px; }
.logo-area h1 { font-size: 28px; font-weight: 600; letter-spacing: -0.5px; }
.subtitle { color: #999; margin-top: 8px; font-size: 14px; }
.form-area {
  flex: 1;
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.form-area h2 { font-size: 22px; font-weight: 600; margin-bottom: 28px; color: var(--text); }
.field { margin-bottom: 20px; }
.field label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
.field input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  background: #faf9f7;
}
.field input:focus { border-color: var(--primary); }
.btn-primary {
  width: 100%;
  padding: 12px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 8px;
}
.btn-primary:hover { background: var(--primary-light); }
.switch-link {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--accent);
  cursor: pointer;
}
.switch-link:hover { text-decoration: underline; }
</style>
