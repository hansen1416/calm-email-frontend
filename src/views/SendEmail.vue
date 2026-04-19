<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('sendEmail.title') }}</h1>
        <p class="page-desc">{{ $t('sendEmail.description') }}</p>
      </div>
    </div>

    <div class="send-card">
      <div class="send-section">
        <label>{{ $t('sendEmail.selectTemplate') }}</label>
        <el-select v-model="form.template_id" :placeholder="$t('sendEmail.selectTemplate')" style="width:100%" size="large">
          <el-option v-for="t in templates" :key="t.id" :label="`${t.name} — ${t.subject}`" :value="t.id" />
        </el-select>
      </div>

      <div class="send-section">
        <label>{{ $t('sendEmail.selectContacts') }}</label>
        <el-select v-model="form.contact_ids" multiple :placeholder="$t('sendEmail.selectContacts') + ' (multiple)'" style="width:100%" size="large">
          <el-option v-for="c in contacts" :key="c.id" :label="`${c.name} (${c.email})`" :value="c.id" />
        </el-select>
      </div>

      <div class="send-section">
        <label>{{ $t('sendEmail.selectGroups') }}</label>
        <el-select v-model="form.group_ids" multiple :placeholder="$t('sendEmail.selectGroups') + ' (multiple)'" style="width:100%" size="large">
          <el-option v-for="g in groups" :key="g.id" :label="`${g.name} (${g.contact_count}${$t('groups.people')})`" :value="g.id" />
        </el-select>
      </div>

      <button class="btn-send" @click="handleSend" :disabled="sending">
        {{ sending ? $t('sendEmail.sending') : $t('sendEmail.sendButton') }}
      </button>
    </div>

    <div v-if="results.length" class="result-card">
      <h3>{{ $t('sendEmail.results') }}</h3>
      <div class="result-list">
        <div v-for="(r, i) in results" :key="i" class="result-item">
          <span class="result-email">{{ r.email }}</span>
          <span :class="['result-tag', r.status === 'sent' ? 'success' : 'fail']">
            {{ r.status === 'sent' ? $t('workflow.statusSuccess') : $t('workflow.statusFail') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const { t } = useI18n()
const $t = t

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
  if (!form.value.template_id) { ElMessage.warning(t('sendEmail.selectTemplateMsg')); return }
  if (!form.value.contact_ids.length && !form.value.group_ids.length) {
    ElMessage.warning(t('sendEmail.selectRecipientMsg')); return
  }
  sending.value = true
  try {
    const { data } = await request.post('/email/send', form.value)
    results.value = data.results
    ElMessage.success(t('sendEmail.completed'))
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
