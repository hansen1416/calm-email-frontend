<template>
  <div class="events-page">
    <div class="page-header">
      <h2>{{ $t('events.title') }}</h2>
      <p class="desc">{{ $t('events.description') }}</p>
    </div>

    <div class="filters">
      <el-select v-model="filterEventType" :placeholder="$t('events.filterByType')" clearable style="width: 200px">
        <el-option :label="$t('events.allTypes')" value="" />
        <el-option :label="$t('events.send')" value="send" />
        <el-option :label="$t('events.delivery')" value="delivery" />
        <el-option :label="$t('events.open')" value="open" />
        <el-option :label="$t('events.click')" value="click" />
        <el-option :label="$t('events.bounce')" value="bounce" />
        <el-option :label="$t('events.complaint')" value="complaint" />
      </el-select>
      <el-input v-model="filterRecipient" :placeholder="$t('events.searchRecipient')" clearable style="width: 200px" />
    </div>

    <el-table :data="events" v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="event_type" :label="$t('events.eventType')" width="100">
        <template #default="{ row }">
          <el-tag :type="getEventTagType(row.event_type)">{{ row.event_type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="recipient_email" :label="$t('events.recipient')" />
      <el-table-column prop="message_id" :label="'Message ID'" width="180" />
      <el-table-column prop="occurred_at" :label="$t('events.occurredAt')" width="180" />
      <el-table-column :label="$t('events.details')" width="100">
        <template #default="{ row }">
          <el-button size="small" @click="showDetails(row)">{{ $t('events.view') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > 0"
      :current-page="page"
      :page-size="perPage"
      :total="total"
      @current-change="loadEvents"
      layout="prev, pager, next, total"
      style="margin-top: 20px; justify-content: center"
    />

    <el-dialog v-model="detailsVisible" :title="$t('events.eventDetails')" width="600px">
      <pre v-if="selectedEvent" style="background: #f5f5f5; padding: 10px; overflow: auto; max-height: 400px;">{{ JSON.stringify(selectedEvent.event_data, null, 2) }}</pre>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const { t } = useI18n()

const events = ref([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const filterEventType = ref('')
const filterRecipient = ref('')
const detailsVisible = ref(false)
const selectedEvent = ref(null)

function getEventTagType(type) {
  const map = {
    send: 'info',
    delivery: 'success',
    open: 'success',
    click: 'warning',
    bounce: 'danger',
    complaint: 'danger',
    deliveryDelay: 'warning'
  }
  return map[type] || 'info'
}

async function loadEvents(p = 1) {
  loading.value = true
  try {
    const params = { page: p, per_page: perPage.value }
    if (filterEventType.value) params.event_type = filterEventType.value
    if (filterRecipient.value) params.recipient = filterRecipient.value
    
    const { data } = await request.get('/webhooks/events', { params })
    events.value = data.events
    total.value = data.total
    page.value = data.current_page
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || 'Failed to load events')
  } finally {
    loading.value = false
  }
}

function showDetails(row) {
  selectedEvent.value = row
  detailsVisible.value = true
}

watch([filterEventType, filterRecipient], () => {
  page.value = 1
  loadEvents(1)
})

onMounted(() => {
  loadEvents()
})
</script>

<style scoped>
.events-page {
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
</style>