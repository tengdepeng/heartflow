<script setup lang="ts">
import { computed } from 'vue'
import {
  traditionsOverview,
  traditionsCraftRows,
  traditionsRitualRows,
  traditionsSourceRows,
  traditionsRegionRows,
  practiceBuckets,
  traditionsHealth,
  traditionsTopTags,
  traditionsInsights,
} from '../modules/traditions'
import type { FolkloreEntry } from '../modules/traditions'

const props = defineProps<{ entries: FolkloreEntry[] }>()

// 宪法安全：本地私有。来源分布不直显「社区/公共」社交措辞
const SOURCE_SAFE_LABEL: Record<string, string> = {
  personal: '个人',
  family: '家族',
  community: '邻里',
  public: '文献',
}

const ov = computed(() => traditionsOverview(props.entries))
const crafts = computed(() => traditionsCraftRows(props.entries))
const rituals = computed(() => traditionsRitualRows(props.entries))
const sources = computed(() =>
  traditionsSourceRows(props.entries)
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ ...r, label: SOURCE_SAFE_LABEL[r.key] || r.label })),
)
const regions = computed(() => traditionsRegionRows(props.entries))
const buckets = computed(() => practiceBuckets(props.entries))
const bucketList = computed(() => [buckets.value.never, buckets.value.light, buckets.value.active])
const health = computed(() => traditionsHealth(props.entries))
const tags = computed(() => traditionsTopTags(props.entries))
const insights = computed(() => traditionsInsights(props.entries))

const empty = computed(() => props.entries.length === 0)

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '从未'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <section class="trp-panel" data-enter aria-label="文明档案">
    <header class="trp-head">
      <span class="trp-title">🏺 文明档案</span>
      <span class="trp-sub">档案概览 · 技艺 · 仪式 · 来源 · 地域 · 实践 · 文明健康 · 温和洞察</span>
    </header>

    <div v-if="empty" class="trp-empty">
      <span class="trp-empty-icon">🌱</span>
      <p v-if="insights.length">{{ insights[0] }}</p>
      <p v-else>文明的根系还是一片空地。记下第一项技艺或仪式，让余温生根。</p>
    </div>

    <template v-else>
      <!-- 档案概览 -->
      <div class="trp-card">
        <span class="trp-card-t">档案概览</span>
        <div class="trp-ov-grid">
          <div class="trp-ov-cell"><span>总记录</span><b>{{ ov.total }}</b></div>
          <div class="trp-ov-cell"><span>濒危</span><b>{{ ov.endangered }}</b></div>
          <div class="trp-ov-cell"><span>累计实践</span><b>{{ ov.totalPracticeCount }}</b></div>
          <div class="trp-ov-cell"><span>有传承人</span><b>{{ ov.withInheritor }}</b></div>
          <div class="trp-ov-cell"><span>覆盖类别</span><b>{{ ov.categoryCount }}</b></div>
          <div class="trp-ov-cell"><span>覆盖地域</span><b>{{ ov.regionCount }}</b></div>
          <div class="trp-ov-cell"><span>近30天记录</span><b>{{ ov.recentlyRecorded30 }}</b></div>
          <div class="trp-ov-cell"><span>平均实践</span><b>{{ ov.avgPracticeCount }}</b></div>
        </div>
        <p class="trp-ov-last">
          最常实践：{{ ov.topPracticed ? `${ov.topPracticed.name}（${ov.topPracticed.count} 次）` : '—' }} ·
          刚记录：{{ ov.latest ? `${ov.latest.name}（${formatDate(ov.latest.date)}）` : '—' }}
        </p>
      </div>

      <!-- 技艺分布 -->
      <div v-if="crafts.length" class="trp-card">
        <span class="trp-card-t">技艺分布</span>
        <div class="trp-row-list">
          <div v-for="row in crafts" :key="row.key" class="trp-row">
            <span class="trp-row-label" :style="{ color: row.color }">{{ row.icon }} {{ row.label }}</span>
            <div class="trp-row-track"><div class="trp-row-fill" :style="{ width: row.pct + '%', background: row.color }"></div></div>
            <span class="trp-row-meta">{{ row.count }} · {{ row.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 仪式分布 -->
      <div v-if="rituals.length" class="trp-card">
        <span class="trp-card-t">仪式分布</span>
        <div class="trp-row-list">
          <div v-for="row in rituals" :key="row.key" class="trp-row">
            <span class="trp-row-label" :style="{ color: row.color }">{{ row.icon }} {{ row.label }}</span>
            <div class="trp-row-track"><div class="trp-row-fill" :style="{ width: row.pct + '%', background: row.color }"></div></div>
            <span class="trp-row-meta">{{ row.count }} · {{ row.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 地域与来源 -->
      <div class="trp-cols">
        <div v-if="regions.length" class="trp-card">
          <span class="trp-card-t">地域分布</span>
          <div class="trp-row-list">
            <div v-for="row in regions" :key="row.key" class="trp-row">
              <span class="trp-row-label">{{ row.label }}</span>
              <div class="trp-row-track"><div class="trp-row-fill" :style="{ width: row.pct + '%' }"></div></div>
              <span class="trp-row-meta">{{ row.count }} · {{ row.pct }}%</span>
            </div>
          </div>
        </div>
        <div v-if="sources.length" class="trp-card">
          <span class="trp-card-t">来源分布</span>
          <div class="trp-row-list">
            <div v-for="row in sources" :key="row.key" class="trp-row">
              <span class="trp-row-label" :style="{ color: row.color }">{{ row.icon }} {{ row.label }}</span>
              <div class="trp-row-track"><div class="trp-row-fill" :style="{ width: row.pct + '%', background: row.color }"></div></div>
              <span class="trp-row-meta">{{ row.count }} · {{ row.pct }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 实践分档 -->
      <div class="trp-card">
        <span class="trp-card-t">实践分档</span>
        <div class="trp-bucket-row">
          <div v-for="b in bucketList" :key="b.key" class="trp-bucket">
            <span class="trp-bucket-dot" :style="{ background: b.color }"></span>
            <span class="trp-bucket-label">{{ b.label }}</span>
            <b>{{ b.count }}</b>
            <span class="trp-bucket-pct">{{ b.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 文明健康 -->
      <div class="trp-card">
        <span class="trp-card-t">文明健康</span>
        <div class="trp-health-main">
          <strong class="trp-health-score">{{ health.score }}</strong>
          <span class="trp-health-label" :class="{ good: health.score >= 70 }">{{ health.label }}</span>
        </div>
        <div class="trp-health-bars">
          <div class="trp-hbar"><span>广度</span><div class="trp-hbar-track"><div class="trp-hbar-fill" :style="{ width: health.breadth + '%' }"></div></div><b>{{ health.breadth }}</b></div>
          <div class="trp-hbar"><span>传承</span><div class="trp-hbar-track"><div class="trp-hbar-fill" :style="{ width: health.heritage + '%' }"></div></div><b>{{ health.heritage }}</b></div>
          <div class="trp-hbar"><span>延续</span><div class="trp-hbar-track"><div class="trp-hbar-fill" :style="{ width: health.continuity + '%' }"></div></div><b>{{ health.continuity }}</b></div>
        </div>
      </div>

      <!-- 高频标签 -->
      <div v-if="tags.length" class="trp-card">
        <span class="trp-card-t">高频标签</span>
        <div class="trp-tags">
          <span v-for="t in tags" :key="t.tag" class="trp-tag">#{{ t.tag }}</span>
        </div>
      </div>

      <!-- 温和洞察 -->
      <div v-if="insights.length" class="trp-card">
        <span class="trp-card-t">温和洞察</span>
        <ul class="trp-insights">
          <li v-for="(ins, i) in insights" :key="i">✦ {{ ins }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.trp-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  padding: 18px 18px 20px;
  border-radius: 16px;
  background: rgba(196, 160, 96, 0.05);
  border: 1px solid rgba(196, 160, 96, 0.12);
}
.trp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.trp-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 2px;
  color: #e8d8b8;
}
.trp-sub {
  font-size: 11px;
  color: rgba(196, 160, 96, 0.55);
  letter-spacing: 1px;
}
.trp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: rgba(232, 221, 208, 0.3);
}
.trp-empty-icon {
  font-size: 26px;
  opacity: 0.5;
}
.trp-empty p {
  font-size: 12px;
  line-height: 1.7;
  text-align: center;
  margin: 0;
  max-width: 420px;
}
.trp-card {
  padding: 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(196, 160, 96, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}
.trp-card-t {
  font-size: 12px;
  font-weight: 500;
  color: rgba(196, 160, 96, 0.6);
  letter-spacing: 1px;
}
.trp-ov-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
@media (max-width: 600px) {
  .trp-ov-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.trp-ov-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(196, 160, 96, 0.06);
}
.trp-ov-cell span {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.45);
}
.trp-ov-cell b {
  font-size: 20px;
  font-weight: 600;
  color: #e8d8b8;
  line-height: 1.1;
}
.trp-ov-last {
  font-size: 11px;
  color: rgba(196, 160, 96, 0.55);
  margin: 0;
}
.trp-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 700px) {
  .trp-cols {
    grid-template-columns: 1fr;
  }
}
.trp-row-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.trp-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.trp-row-label {
  width: 70px;
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trp-row-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-card);
  overflow: hidden;
}
.trp-row-fill {
  height: 100%;
  border-radius: 999px;
  min-width: 4px;
  background: rgba(196, 160, 96, 0.5);
}
.trp-row-meta {
  width: 74px;
  text-align: right;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.4);
}
.trp-bucket-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.trp-bucket {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(196, 160, 96, 0.06);
  font-size: 12px;
}
.trp-bucket-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}
.trp-bucket-label {
  color: rgba(232, 221, 208, 0.55);
}
.trp-bucket b {
  color: #e8d8b8;
  font-size: 14px;
}
.trp-bucket-pct {
  margin-left: auto;
  color: rgba(232, 221, 208, 0.35);
  font-size: 11px;
}
.trp-health-main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.trp-health-score {
  font-size: 34px;
  font-weight: 700;
  color: #e8d8b8;
  line-height: 1;
}
.trp-health-label {
  font-size: 13px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(196, 160, 96, 0.12);
  color: rgba(232, 216, 184, 0.75);
}
.trp-health-label.good {
  background: rgba(124, 184, 255, 0.12);
  color: #8fbeff;
}
.trp-health-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.trp-hbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.trp-hbar span {
  width: 32px;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
}
.trp-hbar-track {
  flex: 1;
  height: 7px;
  border-radius: 999px;
  background: var(--bg-card);
  overflow: hidden;
}
.trp-hbar-fill {
  height: 100%;
  border-radius: 999px;
  background: rgba(196, 160, 96, 0.55);
}
.trp-hbar b {
  width: 26px;
  text-align: right;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
}
.trp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.trp-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(196, 160, 96, 0.1);
  color: rgba(232, 216, 184, 0.75);
}
.trp-insights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.trp-insights li {
  font-size: 12px;
  line-height: 1.7;
  color: rgba(232, 221, 208, 0.55);
}
</style>