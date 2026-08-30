<template>
  <section class="ccd-panel" aria-label="信用卡负债">
    <header class="ccd-head">
      <span class="ccd-title">💳 信用卡 / 负债</span>
      <span class="ccd-sub">额度 · 已用/可用 · 还款计划 · 到期提醒</span>
    </header>

    <!-- 负债口径汇总 -->
    <div class="ccd-summary">
      <div class="ccd-sum-item">
        <span class="ccd-sum-label">负债总额</span>
        <span class="ccd-sum-val ccd-sum-val--debt">¥{{ sum.totalBalance }}</span>
      </div>
      <div class="ccd-sum-item">
        <span class="ccd-sum-label">可用额度</span>
        <span class="ccd-sum-val ccd-sum-val--credit">¥{{ sum.totalAvailable }}</span>
      </div>
      <div class="ccd-sum-item">
        <span class="ccd-sum-label">最低还款</span>
        <span class="ccd-sum-val">¥{{ sum.totalMinimum }}</span>
      </div>
      <div class="ccd-sum-item">
        <span class="ccd-sum-label">计划月供</span>
        <span class="ccd-sum-val">¥{{ sum.totalPlanMonthly }}</span>
      </div>
      <div v-if="sum.overdueCount || sum.dueSoonCount" class="ccd-sum-alert">
        <span v-if="sum.overdueCount" class="ccd-alert-tag ccd-alert-tag--overdue">⚠ 逾期 {{ sum.overdueCount }}</span>
        <span v-if="sum.dueSoonCount" class="ccd-alert-tag ccd-alert-tag--soon">⏰ {{ sum.dueSoonCount }} 张将到期</span>
      </div>
    </div>

    <!-- 性质页签 -->
    <div class="ccd-tabs">
      <button :class="['ccd-tab', { active: kind === 'credit' }]" @click="kind = 'credit'">💳 信用卡</button>
      <button :class="['ccd-tab', { active: kind === 'debt' }]" @click="kind = 'debt'">📉 负债</button>
    </div>

    <!-- 卡片列表 -->
    <div class="ccd-list">
      <div v-for="c in visible" :key="c.id" class="ccd-row" :class="{ cleared: cleared(c), overdue: isOverdue(c, today) }">
        <div class="ccd-row-main">
          <span class="ccd-name">{{ c.kind === 'credit' ? '💳' : '📉' }} {{ c.name }}</span>
          <span v-if="c.kind === 'credit'" class="ccd-limit">额度 ¥{{ c.creditLimit }}</span>
          <span class="ccd-bal" :class="{ zero: cardBalance(c) <= 0, overdue: isOverdue(c, today) }">已用 ¥{{ cardBalance(c) }}</span>
          <span v-if="c.kind === 'credit'" class="ccd-avail">可用 ¥{{ availableCredit(c) }}</span>
          <span class="ccd-due">每期 {{ c.repaymentDay }} 日</span>
          <span class="ccd-due-date" :class="{ overdue: isOverdue(c, today) }">
            <template v-if="cleared(c)">已还清</template>
            <template v-else-if="isOverdue(c, today)">已逾期 {{ overdueDays(c, today) }} 天</template>
            <template v-else>{{ dueInDays(c, today) }} 天后到期</template>
          </span>
          <span class="ccd-plan">
            <template v-if="payoffPlan(c).months > 0">月供 ¥{{ payoffPlan(c).monthly }} · 约 {{ payoffPlan(c).months }} 期</template>
            <template v-else>已还清</template>
          </span>
          <span v-if="c.note" class="ccd-note">{{ c.note }}</span>
        </div>
        <div class="ccd-row-ops">
          <button v-if="!cleared(c)" class="ccd-btn ccd-btn--ghost" @click="toggleRepay(c.id)">💰 还款</button>
          <button class="ccd-btn ccd-btn--ghost ccd-btn--plan" @click="togglePlan(c.id)">📅 计划</button>
          <button class="ccd-del" :title="'删除' + c.name" @click="emit('remove', c.id)">✕</button>
        </div>

        <!-- 还款内联表单 -->
        <div v-if="repayFor === c.id" class="ccd-repay">
          <input v-model.number="repayAmount" type="number" min="0" step="0.01" placeholder="金额" class="ccd-input ccd-input--num" />
          <input v-model="repayDate" type="date" class="ccd-input ccd-input--date" :title="'还款日期（留空今天）'" />
          <input v-model="repayNote" class="ccd-input" placeholder="备注(可空)" />
          <button class="ccd-btn ccd-btn--primary" :disabled="!(repayAmount > 0)" @click="doRepay(c.id)">✓ 记一笔</button>
        </div>

        <!-- 还款计划内联表单 -->
        <div v-if="planFor === c.id" class="ccd-plan-form">
          <span class="ccd-plan-label">月还款¥</span>
          <input v-model.number="planMonthsInput" type="number" min="0" class="ccd-input ccd-input--num" :placeholder="'留空按 ' + payoffPlan(c).monthly + '/月'" />
          <button class="ccd-btn ccd-btn--primary" @click="savePlan(c.id)">保存</button>
        </div>
      </div>
      <p v-if="!visible.length" class="ccd-empty">暂无{{ kind === 'credit' ? '信用卡' : '负债' }}账户，可在下方新建。</p>
    </div>

    <!-- 新增信用卡/负债 -->
    <form class="ccd-form" @submit.prevent="submit">
      <div class="ccd-form-grid">
        <select v-model="form.kind" class="ccd-input ccd-select">
          <option value="credit">💳 信用卡</option>
          <option value="debt">📉 负债</option>
        </select>
        <input v-model="form.name" class="ccd-input" placeholder="名称（如 招行卡）" required />
        <input v-if="form.kind === 'credit'" v-model.number="form.creditLimit" type="number" min="0" class="ccd-input ccd-input--num" placeholder="额度" />
        <input v-model.number="form.openingBalance" type="number" min="0" step="0.01" class="ccd-input ccd-input--num" placeholder="期初已用/欠款" required />
      </div>
      <div class="ccd-form-grid">
        <input v-model.number="form.repaymentDay" type="number" min="1" max="31" class="ccd-input ccd-input--num" placeholder="每月还款日(1-31)" required />
        <input v-model.number="form.planMonthly" type="number" min="0" class="ccd-input ccd-input--num" placeholder="还款计划月供(可空)" />
        <input v-model="form.note" class="ccd-input" placeholder="备注（可空）" />
      </div>
      <div class="ccd-form-actions">
        <button class="ccd-btn ccd-btn--primary" :disabled="!formValid">➕ 记一笔</button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  availableCredit,
  cardBalance,
  cleared,
  dueInDays,
  isOverdue,
  liabilitySummary,
  overdueDays,
  payoffPlan,
  type CreditCardKind,
  type CreditCardRecord,
} from '../modules/reward/credit-card'

const props = defineProps<{
  records: CreditCardRecord[]
  /** 基准日期（缺省本地今天），便于测试注入 */
  today?: string
}>()

const emit = defineEmits<{
  (e: 'create', data: Omit<CreditCardRecord, 'id' | 'repayments'>): void
  (e: 'repay', payload: { id: string; amount: number; at: string; note?: string }): void
  (e: 'plan', payload: { id: string; planMonthly?: number }): void
  (e: 'remove', id: string): void
}>()

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const today = computed(() => props.today || localToday())

const kind = ref<CreditCardKind>('credit')
const sum = computed(() => liabilitySummary(props.records, today.value))
const visible = computed(() => props.records.filter(c => c.kind === kind.value))

// ---- 新增 ----
const form = reactive({
  kind: 'credit' as CreditCardKind,
  name: '',
  creditLimit: 0,
  openingBalance: 0,
  repaymentDay: 10,
  planMonthly: 0,
  note: '',
})
const formValid = computed(() => form.name.trim().length > 0 && form.openingBalance > 0 && form.repaymentDay >= 1 && form.repaymentDay <= 31)

function submit(): void {
  if (!formValid.value) return
  emit('create', {
    kind: form.kind,
    name: form.name.trim(),
    creditLimit: form.kind === 'credit' && form.creditLimit > 0 ? form.creditLimit : undefined,
    openingBalance: form.openingBalance,
    repaymentDay: form.repaymentDay,
    planMonthly: form.planMonthly > 0 ? form.planMonthly : undefined,
    note: form.note.trim() || undefined,
  })
  form.name = ''
  form.creditLimit = 0
  form.openingBalance = 0
  form.repaymentDay = 10
  form.planMonthly = 0
  form.note = ''
}

// ---- 还款 ----
const repayFor = ref<string | null>(null)
const repayAmount = ref(0)
const repayDate = ref('')
const repayNote = ref('')

function toggleRepay(id: string): void {
  if (repayFor.value === id) {
    repayFor.value = null
    return
  }
  repayFor.value = id
  const c = props.records.find(x => x.id === id)
  repayAmount.value = c ? cardBalance(c) : 0
  repayDate.value = ''
  repayNote.value = ''
  planFor.value = null
}

function doRepay(id: string): void {
  if (!(repayAmount.value > 0)) return
  emit('repay', {
    id,
    amount: repayAmount.value,
    at: repayDate.value || today.value,
    note: repayNote.value.trim() || undefined,
  })
  repayFor.value = null
  repayAmount.value = 0
  repayDate.value = ''
  repayNote.value = ''
}

// ---- 还款计划 ----
const planFor = ref<string | null>(null)
const planMonthsInput = ref(0)

function togglePlan(id: string): void {
  if (planFor.value === id) {
    planFor.value = null
    return
  }
  planFor.value = id
  const c = props.records.find(x => x.id === id)
  planMonthsInput.value = c?.planMonthly ?? 0
  repayFor.value = null
}

function savePlan(id: string): void {
  emit('plan', { id, planMonthly: planMonthsInput.value > 0 ? planMonthsInput.value : undefined })
  planFor.value = null
  planMonthsInput.value = 0
}
</script>

<style scoped>
.ccd-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.ccd-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.ccd-title { font-weight: 600; }
.ccd-sub { font-size: 12px; color: #8a9a7a; flex: 1; }

.ccd-summary { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.ccd-sum-item { display: flex; align-items: baseline; gap: 6px; }
.ccd-sum-label { font-size: 11px; color: #8a9a7a; }
.ccd-sum-val { font-weight: 700; font-size: 13px; }
.ccd-sum-val--debt { color: #c46a5a; }
.ccd-sum-val--credit { color: #6b9fc4; }
.ccd-sum-alert { display: flex; gap: 6px; margin-left: auto; }
.ccd-alert-tag { font-size: 11px; border-radius: 6px; padding: 1px 6px; }
.ccd-alert-tag--overdue { color: #c46a5a; border: 1px solid #7a4538; }
.ccd-alert-tag--soon { color: #f0c040; border: 1px solid #7a6a2a; }

.ccd-tabs { display: flex; gap: 6px; margin-bottom: 10px; }
.ccd-tab {
  background: transparent; border: 1px solid #374136; color: #b7c0a8;
  border-radius: 8px; padding: 4px 14px; cursor: pointer; font-size: 12px;
}
.ccd-tab.active { background: #8a9a7a; color: #171a15; border-color: #8a9a7a; font-weight: 600; }

.ccd-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.ccd-row {
  display: flex; align-items: center; gap: 8px; font-size: 12px;
  padding: 6px 4px; border-bottom: 1px dashed #2c312b; flex-wrap: wrap;
}
.ccd-row.cleared { opacity: 0.55; }
.ccd-row.overdue { background: #241a16; border-radius: 6px; }
.ccd-row-main { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap; }
.ccd-name { font-weight: 600; }
.ccd-limit { color: #8a9a7a; font-size: 11px; }
.ccd-bal { font-weight: 600; }
.ccd-bal.zero { color: #8a9a7a; text-decoration: line-through; }
.ccd-bal.overdue { color: #c46a5a; }
.ccd-avail { color: #6b9fc4; }
.ccd-due { color: #8a9a7a; font-size: 11px; }
.ccd-due-date { font-size: 11px; }
.ccd-due-date.overdue { color: #c46a5a; font-weight: 600; }
.ccd-plan { color: #b7c0a8; font-size: 11px; }
.ccd-note { color: #6b7563; font-size: 11px; }

.ccd-row-ops { display: flex; align-items: center; gap: 6px; }
.ccd-btn { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 4px 10px; cursor: pointer; font-weight: 600; font-size: 11px; }
.ccd-btn--ghost { background: transparent; border: 1px solid #374136; color: #b7c0a8; }
.ccd-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ccd-del { background: none; border: none; color: #6b7563; cursor: pointer; font-size: 13px; }
.ccd-del:hover { color: #c46a5a; }

.ccd-repay, .ccd-plan-form {
  display: flex; gap: 6px; align-items: center; width: 100%;
  background: #1a1e18; border: 1px solid #3a443a; border-radius: 10px; padding: 8px; margin-top: 4px;
}
.ccd-plan-label { font-size: 12px; color: #8a9a7a; }
.ccd-empty { font-size: 12px; color: #8a9a7a; }

.ccd-form { border-top: 1px solid #2c312b; padding-top: 10px; }
.ccd-form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 6px; }
@media (max-width: 640px) { .ccd-form-grid { grid-template-columns: 1fr; } }
.ccd-form-actions { display: flex; justify-content: flex-end; margin-top: 6px; }
.ccd-input, .ccd-select {
  background: #161a15; border: 1px solid #374136; border-radius: 8px; color: #d9decf;
  padding: 6px 8px; font-size: 12px; min-width: 0;
}
.ccd-select { color-scheme: dark; }
.ccd-input--num { text-align: right; }
</style>
