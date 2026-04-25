<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <span class="logo-icon">✉</span>
          <span class="logo-text">{{ $t('common.appName') }}</span>
        </div>
        <LocaleSwitcher />
      </div>
      <nav class="nav-list">
        <router-link to="/contacts" class="nav-item" :class="{ active: route.path === '/contacts' }">
          <span class="nav-icon">👤</span>{{ $t('navigation.contacts') }}
        </router-link>
        <router-link to="/groups" class="nav-item" :class="{ active: route.path === '/groups' }">
          <span class="nav-icon">👥</span>{{ $t('navigation.groups') }}
        </router-link>
        <router-link to="/templates" class="nav-item" :class="{ active: route.path === '/templates' }">
          <span class="nav-icon">📄</span>{{ $t('navigation.templates') }}
        </router-link>
        <router-link to="/send-email" class="nav-item" :class="{ active: route.path === '/send-email' }">
          <span class="nav-icon">📨</span>{{ $t('navigation.sendEmail') }}
        </router-link>
      <router-link to="/workflow" class="nav-item" :class="{ active: route.path === '/workflow' }">
        <span class="nav-icon">🔗</span>{{ $t('navigation.workflow') }}
      </router-link>
      <router-link to="/instances" class="nav-item" :class="{ active: route.path === '/instances' }">
        <span class="nav-icon">📋</span>{{ $t('navigation.instances') }}
      </router-link>
      <router-link to="/events" class="nav-item" :class="{ active: route.path === '/events' }">
        <span class="nav-icon">📊</span>{{ $t('navigation.events') }}
      </router-link>
      <router-link to="/email-senders" class="nav-item" :class="{ active: route.path === '/email-senders' }">
        <span class="nav-icon">📧</span>{{ $t('navigation.emailSenders') }}
      </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">{{ userStore.username }}</div>
        <button class="btn-logout" @click="handleLogout">{{ $t('common.logout') }}</button>
      </div>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()
const $t = t

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; background: var(--bg); }
.sidebar {
  width: 220px;
  background: var(--card-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 0;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--border);
  gap: 10px;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-icon { font-size: 22px; }
.logo-text { font-size: 18px; font-weight: 600; color: var(--text); letter-spacing: -0.5px; }
.nav-list { flex: 1; padding: 16px 12px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  transition: all 0.15s;
}
.nav-item:hover { background: #f3f2ef; color: var(--text); }
.nav-item.active { background: #1a1a1a; color: #fff; }
.nav-icon { font-size: 16px; }
.sidebar-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}
.user-info { font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; }
.btn-logout {
  width: 100%;
  padding: 8px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-logout:hover { border-color: var(--accent); color: var(--accent); }
.main-content { flex: 1; padding: 36px 40px; overflow-y: auto; }
</style>
