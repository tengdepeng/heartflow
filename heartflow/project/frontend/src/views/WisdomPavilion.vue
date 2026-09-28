<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance wp">
    <!-- ========== 头部装饰 ========== -->
    <RoomLayout
      title="知微阁"
      kicker="知微见著，慧从心生"
      data-enter
    >
      <template #meta>

    <!-- ========== 统计概览行 ========== -->
    <section data-enter class="wp-stats-section">
      <div class="wp-stat-item">
        <span class="wp-stat-num">{{ stats.totalRecords }}</span>
        <span class="wp-stat-label">总记录</span>
      </div>
      <div class="wp-stat-item">
        <span class="wp-stat-num">{{ stats.weekRecords }}</span>
        <span class="wp-stat-label">本周记录</span>
      </div>
      <div class="wp-stat-item">
        <span class="wp-stat-num">{{ stats.pearlSpins }}</span>
        <span class="wp-stat-label">知微珠转动</span>
      </div>
      <div class="wp-stat-item" v-if="dominantDomain">
        <span class="wp-stat-num domain-label">{{ dominantDomainLabel }}</span>
        <span class="wp-stat-label">近期密集领域</span>
      </div>
    </section>

    <!-- 知微珠 -->
      </template>

    <div data-enter class="wp-pearl-container">
      <div class="wp-pearl" :class="{ spinning: thinking }" :style="pearlGlowStyle">
        <div class="pearl-core"/>
        <div class="pearl-aura"/>
      </div>
    </div>

    <!-- 提问 -->
    <div data-enter class="wp-ask-box">
      <textarea v-model="question" placeholder="输入一个想回看的问题或一段想再看一眼的话…" rows="2" class="wp-input"/>
      <button @click="ask" class="wp-btn" :disabled="!question.trim()||thinking">查看</button>
    </div>

    <!-- 回答：光点卡片并置，无连接词 -->
    <div data-enter v-if="answerCards.length" class="wp-answer-area">
      <div
        v-for="(card, i) in answerCards"
        :key="i"
        class="wp-answer-card"
        :style="{ animationDelay: `${i * 0.08}s` }"
        role="button"
        tabindex="0"
        :aria-label="card.room ? '前往 ' + card.room : '查看光点记录'"
        @click="navigateToRoom(card)"
        @keydown.enter.prevent="navigateToRoom(card)"
        @keydown.space.prevent="navigateToRoom(card)"
      >
        <span class="answer-domain">{{ card.domain }}</span>
        <p class="answer-text">{{ card.content }}</p>
        <span v-if="card.room" class="answer-nav-hint">→ {{ card.room }}</span>
      </div>
    </div>

    <!-- 定音锤 -->
    <section data-enter><h3>🔨 定音锤</h3>
      <p class="hint">当你想回看近况时，这里会并置几段已经留下的记录。</p>
      <button class="wp-btn" @click="hammer" :disabled="hammering">{{ hammering ? '整理中…' : '查看片段' }}</button>
      <div v-if="hammerActs.length" class="wp-hammer-acts">
        <div
          v-for="(act,i) in hammerActs"
          :key="i"
          class="wp-hammer-act"
          :style="{ animationDelay: `${i*0.3}s` }"
          role="button"
          tabindex="0"
          :aria-label="act.room ? '前往 ' + act.room : '查看回看片段'"
          @click="navigateToRoom(act)"
          @keydown.enter.prevent="navigateToRoom(act)"
          @keydown.space.prevent="navigateToRoom(act)"
        >
          <h4>{{ act.title }}</h4><p>{{ act.content }}</p>
          <span v-if="act.room" class="answer-nav-hint">→ {{ act.room }}</span>
        </div>
      </div>
    </section>

    <!-- 年度信 -->
    <section data-enter><h3>📜 年度信</h3>
      <button class="wp-btn" @click="annualLetter">查看年度回看</button>
      <div v-if="annualText" class="wp-letter-card"><p class="letter-text">{{ annualText }}</p></div>
    </section>

    <!-- ========== 添加记录表单 ========== -->
    <section data-enter class="wp-add-section">
      <h3>📝 添加记录</h3>
      <div class="wp-record-form">
        <input v-model="newRecordQuestion" placeholder="输入问题…" class="wp-input record-input" />
        <textarea v-model="newRecordAnswer" placeholder="输入回答…" rows="3" class="wp-input record-textarea"></textarea>
        <input v-model="newRecordTags" placeholder="标签，逗号分隔（可选）" class="wp-input record-input" />
        <button @click="saveRecord" class="wp-btn" :disabled="!newRecordQuestion.trim() || !newRecordAnswer.trim()">保存记录</button>
      </div>
    </section>

    <!-- ========== 搜索记录 ========== -->
    <section data-enter class="wp-search-section">
      <h3>🔍 搜索记录</h3>
      <div class="search-box">
        <input v-model="searchQuery" placeholder="按问题、回答或标签搜索…" class="wp-input search-input" @input="onSearchInput" />
      </div>
    </section>

    <!-- ========== 我的记录列表 ========== -->
    <section data-enter class="wp-records-section">
      <h3>📋 我的记录 <span class="record-count">({{ filteredRecords.length }})</span></h3>
      <EmptyState
        v-if="filteredRecords.length === 0"
        :icon="searchQuery ? '🔍' : ''"
        :title="searchQuery ? '未找到匹配的记录' : '暂无记录，在上面添加一条吧'"
        :glow="false"
        cta-label=""
      />
      <div v-for="record in filteredRecords" :key="record.id" class="wp-record-card">
        <div
          class="wp-record-header"
          role="button"
          tabindex="0"
          :aria-expanded="expandedRecordId === record.id"
          :aria-label="(expandedRecordId === record.id ? '收起' : '展开') + '记录：' + record.question"
          @click="toggleRecordExpand(record.id)"
          @keydown.enter.prevent="toggleRecordExpand(record.id)"
          @keydown.space.prevent="toggleRecordExpand(record.id)"
        >
          <span class="record-q">{{ record.question }}</span>
          <span class="record-time">{{ formatTime(record.createdAt) }}</span>
          <span class="expand-icon">{{ expandedRecordId === record.id ? '▲' : '▼' }}</span>
        </div>
        <div v-if="expandedRecordId === record.id" class="record-card-body">
          <p class="record-a">{{ record.answer }}</p>
          <div v-if="record.tags && record.tags.length" class="record-tags">
            <span v-for="t in record.tags" :key="t" class="record-tag">{{ t }}</span>
          </div>
          <div class="record-actions">
            <button class="wp-btn wp-btn-sm" @click="deleteRecord(record.id)">删除</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 对话历史 -->
    <section data-enter v-if="history.length"><h3>💬 对话记录</h3>
      <div v-for="h in history.slice(0,5)" :key="h.id" class="wp-hist-item">
        <span class="wp-hist-question">Q: {{ h.q }}</span><span class="wp-hist-answer">A: {{ h.a.slice(0, 80) }}…</span>
      </div>
    </section>

    <!-- 知微档案（INCR-17：语录/摘抄 → 档案概览/领域/标签/月度/节律/知微健康/洞察） -->
    <WisdomArchivePanel :entries="wisdomItems" :history="history" />

    <!-- 渐进背诵 -->
    <RecitePanel />

    <!-- 掌握度 -->
    <MasteryPanel />

    <!-- 词书背单词 -->
    <VocabPanel />

    <!-- 记忆档案（INCR-03：背书匠/Khan 记忆沉淀） -->
    <MemoryArchivePanel />

    <!-- 诗词卡片（wisdom/poetry 引擎，INCR-183） -->
    <PoetryCardPanel />
  </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storage } from '../engine/storage'
import { getLocalDateKey } from '../utils/time'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useStatsStore } from '../stores'
import { useWisdom, type AnswerCard, type WisdomContext } from '../modules/wisdom'
import { useWisdomHistory } from '../modules/wisdom/history'
import { useRelation } from '../modules/relation'
import { useBodyGreenhouse } from '../modules/body'
import RecitePanel from '../components/RecitePanel.vue'
import MasteryPanel from '../components/MasteryPanel.vue'
import VocabPanel from '../components/VocabPanel.vue'
import MemoryArchivePanel from '../components/MemoryArchivePanel.vue'
import PoetryCardPanel from '../components/PoetryCardPanel.vue'
import WisdomArchivePanel from '../components/WisdomArchivePanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const statsStore = useStatsStore()
const router = useRouter()
const { wisdomItems, addWisdomItem, removeWisdomItem, reload, runAsk, runHammer, buildAnnualLetter } = useWisdom()
const wisdomHistory = useWisdomHistory()
const history = wisdomHistory.items
const relation = useRelation()
const body = useBodyGreenhouse()

const question = ref('')
const answerCards = ref<AnswerCard[]>([])
const thinking = ref(false)
const hammering = ref(false)
const hammerActs = ref<(AnswerCard & { title: string })[]>([])
const annualText = ref('')

// ---------- 统计概览 ----------
interface StatsData {
  totalRecords: number
  weekRecords: number
  pearlSpins: number
  fragments: number
}

const stats = ref<StatsData>({
  totalRecords: 0,
  weekRecords: 0,
  pearlSpins: 0,
  fragments: 0,
})

// 主导数据域
const dominantDomain = ref<string>('')
const dominantDomainLabel = computed(() => {
  const labels: Record<string, string> = { emotion: '情绪', work: '工作', body: '身体', knowledge: '知识', relation: '关系' }
  return labels[dominantDomain.value] || ''
})

// 知微珠光晕颜色随主导数据域微调
const domainColors: Record<string, string> = {
  emotion: 'rgba(240, 160, 60, 0.5)',   // 暖琥珀
  work: 'rgba(200, 210, 230, 0.5)',      // 冷白
  body: 'rgba(120, 200, 140, 0.5)',      // 柔绿
  knowledge: 'rgba(160, 140, 220, 0.5)',  // 淡紫
  relation: 'rgba(230, 160, 180, 0.5)',  // 淡粉
}
const pearlGlowStyle = computed(() => {
  if (!dominantDomain.value) return {}
  return {
    '--pearl-glow': domainColors[dominantDomain.value] || 'rgba(var(--accent-rgb), 0.5)',
  } as any
})

function computeStats() {
  const items = wisdomItems.value
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekRecords = items.filter(item => {
    const d = new Date(item.createdAt)
    return d >= weekAgo && d <= now
  }).length
  stats.value = {
    totalRecords: items.length,
    weekRecords,
    pearlSpins: statsStore.completedSessionCount,
    fragments: items.length,
  }
  computeDominantDomain()
}

function computeDominantDomain() {
  // 基于近期情绪/工作/身体/知识/关系数据密度判断主导域
  const emotions = statsStore.emotions || []
  const recentEmotions = emotions.filter((e: any) => {
    const d = new Date(e.at || e.createdAt || 0)
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
  }).length

  const sessions = statsStore.completedSessions || []
  const recentSessions = sessions.filter((s: any) => {
    const d = new Date(s.completedAt || 0)
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
  }).length

  const densities: Record<string, number> = {
    emotion: recentEmotions,
    work: recentSessions,
    body: (body.metrics.value?.length ?? 0) + (body.sleepRecords.value?.length ?? 0),
    knowledge: stats.value.weekRecords,
    relation: relation.count.value,
  }

  const maxKey = Object.entries(densities).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  dominantDomain.value = densities[maxKey] > 0 ? maxKey : ''
}

// ---- Wisdom Items CRUD 已下沉至 useWisdom()（src/modules/wisdom）----
// 本视图仅消费 wisdomItems / addWisdomItem / removeWisdomItem / reload

// ---------- 添加记录 ----------
const newRecordQuestion = ref('')
const newRecordAnswer = ref('')
const newRecordTags = ref('')

function saveRecord() {
  const q = newRecordQuestion.value.trim()
  const a = newRecordAnswer.value.trim()
  if (!q || !a) return
  const tags = newRecordTags.value.split(',').map(t => t.trim()).filter(Boolean)
  addWisdomItem(q, a, tags)
  newRecordQuestion.value = ''
  newRecordAnswer.value = ''
  newRecordTags.value = ''
  computeStats()
}

// ---------- 搜索记录 ----------
const searchQuery = ref('')

const filteredRecords = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return wisdomItems.value
  return wisdomItems.value.filter(item => {
    return item.question.toLowerCase().includes(q)
      || item.answer.toLowerCase().includes(q)
      || (item.tags && item.tags.some(t => t.toLowerCase().includes(q)))
  })
})

function onSearchInput() {}

// ---------- 记录详情展开 ----------
const expandedRecordId = ref<string | null>(null)

function toggleRecordExpand(id: string) {
  expandedRecordId.value = expandedRecordId.value === id ? null : id
}

// ---------- 删除记录 ----------
function deleteRecord(id: string) {
  removeWisdomItem(id)
  if (expandedRecordId.value === id) {
    expandedRecordId.value = null
  }
  computeStats()
}

// ---------- 工具函数 ----------
function formatTime(iso: string): string {
  const d = new Date(iso)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${min}`
}

// ---------- 数据获取 ----------
function getCtx(): WisdomContext {
  const localToday = getLocalDateKey()
  const timestampToday = new Date().toISOString().slice(0, 10)
  const sessions = statsStore.completedSessions
  const todayFocus = sessions.filter(s => s.completedAt?.startsWith(timestampToday)).length
  const totalFocus = sessions.length
  const totalMin = Math.round(sessions.reduce((a, s) => a + s.elapsed / 60000, 0))
  const emotions = statsStore.emotions
  const recentSad = emotions.filter(e => e.type === 'sad').slice(-7).length
  const recentHappy = emotions.filter(e => e.type === 'happy').slice(-7).length
  const recentCalm = emotions.filter(e => e.type === 'calm').slice(-7).length
  const recentAnxious = emotions.filter(e => e.type === 'anxious').slice(-7).length
  const recentAngry = emotions.filter(e => e.type === 'angry').slice(-7).length
  const totalNotes = statsStore.noteCount
  const anchors = loadAnchors()
  const pendingAnchors = anchors.filter((a: any) => !a.done && a.targetDate === localToday).length
  const doneAnchors = anchors.filter((a: any) => a.done && a.targetDate === localToday).length
  const shifts = loadShifts()
  const monthHours = Math.round(shifts.filter((s: any) => s.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((a: any, s: any) => a + (s.hours || 0), 0))
  const relations = relation.count.value
  const bodyRecords = (body.metrics.value?.length ?? 0) + (body.sleepRecords.value?.length ?? 0)
  return { todayFocus, totalFocus, totalMin, recentSad, recentHappy, recentCalm, recentAnxious, recentAngry, totalNotes, emotionCount: statsStore.emotionCount, pendingAnchors, doneAnchors, monthHours, relations, bodyRecords }
}

function loadAnchors() { return storage.getKV<any[]>('heartflow:anchors', []) }
function loadShifts() { return storage.getKV<any[]>('heartflow:shifts', []) }

// ---------- 导航到房间 ----------
const roomRouteMap: Record<string, string> = {
  '时间长廊': '/time-corridor',
  '情绪花房': '/garden',
  '羁绊之厅': '/relations',
  '蜕变回廊': '/goals',
  '留光阁': '/goals',
  '逐日心锚': '/anchor',
  '经略阁': '/knowledge',
  '更漏': '/worklog',
  '思绪书房': '/study',
}

function navigateToRoom(card: { room?: string; route?: string }) {
  const route = card.route || (card.room ? roomRouteMap[card.room] : undefined)
  if (route) {
    router.push(route)
  }
}

// ---------- 规则引擎：关键词匹配 + 数据域路由 ----------
// 原则：光点之间不使用任何因果连接词，仅并置呈现
async function ask() {
  if (!question.value.trim() || thinking.value) return
  thinking.value = true
  answerCards.value = []
  const c = getCtx()
  await new Promise(r => setTimeout(r, 800))

  answerCards.value = runAsk(c, question.value)

  // 保存对话历史
  const summary = answerCards.value.map(card => `[${card.domain}] ${card.content}`).join('\n')
  history.value.unshift({ id: `wh${Date.now()}`, q: question.value, a: summary, at: new Date().toISOString() })
  if (history.value.length > 20) history.value.length = 20
  wisdomHistory.save()
  question.value = ''
  thinking.value = false
}

// ---------- 轻量回看片段（不叙事）----------
async function hammer() {
  hammering.value = true
  hammerActs.value = []
  const c = getCtx()
  await new Promise(r => setTimeout(r, 600))
  hammerActs.value = runHammer(c)
  hammering.value = false
}

// ---------- 年度回看（纯数据罗列）----------
function annualLetter() {
  annualText.value = buildAnnualLetter(getCtx())
}

// ---------- 初始化 ----------
onMounted(() => {
  reload()
  wisdomHistory.load()
  computeStats()
})
</script>

<style scoped>
/* ========== 全局容器 ========== */
.wp {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100%;
  background: transparent;
  position: relative;
  overflow-y: auto;
}
  .wp :deep(.room-layout){position:relative;z-index:1}
.wp::before {
  content: '';
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 600px;
  height: 240px;
  background: radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.wp::after {
  content: '';
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 600px;
  height: 180px;
  background: radial-gradient(ellipse at 50% 100%, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ========== 头部装饰 ========== */
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}
.orn-line {
  display: block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.4), transparent);
}
.orn-diamond {
  font-size: 10px;
  color: var(--accent);
  opacity: 0.6;
}
.header-kicker {
  text-align: center;
  font-size: 12px;
  color: var(--accent);
  letter-spacing: 4px;
  margin: 0 0 4px 0;
}
.wp-title {
  text-align: center;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 6px;
  color: var(--accent);
  margin: 0 0 28px 0;
}

/* ========== 统计概览行 ========== */
.wp-stats-section {
  display: flex;
  justify-content: space-around;
  margin-bottom: 24px;
  padding: 16px 0;
  border-top: 1px solid rgba(var(--accent-rgb), 0.08);
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.08);
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
  gap: 8px;
}
.wp-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 80px;
}
.wp-stat-num {
  font-size: 20px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}
.domain-label {
  font-size: 16px;
  font-weight: 400;
  color: rgba(var(--accent-rgb), 0.7);
}
.wp-stat-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
}

/* ========== 知微珠 ========== */
.wp-pearl-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}
.wp-pearl {
  width: 40px;
  height: 40px;
  position: relative;
}
.wp-pearl.spinning {
  animation: pearl-spin 1.5s linear infinite;
}
@keyframes pearl-spin {
  100% { transform: rotate(360deg); }
}
.pearl-core {
  position: absolute;
  inset: 20%;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, rgba(var(--accent-rgb), 0.6), rgba(140, 100, 60, 0.4));
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.3);
}
.pearl-aura {
  position: absolute;
  inset: -60%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--pearl-glow, rgba(var(--accent-rgb), 0.12)), transparent 70%);
  animation: aura-pulse 4s ease-in-out infinite;
}
@keyframes aura-pulse {
  0%, 100% { transform: scale(0.7); opacity: 0.3; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

/* ========== 提问 ========== */
.wp-ask-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}
.wp-input {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  background: var(--card-bg);
  color: rgba(255, 255, 255, 0.85);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.25s;
}
.wp-input:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
}
.wp-input::placeholder {
  color: rgba(var(--accent-rgb), 0.45);
}
.wp-btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  align-self: flex-end;
  transition: background 0.2s, border-color 0.2s;
}
.wp-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.15);
  border-color: rgba(var(--accent-rgb), 0.4);
}
.wp-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.wp-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  font-size: 11px;
  align-self: auto;

  min-height: 26px;
}

/* ========== 回答区域：光点卡片并置 ========== */
.wp-answer-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}
.wp-answer-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
  animation: cardFadeIn 0.4s ease-out both;
}
.wp-answer-card:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  background: rgba(55, 48, 40, 0.7);
}
.wp-answer-card:focus-visible {
  outline: 2px solid rgba(var(--accent-rgb), 0.5);
  outline-offset: 1px;
}
@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.answer-domain {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 2px;
  display: block;
  margin-bottom: 4px;
}
.answer-text {
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.75);
  white-space: pre-line;
  margin: 0;
}
.answer-nav-hint {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.35);
  display: block;
  margin-top: 6px;
}

/* ========== 通用区块 ========== */
section {
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}
section h3 {
  font-size: 14px;
  color: rgba(var(--accent-rgb), 0.6);
  margin-bottom: 8px;
  font-weight: 400;
}
.hint {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.35);
  margin-bottom: 8px;
}

/* ========== 定音锤 ========== */
.wp-hammer-acts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}
.wp-hammer-act {
  padding: 14px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  animation: fadeInUp 0.5s ease-out both;
  transition: border-color 0.25s;
  cursor: pointer;
}
.wp-hammer-act:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
}
.wp-hammer-act:focus-visible {
  outline: 2px solid rgba(var(--accent-rgb), 0.5);
  outline-offset: 1px;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.wp-hammer-act h4 {
  font-size: 13px;
  color: var(--accent);
  margin-bottom: 4px;
  font-weight: 400;
}
.wp-hammer-act p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin: 0;
}

/* ========== 年度信 ========== */
.wp-letter-card {
  padding: 20px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  margin-top: 10px;
  position: relative;
}
.wp-letter-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.15), transparent);
  border-radius: 12px 12px 0 0;
}
.wp-letter-card .letter-text {
  font-size: 14px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.75);
  white-space: pre-line;
  margin: 0;
}

/* ========== 添加记录表单 ========== */
.wp-add-section {
  padding: 16px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.wp-record-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.record-input {
  font-size: 13px;
  padding: 10px 12px;
}
.record-textarea {
  font-size: 13px;
  padding: 10px 12px;
  min-height: 64px;
}

/* ========== 搜索记录 ========== */
.wp-search-section {
  margin-top: 4px;
}
.search-box {
  margin-top: 4px;
}
.search-input {
  font-size: 13px;
  padding: 10px 12px;
}

/* ========== 记录列表 ========== */
.wp-records-section {
  margin-top: 4px;
}
.record-count {
  font-size: 12px;
  font-weight: 400;
  color: rgba(var(--accent-rgb), 0.35);
}
.wp-record-card {
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-bottom: 8px;
  overflow: hidden;
  border-left: 2px solid rgba(var(--accent-rgb), 0.12);
  transition: border-color 0.25s;
}
.wp-record-card:hover {
  border-left-color: rgba(var(--accent-rgb), 0.3);
}
.wp-record-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.wp-record-header:hover {
  background: rgba(var(--accent-rgb), 0.04);
}
.wp-record-header:focus-visible {
  outline: 2px solid rgba(var(--accent-rgb), 0.5);
  outline-offset: -1px;
}
.record-q {
  flex: 1;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-time {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  white-space: nowrap;
}
.expand-icon {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.3);
}
.record-card-body {
  padding: 0 14px 14px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}
.record-a {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.6);
  white-space: pre-line;
  margin: 12px 0 10px;
}
.record-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.record-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}
.record-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ========== 对话历史 ========== */
.wp-hist-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
  font-size: 12px;
}
.wp-hist-question {
  color: rgba(var(--accent-rgb), 0.4);
}
.wp-hist-answer {
  color: var(--accent);
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 860px) {
  .wp { padding: 32px 20px 64px; }
  .wp-stat-item { gap: 2px; }
  .wp-stat-num { font-size: 16px; }
  .wp-ask-box { flex-direction: row; align-items: flex-end; }
  .wp-ask-box .wp-input { flex: 1; }
  .wp-ask-box .wp-btn { align-self: auto; }
}

@media (max-width: 640px) {
  .wp { padding: 24px 14px 56px; }
  .wp-stats-section { flex-direction: column; gap: 8px; padding: 12px 0; }
  .wp-stat-item { flex-direction: row; justify-content: space-between; width: 100%; }
  .wp-ask-box { flex-wrap: wrap; }
  .wp-ask-box .wp-input { width: 100%; }
  .wp-ask-box .wp-btn { width: 100%; align-self: auto; }
  .wp-record-form { width: 100%; }
  .wp-record-form .wp-input { width: 100%; }
  .wp-record-form .wp-btn { width: 100%; }
}
</style>