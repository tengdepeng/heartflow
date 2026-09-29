<template>
  <section class="cap-archive" aria-label="匠庐档案">
    <!-- 空态（无作品） -->
    <template v-if="!hasData">
      <div class="cap-head">
        <span class="cap-title">✨ 匠庐档案</span>
        <span class="cap-badge cap-badge-neutral">匠庐未启</span>
      </div>
      <EmptyState
        icon="✨"
        title="炉火尚温"
        hint="还没有任何作品陈列于此。落一件「样作」、打磨到「细琢」，匠心的成色便会在这面墙上显影。"
        cta-label=""
      />
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="cap-head">
        <span class="cap-title">✨ 匠庐档案</span>
        <span class="cap-badge cap-badge-gold">{{ health?.label }}</span>
      </div>

      <!-- 匠庐概览 -->
      <div class="cap-block" v-if="overview">
        <h3 class="cap-block-title">匠心概览</h3>
        <div class="cap-g8">
          <div class="cap-cell"><span class="cap-cell-num">{{ overview.total }}</span><span class="cap-cell-label">总作品</span></div>
          <div class="cap-cell"><span class="cap-cell-num">{{ overview.avgEvolution }}<small>/100</small></span><span class="cap-cell-label">平均进化</span></div>
          <div class="cap-cell"><span class="cap-cell-num">{{ overview.completed }}</span><span class="cap-cell-label">已完成</span></div>
          <div class="cap-cell"><span class="cap-cell-num">{{ overview.wip }}</span><span class="cap-cell-label">打磨中</span></div>
          <div class="cap-cell"><span class="cap-cell-num">{{ overview.archived }}</span><span class="cap-cell-label">归档</span></div>
          <div class="cap-cell"><span class="cap-cell-num">{{ overview.totalPolishEvents }}</span><span class="cap-cell-label">打磨事件</span></div>
        </div>
        <p v-if="overview.peak || overview.latest" class="cap-hint">
          <template v-if="overview.peak">进化之最是「{{ overview.peak.name }}」（{{ overview.peak.evolution }}<template v-if="overview.peak.icon"> {{ overview.peak.icon }}</template>）。</template>
          <template v-if="overview.latest">最近落笔是「{{ overview.latest.name }}」。</template>
        </p>
      </div>

      <!-- 状态分布 -->
      <div class="cap-block" v-if="statusRows.length">
        <h3 class="cap-block-title">状态分布</h3>
        <div class="cap-rows">
          <div v-for="r in statusRows" :key="r.key" class="cap-row">
            <span class="cap-row-dot" :style="{ background: r.color }"></span>
            <span class="cap-row-label">{{ r.label }}</span>
            <div class="cap-row-bar"><div class="cap-row-fill" :style="{ width: pct(r.pct), background: r.color }"></div></div>
            <span class="cap-row-num">{{ r.count }} 件 · {{ r.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 类型分布 -->
      <div class="cap-block" v-if="typeRows.length">
        <h3 class="cap-block-title">手艺类型</h3>
        <div class="cap-rows">
          <div v-for="r in typeRows" :key="r.key" class="cap-row">
            <span class="cap-row-icon">{{ r.icon }}</span>
            <span class="cap-row-label">{{ r.label }}</span>
            <div class="cap-row-bar"><div class="cap-row-fill" :style="{ width: pct(r.pct), background: r.color }"></div></div>
            <span class="cap-row-num">{{ r.count }} 件 · {{ r.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 进化分档 -->
      <div class="cap-block" v-if="evoRows.length">
        <h3 class="cap-block-title">进化分档</h3>
        <div class="cap-rows">
          <div v-for="r in evoRows" :key="r.key" class="cap-row">
            <span class="cap-row-dot" :style="{ background: r.color }"></span>
            <span class="cap-row-label">{{ r.label }}</span>
            <div class="cap-row-bar"><div class="cap-row-fill" :style="{ width: pct(r.pct), background: r.color }"></div></div>
            <span class="cap-row-num">{{ r.count }} 件 · {{ r.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 创作节律 -->
      <div class="cap-block" v-if="rhythm">
        <h3 class="cap-block-title">创作节律</h3>
        <div class="cap-g5">
          <div class="cap-cell"><span class="cap-cell-num">{{ rhythm.recent30 }}</span><span class="cap-cell-label">近30天新作</span></div>
          <div class="cap-cell"><span class="cap-cell-num">{{ rhythm.recent90 }}</span><span class="cap-cell-label">近90天新作</span></div>
          <div class="cap-cell"><span class="cap-cell-num">{{ rhythm.active7 }}</span><span class="cap-cell-label">近7天活跃</span></div>
          <div class="cap-cell"><span class="cap-cell-num">{{ rhythm.worksPolished }}</span><span class="cap-cell-label">受打磨作品</span></div>
          <div class="cap-cell"><span class="cap-cell-num">{{ rhythm.daysSinceLastCreated ?? '—' }}<small v-if="rhythm.daysSinceLastCreated !== null">天</small></span><span class="cap-cell-label">距上次创作</span></div>
        </div>
      </div>

      <!-- 匠庐健康 -->
      <div class="cap-block" v-if="health">
        <h3 class="cap-block-title">匠庐健康</h3>
        <div class="cap-health">
          <div class="cap-health-score">
            <span class="cap-health-num">{{ health.score }}</span>
            <span class="cap-health-label">{{ health.label }}</span>
          </div>
          <div class="cap-health-bars">
            <div class="cap-hbar">
              <span class="cap-hbar-label">精进</span>
              <div class="cap-hbar-track"><div class="cap-hbar-fill"></div></div>
              <span class="cap-hbar-num">{{ health.refine }}/45</span>
            </div>
            <div class="cap-hbar">
              <span class="cap-hbar-label">完成</span>
              <div class="cap-hbar-track"><div class="cap-hbar-fill cap-hbar-fill--comp"></div></div>
              <span class="cap-hbar-num">{{ health.complete }}/30</span>
            </div>
            <div class="cap-hbar">
              <span class="cap-hbar-label">持续</span>
              <div class="cap-hbar-track"><div class="cap-hbar-fill cap-hbar-fill--sustain"></div></div>
              <span class="cap-hbar-num">{{ health.sustain }}/25</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 高频标签 -->
      <div class="cap-block" v-if="tags.length">
        <h3 class="cap-block-title">高频标签</h3>
        <div class="cap-tags">
          <span v-for="t in tags" :key="t.tag" class="cap-tag">{{ t.tag }} · {{ t.count }}</span>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="cap-insights">
        <li v-for="ins in insights" :key="ins" class="cap-insight">
          <span class="cap-insight-mark">✦</span>
          <span class="cap-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCraftStore } from '../modules/craft'
import EmptyState from './EmptyState.vue'
import {
  craftOverview,
  craftStatusRows,
  craftTypeRows,
  craftEvolutionRows,
  craftRhythm,
  craftHealth,
  craftInsights,
  craftTopTags,
} from '../modules/craft/craft-analytics'

const store = useCraftStore()

const works = computed(() => store.works)
const now = computed(() => new Date())

const hasData = computed(() => works.value.length > 0)

const overview = computed(() => (hasData.value ? craftOverview(works.value) : null))
const statusRows = computed(() => (hasData.value ? craftStatusRows(works.value) : []))
const typeRows = computed(() => (hasData.value ? craftTypeRows(works.value) : []))
const evoRows = computed(() => (hasData.value ? craftEvolutionRows(works.value) : []))
const rhythm = computed(() => (hasData.value ? craftRhythm(works.value, now.value) : null))
const health = computed(() => (hasData.value ? craftHealth(works.value, now.value) : null))
const insights = computed(() => (hasData.value ? craftInsights(works.value, now.value) : []))
const tags = computed(() => (hasData.value ? craftTopTags(works.value) : []))

function pct(v: number): string {
  return `${Math.max(0, Math.min(100, Math.round(v)))}%`
}
</script>

<style scoped>
.cap-archive {
  display: block;
  width: 100%;
  max-width: 640px;
}
.cap-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.cap-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 0.02em;
}
.cap-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid;
}
.cap-badge-gold {
  color: var(--accent-warm, #f0c040);
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 12%, transparent);
}
.cap-badge-neutral {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  border-color: var(--border-light, #3a332a);
  background: transparent;
}
.cap-block {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light, #3a332a);
}
.cap-block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-bottom: 10px;
  letter-spacing: 0.06em;
}
.cap-g8 {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}
.cap-g5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.cap-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 55%, transparent);
}
.cap-cell-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #e8e0d8);
}
.cap-cell-num small {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cap-cell-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  text-align: center;
}
.cap-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cap-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cap-row {
  display: grid;
  grid-template-columns: 18px 64px 1fr 74px;
  align-items: center;
  gap: 8px;
}
.cap-row-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.cap-row-icon {
  font-size: 14px;
  text-align: center;
}
.cap-row-label {
  font-size: 13px;
  color: var(--text-primary, #e8e0d8);
  white-space: nowrap;
}
.cap-row-bar {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 70%, transparent);
  overflow: hidden;
}
.cap-row-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}
.cap-row-num {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  text-align: right;
  white-space: nowrap;
}
.cap-health {
  display: flex;
  gap: 20px;
  align-items: center;
}
.cap-health-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 88px;
}
.cap-health-num {
  font-size: 34px;
  font-weight: 700;
  color: var(--accent-warm, #f0c040);
  line-height: 1;
}
.cap-health-label {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cap-health-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cap-hbar {
  display: grid;
  grid-template-columns: 40px 1fr 44px;
  align-items: center;
  gap: 8px;
}
.cap-hbar-label {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cap-hbar-track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 70%, transparent);
  overflow: hidden;
}
.cap-hbar-fill {
  width: 0;
  height: 100%;
  border-radius: 999px;
  background: #f0c040;
}
.cap-hbar-fill--comp {
  background: #8a9a7a;
}
.cap-hbar-fill--sustain {
  background: #c46a5a;
}
.cap-hbar-num {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  text-align: right;
}
.cap-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cap-tag {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-primary, #e8e0d8);
  background: color-mix(in srgb, var(--bg-card, #241f18) 60%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.cap-insights {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 40%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
}
.cap-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #e8e0d8);
}
.cap-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}
</style>