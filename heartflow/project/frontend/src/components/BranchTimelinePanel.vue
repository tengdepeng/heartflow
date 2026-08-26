<template>
  <section class="btl" aria-label="分支时间线">
    <div class="btl-head">
      <span class="btl-title">🕸️ 分支时间线</span>
      <span class="btl-sub">演化时间轴 · 分支对比 · 合并建议 · 演变图谱</span>
    </div>

    <!-- 统计总览 -->
    <div class="btl-stats">
      <div class="btl-stat"><b>{{ stats.branches }}</b><span>分支</span></div>
      <div class="btl-stat"><b>{{ stats.checkpoints }}</b><span>检查点</span></div>
      <div class="btl-stat"><b>{{ stats.suggestions }}</b><span>合并建议</span></div>
      <div class="btl-stat btl-stat--hot"><b>{{ stats.maxDepth }}</b><span>最大深度</span></div>
    </div>

    <!-- 时间线 -->
    <div class="btl-block">
      <span class="btl-block-label">演化时间轴</span>
      <div v-if="timelineNodes.length" class="btl-timeline">
        <div v-for="(nodes, branchId) in nodesByBranch" :key="branchId" class="btl-branch">
          <span class="btl-branch-name" :style="{ color: nodes[0].branchColor }">{{ nodes[0].branchName }}</span>
          <div class="btl-branch-track">
            <div
              v-for="n in nodes"
              :key="n.id"
              class="btl-node"
              :style="{ left: (n.dayOffset / maxDay * 100) + '%' }"
              :title="n.label + ' · ' + fmtDate(n.timestamp)"
            >
              <span class="btl-node-dot" :style="{ background: n.branchColor }"></span>
              <span class="btl-node-label">{{ n.label }}</span>
            </div>
          </div>
        </div>
        <div class="btl-timeline-scale">
          <span>第 0 天</span>
          <span>第 {{ maxDay }} 天</span>
        </div>
      </div>
      <div v-else class="btl-empty">还没有检查点。先在「时间分支」区为分支留下检查点，再回来查看演化时间轴。</div>
    </div>

    <!-- 分支对比 -->
    <div class="btl-block">
      <span class="btl-block-label">分支对比</span>
      <div class="btl-compare">
        <select v-model="compareAId" class="btl-select">
          <option value="" disabled>选择分支 A</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <span class="btl-compare-vs">VS</span>
        <select v-model="compareBId" class="btl-select">
          <option value="" disabled>选择分支 B</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <button
          class="btl-btn btl-btn--primary btl-compare-btn"
          :disabled="!compareAId || !compareBId || compareAId === compareBId"
          @click="runCompare"
        >⚖️ 对比</button>
      </div>
      <div v-if="comparison" class="btl-compare-result">
        <div class="btl-compare-head">
          <span class="btl-compare-names">{{ comparison.branchA.name }} ↔ {{ comparison.branchB.name }}</span>
          <span class="btl-compare-sim">相似度 {{ Math.round(comparison.similarity * 100) }}%</span>
        </div>
        <div class="btl-sim-bar"><i :style="{ width: (comparison.similarity * 100) + '%' }"></i></div>
        <div v-if="comparison.sharedTags.length" class="btl-shared">
          <span class="btl-shared-label">共享标签</span>
          <span v-for="t in comparison.sharedTags" :key="t" class="btl-shared-tag">{{ t }}</span>
        </div>
        <div class="btl-diff-list">
          <div v-for="d in comparison.diffs" :key="d.dimension" class="btl-diff">
            <span class="btl-diff-label">{{ d.label }}</span>
            <span class="btl-diff-val">{{ d.branchAValue }} → {{ d.branchBValue }}</span>
            <span class="btl-diff-percent">{{ d.diffPercent }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 合并建议 -->
    <div class="btl-block">
      <span class="btl-block-label">合并建议 · {{ suggestions.length }}</span>
      <div v-if="suggestions.length" class="btl-suggest-list">
        <div v-for="s in suggestions" :key="s.sourceBranchId + s.targetBranchId" class="btl-suggest">
          <span class="btl-suggest-icon">🔗</span>
          <div class="btl-suggest-body">
            <strong class="btl-suggest-names">{{ branchName(s.sourceBranchId) }} → {{ branchName(s.targetBranchId) }}</strong>
            <span class="btl-suggest-reason">{{ s.reason }}</span>
            <span v-if="s.conflicts.length" class="btl-suggest-conflicts">⚠ {{ s.conflicts.join(' · ') }}</span>
          </div>
          <span class="btl-suggest-priority">P{{ s.priority }}</span>
        </div>
      </div>
      <div v-else class="btl-empty">暂无可合并的分支对。分支共享标签达到 60% 以上时会给出合并建议。</div>
    </div>

    <!-- 演变图谱 -->
    <div v-if="evolutionGraph" class="btl-block">
      <span class="btl-block-label">演变图谱 · {{ evolutionGraph.totalBranches }} 个分支</span>
      <div class="btl-evo">
        <div v-for="level in levelRange" :key="level" class="btl-evo-level">
          <span class="btl-evo-level-label">L{{ level }}</span>
          <div class="btl-evo-nodes">
            <div v-for="n in nodesAtLevel(level)" :key="n.branchId" class="btl-evo-node" :style="{ borderColor: n.branchColor + '66' }">
              <span class="btl-evo-dot" :style="{ background: n.branchColor }"></span>
              <span class="btl-evo-name">{{ n.branchName }}</span>
              <span class="btl-evo-meta">{{ n.checkpointCount }} 检查点</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  useParallelWorld,
  useBranchTimeline,
  useBranchComparison,
  useMergeSuggestions,
  useEvolutionGraph,
} from '../modules/parallel-world'
import type { BranchComparison, MergeSuggestion } from '../modules/parallel-world'

const parallelWorld = useParallelWorld()
const timelineApi = useBranchTimeline()
const comparisonApi = useBranchComparison()
const mergeApi = useMergeSuggestions()
const evolutionApi = useEvolutionGraph()

const branches = parallelWorld.branches
const checkpoints = parallelWorld.checkpoints

const compareAId = ref('')
const compareBId = ref('')
const comparison = ref<BranchComparison | null>(null)
const suggestions = ref<MergeSuggestion[]>([])

const timelineNodes = timelineApi.timelineNodes
const nodesByBranch = timelineApi.nodesByBranch
const evolutionGraph = evolutionApi.evolutionGraph

const maxDay = computed(() => {
  const nodes = timelineNodes.value
  if (!nodes.length) return 0
  return Math.max(...nodes.map(n => n.dayOffset), 1)
})

const levelRange = computed(() => {
  const depth = evolutionGraph.value?.maxDepth ?? 0
  return Array.from({ length: depth + 1 }, (_, i) => i)
})

const stats = computed(() => ({
  branches: branches.value.length,
  checkpoints: checkpoints.value.length,
  suggestions: suggestions.value.length,
  maxDepth: evolutionGraph.value?.maxDepth ?? 0,
}))

onMounted(() => {
  parallelWorld.load()
  comparisonApi.getComparisonHistory()
})

watch(
  () => [branches.value.length, checkpoints.value.length],
  () => {
    if (branches.value.length === 0) return
    timelineApi.buildTimeline(branches.value, checkpoints.value)
    evolutionApi.buildEvolutionGraph(branches.value, checkpoints.value)
    suggestions.value = mergeApi.detectMergeOpportunities(branches.value, checkpoints.value)
    if (!compareAId.value && branches.value[0]) compareAId.value = branches.value[0].id
    if (!compareBId.value && branches.value[1]) compareBId.value = branches.value[1].id
  },
  { immediate: true },
)

function runCompare() {
  const a = branches.value.find(b => b.id === compareAId.value)
  const b = branches.value.find(b => b.id === compareBId.value)
  if (!a || !b) return
  comparison.value = comparisonApi.compareBranches(a, b, checkpoints.value)
  comparisonApi.saveComparisonHistory()
}

function nodesAtLevel(level: number) {
  return evolutionApi.getNodesByLevel(level)
}

function branchName(id: string) {
  return branches.value.find(b => b.id === id)?.name ?? '未知分支'
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.btl {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.btl-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.btl-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.btl-sub {
  font-size: 12px;
  opacity: 0.6;
}

.btl-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.btl-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.btl-stat b {
  font-size: 18px;
  font-weight: 600;
}

.btl-stat span {
  font-size: 11px;
  opacity: 0.6;
}

.btl-stat--hot b {
  color: #e0a96d;
}

.btl-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btl-block-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.75;
  letter-spacing: 0.04em;
}

.btl-empty {
  padding: 14px;
  text-align: center;
  font-size: 12px;
  opacity: 0.5;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.btl-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.btl-branch {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btl-branch-name {
  font-size: 11px;
  font-weight: 600;
  width: 64px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btl-branch-track {
  position: relative;
  flex: 1;
  height: 34px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
}

.btl-node {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  max-width: 90px;
}

.btl-node-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
}

.btl-node-label {
  font-size: 10px;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.btl-timeline-scale {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  opacity: 0.4;
}

.btl-compare {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btl-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  flex: 1;
  min-width: 120px;
}

.btl-select:focus {
  border-color: rgba(224, 169, 109, 0.4);
}

.btl-compare-vs {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.5;
  flex-shrink: 0;
}

.btl-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.btl-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btl-btn--primary {
  background: rgba(224, 169, 109, 0.18);
  border-color: rgba(224, 169, 109, 0.35);
}

.btl-compare-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.btl-compare-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.btl-compare-names {
  font-size: 13px;
  font-weight: 600;
}

.btl-compare-sim {
  font-size: 12px;
  font-weight: 600;
  color: #e0a96d;
}

.btl-sim-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.btl-sim-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #e0a96d);
  transition: width 0.3s;
}

.btl-shared {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.btl-shared-label {
  font-size: 11px;
  opacity: 0.55;
}

.btl-shared-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(138, 154, 122, 0.12);
  color: #8a9a7a;
}

.btl-diff-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.btl-diff {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 5px 8px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.02);
}

.btl-diff-label {
  flex: 1;
  opacity: 0.7;
}

.btl-diff-val {
  opacity: 0.9;
}

.btl-diff-percent {
  font-size: 11px;
  color: #e0a96d;
  flex-shrink: 0;
}

.btl-suggest-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btl-suggest {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.btl-suggest-icon {
  font-size: 15px;
  flex-shrink: 0;
  margin-top: 1px;
}

.btl-suggest-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.btl-suggest-names {
  font-size: 13px;
  font-weight: 600;
}

.btl-suggest-reason {
  font-size: 12px;
  line-height: 1.6;
  opacity: 0.7;
}

.btl-suggest-conflicts {
  font-size: 11px;
  color: #c46a5a;
}

.btl-suggest-priority {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(224, 169, 109, 0.12);
  color: #e0a96d;
  flex-shrink: 0;
}

.btl-evo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.btl-evo-level {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.btl-evo-level-label {
  font-size: 11px;
  font-weight: 600;
  color: #e0a96d;
  width: 24px;
  flex-shrink: 0;
  margin-top: 6px;
}

.btl-evo-nodes {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.btl-evo-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
}

.btl-evo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.btl-evo-name {
  font-weight: 600;
}

.btl-evo-meta {
  font-size: 10px;
  opacity: 0.5;
}
</style>
