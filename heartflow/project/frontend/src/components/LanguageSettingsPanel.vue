<template>
  <section class="lsp lsp-panel">
    <header class="lsp-head">
      <h3 class="lsp-title">🌐 语言设置</h3>
      <p class="lsp-sub">界面语言 · 翻译状态</p>
    </header>

    <div class="lsp-cards">
      <button
        v-for="lang in languages"
        :key="lang.code"
        class="lsp-card"
        :class="{ 'lsp-card--active': currentLocale === lang.code }"
        @click="onSwitch(lang.code)"
      >
        <span class="lsp-card-name">{{ lang.label }}</span>
        <span class="lsp-card-native">{{ lang.native }}</span>
        <span v-if="currentLocale === lang.code" class="lsp-card-on">当前</span>
      </button>
    </div>

    <div class="lsp-preview">
      <h4 class="lsp-h">翻译预览</h4>
      <ul class="lsp-prev-list">
        <li v-for="sample in samples" :key="sample.key" class="lsp-prev">
          <span class="lsp-prev-key">{{ sample.key }}</span>
          <span class="lsp-prev-val">{{ sample.val }}</span>
        </li>
      </ul>
    </div>

    <div class="lsp-coverage">
      <h4 class="lsp-h">翻译覆盖</h4>
      <div v-for="lang in languages" :key="lang.code" class="lsp-cov-row">
        <span class="lsp-cov-name">{{ lang.label }}</span>
        <div class="lsp-cov-bar"><div class="lsp-cov-fill" :style="{ width: `${coverageOf(lang.code)}%` }" /></div>
        <span class="lsp-cov-n">{{ coverageOf(lang.code) }}/{{ totalKeys }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/modules/i18n'
import { getLocaleMap, type SupportedLocale } from '@/modules/i18n/types'

const { locale, setLocale } = useI18n()
const currentLocale = computed(() => locale.value)

const languages = [
  { code: 'zh-CN' as SupportedLocale, label: '中文', native: '简体中文' },
  { code: 'en' as SupportedLocale, label: 'English', native: 'English' },
  { code: 'ja' as SupportedLocale, label: '日本語', native: '日本語' },
]

const samples = computed(() => [
  { key: 'common.save', val: tKey('common.save') },
  { key: 'settings.language', val: tKey('settings.language') },
  { key: 'nav.study', val: tKey('nav.study') },
  { key: 'time.minutesAgo', val: tKey('time.minutesAgo', { n: 5 }) },
  { key: 'note.empty', val: tKey('note.empty') },
])

function tKey(key: string, params?: Record<string, string | number>) {
  const map = getLocaleMap(currentLocale.value)
  let text = map[key]
  if (text === undefined) return key
  if (params) for (const [k, v] of Object.entries(params)) text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
  return text
}

const totalKeys = computed(() => {
  const zh = getLocaleMap('zh-CN')
  return Object.keys(zh).length
})
function coverageOf(code: SupportedLocale): number {
  const map = getLocaleMap(code)
  const total = totalKeys.value || 1
  const filled = Object.values(map).filter(v => typeof v === 'string' && v.length > 0).length
  return Math.round((filled / total) * 100)
}

function onSwitch(code: SupportedLocale) {
  setLocale(code)
}
</script>

<style scoped>
.lsp-panel {
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  padding: 16px;
  color: var(--hf-text);
  max-width: 480px;
}
.lsp-head { margin-bottom: 12px; }
.lsp-title { margin: 0; font-size: 16px; }
.lsp-sub { margin: 2px 0 0; font-size: 12px; color: var(--hf-text-muted); }
.lsp-cards { display: flex; gap: 8px; margin-bottom: 14px; }
.lsp-card {
  flex: 1; position: relative; display: flex; flex-direction: column; gap: 2px;
  background: var(--hf-bg); border: 1px solid var(--hf-border); border-radius: var(--hf-radius);
  padding: 10px; cursor: pointer; color: var(--hf-text); text-align: left;
}
.lsp-card--active { border-color: var(--hf-primary); box-shadow: 0 0 0 1px var(--hf-primary); }
.lsp-card-name { font-size: 14px; font-weight: 600; }
.lsp-card-native { font-size: 11px; color: var(--hf-text-muted); }
.lsp-card-on { position: absolute; top: 6px; right: 8px; font-size: 10px; color: #fff; background: var(--hf-primary); border-radius: 6px; padding: 1px 6px; }
.lsp-h { margin: 0 0 8px; font-size: 13px; color: var(--hf-text-muted); }
.lsp-preview { margin-bottom: 14px; }
.lsp-prev-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.lsp-prev { display: flex; gap: 8px; font-size: 12px; }
.lsp-prev-key { color: var(--hf-text-muted); min-width: 120px; }
.lsp-prev-val { color: var(--hf-text); }
.lsp-coverage { display: flex; flex-direction: column; gap: 6px; }
.lsp-cov-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.lsp-cov-name { min-width: 64px; }
.lsp-cov-bar { flex: 1; height: 6px; background: var(--hf-border); border-radius: 999px; overflow: hidden; }
.lsp-cov-fill { height: 100%; background: var(--hf-primary); }
.lsp-cov-n { color: var(--hf-text-muted); min-width: 56px; text-align: right; }
</style>
