<template>
  <section class="hbp" data-test="home-bridge-panel" aria-label="家·桥接总览">
    <header class="hbp-head">
      <div class="hbp-head-text">
        <h3 class="hbp-title">🏠 家·桥接总览</h3>
        <p class="hbp-sub">健康度 · 房间热力 · 活动节律 · 装饰留痕 · 归家指引 — 一屏守望家的每个房间</p>
      </div>
      <span class="hbp-health" :class="`hbp-health--${healthKey}`" data-test="hbp-health">
        {{ health.score }} · {{ healthLabel }}
      </span>
    </header>

    <!-- 家健康度 -->
    <div class="hbp-block" data-test="hbp-health-block">
      <span class="hbp-block-label">家健康度</span>
      <div class="hbp-dims">
        <div class="hbp-dim" v-for="d in dimRows" :key="d.key" data-test="hbp-dim">
          <span class="hbp-dim-name">{{ d.label }}</span>
          <div class="hbp-dim-bar"><div class="hbp-dim-fill" :style="{ width: `${d.value}%`, background: d.color }"></div></div>
          <b class="hbp-dim-value">{{ d.value }}<i>%</i></b>
        </div>
      </div>
      <ul v-if="health.suggestions.length" class="hbp-sug-list" data-test="hbp-sug">
        <li v-for="(s, i) in health.suggestions" :key="i" class="hbp-sug-item">✦ {{ s }}</li>
      </ul>
    </div>

    <!-- 房间热力图 -->
    <div v-if="heatmapRows.length" class="hbp-block" data-test="hbp-heatmap">
      <span class="hbp-block-label">房间热力图</span>
      <div class="hbp-heat-row">
        <div v-for="r in heatmapRows" :key="r.roomId" class="hbp-heat" data-test="hbp-heat">
          <div class="hbp-heat-head">
            <span class="hbp-heat-icon" :style="{ background: r.color }">{{ r.roomName.charAt(0) }}</span>
            <span class="hbp-heat-name">{{ r.roomName }}</span>
          </div>
          <div class="hbp-heat-metrics">
            <span class="hbp-heat-m">到访 {{ r.visitCount }}</span>
            <span class="hbp-heat-m">活力 {{ r.activityScore }}</span>
            <span class="hbp-heat-m">情绪 {{ r.moodScore }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 活动时间线 -->
    <div v-if="timelineRows.length" class="hbp-block" data-test="hbp-timeline">
      <span class="hbp-block-label">近 14 天活动节律</span>
      <div class="hbp-tl-list">
        <div v-for="t in timelineRows" :key="t.date" class="hbp-tl" data-test="hbp-tl">
          <span class="hbp-tl-date">{{ t.date.slice(5) }}</span>
          <div class="hbp-tl-bar"><div class="hbp-tl-fill" :style="{ width: tlPct(t.count) }"></div></div>
          <span class="hbp-tl-count">{{ t.count }}<i>次</i></span>
        </div>
      </div>
    </div>

    <!-- 装饰使用排行 -->
    <div v-if="decoRows.length" class="hbp-block" data-test="hbp-deco">
      <span class="hbp-block-label">装饰使用排行</span>
      <div class="hbp-deco-list">
        <div v-for="d in decoRows" :key="d.name" class="hbp-deco" data-test="hbp-deco-item">
          <span class="hbp-deco-icon">{{ d.icon }}</span>
          <span class="hbp-deco-name">{{ d.name }}</span>
          <span class="hbp-deco-type">{{ decoTypeLabel(d.type) }}</span>
          <b class="hbp-deco-count">{{ d.count }}<i>处</i></b>
        </div>
      </div>
    </div>

    <!-- 房间推荐 -->
    <div v-if="recRows.length" class="hbp-block" data-test="hbp-recs">
      <span class="hbp-block-label">归家指引</span>
      <ul class="hbp-recs-list">
        <li v-for="(r, i) in recRows" :key="`${r.roomId}-${i}`" class="hbp-recs-item" :class="`hbp-prio-${r.priority}`" data-test="hbp-recs-item">
          <span class="hbp-recs-tag" :class="`tag-${r.priority}`">{{ prioLabel(r.priority) }}</span>
          <span class="hbp-recs-icon">{{ r.roomIcon }}</span>
          <span class="hbp-recs-body">
            <b class="hbp-recs-name">{{ r.roomName }}</b>
            <span class="hbp-recs-reason">{{ r.reason }}</span>
            <span class="hbp-recs-act">建议：{{ r.suggestedActivity }} · {{ r.estimatedDuration }} 分钟</span>
          </span>
        </li>
      </ul>
    </div>

    <p v-if="emptyAll" class="hbp-empty" data-test="hbp-empty">
      家的空间还没有痕迹。进入一个房间，放下一件装饰、记录一次感受，总览将随之显影。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHomeBridge } from '../modules/home/home-bridge'

const bridge = useHomeBridge()

const health = computed(() => bridge.homeHealth.value)
const heatmapRows = computed(() => bridge.roomHeatmap.value)
const timelineRows = computed(() => bridge.activityTimeline.value)
const decoRows = computed(() => bridge.decorationUsageRanking.value)
const recRows = computed(() => bridge.roomRecommendations.value)

const DIM_META: { key: keyof typeof health.value; label: string; color: string }[] = [
  { key: 'roomCoverage', label: '房间覆盖', color: '#8a9a7a' },
  { key: 'decorationRate', label: '装饰完成', color: '#d0b269' },
  { key: 'interactionActivity', label: '交互活跃', color: '#6b9fc4' },
  { key: 'atmosphereDiversity', label: '氛围多样', color: '#c46a5a' },
  { key: 'moodHealth', label: '情绪健康', color: '#a479b0' },
]

const dimRows = computed(() =>
  DIM_META.map(d => ({ key: d.key, label: d.label, color: d.color, value: Number(health.value[d.key]) || 0 }))
)

const healthKey = computed(() => {
  const s = health.value.score
  return s >= 80 ? 'flourish' : s >= 60 ? 'stable' : s >= 40 ? 'growing' : s >= 20 ? 'sprout' : 'idle'
})

const healthLabel = computed(() => {
  const s = health.value.score
  return s >= 80 ? '丰盈' : s >= 60 ? '安稳' : s >= 40 ? '生长' : s >= 20 ? '萌芽' : '待启'
})

const maxTimeline = computed(() => Math.max(1, ...timelineRows.value.map(t => t.count)))

const emptyAll = computed(() =>
  health.value.score === 0 &&
  heatmapRows.value.length === 0 &&
  timelineRows.value.length === 0 &&
  decoRows.value.length === 0 &&
  recRows.value.length === 0
)

const PRIO_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' }
function prioLabel(p: string): string { return PRIO_LABEL[p] ?? p }

const DECO_TYPE_LABEL: Record<string, string> = {
  light: '光', plant: '植', furniture: '具', ornament: '饰', craft: '手',
}
function decoTypeLabel(t: string): string { return DECO_TYPE_LABEL[t] ?? t }

function tlPct(count: number): string {
  return `${Math.max(3, Math.round((count / maxTimeline.value) * 100))}%`
}
</script>

<style scoped>
.hbp {
  color: var(--ink, #2b2f36);
  font-family: var(--hf-font, inherit);
}
.hbp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.hbp-title { margin: 0; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.02em; }
.hbp-sub { margin: 2px 0 0; font-size: 0.78rem; opacity: 0.66; }
.hbp-health {
  font-size: 0.8rem; font-weight: 600; padding: 4px 10px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.4); border: 1px solid rgba(0, 0, 0, 0.06);
}
.hbp-health--flourish { color: #4a6b4a; }
.hbp-health--stable { color: #7a6236; }
.hbp-health--growing { color: #4f6d90; }
.hbp-health--sprout { color: #9c5b4d; }
.hbp-health--idle { color: #7a7f88; }
.hbp-block {
  border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 12px; padding: 12px 14px;
  background: rgba(255, 255, 255, 0.34); margin-top: 10px;
}
.hbp-block-label {
  display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em;
  opacity: 0.62; margin-bottom: 8px; text-transform: uppercase;
}
.hbp-dims { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.hbp-dim { display: flex; flex-direction: column; gap: 4px; }
.hbp-dim-name { font-size: 0.72rem; opacity: 0.78; }
.hbp-dim-bar { height: 6px; border-radius: 3px; background: rgba(0, 0, 0, 0.07); overflow: hidden; }
.hbp-dim-fill { height: 100%; border-radius: 3px; }
.hbp-dim-value { font-size: 0.82rem; } .hbp-dim-value i { font-style: normal; opacity: 0.55; font-size: 0.62rem; }
.hbp-sug-list { margin: 8px 0 0; padding: 0; list-style: none; }
.hbp-sug-item { font-size: 0.78rem; padding: 3px 0; opacity: 0.82; }
.hbp-heat-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(126px, 1fr)); gap: 8px; }
.hbp-heat { border: 1px solid rgba(0, 0, 0, 0.05); border-radius: 10px; padding: 8px; background: rgba(255, 255, 255, 0.5); }
.hbp-heat-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.hbp-heat-icon { width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; font-size: 0.7rem; color: #fff; }
.hbp-heat-name { font-size: 0.8rem; font-weight: 600; }
.hbp-heat-metrics { display: flex; flex-wrap: wrap; gap: 8px; }
.hbp-heat-m { font-size: 0.7rem; opacity: 0.7; }
.hbp-tl-list { display: flex; flex-direction: column; gap: 5px; }
.hbp-tl { display: flex; align-items: center; gap: 8px; }
.hbp-tl-date { flex: 0 0 34px; font-size: 0.7rem; opacity: 0.72; }
.hbp-tl-bar { flex: 1; height: 8px; border-radius: 4px; background: rgba(0, 0, 0, 0.07); overflow: hidden; }
.hbp-tl-fill { height: 100%; border-radius: 4px; background: #6b9fc4; }
.hbp-tl-count { flex: 0 0 42px; text-align: right; font-size: 0.78rem; } .hbp-tl-count i { font-style: normal; opacity: 0.55; font-size: 0.62rem; }
.hbp-deco-list { display: flex; flex-direction: column; gap: 5px; }
.hbp-deco { display: flex; align-items: center; gap: 8px; }
.hbp-deco-icon { width: 20px; text-align: center; }
.hbp-deco-name { flex: 1; font-size: 0.82rem; font-weight: 600; }
.hbp-deco-type { font-size: 0.7rem; opacity: 0.6; }
.hbp-deco-count { font-size: 0.78rem; } .hbp-deco-count i { font-style: normal; opacity: 0.55; font-size: 0.62rem; }
.hbp-recs-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.hbp-recs-item {
  display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px;
  border-radius: 10px; background: rgba(255, 255, 255, 0.45); border-left: 3px solid transparent;
}
.hbp-recs-item.hbp-prio-high { border-left-color: #c46a5a; }
.hbp-recs-item.hbp-prio-medium { border-left-color: #d0b269; }
.hbp-recs-item.hbp-prio-low { border-left-color: #9aa0ab; }
.hbp-recs-tag { font-size: 0.66rem; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: rgba(0, 0, 0, 0.06); }
.hbp-recs-tag.tag-high { background: #c46a5a; color: #fff; }
.hbp-recs-tag.tag-medium { background: #d0b269; color: #fff; }
.hbp-recs-tag.tag-low { background: rgba(0, 0, 0, 0.35); color: #fff; }
.hbp-recs-icon { font-size: 1.05rem; }
.hbp-recs-body { display: flex; flex-direction: column; gap: 1px; }
.hbp-recs-name { font-size: 0.84rem; }
.hbp-recs-reason { font-size: 0.74rem; opacity: 0.78; }
.hbp-recs-act { font-size: 0.7rem; opacity: 0.6; }
.hbp-empty { font-size: 0.8rem; opacity: 0.66; padding: 10px 0 4px; }
@media (max-width: 640px) {
  .hbp-dims { grid-template-columns: repeat(2, 1fr); }
}
</style>