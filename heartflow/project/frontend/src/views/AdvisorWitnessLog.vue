<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance awl">
    <!-- Header -->
    <div data-enter class="awl-header">
      <div class="awl-back-row">
        <button class="awl-back-btn" @click="goBack">← 返回</button>
      </div>
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">{{ advisorName }} 的见证记录</p>
      <h1 class="awl-title">见证 · 时间线</h1>
    </div>

    <!-- 统计摘要 -->
    <section class="awl-section">
      <h3 class="section-label">见证摘要</h3>
      <div class="awl-summary">
        <div class="awl-summary-card" v-for="(count, type) in summary" :key="type">
          <span class="awl-summary-icon">{{ eventIcon(type) }}</span>
          <span class="awl-summary-label">{{ eventLabel(type) }}</span>
          <span class="awl-summary-value">{{ count }}</span>
        </div>
        <EmptyState v-if="Object.keys(summary).length === 0" icon="📜" title="尚无见证记录" :glow="false" cta-label="" />
      </div>
    </section>

    <!-- 事件类型筛选 -->
    <section class="awl-section">
      <div class="awl-filter-bar">
        <button
          v-for="(label, type) in eventTypeLabels"
          :key="type"
          class="awl-filter-btn"
          :class="{ active: filterType === type }"
          @click="filterType = filterType === type ? '' : type"
        >
          {{ eventIcon(type) }} {{ label }}
        </button>
        <button
          class="awl-filter-btn"
          :class="{ active: filterType === '' }"
          @click="filterType = ''"
        >
          全部
        </button>
      </div>
    </section>

    <!-- 时间线 -->
    <section class="awl-section">
      <h3 class="section-label">时间线 {{ filteredLog.length > 0 ? `(${filteredLog.length})` : '' }}</h3>
      <div class="awl-timeline" v-if="filteredLog.length > 0">
        <div
          v-for="(entry, idx) in filteredLog"
          :key="idx"
          class="awl-timeline-item"
          :style="{ '--tl-delay': idx * 0.03 + 's' }"
        >
          <div class="awl-timeline-dot" :class="dotClass(entry.eventType)" />
          <div class="awl-timeline-content">
            <div class="awl-timeline-meta">
              <span class="awl-timeline-type">{{ eventLabel(entry.eventType) }}</span>
              <span class="awl-timeline-time">{{ fmtTime(entry.at) }}</span>
            </div>
          </div>
        </div>
      </div>
      <EmptyState v-else icon="🔍" title="没有匹配的见证记录" :glow="false" cta-label="" />
    </section>

    <!-- 清空按钮 -->
    <section class="awl-section">
      <button class="awl-clear-btn" @click="handleClear" :disabled="filteredLog.length === 0">
        清空所有见证记录
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdvisor } from '../resonance/bridges/advisor'
import { useViewEntrance } from '../composables/useViewEntrance'
import EmptyState from '../components/EmptyState.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const router = useRouter()
const route = useRoute()
const advisor = useAdvisor()

const advisorId = route.params.id as string
const filterType = ref('')

// ---- 幕僚信息 ----
const advisorProfile = computed(() => advisor.getAdvisorById(advisorId))
const advisorName = computed(() => advisorProfile.value?.name ?? '未知幕僚')

// ---- 见证数据 ----
const witnessLog = computed(() => advisor.getWitnessLog(advisorId, 0))
const summary = computed(() => advisor.getWitnessSummary(advisorId))

// ---- 筛选 ----
const eventTypeLabels: Record<string, string> = {
  focus_complete: '专注完成',
  focus_milestone: '专注里程碑',
  emotion_logged: '情绪记录',
  note_created: '笔记创建',
  late_night: '深夜访问',
  return: '久别回归',
  click: '点击载体',
  daily_reset: '每日重置',
  affinity_milestone: '好感里程碑',
}

const filteredLog = computed(() => {
  if (!filterType.value) return witnessLog.value
  return witnessLog.value.filter(e => e.eventType === filterType.value)
})

// ---- 辅助函数 ----
function eventIcon(type: string): string {
  const icons: Record<string, string> = {
    focus_complete: '🎯',
    focus_milestone: '🏆',
    emotion_logged: '🌸',
    note_created: '📝',
    late_night: '🌙',
    return: '👋',
    click: '👆',
    daily_reset: '🌅',
    affinity_milestone: '💖',
  }
  return icons[type] ?? '📌'
}

function eventLabel(type: string): string {
  return eventTypeLabels[type] ?? type
}

function dotClass(type: string): string {
  const classes: Record<string, string> = {
    focus_complete: 'dot-focus',
    focus_milestone: 'dot-milestone',
    emotion_logged: 'dot-emotion',
    note_created: 'dot-note',
    late_night: 'dot-night',
    return: 'dot-return',
    click: 'dot-click',
    daily_reset: 'dot-daily',
    affinity_milestone: 'dot-affinity',
  }
  return classes[type] ?? 'dot-default'
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function goBack() {
  router.push('/advisors')
}

function handleClear() {
  advisor.clearWitnessLog(advisorId)
}
</script>

<style scoped>
/* =============================================================
   见证 · 时间线 — Warm Amber Theme
   ============================================================= */
.awl {
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  position: relative;
  overflow: hidden;
}
.awl::before {
  content: '';
  position: absolute;
  top: -40%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ---- Header ---- */
.awl-header {
  text-align: center;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}
.awl-back-row {
  text-align: left;
  margin-bottom: 8px;
}
.awl-back-btn {
  background: none;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  padding: 6px 14px;
  color: rgba(var(--accent-rgb), 0.55);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.awl-back-btn:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.25);
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}
.orn-line {
  display: inline-block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}
.orn-diamond {
  font-size: 14px;
  color: var(--accent);
  opacity: 0.7;
}
.header-kicker {
  font-size: 11px;
  letter-spacing: 3px;
  color: rgba(var(--accent-rgb), 0.5);
  margin-bottom: 6px;
}
.awl-title {
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 6px;
  color: var(--accent);
  margin: 0;
}

/* ---- Section ---- */
.awl-section {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
}
.section-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.55);
  margin: 0 0 12px;
  letter-spacing: 0.5px;
}

/* ---- Summary Cards ---- */
.awl-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.awl-summary-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: all 0.2s;
}
.awl-summary-card:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.awl-summary-icon {
  font-size: 16px;
  line-height: 1;
}
.awl-summary-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
}
.awl-summary-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
}

/* ---- Filter Bar ---- */
.awl-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.awl-filter-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(var(--accent-rgb), 0.03);
  color: rgba(var(--accent-rgb), 0.45);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.awl-filter-btn:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.15);
  color: rgba(var(--accent-rgb), 0.65);
}
.awl-filter-btn.active {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

/* ---- Timeline ---- */
.awl-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}
.awl-timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(var(--accent-rgb), 0.08);
}
.awl-timeline-item {
  display: flex;
  gap: 16px;
  padding: 10px 0;
  animation: tl-fade-in 0.4s ease both;
  animation-delay: var(--tl-delay, 0s);
  position: relative;
}
@keyframes tl-fade-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
.awl-timeline-dot {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}
.dot-focus { background: rgba(200,160,80,0.2); border: 2px solid rgba(200,160,80,0.35); }
.dot-milestone { background: rgba(200,180,60,0.2); border: 2px solid rgba(200,180,60,0.35); }
.dot-emotion { background: rgba(200,120,160,0.2); border: 2px solid rgba(200,120,160,0.35); }
.dot-note { background: rgba(120,160,200,0.2); border: 2px solid rgba(120,160,200,0.35); }
.dot-night { background: rgba(100,100,180,0.2); border: 2px solid rgba(100,100,180,0.35); }
.dot-return { background: rgba(120,200,160,0.2); border: 2px solid rgba(120,200,160,0.35); }
.dot-click { background: rgba(160,140,120,0.2); border: 2px solid rgba(160,140,120,0.35); }
.dot-daily { background: rgba(200,180,120,0.2); border: 2px solid rgba(200,180,120,0.35); }
.dot-affinity { background: rgba(200,80,120,0.2); border: 2px solid rgba(200,80,120,0.35); }
.dot-default { background: rgba(var(--accent-rgb), 0.2); border: 2px solid rgba(var(--accent-rgb), 0.35); }

.awl-timeline-content {
  flex: 1;
  min-width: 0;
}
.awl-timeline-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}
.awl-timeline-type {
  font-size: 11px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 0.3px;
}
.awl-timeline-time {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.25);
}
.awl-timeline-detail {
  font-size: 13px;
  color: rgba(240,232,224,0.8);
  line-height: 1.5;
  margin: 0;
}


/* ---- Clear Button ---- */
.awl-clear-btn {
  display: block;
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(212,106,106,0.15);
  background: rgba(212,106,106,0.04);
  color: rgba(212,106,106,0.55);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.awl-clear-btn:hover:not(:disabled) {
  background: rgba(212,106,106,0.08);
  border-color: rgba(212,106,106,0.25);
  color: var(--danger);
}
.awl-clear-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .awl { padding: 24px 14px 56px; }
  .awl-title { font-size: 22px; }
  .awl-filter-bar { gap: 4px; }
  .awl-filter-btn { font-size: 10px; padding: 4px 10px; }
  .awl-summary-card { padding: 6px 10px; }
}
</style>