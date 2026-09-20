<template>
  <section class="cbp" data-test="constitution-bridge-panel" aria-label="宪法 · 合规桥接总览">
    <header class="cbp-head">
      <div class="cbp-head-text">
        <h3 class="cbp-title">⚖ 宪法 · 合规桥接总览</h3>
        <p class="cbp-sub">合规基线 · 审查清单 · 审计账本 — 一页尽览宪法之实</p>
      </div>
      <span class="cbp-badge" data-test="cbp-badge">
        最低达标 {{ config.minScore }} 分 · 自动检查 {{ autoCheckLabel }}
      </span>
    </header>

    <!-- 概览四格 -->
    <div class="cbp-stats" data-test="cbp-stats">
      <div class="cbp-stat" data-test="cbp-stat-audit">
        <b class="cbp-stat-num">{{ auditStats.totalEntries }}</b>
        <span class="cbp-stat-label">审计记录</span>
        <span class="cbp-stat-meta">近 7 天 {{ auditStats.recentChanges }}</span>
      </div>
      <div class="cbp-stat" data-test="cbp-stat-sessions">
        <b class="cbp-stat-num">{{ sessions.length }}</b>
        <span class="cbp-stat-label">审查会话</span>
        <span class="cbp-stat-meta">累计发起</span>
      </div>
      <div class="cbp-stat" data-test="cbp-stat-checked">
        <b class="cbp-stat-num">{{ checklistProgress.checked }}<i>/{{ checklistProgress.total }}</i></b>
        <span class="cbp-stat-label">清单已核</span>
        <span class="cbp-stat-meta">{{ checklistProgress.percentage }}% 完成</span>
      </div>
      <div class="cbp-stat" data-test="cbp-stat-failed">
        <b class="cbp-stat-num" :class="{ 'cbp-num--warn': checklistProgress.failed > 0 }">{{ checklistProgress.failed }}</b>
        <span class="cbp-stat-label">未过项</span>
        <span class="cbp-stat-meta">需人工复核</span>
      </div>
    </div>

    <!-- 核查清单 · 分类进度 -->
    <div class="cbp-block" data-test="cbp-checklist">
      <span class="cbp-block-label">八核心价值 · 核查清单进度</span>
      <div v-if="categoryRows.length === 0" class="cbp-empty">尚未初始化核查清单，请在「合规审查 · 宪法体检表」中开始体检。</div>
      <div v-else class="cbp-bars">
        <div v-for="row in categoryRows" :key="row.key" class="cbp-bar">
          <span class="cbp-bar-label">{{ row.icon }} {{ row.label }}</span>
          <div class="cbp-bar-track">
            <div class="cbp-bar-fill" :style="{ width: barPct(row.percentage) }"></div>
          </div>
          <span class="cbp-bar-num">{{ row.passed }}/{{ row.total }}</span>
        </div>
      </div>
    </div>

    <!-- 审查历史 -->
    <div class="cbp-block" data-test="cbp-history">
      <span class="cbp-block-label">审查历史 · 最近会话</span>
      <ul v-if="history.length" class="cbp-hist">
        <li v-for="h in history" :key="h.sessionId" class="cbp-hist-item">
          <span class="cbp-hist-title">{{ h.title }}</span>
          <span class="cbp-hist-tag" :class="`cbp-hist-tag--${h.status}`">{{ statusLabel(h.status) }}</span>
          <span class="cbp-hist-meta">评分 {{ h.score }} · {{ h.checklistCompletion }}%</span>
        </li>
      </ul>
      <p v-else class="cbp-empty">暂无审查记录，宪法尚未发行正式审查。</p>
    </div>

    <!-- 审计类型分布 -->
    <div v-if="auditTypeRows.length" class="cbp-block" data-test="cbp-audit">
      <span class="cbp-block-label">审计账本 · 事件类型分布</span>
      <div class="cbp-chips">
        <span v-for="row in auditTypeRows" :key="row.key" class="cbp-chip">{{ auditLabel(row.key) }} {{ row.count }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useConstitutionBridge } from '../modules/constitution/constitution-bridge'
import { CHECKLIST_CATEGORIES, REVIEW_STATUS_LABELS } from '../modules/constitution/compliance-review'
import type { ChecklistCategory, ReviewStatus } from '../modules/constitution/compliance-review'

const bridge = useConstitutionBridge()

onMounted(() => {
  bridge.initChecklist()
  bridge.loadReview()
})

const config = computed(() => bridge.complianceConfig.value)
const autoCheckLabel = computed(() => (config.value.autoCheck ? '开' : '关'))

const auditStats = computed(() => bridge.getAuditStats())
const sessions = computed(() => bridge.sessions.value)
const checklistProgress = computed(() => bridge.getChecklistProgress())
const history = computed(() => bridge.getReviewHistory().slice(0, 6))

const categoryRows = computed(() => {
  const byCat = checklistProgress.value.byCategory
  return (Object.keys(CHECKLIST_CATEGORIES) as ChecklistCategory[])
    .map(key => ({
      key,
      icon: CHECKLIST_CATEGORIES[key].icon,
      label: CHECKLIST_CATEGORIES[key].label,
      total: byCat[key]?.total ?? 0,
      passed: byCat[key]?.passed ?? 0,
      percentage: byCat[key]?.percentage ?? 0,
    }))
    .filter(r => r.total > 0)
})

const auditTypeRows = computed(() =>
  Object.entries(auditStats.value.byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({ key, count }))
)

const auditLabelMap: Record<string, string> = {
  rule_added: '新增',
  rule_updated: '修改',
  rule_removed: '删除',
  rule_toggled: '启停',
  rule_reordered: '排序',
  constitution_imported: '导入',
  constitution_reset: '重置',
  compliance_checked: '体检',
}
function auditLabel(key: string): string {
  return auditLabelMap[key] ?? key
}

function statusLabel(status: ReviewStatus): string {
  return REVIEW_STATUS_LABELS[status] ?? status
}

function barPct(p: number): string {
  return `${Math.max(2, p)}%`
}
</script>

<style scoped>
.cbp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  border-radius: var(--radius-lg);
  background: linear-gradient(160deg, rgba(35, 30, 24, 0.5), rgba(26, 22, 18, 0.7));
  margin-bottom: 48px;
}
.cbp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.cbp-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
  letter-spacing: 0.5px;
  margin: 0 0 4px;
}
.cbp-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}
.cbp-badge {
  font-size: 11px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  white-space: nowrap;
}
.cbp-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.cbp-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid var(--border-color);
}
.cbp-stat-num {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.cbp-stat-num i {
  font-style: normal;
  font-size: 13px;
  color: var(--text-secondary);
}
.cbp-num--warn {
  color: #c87864;
}
.cbp-stat-label {
  font-size: 12px;
  color: var(--text-primary);
}
.cbp-stat-meta {
  font-size: 11px;
  color: var(--text-secondary);
}
.cbp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cbp-block-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}
.cbp-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cbp-bar {
  display: grid;
  grid-template-columns: 150px 1fr 44px;
  align-items: center;
  gap: 10px;
}
.cbp-bar-label {
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cbp-bar-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  overflow: hidden;
}
.cbp-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.4), var(--accent));
}
.cbp-bar-num {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.cbp-hist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cbp-hist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.25);
  border: 1px solid var(--border-color);
  font-size: 12px;
}
.cbp-hist-title {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.cbp-hist-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.cbp-hist-tag--approved { background: rgba(90, 184, 160, 0.12); color: #8a9a7a; }
.cbp-hist-tag--rejected { background: rgba(200, 120, 100, 0.12); color: #c46a5a; }
.cbp-hist-tag--draft { background: rgba(148, 163, 184, 0.14); color: #94a3b8; }
.cbp-hist-tag--in_review { background: rgba(212, 180, 100, 0.12); color: #f0c040; }
.cbp-hist-tag--submitted { background: rgba(107, 159, 196, 0.14); color: #6b9fc4; }
.cbp-hist-tag--needs_revision { background: rgba(245, 158, 11, 0.14); color: #f59e0b; }
.cbp-hist-meta {
  color: var(--text-secondary);
  font-size: 11px;
  white-space: nowrap;
}
.cbp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cbp-chip {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  color: var(--text-secondary);
}
.cbp-empty {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
  opacity: 0.8;
  margin: 0;
  padding: 8px 0;
}

@media (max-width: 640px) {
  .cbp-bar {
    grid-template-columns: 110px 1fr 40px;
    gap: 8px;
  }
}
</style>