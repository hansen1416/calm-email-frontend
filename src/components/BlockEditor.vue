<template>
  <div class="block-editor" ref="editorHolder"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Quote from '@editorjs/quote'
import Delimiter from '@editorjs/delimiter'
import SimpleImage from '@editorjs/simple-image'
import LinkTool from '@editorjs/link'
import Table from '@editorjs/table'
import { editorJsI18n } from '@/utils/editorjs-i18n'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const props = defineProps({
  modelValue: { type: Object, default: () => ({ time: Date.now(), blocks: [] }) },
  placeholder: { type: String, default: '开始编写邮件内容...' }
})

const emit = defineEmits(['update:modelValue', 'update:html'])

const editorHolder = ref(null)
const editor = ref(null)
const i18n = locale.value === 'zh-CN' ? editorJsI18n.zh : editorJsI18n.en

function blocksToHtml(blocks) {
  function renderListItems(items) {
    return items.map(item => {
      const content = typeof item === 'string' ? item : (item.content || '')
      let html = `<li>${content}</li>`
      if (item.items && item.items.length) {
        html = `<li>${content}<ul>${renderListItems(item.items)}</ul></li>`
      }
      return html
    }).join('')
  }
  return blocks.map(b => {
    switch (b.type) {
      case 'header': return `<h${b.data.level}>${b.data.text}</h${b.data.level}>`
      case 'paragraph': return `<p>${b.data.text}</p>`
      case 'list': {
        const tag = b.data.style === 'ordered' ? 'ol' : 'ul'
        const items = renderListItems(b.data.items || [])
        return `<${tag}>${items}</${tag}>`
      }
      case 'quote': {
        const quoteText = b.data.text || ''
        const qCaption = b.data.caption ? `<cite>${b.data.caption}</cite>` : ''
        return `<blockquote>${quoteText}${qCaption}</blockquote>`
      }
      case 'delimiter': return '<hr>'
      case 'image': return `<img src="${b.data.url}" alt="${b.data.caption || ''}" style="max-width:100%">`
      case 'linkTool': {
        const { link, meta } = b.data || {}
        if (!link) return ''
        const linkTitle = meta?.title || link
        const desc = meta?.description ? `<p style="margin:4px 0 0;font-size:13px;color:#666">${meta.description}</p>` : ''
        return `<div style="border:1px solid #e0e0e0;border-radius:8px;padding:12px;margin:8px 0;background:#fafafa"><a href="${link}" target="_blank" rel="noopener" style="font-weight:600;font-size:15px;color:var(--primary);text-decoration:none;display:block">${linkTitle}</a>${desc}</div>`
      }
      case 'table':
        const tableRows = (b.data.content || []).map(row => '<tr>' + (row || []).map(cell => `<td>${cell}</td>`).join('') + '</tr>').join('')
        return `<table border="1" cellpadding="4">${tableRows}</table>`
      default: return ''
    }
  }).join('\n')
}
const tools = {
  header: { class: Header, inlineToolbar: true, config: { placeholder: '标题', levels: [2, 3, 4], defaultLevel: 2 } },
  list: { class: List, inlineToolbar: true },
  quote: { class: Quote, inlineToolbar: true },
  delimiter: Delimiter,
  image: { class: SimpleImage },
  linkTool: { class: LinkTool, config: { endpoint: '/api/editor/fetch-url' } },
  table: { class: Table, inlineToolbar: true }
}

async function initEditor() {
  if (editor.value) { editor.value.destroy(); editor.value = null }
  await nextTick()
  // Normalize data before passing to EditorJS
  let data = props.modelValue?.blocks?.length ? props.modelValue : { time: Date.now(), blocks: [] }
  if (data.blocks) {
    data = JSON.parse(JSON.stringify(data)) // deep clone
    data.blocks = data.blocks.map(b => {
      if (b.type === 'list' && b.data && b.data.items) {
        // @editorjs/list v2: normalize items to { content, items? } format
        b.data.items = b.data.items.map(item => {
          if (item && typeof item === 'object' && item.content !== undefined && item.items !== undefined) {
            return item
          }
          if (item && typeof item === 'object') {
            return { content: item.content || (typeof item === 'string' ? item : ''), items: item.items || [] }
          }
          return { content: String(item || ''), items: [] }
        })
      }
      return b
    })
  }
  editor.value = new EditorJS({
    holder: editorHolder.value,
    tools,
    i18n,
    placeholder: props.placeholder,
    data,
    onChange: async () => {
      const result = await editor.value.save()
      emit('update:modelValue', result)
      emit('update:html', blocksToHtml(result.blocks))
    }
  })
}

onMounted(() => initEditor())
onUnmounted(() => { if (editor.value) editor.value.destroy() })

watch(() => locale.value, () => {
  const newI18n = locale.value === 'zh-CN' ? editorJsI18n.zh : editorJsI18n.en
  if (editor.value) editor.value.destroy()
  let watchData = props.modelValue?.blocks?.length ? props.modelValue : { time: Date.now(), blocks: [] }
  if (watchData.blocks) {
    watchData = JSON.parse(JSON.stringify(watchData))
    watchData.blocks = watchData.blocks.map(b => {
      if (b.type === 'list' && b.data && b.data.items) {
        b.data.items = b.data.items.map(item => {
          if (item && typeof item === 'object' && item.content !== undefined && item.items !== undefined) {
            return item
          }
          return { content: String(item || ''), items: [] }
        })
      }
      return b
    })
  }
  editor.value = new EditorJS({
    holder: editorHolder.value, tools, i18n: newI18n,
    placeholder: props.placeholder,
    data: watchData,
    onChange: async () => {
      const result = await editor.value.save()
      emit('update:modelValue', result)
      emit('update:html', blocksToHtml(result.blocks))
    }
  })
  })

defineExpose({
  editorInstance: editor
})
</script>

<style>
.block-editor {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px 60px;
  background: #faf9f7;
  min-height: 200px;
  overflow: visible;
}
.block-editor .ce-block__content { max-width: none; }
.block-editor .ce-toolbar__content {
  max-width: none;
}
.block-editor .ce-popover__container {
  left: 0 !important;
  transform: none !important;
}
.block-editor .ce-popover__container .ce-popover {
  transform-origin: left top;
}
</style>