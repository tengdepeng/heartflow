<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance asm">
    <!-- 装饰性头部 -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">众生皆我 · 我皆众生</p>
    <h1 class="asm-title">众生象</h1>

    <!-- 时间范围切换 -->
    <div data-enter class="asm-time-range">
      <button v-for="opt in timeRangeOptions" :key="opt.value" :class="['tr-btn', { active: timeRange === opt.value }]" @click="timeRange = opt.value">
        {{ opt.label }}
      </button>
    </div>

    <!-- 概览卡片 -->
    <div data-enter class="asm-overview-cards">
      <div class="asm-overview-card">
        <span class="asm-overview-num">{{ totalMinutes }}</span>
        <span class="asm-overview-label">总专注时长 (分钟)</span>
      </div>
      <div class="asm-overview-card">
        <span class="asm-overview-num">{{ todayMinutes }}</span>
        <span class="asm-overview-label">今日专注 (分钟)</span>
      </div>
      <div class="asm-overview-card">
        <span class="asm-overview-num">{{ stats.sessions }}</span>
        <span class="asm-overview-label">专注次数</span>
      </div>
    </div>

    <!-- 意图场景卡 -->
    <section data-enter class="asm-intent-section">
      <h3>此刻想做什么</h3>
      <MirrorSceneCards @launch="handleIntentLaunch" />
    </section>

    <!-- 工具卡 / 百宝袋（F5 意图工具卡：超级自定义，可增删） -->
    <section data-enter class="asm-toolcards-section">
      <div class="asm-toolcards-head">
        <h3>百宝袋</h3>
        <button class="asm-edit-toggle" :class="{ active: editMode }" @click="editMode = !editMode">
          {{ editMode ? '完成' : '编辑' }}
        </button>
      </div>
      <div class="asm-toolcards-grid">
        <button
          v-for="card in toolCards"
          :key="card.id"
          class="asm-toolcard"
          :class="{ editing: editMode }"
          :title="card.description"
          @click="onToolCardClick(card)"
        >
          <span class="asm-toolcard-icon">{{ card.icon }}</span>
          <span class="asm-toolcard-label">{{ card.label }}</span>
          <span v-if="editMode" class="asm-toolcard-remove" @click.stop="removeToolCard(card.id)">✕</span>
        </button>
      </div>
      <div v-if="editMode" class="asm-toolcards-add">
        <select v-model="newCategory" class="asm-toolcard-select">
          <option v-for="opt in availableCategories" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <button class="asm-toolcard-add-btn" :disabled="!availableCategories.length" @click="onAddToolCard">
          {{ availableCategories.length ? '添加卡片' : '已全部添加' }}
        </button>
      </div>
    </section>

    <!-- 镜面粒子 -->
    <div class="asm-mirror-frame" @click="ripple()">
      <div class="asm-mirror-surface" :class="{ rippling: isRippling }">
        <div class="asm-mirror-particles">
          <span v-for="i in 60" :key="i" class="asm-mp" :style="particleStyle(i)" />
        </div>
        <p class="asm-mirror-label">{{ mirrorMessage }}</p>
      </div>
    </div>

    <!-- 众生统计数据 -->
    <section class="asm-stats-row">
      <div class="asm-stat-item">
        <span class="asm-stat-value">{{ stats.sessions }}</span>
        <span class="asm-stat-label">专注</span>
      </div>
      <div class="asm-stat-item">
        <span class="asm-stat-value">{{ stats.notes }}</span>
        <span class="asm-stat-label">笔记</span>
      </div>
      <div class="asm-stat-item">
        <span class="asm-stat-value">{{ stats.emotions }}</span>
        <span class="asm-stat-label">情绪</span>
      </div>
      <div class="asm-stat-item">
        <span class="asm-stat-value">{{ stats.relations }}</span>
        <span class="asm-stat-label">羁绊</span>
      </div>
      <div class="asm-stat-item">
        <span class="asm-stat-value">{{ stats.anchors }}</span>
        <span class="asm-stat-label">心锚</span>
      </div>
      <div class="asm-stat-item">
        <span class="asm-stat-value">{{ stats.goals }}</span>
        <span class="asm-stat-label">目标</span>
      </div>
    </section>

    <!-- 不同房间的镜像 -->
    <section><h3>不同房间的镜像</h3>
      <div class="asm-rooms">
        <div v-for="r in roomMirrors" :key="r.room" class="asm-room-card" :class="{ active: activeRoom?.room === r.room }" @click="selectRoom(r)">
          <span class="asm-room-icon">{{ r.icon }}</span>
          <div class="asm-room-body">
            <strong>{{ r.room }}</strong>
            <p>{{ r.desc }}</p>
          </div>
          <span class="asm-room-value">{{ r.value }}</span>
        </div>
      </div>
    </section>

    <!-- 镜像回响 -->
    <div v-if="activeRoom" class="asm-insight-card">
      <h4>{{ activeRoom.room }}</h4>
      <p>{{ roomInsight }}</p>
      <div v-if="activeRoom.detail" class="asm-detail-list">
        <div v-for="(d, i) in activeRoom.detail" :key="i" class="asm-detail-item">
          <span class="asm-detail-label">{{ d.label }}</span>
          <span class="asm-detail-value">{{ d.value }}</span>
        </div>
      </div>
      <div class="asm-insight-actions">
        <button class="asm-link-btn" @click="navigateToWisdom()">→ 去知微阁回看</button>
        <button class="asm-link-btn" @click="navigateToMirror">→ 与镜我对话</button>
      </div>
      <span class="asm-freshness">数据更新: {{ freshnessLabel }}</span>
    </div>

    <!-- 自我对话 -->
    <section class="asm-talk-area">
      <h3>自我对话</h3>
      <textarea v-model="talkText" placeholder="写下此刻想对自己说的话…" class="asm-talk-input" rows="2" />
      <button @click="saveTalk" class="asm-talk-btn" :disabled="!talkText.trim()">记录</button>
      <div v-if="talks.length" class="asm-talk-list">
        <div v-for="t in talks" :key="t.id" class="asm-talk-item">
          <p class="asm-talk-text">{{ t.text }}</p>
          <div class="asm-talk-meta">
            <span class="asm-talk-time">{{ fmt(t.at) }}</span>
            <span v-if="t.roomContext" class="asm-talk-context">来自: {{ t.roomContext }}</span>
          </div>
        </div>
      </div>
    </section>

    <p class="asm-quote">"我看到了。我接受了。这些全都是我。"</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useStatsStore } from '../stores'
import { useSelfTalks } from '../modules/self'
import MirrorSceneCards from '../components/MirrorSceneCards.vue'
import { useTimer } from '../resonance/bridges/timer'
import { getIntentRoute, isDirectAction } from '../modules/mirror/intent-launch'
import { useMirrorToolCards, type MirrorToolCard } from '../modules/mirror'
import { INTENT_INFO } from '../modules/mirror'
import type { IntentCategory } from '../modules/mirror/types'

const { entranceRef, entranceClass } = useViewEntrance()
const statsStore = useStatsStore()
const router = useRouter()
const { mirrorStats: stats, completedSessions: allSessions, totalFocusMinutes: totalMinutes, todayFocusMinutes: todayMinutes, streakDays, emotionByType, relations } = storeToRefs(statsStore)
const { talks, loadTalks, addTalk } = useSelfTalks()
const talkText = ref('')
const activeRoom = ref<{ room: string; icon: string; desc: string; value: string; detail?: { label: string; value: string }[] } | null>(null)
const isRippling = ref(false)
const timeRange = ref<'all' | '7d' | '30d' | '90d'>('all')
const dataFreshness = ref<string>(new Date().toISOString())

const timeRangeOptions = [
  { label: '全部', value: 'all' as const },
  { label: '7天', value: '7d' as const },
  { label: '30天', value: '30d' as const },
  { label: '90天', value: '90d' as const },
]

const freshnessLabel = computed(() => {
  const d = new Date(dataFreshness.value)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

const roomMirrors = computed(() => [
  { room: '时间长廊', icon: '◈', desc: '走到三年前的自己面前', value: `${stats.value.sessions} 次` },
  { room: '情绪花房', icon: '🌷', desc: '所有情绪状态并列', value: `${stats.value.emotions} 条` },
  { room: '羁绊之厅', icon: '👥', desc: '在每个人面前呈现的镜像', value: `${stats.value.relations} 人` },
  { room: '蜕变回廊', icon: '🦋', desc: '蜕变前后的自己', value: `${totalMinutes.value} 分钟` },
  { room: '留光阁', icon: '☆', desc: '你许下的愿望和方向', value: `${stats.value.goals} 个` },
  { room: '逐日心锚', icon: '⚓', desc: '每天锚定的点滴', value: `${stats.value.anchors} 条` },
])

function selectRoom(r: typeof roomMirrors.value[0]) {
  const detail = getRoomDetail(r.room)
  activeRoom.value = { ...r, detail }
  dataFreshness.value = new Date().toISOString()
}

function getRoomDetail(room: string): { label: string; value: string }[] | undefined {
  switch (room) {
    case '时间长廊':
      return [
        { label: '总专注次数', value: String(allSessions.value.length) },
        { label: '总专注时长', value: `${totalMinutes.value} 分钟` },
        { label: '今日专注', value: `${todayMinutes.value} 分钟` },
        { label: '最长连续天数', value: `${streakDays.value} 天` },
      ]
    case '情绪花房':
      return [
        { label: '轻快', value: String(emotionByType.value['happy'] || 0) },
        { label: '平静', value: String(emotionByType.value['calm'] || 0) },
        { label: '低落', value: String(emotionByType.value['sad'] || 0) },
        { label: '紧绷', value: String(emotionByType.value['anxious'] || 0) },
        { label: '烦躁', value: String(emotionByType.value['angry'] || 0) },
      ]
    case '羁绊之厅':
      return relations.value.slice(0, 5).map(p => ({
        label: p.name,
        value: p.relation === 'family' ? '家人' : p.relation === 'lover' ? '伴侣' : p.relation === 'friend' ? '朋友' : '其他',
      }))
    default:
      return undefined
  }
}

const roomInsight = computed(() => activeRoom.value?.desc || '点击上面一个镜像查看详情')

// 导航联动
function navigateToWisdom() {
  router.push('/wisdom')
}

function navigateToMirror() {
  router.push('/mirror')
}

// 意图场景卡分发：专注直达计时器，其余导航至对应房间
function handleIntentLaunch(category: IntentCategory) {
  if (isDirectAction(category)) {
    const timer = useTimer()
    if (timer.isFocusing || timer.isPaused) timer.interrupt()
    timer.setMode('focus', 25)
    timer.start()
    return
  }
  const route = getIntentRoute(category)
  if (route) router.push(route)
}

// ---- 工具卡 / 百宝袋（F5） ----
const { cards: toolCards, addCard: addToolCard, removeCard: removeToolCard } = useMirrorToolCards()
const editMode = ref(false)
const newCategory = ref<IntentCategory>('note')

// 编辑模式下尚未添加过的意图，供下拉选择
const availableCategories = computed(() => {
  const used = new Set(toolCards.value.map((c) => c.category))
  return (Object.keys(INTENT_INFO) as IntentCategory[])
    .filter((c) => c !== 'unknown' && !used.has(c))
    .map((c) => ({ value: c, label: INTENT_INFO[c].label }))
})

// 点击卡片：非编辑模式下发射其意图（复用 handleIntentLaunch）
function onToolCardClick(card: MirrorToolCard) {
  if (editMode.value) return
  handleIntentLaunch(card.category)
}

// 编辑模式下新增一张自定义卡
function onAddToolCard() {
  const c = newCategory.value
  const meta = INTENT_INFO[c]
  if (!meta) return
  addToolCard({ category: c, label: meta.label, icon: meta.icon, description: meta.description })
  if (availableCategories.value.length) newCategory.value = availableCategories.value[0].value
}

const mirrorMessage = computed(() => {
  const msgs = ['触碰镜面', '看见不同的自己', '你在这里', '每一面都是你']
  return msgs[Math.floor(Math.random() * msgs.length)]
})

function ripple() {
  isRippling.value = true
  setTimeout(() => { isRippling.value = false }, 600)
}

function particleStyle(i: number) {
  const hue = 200 + Math.sin(i) * 30
  const size = 2 + Math.sin(i * 2.3) * 1.5
  return {
    left: `${20 + Math.sin(i * 1.7) * 35 + 50}%`,
    top: `${20 + Math.cos(i * 1.9) * 35 + 50}%`,
    width: `${size}px`,
    height: `${size}px`,
    background: `hsl(${hue},60%,${50 + Math.sin(i) * 20}%)`,
    opacity: 0.3 + Math.sin(i * 3.1) * 0.2,
    animationDelay: `${i * 0.1}s`,
  }
}

function saveTalk() {
  if (!talkText.value.trim()) return
  addTalk(talkText.value, activeRoom.value?.room || null)
  talkText.value = ''
}

function fmt(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => { loadTalks() })
</script>

<style scoped>
/* =============================================
   深夜食堂 · 暖琥珀
   众生象 — 所我皆众生象
   ============================================= */

.asm {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  overflow-y: auto;
  background: transparent;
}

.asm::before,
.asm::after {
  content: '';
  position: fixed;
  top: 0;
  width: 220px;
  height: 100dvh;
  pointer-events: none;
  z-index: 0;
}

.asm::before {
  left: 0;
  background: radial-gradient(ellipse at left center, rgba(var(--accent-rgb), 0.05), transparent 70%);
}

.asm::after {
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

.asm-title {
  position: relative;
  z-index: 1;
  text-align: center;
  font-family: var(--font-heading-en);
  font-size: 28px;
  font-weight: 400;
  color: rgba(var(--accent-rgb), 0.75);
  letter-spacing: 6px;
  margin: 0 0 16px;
}

/* ---- 时间范围切换 ---- */
.asm-time-range {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-bottom: 20px;
}
.tr-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.tr-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--text-high);
}
.tr-btn.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

/* ---- 概览卡片 ---- */
.asm-overview-cards {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.asm-overview-card {
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

.asm-overview-num {
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.asm-overview-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
  white-space: nowrap;
}

/* ---- 意图场景卡 ---- */
.asm-intent-section {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
}

/* ---- 工具卡 / 百宝袋 ---- */
.asm-toolcards-section {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
}

.asm-toolcards-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.asm-edit-toggle {
  padding: 3px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.asm-edit-toggle:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--text-high);
}
.asm-edit-toggle.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}

.asm-toolcards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.asm-toolcard {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.asm-toolcard:hover {
  background: var(--bg-card);
  border-color: rgba(var(--accent-rgb), 0.18);
  transform: translateY(-2px);
}
.asm-toolcard.editing {
  cursor: default;
}
.asm-toolcard.editing:hover {
  transform: none;
}

.asm-toolcard-icon {
  font-size: 20px;
  line-height: 1;
}

.asm-toolcard-label {
  font-size: 12px;
  color: var(--text-high);
}

.asm-toolcard-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(var(--bg-card-rgb), 0.9);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  color: var(--text-medium);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.asm-toolcard-remove:hover {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
}

.asm-toolcards-add {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.asm-toolcard-select {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}
.asm-toolcard-select:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.asm-toolcard-add-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.asm-toolcard-add-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.15);
  border-color: rgba(var(--accent-rgb), 0.3);
}
.asm-toolcard-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ---- 镜面粒子 ---- */
.asm-mirror-frame {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
  cursor: pointer;
}

.asm-mirror-surface {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.04), transparent);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.asm-mirror-surface:hover {
  border-color: rgba(var(--accent-rgb), 0.15);
}

.asm-mirror-surface.rippling {
  animation: asm-ripple 0.6s ease-out;
}

@keyframes asm-ripple {
  0% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0.3); }
  100% { box-shadow: 0 0 0 30px rgba(var(--accent-rgb), 0); }
}

.asm-mirror-particles {
  position: absolute;
  inset: 0;
}

.asm-mp {
  position: absolute;
  border-radius: 50%;
  animation: asm-float-particle 4s ease-in-out infinite;
}

@keyframes asm-float-particle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.asm-mirror-label {
  font-size: 12px;
  opacity: 0.25;
  z-index: 1;
}

/* ---- 众生统计数据 ---- */
.asm-stats-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.asm-stat-item {
  text-align: center;
  padding: 10px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.asm-stat-value {
  display: block;
  font-size: 22px;
  font-weight: 600;
  color: var(--accent);
}

.asm-stat-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  margin-top: 2px;
  display: block;
}

section h3 {
  position: relative;
  z-index: 1;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.7;
  margin-bottom: 10px;
}

/* ---- 不同房间的镜像 ---- */
.asm-rooms {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.asm-room-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-left: 2px solid rgba(var(--accent-rgb), 0.15);
  cursor: pointer;
  transition: all 0.2s;
}

.asm-room-card:hover {
  background: var(--bg-card);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.asm-room-card.active {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.2);
  border-left-color: var(--accent);
}

.asm-room-icon {
  font-size: 20px;
}

.asm-room-body {
  flex: 1;
}

.asm-room-body strong {
  font-size: 14px;
  display: block;
  color: var(--text-high);
}

.asm-room-body p {
  font-size: 11px;
  opacity: 0.5;
  margin: 2px 0 0;
  color: var(--text-medium);
}

.asm-room-value {
  font-size: 12px;
  color: var(--accent);
  opacity: 0.6;
}

/* ---- 镜像回响 (Insight Card) ---- */
.asm-insight-card {
  position: relative;
  z-index: 1;
  padding: 16px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-bottom: 24px;
}

.asm-insight-card h4 {
  font-size: 14px;
  margin-bottom: 8px;
  color: var(--accent);
}

.asm-insight-card p {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.78);
  white-space: pre-line;
}

.asm-detail-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asm-detail-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(var(--bg-card-rgb), 0.5);
  font-size: 12px;
}

.asm-detail-label {
  color: var(--text-medium);
}

.asm-detail-value {
  color: var(--text-high);
}

.asm-insight-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.asm-link-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.asm-link-btn:hover {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
}
.asm-freshness {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.25);
  display: block;
  margin-top: 10px;
}

/* ---- 自我对话 ---- */
.asm-talk-area {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
}

.asm-talk-input {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high);
  font-family: inherit;
  font-size: 13px;
  outline: none;
  resize: vertical;
  margin-bottom: 8px;
  transition: border-color 0.25s;
}

.asm-talk-input::placeholder {
  color: var(--text-secondary);
}

.asm-talk-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.asm-talk-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.asm-talk-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.15);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.asm-talk-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.asm-talk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.asm-talk-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-left: 2px solid rgba(var(--accent-rgb), 0.2);
}

.asm-talk-text {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(var(--text-primary-rgb), 0.78);
  margin: 0;
}

.asm-talk-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 11px;
}

.asm-talk-time {
  color: var(--text-low);
}

.asm-talk-context {
  color: rgba(var(--accent-rgb), 0.4);
}

/* ---- 引用 ---- */
.asm-quote {
  position: relative;
  z-index: 1;
  text-align: center;
  font-size: 13px;
  font-style: italic;
  color: rgba(var(--accent-rgb), 0.3);
  margin-top: 28px;
}

/* ---- 空状态 ---- */
.asm-empty-hint {
  text-align: center;
  padding: 40px 0;
  color: var(--text-faint);
  font-size: 13px;
}

/* ---- 滚动条 ---- */
.asm::-webkit-scrollbar {
  width: 4px;
}

.asm::-webkit-scrollbar-track {
  background: transparent;
}

.asm::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-rgb), 0.1);
  border-radius: 2px;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .asm { padding: 32px 20px 64px; }
  .asm-overview-cards { gap: 8px; }
  .asm-stats-row { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .asm { padding: 24px 14px 56px; }
  .asm-overview-cards { flex-direction: column; }
  .asm-insight-actions { flex-direction: column; }
}

@media (max-width: 480px) {
  .asm-stats-row { grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .asm-overview-num { font-size: 32px; }
}
</style>