<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">OAuth2 集成</h1>
        <p class="page-desc">连接 Gmail / Outlook 账号实现一键发件</p>
      </div>
    </div>

    <div class="providers">
      <div v-for="p in providers" :key="p.id" :class="['provider-card', { connected: p.connected }]">
        <div class="provider-header">
          <span class="provider-icon">{{ p.id === 'google' ? '📧' : '📅' }}</span>
          <h3>{{ p.name }}</h3>
          <span v-if="p.connected" class="badge connected">✅ 已连接</span>
          <span v-else class="badge">未连接</span>
        </div>
        <p v-if="p.email" class="email">{{ p.email }}</p>
        <button v-if="!p.configured" class="btn-disabled" disabled>需配置 Client ID</button>
        <button v-else-if="!p.connected" class="btn-dark" @click="connect(p.id)">连接 {{ p.name }}</button>
        <button v-else class="btn-outline" @click="loadProviders">刷新状态</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const providers = ref([])

async function loadProviders() {
  try {
    const { data } = await request.get('/oauth/providers')
    providers.value = data
  } catch { /* ignore */ }
}

async function connect(provider) {
  try {
    const { data } = await request.post('/oauth/auth-url', { provider })
    if (data.url) window.open(data.url, '_blank')
  } catch (e) { ElMessage.error('获取授权链接失败') }
}

onMounted(loadProviders)
</script>

<style scoped>
.page-header { margin-bottom: 32px; }
.page-title { font-size: 24px; font-weight: 600; }
.page-desc { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
.providers { display: flex; gap: 16px; flex-wrap: wrap; }
.provider-card {
  width: 280px; padding: 24px; background: var(--card-bg); border: 1px solid var(--border);
  border-radius: var(--radius);
}
.provider-card.connected { border-color: #38b249; }
.provider-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.provider-header h3 { font-size: 16px; font-weight: 600; }
.provider-icon { font-size: 22px; }
.email { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #f3f4f6; color: #666; }
.badge.connected { background: #d1fae5; color: #065f46; }
.btn-dark {
  padding: 8px 18px; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;
}
.btn-outline {
  padding: 8px 18px; background: transparent; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; cursor: pointer;
}
.btn-disabled {
  padding: 8px 18px; background: #e5e7eb; color: #999; border: none; border-radius: 6px; font-size: 13px;
}
</style>