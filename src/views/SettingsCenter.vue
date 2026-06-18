<template>
  <div class="settings-page">
    <!-- 左侧 tab 列表 -->
    <aside class="settings-sidebar">
      <div class="sidebar-title">{{ $t('settings.title') }}</div>
      <div v-for="tab in tabs" :key="tab.key"
           :class="['tab-item', { active: activeTab === tab.key }]"
           @click="activeTab = tab.key">
        <span class="tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main class="settings-main">
      <!-- 发件人管理 -->
      <div v-if="activeTab === 'senders'" class="tab-content">
        <EmailSenders />
      </div>

      <!-- 域名验证 -->
      <div v-if="activeTab === 'domain'" class="tab-content">
        <div class="content-header"><h2>{{ $t('settings.domain') }}</h2></div>
        <p class="content-desc">{{ $t('settings.domainDesc') }}</p>

        <div class="domain-input">
          <label>{{ $t('settings.domainInput') }}</label>
          <div class="input-row">
            <input v-model="domainInput" placeholder="example.com" class="input" @keyup.enter="verifyDomain" />
            <button class="btn-dark" @click="verifyDomain" :disabled="domainVerifying">
              {{ domainVerifying ? $t('settings.verifying') : $t('settings.verifyDomain') }}
            </button>
          </div>
        </div>

        <div v-if="domainResult" class="dns-results">
          <div :class="['record-item', r.status]" v-for="(r, key) in domainResult.records" :key="key">
            <div class="record-header">
              <span class="record-label">{{ key.toUpperCase() }}</span>
              <span :class="['record-badge', r.status]">{{ statusLabels[r.status] }}</span>
            </div>
            <p class="record-value" v-if="r.value">{{ $t('settings.domainCurrent') }}: {{ r.value }}</p>
            <p class="record-expected" v-if="r.status !== 'passed' && r.expected">{{ $t('settings.domainExpected') }}: {{ r.expected }}</p>
          </div>
        </div>
      </div>

      <!-- OAuth2 -->
      <div v-if="activeTab === 'oauth'" class="tab-content">
        <div class="content-header"><h2>{{ $t('settings.oauthTitle') }}</h2></div>
        <p class="content-desc">{{ $t('settings.oauthDesc') }}</p>

        <div class="oauth-section">
          <h4>{{ $t('settings.oauthConfigTitle') }}</h4>
          <div class="oauth-config-card" v-for="p in oauthProviders" :key="p.id">
            <h5>{{ p.name }}</h5>
            <div class="field">
              <label>{{ $t('settings.clientId') }}</label>
              <input v-model="oauthForms[p.id].client_id" class="info-input" :placeholder="$t('settings.enterClientId')" />
            </div>
            <div class="field">
              <label>{{ $t('settings.clientSecret') }}</label>
              <input v-model="oauthForms[p.id].client_secret" type="password" class="info-input" :placeholder="$t('settings.enterClientSecret')" />
            </div>
            <button class="btn-dark small" @click="saveOAuthConfig(p.id)">{{ $t('settings.saveConfig') }}</button>
          </div>
        </div>

        <div class="oauth-section">
          <h4>{{ $t('settings.connectionStatus') }}</h4>
          <div class="providers">
            <div v-for="p in oauthProviders" :key="p.id" :class="['provider-card', { connected: p.connected }]">
              <div class="provider-header">
                <span class="provider-icon">{{ p.id === 'google' ? '📧' : '📅' }}</span>
                <h3>{{ p.name }}</h3>
                <span v-if="p.connected" class="badge connected">{{ $t('settings.oauthConnected') }}</span>
                <span v-else class="badge">{{ $t('settings.oauthNotConnected') }}</span>
              </div>
              <p v-if="p.email" class="email">{{ p.email }}</p>
              <button v-if="!p.configured" class="btn-disabled" disabled>{{ $t('settings.needConfig') }}</button>
              <button v-else-if="!p.connected" class="btn-dark" @click="oauthConnect(p.id)">{{ $t('settings.connectProvider', { name: p.name }) }}</button>
              <button v-else class="btn-ghost" @click="loadOAuthProviders">{{ $t('settings.refreshStatus') }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 联盟营销 -->
      <div v-if="activeTab === 'affiliate'" class="tab-content">
        <div class="content-header"><h2>{{ $t('settings.affiliateTitle') }}</h2></div>
        <p class="content-desc">{{ $t('settings.affiliateDesc') }}</p>

        <div class="referral-section">
          <h3>{{ $t('settings.yourLink') }}</h3>
          <div class="link-box">
            <span class="link-text">{{ affStats.link || $t('settings.noLink') }}</span>
            <button class="btn-dark" @click="affGenerateLink">{{ affStats.link ? $t('settings.regenerate') : $t('settings.generateLink') }}</button>
            <button v-if="affStats.link" class="btn-ghost" @click="affCopyLink">{{ $t('settings.copyLink') }}</button>
          </div>
          <div class="quick-stats">
            <div class="stat-item"><span class="stat-num">{{ affStats.clicks }}</span><span class="stat-label">{{ $t('settings.clicks') }}</span></div>
            <div class="stat-item"><span class="stat-num">{{ affStats.signups }}</span><span class="stat-label">{{ $t('settings.signups') }}</span></div>
            <div class="stat-item"><span class="stat-num">${{ (affStats.total_paid || 0).toFixed(2) }}</span><span class="stat-label">{{ $t('settings.paid') }}</span></div>
            <div class="stat-item"><span class="stat-num">${{ (affStats.total_pending || 0).toFixed(2) }}</span><span class="stat-label">{{ $t('settings.pendingComm') }}</span></div>
          </div>
        </div>

        <div class="commissions-section" v-if="affStats.commissions?.length">
          <h3>{{ $t('settings.commissions') }}</h3>
          <table class="table">
            <thead><tr><th>{{ $t('settings.amount') }}</th><th>{{ $t('settings.pending') }}</th><th>{{ $t('settings.time') }}</th></tr></thead>
            <tbody>
              <tr v-for="(c, i) in affStats.commissions" :key="i">
                <td>${{ c.amount.toFixed(2) }}</td>
                <td>
                  <span :class="['badge', c.status]">
                    {{ c.status === 'paid' ? $t('settings.paid') : c.status === 'pending' ? $t('settings.pendingComm') : c.status }}
                  </span>
                </td>
                <td>{{ c.created_at }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import EmailSenders from '@/views/EmailSenders.vue'

// --- Tabs ---
const activeTab = ref('senders')
const { t } = useI18n()
const $t = t
const tabs = computed(() => [
  { key: 'senders', label: t('settings.senders'), icon: '📧' },
  { key: 'domain',  label: t('settings.domain'), icon: '🌐' },
  { key: 'oauth',   label: t('settings.oauth'), icon: '🔑' },
  { key: 'affiliate', label: t('settings.affiliate'), icon: '💎' },
])

// --- Senders ---
// (handled by EmailSenders component internally)

// --- Domain ---
const domainInput = ref('')
const domainVerifying = ref(false)
const domainResult = ref(null)
const statusLabels = computed(() => ({ passed: t('settings.statusPassed'), warning: t('settings.statusWarning'), missing: t('settings.statusMissing'), unknown: t('settings.statusUnknown') }))

async function verifyDomain() {
  if (!domainInput.value) { ElMessage.warning(t('settings.enterDomain')); return }
  domainVerifying.value = true
  try {
    const { data } = await request.post('/domain/verify', { domain: domainInput.value })
    domainResult.value = data
  } catch { ElMessage.error(t('settings.verifyFailed')) }
  domainVerifying.value = false
}

// --- OAuth ---
const oauthProviders = ref([])
const oauthForms = reactive({ google: { client_id: '', client_secret: '' }, outlook: { client_id: '', client_secret: '' } })

async function loadOAuthProviders() {
  // 默认 providers（API 失败时使用）
  const defaultProviders = [
    { id: 'google', name: 'Google', configured: false, connected: false, email: null },
    { id: 'outlook', name: 'Outlook', configured: false, connected: false, email: null }
  ]
  try {
    const { data: providers } = await request.get('/oauth/providers')
    oauthProviders.value = providers.length ? providers : defaultProviders
  } catch {
    oauthProviders.value = defaultProviders
  }
  try {
    const { data: config } = await request.get('/oauth/config')
    if (config.google) { oauthForms.google.client_id = config.google.client_id || ''; oauthForms.google.client_secret = '' }
    if (config.outlook) { oauthForms.outlook.client_id = config.outlook.client_id || ''; oauthForms.outlook.client_secret = '' }
  } catch {}
}
async function saveOAuthConfig(provider) {
  try {
    await request.put('/oauth/config', { provider, client_id: oauthForms[provider].client_id, client_secret: oauthForms[provider].client_secret })
    ElMessage.success(t('settings.configSaved'))
    loadOAuthProviders()
  } catch (e) {
    console.error('OAuth save error:', e); ElMessage.error(t('settings.saveFailed'))
  }
}
async function oauthConnect(provider) {
  try {
    const { data } = await request.post('/oauth/auth-url', { provider })
    if (data.url) window.open(data.url, '_blank')
  } catch (e) { console.error('OAuth connect error:', e); ElMessage.error(t('settings.connectFailed')) }
}

// --- Affiliate ---
const affStats = reactive({
  link: '', code: '', clicks: 0, signups: 0,
  commissions: [], total_paid: 0, total_pending: 0
})

async function loadAffStats() {
  try {
    const { data } = await request.get('/affiliate/stats')
    Object.assign(affStats, data)
  } catch {}
}
async function affGenerateLink() {
  try {
    const { data } = await request.get('/affiliate/link')
    Object.assign(affStats, data)
    ElMessage.success(t('settings.linkGenerated'))
  } catch (e) { console.error('Affiliate link error:', e); ElMessage.error(t('settings.generateFailed')) }
}
async function affCopyLink() {
  if (!affStats.link) return
  try {
    await navigator.clipboard.writeText(affStats.link)
    ElMessage.success(t('settings.copied'))
  } catch { ElMessage.warning(t('settings.copyFailed')) }
}

onMounted(() => {
  loadOAuthProviders()
  loadAffStats()
})
</script>

<style scoped>
.settings-page { display: flex; height: calc(100vh - 80px); overflow: hidden; }

/* sidebar */
.settings-sidebar {
  width: 200px; flex-shrink: 0; border-right: 1px solid var(--border);
  background: var(--card-bg); padding-top: 8px;
}
.sidebar-title {
  padding: 8px 16px 12px; font-size: 12px; color: var(--text-secondary);
  font-weight: 600; text-transform: uppercase;
}
.tab-item {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  cursor: pointer; font-size: 14px; color: var(--text-secondary);
  transition: all 0.15s; border-radius: 0;
}
.tab-item:hover { background: #f5f5f3; color: var(--text); }
.tab-item.active { background: #7f4a89; color: #fff; }
.tab-icon { font-size: 16px; }

/* main */
.settings-main { flex: 1; overflow-y: auto; padding: 24px 32px; min-height: 0; }
.tab-content { width: 100%; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.content-header h2 { font-size: 20px; font-weight: 600; color: var(--text); margin: 0; }
.content-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }


/* domain */
.domain-input { margin-bottom: 20px; }
.domain-input label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
.input-row { display: flex; gap: 10px; }
.input { flex: 1; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; outline: none; background: #faf9f7; }
.dns-results { display: flex; flex-direction: column; gap: 10px; }
.record-item { padding: 14px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--card-bg); }
.record-item.passed { border-left: 4px solid #2e7d32; }
.record-item.warning { border-left: 4px solid #ed6c02; }
.record-item.missing { border-left: 4px solid #c62828; }
.record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.record-label { font-weight: 600; font-size: 14px; color: var(--text); }
.record-badge { font-size: 12px; padding: 2px 10px; border-radius: 12px; }
.record-badge.passed { background: #e8f5e9; color: #2e7d32; }
.record-badge.warning { background: #fff3e0; color: #ed6c02; }
.record-badge.missing { background: #fce4ec; color: #c62828; }
.record-value, .record-expected { font-size: 12px; color: var(--text-secondary); margin: 2px 0; font-family: monospace; }

/* oauth */
.providers { display: flex; flex-direction: column; gap: 12px; }
.provider-card {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
  padding: 20px;
}
.provider-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.provider-header h3 { margin: 0; font-size: 16px; color: var(--text); }
.provider-icon { font-size: 20px; }
.badge { font-size: 12px; padding: 2px 10px; border-radius: 12px; background: #f3f2ef; color: var(--text-secondary); }
.badge.connected { background: #e8f5e9; color: #2e7d32; }
.badge.paid { background: #e8f5e9; color: #2e7d32; }
.badge.pending { background: #fff3e0; color: #ed6c02; }
.email { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.oauth-section { margin-bottom: 24px; }
.oauth-section h4 { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 12px; }
.oauth-config-card {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
  padding: 16px 20px; margin-bottom: 12px;
}
.oauth-config-card h5 { margin: 0 0 12px 0; font-size: 14px; color: var(--text); }
.oauth-config-card .field { margin-bottom: 12px; }
.oauth-config-card label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500; }
.info-input {
  width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; outline: none; background: #faf9f7;
}
.btn-dark.small { padding: 6px 16px; font-size: 13px; }

/* affiliate */
.referral-section { margin-bottom: 24px; }
.referral-section h3 { font-size: 16px; color: var(--text); margin-bottom: 12px; }
.link-box {
  display: flex; align-items: center; gap: 10px;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 12px 16px; margin-bottom: 16px;
}
.link-text { flex: 1; font-size: 13px; color: var(--text-secondary); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.quick-stats { display: flex; gap: 20px; }
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.stat-num { font-size: 20px; font-weight: 700; color: var(--text); }
.stat-label { font-size: 12px; color: var(--text-secondary); }
.commissions-section h3 { font-size: 16px; color: var(--text); margin-bottom: 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); }
.table th { color: var(--text-secondary); font-weight: 500; font-size: 12px; }

/* shared */
.btn-dark {
  padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap;
}
.btn-dark:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  padding: 6px 14px; background: transparent; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; color: var(--text-secondary); cursor: pointer;
}
.btn-ghost.danger:hover { border-color: var(--accent); color: var(--accent); }
.btn-disabled {
  padding: 8px 16px; background: #f3f2ef; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 6px; font-size: 13px; cursor: not-allowed;
}
.empty-hint { text-align: center; padding: 40px 0; color: var(--text-secondary); font-size: 14px; }
.dialog-form .field { margin-bottom: 16px; }
.dialog-form label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
.dialog-form input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  font-size: 14px; outline: none; background: #faf9f7;
}
</style>