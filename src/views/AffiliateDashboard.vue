<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">联盟营销</h1>
        <p class="page-desc">推荐链接追踪与佣金</p>
      </div>
    </div>

    <div class="affiliate-layout">
      <div class="referral-section">
        <h3>你的推荐链接</h3>
        <div class="link-box">
          <span class="link-text">{{ stats.link || '点击"生成链接"' }}</span>
          <button class="btn-dark" @click="generateLink">{{ stats.link ? '重新生成' : '生成链接' }}</button>
          <button v-if="stats.link" class="btn-ghost" @click="copyLink">复制</button>
        </div>
        <div class="quick-stats">
          <div class="stat-item"><span class="stat-num">{{ stats.clicks }}</span><span class="stat-label">点击</span></div>
          <div class="stat-item"><span class="stat-num">{{ stats.signups }}</span><span class="stat-label">注册</span></div>
        </div>
      </div>

      <div class="commissions-section" v-if="stats.commissions?.length">
        <h3>佣金记录</h3>
        <table class="table">
          <thead><tr><th>金额</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="(c, i) in stats.commissions" :key="i">
              <td>${{ c.amount.toFixed(2) }}</td>
              <td><span :class="['status-badge', c.status]">{{ c.status === 'paid' ? '已支付' : c.status === 'pending' ? '待支付' : c.status }}</span></td>
              <td>{{ c.created_at }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const stats = reactive({ link: '', code: '', clicks: 0, signups: 0, commissions: [], total_paid: 0, total_pending: 0 })

async function loadStats() {
  try {
    const { data } = await request.get('/affiliate/stats')
    Object.assign(stats, data)
  } catch { /* ignore */ }
}

async function generateLink() {
  const { data } = await request.get('/affiliate/link')
  stats.link = data.link
  stats.code = data.code
  ElMessage.success('推荐链接已生成')
}

function copyLink() {
  navigator.clipboard.writeText(stats.link)
  ElMessage.success('链接已复制')
}

onMounted(loadStats)
</script>

<style scoped>
.page-header { margin-bottom: 32px; }
.page-title { font-size: 24px; font-weight: 600; }
.page-desc { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
.referral-section { margin-bottom: 32px; }
.referral-section h3 { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.link-box { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
.link-text { flex: 1; padding: 10px 14px; background: #f5f5f3; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; color: var(--text-secondary); word-break: break-all; }
.quick-stats { display: flex; gap: 24px; }
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 22px; font-weight: 700; color: var(--primary); }
.stat-label { font-size: 12px; color: #999; margin-top: 2px; }
.commissions-section h3 { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
.table th { background: #f5f5f3; }
.status-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.status-badge.paid { background: #d1fae5; color: #065f46; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.btn-dark {
  padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap;
}
.btn-ghost {
  padding: 10px 20px; background: transparent; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; cursor: pointer; white-space: nowrap;
}
</style>