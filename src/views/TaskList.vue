<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('tasks.title') }}</h1>
        <p class="page-desc">{{ $t('tasks.description') }}</p>
      </div>
      <div class="filter-bar">
        <select v-model="filterStatus" @change="loadTasks" class="status-filter">
          <option value="">{{ $t('tasks.all') }}</option>
          <option value="pending">{{ $t('tasks.pending') }}</option>
          <option value="completed">{{ $t('tasks.completed') }}</option>
        </select>
      </div>
    </div>

    <div v-if="!tasks.length" class="empty-state">
      <p>{{ $t('tasks.empty') }}</p>
    </div>

    <div v-else class="task-list">
      <div v-for="t in tasks" :key="t.id" :class="['task-card', { completed: t.status === 'completed' }]">
        <div class="task-header">
          <span class="task-status" :class="t.status">{{ t.status === 'pending' ? $t('tasks.pending') : $t('tasks.completed') }}</span>
          <h3>{{ t.title }}</h3>
        </div>
        <div class="task-body">
          <p v-if="t.task_content" class="task-content">{{ t.task_content }}</p>
          <p v-if="t.description">{{ t.description }}</p>
          <div class="task-meta">
            <span>📋 {{ t.workflow_name || '—' }}</span>
            <span>👤 {{ t.contact_name }}</span>
            <span>📧 {{ t.contact_email }}</span>
          </div>
        </div>
        <div class="task-footer" v-if="t.status === 'pending'">
          <input v-model="completeResults[t.id]" :placeholder="$t('tasks.resultPlaceholder')" class="result-input" />
          <button class="btn-dark" @click="doComplete(t.id)">{{ $t('tasks.markComplete') }}</button>
        </div>
        <div class="task-footer" v-else>
          <p class="completed-note">✅ {{ t.result || $t('tasks.completedNote') }} · {{ t.completed_at }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const { t } = useI18n()
const tasks = ref([])
const filterStatus = ref('')
const completeResults = reactive({})

async function loadTasks() {
  const { data } = await request.get('/tasks', { params: filterStatus.value ? { status: filterStatus.value } : {} })
  tasks.value = data
}

async function doComplete(id) {
  await request.post(`/tasks/${id}/complete`, { result: completeResults[id] || '' })
  ElMessage.success(t('tasks.taskCompleted'))
  loadTasks()
}

onMounted(loadTasks)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
.page-title { font-size: 24px; font-weight: 600; }
.page-desc { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
.filter-bar { }
.status-filter { padding: 8px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; }
.task-list { display: flex; flex-direction: column; gap: 12px; }
.task-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; }
.task-card.completed { opacity: 0.7; }
.task-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.task-header h3 { font-size: 15px; font-weight: 600; }
.task-status { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #fef3c7; color: #92400e; }
.task-status.completed { background: #d1fae5; color: #065f46; }
.task-body p { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.task-content { background: #f8f7f5; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: var(--text); border-left: 3px solid var(--primary); white-space: pre-wrap; word-break: break-word; margin-bottom: 8px; }
.task-meta { display: flex; gap: 16px; font-size: 12px; color: #999; }
.task-footer { display: flex; gap: 10px; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
.result-input { flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; outline: none; }
.completed-note { font-size: 13px; color: #38b249; }
.btn-dark {
  padding: 8px 18px; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;
}
.empty-state { text-align: center; padding: 80px 0; color: var(--text-secondary); font-size: 15px; }
</style>