<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">域名设置</h1>
        <p class="page-desc">配置SPF/DKIM/DMARC以确保邮件送达率</p>
      </div>
    </div>

    <div class="domain-setup">
      <div class="domain-input">
        <label>你的域名</label>
        <div class="input-row">
          <input v-model="domain" placeholder="example.com" class="input" @keyup.enter="verify" />
          <button class="btn-dark" @click="verify" :disabled="verifying">
            {{ verifying ? '验证中...' : '验证' }}
          </button>
        </div>
      </div>

      <div v-if="result" class="results">
        <div :class="['record-item', result.records.spf.status]" v-for="(r, key) in result.records" :key="key">
          <div class="record-header">
            <span class="record-label">{{ key.toUpperCase() }}</span>
            <span class="record-badge" :class="r.status">{{ statusLabels[r.status] }}</span>
          </div>
          <p class="record-value" v-if="r.value">当前: {{ r.value }}</p>
          <p class="record-expected" v-if="r.status !== 'passed' && r.expected">
            期望: {{ r.expected }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const domain = ref('')
const verifying = ref(false)
const result = ref(null)

const statusLabels = {
  passed: '✅ 通过',
  warning: '⚠️ 需注意',
  missing: '❌ 未配置',
  unknown: '❓ 未知'
}

async function verify() {
  if (!domain.value.trim()) { ElMessage.warning('请输入域名'); return }
  verifying.value = true
  try {
    const { data } = await request.post('/domain/verify', { domain: domain.value.trim() })
    result.value = data
  } catch (e) { ElMessage.error('验证失败') }
  finally { verifying.value = false }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
.page-title { font-size: 24px; font-weight: 600; }
.page-desc { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
.domain-setup { max-width: 600px; }
.domain-input { margin-bottom: 28px; }
.domain-input label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; }
.input-row { display: flex; gap: 10px; }
.input { flex: 1; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; outline: none; }
.results { display: flex; flex-direction: column; gap: 12px; }
.record-item { padding: 16px; border: 1px solid var(--border); border-radius: 10px; }
.record-item.passed { border-color: #38b249; background: #f0fdf4; }
.record-item.warning { border-color: #f59e0b; background: #fffbeb; }
.record-item.missing { border-color: var(--accent); background: #fef2f2; }
.record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.record-label { font-weight: 700; font-size: 14px; }
.record-badge { font-size: 12px; padding: 2px 8px; border-radius: 4px; }
.record-badge.passed { background: #d1fae5; color: #065f46; }
.record-badge.warning { background: #fef3c7; color: #92400e; }
.record-badge.missing { background: #fee2e2; color: #991b1b; }
.record-value { font-size: 12px; color: #666; word-break: break-all; margin-bottom: 4px; }
.record-expected { font-size: 12px; color: var(--primary); word-break: break-all; }
.btn-dark {
  padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 500; cursor: pointer;
}
.btn-dark:disabled { opacity: 0.5; }
</style>