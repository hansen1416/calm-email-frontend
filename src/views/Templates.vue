<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">邮件模板</h1>
        <p class="page-desc">创建和管理你的邮件模板</p>
      </div>
      <button class="btn-dark" @click="openDialog()">+ 添加模板</button>
    </div>

    <div v-if="!templates.length" class="empty-state">
      <p>还没有邮件模板，点击上方按钮创建</p>
    </div>

    <div v-else class="tpl-grid">
      <div v-for="t in templates" :key="t.id" class="tpl-card">
        <div class="tpl-top">
          <span class="tpl-icon">📄</span>
          <h3>{{ t.name }}</h3>
        </div>
        <p class="tpl-subject">{{ t.subject }}</p>
        <p class="tpl-time">{{ t.created_at }}</p>
        <div class="tpl-actions">
          <button class="btn-ghost" @click="preview(t)">预览</button>
          <button class="btn-ghost" @click="openDialog(t)">编辑</button>
          <button class="btn-ghost danger" @click="handleDelete(t.id)">删除</button>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑模板' : '添加模板'" width="700px">
      <!-- Preset selector -->
      <div v-if="!isEdit" class="preset-section">
        <label class="section-label">从预设模板开始</label>
        <div class="preset-grid">
          <div v-for="(p, i) in presets" :key="i" class="preset-item"
            :class="{ selected: selectedPreset === i }" @click="applyPreset(i)">
            <span class="preset-thumb">{{ p.thumbnail }}</span>
            <span class="preset-name">{{ p.name }}</span>
          </div>
          <div class="preset-item" :class="{ selected: selectedPreset === -1 }" @click="clearPreset()">
            <span class="preset-thumb">✏️</span>
            <span class="preset-name">自定义</span>
          </div>
        </div>
      </div>

      <div class="dialog-form">
        <div class="field"><label>模板名称</label><input v-model="form.name" /></div>
        <div class="field"><label>邮件主题</label><input v-model="form.subject" /></div>
        <div class="field">
          <label>邮件内容 <span class="hint">支持 HTML 格式</span></label>
          <textarea v-model="form.body" rows="12"></textarea>
        </div>
        <div v-if="form.body" class="live-preview">
          <label class="section-label">实时预览</label>
          <div class="preview-frame" v-html="form.body"></div>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="dialogVisible = false">取消</button>
        <button class="btn-dark" @click="handleSave">保存</button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" title="模板预览" width="660px">
      <div class="preview-subject">{{ previewData.subject }}</div>
      <div class="preview-body" v-html="previewData.body"></div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { presetTemplates } from '@/utils/presetTemplates'

const templates = ref([])
const dialogVisible = ref(false)
const previewVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const form = ref({ name: '', subject: '', body: '' })
const previewData = ref({ subject: '', body: '' })
const presets = presetTemplates
const selectedPreset = ref(-1)

async function loadTemplates() {
  const { data } = await request.get('/templates')
  templates.value = data
}
function applyPreset(i) {
  selectedPreset.value = i
  const p = presets[i]
  form.value = { name: p.name, subject: p.subject, body: p.body }
}
function clearPreset() {
  selectedPreset.value = -1
  form.value = { name: '', subject: '', body: '' }
}
function openDialog(row) {
  selectedPreset.value = -1
  if (row) {
    isEdit.value = true; editId.value = row.id
    form.value = { name: row.name, subject: row.subject, body: row.body }
  } else {
    isEdit.value = false; editId.value = null
    form.value = { name: '', subject: '', body: '' }
  }
  dialogVisible.value = true
}
function preview(row) {
  previewData.value = { subject: row.subject, body: row.body }
  previewVisible.value = true
}
async function handleSave() {
  if (isEdit.value) {
    await request.put(`/templates/${editId.value}`, form.value)
    ElMessage.success('更新成功')
  } else {
    await request.post('/templates', form.value)
    ElMessage.success('添加成功')
  }
  dialogVisible.value = false; loadTemplates()
}
async function handleDelete(id) {
  await ElMessageBox.confirm('确定删除该模板？', '提示', { type: 'warning' })
  await request.delete(`/templates/${id}`)
  ElMessage.success('删除成功'); loadTemplates()
}
onMounted(loadTemplates)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
.page-title { font-size: 24px; font-weight: 600; color: var(--text); letter-spacing: -0.5px; }
.page-desc { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
.btn-dark {
  padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.15s; white-space: nowrap;
}
.btn-dark:hover { background: var(--primary-light); }
.btn-ghost {
  padding: 6px 14px; background: transparent; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
}
.btn-ghost:hover { border-color: var(--primary); color: var(--primary); }
.btn-ghost.danger:hover { border-color: var(--accent); color: var(--accent); }
.empty-state { text-align: center; padding: 80px 0; color: var(--text-secondary); font-size: 15px; }
.tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.tpl-card {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 20px; transition: box-shadow 0.2s;
}
.tpl-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.tpl-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.tpl-icon { font-size: 20px; }
.tpl-top h3 { font-size: 15px; font-weight: 600; color: var(--text); }
.tpl-subject { font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.tpl-time { font-size: 12px; color: #aaa; margin-bottom: 14px; }
.tpl-actions { display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 12px; }
.preset-section { margin-bottom: 20px; }
.section-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 10px; }
.preset-grid { display: flex; gap: 10px; flex-wrap: wrap; }
.preset-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 18px; border: 2px solid var(--border); border-radius: 10px;
  cursor: pointer; transition: all 0.15s; min-width: 90px;
}
.preset-item:hover { border-color: #999; }
.preset-item.selected { border-color: var(--primary); background: #f5f5f3; }
.preset-thumb { font-size: 24px; }
.preset-name { font-size: 12px; color: var(--text); font-weight: 500; }
.hint { font-size: 11px; color: #aaa; margin-left: 4px; }
.live-preview { margin-top: 16px; }
.preview-frame {
  border: 1px solid var(--border); border-radius: 8px; padding: 20px;
  background: #fff; max-height: 300px; overflow-y: auto; margin-top: 8px;
}
.preview-subject { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 16px; }
.preview-body { border: 1px solid var(--border); border-radius: 8px; padding: 20px; background: #faf9f7; }
.dialog-form .field { margin-bottom: 16px; }
.dialog-form label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
.dialog-form input, .dialog-form textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  font-size: 14px; outline: none; background: #faf9f7; transition: border-color 0.2s; font-family: inherit;
}
.dialog-form input:focus, .dialog-form textarea:focus { border-color: var(--primary); }
</style>
