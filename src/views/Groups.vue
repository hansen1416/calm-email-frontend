<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户组</h1>
        <p class="page-desc">将联系人分组管理，方便批量发送邮件</p>
      </div>
      <button class="btn-dark" @click="openDialog()">+ 添加用户组</button>
    </div>

    <div v-if="!groups.length" class="empty-state">
      <p>还没有用户组，点击上方按钮创建</p>
    </div>

    <div v-else class="group-list">
      <div v-for="g in groups" :key="g.id" class="group-card">
        <div class="group-top">
          <div>
            <h3>{{ g.name }}</h3>
            <p class="group-desc">{{ g.description || '暂无描述' }}</p>
          </div>
          <span class="member-badge">{{ g.contact_count }} 人</span>
        </div>
        <div class="group-actions">
          <button class="btn-ghost" @click="openMembers(g)">管理成员</button>
          <button class="btn-ghost" @click="openDialog(g)">编辑</button>
          <button class="btn-ghost danger" @click="handleDelete(g.id)">删除</button>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户组' : '添加用户组'" width="420px">
      <div class="dialog-form">
        <div class="field"><label>组名</label><input v-model="form.name" /></div>
        <div class="field"><label>描述</label><textarea v-model="form.description" rows="3"></textarea></div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="dialogVisible = false">取消</button>
        <button class="btn-dark" @click="handleSave">保存</button>
      </template>
    </el-dialog>

    <el-dialog v-model="memberVisible" title="管理成员" width="560px">
      <div class="member-add">
        <el-select v-model="selectedContacts" multiple placeholder="选择联系人" style="flex:1">
          <el-option v-for="c in allContacts" :key="c.id" :label="`${c.name} (${c.email})`" :value="c.id" />
        </el-select>
        <button class="btn-dark" style="margin-left:10px" @click="addMembers">添加</button>
      </div>
      <div class="member-list">
        <div v-for="c in (currentGroup?.contacts || [])" :key="c.id" class="member-item">
          <div class="member-info">
            <div class="avatar-sm">{{ c.name.charAt(0) }}</div>
            <div><div class="member-name">{{ c.name }}</div><div class="member-email">{{ c.email }}</div></div>
          </div>
          <button class="btn-ghost danger" @click="removeMember(c.id)">移除</button>
        </div>
        <div v-if="!(currentGroup?.contacts || []).length" class="empty-members">暂无成员</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const groups = ref([])
const dialogVisible = ref(false)
const memberVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const form = ref({ name: '', description: '' })
const currentGroup = ref(null)
const allContacts = ref([])
const selectedContacts = ref([])

async function loadGroups() {
  const { data } = await request.get('/groups')
  groups.value = data
}
async function loadContacts() {
  const { data } = await request.get('/contacts')
  allContacts.value = data
}
function openDialog(row) {
  if (row) {
    isEdit.value = true; editId.value = row.id
    form.value = { name: row.name, description: row.description }
  } else {
    isEdit.value = false; editId.value = null
    form.value = { name: '', description: '' }
  }
  dialogVisible.value = true
}
async function handleSave() {
  if (isEdit.value) {
    await request.put(`/groups/${editId.value}`, form.value)
    ElMessage.success('更新成功')
  } else {
    await request.post('/groups', form.value)
    ElMessage.success('添加成功')
  }
  dialogVisible.value = false; loadGroups()
}
async function handleDelete(id) {
  await ElMessageBox.confirm('确定删除该用户组？', '提示', { type: 'warning' })
  await request.delete(`/groups/${id}`)
  ElMessage.success('删除成功'); loadGroups()
}
async function openMembers(row) {
  currentGroup.value = row; selectedContacts.value = []
  await loadContacts(); memberVisible.value = true
}
async function addMembers() {
  if (!selectedContacts.value.length) return
  await request.post(`/groups/${currentGroup.value.id}/members`, { contact_ids: selectedContacts.value })
  ElMessage.success('添加成功'); selectedContacts.value = []
  await loadGroups()
  currentGroup.value = groups.value.find(g => g.id === currentGroup.value.id)
}
async function removeMember(cid) {
  await request.delete(`/groups/${currentGroup.value.id}/members`, { data: { contact_ids: [cid] } })
  ElMessage.success('移除成功'); await loadGroups()
  currentGroup.value = groups.value.find(g => g.id === currentGroup.value.id)
}
onMounted(loadGroups)
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
.group-list { display: flex; flex-direction: column; gap: 12px; }
.group-card {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 20px; transition: box-shadow 0.2s;
}
.group-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.group-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.group-top h3 { font-size: 16px; font-weight: 600; color: var(--text); }
.group-desc { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.member-badge {
  background: #f3f2ef; padding: 4px 12px; border-radius: 20px; font-size: 13px;
  color: var(--text-secondary); font-weight: 500; white-space: nowrap;
}
.group-actions { display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 14px; }
.member-add { display: flex; align-items: center; margin-bottom: 16px; }
.member-list { max-height: 320px; overflow-y: auto; }
.member-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid var(--border);
}
.member-info { display: flex; align-items: center; gap: 12px; }
.avatar-sm {
  width: 34px; height: 34px; border-radius: 50%; background: #1a1a1a; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600;
}
.member-name { font-size: 14px; font-weight: 500; color: var(--text); }
.member-email { font-size: 12px; color: var(--text-secondary); }
.empty-members { text-align: center; padding: 32px 0; color: var(--text-secondary); font-size: 14px; }
.dialog-form .field { margin-bottom: 16px; }
.dialog-form label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
.dialog-form input, .dialog-form textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  font-size: 14px; outline: none; background: #faf9f7; transition: border-color 0.2s;
}
.dialog-form input:focus, .dialog-form textarea:focus { border-color: var(--primary); }
</style>
