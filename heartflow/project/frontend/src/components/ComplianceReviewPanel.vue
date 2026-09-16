<template>
  <section class="crv-panel">
    <header class="crv-head">
      <div class="crv-head-text">
        <h3 class="crv-title">合规审查 · 宪法体检表</h3>
        <p class="crv-sub">仅 auto 项真实探测，manual 项须人工核验</p>
      </div>
      <button class="crv-btn-primary" type="button" :disabled="isLoading" @click="runAuto">
        {{ isLoading ? '检查中…' : '运行自动检查' }}
      </button>
    </header>

    <div class="crv-progress">
      <div class="crv-progress-bar">
        <div class="crv-progress-fill" :style="{ width: progress.percentage + '%' }"></div>
      </div>
      <span class="crv-progress-text">
        已核验 {{ progress.checked }} / {{ progress.total }}（通过 {{ progress.passed }} · 未通过 {{ progress.failed }}）
      </span>
    </div>

    <div class="crv-groups">
      <div v-for="group in categories" :key="group.key" class="crv-cat">
        <h4 class="crv-cat-title">
          <span class="crv-cat-icon">{{ group.icon }}</span>
          {{ group.label }}
        </h4>
        <ul class="crv-items">
          <li v-for="item in group.items" :key="item.id" class="crv-item" :class="`crv-item--${statusKey(item.passed)}`">
            <div class="crv-item-main">
              <span class="crv-item-title">{{ item.title }}</span>
              <span class="crv-method" :class="`crv-method--${item.checkMethod}`">
                {{ item.checkMethod === 'auto' ? '自动' : '人工' }}
              </span>
            </div>
            <p class="crv-item-desc">{{ item.description }}</p>
            <div class="crv-item-actions">
              <span class="crv-status" :class="`crv-status--${statusKey(item.passed)}`">{{ statusText(item.passed) }}</span>
              <button class="crv-btn-pass" type="button" @click="mark(item, true)">通过</button>
              <button class="crv-btn-fail" type="button" @click="mark(item, false)">未通过</button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useComplianceReview, CHECKLIST_CATEGORIES } from '@/modules/constitution/compliance-review'
import type { ChecklistCategory, ChecklistItem } from '@/modules/constitution/compliance-review'

const { checklist, initChecklist, runChecklist, markChecklistItem, getChecklistProgress, isLoading } =
  useComplianceReview()

onMounted(() => {
  initChecklist()
})

interface CategoryGroup {
  key: string
  label: string
  icon: string
  items: ChecklistItem[]
}

const categories = computed<CategoryGroup[]>(() => {
  const groups: Record<string, ChecklistItem[]> = {}
  for (const item of checklist.value) {
    ;(groups[item.category] ??= []).push(item)
  }
  return Object.entries(groups).map(([cat, items]) => ({
    key: cat,
    label: CHECKLIST_CATEGORIES[cat as ChecklistCategory]?.label ?? cat,
    icon: CHECKLIST_CATEGORIES[cat as ChecklistCategory]?.icon ?? '',
    items,
  }))
})

const progress = computed(() => getChecklistProgress())

function statusKey(p: boolean | null): 'none' | 'pass' | 'fail' {
  return p === null ? 'none' : p ? 'pass' : 'fail'
}

function statusText(p: boolean | null): string {
  return p === null ? '未核验' : p ? '通过' : '未通过'
}

function runAuto() {
  runChecklist()
}

function mark(item: ChecklistItem, passed: boolean) {
  markChecklistItem(item.id, passed)
}
</script>

<style scoped>
.crv-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}
.crv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.crv-head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.crv-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.crv-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}
.crv-btn-primary {
  align-self: flex-start;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: calc(var(--radius-lg) * 0.6);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}
.crv-btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}
.crv-btn-primary:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.crv-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.crv-progress-bar {
  height: 6px;
  border-radius: 999px;
  background: var(--card-bg);
  overflow: hidden;
}
.crv-progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s ease;
}
.crv-progress-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.crv-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.crv-cat-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.crv-cat-icon {
  font-size: 14px;
}
.crv-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.crv-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: calc(var(--radius-lg) * 0.6);
  background: var(--card-bg);
}
.crv-item--pass {
  border-color: var(--accent);
}
.crv-item--fail {
  border-color: #d64545;
}
.crv-item-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.crv-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.crv-method {
  flex: none;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-surface);
  color: var(--text-secondary);
}
.crv-method--auto {
  color: var(--accent);
}
.crv-item-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.crv-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.crv-status {
  font-size: 12px;
  color: var(--text-secondary);
}
.crv-status--pass {
  color: var(--accent);
}
.crv-status--fail {
  color: #d64545;
}
.crv-btn-pass,
.crv-btn-fail {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 10px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  cursor: pointer;

  min-height: 26px;
  min-height: 26px;
}
.crv-btn-pass:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.crv-btn-fail:hover {
  border-color: #d64545;
  color: #d64545;
}
</style>
