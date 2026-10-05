<template>
  <section class="ex-panel" aria-label="数据导出">
    <header class="ex-head">
      <span class="ex-title">📤 导出账本</span>
      <span class="ex-sub">Excel(.xls) / CSV · 全量或按时间段</span>
    </header>

    <div class="ex-toolbar">
      <select v-model="scope" class="ex-input">
        <option value="all">全部记录</option>
        <option value="month">指定月份</option>
        <option value="range">自定义区间</option>
      </select>

      <template v-if="scope === 'month'">
        <input v-model="month" type="month" class="ex-input" />
      </template>
      <template v-else-if="scope === 'range'">
        <input v-model="from" type="date" class="ex-input" />
        <span class="ex-to">至</span>
        <input v-model="to" type="date" class="ex-input" />
      </template>

      <select v-model="format" class="ex-input">
        <option value="xls">Excel (.xls)</option>
        <option value="csv">CSV</option>
      </select>

      <button class="ex-btn" :disabled="!canExport" @click="doExport">
        导出 {{ countLabel }}（{{ rowCount }} 条）
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { buildExportRows, toCsv, toExcelXls, downloadText, type ExportScope } from '../modules/reward/export'
import { categoryLabelAny } from '../modules/reward/custom-category'
import type { Account } from '../modules/reward/accounts'
import type { RewardRecord } from '../modules/reward/reward-list'
import { getLocalMonthKey } from '../utils/time'

const props = defineProps<{ records: RewardRecord[]; accounts?: Account[] }>()

const scope = ref<ExportScope>('all')
const month = ref(getLocalMonthKey())
const from = ref('')
const to = ref('')
const format = ref<'xls' | 'csv'>('xls')

function resolveAccountName(id: string): string {
  const hit = props.accounts?.find(a => a.id === id)
  return hit ? hit.name : id
}

const rows = computed(() =>
  buildExportRows(props.records, {
    scope: scope.value,
    month: month.value,
    from: from.value,
    to: to.value,
    categoryLabel: categoryLabelAny,
    accountName: resolveAccountName,
  }),
)

const rowCount = computed(() => rows.value.length)

const countLabel = computed(() => {
  switch (scope.value) {
    case 'month': return `${month.value} 月`
    case 'range': return `${from.value || '?'} ~ ${to.value || '?'}`
    default: return '全部'
  }
})

const canExport = computed(() => {
  if (rows.value.length === 0) return false
  if (scope.value === 'range' && (!from.value || !to.value || from.value > to.value)) return false
  return true
})

function doExport(): void {
  const stem = scope.value === 'month' ? month.value : scope.value === 'range' ? `${from.value}_${to.value}` : '全部账本'
  const filename = `收支明细_${stem}.${format.value}`
  if (format.value === 'xls') {
    downloadText(filename, toExcelXls(rows.value), 'application/vnd.ms-excel;charset=utf-8')
  } else {
    downloadText(filename, toCsv(rows.value), 'text/csv;charset=utf-8')
  }
}
</script>

<style scoped>
.ex-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.ex-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.ex-title { font-weight: 600; }
.ex-sub { font-size: 12px; color: #8a9a7a; flex: 1; min-width: 120px; }

.ex-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ex-input {
  flex: none; background: #101310; border: 1px solid #374136; border-radius: 8px;
  color: #d9decf; padding: 6px 9px; font-size: 12px; font-family: inherit; color-scheme: dark;
}
.ex-to { font-size: 11px; color: #8a9a7a; }
.ex-btn {
  margin-left: auto; background: #8a9a7a; color: #171a15; border: none; border-radius: 8px;
  padding: 6px 14px; font-weight: 600; cursor: pointer; font-size: 12px;
}
.ex-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>