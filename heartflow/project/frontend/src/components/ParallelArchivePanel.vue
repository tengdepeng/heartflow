<template>
  <section class="pap">
    <div class="pap-head">
      <div class="pap-title-wrap">
        <span class="pap-title">🌿 平行档案</span>
        <span class="pap-sub">概览 · 健康 · 节奏 · 洞察</span>
      </div>
      <span v-if="hasData" class="pap-tag">{{ health.label }}</span>
    </div>

    <template v-if="hasData">
      <!-- 健康评分三格 -->
      <div class="pap-health" v-if="hasActive">
        <div class="pap-health-main">
          <span class="pap-health-num" :style="{ color: scoreColor }">{{ health.score }}</span>
          <span class="pap-health-label">潜力沉淀</span>
        </div>
        <div class="pap-health-dims">
          <div class="pap-dim">
            <span class="pap-dim-label">广度</span>
            <span class="pap-dim-bar"><i :style="{ width: health.breadth + '%', background: breadthColor }"></i></span>
            <span class="pap-dim-num"><b :style="{ color: breadthColor }">{{ health.breadth }}</b></span>
          </div>
          <div class="pap-dim">
            <span class="pap-dim-label">深度</span>
            <span class="pap-dim-bar"><i :style="{ width: health.depth + '%', background: depthColor }"></i></span>
            <span class="pap-dim-num"><b :style="{ color: depthColor }">{{ health.depth }}</b></span>
          </div>
          <div class="pap-dim">
            <span class="pap-dim-label">延续</span>
            <span class="pap-dim-bar"><i :style="{ width: health.continuity + '%', background: continuityColor }"></i></span>
            <span class="pap-dim-num"><b :style="{ color: continuityColor }">{{ health.continuity }}</b></span>
          </div>
        </div>
      </div>

      <!-- 概览六格 -->
      <div class="pap-overview">
        <div class="pap-cell"><b>{{ ov.forks + ov.alts }}</b><span>未走的路</span></div>
        <div class="pap-cell"><b>{{ ov.capsules }}</b><span>时间胶囊</span></div>
        <div class="pap-cell"><b>{{ branchDepthCount }}</b><span>时间枝桠</span></div>
        <div class="pap-cell"><b>{{ rhythm.forks30 }}</b><span>近月抉择</span></div>
      </div>

      <!-- 分支深度 -->
      <p class="pap-depth">{{ depthLabel }}</p>

      <!-- 平行自我来源分布 -->
      <div v-if="altRows.length" class="pap-block">
        <span class="pap-block-title">平行自我来源</span>
        <ul class="pap-dist">
          <li v-for="r in altRows" :key="r.key">
            <span class="pap-dist-name" :style="{ color: r.color }">{{ r.label }}</span>
            <span class="pap-dist-track"><i :style="{ width: r.pct + '%', background: r.color }"></i></span>
            <span class="pap-dist-num">{{ r.count }}<small> · {{ r.pct }}%</small></span>
          </li>
        </ul>
      </div>

      <!-- 时间胶囊状态 -->
      <div v-if="capsuleRows.length" class="pap-block">
        <span class="pap-block-title">时间胶囊状态</span>
        <ul class="pap-dist">
          <li v-for="r in capsuleRows" :key="r.key">
            <span class="pap-dist-name" :style="{ color: r.color }">{{ r.label }}</span>
            <span class="pap-dist-track"><i :style="{ width: r.pct + '%', background: r.color }"></i></span>
            <span class="pap-dist-num">{{ r.count }}<small> · {{ r.pct }}%</small></span>
          </li>
        </ul>
      </div>

      <!-- 抉择节奏 -->
      <div v-if="ov.forks + ov.capsules" class="pap-block">
        <span class="pap-block-title">抉择节奏</span>
        <ul class="pap-rhythm">
          <li v-if="rhythm.forks7">近 7 天种下 <b>{{ rhythm.forks7 }}</b> 棵分叉树</li>
          <li v-if="rhythm.calmDays !== null">已 <b>{{ rhythm.calmDays }}</b> 天未遇新的岔路口</li>
          <li v-if="rhythm.avgCapsuleWait > 0">封存的时间约定平均等待 <b>{{ rhythm.avgCapsuleWait }}</b> 天</li>
        </ul>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="pap-insights">
        <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
      </ul>
    </template>

    <div v-else class="pap-empty">
      <p>平行世界还是空的。在第一个岔路口种下一棵分叉树，让另一个你在远处开花。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useParallelSelves, useTimeCapsule, useParallelWorld } from '../modules/parallel-world'
import {
  parallelOverview,
  altSelfSourceRows,
  capsuleStatusRows,
  parallelRhythm,
  branchDepthLabel,
  parallelWorldHealth,
  parallelInsights,
} from '../modules/parallel-world'
import type {
  ParallelOverview,
  ParallelRow,
  ParallelRhythm,
  ParallelArchiveHealth,
} from '../modules/parallel-world'

const selves = useParallelSelves()
const capsulesComposable = useTimeCapsule()
const world = useParallelWorld()

// 引擎方法接受纯数据；这里取当前快照计算，存本地 ref，避免响应式递归
const ov = ref<ParallelOverview>({ forks: 0, forks30: 0, alts: 0, altsFromFork: 0, altsFree: 0, capsules: 0, openedCapsules: 0, pendingCapsules: 0, branches: 0, checkpoints: 0, latestForkDate: null })
const altRows = ref<ParallelRow[]>([])
const capsuleRows = ref<ParallelRow[]>([])
const rhythm = ref<ParallelRhythm>({ forks7: 0, forks30: 0, calmDays: null, capsules30: 0, avgCapsuleWait: 0 })
const health = ref<ParallelArchiveHealth>({ score: 0, breadth: 0, depth: 0, continuity: 0, label: '世界初分' })
const depthLabel = ref('')
const insights = ref<string[]>([])

function recompute(): void {
  const forks = selves.forks.value
  const alts = selves.alts.value
  const caps = capsulesComposable.capsules.value
  const branches = world.branches.value
  ov.value = parallelOverview(forks, alts, caps, branches)
  altRows.value = altSelfSourceRows(alts)
  capsuleRows.value = capsuleStatusRows(caps)
  rhythm.value = parallelRhythm(forks, caps)
  health.value = parallelWorldHealth(forks, alts, caps, branches)
  depthLabel.value = branchDepthLabel(branches)
  insights.value = parallelInsights(forks, alts, caps, branches)
}
onMounted(async () => {
  try {
    await Promise.all([selves.load(), capsulesComposable.load(), world.load()])
    recompute()
  } catch (e) {
    console.error('[ParallelArchivePanel] 初始化失败', e)
  }
})
watch([() => selves.forks.value, () => selves.alts.value, () => capsulesComposable.capsules.value, () => world.branches.value], recompute, { deep: true })

const hasData = computed(() => (ov.value.forks + ov.value.alts + ov.value.capsules) > 0)
const hasActive = computed(() => (health.value.score > 0) || (ov.value.forks + ov.value.alts + ov.value.capsules) > 0)
const branchDepthCount = computed(() => ov.value.branches)
const scoreColor = computed(() => health.value.score >= 70 ? '#8a9a7a' : health.value.score >= 45 ? '#f0c040' : '#c46a5a')
const breadthColor = computed(() => '#6b9fc4')
const depthColor = computed(() => '#f0c040')
const continuityColor = computed(() => '#8a9a7a')
</script>

<style scoped>
.pap {
  margin: 8px auto 0;
  max-width: 640px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(15, 13, 20, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.pap-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.pap-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.pap-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #e8ddc8); }
.pap-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.pap-tag { flex-shrink: 0; padding: 3px 10px; border-radius: 12px; font-size: 11px; color: #8a9a7a; border: 1px solid rgba(138, 154, 122, 0.4); }

.pap-health { display: flex; gap: 14px; align-items: center; margin-bottom: 12px; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); }
.pap-health-main { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; }
.pap-health-num { font-size: 26px; font-weight: 500; line-height: 1; }
.pap-health-label { font-size: 10px; color: rgba(232, 221, 200, 0.4); }
.pap-health-dims { flex: 1; display: flex; flex-direction: column; gap: 7px; }
.pap-dim { display: flex; align-items: center; gap: 8px; }
.pap-dim-label { font-size: 11px; color: rgba(232, 221, 200, 0.6); width: 30px; }
.pap-dim-bar { flex: 1; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
.pap-dim-bar i { display: block; height: 100%; border-radius: 3px; }
.pap-dim-num { font-size: 11px; width: 26px; text-align: right; }

.pap-overview { display: flex; gap: 8px; margin-bottom: 10px; }
.pap-cell { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); }
.pap-cell b { font-size: 15px; font-weight: 500; color: #f0c040; }
.pap-cell span { font-size: 10px; color: rgba(232, 221, 200, 0.4); }

.pap-depth { margin: 0 0 12px; font-size: 12px; color: rgba(232, 221, 200, 0.65); }

.pap-block { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.pap-block-title { font-size: 11px; color: rgba(232, 221, 200, 0.5); }
.pap-dist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.pap-dist li { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(232, 221, 200, 0.7); }
.pap-dist-name { width: 68px; }
.pap-dist-track { flex: 1; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
.pap-dist-track i { display: block; height: 100%; border-radius: 3px; }
.pap-dist-num { width: 60px; text-align: right; color: rgba(232, 221, 200, 0.5); }
.pap-dist-num small { opacity: 0.7; }

.pap-rhythm { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.pap-rhythm li { font-size: 12px; color: rgba(232, 221, 200, 0.6); }
.pap-rhythm b { color: #f0c040; font-weight: 500; }

.pap-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 8px; }
.pap-insights li { font-size: 12px; line-height: 1.65; color: rgba(232, 221, 200, 0.6); }
.pap-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }

.pap-empty { margin: 0; font-size: 12px; line-height: 1.7; color: rgba(232, 221, 200, 0.45); text-align: center; padding: 10px 0; }
.pap-empty p { margin: 0; }
</style>