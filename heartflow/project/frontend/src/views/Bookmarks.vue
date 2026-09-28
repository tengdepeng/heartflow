<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance bookmarks">
    <!-- 统一房间壳层 -->
    <RoomLayout
      title="书签入口架"
      kicker="收藏网络入口"
      data-enter
    >
      <template #meta>
        <div class="overview-cards">
        <div class="overview-card">
          <span class="overview-num">{{ bookmarks.length }}</span>
          <span class="overview-label">总书签</span>
        </div>
        <div class="overview-card">
          <span class="overview-num">{{ activeBookmarks.length }}</span>
          <span class="overview-label">活跃</span>
        </div>
        <div class="overview-card">
          <span class="overview-num">{{ archivedBookmarks.length }}</span>
          <span class="overview-label">归档</span>
        </div>
        <div class="overview-card">
          <span class="overview-num">{{ folders.length }}</span>
          <span class="overview-label">分类数</span>
        </div>
      </div>
      </template>

    <!-- 视图切换 -->
    <div data-enter class="view-toggle">
      <button :class="['view-btn', { active: viewMode === 'drawer' }]" @click="viewMode = 'drawer'" title="抽屉柜视图">🗄 抽屉柜</button>
      <button :class="['view-btn', { active: viewMode === 'list' }]" @click="viewMode = 'list'" title="入口册视图">📋 入口册</button>
      <button :class="['view-btn', { active: viewMode === 'tagcloud' }]" @click="viewMode = 'tagcloud'" title="标签云视图">☁ 标签云</button>
    </div>

    <!-- 工具栏 -->
    <div data-enter class="toolbar">
      <input class="search-input" v-model="searchQuery" placeholder="搜索书签…" />
      <select class="folder-select" v-model="filterFolder">
        <option value="">全部分类</option>
        <option v-for="f in folders" :key="f" :value="f">{{ f }}</option>
      </select>
      <select class="status-select" v-model="filterStatus">
        <option value="all">全部状态</option>
        <option value="active">活跃</option>
        <option value="archived">已归档</option>
      </select>
      <button class="bm-btn" @click="openAddForm">+ 新书签</button>
      <button class="bm-btn bm-ghost-btn" @click="exportBookmarks">导出</button>
      <button class="bm-btn bm-ghost-btn" @click="triggerImport">导入</button>
      <input ref="importInput" type="file" accept=".json,.txt" style="display:none" @change="importBookmarks" />
    </div>

    <!-- 添加/编辑表单 -->
    <div data-enter v-if="showAddForm" class="add-form">
      <div class="form-row">
        <input class="form-input" v-model="editUrl" placeholder="URL（必填）" @keydown.enter="saveBookmark" />
        <input class="form-input" v-model="editTitle" placeholder="标题" @keydown.enter="saveBookmark" />
      </div>
      <div class="form-row">
        <input class="form-input" v-model="editFolder" placeholder="分类（可选）" list="folder-suggestions" />
        <datalist id="folder-suggestions">
          <option v-for="f in folders" :key="f">{{ f }}</option>
        </datalist>
        <input class="form-input" v-model="editTags" placeholder="标签，逗号分隔" />
      </div>
      <div class="form-row">
        <input class="form-input" v-model="editDescription" placeholder="简短描述（可选）" />
      </div>
      <div class="form-row">
        <textarea class="form-textarea" v-model="editNote" placeholder="私人备注（可选）" rows="2" />
      </div>
      <div class="form-actions">
        <button class="bm-btn" @click="saveBookmark">{{ editingId ? '更新' : '放入抽屉' }}</button>
        <button class="bm-btn bm-ghost-btn" @click="cancelEdit">取消</button>
      </div>
    </div>

    <!-- 分类统计 -->
    <div data-enter class="folder-stats" v-if="viewMode !== 'tagcloud'">
      <span v-for="(count, folder) in folderStats" :key="folder" class="folder-stat" role="button" tabindex="0" :aria-label="'筛选分类 ' + (folder || '未分类')" @click="filterFolder = folder || ''" @keydown.enter.prevent="filterFolder = folder || ''" @keydown.space.prevent="filterFolder = folder || ''">
        <span class="folder-dot" :style="{ background: folderColor(folder) }"></span>
        {{ folder || '未分类' }} ({{ count }})
      </span>
    </div>

    <!-- ===== 抽屉柜视图 ===== -->
    <div data-enter v-if="viewMode === 'drawer'" class="drawer-cabinet">
      <div v-for="folder in folderDrawers" :key="folder.name" class="drawer-group">
        <div class="drawer-header" role="button" tabindex="0" :aria-label="'展开或收起文件夹 ' + (folder.name || '未分类')" :aria-expanded="openDrawers.has(folder.name)" @click="toggleDrawer(folder.name)" @keydown.enter.prevent="toggleDrawer(folder.name)" @keydown.space.prevent="toggleDrawer(folder.name)" :style="{ borderLeftColor: folderColor(folder.name) }">
          <span class="drawer-handle" :style="{ background: folderColor(folder.name) }"></span>
          <span class="drawer-name">{{ folder.name || '未分类' }}</span>
          <span class="drawer-count">{{ folder.bookmarks.length }}</span>
          <span class="drawer-arrow" :class="{ open: openDrawers.has(folder.name) }">▼</span>
        </div>
        <div v-if="openDrawers.has(folder.name)" class="drawer-content">
          <div v-for="b in folder.bookmarks" :key="b.bookmark_id" class="bookmark-card" :class="cardClass(b)" role="button" tabindex="0" :aria-label="'翻转书签 ' + b.title" @click="toggleCardFlip(b.bookmark_id)" @keydown.enter.prevent="toggleCardFlip(b.bookmark_id)" @keydown.space.prevent="toggleCardFlip(b.bookmark_id)">
            <div class="card-inner" :class="{ flipped: flippedCards.has(b.bookmark_id) }">
              <!-- 正面 -->
              <div class="card-front">
                <span class="bm-icon">{{ b.favicon || '📎' }}</span>
                <div class="bm-info">
                  <span class="bm-title">{{ b.title || b.url }}</span>
                  <span class="bm-url">{{ b.url }}</span>
                </div>
                <span v-if="b.folder" class="bm-folder" :style="{ background: folderColor(b.folder) + '20', color: folderColor(b.folder) }">{{ b.folder }}</span>
                <span class="bm-time">{{ fmt(b.created_at) }}</span>
              </div>
              <!-- 背面 -->
              <div class="card-back">
                <div class="card-back-content">
                  <p v-if="b.description" class="back-desc">{{ b.description }}</p>
                  <p v-if="b.note" class="back-note">📝 {{ b.note }}</p>
                  <div class="back-meta">
                    <span>访问 {{ b.visit_count || 0 }} 次</span>
                    <span v-if="b.last_visited_at">最近: {{ fmt(b.last_visited_at) }}</span>
                  </div>
                  <div v-if="b.tags && b.tags.length" class="back-tags">
                    <span v-for="t in b.tags" :key="t" class="back-tag">{{ t }}</span>
                  </div>
                  <div class="back-actions">
                    <button class="bm-btn bm-btn-sm" @click.stop="openBookmark(b)">打开</button>
                    <button class="bm-btn bm-btn-sm bm-ghost-btn" @click.stop="editBookmark(b)">编辑</button>
                    <button v-if="b.status !== 'archived'" class="bm-btn bm-btn-sm bm-ghost-btn" @click.stop="archiveBookmark(b.bookmark_id)">归档</button>
                    <button v-else class="bm-btn bm-btn-sm bm-ghost-btn" @click.stop="unarchiveBookmark(b.bookmark_id)">取回</button>
                    <button class="bm-btn bm-btn-sm del-btn-text" @click.stop="deleteBookmark(b.bookmark_id)">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 入口册视图 ===== -->
    <div data-enter v-if="viewMode === 'list'" class="entry-book">
      <div v-for="b in filteredBookmarks" :key="b.bookmark_id" class="entry-row hf-press" :class="{ archived: b.status === 'archived' }" role="button" tabindex="0" :aria-label="'打开书签 ' + (b.title || b.url)" @click="openBookmark(b)" @keydown.enter.prevent="openBookmark(b)" @keydown.space.prevent="openBookmark(b)">
        <span class="entry-icon">{{ b.favicon || '📎' }}</span>
        <div class="entry-info">
          <span class="entry-title">{{ b.title || b.url }}</span>
          <span class="entry-domain">{{ extractDomain(b.url) }}</span>
        </div>
        <span v-if="b.folder" class="entry-folder-dot" :style="{ background: folderColor(b.folder) }"></span>
        <span class="entry-time">{{ fmt(b.created_at) }}</span>
        <span v-if="b.visit_count" class="entry-visits">{{ b.visit_count }}次</span>
      </div>
    </div>

    <!-- ===== 标签云视图 ===== -->
    <div data-enter v-if="viewMode === 'tagcloud'" class="tag-cloud-view">
      <div class="tag-cloud">
        <span v-for="tag in tagCloud" :key="tag.name" class="cloud-tag hf-press" :class="{ active: filterTag === tag.name }" :style="{ fontSize: tag.size + 'px', opacity: 0.4 + tag.weight * 0.6 }" role="button" tabindex="0" :aria-pressed="filterTag === tag.name" :aria-label="'切换标签筛选 ' + tag.name" @click="toggleTagFilter(tag.name)" @keydown.enter.prevent="toggleTagFilter(tag.name)" @keydown.space.prevent="toggleTagFilter(tag.name)">
          {{ tag.name }}
          <span class="cloud-tag-count">{{ tag.count }}</span>
        </span>
      </div>
      <div v-if="filterTag" class="tag-filter-label">
        筛选标签: <strong>{{ filterTag }}</strong>
        <button class="bm-btn bm-btn-sm bm-ghost-btn" @click="filterTag = ''">清除</button>
      </div>
      <div v-if="tagFilteredBookmarks.length" class="tag-results">
        <div v-for="b in tagFilteredBookmarks" :key="b.bookmark_id" class="bookmark-card" :class="cardClass(b)">
          <span class="bm-icon">{{ b.favicon || '📎' }}</span>
          <div class="bm-info">
            <span class="bm-title">{{ b.title || b.url }}</span>
            <span class="bm-url">{{ b.url }}</span>
          </div>
          <button class="bm-btn bm-btn-sm" @click.stop="openBookmark(b)">打开</button>
        </div>
      </div>
      <EmptyState v-else-if="filterTag" icon="" title="没有匹配的书签" :glow="false" cta-label="" />
    </div>

    <!-- 归档柜 (抽屉柜视图底部) -->
    <div data-enter v-if="viewMode === 'drawer' && archivedBookmarks.length" class="archive-cabinet">
      <div class="archive-header" role="button" tabindex="0" :aria-label="'展开或收起归档柜'" :aria-expanded="showArchive" @click="showArchive = !showArchive" @keydown.enter.prevent="showArchive = !showArchive" @keydown.space.prevent="showArchive = !showArchive">
        <span class="archive-icon">📦</span>
        <span class="archive-label">归档柜</span>
        <span class="archive-count">{{ archivedBookmarks.length }}</span>
        <span class="drawer-arrow" :class="{ open: showArchive }">▼</span>
      </div>
      <div v-if="showArchive" class="archive-content">
        <div v-for="b in archivedBookmarks" :key="b.bookmark_id" class="bookmark-card archived-card">
          <span class="bm-icon">{{ b.favicon || '📎' }}</span>
          <div class="bm-info">
            <span class="bm-title">{{ b.title || b.url }}</span>
            <span class="bm-url">{{ b.url }}</span>
          </div>
          <button class="bm-btn bm-btn-sm bm-ghost-btn" @click.stop="unarchiveBookmark(b.bookmark_id)">取回</button>
        </div>
      </div>
    </div>

    <EmptyState v-if="viewMode === 'list' && !filteredBookmarks.length" icon="" title="还没有书签，添加一个吧" :glow="false" cta-label="" />
    <div data-enter class="stats">共 {{ bookmarks.length }} 个书签（{{ activeBookmarks.length }} 活跃 · {{ archivedBookmarks.length }} 归档）</div>

    <!-- 网页剪藏（bookmarks·clip） -->
    <ClipPanel />

    <!-- 收藏气象（INCR-288 补挂载孤儿组件 BookmarkArchivePanel：已读/回访/整理三轴 + 健康徽章 + 概览 + 类型分布 + 今日最值得打开 + 温和洞察，消费 modules/bookmarks/bookmarks-analytics 纯函数，引擎应用库内唯一） -->
    <div data-enter class="bm-archive">
      <BookmarkArchivePanel :bookmarks="bookmarks" @open="openBookmark" />
    </div>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBookmarks } from '../modules/bookmarks'
import { useViewEntrance } from '../composables/useViewEntrance'
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'
import ClipPanel from '../components/ClipPanel.vue'
import BookmarkArchivePanel from '../components/BookmarkArchivePanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()

interface Bookmark {
  bookmark_id: string
  url: string
  title: string
  description: string
  folder: string
  folder_color: string
  favicon: string
  tags: string[]
  created_at: string
  last_visited_at: string
  visit_count: number
  related_room_ids: string[]
  related_note_ids: string[]
  note: string
  status: 'active' | 'archived'
}

const { bookmarks, load, save } = useBookmarks()
onMounted(load)

const searchQuery = ref('')
const filterFolder = ref('')
const filterStatus = ref<'all' | 'active' | 'archived'>('all')
const filterTag = ref('')
const viewMode = ref<'drawer' | 'list' | 'tagcloud'>('drawer')
const showAddForm = ref(false)
const editingId = ref<string | null>(null)
const editUrl = ref('')
const editTitle = ref('')
const editFolder = ref('')
const editTags = ref('')
const editDescription = ref('')
const editNote = ref('')
const importInput = ref<HTMLInputElement>()
const openDrawers = ref<Set<string>>(new Set())
const flippedCards = ref<Set<string>>(new Set())
const showArchive = ref(false)

const activeBookmarks = computed(() => bookmarks.value.filter(b => b.status !== 'archived'))
const archivedBookmarks = computed(() => bookmarks.value.filter(b => b.status === 'archived'))

const folders = computed(() => {
  const fs = new Set(bookmarks.value.map(b => b.folder).filter(Boolean))
  return [...fs].sort()
})

const folderStats = computed(() => {
  const map: Record<string, number> = {}
  for (const b of bookmarks.value) {
    const key = b.folder || '未分类'
    map[key] = (map[key] || 0) + 1
  }
  return map
})

const folderColors = ['#a07c8c', '#5ab8a0', '#f0c040', '#8a9a7a', '#d98c7a', '#cf8b6b', '#b5707a', '#6b9fc4']
function folderColor(folder: string): string {
  if (!folder) return folderColors[0]
  let hash = 0; for (let i = 0; i < folder.length; i++) hash = folder.charCodeAt(i) + ((hash << 5) - hash)
  return folderColors[Math.abs(hash) % folderColors.length]
}

const filteredBookmarks = computed(() => {
  let result = bookmarks.value
  if (filterStatus.value === 'active') result = result.filter(b => b.status !== 'archived')
  else if (filterStatus.value === 'archived') result = result.filter(b => b.status === 'archived')
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q) ||
      (b.description && b.description.toLowerCase().includes(q)) ||
      (b.tags && b.tags.some(t => t.toLowerCase().includes(q)))
    )
  }
  if (filterFolder.value) result = result.filter(b => b.folder === filterFolder.value)
  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const tagFilteredBookmarks = computed(() => {
  if (!filterTag.value) return []
  return activeBookmarks.value.filter(b => b.tags && b.tags.includes(filterTag.value))
})

const folderDrawers = computed(() => {
  const map: Record<string, Bookmark[]> = {}
  for (const b of activeBookmarks.value) {
    const key = b.folder || '未分类'
    if (!map[key]) map[key] = []
    map[key].push(b)
  }
  // Sort bookmarks within each folder by visit_count desc
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0))
  }
  return Object.entries(map).map(([name, bms]) => ({ name, bookmarks: bms }))
})

const allTags = computed(() => {
  const tagMap: Record<string, number> = {}
  for (const b of bookmarks.value) {
    if (b.tags) {
      for (const t of b.tags) {
        tagMap[t] = (tagMap[t] || 0) + 1
      }
    }
  }
  return tagMap
})

const tagCloud = computed(() => {
  const tags = allTags.value
  const entries = Object.entries(tags)
  if (!entries.length) return []
  const maxCount = Math.max(...entries.map(([, c]) => c))
  return entries.map(([name, count]) => ({
    name,
    count,
    weight: maxCount > 0 ? count / maxCount : 0.3,
    size: 12 + (maxCount > 0 ? (count / maxCount) * 16 : 0),
  })).sort((a, b) => b.count - a.count)
})

function toggleDrawer(folder: string) {
  if (openDrawers.value.has(folder)) {
    openDrawers.value.delete(folder)
  } else {
    openDrawers.value.add(folder)
  }
  openDrawers.value = new Set(openDrawers.value)
}

function toggleCardFlip(id: string) {
  if (flippedCards.value.has(id)) {
    flippedCards.value.delete(id)
  } else {
    flippedCards.value.add(id)
  }
  flippedCards.value = new Set(flippedCards.value)
}

function toggleTagFilter(tag: string) {
  filterTag.value = filterTag.value === tag ? '' : tag
}

function cardClass(b: Bookmark) {
  const days = (Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24)
  const isNew = days < 7
  const isFrequent = (b.visit_count || 0) >= 5
  const isStale = days > 90 && (b.visit_count || 0) === 0
  return {
    'new-bookmark': isNew && b.status === 'active',
    'frequent-bookmark': isFrequent && b.status === 'active',
    'stale-bookmark': isStale && b.status === 'active',
    'archived-card': b.status === 'archived',
  }
}

function openAddForm() {
  editingId.value = null
  editUrl.value = ''
  editTitle.value = ''
  editFolder.value = ''
  editTags.value = ''
  editDescription.value = ''
  editNote.value = ''
  showAddForm.value = true
}

function editBookmark(b: Bookmark) {
  editingId.value = b.bookmark_id
  editUrl.value = b.url
  editTitle.value = b.title
  editFolder.value = b.folder
  editTags.value = (b.tags || []).join(', ')
  editDescription.value = b.description || ''
  editNote.value = b.note || ''
  showAddForm.value = true
}

function cancelEdit() {
  showAddForm.value = false
  editingId.value = null
}

function saveBookmark() {
  let url = editUrl.value.trim()
  if (!url) return
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
  const tags = editTags.value.split(',').map(t => t.trim()).filter(Boolean)

  if (editingId.value) {
    const idx = bookmarks.value.findIndex(b => b.bookmark_id === editingId.value)
    if (idx !== -1) {
      bookmarks.value[idx] = {
        ...bookmarks.value[idx],
        url,
        title: editTitle.value.trim() || url,
        description: editDescription.value.trim(),
        folder: editFolder.value.trim(),
        tags,
        note: editNote.value.trim(),
      }
    }
  } else {
    bookmarks.value.push({
      bookmark_id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      url,
      title: editTitle.value.trim() || url,
      description: editDescription.value.trim(),
      folder: editFolder.value.trim(),
      folder_color: folderColor(editFolder.value.trim()),
      favicon: '📎',
      tags,
      created_at: new Date().toISOString(),
      last_visited_at: '',
      visit_count: 0,
      related_room_ids: [],
      related_note_ids: [],
      note: editNote.value.trim(),
      status: 'active',
    })
  }
  save()
  cancelEdit()
}

function openBookmark(b: Bookmark) {
  // Update visit tracking
  const idx = bookmarks.value.findIndex(bm => bm.bookmark_id === b.bookmark_id)
  if (idx !== -1) {
    bookmarks.value[idx].last_visited_at = new Date().toISOString()
    bookmarks.value[idx].visit_count = (bookmarks.value[idx].visit_count || 0) + 1
    save()
  }
  window.open(b.url, '_blank', 'noopener')
}

function archiveBookmark(id: string) {
  const idx = bookmarks.value.findIndex(b => b.bookmark_id === id)
  if (idx !== -1) {
    bookmarks.value[idx].status = 'archived'
    save()
  }
}

function unarchiveBookmark(id: string) {
  const idx = bookmarks.value.findIndex(b => b.bookmark_id === id)
  if (idx !== -1) {
    bookmarks.value[idx].status = 'active'
    save()
  }
}

function deleteBookmark(id: string) {
  bookmarks.value = bookmarks.value.filter(b => b.bookmark_id !== id)
  save()
  flippedCards.value.delete(id)
}

function exportBookmarks() {
  const data = JSON.stringify(bookmarks.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `heartflow-bookmarks-${new Date().toISOString().slice(0, 10)}.json`
  a.click(); URL.revokeObjectURL(url)
}

function triggerImport() { importInput.value?.click() }

function importBookmarks(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]; if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    alert('文件过大，请检查是否选择了正确的文件')
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result as string)
      if (!Array.isArray(imported)) {
        alert('文件格式不兼容，请使用心流工坊导出的书签文件')
        return
      }
      const existing = new Set(bookmarks.value.map(b => b.url))
      let added = 0
      let skipped = 0
      for (const item of imported) {
        if (item.url && !existing.has(item.url)) {
          bookmarks.value.push({
            bookmark_id: item.bookmark_id || item.id || `bm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            url: item.url,
            title: item.title || '',
            description: item.description || '',
            folder: item.folder || '',
            folder_color: item.folder_color || folderColor(item.folder || ''),
            favicon: item.favicon || '📎',
            tags: item.tags || [],
            created_at: item.created_at || item.at || new Date().toISOString(),
            last_visited_at: item.last_visited_at || '',
            visit_count: item.visit_count || 0,
            related_room_ids: item.related_room_ids || [],
            related_note_ids: item.related_note_ids || [],
            note: item.note || '',
            status: item.status || 'active',
          })
          existing.add(item.url)
          added++
        } else {
          skipped++
        }
      }
      save()
      alert(`导入完成，新增 ${added} 条${skipped ? `，${skipped} 条已存在被跳过` : ''}`)
    } catch { alert('导入失败：文件格式不正确') }
  }
  reader.readAsText(file)
  input.value = ''
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function fmt(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.bookmarks {
  max-width: 720px;
  margin: 0 auto;
  position: relative;
  background: transparent;
  min-height: 100%;
}

.bookmarks :deep(.room-layout) {
  position: relative;
  z-index: 1;
}

.bookmarks::before {
  content: '';
  position: fixed;
  top: -40%;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 700px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.04) 0%, transparent 65%);
  pointer-events: none;
  z-index: 0;
}


/* ===== 概览卡片 ===== */
.overview-cards {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.overview-card {
  flex: 1;
  max-width: 120px;
  padding: 12px 8px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: border-color 0.2s;
}
.overview-card:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
}
.overview-num {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
}
.overview-label {
  font-size: 10px;
  color: var(--text-secondary);
}

/* ===== 视图切换 ===== */
.view-toggle {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
  justify-content: center;
}
.view-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.view-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--text-high);
}
.view-btn.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
  position: relative;
  z-index: 1;
}
.search-input {
  flex: 1;
  min-width: 120px;
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
.folder-select, .status-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.bm-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.bm-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
}
.bm-ghost-btn {
  border-color: rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-secondary);
}
.bm-ghost-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--text-high);
}
.bm-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  font-size: 11px;

  min-height: 26px;
}
.del-btn-text {
  border-color: rgba(239, 68, 68, 0.15);
  background: transparent;
  color: rgba(239, 68, 68, 0.6);
}
.del-btn-text:hover {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
  color: var(--error);
}

/* ===== 添加表单 ===== */
.add-form {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}
.form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.form-input {
  flex: 1;
  min-width: 120px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-input);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}
.form-textarea {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-input);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
}
.form-textarea:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ===== 分类统计 ===== */
.folder-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-secondary);
  position: relative;
  z-index: 1;
}
.folder-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s;

  min-height: 26px;
}
.folder-stat:hover {
  background: rgba(var(--accent-rgb), 0.06);
}
.folder-stat:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  background: rgba(var(--accent-rgb), 0.08);
}
.folder-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

/* ===== 抽屉柜视图 ===== */
.drawer-cabinet {
  position: relative;
  z-index: 1;
}
.drawer-group {
  margin-bottom: 4px;
}
.drawer-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  border-left: 3px solid rgba(var(--accent-rgb), 0.2);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s;
}
.drawer-header:hover {
  background: rgba(var(--accent-rgb), 0.04);
}
.drawer-header:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  background: rgba(var(--accent-rgb), 0.04);
}
.drawer-handle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  opacity: 0.7;
}
.drawer-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-high);
}
.drawer-count {
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.08);
  padding: 2px 8px;
  border-radius: 10px;
}
.drawer-arrow {
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.3s;
}
.drawer-arrow.open {
  transform: rotate(180deg);
}
.drawer-content {
  padding: 8px 0 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: drawerOpen 0.4s ease-out;
}
@keyframes drawerOpen {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 书签卡片 ===== */
.bookmark-card {
  perspective: 800px;
  cursor: pointer;
}
.bookmark-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 10px;
}
.card-inner {
  position: relative;
  transition: transform 0.4s ease;
  transform-style: preserve-3d;
}
.card-inner.flipped {
  transform: rotateY(180deg);
}
.card-front, .card-back {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  background: var(--bg-card);
  transition: all 0.25s;
  backface-visibility: hidden;
}
.card-front {
  position: relative;
}
.card-back {
  position: absolute;
  inset: 0;
  transform: rotateY(180deg);
  padding: 10px 14px;
  overflow-y: auto;
}
.card-back-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.back-desc {
  font-size: 12px;
  color: var(--text-medium);
  margin: 0;
  line-height: 1.5;
}
.back-note {
  font-size: 12px;
  color: var(--text-medium);
  margin: 0;
  line-height: 1.5;
  font-style: italic;
}
.back-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}
.back-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.back-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}
.back-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.bookmark-card:hover .card-front {
  border-color: rgba(var(--accent-rgb), 0.12);
  background: rgba(55, 48, 40, 0.7);
  box-shadow: 0 0 24px rgba(var(--accent-rgb), 0.05);
}

/* 视觉演化 */
.new-bookmark .card-front {
  border-color: rgba(var(--accent-rgb), 0.18);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.08);
}
.new-bookmark .bm-icon {
  animation: newPulse 2s ease-in-out infinite;
}
@keyframes newPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
.frequent-bookmark .card-front {
  border-color: rgba(var(--accent-rgb), 0.2);
  box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.1);
}
.stale-bookmark .card-front {
  opacity: 0.75;
}

.bm-icon {
  font-size: 18px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.08);
  flex-shrink: 0;
}
.bm-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.bm-title {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bm-url {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bm-folder {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
}
.bm-time {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* ===== 入口册视图 ===== */
.entry-book {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  z-index: 1;
}
.entry-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, transform calc(0.16s / var(--hf-animate-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1);
}
.entry-row:hover {
  background: rgba(var(--accent-rgb), 0.04);
}
.entry-row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  background: rgba(var(--accent-rgb), 0.04);
}
.entry-row.archived {
  opacity: 0.5;
}
.entry-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}
.entry-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.entry-title {
  font-size: 13px;
  color: var(--text-high);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.entry-domain {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.entry-folder-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.entry-time {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.entry-visits {
  font-size: 10px;
  color: var(--accent);
  opacity: 0.6;
}

/* ===== 标签云视图 ===== */
.tag-cloud-view {
  position: relative;
  z-index: 1;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  padding: 20px;
  min-height: 80px;
  align-items: center;
}
.cloud-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  cursor: pointer;
  color: var(--accent);
  transition: all 0.2s;
  user-select: none;
  padding: 2px 4px;
  border-radius: 4px;

  min-height: 26px;
}
.cloud-tag:hover {
  background: rgba(var(--accent-rgb), 0.08);
}
.cloud-tag:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  background: rgba(var(--accent-rgb), 0.1);
}
.cloud-tag.active {
  background: rgba(var(--accent-rgb), 0.15);
  border-radius: 6px;
}
.cloud-tag-count {
  font-size: 0.6em;
  vertical-align: super;
  opacity: 0.5;
  margin-left: 1px;
}
.tag-filter-label {
  text-align: center;
  font-size: 13px;
  color: var(--text-medium);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.tag-results {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tag-results .bookmark-card {
  cursor: default;
}
.tag-results .card-front {
  cursor: default;
}

/* ===== 归档柜 ===== */
.archive-cabinet {
  margin-top: 24px;
  position: relative;
  z-index: 1;
  opacity: 0.85;
}
.archive-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  cursor: pointer;
  transition: all 0.2s;
}
.archive-header:hover {
  background: rgba(var(--accent-rgb), 0.06);
}
.archive-header:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  background: rgba(var(--accent-rgb), 0.06);
}
.archive-icon {
  font-size: 16px;
}
.archive-label {
  flex: 1;
  font-size: 13px;
  color: var(--text-medium);
}
.archive-count {
  font-size: 12px;
  color: var(--text-secondary);
}
.archive-content {
  padding: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.archived-card {
  opacity: 0.6;
}
.archived-card:hover {
  opacity: 0.85;
}

/* ===== 底部统计 ===== */
.stats {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 20px;
  text-align: center;
  position: relative;
  z-index: 1;
}

/* ===== 收藏气象（BookmarkArchivePanel 容器） ===== */
.bm-archive {
  position: relative;
  z-index: 1;
  margin-top: 24px;
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

/* ===== 空状态 ===== */

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .bookmarks { padding: 32px 20px 64px; }
  .overview-cards { gap: 6px; }
  .overview-card { padding: 10px 6px; }
  .form-row { flex-wrap: wrap; }
}
@media (max-width: 640px) {
  .bookmarks { padding: 24px 14px 56px; }
  .overview-cards { flex-wrap: wrap; }
  .header-title { font-size: 20px; }
  .toolbar { flex-direction: column; }
  .view-toggle { flex-wrap: wrap; }
}
@media (max-width: 480px) {
  .bookmarks { padding: 12px; }
  .bookmark-card { padding: 10px; gap: 6px; }
  .drawer-content { padding-left: 8px; }
}
</style>