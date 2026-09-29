<template>
  <section class="srp" aria-label="间隔复习">
    <div class="srp-head">
      <span class="srp-title">🕐 间隔复习</span>
      <span class="srp-sub">艾宾浩斯遗忘曲线 · 到期提醒 · 熟练度追踪</span>
    </div>

    <!-- 统计总览 -->
    <div v-if="hasPlans" class="srp-stats">
      <div class="srp-stat"><b>{{ stats.totalReviews }}</b><span>复习计划</span></div>
      <div class="srp-stat srp-stat--hot"><b>{{ stats.todayDue }}</b><span>今日到期</span></div>
      <div class="srp-stat"><b>{{ stats.thisWeekDue }}</b><span>本周到期</span></div>
      <div class="srp-stat"><b>{{ Math.round(stats.averageMastery * 100) }}%</b><span>平均熟练度</span></div>
      <div class="srp-stat"><b>{{ stats.streak }}</b><span>连续天数</span></div>
    </div>

    <!-- 连击与熟练度分布 -->
    <div v-if="hasPlans" class="srp-block">
      <span class="srp-block-label">熟练度分布</span>
      <div class="srp-mastery">
        <div class="srp-mastery-bar">
          <i class="srp-mastery-seg srp-mastery--low" :style="{ width: masteryPct.low + '%' }" title="生疏 0-30%"></i>
          <i class="srp-mastery-seg srp-mastery--mid" :style="{ width: masteryPct.mid + '%' }" title="熟悉 30-70%"></i>
          <i class="srp-mastery-seg srp-mastery--high" :style="{ width: masteryPct.high + '%' }" title="精通 70-100%"></i>
        </div>
        <div class="srp-mastery-legend">
          <span><i class="srp-dot srp-dot--low"></i>生疏 {{ stats.masteryDistribution.low }}</span>
          <span><i class="srp-dot srp-dot--mid"></i>熟悉 {{ stats.masteryDistribution.medium }}</span>
          <span><i class="srp-dot srp-dot--high"></i>精通 {{ stats.masteryDistribution.high }}</span>
        </div>
      </div>
    </div>

    <!-- 空态 -->
    <div v-if="!hasPlans && nodesEmpty" class="srp-empty">
      <span>🌱</span>
      <p>还没有知识节点。先在经略阁添加节点，再回来制定复习计划。</p>
    </div>

    <!-- 无计划但有节点 -->
    <div v-else-if="!hasPlans && !nodesEmpty" class="srp-block srp-block--cta">
      <p class="srp-cta-text">共 {{ nodeCount }} 个知识节点待纳入复习节奏。</p>
      <button class="srp-btn srp-btn--primary" @click="createTodayPlan">⚡ 生成今日复习计划</button>
    </div>

    <!-- 到期卡片复习 -->
    <div v-if="hasPlans" class="srp-block">
      <span class="srp-block-label">今日复习</span>

      <!-- 复习区 -->
      <div v-if="currentItem" class="srp-review">
        <button class="srp-btn srp-btn--ghost" @click="createTodayPlan" title="重新构建今日计划">↻ 重载</button>
        <div class="srp-card" :class="{ flipped: showAnswer }" @click="showAnswer = !showAnswer">
          <div class="srp-face srp-front">
            <span class="srp-face-label">复习 {{ currentItem.nodeTitle }}</span>
            <p class="srp-face-title">{{ currentItem.nodeTitle }}</p>
            <span class="srp-face-cat">{{ currentItem.category }}</span>
          </div>
          <div class="srp-face srp-back">
            <span class="srp-face-label">要点</span>
            <p class="srp-face-desc">{{ currentItem.desc }}</p>
          </div>
        </div>

        <div v-if="showAnswer" class="srp-quality-row">
          <button class="srp-quality srp-quality--forgot" @click="rateReview(false)">✗ 还没记住</button>
          <button class="srp-quality srp-quality--good" @click="rateReview(true)">✓ 记得</button>
        </div>
        <p v-else class="srp-hint">点卡片查看内容，判断是否已记住</p>

        <p v-if="queueHint" class="srp-progress">剩余 {{ queueHint }} 项</p>
        <p v-else-if="allDone" class="srp-done">🎉 今日复习完成！</p>
      </div>

      <div v-else class="srp-review">
        <p v-if="allDone" class="srp-done">🎉 今日复习已完成，全部掌握！</p>
        <p v-else class="srp-nodue">今日无到期复习项，休息一下吧。</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSpacedReview } from '../../modules/knowledge'
import { getNodes } from '../../modules/knowledge/relation'

const api = useSpacedReview()

// 知识节点源
const nodes = computed(() => getNodes())
const nodeCount = computed(() => nodes.value.length)
const nodesEmpty = computed(() => nodeCount.value === 0)

// 计划与统计
const hasPlans = computed(() => api.reviewPlans.value.length > 0)
const stats = computed(() => {
  // 访问 reviewPlans 以建立响应式依赖
  void api.reviewPlans.value
  return api.reviewStats.value
})

const masteryPct = computed(() => {
  const d = stats.value.masteryDistribution
  const total = d.low + d.medium + d.high || 1
  return {
    low: Math.round((d.low / total) * 100),
    mid: Math.round((d.medium / total) * 100),
    high: Math.round((d.high / total) * 100),
  }
})

// 复习交互
const showAnswer = ref(false)
const currentItem = ref<{
  nodeId: string
  nodeTitle: string
  category: string
  desc: string
} | null>(null)
const reviewed = new Set<string>()
const queueHint = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const plan = api.reviewPlans.value.find(p => p.date === today)
  if (!plan) return 0
  return plan.items.filter(i => i.due).length
})
const allDone = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const plan = api.reviewPlans.value.find(p => p.date === today)
  return !!plan && plan.completed
})

const nodeDesc = new Map(nodes.value.map(n => [n.id, n.desc]))

function createTodayPlan() {
  api.generateReviewPlan(nodes.value)
  const today = new Date().toISOString().split('T')[0]
  const plan = api.reviewPlans.value.find(p => p.date === today)
  if (plan && plan.items.length > 0) {
    pickNext(plan.items)
  }
}

function pickNext(items: { nodeId: string; title: string; category: string }[]) {
  const next = items.find(i => !reviewed.has(i.nodeId))
  if (next) {
    currentItem.value = {
      nodeId: next.nodeId,
      nodeTitle: next.title,
      category: next.category,
      desc: nodeDesc.get(next.nodeId) ?? '',
    }
    showAnswer.value = false
  } else {
    currentItem.value = null
  }
}

function rateReview(correct: boolean) {
  if (!currentItem.value) return
  const today = new Date().toISOString().split('T')[0]
  const plan = api.reviewPlans.value.find(p => p.date === today)
  if (plan) {
    api.recordReview(plan.id, currentItem.value.nodeId, correct)
  }
  reviewed.add(currentItem.value.nodeId)
  api.computeReviewStats()
  const todayPlan = api.reviewPlans.value.find(p => p.date === today)
  if (todayPlan) pickNext(todayPlan.items)
}

onMounted(() => {
  api.loadPlans()
  api.computeReviewStats()
})
</script>

<style scoped>
.srp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.srp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.srp-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
}
.srp-sub {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.srp-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.srp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.srp-stat b {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
}
.srp-stat span {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.srp-stat--hot b {
  color: #f0c040;
}
.srp-block {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(18, 14, 11, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.srp-block-label {
  display: block;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(232, 221, 208, 0.5);
  margin-bottom: 10px;
}
.srp-block--cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 22px 16px;
}
.srp-cta-text {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.55);
}
.srp-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(240, 192, 64, 0.25);
  background: transparent;
  color: var(--accent, #d4a574);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.srp-btn--primary {
  background: rgba(240, 192, 64, 0.12);
  border-color: rgba(240, 192, 64, 0.35);
}
.srp-btn--primary:hover {
  background: rgba(240, 192, 64, 0.2);
}
.srp-btn--ghost {
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(232, 221, 208, 0.6);
  padding: 6px 12px;
  font-size: 11px;
  align-self: flex-start;
  margin-bottom: 8px;
}
.srp-btn--ghost:hover {
  border-color: rgba(240, 192, 64, 0.4);
  color: var(--accent, #d4a574);
}
.srp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 30px 16px;
  text-align: center;
}
.srp-empty span {
  font-size: 28px;
}
.srp-empty p {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.45);
}
.srp-mastery-bar {
  display: flex;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  margin-bottom: 8px;
}
.srp-mastery-seg {
  height: 100%;
  transition: width 0.3s;
}
.srp-mastery--low {
  background: #c46a5a;
}
.srp-mastery--mid {
  background: #f0c040;
}
.srp-mastery--high {
  background: #8a9a7a;
}
.srp-mastery-legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.srp-mastery-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: rgba(232, 221, 208, 0.5);
}
.srp-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.srp-dot--low {
  background: #c46a5a;
}
.srp-dot--mid {
  background: #f0c040;
}
.srp-dot--high {
  background: #8a9a7a;
}
.srp-review {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.srp-card {
  width: 100%;
  min-height: 96px;
  border-radius: 12px;
  border: 1px solid rgba(240, 192, 64, 0.18);
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
  position: relative;
  transition: transform 0.3s;
}
.srp-card.flipped {
  transform: rotateY(180deg);
}
.srp-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  text-align: center;
}
.srp-back {
  transform: rotateY(180deg);
}
.srp-face-label {
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(240, 192, 64, 0.4);
}
.srp-face-title {
  margin: 0;
  font-size: 15px;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
  line-height: 1.5;
  word-break: break-word;
}
.srp-face-cat {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.srp-face-desc {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.7);
  line-height: 1.6;
  word-break: break-word;
}
.srp-quality-row {
  display: flex;
  gap: 8px;
}
.srp-quality {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}
.srp-quality--forgot {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.3);
}
.srp-quality--forgot:hover {
  background: rgba(196, 106, 90, 0.12);
}
.srp-quality--good {
  color: #8a9a7a;
  border-color: rgba(138, 154, 122, 0.3);
}
.srp-quality--good:hover {
  background: rgba(138, 154, 122, 0.12);
}
.srp-hint {
  margin: 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.3);
}
.srp-progress {
  margin: 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.4);
}
.srp-done {
  margin: 0;
  font-size: 13px;
  color: #8a9a7a;
  padding: 8px 0;
}
.srp-nodue {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.45);
  padding: 10px 0;
}
</style>