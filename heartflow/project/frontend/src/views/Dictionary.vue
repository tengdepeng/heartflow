<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance dictionary">
    <!-- 装饰性头部 -->
    <header data-enter class="dc-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="kicker">记录你的专属词汇</p>
      <h1 class="dc-title">殿堂辞典</h1>
      <div class="overview-cards">
        <div class="overview-card">
          <span class="ov-label">总词条</span>
          <span class="ov-value">{{ store.entries.length }}</span>
        </div>
        <div class="overview-card">
          <span class="ov-label">分类数</span>
          <span class="ov-value">{{ store.categories.length }}</span>
        </div>
        <div class="overview-card">
          <span class="ov-label">最新词条</span>
          <span class="ov-value">{{ store.latestWord }}</span>
        </div>
      </div>
    </header>

    <!-- 搜索 + 分类筛选 + 排序 + 视图切换 -->
    <div data-enter class="toolbar">
      <input class="search-input" v-model="searchQuery" placeholder="搜索词条或释义…" />
      <select class="cat-select" v-model="filterCategory">
        <option value="">全部分类</option>
        <option v-for="cat in store.categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <div class="sort-toggle">
        <button class="sort-btn" :class="{ active: sortMode === 'name' }" @click="sortMode = 'name'" title="按名称排序">A-Z</button>
        <button class="sort-btn" :class="{ active: sortMode === 'time' }" @click="sortMode = 'time'" title="按时间排序">时</button>
      </div>
      <div class="sort-toggle" style="margin-left:4px">
        <button class="sort-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'" title="词典视图">☰</button>
        <button class="sort-btn" :class="{ active: viewMode === 'shelf' }" @click="viewMode = 'shelf'" title="书架视图">▦</button>
      </div>
      <button class="dc-btn" @click="showEditor=true">+ 新词条</button>
      <button class="dc-btn dc-ghost-btn" @click="exportDict">导出</button>
      <button class="dc-btn dc-ghost-btn" @click="triggerImport">导入</button>
      <input ref="importInput" type="file" accept=".json,.txt" style="display:none" @change="importDict" />
    </div>

    <!-- 词典视图 -->
    <template v-if="viewMode === 'list'">
      <div data-enter class="entry-list" v-if="displayEntries.length">
        <div
          v-for="e in displayEntries"
          :key="e.id"
          class="entry-card"
          :class="entryCardClass(e)"
          @click="editEntry(e)"
        >
          <div class="entry-head">
            <span v-if="e.category" class="entry-cat-dot" :style="{ background: catColor(e.category) }"></span>
            <span class="entry-word">{{ e.word }}</span>
            <span v-if="e.category" class="entry-cat">{{ e.category }}</span>
            <span v-if="isNew(e)" class="entry-badge-new">新</span>
            <span v-if="e.status === 'archived'" class="entry-badge-archived">归档</span>
          </div>
          <p class="entry-def">{{ e.definition }}</p>
          <div class="entry-actions">
            <button class="archive-btn" v-if="e.status !== 'archived'" @click.stop="archiveEntry(e.id)">归档</button>
            <button class="archive-btn restore-btn" v-else @click.stop="unarchiveEntry(e.id)">恢复</button>
            <button class="del-btn" @click.stop="deleteEntry(e.id)">×</button>
          </div>
        </div>
      </div>
      <p v-else class="empty">还没有词条，点击上方按钮添加</p>
    </template>

    <!-- 书架视图 -->
    <template v-else>
      <div data-enter class="shelf-view" v-if="shelfCategories.length">
        <div
          v-for="cat in shelfCategories"
          :key="cat.name"
          class="shelf-slot"
          :class="{ expanded: expandedShelf === cat.name }"
          @click="expandedShelf = expandedShelf === cat.name ? '' : cat.name"
        >
          <div class="shelf-slot-header">
            <span class="shelf-cat-dot" :style="{ background: catColor(cat.name) }"></span>
            <span class="shelf-cat-name">{{ cat.name }}</span>
            <span class="shelf-cat-count">{{ cat.count }}</span>
          </div>
          <div v-if="expandedShelf === cat.name" class="shelf-entries">
            <div
              v-for="e in cat.entries"
              :key="e.id"
              class="shelf-entry-card"
              :class="entryCardClass(e)"
              @click.stop="editEntry(e)"
            >
              <span class="entry-word">{{ e.word }}</span>
              <span class="entry-def-preview">{{ e.definition.slice(0, 60) }}{{ e.definition.length > 60 ? '…' : '' }}</span>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="empty">还没有词条，点击上方按钮添加</p>
    </template>

    <!-- 归档/活跃切换 -->
    <div data-enter class="archive-toggle-row" v-if="store.archivedEntries.length">
      <label class="archive-toggle-label">
        <input type="checkbox" v-model="showArchived" />
        <span>显示归档词条 ({{ store.archivedEntries.length }})</span>
      </label>
    </div>

    <!-- 统计 -->
    <div data-enter class="stats">共 {{ store.entries.length }} 条词条 · {{ store.categories.length }} 个分类</div>

    <!-- 字源随时查（INCR-04：拼音/部首/笔画查字） -->
    <HanziLookupPanel />

    <!-- 手写查字（INCR-178） -->
    <HandwritingPanel />

    <!-- 诗词卡片（wisdom/poetry 引擎：今日一诗/搜索/收藏/洞察，INCR-205） -->
    <PoetryPanel />

    <!-- 汉字档案画廊（hanzi 引擎：拼音/部首/笔画三入口+汉字档案概览/部首分布/洞察+收录到词库，INCR-206） -->
    <HanziGalleryPanel :collectable="true" @collect="onCollectHanzi" />

    <!-- 自定义字库（hanzi 引擎，把查过的字收进字库，INCR-186） -->
    <CustomHanziPanel />

    <!-- 每日荐字（word-mirror/daily-recommendation 引擎：每日一词/复习/主题包/个性化推荐，INCR-224） -->
    <DailyWordPanel :words="wordItems" />

    <!-- 词源网络（word-mirror/etymology 引擎：词源追溯/字根分解/同源词/共享词根/词源分布，INCR-305 补挂载孤儿组件） -->
    <EtymologyNetworkPanel />

    <!-- 语义网络（word-mirror/semantic-network 引擎：近义/反义/搭配/相关关系图+关联推荐+保存网络，INCR-306 补挂载孤儿组件） -->
    <SemanticNetworkPanel :words="wordItems" />

    <!-- 编辑模态框 -->
    <div data-enter v-if="showEditor" class="modal-overlay" @click.self="closeEditor">
      <div class="modal">
        <h3>{{ editingId ? '编辑词条' : '新词条' }}</h3>
        <input class="modal-input" v-model="editWord" placeholder="词条名称" />
        <textarea class="modal-textarea" v-model="editDef" placeholder="释义…" rows="4"></textarea>
        <div class="modal-row">
          <input class="modal-input" v-model="editCategory" placeholder="分类（可选）" list="cat-suggestions" />
          <datalist id="cat-suggestions">
            <option v-for="cat in store.categories" :key="cat">{{ cat }}</option>
          </datalist>
        </div>
        <div class="modal-row tag-row">
          <input class="modal-input" v-model="editTagInput" placeholder="添加标签（回车确认）" @keydown.enter.prevent="addEditTag" />
        </div>
        <div class="tag-list" v-if="editTags.length">
          <span v-for="(t, i) in editTags" :key="i" class="tag-pill">{{ t }} <button @click="editTags.splice(i,1)" class="tag-remove">×</button></span>
        </div>
        <div class="modal-actions">
          <button class="dc-btn" @click="saveEntry">保存</button>
          <button class="dc-btn dc-ghost-btn" @click="closeEditor">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDictionaryStore, type DictEntry } from '../stores/dictionary'
import { useViewEntrance } from '../composables/useViewEntrance'
import HanziLookupPanel from '../components/HanziLookupPanel.vue'
import HandwritingPanel from '../components/HandwritingPanel.vue'
import CustomHanziPanel from '../components/CustomHanziPanel.vue'
import PoetryPanel from '../components/PoetryPanel.vue'
import HanziGalleryPanel from '../components/HanziGalleryPanel.vue'
import DailyWordPanel from '../components/DailyWordPanel.vue'
import EtymologyNetworkPanel from '../components/EtymologyNetworkPanel.vue'
import SemanticNetworkPanel from '../components/SemanticNetworkPanel.vue'
import type { HanziEntry } from '../modules/hanzi'
import type { WordItem } from '../modules/word-mirror/word-mirror-store'

const { entranceRef, entranceClass } = useViewEntrance()
const store = useDictionaryStore()

// 词条 → 字镜阁 WordItem 映射（每日荐字数据源，INCR-224）
const wordItems = computed<WordItem[]>(() =>
  store.activeEntries.map(e => ({
    id: e.id,
    word: e.word,
    definition: e.definition,
    proficiency: 3,
    favorite: false,
    createdAt: e.createdAt,
  })),
)

const searchQuery = ref('')
const filterCategory = ref('')
const sortMode = ref<'name' | 'time'>('name')
const viewMode = ref<'list' | 'shelf'>('list')
const showArchived = ref(false)
const showEditor = ref(false)
const editingId = ref('')
const editWord = ref('')
const editDef = ref('')
const editCategory = ref('')
const editTags = ref<string[]>([])
const editTagInput = ref('')
const importInput = ref<HTMLInputElement>()
const expandedShelf = ref('')

// 7种预置暖色（根据分类名哈希分配）
const CAT_COLORS = [
  '#c8956c', '#b8864e', '#d4a574', '#a67c52',
  '#c49a6c', '#8b6914', '#b8956c',
]

function catColor(cat: string): string {
  let hash = 0
  for (let i = 0; i < cat.length; i++) {
    hash = ((hash << 5) - hash + cat.charCodeAt(i)) | 0
  }
  return CAT_COLORS[Math.abs(hash) % CAT_COLORS.length]
}

// 视觉演化：新词条（<7天）
function isNew(e: DictEntry): boolean {
  const age = Date.now() - new Date(e.createdAt).getTime()
  return age < 7 * 24 * 3600 * 1000
}

// 视觉演化：词条卡片样式类
function entryCardClass(e: DictEntry): string {
  const classes: string[] = []
  if (isNew(e)) classes.push('entry-new')
  if (e.status === 'archived') classes.push('entry-archived')
  return classes.join(' ')
}

const filteredEntries = computed(() => {
  const result = store.filterEntries(searchQuery.value || undefined, filterCategory.value || undefined)
  if (sortMode.value === 'time') {
    return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  return result
})

// 根据 showArchived 决定显示哪些词条
const displayEntries = computed(() => {
  if (showArchived.value) {
    return filteredEntries.value
  }
  return filteredEntries.value.filter(e => e.status !== 'archived')
})

// 书架视图：按分类分组
const shelfCategories = computed(() => {
  const entries = displayEntries.value
  const map = new Map<string, DictEntry[]>()
  for (const e of entries) {
    const cat = e.category || '未分类'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(e)
  }
  const result = [...map.entries()].map(([name, items]) => ({
    name,
    count: items.length,
    entries: items.sort((a, b) => a.word.localeCompare(b.word, 'zh')),
  }))
  return result.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
})

function editEntry(e: { id: string; word: string; definition: string; category: string; tags?: string[] }) {
  editingId.value = e.id
  editWord.value = e.word
  editDef.value = e.definition
  editCategory.value = e.category
  editTags.value = e.tags ? [...e.tags] : []
  showEditor.value = true
}
function closeEditor() {
  showEditor.value = false
  editingId.value = ''
  editWord.value = ''
  editDef.value = ''
  editCategory.value = ''
  editTags.value = []
  editTagInput.value = ''
}

function onCollectHanzi(entry: HanziEntry) {
  store.addEntry(
    entry.char,
    entry.meaning || `${entry.radical}部 ${entry.strokes}画`,
    '汉字',
    [entry.pinyin || '', entry.radical].filter(Boolean),
  )
}
function addEditTag() {
  const t = editTagInput.value.trim()
  if (t && !editTags.value.includes(t)) { editTags.value.push(t) }
  editTagInput.value = ''
}
function saveEntry() {
  if (!editWord.value.trim()) return
  if (editingId.value) {
    store.updateEntry(editingId.value, {
      word: editWord.value,
      definition: editDef.value,
      category: editCategory.value,
      tags: editTags.value,
    })
  } else {
    store.addEntry(editWord.value, editDef.value, editCategory.value, editTags.value)
  }
  closeEditor()
}
function deleteEntry(id: string) {
  store.deleteEntry(id)
}
function archiveEntry(id: string) {
  store.archiveEntry(id)
}
function unarchiveEntry(id: string) {
  store.unarchiveEntry(id)
}

function exportDict() {
  const data = store.exportDict()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `heartflow-dictionary-${new Date().toISOString().slice(0, 10)}.json`
  a.click(); URL.revokeObjectURL(url)
}
function triggerImport() { importInput.value?.click() }
function importDict(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const text = reader.result as string
      let result: { added: number; skipped: number }
      if (file.name.endsWith('.txt')) {
        // 纯文本导入：每行格式 "词条名：释义"
        const lines = text.split('\n').filter(l => l.trim())
        let added = 0
        for (const line of lines) {
          const colonIdx = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':')
          if (colonIdx === -1) continue
          const word = line.slice(0, colonIdx).trim()
          const def = line.slice(colonIdx + 1).trim()
          if (word && def) {
            // 检查去重
            const existing = store.entries.find(e => e.word === word)
            if (!existing) {
              store.addEntry(word, def)
              added++
            }
          }
        }
        result = { added, skipped: 0 }
      } else {
        result = store.importDict(text)
      }
      alert(`导入完成，新增 ${result.added} 条词条`)
    } catch { alert('导入失败：文件格式不正确') }
  }
  reader.readAsText(file)
  input.value = ''
}
</script>

<style scoped>
/* ============ 深夜食堂 · 暖琥珀主题 ============ */
.dictionary {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  position: relative;
  z-index: 0;
  color: var(--text-high);
}
/* 环境光晕 */
.dictionary::before,
.dictionary::after {
  content: '';
  position: fixed;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  pointer-events: none;
  z-index: -1;
}
.dictionary::before {
  top: -120px;
  left: -160px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
}
.dictionary::after {
  bottom: -120px;
  right: -160px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%);
}

/* ============ 装饰头部 ============ */
.dc-header {
  text-align: center;
  margin-bottom: 28px;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}
.orn-line {
  display: inline-block;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.3), transparent);
}
.orn-diamond {
  font-size: 10px;
  color: var(--accent);
  opacity: 0.6;
}
.kicker {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 2px;
  margin: 0 0 6px;
  text-transform: uppercase;
}
.dc-title {
  font-family: var(--font-heading-zh);
  font-size: 26px;
  font-weight: 600;
  color: var(--text-high);
  margin: 0 0 20px;
  letter-spacing: 4px;
}
/* 概览卡片 */
.overview-cards {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.overview-card {
  flex: 1;
  max-width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  backdrop-filter: blur(4px);
}
.ov-label {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}
.ov-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============ 工具栏 ============ */
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.search-input {
  flex: 1;
  min-width: 140px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}
.search-input::placeholder {
  color: var(--text-secondary);
}
.cat-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.cat-select:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}
/* 排序切换 */
.sort-toggle {
  display: flex;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
}
.sort-btn {
  padding: 3px 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.sort-btn.active {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}
.sort-btn + .sort-btn {
  border-left: 1px solid rgba(var(--accent-rgb), 0.12);
}
.dc-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s;
}
.dc-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.35);
}
.dc-ghost-btn {
  border-color: rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-secondary);
}
.dc-ghost-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  color: rgba(var(--text-primary-rgb), 0.75);
  background: var(--bg-card);
}

/* ============ 词条列表 ============ */
.entry-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.entry-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--bg-card);
  cursor: pointer;
  position: relative;
  transition: all 0.25s;
}
.entry-card:hover {
  background: rgba(55, 48, 40, 0.7);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.entry-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.entry-word {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-high);
}
.entry-cat-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.7;
}
.entry-cat {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}
.entry-def {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.del-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(var(--text-primary-rgb), 0.04);
  color: var(--text-faint);
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.del-btn:hover {
  color: var(--danger);
  background: rgba(255, 107, 107, 0.1);
}
.stats {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 16px;
  text-align: center;
}
.empty {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.15);
  padding: 30px 0;
  text-align: center;
}

/* ============ 模态框 ============ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  width: 380px;
  max-width: 90vw;
  padding: 24px;
  max-height: 86vh;
  overflow-y: auto;
  border-radius: 14px;
  background: rgba(26, 22, 18, 0.95);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  backdrop-filter: blur(12px);
}
.modal h3 {
  font-size: 16px;
  margin-bottom: 16px;
  color: var(--text-high);
}
.modal-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  margin-bottom: 10px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.modal-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}
.modal-input::placeholder {
  color: var(--text-secondary);
}
.modal-textarea {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  margin-bottom: 10px;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.modal-textarea:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}
.modal-textarea::placeholder {
  color: var(--text-secondary);
}
.modal-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.modal-row .modal-input {
  flex: 1;
  margin-bottom: 0;
}
.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ============ 标签 ============ */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.tag-pill {
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.tag-remove {
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  transition: opacity 0.15s;
}
.tag-remove:hover { opacity: 1; }
.tag-row {
  margin-bottom: 4px;
}
.tag-row .modal-input {
  margin-bottom: 0;
}

/* ============ 视觉演化 ============ */
/* 新词条（<7天）：边缘暖色光晕 */
.entry-card.entry-new {
  border-color: rgba(var(--accent-rgb), 0.2);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.08);
}
/* 归档词条：半透明 */
.entry-card.entry-archived {
  opacity: 0.55;
  background: rgba(26, 22, 18, 0.5);
}

/* 新词条/归档徽章 */
.entry-badge-new {
  font-size: 10px;
  padding: 0px 5px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
  margin-left: 4px;
}
.entry-badge-archived {
  font-size: 10px;
  padding: 0px 5px;
  border-radius: 4px;
  background: rgba(var(--text-primary-rgb), 0.08);
  color: var(--text-secondary);
  margin-left: 4px;
}

/* 归档/恢复按钮 */
.entry-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  justify-content: flex-end;
}
.archive-btn {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(var(--text-primary-rgb), 0.08);
  background: transparent;
  color: var(--text-secondary);
  font-size: 10px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.archive-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}
.archive-btn.restore-btn:hover {
  border-color: rgba(52, 211, 153, 0.2);
  color: #34d399;
}

/* 归档切换行 */
.archive-toggle-row {
  margin-top: 12px;
  text-align: center;
}
.archive-toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}
.archive-toggle-label input {
  accent-color: var(--accent);
}

/* ============ 书架视图 ============ */
.shelf-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shelf-slot {
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--bg-card);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s;
}
.shelf-slot:hover {
  border-color: rgba(var(--accent-rgb), 0.15);
  background: rgba(55, 48, 40, 0.7);
}
.shelf-slot.expanded {
  border-color: rgba(var(--accent-rgb), 0.2);
}
.shelf-slot-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
}
.shelf-cat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.7;
}
.shelf-cat-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-high);
}
.shelf-cat-count {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}
.shelf-entries {
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
  padding: 8px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.shelf-entry-card {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: background 0.15s;
}
.shelf-entry-card:hover {
  background: rgba(var(--accent-rgb), 0.08);
}
.shelf-entry-card .entry-word {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-high);
  flex-shrink: 0;
}
.shelf-entry-card .entry-def-preview {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.shelf-entry-card.entry-new {
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.06);
}
.shelf-entry-card.entry-archived {
  opacity: 0.55;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .dictionary { padding: 32px 20px 64px; }
  .overview-cards { gap: 8px; }
  .overview-card { padding: 12px 8px; }
  .entry-list { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .dictionary { padding: 24px 14px 56px; }
  .overview-cards { flex-direction: column; }
  .dc-title { font-size: 12px; }
}

@media (max-width: 480px) {
  .dictionary { padding: 12px; }
  .overview-cards { flex-direction: column; gap: 6px; }
  .search-input { width: 100%; }
}
</style>