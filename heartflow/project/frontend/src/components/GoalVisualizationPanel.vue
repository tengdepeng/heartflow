<template>
  <section class="gv-panel" aria-label="目标可视化">
    <div class="gv-panel-head">
      <span class="gv-panel-title">🌳 目标可视化</span>
      <span class="gv-panel-sub">生长树 · 领域 · 历史 · 里程碑</span>
    </div>

    <!-- 标签切换 -->
    <div class="gv-tabs">
      <button
        v-for="t in TABS"
        :key="t.value"
        class="gv-tab"
        :class="{ 'gv-tab--active': tab === t.value }"
        @click="tab = t.value"
      >{{ t.label }}</button>
    </div>

    <!-- 目标树 -->
    <div v-if="tab === 'tree'" class="gv-block">
      <span class="gv-block-label">目标树 · 总进度 {{ tree?.overallProgress ?? 0 }}%</span>
      <div v-if="tree && tree.roots.length" class="gv-tree">
        <div v-for="node in tree.roots" :key="node.goal.id" class="gv-node">
          <div class="gv-node-head">
            <span class="gv-node-icon">{{ statusIcon(node.goal.status) }}</span>
            <span class="gv-node-title">{{ node.goal.title }}</span>
            <span class="gv-node-status">{{ statusLabel(node.goal.status) }}</span>
            <span class="gv-node-progress">{{ node.progress }}%</span>
          </div>
          <div class="gv-node-track">
            <div class="gv-node-fill" :style="{ width: node.progress + '%' }"></div>
          </div>
          <div v-if="node.children.length" class="gv-children">
            <div v-for="child in node.children" :key="child.goal.id" class="gv-node gv-node--child">
              <div class="gv-node-head">
                <span class="gv-node-icon">{{ statusIcon(child.goal.status) }}</span>
                <span class="gv-node-title">{{ child.goal.title }}</span>
                <span class="gv-node-status">{{ statusLabel(child.goal.status) }}</span>
                <span class="gv-node-progress">{{ child.progress }}%</span>
              </div>
              <div class="gv-node-track">
                <div class="gv-node-fill" :style="{ width: child.progress + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="gv-hint">暂无目标，先种下一颗目标种子吧。</p>
    </div>

    <!-- 领域进度 -->
    <div v-if="tab === 'domain'" class="gv-block">
      <span class="gv-block-label">领域进度</span>
      <div v-if="domainProgress.length">
        <div v-for="d in domainProgress" :key="d.domain" class="gv-bar-row">
          <span class="gv-bar-label">{{ domainLabel(d.domain) }}</span>
          <div class="gv-bar-track">
            <div class="gv-bar-fill" :style="{ width: d.progress + '%', background: d.color }"></div>
          </div>
          <span class="gv-bar-num">{{ d.completed }}/{{ d.total }}</span>
        </div>
      </div>
      <p v-else class="gv-hint">暂无领域数据。</p>
    </div>

    <!-- 层级统计 -->
    <div v-if="tab === 'tier'" class="gv-block">
      <span class="gv-block-label">层级统计</span>
      <div class="gv-tier-grid">
        <div v-for="t in tierRows" :key="t.key" class="gv-tier-card">
          <span class="gv-tier-name">{{ t.label }}</span>
          <span class="gv-tier-num">{{ t.completed }} / {{ t.total }}</span>
          <span class="gv-tier-pct">{{ t.progress }}%</span>
        </div>
      </div>
    </div>

    <!-- 进度历史 -->
    <div v-if="tab === 'history'" class="gv-block">
      <div class="gv-history-head">
        <span class="gv-block-label">进度历史 · 趋势：{{ historyTrend }}</span>
        <button class="gv-btn gv-btn-primary" @click="takeSnapshot">拍摄快照</button>
      </div>
      <div v-if="trend.dates.length" class="gv-trend">
        <div v-for="(date, i) in trend.dates" :key="date" class="gv-trend-col">
          <div class="gv-trend-bar" :style="{ height: trendHeight(trend.values[i]) + '%' }"></div>
          <span class="gv-trend-label">{{ date.slice(5) }}</span>
        </div>
      </div>
      <p v-else class="gv-hint">暂无进度快照，点击「拍摄快照」记录当前进度。</p>
    </div>

    <!-- 里程碑 -->
    <div v-if="tab === 'milestone'" class="gv-block">
      <div class="gv-history-head">
        <span class="gv-block-label">里程碑</span>
        <button class="gv-btn gv-btn-primary" @click="autoGenerateAll">自动生成</button>
      </div>
      <div v-if="achievedMilestones.length" class="gv-ms-group">
        <span class="gv-ms-group-label">已达成（{{ achievedMilestones.length }}）</span>
        <div v-for="m in achievedMilestones" :key="m.id" class="gv-ms-row">
          <span class="gv-ms-icon">✅</span>
          <span class="gv-ms-title">{{ m.title }}</span>
          <span class="gv-ms-goal">{{ m.goalTitle }}</span>
        </div>
      </div>
      <div v-if="upcomingMilestones.length" class="gv-ms-group">
        <span class="gv-ms-group-label">即将达成（{{ upcomingMilestones.length }}）</span>
        <div v-for="m in upcomingMilestones" :key="m.id" class="gv-ms-row">
          <span class="gv-ms-icon">⏳</span>
          <span class="gv-ms-title">{{ m.title }}</span>
          <span class="gv-ms-goal">{{ m.goalTitle }}</span>
          <span class="gv-ms-progress">{{ m.currentProgress }}%</span>
        </div>
      </div>
      <p v-if="!achievedMilestones.length && !upcomingMilestones.length" class="gv-hint">暂无里程碑，点击「自动生成」为所有目标生成里程碑。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGoalVisualization, useProgressHistory, useGoalMilestones } from '../modules/goal/goal-visualization'
import { DOMAIN_LABELS } from '../modules/goal'
import type { Goal, GoalStatus } from '../modules/goal'

const props = defineProps<{ goals: Goal[] }>()

const TABS = [
  { value: 'tree', label: '目标树' },
  { value: 'domain', label: '领域' },
  { value: 'tier', label: '层级' },
  { value: 'history', label: '历史' },
  { value: 'milestone', label: '里程碑' },
] as const

const tab = ref<string>('tree')

const viz = useGoalVisualization(() => props.goals)
const historyApi = useProgressHistory(() => props.goals)
const milestonesApi = useGoalMilestones(() => props.goals)

const tree = computed(() => props.goals.length ? viz.buildGoalTree() : null)
const domainProgress = computed(() => props.goals.length ? viz.getDomainProgress() : [])
const tierStats = computed(() => props.goals.length ? viz.getTierStats() : null)
const trend = computed(() => historyApi.getProgressTrend())
const achievedMilestones = computed(() => milestonesApi.achievedMilestones.value)
const upcomingMilestones = computed(() => milestonesApi.upcomingMilestones.value)

const historyTrend = computed(() => historyApi.history.value.trend)

const tierRows = computed(() => {
  const s = tierStats.value
  if (!s) return []
  return [
    { key: 'vision', label: '愿景', ...s.vision },
    { key: 'target', label: '目标', ...s.target },
    { key: 'plan', label: '计划', ...s.plan },
  ]
})

const maxTrend = computed(() => {
  const vals = trend.value.values
  return vals.length ? Math.max(...vals, 1) : 1
})

function trendHeight(v: number): number {
  return Math.max(6, Math.round((v / maxTrend.value) * 100))
}

function takeSnapshot() {
  historyApi.takeSnapshot()
}

function autoGenerateAll() {
  for (const g of props.goals) {
    milestonesApi.autoGenerateMilestones(g.id)
  }
}

function statusIcon(s: GoalStatus): string {
  return { seed: '🌰', sprout: '🌱', growing: '🌿', bloom: '🌸', dormant: '🍂' }[s]
}

function statusLabel(s: GoalStatus): string {
  return { seed: '种子', sprout: '发芽', growing: '生长中', bloom: '已开花', dormant: '休眠中' }[s]
}

function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS] || domain
}
</script>

<style scoped>
.gv-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.gv-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.gv-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.gv-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.gv-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.gv-tab {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.25);
  background: rgba(10, 12, 10, 0.5);
  color: rgba(232, 228, 216, 0.65);
  font-size: 12px;
  cursor: pointer;
}
.gv-tab--active {
  background: rgba(138, 154, 122, 0.35);
  color: #e8e4d8;
  border-color: rgba(138, 154, 122, 0.6);
}
.gv-block {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.gv-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.gv-node {
  margin-bottom: 10px;
}
.gv-node--child {
  margin-left: 22px;
  margin-top: 8px;
}
.gv-node-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.gv-node-icon {
  font-size: 14px;
}
.gv-node-title {
  font-size: 13px;
  font-weight: 600;
  color: #e8e4d8;
}
.gv-node-status {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
}
.gv-node-progress {
  margin-left: auto;
  font-size: 12px;
  color: rgba(138, 154, 122, 0.9);
}
.gv-node-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.gv-node-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(138, 154, 122, 0.5), rgba(138, 154, 122, 0.9));
}
.gv-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.gv-bar-label {
  width: 70px;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.75);
  flex-shrink: 0;
}
.gv-bar-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.gv-bar-fill {
  height: 100%;
  border-radius: 4px;
}
.gv-bar-num {
  width: 44px;
  text-align: right;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
}
.gv-tier-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.gv-tier-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.gv-tier-name {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.gv-tier-num {
  font-size: 20px;
  font-weight: 700;
  color: #c9d6b8;
}
.gv-tier-pct {
  font-size: 12px;
  color: rgba(138, 154, 122, 0.85);
}
.gv-history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.gv-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 12px;
  cursor: pointer;
  color: #e8e4d8;
  background: rgba(139, 155, 122, 0.2);
}
.gv-btn-primary {
  background: rgba(138, 154, 122, 0.35);
}
.gv-trend {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 80px;
}
.gv-trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 3px;
}
.gv-trend-bar {
  width: 70%;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, rgba(138, 154, 122, 0.9), rgba(138, 154, 122, 0.35));
}
.gv-trend-label {
  font-size: 9px;
  color: rgba(232, 228, 216, 0.4);
}
.gv-ms-group {
  margin-bottom: 12px;
}
.gv-ms-group-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
  margin-bottom: 6px;
}
.gv-ms-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.12);
}
.gv-ms-row:last-child {
  border-bottom: none;
}
.gv-ms-icon {
  font-size: 13px;
}
.gv-ms-title {
  font-size: 13px;
  color: #e8e4d8;
}
.gv-ms-goal {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.4);
}
.gv-ms-progress {
  margin-left: auto;
  font-size: 12px;
  color: rgba(138, 154, 122, 0.85);
}
.gv-hint {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.5);
}
</style>
