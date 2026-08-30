<template>
  <section class="msp-panel" aria-label="月结单">
    <header class="msp-head">
      <span class="msp-title">📄 月结单</span>
      <span class="msp-sub">月度收支汇总 · 可导出 Markdown / CSV</span>
    </header>

    <div class="msp-toolbar">
      <input type="month" v-model="month" class="msp-month" />
      <span class="msp-date-hint">{{ monthLabel }} 共 {{ st.count }} 笔</span>
    </div>

    <div v-if="hasData" class="msp-cards">
      <div class="msp-card">
        <span class="msp-k">收入</span>
        <span class="msp-v pos">¥{{ fmt(st.income) }}</span>
      </div>
      <div class="msp-card">
        <span class="msp-k">支出</span>
        <span class="msp-v neg">¥{{ fmt(st.expense) }}</span>
      </div>
      <div class="msp-card">
        <span class="msp-k">净结余</span>
        <span class="msp-v" :class="st.balance >= 0 ? 'pos' : 'neg'">¥{{ fmt(st.balance) }}</span>
      </div>
    </div>

    <div v-if="hasData && st.categoryTop.length" class="msp-top">
      <div class="msp-sec-h">支出类别 TOP</div>
      <ol class="msp-toplist">
        <li v-for="c in st.categoryTop" :key="c.category" class="msp-top-it">
          <span>{{ categoryLabel(c.category) }}</span>
          <b>¥{{ fmt(c.amount) }}</b>
        </li>
      </ol>
    </div>

    <p v-if="!hasData" class="msp-empty">该月份暂无记录。</p>

    <div v-if="hasData" class="msp-actions">
      <button class="msp-btn" @click="exportMd">导出 Markdown</button>
      <button class="msp-btn msp-btn--alt" @click="exportCsv">导出 CSV</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { monthStatement, toMarkdown, toCsv } from '../modules/reward/statement'
import { categoryLabelAny } from '../modules/reward/custom-category'
import type { RewardRecord } from '../modules/reward/reward-list'

const props = defineProps<{ records: RewardRecord[] }>()

const month = ref(new Date().toISOString().slice(0, 7))

const st = computed(() => monthStatement(props.records, month.value))
const hasData = computed(() => st.value.count > 0)
const monthLabel = computed(() => month.value.replace('-', ' 年 ') + ' 月')

function categoryLabel(cat: string): string {
  return categoryLabelAny(cat)
}
function fmt(n: number): string {
  return Math.round(Math.abs(n)).toLocaleString()
}
function download(name: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
function exportMd(): void {
  download(`${month.value}.md`, toMarkdown(st.value), 'text/markdown;charset=utf-8')
}
function exportCsv(): void {
  download(`${month.value}.csv`, toCsv(st.value), 'text/csv;charset=utf-8')
}
</script>

<style scoped>
.msp-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.msp-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.msp-title { font-weight: 600; }
.msp-sub { font-size: 12px; color: #8a9a7a; flex: 1; }

.msp-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.msp-month {
  background: #161a15;
  border: 1px solid #374136;
  border-radius: 8px;
  color: #d9decf;
  padding: 6px 8px;
  font-size: 13px;
  color-scheme: dark;
}
.msp-date-hint { font-size: 12px; color: #8a9a7a; }

.msp-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.msp-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #161a15;
  border-radius: 10px;
  padding: 10px 12px;
}
.msp-k { font-size: 11px; color: #8a9a7a; }
.msp-v { font-size: 17px; font-weight: 600; }
.msp-v.pos { color: #8a9a7a; }
.msp-v.neg { color: #c46a5a; }

.msp-top { margin-bottom: 12px; }
.msp-sec-h { color: #8a9a7a; font-size: 13px; margin-bottom: 6px; }
.msp-toplist { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.msp-top-it { font-size: 13px; color: #b7c0a8; }
.msp-top-it b { float: right; color: #d9decf; }

.msp-empty { font-size: 12px; color: #6b7563; }

.msp-actions { display: flex; gap: 8px; }
.msp-btn {
  background: #8a9a7a;
  color: #171a15;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 12px;
}
.msp-btn--alt { background: #6b9fc4; }
</style>