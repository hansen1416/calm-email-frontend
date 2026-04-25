<template>
  <div class="email-senders-page">
    <div class="page-header">
      <h2>{{ $t('emailSenders.title') }}</h2>
      <p class="description">{{ $t('emailSenders.description') }}</p>
    </div>

    <!-- 配额状态卡片 -->
    <el-card v-if="quotaStatus" class="quota-card" shadow="hover">
      <template #header>
        <div class="quota-header">
          <span>{{ $t('emailSenders.quota.title') }}</span>
          <el-tag :type="quotaStatus.remaining > 20 ? 'success' : 'warning'">
            {{ quotaStatus.remaining }}/{{ quotaStatus.daily_limit }}
          </el-tag>
        </div>
      </template>
      <div class="quota-body">
        <div class="quota-item">
          <span class="label">{{ $t('emailSenders.quota.sent') }}:</span>
          <span class="value">{{ quotaStatus.daily_sent }}</span>
        </div>
        <div class="quota-item">
          <span class="label">{{ $t('emailSenders.quota.remaining') }}:</span>
          <span class="value">{{ quotaStatus.remaining }}</span>
        </div>
        <div class="quota-item">
          <span class="label">{{ $t('emailSenders.quota.resetAt') }}:</span>
          <span class="value">{{ formatResetTime(quotaStatus.reset_at) }}</span>
        </div>
      </div>
    </el-card>

    <!-- 发件邮箱列表 -->
    <el-card class="senders-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ $t('emailSenders.list.title') }}</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            {{ $t('emailSenders.list.add') }}
          </el-button>
        </div>
      </template>

      <el-table :data="senders" v-loading="loading" stripe>
        <el-table-column prop="email" :label="$t('emailSenders.table.email')" min-width="200">
          <template #default="{ row }">
            <div class="email-cell">
              <span>{{ row.email }}</span>
              <el-tag v-if="row.is_default" type="success" size="small" class="default-tag">
                {{ $t('emailSenders.table.default') }}
              </el-tag>
            </div>
            <div v-if="row.real_email" class="real-email">
              Reply-To: {{ row.real_email }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="email_type" :label="$t('emailSenders.table.type')" width="120">
          <template #default="{ row }">
            <el-tag :type="row.email_type === 'personal' ? 'primary' : 'info'">
              {{ $t(`emailSenders.type.${row.email_type}`) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="ses_identity_status" :label="$t('emailSenders.table.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.ses_identity_status)">
              {{ $t(`emailSenders.status.${row.ses_identity_status}`) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="daily_sent" :label="$t('emailSenders.table.usage')" width="100">
          <template #default="{ row }">
            <span>{{ row.daily_sent }}/{{ row.daily_limit }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('emailSenders.table.actions')" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.ses_identity_status !== 'verified'"
              type="primary"
              size="small"
              @click="showVerifyDialog(row)"
            >
              {{ $t('emailSenders.actions.verify') }}
            </el-button>
            <el-button
              v-else-if="!row.is_default"
              type="success"
              size="small"
              @click="setDefault(row)"
            >
              {{ $t('emailSenders.actions.setDefault') }}
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteSender(row)"
            >
              {{ $t('emailSenders.actions.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <el-empty v-if="!loading && senders.length === 0" :description="$t('emailSenders.empty')">
        <el-button type="primary" @click="showAddDialog">
          {{ $t('emailSenders.list.add') }}
        </el-button>
      </el-empty>
    </el-card>

    <!-- 添加邮箱对话框 -->
    <el-dialog v-model="addDialogVisible" :title="$t('emailSenders.addDialog.title')" width="500px">
      <el-form :model="addForm" :rules="addRules" ref="addFormRef">
        <el-form-item :label="$t('emailSenders.addDialog.email')" prop="email">
          <el-input v-model="addForm.email" placeholder="user@example.com" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button type="primary" @click="submitAdd" :loading="submitting">
          {{ $t('common.submit') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 验证邮箱对话框 -->
    <el-dialog v-model="verifyDialogVisible" :title="$t('emailSenders.verifyDialog.title')" width="500px">
      <div v-if="currentSender" class="verify-info">
        <p>{{ $t('emailSenders.verifyDialog.sentTo') }}: <strong>{{ currentSender.email }}</strong></p>
        <p class="hint">{{ $t('emailSenders.verifyDialog.hint') }}</p>
      </div>
      <el-form :model="verifyForm" :rules="verifyRules" ref="verifyFormRef">
        <el-form-item :label="$t('emailSenders.verifyDialog.code')" prop="token">
          <el-input v-model="verifyForm.token" maxlength="6" placeholder="123456" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyDialogVisible = false">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button @click="resendCode" :loading="resending">
          {{ $t('emailSenders.verifyDialog.resend') }}
        </el-button>
        <el-button type="primary" @click="submitVerify" :loading="verifying">
          {{ $t('common.verify') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'

const loading = ref(false)
const senders = ref([])
const quotaStatus = ref(null)

// 添加对话框
const addDialogVisible = ref(false)
const addFormRef = ref()
const submitting = ref(false)
const addForm = reactive({
  email: ''
})
const addRules = {
  email: [
    { required: true, message: () => t('emailSenders.rules.emailRequired'), trigger: 'blur' },
    { type: 'email', message: () => t('emailSenders.rules.emailFormat'), trigger: 'blur' }
  ]
}

// 验证对话框
const verifyDialogVisible = ref(false)
const verifyFormRef = ref()
const verifying = ref(false)
const resending = ref(false)
const currentSender = ref(null)
const verifyForm = reactive({
  token: ''
})
const verifyRules = {
  token: [
    { required: true, message: () => t('emailSenders.rules.codeRequired'), trigger: 'blur' },
    { len: 6, message: () => t('emailSenders.rules.codeLength'), trigger: 'blur' }
  ]
}

// 国际化辅助函数
const t = (key) => {
  // 这里简化处理，实际应该使用 vue-i18n
  const messages = {
    'emailSenders.title': '发件邮箱管理',
    'emailSenders.description': '管理您的发件邮箱，支持绑定自己的邮箱或使用系统邮箱',
    'emailSenders.quota.title': '今日发送配额',
    'emailSenders.quota.sent': '已发送',
    'emailSenders.quota.remaining': '剩余',
    'emailSenders.quota.resetAt': '重置时间',
    'emailSenders.list.title': '发件邮箱列表',
    'emailSenders.list.add': '添加邮箱',
    'emailSenders.table.email': '邮箱地址',
    'emailSenders.table.type': '类型',
    'emailSenders.table.status': '状态',
    'emailSenders.table.usage': '使用量',
    'emailSenders.table.actions': '操作',
    'emailSenders.table.default': '默认',
    'emailSenders.type.personal': '个人',
    'emailSenders.type.system': '系统',
    'emailSenders.status.pending': '待验证',
    'emailSenders.status.verified': '已验证',
    'emailSenders.status.failed': '失败',
    'emailSenders.actions.verify': '验证',
    'emailSenders.actions.setDefault': '设为默认',
    'emailSenders.actions.delete': '删除',
    'emailSenders.empty': '暂无发件邮箱',
    'emailSenders.addDialog.title': '添加发件邮箱',
    'emailSenders.addDialog.email': '邮箱地址',
    'emailSenders.verifyDialog.title': '验证邮箱',
    'emailSenders.verifyDialog.sentTo': '验证码已发送至',
    'emailSenders.verifyDialog.hint': '请输入邮箱中收到的6位验证码',
    'emailSenders.verifyDialog.code': '验证码',
    'emailSenders.verifyDialog.resend': '重新发送',
    'emailSenders.rules.emailRequired': '请输入邮箱地址',
    'emailSenders.rules.emailFormat': '邮箱格式不正确',
    'emailSenders.rules.codeRequired': '请输入验证码',
    'emailSenders.rules.codeLength': '验证码为6位数字',
    'common.cancel': '取消',
    'common.submit': '提交',
    'common.verify': '验证'
  }
  return messages[key] || key
}

// 获取状态标签类型
const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    verified: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

// 格式化重置时间
const formatResetTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    // 获取发件列表
    const sendersRes = await request.get('/email/senders')
    senders.value = sendersRes.data.senders || []

    // 获取配额状态
    const quotaRes = await request.get('/email/quota')
    quotaStatus.value = quotaRes.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 显示添加对话框
const showAddDialog = () => {
  addForm.email = ''
  addDialogVisible.value = true
}

// 提交添加
const submitAdd = async () => {
  const valid = await addFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const res = await request.post('/email/senders', { email: addForm.email })
    ElMessage.success(res.data.msg || '添加成功')
    addDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('Failed to add sender:', error)
    ElMessage.error(error.response?.data?.msg || '添加失败')
  } finally {
    submitting.value = false
  }
}

// 显示验证对话框
const showVerifyDialog = (sender) => {
  currentSender.value = sender
  verifyForm.token = ''
  verifyDialogVisible.value = true
}

// 提交验证
const submitVerify = async () => {
  const valid = await verifyFormRef.value.validate().catch(() => false)
  if (!valid) return

  verifying.value = true
  try {
    const res = await request.post('/email/senders/verify', {
      binding_id: currentSender.value.id,
      email: currentSender.value.email,
      token: verifyForm.token
    })
    ElMessage.success(res.data.msg || '验证成功')
    verifyDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('Failed to verify:', error)
    ElMessage.error(error.response?.data?.msg || '验证失败')
  } finally {
    verifying.value = false
  }
}

// 重新发送验证码
const resendCode = async () => {
  resending.value = true
  try {
    const res = await request.post(`/email/senders/${currentSender.value.id}/resend`)
    ElMessage.success(res.data.msg || '验证码已重新发送')
  } catch (error) {
    console.error('Failed to resend:', error)
    ElMessage.error(error.response?.data?.msg || '发送失败')
  } finally {
    resending.value = false
      // 刷新列表（在单独的try-catch中，不影响主流程提示）
      try {
        await fetchData()
      } catch (e) {
        console.error('Failed to refresh list:', e)
      }
    }
  }

  // 设为默认
const setDefault = async (sender) => {
  try {
    await ElMessageBox.confirm(
      `确定要将 ${sender.email} 设为默认发件邮箱吗？`,
      '提示',
      { type: 'warning' }
    )
    const res = await request.put(`/email/senders/${sender.id}/default`)
    ElMessage.success(res.data.msg || '设置成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to set default:', error)
      ElMessage.error(error.response?.data?.msg || '设置失败')
    }
  }
}

// 删除
const deleteSender = async (sender) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${sender.email} 吗？`,
      '警告',
      { type: 'warning', confirmButtonText: '删除' }
    )
    const res = await request.delete(`/email/senders/${sender.id}`)
    ElMessage.success(res.data.msg || '删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete:', error)
      ElMessage.error(error.response?.data?.msg || '删除失败')
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.email-senders-page {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;

    h2 {
      margin: 0 0 8px;
      font-size: 24px;
    }

    .description {
      color: #666;
      font-size: 14px;
      margin: 0;
    }
  }

  .quota-card {
    margin-bottom: 20px;

    .quota-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
    }

    .quota-body {
      display: flex;
      gap: 40px;

      .quota-item {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .label {
          color: #666;
          font-size: 14px;
        }

        .value {
          font-size: 20px;
          font-weight: bold;
          color: #333;
        }
      }
    }
  }

  .senders-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .email-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .default-tag {
      margin-left: auto;
    }
  }

  .real-email {
    color: #666;
    font-size: 12px;
    margin-top: 4px;
  }

  .verify-info {
    margin-bottom: 20px;
    padding: 16px;
    background-color: #f5f7fa;
    border-radius: 4px;

    p {
      margin: 0 0 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .hint {
      color: #666;
      font-size: 14px;
    }
  }
}
</style>
