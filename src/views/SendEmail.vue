<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">发送邮件</h1>
        <p class="page-desc">选择模板和收件人，一键发送</p>
      </div>
    </div>

    <div class="send-card">
      <div class="send-section">
        <label>选择邮件模板</label>
        <el-select v-model="form.template_id" placeholder="请选择邮件模板" style="width:100%" size="large">
          <el-option v-for="t in templates" :key="t.id" :label="`${t.name} — ${t.subject}`" :value="t.id" />
        </el-select>
      </div>

      <div class="send-section">
        <label>选择联系人</label>
        <el-select v-model="form.contact_ids" multiple placeholder="选择联系人（可多选）" style="width:100%" size="large">
          <el-option v-for="c in contacts" :key="c.id" :label="`${c.name} (${c.email})`" :value="c.id" />
        </el-select>
      </div>

      <div class="send-section">
        <label>选择用户组</label>
        <el-select v-model="form.group_ids" multiple placeholder="选择用户组（可多选）" style="width:100%" size="large">
          <el-option v-for="g in groups" :key="g.id" :label="`${g.name} (${g.contact_count}人)`" :value="g.id" />
        </el-select>
      </div>

      <button class="btn-send" @click="handleSend" :disabled="sending">
        {{ sending ? '发送中...' : '📨 发送邮件' }}
      </button>
    </div>

    <div v-if="results.length" class="result-card">
      <h3>发送结果</h3>
      <div class="result-list">
        <div v-for="(r, i) in results" :key="i" class="result-item">
          <span class="result-email">{{ r.email }}</span>
          <span :class="['result-tag', r.status === 'sent' ? 'success' : 'fail']">
            {{ r.status === 'sent' ? '✓ 成功' : '✗ 失败' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const templates = ref([])
const contacts = ref([])
const groups = ref([])
const sending = ref(false)
const results = ref([])
const form = ref({ template_id: null, contact_ids: [], group_ids: [] })

async function loadData() {
  const [t, c, g] = await Promise.all([
    request.get('/templates'),
    request.get('/contacts'),
    request.get('/groups')
  ])
  templates.value = t.data
  contacts.value = c.data
  groups.value = g.data
}

async function handleSend() {
  if (!form.value.template_id) { ElMessage.warning('请选择邮件模板'); return }
  if (!form.value.contact_ids.length && !form.value.group_ids.length) {
    ElMessage.warning('请至少选择一个联系人或用户组'); return
  }
  sending.value = true
  try {
    const { data } = await request.post('/email/send', form.value)
    results.value = data.results
    ElMessage.success('发送完成')
  } catch (e) { /* handled */ }
  sending.value = false
}

onMounted(loadData)
</script>

<style scoped>
.page-header { margin-bottom: 32px; }
.page-title { font-size: 24px; font-weight: 600; color: var(--text); letter-spacing: -0.5px; }
.page-desc { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
.send-card {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 32px; max-width: 640px;
}
.send-section { margin-bottom: 24px; }
.send-section label {
  display: block; font-size: 14px; font-weight: 500; color: var(--text); margin-bottom: 8px;
}
.btn-send {
  width: 100%; padding: 14px; background: var(--primary); color: #fff; border: none;
  border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer;
  transition: background 0.15s; margin-top: 8px;
}
.btn-send:hover { background: var(--primary-light); }
.btn-send:disabled { opacity: 0.6; cursor: not-allowed; }
.result-card {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 24px; max-width: 640px; margin-top: 20px;
}
.result-card h3 { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 16px; }
.result-list { display: flex; flex-direction: column; gap: 8px; }
.result-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: #faf9f7; border-radius: 8px;
}
.result-email { font-size: 14px; color: var(--text); }
.result-tag {
  font-size: 13px; font-weight: 500; padding: 3px 10px; border-radius: 20px;
}
.result-tag.success { background: #e8f5e9; color: #2e7d32; }
.result-tag.fail { background: #fce4ec; color: #c62828; }
</style>
