<template>
  <div class="study-room" :style="ambientStyle">
    <!-- 氛围背景 -->
    <div class="study-atmos">
      <div class="atmos-ambient-glow"></div>
      <div class="atmos-ceiling-gradient"></div>
      <div class="atmos-lantern-glow"></div>
    </div>

    <!-- 主内容区 -->
    <div class="study-content">
      <!-- 头部 -->
      <header class="study-header">
        <div class="header-ornament">
          <span class="orn-line"></span>
          <span class="orn-book">&#x1F4DA;</span>
          <span class="orn-line"></span>
        </div>
        <h1 class="study-title">书房</h1>
        <p class="study-subtitle">沉淀知识 · 结晶时光</p>
      </header>

      <!-- 书房藏量（真实数据联动） -->
      <div class="study-summary">
        <span class="summary-item"><b>{{ noteTotal }}</b> 本笔记</span>
        <span class="summary-sep">·</span>
        <span class="summary-item"><b>{{ crystalTotal }}</b> 颗结晶</span>
      </div>

      <!-- 书架展示 -->
      <section class="bookshelf-section">
        <div class="section-head">
          <h2 class="section-title">
            <span class="section-icon">&#x1F4D6;</span>
            书架
          </h2>
          <div class="view-toggle" role="group" aria-label="书架分组方式">
            <button
              type="button"
              class="view-toggle__btn"
              :class="{ on: viewMode === 'tag' }"
              :aria-pressed="viewMode === 'tag'"
              @click="viewMode = 'tag'"
            >按标签</button>
            <button
              type="button"
              class="view-toggle__btn"
              :class="{ on: viewMode === 'room' }"
              :aria-pressed="viewMode === 'room'"
              @click="viewMode = 'room'"
            >按房间</button>
          </div>
        </div>
        <div v-if="bookshelfCategories.length === 0" class="empty-state">
          <span class="empty-icon">&#x1F4DD;</span>
          <span class="empty-text">尚未记录笔记，开始书写你的第一页吧</span>
        </div>
        <div v-else class="bookshelf-list">
          <div
            v-for="cat in bookshelfCategories"
            :key="cat.name"
            class="bookshelf-category"
          >
            <h3 class="category-name">{{ cat.name }}</h3>
            <div class="category-books">
              <div
                v-for="note in cat.notes"
                :key="note.id"
                class="book-item"
                :title="note.content"
                role="button"
                tabindex="0"
                @click="openBook(note)"
                @keydown.enter="openBook(note)"
                @keydown.space.prevent="openBook(note)"
              >
                <span class="book-spine"></span>
                <span class="book-title">{{ note.title }}</span>
                <span class="book-date">{{ formatDate(note.updatedAt) }}</span>
                <div
                  v-if="note.due || note.assignee || (note.priority && note.priority !== 'normal')"
                  class="book-meta"
                >
                  <span v-if="note.due" class="book-meta__item">&#x23F1; {{ formatDate(note.due) }}</span>
                  <span v-if="note.assignee" class="book-meta__item">@{{ note.assignee }}</span>
                  <span v-if="note.priority === 'high'" class="book-meta__item book-meta__item--high">高</span>
                  <span v-if="note.priority === 'low'" class="book-meta__item book-meta__item--low">低</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 知识结晶概览 -->
      <section class="crystal-section">
        <h2 class="section-title">
          <span class="section-icon">&#x1F48E;</span>
          知识结晶
        </h2>
        <div v-if="recentCrystals.length === 0" class="empty-state">
          <span class="empty-icon">&#x1F30C;</span>
          <span class="empty-text">还没有结晶，完成专注会话即可凝聚</span>
        </div>
        <div v-else class="crystal-list">
            <div
              v-for="crystal in recentCrystals"
              :key="crystal.id"
              class="crystal-card"
              :style="{
                '--crystal-color': crystal.color,
                '--crystal-intensity': crystal.intensity,
              }"
              role="button"
              tabindex="0"
              @click="openCrystal(crystal)"
              @keydown.enter="openCrystal(crystal)"
              @keydown.space.prevent="openCrystal(crystal)"
            >
            <div class="crystal-visual">
              <div class="crystal-gem" :class="'shape-' + crystal.shape">
                <span class="crystal-shape-icon">{{ shapeIcon(crystal.shape) }}</span>
              </div>
              <div class="crystal-glow"></div>
            </div>
            <div class="crystal-info">
              <span class="crystal-inten">{{ Math.round(crystal.intensity * 100) }}%</span>
              <span class="crystal-date">{{ formatDate(crystal.createdAt) }}</span>
            </div>
            <div v-if="crystal.insight" class="crystal-insight">{{ crystal.insight }}</div>
          </div>
        </div>
      </section>

      <!-- 功能入口 -->
      <section class="action-panel">
        <!-- R3 房间内快速记录入口 -->
        <button
          class="action-btn quick-record-btn"
          :class="{ on: showQuickRecord }"
          type="button"
          :aria-expanded="showQuickRecord"
          aria-controls="study-quick-record"
          @click="showQuickRecord = !showQuickRecord"
        >
          <span class="action-icon">&#x270F;</span>
          <span class="action-info">
            <span class="action-label">在此记录</span>
            <span class="action-desc">{{ showQuickRecord ? '收起语丝，回到书架' : '唤起语丝，直接记在书房' }}</span>
          </span>
          <span class="action-arrow">{{ showQuickRecord ? '▲' : '▼' }}</span>
        </button>
        <Transition name="qr-fade">
          <div v-if="showQuickRecord" id="study-quick-record" class="quick-record-wrap">
            <NaturalLanguageCreate compact :active-room-id="STUDY_ROOM_ID" @created="refreshNotes" />
          </div>
        </Transition>

        <!-- 静默深渊 -->
        <button class="action-btn abyss-btn" @click="goSilentAbyss">
          <span class="action-icon">&#x1F30C;</span>
          <span class="action-info">
            <span class="action-label">静默深渊</span>
            <span class="action-desc">进入安全岛 · 短暂逃离喧嚣</span>
          </span>
          <span class="action-arrow">&rarr;</span>
        </button>
      </section>

      <!-- 导航按钮 -->
      <section class="navigation-panel">
        <h2 class="section-title">
          <span class="section-icon">&#x1F3E0;</span>
          前往其他房间
        </h2>
        <div class="nav-buttons">
          <button
            class="nav-btn"
            @click="emit('navigate', 'living-room')"
          >
            <span class="nav-btn-icon">&#x1F3E0;</span>
            <span class="nav-btn-label">回到客厅</span>
          </button>
          <button
            class="nav-btn"
            @click="emit('navigate', 'yard')"
          >
            <span class="nav-btn-icon">&#x1F3E1;</span>
            <span class="nav-btn-label">走向庭院</span>
          </button>
        </div>
      </section>

      <!-- 详情弹窗（结晶 / 笔记） -->
      <Transition name="crystal-detail-fade">
        <div
          v-if="selectedCrystal || selectedBook"
          class="detail-overlay"
          @click="closeDetail"
        >
          <div class="detail-card" @click.stop>
            <button class="detail-close" @click="closeDetail" aria-label="关闭">&times;</button>

            <!-- 结晶详情 -->
            <template v-if="selectedCrystal">
              <div class="detail-header">
                <span class="detail-badge detail-badge--crystal">时间结晶</span>
                <span class="detail-date">{{ formatDate(selectedCrystal.createdAt) }}</span>
              </div>
              <div class="detail-gem-row">
                <span class="detail-gem" :style="{ color: selectedCrystal.color }">
                  {{ shapeIcon(selectedCrystal.shape) }}
                </span>
                <div class="detail-meta">
                  <span class="detail-inten">凝聚度 {{ Math.round(selectedCrystal.intensity * 100) }}%</span>
                  <span class="detail-shape">形态 · {{ selectedCrystal.shape }}</span>
                </div>
              </div>
              <p v-if="selectedCrystal.insight" class="detail-text">{{ selectedCrystal.insight }}</p>
              <div v-if="selectedCrystal.tags && selectedCrystal.tags.length" class="detail-tags">
                <span v-for="tag in selectedCrystal.tags" :key="tag" class="detail-tag">{{ tag }}</span>
              </div>
            </template>

            <!-- 笔记详情 -->
            <template v-else-if="selectedBook">
              <div class="detail-header">
                <span class="detail-badge detail-badge--note">笔记</span>
                <span class="detail-date">{{ formatDate(selectedBook.updatedAt) }}</span>
              </div>
              <h3 class="detail-title">{{ selectedBook.title || '无标题' }}</h3>
              <p class="detail-text">{{ selectedBook.content }}</p>
              <div
                v-if="selectedBook.roomId || selectedBook.due || selectedBook.assignee || (selectedBook.priority && selectedBook.priority !== 'normal')"
                class="detail-struct"
              >
                <div v-if="selectedBook.roomId" class="detail-struct__row">
                  <span class="detail-struct__k">房间</span>
                  <span class="detail-struct__v">{{ roomName(selectedBook.roomId) }}</span>
                </div>
                <div v-if="selectedBook.due" class="detail-struct__row">
                  <span class="detail-struct__k">截止</span>
                  <span class="detail-struct__v">{{ formatDate(selectedBook.due) }}<template v-if="selectedBook.due.includes('T')"> {{ selectedBook.due.split('T')[1].slice(0, 5) }}</template></span>
                </div>
                <div v-if="selectedBook.assignee" class="detail-struct__row">
                  <span class="detail-struct__k">执行</span>
                  <span class="detail-struct__v">@{{ selectedBook.assignee }}</span>
                </div>
                <div v-if="selectedBook.priority && selectedBook.priority !== 'normal'" class="detail-struct__row">
                  <span class="detail-struct__k">优先级</span>
                  <span class="detail-struct__v" :class="selectedBook.priority === 'high' ? 'detail-struct__v--high' : 'detail-struct__v--low'">{{ selectedBook.priority === 'high' ? '高' : '低' }}</span>
                </div>
              </div>
              <div v-if="selectedBook.tags && selectedBook.tags.length" class="detail-tags">
                <span v-for="tag in selectedBook.tags" :key="tag" class="detail-tag">{{ tag }}</span>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storage } from '../../engine/storage'
import { getHomeRoom } from '../../modules/home/rooms'
import type { Note, TimeCrystal } from '../../types'
import NaturalLanguageCreate from '../NaturalLanguageCreate.vue'

const emit = defineEmits<{
  (e: 'navigate', roomId: string): void
}>()

// R3 房间内快速记录入口：书房自身即 'study' 房间，语丝 compact 预填此 roomId
const STUDY_ROOM_ID = 'study'
const showQuickRecord = ref(false)

// ---- 笔记 / 书架数据 ----
const notes = ref<Note[]>([])

// R3：语丝 compact 创建后刷新书架
function refreshNotes() {
  notes.value = storage.getNotes()
}

// ---- 书房藏量（真实数据联动）----
const noteTotal = computed(() => notes.value.filter((n) => !n.archived).length)
const crystalTotal = computed(() => crystals.value.length)

interface BookshelfCategory {
  name: string
  notes: Note[]
}

// ---- 书架分组视图：按标签 / 按房间（R1） ----
const viewMode = ref<'tag' | 'room'>('tag')

const bookshelfCategories = computed<BookshelfCategory[]>(() => {
  const items = notes.value
  if (items.length === 0) return []

  // 按房间聚合：roomId → 房间名（语丝/镜我落库的 roomId 在此聚拢）
  if (viewMode.value === 'room') {
    const roomMap = new Map<string, Note[]>()
    for (const note of items) {
      if (note.archived) continue
      const key = note.roomId || '__none__'
      if (!roomMap.has(key)) roomMap.set(key, [])
      roomMap.get(key)!.push(note)
    }
    return Array.from(roomMap.entries()).map(([key, catNotes]) => ({
      name: key === '__none__' ? '未归房' : (getHomeRoom(key)?.name ?? key),
      notes: catNotes.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    }))
  }

  // 默认：按标签聚合
  const tagMap = new Map<string, Note[]>()
  for (const note of items) {
    if (note.archived) continue
    const tags = note.tags.length > 0 ? note.tags : ['未分类']
    for (const tag of tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, [])
      tagMap.get(tag)!.push(note)
    }
  }

  return Array.from(tagMap.entries()).map(([name, catNotes]) => ({
    name,
    notes: catNotes.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
  }))
})

// ---- 知识结晶数据 ----
const crystals = ref<TimeCrystal[]>([])

const recentCrystals = computed(() =>
  crystals.value
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
)

// ---- 交互详情 ----
const selectedCrystal = ref<TimeCrystal | null>(null)
const selectedBook = ref<Note | null>(null)

function openCrystal(c: TimeCrystal) {
  selectedCrystal.value = c
}

function openBook(n: Note) {
  selectedBook.value = n
}

function closeDetail() {
  selectedCrystal.value = null
  selectedBook.value = null
}

// ---- 工具函数 ----
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

function roomName(id: string): string {
  return getHomeRoom(id)?.name ?? id
}

function shapeIcon(shape: string): string {
  const icons: Record<string, string> = {
    sphere: '\u25CF',
    tetrahedron: '\u25B2',
    octahedron: '\u25C6',
    dodecahedron: '\u2B21',
    irregular: '\u2726',
  }
  return icons[shape] ?? '\u25CF'
}

// ---- 静默深渊入口 ----
function goSilentAbyss() {
  emit('navigate', 'abyss')
}

// ---- 氛围光色 ----
const ambientStyle = computed(() => ({
  '--ambient-color': '#e8e0d8',
  '--ambient-opacity': 1,
}))

// ---- 初始化 ----
onMounted(() => {
  notes.value = storage.getNotes()
  crystals.value = storage.getCrystals()
})
</script>

<style scoped>
/* ============================================================
   书房 · 深夜食堂暖琥珀主题
   深色背景 + 暖琥珀强调色 var(--amber-100) + 暖白 4000K var(--text-primary)
   ============================================================ */

.study-room {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  background: transparent;
  color: var(--text-primary);
  overflow: hidden;
  font-family: var(--font-body-zh);
}

/* ---- 氛围背景 ---- */
.study-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.atmos-ambient-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 60% 40% at 50% 70%,
      rgba(var(--text-primary-rgb), 0.12) 0%,
      transparent 70%
    ),
    radial-gradient(
      ellipse 40% 30% at 30% 50%,
      rgba(var(--text-primary-rgb), 0.06) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 40% 30% at 70% 50%,
      rgba(var(--text-primary-rgb), 0.05) 0%,
      transparent 60%
    );
}

.atmos-ceiling-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(
    180deg,
    rgba(var(--text-primary-rgb), 0.04) 0%,
    transparent 100%
  );
}

.atmos-lantern-glow {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(
    ellipse 50% 50% at 50% 50%,
    rgba(240, 213, 176, 0.08) 0%,
    transparent 70%
  );
  border-radius: 50%;
}

/* ---- 主内容区 ---- */
.study-content {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px 100px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* ---- 内部区块入场错位动画 ---- */
.study-content > *:not(.detail-overlay) {
  animation: study-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.study-content > *:not(.detail-overlay):nth-child(1) { animation-delay: 0.04s; }
.study-content > *:not(.detail-overlay):nth-child(2) { animation-delay: 0.10s; }
.study-content > *:not(.detail-overlay):nth-child(3) { animation-delay: 0.16s; }
.study-content > *:not(.detail-overlay):nth-child(4) { animation-delay: 0.22s; }
.study-content > *:not(.detail-overlay):nth-child(5) { animation-delay: 0.28s; }
.study-content > *:not(.detail-overlay):nth-child(6) { animation-delay: 0.34s; }

@keyframes study-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .study-content > *:not(.detail-overlay) { animation: none; }
}

/* ---- 头部 ---- */
.study-header {
  text-align: center;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
}

.orn-line {
  display: block;
  width: 48px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(240, 213, 176, 0.2),
    transparent
  );
}

.orn-book {
  font-size: 14px;
  color: rgba(240, 213, 176, 0.5);
  letter-spacing: 2px;
}

.study-title {
  font-size: 26px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.study-subtitle {
  font-size: 13px;
  color: var(--text-low);
  margin: 0;
  letter-spacing: 1px;
}

/* ---- 书房藏量 ---- */
.study-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 12px;
  letter-spacing: 0.5px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.summary-item b {
  color: var(--amber-100);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.summary-sep {
  opacity: 0.3;
}

/* ---- 通用面板标题 ---- */
.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-dim);
  margin: 0;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-icon {
  font-size: 14px;
  line-height: 1;
}

/* 书架分组切换（R1 按标签/按房间） */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 14px;
}

.view-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(240, 213, 176, 0.08);
}

.view-toggle__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  font-size: 10px;
  padding: 4px 9px;
  border: none;
  background: transparent;
  color: rgba(240, 213, 176, 0.4);
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.5px;
  transition: all 0.2s;

  min-height: 26px;
}

.view-toggle__btn.on {
  background: rgba(240, 213, 176, 0.12);
  color: var(--amber-100);
}

/* 笔记卡片结构化标记（R2） */
.book-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.book-meta__item {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 6px;
  color: rgba(240, 213, 176, 0.45);
  background: rgba(240, 213, 176, 0.06);
  border: 1px solid rgba(240, 213, 176, 0.08);
  white-space: nowrap;
}

.book-meta__item--high {
  color: #f0a060;
  border-color: rgba(240, 160, 96, 0.3);
  background: rgba(240, 160, 96, 0.08);
}

.book-meta__item--low {
  color: #9ab0e0;
  border-color: rgba(140, 170, 255, 0.3);
  background: rgba(140, 170, 255, 0.08);
}

/* 笔记详情结构化字段（R2） */
.detail-struct {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(240, 213, 176, 0.08);
}

.detail-struct__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 11px;
}

.detail-struct__k {
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.detail-struct__v {
  color: rgba(240, 242, 255, 0.8);
}

.detail-struct__v--high {
  color: #f0a060;
}

.detail-struct__v--low {
  color: #9ab0e0;
}

/* ---- 空状态 ---- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 20px;
  text-align: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(240, 213, 176, 0.08);
}

.empty-icon {
  font-size: 28px;
  line-height: 1;
  opacity: 0.4;
}

.empty-text {
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

/* ---- 书架 ---- */
.bookshelf-section {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(240, 213, 176, 0.06);
  backdrop-filter: blur(8px);
}

.bookshelf-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.bookshelf-category {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-name {
  font-size: 11px;
  font-weight: 500;
  color: rgba(240, 213, 176, 0.5);
  margin: 0;
  letter-spacing: 0.5px;
  padding: 0 4px;
}

.category-books {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.book-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 120px;
  padding: 12px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(240, 213, 176, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.book-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(
    180deg,
    rgba(240, 213, 176, 0.4),
    rgba(240, 213, 176, 0.1)
  );
  border-radius: 0 2px 2px 0;
}

.book-item:hover {
  background: rgba(0, 0, 0, 0.35);
  border-color: rgba(240, 213, 176, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(240, 213, 176, 0.04);
}

.book-spine {
  display: none;
}

.book-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

.book-date {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.25);
  letter-spacing: 0.3px;
}

/* ---- 知识结晶 ---- */
.crystal-section {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(240, 213, 176, 0.06);
  backdrop-filter: blur(8px);
}

.crystal-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.crystal-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(240, 213, 176, 0.04);
  transition: all 0.3s ease;
  position: relative;
  cursor: pointer;
}

.crystal-card:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(240, 213, 176, 0.08);
  transform: translateY(-2px);
}

.crystal-visual {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crystal-gem {
  position: relative;
  z-index: 1;
  font-size: 24px;
  line-height: 1;
  color: var(--crystal-color, #f0d5b0);
  filter: brightness(1.2);
  transition: all 0.3s ease;
}

.crystal-card:hover .crystal-gem {
  transform: scale(1.15);
  filter: brightness(1.4);
}

.crystal-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(var(--crystal-color, 240, 213, 176), 0.15) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.crystal-card:hover .crystal-glow {
  opacity: 1;
}

.crystal-shape-icon {
  display: block;
  text-align: center;
}

.crystal-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.crystal-inten {
  font-size: 13px;
  font-weight: 500;
  color: var(--crystal-color, #f0d5b0);
  font-variant-numeric: tabular-nums;
}

.crystal-date {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.25);
  letter-spacing: 0.3px;
}

.crystal-insight {
  font-size: 10px;
  color: var(--text-low);
  text-align: center;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
  word-break: break-all;
}

/* ---- 功能入口 ---- */
.action-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 静默深渊入口 */
.action-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 20px;
  border: 1px solid rgba(240, 213, 176, 0.1);
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(240, 213, 176, 0.06) 0%,
    rgba(240, 213, 176, 0.02) 100%
  );
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  text-align: left;
}

.action-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(240, 213, 176, 0.1) 0%,
    rgba(240, 213, 176, 0.04) 100%
  );
  border-color: rgba(240, 213, 176, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(240, 213, 176, 0.04);
}

.action-btn:active {
  transform: translateY(0);
}

.action-icon {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.action-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--amber-100);
  letter-spacing: 0.5px;
}

.action-desc {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.action-arrow {
  font-size: 18px;
  color: rgba(240, 213, 176, 0.3);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.action-btn:hover .action-arrow {
  color: rgba(240, 213, 176, 0.6);
  transform: translateX(3px);
}

/* 静默深渊特殊样式 */
.abyss-btn {
  border-color: rgba(240, 213, 176, 0.12);
  background: linear-gradient(
    135deg,
    rgba(var(--text-primary-rgb), 0.04) 0%,
    rgba(240, 213, 176, 0.02) 100%
  );
}

.abyss-btn:hover {
  border-color: rgba(240, 213, 176, 0.22);
  background: linear-gradient(
    135deg,
    rgba(var(--text-primary-rgb), 0.08) 0%,
    rgba(240, 213, 176, 0.04) 100%
  );
  box-shadow: 0 4px 20px rgba(var(--text-primary-rgb), 0.04);
}

/* ---- R3 房间内快速记录入口 ---- */
.quick-record-btn {
  border-color: rgba(240, 213, 176, 0.22);
  background: linear-gradient(
    135deg,
    rgba(240, 213, 176, 0.14) 0%,
    rgba(240, 213, 176, 0.05) 100%
  );
}

.quick-record-btn:hover {
  border-color: rgba(240, 213, 176, 0.3);
  background: linear-gradient(
    135deg,
    rgba(240, 213, 176, 0.18) 0%,
    rgba(240, 213, 176, 0.07) 100%
  );
}

.quick-record-btn .action-label {
  color: var(--amber-100);
}

.quick-record-btn.on .action-arrow {
  color: rgba(240, 213, 176, 0.7);
  transform: translateY(-1px);
}

.quick-record-wrap {
  border-radius: 14px;
  overflow: hidden;
}

.qr-fade-enter-active,
.qr-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.qr-fade-enter-from,
.qr-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* 键盘焦点可见性（WCAG 2.2）：所有可操作元素焦点时显示轮廓 */
.action-btn:focus-visible,
.view-toggle__btn:focus-visible,
.book-item:focus-visible,
.crystal-card:focus-visible {
  outline: 2px solid var(--amber-100);
  outline-offset: 2px;
}

/* ---- 导航面板 ---- */
.navigation-panel {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(240, 213, 176, 0.06);
}

.nav-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 12px;
  border-radius: 14px;
  border: 1px solid rgba(240, 213, 176, 0.08);
  background: rgba(0, 0, 0, 0.15);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.nav-btn:hover {
  background: rgba(240, 213, 176, 0.06);
  border-color: rgba(240, 213, 176, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(240, 213, 176, 0.03);
}

.nav-btn:active {
  transform: translateY(0);
}

.nav-btn-icon {
  font-size: 24px;
  line-height: 1;
}

.nav-btn-label {
  font-size: 12px;
  color: var(--text-medium);
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
}

.nav-btn:hover .nav-btn-label {
  color: var(--amber-100);
}

/* ---- 详情弹窗 ---- */
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.detail-card {
  width: 340px;
  max-width: 88vw;
  max-height: 72vh;
  overflow-y: auto;
  background: rgba(18, 14, 10, 0.97);
  border: 1px solid rgba(240, 213, 176, 0.14);
  border-radius: 14px;
  padding: 24px 20px 20px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  position: relative;
}

.detail-close {
  position: absolute;
  top: 10px;
  right: 14px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
  transition: color 0.2s ease;
  font-family: inherit;
}

.detail-close:hover {
  color: var(--text-bright);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.detail-badge {
  font-size: 10px;
  letter-spacing: 1px;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid rgba(240, 213, 176, 0.1);
}

.detail-badge--crystal {
  background: rgba(90, 184, 160, 0.12);
  color: #5ab8a0;
  border-color: rgba(90, 184, 160, 0.15);
}

.detail-badge--note {
  background: rgba(240, 213, 176, 0.1);
  color: var(--amber-100);
}

.detail-date {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.detail-gem-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
}

.detail-gem {
  font-size: 44px;
  line-height: 1;
  filter: brightness(1.25);
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-inten {
  font-size: 15px;
  font-weight: 500;
  color: var(--amber-100);
  font-variant-numeric: tabular-nums;
}

.detail-shape {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.detail-title {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-primary);
  margin: 0 0 12px;
  line-height: 1.4;
  letter-spacing: 0.5px;
}

.detail-text {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.6);
  margin: 0 0 14px;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-tag {
  font-size: 9px;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(240, 213, 176, 0.06);
  color: rgba(240, 213, 176, 0.5);
  border: 1px solid rgba(240, 213, 176, 0.06);
}

.crystal-detail-fade-enter-active,
.crystal-detail-fade-leave-active {
  transition: opacity 0.3s ease;
}

.crystal-detail-fade-enter-from,
.crystal-detail-fade-leave-to {
  opacity: 0;
}

.crystal-detail-fade-enter-active .detail-card {
  transition: transform 0.3s ease-out;
}

.crystal-detail-fade-enter-from .detail-card {
  transform: scale(0.94) translateY(8px);
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .study-content {
    padding: 32px 16px 120px;
    gap: 24px;
  }

  .study-title {
    font-size: 22px;
  }

  .crystal-list {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .crystal-card {
    padding: 14px 8px;
  }

  .category-books {
    gap: 6px;
  }

  .book-item {
    width: calc(50% - 3px);
  }

  .action-btn {
    padding: 14px 16px;
  }

  .action-icon {
    font-size: 24px;
  }

  .nav-buttons {
    grid-template-columns: 1fr;
  }

  .nav-btn {
    flex-direction: row;
    justify-content: center;
    padding: 14px 16px;
  }

  .navigation-panel {
    padding: 16px;
  }

  .bookshelf-section {
    padding: 16px;
  }

  .crystal-section {
    padding: 16px;
  }
}

@media (max-width: 400px) {
  .book-item {
    width: 100%;
  }

  .crystal-list {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>