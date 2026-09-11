<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance study-room">
    <!-- 装饰性顶部 -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <div data-enter class="header-kicker">把思绪写成书，排在书架上</div>
    <h1 class="study-title">思绪书房</h1>

    <!-- 概览卡片 -->
    <div class="overview-cards">
      <div class="overview-card">
        <span class="overview-num">{{ totalNotes }}</span>
        <span class="overview-label">总笔记</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ totalTags }}</span>
        <span class="overview-label">标签数</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ latestNoteTitle }}</span>
        <span class="overview-label">最新笔记</span>
      </div>
    </div>

    <!-- 顶栏 -->
    <header class="study-header">
      <div class="header-actions">
        <!-- 标签筛选 -->
        <div class="tag-filter" v-if="study.allTags.value.length > 0">
          <button
            :class="['filter-chip', { active: activeTag === '' }]"
            @click="activeTag = ''"
          >全部</button>
          <button
            v-for="t in study.allTags.value"
            :key="t"
            :class="['filter-chip', { active: activeTag === t }]"
            @click="activeTag = t"
          >{{ t }}</button>
        </div>
        <button class="st-btn-new" @click="openCreate">+ 新笔记</button>
        <button class="st-btn-random" @click="randomRecall">🎲 随机回顾</button>
        <button
          :class="['filter-chip', 'archive-toggle', { active: showArchived }]"
          @click="showArchived = !showArchived"
        >📦 已归档 {{ archivedCount }}</button>
      </div>
    </header>

    <!-- 全库检索（INCR-02：找东西） -->
    <NoteSearchPanel :notes="study.notes.value" @open="openNoteById" />

    <!-- 笔记分析仪表盘（INCR-172：补挂载孤儿面板，引擎 note-analytics.ts 完备） -->
    <NoteAnalyticsPanel v-if="study.notes.value.length" :notes="study.notes.value" />

    <!-- 书房气象档案（study/study-analytics 引擎：藏书概览/落字节奏/温故建议/书房健康/洞察，INCR-198） -->
    <StudyWeatherPanel />

    <!-- 标签云（可隐藏） -->
    <section class="tag-cloud-section" v-if="tagCloudVisible">
      <div class="tag-cloud-head">
        <span class="tag-cloud-title">标签云</span>
        <button class="tag-cloud-hide" @click="tagCloudVisible = false">隐藏</button>
      </div>
      <div class="tag-cloud" v-if="cloudItems.length > 0">
        <button
          v-for="item in cloudItems"
          :key="item.tag"
          :class="['cloud-tag', { active: activeTag === item.tag }]"
          :style="{ fontSize: item.size + 'px' }"
          :title="`${item.tag} · ${item.count}`"
          @click="toggleCloudTag(item.tag)"
        >{{ item.tag }}</button>
      </div>
      <p v-else class="tag-cloud-empty">还没有标签，写笔记时加 #标签 试试</p>
    </section>
    <button v-else class="tag-cloud-show" @click="tagCloudVisible = true">显示标签云</button>

    <!-- 快速记录（flomo 式无压力速记：无标题 / 输入即存 / #标签 涌现） -->
    <QuickCapture @capture="onQuickCapture" />

    <!-- 每日随机回顾：flomo 式 3 条历史笔记偶遇 -->
    <section v-if="dailySerendipity.length > 0" class="serendipity-section">
      <div class="serendipity-head">
        <span class="serendipity-title">今日偶遇</span>
        <span class="serendipity-hint">每天随机遇到 3 条过去的思绪</span>
        <button class="serendipity-refresh" @click="refreshSerendipity" title="换一批">↻</button>
      </div>
      <div class="serendipity-cards">
        <article
          v-for="note in dailySerendipity"
          :key="note.id"
          class="serendipity-card"
          :style="{ '--spine-color': getSpineColor(note.tags) }"
          @click="openEdit(note)"
        >
          <div class="serendipity-spine" />
          <div class="serendipity-body">
            <h4 class="serendipity-note-title">{{ note.title || '未命名' }}</h4>
            <p class="serendipity-note-excerpt" v-if="note.content">
              {{ note.content.slice(0, 100) }}{{ note.content.length > 100 ? '…' : '' }}
            </p>
            <div class="serendipity-meta">
              <span class="serendipity-date">{{ formatNoteDate(note.updatedAt) }}</span>
              <span v-if="note.tags.length > 0" class="serendipity-tags">
                <span v-for="t in note.tags.slice(0, 3)" :key="t" class="serendipity-tag">{{ t }}</span>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- 书架 -->
    <div class="bookshelf">
      <!-- 空状态 -->
      <div v-if="filteredNotes.length === 0 && study.notes.value.length === 0" class="empty-shelf">
        <span class="empty-icon">📚</span>
        <p class="empty-text">将你的思绪安放在这里</p>
        <p class="empty-hint">书架还空着，写下第一篇笔记吧</p>
      </div>

      <div v-else-if="filteredNotes.length === 0" class="empty-shelf">
        <p class="empty-text">没有匹配「{{ activeTag }}」的笔记</p>
      </div>

      <!-- 书本网格 -->
      <div v-else class="book-grid">
        <div
          v-for="note in filteredNotes"
          :key="note.id"
          class="book-card"
          :style="{ '--spine-color': getSpineColor(note.tags) }"
          @click="openEdit(note)"
        >
          <!-- 书脊 -->
          <div class="book-spine" />
          <!-- 封面信息 -->
          <div class="book-cover">
            <h3 class="book-title">
              {{ note.title || '未命名' }}
              <span v-if="note.isAtomic" class="book-atomic" title="原子笔记：每篇只装一个想法">⚛</span>
            </h3>
            <p class="book-excerpt" v-if="note.content">
              {{ note.content.slice(0, 80) }}{{ note.content.length > 80 ? '…' : '' }}
            </p>
            <div class="book-meta">
              <span class="book-date">{{ formatNoteDate(note.updatedAt) }}</span>
              <span v-if="note.tags.length > 0" class="book-tags">
                <span
                  v-for="t in note.tags.slice(0, 2)"
                  :key="t"
                  class="book-tag"
                >{{ t }}</span>
              </span>
            </div>
          </div>
          <!-- 删除 -->
          <button class="book-delete" @click.stop="confirmDelete(note)" title="删除">×</button>
          <!-- 归档 -->
          <button
            class="book-archive"
            @click.stop="toggleArchive(note)"
            :title="note.archived ? '取消归档' : '归档'"
          >{{ note.archived ? '📤' : '📥' }}</button>
        </div>
      </div>
    </div>

    <!-- 笔记编辑器 -->
    <NoteEditor
      :visible="editorVisible"
      :editing="isEditing"
      :note="editingNote"
      :block-id="pendingBlockId"
      @save="handleSave"
      @close="onEditorClose"
      @open="openNoteById"
      @open-block="openBlock"
    />

    <!-- 删除确认 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="deleteTarget" class="confirm-overlay" @click.self="deleteTarget = null">
          <div class="confirm-card">
            <p>删除「{{ deleteTarget.title }}」？</p>
            <div class="confirm-actions">
              <button class="st-btn-cancel" @click="deleteTarget = null">取消</button>
              <button class="st-btn-danger" @click="doDelete">删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 随机回顾面板 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="recallNote" class="recall-overlay" @click.self="recallNote = null">
          <div class="recall-card">
            <button class="recall-close" @click="recallNote = null" title="关闭">×</button>
            <div class="recall-spine" :style="{ '--spine-color': getSpineColor(recallNote.tags) }" />
            <h3 class="recall-title">{{ recallNote.title || '未命名' }}</h3>
            <p class="recall-content" v-if="recallNote.content">{{ recallNote.content }}</p>
            <p v-else class="recall-content recall-content--empty">（这条没有正文）</p>
            <div class="recall-meta">
              <span class="recall-date">{{ formatNoteDate(recallNote.updatedAt) }}</span>
              <span v-if="recallNote.tags.length > 0" class="recall-tags">
                <span v-for="t in recallNote.tags" :key="t" class="recall-tag">{{ t }}</span>
              </span>
            </div>
            <!-- 双向链接（study/note-links 引擎·宿主薄委托数据，INCR-229） -->
            <div class="recall-links">
              <h4 class="recall-links-title">双向链接</h4>
              <BacklinksPanel
                v-if="recallNote"
                :note-id="recallNote.id"
                :notes="study.notes.value"
                :outgoing="recallOutgoing"
                :backlinks="recallBacklinks"
                @open="openNoteById"
              />
              <p v-if="recallBacklinks.length === 0 && recallOutgoing.length === 0" class="recall-links-empty">这篇笔记还没有双向链接。</p>
            </div>
            <div class="recall-actions">
              <button class="recall-btn" @click="randomRecall">🎲 再抽一条</button>
              <button class="recall-btn recall-btn--open" @click="openRecallTarget">打开编辑</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 跨房间共鸣态势（仅其他房间，过滤本房回声） -->
    <section data-enter class="cross-room-climate">
      <h2 class="climate-title">跨房间共鸣态势</h2>
      <p v-if="externalFeed.length === 0" class="climate-empty">各房间尚在静默，去其他房间留一道光痕吧。</p>
      <ul v-else class="climate-list">
        <li v-for="s in externalFeed" :key="s.room" class="climate-item">
          <span class="climate-room">{{ roomLabel(s.room) }}</span>
          <span class="climate-signal">{{ s.label }}</span>
        </li>
      </ul>
    </section>

    <!-- 思维导图（note mind-map 模块） -->
    <div class="mindmap-mount">
      <MindMapPanel />
    </div>

    <!-- 信笺（study letters 模块） -->
    <LettersPanel />

    <!-- 通话磁带（study tapes 模块） -->
    <TapesPanel />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useStudy, tagFrequencies, pickRandom } from '../modules/study'
import { useNoteLinks } from '../modules/study/note-links'
import { getSpineColor, formatNoteDate } from '../modules/study/types'
import { storage } from '../engine/storage'
import NoteEditor from '../components/NoteEditor.vue'
import QuickCapture from '../components/QuickCapture.vue'
import MindMapPanel from '../components/MindMapPanel.vue'
import NoteSearchPanel from '../components/NoteSearchPanel.vue'
import NoteAnalyticsPanel from '../components/NoteAnalyticsPanel.vue'
import StudyWeatherPanel from '../components/StudyWeatherPanel.vue'
import LettersPanel from '../components/LettersPanel.vue'
import TapesPanel from '../components/TapesPanel.vue'
import BacklinksPanel from '../components/BacklinksPanel.vue'
import type { Note } from '../types'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useRoomResonance, ROOM_LABELS } from '../modules/room-resonance'

const { entranceRef, entranceClass } = useViewEntrance()
const study = useStudy()

// ---- 跨房间共鸣联动：思绪书房发射「笔记」信号，并呈现其他房间的回声 ----
const { crossRoomFeed, emitRoomSignal } = useRoomResonance()
const externalFeed = computed(() => crossRoomFeed.value.filter(s => s.room !== 'study'))

function roomLabel(r: keyof typeof ROOM_LABELS): string {
  return ROOM_LABELS[r]
}

function studySignalLabel(): string {
  const n = study.notes.value.length
  if (n === 0) return '书架还空着'
  const latest = [...study.notes.value].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0]
  return `${n} 篇思绪在架上 · 最近《${latest.title || '未命名'}》`
}

function emitStudySignal() {
  emitRoomSignal({
    room: 'study',
    kind: 'note',
    label: studySignalLabel(),
    detail: '本地书房·思绪沉淀',
    ts: Date.now(),
  })
}

onMounted(() => {
  study.load()
  emitStudySignal()
})
// 笔记增减时刷新书房信号，让其他房间实时感知（守本地私有·不外发）
watch(() => study.notes.value.length, emitStudySignal)

// 筛选
const activeTag = ref('')
const showArchived = ref(false)
const filteredNotes = computed(() => {
  const base = study.notes.value.filter(n => !!n.archived === showArchived.value)
  if (!activeTag.value) return base
  return base.filter(n => n.tags.includes(activeTag.value))
})
const archivedCount = computed(() => study.notes.value.filter(n => n.archived && !n.deletedAt).length)

// ---- 标签云数据源：当前书架可见笔记（受"已归档"开关影响，但不按标签过滤） ----
const cloudNotes = computed(() =>
  study.notes.value.filter(n => !!n.archived === showArchived.value)
)

// ---- 标签云：词频 → 字号（min/max 钳制），按频率降序 ----
const CLOUD_MIN_PX = 13
const CLOUD_MAX_PX = 30
const cloudItems = computed(() => {
  const freq = tagFrequencies(cloudNotes.value)
  const entries = Object.entries(freq)
  if (entries.length === 0) return []
  const counts = entries.map(e => e[1])
  const min = Math.min(...counts)
  const max = Math.max(...counts)
  return entries
    .map(([tag, count]) => {
      const ratio = max === min ? 0.6 : (count - min) / (max - min)
      const size = Math.round(CLOUD_MIN_PX + ratio * (CLOUD_MAX_PX - CLOUD_MIN_PX))
      return { tag, count, size }
    })
    .sort((a, b) => b.count - a.count)
})

// ---- 标签云可见性（storage key: hf:tagcloud_visible，默认 true） ----
const TAG_CLOUD_KEY = 'hf:tagcloud_visible'
const tagCloudVisible = ref<boolean>(storage.getKV(TAG_CLOUD_KEY, true))
watch(tagCloudVisible, v => storage.setKV(TAG_CLOUD_KEY, v))

function toggleCloudTag(tag: string) {
  activeTag.value = activeTag.value === tag ? '' : tag
}

// ---- 随机回顾（纯用户触发，绝不发推送） ----
const recallNote = ref<Note | null>(null)

function randomRecall() {
  recallNote.value = pickRandom(cloudNotes.value)
}

// ---- 双向链接（INCR-229 薄委托化）：宿主从 note-links 引擎取数据，面板纯展示） ----
const { getBacklinks, getOutgoingLinks } = useNoteLinks()
const recallBacklinks = computed(() => recallNote.value ? getBacklinks(recallNote.value.id) : [])
const recallOutgoing = computed(() => recallNote.value ? getOutgoingLinks(recallNote.value.id) : [])

// ---- 每日随机回顾：flomo 式 3 条历史笔记偶遇（日期种子，每天同一组） ----
function dailySeed(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function pickDailySerendipity(notes: Note[], count: number = 3): Note[] {
  if (notes.length === 0) return []
  const today = new Date().toISOString().slice(0, 10)
  const seed = dailySeed(today)
  const rng = seededRandom(seed)
  const pool = [...notes].filter(n => {
    const d = new Date(n.createdAt).toISOString().slice(0, 10)
    return d !== today // 排除今天的笔记
  })
  if (pool.length === 0) return []
  // Fisher-Yates shuffle with seeded RNG
  const result = [...pool]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result.slice(0, Math.min(count, result.length))
}

// 手动刷新：使用随机种子（非日期种子），让用户可换一批
const serendipityRefreshCounter = ref(0)
function refreshSerendipity() {
  serendipityRefreshCounter.value++
}

const dailySerendipity = computed(() => {
  if (serendipityRefreshCounter.value > 0) {
    const seed = dailySeed(`refresh-${serendipityRefreshCounter.value}`)
    const pool = [...study.notes.value].filter(n => {
      const d = new Date(n.createdAt).toISOString().slice(0, 10)
      return d !== new Date().toISOString().slice(0, 10)
    })
    if (pool.length === 0) return []
    const rng = seededRandom(seed)
    const result = [...pool]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result.slice(0, Math.min(3, result.length))
  }
  return pickDailySerendipity(study.notes.value)
})

function openRecallTarget() {
  if (recallNote.value) openEdit(recallNote.value)
}

// 概览
const totalNotes = computed(() => study.notes.value.length)
const totalTags = computed(() => study.allTags.value.length)
const latestNoteTitle = computed(() => {
  if (study.notes.value.length === 0) return '--'
  const sorted = [...study.notes.value].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return sorted[0].title.slice(0, 8) || '未命名'
})

// 编辑器
const editorVisible = ref(false)
const isEditing = ref(false)
const editingNote = ref<Note | null>(null)
const pendingBlockId = ref<string | null>(null)

function openCreate() {
  editingNote.value = null
  isEditing.value = false
  pendingBlockId.value = null
  editorVisible.value = true
}

function openEdit(note: Note) {
  editingNote.value = note
  isEditing.value = true
  pendingBlockId.value = null
  editorVisible.value = true
}

function handleSave(data: { title: string; content: string; tags: string[]; isAtomic: boolean }) {
  if (isEditing.value && editingNote.value) {
    study.update(editingNote.value.id, data)
  } else {
    study.create(data.title, data.content, data.tags, data.isAtomic)
  }
  onEditorClose()
}

function onEditorClose() {
  editorVisible.value = false
  pendingBlockId.value = null
}

// 从反向链接/预览的块级引用跳转到目标笔记并定位块锚点
function openBlock(noteId: string, blockId: string) {
  const target = study.notes.value.find(n => n.id === noteId)
  if (!target) return
  editorVisible.value = false
  nextTick(() => {
    editingNote.value = target
    isEditing.value = true
    pendingBlockId.value = blockId
    editorVisible.value = true
  })
}

// 快速记录：原子卡片落库（无标题 / 自动标签）
function onQuickCapture(raw: string) {
  study.quickCapture(raw)
}

// 删除
const deleteTarget = ref<Note | null>(null)

function confirmDelete(note: Note) {
  deleteTarget.value = note
}

function doDelete() {
  if (deleteTarget.value) {
    study.remove(deleteTarget.value.id)
    deleteTarget.value = null
  }
}

// 双向链接：从反向链接面板跳转到目标笔记
function openNoteById(id: string) {
  const target = study.notes.value.find(n => n.id === id)
  if (!target) return
  editorVisible.value = false
  nextTick(() => {
    editingNote.value = target
    isEditing.value = true
    pendingBlockId.value = null
    editorVisible.value = true
  })
}

// 归档 / 取消归档
function toggleArchive(note: Note) {
  if (note.archived) study.unarchive(note.id)
  else study.archive(note.id)
}
</script>

<style scoped>
/* =============================================
   深夜食堂 · 暖琥珀
   把思绪写成书，排在书架上
   ============================================= */

/* ---- 环境光晕 ---- */
.study-room {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.study-room::before,
.study-room::after {
  content: '';
  position: absolute;
  top: 0;
  width: 40%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.study-room::before {
  left: 0;
  background: radial-gradient(ellipse 600px 80% at 0% 50%, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
}

.study-room::after {
  right: 0;
  background: radial-gradient(ellipse 600px 80% at 100% 50%, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
}

/* ---- 装饰性顶部 ---- */
.header-ornament {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 32px 0;
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
  margin-top: 10px;
}

.study-title {
  position: relative;
  z-index: 1;
  text-align: center;
  font-family: var(--font-heading-en);
  font-size: 28px;
  font-weight: 400;
  color: rgba(var(--accent-rgb), 0.75);
  letter-spacing: 6px;
  margin-top: 6px;
}

/* ---- 概览卡片 ---- */
.overview-cards {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 20px 32px 0;
}

.overview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 20px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  min-width: 80px;
}

.overview-num {
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.overview-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

/* ---- 顶栏 ---- */
.study-header {
  position: relative;
  z-index: 1;
  padding: 16px 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tag-filter {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.35);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip:hover {
  color: rgba(var(--accent-rgb), 0.55);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.filter-chip.active {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}

.st-btn-new {
  padding: 7px 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.st-btn-new:hover {
  background: rgba(var(--accent-rgb), 0.15);
}

/* ---- 书架 ---- */
.bookshelf {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  padding: 8px 32px 40px;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

/* ---- 书本卡片 ---- */
.book-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  border-radius: 8px;
  border-left: 4px solid var(--spine-color, #8b7355);
  padding: 16px;
  cursor: pointer;
  transition: all 0.25s;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 140px;
}

.book-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--accent-rgb), 0.12);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

.book-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-high);
  line-height: 1.3;
}

.book-atomic {
  font-size: 11px;
  color: var(--accent, #d4a574);
  border: 1px solid rgba(212, 165, 116, 0.5);
  border-radius: 4px;
  padding: 0 4px;
  margin-left: 4px;
  vertical-align: middle;
}

.book-excerpt {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.4);
  line-height: 1.5;
  flex: 1;
}

.book-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.3);
  opacity: 0.6;
}

.book-tags {
  display: flex;
  gap: 3px;
}

.book-tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.08);
}

.book-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.2);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
}

.book-card:hover .book-delete {
  opacity: 1;
}

.book-delete:hover {
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}

.book-archive {
  position: absolute;
  top: 6px;
  right: 32px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.2);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
}

.book-card:hover .book-archive {
  opacity: 1;
}

.book-archive:hover {
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}

.archive-toggle.active {
  background: rgba(var(--accent-rgb), 0.18);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.4);
}

/* ---- 空状态 ---- */
.empty-shelf {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 8px;
}

.empty-icon { font-size: 48px; opacity: 0.4; }
.empty-text { font-size: 15px; color: rgba(var(--accent-rgb), 0.3); }
.empty-hint { font-size: 12px; color: rgba(var(--accent-rgb), 0.18); }

/* ---- 删除确认弹窗 ---- */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-card {
  background: rgba(26, 22, 18, 0.95);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 12px;
  padding: 24px;
  max-height: 86vh;
  overflow-y: auto;
  width: 300px;
  text-align: center;
}

.confirm-card p {
  font-size: 14px;
  color: rgba(var(--accent-rgb), 0.6);
  margin-bottom: 16px;
}

.confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.st-btn-cancel, .st-btn-danger {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.st-btn-cancel {
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.4);
}
.st-btn-cancel:hover { background: rgba(var(--accent-rgb), 0.06); }

.st-btn-danger {
  border: none;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}
.st-btn-danger:hover { background: rgba(var(--accent-rgb), 0.2); }

/* ---- 标签云 ---- */
.tag-cloud-section {
  position: relative;
  z-index: 1;
  margin: 4px 32px 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.tag-cloud-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.tag-cloud-title {
  font-size: 12px;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.4);
}

.tag-cloud-hide {
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.35);
  font-size: 11px;
  font-family: inherit;
  padding: 3px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-cloud-hide:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.2);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  line-height: 1.4;
}

.cloud-tag {
  border: none;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s, transform 0.2s;
}

.cloud-tag:hover {
  color: var(--accent);
  transform: scale(1.08);
}

.cloud-tag.active {
  color: var(--accent);
  text-shadow: 0 0 12px rgba(var(--accent-rgb), 0.4);
}

.tag-cloud-empty {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.3);
  margin: 0;
}

.tag-cloud-show {
  position: relative;
  z-index: 1;
  margin: 4px 32px 0;
  align-self: flex-start;
  border: 1px dashed rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.35);
  font-size: 11px;
  font-family: inherit;
  padding: 6px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-cloud-show:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.3);
}

/* ---- 随机回顾按钮 ---- */
.st-btn-random {
  padding: 7px 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.st-btn-random:hover {
  background: rgba(var(--accent-rgb), 0.15);
}

/* ---- 随机回顾面板 ---- */
.recall-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.recall-card {
  position: relative;
  width: 360px;
  max-width: calc(100vw - 32px);
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 12px;
  padding: 24px;
  padding-left: 28px;
  max-height: 86vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.recall-spine {
  position: absolute;
  left: 0;
  top: 16px;
  bottom: 16px;
  width: 4px;
  border-radius: 4px;
  background: var(--spine-color, #8b7355);
}

.recall-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.3);
  font-size: 16px;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
}

.recall-close:hover {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
}

.recall-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-high);
  margin: 0 0 10px;
  padding-right: 20px;
}

.recall-content {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(var(--accent-rgb), 0.5);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0 0 14px;
}

.recall-content--empty {
  font-style: italic;
  opacity: 0.5;
}

.recall-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.3);
  margin-bottom: 16px;
}

.recall-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.recall-tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--accent-rgb), 0.5);
}

.recall-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.recall-links {
  margin: 12px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.recall-links-title {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: rgba(var(--accent-rgb), 0.6);
}
.recall-links-empty {
  margin: 0;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.35);
}

.recall-btn {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.45);
}

.recall-btn:hover {
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
}

.recall-btn--open {
  border-color: rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}

.recall-btn--open:hover {
  background: rgba(var(--accent-rgb), 0.18);
}

.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* ---- 每日随机回顾（flomo 式偶遇） ---- */
.serendipity-section {
  position: relative;
  z-index: 1;
  margin: 20px 32px 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.serendipity-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.serendipity-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.7);
}

.serendipity-hint {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.3);
  flex: 1;
}

.serendipity-refresh {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.4);
  font-size: 16px;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
}

.serendipity-refresh:hover {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
  transform: rotate(90deg);
}

.serendipity-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.serendipity-card {
  position: relative;
  padding: 14px 14px 14px 20px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  cursor: pointer;
  transition: all 0.25s;
  overflow: hidden;
}

.serendipity-card:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.14);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.serendipity-spine {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
  background: var(--spine-color, #8b7355);
  opacity: 0.6;
}

.serendipity-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.serendipity-note-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--accent-rgb), 0.75);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.serendipity-note-excerpt {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(var(--accent-rgb), 0.35);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.serendipity-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.25);
}

.serendipity-tags {
  display: flex;
  gap: 3px;
}

.serendipity-tag {
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.06);
  font-size: 9px;
}

/* ---- 跨房间共鸣态势 ---- */
.cross-room-climate {
  position: relative;
  z-index: 1;
  margin: 28px 32px 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

/* ---- 思维导图挂载 ---- */
.mindmap-mount {
  position: relative;
  z-index: 1;
  margin: 28px 32px 0;
}
.climate-title {
  margin: 0 0 12px;
  font-size: 14px;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.6);
}
.climate-empty {
  margin: 0;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.4);
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

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .study-room {
    height: 100dvh;
  }

  .header-ornament {
    padding: 48px 16px 0;
    gap: 8px;
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
    margin-top: 6px;
  }

  .study-title {
    font-size: 22px;
    letter-spacing: 4px;
    margin-top: 4px;
  }

  .overview-cards {
    gap: 8px;
    padding: 12px 16px 0;
    flex-wrap: wrap;
  }

  .overview-card {
    padding: 8px 12px;
    min-width: 60px;
    flex: 1;
  }

  .overview-num {
    font-size: 16px;
  }

  .overview-label {
    font-size: 10px;
  }

  .study-header {
    padding: 10px 16px;
    gap: 8px;
  }

  .header-actions {
    gap: 6px;
  }

  .filter-chip {
    padding: 3px 8px;
    font-size: 10px;
  }

  .st-btn-new {
    padding: 6px 12px;
    font-size: 12px;
  }

  .bookshelf {
    padding: 8px 16px 40px;
  }

  .book-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }

  .book-card {
    padding: 12px;
    min-height: 120px;
  }

  .book-title {
    font-size: 14px;
  }

  .book-excerpt {
    font-size: 11px;
  }

  .book-meta {
    font-size: 10px;
  }

  .book-tag {
    font-size: 9px;
  }

  .confirm-card {
    width: calc(100vw - 32px);
    max-width: 300px;
    padding: 20px;
  }

  .confirm-card p {
    font-size: 13px;
  }

  .st-btn-cancel, .st-btn-danger {
    padding: 7px 16px;
    font-size: 12px;
  }

  .empty-shelf {
    padding: 40px 0;
  }

  .empty-icon {
    font-size: 36px;
  }

  .empty-text {
    font-size: 13px;
  }

  .empty-hint {
    font-size: 11px;
  }

  .tag-cloud-section, .tag-cloud-show {
    margin-left: 16px;
    margin-right: 16px;
  }

  .st-btn-random {
    padding: 6px 12px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .header-ornament {
    padding: 40px 12px 0;
    gap: 6px;
  }

  .orn-line {
    width: 24px;
  }

  .study-title {
    font-size: 20px;
  }

  .overview-cards {
    gap: 6px;
    padding: 10px 12px 0;
  }

  .overview-card {
    padding: 6px 10px;
    min-width: 48px;
  }

  .overview-num {
    font-size: 14px;
  }

  .overview-label {
    font-size: 9px;
  }

  .study-header {
    padding: 8px 12px;
    gap: 6px;
  }

  .filter-chip {
    padding: 2px 6px;
    font-size: 9px;
  }

  .st-btn-new {
    padding: 5px 10px;
    font-size: 11px;
  }

  .bookshelf {
    padding: 6px 12px 40px;
  }

  .book-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .book-card {
    padding: 10px;
    min-height: 100px;
  }
}

/* 375px: 小微屏收紧内距 + 触控靶 ≥40px + 防横向滚动（任务④ ≤375px 打磨） */
@media (max-width: 375px) {
  .study-room {
    height: 100dvh;
  }

  .header-ornament {
    padding: 36px 10px 0;
    gap: 4px;
  }

  .orn-line {
    width: 18px;
  }

  .study-title {
    font-size: 18px;
    letter-spacing: 2px;
  }

  .header-kicker {
    font-size: 9px;
    letter-spacing: 1px;
  }

  .overview-cards {
    gap: 4px;
    padding: 8px 10px 0;
  }

  .overview-card {
    padding: 6px 8px;
    min-width: 0;
    min-height: 44px;
  }

  .overview-num {
    font-size: 13px;
  }

  .overview-label {
    font-size: 9px;
  }

  .study-header {
    padding: 8px 10px;
    gap: 6px;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .filter-chip {
    padding: 7px 10px;
    font-size: 11px;
    min-height: 32px;
  }

  .st-btn-new {
    padding: 9px 12px;
    font-size: 12px;
    min-height: 40px;
  }

  .bookshelf {
    padding: 6px 10px 40px;
  }

  .book-card {
    padding: 10px;
    min-height: 92px;
  }

  .book-title {
    font-size: 13px;
  }

  .book-excerpt {
    font-size: 10px;
  }

  .confirm-card {
    width: calc(100vw - 20px);
    max-width: none;
    padding: 16px;
  }

  .confirm-card p {
    font-size: 12px;
  }

  .tag-cloud-section,
  .tag-cloud-show {
    margin-left: 10px;
    margin-right: 10px;
  }

  .st-btn-random {
    padding: 9px 12px;
    font-size: 12px;
    min-height: 40px;
  }
}
</style>