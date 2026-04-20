<template>
<div class="page workflow-page">
  <!-- 顶部 Header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">{{ $t('workflow.title') }}</h1>
      <p class="page-desc">{{ $t('workflow.description') }}</p>
    </div>
    <div class="header-actions">
      <button class="btn-dark" @click="createNewWorkflow">
        <el-icon class="mr-2"><Plus /></el-icon>
        {{ $t('workflow.addWorkflow') }}
      </button>
    </div>
  </div>

  <!-- 主内容区 -->
  <div class="workflow-main">
    <!-- 左侧边栏 - 工作流列表 -->
    <div class="workflow-sidebar">
      <div class="sidebar-header">
        <h3 class="sidebar-title">{{ $t('workflow.savedWorkflowsTitle') }}</h3>
      </div>
      <div v-if="savedWorkflows.length" class="workflow-list">
        <div
          v-for="wf in savedWorkflows"
          :key="wf.id"
          class="workflow-list-item"
          :class="{ active: currentWfId === wf.id }"
          @click="handleWorkflowItemClick(wf)"
          @dblclick="handleWorkflowItemDblClick(wf)"
        >
          <div class="workflow-info">
            <div class="workflow-name">{{ wf.name }}</div>
            <el-tag
              :type="wf.status === 'active' ? 'success' : 'info'"
              size="small"
              class="workflow-status"
            >
              {{ wf.status === 'active' ? $t('workflow.active') : $t('workflow.inactive') }}
            </el-tag>
          </div>
          <div class="workflow-actions" @click.stop>
            <el-tooltip :content="$t('workflow.edit')" placement="top">
              <el-icon class="edit-icon" @click="openEditProperties(wf)">
                <Setting />
              </el-icon>
            </el-tooltip>
            <el-icon class="delete-icon" @click="deleteWorkflow(wf.id)">
              <Close />
            </el-icon>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        {{ $t('workflow.noSavedWorkflows') || 'No saved workflows' }}
      </div>
    </div>

    <!-- 右侧画布区 -->
    <div class="workflow-canvas-area">
      <!-- 左上角工具栏 - 标题 + Execute -->
      <div class="canvas-toolbar-left">
        <div class="current-workflow-title">{{ workflowName }}</div>
        <button class="btn-accent" @click="executeWorkflow" :disabled="!currentWfId">
          <el-icon class="mr-1"><VideoPlay /></el-icon>
          {{ $t('workflow.executeWorkflow') }}
        </button>
      </div>

      <!-- 右上角工具栏 - Add Node + Save -->
      <div class="canvas-toolbar-right">
        <el-dropdown trigger="click" @command="handleAddNode">
          <button class="btn-dark">
            {{ $t('workflow.addNode') }}
            <el-icon class="ml-1"><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="email">{{ $t('workflow.addEmailNode') }}</el-dropdown-item>
              <el-dropdown-item command="driver">{{ $t('workflow.addDriverNode') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <button class="btn-outline" @click="saveWorkflow">
          <el-icon class="mr-1"><DocumentChecked /></el-icon>
          {{ $t('workflow.saveWorkflow') }}
        </button>
      </div>

      <!-- 画布容器 -->
      <div id="x6-container" class="canvas-wrap"></div>
    </div>
  </div>

    <!-- 统一节点编辑弹窗 -->
    <el-dialog v-model="showAddNode" :title="dialogTitle" width="600px" :close-on-click-modal="false">
      <!-- 步骤指示器（添加模式） -->
      <div v-if="!isEditMode" class="step-indicator">
        <span :class="{ active: nodeTypeStep === 'select' }">① {{ $t('workflow.stepSelectType') }}</span>
        <span class="arrow">→</span>
        <span :class="{ active: nodeTypeStep === 'config' }">② {{ $t('workflow.stepConfig') }}</span>
      </div>

      <!-- 步骤①：类型选择（仅添加模式） -->
      <div v-if="!isEditMode && nodeTypeStep === 'select'" class="node-type-grid">
        <div v-for="type in nodeTypes" :key="type.value"
             class="node-type-card" :class="{ selected: selectedNodeType === type.value }"
             @click="selectedNodeType = type.value">
          <div class="type-icon" :style="{ color: type.color }">{{ type.icon }}</div>
          <div class="type-name">{{ type.name }}</div>
          <div class="type-desc">{{ type.desc }}</div>
        </div>
      </div>

      <!-- 步骤②：配置表单 -->
      <div class="node-config-form">
        <div class="field">
          <label>{{ $t('workflow.nodeName') }}</label>
          <input v-model="nodeForm.label" :placeholder="t('workflow.enterNodeName')" />
        </div>

        <!-- 邮件节点配置 -->
        <template v-if="selectedNodeType === 'email'">
          <div class="field">
            <label>{{ $t('workflow.selectTemplate') }}</label>
            <el-select v-model="nodeForm.template_id" :placeholder="$t('workflow.selectTemplate')" style="width:100%">
              <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
            </el-select>
          </div>
          <div class="field">
            <label>{{ $t('workflow.recipientType') }}</label>
            <div class="type-switch">
              <button :class="['type-btn', nodeForm.recipientType === 'contact' ? 'active' : '']"
                @click="nodeForm.recipientType = 'contact'">{{ $t('workflow.contact') }}</button>
              <button :class="['type-btn', nodeForm.recipientType === 'group' ? 'active' : '']"
                @click="nodeForm.recipientType = 'group'">{{ $t('workflow.group') }}</button>
            </div>
          </div>
          <div v-if="nodeForm.recipientType === 'contact'" class="field">
            <label>{{ $t('workflow.selectContact') }}</label>
            <el-select v-model="nodeForm.contact_ids" multiple :placeholder="$t('workflow.selectContact')" style="width:100%">
              <el-option v-for="c in contacts" :key="c.id" :label="`${c.name} (${c.email})`" :value="c.id" />
            </el-select>
          </div>
          <div v-if="nodeForm.recipientType === 'group'" class="field">
            <label>{{ $t('workflow.selectGroup') }}</label>
            <el-select v-model="nodeForm.group_ids" multiple :placeholder="$t('workflow.selectGroup')" style="width:100%">
              <el-option v-for="g in groups" :key="g.id" :label="`${g.name} (${g.contact_count}${t('groups.people')})`" :value="g.id" />
            </el-select>
          </div>
        </template>

        <!-- 事件驱动节点配置（步骤式可折叠） -->
        <template v-if="selectedNodeType === 'driver'">
          <div class="driver-steps">
            <div class="step-order-row">
              <span class="step-order-label">{{ $t('workflow.stepOrder') }}:</span>
              <div class="step-cards">
                <div 
                  v-for="(stepId, index) in nodeForm.stepOrder" 
                  :key="stepId"
                  class="step-card"
                  :class="{ disabled: !getStepById(stepId).enabled, expanded: nodeForm.expandedStep === stepId }"
                  draggable="true"
                  @dragstart="onDragStart(index)"
                  @dragover.prevent
                  @drop="onDrop(index)"
                  @click="toggleStepExpand(stepId)"
                >
                  <span class="step-num">{{ index + 1 }}</span>
                  <span class="step-name">{{ getStepById(stepId).name }}</span>
                  <el-checkbox 
                    v-model="getStepById(stepId).enabled" 
                    size="small"
                    @click.stop
                  />
                  <span class="step-expand">
                    {{ nodeForm.expandedStep === stepId ? '▲' : '▼' }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- 展开的步骤配置表单 -->
            <div v-if="nodeForm.expandedStep" class="step-config">
              <template v-if="nodeForm.expandedStep === 'event'">
                <div class="field">
                  <label>{{ $t('workflow.eventType') }}</label>
                  <el-select v-model="nodeForm.steps[0].event_type" :placeholder="$t('workflow.selectEventType')" style="width:100%">
                    <el-option label="发送成功 (Send)" value="send" />
                    <el-option label="送达成功 (Delivery)" value="delivery" />
                    <el-option label="打开邮件 (Open)" value="open" />
                    <el-option label="点击链接 (Click)" value="click" />
                    <el-option label="退信 (Bounce)" value="bounce" />
                    <el-option label="投诉 (Complaint)" value="complaint" />
                    <el-option label="投递延迟 (DeliveryDelay)" value="deliveryDelay" />
                  </el-select>
                </div>
                <div v-if="nodeForm.steps[0].event_type === 'click'" class="field">
                  <label>{{ $t('workflow.linkUrl') }} ({{ $t('workflow.optional') }})</label>
                  <input v-model="nodeForm.steps[0].link_url" :placeholder="t('workflow.enterLinkUrl')" />
                </div>
              </template>
              
              <template v-if="nodeForm.expandedStep === 'condition'">
                <div class="field">
                  <label>{{ $t('workflow.conditionField') }}</label>
                  <el-select v-model="getStepById('condition').field" :placeholder="$t('workflow.selectField')" style="width:100%">
                    <el-option label="事件类型 (event_type)" value="event_type" />
                    <el-option label="链接URL (link_url)" value="link_url" />
                    <el-option label="收件人邮箱 (recipient)" value="recipient" />
                  </el-select>
                </div>
                <div class="field">
                  <label>{{ $t('workflow.conditionOperator') }}</label>
                  <el-select v-model="getStepById('condition').operator" :placeholder="$t('workflow.selectOperator')" style="width:100%">
                    <el-option label="等于 (==)" value="eq" />
                    <el-option label="不等于 (!=)" value="neq" />
                    <el-option label="包含 (contains)" value="contains" />
                    <el-option label="不包含 (not_contains)" value="not_contains" />
                  </el-select>
                </div>
                <div class="field">
                  <label>{{ $t('workflow.conditionValue') }}</label>
                  <input v-model="getStepById('condition').value" :placeholder="t('workflow.enterValue')" />
                </div>
              </template>
              
              <template v-if="nodeForm.expandedStep === 'delay'">
                <div class="field">
                  <label>{{ $t('workflow.delayType') }}</label>
                  <el-select v-model="getStepById('delay').delayType" style="width:100%">
                    <el-option :label="$t('workflow.delayRelative')" value="relative" />
                    <el-option :label="$t('workflow.delayAbsolute')" value="absolute" />
                  </el-select>
                </div>
                <template v-if="getStepById('delay').delayType === 'relative'">
                  <div class="field">
                    <label>{{ $t('workflow.delayDuration') }}</label>
                    <div class="delay-input-row">
                      <input v-model.number="getStepById('delay').delayValue" type="number" min="1" style="width:80px" />
                      <el-select v-model="getStepById('delay').delayUnit" style="width:120px">
                        <el-option :label="$t('workflow.minutes')" value="minutes" />
                        <el-option :label="$t('workflow.hours')" value="hours" />
                        <el-option :label="$t('workflow.days')" value="days" />
                      </el-select>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="field">
                    <label>{{ $t('workflow.delayDateTime') }}</label>
                    <input v-model="getStepById('delay').delayDateTime" type="datetime-local" style="width:100%" />
                  </div>
                </template>
              </template>
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <button v-if="!isEditMode && nodeTypeStep === 'config'" class="btn-ghost" @click="nodeTypeStep = 'select'">{{ $t('workflow.prevStep') }}</button>
        <button class="btn-ghost" @click="closeNodeDialog">{{ $t('common.cancel') }}</button>
        <button class="btn-dark" @click="confirmAddNode">{{ isEditMode ? $t('common.save') : $t('common.confirm') }}</button>
      </template>
    </el-dialog>

    <!-- 工作流属性编辑弹窗 -->
    <el-dialog v-model="showWorkflowDialog" :title="$t('workflow.workflowProperties')" width="500px">
      <el-form label-width="100px">
        <el-form-item :label="$t('workflow.workflowName')">
          <el-input v-model="workflowForm.name" />
        </el-form-item>
        <el-form-item :label="$t('workflow.status')">
          <el-switch v-model="workflowForm.status" 
            active-value="active" 
            inactive-value="inactive"
            :active-text="$t('workflow.active')" 
            :inactive-text="$t('workflow.inactive')" />
        </el-form-item>
        <el-form-item :label="$t('workflow.executionMode')">
          <el-select v-model="workflowForm.execution_mode">
            <el-option :label="$t('workflow.manual')" value="manual" />
            <el-option :label="$t('workflow.scheduled')" value="scheduled" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="workflowForm.execution_mode === 'scheduled'" :label="$t('workflow.startTime')">
          <el-date-picker v-model="workflowForm.start_time" type="datetime" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <button class="btn-ghost" @click="showWorkflowDialog = false">{{ $t('common.cancel') }}</button>
        <button class="btn-dark" @click="saveWorkflowProperties">{{ $t('common.save') }}</button>
      </template>
    </el-dialog>

<div v-if="results.length" class="result-card">
  <h3>{{ $t('workflow.results') }}</h3>
  <div class="result-list">
    <div v-for="(r, i) in results" :key="i" class="result-item">
      <span class="result-node">{{ r.node }}</span>
      <span class="result-tpl">{{ r.template }}</span>
      <span class="result-email">{{ r.email }}</span>
      <span :class="['result-tag', r.status === 'sent' ? 'success' : 'fail']">
        {{ r.status === 'sent' ? $t('workflow.statusSuccess') : $t('workflow.statusFail') }}
      </span>
    </div>
  </div>
</div>

<!-- 新建工作流弹窗（简化版） -->
<el-dialog v-model="showNewWorkflowDialog" :title="$t('workflow.createNewWorkflow')" width="400px">
  <el-form label-width="100px">
    <el-form-item :label="$t('workflow.workflowName')">
      <el-input v-model="newWorkflowName" :placeholder="$t('workflow.enterWorkflowName')" />
    </el-form-item>
  </el-form>
  <template #footer>
    <button class="btn-ghost" @click="showNewWorkflowDialog = false">{{ $t('common.cancel') }}</button>
    <button class="btn-dark" @click="confirmCreateWorkflow">{{ $t('common.confirm') }}</button>
  </template>
</el-dialog>
</div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Graph } from '@antv/x6'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Setting, Close, ArrowDown, VideoPlay, DocumentChecked } from '@element-plus/icons-vue'

const { t, locale } = useI18n()
const $t = t

// 数据
const templates = ref([])
const contacts = ref([])
const groups = ref([])
const savedWorkflows = ref([])
const workflowName = ref(t('workflow.unnamedWorkflow'))
const currentWfId = ref(null)
const isDirty = ref(false)
const showAddNode = ref(false)
const results = ref([])

// 统一弹窗状态
const nodeTypeStep = ref('select')
const selectedNodeType = ref(null)
const isEditMode = ref(false)
const editingNodeId = ref(null)

// 表单数据 - 使用 reactive 以保持响应性
const nodeForm = reactive({
  label: '',
  nodeType: 'email',
  template_id: null,
  recipientType: 'contact',
  contact_ids: [],
  group_ids: [],
  // 事件驱动节点 - 步骤配置
  steps: [
    { id: 'event', name: '监听事件', enabled: false, event_type: null, link_url: '' },
    { id: 'condition', name: '条件判断', enabled: false, field: null, operator: 'eq', value: '' },
    { id: 'delay', name: '延时', enabled: false, delayValue: 1, delayUnit: 'hours' }
  ],
  stepOrder: ['event', 'condition', 'delay'],
  expandedStep: null
})

// 工作流列表项点击/双击处理
let workflowClickTimer = null
let lastClickedWf = null

function handleWorkflowItemClick(wf) {
  // 如果之前有定时器，说明是双击，取消单击处理
  if (workflowClickTimer) {
    clearTimeout(workflowClickTimer)
    workflowClickTimer = null
    lastClickedWf = null
    return
  }
  // 记录点击的工作流，延迟执行单击操作
  lastClickedWf = wf
  workflowClickTimer = setTimeout(() => {
    if (lastClickedWf === wf) {
      loadWorkflow(wf)
    }
    workflowClickTimer = null
    lastClickedWf = null
  }, 250)
}

function handleWorkflowItemDblClick(wf) {
  // 双击时打开属性编辑
  openEditProperties(wf)
}

// 从列表打开编辑属性弹窗
function openEditProperties(wf) {
  workflowForm.value = {
    name: wf.name,
    status: wf.status || 'inactive',
    execution_mode: wf.execution_mode || 'manual',
    start_time: wf.start_time || ''
  }
  showWorkflowDialog.value = true
}

// 创建新工作流 - 清空画布并打开简化弹窗
async function createNewWorkflow() {
  if (isDirty.value) {
    try {
      await ElMessageBox.confirm(
        t('workflow.unsavedChangesConfirm') || '当前工作流有未保存的修改，是否放弃？',
        t('common.warning'),
        { type: 'warning' }
      )
    } catch {
      return
    }
  }
  // 清空画布
  graph.clearCells()
  selectedNodeId.value = null
  selectedAnchor.value = null
  clearAnchorHighlight()
  await new Promise(resolve => setTimeout(resolve, 50))
  nodeIdCounter = 0
  isDirty.value = false
  currentWfId.value = null
  workflowName.value = t('workflow.unnamedWorkflow')
  results.value = []

  // 打开新建弹窗
  newWorkflowName.value = ''
  showNewWorkflowDialog.value = true
}

// 确认新建工作流
async function confirmCreateWorkflow() {
  if (!newWorkflowName.value.trim()) {
    ElMessage.warning(t('workflow.enterWorkflowName'))
    return
  }
  workflowName.value = newWorkflowName.value.trim()
  // 创建空白工作流
  try {
    const flowData = { nodes: [], edges: [] }
    const wfData = {
      name: workflowName.value,
      flow_data: flowData,
      status: 'inactive',
      execution_mode: 'manual',
      start_time: null
    }
    const { data } = await request.post('/workflow', wfData)
    currentWfId.value = data.id
    isDirty.value = false
    workflowForm.value = {
      name: data.name,
      status: data.status || 'inactive',
      execution_mode: data.execution_mode || 'manual',
      start_time: data.start_time || ''
    }
    ElMessage.success(t('workflow.saveSuccess'))
    loadWorkflows()
  } catch (e) {
    ElMessage.error(t('workflow.saveFailed'))
  }
  showNewWorkflowDialog.value = false
}

// 步骤名称（支持国际化）
const stepNames = computed(() => ({
  event: t('workflow.step1Event'),
  condition: t('workflow.step2Condition'),
  delay: t('workflow.step3Delay')
}))

// 节点类型定义
const nodeTypes = [
  { value: 'email', icon: '📧', name: '发送邮件', desc: '选择模板和收件人发送邮件', color: '#1a1a1a' },
  { value: 'driver', icon: '🔔', name: '事件驱动', desc: '监听邮件事件、判断条件、延迟执行', color: '#e65100' }
]

const dialogTitle = computed(() => {
  if (isEditMode.value) {
    return $t('workflow.editNodeTitle')
  }
  return $t('workflow.addNodeTitle')
})

const NODE_COLORS = {
  email: { fill: '#fff', stroke: '#1a1a1a', text: '#1a1a1a' },
  driver: { fill: '#fff3e0', stroke: '#e65100', text: '#e65100' }
}

// 选中节点和锚点信息
const selectedNodeId = ref(null)
const selectedAnchor = ref(null)

function highlightAnchor(node, portId) {
  clearAnchorHighlight()
  
  const cell = graph.getCellById(node.id)
  if (!cell) return
  
  const view = graph.findView(cell)
  if (view && view.container) {
    const allCircles = view.container.querySelectorAll('circle')
    const targetCircle = Array.from(allCircles).find(c => c.getAttribute('data-port') === portId)
    if (targetCircle) {
      targetCircle.setAttribute('stroke', '#ff6b00')
      targetCircle.setAttribute('stroke-width', '3')
      targetCircle.setAttribute('fill', '#ffe0b2')
      targetCircle.classList.add('anchor-highlighted')
    }
  }
}

function clearAnchorHighlight() {
  graph.getNodes().forEach(node => {
    const view = graph.findView(node)
    if (!view || !view.container) return
    
    const circles = view.container.querySelectorAll('circle')
    circles.forEach(circle => {
      if (circle.classList.contains('anchor-highlighted')) {
        circle.setAttribute('stroke', '#31a0ff')
        circle.setAttribute('stroke-width', '2')
        circle.setAttribute('fill', '#fff')
        circle.classList.remove('anchor-highlighted')
      }
    })
  })
}

const emailForm = ref({
  label: '',
  template_id: null,
  recipientType: 'contact',
  contact_ids: [],
  group_ids: []
})

const eventForm = ref({
  label: '',
  event_type: null,
  link_url: ''
})

const conditionForm = ref({
  label: '',
  field: null,
  operator: 'eq',
  value: ''
})

const delayForm = ref({
  label: '',
  value: 1,
  unit: 'hours'
})

const showWorkflowDialog = ref(false)
const showNewWorkflowDialog = ref(false)
const workflowForm = ref({
  name: '',
  status: 'inactive',
  execution_mode: 'manual',
  start_time: ''
})
const newWorkflowName = ref('')

// X6 图实例
let graph = null
let nodeIdCounter = 0

// 节点配置参数
const NODE_WIDTH = 160
const NODE_HEIGHT = 60
const HORIZONTAL_GAP = 120
const VERTICAL_GAP = 80
const START_X = 100
const START_Y = 200

// 初始化 X6 画布
function initGraph() {
  graph = new Graph({
    container: document.getElementById('x6-container'),
    width: '100%',  // 画布宽度自适应容器
    height: '100%', // 改为 100% 以随父容器高度变化
    background: { color: '#f5f5f5' },
    grid: { visible: true },
    panning: { enabled: false, rubberband: true }, // 画布不可拖动，保留框选功能
    connecting: {
      anchor: 'center',
      connectionPoint: 'anchor',
      allowBlank: false,
      allowLoop: false,
      allowNode: true,
      allowEdge: false,
      allowMulti: false,
      highlight: true,
      router: {
        name: 'manhattan',
        args: { padding: 20 }
      },
      createEdge() {
        return graph.createEdge({
          shape: 'edge',
          attrs: {
            line: { stroke: '#666', strokeWidth: 2, targetMarker: { name: 'classic', size: 8 } }
          },
          zIndex: 0,
          connector: { name: 'rounded' }
        })
      }
    },
    // 允许节点拖动
    interacting: {
      nodeMovable: true,   // 节点可拖动
      edgeMovable: false,
      edgeLabelMovable: false
    }
  })

  // 选中节点后按 Delete 或 Backspace 删除
  graph.bindKey(['delete', 'backspace'], () => {
    const cells = graph.getSelectedCells()
    if (cells.length) {
      cells.forEach(cell => cell.remove())
      isDirty.value = true
      setTimeout(resizeCanvas, 100)
    }
  })

  // 点击节点选中
  graph.on('node:click', ({ node }) => {
    graph.resetSelection()
    node.addTools([
      {
        name: 'button-remove',
        args: {
          x: '100%',
          y: 0,
          offset: { x: -10, y: 10 }
        }
      }
    ])
    
    // 只选中节点，不影响锚点选择
    selectedNodeId.value = node.id
  })

  // 点击节点（非锚点区域）打开编辑弹窗
  graph.on('node:dblclick', ({ node, e }) => {
    const target = e.target
    const portElement = target.closest('[data-port]')
    // 只有双击非锚点区域才打开编辑弹窗
    if (!portElement) {
      const nodeData = node.getData() || {}
      // 将节点的 id 和 label（从 attrs.label.text 获取）添加到 nodeData
      const fullNodeData = {
        ...nodeData,
        id: node.id,
        label: nodeData.label || node.attr('label/text') || node.id || ''
      }
      openEditDialog(fullNodeData)
    }
  })

  // 点击画布空白处，取消选择
  graph.on('blank:click', () => {
    graph.resetSelection()
    selectedNodeId.value = null
    selectedAnchor.value = null
    clearAnchorHighlight()
  })

// 锚点单击/双击处理
let anchorClickTimer = null
let lastAnchorClick = null

function processAnchorClick(node, portId, isDblClick = false) {
  if (isDblClick) {
    // 双击时打开添加弹窗
    selectedNodeId.value = node.id
    selectedAnchor.value = portId
    highlightAnchor(node, portId)
    openAddDialog()
  } else {
    // 单击时选择锚点
    selectedNodeId.value = node.id
    selectedAnchor.value = portId
    highlightAnchor(node, portId)
    ElMessage.info(`已选择 ${portId} 锚点`)
  }
}

// 使用原生事件委托来检测锚点点击
graph.on('cell:click', ({ cell, e }) => {
  if (cell.isNode()) {
    const node = cell
    const event = e.nativeEvent || e
    const target = event.target || event.srcElement

    // 尝试多种方式查找data-port
    let portElement = target.closest('[data-port]')

    // 如果closest失败，尝试检查target本身
    if (!portElement && target.getAttribute) {
      const directDataPort = target.getAttribute('data-port')
      if (directDataPort) {
        portElement = target
      }
    }

    // 检查父元素
    if (!portElement && target.parentElement) {
      const parentDataPort = target.parentElement.getAttribute ? target.parentElement.getAttribute('data-port') : null
      if (parentDataPort) {
        portElement = target.parentElement
      }
    }

    if (portElement) {
      const portId = portElement.getAttribute('data-port')
      if (portId) {
        // 如果之前有定时器，说明是双击，取消单击处理
        if (anchorClickTimer) {
          clearTimeout(anchorClickTimer)
          anchorClickTimer = null
          lastAnchorClick = null
          return
        }
        // 延迟执行单击操作
        lastAnchorClick = { node, portId }
        anchorClickTimer = setTimeout(() => {
          if (lastAnchorClick && lastAnchorClick.portId === portId) {
            processAnchorClick(node, portId, false)
          }
          anchorClickTimer = null
          lastAnchorClick = null
        }, 250)
      }
    }
  }
})

// 取消选中时移除工具
graph.on('node:unselected', ({ node }) => {
  node.removeTools()
})

// 双击锚点打开添加弹窗
graph.on('cell:dblclick', ({ cell, e }) => {
  if (cell.isNode()) {
    const target = e.target
    const portElement = target.closest('[data-port]')
    if (portElement) {
      const portId = portElement.getAttribute('data-port')
      // 双击时直接处理，通过click事件处理延迟
      processAnchorClick(cell, portId, true)
    }
  }
})
}

// 计算新节点的合适位置
// anchorDirection: 'left' | 'right' | 'top' | 'bottom' | null
function calculateNodePosition(anchorDirection = null) {
  const nodes = graph.getNodes()
  if (nodes.length === 0) {
    return { x: START_X, y: START_Y }
  }

  // 如果有选中的源节点，基于源节点和锚点方向计算位置
  if (selectedNodeId.value && anchorDirection) {
    const sourceNode = graph.getCellById(selectedNodeId.value)
    if (sourceNode) {
      const pos = sourceNode.position()
      const size = sourceNode.size()
      
      if (anchorDirection === 'right') {
        // 新节点在源节点右侧
        return { x: pos.x + size.width + HORIZONTAL_GAP, y: pos.y }
      } else if (anchorDirection === 'left') {
        // 新节点在源节点左侧
        return { x: pos.x - HORIZONTAL_GAP, y: pos.y }
      } else if (anchorDirection === 'bottom') {
        // 新节点在源节点下方
        return { x: pos.x, y: pos.y + size.height + VERTICAL_GAP }
      } else if (anchorDirection === 'top') {
        // 新节点在源节点上方
        return { x: pos.x, y: pos.y - VERTICAL_GAP }
      }
    }
  }

  // 无选中锚点时，基于所有节点计算（原有逻辑）
  if (anchorDirection === 'left' || anchorDirection === 'right') {
    let maxX = Math.max(...nodes.map(n => n.position().x + n.size().width))
    let maxY = Math.max(...nodes.map(n => n.position().y))
    const newX = maxX + HORIZONTAL_GAP - NODE_WIDTH
    const newY = maxY
    return { x: newX, y: newY }
  } else if (anchorDirection === 'top' || anchorDirection === 'bottom') {
    let maxX = Math.max(...nodes.map(n => n.position().x))
    let maxY = Math.max(...nodes.map(n => n.position().y + n.size().height))
    const newX = maxX
    const newY = maxY + VERTICAL_GAP - NODE_HEIGHT
    return { x: newX, y: newY }
  } else {
    let maxX = Math.max(...nodes.map(n => n.position().x + n.size().width))
    let maxY = Math.max(...nodes.map(n => n.position().y + n.size().height))
    const newX = maxX + HORIZONTAL_GAP - NODE_WIDTH
    const newY = START_Y
    return { x: newX, y: newY }
  }
}

// 加载基础数据
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

// 加载已保存的工作流
async function loadWorkflows() {
  const { data } = await request.get('/workflow')
  savedWorkflows.value = data || []
}

// 添加邮件节点
function addEmailNode() {
  if (!emailForm.value.label) {
    ElMessage.warning(t('workflow.enterNodeName'))
    return
  }
  if (!emailForm.value.template_id) {
    ElMessage.warning(t('workflow.selectTemplateMsg'))
    return
  }
  if (emailForm.value.recipientType === 'contact' && !emailForm.value.contact_ids.length) {
    ElMessage.warning(t('workflow.selectContactMsg'))
    return
  }
  if (emailForm.value.recipientType === 'group' && !emailForm.value.group_ids.length) {
    ElMessage.warning(t('workflow.selectGroupMsg'))
    return
  }

  const id = `node-${++nodeIdCounter}`
  const position = calculateNodePosition(selectedAnchor.value)

  const node = graph.addNode({
    id,
    shape: 'rect',
    x: position.x,
    y: position.y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    attrs: {
      body: { fill: NODE_COLORS.email.fill, stroke: NODE_COLORS.email.stroke, strokeWidth: 2, rx: 8, ry: 8 },
      label: { text: emailForm.value.label, fill: NODE_COLORS.email.text, fontSize: 14 }
    },
    ports: getPortConfig(),
    data: {
      nodeType: 'email',
      label: emailForm.value.label,
      template_id: emailForm.value.template_id,
      recipientType: emailForm.value.recipientType,
      contact_ids: [...emailForm.value.contact_ids],
      group_ids: [...emailForm.value.group_ids]
    }
  })

  showAddEmail.value = false
  const newNodeId = id
  emailForm.value = {
    label: '',
    template_id: null,
    recipientType: 'contact',
    contact_ids: [],
    group_ids: []
  }
  ElMessage.success(t('workflow.nodeAdded'))

  const sourceNodeId = selectedNodeId.value
  const sourceAnchor = selectedAnchor.value
  selectedNodeId.value = null
  selectedAnchor.value = null
  clearAnchorHighlight()

  if (sourceNodeId && sourceAnchor) {
    setTimeout(() => {
      addEdgeBetweenNodes(sourceNodeId, sourceAnchor, newNodeId)
    }, 50)
  }
  setTimeout(resizeCanvas, 100)
}

function getPortConfig() {
  return {
    groups: {
      left: {
        position: 'left',
        markup: [{ tagName: 'circle', selector: 'circle' }],
        attrs: {
          circle: { r: 6, magnet: false, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff', 'data-port': 'left', cursor: 'pointer' }
        }
      },
      right: {
        position: 'right',
        markup: [{ tagName: 'circle', selector: 'circle' }],
        attrs: {
          circle: { r: 6, magnet: false, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff', 'data-port': 'right', cursor: 'pointer' }
        }
      },
      top: {
        position: 'top',
        markup: [{ tagName: 'circle', selector: 'circle' }],
        attrs: {
          circle: { r: 6, magnet: false, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff', 'data-port': 'top', cursor: 'pointer' }
        }
      },
      bottom: {
        position: 'bottom',
        markup: [{ tagName: 'circle', selector: 'circle' }],
        attrs: {
          circle: { r: 6, magnet: false, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff', 'data-port': 'bottom', cursor: 'pointer' }
        }
      }
    },
    items: [
      { id: 'left', group: 'left' },
      { id: 'right', group: 'right' },
      { id: 'top', group: 'top' },
      { id: 'bottom', group: 'bottom' }
    ]
  }
}

function addEdgeBetweenNodes(sourceNodeId, sourceAnchor, targetNodeId) {
  try {
    const targetPort = sourceAnchor === 'right' ? 'left' :
                       sourceAnchor === 'left' ? 'right' :
                       sourceAnchor === 'top' ? 'bottom' : 'top'
    const edge = graph.addEdge({
      source: sourceNodeId,
      sourcePort: sourceAnchor,
      target: targetNodeId,
      targetPort: targetPort,
      attrs: {
        line: { stroke: '#666', strokeWidth: 2, targetMarker: { name: 'classic', size: 8 } }
      },
      router: { name: 'manhattan', args: { padding: 20 } },
      connector: { name: 'rounded' }
    })
    ElMessage.success('已连接')
  } catch (err) {
    ElMessage.error('连接失败: ' + err.message)
  }
}

function handleAddNode(command) {
  // 检查画布中是否已有节点
  const hasExistingNodes = graph && graph.getNodes().length > 0
  
  // 如果已有节点，需要选中锚点才能添加新节点
  // 如果是第一个节点（画布为空），不需要选中锚点
  if (hasExistingNodes && (!selectedNodeId.value || !selectedAnchor.value)) {
    ElMessage.warning(t('workflow.selectAnchorFirst') || '请先选择一个节点的锚点来连接新节点')
    return
  }
  resetNodeForm()
  if (command === 'email') {
    selectedNodeType.value = 'email'
    nodeTypeStep.value = 'select'
  } else if (command === 'driver') {
    selectedNodeType.value = 'driver'
    nodeTypeStep.value = 'select'
  } else if (command) {
    selectedNodeType.value = command
    nodeTypeStep.value = 'select'
  } else {
    selectedNodeType.value = null
    nodeTypeStep.value = 'select'
  }
  isEditMode.value = false
  showAddNode.value = true
}

function openAddDialog() {
  resetNodeForm()
  isEditMode.value = false
  editingNodeId.value = null
  nodeTypeStep.value = 'select'
  showAddNode.value = true
}

function openEditDialog(nodeData) {
  // 先重置表单，确保没有残留数据
  resetNodeForm()
  
  isEditMode.value = true
  editingNodeId.value = nodeData.id
  selectedNodeType.value = nodeData.nodeType || 'email'
  nodeTypeStep.value = 'config'

  // 确保 label 不为空，优先使用 nodeData.label，否则使用节点 ID
  const label = nodeData.label || nodeData.id || ''
  nodeForm.label = label
  nodeForm.nodeType = nodeData.nodeType || 'email'
  nodeForm.template_id = nodeData.template_id || null
  nodeForm.recipientType = nodeData.recipientType || 'contact'
  nodeForm.contact_ids = nodeData.contact_ids ? [...nodeData.contact_ids] : []
  nodeForm.group_ids = nodeData.group_ids ? [...nodeData.group_ids] : []

  if (nodeData.nodeType === 'driver') {
    if (nodeData.steps && Array.isArray(nodeData.steps) && nodeData.steps.length > 0) {
      nodeForm.steps = JSON.parse(JSON.stringify(nodeData.steps))
      nodeForm.stepOrder = nodeData.stepOrder && Array.isArray(nodeData.stepOrder) ? [...nodeData.stepOrder] : ['event', 'condition', 'delay']
      nodeForm.expandedStep = nodeData.steps[0]?.id || null
    } else {
      nodeForm.steps = [
        { id: 'event', name: stepNames.value.event, enabled: false, event_type: null, link_url: '' },
        { id: 'condition', name: stepNames.value.condition, enabled: false, field: null, operator: 'eq', value: '' },
        { id: 'delay', name: stepNames.value.delay, enabled: false, delayType: 'relative', delayValue: 1, delayUnit: 'hours', delayDateTime: '' }
      ]
      nodeForm.stepOrder = ['event', 'condition', 'delay']
      nodeForm.expandedStep = null
    }
  } else {
    nodeForm.steps = [
      { id: 'event', name: stepNames.value.event, enabled: false, event_type: null, link_url: '' },
      { id: 'condition', name: stepNames.value.condition, enabled: false, field: null, operator: 'eq', value: '' },
      { id: 'delay', name: stepNames.value.delay, enabled: false, delayType: 'relative', delayValue: 1, delayUnit: 'hours', delayDateTime: '' }
    ]
    nodeForm.stepOrder = ['event', 'condition', 'delay']
    nodeForm.expandedStep = null
  }
  showAddNode.value = true
}

function closeNodeDialog() {
  showAddNode.value = false
  resetNodeForm()
  selectedNodeType.value = null
  nodeTypeStep.value = 'select'
  isEditMode.value = false
  editingNodeId.value = null
}

let dragIndex = 0

function onDragStart(index) {
  dragIndex = index
}

function onDrop(index) {
  if (dragIndex === index) return
  const currentOrder = nodeForm.stepOrder || ['event', 'condition', 'delay']
  const newOrder = [...currentOrder]
  const [removed] = newOrder.splice(dragIndex, 1)
  newOrder.splice(index, 0, removed)
  nodeForm.stepOrder = newOrder
  dragIndex = 0
}

function getStepById(stepId) {
  if (!nodeForm.steps) return { name: '', enabled: false }
  const step = nodeForm.steps.find(s => s.id === stepId)
  if (step) return step
  return { name: '', enabled: false }
}

function toggleStepExpand(stepId) {
  nodeForm.expandedStep = nodeForm.expandedStep === stepId ? null : stepId
}

function resetNodeForm() {
  nodeForm.label = ''
  nodeForm.nodeType = 'email'
  nodeForm.template_id = null
  nodeForm.recipientType = 'contact'
  nodeForm.contact_ids = []
  nodeForm.group_ids = []
  nodeForm.steps = [
    { id: 'event', name: stepNames.value.event, enabled: false, event_type: null, link_url: '' },
    { id: 'condition', name: stepNames.value.condition, enabled: false, field: null, operator: 'eq', value: '' },
    { id: 'delay', name: stepNames.value.delay, enabled: false, delayType: 'relative', delayValue: 1, delayUnit: 'hours', delayDateTime: '' }
  ]
  nodeForm.stepOrder = ['event', 'condition', 'delay']
  nodeForm.expandedStep = null
  clearAnchorHighlight()
}

async function confirmAddNode() {
  if (!nodeForm.label) {
    ElMessage.warning(t('workflow.enterNodeName'))
    return
  }

    if (isEditMode.value) {
      const cell = graph.getCellById(editingNodeId.value)
      if (cell) {
        const colors = NODE_COLORS[selectedNodeType.value] || NODE_COLORS.email
        const isDriverNode = selectedNodeType.value === 'driver'
        const nodeWidth = isDriverNode ? NODE_WIDTH + 20 : NODE_WIDTH
        const nodeHeight = isDriverNode ? NODE_HEIGHT - 10 : NODE_HEIGHT
        // 获取现有数据，保留id等重要字段
        const existingData = cell.getData() || {}
        const newData = {
          ...existingData,
          nodeType: selectedNodeType.value,
          label: nodeForm.label
        }
        if (selectedNodeType.value === 'email') {
          newData.template_id = nodeForm.template_id
          newData.recipientType = nodeForm.recipientType
          newData.contact_ids = [...nodeForm.contact_ids]
          newData.group_ids = [...nodeForm.group_ids]
          // email节点不需要steps
          delete newData.steps
          delete newData.stepOrder
        } else if (selectedNodeType.value === 'driver') {
          newData.steps = JSON.parse(JSON.stringify(nodeForm.steps))
          newData.stepOrder = [...nodeForm.stepOrder]
          // driver节点不需要email相关字段
          delete newData.template_id
          delete newData.recipientType
          delete newData.contact_ids
          delete newData.group_ids
        }
        cell.setData(newData, { overwrite: true })
      cell.setAttrs({
        label: { text: nodeForm.label, fill: colors.text },
        body: { fill: colors.fill, stroke: colors.stroke, strokeWidth: 2, rx: isDriverNode ? 20 : 8, ry: isDriverNode ? 20 : 8 }
      })
      cell.setProp('size', { width: nodeWidth, height: nodeHeight })
      isDirty.value = true
      ElMessage.success(t('workflow.updateSuccess'))
    }
    closeNodeDialog()
    return
  }

  // 添加新节点
  if (selectedNodeType.value === 'email') {
    if (!nodeForm.template_id) {
      ElMessage.warning(t('workflow.selectTemplateMsg'))
      return
    }
    if (nodeForm.recipientType === 'contact' && !nodeForm.contact_ids.length) {
      ElMessage.warning(t('workflow.selectContactMsg'))
      return
    }
    if (nodeForm.recipientType === 'group' && !nodeForm.group_ids.length) {
      ElMessage.warning(t('workflow.selectGroupMsg'))
      return
    }
  } else if (selectedNodeType.value === 'driver') {
    const enabledSteps = nodeForm.steps.filter(s => s.enabled)
    if (enabledSteps.length === 0) {
      ElMessage.warning('请至少启用一个步骤')
      return
    }
  }

  const id = `node-${++nodeIdCounter}`
  const position = calculateNodePosition(selectedAnchor.value)
  const colors = NODE_COLORS[selectedNodeType.value] || NODE_COLORS.email

    let nodeData = { id, nodeType: selectedNodeType.value, label: nodeForm.label }
    if (selectedNodeType.value === 'email') {
      nodeData = { ...nodeData, template_id: nodeForm.template_id, recipientType: nodeForm.recipientType, contact_ids: [...nodeForm.contact_ids], group_ids: [...nodeForm.group_ids] }
    } else if (selectedNodeType.value === 'driver') {
      nodeData = {
        ...nodeData,
        steps: JSON.parse(JSON.stringify(nodeForm.steps)),
        stepOrder: [...nodeForm.stepOrder]
      }
    }

  // 使用事件驱动类型节点（使用圆角菱形效果的矩形）
  const isDriverNode = selectedNodeType.value === 'driver'
  graph.addNode({
    id,
    shape: 'rect',
    x: position.x,
    y: position.y,
    width: isDriverNode ? NODE_WIDTH + 20 : NODE_WIDTH,
    height: isDriverNode ? NODE_HEIGHT - 10 : NODE_HEIGHT,
    attrs: {
      body: { fill: colors.fill, stroke: colors.stroke, strokeWidth: 2, rx: isDriverNode ? 20 : 8, ry: isDriverNode ? 20 : 8 },
      label: { text: nodeForm.label, fill: colors.text, fontSize: 12 }
    },
    ports: getPortConfig(),
    data: nodeData
  })

  isDirty.value = true
  ElMessage.success(t('workflow.nodeAdded'))

  const sourceNodeId = selectedNodeId.value
  const sourceAnchor = selectedAnchor.value
  selectedNodeId.value = null
  selectedAnchor.value = null
  clearAnchorHighlight()

  if (sourceNodeId && sourceAnchor) {
    setTimeout(() => {
      addEdgeBetweenNodes(sourceNodeId, sourceAnchor, id)
    }, 50)
  }
  setTimeout(resizeCanvas, 100)
  closeNodeDialog()
}

// 保存工作流
async function saveWorkflow() {
  if (!workflowName.value.trim()) {
    ElMessage.warning(t('workflow.enterWorkflowName'))
    return
  }

  const nodes = graph.getNodes().map(n => ({
    id: n.id,
    x: n.position().x,
    y: n.position().y,
    data: n.getData()
  }))
  const edges = graph.getEdges().map(e => ({
    source: e.getSourceCellId(),
    target: e.getTargetCellId(),
    sourcePort: e.getSourcePortId(),
    targetPort: e.getTargetPortId()
  }))

  const flowData = { nodes, edges }

  try {
    const wfData = {
      name: workflowName.value,
      flow_data: flowData,
      status: workflowForm.value.status,
      execution_mode: workflowForm.value.execution_mode,
      start_time: workflowForm.value.start_time || null
    }
    if (currentWfId.value) {
      await request.put(`/workflow/${currentWfId.value}`, wfData)
      isDirty.value = false
      ElMessage.success(t('workflow.updateSuccess'))
    } else {
      const { data } = await request.post('/workflow', wfData)
      currentWfId.value = data.id
      isDirty.value = false
      workflowForm.value = {
        name: data.name,
        status: data.status || 'inactive',
        execution_mode: data.execution_mode || 'manual',
        start_time: data.start_time || ''
      }
      ElMessage.success(t('workflow.saveSuccess'))
    }
    loadWorkflows()
  } catch (e) {
    ElMessage.error(t('workflow.saveFailed'))
  }
}

// 加载工作流到画布
function loadWorkflow(wf) {
  if (isDirty.value) {
    ElMessageBox.confirm('当前工作流有未保存的修改，切换将丢失这些更改。是否继续？', '警告', {
      confirmButtonText: '继续',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      doLoadWorkflow(wf)
    }).catch(() => {})
    return
  }
  doLoadWorkflow(wf)
}

async function doLoadWorkflow(wf) {
  selectedNodeId.value = null
  selectedAnchor.value = null
  clearAnchorHighlight()
  graph.clearCells()
  await new Promise(resolve => setTimeout(resolve, 0))
  graph.getNodes().forEach(n => n.remove())
  graph.getEdges().forEach(e => e.remove())
  await new Promise(resolve => setTimeout(resolve, 50))
  nodeIdCounter = 0
  isDirty.value = false

  currentWfId.value = wf.id
  workflowName.value = wf.name
  workflowForm.value = {
    name: wf.name,
    status: wf.status || 'inactive',
    execution_mode: wf.execution_mode || 'manual',
    start_time: wf.start_time || ''
  }

  const flow = wf.flow_data || { nodes: [], edges: [] }

  flow.nodes.forEach((n) => {
    nodeIdCounter++
    // 确保 nodeData 存在，并包含必需的字段
    const nodeData = n.data || {}
    // 确保 id 在 data 中
    nodeData.id = n.id
    // 如果 label 为空，使用节点 ID 作为后备
    if (!nodeData.label) {
      nodeData.label = n.id || 'Node'
    }

    const nodeType = nodeData.nodeType || 'email'
    const colors = NODE_COLORS[nodeType] || NODE_COLORS.email
    const isDriverNode = nodeType === 'driver'

    graph.addNode({
      id: n.id,
      shape: 'rect',
      x: n.x ?? START_X,
      y: n.y ?? START_Y,
      width: isDriverNode ? NODE_WIDTH + 20 : NODE_WIDTH,
      height: isDriverNode ? NODE_HEIGHT - 10 : NODE_HEIGHT,
      attrs: {
        body: { fill: colors.fill, stroke: colors.stroke, strokeWidth: 2, rx: isDriverNode ? 20 : 8, ry: isDriverNode ? 20 : 8 },
        label: { text: nodeData.label, fill: colors.text, fontSize: 14 }
      },
      ports: getPortConfig(),
      data: nodeData
    })
  })

  flow.edges.forEach(e => {
    graph.addEdge({
      source: { cell: e.source, port: e.sourcePort },
      target: { cell: e.target, port: e.targetPort },
      attrs: {
        line: { stroke: '#666', strokeWidth: 2, targetMarker: { name: 'classic', size: 8 } }
      },
      router: { name: 'manhattan', args: { padding: 20 } },
      connector: { name: 'rounded' }
    })
  })
  setTimeout(resizeCanvas, 100)
}

// 删除工作流
async function deleteWorkflow(id) {
  await ElMessageBox.confirm(t('workflow.deleteConfirm'), t('common.warning'), { type: 'warning' })
  await request.delete(`/workflow/${id}`)
  if (currentWfId.value === id) {
    currentWfId.value = null
    workflowName.value = t('workflow.unnamedWorkflow')
    selectedNodeId.value = null
    selectedAnchor.value = null
    clearAnchorHighlight()
    graph.clearCells()
    await new Promise(resolve => setTimeout(resolve, 50))
    nodeIdCounter = 0
    isDirty.value = false
  }
  loadWorkflows()
  ElMessage.success(t('workflow.deleteSuccess'))
}

// 保存工作流属性
async function saveWorkflowProperties() {
  workflowName.value = workflowForm.value.name
  await saveWorkflow()
  showWorkflowDialog.value = false
}

// 执行工作流
async function executeWorkflow() {
  if (!currentWfId.value) {
    ElMessage.warning(t('workflow.pleaseSaveFirst'))
    return
  }

  try {
    const { data } = await request.post(`/workflow/${currentWfId.value}/execute`)
    results.value = data.results || []
    ElMessage.success(t('workflow.sendSuccess') || 'Sending completed')
  } catch (e) {
    ElMessage.error(t('workflow.sendFailed'))
  }
}

function resizeCanvas() {
  if (!graph) return
  const container = document.getElementById('x6-container')
  if (!container) return

  const nodes = graph.getNodes()
  if (nodes.length === 0) {
    container.style.height = '500px'
    return
  }

  let maxY = 0
  let maxX = 0
  nodes.forEach(n => {
    const pos = n.position()
    const size = n.size()
    maxX = Math.max(maxX, pos.x + size.width)
    maxY = Math.max(maxY, pos.y + size.height)
  })

  const padding = 150
  const edges = graph.getEdges()
  edges.forEach(e => {
    const srcPos = e.getSourcePoint()
    const tgtPos = e.getTargetPoint()
    if (srcPos) maxY = Math.max(maxY, srcPos.y)
    if (tgtPos) maxY = Math.max(maxY, tgtPos.y)
  })

  const calculatedHeight = maxY + padding
  const parentHeight = container.parentElement.clientHeight
  const headerHeight = document.querySelector('.page-header')?.clientHeight || 0
  const savedBarHeight = document.querySelector('.saved-bar')?.clientHeight || 0
  const resultCardHeight = document.querySelector('.result-card')?.clientHeight || 0
  const availableHeight = parentHeight - headerHeight - savedBarHeight - resultCardHeight - 40
  const finalHeight = Math.max(calculatedHeight, Math.min(availableHeight, 1200))

  container.style.height = `${finalHeight}px`
  graph.resize(undefined, finalHeight)
}

onMounted(() => {
  initGraph()
  loadData()
  loadWorkflows()
  setTimeout(resizeCanvas, 100)
})

onUnmounted(() => {
  if (graph) {
    graph.dispose()
  }
})

// 窗口大小变化时重新计算画布高度
let resizeTimeout
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(resizeCanvas, 200)
})
</script>

<style scoped>
.workflow-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* 确保画布区域可以独立滚动 */
  overflow: auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.5px;
}
.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.wf-name-input {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--card-bg);
  min-width: 160px;
}
.wf-name-input:focus {
  outline: none;
  border-color: var(--primary);
}
.btn-dark {
  padding: 10px 18px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-dark:hover {
  background: var(--primary-light);
}
.btn-outline {
  padding: 10px 18px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.btn-accent {
  padding: 10px 18px;
  background: #2e7d32;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-accent:hover {
  background: #388e3c;
}
.saved-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.saved-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.saved-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.saved-chip:hover,
.saved-chip.active {
  border-color: var(--primary);
  background: rgba(26, 26, 26, 0.05);
}
.chip-del {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1;
}
.chip-del:hover {
  color: var(--accent);
}
.canvas-wrap {
    overflow-x: hidden;
    overflow-y: auto;
    /* 移除 height: 100%，使用 JS 设置的高度 */
    height: auto;
  }
  /* 确保 x6-graph 的高度可以自适应 */
  #x6-container .x6-graph {
    height: auto !important;
    min-height: 100%;
  }
.dialog-form .field {
  margin-bottom: 16px;
}
.node-config-form .field {
  margin-bottom: 16px;
}
.node-config-form label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 500;
}
.node-config-form input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: #faf9f7;
  transition: border-color 0.2s;
}
.node-config-form input:focus {
  border-color: var(--primary);
}
.dialog-form label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 500;
}
.dialog-form input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: #faf9f7;
  transition: border-color 0.2s;
}
.dialog-form input:focus {
  border-color: var(--primary);
}
.type-switch {
  display: flex;
  gap: 8px;
}
.type-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #faf9f7;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.type-btn.active {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}
.btn-ghost {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-ghost:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.delay-input-row {
  display: flex;
  gap: 10px;
}
.delay-input-row input {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  background: #faf9f7;
}
.delay-input-row input:focus {
  border-color: var(--primary);
  outline: none;
}
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 20px;
}
.step-indicator span {
  font-size: 14px;
  color: #999;
}
.step-indicator span.active {
  color: var(--primary);
  font-weight: 600;
}
.step-indicator .arrow {
  color: #ccc;
}
.node-type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  padding: 10px;
}
.node-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border: 2px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.node-type-card:hover {
  border-color: var(--primary);
  background: #faf9f7;
}
.node-type-card.selected {
  border-color: var(--primary);
  background: #f0f7ff;
}
.node-type-card .type-icon {
  font-size: 32px;
  margin-bottom: 10px;
}
.node-type-card .type-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 5px;
}
.node-type-card .type-desc {
  font-size: 12px;
  color: #666;
  text-align: center;
}
.result-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  margin-top: 20px;
}
.result-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}
.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #faf9f7;
  border-radius: 8px;
  gap: 12px;
}
.result-node {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  min-width: 80px;
}
.result-tpl {
  font-size: 13px;
  color: var(--text-secondary);
}
.result-email {
  font-size: 13px;
  color: var(--text-secondary);
  flex: 1;
}
.result-tag {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 20px;
}
.result-tag.success {
  background: #e8f5e9;
  color: #2e7d32;
}
.result-tag.fail {
  background: #fce4ec;
  color: #c62828;
}
.driver-steps {
  margin-top: 10px;
}
.step-order-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}
.step-order-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: 10px;
  white-space: nowrap;
}
.step-cards {
  display: flex;
  gap: 10px;
  flex: 1;
  overflow-x: auto;
}
.step-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: grab;
  background: #faf9f7;
  transition: all 0.2s;
  min-width: 100px;
}
.step-card:hover {
  border-color: var(--primary);
}
.step-card.disabled {
  opacity: 0.6;
}
.step-card:active {
  cursor: grabbing;
}
.step-num {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
}
.step-name {
  font-size: 13px;
  color: var(--text);
}
.step-expand {
  font-size: 10px;
  cursor: pointer;
  color: #999;
  padding: 2px;
}
.step-expand:hover {
  color: var(--primary);
}
.step-config {
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-top: 10px;
}

/* ========== 新布局样式 ========== */

/* 主内容区 - 左右布局 */
.workflow-main {
  display: flex;
  flex: 1;
  gap: 16px;
  overflow: hidden;
  height: calc(100% - 80px);
}

/* 左侧边栏 */
.workflow-sidebar {
  width: 220px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

/* 工作流列表 */
.workflow-list {
  flex: 1;
  overflow-y: auto;
}

.workflow-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
  margin-bottom: 8px;
}

.workflow-list-item:hover {
  background: rgba(26, 26, 26, 0.03);
  border-color: var(--border);
}

.workflow-list-item.active {
  background: rgba(26, 26, 26, 0.05);
  border-color: var(--primary);
}

.workflow-info {
  flex: 1;
  min-width: 0;
}

.workflow-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-status {
  font-size: 11px;
}

.workflow-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}

.workflow-list-item:hover .workflow-actions {
  opacity: 1;
}

.edit-icon,
.delete-icon {
  font-size: 26px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s;
  padding: 8px;
  border-radius: 4px;
}

.edit-icon:hover {
  color: var(--primary);
  background: rgba(26, 26, 26, 0.05);
}

.delete-icon:hover {
  color: #c62828;
  background: rgba(198, 40, 40, 0.05);
}

/* 工作流属性弹窗表单标签宽度 */
:deep(.el-form-item__label) {
  width: 120px !important;
}

/* 弹窗底部按钮间距 */
:deep(.el-dialog__footer) {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-dialog__footer) button {
  margin-left: 0;
}

.empty-state {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 40px 20px;
}

/* 画布区域 */
.workflow-canvas-area {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 左上角工具栏 */
.canvas-toolbar-left {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 10;
}

.current-workflow-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 右上角工具栏 */
.canvas-toolbar-right {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
}

/* 按钮图标间距 */
.mr-1 {
  margin-right: 4px;
}

.mr-2 {
  margin-right: 8px;
}

.ml-1 {
  margin-left: 4px;
}
</style>
