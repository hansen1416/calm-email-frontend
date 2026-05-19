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
          <div class="quota-header-right">
            <el-tag :type="quotaStatus.remaining > 20 ? 'success' : 'warning'">
              {{ quotaStatus.remaining }}/{{ quotaStatus.daily_limit }}
            </el-tag>
            <el-button
              type="primary"
              plain
              size="small"
              @click="showPricingDialog"
            >
              {{ currentPlan === 'Free' ? 'Upgrade' : 'Change Plan' }}
            </el-button>
          </div>
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

    <!-- 订阅记录 -->
    <el-card v-if="paymentEnabled" class="orders-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ $t('emailSenders.orders.title') }}</span>
          <el-button size="small" text @click="syncSubscriptions" :loading="syncing">
            {{ $t('emailSenders.orders.sync') }}
          </el-button>
        </div>
      </template>

      <el-table :data="orders" v-loading="ordersLoading" stripe>
        <el-table-column :label="$t('emailSenders.orders.plan')" width="140">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:4px">
              <el-tag size="small" :type="row.change_type === 'upgrade' ? 'success' : row.change_type === 'downgrade' ? 'warning' : 'info'">
                {{ row.plan_name || '-' }}
              </el-tag>
              <span v-if="row.previous_plan" style="font-size:11px;color:#999">
                {{ row.change_type === 'upgrade' ? '↑' : '↓' }} {{ row.previous_plan }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('emailSenders.orders.amount')" width="140">
          <template #default="{ row }">
            <div v-if="row.plan_price">
              <span style="font-size:12px;color:#999">{{ $t('emailSenders.orders.price') }}: </span>
              <span>&pound;{{ row.plan_price.toFixed(2) }}</span>
            </div>
            <div v-if="row.amount_paid">
              <span style="font-size:12px;color:#999">{{ $t('emailSenders.orders.paidLabel') }}: </span>
              <span style="font-weight:bold">&pound;{{ row.amount_paid.toFixed(2) }}</span>
            </div>
            <div v-if="!row.plan_price && !row.amount_paid">-</div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('emailSenders.orders.trial')" width="130">
          <template #default="{ row }">
            <template v-if="row.trial_remaining_days > 0">
              <el-tag type="warning" size="small">{{ row.trial_remaining_days }}d left</el-tag>
            </template>
            <template v-else-if="row.trial_end">
              <span style="color:#999;font-size:12px">Ended</span>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('emailSenders.orders.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="orderStatusType(row.status)">
              {{ $t(`emailSenders.orders.${row.status}`) || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('emailSenders.orders.started')" width="120">
          <template #default="{ row }">
            {{ row.started_at ? new Date(row.started_at).toLocaleDateString('en-GB') : '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('emailSenders.orders.expires')" width="120">
          <template #default="{ row }">
            {{ row.expires_at ? new Date(row.expires_at).toLocaleDateString('en-GB') : '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('emailSenders.orders.created')" width="160">
          <template #default="{ row }">
            {{ row.created_at ? new Date(row.created_at).toLocaleString('en-GB') : '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('emailSenders.orders.actions')" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'paid'"
              type="danger"
              size="small"
              :loading="cancellingOrderId === row.id"
              @click="cancelSubscription(row)"
            >
              {{ $t('emailSenders.orders.cancel') }}
            </el-button>
            <span v-else-if="row.status === 'cancelling'" style="color:#E6A23C;font-size:12px">
              {{ $t('emailSenders.orders.cancelsAt') }} {{ row.expires_at ? new Date(row.expires_at).toLocaleDateString('en-GB') : '' }}
            </span>
            <span v-else-if="row.status === 'cancelled'" style="color:#999;font-size:12px">-</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!ordersLoading && orders.length === 0" :description="$t('emailSenders.orders.empty')" />
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
        <el-alert
          v-if="codeSentStatus === 'sending'"
          :title="$t('emailSenders.verifyDialog.sending') || '正在发送验证码...'"
          type="info"
          :closable="false"
          show-icon
          class="mt-2"
        />
        <el-alert
          v-if="codeSentStatus === 'success'"
          :title="$t('emailSenders.verifyDialog.sentSuccess') || '验证码已发送，请查收邮件'"
          type="success"
          :closable="true"
          show-icon
          class="mt-2"
        />
        <el-alert
          v-if="codeSentStatus === 'error'"
          :title="$t('emailSenders.verifyDialog.sentFailed') || '验证码发送失败，请重试'"
          type="error"
          :closable="true"
          show-icon
          class="mt-2"
        />
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

    <!-- 套餐升级对话框 -->
    <el-dialog v-model="pricingDialogVisible" :title="$t('emailSenders.pricing.title')" width="900px">
      <!-- 支付功能未启用 -->
      <template v-if="!paymentEnabled">
        <el-empty :description="$t('emailSenders.pricing.notEnabled') || 'Payment feature is not enabled. Set UPGRADE_FEATURE_ENABLED=true in .env'" />
      </template>
      <template v-else-if="plans.length === 0">
        <el-empty :description="$t('emailSenders.pricing.loading') || 'Loading plans...'" />
      </template>
      <template v-else>
        <!-- 当前套餐提示 -->
        <el-alert
          v-if="currentPlan"
          :title="`${$t('emailSenders.pricing.currentPlan')}: ${currentPlan}`"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        />
        <div class="pricing-grid">
          <el-card
            v-for="p in plans"
            :key="p.id"
            :class="['plan-card', {
              active: selectedPlan && (selectedPlan.id === p.id) || currentPlan === p.name,
              recommended: p.name === 'Growth'
            }]"
            shadow="hover"
            @click="selectPlan(p)"
          >
            <template v-if="p.name === 'Growth'">
              <div class="plan-badge">{{ $t('emailSenders.pricing.popular') }}</div>
            </template>
            <h3 class="plan-name">{{ p.name }}</h3>
            <p class="plan-limit">{{ p.daily_limit }} {{ $t('emailSenders.pricing.emailsPerDay') }}</p>
            <p class="plan-desc">{{ p.description }}</p>
            <div class="plan-prices">
              <div class="plan-price">
                <span class="price-value">{{ p.price_monthly_display }}</span>
                <span class="price-unit">/{{ $t('emailSenders.pricing.month') }}</span>
              </div>
              <div v-if="p.price_yearly_display" class="plan-price-yearly">
                {{ p.price_yearly_display }}/{{ $t('emailSenders.pricing.year') }}
                <el-tag size="small" type="success" effect="plain">{{ $t('emailSenders.pricing.save') }}</el-tag>
              </div>
            </div>
            <div style="margin-top: 12px; min-height: 32px">
              <span v-if="currentPlan === p.name" class="current-tag">{{ $t('emailSenders.pricing.currentPlanBtn') }}</span>
            </div>
          </el-card>
        </div>
      </template>
      <template #footer>
        <el-button @click="pricingDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button
          v-if="paymentEnabled && selectedPlan && selectedPlan.price_monthly && currentPlan !== selectedPlan.name"
          type="primary"
          @click="handleCheckout"
          :loading="upgrading"
        >
          {{ hasActiveSubscription ? $t('emailSenders.pricing.switchTo', { plan: selectedPlan.name }) : `${$t('emailSenders.pricing.subscribeBtn')} ${selectedPlan.name} - ${selectedPlan.price_monthly_display}/mo` }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'

const loading = ref(false)
const senders = ref([])
const quotaStatus = ref(null)

// 支付相关
const pricingDialogVisible = ref(false)
const paymentEnabled = ref(false)
const plans = ref([])
const currentPlan = ref('Free')
const selectedPlan = ref(null)  // 用户手动选择的套餐（不等于当前订阅）
const upgrading = ref(false)
const hasActiveSubscription = ref(false)

// 订单记录
const orders = ref([])
const ordersLoading = ref(false)
const cancellingOrderId = ref(null)
const syncing = ref(false)

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
const codeSentStatus = ref('') // 'sending' | 'success' | 'error' | ''
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
    'emailSenders.verifyDialog.sending': '正在发送验证码...',
    'emailSenders.verifyDialog.sentSuccess': '验证码已发送，请查收邮件',
    'emailSenders.verifyDialog.sentFailed': '验证码发送失败，请重试',
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
const showVerifyDialog = async (sender) => {
  currentSender.value = sender
  verifyForm.token = ''
  codeSentStatus.value = 'sending'
  verifyDialogVisible.value = true
  
  // 弹窗打开后自动发送验证码邮件
  try {
    const res = await request.post(`/email/senders/${sender.id}/send-code`)
    codeSentStatus.value = 'success'
    ElMessage.success(res.data.msg || '验证码已发送，请查收邮件')
  } catch (error) {
    codeSentStatus.value = 'error'
    console.error('Failed to send verification code:', error)
    ElMessage.error(error.response?.data?.msg || '验证码发送失败，请重试或联系管理员')
  }
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
  codeSentStatus.value = 'sending'
  try {
    const res = await request.post(`/email/senders/${currentSender.value.id}/resend`)
    codeSentStatus.value = 'success'
    ElMessage.success(res.data.msg || '验证码已重新发送')
  } catch (error) {
    codeSentStatus.value = 'error'
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
  fetchPlans()
  fetchOrders()
})

// 获取套餐列表和当前订阅
const fetchPlans = async () => {
  try {
    const [configsRes, subRes] = await Promise.all([
      request.get('/payment/quota-configs'),
      request.get('/payment/my-subscription'),
    ])
    if (configsRes.data?.enabled) {
      paymentEnabled.value = true
      plans.value = configsRes.data.configs || []
    }
    if (subRes.data?.active) {
      currentPlan.value = subRes.data.plan || 'Free'
      hasActiveSubscription.value = true
    } else {
      currentPlan.value = 'Free'
      hasActiveSubscription.value = false
    }

    // plans 加载完成后自动匹配当前套餐为选中
    if (plans.value.length > 0) {
      const matched = plans.value.find(p => p.name === currentPlan.value)
      selectedPlan.value = matched || plans.value[0]
    }
  } catch (error) {
    console.error('Failed to fetch plans:', error)
    paymentEnabled.value = false
  }
}

const showPricingDialog = () => {
  fetchPlans()
  pricingDialogVisible.value = true
  // 默认高亮当前订阅的套餐
  selectedPlan.value = null  // 稍后在 watch plans 中匹配
}

// 检测 Stripe Checkout 回调
const checkStripeReturn = () => {
  const params = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?')))
  const status = params.get('status')
  if (status === 'success') {
    ElMessage.success('Payment successful! Your plan has been upgraded.')
    // 清除 URL 参数
    const url = new URL(window.location.href)
    url.hash = url.hash.split('?')[0] || '/'
    window.history.replaceState({}, '', url.toString())
  } else if (status === 'cancelled') {
    ElMessage.info('Payment was cancelled.')
    const url = new URL(window.location.href)
    url.hash = url.hash.split('?')[0] || '/'
    window.history.replaceState({}, '', url.toString())
  }
}

const selectPlan = (plan) => {
  // 点击卡片切换高亮选中状态
  selectedPlan.value = plan

  // Free 套餐：已经是当前套餐则无需操作
  if (!plan.price_monthly && currentPlan.value === 'Free') return
}

const handleCheckout = async () => {
  const plan = selectedPlan.value
  if (!plan || !plan.price_monthly) {
    ElMessage.warning('Please select a paid plan')
    return
  }
  if (currentPlan.value === plan.name) {
    ElMessage.info('This is your current plan')
    return
  }

  const isSwitch = hasActiveSubscription.value && currentPlan.value !== 'Free'

  // 换套餐确认框
  if (isSwitch) {
    const oldLimit = plans.value.find(p => p.name === currentPlan.value)?.daily_limit || 0
    const isUpgrade = plan.daily_limit > oldLimit
    try {
      await ElMessageBox.confirm(
        isUpgrade
          ? `Switch from ${currentPlan.value} to ${plan.name}? Prorated charges will apply.`
          : `Downgrade from ${currentPlan.value} to ${plan.name}? Your new plan will take effect at the end of the billing period.`,
        isUpgrade ? 'Upgrade Plan' : 'Downgrade Plan',
        { type: isUpgrade ? 'success' : 'warning', confirmButtonText: 'Confirm' }
      )
    } catch {
      return
    }
    // 调用转套餐 API
    upgrading.value = true
    try {
      const res = await request.post('/payment/switch-plan', {
        quota_config_id: plan.id,
      })
      ElMessage.success(res.data.msg || 'Plan switched')
      currentPlan.value = plan.name
      pricingDialogVisible.value = false
      fetchOrders()
      fetchData()
    } catch (error) {
      console.error('Failed to switch plan:', error)
      ElMessage.error(error.response?.data?.msg || 'Switch failed')
    } finally {
      upgrading.value = false
    }
    return
  }

  // 首次订阅（走 Stripe Checkout）
  try {
    await ElMessageBox.confirm(
      `Subscribe to ${plan.name} plan at ${plan.price_monthly_display}/month?`,
      'Confirm Subscription',
      { type: 'info' }
    )
  } catch {
    return
  }

  upgrading.value = true
  try {
    const res = await request.post('/payment/create-order', {
      quota_config_id: plan.id,
      payment_method: 'stripe',
      billing_cycle: 'monthly',
    })
    currentPlan.value = plan.name
    window.location.href = res.data.checkout_url
  } catch (error) {
    console.error('Failed to create order:', error)
    ElMessage.error(error.response?.data?.msg || 'Payment initiation failed')
  } finally {
    upgrading.value = false
  }
}

const fetchOrders = async () => {
  ordersLoading.value = true
  try {
    const res = await request.get('/payment/orders')
    if (res.data?.enabled) {
      orders.value = res.data.orders || []
    }
  } catch (error) {
    console.error('Failed to fetch orders:', error)
  } finally {
    ordersLoading.value = false
  }
}

const orderStatusType = (status) => {
  return { paid: 'success', cancelling: 'warning', cancelled: 'info', pending: 'warning', expired: 'danger' }[status] || 'info'
}

const cancelSubscription = async (row) => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to cancel your subscription? Your plan will remain active until the end of the billing period.',
      'Cancel Subscription',
      { type: 'warning', confirmButtonText: 'Confirm' }
    )
  } catch {
    return
  }

  cancellingOrderId.value = row.id
  try {
    const res = await request.post('/payment/cancel-subscription', {
      subscription_id: row.payment_order_id,
    })
    ElMessage.success(res.data.msg || 'Subscription cancelled')
    fetchOrders()  // 刷新列表
    fetchData()    // 刷新配额
  } catch (error) {
    console.error('Failed to cancel subscription:', error)
    ElMessage.error(error.response?.data?.msg || 'Cancellation failed')
  } finally {
    cancellingOrderId.value = null
  }
}

const syncSubscriptions = async () => {
  syncing.value = true
  try {
    const res = await request.post('/payment/sync-subscriptions')
    ElMessage.success(res.data.msg || 'Sync complete')
    fetchOrders()
    fetchPlans()
    fetchData()
  } catch (error) {
    console.error('Failed to sync:', error)
    ElMessage.error(error.response?.data?.msg || 'Sync failed')
  } finally {
    syncing.value = false
  }
}
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

.mt-2 {
    margin-top: 8px;
  }
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.plan-card {
  text-align: center;
  position: relative;
  border: 2px solid #ebeef5;
  transition: all 0.3s;
  overflow: visible;  /* 允许 badge 超出卡片边界 */

  &:hover {
    border-color: #409EFF;
  }

  &.recommended {
    /* border-color removed - badge is sufficient */
  }

  &.active {
    border-color: #67C23A;
    background-color: #f0f9eb;
    box-shadow: 0 0 0 1px #67C23A;

    .plan-name {
      color: #67C23A;
    }
  }

  .plan-badge {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: #409EFF;
    color: white;
    padding: 2px 16px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
    z-index: 10;
  }

  .plan-name {
    font-size: 18px;
    margin: 8px 0 4px;
  }

  .plan-limit {
    font-size: 28px;
    font-weight: bold;
    color: #409EFF;
    margin: 8px 0;
  }

  .plan-desc {
    color: #666;
    font-size: 13px;
    min-height: 36px;
  }

  .plan-prices {
    margin: 12px 0;
  }

  .plan-price {
    .price-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .price-unit {
      color: #999;
      font-size: 14px;
    }
  }

  .plan-price-yearly {
    color: #666;
    font-size: 13px;
    margin-top: 4px;
  }
}

.quota-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.orders-card {
  margin-top: 20px;
}

.current-tag {
  display: inline-block;
  padding: 4px 12px;
  background: #67C23A;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}
}
</style>
