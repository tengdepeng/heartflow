<template>
  <section class="status-section">
    <div class="section-header">
      <div class="section-header-icon">◈</div>
      <div>
        <h2 class="section-title">宪法透明度账本</h2>
        <span class="section-subtitle">
          {{ summary.total }} 项效果目标 · 名实对照 · 零假消费
        </span>
      </div>
      <div class="section-header-actions">
        <button class="stylus-btn ghost" @click="toggleExpandAll" :title="expandAllLabel">
          <span class="stylus-label">{{ expandAllLabel }}</span>
        </button>
        <button class="stylus-btn" @click="onExport" title="导出透明度账本（本地 JSON）">
          <span class="stylus-icon">↓</span>
          <span class="stylus-label">导出账本</span>
        </button>
      </div>
    </div>

    <!-- 三态概览 -->
    <div class="status-summary">
      <div class="summary-card summary-card--active">
        <span class="summary-num">{{ summary.activeCount }}</span>
        <span class="summary-label">生效中</span>
        <span class="summary-sub">已接线且当前启用</span>
      </div>
      <div class="summary-card summary-card--idle">
        <span class="summary-num">{{ summary.wiredIdleCount }}</span>
        <span class="summary-label">已接线·未启用</span>
        <span class="summary-sub">有消费点 · 开关未触发</span>
      </div>
      <div class="summary-card summary-card--decl">
        <span class="summary-num">{{ summary.declarativeCount }}</span>
        <span class="summary-label">声明式</span>
        <span class="summary-sub">待建设 · 不伪造宪法之实</span>
      </div>
    </div>

    <!-- A2-EXT-4 · 声明式 backlog 批量知悉 -->
    <div class="declared-backlog">
      <div class="backlog-head">
        <div>
          <span class="backlog-title">诚实声明式项</span>
          <span class="backlog-sub">
            {{ declared.ackCount.value }} / {{ declared.total.value }} 已确认知悉 ·
            经审计确认无运行时门控、永不伪造宪法之实
          </span>
        </div>
        <div class="backlog-actions">
          <button class="stylus-btn ghost" @click="showBacklog = !showBacklog">
            <span class="stylus-label">{{ showBacklog ? '收起' : '查看清单' }}</span>
          </button>
          <button
            class="stylus-btn"
            @click="onAckAll"
            :disabled="declared.allAcked.value"
          >
            <span class="stylus-label">一键全部知悉</span>
          </button>
        </div>
      </div>
      <div class="backlog-progress">
        <div
          class="backlog-progress-fill"
          :style="{ width: `${declared.total.value ? (declared.ackCount.value / declared.total.value) * 100 : 0}%` }"
        ></div>
      </div>
      <ul v-if="showBacklog" class="backlog-list">
        <li
          v-for="t in declared.allTargets"
          :key="t"
          class="backlog-item"
          :class="{ acked: declared.isAcked(t) }"
          @click="onAckOne(t)"
        >
          <span class="backlog-item-target">{{ t }}</span>
          <span class="backlog-item-state">{{ declared.isAcked(t) ? '已知悉' : '未读' }}</span>
        </li>
      </ul>
    </div>

    <!-- 状态过滤 -->
    <div class="status-filter">
      <button
        v-for="opt in filterOptions"
        :key="opt.value"
        class="filter-chip"
        :class="{ active: stateFilter === opt.value }"
        @click="stateFilter = opt.value"
      >
        {{ opt.label }}
        <span class="filter-chip-count">{{ opt.count }}</span>
      </button>
    </div>

    <!-- 按形态分组 -->
    <div v-for="group in groupedItems" :key="group.form" class="status-group">
      <div class="status-group-head">
        <span class="status-group-icon">{{ group.icon }}</span>
        <h3 class="status-group-title">{{ group.title }}</h3>
        <span class="status-group-count">{{ group.items.length }}</span>
      </div>
      <div class="status-grid">
        <div
          v-for="item in group.items"
          :key="item.target"
          class="status-card"
          :class="[`status-card--${item.state}`, { 'is-expanded': isExpanded(item.target) }]"
          @click="toggleExpand(item.target)"
        >
          <div class="status-card-top">
            <span class="status-card-label">{{ item.label }}</span>
            <span class="status-card-badge-group">
              <span class="status-badge" :class="`badge-${item.state}`">
                {{ stateLabel(item.state) }}
              </span>
              <span class="status-card-caret" :class="{ open: isExpanded(item.target) }" aria-hidden="true">⌄</span>
            </span>
          </div>
          <code class="status-card-target">{{ item.target }}</code>
          <div v-if="isExpanded(item.target)" class="status-card-details">
            <div class="status-card-consumer">
              <span class="sc-key">消费点</span>
              <span class="sc-val">{{ item.consumer }}</span>
            </div>
            <p v-if="item.note" class="status-card-note">{{ item.note }}</p>
          </div>
        </div>
      </div>
    </div>

    <p v-if="groupedItems.length === 0" class="status-empty">
      当前过滤条件下没有匹配的效果目标
    </p>
  </section>
</template>

<script setup lang="ts">
import { getLocalDateKey } from '../utils/time'
import { ref, computed } from 'vue'
import {
  useConstitutionStatus,
  type ConstitutionStatusState,
} from '@/modules/constitution/use-constitution-status'
import { useDeclaredBacklog } from '@/modules/constitution/use-declared-backlog'
import { showToast } from '@/modules/toast'

const { items, summary, exportConstitutionStatusJSON } = useConstitutionStatus()

// A2-EXT-4 · 声明式 backlog 批量知悉（本地 KV，零假数据）
const declared = useDeclaredBacklog()
const showBacklog = ref(false)

interface FormGroup {
  form: string
  title: string
  icon: string
  items: ReturnType<typeof useConstitutionStatus>['items']['value']
}

const formMeta: Record<string, { title: string; icon: string }> = {
  visual: { title: '视觉 / 氛围', icon: '❉' },
  identity: { title: '幕僚身份 / 表达', icon: '◈' },
  behavior: { title: '行为 / 交互', icon: '✛' },
  data: { title: '数据 / 记录', icon: '❖' },
  sharing: { title: '传递 / 分享边界', icon: '⇄' },
}

const stateFilter = ref<'all' | ConstitutionStatusState>('all')

// P2.1 · 逐条展开：默认收起，点击卡片显示消费点 + 诚实声明理由
const expandedTargets = ref<Set<string>>(new Set())

function isExpanded(t: string): boolean {
  return expandedTargets.value.has(t)
}

function toggleExpand(t: string): void {
  const next = new Set(expandedTargets.value)
  if (next.has(t)) next.delete(t)
  else next.add(t)
  expandedTargets.value = next
}

const allTargets = computed(() =>
  groupedItems.value.flatMap(g => g.items.map(i => i.target)),
)

const expandAllLabel = computed(() => {
  const total = allTargets.value.length
  const open = allTargets.value.filter(t => expandedTargets.value.has(t)).length
  return open === 0 ? '展开全部' : open === total ? '收起全部' : '展开全部'
})

function toggleExpandAll(): void {
  const targets = allTargets.value
  const allOpen = targets.length > 0 && targets.every(t => expandedTargets.value.has(t))
  const next = new Set(expandedTargets.value)
  if (allOpen) targets.forEach(t => next.delete(t))
  else targets.forEach(t => next.add(t))
  expandedTargets.value = next
}

const filterOptions = computed(() => [
  { value: 'all' as const, label: '全部', count: summary.value.total },
  { value: 'active' as const, label: '生效中', count: summary.value.activeCount },
  { value: 'wired-idle' as const, label: '已接线·未启用', count: summary.value.wiredIdleCount },
  { value: 'declarative' as const, label: '声明式', count: summary.value.declarativeCount },
])

const filteredItems = computed(() =>
  stateFilter.value === 'all'
    ? items.value
    : items.value.filter(i => i.state === stateFilter.value),
)

const groupedItems = computed<FormGroup[]>(() => {
  const order = ['visual', 'identity', 'behavior', 'data', 'sharing']
  const list = filteredItems.value
  const groups: FormGroup[] = []
  for (const form of order) {
    const its = list.filter(i => i.form === form)
    if (its.length === 0) continue
    groups.push({
      form,
      title: formMeta[form]?.title ?? form,
      icon: formMeta[form]?.icon ?? '◆',
      items: its,
    })
  }
  return groups
})

function stateLabel(s: ConstitutionStatusState): string {
  return s === 'active' ? '生效中' : s === 'wired-idle' ? '已接线·未启用' : '声明式'
}

function onExport(): void {
  const json = exportConstitutionStatusJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `constitution-status-${getLocalDateKey()}.json`
  a.click()
  URL.revokeObjectURL(url)
  showToast('宪法透明度账本已导出', 'success')
}

// A2-EXT-4 · 声明式 backlog 知悉
function onAckOne(t: string): void {
  declared.acknowledge(t)
  if (declared.allAcked.value) showToast('已确认知悉全部诚实声明式项', 'success')
}
function onAckAll(): void {
  declared.acknowledgeAll()
  showToast('已确认知悉全部诚实声明式项', 'success')
}
</script>

<style scoped>
/* ============================================================
   宪法透明度账本 — 圣约卷轴风格延伸
   复用页面 CSS 变量：--accent / --accent-rgb / --text-* / --bg-card-rgb
   / --border-color / --radius-lg / --font-heading-zh / --transition
   ============================================================ */

.status-section {
  margin-bottom: 56px;
  position: relative;
  z-index: 1;
}

/* ---- 三态概览 ---- */
.status-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.summary-card {
  padding: 20px 22px;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    160deg,
    rgba(var(--bg-card-rgb), 0.5) 0%,
    rgba(26, 22, 18, 0.7) 100%
  );
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0.5;
}

.summary-card--active::before { background: linear-gradient(90deg, transparent, #5fd99a, transparent); }
.summary-card--idle::before { background: linear-gradient(90deg, transparent, #d4b464, transparent); }
.summary-card--decl::before { background: linear-gradient(90deg, transparent, #9a9aa6, transparent); }

.summary-num {
  font-size: 34px;
  font-weight: 600;
  line-height: 1;
  font-family: var(--font-heading-zh);
}

.summary-card--active .summary-num { color: #5fd99a; }
.summary-card--idle .summary-num { color: #d4b464; }
.summary-card--decl .summary-num { color: #9a9aa6; }

.summary-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.summary-sub {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

/* ---- 过滤器 ---- */
.status-filter {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.filter-chip {
  padding: 7px 14px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.filter-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.filter-chip.active {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.filter-chip-count {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-weight: 600;
}

/* ---- 分组 ---- */
.status-group {
  margin-bottom: 28px;
}

.status-group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.status-group-icon {
  font-size: 16px;
  color: var(--accent);
  opacity: 0.6;
}

.status-group-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
  letter-spacing: 0.5px;
}

.status-group-count {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
}

/* ---- 卡片网格 ---- */
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.status-card {
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--border-color);
  transition: all var(--transition);
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
}

.status-card--active { border-left-color: rgba(95, 217, 154, 0.5); }
.status-card--idle { border-left-color: rgba(212, 180, 100, 0.5); }
.status-card--decl { border-left-color: rgba(154, 154, 166, 0.4); }

.status-card:hover {
  background: rgba(55, 48, 40, 0.4);
  border-color: rgba(var(--accent-rgb), 0.15);
  transform: translateY(-2px);
}

.status-card.is-expanded {
  background: rgba(55, 48, 40, 0.45);
  border-color: rgba(var(--accent-rgb), 0.2);
}

/* 展开箭头（内联于徽章组，避免绝对定位歧义） */
.status-card-badge-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-card-caret {
  font-size: 13px;
  line-height: 1;
  color: var(--text-secondary);
  opacity: 0.5;
  transition: transform var(--transition);
}
.status-card.is-expanded .status-card-caret {
  transform: rotate(180deg);
  opacity: 0.85;
  color: var(--accent);
}

.status-card-details {
  padding-top: 10px;
  margin-top: 2px;
  border-top: 1px dashed var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 次级按钮（展开全部）：覆盖全局 .stylus-btn 主色，降为低调描边 */
.stylus-btn.ghost {
  background: transparent;
  border-color: var(--border-color);
  color: var(--text-secondary);
}
.stylus-btn.ghost:hover {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.status-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.status-card-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.status-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.badge-active {
  background: rgba(95, 217, 154, 0.14);
  color: #5fd99a;
  border: 1px solid rgba(95, 217, 154, 0.28);
}

.badge-wired-idle {
  background: rgba(212, 180, 100, 0.14);
  color: #d4b464;
  border: 1px solid rgba(212, 180, 100, 0.28);
}

.badge-declarative {
  background: rgba(154, 154, 166, 0.12);
  color: #9a9aa6;
  border: 1px solid rgba(154, 154, 166, 0.22);
}

.status-card-target {
  font-size: 11px;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  color: var(--accent);
  opacity: 0.7;
  letter-spacing: 0.3px;
}

.status-card-consumer {
  display: flex;
  gap: 8px;
  font-size: 11px;
  line-height: 1.5;
}

.sc-key {
  flex-shrink: 0;
  color: var(--text-secondary);
  opacity: 0.6;
}

.sc-val {
  color: var(--text-secondary);
  word-break: break-word;
}

.status-card-note {
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-secondary);
  opacity: 0.85;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
}

.status-empty {
  text-align: center;
  padding: 40px 20px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ---- A2-EXT-4 · 诚实声明式 backlog 批量知悉 ---- */
.declared-backlog {
  margin-bottom: 24px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
}
.backlog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.backlog-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
}
.backlog-sub {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: var(--text-secondary);
}
.backlog-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.backlog-progress {
  margin-top: 14px;
  height: 6px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}
.backlog-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.4), var(--accent));
  transition: width var(--transition);
}
.backlog-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.backlog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background: rgba(var(--bg-card-rgb), 0.2);
  cursor: pointer;
  transition: all var(--transition);
}
.backlog-item:hover { border-color: rgba(var(--accent-rgb), 0.2); }
.backlog-item.acked { opacity: 0.55; }
.backlog-item-target {
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: var(--accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.backlog-item-state {
  flex: 0 0 auto;
  font-size: 10px;
  color: var(--text-secondary);
}
.backlog-item.acked .backlog-item-state { color: #5fd99a; }

@media (max-width: 640px) {
  .status-summary {
    grid-template-columns: 1fr;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
