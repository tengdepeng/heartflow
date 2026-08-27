<template>
  <section class="fg-panel" aria-label="财务目标与投资追踪">
    <div class="fg-panel-head">
      <span class="fg-panel-title">🏦 财务目标</span>
      <span class="fg-panel-sub">目标 · 投资 · 健康 · 时间线</span>
    </div>

    <!-- 财务目标 -->
    <div class="fg-block">
      <span class="fg-block-label">🎯 财务目标 · {{ goalStats.total }}</span>
      <div class="fg-form">
        <select v-model="goalForm.type" class="fg-select">
          <option v-for="(meta, key) in GOAL_TYPE_META" :key="key" :value="key">{{ meta.icon }} {{ meta.label }}</option>
        </select>
        <input v-model="goalForm.name" class="fg-input" placeholder="目标名称" />
        <input v-model="goalForm.target" type="number" min="0" class="fg-input fg-input-sm" placeholder="目标金额" />
        <select v-model="goalForm.term" class="fg-select">
          <option v-for="(meta, key) in GOAL_TERM_META" :key="key" :value="key">{{ meta.label }}</option>
        </select>
        <input v-model="goalForm.monthly" type="number" min="0" class="fg-input fg-input-sm" placeholder="月存" />
        <button class="fg-btn fg-btn-primary" @click="createGoal">创建</button>
      </div>
      <ul v-if="goals.length" class="fg-list">
        <li v-for="g in goals" :key="g.id" class="fg-goal">
          <div class="fg-goal-head">
            <span class="fg-goal-name">{{ goalMeta(g.type).icon }} {{ g.name }}</span>
            <span class="fg-goal-amount">¥{{ g.currentAmount.toLocaleString() }} / ¥{{ g.targetAmount.toLocaleString() }}</span>
          </div>
          <div class="fg-goal-bar">
            <div class="fg-goal-bar-fill" :style="{ width: getGoalProgress(g) + '%' }"></div>
          </div>
          <div class="fg-goal-foot">
            <span class="fg-goal-term">{{ goalTermLabel(g.term) }} · {{ getGoalProgress(g) }}%</span>
            <span v-if="g.achieved" class="fg-goal-done">✅ 已完成</span>
            <div class="fg-goal-actions" v-else>
              <input :value="progressInputs[g.id] ?? ''" @input="progressInputs[g.id] = ($event.target as HTMLInputElement).value" type="number" min="0" class="fg-input fg-input-xs" placeholder="进度" />
              <button class="fg-btn fg-btn-sm" @click="updateProgress(g.id)">更新</button>
              <button v-if="g.monthlyContribution > 0" class="fg-btn fg-btn-sm" @click="addMonthly(g.id)">+{{ g.monthlyContribution }}</button>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="fg-empty">还没有财务目标，设置一个开始积累吧。</p>
    </div>

    <!-- 投资追踪 -->
    <div class="fg-block">
      <span class="fg-block-label">📈 投资追踪 · {{ portfolio.investmentCount }}</span>
      <div class="fg-form">
        <select v-model="invForm.type" class="fg-select">
          <option v-for="(meta, key) in INVESTMENT_TYPE_META" :key="key" :value="key">{{ meta.icon }} {{ meta.label }}</option>
        </select>
        <input v-model="invForm.name" class="fg-input" placeholder="名称" />
        <input v-model="invForm.principal" type="number" min="0" class="fg-input fg-input-sm" placeholder="本金" />
        <input v-model="invForm.value" type="number" min="0" class="fg-input fg-input-sm" placeholder="市值" />
        <button class="fg-btn fg-btn-primary" @click="addInv">添加</button>
      </div>
      <div v-if="portfolio.investmentCount" class="fg-ov">
        <span>总市值 ¥{{ portfolio.totalValue.toLocaleString() }}</span>
        <span :class="portfolio.totalReturn >= 0 ? 'fg-pos' : 'fg-neg'">收益 {{ portfolio.totalReturn >= 0 ? '+' : '' }}{{ portfolio.totalReturn.toLocaleString() }} ({{ portfolio.totalReturnRate }}%)</span>
        <span>均风险 {{ portfolio.avgRisk }}/5</span>
      </div>
      <ul v-if="investments.length" class="fg-list">
        <li v-for="inv in investments" :key="inv.id" class="fg-inv">
          <div class="fg-goal-head">
            <span class="fg-goal-name">{{ invMeta(inv.type).icon }} {{ inv.name }}</span>
            <span :class="inv.returnRate >= 0 ? 'fg-pos' : 'fg-neg'">{{ inv.returnRate >= 0 ? '+' : '' }}{{ inv.returnRate }}%</span>
          </div>
          <div class="fg-goal-foot">
            <span class="fg-goal-term">本金 ¥{{ inv.principal.toLocaleString() }} → 市值 ¥{{ inv.currentValue.toLocaleString() }}</span>
            <div class="fg-goal-actions">
              <input :value="valueInputs[inv.id] ?? ''" @input="valueInputs[inv.id] = ($event.target as HTMLInputElement).value" type="number" min="0" class="fg-input fg-input-xs" placeholder="新市值" />
              <button class="fg-btn fg-btn-sm" @click="updateInv(inv.id)">更新</button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- 财务健康 -->
    <div class="fg-block">
      <span class="fg-block-label">🩺 财务健康</span>
      <div class="fg-form">
        <input v-model="healthForm.income" type="number" min="0" class="fg-input fg-input-sm" placeholder="月收入" />
        <input v-model="healthForm.savings" type="number" min="0" class="fg-input fg-input-sm" placeholder="总储蓄" />
        <input v-model="healthForm.debt" type="number" min="0" class="fg-input fg-input-sm" placeholder="总负债" />
        <input v-model="healthForm.expenses" type="number" min="0" class="fg-input fg-input-sm" placeholder="月支出" />
        <button class="fg-btn fg-btn-primary" @click="assessHealth">评估</button>
      </div>
      <div v-if="latestScore" class="fg-health">
        <div class="fg-goal-head">
          <span class="fg-goal-name">健康评分</span>
          <span class="fg-health-grade" :style="{ color: gradeMeta(latestScore.grade).color }">{{ gradeMeta(latestScore.grade).label }}</span>
        </div>
        <div class="fg-score-big" :style="{ color: gradeMeta(latestScore.grade).color }">{{ latestScore.total }}<span class="fg-score-unit">/100</span></div>
        <ul v-if="latestScore.suggestions.length" class="fg-suggest">
          <li v-for="(s, i) in latestScore.suggestions" :key="i">{{ s }}</li>
        </ul>
      </div>
    </div>

    <!-- 财务时间线 -->
    <div class="fg-block">
      <span class="fg-block-label">🗓 财务时间线 · {{ timeline.length }}</span>
      <button class="fg-btn fg-btn-sm" @click="rebuildTimeline">刷新</button>
      <ul v-if="timeline.length" class="fg-list">
        <li v-for="ev in timeline" :key="ev.id" class="fg-event">
          <span class="fg-event-icon">{{ tlIcon(ev.type) }}</span>
          <div class="fg-event-body">
            <span class="fg-event-title">{{ ev.title }}</span>
            <span class="fg-event-desc">{{ ev.description }}</span>
          </div>
          <span v-if="ev.amount" class="fg-event-amount">¥{{ ev.amount.toLocaleString() }}</span>
        </li>
      </ul>
      <p v-else class="fg-empty">完成目标后自动沉淀时间线。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useFinanceGoals, useInvestmentTracker, useFinanceHealth, useFinanceTimeline, GOAL_TYPE_META, GOAL_TERM_META, INVESTMENT_TYPE_META, HEALTH_GRADE_META } from '../modules/reward/finance-goals'
import type { FinanceGoal, FinanceGoalType, GoalTerm, InvestmentType, FinanceTimelineEvent, FinanceHealthScore } from '../modules/reward/finance-goals'
import type { RewardRecord } from '../modules/reward/types'

const props = defineProps<{
  records?: RewardRecord[]
}>()

const financeGoals = useFinanceGoals()
const investmentTracker = useInvestmentTracker()
const financeHealth = useFinanceHealth()
const financeTimeline = useFinanceTimeline()

const goals = financeGoals.goals
const goalStats = financeGoals.goalStats
const investments = investmentTracker.investments
const portfolio = investmentTracker.portfolioOverview
const latestScore = financeHealth.latestScore
const timeline = financeTimeline.timeline

const goalForm = ref({ type: 'savings' as FinanceGoalType, name: '', target: 0, term: 'short' as GoalTerm, monthly: 0 })
const invForm = ref({ type: 'fund' as InvestmentType, name: '', principal: 0, value: 0 })
const healthForm = ref({ income: 0, savings: 0, debt: 0, expenses: 0 })
const progressInputs = reactive<Record<string, string>>({})
const valueInputs = reactive<Record<string, string>>({})

onMounted(() => {
  financeGoals.loadGoals()
  investmentTracker.loadInvestments()
  financeHealth.loadHealthScores()
})

function goalMeta(t: FinanceGoalType) { return GOAL_TYPE_META[t] ?? GOAL_TYPE_META.savings }
function goalTermLabel(t: GoalTerm) { return GOAL_TERM_META[t]?.label ?? t }
function invMeta(t: InvestmentType) { return INVESTMENT_TYPE_META[t] ?? INVESTMENT_TYPE_META.other }
function gradeMeta(g: FinanceHealthScore['grade']) { return HEALTH_GRADE_META[g] ?? HEALTH_GRADE_META.fair }
function getGoalProgress(g: FinanceGoal) { return financeGoals.getGoalProgress(g) }
function tlIcon(t: FinanceTimelineEvent['type']) {
  const map: Record<FinanceTimelineEvent['type'], string> = {
    milestone: '🏅', 'goal-achieved': '🎯', 'investment-change': '📈', 'income-change': '💰', 'expense-spike': '⚠️',
  }
  return map[t] ?? '•'
}

function createGoal() {
  if (!goalForm.value.name.trim() || goalForm.value.target <= 0) return
  financeGoals.createGoal(
    goalForm.value.type,
    goalForm.value.name.trim(),
    '',
    goalForm.value.target,
    goalForm.value.term,
    5,
    goalForm.value.monthly,
  )
  goalForm.value = { type: 'savings' as FinanceGoalType, name: '', target: 0, term: 'short' as GoalTerm, monthly: 0 }
}

function updateProgress(id: string) {
  const v = Number(progressInputs[id])
  if (Number.isFinite(v) && v >= 0) financeGoals.updateGoalProgress(id, v)
}

function addMonthly(id: string) {
  financeGoals.addMonthlyContribution(id)
}

function addInv() {
  if (!invForm.value.name.trim() || invForm.value.principal <= 0) return
  investmentTracker.addInvestment(
    invForm.value.type,
    invForm.value.name.trim(),
    invForm.value.principal,
    invForm.value.value,
  )
  invForm.value = { type: 'fund' as InvestmentType, name: '', principal: 0, value: 0 }
}

function updateInv(id: string) {
  const v = Number(valueInputs[id])
  if (Number.isFinite(v) && v >= 0) investmentTracker.updateInvestmentValue(id, v)
}

function assessHealth() {
  financeHealth.calculateHealthScore(
    props.records ?? [],
    Number(healthForm.value.income) || 0,
    Number(healthForm.value.savings) || 0,
    Number(healthForm.value.debt) || 0,
    Number(healthForm.value.expenses) || 0,
  )
}

function rebuildTimeline() {
  financeTimeline.buildTimeline(props.records ?? [], [], goals.value)
}
</script>

<style scoped>
.fg-panel {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.fg-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.fg-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.fg-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.fg-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.fg-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.fg-form {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.fg-select,
.fg-input {
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.fg-select option { background: #14161d; color: rgba(240, 242, 255, 0.85); }
.fg-input { width: 130px; }
.fg-input-sm { width: 92px; }
.fg-input-xs { width: 64px; padding: 4px 6px; }
.fg-btn {
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s ease;
}
.fg-btn:hover { background: rgba(255, 255, 255, 0.09); }
.fg-btn-primary {
  background: rgba(138, 154, 122, 0.18);
  border-color: rgba(138, 154, 122, 0.35);
  color: #b8c4a0;
}
.fg-btn-sm { padding: 4px 10px; font-size: 11px; }
.fg-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fg-goal,
.fg-inv {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.fg-goal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}
.fg-goal-name { color: rgba(240, 242, 255, 0.9); }
.fg-goal-amount { font-size: 12px; color: var(--text-medium); }
.fg-goal-bar {
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.fg-goal-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(138, 154, 122, 0.6), #b8c4a0);
  transition: width 0.4s ease;
}
.fg-goal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.fg-goal-term { font-size: 11px; color: var(--text-low); }
.fg-goal-done { font-size: 11px; color: #8a9a7a; }
.fg-goal-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.fg-ov {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-medium);
}
.fg-pos { color: #8a9a7a; }
.fg-neg { color: #c46a5a; }
.fg-health {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fg-score-big {
  font-size: 30px;
  font-weight: 700;
}
.fg-score-unit { font-size: 12px; font-weight: 400; color: var(--text-low); }
.fg-health-grade { font-size: 13px; font-weight: 600; }
.fg-suggest {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--text-medium);
  line-height: 1.7;
}
.fg-event {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.fg-event-icon { width: 24px; text-align: center; flex: none; }
.fg-event-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.fg-event-title { font-size: 12px; color: rgba(240, 242, 255, 0.85); }
.fg-event-desc { font-size: 11px; color: var(--text-low); }
.fg-event-amount { font-size: 12px; color: #8a9a7a; }
.fg-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-low);
}
</style>
