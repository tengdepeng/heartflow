<script setup lang="ts">
import { computed } from 'vue'
import {
  sanctuaryOverview,
  retreatRhythm,
  sanctuaryGrowth,
  sanctuaryInsights,
} from '../modules/sanctuary'
import type { SanctuaryLog, SanctuaryNote } from '../modules/sanctuary'

const props = defineProps<{ logs: SanctuaryLog[]; notes: SanctuaryNote[] }>()

const now = new Date()
const ov = computed(() => sanctuaryOverview(props.logs, now))
const rhythm = computed(() => retreatRhythm(props.logs, now))
const growth = computed(() => sanctuaryGrowth(props.logs, now))
const insights = computed(() => sanctuaryInsights(props.logs, props.notes, now))

const empty = computed(() => props.logs.length === 0)

function hourLabel(h: number): string {
  if (h < 5) return '深夜'
  if (h < 9) return '清晨'
  if (h < 12) return '上午'
  if (h < 14) return '正午'
  if (h < 18) return '午后'
  if (h < 21) return '傍晚'
  return '夜晚'
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<template>
  <section class="sanp-panel" data-enter aria-label="安全岛档案">
    <header class="sanp-head">
      <span class="sanp-title">🕊 安全岛档案</span>
      <span class="sanp-sub">档案概览 · 驻足节奏 · 深研修习 · 温和洞察</span>
    </header>

    <div v-if="empty" class="sanp-empty">
      <span class="sanp-empty-icon">🍃</span>
      <p v-if="insights.length">{{ insights[0] }}</p>
      <p v-else>安全岛还空着。想停一停的时候，屏息片刻，它就在。</p>
    </div>

    <template v-else>
      <div class="sanp-card">
        <span class="sanp-card-t">档案概览</span>
        <div class="sanp-ov-grid">
          <div class="sanp-ov-cell"><span>总访问</span><b>{{ ov.totalVisits }}</b></div>
          <div class="sanp-ov-cell"><span>总停留(分)</span><b>{{ ov.totalMinutes }}</b></div>
          <div class="sanp-ov-cell"><span>平均每次(秒)</span><b>{{ ov.avgDurationSec }}</b></div>
          <div class="sanp-ov-cell"><span>最长单次(秒)</span><b>{{ ov.longestSec }}</b></div>
          <div class="sanp-ov-cell"><span>累计呼吸</span><b>{{ ov.totalBreaths }}</b></div>
          <div class="sanp-ov-cell"><span>释放便签</span><b>{{ ov.totalNotesReleased }}</b></div>
          <div class="sanp-ov-cell"><span>安定率</span><b>{{ ov.settledRate }}%</b></div>
          <div class="sanp-ov-cell"><span>近14天活跃</span><b>{{ ov.activeDays14 }}</b></div>
        </div>
      </div>

      <div class="sanp-card">
        <span class="sanp-card-t">驻足节奏</span>
        <div class="sanp-rit-grid">
          <div class="sanp-rit-cell"><span>本周访问</span><b>{{ rhythm.weeklyVisits }}</b></div>
          <div class="sanp-rit-cell"><span>连续天数</span><b>{{ rhythm.consecutiveDays }}</b></div>
          <div class="sanp-rit-cell"><span>平均间隔</span><b>{{ rhythm.avgGapHours !== null ? rhythm.avgGapHours + '小时' : '—' }}</b></div>
          <div class="sanp-rit-cell"><span>偏好时段</span><b>{{ rhythm.preferredHour !== null ? hourLabel(rhythm.preferredHour) : '—' }}</b></div>
          <div class="sanp-rit-cell"><span>最近造访</span><b>{{ rhythm.lastVisit ? fmtDate(rhythm.lastVisit) : '—' }}</b></div>
        </div>
        <span v-if="rhythm.isDailyThisWeek" class="sanp-badge">本周日日造访</span>
      </div>

      <div class="sanp-card">
        <span class="sanp-card-t">深研修习</span>
        <div class="sanp-growth-head">
          <b class="sanp-score">{{ growth.score }}</b>
          <span class="sanp-growth-label">{{ growth.label }}</span>
        </div>
        <div class="sanp-meters">
          <div class="sanp-meter">
            <div class="sanp-meter-top"><span>广度</span><span>{{ growth.breadth }}</span></div>
            <div class="sanp-meter-track"><div class="sanp-meter-fill" :style="{ width: growth.breadth + '%' }"></div></div>
          </div>
          <div class="sanp-meter">
            <div class="sanp-meter-top"><span>深度</span><span>{{ growth.depth }}</span></div>
            <div class="sanp-meter-track"><div class="sanp-meter-fill" :style="{ width: growth.depth + '%' }"></div></div>
          </div>
          <div class="sanp-meter">
            <div class="sanp-meter-top"><span>仪式感</span><span>{{ growth.ritual }}</span></div>
            <div class="sanp-meter-track"><div class="sanp-meter-fill" :style="{ width: growth.ritual + '%' }"></div></div>
          </div>
        </div>
      </div>

      <div v-if="insights.length" class="sanp-card">
        <span class="sanp-card-t">温和洞察</span>
        <ul class="sanp-insights">
          <li v-for="(ins, i) in insights" :key="i">✦ {{ ins }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.sanp-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0 4px;
  max-width: 880px;
  width: 100%;
  padding: 18px 18px 20px;
  border-radius: 16px;
  background: rgba(196, 138, 90, 0.06);
  border: 1px solid rgba(196, 138, 90, 0.16);
  box-shadow: 0 1px 10px rgba(0, 0, 0, 0.12);
}
.sanp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sanp-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 2px;
  color: #ecd5c2;
}
.sanp-sub {
  font-size: 11px;
  color: rgba(196, 138, 90, 0.6);
  letter-spacing: 1px;
}
.sanp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: rgba(236, 213, 194, 0.35);
}
.sanp-empty-icon {
  font-size: 26px;
  opacity: 0.5;
}
.sanp-empty p {
  font-size: 12px;
  line-height: 1.7;
  text-align: center;
  margin: 0;
  max-width: 440px;
}
.sanp-card {
  padding: 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(196, 138, 90, 0.14);
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}
.sanp-card-t {
  font-size: 12px;
  font-weight: 500;
  color: rgba(196, 138, 90, 0.7);
  letter-spacing: 1px;
}
.sanp-ov-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
@media (max-width: 620px) {
  .sanp-ov-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.sanp-ov-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(196, 138, 90, 0.08);
}
.sanp-ov-cell span {
  font-size: 10px;
  color: rgba(236, 213, 194, 0.45);
}
.sanp-ov-cell b {
  font-size: 18px;
  font-weight: 600;
  color: #ecd5c2;
  line-height: 1.1;
}
.sanp-rit-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
@media (max-width: 620px) {
  .sanp-rit-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.sanp-rit-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(196, 138, 90, 0.08);
}
.sanp-rit-cell span {
  font-size: 10px;
  color: rgba(236, 213, 194, 0.45);
}
.sanp-rit-cell b {
  font-size: 15px;
  font-weight: 600;
  color: #ecd5c2;
  line-height: 1.1;
  text-align: center;
}
.sanp-badge {
  align-self: flex-start;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(196, 138, 90, 0.2);
  color: rgba(236, 213, 194, 0.8);
}
.sanp-growth-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.sanp-score {
  font-size: 34px;
  font-weight: 600;
  color: #ecd5c2;
  line-height: 1;
}
.sanp-growth-label {
  font-size: 13px;
  color: rgba(236, 213, 194, 0.7);
}
.sanp-meters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sanp-meter {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sanp-meter-top {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(236, 213, 194, 0.55);
}
.sanp-meter-track {
  height: 8px;
  border-radius: 999px;
  background: var(--bg-card);
  overflow: hidden;
}
.sanp-meter-fill {
  height: 100%;
  border-radius: 999px;
  min-width: 4px;
  background: linear-gradient(90deg, #c8896a, #e0b08a);
}
.sanp-insights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sanp-insights li {
  font-size: 12px;
  line-height: 1.7;
  color: rgba(236, 213, 194, 0.55);
}
</style>