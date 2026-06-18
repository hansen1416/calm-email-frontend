<template>
  <div class="profile-page">
    <!-- 左侧选项卡 -->
    <aside class="profile-sidebar">
      <div class="sidebar-title">用户中心</div>
      <div v-for="tab in tabs" :key="tab.key"
           :class="['tab-item', { active: activeTab === tab.key }]"
           @click="activeTab = tab.key">
        <span class="tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main class="profile-main">
      <!-- 个人信息 -->
      <div v-if="activeTab === 'info'" class="profile-info">
        <h2>个人信息</h2>
        <div class="info-card">
          <div class="info-row">
            <label>用户名</label>
            <span class="info-value">{{ userStore.username }}</span>
          </div>
          <div class="info-row">
            <label>当前头像</label>
            <div class="avatar-selector">
              <div v-for="(emoji, key) in avatarList" :key="key"
                   :class="['avatar-option', { selected: selectedAvatar === key }]"
                   @click="selectedAvatar = key">
                <span class="avatar-emoji">{{ emoji }}</span>
              </div>
            </div>
          </div>
          <div class="info-row">
            <label>邮箱</label>
            <input v-model="emailForm" class="info-input" placeholder="输入邮箱" />
          </div>
          <button class="btn-dark" @click="saveProfile" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>

      <!-- 修改密码 -->
      <div v-if="activeTab === 'password'" class="profile-password">
        <h2>修改密码</h2>
        <div class="info-card">
          <div class="info-row">
            <label>旧密码</label>
            <input v-model="oldPassword" type="password" class="info-input" placeholder="输入旧密码" />
          </div>
          <div class="info-row">
            <label>新密码</label>
            <input v-model="newPassword" type="password" class="info-input" placeholder="输入新密码" />
          </div>
          <div class="info-row">
            <label>确认新密码</label>
            <input v-model="confirmPassword" type="password" class="info-input" placeholder="再次输入新密码" />
          </div>
          <button class="btn-dark" @click="changePwd" :disabled="pwdSaving">
            {{ pwdSaving ? '修改中...' : '修改密码' }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()

const activeTab = ref('info')
const tabs = [
  { key: 'info', label: '个人信息', icon: '👤' },
  { key: 'password', label: '修改密码', icon: '🔒' },
]

const avatarList = {
  'avatar-1': '🐼', 'avatar-2': '🐱', 'avatar-3': '🦊', 'avatar-4': '🐰',
  'avatar-5': '🐨', 'avatar-6': '🐸', 'avatar-7': '🦁', 'avatar-8': '🐵',
}

const selectedAvatar = ref(userStore.avatar || 'avatar-1')
const emailForm = ref(userStore.email || '')
const saving = ref(false)

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const pwdSaving = ref(false)

async function saveProfile() {
  saving.value = true
  try {
    await userStore.updateProfile({ avatar: selectedAvatar.value, email: emailForm.value })
    ElMessage.success('个人信息已更新')
  } catch { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

async function changePwd() {
  if (!oldPassword.value || !newPassword.value) { ElMessage.warning('请填写密码'); return }
  if (newPassword.value !== confirmPassword.value) { ElMessage.warning('两次新密码不一致'); return }
  pwdSaving.value = true
  try {
    await userStore.changePassword(oldPassword.value, newPassword.value)
    ElMessage.success('密码修改成功')
    oldPassword.value = ''; newPassword.value = ''; confirmPassword.value = ''
  } catch (e) { ElMessage.error(e.response?.data?.msg || '修改失败') }
  finally { pwdSaving.value = false }
}

onMounted(() => {
  selectedAvatar.value = userStore.avatar || 'avatar-1'
  emailForm.value = userStore.email || ''
})
</script>

<style scoped>
.profile-page { display: flex; height: calc(100vh - 132px); overflow: hidden; }

.profile-sidebar {
  width: 180px; flex-shrink: 0; border-right: 1px solid var(--border);
  background: var(--card-bg); padding-top: 8px;
}
.sidebar-title {
  padding: 8px 16px 12px; font-size: 12px; color: var(--text-secondary);
  font-weight: 600; text-transform: uppercase;
}
.tab-item {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  cursor: pointer; font-size: 14px; color: var(--text-secondary);
  transition: all 0.15s;
}
.tab-item:hover { background: #f5f5f3; color: var(--text); }
.tab-item.active { background: var(--primary); color: #fff; }
.tab-icon { font-size: 16px; }

.profile-main { flex: 1; overflow-y: auto; padding: 24px 32px; }
.profile-main h2 { font-size: 20px; font-weight: 600; color: var(--text); margin: 0 0 20px 0; }

.info-card { max-width: 480px; }
.info-row { margin-bottom: 18px; }
.info-row label {
  display: block; font-size: 13px; color: var(--text-secondary);
  margin-bottom: 6px; font-weight: 500;
}
.info-value { font-size: 15px; color: var(--text); padding: 8px 0; display: block; }
.info-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border);
  border-radius: 8px; font-size: 14px; outline: none; background: #faf9f7;
}
.avatar-selector { display: flex; gap: 10px; flex-wrap: wrap; }
.avatar-option {
  width: 52px; height: 52px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  border: 3px solid var(--border); cursor: pointer; transition: all 0.15s;
}
.avatar-option:hover { border-color: #999; }
.avatar-option.selected { border-color: var(--primary); background: #f5f5f3; }
.avatar-emoji { font-size: 28px; }

.btn-dark {
  padding: 10px 28px; background: var(--primary); color: #fff;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;
}
.btn-dark:disabled { opacity: 0.6; cursor: not-allowed; }
</style>