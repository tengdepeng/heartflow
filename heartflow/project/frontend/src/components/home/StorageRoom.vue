<template>
  <div class="storage-room">
    <!-- 氛围背景 -->
    <div class="storage-atmos">
      <div class="atmos-dust-glow"></div>
      <div class="atmos-corner-shadow"></div>
    </div>

    <!-- 主内容区 -->
    <div class="storage-content">
      <!-- 头部 -->
      <header class="storage-header">
        <div class="header-ornament">
          <span class="orn-line"></span>
          <span class="orn-box">&#128230;</span>
          <span class="orn-line"></span>
        </div>
        <h1 class="storage-title">储藏室</h1>
        <p class="storage-subtitle">旧物与未整理的思绪，都收在这里</p>
      </header>

      <!-- 存放的旧物（真实归档数据）-->
      <section class="archive-section">
        <div class="panel-label">
          <span class="panel-label__icon">&#128193;</span>
          <span>存放的旧物</span>
          <span class="panel-count">{{ archivedNotes.length }}</span>
        </div>

        <div class="archive-list">
          <div
            v-for="note in archivedNotes"
            :key="note.id"
            class="archive-item"
            @click="openNote(note)"
          >
            <span class="archive-icon">&#128220;</span>
            <div class="archive-info">
              <span class="archive-name">{{ note.title || '无标题的旧物' }}</span>
              <span class="archive-time">{{ fmtDate(note.createdAt) }}</span>
            </div>
            <span class="archive-arrow">&#8250;</span>
          </div>
          <div v-if="archivedNotes.length === 0" class="archive-empty">
            还没有被归档的旧物，箱柜静静等着
          </div>
        </div>
      </section>

      <!-- 待整理的思绪（本地 KV）-->
      <section class="unsorted-section">
        <div class="panel-label">
          <span class="panel-label__icon">&#10024;</span>
          <span>待整理的思绪</span>
          <span class="panel-count">{{ unsorted.length }}</span>
        </div>

        <div class="unsorted-form">
          <input
            v-model="newThought"
            class="unsorted-input"
            type="text"
            maxlength="80"
            placeholder="一段还没归类的念头…"
            @keydown.enter="addThought"
          />
          <button class="unsorted-add" :disabled="!newThought.trim()" @click="addThought">
            放入
          </button>
        </div>

        <div class="unsorted-list">
          <div
            v-for="(t, idx) in unsorted"
            :key="t.id"
            class="unsorted-item"
          >
            <span class="unsorted-text">{{ t.text }}</span>
            <button class="unsorted-del" @click="removeThought(idx)" aria-label="取出">×</button>
          </div>
          <div v-if="unsorted.length === 0" class="unsorted-empty">
            思绪都整理得井井有条，这里很空
          </div>
        </div>
      </section>

      <!-- 导航 -->
      <section class="navigation-panel">
        <button class="nav-btn" @click="emit('navigate', 'wardrobe')">
          <span class="nav-btn-icon">&#128084;</span>
          <span class="nav-btn-label">走向衣帽间</span>
        </button>
      </section>
    </div>

    <!-- 旧物详情 -->
    <Transition name="detail-fade">
      <div v-if="selectedNote" class="note-overlay" @click.self="closeNote">
        <div class="note-detail">
          <div class="detail-header">
            <span class="detail-type">归档旧物</span>
            <button class="detail-close" @click="closeNote">×</button>
          </div>
          <h3 class="detail-title">{{ selectedNote.title || '无标题的旧物' }}</h3>
          <p class="detail-date">{{ fmtDate(selectedNote.createdAt) }}</p>
          <p class="detail-body">{{ selectedNote.content || '（这只旧纸箱里没有文字，只有一段被收起来的时光）' }}</p>
          <div v-if="selectedNote.tags && selectedNote.tags.length" class="detail-tags">
            <span v-for="tag in selectedNote.tags" :key="tag" class="detail-tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storage } from '../../engine/storage'

const emit = defineEmits<{
  (e: 'navigate', roomId: string): void
}>()

// ---- 存放的旧物（真实归档笔记）----
interface NoteItem {
  id: string
  title?: string
  content?: string
  createdAt: string
  tags?: string[]
  archived?: boolean
}

const archivedNotes = ref<NoteItem[]>([])

function loadArchived() {
  const notes = storage.getNotes() as NoteItem[]
  archivedNotes.value = notes
    .filter((n) => n.archived)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30)
}

const selectedNote = ref<NoteItem | null>(null)
function openNote(note: NoteItem) {
  selectedNote.value = note
}
function closeNote() {
  selectedNote.value = null
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ---- 待整理的思绪（本地 KV）----
const KV_PREFIX = 'hf:home:storage'
interface Thought {
  id: string
  text: string
}

const unsorted = ref<Thought[]>([])
const newThought = ref('')

function loadUnsorted() {
  unsorted.value = storage.getKV<Thought[]>(`${KV_PREFIX}:unsorted`, [])
}

function addThought() {
  const text = newThought.value.trim()
  if (!text) return
  unsorted.value = [
    { id: `t-${Date.now()}`, text },
    ...unsorted.value,
  ].slice(0, 50)
  storage.setKV(`${KV_PREFIX}:unsorted`, unsorted.value)
  newThought.value = ''
}

function removeThought(idx: number) {
  unsorted.value.splice(idx, 1)
  storage.setKV(`${KV_PREFIX}:unsorted`, unsorted.value)
}

onMounted(() => {
  loadArchived()
  loadUnsorted()
})
</script>

<style scoped>
/* ============================================================
   储藏室 · 深夜食堂暖琥珀主题
   深色背景 + 暖灰强调色 (#b8a890)
   ============================================================ */

.storage-room {
  position: relative;
  min-height: 100vh;
  background: transparent;
  color: var(--text-primary);
  overflow: hidden;
  font-family: var(--font-body-zh);
}

/* ---- 氛围背景 ---- */
.storage-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.atmos-dust-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 50% 30% at 50% 30%, rgba(184, 168, 144, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 40% 30% at 30% 60%, rgba(184, 168, 144, 0.03) 0%, transparent 50%);
  animation: storage-breathe 10s ease-in-out infinite;
}

@keyframes storage-breathe {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.atmos-corner-shadow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.25), transparent);
}

/* ---- 主内容区 ---- */
.storage-content {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px 100px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ---- 头部 ---- */
.storage-header {
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
    rgba(184, 168, 144, 0.25),
    transparent
  );
}

.orn-box {
  font-size: 14px;
  color: rgba(184, 168, 144, 0.55);
  letter-spacing: 2px;
}

.storage-title {
  font-size: 26px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.storage-subtitle {
  font-size: 13px;
  color: var(--text-low);
  margin: 0;
  letter-spacing: 1px;
}

/* ---- 面板标签 ---- */
.panel-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 13px;
  letter-spacing: 1px;
  color: var(--text-secondary);
}

.panel-label__icon {
  font-size: 15px;
  opacity: 0.6;
}

.panel-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
}

/* ---- 存放的旧物 ---- */
.archive-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.archive-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(184, 168, 144, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
}

.archive-item:hover {
  background: rgba(184, 168, 144, 0.05);
  border-color: rgba(184, 168, 144, 0.18);
  transform: translateX(2px);
}

.archive-icon {
  font-size: 18px;
  flex-shrink: 0;
  opacity: 0.7;
}

.archive-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.archive-name {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.archive-time {
  font-size: 11px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.archive-arrow {
  font-size: 18px;
  color: var(--text-faint);
  transition: transform 0.3s ease;
}

.archive-item:hover .archive-arrow {
  transform: translateX(3px);
  color: rgba(184, 168, 144, 0.6);
}

.archive-empty {
  padding: 20px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
  letter-spacing: 0.5px;
}

/* ---- 待整理的思绪 ---- */
.unsorted-form {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.unsorted-input {
  flex: 1;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(184, 168, 144, 0.12);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.3s ease;
}

.unsorted-input:focus {
  outline: none;
  border-color: rgba(184, 168, 144, 0.3);
}

.unsorted-input::placeholder {
  color: var(--text-faint);
}

.unsorted-add {
  flex-shrink: 0;
  padding: 0 20px;
  border: 1px solid rgba(184, 168, 144, 0.18);
  border-radius: 12px;
  background: rgba(184, 168, 144, 0.08);
  color: #b8a890;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.unsorted-add:hover:not(:disabled) {
  background: rgba(184, 168, 144, 0.14);
  border-color: rgba(184, 168, 144, 0.3);
}

.unsorted-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.unsorted-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.unsorted-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(184, 168, 144, 0.12);
}

.unsorted-text {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.unsorted-del {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-faint);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.unsorted-del:hover {
  background: rgba(192, 80, 80, 0.12);
  color: #c05050;
}

.unsorted-empty {
  padding: 16px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
  letter-spacing: 0.5px;
}

/* ---- 导航面板 ---- */
.navigation-panel {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  border-radius: 14px;
  border: 1px solid rgba(184, 168, 144, 0.12);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  font-size: 14px;
}

.nav-btn:hover {
  background: rgba(184, 168, 144, 0.06);
  border-color: rgba(184, 168, 144, 0.22);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(184, 168, 144, 0.04);
}

.nav-btn:active {
  transform: translateY(0);
}

.nav-btn-icon {
  font-size: 20px;
  line-height: 1;
}

.nav-btn-label {
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
}

.nav-btn:hover .nav-btn-label {
  color: #b8a890;
}

/* ---- 旧物详情 ---- */
.note-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(8, 6, 4, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.note-detail {
  width: 100%;
  max-width: 440px;
  padding: 24px;
  border-radius: 18px;
  background: linear-gradient(160deg, #1a1612 0%, #12100c 100%);
  border: 1px solid rgba(184, 168, 144, 0.16);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.detail-type {
  font-size: 11px;
  letter-spacing: 1px;
  color: #b8a890;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(184, 168, 144, 0.1);
}

.detail-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.detail-close:hover {
  background: rgba(192, 80, 80, 0.14);
  color: #c05050;
}

.detail-title {
  font-size: 17px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 6px;
  letter-spacing: 0.5px;
}

.detail-date {
  font-size: 11px;
  color: var(--text-faint);
  margin: 0 0 14px;
  font-variant-numeric: tabular-nums;
}

.detail-body {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
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
  font-size: 10px;
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-fade-enter-active,
.detail-fade-leave-active {
  transition: opacity 0.25s ease;
}

.detail-fade-enter-from,
.detail-fade-leave-to {
  opacity: 0;
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .storage-content {
    padding: 32px 16px 80px;
    gap: 24px;
  }

  .storage-title {
    font-size: 22px;
  }

  .note-detail {
    padding: 20px;
  }
}
</style>
