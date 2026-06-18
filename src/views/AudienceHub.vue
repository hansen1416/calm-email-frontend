<template>
  <div class="audience-page">
    <!-- 左侧面板 -->
    <aside class="audience-sidebar">
      <div class="sidebar-tabs">
        <button :class="['tab-btn', { active: activeTab === 'contacts' }]" @click="activeTab = 'contacts'">
          👤 {{ $t('audience.contacts') }}
        </button>
        <button :class="['tab-btn', { active: activeTab === 'groups' }]" @click="activeTab = 'groups'">
          👥 {{ $t('audience.groups') }}
        </button>
        <button :class="['tab-btn', { active: activeTab === 'segments' }]" @click="activeTab = 'segments'">
          🎯 {{ $t('audience.segments') }}
        </button>
      </div>

      <div class="sidebar-body">
        <div v-if="activeTab === 'contacts'" class="sidebar-section">
          <div class="sidebar-search">
            <input v-model="contactKeyword" :placeholder="$t('audience.searchPlaceholder')" @input="loadContacts" />
          </div>
          <button class="btn-full" @click="openContactDialog()">{{ $t('audience.addContact') }}</button>
          <button class="btn-full outline" @click="showImport = true">{{ $t('audience.importCsv') }}</button>
        </div>

        <div v-if="activeTab === 'groups'" class="sidebar-section">
          <h4 class="section-title">{{ $t('audience.groupListTitle') }}</h4>
          <div v-for="g in groups" :key="g.id"
               :class="['list-item', { active: selectedGroup?.id === g.id }]"
               @click="selectGroup(g)" @dblclick="openGroupDialog(g)">
            <div class="list-item-info">
              <span class="list-item-name">{{ g.name }}</span>
              <span class="list-item-badge">{{ g.contact_count }}人</span>
            </div>
            <button class="btn-icon-mini" @click.stop="openGroupDialog(g)">⚙</button>
          </div>
          <button class="btn-full" @click="openGroupDialog()">{{ $t('audience.newGroup') }}</button>
        </div>

        <div v-if="activeTab === 'segments'" class="sidebar-section">
          <h4 class="section-title">{{ $t('audience.segmentListTitle') }}</h4>
          <div v-for="s in segments" :key="s.id"
               :class="['list-item', { active: selectedSegment?.id === s.id }]"
               @click="selectSegment(s)" @dblclick="editSegment(s)">
            <div class="list-item-info">
              <span class="list-item-name">{{ s.name }}</span>
              <span class="list-item-badge">{{ s.match_type === 'all' ? 'AND' : 'OR' }}</span>
            </div>
            <button class="btn-icon-mini" @click.stop="editSegment(s)">⚙</button>
          </div>
          <button class="btn-full" @click="newSegment()">{{ $t('audience.newSegment') }}</button>
        </div>
      </div>
    </aside>

    <!-- 右侧主内容区 -->
    <main class="audience-main">
      <template v-if="activeTab === 'contacts'">
        <div class="contacts-content">
          <div class="main-header">
          <h2>{{ $t('audience.contacts') }} ({{ contacts.length }})</h2>
          <div v-if="selectedIds.length" class="batch-bar">
            <span>{{ $t('audience.selectedCount', { n: selectedIds.length }) }}</span>
            <button class="btn-ghost danger" @click="batchDelete">🗑 {{ $t('audience.deleteSelected') }}</button>
          </div>
        </div>
        <div v-if="contacts.length" class="table-wrap">
          <div class="table-scroll">
        <vxe-table border resizable show-overflow
          :data="contacts"
          :edit-config="{ trigger: 'dblclick', mode: 'cell', showStatus: true }"
          :checkbox-config="{ checkField: 'checked' }"
          @checkbox-all="onSelectChange" @checkbox-change="onSelectChange"
          @edit-closed="onEditClosed" :loading="contactLoading" height="100%">
          <vxe-column type="checkbox" width="50" />
          <vxe-column field="name" :title="$t('audience.name')" :edit-render="{ name: 'input' }" min-width="90" />
          <vxe-column field="email" :title="$t('audience.email')" :edit-render="{ name: 'input' }" min-width="140" />
          <vxe-column field="phone" :title="$t('audience.phone')" :edit-render="{ name: 'input' }" min-width="90" />
          <vxe-column field="company" :title="$t('audience.company')" :edit-render="{ name: 'input' }" min-width="90" />
          <vxe-column field="notes" :title="$t('audience.notes')" :edit-render="{ name: 'input' }" min-width="130" />
          <vxe-column
            v-for="col in customColumns" :key="col.key"
            :field="col.key" :title="col.key"
            :edit-render="{ name: 'input' }" min-width="100" />
          <vxe-column :title="$t('audience.actions')" width="100" fixed="right">
            <template #default="{ row }">
              <button class="btn-ghost danger" @click="handleDelete(row.id)">{{ $t('audience.delete') }}</button>
            </template>
          </vxe-column>
        </vxe-table>
          </div>
        </div>
        <div v-else-if="!contactLoading" class="empty-state">{{ $t('audience.noContacts') }}</div>
        </div>
      </template>

      <template v-if="activeTab === 'groups' && selectedGroup">
        <div class="main-header">
          <div>
            <h2>{{ selectedGroup.name }}</h2>
            <p class="text-secondary" v-if="selectedGroup.description">{{ selectedGroup.description }}</p>
          </div>
          <button class="btn-dark" @click="groupMemberAddVisible = true">{{ $t('audience.addMember') }}</button>
        </div>
        <div v-if="!groupContacts.length" class="empty-state">{{ $t('audience.noMembers') }}</div>
        <vxe-table v-else border :data="groupContacts">
          <vxe-column field="name" :title="$t('audience.name')" min-width="120" />
          <vxe-column field="email" :title="$t('audience.email')" min-width="180" />
          <vxe-column field="phone" :title="$t('audience.phone')" min-width="120" />
          <vxe-column field="company" :title="$t('audience.company')" min-width="120" />
          <vxe-column :title="$t('audience.actions')" width="80">
            <template #default="{ row }">
              <button class="btn-ghost danger" @click="removeGroupMember(row.id)">{{ $t('audience.remove') }}</button>
            </template>
          </vxe-column>
        </vxe-table>
      </template>

      <template v-if="activeTab === 'segments' && selectedSegment">
        <div class="main-header">
          <div>
            <h2>{{ selectedSegment.name }}</h2>
            <p class="text-secondary" v-if="selectedSegment.description">{{ selectedSegment.description }}</p>
            <span class="match-tag">{{ selectedSegment.match_type === 'all' ? $t('audience.matchAll') : $t('audience.matchAny') }}</span>
          </div>
          <button class="btn-dark" @click="previewSegment">{{ $t('audience.previewMatch') }}</button>
        </div>
        <div v-if="segmentPreview" class="preview-bar">
          <span v-if="segmentPreview.count > 0">{{ $t('audience.matchedCount', { n: segmentPreview.count }) }}</span>
          <span v-else>{{ $t('audience.noMatch') }}</span>
          <span v-if="segmentPreview.sample?.length" class="text-secondary">
            （{{ segmentPreview.sample.map(c => c.name || c.email).join(', ') }}）
          </span>
        </div>
        <div v-if="!segmentContacts.length" class="empty-state">
          <p v-if="segmentPreview && segmentPreview.count === 0">{{ $t('audience.noMatchHint') }}</p>
          <p v-else>{{ $t('audience.previewHint') }}</p>
        </div>
        <vxe-table v-else border :data="segmentContacts">
          <vxe-column field="name" :title="$t('audience.name')" min-width="120" />
          <vxe-column field="email" :title="$t('audience.email')" min-width="180" />
          <vxe-column field="phone" :title="$t('audience.phone')" min-width="120" />
          <vxe-column field="company" :title="$t('audience.company')" min-width="120" />
          <vxe-column field="notes" :title="$t('audience.notes')" min-width="160" />
        </vxe-table>
      </template>

      <template v-if="activeTab === 'groups' && !selectedGroup">
        <div class="empty-state">{{ $t('audience.selectGroup') }}</div>
      </template>
      <template v-if="activeTab === 'segments' && !selectedSegment">
        <div class="empty-state">{{ $t('audience.selectSegment') }}</div>
      </template>
    </main>

    <!-- ====== 弹窗: 联系人 ====== -->
    <el-dialog v-model="contactDialogVisible" :title="isContactEdit ? $t('audience.editContactTitle') : $t('audience.addContactTitle')" width="460px">
      <div class="dialog-form">
        <div class="field"><label>{{ $t('audience.name') }}</label><input v-model="contactForm.name" /></div>
        <div class="field"><label>{{ $t('audience.email') }}</label><input v-model="contactForm.email" /></div>
        <div class="field"><label>{{ $t('audience.phone') }}</label><input v-model="contactForm.phone" /></div>
        <div class="field"><label>{{ $t('audience.company') }}</label><input v-model="contactForm.company" /></div>
        <div class="field"><label>{{ $t('audience.notes') }}</label><textarea v-model="contactForm.notes" rows="3"></textarea></div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="contactDialogVisible = false">{{ $t('audience.cancel') }}</button>
        <button class="btn-dark" @click="handleContactSave">{{ $t('audience.save') }}</button>
      </template>
    </el-dialog>

    <!-- ====== 弹窗: 群组 ====== -->
    <el-dialog v-model="groupDialogVisible" :title="isGroupEdit ? $t('audience.editGroup') : $t('audience.createGroup')" width="420px">
      <div class="dialog-form">
        <div class="field"><label>{{ $t('groups.groupName') }}</label><input v-model="groupForm.name" /></div>
        <div class="field"><label>{{ $t('groups.description') }}</label><textarea v-model="groupForm.description" rows="3"></textarea></div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="groupDialogVisible = false">{{ $t('audience.cancel') }}</button>
        <button class="btn-dark" @click="handleGroupSave">{{ $t('audience.save') }}</button>
      </template>
    </el-dialog>

    <!-- ====== 弹窗: 群组添加成员 ====== -->
    <el-dialog v-model="groupMemberAddVisible" :title="$t('audience.addMember')" width="560px">
      <div style="display:flex;gap:10px;margin-bottom:16px">
        <el-select v-model="selectedMemberIds" multiple :placeholder="$t('groups.selectContacts')" style="flex:1">
          <el-option v-for="c in allContacts" :key="c.id" :label="`${c.name} (${c.email})`" :value="c.id" />
        </el-select>
        <button class="btn-dark" @click="addGroupMembers">{{ $t('common.add') }}</button>
      </div>
    </el-dialog>

    <!-- ====== 弹窗: 分段 ====== -->
    <el-dialog v-model="segmentDialogVisible" :title="segmentEditId ? $t('audience.editSegment') : $t('audience.createSegment')" width="560px">
      <div class="dialog-form">
        <div class="field"><label>{{ $t('templates.templateName') }}</label><input v-model="segmentForm.name" /></div>
        <div class="field"><label>{{ $t('groups.description') }}</label><input v-model="segmentForm.description" /></div>
        <div class="field">
          <label>{{ $t('audience.matchMode') }}</label>
          <div class="radio-group">
            <label><input type="radio" v-model="segmentForm.match_type" value="all" /> {{ $t('audience.matchAll') }}</label>
            <label><input type="radio" v-model="segmentForm.match_type" value="any" /> {{ $t('audience.matchAny') }}</label>
          </div>
        </div>
        <div class="field">
          <label>{{ $t('audience.rules') }}</label>
          <div v-for="(r, i) in segmentForm.rules" :key="i" class="rule-row">
            <select v-model="r.field" class="rule-select">
              <option value="name">{{ $t('audience.name') }}</option>
              <option value="email">{{ $t('audience.email') }}</option>
              <option value="phone">{{ $t('audience.phone') }}</option>
              <option value="company">{{ $t('audience.company') }}</option>
              <option value="notes">{{ $t('audience.notes') }}</option>
            </select>
            <select v-model="r.operator" class="rule-select">
              <option v-for="(label, op) in operators" :key="op" :value="op">{{ label }}</option>
            </select>
            <input v-if="!['is_empty','is_not_empty'].includes(r.operator)" v-model="r.value" class="rule-input" :placeholder="$t('audience.ruleValuePlaceholder')" />
            <button class="btn-icon" @click="segmentForm.rules.splice(i, 1)">✕</button>
          </div>
          <button class="btn-link" @click="segmentForm.rules.push({field:'name',operator:'equals',value:''})">{{ $t('audience.addRule') }}</button>
        </div>
      </div>
      <template #footer>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button class="btn-ghost" @click="segmentDialogVisible = false">{{ $t('audience.cancel') }}</button>
          <button v-if="segmentForm.id" class="btn-ghost danger" @click="delSegment(segmentForm.id)">{{ $t('audience.delete') }}</button>
          <button class="btn-dark" @click="handleSegmentSave">{{ $t('audience.save') }}</button>
        </div>
      </template>
    </el-dialog>

    <CsvImportDialog v-model="showImport" @done="loadContacts" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import CsvImportDialog from '@/components/CsvImportDialog.vue'

const { t, tm } = useI18n()
const $t = t

const activeTab = ref('contacts')
const contacts = ref([])
const contactKeyword = ref('')
const contactLoading = ref(false)
const contactDialogVisible = ref(false)
const isContactEdit = ref(false)
const contactEditId = ref(null)
const contactForm = ref({ name: '', email: '', phone: '', company: '', notes: '' })
const selectedIds = ref([])
const showImport = ref(false)

const groups = ref([])
const selectedGroup = ref(null)
const groupContacts = ref([])
const groupDialogVisible = ref(false)
const isGroupEdit = ref(false)
const groupEditId = ref(null)
const groupForm = ref({ name: '', description: '' })
const groupMemberAddVisible = ref(false)
const selectedMemberIds = ref([])
const allContacts = ref([])

const segments = ref([])
const selectedSegment = ref(null)
const segmentContacts = ref([])
const segmentPreview = ref(null)
const segmentDialogVisible = ref(false)
const segmentEditId = ref(null)
const segmentForm = ref({ name: '', description: '', match_type: 'all', rules: [{ field: 'name', operator: 'equals', value: '' }] })

const operators = computed(() => tm('audience.operations') || { equals: '等于', not_equals: '不等于', contains: '包含', not_contains: '不包含', starts_with: '开头是', ends_with: '结尾是', is_empty: '为空', is_not_empty: '不为空' })

const customColumns = computed(() => {
  const keys = new Set()
  contacts.value.forEach(c => {
    if (c.custom_fields && typeof c.custom_fields === 'object') {
      Object.keys(c.custom_fields).forEach(k => keys.add(k))
    }
  })
  return [...keys].map(k => ({ key: k }))
})
// --- contacts ---
async function loadContacts() {
  contactLoading.value = true
  try {
    const { data } = await request.get('/contacts', { params: { keyword: contactKeyword.value } })
    contacts.value = data.map(d => ({ ...d, checked: false }))
  } finally { contactLoading.value = false }
}
function onSelectChange() { selectedIds.value = contacts.value.filter(c => c.checked).map(c => c.id) }

async function onEditClosed({ row, column }) {
  if (!row || !column) return
  if (!row.name || !row.email) { ElMessage.warning($t('audience.nameAndEmailRequired')); loadContacts(); return }
  try { await request.put(`/contacts/${row.id}`, { name: row.name, email: row.email, phone: row.phone, company: row.company, notes: row.notes }); ElMessage.success($t('audience.updated')) }
  catch { loadContacts() }
}
function openContactDialog(row) {
  if (row) { isContactEdit.value = true; contactEditId.value = row.id; contactForm.value = { name: row.name, email: row.email, phone: row.phone, company: row.company, notes: row.notes } }
  else { isContactEdit.value = false; contactEditId.value = null; contactForm.value = { name: '', email: '', phone: '', company: '', notes: '' } }
  contactDialogVisible.value = true
}
async function handleContactSave() {
  if (isContactEdit.value) { await request.put(`/contacts/${contactEditId.value}`, contactForm.value); ElMessage.success($t('audience.updated')) }
  else { await request.post('/contacts', contactForm.value); ElMessage.success($t('audience.added')) }
  contactDialogVisible.value = false; loadContacts()
}
async function handleDelete(id) { await ElMessageBox.confirm($t('audience.deleteConfirm'), $t('common.warning'), { type: 'warning' }); await request.delete(`/contacts/${id}`); ElMessage.success($t('audience.deleted')); loadContacts() }
async function batchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 个联系人？`, $t('common.warning'), { type: 'warning' })
  for (const id of selectedIds.value) { await request.delete(`/contacts/${id}`) }
  ElMessage.success($t('audience.deleted')); loadContacts()
}

// --- groups ---
async function loadGroups() { const { data } = await request.get('/groups'); groups.value = data }
function selectGroup(g) { selectedGroup.value = g; selectedSegment.value = null; groupContacts.value = g.contacts || []; request.get(`/groups/${g.id}/members`).then(({ data }) => { groupContacts.value = data.contacts || [] }).catch(() => { groupContacts.value = [] }) }
function openGroupDialog(row) {
  if (row) { isGroupEdit.value = true; groupEditId.value = row.id; groupForm.value = { name: row.name, description: row.description || '' } }
  else { isGroupEdit.value = false; groupEditId.value = null; groupForm.value = { name: '', description: '' } }
  groupDialogVisible.value = true
}
async function handleGroupSave() {
  if (isGroupEdit.value) { await request.put(`/groups/${groupEditId.value}`, groupForm.value); ElMessage.success($t('audience.updated')) }
  else { await request.post('/groups', groupForm.value); ElMessage.success($t('audience.created')) }
  groupDialogVisible.value = false; loadGroups()
}
async function addGroupMembers() { if (!selectedMemberIds.value.length || !selectedGroup.value) return; await request.post(`/groups/${selectedGroup.value.id}/members`, { contact_ids: selectedMemberIds.value }); ElMessage.success($t('audience.added')); selectedMemberIds.value = []; groupMemberAddVisible.value = false; selectGroup(selectedGroup.value); loadGroups() }
async function removeGroupMember(cid) { if (!selectedGroup.value) return; await request.delete(`/groups/${selectedGroup.value.id}/members`, { data: { contact_ids: [cid] } }); ElMessage.success($t('audience.removed')); selectGroup(selectedGroup.value); loadGroups() }

// --- segments ---
async function loadSegments() { const { data } = await request.get('/segments'); segments.value = data }
function selectSegment(s) { selectedSegment.value = s; selectedGroup.value = null; segmentContacts.value = []; segmentPreview.value = null }
function newSegment() { segmentEditId.value = null; segmentForm.value = { name: '', description: '', match_type: 'all', rules: [{ field: 'name', operator: 'equals', value: '' }] }; segmentDialogVisible.value = true }
function editSegment(s) { segmentEditId.value = s.id; segmentForm.value = { id: s.id, name: s.name, description: s.description || '', match_type: s.match_type, rules: s.rules ? [...s.rules] : [] }; segmentDialogVisible.value = true }
async function handleSegmentSave() {
  const payload = { name: segmentForm.value.name, description: segmentForm.value.description, match_type: segmentForm.value.match_type, rules: segmentForm.value.rules }
  if (!payload.name || !payload.rules?.length) { ElMessage.warning('名称和规则不能为空'); return }
  if (segmentForm.value.id) { await request.put(`/segments/${segmentForm.value.id}`, payload); ElMessage.success($t('audience.updated')) }
  else { await request.post('/segments', payload); ElMessage.success($t('audience.created')) }
  segmentDialogVisible.value = false; loadSegments()
}
async function delSegment(id) { await ElMessageBox.confirm($t('audience.deleteConfirm'), $t('common.warning'), { type: 'warning' }); await request.delete(`/segments/${id}`); ElMessage.success($t('audience.deleted')); if (selectedSegment.value?.id === id) selectedSegment.value = null; loadSegments() }
async function previewSegment() { if (!selectedSegment.value) return; const { data } = await request.post(`/segments/${selectedSegment.value.id}/preview`); segmentPreview.value = data; segmentContacts.value = data.sample || [] }

onMounted(() => { loadContacts(); loadGroups(); loadSegments() })
</script>

<style scoped>
.audience-page { display: flex; height: calc(100vh - 80px); overflow: hidden; }
.audience-sidebar { width: 240px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; background: var(--card-bg); }
.sidebar-tabs { display: flex; border-bottom: 1px solid var(--border); }
.tab-btn { flex: 1; padding: 12px 8px; border: none; background: none; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text-secondary); border-bottom: 2px solid transparent; transition: all 0.15s; }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); background: #f5f5f3; }
.sidebar-body { flex: 1; overflow-y: auto; padding: 12px; }
.sidebar-search { margin-bottom: 10px; }
.sidebar-search input { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; outline: none; background: #faf9f7; }
.section-title { font-size: 12px; color: var(--text-secondary); font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; }
.list-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; margin-bottom: 2px; }
.list-item:hover { background: #f5f5f3; }
.list-item.active { background: #7f4a89; color: #fff; }
.list-item.active .list-item-badge { background: rgba(255,255,255,0.2); color: #fff; }
.list-item.active .btn-icon-mini { color: #fff; }
.list-item-info { display: flex; flex-direction: column; gap: 2px; }
.list-item-name { font-size: 14px; font-weight: 500; }
.list-item-badge { font-size: 11px; padding: 1px 6px; border-radius: 10px; background: #f3f2ef; color: var(--text-secondary); width: fit-content; }
.btn-icon-mini { background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px 4px; color: var(--text-secondary); }
.btn-full { width: 100%; margin-top: 8px; padding: 8px 0; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500; }
.btn-full.outline { background: transparent; border: 1px solid var(--primary); color: var(--primary); margin-top: 6px; }
.btn-full:hover { opacity: 0.9; }
.audience-main { flex: 1; overflow: hidden; padding: 24px; display: flex; flex-direction: column; }

.contacts-content { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

.table-wrap { flex: 1; min-height: 0; position: relative; }
.table-scroll { position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; }
.main-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.main-header h2 { font-size: 20px; font-weight: 600; color: var(--text); margin: 0; }
.batch-bar { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); }
  .match-tag { display: inline-block; font-size: 12px; padding: 2px 10px; border-radius: 12px; background: #7f4a89; color: #fff; margin-top: 6px; }
.preview-bar { padding: 10px 16px; background: #f0f7ff; border-radius: 8px; margin-bottom: 16px; font-size: 14px; font-weight: 500; color: var(--primary); }
.text-secondary { font-size: 13px; color: var(--text-secondary); margin: 4px 0; }
.dialog-form .field { margin-bottom: 16px; }
.dialog-form label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
.dialog-form input, .dialog-form textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; outline: none; background: #faf9f7; }
.radio-group { display: flex; gap: 20px; flex-wrap: nowrap; }
.radio-group label { display: flex; align-items: center; gap: 6px; font-weight: 400; font-size: 14px; cursor: pointer; white-space: nowrap; }
.rule-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.rule-select { padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; }
.rule-input { padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; width: 150px; outline: none; }
.btn-dark { padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.btn-ghost { padding: 6px 14px; background: transparent; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
.btn-ghost.danger:hover { border-color: var(--accent); color: var(--accent); }
.btn-link { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 13px; padding: 0; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px 4px; color: var(--text-secondary); }
.empty-state { text-align: center; padding: 80px 0; color: var(--text-secondary); font-size: 15px; }
</style>