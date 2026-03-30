<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">联系人</h1>
        <p class="page-desc">管理你的所有联系人信息</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model="keyword" placeholder="搜索联系人..." @input="loadContacts" />
        </div>
        <button class="btn-dark" @click="openDialog()">+ 添加联系人</button>
      </div>
    </div>

    <div v-if="!contacts.length" class="empty-state">
      <p>还没有联系人，点击上方按钮添加</p>
    </div>

    <div v-else class="card-grid">
      <div v-for="c in contacts" :key="c.id" class="contact-card">
        <div class="card-top">
          <div class="avatar">{{ c.name.charAt(0) }}</div>
          <div class="card-info">
            <h3>{{ c.name }}</h3>
            <p>{{ c.email }}</p>
          </div>
        </div>
        <div class="card-details">
          <span v-if="c.phone">📞 {{ c.phone }}</span>
          <span v-if="c.company">🏢 {{ c.company }}</span>
        </div>
        <div class="card-actions">
          <button class="btn-ghost" @click="openDialog(c)">编辑</button>
          <button class="btn-ghost danger" @click="handleDelete(c.id)">删除</button>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑联系人' : '添加联系人'" width="460px">
      <div class="dialog-form">
        <div class="field"><label>姓名</label><input v-model="form.name" /></div>
        <div class="field"><label>邮箱</label><input v-model="form.email" /></div>
        <div class="field"><label>电话</label><input v-model="form.phone" /></div>
        <div class="field"><label>公司</label><input v-model="form.company" /></div>
        <div class="field"><label>备注</label><textarea v-model="form.notes" rows="3"></textarea></div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="dialogVisible = false">取消</button>
        <button class="btn-dark" @click="handleSave">保存</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const contacts = ref([])
const keyword = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const form = ref({ name: '', email: '', phone: '', company: '', notes: '' })

async function loadContacts() {
  const { data } = await request.get('/contacts', { params: { keyword: keyword.value } })
  contacts.value = data
}

function openDialog(row) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    form.value = { name: row.name, email: row.email, phone: row.phone, company: row.company, notes: row.notes }
  } else {
    isEdit.value = false
    editId.value = null
    form.value = { name: '', email: '', phone: '', company: '', notes: '' }
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (isEdit.value) {
    await request.put(`/contacts/${editId.value}`, form.value)
    ElMessage.success('更新成功')
  } else {
    await request.post('/contacts', form.value)
    ElMessage.success('添加成功')
  }
  dialogVisible.value = false
  loadContacts()
}

async function handleDelete(id) {
  await ElMessageBox.confirm('确定删除该联系人？', '提示', { type: 'warning' })
  await request.delete(`/contacts/${id}`)
  ElMessage.success('删除成功')
  loadContacts()
}

onMounted(loadContacts)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
.page-title { font-size: 24px; font-weight: 600; color: var(--text); letter-spacing: -0.5px; }
.page-desc { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 8px 14px;
}
.search-box input { border: none; outline: none; font-size: 14px; background: transparent; width: 180px; }
.search-icon { font-size: 14px; }
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
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.contact-card {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 20px; transition: box-shadow 0.2s;
}
.contact-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.card-top { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
.avatar {
  width: 42px; height: 42px; border-radius: 50%; background: #1a1a1a; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; flex-shrink: 0;
}
.card-info h3 { font-size: 15px; font-weight: 600; color: var(--text); }
.card-info p { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
.card-details { display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; }
.card-actions { display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 12px; }
.dialog-form .field { margin-bottom: 16px; }
.dialog-form label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
.dialog-form input, .dialog-form textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  font-size: 14px; outline: none; background: #faf9f7; transition: border-color 0.2s;
}
.dialog-form input:focus, .dialog-form textarea:focus { border-color: var(--primary); }
</style>
