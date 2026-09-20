<template>
  <section class="crbp" data-test="craft-bridge-panel" aria-label="匠庐·桥接驾驶舱">
    <header class="crbp-head">
      <div class="crbp-head-text">
        <h3 class="crbp-title">🛠 匠庐·桥接驾驶舱</h3>
        <p class="crbp-sub">健康度 · 工坊仪表 · 合成效率 · 作品指引 — 一屏守望创作工坊的心跳</p>
      </div>
      <span class="crbp-health" :class="`crbp-health--${healthKey}`" data-test="crbp-health">
        {{ health.score }} · {{ healthLabel }}
      </span>
    </header>

    <!-- 匠庐健康度 -->
    <div class="crbp-block" data-test="crbp-health-block">
      <span class="crbp-block-label">匠庐健康度</span>
      <div class="crbp-dims">
        <div class="crbp-dim" v-for="d in dimRows" :key="d.key" data-test="crbp-dim">
          <span class="crbp-dim-name">{{ d.label }}</span>
          <div class="crbp-dim-bar"><div class="crbp-dim-fill" :style="{ width: `${d.value}%`, background: d.color }"></div></div>
          <b class="crbp-dim-value">{{ d.value }}<i>%</i></b>
        </div>
      </div>
      <ul v-if="health.suggestions.length" class="crbp-sug-list" data-test="crbp-sug">
        <li v-for="(s, i) in health.suggestions" :key="i" class="crbp-sug-item">✦ {{ s }}</li>
      </ul>
    </div>

    <!-- 工坊仪表盘 -->
    <div v-if="hasDashboard" class="crbp-block" data-test="crbp-dashboard">
      <span class="crbp-block-label">工坊仪表</span>
      <div class="crbp-metric-grid">
        <div class="crbp-metric" v-for="m in metricRows" :key="m.key" data-test="crbp-metric">
          <b class="crbp-metric-value">{{ m.value }}</b>
          <span class="crbp-metric-label">{{ m.label }}</span>
        </div>
      </div>
    </div>

    <!-- 合成效率 -->
    <div v-if="synthRows.length" class="crbp-block" data-test="crbp-synth">
      <span class="crbp-block-label">合成效率</span>
      <div class="crbp-synth-list">
        <div class="crbp-synth" v-for="s in synthRows" :key="s.recipeId" data-test="crbp-synth-item">
          <div class="crbp-synth-head">
            <span class="crbp-synth-name">{{ s.recipeName }}</span>
            <span class="crbp-synth-cat">{{ s.category }}</span>
            <b class="crbp-synth-rate">{{ s.successRate }}%</b>
          </div>
          <div class="crbp-synth-bar"><div class="crbp-synth-fill" :style="{ width: `${s.successRate}%` }"></div></div>
          <span class="crbp-synth-meta">尝试 {{ s.attempts }} · 成功 {{ s.successes }} · 产出 {{ s.totalOutputs }} · 浪费 {{ s.totalWasted }}</span>
        </div>
      </div>
    </div>

    <!-- 作品指引 -->
    <div v-if="recs.length" class="crbp-block" data-test="crbp-recs">
      <span class="crbp-block-label">作品指引</span>
      <ul class="crbp-recs-list">
        <li v-for="(r, i) in recs" :key="`${r.type}-${i}`" class="crbp-recs-item" :class="`crbp-prio-${r.priority}`" data-test="crbp-recs-item">
          <span class="crbp-recs-tag" :class="`tag-${r.priority}`">{{ prioLabel(r.priority) }}</span>
          <span class="crbp-recs-body">
            <b class="crbp-recs-title">{{ recTypeLabel(r.type) }} · {{ r.title }}</b>
            <span class="crbp-recs-desc">{{ r.description }}</span>
            <span class="crbp-recs-benefit">预期 {{ r.expectedBenefit }}</span>
          </span>
        </li>
      </ul>
    </div>

    <p v-if="emptyAll" class="crbp-empty" data-test="crbp-empty">
      匠庐还没有创作的痕迹。落下第一件作品、合成一次材料，驾驶舱将随之显影。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCraftBridge } from '../modules/craft/craft-bridge'

const bridge = useCraftBridge()

const health = computed(() => bridge.craftHealth.value)
const dashboard = computed(() => bridge.dashboard.value)
const synthRows = computed(() =>
  bridge.synthesisEfficiencies.value.filter(s => s.attempts > 0)
)
const recs = computed(() => bridge.workRecommendations.value)

const DIM_META: { key: string; label: string; color: string }[] = [
  { key: 'workProductivity', label: '产出率', color: '#8a9a7a' },
  { key: 'completionRate', label: '完成率', color: '#d0b269' },
  { key: 'evolutionEfficiency', label: '进化效率', color: '#6b9fc4' },
  { key: 'materialAbundance', label: '材料丰裕', color: '#c46a5a' },
  { key: 'synthesisSuccessRate', label: '合成成功', color: '#a479b0' },
  { key: 'badgeCollectionRate', label: '徽章收集', color: '#5f8f8f' },
  { key: 'habitStability', label: '习惯稳定', color: '#b8854a' },
]

const dimRows = computed(() =>
  DIM_META.map(d => ({ key: d.key, label: d.label, color: d.color, value: Number(health.value[d.key as keyof typeof health.value]) || 0 }))
)

const METRIC_META: { key: string; label: string }[] = [
  { key: 'activeWorks', label: '活跃作品' },
  { key: 'newThisMonth', label: '本月新增' },
  { key: 'completedThisMonth', label: '本月完成' },
  { key: 'totalEvolution', label: '总进化' },
  { key: 'materialTypes', label: '材料种类' },
  { key: 'totalMaterials', label: '总材料' },
  { key: 'unlockedBadges', label: '已解锁徽章' },
  { key: 'availableRecipes', label: '可用配方' },
  { key: 'activeSynthesis', label: '合成进行中' },
  { key: 'pendingInspirations', label: '待用灵感' },
  { key: 'currentStreak', label: '连续创作(天)' },
]

const metricRows = computed(() =>
  METRIC_META.map(m => ({ key: m.key, label: m.label, value: Number(dashboard.value[m.key as keyof typeof dashboard.value]) || 0 }))
)

const hasDashboard = computed(() => metricRows.value.some(m => m.value > 0))

const healthKey = computed(() => {
  const s = health.value.score
  return s >= 80 ? 'flourish' : s >= 60 ? 'stable' : s >= 40 ? 'growing' : s >= 20 ? 'sprout' : 'idle'
})

const healthLabel = computed(() => {
  const s = health.value.score
  return s >= 80 ? '丰盈' : s >= 60 ? '安稳' : s >= 40 ? '生长' : s >= 20 ? '萌芽' : '待启'
})

const emptyAll = computed(() =>
  health.value.score === 0 &&
  !hasDashboard.value &&
  synthRows.value.length === 0 &&
  recs.value.length === 0
)

const PRIO_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' }
function prioLabel(p: string): string { return PRIO_LABEL[p] ?? p }

const REC_TYPE_LABEL: Record<string, string> = {
  continue: '继续', start_new: '开新', refine: '打磨', archive: '归档', explore_type: '尝新',
}
function recTypeLabel(t: string): string { return REC_TYPE_LABEL[t] ?? t }
</script>

<style scoped>
.crbp { display: flex; flex-direction: column; gap: 14px; padding: 18px 16px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; background: rgba(22, 22, 26, 0.5); }
.crbp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.crbp-title { margin: 0; font-size: 17px; font-weight: 600; color: #e8e4dc; }
.crbp-sub { margin: 3px 0 0; font-size: 12px; color: #8b877a; }
.crbp-health { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; }
.crbp-health--flourish { background: rgba(112, 168, 110, 0.18); color: #8fcf8a; }
.crbp-health--stable { background: rgba(160, 150, 100, 0.18); color: #d8c978; }
.crbp-health--growing { background: rgba(120, 150, 190, 0.18); color: #9db9e0; }
.crbp-health--sprout { background: rgba(196, 106, 90, 0.18); color: #d98f7c; }
.crbp-health--idle { background: rgba(120, 120, 128, 0.16); color: #9a9aa2; }
.crbp-block { display: flex; flex-direction: column; gap: 8px; }
.crbp-block-label { font-size: 12px; font-weight: 600; letter-spacing: 0.5px; color: #6f6b60; }
.crbp-dims { display: flex; flex-direction: column; gap: 6px; }
.crbp-dim { display: grid; grid-template-columns: 64px 1fr 46px; align-items: center; gap: 8px; font-size: 12px; }
.crbp-dim-name { color: #b6b0a2; }
.crbp-dim-bar { height: 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
.crbp-dim-fill { height: 100%; border-radius: 999px; }
.crbp-dim-value { text-align: right; color: #dfd9cb; font-weight: 600; font-size: 12px; }
.crbp-dim-value i { font-style: normal; font-size: 10px; color: #8b877a; }
.crbp-sug-list { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
.crbp-sug-item { font-size: 12px; color: #b6b0a2; }
.crbp-metric-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
.crbp-metric { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; border-radius: 10px; background: rgba(255, 255, 255, 0.04); }
.crbp-metric-value { font-size: 16px; font-weight: 700; color: #e8e4dc; }
.crbp-metric-label { font-size: 11px; color: #8b877a; }
.crbp-synth-list { display: flex; flex-direction: column; gap: 8px; }
.crbp-synth { padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.04); }
.crbp-synth-head { display: flex; align-items: center; gap: 8px; }
.crbp-synth-name { font-weight: 600; color: #e0dacb; font-size: 13px; }
.crbp-synth-cat { font-size: 11px; color: #8b877a; }
.crbp-synth-rate { margin-left: auto; font-size: 13px; font-weight: 700; color: #d8c978; }
.crbp-synth-bar { height: 5px; margin-top: 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
.crbp-synth-fill { height: 100%; border-radius: 999px; background: #d8c978; }
.crbp-synth-meta { font-size: 11px; color: #8b877a; }
.crbp-recs-list { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
.crbp-recs-item { display: flex; gap: 10px; padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.04); border-left: 3px solid #8b877a; }
.crbp-recs-item.crbp-prio-high { border-left-color: #c46a5a; }
.crbp-recs-item.crbp-prio-medium { border-left-color: #d0b269; }
.crbp-recs-item.crbp-prio-low { border-left-color: #6b9fc4; }
.crbp-recs-tag { flex: none; align-self: flex-start; padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 600; }
.crbp-recs-tag.tag-high { background: rgba(196, 106, 90, 0.2); color: #e0a396; }
.crbp-recs-tag.tag-medium { background: rgba(208, 178, 105, 0.2); color: #e0cc8f; }
.crbp-recs-tag.tag-low { background: rgba(107, 159, 196, 0.2); color: #9db9e0; }
.crbp-recs-body { display: flex; flex-direction: column; gap: 2px; }
.crbp-recs-title { font-size: 13px; font-weight: 600; color: #e0dacb; }
.crbp-recs-desc, .crbp-recs-benefit { font-size: 12px; color: #8b877a; }
.crbp-empty { margin: 0; padding: 14px; border-radius: 10px; text-align: center; font-size: 13px; color: #8b877a; background: rgba(255, 255, 255, 0.03); }
</style>