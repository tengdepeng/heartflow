<template>
  <section class="rcp-panel" aria-label="周期记账">
    <header class="rcp-head">
      <span class="rcp-title">🔁 周期记账</span>
      <span class="rcp-sub">房租 / 工资 / 订阅按周期自动出账，到期待入账可一键入库</span>
    </header>

    <!-- 到期待入账 -->
    <div v-if="due.length" class="rcp-due">
      <div class="rcp-sec-h">⏰ 到期待入账（{{ due.length }}）</div>
      <div v-for="r in due" :key="r.id" class="rcp-due-row">
        <span class="rcp-type" :class="r.type">{{ r.type === 'income' ? '收' : '支' }}</span>
        <span class="rcp-due-main">
          <b>{{ r.name }}</b>
          <span class="rcp-meta">¥{{ r.amount.toLocaleString() }} · {{ dueLabel(r) }} · 到期 {{ r.nextRunAt }}</span>
        </span>
        <button class="rcp-btn" @click="emit('apply:rule', r)">入账</button>
        <button class="rcp-btn rcp-btn--ghost" @click="emit('skip:rule', r)">跳过</button>
      </div>
    </div>

    <!-- 规则列表 -->
    <div v-if="rules.length" class="rcp-list">
      <div v-for="r in rules" :key="r.id" class="rcp-row" :class="{ 'rcp-row--off': !r.active }">
        <span class="rcp-type" :class="r.type">{{ r.type === 'income' ? '收' : '支' }}</span>
        <span class="rcp-main">
          <b>{{ r.name }}</b>
          <span class="rcp-meta">{{ freqLabel(r) }} · ¥{{ r.amount.toLocaleString() }} · {{ accountName(r.account) }}</span>
        </span>
        <span class="rcp-run">下次 {{ r.nextRunAt }}</span>
        <button class="rcp-btn rcp-btn--icon" :title="r.active ? '停用' : '启用'" @click="toggle(r)">
          {{ r.active ? '⏸ 停用' : '▶ 启用' }}
        </button>
        <button class="rcp-del" :title="'删除 ' + r.name" @click="emit('remove:rule', r.id)">✕</button>
      </div>
    </div>
    <p v-else class="rcp-empty">还没有周期规则 —— 在下方为固定收支（房租、工资、订阅等）建一条自动出账规则。</p>

    <!-- 新增规则 -->
    <form class="rcp-form" @submit.prevent="submit">
      <div class="rcp-form-grid">
        <input v-model="form.name" class="rcp-input" placeholder="名称，如：房租" :maxlength="20" required />
        <select v-model="form.type" class="rcp-input rcp-select">
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
        <input v-model.number="form.amount" type="number" min="0.01" step="0.01" class="rcp-input" placeholder="金额" required />
        <select v-model="form.category" class="rcp-input rcp-select">
          <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.icon }} {{ c.label }}</option>
        </select>
        <select v-model="form.account" class="rcp-input rcp-select">
          <option v-for="a in accountOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <select v-model="form.freq" class="rcp-input rcp-select">
          <option value="monthly">每月</option>
          <option value="weekly">每周</option>
          <option value="yearly">每年</option>
          <option value="daily">每日</option>
        </select>
        <input v-model.number="form.interval" type="number" min="1" class="rcp-input" placeholder="间隔倍数" />
        <input v-model="form.startAt" type="date" class="rcp-input" required />
      </div>
      <div class="rcp-form-foot">
        <label class="rcp-active"><input v-model="form.active" type="checkbox" /> 启用</label>
        <button class="rcp-btn rcp-btn--primary" :disabled="!formValid">➕ 建规则</button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { dueRules, type RecurFreq, type RecurringRule } from '../modules/reward/recurring'
import { categoryOptionsFor } from '../modules/reward/custom-category'
import type { Account } from '../modules/reward/accounts'

const props = defineProps<{
  rules: RecurringRule[]
  accounts?: Account[]
  today?: string
}>()
const emit = defineEmits<{
  (e: 'create:rule', rule: Omit<RecurringRule, 'id' | 'nextRunAt'>): void
  (e: 'update:rule', payload: { id: string; patch: Partial<RecurringRule> }): void
  (e: 'remove:rule', id: string): void
  (e: 'apply:rule', rule: RecurringRule): void
  (e: 'skip:rule', rule: RecurringRule): void
}>()

const today = computed(() => props.today ?? new Date().toISOString().slice(0, 10))
const due = computed(() => dueRules(props.rules, today.value).sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt)))

const form = reactive({
  name: '',
  type: 'expense' as RecurringRule['type'],
  amount: 0,
  category: 'tools',
  account: 'cash',
  freq: 'monthly' as RecurFreq,
  interval: 1,
  startAt: new Date().toISOString().slice(0, 10),
  active: true,
})

const categories = computed(() => categoryOptionsFor(form.type))

// 类型切换或用户删除分类后，若当前分类不再可用则回退到首个可选分类
watch(categories, opts => {
  if (!opts.some(c => c.value === form.category)) {
    form.category = opts[0]?.value ?? ''
  }
}, { immediate: true })

const formValid = computed(() =>
  form.name.trim() !== '' && form.amount > 0 && form.category !== '' && form.interval >= 1,
)

const accountOptions = computed<{ id: string; name: string }[]>(() => {
  const acc = props.accounts ?? []
  return acc.length
    ? acc.map(a => ({ id: a.id, name: `${a.icon || '💳'} ${a.name}` }))
    : [
        { id: 'cash', name: '💳 现金' },
        { id: 'bank', name: '🏦 银行卡' },
        { id: 'alipay', name: '📱 支付宝' },
        { id: 'wechat', name: '💬 微信' },
        { id: 'other', name: '📋 其它' },
      ]
})

function submit(): void {
  if (!formValid.value) return
  emit('create:rule', {
    name: form.name.trim(),
    type: form.type,
    amount: form.amount,
    category: form.category,
    account: form.account,
    freq: form.freq,
    interval: Math.max(1, Math.floor(form.interval)),
    startAt: form.startAt,
    active: form.active,
  })
  form.name = ''
  form.amount = 0
  form.interval = 1
}

function toggle(r: RecurringRule): void {
  emit('update:rule', { id: r.id, patch: { active: !r.active } })
}

function freqLabel(r: RecurringRule): string {
  const t = { daily: '日', weekly: '周', monthly: '月', yearly: '年' }[r.freq]
  return `每${r.interval > 1 ? r.interval + ' ' : ''}${t}${r.interval > 1 ? '' : ''}`
}
function dueLabel(r: RecurringRule): string {
  const t = { daily: '日', weekly: '周', monthly: '月', yearly: '年' }[r.freq]
  return r.interval > 1 ? `${r.interval} ${r.freq}` : t
}
function accountName(id: string): string {
  const a = (props.accounts ?? []).find(x => x.id === id)
  return a ? a.name : id
}
</script>

<style scoped>
.rcp-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.rcp-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.rcp-title { font-weight: 600; }
.rcp-sub { font-size: 12px; color: #8a9a7a; flex: 1; }

.rcp-sec-h { font-size: 12px; color: #f0c040; font-weight: 600; margin-bottom: 6px; }

.rcp-due { background: #1a1e18; border: 1px solid #3a443a; border-radius: 10px; padding: 8px 10px; margin-bottom: 10px; }
.rcp-due-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px dashed #2c312b; }
.rcp-due-row:last-child { border-bottom: none; }
.rcp-due-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.rcp-meta { color: #6b7563; font-size: 11px; }

.rcp-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.rcp-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 5px 2px; border-bottom: 1px dashed #2c312b; }
.rcp-row--off { opacity: 0.5; }
.rcp-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.rcp-run { color: #8a9a7a; font-size: 11px; white-space: nowrap; }

.rcp-type { width: 20px; height: 20px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
.rcp-type.income { background: rgba(138, 154, 122, 0.2); color: #8a9a7a; }
.rcp-type.expense { background: rgba(196, 106, 90, 0.2); color: #c46a5a; }

.rcp-btn { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 4px 10px; cursor: pointer; font-weight: 600; font-size: 11px; }
.rcp-btn--ghost { background: transparent; border: 1px solid #374136; color: #b7c0a8; }
.rcp-btn--primary { padding: 6px 14px; font-size: 12px; }
.rcp-btn--icon { background: transparent; border: 1px solid #374136; color: #b7c0a8; }
.rcp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.rcp-del { background: none; border: none; color: #6b7563; cursor: pointer; font-size: 13px; }
.rcp-del:hover { color: #c46a5a; }

.rcp-empty { font-size: 12px; color: #8a9a7a; }

.rcp-form { border-top: 1px solid #2c312b; padding-top: 10px; }
.rcp-form-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
@media (max-width: 760px) { .rcp-form-grid { grid-template-columns: repeat(2, 1fr); } }
.rcp-input, .rcp-select {
  background: #161a15; border: 1px solid #374136; border-radius: 8px; color: #d9decf;
  padding: 6px 8px; font-size: 12px; min-width: 0;
}
.rcp-select { color-scheme: dark; }
.rcp-form-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.rcp-active { font-size: 12px; color: #b7c0a8; display: flex; align-items: center; gap: 6px; }
</style>