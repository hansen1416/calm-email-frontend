<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">动态分段</h1>
        <p class="page-desc">基于规则自动筛选联系人分组</p>
      </div>
      <button class="btn-dark" @click="newSegment">+ 新建分段</button>
    </div>

    <div class="segment-layout" v-if="segments.length || editing">
      <div class="segment-list">
        <h3 class="list-title">分段列表</h3>
        <div v-for="s in segments" :key="s.id"
             :class="['seg-item', { active: editing?.id === s.id }]"
             @click="editSegment(s)">
          <span class="seg-name">{{ s.name }}</span>
          <div class="seg-actions">
            <button class="btn-icon" @click.stop="delSegment(s.id)">🗑</button>
          </div>
        </div>
      </div>

      <div class="segment-editor" v-if="editing">
        <div class="field">
          <label>分段名称</label>
          <input v-model="editing.name" class="input" />
        </div>
        <div class="field">
          <label>描述</label>
          <input v-model="editing.description" class="input" />
        </div>
        <div class="field">
          <label>匹配模式</label>
          <div class="radio-group">
            <label><input type="radio" v-model="editing.match_type" value="all" /> 全部满足 (AND)</label>
            <label><input type="radio" v-model="editing.match_type" value="any" /> 任意满足 (OR)</label>
          </div>
        </div>

        <div class="rules-section">
          <label>规则</label>
          <div v-for="(r, i) in editing.rules" :key="i" class="rule-row">
            <select v-model="r.field" class="rule-select">
              <option value="name">姓名</option>
              <option value="email">邮箱</option>
              <option value="phone">电话</option>
              <option value="company">公司</option>
              <option value="notes">备注</option>
            </select>
            <select v-model="r.operator" class="rule-select">
              <option v-for="(label, op) in operators" :key="op" :value="op">{{ label }}</option>
            </select>
            <input v-if="!['is_empty','is_not_empty'].includes(r.operator)"
                   v-model="r.value" class="rule-input" placeholder="值" />
            <button class="btn-icon" @click="editing.rules.splice(i, 1)">✕</button>
          </div>
          <button class="btn-link" @click="editing.rules.push({field:'name',operator:'equals',value:''})">+ 添加规则</button>
        </div>

        <div class="editor-footer">
          <button class="btn-ghost" @click="previewSegment">{{ previewCount !== null ? `匹配: ${previewCount} 人` : '预览匹配' }}</button>
          <button class="btn-dark" @click="saveSegment">保存</button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>还没有分段，点击"新建分段"创建第一个</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const segments = ref([])
const editing = ref(null)
const previewCount = ref(null)

const operators = {
  equals: '等于', not_equals: '不等于', contains: '包含', not_contains: '不包含',
  starts_with: '开头是', ends_with: '结尾是', is_empty: '为空', is_not_empty: '不为空'
}

async function loadSegments() {
  const { data } = await request.get('/segments')
  segments.value = data
}

function newSegment() {
  editing.value = { name: '', description: '', match_type: 'all', rules: [{ field: 'name', operator: 'contains', value: '' }] }
  previewCount.value = null
}

function editSegment(s) {
  editing.value = { ...s, rules: s.rules ? [...s.rules] : [] }
  previewCount.value = null
}

async function saveSegment() {
  const e = editing.value
  if (!e.name || !e.rules?.length) {
    ElMessage.warning('名称和规则不能为空'); return
  }
  const payload = { name: e.name, description: e.description, match_type: e.match_type, rules: e.rules }
  if (e.id) {
    await request.put(`/segments/${e.id}`, payload)
    ElMessage.success('保存成功')
  } else {
    await request.post('/segments', payload)
    ElMessage.success('创建成功')
  }
  editing.value = null
  loadSegments()
}

async function delSegment(id) {
  await ElMessageBox.confirm('确定删除该分段？', '警告', { type: 'warning' })
  await request.delete(`/segments/${id}`)
  ElMessage.success('删除成功')
  if (editing.value?.id === id) editing.value = null
  loadSegments()
}

async function previewSegment() {
  if (!editing.value?.id) {
    ElMessage.warning('请先保存分段'); return
  }
  const { data } = await request.post(`/segments/${editing.value.id}/preview`)
  previewCount.value = data.count
}

onMounted(loadSegments)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
.page-title { font-size: 24px; font-weight: 600; }
.page-desc { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
.segment-layout { display: flex; gap: 24px; }
.segment-list { width: 220px; flex-shrink: 0; }
.list-title { font-size: 13px; color: var(--text-secondary); font-weight: 500; margin-bottom: 12px; }
.seg-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; }
.seg-item:hover { background: #f5f5f3; }
.seg-item.active { background: var(--primary); color: #fff; }
.seg-item.active .btn-icon { color: #fff; }
.seg-name { font-size: 14px; font-weight: 500; }
.seg-actions { display: flex; gap: 4px; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px 4px; }
.segment-editor { flex: 1; }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
.input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; outline: none; background: #faf9f7; }
.radio-group { display: flex; gap: 20px; }
.radio-group label { display: flex; align-items: center; gap: 6px; font-weight: 400; font-size: 14px; cursor: pointer; }
.rules-section { margin-top: 20px; }
.rule-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.rule-select { padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; }
.rule-input { padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; width: 150px; outline: none; }
.btn-link { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 13px; padding: 0; }
.editor-footer { display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end; }
.btn-dark {
  padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 500; cursor: pointer;
}
.btn-ghost {
  padding: 8px 16px; background: transparent; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; cursor: pointer;
}
.empty-state { text-align: center; padding: 80px 0; color: var(--text-secondary); font-size: 15px; }
</style>