<template>
  <section class="amp-panel" aria-label="多账户">
    <header class="amp-head">
      <span class="amp-title">👛 多账户</span>
      <span class="amp-sub">分账本记账 · 账户间自由流转</span>
    </header>

    <div class="amp-form">
      <input v-model="form.name" class="amp-input" placeholder="账户名，如：支付宝" :maxlength="12" />
      <select v-model="form.type" class="amp-input amp-select">
        <option v-for="(label, t) in TYPE_LABEL" :key="t" :value="t">{{ label }}</option>
      </select>
      <input
        v-model.number="form.initialBalance"
        type="number" min="0" class="amp-input amp-input-num"
        placeholder="初始余额"
      />
      <button class="amp-btn amp-btn-primary" :disabled="!form.name.trim()" @click="addAccount">新建</button>
    </div>

    <ul v-if="summaries.length" class="amp-list">
      <li v-for="s in summaries" :key="s.account.id" class="amp-row">
        <span class="amp-row-name">{{ s.account.icon || '💳' }} {{ s.account.name }}</span>
        <span class="amp-row-type">{{ TYPE_LABEL[s.account.type] }}</span>
        <span class="amp-row-bal" :class="s.balance < 0 ? 'neg' : 'pos'">
          ¥{{ s.balance.toLocaleString() }}
        </span>
        <button class="amp-del" :title="'删除 ' + s.account.name" @click="removeAccount(s.account.id)">✕</button>
      </li>
    </ul>
    <p v-else class="amp-empty">
      还没有账户 —— 新建一个开始分账本记账（导入账单时支付宝 / 微信账户会自动创建）
    </p>

    <div v-if="summaries.length >= 2" class="amp-sec">
      <div class="amp-sec-h">↔️ 账户间转账</div>
      <div class="amp-form amp-form-transfer">
        <select v-model="tForm.from" class="amp-input amp-select">
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <span class="amp-arrow">→</span>
        <select v-model="tForm.to" class="amp-input amp-select">
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <input v-model.number="tForm.amount" type="number" min="0" class="amp-input amp-input-num" placeholder="金额" />
        <button class="amp-btn amp-btn-transfer" :disabled="!validTransfer" @click="doTransfer">转账</button>
      </div>
      <p v-if="tForm.from === tForm.to" class="amp-warn">转出与转入不能是同一账户</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAccounts, type AccountSummary, type AccountType } from '../modules/reward/accounts'
import type { RewardRecord } from '../modules/reward/reward-list'

const props = defineProps<{ records: RewardRecord[] }>()
const emit = defineEmits<{ change: [] }>()

const TYPE_LABEL: Record<AccountType, string> = {
  cash: '现金',
  bank: '银行卡',
  savings: '储蓄',
  alipay: '支付宝',
  wechat: '微信',
  other: '其它',
}

const ua = useAccounts()
const accounts = ua.accounts
const { accountBalance, create, remove, createTransfer } = ua

// 外部(导入)可能直接写存储；records 变化时重读账户，避免本面板双实例缓存失步
watch(
  () => props.records,
  () => ua.load(),
)

const form = ref<{ name: string; type: AccountType; initialBalance: number }>({
  name: '',
  type: 'cash',
  initialBalance: 0,
})
const tForm = ref<{ from: string; to: string; amount: number }>({ from: 'cash', to: 'cash', amount: 0 })

const summaries = computed<AccountSummary[]>(() =>
  accounts.value.map(a => ({ account: a, balance: accountBalance(a.id, props.records) })),
)
const validTransfer = computed(() => {
  const { from, to, amount } = tForm.value
  return (
    from !== to &&
    amount > 0 &&
    accounts.value.some(a => a.id === from) &&
    accounts.value.some(a => a.id === to)
  )
})

function addAccount(): void {
  create({ name: form.value.name.trim(), type: form.value.type, initialBalance: form.value.initialBalance || 0 })
  form.value.name = ''
  form.value.initialBalance = 0
  emit('change')
}
function removeAccount(id: string): void {
  remove(id)
  emit('change')
}
function doTransfer(): void {
  createTransfer(tForm.value.from, tForm.value.to, tForm.value.amount, new Date().toISOString())
  tForm.value.amount = 0
  emit('change')
}
</script>

<style scoped>
.amp-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.amp-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; }
.amp-title { font-weight: 600; }
.amp-sub { font-size: 12px; color: #8a9a7a; }
.amp-form {
  display: grid;
  grid-template-columns: 1fr 96px 86px auto;
  gap: 6px;
  margin-bottom: 8px;
}
.amp-input {
  background: #161a15;
  border: 1px solid #374136;
  border-radius: 8px;
  color: #d9decf;
  padding: 6px 8px;
  font-size: 13px;
}
.amp-input-num { min-width: 70px; }
.amp-select { color-scheme: dark; }
.amp-btn {
  background: #8a9a7a;
  color: #171a15;
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-weight: 600;
}
.amp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.amp-btn-transfer { background: #6b9fc4; }
.amp-list { list-style: none; padding: 0; margin: 8px 0; }
.amp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 2px;
  border-bottom: 1px dashed #333a33;
}
.amp-row-name { flex: 1; }
.amp-row-type { font-size: 11px; color: #8a9a7a; width: 64px; }
.amp-row-bal { font-weight: 600; }
.amp-row-bal.neg { color: #c46a5a; }
.amp-row-bal.pos { color: #8a9a7a; }
.amp-del { background: none; border: none; color: #8a9a7a; cursor: pointer; }
.amp-empty { font-size: 12px; color: #8a9a7a; }
.amp-sec { margin-top: 12px; }
.amp-sec-h { margin-bottom: 6px; color: #8a9a7a; font-size: 13px; }
.amp-form-transfer { grid-template-columns: 1fr auto 1fr 86px auto; }
.amp-arrow { color: #8a9a7a; align-self: center; }
.amp-warn { font-size: 12px; color: #c46a5a; margin: 4px 0 0; }
</style>