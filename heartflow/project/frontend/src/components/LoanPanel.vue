<template>
  <section class="lnp-panel" aria-label="借贷往来">
    <header class="lnp-head">
      <span class="lnp-title">⭕ 借贷往来</span>
      <span class="lnp-sub">借出借入记录 · 还款/收债状态 · 应收应付净额</span>
    </header>

    <!-- 应收应付净额 -->
    <div class="lnp-summary">
      <div class="lnp-sum-item">
        <span class="lnp-sum-label">应收</span>
        <span class="lnp-sum-val lnp-sum-val--lend">¥{{ sum.receivable }}</span>
      </div>
      <div class="lnp-sum-item">
        <span class="lnp-sum-label">应付</span>
        <span class="lnp-sum-val lnp-sum-val--borrow">¥{{ sum.payable }}</span>
      </div>
      <div class="lnp-sum-item">
        <span class="lnp-sum-label">净额</span>
        <span class="lnp-sum-val" :class="sum.net >= 0 ? 'lnp-sum-val--lend' : 'lnp-sum-val--borrow'">¥{{ sum.net }}</span>
      </div>
      <div v-if="sum.overdueLendCount || sum.overdueBorrowCount" class="lnp-sum-overdue">
        <span v-if="sum.overdueLendCount" class="lnp-overdue-tag">⚠ 待收 {{ sum.overdueLendCount }}</span>
        <span v-if="sum.overdueBorrowCount" class="lnp-overdue-tag">⚠ 待还 {{ sum.overdueBorrowCount }}</span>
      </div>
    </div>

    <!-- 方向页签 -->
    <div class="lnp-tabs">
      <button :class="['lnp-tab', { active: dir === 'lend' }]" @click="dir = 'lend'">📤 借出</button>
      <button :class="['lnp-tab', { active: dir === 'borrow' }]" @click="dir = 'borrow'">📥 借入</button>
    </div>

    <!-- 记录列表 -->
    <div class="lnp-list">
      <div v-for="l in visible" :key="l.id" class="lnp-row" :class="{ settled: loanStatus(l) === 'settled' }">
        <div class="lnp-row-main">
          <span class="lnp-cp">{{ l.counterparty }}</span>
          <span class="lnp-amt">¥{{ l.amount }}</span>
          <span class="lnp-rem" :class="{ zero: remaining(l) <= 0 }">剩 ¥{{ remaining(l) }}</span>
          <span v-if="l.dueAt" class="lnp-due" :class="{ overdue: overdueDays(l, today) > 0 }">
            {{ l.dueAt }}{{ overdueDays(l, today) > 0 ? ` 逾期${overdueDays(l, today)}天` : '' }}
          </span>
          <span v-if="l.note" class="lnp-note">{{ l.note }}</span>
          <span class="lnp-badge" :class="'lnp-badge--' + loanStatus(l)">
            {{ loanStatus(l) === 'settled' ? '已结清' : '未结清' }}
          </span>
        </div>
        <div class="lnp-row-ops">
          <button v-if="loanStatus(l) === 'outstanding'" class="lnp-btn lnp-btn--ghost" @click="toggleSettle(l.id)">💱 结算</button>
          <button class="lnp-del" :title="'删除' + l.counterparty" @click="emit('remove', l.id)">✕</button>
        </div>

        <!-- 结算（还款/收债）内联表单 -->
        <div v-if="settleFor === l.id" class="lnp-settle">
          <input v-model.number="settleAmount" type="number" min="0" step="0.01" placeholder="金额" class="lnp-input lnp-input--num" />
          <input v-model="settleDate" type="date" class="lnp-input lnp-input--date" :title="'结算日期（留空今天）'" />
          <input v-model="settleNote" class="lnp-input" placeholder="备注(可空)" />
          <button class="lnp-btn lnp-btn--primary" :disabled="!(settleAmount > 0)" @click="doSettle(l.id)">✓ 记一笔</button>
        </div>
      </div>
      <p v-if="!visible.length" class="lnp-empty">暂无{{ dir === 'lend' ? '借出' : '借入' }}记录，可在下方新建。</p>
    </div>

    <!-- 新增往来 -->
    <form class="lnp-form" @submit.prevent="submit">
      <div class="lnp-form-grid">
        <select v-model="form.direction" class="lnp-input lnp-select">
          <option value="lend">📤 借出</option>
          <option value="borrow">📥 借入</option>
        </select>
        <input v-model="form.counterparty" class="lnp-input" placeholder="对方（人/机构）" required />
        <input v-model.number="form.amount" type="number" min="0" step="0.01" class="lnp-input lnp-input--num" placeholder="金额" required />
      </div>
      <div class="lnp-form-grid">
        <select v-model="form.account" class="lnp-input lnp-select">
          <option value="">账户（默认现金）</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.icon ? a.icon + ' ' : '' }}{{ a.name }}</option>
        </select>
        <input v-model="form.createdAt" type="date" class="lnp-input lnp-input--date" :title="'发生日期（留空记今天）'" />
        <input v-model="form.dueAt" type="date" class="lnp-input lnp-input--date" :title="'应还/应收日（可空）'" />
      </div>
      <div class="lnp-form-actions">
        <input v-model="form.note" class="lnp-input" placeholder="备注（可空）" />
        <button class="lnp-btn lnp-btn--primary" :disabled="!formValid">➕ 记一笔</button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  loanStatus,
  netSummary,
  overdueDays,
  remaining,
  type LoanDirection,
  type LoanRecord,
} from '../modules/reward/loan'
import type { Account } from '../modules/reward/accounts'

const props = defineProps<{
  records: LoanRecord[]
  accounts: Account[]
  /** 基准日期（缺省本地今天），便于测试注入 */
  today?: string
}>()

const emit = defineEmits<{
  (e: 'create', data: Omit<LoanRecord, 'id' | 'settlements'>): void
  (e: 'settle', payload: { id: string; amount: number; at: string; note?: string }): void
  (e: 'remove', id: string): void
}>()

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const today = computed(() => props.today || localToday())

const dir = ref<LoanDirection>('lend')
const sum = computed(() => netSummary(props.records, today.value))
const visible = computed(() => props.records.filter(l => l.direction === dir.value))

// ---- 新增 ----
const form = reactive({
  direction: 'lend' as LoanDirection,
  counterparty: '',
  amount: 0,
  account: '',
  createdAt: '',
  dueAt: '',
  note: '',
})
const formValid = computed(() => form.counterparty.trim().length > 0 && form.amount > 0)

function submit(): void {
  if (!formValid.value) return
  emit('create', {
    direction: form.direction,
    counterparty: form.counterparty.trim(),
    amount: form.amount,
    account: form.account || undefined,
    createdAt: form.createdAt || today.value,
    dueAt: form.dueAt || undefined,
    note: form.note.trim() || undefined,
  })
  form.counterparty = ''
  form.amount = 0
  form.dueAt = ''
  form.note = ''
}

// ---- 结算 ----
const settleFor = ref<string | null>(null)
const settleAmount = ref(0)
const settleDate = ref('')
const settleNote = ref('')

function toggleSettle(id: string): void {
  if (settleFor.value === id) {
    settleFor.value = null
    return
  }
  settleFor.value = id
  const loan = props.records.find(l => l.id === id)
  settleAmount.value = loan ? remaining(loan) : 0
  settleDate.value = ''
  settleNote.value = ''
}

function doSettle(id: string): void {
  if (!(settleAmount.value > 0)) return
  emit('settle', {
    id,
    amount: settleAmount.value,
    at: settleDate.value || today.value,
    note: settleNote.value.trim() || undefined,
  })
  settleFor.value = null
  settleAmount.value = 0
  settleDate.value = ''
  settleNote.value = ''
}
</script>

<style scoped>
.lnp-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.lnp-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.lnp-title { font-weight: 600; }
.lnp-sub { font-size: 12px; color: #8a9a7a; flex: 1; }

.lnp-summary { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.lnp-sum-item { display: flex; align-items: baseline; gap: 6px; }
.lnp-sum-label { font-size: 11px; color: #8a9a7a; }
.lnp-sum-val { font-weight: 700; font-size: 14px; }
.lnp-sum-val--lend { color: #f0c040; }
.lnp-sum-val--borrow { color: #6b9fc4; }
.lnp-sum-overdue { display: flex; gap: 6px; margin-left: auto; }
.lnp-overdue-tag {
  font-size: 11px; color: #c46a5a; border: 1px solid #7a4538; border-radius: 6px; padding: 1px 6px;
}

.lnp-tabs { display: flex; gap: 6px; margin-bottom: 10px; }
.lnp-tab {
  background: transparent; border: 1px solid #374136; color: #b7c0a8;
  border-radius: 8px; padding: 4px 14px; cursor: pointer; font-size: 12px;
}
.lnp-tab.active { background: #8a9a7a; color: #171a15; border-color: #8a9a7a; font-weight: 600; }

.lnp-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.lnp-row {
  display: flex; align-items: center; gap: 8px; font-size: 12px;
  padding: 6px 4px; border-bottom: 1px dashed #2c312b; flex-wrap: wrap;
}
.lnp-row.settled { opacity: 0.55; }
.lnp-row-main { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap; }
.lnp-cp { font-weight: 600; }
.lnp-amt { color: #f0c040; font-weight: 600; }
.lnp-rem { color: #b7c0a8; }
.lnp-rem.zero { color: #8a9a7a; text-decoration: line-through; }
.lnp-due { color: #8a9a7a; font-size: 11px; }
.lnp-due.overdue { color: #c46a5a; font-weight: 600; }
.lnp-note { color: #6b7563; font-size: 11px; }
.lnp-badge { font-size: 10px; border-radius: 6px; padding: 0 5px; }
.lnp-badge--outstanding { color: #f0c040; border: 1px solid #7a6a2a; }
.lnp-badge--settled { color: #8a9a7a; border: 1px solid #374136; }

.lnp-row-ops { display: flex; align-items: center; gap: 6px; }
.lnp-btn { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 4px 10px; cursor: pointer; font-weight: 600; font-size: 11px; }
.lnp-btn--ghost { background: transparent; border: 1px solid #374136; color: #b7c0a8; }
.lnp-btn--primary { padding: 6px 14px; font-size: 12px; }
.lnp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.lnp-del { background: none; border: none; color: #6b7563; cursor: pointer; font-size: 13px; }
.lnp-del:hover { color: #c46a5a; }

.lnp-settle {
  display: flex; gap: 6px; align-items: center; width: 100%;
  background: #1a1e18; border: 1px solid #3a443a; border-radius: 10px; padding: 8px; margin-top: 4px;
}
.lnp-empty { font-size: 12px; color: #8a9a7a; }

.lnp-form { border-top: 1px solid #2c312b; padding-top: 10px; }
.lnp-form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 6px; }
@media (max-width: 640px) { .lnp-form-grid { grid-template-columns: 1fr; } }
.lnp-form-actions { display: flex; gap: 6px; align-items: center; }
.lnp-form-actions .lnp-input { flex: 1; }
.lnp-input, .lnp-select {
  background: #161a15; border: 1px solid #374136; border-radius: 8px; color: #d9decf;
  padding: 6px 8px; font-size: 12px; min-width: 0;
}
.lnp-select { color-scheme: dark; }
.lnp-input--num { text-align: right; }
</style>
