<script setup lang="ts">
// ============================================================
// 命令面板 · 全局命令面板（Ctrl/Cmd+K 呼出）
// 纯展示组件：由父级（App.vue）传入 items 与 visible，
// 负责检索过滤、键盘导航、无障碍（combobox/listbox）与玻璃拟态样式。
// ============================================================
import { ref, computed, watch, nextTick } from 'vue'
import type { CommandItem, CommandKind } from '../modules/command-palette/types'

const props = defineProps<{
  visible: boolean
  items: CommandItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', item: CommandItem): void
}>()

const query = ref('')
const selectedIndex = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)

const KIND_LABEL: Record<CommandKind, string> = {
  room: '房间',
  page: '页面',
  action: '动作',
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 简单评分：前缀匹配 > 词首 > 命中；-1 表示不命中
function score(item: CommandItem, q: string): number {
  const hay = (item.label + ' ' + (item.keywords ?? '')).toLowerCase()
  const i = hay.indexOf(q)
  if (i < 0) return -1
  if (item.label.toLowerCase().startsWith(q)) return 100 - i
  if (i === 0) return 80 - i
  return 40 - i
}

const results = computed<CommandItem[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) {
    // 空查询：动作优先 + 房间/页面各取前若干，作为推荐入口
    const actions = props.items.filter((i) => i.kind === 'action')
    const rooms = props.items.filter((i) => i.kind === 'room').slice(0, 16)
    const pages = props.items.filter((i) => i.kind === 'page').slice(0, 8)
    return [...actions, ...rooms, ...pages]
  }
  return props.items
    .map((i) => ({ i, s: score(i, q) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 50)
    .map((x) => x.i)
})

watch(results, () => {
  selectedIndex.value = 0
})

watch(
  () => props.visible,
  (v) => {
    if (v) {
      query.value = ''
      selectedIndex.value = 0
      nextTick(() => inputEl.value?.focus())
    }
  },
)

function onInput() {
  selectedIndex.value = 0
}

function move(delta: number) {
  const n = results.value.length
  if (!n) return
  selectedIndex.value = (selectedIndex.value + delta + n) % n
  scrollToSelected()
}

function scrollToSelected() {
  nextTick(() => {
    const el = listEl.value?.querySelector('.cp-item.is-active') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function confirm() {
  const item = results.value[selectedIndex.value]
  if (item) emit('select', item)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    move(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    move(-1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    confirm()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

function highlight(text: string): string {
  const q = query.value.trim()
  if (!q) return esc(text)
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return esc(text)
  return (
    esc(text.slice(0, idx)) +
    '<mark>' +
    esc(text.slice(idx, idx + q.length)) +
    '</mark>' +
    esc(text.slice(idx + q.length))
  )
}

function onSelect(item: CommandItem) {
  emit('select', item)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="cp-fade">
      <div v-if="visible" class="cp-overlay" @click.self="emit('close')">
        <div class="cp-panel" role="dialog" aria-modal="true" aria-label="命令面板">
          <div class="cp-search">
            <span class="cp-search-icon">⌘</span>
            <input
              ref="inputEl"
              v-model="query"
              class="cp-input"
              type="text"
              placeholder="搜索房间、页面或动作…"
              role="combobox"
              aria-expanded="true"
              :aria-activedescendant="
                results.length ? 'cp-opt-' + selectedIndex : undefined
              "
              aria-autocomplete="list"
              @input="onInput"
              @keydown="onKeydown"
            />
            <kbd class="cp-kbd">Esc</kbd>
          </div>

          <ul ref="listEl" class="cp-list" role="listbox" aria-label="搜索结果">
            <li
              v-for="(item, idx) in results"
              :id="'cp-opt-' + idx"
              :key="item.id"
              class="cp-item"
              :class="{ 'is-active': idx === selectedIndex }"
              role="option"
              :aria-selected="idx === selectedIndex"
              @mousemove="selectedIndex = idx"
              @click="onSelect(item)"
            >
              <span class="cp-kind" :data-kind="item.kind">{{ KIND_LABEL[item.kind] }}</span>
              <span class="cp-label" v-html="highlight(item.label)"></span>
              <span v-if="item.hint" class="cp-hint">{{ item.hint }}</span>
            </li>
            <li v-if="results.length === 0" class="cp-empty">没有匹配项</li>
          </ul>

          <div class="cp-footer">
            <span>↑↓ 选择</span>
            <span>↵ 打开</span>
            <span>Esc 关闭</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cp-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 9999);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 14vh;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.cp-panel {
  width: min(640px, 92vw);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--glass-bg-strong, rgba(26, 22, 17, 0.92));
  border: 1px solid var(--glass-border, rgba(var(--accent-rgb, 212, 165, 116), 0.18));
  border-radius: var(--glass-radius, 16px);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
}

.cp-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.12);
}

.cp-search-icon {
  color: var(--accent, #d4a574);
  font-size: 16px;
}

.cp-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary, #e8e0d8);
  font-size: 16px;
  font-family: inherit;
}

.cp-input::placeholder {
  color: var(--text-muted, rgba(232, 224, 216, 0.45));
}

.cp-kbd {
  flex: none;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 2px 6px;
}

.cp-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
}

.cp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.cp-item.is-active {
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.16);
  color: var(--text-primary, #e8e0d8);
}

.cp-kind {
  flex: none;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.12);
  color: var(--accent, #d4a574);
  min-width: 40px;
  text-align: center;
}

.cp-label {
  flex: 1;
  color: inherit;
}

.cp-label :deep(mark) {
  background: transparent;
  color: var(--accent, #d4a574);
  font-weight: 600;
}

.cp-hint {
  color: var(--text-muted, rgba(232, 224, 216, 0.3));
  font-size: 12px;
}

.cp-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted, rgba(232, 224, 216, 0.3));
}

.cp-footer {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  border-top: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.12);
  font-size: 11px;
  color: var(--text-muted, rgba(232, 224, 216, 0.3));
}

.cp-fade-enter-active,
.cp-fade-leave-active {
  transition: opacity 0.18s ease;
}

.cp-fade-enter-from,
.cp-fade-leave-to {
  opacity: 0;
}
</style>
