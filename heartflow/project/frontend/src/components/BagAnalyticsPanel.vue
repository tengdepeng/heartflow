<template>
  <section class="bap">
    <div class="bap-head">
      <span class="bap-title">🧭 技能分析</span>
      <span v-if="health.healthScore > 0" class="bap-tag" :style="{ color: healthColor(health.healthScore) }">
        健康 {{ health.healthScore }} 分
      </span>
      <span v-else class="bap-tag">行囊尚空</span>
    </div>

    <!-- 技能健康度 -->
    <div class="bap-block">
      <div class="bap-block-title">技能健康度</div>
      <div class="bap-health-grid">
        <div class="bap-health-ring" :style="{ '--score': health.healthScore }">
          <div class="bap-ring-inner">
            <b>{{ health.healthScore }}</b>
            <span>综合</span>
          </div>
        </div>
        <div class="bap-health-metrics">
          <div class="bap-metric"><b>{{ health.totalItems }}</b><span>总物品</span></div>
          <div class="bap-metric"><b>{{ health.avgProficiency }}%</b><span>平均熟练</span></div>
          <div class="bap-metric"><b>{{ health.masteredItems }}</b><span>已精通</span></div>
          <div class="bap-metric"><b>{{ health.weakItems }}</b><span>薄弱</span></div>
          <div class="bap-metric"><b>{{ pct(health.diversity) }}</b><span>多样性</span></div>
        </div>
      </div>
    </div>

    <!-- 技能雷达 -->
    <div class="bap-block">
      <div class="bap-block-title">技能雷达</div>
      <div v-if="radar.length" class="bap-radar">
        <div v-for="r in radar" :key="r.category" class="bap-radar-row">
          <span class="bap-radar-icon">{{ catIcon(r.category) }}</span>
          <span class="bap-radar-label">{{ r.label }}</span>
          <div class="bap-radar-bar">
            <i :style="{ width: r.proficiency + '%', background: catColor(r.category) }"></i>
          </div>
          <span class="bap-radar-val">{{ r.proficiency }}%</span>
        </div>
      </div>
      <p v-else class="bap-empty">还没有技能分类，先添加物品吧。</p>
    </div>

    <!-- 成长趋势 -->
    <div class="bap-block">
      <div class="bap-block-title">
        成长趋势
        <button class="bap-snap-btn" @click="snapGrowth" title="记录今日成长快照">记录今日</button>
      </div>
      <div v-if="trend.length > 1" class="bap-chart">
        <svg :viewBox="`0 0 ${W} ${H}`" class="bap-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bap-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(138,154,122,0.28)" />
              <stop offset="100%" stop-color="rgba(138,154,122,0)" />
            </linearGradient>
          </defs>
          <polygon :points="areaPoints" fill="url(#bap-fill)" />
          <polyline :points="linePoints" fill="none" stroke="rgba(138,154,122,0.7)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
        </svg>
        <div class="bap-chart-meta">
          <span>当前均熟 {{ currentAvg }}%</span>
          <span>较首日 {{ trendDelta >= 0 ? '+' : '' }}{{ trendDelta }}%</span>
        </div>
      </div>
      <p v-else class="bap-empty">记录几次成长快照后，趋势会在这里展开。</p>
    </div>

    <!-- 熟练度预测 -->
    <div v-if="predictions.length" class="bap-block">
      <div class="bap-block-title">熟练度预测</div>
      <div class="bap-predictions">
        <div v-for="p in predictions.slice(0, 5)" :key="p.category" class="bap-pred-row">
          <span class="bap-pred-label">{{ p.label }}</span>
          <div class="bap-pred-bars">
            <span class="bap-pred-bar" :style="{ width: p.currentProficiency + '%', background: catColor(p.category) }"></span>
            <span class="bap-pred-bar bap-pred-bar--future" :style="{ width: p.predicted90Days + '%' }"></span>
          </div>
          <span class="bap-pred-val">{{ p.currentProficiency }}% → {{ p.predicted90Days }}%</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBagStore, useBagAnalytics, CATEGORY_TYPES } from '../modules/bag'

const store = useBagStore()
const { calculateSkillRadar, calculateSkillHealth, getGrowthTrend, recordGrowthPoint, predictProficiency } = useBagAnalytics()

const categories = computed(() => store.categories)
const radar = computed(() => calculateSkillRadar(categories.value))
const health = computed(() => calculateSkillHealth(categories.value))
const trend = computed(() => getGrowthTrend(90))
const predictions = computed(() => predictProficiency(categories.value))

const W = 320
const H = 72

const linePoints = computed(() => {
  const pts = trend.value
  if (pts.length < 2) return ''
  const max = Math.max(...pts.map(p => p.avgProficiency), 1)
  return pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W
    const y = H - (p.avgProficiency / max) * (H - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

const areaPoints = computed(() => {
  const line = linePoints.value
  if (!line) return ''
  const pts = line.split(' ')
  return `${pts[0].split(',')[0]},${H} ${line} ${pts[pts.length - 1].split(',')[0]},${H}`
})

const currentAvg = computed(() => trend.value.length ? trend.value[trend.value.length - 1].avgProficiency : 0)
const trendDelta = computed(() => {
  const t = trend.value
  if (t.length < 2) return 0
  return t[t.length - 1].avgProficiency - t[0].avgProficiency
})

function catIcon(cat: string): string {
  return CATEGORY_TYPES.find(t => t.value === cat)?.icon ?? '🔧'
}

function catColor(cat: string): string {
  return CATEGORY_TYPES.find(t => t.value === cat)?.color ?? '#c8a060'
}

function healthColor(score: number): string {
  if (score >= 70) return '#8a9a7a'
  if (score >= 50) return '#c9a86a'
  if (score >= 30) return '#d0a05a'
  return '#c46a5a'
}

function pct(r: number): string {
  return Math.round(r * 100) + '%'
}

function snapGrowth() {
  recordGrowthPoint(categories.value)
}
</script>

<style scoped>
.bap {
  position: relative;
  z-index: 1;
  margin: 20px 32px 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.bap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.bap-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.75);
}

.bap-tag {
  font-size: 11px;
  padding: 3px 12px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
}

.bap-block {
  padding: 14px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.07);
  margin-bottom: 12px;
}

.bap-block:last-child { margin-bottom: 0; }

.bap-block-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.45);
  margin-bottom: 10px;
}

.bap-snap-btn {
  font-size: 10px;
  padding: 2px 10px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--accent-rgb), 0.6);
  cursor: pointer;
}

.bap-snap-btn:hover { background: rgba(var(--accent-rgb), 0.12); }

/* 健康度 */
.bap-health-grid {
  display: flex;
  align-items: center;
  gap: 20px;
}

.bap-health-ring {
  flex: 0 0 88px;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: conic-gradient(var(--accent) calc(var(--score) * 1%), rgba(var(--accent-rgb), 0.08) 0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bap-ring-inner {
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.bap-ring-inner b { font-size: 20px; font-weight: 600; color: var(--accent); }
.bap-ring-inner span { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }

.bap-health-metrics {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
  gap: 8px;
}

.bap-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.05);
}

.bap-metric b { font-size: 15px; font-weight: 600; color: var(--accent); }
.bap-metric span { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }

/* 雷达 */
.bap-radar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bap-radar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.55);
}

.bap-radar-icon { flex: 0 0 18px; text-align: center; }
.bap-radar-label { flex: 0 0 64px; }
.bap-radar-bar { flex: 1; height: 7px; border-radius: 4px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.bap-radar-bar i { display: block; height: 100%; border-radius: 4px; transition: width 0.4s; }
.bap-radar-val { flex: 0 0 36px; text-align: right; }

/* 趋势 */
.bap-chart { position: relative; }
.bap-svg { width: 100%; height: 72px; display: block; }

.bap-chart-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
}

/* 预测 */
.bap-predictions {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.bap-pred-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.55);
}

.bap-pred-label { flex: 0 0 64px; }
.bap-pred-bars { flex: 1; display: flex; gap: 2px; height: 7px; border-radius: 4px; background: rgba(var(--accent-rgb), 0.06); overflow: hidden; }
.bap-pred-bar { display: block; height: 100%; border-radius: 4px; transition: width 0.4s; }
.bap-pred-bar--future { background: rgba(var(--accent-rgb), 0.25); }
.bap-pred-val { flex: 0 0 84px; text-align: right; }

.bap-empty {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.35);
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .bap { margin: 16px 16px 0; padding: 14px; }
  .bap-health-grid { flex-direction: column; align-items: stretch; }
  .bap-health-ring { align-self: center; }
}
</style>
