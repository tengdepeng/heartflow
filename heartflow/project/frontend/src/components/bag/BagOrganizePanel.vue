<template>
  <section class="bop" aria-label="背包整理">
    <div class="bop-head">
      <span class="bop-title">🎒 背包整理</span>
      <span class="bop-sub">排序策略 · 整理规则 · 清理建议 · 整理记录</span>
    </div>

    <!-- 整理概览 -->
    <div class="bop-block">
      <span class="bop-block-label">整理概览</span>
      <div class="bop-stats">
        <div class="bop-stat"><span class="bop-stat-num">{{ stats.totalRules }}</span><span class="bop-stat-label">规则</span></div>
        <div class="bop-stat"><span class="bop-stat-num">{{ stats.enabledRules }}</span><span class="bop-stat-label">启用</span></div>
        <div class="bop-stat"><span class="bop-stat-num">{{ stats.totalExecutions }}</span><span class="bop-stat-label">执行</span></div>
        <div class="bop-stat"><span class="bop-stat-num">{{ suggestions.length }}</span><span class="bop-stat-label">建议</span></div>
      </div>
      <span v-if="stats.lastExecution" class="bop-last">上次整理 {{ fmtDate(stats.lastExecution) }}</span>
    </div>

    <!-- 排序策略 -->
    <div class="bop-block">
      <span class="bop-block-label">排序策略</span>
      <div class="bop-sort-row">
        <select v-model="sortStrategy" class="bop-select" @change="applySort">
          <option v-for="s in SORT_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <button class="bop-btn" @click="toggleReverse">{{ sortConfig.reverse ? '↕ 正序' : '↕ 倒序' }}</button>
      </div>
    </div>

    <!-- 整理规则 -->
    <div class="bop-block">
      <span class="bop-block-label">整理规则 · {{ rules.length }}</span>
      <div class="bop-rule-list">
        <div v-for="r in rules" :key="r.id" class="bop-rule" :class="{ off: !r.enabled }">
          <div class="bop-rule-head">
            <span class="bop-rule-toggle" @click="toggleRule(r.id)">{{ r.enabled ? '✅' : '⬜' }}</span>
            <strong class="bop-rule-name">{{ r.name }}</strong>
            <span class="bop-rule-action">{{ ACTION_LABEL[r.action] }}</span>
            <button class="bop-btn" @click="runRule(r.id)">执行</button>
            <button class="bop-btn danger" @click="removeRule(r.id)">删除</button>
          </div>
          <p class="bop-rule-desc">{{ r.description }}</p>
        </div>
      </div>
      <div class="bop-add-row">
        <input v-model="newRuleName" class="bop-input" placeholder="新规则名称" />
        <select v-model="newRuleAction" class="bop-select">
          <option v-for="(label, val) in ACTION_LABEL" :key="val" :value="val">{{ label }}</option>
        </select>
        <button class="bop-btn" @click="addRule">添加</button>
      </div>
      <button class="bop-btn primary" @click="runAll">▶ 执行全部启用规则</button>
    </div>

    <!-- 清理建议 -->
    <div class="bop-block">
      <span class="bop-block-label">清理建议 · {{ suggestions.length }}</span>
      <div v-if="suggestions.length" class="bop-suggest-list">
        <div v-for="s in suggestions.slice(0, 8)" :key="s.id" class="bop-suggest" :class="s.severity">
          <span class="bop-suggest-sev">{{ SEV_LABEL[s.severity] }}</span>
          <span class="bop-suggest-text">{{ s.categoryName }} > {{ s.itemName }}：{{ s.description }}</span>
        </div>
      </div>
      <p v-else class="bop-empty">暂无清理建议，背包状态良好。</p>
    </div>

    <!-- 整理记录 -->
    <div class="bop-block">
      <span class="bop-block-label">整理记录 · {{ results.length }}</span>
      <div v-if="results.length" class="bop-result-list">
        <div v-for="r in results.slice(-6).reverse()" :key="r.id" class="bop-result">
          <span class="bop-result-name">{{ r.ruleName }}</span>
          <span class="bop-result-count">{{ r.affectedItems }} 项</span>
          <span class="bop-result-date">{{ fmtDate(r.executedAt) }}</span>
        </div>
      </div>
      <p v-else class="bop-empty">还没有执行过整理规则。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBagOrganize } from '../../modules/bag/organize'
import type { SortStrategy } from '../../modules/bag/organize'
import { useBagStore } from '../../modules/bag'

const organize = useBagOrganize()
const bagStore = useBagStore()

const SORT_OPTIONS: { value: SortStrategy; label: string }[] = [
  { value: 'name-asc', label: '名称 ↑' },
  { value: 'name-desc', label: '名称 ↓' },
  { value: 'proficiency-asc', label: '熟练度 ↑' },
  { value: 'proficiency-desc', label: '熟练度 ↓' },
  { value: 'recent', label: '最近使用' },
  { value: 'category', label: '按类别' },
]

const ACTION_LABEL: Record<string, string> = {
  sort: '排序',
  group: '分组',
  cleanup: '清理',
  consolidate: '合并',
}

const SEV_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const rules = computed(() => organize.rules.value)
const results = computed(() => organize.results.value)
const sortConfig = computed(() => organize.sortConfig.value)
const stats = computed(() => organize.getOrganizeStats())

const suggestions = computed(() => organize.generateCleanupSuggestions(bagStore.categories))

const sortStrategy = ref(sortConfig.value.strategy)
const newRuleName = ref('')
const newRuleAction = ref<'sort' | 'group' | 'cleanup' | 'consolidate'>('sort')

function applySort() {
  organize.setSortStrategy(sortStrategy.value)
}

function toggleReverse() {
  organize.toggleSortReverse()
}

function toggleRule(id: string) {
  organize.toggleRule(id)
}

function removeRule(id: string) {
  organize.removeRule(id)
}

function runRule(id: string) {
  organize.executeRule(id, bagStore.categories)
}

function runAll() {
  organize.executeAllEnabledRules(bagStore.categories)
}

function addRule() {
  if (!newRuleName.value.trim()) return
  organize.addRule({
    name: newRuleName.value.trim(),
    description: '自定义整理规则',
    action: newRuleAction.value,
    conditions: [],
    enabled: true,
  })
  newRuleName.value = ''
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.bop {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border, rgba(160, 124, 140, 0.25));
  border-radius: 12px;
  background: var(--surface, rgba(20, 26, 20, 0.6));
}
.bop-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bop-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #e8ece4);
}
.bop-sub {
  font-size: 12px;
  color: var(--text-dim, #9aa59a);
}
.bop-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.bop-block-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent, #a07c8c);
}
.bop-stats {
  display: flex;
  gap: 12px;
}
.bop-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}
.bop-stat-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--text, #e8ece4);
}
.bop-stat-label {
  font-size: 11px;
  color: var(--text-dim, #9aa59a);
}
.bop-last {
  font-size: 11px;
  color: var(--text-dim, #9aa59a);
}
.bop-sort-row,
.bop-add-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.bop-select,
.bop-input {
  padding: 6px 8px;
  border: 1px solid rgba(160, 124, 140, 0.25);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text, #e8ece4);
  font-size: 12px;
}
.bop-input {
  flex: 1;
}
.bop-btn {
  padding: 6px 10px;
  border: 1px solid rgba(160, 124, 140, 0.35);
  border-radius: 8px;
  background: transparent;
  color: var(--accent, #a07c8c);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.bop-btn.primary {
  background: rgba(160, 124, 140, 0.15);
}
.bop-btn.danger {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.35);
}
.bop-rule-list,
.bop-suggest-list,
.bop-result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bop-rule {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.bop-rule.off {
  opacity: 0.55;
}
.bop-rule-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bop-rule-toggle {
  cursor: pointer;
  font-size: 13px;
}
.bop-rule-name {
  font-size: 13px;
  color: var(--text, #e8ece4);
  flex: 1;
}
.bop-rule-action {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(160, 124, 140, 0.15);
  color: var(--text-dim, #9aa59a);
}
.bop-rule-desc {
  font-size: 12px;
  color: var(--text-dim, #9aa59a);
  margin: 0;
}
.bop-suggest {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.bop-suggest-sev {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  white-space: nowrap;
}
.bop-suggest.high .bop-suggest-sev {
  background: rgba(196, 106, 90, 0.2);
  color: #c46a5a;
}
.bop-suggest.medium .bop-suggest-sev {
  background: rgba(240, 192, 64, 0.2);
  color: #f0c040;
}
.bop-suggest.low .bop-suggest-sev {
  background: rgba(138, 154, 122, 0.2);
  color: #8a9a7a;
}
.bop-suggest-text {
  color: var(--text-dim, #9aa59a);
  flex: 1;
}
.bop-result {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.bop-result-name {
  color: var(--text, #e8ece4);
  flex: 1;
}
.bop-result-count {
  color: var(--accent, #a07c8c);
}
.bop-result-date {
  color: var(--text-dim, #9aa59a);
}
.bop-empty {
  font-size: 12px;
  color: var(--text-dim, #9aa59a);
  margin: 0;
}
</style>
