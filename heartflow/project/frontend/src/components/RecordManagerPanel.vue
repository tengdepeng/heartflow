<template>
  <section class="rmp-panel" aria-label="记账明细">
    <header class="rmp-head">
      <span class="rmp-title">📋 记账明细</span>
      <span class="rmp-sub">标签 / 账户 / 归档滤镜 · 按时间 / 金额 / 类别排序</span>
      <span class="rmp-count">{{ result.total }} 条</span>
    </header>

    <!-- 筛选条 -->
    <div class="rmp-filters">
      <input v-model="keyword" class="rmp-search" placeholder="搜索备注 / 类别 / 标签…" />
      <select v-model="tagFilter" class="rmp-tag rmp-select">
        <option value="">全部标签</option>
        <option v-for="t in tagOptions" :key="t" :value="t">{{ t }} · {{ tagCountsMap[t] }}</option>
      </select>
      <select v-model="accountFilter" class="rmp-account rmp-select">
        <option value="">全部账户</option>
        <option v-for="a in accountOpts" :key="a" :value="a">{{ accountName(a) }}</option>
      </select>
      <select v-model="sortField" class="rmp-sort rmp-select">
        <option value="at">按时间</option>
        <option value="amount">按金额</option>
        <option value="category">按类别</option>
      </select>
      <button class="rmp-order" @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'">
        {{ sortOrder === 'desc' ? '↓ 降序' : '↑ 升序' }}
      </button>
      <label class="rmp-archive">
        <input type="checkbox" v-model="showArchived" />
        含已归档
      </label>
    </div>

    <!-- 明细表单 -->
    <div v-if="result.records.length" class="rmp-list">
      <div v-for="r in result.records" :key="r.id" class="rmp-row" :class="{ 'rmp-row--archived': r.archived }">
        <span class="rmp-type" :class="'rmp-type--' + r.type">{{ r.type === 'income' ? '收' : '支' }}</span>
        <span class="rmp-main">
          <span class="rmp-cat">{{ catIcon(r.category) }} {{ categoryLabel(r.category) }}</span>
          <span class="rmp-desc">{{ r.description || '—' }}</span>
        </span>
        <span class="rmp-tags">
          <i v-for="t in r.tags" :key="t" class="rmp-chip">{{ t }}</i>
        </span>
        <span class="rmp-account">{{ accountName(r.account ?? 'cash') }}</span>
        <span class="rmp-amount" :class="r.type">{{ signed(r) }}</span>
        <span class="rmp-date">{{ dateLabel(r.at) }}</span>
        <button class="rmp-archive-btn" @click="toggleArchive(r.id)">{{ r.archived ? '↩ 恢复' : '🗄 归档' }}</button>
      </div>
    </div>
    <p v-else class="rmp-empty">没有符合条件的记录。</p>

    <!-- 分页 -->
    <footer v-if="result.totalPages > 1" class="rmp-pager">
      <button :disabled="page <= 1" @click="page--">‹ 上一页</button>
      <span>{{ page }} / {{ result.totalPages }}</span>
      <button :disabled="page >= result.totalPages" @click="page++">下一页 ›</button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  applyRecordFilter,
  tagCounts,
  accountOptions,
  type RecordSortField,
  type RecordSortOrder,
} from '../modules/reward/record-detail'
import { useAccounts } from '../modules/reward/accounts'
import { categoryLabelAny, categoryIconAny } from '../modules/reward/custom-category'
import type { RewardRecord } from '../modules/reward/reward-list'

const props = defineProps<{ records: RewardRecord[] }>()
const emit = defineEmits<{ (e: 'update:records', list: RewardRecord[]): void }>()

const ua = useAccounts()
const accounts = ua.accounts

const keyword = ref('')
const tagFilter = ref('')
const accountFilter = ref('')
const showArchived = ref(false)
const sortField = ref<RecordSortField>('at')
const sortOrder = ref<RecordSortOrder>('desc')
const page = ref(1)

const tagCountsMap = computed(() => tagCounts(props.records))
const tagOptions = computed(() => Object.keys(tagCountsMap.value))
const accountOpts = computed(() => {
  const fromRecords = accountOptions(props.records)
  const fromAccounts = accounts.value.map(a => a.id)
  return Array.from(new Set([...fromRecords, ...fromAccounts]))
})

const result = computed(() =>
  applyRecordFilter(props.records, {
    keyword: keyword.value,
    tag: tagFilter.value || undefined,
    account: accountFilter.value || undefined,
    showArchived: showArchived.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    page: page.value,
    pageSize: 12,
  }),
)

// 任何筛选条件变化都回到第一页
watch([keyword, tagFilter, accountFilter, showArchived, sortField, sortOrder], () => {
  page.value = 1
})

function toggleArchive(id: string): void {
  emit(
    'update:records',
    props.records.map(r => (r.id === id ? { ...r, archived: !r.archived } : r)),
  )
}

// 分类标签/图标由自定义分类引擎统一解析（含内置种子与用户自定义）
function categoryLabel(cat: string): string {
  return categoryLabelAny(cat)
}
function catIcon(cat: string): string {
  return categoryIconAny(cat)
}
function accountName(id: string): string {
  return accounts.value.find(a => a.id === id)?.name ?? id
}
function signed(r: RewardRecord): string {
  return (r.type === 'income' ? '+' : '−') + '¥' + fmt(r.amount)
}
function fmt(n: number): string {
  return Math.round(Math.abs(n)).toLocaleString()
}
function dateLabel(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.rmp-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.rmp-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.rmp-title { font-weight: 600; }
.rmp-sub { font-size: 12px; color: #8a9a7a; flex: 1; }
.rmp-count { font-size: 12px; color: #8a9a7a; }

.rmp-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.rmp-search {
  flex: 1;
  min-width: 140px;
  background: #161a15;
  border: 1px solid #374136;
  border-radius: 8px;
  color: #d9decf;
  padding: 6px 8px;
  font-size: 12px;
}
.rmp-search::placeholder { color: #6b7563; }
.rmp-select {
  background: #161a15;
  border: 1px solid #374136;
  border-radius: 8px;
  color: #d9decf;
  padding: 6px 8px;
  font-size: 12px;
  color-scheme: dark;
  cursor: pointer;
}
.rmp-order {
  background: #161a15;
  border: 1px solid #374136;
  border-radius: 8px;
  color: #b7c0a8;
  padding: 6px 8px;
  font-size: 12px;
  cursor: pointer;
}
.rmp-archive {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #8a9a7a;
  cursor: pointer;
}

.rmp-list { display: flex; flex-direction: column; }
.rmp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 2px;
  border-bottom: 1px dashed #2c312b;
  font-size: 12px;
}
.rmp-row--archived { opacity: 0.55; }
.rmp-type {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
}
.rmp-type--income { background: rgba(138, 154, 122, 0.2); color: #8a9a7a; }
.rmp-type--expense { background: rgba(196, 106, 90, 0.2); color: #c46a5a; }
.rmp-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.rmp-cat { color: #d9decf; font-weight: 500; }
.rmp-desc {
  color: #8a9a7a;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rmp-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.rmp-chip {
  font-style: normal;
  background: rgba(107, 159, 196, 0.16);
  color: #9cc4e0;
  border-radius: 6px;
  padding: 1px 6px;
  font-size: 10px;
}
.rmp-account { color: #8a9a7a; font-size: 11px; white-space: nowrap; }
.rmp-amount { font-weight: 600; white-space: nowrap; }
.rmp-amount.income { color: #8a9a7a; }
.rmp-amount.expense { color: #c46a5a; }
.rmp-date { color: #6b7563; font-size: 11px; white-space: nowrap; }
.rmp-archive-btn {
  background: none;
  border: 1px solid #374136;
  border-radius: 6px;
  color: #8a9a7a;
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
  white-space: nowrap;
}
.rmp-archive-btn:hover { border-color: #8a9a7a; color: #d9decf; }

.rmp-empty { font-size: 12px; color: #6b7563; text-align: center; padding: 12px 0; }

.rmp-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
  font-size: 12px;
  color: #8a9a7a;
}
.rmp-pager button {
  background: #161a15;
  border: 1px solid #374136;
  border-radius: 8px;
  color: #d9decf;
  padding: 5px 12px;
  cursor: pointer;
}
.rmp-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>