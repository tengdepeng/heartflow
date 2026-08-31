<template>
  <section class="oap-panel" aria-label="外流态势">
    <!-- 空态：去向安然 -->
    <template v-if="archive.overview.total === 0">
      <div class="oap-head">
        <span class="oap-title">🚪 外流态势</span>
        <span class="oap-badge oap-badge-neutral">去向安然</span>
      </div>
      <p class="oap-empty">
        数据未曾离开本设备。每一次导出、同步、分享、备份，都会在此汇聚成一张外流态势图——通过哪些渠道、多频繁、最近有无，让去向保持透明。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="oap-head">
        <span class="oap-title">🚪 外流态势</span>
        <span class="oap-badge">{{ badge.text }}</span>
      </div>

      <!-- 档案概览 -->
      <div class="oap-block">
        <h3 class="oap-block-title">档案概览</h3>
        <div class="oap-grid">
          <div class="oap-cell">
            <b>{{ archive.overview.total }}</b><span>总次数</span>
          </div>
          <div class="oap-cell">
            <b>{{ archive.overview.coveredChannels }}</b><span>覆盖渠道</span>
          </div>
          <div class="oap-cell">
            <b>{{ archive.overview.todayCount }}</b><span>今日</span>
          </div>
          <div class="oap-cell">
            <b>{{ archive.overview.last7Count }}</b><span>近7天</span>
          </div>
          <div class="oap-cell">
            <b>{{ topChannelLabel }}</b><span>最常渠道</span>
          </div>
          <div class="oap-cell">
            <b>{{ archive.overview.latestAt ? shortDate(archive.overview.latestAt) : '—' }}</b><span>最近一次</span>
          </div>
        </div>
      </div>

      <!-- 渠道分布 -->
      <div class="oap-block" v-if="archive.distribution.length">
        <h3 class="oap-block-title">渠道分布</h3>
        <div class="oap-channels">
          <div v-for="c in archive.distribution" :key="c.channel" class="oap-channel-row">
            <span class="oap-channel-label">{{ c.icon }} {{ c.label }}</span>
            <div class="oap-channel-bar">
              <div class="oap-channel-fill" :style="{ width: c.pct + '%', background: c.color }"></div>
            </div>
            <span class="oap-channel-val">{{ c.count }}次 · {{ c.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 近7天节奏 -->
      <div class="oap-block">
        <h3 class="oap-block-title">近7天节奏</h3>
        <div class="oap-rhythm">
          <div v-for="d in archive.rhythm" :key="d.date" class="oap-rhythm-day" :title="`${d.label} · ${d.count} 次`">
            <div class="oap-rhythm-bar-wrap">
              <div class="oap-rhythm-bar" :style="{ height: barHeight(d.count) }"></div>
            </div>
            <span class="oap-rhythm-label">{{ d.label }}</span>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul class="oap-insights">
        <li v-for="ins in archive.insights" :key="ins" class="oap-insight">
          <span class="oap-insight-mark">✦</span>
          <span class="oap-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GuardOutflowLog } from '../engine/data-outflow'
import {
  outflowOverview,
  channelDistribution,
  outflowRhythm,
  outflowInsights,
  OUTFLOW_META,
} from '../modules/guard/outflow-analytics'

const props = defineProps<{ logs: GuardOutflowLog[] }>()

const archive = computed(() => {
  const now = new Date()
  return {
    overview: outflowOverview(props.logs, now),
    distribution: channelDistribution(props.logs),
    rhythm: outflowRhythm(props.logs, now),
    insights: outflowInsights(props.logs, now),
  }
})

const badge = computed(() => {
  const ov = archive.value.overview
  if (ov.last7Count > 0) return { text: '外流活跃', neutral: false }
  return { text: '去向安然', neutral: false }
})

const topChannelLabel = computed(() => {
  const ch = archive.value.overview.topChannel
  if (!ch) return '—'
  return OUTFLOW_META[ch]?.label ?? ch
})

function barHeight(count: number): string {
  if (count <= 0) return '3px'
  const max = Math.max(...archive.value.rhythm.map((d) => d.count), 1)
  return `${Math.max(8, Math.round((count / max) * 100))}%`
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.oap-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 16px;
  background: rgba(48, 42, 35, 0.32);
  border: 1px solid rgba(138, 122, 106, 0.14);
}

.oap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.oap-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.88);
}

.oap-badge {
  font-size: 11px;
  letter-spacing: 1px;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(196, 160, 184, 0.12);
  color: #c4a0b8;
  border: 1px solid rgba(196, 160, 184, 0.22);
  white-space: nowrap;
}

.oap-badge-neutral {
  background: rgba(138, 122, 106, 0.12);
  color: #a89a8a;
  border-color: rgba(138, 122, 106, 0.22);
}

.oap-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.8;
  color: rgba(240, 242, 255, 0.55);
}

.oap-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oap-block-title {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.6);
}

.oap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.oap-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(138, 122, 106, 0.1);
}

.oap-cell b {
  font-size: 17px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.88);
  font-variant-numeric: tabular-nums;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oap-cell span {
  font-size: 10px;
  letter-spacing: 0.5px;
  color: rgba(240, 242, 255, 0.4);
}

.oap-channels {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oap-channel-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.oap-channel-label {
  flex: 0 0 92px;
  font-size: 12px;
  color: rgba(240, 242, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oap-channel-bar {
  flex: 1 1 auto;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.oap-channel-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.oap-channel-val {
  flex: 0 0 auto;
  font-size: 11px;
  color: rgba(240, 242, 255, 0.5);
  font-variant-numeric: tabular-nums;
  min-width: 78px;
  text-align: right;
}

.oap-rhythm {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 72px;
  padding: 4px 2px 0;
}

.oap-rhythm-day {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  min-width: 0;
}

.oap-rhythm-bar-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.oap-rhythm-bar {
  width: 60%;
  max-width: 18px;
  min-height: 3px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, #c4a0b8, #8a7a6a);
  opacity: 0.85;
  transition: height 0.4s ease;
}

.oap-rhythm-label {
  font-size: 9px;
  color: rgba(240, 242, 255, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.oap-insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.oap-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(240, 242, 255, 0.62);
}

.oap-insight-mark {
  color: #c4a0b8;
  flex-shrink: 0;
  margin-top: 2px;
}

@media (max-width: 480px) {
  .oap-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .oap-channel-label {
    flex-basis: 76px;
  }
}
</style>
