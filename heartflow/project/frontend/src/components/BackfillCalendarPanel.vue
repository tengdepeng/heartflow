<template>
  <section class="bc-panel" aria-label="日历跨天补账">
    <header class="bc-head">
      <span class="bc-title">📅 日历补账</span>
      <span class="bc-sub">逐日回填 · 跨天补记 · 点击日期查看/补录</span>
    </header>

    <div class="bc-toolbar">
      <button class="bc-nav" @click="shift(-1)">‹ 上月</button>
      <span class="bc-title2">{{ curYear }}年{{ curMonth + 1 }}月</span>
      <button class="bc-nav" @click="shift(1)">下月 ›</button>
      <span class="bc-month-total">本月 {{ monthStats.count }} 笔 · 支出 ¥{{ fmt(monthStats.expense) }}</span>
    </div>

    <div class="bc-weekbar">
      <span v-for="w in WEEK_HEAD" :key="w" class="bc-wk">{{ w }}</span>
    </div>

    <div class="bc-grid">
      <button
        v-for="d in cells"
        :key="d.key"
        :class="['bc-cell', { empty: !d.inMonth, has: d.inMonth && d.has, selected: d.key === selectedKey }]"
        :disabled="!d.inMonth"
        @click="select(d)"
      >
        <span class="bc-num">{{ d.day }}</span>
        <span v-if="d.inMonth" class="bc-amt" :class="d.net < 0 ? 'neg' : 'pos'">{{ d.has ? fmtNet(d.net) : '' }}</span>
      </button>
    </div>

    <!-- 选中日详情 + 补账 -->
    <div v-if="selectedKey" class="bc-detail">
      <div class="bc-detail-head">
        <span class="bc-detail-title">{{ selectedKey }} · {{ selectedRecords.length }} 笔</span>
        <span class="bc-detail-net" :class="selectedNet < 0 ? 'neg' : 'pos'">净 {{ fmtNet(selectedNet) }}</span>
      </div>

      <ul class="bc-records">
        <li v-for="r in selectedRecords" :key="r.id" class="bc-rec">
          <span class="bc-rec-type" :class="r.type">{{ r.type === 'income' ? '收' : '支' }}</span>
          <span class="bc-rec-cat">{{ label(r.category) }}</span>
          <span class="bc-rec-amt" :class="r.type">{{ r.type === 'income' ? '+' : '-' }}{{ fmt(r.amount) }}</span>
          <span class="bc-rec-desc">{{ r.description }}</span>
          <button class="bc-del" @click="removeRec(r.id)">✕</button>
        </li>
      </ul>
      <p v-if="!selectedRecords.length" class="bc-empty">这一天还没有记录。</p>

      <!-- 补录表单 -->
      <form class="bc-form" @submit.prevent="addRecord">
        <div class="bc-form-row">
          <button
            :class="['bc-type', { on: addType === 'income' }]"
            type="button"
            @click="addType = 'income'"
          >收</button>
          <button
            :class="['bc-type', { on: addType === 'expense' }]"
            type="button"
            @click="addType = 'expense'"
          >支</button>
          <input v-model.number="addAmount" type="number" min="1" class="bc-input" placeholder="金额" />
          <select v-model="addCategory" class="bc-input">
            <option value="" disabled>类别</option>
            <option v-for="c in catOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div class="bc-form-row">
          <input v-model="addDesc" class="bc-input bc-desc" placeholder="备注（可选）" />
          <button class="bc-save" :disabled="!addValid">补记昨日</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getLocalMonthKey } from '../utils/time'
import { categoryOptionsFor, categoryLabelAny } from '../modules/reward/custom-category'
import type { RewardRecord } from '../modules/reward/reward-list'

const props = defineProps<{ records: RewardRecord[] }>()
const emit = defineEmits<{ 'update:records': [list: RewardRecord[]] }>()

const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日']

const now = new Date()
const curYear = ref(now.getFullYear())
const curMonth = ref(now.getMonth()) // 0-11
const selectedKey = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)

const addType = ref<'income' | 'expense'>('income')
const addAmount = ref(0)
const addCategory = ref('')
const addDesc = ref('')

const catOptions = computed(() => categoryOptionsFor(addType.value))

interface Cell {
  key: string
  day: number
  inMonth: boolean
  has: boolean
  net: number
}

const cells = computed<Cell[]>(() => {
  const first = new Date(curYear.value, curMonth.value, 1)
  const startDow = (first.getDay() + 6) % 7 // 周一=0
  const daysInMonth = new Date(curYear.value, curMonth.value + 1, 0).getDate()
  const dayMap = new Map<string, number>()
  for (const r of props.records) {
    const k = r.at.slice(0, 10)
    if (k.startsWith(`${curYear.value}-${String(curMonth.value + 1).padStart(2, '0')}`)) {
      dayMap.set(k, (dayMap.get(k) ?? 0) + (r.type === 'income' ? r.amount : -r.amount))
    }
  }
  const out: Cell[] = []
  for (let i = 0; i < startDow; i++) {
    out.push({ key: `ph-${i}`, day: 0, inMonth: false, has: false, net: 0 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${curYear.value}-${String(curMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    out.push({ key, day: d, inMonth: true, has: dayMap.has(key), net: dayMap.get(key) ?? 0 })
  }
  return out
})

const monthStats = computed(() => {
  let count = 0
  let expense = 0
  const prefix = `${curYear.value}-${String(curMonth.value + 1).padStart(2, '0')}`
  for (const r of props.records) {
    if (getLocalMonthKey(r.at) === prefix) {
      count++
      if (r.type === 'expense') expense += r.amount
    }
  }
  return { count, expense }
})

const selectedRecords = computed(() =>
  props.records.filter(r => r.at.slice(0, 10) === selectedKey.value),
)
const selectedNet = computed(() => selectedRecords.value.reduce((s, r) => s + (r.type === 'income' ? r.amount : -r.amount), 0))

const addValid = computed(() => addCategory.value && addAmount.value > 0)

function shift(delta: number): void {
  let m = curMonth.value + delta
  let y = curYear.value
  if (m < 0) { m = 11; y-- }
  else if (m > 11) { m = 0; y++ }
  curMonth.value = m
  curYear.value = y
}
function select(c: Cell): void {
  if (!c.inMonth) return
  selectedKey.value = c.key
  addAmount.value = 0
  addCategory.value = ''
  addDesc.value = ''
}
function label(cat: string): string {
  return categoryLabelAny(cat)
}
function fmt(n: number): string {
  return Math.round(Math.abs(n)).toLocaleString()
}
function fmtNet(n: number): string {
  return n >= 0 ? '+' + fmt(n) : '-' + fmt(n)
}
function removeRec(id: string): void {
  emit('update:records', props.records.filter(r => r.id !== id))
}
function addRecord(): void {
  if (!addValid.value) return
  const at = `${selectedKey.value}T12:00:00`
  const rec: RewardRecord = {
    id: `bc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type: addType.value,
    category: addCategory.value,
    amount: addAmount.value,
    description: addDesc.value.trim(),
    at,
  }
  emit('update:records', [...props.records, rec])
  addAmount.value = 0
  addCategory.value = ''
  addDesc.value = ''
}
</script>

<style scoped>
.bc-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.bc-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.bc-title { font-weight: 600; }
.bc-sub { font-size: 12px; color: #8a9a7a; flex: 1; min-width: 120px; }

.bc-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.bc-title2 { font-size: 14px; font-weight: 600; color: #e8c060; }
.bc-nav { background: #161a15; border: 1px solid #374136; color: #b7c0a8; border-radius: 8px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
.bc-nav:hover { border-color: #4a5243; }
.bc-month-total { margin-left: auto; font-size: 12px; color: #8a9a7a; }

.bc-weekbar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
.bc-wk { text-align: center; font-size: 11px; color: #6b7563; }

.bc-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.bc-cell {
  aspect-ratio: 1.15; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #101310; border: 1px solid #2b3129; border-radius: 6px; cursor: pointer;
  color: #6b7563; font-size: 11px; position: relative;
}
.bc-cell.empty { background: transparent; border: none; cursor: default; }
.bc-cell.has { border-color: #4a5243; }
.bc-cell.selected { border-color: #e8c060; }
.bc-num { font-weight: 600; color: #b7c0a8; }
.bc-amt { font-size: 9px; }
.bc-amt.pos { color: #8a9a7a; }
.bc-amt.neg { color: #c46a5a; }

.bc-detail { margin-top: 12px; background: #161a15; border-radius: 10px; padding: 12px; }
.bc-detail-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
.bc-detail-title { color: #b7c0a8; font-weight: 600; }
.bc-detail-net.pos { color: #8a9a7a; }
.bc-detail-net.neg { color: #c46a5a; }

.bc-records { margin: 0 0 8px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.bc-rec { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #b7c0a8; }
.bc-rec-type { font-size: 10px; border-radius: 4px; padding: 1px 5px; }
.bc-rec-type.income { background: rgba(138, 154, 122, 0.2); color: #8a9a7a; }
.bc-rec-type.expense { background: rgba(196, 106, 90, 0.2); color: #c46a5a; }
.bc-rec-amt.income { color: #8a9a7a; font-weight: 600; }
.bc-rec-amt.expense { color: #c46a5a; font-weight: 600; }
.bc-rec-desc { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #6b7563; }
.bc-del { background: none; border: none; color: #6b7563; cursor: pointer; }
.bc-del:hover { color: #c46a5a; }
.bc-empty { font-size: 12px; color: #6b7563; margin: 0 0 8px; }

.bc-form { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #2b3129; padding-top: 10px; }
.bc-form-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.bc-type {
  border: 1px solid #333a33; background: transparent; color: #8a9a7a; border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 12px;
}
.bc-type.on { background: #2b3129; color: #e8c060; border-color: #4a5243; }
.bc-input {
  flex: 1; min-width: 80px; background: #101310; border: 1px solid #374136; border-radius: 8px;
  color: #d9decf; padding: 6px 9px; font-size: 12px; font-family: inherit;
}
.bc-desc { flex: 2; }
.bc-save { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 6px 14px; font-weight: 600; cursor: pointer; font-size: 12px; }
.bc-save:disabled { opacity: 0.4; cursor: not-allowed; }
</style>