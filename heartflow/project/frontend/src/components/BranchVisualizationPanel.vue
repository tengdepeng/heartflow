<template>
  <section class="bvp" aria-label="分支可视化">
    <div class="bvp-head">
      <span class="bvp-title">🗺️ 分支可视化</span>
      <span class="bvp-sub">分支树 · 布局切换 · 概率预测</span>
    </div>

    <!-- 统计总览 -->
    <div class="bvp-stats">
      <div class="bvp-stat"><b>{{ stats.branches }}</b><span>分支</span></div>
      <div class="bvp-stat"><b>{{ stats.maxDepth }}</b><span>最大深度</span></div>
      <div class="bvp-stat"><b>{{ stats.predictions }}</b><span>预测</span></div>
      <div class="bvp-stat bvp-stat--hot"><b class="bvp-stat-name">{{ activeBranchName }}</b><span>当前分支</span></div>
    </div>

    <!-- 分支可视化树 -->
    <div class="bvp-block">
      <span class="bvp-block-label">分支树</span>
      <div class="bvp-layout-row">
        <button
          v-for="l in LAYOUTS"
          :key="l.value"
          class="bvp-btn bvp-btn--sm"
          :class="{ active: layout === l.value }"
          @click="setLayout(l.value)"
        >{{ l.label }}</button>
      </div>
      <div v-if="tree && tree.nodes.length" class="bvp-canvas">
        <svg :viewBox="viewBox" class="bvp-svg">
          <line
            v-for="e in renderedEdges"
            :key="e.id"
            :x1="e.sourceX" :y1="e.sourceY" :x2="e.targetX" :y2="e.targetY"
            :stroke="e.color" stroke-width="1.5"
            :stroke-dasharray="e.style === 'dashed' ? '4 3' : undefined"
          />
          <g
            v-for="n in tree.nodes"
            :key="n.id"
            :transform="`translate(${n.x}, ${n.y})`"
            class="bvp-node"
            @click="selectBranch(n.branchId)"
          >
            <rect
              :width="n.width" :height="n.height" rx="8"
              :fill="n.color + '22'"
              :stroke="n.isActive ? n.color : n.color + '88'"
              :stroke-width="n.isActive ? 2 : 1"
            />
            <text x="60" y="24" text-anchor="middle" class="bvp-node-label">{{ n.label }}</text>
            <text x="60" y="42" text-anchor="middle" class="bvp-node-meta">{{ Math.round(n.metadata.probability * 100) }}%</text>
          </g>
        </svg>
      </div>
      <div v-else class="bvp-empty">还没有分支。先在「时间分支」区创建分支。</div>
    </div>

    <!-- 概率预测 -->
    <div class="bvp-block">
      <span class="bvp-block-label">概率预测</span>
      <div class="bvp-predict">
        <select v-model="predictBranchId" class="bvp-select">
          <option value="" disabled>选择分支</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <button class="bvp-btn bvp-btn--primary bvp-predict-btn" :disabled="!predictBranchId" @click="runPredict">🔮 预测</button>
      </div>
      <div v-if="prediction" class="bvp-prediction">
        <div class="bvp-prediction-head">
          <strong class="bvp-prediction-name">{{ prediction.label }}</strong>
          <span class="bvp-prediction-conf">置信度 {{ Math.round(prediction.confidence * 100) }}%</span>
        </div>
        <div class="bvp-prob-grid">
          <div class="bvp-prob">
            <span class="bvp-prob-label">维持</span>
            <div class="bvp-prob-bar"><i :style="{ width: (prediction.continuationProb * 100) + '%' }"></i></div>
            <span class="bvp-prob-num">{{ Math.round(prediction.continuationProb * 100) }}%</span>
          </div>
          <div class="bvp-prob">
            <span class="bvp-prob-label">分叉</span>
            <div class="bvp-prob-bar"><i :style="{ width: (prediction.divergenceProb * 100) + '%' }"></i></div>
            <span class="bvp-prob-num">{{ Math.round(prediction.divergenceProb * 100) }}%</span>
          </div>
          <div class="bvp-prob">
            <span class="bvp-prob-label">合并</span>
            <div class="bvp-prob-bar"><i :style="{ width: (prediction.mergeProb * 100) + '%' }"></i></div>
            <span class="bvp-prob-num">{{ Math.round(prediction.mergeProb * 100) }}%</span>
          </div>
          <div class="bvp-prob">
            <span class="bvp-prob-label">终止</span>
            <div class="bvp-prob-bar"><i :style="{ width: (prediction.terminationProb * 100) + '%' }"></i></div>
            <span class="bvp-prob-num">{{ Math.round(prediction.terminationProb * 100) }}%</span>
          </div>
        </div>
        <div v-if="prediction.predictedStates.length" class="bvp-states">
          <div v-for="s in prediction.predictedStates" :key="s.stateId" class="bvp-state" :class="'bvp-impact--' + s.impact">
            <span class="bvp-state-label">{{ s.label }}</span>
            <span class="bvp-state-prob">{{ Math.round(s.probability * 100) }}%</span>
            <span class="bvp-state-desc">{{ s.description }}</span>
          </div>
        </div>
        <div v-if="prediction.factors.length" class="bvp-factors">
          <div v-for="f in prediction.factors" :key="f.factor" class="bvp-factor">
            <span class="bvp-factor-name">{{ f.factor }}</span>
            <span class="bvp-factor-desc">{{ f.description }}</span>
            <span class="bvp-factor-dir" :class="'bvp-dir--' + f.direction">{{ f.direction === 'positive' ? '正向' : '负向' }}</span>
          </div>
        </div>
      </div>
      <div v-else class="bvp-empty">选择分支并预测其未来走向。</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  useParallelWorld,
  useBranchVisualization,
  useBranchProbability,
} from '../modules/parallel-world'
import type { BranchVisualTree, BranchVisualEdge, BranchProbability } from '../modules/parallel-world'

const parallelWorld = useParallelWorld()
const branches = parallelWorld.branches

const vizApi = useBranchVisualization()
const probApi = useBranchProbability()

const LAYOUTS: { value: BranchVisualTree['layout']; label: string }[] = [
  { value: 'tree', label: '树状' },
  { value: 'radial', label: '径向' },
  { value: 'timeline', label: '时间线' },
  { value: 'force', label: '力导向' },
]

type RenderedEdge = BranchVisualEdge & {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

const layout = ref<BranchVisualTree['layout']>('tree')
const tree = ref<BranchVisualTree | null>(null)
const predictBranchId = ref('')
const prediction = ref<BranchProbability | null>(null)

const activeBranchName = computed(() => parallelWorld.activeBranch.value?.name ?? '主干')

const stats = computed(() => ({
  branches: branches.value.length,
  maxDepth: tree.value?.metadata.maxDepth ?? 0,
  predictions: probApi.probabilities.value.length,
}))

const renderedEdges = computed<RenderedEdge[]>(() => {
  if (!tree.value) return []
  const nodeMap = new Map(tree.value.nodes.map(n => [n.id, n]))
  return tree.value.edges.map(e => {
    const src = nodeMap.get(e.source)
    const tgt = nodeMap.get(e.target)
    return {
      ...e,
      sourceX: src ? src.x + src.width / 2 : 0,
      sourceY: src ? src.y + src.height / 2 : 0,
      targetX: tgt ? tgt.x + tgt.width / 2 : 0,
      targetY: tgt ? tgt.y + tgt.height / 2 : 0,
    }
  })
})

const viewBox = computed(() => {
  if (!tree.value || !tree.value.nodes.length) return '0 0 600 400'
  const xs = tree.value.nodes.map(n => n.x)
  const ys = tree.value.nodes.map(n => n.y)
  const minX = Math.min(...xs) - 80
  const maxX = Math.max(...xs) + 200
  const minY = Math.min(...ys) - 40
  const maxY = Math.max(...ys) + 80
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
})

onMounted(() => {
  parallelWorld.load()
})

watch(
  () => [branches.value.length, layout.value],
  () => {
    if (branches.value.length === 0) return
    tree.value = vizApi.buildVisualTree(branches.value, parallelWorld.activeBranchId.value, layout.value)
  },
  { immediate: true },
)

function setLayout(l: BranchVisualTree['layout']) {
  layout.value = l
}

function selectBranch(branchId: string) {
  predictBranchId.value = branchId
  runPredict()
}

function runPredict() {
  const branch = branches.value.find(b => b.id === predictBranchId.value)
  if (!branch) return
  prediction.value = probApi.predictBranch(branch, branches.value)
}
</script>

<style scoped>
.bvp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.bvp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.bvp-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.bvp-sub {
  font-size: 12px;
  opacity: 0.6;
}

.bvp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.bvp-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  min-width: 0;
}

.bvp-stat b {
  font-size: 18px;
  font-weight: 600;
}

.bvp-stat span {
  font-size: 11px;
  opacity: 0.6;
}

.bvp-stat--hot b {
  color: #e0a96d;
}

.bvp-stat-name {
  font-size: 13px !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bvp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bvp-block-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.75;
  letter-spacing: 0.04em;
}

.bvp-layout-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bvp-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.bvp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.bvp-btn--primary {
  background: rgba(224, 169, 109, 0.18);
  border-color: rgba(224, 169, 109, 0.35);
}

.bvp-btn--sm {
  padding: 5px 10px;
  font-size: 12px;
}

.bvp-btn.active {
  background: rgba(224, 169, 109, 0.25);
  border-color: rgba(224, 169, 109, 0.5);
}

.bvp-canvas {
  overflow: hidden;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.bvp-svg {
  width: 100%;
  height: auto;
  min-height: 180px;
  display: block;
}

.bvp-node {
  cursor: pointer;
}

.bvp-node-label {
  font-size: 11px;
  fill: rgba(255, 255, 255, 0.9);
  font-family: inherit;
}

.bvp-node-meta {
  font-size: 10px;
  fill: rgba(224, 169, 109, 0.9);
  font-family: inherit;
}

.bvp-predict {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bvp-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  flex: 1;
  min-width: 140px;
}

.bvp-prediction {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.bvp-prediction-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.bvp-prediction-name {
  font-size: 13px;
  font-weight: 600;
}

.bvp-prediction-conf {
  font-size: 11px;
  color: #e0a96d;
}

.bvp-prob-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.bvp-prob {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bvp-prob-label {
  font-size: 11px;
  opacity: 0.7;
  flex-shrink: 0;
  width: 28px;
}

.bvp-prob-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.bvp-prob-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: #e0a96d;
}

.bvp-prob-num {
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  width: 34px;
  text-align: right;
}

.bvp-states {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bvp-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.bvp-impact--positive {
  border-color: rgba(138, 154, 122, 0.3);
}

.bvp-impact--negative {
  border-color: rgba(196, 106, 90, 0.3);
}

.bvp-state-label {
  font-size: 12px;
  font-weight: 600;
}

.bvp-state-prob {
  font-size: 11px;
  color: #e0a96d;
  flex-shrink: 0;
}

.bvp-state-desc {
  font-size: 11px;
  opacity: 0.6;
  margin-left: auto;
  text-align: right;
}

.bvp-factors {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.bvp-factor {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.bvp-factor-name {
  font-weight: 600;
  flex-shrink: 0;
  width: 64px;
}

.bvp-factor-desc {
  opacity: 0.6;
  flex: 1;
}

.bvp-factor-dir {
  flex-shrink: 0;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
}

.bvp-dir--positive {
  color: #8a9a7a;
  background: rgba(138, 154, 122, 0.12);
}

.bvp-dir--negative {
  color: #c46a5a;
  background: rgba(196, 106, 90, 0.12);
}

.bvp-empty {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  font-size: 12px;
  opacity: 0.6;
}
</style>
