<template>
  <section class="hpp" aria-label="愈合预测">
    <div class="hpp-head">
      <div class="hpp-title-wrap">
        <span class="hpp-title">🩺 愈合预测</span>
        <span class="hpp-sub">用历史数据与多因子模型，估算每道印痊愈的时间</span>
      </div>
      <span v-if="activePredictions.length" class="hpp-tag">{{ activePredictions.length }} 道在途</span>
    </div>

    <!-- 空态 -->
    <div v-if="!props.marks.length" class="hpp-empty">
      <span class="hpp-empty-icon">🩺</span>
      <p class="hpp-empty-text">先记录一道工痕，才能预测它的愈合轨迹</p>
    </div>

    <template v-else>
      <!-- 愈合基线 -->
      <div v-if="baselines.length" class="hpp-block">
        <span class="hpp-block-label">愈合基线 · 历史同类</span>
        <div class="hpp-baselines">
          <div v-for="b in baselines.slice(0, 6)" :key="`${b.scarType}-${b.severity}-${b.bodyPart}`" class="hpp-baseline">
            <span class="hpp-baseline-type">{{ typeLabel(b.scarType) }}</span>
            <span class="hpp-baseline-sev">{{ '★'.repeat(b.severity) }}</span>
            <div class="hpp-baseline-body">
              <b>{{ b.avgDays }}<i>天</i></b>
              <span>样本 {{ b.sampleSize }} · σ{{ b.stdDev }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 预测列表 -->
      <div class="hpp-block">
        <span class="hpp-block-label">在途预测</span>
        <div v-if="!activePredictions.length" class="hpp-none">
          <p class="hpp-none-text">暂无在途工痕，所有印记均已痊愈</p>
        </div>
        <div v-else class="hpp-list">
          <div
            v-for="p in activePredictions"
            :key="p.mark.id"
            class="hpp-card"
            :class="{ selected: selectedId === p.mark.id }"
            @click="select(p.mark.id)"
          >
            <div class="hpp-card-head">
              <span class="hpp-card-part">{{ partLabel(p.mark.bodyPart) }}</span>
              <span class="hpp-card-type">{{ typeLabel(p.mark.scarType) }}</span>
              <span class="hpp-card-progress">{{ p.mark.healingProgress }}%</span>
            </div>
            <div class="hpp-card-meta">
              <div class="hpp-card-stat">
                <b>{{ p.prediction.remainingDays }}</b>
                <span>剩余天数</span>
              </div>
              <div class="hpp-card-stat">
                <b>{{ p.prediction.predictedDate.slice(5) }}</b>
                <span>预计痊愈</span>
              </div>
              <div class="hpp-card-stat">
                <b>{{ Math.round(p.prediction.confidence * 100) }}%</b>
                <span>置信度</span>
              </div>
            </div>
            <div class="hpp-card-foot">
              <span class="hpp-method">{{ methodLabel(p.prediction.method) }}</span>
              <span class="hpp-interval">区间 {{ p.prediction.confidenceInterval[0] }}–{{ p.prediction.confidenceInterval[1] }} 天</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 选中印记的因子贡献 -->
      <div v-if="selectedFactors.length" class="hpp-block">
        <span class="hpp-block-label">影响因子</span>
        <div class="hpp-factors">
          <div v-for="(f, i) in selectedFactors" :key="i" class="hpp-factor">
            <span class="hpp-factor-name">{{ f.factor }}</span>
            <span class="hpp-factor-dir" :class="`is-${f.direction}`">{{ dirLabel(f.direction) }}</span>
            <div class="hpp-factor-bar">
              <i :style="{ width: Math.min(f.weight * 50, 100) + '%' }"></i>
            </div>
            <span class="hpp-factor-desc">{{ f.description }}</span>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHealingPredictor } from '../modules/scar/healing-predict'
import type { BodyMark, GrowthRecord, BodyPart, ScarType } from '../modules/scar/types'

const props = defineProps<{ marks: BodyMark[]; growth: GrowthRecord[] }>()

const predictor = useHealingPredictor()
const selectedId = ref<string | null>(null)

const baselines = computed(() => predictor.computeBaseline(props.marks, props.growth))

const predictions = computed(() => {
  const map = predictor.predictAll(props.marks, props.growth)
  return props.marks.map(mark => ({ mark, prediction: map.get(mark.id)! }))
})

const activePredictions = computed(() =>
  predictions.value.filter(p => p.mark.healingProgress < 100),
)

const selectedFactors = computed(() => {
  if (!selectedId.value) return []
  const mark = props.marks.find(m => m.id === selectedId.value)
  if (!mark) return []
  const baselinesForMark = predictor.computeBaseline(props.marks, props.growth)
  return predictor.analyzeFactors(mark, props.growth, baselinesForMark)
})

function select(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}

function partLabel(p: BodyPart) {
  const map: Record<string, string> = {
    head: '头部', neck: '颈部', shoulder: '肩部', back: '背部', chest: '胸部',
    arm: '手臂', hand: '手部', waist: '腰部', leg: '腿部', foot: '足部', eye: '眼部',
  }
  return map[p] ?? p
}

function typeLabel(t: ScarType) {
  const map: Record<string, string> = { impact: '撞击', cut: '割裂', burn: '灼烧', wear: '磨损' }
  return map[t] ?? t
}

function methodLabel(m: string) {
  return m === 'weighted_regression' ? '加权回归' : m === 'historical_baseline' ? '历史校准' : '线性外推'
}

function dirLabel(d: string) {
  return d === 'accelerates' ? '加速' : d === 'slows' ? '减缓' : '中性'
}
</script>

<style scoped>
.hpp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.hpp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.hpp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.hpp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.hpp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.hpp-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e0b88a; white-space: nowrap; }

.hpp-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 0 20px; }
.hpp-empty-icon { font-size: 26px; opacity: 0.6; }
.hpp-empty-text { font-size: 12px; color: rgba(232, 221, 208, 0.45); }

.hpp-block { margin-bottom: 14px; }
.hpp-block-label { display: block; font-size: 11px; letter-spacing: 1px; color: rgba(232, 221, 208, 0.55); margin-bottom: 10px; }

.hpp-baselines { display: flex; flex-direction: column; gap: 6px; }
.hpp-baseline { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 9px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.hpp-baseline-type { width: 44px; font-size: 12px; color: rgba(232, 221, 208, 0.7); }
.hpp-baseline-sev { width: 44px; font-size: 10px; color: #e0a070; letter-spacing: 1px; }
.hpp-baseline-body { flex: 1; display: flex; align-items: baseline; gap: 8px; }
.hpp-baseline-body b { font-size: 14px; font-weight: 500; color: #ecd6b5; }
.hpp-baseline-body b i { font-style: normal; font-size: 10px; opacity: 0.5; }
.hpp-baseline-body span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.hpp-none { padding: 14px 0; }
.hpp-none-text { font-size: 12px; color: rgba(232, 221, 208, 0.45); }

.hpp-list { display: flex; flex-direction: column; gap: 8px; }
.hpp-card { padding: 12px 14px; border-radius: 11px; background: var(--bg-card, rgba(255,255,255,0.03)); border: 1px solid transparent; cursor: pointer; transition: border-color 0.3s, background 0.3s; }
.hpp-card:hover { border-color: rgba(var(--accent-rgb), 0.18); }
.hpp-card.selected { border-color: rgba(var(--accent-rgb), 0.35); background: rgba(var(--accent-rgb), 0.06); }
.hpp-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.hpp-card-part { font-size: 12px; color: #ecd6b5; }
.hpp-card-type { font-size: 10px; padding: 1px 8px; border-radius: 10px; background: rgba(var(--accent-rgb), 0.12); color: #e0b88a; }
.hpp-card-progress { margin-left: auto; font-size: 12px; color: #e0a070; }
.hpp-card-meta { display: flex; gap: 8px; margin-bottom: 8px; }
.hpp-card-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 4px; border-radius: 8px; background: rgba(255,255,255,0.03); }
.hpp-card-stat b { font-size: 14px; font-weight: 500; color: #ecd6b5; }
.hpp-card-stat span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }
.hpp-card-foot { display: flex; align-items: center; justify-content: space-between; }
.hpp-method { font-size: 10px; color: rgba(232, 221, 208, 0.5); }
.hpp-interval { font-size: 10px; color: rgba(232, 221, 208, 0.35); }

.hpp-factors { display: flex; flex-direction: column; gap: 7px; }
.hpp-factor { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hpp-factor-name { width: 110px; font-size: 11px; color: rgba(232, 221, 208, 0.7); }
.hpp-factor-dir { font-size: 10px; padding: 1px 8px; border-radius: 10px; }
.hpp-factor-dir.is-accelerates { background: rgba(138, 154, 122, 0.15); color: #8a9a7a; }
.hpp-factor-dir.is-slows { background: rgba(196, 106, 90, 0.15); color: #c46a5a; }
.hpp-factor-dir.is-neutral { background: rgba(232, 221, 208, 0.1); color: rgba(232, 221, 208, 0.5); }
.hpp-factor-bar { flex: 1; height: 5px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; min-width: 60px; }
.hpp-factor-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(168 55% 55%), hsl(34 60% 60%)); }
.hpp-factor-desc { width: 100%; font-size: 10px; color: rgba(232, 221, 208, 0.4); padding-left: 120px; }
</style>
