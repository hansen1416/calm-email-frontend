<template>
  <div class="instances-page">
    <div class="page-header">
      <h2>{{ $t('instances.title') }}</h2>
      <p class="desc">{{ $t('instances.description') }}</p>
    </div>

    <!-- 筛选栏 -->
    <div class="filters">
      <el-select v-model="filterStatus" :placeholder="$t('instances.filterByStatus')" clearable style="width: 150px">
        <el-option :label="$t('instances.allStatuses')" value="" />
        <el-option :label="$t('instances.pending')" value="pending" />
        <el-option :label="$t('instances.running')" value="running" />
        <el-option :label="$t('instances.waitingEvent')" value="waiting_event" />
        <el-option :label="$t('instances.delayed')" value="delayed" />
        <el-option :label="$t('instances.completed')" value="completed" />
        <el-option :label="$t('instances.failed')" value="failed" />
        <el-option :label="$t('instances.cancelled')" value="cancelled" />
      </el-select>
      <el-input v-model="filterWorkflow" :placeholder="$t('instances.searchWorkflow')" clearable style="width: 200px" />
      <el-input v-model="filterRecipient" :placeholder="$t('instances.searchRecipient')" clearable style="width: 200px" />
    </div>

    <!-- 实例列表 -->
    <el-table :data="instances" v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="workflow_name" :label="$t('instances.workflowName')" min-width="120" />
      <el-table-column prop="recipient_email" :label="$t('instances.recipient')" min-width="180" />
      <el-table-column prop="status" :label="$t('instances.status')" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ formatStatus(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="waiting_event_type" :label="$t('instances.waitingFor')" width="120">
        <template #default="{ row }">
          <span v-if="row.status === 'waiting_event'">
            {{ row.waiting_event_type || '-' }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" :label="$t('instances.createdAt')" width="160" />
      <el-table-column prop="updated_at" :label="$t('instances.updatedAt')" width="160" />
      <el-table-column :label="$t('common.actions')" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="viewDetails(row)">{{ $t('common.view') }}</el-button>
          <el-button
            v-if="['waiting_event', 'delayed', 'pending'].includes(row.status)"
            size="small"
            type="danger"
            @click="cancelInstance(row)"
          >
            {{ $t('common.cancel') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-if="total > 0"
      :current-page="page"
      :page-size="perPage"
      :total="total"
      @current-change="loadInstances"
      layout="prev, pager, next, total"
      style="margin-top: 20px; justify-content: center"
    />

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailsVisible" :title="$t('instances.instanceDetails')" width="700px">
      <div v-if="selectedInstance" class="instance-details">
        <div class="detail-section">
          <h4>{{ $t('instances.basicInfo') }}</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item :label="$t('instances.id')">{{ selectedInstance.instance.id }}</el-descriptions-item>
            <el-descriptions-item :label="$t('instances.workflowName')">{{ selectedInstance.instance.workflow_name }}</el-descriptions-item>
            <el-descriptions-item :label="$t('instances.recipient')">{{ selectedInstance.instance.recipient_email }}</el-descriptions-item>
            <el-descriptions-item :label="$t('instances.messageId')">{{ selectedInstance.instance.message_id || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="$t('instances.status')">
              <el-tag :type="getStatusType(selectedInstance.instance.status)">
                {{ formatStatus(selectedInstance.instance.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('instances.currentNode')">{{ selectedInstance.instance.current_node_id || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="$t('instances.createdAt')">{{ selectedInstance.instance.created_at }}</el-descriptions-item>
            <el-descriptions-item :label="$t('instances.updatedAt')">{{ selectedInstance.instance.updated_at }}</el-descriptions-item>
            <el-descriptions-item v-if="selectedInstance.instance.completed_at" :label="$t('instances.completedAt')">
              {{ selectedInstance.instance.completed_at }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="selectedInstance.instance.waiting_conditions" class="detail-section">
          <h4>{{ $t('instances.waitingConditions') }}</h4>
          <el-alert type="info" :closable="false">
            <p><strong>{{ $t('instances.eventType') }}:</strong> {{ selectedInstance.instance.waiting_event_type }}</p>
            <p><strong>{{ $t('instances.conditions') }}:</strong> {{ JSON.stringify(selectedInstance.instance.waiting_conditions) }}</p>
            <p v-if="selectedInstance.instance.waiting_since">
              <strong>{{ $t('instances.waitingSince') }}:</strong> {{ selectedInstance.instance.waiting_since }}
            </p>
          </el-alert>
        </div>

        <div v-if="selectedInstance.email_logs?.length" class="detail-section">
          <h4>{{ $t('instances.emailLogs') }}</h4>
          <el-table :data="selectedInstance.email_logs" size="small">
            <el-table-column prop="subject" :label="$t('instances.subject')" />
            <el-table-column prop="recipient_email" :label="$t('instances.recipient')" />
            <el-table-column prop="status" :label="$t('instances.status')" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'sent' ? 'success' : 'danger'" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sent_at" :label="$t('instances.sentAt')" width="150" />
          </el-table>
        </div>

        <div v-if="selectedInstance.events?.length" class="detail-section">
          <h4>{{ $t('instances.events') }}</h4>
          <el-table :data="selectedInstance.events" size="small">
            <el-table-column prop="event_type" :label="$t('instances.eventType')" width="100">
              <template #default="{ row }">
                <el-tag :type="getEventTagType(row.event_type)" size="small">{{ row.event_type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="recipient_email" :label="$t('instances.recipient')" />
            <el-table-column prop="created_at" :label="$t('instances.time')" width="150" />
          </el-table>
        </div>

        <div v-if="selectedInstance.node_executions?.length" class="detail-section">
          <h4>{{ $t('instances.nodeExecutions') || '节点执行历史' }}</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(exec, index) in selectedInstance.node_executions"
              :key="index"
              :type="getExecutionStatusType(exec.result)"
              :timestamp="formatTime(exec.executed_at)"
            >
              <div class="execution-item">
                <div class="execution-header">
                  <strong>{{ exec.node_label || exec.node_id }}</strong>
                  <el-tag :type="getExecutionStatusType(exec.result)" size="small">
                    {{ formatExecutionResult(exec.result) }}
                  </el-tag>
                </div>
      <div class="execution-meta">
        <span v-if="exec.duration_ms">{{ $t('instances.executionTime') }}: {{ exec.duration_ms }}ms</span>
        <span v-if="exec.conditions_met !== null">
          {{ $t('instances.conditionMet') }}: {{ exec.conditions_met ? $t('instances.conditionYes') : $t('instances.conditionNo') }}
        </span>
      </div>
      <div v-if="exec.error_message" class="execution-error">
        <el-alert type="error" :closable="false" :title="exec.error_message" />
      </div>
      <div v-if="exec.input_data" class="execution-data">
        <el-collapse>
          <el-collapse-item :title="$t('instances.inputData')">
            <pre>{{ JSON.stringify(exec.input_data, null, 2) }}</pre>
          </el-collapse-item>
          <el-collapse-item v-if="exec.output_data" :title="$t('instances.outputData')">
            <pre>{{ JSON.stringify(exec.output_data, null, 2) }}</pre>
          </el-collapse-item>
          <el-collapse-item v-if="exec.event_data" :title="$t('instances.eventData')">
            <pre>{{ JSON.stringify(exec.event_data, null, 2) }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const { t } = useI18n()

const instances = ref([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const filterStatus = ref('')
const filterWorkflow = ref('')
const filterRecipient = ref('')
const detailsVisible = ref(false)
const selectedInstance = ref(null)

function formatStatus(status) {
  return t(`instances.instanceStatus.${status}`) || status
}

function getStatusType(status) {
  const map = {
    pending: 'info',
    running: 'primary',
    waiting_event: 'warning',
    delayed: 'warning',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return map[status] || 'info'
}

function getEventTagType(type) {
  const map = {
    send: 'info',
    delivery: 'success',
    open: 'success',
    click: 'warning',
    bounce: 'danger',
    complaint: 'danger'
  }
  return map[type] || 'info'
}

function getExecutionStatusType(result) {
  const map = {
    success: 'success',
    waiting: 'warning',
    resumed: 'primary',
    failed: 'danger',
    skipped: 'info',
    running: 'info'
  }
  return map[result] || 'info'
}

function formatExecutionResult(result) {
  return t(`instances.executionStatus.${result}`) || result
}

function formatTime(timeStr) {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}

async function loadInstances(p = 1) {
  loading.value = true
  try {
    const params = { page: p, per_page: perPage.value }
    if (filterStatus.value) params.status = filterStatus.value

    const { data } = await request.get('/user/instances', { params })
    instances.value = data.instances
    total.value = data.total
    page.value = data.current_page

    // 本地筛选
    if (filterWorkflow.value) {
      instances.value = instances.value.filter(i =>
        i.workflow_name?.toLowerCase().includes(filterWorkflow.value.toLowerCase())
      )
    }
    if (filterRecipient.value) {
      instances.value = instances.value.filter(i =>
        i.recipient_email?.toLowerCase().includes(filterRecipient.value.toLowerCase())
      )
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || 'Failed to load instances')
  } finally {
    loading.value = false
  }
}

async function viewDetails(row) {
  try {
    const { data } = await request.get(`/instance/${row.id}`)
    selectedInstance.value = data
    detailsVisible.value = true
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || 'Failed to load instance details')
  }
}

async function cancelInstance(row) {
  try {
    await ElMessageBox.confirm(
      t('instances.confirmCancel'),
      t('common.warning'),
      { confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    await request.post(`/instance/${row.id}/cancel`)
    ElMessage.success(t('instances.cancelled'))
    loadInstances(page.value)
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.response?.data?.msg || 'Failed to cancel instance')
    }
  }
}

watch([filterStatus], () => {
  page.value = 1
  loadInstances(1)
})

onMounted(() => {
  loadInstances()
})
</script>

<style scoped>
.instances-page {
  padding: 20px;
}
.page-header {
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0 0 8px;
}
.desc {
  color: var(--text-secondary);
  margin: 0;
}
.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.instance-details {
  max-height: 600px;
  overflow-y: auto;
}
.detail-section {
  margin-bottom: 20px;
}
.detail-section h4 {
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}
</style>
