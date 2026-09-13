<template>
  <section class="cgr-panel" :class="{ 'cgr-panel--reported': report !== null }">
    <header class="cgr-head">
      <div class="cgr-head-text">
        <h3 class="cgr-title">合规守卫 · 宪法体检报告</h3>
        <p class="cgr-sub">宪法自查 · 仅审计用户自建 / 编辑规则</p>
      </div>
      <span v-if="report" class="cgr-badge" :class="`cgr-badge--${report.health}`">{{ healthLabel }}</span>
    </header>

    <div class="cgr-body">
      <button class="cgr-btn-primary" type="button" @click="runCheck">
        {{ report ? '重新检查' : '运行合规检查' }}
      </button>

      <!-- 审计日志 -->
      <div class="cgr-section">
        <h4 class="cgr-section-title">审计日志</h4>
        <p class="cgr-section-meta">
          共 {{ auditStats.totalEntries }} 条 · 近 7 天 {{ auditStats.recentChanges }} 条
        </p>
        <ul class="cgr-audit">
          <li v-if="auditLog.length === 0" class="cgr-empty">暂无审计记录</li>
          <li v-for="e in auditLog" :key="e.id" class="cgr-audit-item">
            <span class="cgr-audit-type">{{ e.eventType }}</span>
            <span class="cgr-audit-desc">{{ e.description }}</span>
          </li>
        </ul>
      </div>

      <!-- 冲突检测 -->
      <div class="cgr-section">
        <h4 class="cgr-section-title">冲突检测</h4>
        <ul class="cgr-conflicts">
          <li v-if="conflicts.length === 0" class="cgr-empty">未发现规则冲突</li>
          <li v-for="(c, i) in conflicts" :key="i" class="cgr-conflict-item">
            <span class="cgr-conflict-type">{{ c.type }}</span>
            <span class="cgr-conflict-desc">{{ c.description }}</span>
          </li>
        </ul>
      </div>

      <div v-if="report" class="cgr-report" data-testid="cgr-report">
        <div class="cgr-score" :class="`cgr-score--${report.health}`">
          <span class="cgr-score-num">{{ report.score }}</span>
          <span class="cgr-score-unit">分</span>
        </div>
        <div class="cgr-meta">
          <span>规则总数 {{ report.totalRules }}</span>
          <span>启用 {{ report.enabledRules }}</span>
          <span>冲突 {{ report.conflicts.length }}</span>
        </div>
        <ul class="cgr-list">
          <li v-if="report.violations.length === 0" class="cgr-ok">未发现价值冲突，宪法健康。</li>
          <li v-for="(v, i) in report.violations" :key="i" class="cgr-violation">
            <span class="cgr-sev" :class="`cgr-sev--${v.severity}`">{{ severityLabel(v.severity) }}</span>
            <span class="cgr-violation-text">{{ v.description }}</span>
          </li>
        </ul>
      </div>

      <p v-else class="cgr-hint">
        点击下方按钮，对当前宪法做一次合规自查。默认不自动运行，避免污染审计日志。
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useComplianceBaseline } from '@/modules/constitution/compliance-baseline'
import { useConstitution } from '@/resonance/bridges/constitution'

const { generateReport, getAuditLog, getAuditStats, detectConflicts } = useComplianceBaseline()
const c = useConstitution()

// 默认不生成报告：generateReport 内部会 recordAudit，进视图即跑会污染审计日志。
const report = ref<ReturnType<typeof generateReport> | null>(null)

const auditLog = computed(() => getAuditLog(20))
const auditStats = computed(() => getAuditStats())
const conflicts = computed(() => detectConflicts(c.mutableRules))

const healthLabelMap: Record<string, string> = {
  healthy: '健康',
  caution: '注意',
  warning: '警告',
  critical: '危险',
}
const healthLabel = computed(() =>
  report.value ? (healthLabelMap[report.value.health] ?? report.value.health) : '',
)

function severityLabel(sev: string): string {
  return { critical: '严重', major: '重要', minor: '轻微' }[sev] ?? sev
}

function runCheck() {
  // 只读消费 store 当前宪法；仅用户主动点击才生成报告。
  report.value = generateReport(c.constitution)
}
</script>

<style scoped>
.cgr-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}
.cgr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.cgr-head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cgr-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.cgr-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}
.cgr-badge {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.cgr-badge--healthy {
  color: var(--accent);
  border-color: var(--accent);
}
.cgr-badge--warning {
  color: #d98a00;
}
.cgr-badge--critical {
  color: #d64545;
}
.cgr-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cgr-btn-primary {
  align-self: flex-start;
  padding: 8px 16px;
  border: none;
  border-radius: calc(var(--radius-lg) * 0.6);
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.cgr-btn-primary:hover {
  filter: brightness(1.05);
}
.cgr-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cgr-section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.cgr-section-meta {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}
.cgr-audit,
.cgr-conflicts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 180px;
  overflow: auto;
}
.cgr-empty {
  font-size: 12px;
  color: var(--text-secondary);
}
.cgr-audit-item,
.cgr-conflict-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  color: var(--text-primary);
}
.cgr-audit-type,
.cgr-conflict-type {
  flex: none;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--card-bg);
  color: var(--text-secondary);
}
.cgr-report {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cgr-score {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.cgr-score-num {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
}
.cgr-score--warning .cgr-score-num {
  color: #d98a00;
}
.cgr-score--critical .cgr-score-num {
  color: #d64545;
}
.cgr-score-unit {
  font-size: 14px;
  color: var(--text-secondary);
}
.cgr-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}
.cgr-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cgr-ok {
  font-size: 13px;
  color: var(--accent);
}
.cgr-violation {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  color: var(--text-primary);
}
.cgr-sev {
  flex: none;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--card-bg);
  color: var(--text-secondary);
}
.cgr-sev--critical {
  color: #d64545;
}
.cgr-sev--major {
  color: #d98a00;
}
.cgr-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}
</style>
