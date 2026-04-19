<template>
  <el-dropdown trigger="click" @command="changeLocale">
    <span class="locale-switcher">
      {{ currentLocale === 'en' ? '🇺🇸 EN' : '🇨🇳 CN' }}
      <el-icon class="el-icon--right"><arrow-down /></el-icon>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="en">🇺🇸 English</el-dropdown-item>
        <el-dropdown-item command="zh-CN">🇨🇳 中文</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDown } from '@element-plus/icons-vue'

const { locale } = useI18n()

const currentLocale = computed(() => locale.value)

function changeLocale(lang) {
  locale.value = lang
  localStorage.setItem('locale', lang)
}
</script>

<style scoped>
.locale-switcher {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s;
}
.locale-switcher:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
