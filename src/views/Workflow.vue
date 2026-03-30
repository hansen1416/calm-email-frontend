<template>
  <div class="page workflow-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">节点发送</h1>
        <p class="page-desc">可视化配置邮件发送流程，拖拽节点、连线构建工作流</p>
      </div>
      <div class="header-actions">
        <input v-model="workflowName" class="wf-name-input" placeholder="工作流名称" />
        <button class="btn-dark" @click="showAddEmail = true">+ 邮件节点</button>
        <button class="btn-outline" @click="saveWorkflow">💾 保存</button>
        <button class="btn-accent" @click="executeWorkflow">📨 发送</button>
      </div>
    </div>

    <div v-if="savedWorkflows.length" class="saved-bar">
      <span class="saved-label">已保存：</span>
      <div v-for="wf in savedWorkflows" :key="wf.id" class="saved-chip"
        :class="{ active: currentWfId === wf.id }" @click="loadWorkflow(wf)">
        {{ wf.name }}
        <span class="chip-del" @click.stop="deleteWorkflow(wf.id)">×</span>
      </div>
    </div>

    <div id="x6-container" class="canvas-wrap"></div>

    <el-dialog v-model="showAddEmail" title="添加邮件节点" width="520px">
      <div class="dialog-form">
        <div class="field">
          <label>节点名称</label>
          <input v-model="emailForm.label" placeholder="如：欢迎邮件" />
        </div>
        <div class="field">
          <label>选择模板</label>
          <el-select v-model="emailForm.template_id" placeholder="选择邮件模板" style="width:100%">
            <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </div>
        <div class="field">
          <label>收件人类型</label>
          <div class="type-switch">
            <button :class="['type-btn', emailForm.recipientType === 'contact' ? 'active' : '']"
              @click="emailForm.recipientType = 'contact'">联系人</button>
            <button :class="['type-btn', emailForm.recipientType === 'group' ? 'active' : '']"
              @click="emailForm.recipientType = 'group'">用户组</button>
          </div>
        </div>
        <div v-if="emailForm.recipientType === 'contact'" class="field">
          <label>选择联系人</label>
          <el-select v-model="emailForm.contact_ids" multiple placeholder="选择联系人" style="width:100%">
            <el-option v-for="c in contacts" :key="c.id" :label="`${c.name} (${c.email})`" :value="c.id" />
          </el-select>
        </div>
        <div v-if="emailForm.recipientType === 'group'" class="field">
          <label>选择用户组</label>
          <el-select v-model="emailForm.group_ids" multiple placeholder="选择用户组" style="width:100%">
            <el-option v-for="g in groups" :key="g.id" :label="`${g.name} (${g.contact_count}人)`" :value="g.id" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="showAddEmail = false">取消</button>
        <button class="btn-dark" @click="addEmailNode">确定</button>
      </template>
    </el-dialog>

    <div v-if="results.length" class="result-card">
      <h3>发送结果</h3>
      <div class="result-list">
        <div v-for="(r, i) in results" :key="i" class="result-item">
          <span class="result-node">{{ r.node }}</span>
          <span class="result-tpl">{{ r.template }}</span>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { Graph } from '@antv/x6'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

// 数据
const templates = ref([])
const contacts = ref([])
const groups = ref([])
const savedWorkflows = ref([])
const workflowName = ref('未命名工作流')
const currentWfId = ref(null)
const showAddEmail = ref(false)
const results = ref([])
const emailForm = ref({
  label: '',
  template_id: null,
  recipientType: 'contact',
  contact_ids: [],
  group_ids: []
})

// X6 图实例
let graph = null
let nodeIdCounter = 0

// 初始化 X6 画布
function initGraph() {
  graph = new Graph({
    container: document.getElementById('x6-container'),
    width: '100%',
    height: 600,
    background: { color: '#f5f5f5' },
    grid: { visible: true },
    panning: { enabled: true },
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
        args: {
          padding: 20
        }
      },
      createEdge() {
        return graph.createEdge({
          shape: 'edge',
          attrs: {
            line: { stroke: '#666', strokeWidth: 2, targetMarker: { name: 'classic', size: 8 } }
          },
          zIndex: 0,
          connector: { name: 'rounded' },
          tools: [
            {
              name: 'button-remove',
              args: { distance: -40 }
            }
          ]
        })
      }
    },
    interacting: {
      nodeMovable: true,
      edgeMovable: false,
      edgeLabelMovable: false
    }
  })

  // 选中节点/边后按 Delete 或 Backspace 删除
  graph.bindKey(['delete', 'backspace'], () => {
    const cells = graph.getSelectedCells()
    if (cells.length) {
      cells.forEach(cell => cell.remove())
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
  })

  // 取消选中时移除工具
  graph.on('node:unselected', ({ node }) => {
    node.removeTools()
  })
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
    ElMessage.warning('请输入节点名称')
    return
  }
  if (!emailForm.value.template_id) {
    ElMessage.warning('请选择邮件模板')
    return
  }
  if (emailForm.value.recipientType === 'contact' && !emailForm.value.contact_ids.length) {
    ElMessage.warning('请选择联系人')
    return
  }
  if (emailForm.value.recipientType === 'group' && !emailForm.value.group_ids.length) {
    ElMessage.warning('请选择用户组')
    return
  }

  const id = `node-${++nodeIdCounter}`
  const node = graph.addNode({
    id,
    shape: 'rect',
    x: 100 + (nodeIdCounter - 1) * 200,
    y: 200,
    width: 160,
    height: 60,
    attrs: {
      body: { fill: '#fff', stroke: '#1a1a1a', strokeWidth: 2, rx: 8, ry: 8 },
      label: { text: emailForm.value.label, fill: '#1a1a1a', fontSize: 14 }
    },
    // 添加四个方向的连接桩
    ports: {
      groups: {
        left: {
          position: 'left',
          attrs: {
            circle: { r: 6, magnet: true, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff' }
          }
        },
        right: {
          position: 'right',
          attrs: {
            circle: { r: 6, magnet: true, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff' }
          }
        },
        top: {
          position: 'top',
          attrs: {
            circle: { r: 6, magnet: true, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff' }
          }
        },
        bottom: {
          position: 'bottom',
          attrs: {
            circle: { r: 6, magnet: true, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff' }
          }
        }
      },
      items: [
        { id: 'left', group: 'left' },
        { id: 'right', group: 'right' },
        { id: 'top', group: 'top' },
        { id: 'bottom', group: 'bottom' }
      ]
    },
    portMarkup: [{ tagName: 'circle', selector: 'circle' }],
    data: {
      label: emailForm.value.label,
      template_id: emailForm.value.template_id,
      recipientType: emailForm.value.recipientType,
      contact_ids: [...emailForm.value.contact_ids],
      group_ids: [...emailForm.value.group_ids]
    }
  })
  // 不再自动连线，用户手动从端口连线

  showAddEmail.value = false
  emailForm.value = {
    label: '',
    template_id: null,
    recipientType: 'contact',
    contact_ids: [],
    group_ids: []
  }
  ElMessage.success('节点已添加')
}

// 保存工作流
async function saveWorkflow() {
  if (!workflowName.value.trim()) {
    ElMessage.warning('请输入工作流名称')
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
    if (currentWfId.value) {
      await request.put(`/workflow/${currentWfId.value}`, {
        name: workflowName.value,
        flow_data: flowData
      })
      ElMessage.success('更新成功')
    } else {
      const { data } = await request.post('/workflow', {
        name: workflowName.value,
        flow_data: flowData
      })
      currentWfId.value = data.id
      ElMessage.success('保存成功')
    }
    loadWorkflows()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

// 加载工作流到画布
function loadWorkflow(wf) {
  currentWfId.value = wf.id
  workflowName.value = wf.name
  graph.clearCells()
  nodeIdCounter = 0

  const flow = wf.flow_data || { nodes: [], edges: [] }
  
  // 先添加节点
  flow.nodes.forEach((n, i) => {
    nodeIdCounter++
    graph.addNode({
      id: n.id,
      shape: 'rect',
      x: n.x ?? 100 + i * 200,
      y: n.y ?? 200,
      width: 160,
      height: 60,
      attrs: {
        body: { fill: '#fff', stroke: '#1a1a1a', strokeWidth: 2, rx: 8, ry: 8 },
        label: { text: n.data?.label || '节点', fill: '#1a1a1a', fontSize: 14 }
      },
      ports: {
        groups: {
          left: {
            position: 'left',
            attrs: {
              circle: { r: 6, magnet: true, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff' }
            }
          },
          right: {
            position: 'right',
            attrs: {
              circle: { r: 6, magnet: true, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff' }
            }
          },
          top: {
            position: 'top',
            attrs: {
              circle: { r: 6, magnet: true, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff' }
            }
          },
          bottom: {
            position: 'bottom',
            attrs: {
              circle: { r: 6, magnet: true, stroke: '#31a0ff', strokeWidth: 2, fill: '#fff' }
            }
          }
        },
        items: [
          { id: 'left', group: 'left' },
          { id: 'right', group: 'right' },
          { id: 'top', group: 'top' },
          { id: 'bottom', group: 'bottom' }
        ]
      },
      portMarkup: [{ tagName: 'circle', selector: 'circle' }],
      data: n.data
    })
  })

  // 再添加边
  flow.edges.forEach(e => {
    const edge = graph.addEdge({
      source: { cell: e.source, port: e.sourcePort },
      target: { cell: e.target, port: e.targetPort },
      attrs: {
        line: { stroke: '#666', strokeWidth: 2, targetMarker: { name: 'classic', size: 8 } }
      },
      router: { name: 'manhattan', args: { padding: 20 } },
      connector: { name: 'rounded' }
    })
    // 添加删除按钮
    edge.addTools([
      {
        name: 'button-remove',
        args: { distance: -40 }
      }
    ])
  })
}

// 删除工作流
async function deleteWorkflow(id) {
  await ElMessageBox.confirm('确定删除该工作流？', '提示', { type: 'warning' })
  await request.delete(`/workflow/${id}`)
  if (currentWfId.value === id) {
    currentWfId.value = null
    workflowName.value = '未命名工作流'
    graph.clearCells()
    nodeIdCounter = 0
  }
  loadWorkflows()
  ElMessage.success('删除成功')
}

// 执行工作流
async function executeWorkflow() {
  if (!currentWfId.value) {
    ElMessage.warning('请先保存工作流')
    return
  }

  try {
    const { data } = await request.post(`/workflow/${currentWfId.value}/execute`)
    results.value = data.results || []
    ElMessage.success('发送完成')
  } catch (e) {
    ElMessage.error('发送失败')
  }
}

onMounted(() => {
  initGraph()
  loadData()
  loadWorkflows()
})

onUnmounted(() => {
  if (graph) {
    graph.dispose()
  }
})
</script>

<style scoped>
.workflow-page {
  display: flex;
  flex-direction: column;
  height: 100%;
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
  flex: 1;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-height: 500px;
}
.dialog-form .field {
  margin-bottom: 16px;
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
</style>
