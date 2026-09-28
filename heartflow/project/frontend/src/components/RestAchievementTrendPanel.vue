<template>
  <section class="ratp-panel" aria-label="休憩成就与趋势档案">
    <!-- 面板头 -->
    <div class="ratp-head">
      <div class="ratp-head-left">
        <span class="ratp-title">🏅 休憩成就与趋势</span>
        <span class="ratp-sub">{{ streakDays }} 连续天数 · 已解锁 {{ unlockedCount }}/{{ totalCount }}</span>
      </div>
      <span class="ratp-badge" :class="{ 'ratp-badge-neutral': unlockedCount === 0 }">
        {{ unlockedCount === totalCount ? '大满贯' : unlockedCount > 0 ? '渐入佳境' : '尚未启程' }}
      </span>
    </div>

    <!-- 空态 -->
    <EmptyState v-if="totalRecords === 0" title="尚无休憩记录。记下一笔休憩后，此处将亮起成就勋章、并描摹你近 30 日的休息节律——每一次停歇都值得被看见。" :glow="false" cta-label="" />

    <template v-if="totalRecords > 0">
      <!-- 趋势概览 -->
      <div class="ratp-block">
        <h3 class="ratp-block-title">趋势概览</h3>
        <div class="ratp-grid">
          <div class="ratp-cell">
            <b>{{ summary.totalBreaks }}</b><span>总次数</span>
          </div>
          <div class="ratp-cell">
            <b>{{ summary.totalDuration }}</b><span>总时长(分)</span>
          </div>
          <div class="ratp-cell">
            <b>{{ summary.avgMood }}</b><span>平均心情</span>
          </div>
          <div class="ratp-cell">
            <b>{{ summary.avgRecovery }}</b><span>平均恢复</span>
          </div>
          <div class="ratp-cell">
            <b>{{ summary.streakDays }}</b><span>连续天数</span>
          </div>
          <div class="ratp-cell">
            <b>{{ summary.bestDay ? shortDate(summary.bestDay.date) : '—' }}</b><span>最佳日</span>
          </div>
        </div>
      </div>

      <!-- 30 日趋势图 -->
      <div class="ratp-block">
        <h3 class="ratp-block-title">近 30 日休憩次数</h3>
        <div class="ratp-chart" role="img" :aria-label="`近30日每日休憩次数柱状图，峰值 ${maxCount} 次`">
          <div
            v-for="p in points"
            :key="p.date"
            class="ratp-bar-col"
            :title="`${p.date} · ${p.count} 次`"
          >
            <div class="ratp-bar-track">
              <div
                class="ratp-bar-fill"
                :class="{ 'ratp-bar-fill--zero': p.count === 0 }"
                :style="{ height: barHeight(p.count) }"
              ></div>
            </div>
            <span class="ratp-bar-label" v-if="shouldLabel(p.date)">{{ labelDay(p.date) }}</span>
          </div>
        </div>
      </div>

      <!-- 成就勋章 -->
      <div class="ratp-block">
        <h3 class="ratp-block-title">成就勋章</h3>
        <div class="ratp-ach-grid">
          <div
            v-for="a in achievements"
            :key="a.id"
            class="ratp-ach-card"
            :class="{ 'ratp-ach-card--locked': !a.unlocked }"
          >
            <div class="ratp-ach-top">
              <span class="ratp-ach-icon">{{ a.icon }}</span>
              <span class="ratp-ach-name">{{ a.title }}</span>
              <span v-if="a.unlocked" class="ratp-ach-check">✓</span>
            </div>
            <p class="ratp-ach-desc">{{ a.description }}</p>
            <div class="ratp-ach-progress">
              <div class="ratp-ach-track">
                <div class="ratp-ach-fill" :style="{ width: (a.progress * 100).toFixed(0) + '%' }"></div>
              </div>
              <span class="ratp-ach-label">{{ a.progressLabel }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 重置 -->
      <button class="ratp-reset" @click="handleReset">重置成就进度</button>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { BreakRecord, RestPractice } from '../modules/rest'
import { useRestAchievements, useRestTrend } from '../modules/rest/rest-advanced'
import EmptyState from '../components/EmptyState.vue'

const props = defineProps<{ records: BreakRecord[]; practices: RestPractice[] }>()

const {
  achievements,
  unlockedCount,
  totalCount,
  checkAchievements,
  resetAchievements,
} = useRestAchievements(() => props.records, () => props.practices)
const { trendData, computeTrend } = useRestTrend(() => props.records, () => props.practices)

onMounted(() => {
  checkAchievements()
  computeTrend(30)
})

const totalRecords = computed(() => props.records.length)
const points = computed(() => trendData.value?.points ?? [])
const summary = computed(() => {
  const s = trendData.value?.summary
  return s ?? {
    totalBreaks: 0,
    totalDuration: 0,
    avgMood: 0,
    avgRecovery: 0,
    streakDays: 0,
    bestDay: null,
  }
})
const maxCount = computed(() =>
  Math.max(1, ...points.value.map(p => p.count)),
)
const streakDays = computed(() => summary.value.streakDays)

function barHeight(count: number): string {
  const pct = maxCount.value > 0 ? Math.max(5, (count / maxCount.value) * 100) : 5
  return pct + '%'
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shouldLabel(date: string): boolean {
  const day = Number(date.slice(8, 10))
  return day === 1 || day === 10 || day === 20
}

function labelDay(date: string): string {
  return date.slice(8, 10)
}

function handleReset(): void {
  resetAchievements()
}
</script>

<style scoped>
.ratp-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(138, 154, 122, 0.08), rgba(232, 192, 96, 0.04));
  border: 1px solid rgba(138, 154, 122, 0.22);
}

.ratp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.ratp-head-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ratp-title {
  font-size: 15px;
  font-weight: 600;
  color: #c46a5a;
}

.ratp-sub {
  font-size: 11px;
  color: #9aa090;
}

.ratp-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(232, 192, 96, 0.16);
  color: #e8c060;
  border: 1px solid rgba(232, 192, 96, 0.3);
}

.ratp-badge-neutral {
  background: rgba(148, 163, 184, 0.12);
  color: #a8b0a0;
  border-color: rgba(148, 163, 184, 0.25);
}


.ratp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ratp-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #c8ccb8;
}

.ratp-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.ratp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.07);
  text-align: center;
}

.ratp-cell b {
  font-size: 16px;
  color: #e8c060;
}

.ratp-cell span {
  font-size: 11px;
  color: #9aa090;
}

/* 30 日柱状图 */
.ratp-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 120px;
  padding: 8px 4px 0;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.05);
  border: 1px solid rgba(138, 154, 122, 0.12);
  overflow-x: auto;
}

.ratp-bar-col {
  flex: 1 0 14px;
  min-width: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.ratp-bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.ratp-bar-fill {
  width: 60%;
  min-height: 2px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #e8c060, #c46a5a);
  transition: height 0.4s ease;
}

.ratp-bar-fill--zero {
  background: rgba(138, 154, 122, 0.2);
}

.ratp-bar-label {
  font-size: 9px;
  color: #9aa090;
}

/* 成就勋章 */
.ratp-ach-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.ratp-ach-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(232, 192, 96, 0.06);
  border: 1px solid rgba(232, 192, 96, 0.18);
}

.ratp-ach-card--locked {
  background: rgba(148, 163, 184, 0.05);
  border-color: rgba(148, 163, 184, 0.14);
  opacity: 0.72;
}

.ratp-ach-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ratp-ach-icon {
  font-size: 18px;
  line-height: 1;
}

.ratp-ach-name {
  flex: 1;
  font-size: 12px;
  color: #c8ccb8;
  letter-spacing: 0.3px;
}

.ratp-ach-check {
  font-size: 12px;
  color: #e8c060;
}

.ratp-ach-desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: #9aa090;
}

.ratp-ach-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ratp-ach-track {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.16);
  overflow: hidden;
}

.ratp-ach-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #c46a5a, #e8c060);
  transition: width 0.4s ease;
}

.ratp-ach-label {
  flex: 0 0 auto;
  font-size: 10px;
  color: #9aa090;
}

.ratp-reset {
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(196, 106, 90, 0.3);
  background: rgba(196, 106, 90, 0.08);
  color: #c46a5a;
  font-size: 12px;
  font-family: inherit;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.ratp-reset:hover {
  background: rgba(196, 106, 90, 0.16);
}

@media (max-width: 720px) {
  .ratp-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .ratp-ach-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>