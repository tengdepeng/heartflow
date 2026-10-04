<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance rh">
    <RoomLayout title="阅览殿" kicker="在书卷中寻找答案" data-enter>
      <template #meta>
        <div class="overview-cards">
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
      </template>

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
            上传 .txt / .epub / .pdf
            <input type="file" accept=".txt,.epub,.pdf" hidden @change="handleFileUpload" />
          </label>
        </div>
      </div>

      <!-- 有文本时：阅读区域 -->
      <div v-else class="reading-area">
        <div class="reading-toolbar">
          <span class="reading-label">{{ activeBookTitle || '阅读' }}</span>
          <button class="text-btn" @click="clearReadingText">清除文本</button>
        </div>
        <div class="reading-content" ref="readingRef" @mouseup="onTextSelect" @scroll="onReaderScroll">
          <p
            v-for="(para, idx) in paragraphs"
            :key="idx"
            :class="['rh-paragraph', { highlighted: paragraphMark.has(idx) }]"
            :style="paragraphMark.has(idx) ? { '--para-mark': paragraphMark.get(idx) } : undefined"
            @click="onParagraphClick(idx, para)"
          >{{ para }}</p>
        </div>
        <!-- 听书 · 本地朗读控制（INCR-276 补挂载孤儿组件 TtsControlPanel，reading/tts 引擎完备） -->
        <TtsControlPanel :text="readingText" />
        <!-- 选中文本后的摘录按钮 -->
        <div v-if="pendingText" class="excerpt-float-bar">
          <span class="float-preview">"{{ pendingText.slice(0, 60) }}{{ pendingText.length > 60 ? '…' : '' }}"</span>
          <button class="rh-btn excerpt-btn" @click="openExcerptDialog">摘录</button>
          <button class="rh-btn excerpt-btn flow-btn" @click="flowHighlight">流入思绪书房</button>
          <span v-if="flowedHint" class="flow-hint">已归入思绪书房</span>
        </div>
      </div>
    </div>

    <!-- ========== 摘录集 ========== -->
    <div data-enter v-if="activeTab === 'excerpts'" class="rh-panel excerpts-panel">
      <EmptyState
        v-if="excerpts.length === 0"
        icon=""
        title="还没有摘录。"
        hint="在书卷中阅读时，选中文字即可摘录。"
        :glow="false"
        cta-label=""
      />
      <div v-else>
        <div class="rh-export-bar">
          <span class="rh-export-hint">本地私有 · 仅存于本机</span>
          <div class="rh-export-actions">
            <button class="rh-btn rh-export-btn" data-test="export-excerpts" @click="readingExport.exportExcerpts">导出摘录(MD)</button>
            <button
              class="rh-btn rh-export-btn"
              data-test="export-all-json"
              :disabled="!excerpts.length && !readingExport.memoCount.value"
              @click="readingExport.exportAllJson"
            >导出全部(JSON)</button>
          </div>
        </div>
        <!-- 多色标记筛选栏（INCR-477） -->
        <div class="rh-mark-bar">
          <button
            class="rh-mark-chip"
            :class="{ active: markFilter === '' }"
            @click="markFilter = ''"
          >全部 {{ excerpts.length }}</button>
          <button
            v-for="s in markStats"
            :key="s.color.id"
            class="rh-mark-chip"
            :class="{ active: markFilter === s.color.value }"
            :title="s.color.label"
            @click="markFilter = markFilter === s.color.value ? '' : s.color.value"
          >
            <span class="rh-mark-dot" :style="{ background: s.color.value }"></span>{{ s.count }}
          </button>
        </div>
        <div class="rh-excerpts-list">
          <div
            v-for="ex in filteredExcerpts"
            :key="ex.id"
            class="rh-excerpt-card"
            :style="{ '--ex-mark': excerptMarkColor(ex) }"
          >
            <div class="excerpt-original">"{{ ex.text }}"</div>
            <div v-if="ex.note" class="rh-excerpt-note">{{ ex.note }}</div>
            <div class="excerpt-meta">
              <span class="meta-source">{{ ex.source || '未命名文本' }}</span>
              <span class="meta-time">{{ formatTime(ex.createdAt) }}</span>
            </div>
            <div class="excerpt-mark-picker">
              <button
                v-for="c in EXCERPT_MARK_COLORS"
                :key="c.id"
                class="excerpt-mark-swatch"
                :class="{ active: excerptMarkColor(ex) === c.value }"
                :style="{ background: c.value }"
                :title="c.label"
                @click="setExcerptMark(ex.id, c.value)"
              ></button>
            </div>
            <button class="text-btn delete-btn" @click="deleteExcerpt(ex.id)">删除</button>
          </div>
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

    <!-- ========== 书架（接 hall 引擎：增书/改状态/记会话/评分/目标） ========== -->
    <div data-enter v-if="activeTab === 'shelf'" class="rh-panel rh-shelf-panel">
      <BookShelfPanel @open-reading="openBookForReading" />
    </div>

    <!-- ========== 待读箱（乙-3：本地 content_snapshot，打开阅读 / 转正书架） ========== -->
    <div data-enter v-if="activeTab === 'inbox'" class="rh-panel rh-inbox-panel">
      <ReadingInboxPanel @open-item="openInboxItem" />
    </div>

    <!-- ========== 人生之书（路线甲：呼吸书 + 正/侧/横三维 + 8 维剖面） ========== -->
    <div data-enter v-if="activeTab === 'lifebook'" class="rh-panel rh-lifebook-panel">
      <LifeBookPanel />
    </div>

    <!-- ========== 读书便签（轻量随手记，独立于书评笔记系统） ========== -->
    <div data-enter v-if="activeTab === 'memo'" class="rh-panel rh-memo-panel">
      <ReadingMemoPanel :book-id="activeBookId" :book-title="activeBookTitle" />
    </div>

    <!-- ========== 阅读日历·热力图（#38：按日聚合阅读时长，月级热力小格） ========== -->
    <div data-enter v-if="activeTab === 'calendar'" class="rh-panel rh-calendar-panel">
      <ReadingCalendarPanel />
    </div>

    <!-- ========== 金句墙（#39：摘录卡片墙，数据源同书卷摘录集） ========== -->
    <div data-enter v-if="activeTab === 'quote'" class="rh-panel rh-quote-panel">
      <ReadingQuoteWallPanel />
    </div>

    <!-- ========== 年度阅读报告（#40：聚合 hall/insights/speed 的年度报告） ========== -->
    <div data-enter v-if="activeTab === 'report'" class="rh-panel rh-report-panel">
      <ReadingReportPanel />
    </div>

    <!-- ========== 阅读速度·洞察（补挂孤儿 API：reading-speed / reading-insights） ========== -->
    <div data-enter v-if="activeTab === 'speed'" class="rh-panel rh-speed-panel">
      <ReadingSpeedInsightPanel />
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

    <!-- 书评 · 笔记面板（INCR-239：补挂载孤儿组件 BookReviewsPanel，reading·useBookReviews/useReadingNotes 完备） -->
    <BookReviewsPanel />

    <!-- 跨房间共鸣态势（仅其他房间，过滤本房回声）· 阅览殿已纳入 RoomKey -->
    <section data-enter class="cross-room-climate">
      <h2 class="climate-title">跨房间共鸣态势</h2>
      <EmptyState v-if="externalFeed.length === 0" icon="" title="各房间尚在静默，去其他房间留一道光痕吧。" :glow="false" cta-label="" />
      <ul v-else class="climate-list">
        <li v-for="s in externalFeed" :key="s.room" class="climate-item">
          <span class="climate-room">{{ roomLabel(s.room) }}</span>
          <span class="climate-signal">{{ s.label }}</span>
        </li>
      </ul>
    </section>

    <!-- ========== 摘录对话框 ========== -->
    <div data-enter v-if="showDialog" class="rh-dialog-overlay" @click.self="closeDialog">
      <div class="rh-dialog-card">
        <div class="dialog-original">"{{ pendingText }}"</div>
        <!-- 标记色选择（INCR-477） -->
        <div class="dialog-mark-row">
          <span class="dialog-mark-label">标记色</span>
          <button
            v-for="c in EXCERPT_MARK_COLORS"
            :key="c.id"
            class="excerpt-mark-swatch"
            :class="{ active: excerptColor === c.value }"
            :style="{ background: c.value }"
            :title="c.label"
            @click="excerptColor = c.value"
          ></button>
        </div>
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
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { storage } from '../engine/storage'
import { useViewEntrance } from '../composables/useViewEntrance'
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'
import { useReadingInsights, useReadingSpeed, useReading, useReadingHall, flowHighlightToStudy, getBookContent, parseBookFile, useReadingInbox, useReadingExport, EXCERPT_MARK_COLORS, DEFAULT_EXCERPT_MARK, excerptMarkColor, applyExcerptMark, markDistribution, filterExcerptsByMark } from '../modules/reading'
import type { Excerpt } from '../modules/reading'
import { useRoomResonance, ROOM_LABELS } from '../modules/room-resonance'
import ReadingSrsPanel from '../components/ReadingSrsPanel.vue'
import ClassicalVerticalPanel from '../components/ClassicalVerticalPanel.vue'
import ReadingHabitsPanel from '../components/ReadingHabitsPanel.vue'
import ReadingDashboardPanel from '../components/ReadingDashboardPanel.vue'
import BookRecommendationsPanel from '../components/BookRecommendationsPanel.vue'
import ReadingChallengesPanel from '../components/ReadingChallengesPanel.vue'
import BookReviewsPanel from '../components/BookReviewsPanel.vue'
import TtsControlPanel from '../components/TtsControlPanel.vue'
import BookShelfPanel from '../components/BookShelfPanel.vue'
import ReadingInboxPanel from '../components/ReadingInboxPanel.vue'
import LifeBookPanel from '../components/LifeBookPanel.vue'
import ReadingMemoPanel from '../components/ReadingMemoPanel.vue'
import ReadingCalendarPanel from '../components/ReadingCalendarPanel.vue'
import ReadingQuoteWallPanel from '../components/ReadingQuoteWallPanel.vue'
import ReadingReportPanel from '../components/ReadingReportPanel.vue'
import ReadingSpeedInsightPanel from '../components/ReadingSpeedInsightPanel.vue'

// ---- 选项卡 ----
const { entranceRef, entranceClass } = useViewEntrance()
const readingInsights = useReadingInsights()
const readingSpeed = useReadingSpeed()
const tabs = [
  { key: 'book', label: '书卷' },
  { key: 'excerpts', label: '摘录集' },
  { key: 'review', label: '回顾' },
  { key: 'inbox', label: '待读箱' },
  { key: 'lifebook', label: '人生之书' },
  { key: 'shelf', label: '书架' },
  { key: 'calendar', label: '日历' },
  { key: 'quote', label: '金句' },
  { key: 'report', label: '报告' },
  { key: 'memo', label: '读书便签' },
  { key: 'speed', label: '速度·洞察' },
] as const
const activeTab = ref<'book' | 'excerpts' | 'review' | 'inbox' | 'lifebook' | 'shelf' | 'calendar' | 'quote' | 'report' | 'memo' | 'speed'>('book')

// ---- 阅读文本 ----
const reading = useReading()
const { readingText, excerpts } = reading

// ---- 摘录 / 便签 本地导出（#41） ----
const readingExport = useReadingExport()

const pastedText = ref('')
const readingRef = ref<HTMLElement | null>(null)

// 当前选中的待摘录文本
const pendingText = ref('')
const showDialog = ref(false)
const excerptNote = ref('')
// 多色标记（INCR-477）：新摘录待选色 + 摘录集筛选色
const excerptColor = ref<string>(DEFAULT_EXCERPT_MARK)
const markFilter = ref<string>('')

// ---- 按书登记与续读 ----
// 当前正在阅读的书（导入文本时按标题去重建书，正文存入按书存储域）
const activeBookId = ref('')
const activeBookTitle = ref('')
const flowedHint = ref(false)

// 由正文推导书名（首行非空，截断 40 字；无则「粘贴文本」）
function deriveTitle(text: string): string {
  const firstLine = text.split(/\n+/).map(p => p.trim()).find(p => p) ?? ''
  return firstLine ? firstLine.slice(0, 40) : '粘贴文本'
}
// 粗略页数估计：按非空段数
function estimatePages(text: string): number {
  return Math.max(1, text.split(/\n+/).filter(p => p.trim()).length)
}
// 把当前正文登记成书架书目（去重）+ 记录激活书，必要时续读定位
function registerActiveBook(text: string, preferredTitle?: string) {
  const title = preferredTitle?.trim() || deriveTitle(text)
  const book = hall.addBookFromText(title, '', estimatePages(text), text)
  activeBookId.value = book.id
  activeBookTitle.value = book.title
  const resume = book.lastPosition ?? 0
  if (resume > 0) nextTick(() => scrollToParagraph(resume))
}
// 滚动到指定段落（续读定位）
function scrollToParagraph(idx: number) {
  const scroller = readingRef.value
  if (!scroller) return
  const ps = scroller.querySelectorAll('p')
  const target = ps[idx] as HTMLElement | undefined
  if (target) scroller.scrollTop = target.offsetTop
}
// 阅读器滚动 → 节流记录续读位置（按段落索引）
let lastProgressSave = 0
function onReaderScroll() {
  if (!activeBookId.value || !readingRef.value) return
  const scroller = readingRef.value
  const ps = scroller.querySelectorAll('p')
  let idx = 0
  for (let i = 0; i < ps.length; i++) {
    if ((ps[i] as HTMLElement).offsetTop - scroller.scrollTop <= 4) idx = i
    else break
  }
  const now = Date.now()
  if (now - lastProgressSave > 800) {
    lastProgressSave = now
    hall.setBookProgress(activeBookId.value, idx)
  }
}
// 从书架打开某本已导入正文的书籍：切换书卷 tab + 按书加载正文 + 定位续读
function openBookForReading(bookId: string) {
  const book = hall.books.value.find(b => b.id === bookId)
  if (!book) return
  const content = getBookContent(bookId)
  if (!content) return
  activeTab.value = 'book'
  readingText.value = content
  reading.saveText()
  activeBookId.value = book.id
  activeBookTitle.value = book.title
  const resume = book.lastPosition ?? 0
  nextTick(() => scrollToParagraph(resume))
}
// 划线/摘录 流入思绪书房（全局 Note，自动进入双链与间隔重复）
function flowHighlight() {
  if (!pendingText.value) return
  flowHighlightToStudy(pendingText.value, activeBookTitle.value)
  flowedHint.value = true
  setTimeout(() => { flowedHint.value = false }, 2000)
}

// 段落
const paragraphs = computed(() => {
  if (!readingText.value) return []
  return readingText.value.split(/\n+/).filter(p => p.trim())
})

// 已摘录段落 → 标记色（多色高亮；同段多条摘录取首条色）
const paragraphMark = computed(() => {
  const map = new Map<number, string>()
  const paras = paragraphs.value
  for (let i = 0; i < paras.length; i++) {
    const paraText = paras[i].trim()
    const hit = excerpts.value.find(
      ex => paraText.includes(ex.text.trim()) || ex.text.trim().includes(paraText),
    )
    if (hit) map.set(i, excerptMarkColor(hit))
  }
  return map
})

// 摘录集筛选与各色分布（INCR-477）
const filteredExcerpts = computed(() =>
  filterExcerptsByMark(excerpts.value, markFilter.value || undefined),
)
const markStats = computed(() => markDistribution(excerpts.value))

// 按色改标记
function setExcerptMark(id: string, color: string) {
  excerpts.value = applyExcerptMark(excerpts.value, id, color)
  reading.saveExcerpts()
}

// ---- 摘录持久化（数据层由 useReading 提供） ----

// ---- 文本载入 ----
function loadPastedText() {
  if (!pastedText.value.trim()) return
  readingText.value = pastedText.value
  pastedText.value = ''
  reading.saveText()
  registerActiveBook(readingText.value)
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  input.value = '' // allow re-upload
  if (!file) return
  // 本地解析 .txt/.epub/.pdf（动态懒加载解析库，不触云）
  parseBookFile(file)
    .then(({ title, text }) => {
      if (!text) return
      readingText.value = text
      reading.saveText()
      registerActiveBook(text, title)
    })
    .catch((err) => {
      console.error('[ReadingHall] 解析书籍文件失败', err)
    })
}

function clearReadingText() {
  readingText.value = ''
  pendingText.value = ''
  activeBookId.value = ''
  activeBookTitle.value = ''
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
  excerptColor.value = DEFAULT_EXCERPT_MARK
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
    color: excerptColor.value,
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

// ---- 跨房间共鸣联动：阅览殿发射「阅读」信号，并呈现其他房间的光痕 ----
// 数据源 = 阅览殿自有引擎 useReadingHall（hf:reading:books / hf:reading:sessions）；
// 信号纯内存态、不落盘、不外发（守「本地私有」）。
const { crossRoomFeed, emitRoomSignal } = useRoomResonance()
const hall = useReadingHall()
const externalFeed = computed(() => crossRoomFeed.value.filter((s) => s.room !== 'reading'))

// ---- 待读箱：打开某项内容进入书卷阅读（不入书架，不写续读进度） ----
const inbox = useReadingInbox()
function openInboxItem(id: string) {
  const item = inbox.inbox.value.find(i => i.id === id)
  const content = inbox.getInboxContent(id)
  if (!content) return
  activeTab.value = 'book'
  readingText.value = content
  reading.saveText()
  activeBookId.value = '' // 待读箱项不直接入书架，不写续读进度
  activeBookTitle.value = item?.title || '待读内容'
  inbox.markInboxRead(id)
}

function roomLabel(r: keyof typeof ROOM_LABELS): string {
  return ROOM_LABELS[r]
}

function emitReadingSignal() {
  const stats = hall.getReadingStats()
  const readingNow = hall.getBooksByStatus('reading').length
  const label = stats.totalBooks === 0
    ? '书架还空着'
    : `藏书 ${stats.totalBooks} 本${readingNow > 0 ? ` · 在读 ${readingNow}` : ''}${stats.todayMinutes > 0 ? ` · 今日 ${stats.todayMinutes} 分` : ''}`
  emitRoomSignal({
    room: 'reading',
    kind: 'reading',
    label,
    detail: stats.finishedBooks > 0 ? `已读完 ${stats.finishedBooks} 本` : undefined,
    ts: Date.now(),
    strength: Math.min(1, hall.getGoalProgress().dailyProgress),
  })
}

// ---- 初始化 ----
onMounted(() => {
  reading.load()
  // 若已有正文，尝试把激活书关联到同名书目，延续「流入思绪书房」的溯源标签
  if (readingText.value) {
    const match = hall.books.value.find(b => b.title === deriveTitle(readingText.value))
    if (match) {
      activeBookId.value = match.id
      activeBookTitle.value = match.title
    }
  }
  emitReadingSignal()
})
// 藏书 / 阅读会话增减时刷新阅览殿信号，让其他房间实时感知
watch(() => [hall.books.value.length, hall.sessions.value.length], emitReadingSignal)
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
  min-height: 100%;
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
  background: color-mix(in srgb, var(--para-mark, rgba(var(--accent-rgb), 0.5)) 16%, transparent);
  border-left: 3px solid var(--para-mark, rgba(var(--accent-rgb), 0.5));
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

/* ---- 本地导出工具条 ---- */
.rh-export-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.rh-export-hint {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
}

.rh-export-actions {
  display: flex;
  gap: 8px;
}

.rh-export-btn {
  padding: 6px 14px;
  font-size: 12px;
}

@media (max-width: 480px) {
  .rh-export-bar {
    flex-wrap: wrap;
  }
  .rh-export-actions {
    width: 100%;
  }
  .rh-export-btn {
    flex: 1;
    padding: 6px 10px;
  }
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
  border-left: 3px solid var(--ex-mark, rgba(var(--accent-rgb), 0.2));
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

/* ---- 多色标记（INCR-477） ---- */
.rh-mark-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.rh-mark-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.5);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.rh-mark-chip:hover {
  background: rgba(var(--accent-rgb), 0.06);
}

.rh-mark-chip.active {
  border-color: rgba(var(--accent-rgb), 0.45);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.rh-mark-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
}

.excerpt-mark-picker {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.excerpt-mark-swatch {
  width: 16px;
  height: 16px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s, border-color 0.15s;
}

.excerpt-mark-swatch:hover {
  transform: scale(1.12);
}

.excerpt-mark-swatch.active {
  border-color: rgba(var(--text-primary-rgb), 0.75);
}

.dialog-mark-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}

.dialog-mark-label {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.45);
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

/* ---- 跨房间共鸣态势（与思绪书房同源样式） ---- */
.cross-room-climate {
  position: relative;
  z-index: 1;
  margin: 20px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.climate-title {
  margin: 0 0 12px;
  font-size: 14px;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.6);
}


.climate-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.climate-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.climate-room {
  flex: 0 0 72px;
  color: rgba(var(--accent-rgb), 0.75);
}

.climate-signal {
  color: rgba(var(--accent-rgb), 0.9);
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

  .flow-btn {
    background: rgba(var(--accent-rgb), 0.16);
    color: var(--accent);
    border-color: rgba(var(--accent-rgb), 0.28);
  }
  .flow-hint {
    font-size: 11px;
    color: var(--success, #34d399);
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
:deep(.room-layout){position:relative;z-index:1}
</style>