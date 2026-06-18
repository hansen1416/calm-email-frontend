<template>
  <el-dialog v-model="visible" title="导入联系人" width="700px" @close="reset">
    <div class="import-steps">
      <div class="step-indicator">
        <span v-for="(s, i) in steps" :key="i"
              :class="['step-dot', { active: step === i, done: step > i }]">
          {{ step > i ? '✓' : i + 1 }}
        </span>
        <span class="step-label">{{ steps[step] }}</span>
      </div>

      <!-- Step 0: File Upload -->
      <div v-if="step === 0" class="step-body">
        <div class="upload-zone" @dragover.prevent @drop.prevent="onDrop">
          <input ref="fileInput" type="file" accept=".csv" @change="onFileSelected" hidden />
          <p v-if="!csvFile" class="upload-hint" @click="$refs.fileInput.click()">
            📁 点击选择CSV文件，或拖拽到此处
          </p>
          <p v-else class="upload-info">
            📄 {{ csvFile.name }} ({{ (csvFile.size / 1024).toFixed(1) }} KB)
            <button class="btn-link" @click="csvFile = null; csvHeaders = []; csvRows = []">移除</button>
          </p>
        </div>
        <div class="step-actions">
          <button class="btn-dark" :disabled="!csvFile" @click="parseCsv">下一步</button>
        </div>
      </div>

      <!-- Step 1: Preview -->
      <div v-if="step === 1" class="step-body">
        <p class="step-desc">预览前5行数据</p>
        <table class="preview-table">
          <thead><tr><th v-for="h in csvHeaders" :key="h">{{ h }}</th></tr></thead>
          <tbody><tr v-for="(r, i) in csvRows" :key="i"><td v-for="h in csvHeaders" :key="h">{{ r[h] }}</td></tr></tbody>
        </table>
        <div class="step-actions">
          <button class="btn-ghost" @click="step = 0">上一步</button>
          <button class="btn-dark" @click="step = 2">下一步</button>
        </div>
      </div>

      <!-- Step 2: Field Mapping -->
      <div v-if="step === 2" class="step-body">
        <p class="step-desc">将CSV列映射到联系人字段</p>
        <div v-for="h in csvHeaders" :key="h" class="map-row">
          <span class="map-col">{{ h }}</span>
          <span class="map-arrow">→</span>
          <select v-model="mapping[h]" class="map-select">
            <option value="_skip">跳过</option>
            <option value="name">姓名</option>
            <option value="email">邮箱</option>
            <option value="phone">电话</option>
            <option value="company">公司</option>
            <option value="notes">备注</option>
            <option :value="'custom:' + h">自定义: {{ h }}</option>
          </select>
        </div>
        <div class="step-actions">
          <button class="btn-ghost" @click="step = 1">上一步</button>
          <button class="btn-dark" :disabled="!hasEmailMapping" @click="step = 3">下一步</button>
        </div>
      </div>

      <!-- Step 3: Dedup Strategy -->
      <div v-if="step === 3" class="step-body">
        <p class="step-desc">处理重复联系人（按邮箱判重）</p>
        <div class="dedup-options">
          <label v-for="opt in dedupOptions" :key="opt.value"
                 :class="['dedup-option', { selected: dedup === opt.value }]">
            <input type="radio" v-model="dedup" :value="opt.value" />
            <div><strong>{{ opt.label }}</strong><br/><small>{{ opt.desc }}</small></div>
          </label>
        </div>
        <div class="step-actions">
          <button class="btn-ghost" @click="step = 2">上一步</button>
          <button class="btn-dark" @click="step = 4">导入预览</button>
        </div>
      </div>

      <!-- Step 4: Review & Import -->
      <div v-if="step === 4" class="step-body">
        <div class="review-summary">
          <p>即将导入 <strong>{{ csvTotalRows }}</strong> 条记录</p>
          <p v-if="dedup === 'skip'">已存在相同邮箱的联系人将被跳过</p>
          <p v-if="dedup === 'update'">已存在相同邮箱的联系人将被更新</p>
          <p v-if="dedup === 'duplicate'">即使邮箱重复也新建联系人</p>
        </div>
        <div class="step-actions">
          <button class="btn-ghost" @click="step = 3">上一步</button>
          <button class="btn-dark" :disabled="importing" @click="doImport">
            {{ importing ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </div>

      <!-- Step 5: Result -->
      <div v-if="step === 5" class="step-body">
        <div class="import-result">
          <p>✅ 导入完成</p>
          <ul>
            <li>总计: {{ result.total }}</li>
            <li>新增: {{ result.imported }}</li>
            <li>跳过: {{ result.skipped }}</li>
            <li>更新: {{ result.updated }}</li>
          </ul>
          <ul v-if="result.errors?.length">
            <li v-for="e in result.errors" :key="e.row" class="error-item">
              ⚠️ 第{{ e.row }}行: {{ e.msg }}
            </li>
          </ul>
        </div>
        <button class="btn-dark" @click="done">完成</button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import request from '@/utils/request'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'done'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const steps = ['选择文件', '预览数据', '字段映射', '去重策略', '确认导入']
const step = ref(0)
const csvFile = ref(null)
const csvHeaders = ref([])
const csvRows = ref([])
const csvTotalRows = ref(0)
const mapping = ref({})
const dedup = ref('skip')
const importing = ref(false)
const result = ref({})

const dedupOptions = [
  { value: 'skip', label: '跳过重复', desc: '已存在相同邮箱的联系人被跳过' },
  { value: 'update', label: '更新已有', desc: '已存在相同邮箱的联系人被更新' },
  { value: 'duplicate', label: '允许重复', desc: '即使邮箱重复也创建新联系人' }
]

const hasEmailMapping = computed(() => Object.values(mapping.value).includes('email'))

function reset() {
  step.value = 0
  csvFile.value = null
  csvHeaders.value = []
  csvRows.value = []
  csvTotalRows.value = 0
  mapping.value = {}
  dedup.value = 'skip'
  result.value = {}
}

function onFileSelected(e) {
  csvFile.value = e.target.files[0] || null
}

function onDrop(e) {
  csvFile.value = e.dataTransfer.files[0] || null
}

function parseCsv() {
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target.result
    const lines = text.split('\n').filter(l => l.trim())
    if (!lines.length) return
    csvHeaders.value = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    csvTotalRows.value = lines.length - 1
    csvRows.value = lines.slice(1, 5).map(l => {
      const vals = l.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj = {}
      csvHeaders.value.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    })
    mapping.value = {}
    csvHeaders.value.forEach(h => {
      const hLower = h.toLowerCase()
      if (hLower === 'email' || hLower === 'e-mail') mapping.value[h] = 'email'
      else if (hLower === 'name') mapping.value[h] = 'name'
      else if (hLower === 'phone') mapping.value[h] = 'phone'
      else if (hLower === 'company') mapping.value[h] = 'company'
      else mapping.value[h] = '_skip'
    })
    step.value = 1
  }
  reader.readAsText(csvFile.value)
}

async function doImport() {
  importing.value = true
  try {
    const fd = new FormData()
    fd.append('file', csvFile.value)
    fd.append('mapping', JSON.stringify(mapping.value))
    fd.append('dedup_strategy', dedup.value)
    const { data } = await request.post('/contacts/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    result.value = data
    step.value = 5
  } finally {
    importing.value = false
  }
}

function done() {
  reset()
  visible.value = false
  emit('done')
}
</script>

<style scoped>
.import-steps { min-height: 300px; }
.step-indicator { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
.step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; background: var(--border); color: #999; }
.step-dot.active { background: var(--primary); color: #fff; }
.step-dot.done { background: #38b249; color: #fff; }
.step-label { font-size: 13px; color: var(--text-secondary); }
.step-body { margin-top: 16px; }
.step-actions { display: flex; gap: 10px; margin-top: 20px; }
.upload-zone { border: 2px dashed var(--border); border-radius: 10px; padding: 40px; text-align: center; cursor: pointer; }
.upload-hint { color: var(--text-secondary); font-size: 14px; }
.upload-info { font-size: 14px; }
.btn-link { background: none; border: none; color: var(--primary); cursor: pointer; margin-left: 8px; }
.preview-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
.preview-table th, .preview-table td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }
.preview-table th { background: #f5f5f3; }
.map-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.map-col { width: 140px; font-size: 13px; font-weight: 500; text-align: right; }
.map-arrow { color: #aaa; }
.map-select { padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; width: 180px; }
.dedup-options { display: flex; flex-direction: column; gap: 10px; }
.dedup-option { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 2px solid var(--border); border-radius: 8px; cursor: pointer; }
.dedup-option.selected { border-color: var(--primary); }
.review-summary { padding: 16px; background: #f5f5f3; border-radius: 8px; font-size: 14px; }
.review-summary p { margin-bottom: 6px; }
.import-result ul { list-style: none; padding: 0; margin-top: 10px; }
.import-result li { padding: 4px 0; font-size: 14px; }
.error-item { color: var(--accent); }
.btn-dark {
  padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 500; cursor: pointer;
}
.btn-dark:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost {
  padding: 8px 16px; background: transparent; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; cursor: pointer;
}
.step-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
</style>