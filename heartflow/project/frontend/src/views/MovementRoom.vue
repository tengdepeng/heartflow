<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance mv">
    <header data-enter>
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">动律之间，记录每一次身体的律动</p>
      <h1 class="mv-title">动律之间</h1>
    </header>

    <!-- 运动轨迹图 -->
    <section data-enter class="mv-trajectory-section">
      <h3>📈 运动轨迹</h3>
      <div class="mv-trajectory" v-if="moves.length">
        <div class="mv-traj-bar">
          <div v-for="(m, i) in recentMoves" :key="m.id" class="mv-traj-dot" :class="`dot-${m.type}`" :style="{ left: `${(i / Math.max(recentMoves.length - 1, 1)) * 100}%`, opacity: 0.4 + (i / recentMoves.length) * 0.6 }" :title="`${typeLabel(m.type)} ${m.duration}分钟`">
            <span class="mv-traj-tooltip">{{ typeIcon(m.type) }} {{ m.duration }}分</span>
          </div>
        </div>
        <div class="mv-traj-line">
          <span class="mv-traj-label">最近 20 次运动</span>
          <span class="mv-traj-label">{{ stats.total }} 次 · {{ stats.totalMin }} 分钟</span>
        </div>
      </div>
      <div v-else class="mv-empty-hint">开始记录后，运动轨迹会在这里生长</div>
    </section>

    <!-- 记录运动表单 -->
    <section data-enter><h3>✏️ 记录运动</h3>
      <div class="mv-form-card">
        <div class="mv-form-row">
          <select v-model="form.type" class="mv-select">
            <option value="run">🏃 跑步</option><option value="swim">🏊 游泳</option>
            <option value="bike">🚴 骑行</option><option value="yoga">🧘 瑜伽</option>
            <option value="hike">🥾 爬山</option><option value="gym">🏋️ 力量</option>
            <option value="dance">💃 跳舞</option><option value="climb">🧗 攀岩</option>
            <option value="other">💪 其他</option>
          </select>
          <input v-model.number="form.duration" type="number" min="1" placeholder="分钟" class="mv-input" style="width:70px" />
        </div>
        <div class="mv-form-row">
          <input v-model="form.withWhom" placeholder="和谁一起（可选）" class="mv-input" />
          <input v-model="form.location" placeholder="在哪里（可选）" class="mv-input" />
        </div>
        <textarea v-model="form.note" placeholder="感觉怎么样？" class="mv-textarea" rows="2" />
        <div class="mv-form-footer">
          <label class="mv-moment-toggle">
            <input type="checkbox" v-model="form.isMoment" />
            <span class="mv-moment-label">🌟 标记为运动时刻</span>
          </label>
          <button @click="addMove" class="mv-btn" :disabled="!form.duration">💾 记录</button>
        </div>
      </div>
    </section>

    <!-- 统计汇总 -->
    <section data-enter class="mv-stats-section">
      <h3>📊 运动统计</h3>
      <div class="mv-stats-grid">
        <div class="mv-stat-card"><span class="mv-stat-num">{{ stats.total }}</span><span class="mv-stat-label">总次数</span></div>
        <div class="mv-stat-card"><span class="mv-stat-num">{{ stats.totalMin }}</span><span class="mv-stat-label">总分钟</span></div>
        <div class="mv-stat-card"><span class="mv-stat-num">{{ stats.weekCount }}</span><span class="mv-stat-label">本周</span></div>
      </div>
      <div class="mv-type-dist" v-if="typeDistribution.length">
        <div v-for="d in typeDistribution" :key="d.type" class="mv-type-row">
          <span class="mv-type-label">{{ typeIcon(d.type) }} {{ typeLabel(d.type) }}</span>
          <div class="mv-type-bar">
            <div class="mv-type-fill" :class="`fill-${d.type}`" :style="{ width: d.pct + '%' }" />
          </div>
          <span class="mv-type-pct">{{ d.count }}次</span>
        </div>
      </div>
    </section>

    <!-- 周趋势 -->
    <section data-enter class="mv-weekly-section" v-if="moves.length">
      <h3>周趋势</h3>
      <div class="mv-weekly-tabs">
        <button class="mv-weekly-tab" :class="{ active: weeklyMetric === 'duration' }" @click="weeklyMetric = 'duration'">时长</button>
        <button class="mv-weekly-tab" :class="{ active: weeklyMetric === 'count' }" @click="weeklyMetric = 'count'">次数</button>
      </div>
      <div class="mv-weekly-chart" v-if="weeklyData.length">
        <div v-for="(w, i) in weeklyData" :key="i" class="mv-weekly-bar-col">
          <div class="mv-weekly-bar-wrapper">
            <div class="mv-weekly-bar-fill" :style="{ height: w.pct + '%' }" :title="w.label + ': ' + w.value"></div>
          </div>
          <span class="mv-weekly-bar-label">{{ w.label }}</span>
        </div>
      </div>
    </section>

    <!-- 运动记录列表 -->
    <section data-enter><h3>📜 运动记录</h3>
      <div class="mv-search-bar" v-if="moves.length">
        <input v-model="searchQuery" class="mv-search-input" placeholder="搜索运动记录..." />
      </div>
      <div class="mv-type-filters" v-if="moves.length">
        <button
          v-for="t in typeFilterOptions"
          :key="t.value"
          class="mv-type-filter"
          :class="{ active: activeTypeFilter === t.value }"
          @click="activeTypeFilter = t.value"
        >{{ t.label }}</button>
      </div>
      <div class="mv-move-list" v-if="moves.length">
        <div v-for="m in filteredMoves" :key="m.id" class="mv-move-card" :class="{ 'is-moment': m.isMoment }">
          <div class="mv-move-card-header">
            <span class="mv-move-icon">{{ typeIcon(m.type) }}</span>
            <div class="mv-move-info">
              <span class="mv-move-type">{{ typeLabel(m.type) }} · {{ m.duration }}分钟</span>
              <span class="mv-move-date">{{ fmt(m.at) }}</span>
            </div>
            <span v-if="m.isMoment" class="mv-moment-badge">🌟 运动时刻</span>
            <button class="mv-del" @click="removeMove(m.id)">×</button>
          </div>
          <div class="mv-move-details" v-if="m.withWhom || m.location || m.note">
            <span v-if="m.withWhom" class="mv-move-detail">👤 {{ m.withWhom }}</span>
            <span v-if="m.location" class="mv-move-detail">📍 {{ m.location }}</span>
            <p v-if="m.note" class="mv-move-note">{{ m.note }}</p>
          </div>
        </div>
      </div>
      <div v-else class="mv-empty-hint">
        <span>🏃</span>
        <p>记录你的每一次身体律动</p>
      </div>
    </section>

    <!-- 运动计划与成就 -->
    <section data-enter>
      <MovementAchievementsPanel />
    </section>

    <!-- 运动分析（movement·useMovementAnalytics） -->
    <MovementAnalyticsPanel :moves="moves" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useMovement } from '../modules/movement/movement-log'
import MovementAchievementsPanel from '../components/movement/MovementAchievementsPanel.vue'
import MovementAnalyticsPanel from '../components/MovementAnalyticsPanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const movement = useMovement()
const moves = movement.items

const form = reactive({ type: 'run', duration: 30, withWhom: '', location: '', note: '', isMoment: false })

const labels: Record<string, string> = { run: '跑步', swim: '游泳', bike: '骑行', yoga: '瑜伽', hike: '爬山', gym: '力量', dance: '跳舞', climb: '攀岩', other: '运动' }
const icons: Record<string, string> = { run: '🏃', swim: '🏊', bike: '🚴', yoga: '🧘', hike: '🥾', gym: '🏋️', dance: '💃', climb: '🧗', other: '💪' }
function typeLabel(t: string) { return labels[t] || t }
function typeIcon(t: string) { return icons[t] || '💪' }

const searchQuery = ref('')
const activeTypeFilter = ref('all')
const weeklyMetric = ref<'duration' | 'count'>('duration')

const typeFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'run', label: '跑步' },
  { value: 'swim', label: '游泳' },
  { value: 'bike', label: '骑行' },
  { value: 'yoga', label: '瑜伽' },
  { value: 'hike', label: '爬山' },
  { value: 'gym', label: '力量' },
  { value: 'dance', label: '跳舞' },
  { value: 'climb', label: '攀岩' },
  { value: 'other', label: '其他' },
]

const filteredMoves = computed(() => {
  let list = sortedMoves.value
  if (activeTypeFilter.value !== 'all') {
    list = list.filter(m => m.type === activeTypeFilter.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(m =>
      (m.note || '').toLowerCase().includes(q) ||
      (m.location || '').toLowerCase().includes(q) ||
      typeLabel(m.type).toLowerCase().includes(q)
    )
  }
  return list
})

const weeklyData = computed(() => {
  const now = new Date()
  const weeks: { label: string; value: number; pct: number }[] = []
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)
    const weekLogs = moves.value.filter(m => {
      const md = new Date(m.at)
      return md >= weekStart && md < weekEnd
    })
    const value = weeklyMetric.value === 'duration'
      ? weekLogs.reduce((a, m) => a + m.duration, 0)
      : weekLogs.length
    weeks.push({ label: `W${i + 1}`, value, pct: 0 })
  }
  const maxVal = Math.max(...weeks.map(w => w.value), 1)
  for (const w of weeks) w.pct = (w.value / maxVal) * 100
  return weeks
})

const sortedMoves = computed(() => [...moves.value].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()))
const recentMoves = computed(() => sortedMoves.value.slice(0, 20))

const stats = computed(() => {
  const total = moves.value.length
  const totalMin = moves.value.reduce((a, m) => a + m.duration, 0)
  const now = new Date()
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const weekCount = moves.value.filter(m => new Date(m.at) >= weekStart).length
  const types = new Set(moves.value.map(m => m.type)).size
  return { total, totalMin, weekCount, types }
})

const typeDistribution = computed(() => {
  const map = new Map<string, number>()
  moves.value.forEach(m => map.set(m.type, (map.get(m.type) || 0) + 1))
  const total = moves.value.length
  return [...map.entries()]
    .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
})

function addMove() {
  if (!form.duration) return
  movement.add({
    type: form.type,
    duration: form.duration,
    withWhom: form.withWhom,
    location: form.location,
    note: form.note,
    isMoment: form.isMoment,
  })
  form.duration = 30
  form.withWhom = ''
  form.location = ''
  form.note = ''
  form.isMoment = false
}

function removeMove(id: string) {
  movement.remove(id)
}

function fmt(iso: string) {
  const d = new Date(iso)
  const now = new Date(); const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(() => { movement.load() })
</script>

<style scoped>
.mv {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  overflow: hidden;
}
.mv::before {
  content: '';
  position: fixed;
  top: -20%;
  left: -10%;
  width: 120%;
  height: 50%;
  background: radial-gradient(ellipse at 30% 50%, rgba(var(--accent-rgb), 0.07) 0%, transparent 65%);
  pointer-events: none;
  z-index: 0;
}
.mv::after {
  content: '';
  position: fixed;
  bottom: -15%;
  right: -10%;
  width: 100%;
  height: 40%;
  background: radial-gradient(ellipse at 70% 50%, rgba(var(--accent-rgb), 0.05) 0%, transparent 65%);
  pointer-events: none;
  z-index: 0;
}

/* Header ornament */
header {
  position: relative;
  z-index: 1;
  margin-bottom: 28px;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}
.orn-line {
  display: block;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.25), transparent);
}
.orn-diamond {
  color: var(--accent);
  font-size: 10px;
  opacity: 0.5;
}
.header-kicker {
  text-align: center;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.45);
  letter-spacing: 3px;
  margin-bottom: 4px;
}
.mv-title {
  text-align: center;
  font-size: 24px;
  font-weight: 400;
  letter-spacing: 6px;
  color: var(--accent);
}

/* General section */
section {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
}
section h3 {
  font-size: 13px;
  font-weight: 400;
  color: rgba(var(--accent-rgb), 0.55);
  letter-spacing: 2px;
  margin-bottom: 10px;
}

/* Trajectory section */
.mv-trajectory-section {
  margin-bottom: 20px;
}
.mv-trajectory {
  padding: 16px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.mv-traj-bar {
  position: relative;
  height: 20px;
  margin-bottom: 6px;
}
.mv-traj-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translateX(-50%);
  top: 6px;
  cursor: pointer;
}
.mv-traj-dot:hover .mv-traj-tooltip {
  opacity: 1;
}
.mv-traj-tooltip {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  white-space: nowrap;
  background: rgba(13, 11, 9, 0.85);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  padding: 3px 7px;
  border-radius: 4px;
  opacity: 0;
  pointer-events: none;
  color: var(--accent);
  transition: opacity 0.15s;
}
.dot-run { background: var(--accent); }
.dot-swim { background: #7ab8d4; }
.dot-bike { background: #e8b88a; }
.dot-yoga { background: #c49060; }
.dot-hike { background: #8bc4a0; }
.dot-gym { background: #e0a86e; }
.dot-dance { background: var(--accent); }
.dot-climb { background: #b89070; }
.dot-other { background: #a08060; }
.mv-traj-line {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}
.mv-empty-hint {
  text-align: center;
  padding: 24px;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.3);
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px dashed rgba(var(--accent-rgb), 0.08);
}
.mv-empty-hint span {
  font-size: 36px;
  display: block;
  margin-bottom: 6px;
}
.mv-empty-hint p {
  margin: 0;
  color: rgba(var(--accent-rgb), 0.3);
}

/* Form card */
.mv-form-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.mv-form-row {
  display: flex;
  gap: 6px;
}
.mv-select {
  padding: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}
.mv-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.mv-input::placeholder, .mv-select::placeholder, .mv-textarea::placeholder {
  color: rgba(var(--accent-rgb), 0.2);
}
.mv-input:focus, .mv-select:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
}
.mv-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  line-height: 1.5;
  transition: border-color 0.2s;
}
.mv-textarea:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
}
.mv-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mv-moment-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.mv-moment-toggle input {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
}
.mv-moment-label {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.45);
}
.mv-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.mv-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.35);
}
.mv-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Stats section */
.mv-stats-section {
  margin-bottom: 20px;
}
.mv-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
.mv-stat-card {
  text-align: center;
  padding: 14px 10px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: border-color 0.2s;
}
.mv-stat-card:hover {
  border-color: rgba(var(--accent-rgb), 0.15);
}
.mv-stat-num {
  display: block;
  font-size: 22px;
  font-weight: 500;
  color: var(--accent);
}
.mv-stat-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
  margin-top: 3px;
  display: block;
  letter-spacing: 1px;
}

/* Type distribution */
.mv-type-dist {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mv-type-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.mv-type-label {
  width: 80px;
  color: rgba(var(--accent-rgb), 0.6);
  flex-shrink: 0;
}
.mv-type-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-card);
  overflow: hidden;
}
.mv-type-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s;
}
.fill-run { background: var(--accent); }
.fill-swim { background: #7ab8d4; }
.fill-bike { background: #e8b88a; }
.fill-yoga { background: #c49060; }
.fill-hike { background: #8bc4a0; }
.fill-gym { background: #e0a86e; }
.fill-dance { background: var(--accent); }
.fill-climb { background: #b89070; }
.fill-other { background: #a08060; }
.mv-type-pct {
  width: 40px;
  text-align: right;
  color: rgba(var(--accent-rgb), 0.4);
  font-size: 11px;
  flex-shrink: 0;
}

/* Move list */
.mv-move-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mv-move-card {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-left: 3px solid rgba(var(--accent-rgb), 0.12);
  transition: border-color 0.2s, background 0.2s;
}
.mv-move-card.is-moment {
  border-left-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.06);
}
.mv-move-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mv-move-icon {
  font-size: 18px;
  flex-shrink: 0;
}
.mv-move-info {
  flex: 1;
  min-width: 0;
}
.mv-move-type {
  font-size: 13px;
  font-weight: 500;
  display: block;
  color: rgba(var(--accent-rgb), 0.8);
}
.mv-move-date {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.3);
}
.mv-moment-badge {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  white-space: nowrap;
  flex-shrink: 0;
}
.mv-del {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.15);
  cursor: pointer;
  opacity: 0;
  font-size: 12px;
  transition: color 0.2s, opacity 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mv-move-card:hover .mv-del {
  opacity: 1;
}
.mv-del:hover {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
}
.mv-move-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  padding-left: 28px;
}
.mv-move-detail {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
}
.mv-move-note {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(var(--accent-rgb), 0.5);
  margin: 4px 0 0;
  width: 100%;
}

/* Scrollbar */
.mv::-webkit-scrollbar {
  width: 4px;
}
.mv::-webkit-scrollbar-track {
  background: transparent;
}
.mv::-webkit-scrollbar-thumb {
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
  .mv { padding: 32px 20px 64px; }
  .mv-stats-grid { gap: 8px; }
  .mv-stats-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .mv { padding: 24px 14px 56px; }
  .mv-stats-grid { flex-direction: column; }
}

@media (max-width: 480px) {
  .mv-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .mv-stat-card { padding: 8px; }
}

.mv-search-bar { margin-bottom: 8px; }
.mv-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.mv-search-input:focus { border-color: rgba(var(--accent-rgb), 0.3); }
.mv-type-filters { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
.mv-type-filter {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.45);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.mv-type-filter:hover { border-color: rgba(var(--accent-rgb), 0.2); color: var(--accent); }
.mv-type-filter.active { background: rgba(var(--accent-rgb), 0.1); border-color: rgba(var(--accent-rgb), 0.3); color: var(--accent); }
.mv-weekly-section { margin-bottom: 20px; }
.mv-weekly-tabs { display: flex; gap: 4px; margin-bottom: 10px; }
.mv-weekly-tab {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.45);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.mv-weekly-tab:hover { border-color: rgba(var(--accent-rgb), 0.2); }
.mv-weekly-tab.active { background: rgba(var(--accent-rgb), 0.1); border-color: rgba(var(--accent-rgb), 0.3); color: var(--accent); }
.mv-weekly-chart { display: flex; align-items: flex-end; gap: 8px; height: 100px; padding: 10px; border-radius: 10px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.mv-weekly-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.mv-weekly-bar-wrapper { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.mv-weekly-bar-fill { width: 60%; max-width: 24px; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.7), rgba(var(--accent-rgb), 0.3)); transition: height 0.3s; min-height: 2px; }
.mv-weekly-bar-label { font-size: 10px; color: rgba(var(--accent-rgb), 0.35); margin-top: 4px; }
</style>