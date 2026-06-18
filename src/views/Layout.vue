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
        <router-link to="/audience" class="nav-item" :class="{ active: route.path.startsWith('/audience') }">
          <span class="nav-icon">👤</span>{{ $t('navigation.audience') }}
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
        <router-link to="/tasks" class="nav-item" :class="{ active: route.path === '/tasks' }">
          <span class="nav-icon">📞</span>{{ $t('navigation.tasks') }}
        </router-link>
        <router-link to="/settings" class="nav-item" :class="{ active: route.path.startsWith('/settings') }">
          <span class="nav-icon">⚙️</span>{{ $t('navigation.settings') }}
        </router-link>
      </nav>
    </aside>
    <div class="right-area">
      <header class="top-bar">
        <div></div>
        <div class="top-bar-right">
          <div class="notify-btn" @click="showNotifications = !showNotifications" :title="$t('notification.title')">
            <span class="notify-icon">🔔</span>
            <span v-if="userStore.unreadCount" class="notify-badge">{{ userStore.unreadCount }}</span>
          </div>
          <el-dropdown trigger="hover" @command="handleUserCommand">
            <div class="user-avatar-area">
              <span class="user-avatar-icon">{{ avatarEmoji }}</span>
              <span class="user-name">{{ userStore.username }}</span>
              <span class="dropdown-arrow">▾</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">👤 {{ $t('user.profile') }}</el-dropdown-item>
                <el-dropdown-item command="logout">🚪 {{ $t('common.logout') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div v-if="showNotifications" class="notify-panel">
          <div class="notify-panel-header"><span>{{ $t('notification.title') }}</span><button class="notify-clear" @click="userStore.fetchNotifications">{{ $t('notification.refresh') }}</button></div>
          <div v-if="!userStore.notifications.length" class="notify-empty">{{ $t('notification.empty') }}</div>
          <div v-else class="notify-list">
            <div v-for="n in userStore.notifications.slice(0, 20)" :key="n.id"
                 :class="['notify-item', { unread: !n.is_read }]"
                 @click="handleNotificationClick(n)">
              <div class="notify-title">{{ n.title }}</div>
              <div class="notify-time">{{ n.created_at }}</div>
            </div>
          </div>
        </div>
      </header>
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()
const $t = t

const showNotifications = ref(false)

const avatarList = {
  'avatar-1': '🐼', 'avatar-2': '🐱', 'avatar-3': '🦊', 'avatar-4': '🐰',
  'avatar-5': '🐨', 'avatar-6': '🐸', 'avatar-7': '🦁', 'avatar-8': '🐵'
}
const avatarEmoji = computed(() => avatarList[userStore.avatar] || '🐼')

function handleUserCommand(cmd) {
  if (cmd === 'profile') router.push('/profile')
  if (cmd === 'logout') handleLogout()
}
function handleLogout() {
  userStore.logout()
  router.push('/login')
}
function handleNotificationClick(n) {
  showNotifications.value = false
  if (n.type === 'manual_task') {
    // 如果是人工任务通知，跳转到任务列表
    router.push('/tasks')
  }
}

let notifInterval = null

onMounted(() => {
  userStore.fetchMe()
  userStore.fetchNotifications()
  notifInterval = setInterval(() => userStore.fetchNotifications(), 20000)
})
onUnmounted(() => {
  if (notifInterval) clearInterval(notifInterval)
})
</script>

<style scoped>
.layout { display: flex; height: 100vh; overflow: hidden; background: var(--bg); }
.sidebar {
  width: 220px;
  background: var(--card-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 0;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--border);
  gap: 10px;
  flex-shrink: 0;
}
.sidebar-logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { font-size: 22px; }
.logo-text { font-size: 18px; font-weight: 600; color: var(--text); letter-spacing: -0.5px; }
.nav-list { flex: 1; overflow-y: auto; padding: 16px 12px; }
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
.nav-item.active { background: #b9abbf; color: #fff; }
.nav-icon { font-size: 16px; }
/* right area */
.right-area { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.top-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 32px; height: 52px; border-bottom: 1px solid var(--border);
  background: var(--card-bg); flex-shrink: 0; position: relative;
}
.top-bar-right { display: flex; align-items: center; gap: 16px; }
.notify-btn { position: relative; cursor: pointer; font-size: 18px; }
.notify-icon { display: block; }
.notify-badge {
  position: absolute; top: -6px; right: -8px;
  background: #c62828; color: #fff; font-size: 10px; min-width: 16px;
  height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
}
.user-avatar-area {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 4px 8px; border-radius: 6px;
}
.user-avatar-area:hover { background: #f3f2ef; }
.user-avatar-icon { font-size: 24px; }
.user-name { font-size: 14px; font-weight: 500; color: var(--text); }
.dropdown-arrow { font-size: 10px; color: var(--text-secondary); }
.main-content { flex: 1; padding: 24px 32px; overflow-y: auto; min-height: 0; }
.notify-panel {
  position: absolute; top: calc(100% + 4px); right: 48px; width: 320px;
  background: #fff; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  border: 1px solid var(--border); z-index: 1000; overflow: hidden;
}
.notify-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 13px; font-weight: 600; color: var(--text);
}
.notify-clear { background: none; border: none; font-size: 12px; color: var(--primary); cursor: pointer; }
.notify-empty { padding: 24px; text-align: center; color: var(--text-secondary); font-size: 13px; }
.notify-list { max-height: 300px; overflow-y: auto; }
.notify-item {
  padding: 10px 16px; cursor: pointer; border-bottom: 1px solid #f3f2ef;
}
.notify-item:hover { background: #faf9f7; }
.notify-item.unread { background: #f0f7ff; }
.notify-title { font-size: 13px; color: var(--text); font-weight: 500; margin-bottom: 2px; }
.notify-time { font-size: 11px; color: var(--text-secondary); }
</style>