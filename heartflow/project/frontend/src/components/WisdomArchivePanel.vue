<script setup lang="ts">
import { computed } from 'vue'
import {
  wisdomOverview,
  wisdomDomainRows,
  wisdomTagRows,
  wisdomMonthlyRows,
  wisdomRhythm,
  wisdomHealth,
  wisdomInsights,
  wisdomTopTags,
  DOMAIN_META,
} from '../modules/wisdom'
import type { WisdomDomain } from '../modules/wisdom'
import type { WisdomItem } from '../modules/wisdom'
import type { HistoryItem } from '../modules/wisdom/history'

const props = defineProps<{ entries: WisdomItem[]; history: HistoryItem[] }>()

function domainLabel(d: WisdomDomain | null): string {
  return d ? `${DOMAIN_META[d].icon} ${DOMAIN_META[d].label}` : '—'
}

const ov = computed(() => wisdomOverview(props.entries, props.history))
const domains = computed(() => wisdomDomainRows(props.entries))
const tags = computed(() => wisdomTagRows(props.entries))
const months = computed(() => wisdomMonthlyRows(props.entries))
const rhythm = computed(() => wisdomRhythm(props.entries, props.history))
const health = computed(() => wisdomHealth(props.entries, props.history))
const topTags = computed(() => wisdomTopTags(props.entries))
const insights = computed(() => wisdomInsights(props.entries, props.history))

const empty = computed(() => props.entries.length === 0)

function formatDate(iso: string | null): string {
  if (!iso) return '从未'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <section class="wap-panel" data-enter aria-label="知微档案">
    <header class="wap-head">
      <span class="wap-title">🕯 知微档案</span>
      <span class="wap-sub">档案概览 · 领域 · 标签 · 月度 · 回看节律 · 知微健康 · 温和洞察</span>
    </header>

    <div v-if="empty" class="wap-empty">
      <span class="wap-empty-icon">🕰</span>
      <p v-if="insights.length">{{ insights[0] }}</p>
      <p v-else>知微阁还是空白的。记下第一问与一答，让慧心开始转动。</p>
    </div>

    <template v-else>
      <!-- 档案概览 -->
      <div class="wap-card">
        <span class="wap-card-t">档案概览</span>
        <div class="wap-ov-grid">
          <div class="wap-ov-cell"><span>总记录</span><b>{{ ov.total }}</b></div>
          <div class="wap-ov-cell"><span>累计对话</span><b>{{ ov.totalAsks }}</b></div>
          <div class="wap-ov-cell"><span>平均回答字</span><b>{{ ov.avgAnswerLen }}</b></div>
          <div class="wap-ov-cell"><span>有回答</span><b>{{ ov.withAnswer }}</b></div>
          <div class="wap-ov-cell"><span>覆盖标签</span><b>{{ ov.tagCount }}</b></div>
          <div class="wap-ov-cell"><span>覆盖领域</span><b>{{ ov.domainCount }}</b></div>
          <div class="wap-ov-cell"><span>近30天记录</span><b>{{ ov.recent30 }}</b></div>
          <div class="wap-ov-cell"><span>近30天对话</span><b>{{ ov.recentAsks30 }}</b></div>
        </div>
        <p class="wap-ov-last">
          主导领域：{{ domainLabel(ov.topDomain) }} ·
          最常用标签：{{ ov.topTag ? `#${ov.topTag.tag}（${ov.topTag.count}）` : '—' }} ·
          最近记录：{{ formatDate(ov.latestDate) }}
        </p>
      </div>

      <!-- 领域分布 -->
      <div v-if="domains.length" class="wap-card">
        <span class="wap-card-t">领域分布</span>
        <div class="wap-row-list">
          <div v-for="row in domains" :key="row.key" class="wap-row">
            <span class="wap-row-label" :style="{ color: row.color }">{{ row.icon }} {{ row.label }}</span>
            <div class="wap-row-track"><div class="wap-row-fill" :style="{ width: row.pct + '%', background: row.color }"></div></div>
            <span class="wap-row-meta">{{ row.count }} · {{ row.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 标签分布 + 月度分布 -->
      <div class="wap-cols">
        <div v-if="tags.length" class="wap-card">
          <span class="wap-card-t">标签分布</span>
          <div class="wap-row-list">
            <div v-for="row in tags" :key="row.key" class="wap-row">
              <span class="wap-row-label">#{{ row.label }}</span>
              <div class="wap-row-track"><div class="wap-row-fill" :style="{ width: row.pct + '%' }"></div></div>
              <span class="wap-row-meta">{{ row.count }} · {{ row.pct }}%</span>
            </div>
          </div>
        </div>
        <div v-if="months.length" class="wap-card">
          <span class="wap-card-t">月度分布</span>
          <div class="wap-row-list">
            <div v-for="row in months" :key="row.key" class="wap-row">
              <span class="wap-row-label">{{ row.label }}</span>
              <div class="wap-row-track"><div class="wap-row-fill" :style="{ width: row.pct + '%', background: row.color }"></div></div>
              <span class="wap-row-meta">{{ row.count }} · {{ row.pct }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 回看节律 -->
      <div class="wap-card">
        <span class="wap-card-t">回看节律</span>
        <div class="wap-rhy-grid">
          <div class="wap-rhy-cell"><span>近30天记录</span><b>{{ rhythm.recorded30 }}</b></div>
          <div class="wap-rhy-cell"><span>近90天记录</span><b>{{ rhythm.recorded90 }}</b></div>
          <div class="wap-rhy-cell"><span>近30天对话</span><b>{{ rhythm.asks30 }}</b></div>
          <div class="wap-rhy-cell"><span>累计对话</span><b>{{ rhythm.totalAsks }}</b></div>
          <div class="wap-rhy-cell"><span>平均回答字</span><b>{{ rhythm.avgAnswer }}</b></div>
        </div>
      </div>

      <!-- 知微健康 -->
      <div class="wap-card">
        <span class="wap-card-t">知微健康</span>
        <div class="wap-health-main">
          <strong class="wap-health-score">{{ health.score }}</strong>
          <span class="wap-health-label" :class="{ good: health.score >= 70 }">{{ health.label }}</span>
        </div>
        <div class="wap-health-bars">
          <div class="wap-hbar"><span>广度</span><div class="wap-hbar-track"><div class="wap-hbar-fill" :style="{ width: health.breadth + '%' }"></div></div><b>{{ health.breadth }}</b></div>
          <div class="wap-hbar"><span>深度</span><div class="wap-hbar-track"><div class="wap-hbar-fill" :style="{ width: health.depth + '%' }"></div></div><b>{{ health.depth }}</b></div>
          <div class="wap-hbar"><span>延续</span><div class="wap-hbar-track"><div class="wap-hbar-fill" :style="{ width: health.continuity + '%' }"></div></div><b>{{ health.continuity }}</b></div>
        </div>
      </div>

      <!-- 高频标签 -->
      <div v-if="topTags.length" class="wap-card">
        <span class="wap-card-t">高频标签</span>
        <div class="wap-tags">
          <span v-for="t in topTags" :key="t.tag" class="wap-tag">#{{ t.tag }}</span>
        </div>
      </div>

      <!-- 温和洞察 -->
      <div v-if="insights.length" class="wap-card">
        <span class="wap-card-t">温和洞察</span>
        <ul class="wap-insights">
          <li v-for="(ins, i) in insights" :key="i">✦ {{ ins }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.wap-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  padding: 18px 18px 20px;
  border-radius: 16px;
  background: rgba(168, 160, 104, 0.05);
  border: 1px solid rgba(168, 160, 104, 0.12);
}
.wap-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wap-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 2px;
  color: #e8dcc0;
}
.wap-sub {
  font-size: 11px;
  color: rgba(168, 160, 104, 0.55);
  letter-spacing: 1px;
}
.wap-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: rgba(236, 232, 224, 0.3);
}
.wap-empty-icon {
  font-size: 26px;
  opacity: 0.5;
}
.wap-empty p {
  font-size: 12px;
  line-height: 1.7;
  text-align: center;
  margin: 0;
  max-width: 440px;
}
.wap-card {
  padding: 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(168, 160, 104, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}
.wap-card-t {
  font-size: 12px;
  font-weight: 500;
  color: rgba(168, 160, 104, 0.6);
  letter-spacing: 1px;
}
.wap-ov-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
@media (max-width: 600px) {
  .wap-ov-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.wap-ov-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(168, 160, 104, 0.06);
}
.wap-ov-cell span {
  font-size: 10px;
  color: rgba(236, 232, 224, 0.45);
}
.wap-ov-cell b {
  font-size: 20px;
  font-weight: 600;
  color: #e8dcc0;
  line-height: 1.1;
}
.wap-ov-last {
  font-size: 11px;
  color: rgba(168, 160, 104, 0.55);
  margin: 0;
}
.wap-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 700px) {
  .wap-cols {
    grid-template-columns: 1fr;
  }
}
.wap-row-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.wap-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wap-row-label {
  width: 82px;
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(236, 232, 224, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wap-row-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-card);
  overflow: hidden;
}
.wap-row-fill {
  height: 100%;
  border-radius: 999px;
  min-width: 4px;
  background: rgba(168, 160, 104, 0.5);
}
.wap-row-meta {
  width: 74px;
  text-align: right;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(236, 232, 224, 0.4);
}
.wap-rhy-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.wap-rhy-cell {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(168, 160, 104, 0.06);
}
.wap-rhy-cell span {
  font-size: 11px;
  color: rgba(236, 232, 224, 0.45);
}
.wap-rhy-cell b {
  font-size: 18px;
  font-weight: 600;
  color: #e8dcc0;
  line-height: 1.1;
}
.wap-health-main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wap-health-score {
  font-size: 34px;
  font-weight: 700;
  color: #e8dcc0;
  line-height: 1;
}
.wap-health-label {
  font-size: 13px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(168, 160, 104, 0.12);
  color: rgba(232, 220, 192, 0.75);
}
.wap-health-label.good {
  background: rgba(124, 184, 255, 0.12);
  color: #8fbeff;
}
.wap-health-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wap-hbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.wap-hbar span {
  width: 32px;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(236, 232, 224, 0.5);
}
.wap-hbar-track {
  flex: 1;
  height: 7px;
  border-radius: 999px;
  background: var(--bg-card);
  overflow: hidden;
}
.wap-hbar-fill {
  height: 100%;
  border-radius: 999px;
  background: rgba(168, 160, 104, 0.55);
}
.wap-hbar b {
  width: 26px;
  text-align: right;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(236, 232, 224, 0.5);
}
.wap-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wap-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(168, 160, 104, 0.1);
  color: rgba(232, 220, 192, 0.75);
}
.wap-insights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wap-insights li {
  font-size: 12px;
  line-height: 1.7;
  color: rgba(236, 232, 224, 0.55);
}
</style>