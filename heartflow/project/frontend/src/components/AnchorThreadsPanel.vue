<template>
  <section class="atl-panel" data-enter>
    <div class="atl-head">
      <div class="atl-title-wrap">
        <span class="atl-title">光丝串联</span>
        <span class="atl-sub">锚点↔锚点 · 锚点↔留光阁（共享标签 / 同分类 / 同日 / 目标联动）</span>
      </div>
      <span class="atl-tag">本地启发式</span>
    </div>

    <!-- 概览 -->
    <div class="atl-kpis">
      <div class="atl-kpi">
        <strong class="atl-kpi-num">{{ activeCount }}</strong>
        <span class="atl-kpi-label">活跃锚点</span>
      </div>
      <div class="atl-kpi">
        <strong class="atl-kpi-num">{{ threads.length }}</strong>
        <span class="atl-kpi-label">锚点间光丝</span>
      </div>
      <div class="atl-kpi">
        <strong class="atl-kpi-num">{{ links.length }}</strong>
        <span class="atl-kpi-label">目标联动</span>
      </div>
      <div class="atl-kpi">
        <strong class="atl-kpi-num">{{ advanceGoals.length }}</strong>
        <span class="atl-kpi-label">完成可推进</span>
      </div>
    </div>

    <template v-if="threads.length || links.length || doneUpdates.length || poolPreview.placed.length">
      <!-- 锚点间光丝 -->
      <div v-if="threads.length" class="atl-block">
        <div class="atl-block-head">
          <span class="atl-block-title">锚点间光丝</span>
          <span class="atl-block-note">强度 = 标签重叠度（Jaccard）/ 分类 / 同日</span>
        </div>
        <ul class="atl-list">
          <li v-for="t in threads" :key="t.id" class="atl-item">
            <span class="atl-thread-dot" :style="{ background: t.color }"></span>
            <div class="atl-item-main">
              <p class="atl-item-text">
                <span class="atl-item-a">{{ anchorText(t.sourceId) }}</span>
                <span class="atl-item-arrow">↔</span>
                <span class="atl-item-a">{{ anchorText(t.targetId) }}</span>
              </p>
              <p class="atl-item-meta">{{ threadTypeLabel(t.type) }}<span v-if="t.label"> · {{ t.label }}</span></p>
            </div>
            <div class="atl-item-strength">
              <div class="atl-strength-bar">
                <span :style="{ width: (t.strength * 100).toFixed(0) + '%', background: t.color }"></span>
              </div>
              <span class="atl-strength-num">{{ t.strength.toFixed(2) }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- 锚点 ↔ 目标联动 -->
      <div v-if="links.length" class="atl-block">
        <div class="atl-block-head">
          <span class="atl-block-title">锚点 ↔ 留光阁</span>
          <span class="atl-block-note">标签词 / 分类领域匹配，联动强度与完成贡献</span>
        </div>
        <ul class="atl-list">
          <li v-for="(l, i) in links" :key="l.anchorId + '-' + l.goalId + '-' + i" class="atl-item">
            <span class="atl-thread-dot" style="background: #8a9a7a"></span>
            <div class="atl-item-main">
              <p class="atl-item-text">
                <span class="atl-item-a">{{ anchorText(l.anchorId) }}</span>
                <span class="atl-item-arrow">→</span>
                <span class="atl-item-goal">{{ goalText(l.goalId) }}</span>
              </p>
              <p class="atl-item-meta">完成贡献 ≈ 1 / (目标锚点数 + 1) 或 0.2</p>
            </div>
            <div class="atl-item-strength">
              <div class="atl-strength-bar">
                <span :style="{ width: (l.strength * 100).toFixed(0) + '%', background: '#8a9a7a' }"></span>
              </div>
              <span class="atl-strength-num">{{ l.strength.toFixed(2) }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- 完成推进预览 -->
      <div v-if="doneUpdates.length" class="atl-block">
        <div class="atl-block-head">
          <span class="atl-block-title">完成推进预览</span>
          <span class="atl-block-note">已完成锚点对关联目标的推进模拟（只读）</span>
        </div>
        <ul class="atl-list">
          <li v-for="d in doneUpdates" :key="d.goalId" class="atl-item atl-item-flat">
            <div class="atl-item-main">
              <p class="atl-item-text">
                <span class="atl-item-a">{{ anchorText(d.anchorId) }}</span>
                <span class="atl-item-arrow">→</span>
                <span class="atl-item-goal">{{ goalText(d.goalId) }}</span>
              </p>
              <p class="atl-item-meta">目标完成锚点数 {{ goalDoneBefore(d.goalId) }} → {{ d.newAnchorDone }}</p>
            </div>
          </li>
        </ul>
      </div>

      <!-- 锚点池倒入预览 -->
      <div v-if="poolPreview.placed.length" class="atl-block">
        <div class="atl-block-head">
          <span class="atl-block-title">锚点池一键倒入预览</span>
          <span class="atl-block-note">今天将安放 {{ poolPreview.placed.length }} 个停留锚点</span>
        </div>
        <ul class="atl-list">
          <li v-for="(p, i) in poolPreview.placed" :key="p.id + '-' + i" class="atl-item atl-item-flat">
            <div class="atl-item-main">
              <p class="atl-item-text">
                <span class="atl-item-a">{{ p.text }}</span>
                <span v-if="matchedGoalTitle(p.id)" class="atl-item-arrow">→</span>
                <span v-if="matchedGoalTitle(p.id)" class="atl-item-goal">{{ matchedGoalTitle(p.id) }}</span>
              </p>
              <p class="atl-item-meta">{{ matchedGoalTitle(p.id) ? '自动匹配目标' : '停留中 · 待安放' }}</p>
            </div>
          </li>
        </ul>
      </div>
    </template>

    <p v-else class="atl-empty">暂无光丝与联动。给锚点打上标签、归类，或关联目标后，这里会亮起串联。</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storage } from '../engine/storage'
import type { Anchor } from '../modules/anchor/types'
import type { Goal } from '../modules/goal/types'
import {
  computeAnchorThreads,
  computeAnchorGoalLinks,
  applyAnchorCompletionToGoal,
  dumpAnchorPool,
  type AnchorThread,
} from '../modules/anchor/anchor-threads'

const props = defineProps<{ anchors: Anchor[] }>()

const goals = ref<Goal[]>([])

function refresh() {
  goals.value = storage.getGoals().map(g => ({ ...g }))
}

watch(() => props.anchors, () => refresh(), { deep: true })
refresh()

const activeAnchors = computed(() => props.anchors.filter(a => (a.stage ?? 'active') === 'active'))
const poolAnchors = computed(() => props.anchors.filter(a => a.stage === 'pool'))

const threads = computed<AnchorThread[]>(() => computeAnchorThreads(activeAnchors.value))
const links = computed(() => computeAnchorGoalLinks(activeAnchors.value, goals.value))

const anchorById = computed<Record<string, Anchor>>(() => {
  const m: Record<string, Anchor> = {}
  for (const a of props.anchors) m[a.id] = a
  return m
})
const goalById = computed<Record<string, Goal>>(() => {
  const m: Record<string, Goal> = {}
  for (const g of goals.value) m[g.id] = g
  return m
})

function anchorText(id: string): string {
  return anchorById.value[id]?.text ?? '（已移除）'
}
function goalText(id: string): string {
  const g = goalById.value[id]
  return g ? g.title : '（已移除）'
}
function goalDoneBefore(id: string): number {
  return goalById.value[id]?.anchorDone ?? 0
}
function matchedGoalTitle(anchorId: string): string {
  const m = poolPreview.value.goalMatches.find(x => x.anchorId === anchorId)
  return m ? m.goalTitle : ''
}

const activeCount = computed(() => activeAnchors.value.length)

// 完成推进预览：对已完成锚点，先以其「未完成态」重建联动（computeAnchorGoalLinks 过滤 done），
// 再模拟 applyAnchorCompletionToGoal 的推进结果（只读，不写入存储）
const doneUpdates = computed(() => {
  const out: { anchorId: string; goalId: string; newAnchorDone: number }[] = []
  for (const a of activeAnchors.value) {
    if (!a.done) continue
    const ownLinks = computeAnchorGoalLinks([{ ...a, done: false }], goals.value)
    if (ownLinks.length === 0) continue
    const updates = applyAnchorCompletionToGoal(a, goals.value, ownLinks)
    for (const u of updates) out.push({ anchorId: a.id, goalId: u.goalId, newAnchorDone: u.newAnchorDone })
  }
  return out
})

const advanceGoals = computed(() => {
  const ids = new Set(doneUpdates.value.map(d => d.goalId))
  return [...ids]
})

const todayStr = computed(() => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
})

const poolPreview = computed(() => dumpAnchorPool(poolAnchors.value, goals.value, todayStr.value))

const THREAD_TYPE_LABELS: Record<AnchorThread['type'], string> = {
  same_tag: '共享标签',
  same_category: '同分类',
  same_day: '同日',
  anchor_goal: '目标联动',
  manual: '手动',
}
function threadTypeLabel(type: AnchorThread['type']): string {
  return THREAD_TYPE_LABELS[type] ?? type
}
</script>

<style scoped>
.atl-panel {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(15, 13, 20, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.atl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.atl-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.atl-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.atl-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.atl-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #b9b0e8; white-space: nowrap; }

.atl-kpis { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
.atl-kpi {
  flex: 1; min-width: 96px; padding: 10px 12px; border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.06); border: 1px solid rgba(var(--accent-rgb), 0.1);
  display: flex; flex-direction: column; gap: 2px;
}
.atl-kpi-num { font-size: 22px; color: var(--text-high, rgba(232, 224, 216, 0.88)); font-weight: 600; }
.atl-kpi-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.55); }

.atl-block { margin-top: 12px; }
.atl-block-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; gap: 10px; }
.atl-block-title { font-size: 12px; letter-spacing: 1.5px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.atl-block-note { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }

.atl-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
.atl-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px;
  border-radius: 10px; background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.atl-thread-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.atl-item-main { flex: 1; min-width: 0; }
.atl-item-text { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text, #cfc6e4); flex-wrap: wrap; }
.atl-item-a { color: var(--text-medium, rgba(232, 224, 216, 0.53)); }
.atl-item-arrow { color: rgba(var(--accent-rgb), 0.5); font-size: 11px; }
.atl-item-goal { color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.atl-item-meta { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); margin-top: 2px; }
.atl-item-strength { display: flex; align-items: center; gap: 7px; width: 110px; flex: none; }
.atl-strength-bar {
  flex: 1; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); overflow: hidden;
}
.atl-strength-bar span { display: block; height: 100%; border-radius: 3px; }
.atl-strength-num { font-size: 10px; color: rgba(var(--accent-rgb), 0.55); width: 32px; text-align: right; }
.atl-item-flat { align-items: flex-start; }
.atl-empty {
  font-size: 11px; color: rgba(var(--accent-rgb), 0.4); padding: 18px 0 8px; text-align: center;
}
</style>
