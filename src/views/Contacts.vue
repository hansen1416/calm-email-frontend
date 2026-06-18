<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('contacts.title') }}</h1>
        <p class="page-desc">{{ $t('contacts.description') }}</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model="keyword" :placeholder="$t('contacts.searchPlaceholder')" @input="loadContacts" />
        </div>
        <button class="btn-dark" @click="openDialog()">{{ $t('contacts.addContact') }}</button>
        <button class="btn-outline" @click="showImport = true">📥 导入</button>
        <button v-if="selectedIds.length" class="btn-outline danger" @click="batchDelete">🗑 删除选中 ({{ selectedIds.length }})</button>
      </div>
    </div>

    <div v-if="!contacts.length && !keyword" class="empty-state">
      <p>{{ $t('contacts.emptyState') }}</p>
    </div>

    <vxe-table
      v-else
      border
      resizable
      show-overflow
      :data="contacts"
      :edit-config="{ trigger: 'dblclick', mode: 'cell', showStatus: true }"
      :checkbox-config="{ checkField: 'checked' }"
      @checkbox-all="onSelectChange"
      @checkbox-change="onSelectChange"
      @edit-closed="onEditClosed"
      :loading="loading"
      height="auto"
    >
      <vxe-column type="checkbox" width="50" />
      <vxe-column field="name" title="姓名" :edit-render="{ name: 'input' }" min-width="120" />
      <vxe-column field="email" title="邮箱" :edit-render="{ name: 'input' }" min-width="180" />
      <vxe-column field="phone" title="电话" :edit-render="{ name: 'input' }" min-width="120" />
      <vxe-column field="company" title="公司" :edit-render="{ name: 'input' }" min-width="120" />
      <vxe-column field="notes" title="备注" :edit-render="{ name: 'input' }" min-width="160" />
      <vxe-column title="操作" width="100" fixed="right">
        <template #default="{ row }">
          <button class="btn-ghost danger" @click="handleDelete(row.id)">{{ $t('common.delete') }}</button>
        </template>
      </vxe-column>
    </vxe-table>

    <!-- Add Dialog (kept) -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? $t('contacts.editContact') : $t('contacts.addContact').replace('+ ', '')" width="460px">
      <div class="dialog-form">
        <div class="field"><label>{{ $t('contacts.name') }}</label><input v-model="form.name" /></div>
        <div class="field"><label>{{ $t('common.email') }}</label><input v-model="form.email" /></div>
        <div class="field"><label>{{ $t('contacts.phone') }}</label><input v-model="form.phone" /></div>
        <div class="field"><label>{{ $t('contacts.company') }}</label><input v-model="form.company" /></div>
        <div class="field"><label>{{ $t('contacts.notes') }}</label><textarea v-model="form.notes" rows="3"></textarea></div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="dialogVisible = false">{{ $t('common.cancel') }}</button>
        <button class="btn-dark" @click="handleSave">{{ $t('common.save') }}</button>
      </template>
    </el-dialog>

    <CsvImportDialog v-model="showImport" @done="loadContacts" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import CsvImportDialog from '@/components/CsvImportDialog.vue'

const { t } = useI18n()
const $t = t
const contacts = ref([])
const keyword = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const form = ref({ name: '', email: '', phone: '', company: '', notes: '' })
const showImport = ref(false)
const selectedIds = ref([])
const loading = ref(false)

async function loadContacts() {
  loading.value = true
  try {
    const { data } = await request.get('/contacts', { params: { keyword: keyword.value } })
    contacts.value = data.map(d => ({ ...d, checked: false }))
  } finally { loading.value = false }
}

function onSelectChange() {
  selectedIds.value = contacts.value.filter(c => c.checked).map(c => c.id)
}

async function onEditClosed({ row, column }) {
  if (!row || !column) return
  if (!row.name || !row.email) {
    ElMessage.warning('姓名和邮箱不能为空')
    loadContacts()
    return
  }
  try {
    await request.put(`/contacts/${row.id}`, {
      name: row.name, email: row.email, phone: row.phone,
      company: row.company, notes: row.notes
    })
    ElMessage.success($t('common.updateSuccess') || 'Updated')
  } catch { loadContacts() }
}

function openDialog(row) {
  if (row) {
    isEdit.value = true; editId.value = row.id
    form.value = { name: row.name, email: row.email, phone: row.phone, company: row.company, notes: row.notes }
  } else {
    isEdit.value = false; editId.value = null
    form.value = { name: '', email: '', phone: '', company: '', notes: '' }
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (isEdit.value) {
    await request.put(`/contacts/${editId.value}`, form.value)
    ElMessage.success(t('common.updateSuccess') || 'Updated')
  } else {
    await request.post('/contacts', form.value)
    ElMessage.success(t('common.add') + ' ' + t('common.success') || 'Added')
  }
  dialogVisible.value = false
  loadContacts()
}

async function handleDelete(id) {
  await ElMessageBox.confirm(t('contacts.deleteConfirm'), t('common.warning'), { type: 'warning' })
  await request.delete(`/contacts/${id}`)
  ElMessage.success(t('common.delete') + ' ' + t('common.success'))
  loadContacts()
}

async function batchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 个联系人？`, '警告', { type: 'warning' })
  for (const id of selectedIds.value) {
    await request.delete(`/contacts/${id}`)
  }
  ElMessage.success('删除成功')
  loadContacts()
}

onMounted(loadContacts)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
.page-title { font-size: 24px; font-weight: 600; color: var(--text); }
.page-desc { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 8px 14px;
}
.search-box input { border: none; outline: none; font-size: 14px; background: transparent; width: 180px; }
.btn-dark {
  padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap;
}
.btn-outline {
  padding: 10px 20px; background: transparent; color: var(--primary); border: 1px solid var(--primary); border-radius: 8px;
  font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap;
}
.btn-outline:hover { background: var(--primary); color: #fff; }
.btn-outline.danger { color: var(--accent); border-color: var(--accent); }
.btn-outline.danger:hover { background: var(--accent); color: #fff; }
.btn-ghost {
  padding: 6px 14px; background: transparent; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; color: var(--text-secondary); cursor: pointer;
}
.btn-ghost.danger:hover { border-color: var(--accent); color: var(--accent); }
.empty-state { text-align: center; padding: 80px 0; color: var(--text-secondary); font-size: 15px; }
.dialog-form .field { margin-bottom: 16px; }
.dialog-form label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
.dialog-form input, .dialog-form textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  font-size: 14px; outline: none; background: #faf9f7;
}
</style>