<template>
  <!-- 主弹窗 -->
  <el-dialog v-model="visible" :title="$t('brand.dialogTitle')" width="1000px" top="3vh">
    <div class="brand-layout">
      <!-- Left: 图片工程列表 -->
      <div class="project-panel">
        <div class="panel-header">
          <span>{{ $t('brand.myProjects') || '我的工程' }}</span>
          <button class="btn-icon-add" @click="newProject">＋</button>
        </div>
        <div class="project-scroll">
          <div v-for="p in projects" :key="p.id"
               :class="['project-item', { active: activeProjectId === p.id }]"
               @click="openProject(p)">
            <div class="project-preview" :style="{ background: p.thumbnail || '#e0e0e0' }"></div>
            <span>{{ p.name }}</span>
          </div>
        </div>
      </div>

      <!-- Right: 工作区 -->
      <div class="canvas-area">
        <div class="canvas-toolbar">
          <span class="project-name" v-if="activeProjectId">
            {{ projects.find(p => p.id === activeProjectId)?.name || '' }}
          </span>
          <div class="toolbar-actions">
            <!-- 元素选择弹窗（渐变 / 图片 / logo） -->
            <el-popover :visible="addMenuVisible" placement="bottom-start" :width="200" trigger="click">
              <template #reference>
                <button class="btn-ghost" @click="addMenuVisible = !addMenuVisible">＋ 添加元素</button>
              </template>
              <div class="add-menu">
                <div class="add-menu-title">添加渐变</div>
                <div class="add-menu-grid">
                  <div v-for="t in builtinTemplates" :key="t.id" class="add-menu-item" @click="addGradient(t)">
                    <div :style="{ background: t.gradient, width: '40px', height: '24px', borderRadius: '4px' }"></div>
                    <span>{{ t.name }}</span>
                  </div>
                </div>
                <div class="add-menu-title">添加图片</div>
                <div class="add-menu-item" @click="$refs.imgInput?.click()">
                  <span class="add-menu-icon">🖼</span> 上传图片
                </div>
                <input ref="imgInput" type="file" accept="image/*" @change="onImageUpload" hidden />
              </div>
            </el-popover>
            <button class="btn-ghost" @click="$refs.logoInput.click()">{{ $t('brand.uploadLogo') }}</button>
            <input ref="logoInput" type="file" accept="image/*" @change="onLogoUpload" hidden />
            <div class="canvas-size-inputs">
              <label class="size-label">画布</label>
              <input class="size-input" type="number" v-model.number="baseW" min="100" max="4000" step="100" />
              <span class="size-x">×</span>
              <input class="size-input" type="number" v-model.number="baseH" min="100" max="4000" step="100" />
            </div>
            <button class="btn-dark" @click="synthesize" :disabled="synthesizing">
              {{ synthesizing ? $t('brand.synthesizing') : $t('brand.synthesize') }}
            </button>
          </div>
        </div>

        <!-- Canvas -->
        <div class="canvas" ref="canvasRef">
          <div v-for="el in canvasElements" :key="el.id"
               :class="['canvas-el', { selected: selectedId === el.id }]"
               :style="elStyle(el)"
               @mousedown.stop="startDrag(el.id, $event)"
               @contextmenu.stop.prevent="showContextMenu(el.id, $event)">
            <template v-if="selectedId === el.id">
              <div class="resize-handle nw" @mousedown.stop="startResize(el.id, 'nw', $event)"></div>
              <div class="resize-handle ne" @mousedown.stop="startResize(el.id, 'ne', $event)"></div>
              <div class="resize-handle sw" @mousedown.stop="startResize(el.id, 'sw', $event)"></div>
              <div class="resize-handle se" @mousedown.stop="startResize(el.id, 'se', $event)"></div>
            </template>
          </div>

          <div v-if="ctxMenu.show" class="ctx-menu" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }">
            <div class="ctx-item" @click="moveLayer('up')">上移一层</div>
            <div class="ctx-item" @click="moveLayer('down')">下移一层</div>
            <div class="ctx-item ctx-item-danger" @click="deleteElement">删除</div>
          </div>
        </div>

        <!-- Result -->
        <div v-if="resultUrl" class="result-area">
          <p>{{ $t('brand.result') }}</p>
          <img :src="resultUrl" class="result-img" />
          <div class="result-actions">
            <button class="btn-dark" @click="copyUrl">{{ $t('brand.copyLink') }}</button>
            <button class="btn-dark" @click="insertToEmail">{{ $t('brand.insertToEmail') }}</button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'insertImage'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

// ── 图片工程列表 ──
const projects = ref([])
const activeProjectId = ref(null)
let projectCounter = 1

function newProject() {
  const id = 'proj_' + Date.now()
  const bgGradient = builtinTemplates[0]
  projects.value.unshift({
    id, name: `工程 ${projectCounter++}`,
    thumbnail: bgGradient.gradient,
    baseW: baseW.value,
    baseH: baseH.value,
    elements: [],
  })
  activeProjectId.value = id
  baseW.value = 800
  baseH.value = 600
  resultUrl.value = null
  canvasElements.value = []
  selectedId.value = null
  // 默认添加一个占满画布的渐变背景
  canvasElements.value.push({
    id: uid(),
    type: 'gradient',
    gradientKey: bgGradient.id,
    gradientCss: bgGradient.gradient,
    src: null,
    file: null,
    x: 0, y: 0, w: 100, h: 100, zIndex: 0,
  })
  selectedId.value = canvasElements.value[0].id
}

let uidCounter = 1
function uid() { return 'el_' + (uidCounter++) }

function saveCurrentProject() {
  if (!activeProjectId.value) return
  const proj = projects.value.find(p => p.id === activeProjectId.value)
  if (!proj) return
  proj.baseW = baseW.value
  proj.baseH = baseH.value
  proj.elements = JSON.parse(JSON.stringify(canvasElements.value))
  const firstGrad = canvasElements.value.find(e => e.type === 'gradient')
  if (firstGrad) {
    proj.thumbnail = firstGrad.gradientCss
  }
}

function openProject(p) {
  saveCurrentProject()
  activeProjectId.value = p.id
  baseW.value = p.baseW || 800
  baseH.value = p.baseH || 600
  resultUrl.value = null
  canvasElements.value = (p.elements || []).map(el => ({ ...el }))
  selectedId.value = canvasElements.value.length > 0 ? canvasElements.value[0].id : null
}

// ── 渐变模板 ──
const builtinTemplates = [
  { id: 'gradient-blue', name: 'Blue', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { id: 'gradient-green', name: 'Green', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { id: 'gradient-warm', name: 'Warm', gradient: 'linear-gradient(135deg, #f5af19, #f12711)' },
  { id: 'gradient-sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #ff6b6b, #c44569)' },
  { id: 'gradient-ocean', name: 'Ocean', gradient: 'linear-gradient(135deg, #1e90ff, #00ced1)' },
  { id: 'gradient-forest', name: 'Forest', gradient: 'linear-gradient(135deg, #2e7d32, #66bb6a)' },
  { id: 'gradient-cotton', name: 'Cotton', gradient: 'linear-gradient(135deg, #f8bbd0, #e1bee7)' },
  { id: 'gradient-night', name: 'Night', gradient: 'linear-gradient(135deg, #283593, #1a237e)' },
  { id: 'gradient-cherry', name: 'Cherry', gradient: 'linear-gradient(135deg, #f857a6, #ff5858)' },
  { id: 'gradient-amber', name: 'Amber', gradient: 'linear-gradient(135deg, #ffb347, #ffcc33)' },
  { id: 'gradient-peace', name: 'Peace', gradient: 'linear-gradient(135deg, #00b4db, #0083b0)' },
  { id: 'gradient-lavender', name: 'Lavender', gradient: 'linear-gradient(135deg, #ee9ca7, #ffdde1)' },
]

// ── 画布尺寸 ──
const baseW = ref(800)
const baseH = ref(600)

// ── Canvas state ──
const canvasElements = ref([])
const selectedId = ref(null)
const canvasRef = ref(null)
const ctxMenu = reactive({ show: false, x: 0, y: 0, elId: null })
const addMenuVisible = ref(false)

// Interaction state
let interaction = null
let canvasRect = null

const resultUrl = ref(null)
const synthesizing = ref(false)

// ── 添加元素 ──
function addGradient(t) {
  canvasElements.value.push({
    id: uid(),
    type: 'gradient',
    gradientKey: t.id,
    gradientCss: t.gradient,
    src: null,
    file: null,
    x: 10, y: 10, w: 80, h: 80, zIndex: canvasElements.value.length,
  })
  addMenuVisible.value = false
}

function addImageElement(file, dataUrl) {
  canvasElements.value.push({
    id: uid(),
    type: 'image',
    gradientKey: null,
    gradientCss: null,
    src: dataUrl,
    file: file,
    x: 10, y: 10, w: 50, h: 33, zIndex: canvasElements.value.length,
  })
}

function onImageUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    addImageElement(file, ev.target.result)
  }
  reader.readAsDataURL(file)
  addMenuVisible.value = false
  e.target.value = ''
}

function onLogoUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    canvasElements.value.push({
      id: uid(),
      type: 'image',
      gradientKey: null,
      gradientCss: null,
      src: ev.target.result,
      file: file,
      x: 55, y: 25, w: 30, h: 20, zIndex: canvasElements.value.length,
    })
    selectedId.value = canvasElements.value[canvasElements.value.length - 1].id
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

// ── 删除元素 ──
function deleteElement() {
  const idx = canvasElements.value.findIndex(x => x.id === ctxMenu.elId)
  if (idx < 0) { closeMenu(); return }
  canvasElements.value.splice(idx, 1)
  if (selectedId.value === ctxMenu.elId) {
    selectedId.value = canvasElements.value.length > 0 ? canvasElements.value[0].id : null
  }
  closeMenu()
}

// ── Computed ──
function elStyle(el) {
  const style = {
    position: 'absolute',
    left: el.x + '%',
    top: el.y + '%',
    width: el.w + '%',
    height: el.h + '%',
    zIndex: el.zIndex,
  }
  if (el.type === 'gradient') {
    style.background = el.gradientCss || builtinTemplates[0].gradient
  } else if (el.src) {
    style.backgroundImage = `url(${el.src})`
    style.backgroundSize = 'contain'
    style.backgroundPosition = 'center'
    style.backgroundRepeat = 'no-repeat'
  }
  return style
}

// ── Drag & Resize ──
function getCanvasRect() {
  if (canvasRef.value) {
    canvasRect = canvasRef.value.getBoundingClientRect()
  }
}

function onDocMouseMove(e) {
  if (!interaction) return
  if (!canvasRect) getCanvasRect()
  if (!canvasRect) return
  const dx = (e.clientX - interaction.startX) / canvasRect.width * 100
  const dy = (e.clientY - interaction.startY) / canvasRect.height * 100
  const el = canvasElements.value.find(x => x.id === interaction.elId)
  if (!el) return

  if (interaction.mode === 'drag') {
    el.x = Math.max(0, Math.min(90, interaction.origX + dx))
    el.y = Math.max(0, Math.min(85, interaction.origY + dy))
  } else if (interaction.mode === 'resize') {
    const h = interaction.handle
    let newX = interaction.origX
    let newY = interaction.origY
    let newW = interaction.origW + dx
    let newH = interaction.origH + dy
    const aspect = interaction.origW / interaction.origH
    if (el.type === 'image') {
      if (h.includes('e')) {
        newH = newW / aspect
      } else if (h.includes('w')) {
        newW = Math.max(5, interaction.origW - dx)
        newH = newW / aspect
        newX = interaction.origX + (interaction.origW - newW)
      }
      if (h.includes('n')) {
        newH = Math.max(5, interaction.origH - dy)
        newW = newH * aspect
        newY = interaction.origY + (interaction.origH - newH)
      }
    } else {
      if (h.includes('w')) {
        newW = Math.max(10, interaction.origW - dx)
        newX = interaction.origX + (interaction.origW - newW)
      } else {
        newW = Math.max(10, newW)
      }
      if (h.includes('n')) {
        newH = Math.max(10, interaction.origH - dy)
        newY = interaction.origY + (interaction.origH - newH)
      } else {
        newH = Math.max(10, newH)
      }
    }
    el.x = newX
    el.y = newY
    el.w = newW
    el.h = newH
  }
}

function startDrag(elId, e) {
  const el = canvasElements.value.find(x => x.id === elId)
  if (!el) return
  selectedId.value = elId
  getCanvasRect()
  interaction = { mode: 'drag', elId, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y }
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp, { once: true })
}

function startResize(elId, handle, e) {
  const el = canvasElements.value.find(x => x.id === elId)
  if (!el) return
  selectedId.value = elId
  getCanvasRect()
  interaction = { mode: 'resize', elId, handle, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.w, origH: el.h }
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp, { once: true })
}

function onDocMouseUp() {
  interaction = null
  canvasRect = null
  document.removeEventListener('mousemove', onDocMouseMove)
}

// ── Context menu ──
function showContextMenu(elId, e) {
  selectedId.value = elId
  ctxMenu.show = true
  ctxMenu.x = e.offsetX
  ctxMenu.y = e.offsetY
  ctxMenu.elId = elId
  setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 0)
}

function closeMenu() {
  ctxMenu.show = false
  document.removeEventListener('click', closeMenu)
}

function moveLayer(dir) {
  const el = canvasElements.value.find(x => x.id === ctxMenu.elId)
  if (!el) { closeMenu(); return }
  if (dir === 'up') {
    el.zIndex += 1
  } else {
    el.zIndex = Math.max(0, el.zIndex - 1)
  }
  closeMenu()
}

// ── Synthesize (前端 Canvas API) ──
async function synthesize() {
  if (canvasElements.value.length === 0) {
    ElMessage.warning('没有可合成的元素'); return
  }
  synthesizing.value = true
  try {
    const bw = baseW.value
    const bh = baseH.value
    let minPx = Infinity, minPy = Infinity, maxPx = 0, maxPy = 0

    for (const el of canvasElements.value) {
      const px = (el.x / 100) * bw
      const py = (el.y / 100) * bh
      const pw = (el.w / 100) * bw
      const ph = (el.h / 100) * bh
      if (px < minPx) minPx = px
      if (py < minPy) minPy = py
      if (px + pw > maxPx) maxPx = px + pw
      if (py + ph > maxPy) maxPy = py + ph
    }

    const canvasW = Math.ceil(maxPx - minPx)
    const canvasH = Math.ceil(maxPy - minPy)
    if (canvasW < 1 || canvasH < 1) {
      ElMessage.error('合成区域无效'); return
    }

    const offCanvas = document.createElement('canvas')
    offCanvas.width = canvasW
    offCanvas.height = canvasH
    const ctx = offCanvas.getContext('2d')

    const sorted = [...canvasElements.value].sort((a, b) => a.zIndex - b.zIndex)
    for (const el of sorted) {
      const ex = (el.x / 100) * bw - minPx
      const ey = (el.y / 100) * bh - minPy
      const ew = (el.w / 100) * bw
      const eh = (el.h / 100) * bh

      if (el.type === 'gradient') {
        drawGradient(ctx, el.gradientCss, ex, ey, ew, eh)
      } else if (el.src) {
        const img = await loadImage(el.src)
        ctx.drawImage(img, ex, ey, ew, eh)
      }
    }

    const blob = await new Promise(resolve => offCanvas.toBlob(resolve, 'image/png'))
    const fd = new FormData()
    fd.append('image', blob, 'brand.png')
    const { data } = await request.post('/brand/synthesize', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    resultUrl.value = data.url.startsWith('http') ? data.url : window.location.origin + data.url
    saveCurrentProject()
  } catch (e) {
    console.error('合成失败:', e)
    ElMessage.error('合成失败')
  } finally {
    synthesizing.value = false
  }
}

function drawGradient(ctx, cssGradient, x, y, w, h) {
  const match = cssGradient.match(/linear-gradient\(([^,]+),\s*([^,]+),\s*([^)]+)\)/)
  if (!match) {
    ctx.fillStyle = '#667eea'
    ctx.fillRect(x, y, w, h)
    return
  }
  let angle = 135
  const degMatch = match[1].match(/(\d+)deg/)
  if (degMatch) angle = parseInt(degMatch[1])
  const c1 = match[2].trim()
  const c2 = match[3].trim()

  const rad = (angle - 90) * Math.PI / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const gradientLen = Math.abs(w * cos) + Math.abs(h * sin)
  const grad = ctx.createLinearGradient(x, y, x + cos * gradientLen, y + sin * gradientLen)
  grad.addColorStop(0, c1)
  grad.addColorStop(1, c2)
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// ── Result actions ──
function copyUrl() {
  if (resultUrl.value) {
    navigator.clipboard.writeText(resultUrl.value)
    ElMessage.success('链接已复制')
  }
}

function insertToEmail() {
  if (resultUrl.value) {
    emit('insertImage', resultUrl.value)
    ElMessage.success('已插入到邮件')
    emit('update:modelValue', false)
  }
}

// ── Init ──
onMounted(() => {
  newProject()
})
</script>

<style scoped>
.brand-layout { display: flex; gap: 20px; max-height: 65vh; }

/* 左侧项目面板 */
.project-panel { width: 170px; flex-shrink: 0; display: flex; flex-direction: column; border-right: 1px solid var(--border); padding-right: 8px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 10px; }
.btn-icon-add {
  width: 24px; height: 24px; border-radius: 4px; font-size: 16px; line-height: 22px; text-align: center;
  background: var(--primary); color: #fff; border: none; cursor: pointer;
}
.project-scroll { flex: 1; overflow-y: auto; }
.project-item {
  display: flex; flex-direction: column; gap: 4px; padding: 8px; border-radius: 8px; cursor: pointer;
  margin-bottom: 6px; font-size: 12px; color: var(--text-secondary); transition: all 0.15s;
}
.project-item:hover { background: #f5f5f3; }
.project-item.active { background: var(--primary); color: #fff; }
.project-item.active span { color: #fff; }
.project-preview { width: 100%; height: 60px; border-radius: 6px; }

/* 右侧工作区 */
.canvas-area { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow-y: auto; max-height: 65vh; }
.canvas-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px; flex-wrap: wrap; gap: 6px; flex-shrink: 0;
}
.project-name { font-size: 14px; font-weight: 600; color: var(--text); }
.toolbar-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* 画布尺寸输入 */
.canvas-size-inputs { display: flex; align-items: center; gap: 4px; font-size: 12px; }
.size-label { color: var(--text-secondary); font-weight: 500; }
.size-input { width: 60px; padding: 4px 6px; border: 1px solid var(--border); border-radius: 4px; font-size: 12px; text-align: center; }
.size-x { color: var(--text-secondary); font-size: 14px; }

.canvas {
  border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
  position: relative; cursor: default;
  width: 100%; aspect-ratio: 4/3;
  background: #f0f0f0 !important;
  flex-shrink: 0;
}

.canvas-el {
  position: absolute;
  cursor: move;
  border: 2px solid transparent;
  transition: box-shadow 0.1s;
}
.canvas-el.selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
.resize-handle {
  position: absolute;
  width: 10px; height: 10px;
  background: #fff; border: 2px solid var(--primary); border-radius: 2px; z-index: 10;
}
.resize-handle.nw { top: -5px; left: -5px; cursor: nw-resize; }
.resize-handle.ne { top: -5px; right: -5px; cursor: ne-resize; }
.resize-handle.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
.resize-handle.se { bottom: -5px; right: -5px; cursor: se-resize; }

/* Context menu */
.ctx-menu {
  position: absolute; background: #2d2d2d; color: #eee; border-radius: 6px; padding: 4px 0;
  min-width: 110px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.ctx-item { padding: 8px 14px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.ctx-item:hover { background: var(--primary); }
.ctx-item-danger:hover { background: #d32f2f; }

/* 添加元素菜单 */
.add-menu { padding: 8px 0; max-height: 400px; overflow-y: auto; }
.add-menu-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); padding: 4px 12px; margin-top: 4px; }
.add-menu-grid { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 12px; }
.add-menu-item {
  display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer;
  font-size: 13px; border-radius: 4px; transition: background 0.15s;
}
.add-menu-item:hover { background: #f0f0f0; }
.add-menu-icon { font-size: 16px; }

/* Result */
.result-area { margin-top: 10px; text-align: center; flex-shrink: 0; padding-bottom: 4px; }
.result-img { max-width: 260px; max-height: 160px; border-radius: 8px; margin: 6px 0; }
.result-actions { display: flex; gap: 8px; justify-content: center; }

/* Buttons */
.btn-dark {
  padding: 8px 16px; background: var(--primary); color: #fff; border: none; border-radius: 6px;
  font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
}
.btn-dark:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost {
  padding: 6px 12px; background: transparent; border: 1px solid var(--border);
  border-radius: 6px; font-size: 13px; cursor: pointer; white-space: nowrap;
}
.btn-ghost:hover { border-color: var(--primary); color: var(--primary); }
</style>