<template>
  <section class="pwb" data-test="parallel-world-bridge-panel" aria-label="平行世界·桥接总览">
    <header class="pwb-head">
      <span class="pwb-title">🌌 平行世界 · 桥接总览</span>
      <span class="pwb-badge" data-test="pwb-count-badge">{{ summary.totalBranches }} 个时间分支</span>
    </header>

    <!-- 世界摘要 -->
    <div class="pwb-card" data-test="pwb-summary">
      <span class="pwb-card-t">📊 世界摘要</span>
      <div class="pwb-stat-row">
        <div class="pwb-stat"><b data-test="pwb-branches">{{ summary.totalBranches }}</b><span>分支</span></div>
        <div class="pwb-stat"><b data-test="pwb-checkpoints">{{ summary.totalCheckpoints }}</b><span>检查点</span></div>
        <div class="pwb-stat"><b>{{ summary.totalSnapshots }}</b><span>快照</span></div>
        <div class="pwb-stat"><b>{{ summary.branchingDepth }}</b><span>最大深度</span></div>
        <div class="pwb-stat"><b>{{ summary.mergeOpportunities }}</b><span>可合并</span></div>
      </div>
      <div class="pwb-summary-line">
        <span class="pwb-summary-chip active">🌱 活跃 · {{ summary.activeBranchName }}</span>
        <span v-if="summary.trunkBranchName" class="pwb-summary-chip trunk">🌳 主干 · {{ summary.trunkBranchName }}</span>
        <span v-else class="pwb-summary-chip">🌳 主干未建</span>
      </div>
    </div>

    <!-- 分支全景 -->
    <div v-if="branchDetails.length" class="pwb-card" data-test="pwb-branch-panorama">
      <span class="pwb-card-t">🌿 分支全景</span>
      <div class="pwb-branch-list">
        <div
          v-for="d in branchDetails"
          :key="d.branch.id"
          class="pwb-branch"
          :class="{ active: d.branch.isActive }"
          :data-test="`pwb-branch-${d.branch.id}`"
        >
          <span class="pwb-branch-dot" :style="{ background: d.branch.color }"></span>
          <div class="pwb-branch-body">
            <strong class="pwb-branch-name">{{ d.branch.name }}</strong>
            <span class="pwb-branch-meta">
              {{ d.children.length }} 子分支 · {{ d.checkpoints.length }} 检查点 · 深度 {{ d.depth }}
              <span v-if="d.canMerge" class="pwb-branch-merge">可合并</span>
            </span>
          </div>
          <span v-if="d.branch.isActive" class="pwb-branch-active">当前</span>
        </div>
      </div>
    </div>
    <div v-else class="pwb-card" data-test="pwb-branch-panorama">
      <span class="pwb-card-t">🌿 分支全景</span>
      <p class="pwb-empty">还没有时间分支。去「分支管理」种下第一棵分支树。</p>
    </div>

    <!-- 合并机会 -->
    <div v-if="summary.mergeOpportunities > 0" class="pwb-card" data-test="pwb-merges">
      <span class="pwb-card-t">🔀 合并机会</span>
      <div v-for="(s, i) in suggestions.slice(0, 5)" :key="i" class="pwb-suggest-row" :data-test="`pwb-merge-${i}`">
        <span class="pwb-suggest-tag">{{ priTag(s.priority) }}</span>
        <span class="pwb-suggest-text">{{ suggestText(s) }}</span>
      </div>
    </div>

    <!-- 时间线 -->
    <div v-if="timelineNodes.length" class="pwb-card" data-test="pwb-timeline">
      <span class="pwb-card-t">🕸 分支时间线 · {{ timelineNodes.length }} 节点</span>
      <div class="pwb-timeline-list">
        <div v-for="n in timelineNodes.slice(0, 6)" :key="n.id" class="pwb-tl-row">
          <span class="pwb-tl-label">{{ n.label }}</span>
          <span class="pwb-tl-meta">{{ n.branchName }}</span>
        </div>
      </div>
    </div>

    <!-- 世界对照 -->
    <div v-if="comparisons.length" class="pwb-card" data-test="pwb-comparisons">
      <span class="pwb-card-t">⚖️ 世界对照 · {{ comparisons.length }}</span>
      <p class="pwb-hint">已记录 {{ comparisons.length }} 组分支对照。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useParallelWorldBridge } from '../modules/parallel-world/parallel-world-bridge'
import type { MergeSuggestion } from '../modules/parallel-world/branch-timeline'

const bridge = useParallelWorldBridge()

const summary = computed(() => bridge.summary.value)
const branchDetails = computed(() => bridge.branchDetails.value)
const suggestions = computed(() => bridge.suggestions.value)
const timelineNodes = computed(() => bridge.timelineNodes.value)
const comparisons = computed(() => bridge.comparisons.value)

onMounted(() => {
  void bridge.initialize()
})

function priTag(p: number): string {
  return p >= 8 ? '优先' : p >= 5 ? '建议' : '留意'
}

function suggestText(s: MergeSuggestion): string {
  return `${s.reason}（优先级 ${s.priority}）`
}
</script>

<style scoped>
.pwb {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 18px;
}
.pwb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pwb-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-strong, #e8e6e1);
}
.pwb-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--text-soft, #c9c5bc);
}
.pwb-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.pwb-card-t {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.75;
}
.pwb-stat-row {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}
.pwb-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.pwb-stat b {
  font-size: 17px;
}
.pwb-stat span {
  font-size: 11px;
  opacity: 0.65;
}
.pwb-summary-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pwb-summary-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.pwb-summary-chip.active {
  border-color: rgba(138, 154, 122, 0.5);
  color: #a8b898;
}
.pwb-summary-chip.trunk {
  border-color: rgba(196, 106, 90, 0.45);
  color: #d08a7a;
}
.pwb-branch-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pwb-branch {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.pwb-branch.active {
  border-color: rgba(138, 154, 122, 0.45);
}
.pwb-branch-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}
.pwb-branch-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pwb-branch-name {
  font-size: 13px;
}
.pwb-branch-meta {
  font-size: 11px;
  opacity: 0.65;
}
.pwb-branch-merge {
  margin-left: 6px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(240, 192, 64, 0.15);
  color: #d8b458;
}
.pwb-branch-active {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.18);
  color: #a8b898;
}
.pwb-empty,
.pwb-hint {
  font-size: 12px;
  opacity: 0.7;
  margin: 0;
}
.pwb-suggest-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.pwb-suggest-tag {
  flex-shrink: 0;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(240, 192, 64, 0.12);
  color: #d8b458;
}
.pwb-suggest-text {
  opacity: 0.85;
}
.pwb-timeline-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pwb-tl-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}
.pwb-tl-label {
  opacity: 0.9;
}
.pwb-tl-meta {
  opacity: 0.6;
}
</style>
