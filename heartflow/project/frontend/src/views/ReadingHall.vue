<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance rh">
    <!-- 装饰性头部 -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">在书卷中寻找答案</p>
    <h1 class="rh-title">阅览殿</h1>

    <!-- 概览卡片 -->
    <div data-enter class="overview-cards">
      <div class="overview-card">
        <span class="overview-num">{{ sessions.length }}</span>
        <span class="overview-label">专注次数</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ totalFocusMinutes }}</span>
        <span class="overview-label">专注时长(分钟)</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ crystalCount }}</span>
        <span class="overview-label">结晶数</span>
      </div>
    </div>

    <!-- 选项卡 -->
    <div data-enter class="rh-tab-bar">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['rh-tab', { active: activeTab === t.key }]"
        @click="activeTab = t.key"
      >{{ t.label }}</button>
    </div>

    <!-- ========== 书卷 ========== -->
    <div data-enter v-if="activeTab === 'book'" class="rh-panel rh-book-panel">
      <!-- 无文本时：来源输入 -->
      <div v-if="!readingText" class="rh-source-area">
        <textarea
          v-model="pastedText"
          class="rh-textarea"
          placeholder="在此粘贴文本内容……"
          rows="12"
        ></textarea>
        <div class="rh-actions">
          <button class="rh-btn" :disabled="!pastedText.trim()" @click="loadPastedText">载入</button>
          <label class="rh-btn rh-upload-label">
            上传 .txt 文件
            <input type="file" accept=".txt" hidden @change="handleFileUpload" />
          </label>
        </div>
      </div>

      <!-- 有文本时：阅读区域 -->
      <div v-else class="reading-area">
        <div class="reading-toolbar">
          <span class="reading-label">阅读</span>
          <button class="text-btn" @click="clearReadingText">清除文本</button>
        </div>
        <div class="reading-content" ref="readingRef" @mouseup="onTextSelect">
          <p
            v-for="(para, idx) in paragraphs"
            :key="idx"
            :class="['rh-paragraph', { highlighted: paraHighlighted.has(idx) }]"
            @click="onParagraphClick(idx, para)"
          >{{ para }}</p>
        </div>
        <!-- 选中文本后的摘录按钮 -->
        <div v-if="pendingText" class="excerpt-float-bar">
          <span class="float-preview">"{{ pendingText.slice(0, 60) }}{{ pendingText.length > 60 ? '…' : '' }}"</span>
          <button class="rh-btn excerpt-btn" @click="openExcerptDialog">摘录</button>
        </div>
      </div>
    </div>

    <!-- ========== 摘录集 ========== -->
    <div data-enter v-if="activeTab === 'excerpts'" class="rh-panel excerpts-panel">
      <div v-if="excerpts.length === 0" class="empty-state">
        <p>还没有摘录。</p>
        <p class="empty-hint">在书卷中阅读时，选中文字即可摘录。</p>
      </div>
      <div v-else class="rh-excerpts-list">
        <div v-for="ex in excerpts" :key="ex.id" class="rh-excerpt-card">
          <div class="excerpt-original">"{{ ex.text }}"</div>
          <div v-if="ex.note" class="rh-excerpt-note">{{ ex.note }}</div>
          <div class="excerpt-meta">
            <span class="meta-source">{{ ex.source || '未命名文本' }}</span>
            <span class="meta-time">{{ formatTime(ex.createdAt) }}</span>
          </div>
          <button class="text-btn delete-btn" @click="deleteExcerpt(ex.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- ========== 回顾 ========== -->
    <div data-enter v-if="activeTab === 'review'" class="rh-panel rh-review-panel">
      <div class="rh-review-stats">
        <div class="rh-review-stat">
          <span class="review-num">{{ totalFocusMinutes }}</span>
          <span class="review-label">专注总时间（分钟）</span>
        </div>
        <div class="rh-review-stat">
          <span class="review-num">{{ crystalCount }}</span>
          <span class="review-label">结晶数</span>
        </div>
        <div class="rh-review-stat">
          <span class="review-num">{{ noteCount }}</span>
          <span class="review-label">笔记数</span>
        </div>
        <div class="rh-review-stat">
          <span class="review-num">{{ emotionCount }}</span>
          <span class="review-label">情绪记录数</span>
        </div>
      </div>

      <!-- 阅读洞察 -->
      <div class="rh-insights-section">
        <h3 class="rh-insights-title">阅读洞察</h3>
        <div class="rh-review-stats">
          <div class="rh-review-stat">
            <span class="review-num">{{ readingAnalytics.totalBooks }}</span>
            <span class="review-label">藏书数</span>
          </div>
          <div class="rh-review-stat">
            <span class="review-num">{{ readingAnalytics.totalPages }}</span>
            <span class="review-label">总页数</span>
          </div>
          <div class="rh-review-stat">
            <span class="review-num">{{ readingAnalytics.streak }}</span>
            <span class="review-label">连续阅读天</span>
          </div>
          <div class="rh-review-stat">
            <span class="review-num">{{ speedStats.averageWPM }}</span>
            <span class="review-label">均速(字/分)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 阅读总览仪表盘（INCR-160：已构建但从未接线的 reading-bridge + useReadingDashboard） -->
    <ReadingDashboardPanel />

    <!-- 间隔重复面板（P2 收口） -->
    <ReadingSrsPanel />

    <!-- 古籍竖排 -->
    <ClassicalVerticalPanel />

    <!-- 阅读习惯分析（reading·useReadingHabits） -->
    <ReadingHabitsPanel />

    <!-- 荐书面板（INCR-173：补挂载孤儿面板，reading 引擎完备） -->
    <BookRecommendationsPanel />

    <!-- 阅读挑战面板（INCR-173：补挂载孤儿面板，reading·useReadingChallenges 完备） -->
    <ReadingChallengesPanel />

    <!-- ========== 摘录对话框 ========== -->
    <div data-enter v-if="showDialog" class="rh-dialog-overlay" @click.self="closeDialog">
      <div class="rh-dialog-card">
        <div class="dialog-original">"{{ pendingText }}"</div>
        <textarea
          v-model="excerptNote"
          class="dialog-input"
          placeholder="添加批注感悟……"
          rows="4"
        ></textarea>
        <div class="rh-dialog-actions">
          <button class="text-btn" @click="closeDialog">取消</button>
          <button class="rh-btn" @click="confirmExcerpt">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storage } from '../engine/storage'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useReadingInsights, useReadingSpeed, useReading } from '../modules/reading'
import type { Excerpt } from '../modules/reading'
import ReadingSrsPanel from '../components/ReadingSrsPanel.vue'
import ClassicalVerticalPanel from '../components/ClassicalVerticalPanel.vue'
import ReadingHabitsPanel from '../components/ReadingHabitsPanel.vue'
import ReadingDashboardPanel from '../components/ReadingDashboardPanel.vue'
import BookRecommendationsPanel from '../components/BookRecommendationsPanel.vue'
import ReadingChallengesPanel from '../components/ReadingChallengesPanel.vue'

// ---- 选项卡 ----
const { entranceRef, entranceClass } = useViewEntrance()
const readingInsights = useReadingInsights()
const readingSpeed = useReadingSpeed()
const tabs = [
  { key: 'book', label: '书卷' },
  { key: 'excerpts', label: '摘录集' },
  { key: 'review', label: '回顾' },
] as const
const activeTab = ref<'book' | 'excerpts' | 'review'>('book')

// ---- 阅读文本 ----
const reading = useReading()
const { readingText, excerpts } = reading

const pastedText = ref('')
const readingRef = ref<HTMLElement | null>(null)

// 当前选中的待摘录文本
const pendingText = ref('')
const showDialog = ref(false)
const excerptNote = ref('')

// 段落
const paragraphs = computed(() => {
  if (!readingText.value) return []
  return readingText.value.split(/\n+/).filter(p => p.trim())
})

// 已摘录的段落索引集合
const paraHighlighted = computed(() => {
  const set = new Set<number>()
  const paras = paragraphs.value
  for (let i = 0; i < paras.length; i++) {
    const paraText = paras[i].trim()
    if (excerpts.value.some(ex => paraText.includes(ex.text.trim()) || ex.text.trim().includes(paraText))) {
      set.add(i)
    }
  }
  return set
})

// ---- 摘录持久化（数据层由 useReading 提供） ----

// ---- 文本载入 ----
function loadPastedText() {
  if (!pastedText.value.trim()) return
  readingText.value = pastedText.value
  pastedText.value = ''
  reading.saveText()
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const text = reader.result as string
    if (text) {
      readingText.value = text
      reading.saveText()
    }
  }
  reader.readAsText(file)
  input.value = '' // allow re-upload
}

function clearReadingText() {
  readingText.value = ''
  pendingText.value = ''
  reading.saveText()
}

// ---- 文本选择 ----
function onParagraphClick(_idx: number, text: string) {
  // 点击段落 = 选中该段全部文字
  pendingText.value = text
}

function onTextSelect() {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) {
    // 未选中文字时不自动清除 pendingText，保留段落点击的结果
    return
  }
  const text = sel.toString().trim()
  if (text) {
    pendingText.value = text
  }
}

// ---- 摘录操作 ----
function openExcerptDialog() {
  if (!pendingText.value) return
  showDialog.value = true
  excerptNote.value = ''
}

function closeDialog() {
  showDialog.value = false
  excerptNote.value = ''
  pendingText.value = ''
}

function confirmExcerpt() {
  if (!pendingText.value) return
  const ex: Excerpt = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    source: '当前文本',
    text: pendingText.value,
    note: excerptNote.value.trim(),
    createdAt: new Date().toISOString(),
  }
  excerpts.value.push(ex)
  reading.saveExcerpts()
  closeDialog()
}

function deleteExcerpt(id: string) {
  excerpts.value = excerpts.value.filter(e => e.id !== id)
  reading.saveExcerpts()
}

// ---- 时间格式化 ----
function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ---- 回顾统计 ----
const sessions = computed(() => storage.getSessions().filter(s => s.status === 'completed'))
const totalFocusMinutes = computed(() => {
  return Math.round(sessions.value.reduce((sum, s) => sum + s.elapsed / 60000, 0))
})
const crystalCount = computed(() => storage.getCrystals().length)
const noteCount = computed(() => storage.getNotes().length)
const emotionCount = computed(() => storage.getEmotions().length)

// ---- 阅读洞察（来自 reading 模块） ----
const readingAnalytics = computed(() => {
  const a = readingInsights.analytics.value
  return {
    totalBooks: a.totalBooks,
    totalPages: a.totalPages,
    totalReadingTime: a.totalReadingTime,
    avgReadingSpeed: a.avgReadingSpeed,
    monthlyBooks: a.monthlyBooks,
    monthlyReadingTime: a.monthlyReadingTime,
    streak: a.streak,
    bestReadingDay: a.bestReadingDay,
  }
})

const speedStats = computed(() => readingSpeed.computeSpeedStats())

// ---- 初始化 ----
onMounted(reading.load)
</script>

<style scoped>
/* =============================================
   深夜食堂 · 暖琥珀
   阅览殿 — 在书卷中寻找答案
   ============================================= */

/* ---- 环境光晕 ---- */
.rh {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  overflow-y: auto;
  background: transparent;
}

.rh::before,
.rh::after {
  content: '';
  position: fixed;
  top: 0;
  width: 220px;
  height: 100dvh;
  pointer-events: none;
  z-index: 0;
}

.rh::before {
  left: 0;
  background: radial-gradient(ellipse at left center, rgba(var(--accent-rgb), 0.05), transparent 70%);
}

.rh::after {
  right: 0;
  background: radial-gradient(ellipse at right center, rgba(var(--accent-rgb), 0.05), transparent 70%);
}

/* ---- 装饰性头部 ---- */
.header-ornament {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0;
  margin-bottom: 10px;
}

.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.25), transparent);
}

.orn-diamond {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
}

.header-kicker {
  position: relative;
  z-index: 1;
  text-align: center;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.3);
  letter-spacing: 4px;
  margin: 0 0 6px;
}

.rh-title {
  position: relative;
  z-index: 1;
  text-align: center;
  font-family: var(--font-heading-en);
  font-size: 28px;
  font-weight: 400;
  color: rgba(var(--accent-rgb), 0.75);
  letter-spacing: 6px;
  margin: 0 0 20px;
}

/* ---- 概览卡片 ---- */
.overview-cards {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.overview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  min-width: 72px;
  flex: 1;
}

.overview-num {
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.overview-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
  white-space: nowrap;
}

/* ---- 选项卡 ---- */
.rh-tab-bar {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 4px;
  background: var(--card-bg);
  border-radius: 10px;
  padding: 3px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-bottom: 16px;
}

.rh-tab {
  flex: 1;
  padding: 7px 0;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.3px;
}

.rh-tab:hover {
  color: rgba(var(--text-primary-rgb), 0.75);
}

.rh-tab.active {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}

/* ---- 面板通用 ---- */
.rh-panel {
  position: relative;
  z-index: 1;
}

/* ---- 书卷：来源输入 ---- */
.rh-source-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 12px;
}

.rh-textarea {
  width: 100%;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.25s;
}

.rh-textarea::placeholder {
  color: var(--text-secondary);
}

.rh-textarea:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.25);
}

.rh-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

/* ---- 通用按钮 ---- */
.rh-btn {
  padding: 8px 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.rh-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.15);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.rh-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.text-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-low);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.text-btn:hover {
  color: rgba(var(--text-primary-rgb), 0.6);
  background: rgba(255, 255, 255, 0.04);
}

.rh-upload-label {
  display: inline-block;
  cursor: pointer;
}

/* ---- 书卷：阅读区域 ---- */
.reading-area {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.reading-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.08);
  flex-shrink: 0;
}

.reading-label {
  font-size: 13px;
  color: var(--text-low);
}

.reading-content {
  padding: 20px 0;
  user-select: text;
}

.rh-paragraph {
  font-size: 15px;
  line-height: 1.8;
  color: rgba(var(--text-primary-rgb), 0.78);
  margin: 0 0 16px 0;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.rh-paragraph:hover {
  background: rgba(var(--accent-rgb), 0.04);
}

.rh-paragraph.highlighted {
  background: rgba(var(--accent-rgb), 0.12);
  border-left: 3px solid rgba(var(--accent-rgb), 0.5);
  padding-left: 7px;
}

/* 摘录浮条 */
.excerpt-float-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(20, 16, 11, 0.95);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 10px;
  position: sticky;
  bottom: 0;
  margin-top: 8px;
  backdrop-filter: blur(8px);
}

.float-preview {
  flex: 1;
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 摘录集 ---- */
.excerpts-panel {
  padding-top: 4px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state p {
  margin: 0 0 6px;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.18);
}

.rh-excerpts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rh-excerpt-card {
  padding: 16px 20px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
  border-left: 3px solid rgba(var(--accent-rgb), 0.2);
  transition: background 0.2s;
}

.rh-excerpt-card:hover {
  background: var(--bg-card);
}

.excerpt-original {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-bright);
  margin-bottom: 8px;
  font-style: italic;
}

.rh-excerpt-note {
  font-size: 13px;
  line-height: 1.5;
  color: var(--accent);
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.06);
  margin-bottom: 8px;
}

.excerpt-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.25);
}

.delete-btn {
  margin-top: 8px;
  color: rgba(224, 112, 80, 0.4);
}

.delete-btn:hover {
  color: rgba(224, 112, 80, 0.7);
  background: rgba(224, 112, 80, 0.06);
}

/* ---- 回顾 ---- */
.rh-review-panel {
  padding-top: 4px;
}

.rh-review-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-top: 8px;
}

.rh-review-stat {
  text-align: center;
  padding: 24px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.review-num {
  display: block;
  font-size: 26px;
  font-weight: 500;
  color: var(--accent);
  margin-bottom: 6px;
  line-height: 1.2;
}

.review-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
}

/* ---- 阅读洞察 ---- */
.rh-insights-section {
  margin-top: 24px;
}

.rh-insights-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  margin: 0 0 10px;
  letter-spacing: 1px;
}

/* ---- 对话框 ---- */
.rh-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 8, 6, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.rh-dialog-card {
  width: 400px;
  max-width: 90vw;
  padding: 24px;
  max-height: 86vh;
  overflow-y: auto;
  border-radius: 14px;
  background: var(--bg-deep);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.dialog-original {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(var(--text-primary-rgb), 0.6);
  font-style: italic;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  max-height: 120px;
  overflow-y: auto;
}

.dialog-input {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
  margin-bottom: 16px;
  transition: border-color 0.25s;
}

.dialog-input::placeholder {
  color: var(--text-secondary);
}

.dialog-input:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.25);
}

.rh-dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* 滚动条 */
.rh::-webkit-scrollbar {
  width: 4px;
}

.rh::-webkit-scrollbar-track {
  background: transparent;
}

.rh::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-rgb), 0.1);
  border-radius: 2px;
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .rh {
    padding: 28px 16px 80px;
  }

  .header-ornament {
    gap: 8px;
    margin-bottom: 8px;
  }

  .orn-line {
    width: 36px;
  }

  .orn-diamond {
    font-size: 8px;
  }

  .header-kicker {
    font-size: 10px;
    letter-spacing: 2px;
  }

  .rh-title {
    font-size: 22px;
    letter-spacing: 4px;
    margin-bottom: 16px;
  }

  .overview-cards {
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }

  .overview-card {
    padding: 8px 12px;
    min-width: 56px;
    flex: 1;
  }

  .overview-num {
    font-size: 16px;
  }

  .overview-label {
    font-size: 9px;
  }

  .rh-tab-bar {
    margin-bottom: 12px;
  }

  .rh-tab {
    font-size: 12px;
    padding: 6px 0;
  }

  .rh-source-area {
    gap: 12px;
  }

  .rh-textarea {
    padding: 12px;
    font-size: 13px;
  }

  .rh-actions {
    gap: 8px;
  }

  .rh-btn {
    padding: 7px 16px;
    font-size: 12px;
  }

  .reading-toolbar {
    flex-wrap: wrap;
    gap: 6px;
  }

  .reading-content {
    padding: 14px 0;
  }

  .rh-paragraph {
    font-size: 14px;
    line-height: 1.7;
    padding: 4px 8px;
  }

  .excerpt-float-bar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
  }

  .float-preview {
    font-size: 12px;
    width: 100%;
  }

  .rh-excerpt-card {
    padding: 12px 16px;
  }

  .excerpt-original {
    font-size: 13px;
  }

  .rh-excerpt-note {
    font-size: 12px;
    padding: 6px 10px;
  }

  .excerpt-meta {
    gap: 8px;
    font-size: 10px;
  }

  .rh-review-stats {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .rh-review-stat {
    padding: 16px 12px;
  }

  .review-num {
    font-size: 22px;
  }

  .review-label {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .rh {
    padding: 24px 12px 80px;
  }

  .header-ornament {
    gap: 6px;
  }

  .orn-line {
    width: 24px;
  }

  .rh-title {
    font-size: 20px;
    letter-spacing: 3px;
  }

  .overview-cards {
    flex-direction: column;
    gap: 6px;
  }

  .overview-card {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    min-height: 36px;
  }

  .overview-num {
    font-size: 14px;
    min-width: 24px;
  }

  .overview-label {
    font-size: 11px;
  }

  .rh-tab {
    font-size: 11px;
    padding: 5px 0;
  }

  .rh-textarea {
    padding: 10px;
    font-size: 12px;
  }

  .rh-btn {
    padding: 6px 12px;
    font-size: 11px;
  }

  .rh-review-stats {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .rh-review-stat {
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .review-num {
    font-size: 20px;
    margin-bottom: 0;
    min-width: 36px;
  }

  .review-label {
    font-size: 11px;
  }

  .rh-dialog-card {
    padding: 16px;
  }

  .dialog-original {
    font-size: 13px;
    max-height: 100px;
  }

  .dialog-input {
    font-size: 12px;
    padding: 10px;
  }
}
</style>