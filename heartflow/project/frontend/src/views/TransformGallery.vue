<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance tg">
    <header class="tg-header" data-enter>
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">记录身体与心灵的每一次蜕变</p>
      <h1 class="tg-title">蜕变回廊</h1>
      <button class="tg-btn-new" @click="openCreate">+ 记录蜕变</button>
      <p class="tg-summary" v-if="stats.totalRecords > 0">🦋 {{ stats.totalRecords }} 次蜕变 · ⏱ {{ stats.totalDurationText }} · 最近 {{ stats.lastChangeText }}</p>
    </header>

    <!-- 1. 统计概览 -->
    <section data-enter class="tg-stats-section">
      <article class="tg-stat-card">
        <span class="tg-stat-label">总记录数</span>
        <strong class="tg-stat-value">{{ stats.totalRecords }}</strong>
        <span class="stat-note">次蜕变</span>
      </article>
      <article class="tg-stat-card">
        <span class="tg-stat-label">总时长</span>
        <strong class="tg-stat-value">{{ stats.totalDurationText }}</strong>
        <span class="stat-note">累计投入</span>
      </article>
      <article class="tg-stat-card">
        <span class="tg-stat-label">变化类型</span>
        <strong class="tg-stat-value">{{ stats.typeCount }}</strong>
        <span class="stat-note">种方向</span>
      </article>
    </section>

    <!-- 蜕变势能（transform-analytics 引擎：势能/节奏/类型热度/温和洞察，INCR-225） -->
    <TransformMomentumPanel :records="records" />

    <!-- 类型分布 -->
    <section data-enter class="tg-distribution" v-if="records.length">
      <h3 class="section-title">类型分布</h3>
      <div v-for="d in typeDistribution" :key="d.type" class="tg-dist-row">
        <span class="dist-icon">{{ d.icon }}</span>
        <span class="dist-label">{{ d.label }}</span>
        <div class="dist-bar-track">
          <div class="dist-bar-fill" :style="{ width: (records.length ? (d.count / records.length) * 100 : 0) + '%', background: d.color + '66' }"></div>
        </div>
        <span class="dist-count">{{ d.count }}</span>
      </div>
    </section>

    <!-- 2. 变化类型分组 -->
    <section data-enter class="tg-type-section">
      <h3 class="section-title">变化类型</h3>
      <div class="tg-type-chips">
        <div
          v-for="group in typeGroups"
          :key="group.type"
          class="tg-type-chip"
          :class="{ active: selectedType === group.type }"
          :style="selectedType === group.type ? { borderColor: group.color, background: group.color + '18' } : {}"
          role="button"
          tabindex="0"
          :aria-pressed="selectedType === group.type"
          :aria-label="'筛选变化类型 ' + group.label"
          @click="selectedType = selectedType === group.type ? null : group.type"
          @keydown.enter.prevent="selectedType = selectedType === group.type ? null : group.type"
          @keydown.space.prevent="selectedType = selectedType === group.type ? null : group.type"
        >
          <span class="type-icon">{{ group.icon }}</span>
          <span class="type-label">{{ group.label }}</span>
          <span class="type-count" :style="{ background: group.color + '22', color: group.color }">{{ group.count }}</span>
        </div>
      </div>
    </section>

    <!-- 搜索与排序 -->
    <section data-enter class="tg-controls">
      <input v-model="searchQuery" class="tg-search-input" placeholder="搜索蜕变记录..." />
      <select v-model="sortOrder" class="tg-sort-select">
        <option value="newest">最新优先</option>
        <option value="oldest">最早优先</option>
      </select>
    </section>

    <!-- 3. 时间线展示 -->
    <section data-enter class="tg-timeline-section">
      <h3 class="section-title">时间线</h3>
      <div v-if="monthGroups.length === 0" class="empty-state">
        <span class="empty-icon">🦋</span>
        <p class="empty-text">蜕变会在合适的时候发生</p>
        <p class="tg-empty-hint">记录你的第一个变化，开始见证成长</p>
      </div>
      <div v-else v-for="mg in monthGroups" :key="mg.month" class="tg-month-group">
        <div class="month-header">
          <span class="tg-month-label">{{ mg.monthLabel }}</span>
          <span class="month-count">{{ mg.records.length }} 条记录</span>
        </div>
        <div class="record-list">
          <div
            v-for="r in mg.records"
            :key="r.id"
            class="tg-record-card"
            :style="{ borderColor: typeMap[r.type].color + '33', '--card-accent': typeMap[r.type].color }"
          >
            <button class="tg-del" @click="remove(r.id)" title="删除记录">×</button>
            <div class="record-body">
              <p class="record-desc">{{ r.description }}</p>
              <div class="tg-record-meta">
                <span
                  class="type-tag"
                  :style="{ background: typeMap[r.type].color + '22', color: typeMap[r.type].color }"
                >
                  {{ typeMap[r.type].icon }} {{ typeMap[r.type].label }}
                </span>
                <span class="record-duration" v-if="r.duration > 0">
                  ⏱ {{ formatDuration(r.duration) }}
                </span>
                <span class="tg-record-date">{{ fmtDate(r.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. 岁时阁 · 蜕变光茧（联动成长庭院开花时刻） -->
    <section data-enter class="tg-cocoon-section" v-if="cocoons.length">
      <h3 class="section-title">🌀 岁时阁 · 蜕变光茧（{{ cocoons.length }}）</h3>
      <div class="cocoon-list">
        <div
          v-for="c in cocoonCards"
          :key="c.id"
          class="cocoon-card"
          :style="{ borderLeftColor: c.drivingColor }"
        >
          <div class="cocoon-head">
            <span class="cocoon-name">{{ c.name }}</span>
            <span class="cocoon-stage" :style="{ color: c.drivingColor }">{{ c.stage }}</span>
          </div>
          <div class="cocoon-meta">
            <span class="cocoon-driving" :style="{ background: c.drivingColor + '22', color: c.drivingColor }">{{ c.driving }}</span>
            <span v-if="c.depth != null" class="cocoon-depth">深度 {{ c.depth }}</span>
            <span v-if="c.texture" class="cocoon-texture">{{ c.texture }}</span>
            <span v-if="c.related" class="cocoon-related">🔗 关联目标</span>
          </div>
          <div class="cocoon-date">{{ c.createdAt }}</div>
        </div>
      </div>
    </section>
    <p v-else class="tg-cocoon-hint">尚未从成长庭院的开花时刻记录光茧</p>

    <!-- 5. 添加记录弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="tg-modal-overlay" @click.self="showModal = false">
          <div class="tg-modal-card">
            <h3>记录蜕变</h3>
            <p class="modal-hint">记录你在某个方向上的变化，无论大小</p>

            <div class="form-group">
              <label class="form-label">变化类型</label>
              <div class="type-pick">
                <button
                  v-for="t in typeOptions"
                  :key="t.type"
                  :class="['type-btn', { active: form.type === t.type }]"
                  :style="form.type === t.type ? { borderColor: t.color, background: t.color + '18' } : {}"
                  @click="form.type = t.type"
                >
                  <span class="type-btn-icon">{{ t.icon }}</span>
                  <span class="type-btn-label">{{ t.label }}</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">变化描述</label>
              <textarea
                v-model="form.description"
                class="form-input form-textarea"
                placeholder="描述你经历的变化，比如：坚持跑步一个月，体能明显提升…"
                rows="3"
              />
            </div>

            <div class="form-group">
              <label class="form-label">持续时间</label>
              <div class="duration-row">
                <input
                  v-model.number="form.duration"
                  type="number"
                  class="form-input duration-input"
                  placeholder="0"
                  min="0"
                />
                <span class="duration-unit">分钟</span>
              </div>
            </div>

            <div class="tg-modal-actions">
              <button class="tg-btn-cancel" @click="showModal = false">取消</button>
              <button
                class="tg-btn-save"
                @click="saveRecord"
                :disabled="!form.description.trim()"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useTransformGallery } from '../modules/transform'
import { useCocoonStore } from '../modules/seasonal/cocoon-store'
import TransformMomentumPanel from '../components/TransformMomentumPanel.vue'
import {
  DRIVING_FORCE_LABELS,
  DRIVING_FORCE_COLORS,
  COCOON_STAGE_LABELS,
  COCOON_TEXTURE_LABELS,
} from '../modules/seasonal/cocoon'

/* ========== 类型定义 ========== */

type TransformType = 'body' | 'mind' | 'emotion' | 'social' | 'career'

interface Transformation {
  id: string
  type: TransformType
  description: string
  duration: number
  createdAt: string
}

/* ========== 数据持久化 ========== */

const { records, load: loadRecords, save: saveTransform } = useTransformGallery()
onMounted(loadRecords)

const { entranceRef, entranceClass } = useViewEntrance()

/* ========== 联动：岁时阁 · 蜕变光茧（持久化单一数据源） ========== */

const cocoonStore = useCocoonStore()
const cocoons = cocoonStore.cocoons

const cocoonCards = computed(() => cocoons.value.map(c => ({
  id: c.id,
  name: c.name,
  stage: COCOON_STAGE_LABELS[c.stage],
  driving: c.drivingForce ? DRIVING_FORCE_LABELS[c.drivingForce] : '未标明',
  drivingColor: c.drivingForce ? (DRIVING_FORCE_COLORS[c.drivingForce] || '#cbd5e1') : '#cbd5e1',
  depth: (c.size ?? null) as number | null,
  texture: c.texture ? COCOON_TEXTURE_LABELS[c.texture] : null,
  related: !!c.relatedGoalId,
  createdAt: fmtDate(c.createdAt),
})))

/* ========== 变化类型配置 ========== */

const typeOptions: { type: TransformType; label: string; icon: string; color: string }[] = [
  { type: 'body', label: '身体', icon: '💪', color: '#5ab8a0' },
  { type: 'mind', label: '心智', icon: '🧠', color: '#a07c8c' },
  { type: 'emotion', label: '情感', icon: '💖', color: '#d98c7a' },
  { type: 'social', label: '社交', icon: '🤝', color: '#f0c040' },
  { type: 'career', label: '事业', icon: '🚀', color: '#6b9fc4' },
]

const typeMap = Object.fromEntries(typeOptions.map(t => [t.type, t]))

/* ========== 类型筛选 ========== */

const selectedType = ref<TransformType | null>(null)
const searchQuery = ref('')
const sortOrder = ref('newest')

const filteredRecords = computed(() => {
  let list = records.value
  // 类型筛选
  if (selectedType.value) {
    list = list.filter(r => r.type === selectedType.value)
  }
  // 搜索过滤
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r => r.description.toLowerCase().includes(q))
  }
  // 排序
  if (sortOrder.value === 'newest') {
    list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else if (sortOrder.value === 'oldest') {
    list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }
  return list
})

const typeDistribution = computed(() => {
  return typeOptions.map(t => ({
    ...t,
    count: records.value.filter(r => r.type === t.type).length
  }))
})

/* ========== 统计概览 ========== */

const stats = computed(() => {
  const list = records.value
  const totalRecords = list.length

  const totalDuration = list.reduce((sum, r) => sum + (r.duration || 0), 0)
  const hours = Math.floor(totalDuration / 60)
  const mins = totalDuration % 60
  const totalDurationText = hours > 0 ? `${hours}时${mins}分` : `${mins}分`

  const typeCount = new Set(list.map(r => r.type)).size

  const lastRecord = list.length > 0
    ? list.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
    : null
  const lastChangeText = lastRecord ? fmtDate(lastRecord.createdAt) : '暂无'

  return { totalRecords, totalDurationText, typeCount, lastChangeText }
})

/* ========== 类型分组计数 ========== */

const typeGroups = computed(() => {
  return typeOptions.map(t => ({
    ...t,
    count: records.value.filter(r => r.type === t.type).length
  }))
})

/* ========== 月份分组（时间线） ========== */

const monthGroups = computed(() => {
  const groups: Record<string, Transformation[]> = {}

  for (const r of filteredRecords.value) {
    const key = r.createdAt.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  }

  return Object.entries(groups)
    .sort(([a], [b]) => sortOrder.value === 'oldest' ? a.localeCompare(b) : b.localeCompare(a))
    .map(([month, recs]) => ({
      month,
      monthLabel: formatMonthLabel(month),
      records: recs
    }))
})

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-')
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return `${y}年${months[parseInt(m) - 1]}`
}

/* ========== 工具函数 ========== */

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ========== 表单状态 ========== */

const showModal = ref(false)
const form = reactive({ type: 'body' as TransformType, description: '', duration: 0 })

function openCreate() {
  form.type = 'body'
  form.description = ''
  form.duration = 0
  showModal.value = true
}

function saveRecord() {
  if (!form.description.trim()) return
  records.value.unshift({
    id: `trans_${Date.now()}`,
    type: form.type,
    description: form.description,
    duration: form.duration || 0,
    createdAt: new Date().toISOString()
  })
  saveTransform()
  showModal.value = false
}

/* ========== 删除记录 ========== */

function remove(id: string) {
  records.value = records.value.filter(r => r.id !== id)
  saveTransform()
}
</script>

<style scoped>
/* ===== 容器 ===== */
.tg {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  overflow-y: auto;
}
.tg::before {
  content: '';
  position: fixed;
  top: -40%;
  left: -20%;
  width: 60%;
  height: 60%;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.tg::after {
  content: '';
  position: fixed;
  bottom: -30%;
  right: -20%;
  width: 50%;
  height: 50%;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.tg > * {
  position: relative;
  z-index: 1;
}

/* ===== 头部装饰 ===== */
.tg-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
  text-align: center;
}
.header-ornament {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.orn-line {
  display: block;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.4), transparent);
}
.orn-diamond {
  color: var(--accent);
  font-size: 10px;
  opacity: 0.7;
}
.header-kicker {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 3px;
  margin-bottom: 8px;
  text-transform: uppercase;
}
.tg-title {
  font-size: 26px;
  font-weight: 500;
  letter-spacing: 4px;
  color: var(--text-primary);
  margin-bottom: 20px;
}
.tg-btn-new {
  padding: 10px 22px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.tg-btn-new:hover {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.45);
}

.tg-summary {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 0.5px;
  margin-top: 14px;
}

/* ===== 统计概览 ===== */
.tg-stats-section {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 28px;
}
.tg-stat-card {
  padding: 16px 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.2s;
}
.tg-stat-card:hover {
  border-color: rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--bg-card-rgb), 0.55);
}
.tg-stat-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 0.5px;
}
.tg-stat-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}
.stat-note {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.25);
}

/* ===== 类型分组 ===== */
.section-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  color: rgba(var(--accent-rgb), 0.6);
  letter-spacing: 1px;
}
.tg-type-section {
  margin-bottom: 28px;
}
.tg-type-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tg-type-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(var(--bg-card-rgb), 0.3);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.tg-type-chip:hover {
  background: rgba(var(--bg-card-rgb), 0.5);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.tg-type-chip:focus-visible {
  outline: 2px solid rgba(var(--accent-rgb), 0.6);
  outline-offset: 1px;
}
.tg-type-chip.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: var(--accent);
}
.type-icon {
  font-size: 16px;
}
.type-label {
  font-size: 13px;
  color: rgba(232, 213, 192, 0.7);
}
.type-count {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 6px;
  min-width: 20px;
  text-align: center;
}

/* ===== 时间线 ===== */
.tg-timeline-section {
  margin-bottom: 32px;
}
.tg-month-group {
  margin-bottom: 24px;
}
.month-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}
.tg-month-label {
  font-size: 15px;
  font-weight: 500;
  color: rgba(232, 213, 192, 0.8);
}
.month-count {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tg-record-card {
  position: relative;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid;
  border-left: 3px solid var(--card-accent, #d4a574);
  background: var(--card-bg);
  transition: all 0.2s;
}
.tg-record-card:hover {
  background: rgba(var(--bg-card-rgb), 0.55);
}
.tg-del {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.15);
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  z-index: 2;
}
.tg-record-card:hover .tg-del {
  opacity: 1;
}
.tg-del:hover {
  color: var(--danger);
  background: rgba(255, 107, 107, 0.1);
}
.record-body {
  position: relative;
  z-index: 1;
}
.record-desc {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(232, 213, 192, 0.85);
  margin-bottom: 10px;
  word-break: break-word;
}
.tg-record-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.type-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}
.record-duration {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
}
.tg-record-date {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.3);
  margin-left: auto;
}

/* ===== 空状态 ===== */
.empty-state {
  text-align: center;
  padding: 48px 0;
}
.empty-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}
.empty-text {
  font-size: 15px;
  color: rgba(232, 213, 192, 0.3);
  margin-bottom: 4px;
}
.tg-empty-hint {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.25);
}

/* ===== 弹窗表单 ===== */
.tg-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.tg-modal-card {
  background: #1a1510;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 14px;
  padding: 28px;
  width: 380px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 86vh;
  overflow-y: auto;
}
.tg-modal-card h3 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}
.modal-hint {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.4);
  margin-top: -8px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
}
.form-input {
  padding: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus {
  border-color: rgba(var(--accent-rgb), 0.35);
}
.form-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
}
.duration-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.duration-input {
  width: 100px;
  text-align: center;
}
input[type="number"].duration-input::-webkit-inner-spin-button,
input[type="number"].duration-input::-webkit-outer-spin-button {
  opacity: 1;
}
.duration-unit {
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.4);
}

.type-pick {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.type-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.45);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.type-btn:hover {
  color: rgba(232, 213, 192, 0.8);
  border-color: rgba(var(--accent-rgb), 0.2);
}
.type-btn.active {
  color: var(--text-primary);
}
.type-btn-icon {
  font-size: 16px;
}
.type-btn-label {
  font-size: 12px;
}

.tg-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
.tg-btn-cancel {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.tg-btn-cancel:hover {
  background: var(--card-bg);
  color: rgba(var(--accent-rgb), 0.7);
}
.tg-btn-save {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: var(--bg-primary);
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.tg-btn-save:hover {
  background: #dcb48a;
}
.tg-btn-save:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ===== 弹窗动画 ===== */
.modal-enter-active {
  transition: all 0.2s ease-out;
}
.modal-leave-active {
  transition: all 0.15s ease-in;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* ===== 岁时阁 · 蜕变光茧（联动） ===== */
.tg-cocoon-section { margin-bottom: 32px; }
.cocoon-list { display: flex; flex-direction: column; gap: 8px; }
.cocoon-card {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-left: 3px solid var(--accent);
  background: var(--card-bg);
  transition: all 0.2s;
}
.cocoon-card:hover { background: rgba(var(--bg-card-rgb), 0.55); }
.cocoon-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.cocoon-name { font-size: 14px; color: rgba(232, 213, 192, 0.9); }
.cocoon-stage { font-size: 12px; font-weight: 500; }
.cocoon-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.cocoon-driving { font-size: 11px; padding: 2px 8px; border-radius: 6px; }
.cocoon-depth,
.cocoon-texture,
.cocoon-related { font-size: 11px; color: rgba(var(--accent-rgb), 0.4); }
.cocoon-date { font-size: 11px; color: rgba(var(--accent-rgb), 0.3); margin-top: 6px; }
.tg-cocoon-hint {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.25);
  margin-bottom: 32px;
  font-style: italic;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .tg { padding: 32px 20px 64px; }
  .tg-stats-section { gap: 8px; }
  .tg-type-chips { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .tg { padding: 24px 14px 56px; }
  .tg-stats-section { flex-direction: column; }
}

@media (max-width: 480px) {
  .tg-stats-section { grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .tg-stat-card { padding: 10px; }
}

/* ===== 搜索与排序控件 ===== */
.tg-controls { display: flex; gap: 8px; margin-bottom: 20px; }
.tg-search-input { flex: 1; padding: 8px 12px; border: 1px solid rgba(var(--accent-rgb), 0.12); border-radius: 8px; background: var(--card-bg); color: var(--text-primary); font-size: 13px; font-family: inherit; outline: none; }
.tg-search-input:focus { border-color: rgba(var(--accent-rgb), 0.3); }
.tg-sort-select { padding: 8px 12px; border: 1px solid rgba(var(--accent-rgb), 0.12); border-radius: 8px; background: var(--card-bg); color: rgba(var(--accent-rgb), 0.6); font-size: 12px; font-family: inherit; outline: none; cursor: pointer; }
.tg-sort-select:focus { border-color: rgba(var(--accent-rgb), 0.3); }
.tg-distribution { margin-bottom: 28px; padding: 16px; border-radius: 12px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.tg-dist-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; }
.dist-icon { font-size: 16px; width: 24px; text-align: center; }
.dist-label { width: 40px; color: rgba(232, 213, 192, 0.7); }
.dist-bar-track { flex: 1; height: 8px; border-radius: 4px; background: var(--bg-card); overflow: hidden; }
.dist-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.dist-count { width: 24px; text-align: right; font-size: 12px; font-weight: 600; color: rgba(232, 213, 192, 0.6); }
</style>