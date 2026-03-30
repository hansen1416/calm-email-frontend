<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-icon">✉</span>
        <span class="logo-text">Mail Flow</span>
      </div>
      <nav class="nav-list">
        <router-link to="/contacts" class="nav-item" :class="{ active: route.path === '/contacts' }">
          <span class="nav-icon">👤</span>联系人
        </router-link>
        <router-link to="/groups" class="nav-item" :class="{ active: route.path === '/groups' }">
          <span class="nav-icon">👥</span>用户组
        </router-link>
        <router-link to="/templates" class="nav-item" :class="{ active: route.path === '/templates' }">
          <span class="nav-icon">📄</span>邮件模板
        </router-link>
        <router-link to="/send-email" class="nav-item" :class="{ active: route.path === '/send-email' }">
          <span class="nav-icon">📨</span>发送邮件
        </router-link>
        <router-link to="/workflow" class="nav-item" :class="{ active: route.path === '/workflow' }">
          <span class="nav-icon">🔗</span>节点发送
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">{{ userStore.username }}</div>
        <button class="btn-logout" @click="handleLogout">退出登录</button>
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

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

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
  padding: 24px 0;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 24px 28px;
  border-bottom: 1px solid var(--border);
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
