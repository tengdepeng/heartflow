<template>
  <section class="pdp-panel" aria-label="隐私仪表盘">
    <!-- 空态（理论兜底：无暴露面也无权限条目） -->
    <template v-if="!hasData">
      <div class="pdp-head">
        <span class="pdp-title">🔐 隐私仪表盘</span>
        <span class="pdp-badge pdp-badge-neutral">数据未显影</span>
      </div>
      <p class="pdp-empty">
        还没有可审计的隐私数据。随着情绪、日记、健康等记录沉淀，数据暴露面、权限审计与隐私评分便会在此显影。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="pdp-head">
        <span class="pdp-title">🔐 隐私仪表盘</span>
        <span class="pdp-badge" :class="badge.cls">{{ badge.text }}</span>
      </div>

      <!-- 隐私评分 -->
      <div class="pdp-block">
        <h3 class="pdp-block-title">隐私评分</h3>
        <template v-if="latestScore">
          <div class="pdp-score-row">
            <div class="pdp-score-big">
              <span class="pdp-score-num">{{ latestScore.total }}</span>
              <span class="pdp-score-grade">{{ latestScore.grade }}</span>
            </div>
            <div class="pdp-score-meta">
              <span>评级 · {{ gradeLabel(latestScore.grade) }}</span>
              <span>趋势 · {{ trendLabel(latestScore.trend) }}</span>
            </div>
          </div>
          <div class="pdp-dims">
            <div v-for="d in latestScore.dimensions" :key="d.name" class="pdp-dim">
              <div class="pdp-dim-head">
                <span>{{ d.name }}</span>
                <span>{{ d.score }}</span>
              </div>
              <div class="pdp-dim-bar">
                <div class="pdp-dim-fill" :style="{ width: pct(d.score) }"></div>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="pdp-hint">尚未生成隐私评分。数据暴露面与权限已就绪，评分将在评估后显影。</p>
      </div>

      <!-- 数据暴露面 -->
      <div class="pdp-block">
        <h3 class="pdp-block-title">数据暴露面</h3>
        <div class="pdp-stats">
          <div class="pdp-stat">
            <span class="pdp-stat-num">{{ exposureSummary.totalCategories }}</span>
            <span class="pdp-stat-label">数据类别</span>
          </div>
          <div class="pdp-stat">
            <span class="pdp-stat-num">{{ exposureSummary.safeCategories }}</span>
            <span class="pdp-stat-label">安全</span>
          </div>
          <div class="pdp-stat">
            <span class="pdp-stat-num">{{ exposureSummary.atRiskCategories }}</span>
            <span class="pdp-stat-label">需关注</span>
          </div>
          <div class="pdp-stat">
            <span class="pdp-stat-num">{{ exposureSummary.breachedCategories }}</span>
            <span class="pdp-stat-label">已泄露</span>
          </div>
        </div>
        <div class="pdp-exposures">
          <div v-for="e in exposures" :key="e.category" class="pdp-exposure">
            <span class="pdp-exposure-icon">{{ categoryIcon(e.category) }}</span>
            <span class="pdp-exposure-label">{{ e.label }}</span>
            <span class="pdp-exposure-sens">{{ sensitivityLabel(e.sensitivity) }}</span>
            <span class="pdp-exposure-status" :class="`pdp-status--${e.exposureStatus}`">
              {{ exposureStatusLabel(e.exposureStatus) }}
            </span>
            <div class="pdp-exposure-risk">
              <div class="pdp-risk-fill" :style="{ width: pct(e.riskScore) }"></div>
            </div>
            <span class="pdp-exposure-score">{{ e.riskScore }}</span>
          </div>
        </div>
      </div>

      <!-- 权限审计 -->
      <div class="pdp-block">
        <h3 class="pdp-block-title">权限审计</h3>
        <div class="pdp-stats">
          <div class="pdp-stat">
            <span class="pdp-stat-num">{{ auditSummary.totalPermissions }}</span>
            <span class="pdp-stat-label">权限总数</span>
          </div>
          <div class="pdp-stat">
            <span class="pdp-stat-num">{{ auditSummary.grantedPermissions }}</span>
            <span class="pdp-stat-label">已授权</span>
          </div>
          <div class="pdp-stat">
            <span class="pdp-stat-num">{{ auditSummary.highRiskPermissions }}</span>
            <span class="pdp-stat-label">高风险</span>
          </div>
          <div class="pdp-stat">
            <span class="pdp-stat-num">{{ auditSummary.unusedPermissions }}</span>
            <span class="pdp-stat-label">未使用</span>
          </div>
        </div>
        <ul v-if="auditSummary.recommendations.length" class="pdp-recs">
          <li v-for="r in auditSummary.recommendations" :key="r" class="pdp-rec">{{ r }}</li>
        </ul>
        <p v-else class="pdp-hint">暂无审计建议，权限状态良好。</p>
      </div>

      <!-- 泄露预警 -->
      <div class="pdp-block">
        <h3 class="pdp-block-title">泄露预警</h3>
        <div v-if="activeWarnings.length" class="pdp-warnings">
          <div v-for="w in activeWarnings" :key="w.id" class="pdp-warning" :class="`pdp-warning--${w.level}`">
            <div class="pdp-warning-head">
              <span class="pdp-warning-level">{{ threatLabel(w.level) }}</span>
              <span class="pdp-warning-title">{{ w.title }}</span>
            </div>
            <p class="pdp-warning-desc">{{ w.description }}</p>
          </div>
        </div>
        <p v-else class="pdp-hint">暂无活跃预警，数据保持安全。</p>
      </div>

      <!-- 一键锁定 -->
      <div class="pdp-block">
        <h3 class="pdp-block-title">一键锁定</h3>
        <div class="pdp-lock">
          <span class="pdp-lock-status" :class="{ 'pdp-lock-status--on': lockState.locked }">
            {{ lockState.locked ? '已锁定' : '未锁定' }}
          </span>
          <button v-if="!lockState.locked" class="pdp-btn" @click="doLock">立即锁定</button>
          <button v-else class="pdp-btn pdp-btn--ghost" @click="doUnlock">解锁</button>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul class="pdp-insights">
        <li v-for="ins in insights" :key="ins.title" class="pdp-insight">
          <span class="pdp-insight-mark">✦</span>
          <span class="pdp-insight-text">
            <b>{{ ins.title }}</b>
            <span>{{ ins.description }}</span>
          </span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  usePrivacyDashboard,
  DATA_CATEGORY_META,
  SENSITIVITY_META,
  EXPOSURE_STATUS_META,
} from '../modules/safety/privacy-dashboard'

const pd = usePrivacyDashboard()

const exposures = pd.exposures
const permissions = pd.permissions
const lockState = pd.lockState

const hasData = computed(() => exposures.value.length > 0 || permissions.value.length > 0)

const latestScore = computed(() => pd.getLatestScore())
const latestAudit = computed(() => pd.getLatestAudit())
const activeWarnings = computed(() => pd.getActiveWarnings())
const exposureSummary = computed(() => pd.getExposureSummary())

const overallStatus = computed<'safe' | 'warning' | 'danger'>(() => {
  const aw = activeWarnings.value
  const es = exposureSummary.value
  const ls = latestScore.value
  if (aw.some(w => w.level === 'critical')) return 'danger'
  if (aw.some(w => w.level === 'high') || es.breachedCategories > 0 || (ls && ls.total < 60)) {
    return 'warning'
  }
  return 'safe'
})

const badge = computed(() => {
  if (overallStatus.value === 'danger') return { text: '危险', cls: 'pdp-badge-danger' }
  if (overallStatus.value === 'warning') return { text: '需关注', cls: 'pdp-badge-warn' }
  return { text: '安全', cls: 'pdp-badge-positive' }
})

const auditSummary = computed(() => {
  const perms = permissions.value
  const total = perms.length
  const granted = perms.filter(p => p.granted).length
  const highRisk = perms.filter(p => p.granted && (p.riskLevel === 'high' || p.riskLevel === 'critical')).length
  const unused = perms.filter(p => p.granted && !p.lastUsedAt).length
  const recommendations = latestAudit.value?.recommendations ?? []
  return { totalPermissions: total, grantedPermissions: granted, highRiskPermissions: highRisk, unusedPermissions: unused, recommendations }
})

const insights = computed(() => {
  const out: { title: string; description: string }[] = []
  if (latestScore.value) {
    out.push({
      title: '隐私评分',
      description: `当前 ${latestScore.value.total} 分（${gradeLabel(latestScore.value.grade)}），趋势${trendLabel(latestScore.value.trend)}。`,
    })
  }
  const es = exposureSummary.value
  out.push({
    title: '暴露面概览',
    description: `${es.totalCategories} 类数据中 ${es.safeCategories} 类安全、${es.atRiskCategories} 类需关注。`,
  })
  if (activeWarnings.value.length) {
    out.push({
      title: '活跃预警',
      description: `${activeWarnings.value.length} 条预警待处理，建议按建议措施逐一处置。`,
    })
  } else {
    out.push({
      title: '预警状态',
      description: '暂无活跃预警，数据保持安全。',
    })
  }
  return out.slice(0, 3)
})

function doLock() {
  pd.lock('all', 0, '用户手动锁定')
}

function doUnlock() {
  pd.unlock()
}

function pct(v: number): string {
  return `${Math.max(0, Math.min(100, Math.round(v)))}%`
}

function gradeLabel(g: string): string {
  const map: Record<string, string> = { A: '优秀', B: '良好', C: '中等', D: '待改进', F: '需警惕' }
  return map[g] || g
}

function trendLabel(t: string): string {
  const map: Record<string, string> = { improving: '上升', stable: '平稳', declining: '下降' }
  return map[t] || t
}

function sensitivityLabel(s: string): string {
  return SENSITIVITY_META[s as keyof typeof SENSITIVITY_META]?.label || s
}

function exposureStatusLabel(s: string): string {
  return EXPOSURE_STATUS_META[s as keyof typeof EXPOSURE_STATUS_META]?.label || s
}

function categoryIcon(c: string): string {
  return DATA_CATEGORY_META[c as keyof typeof DATA_CATEGORY_META]?.icon || '📦'
}

function threatLabel(l: string): string {
  const map: Record<string, string> = { critical: '严重', high: '高', medium: '中', low: '低' }
  return map[l] || l
}
</script>

<style scoped>
.pdp-panel {
  background: var(--bg-card, rgba(22, 19, 16, 0.72));
  border: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
  border-radius: var(--radius-lg, 16px);
  padding: 18px 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow, 0 4px 20px rgba(0, 0, 0, 0.18));
}

.pdp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.pdp-title {
  font-family: var(--font-serif, Georgia, 'Songti SC', serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary, #ece5da);
}

.pdp-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.pdp-badge-positive {
  color: #8a9a7a;
  border-color: rgba(138, 154, 122, 0.35);
  background: rgba(138, 154, 122, 0.12);
}

.pdp-badge-warn {
  color: #f0c040;
  border-color: rgba(240, 192, 64, 0.35);
  background: rgba(240, 192, 64, 0.12);
}

.pdp-badge-danger {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.35);
  background: rgba(196, 106, 90, 0.12);
}

.pdp-badge-neutral {
  color: #9a8f80;
  border-color: rgba(154, 143, 128, 0.3);
  background: rgba(154, 143, 128, 0.1);
}

.pdp-empty {
  color: var(--text-secondary, #a89e8f);
  font-size: 13px;
  line-height: 1.7;
}

.pdp-block {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
}

.pdp-block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #a89e8f);
  margin-bottom: 10px;
}

.pdp-hint {
  color: var(--text-secondary, #a89e8f);
  font-size: 12px;
  line-height: 1.6;
}

/* ---- 隐私评分 ---- */
.pdp-score-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.pdp-score-big {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.pdp-score-num {
  font-size: 40px;
  font-weight: 700;
  color: #f0c040;
  line-height: 1;
}

.pdp-score-grade {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-secondary, #a89e8f);
}

.pdp-score-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary, #a89e8f);
}

.pdp-dims {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pdp-dim-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary, #a89e8f);
  margin-bottom: 3px;
}

.pdp-dim-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(154, 143, 128, 0.15);
  overflow: hidden;
}

.pdp-dim-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #f0c040);
}

/* ---- 统计格 ---- */
.pdp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.pdp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(154, 143, 128, 0.08);
}

.pdp-stat-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #ece5da);
}

.pdp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, #a89e8f);
}

/* ---- 数据暴露面 ---- */
.pdp-exposures {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pdp-exposure {
  display: grid;
  grid-template-columns: 22px 1fr auto auto 72px 26px;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  background: rgba(154, 143, 128, 0.06);
  font-size: 12px;
}

.pdp-exposure-icon {
  font-size: 14px;
}

.pdp-exposure-label {
  color: var(--text-primary, #ece5da);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pdp-exposure-sens {
  color: var(--text-secondary, #a89e8f);
  font-size: 11px;
}

.pdp-exposure-status {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
}

.pdp-status--safe {
  color: #8a9a7a;
  background: rgba(138, 154, 122, 0.14);
}

.pdp-status--monitored {
  color: #7fa8c9;
  background: rgba(127, 168, 201, 0.14);
}

.pdp-status--exposed,
.pdp-status--at_risk {
  color: #f0c040;
  background: rgba(240, 192, 64, 0.14);
}

.pdp-status--breached {
  color: #c46a5a;
  background: rgba(196, 106, 90, 0.14);
}

.pdp-exposure-risk {
  height: 5px;
  border-radius: 3px;
  background: rgba(154, 143, 128, 0.15);
  overflow: hidden;
}

.pdp-risk-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #f0c040, #c46a5a);
}

.pdp-exposure-score {
  color: var(--text-secondary, #a89e8f);
  font-size: 11px;
  text-align: right;
}

/* ---- 权限审计 ---- */
.pdp-recs {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
}

.pdp-rec {
  font-size: 12px;
  color: var(--text-secondary, #a89e8f);
  line-height: 1.6;
  padding-left: 14px;
  position: relative;
}

.pdp-rec::before {
  content: '·';
  position: absolute;
  left: 2px;
  color: #f0c040;
}

/* ---- 泄露预警 ---- */
.pdp-warnings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pdp-warning {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid;
}

.pdp-warning--critical {
  border-color: rgba(196, 106, 90, 0.35);
  background: rgba(196, 106, 90, 0.1);
}

.pdp-warning--high {
  border-color: rgba(196, 106, 90, 0.28);
  background: rgba(196, 106, 90, 0.08);
}

.pdp-warning--medium {
  border-color: rgba(240, 192, 64, 0.28);
  background: rgba(240, 192, 64, 0.08);
}

.pdp-warning--low {
  border-color: rgba(154, 143, 128, 0.25);
  background: rgba(154, 143, 128, 0.08);
}

.pdp-warning-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.pdp-warning-level {
  font-size: 11px;
  font-weight: 600;
  color: #c46a5a;
}

.pdp-warning-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #ece5da);
}

.pdp-warning-desc {
  font-size: 12px;
  color: var(--text-secondary, #a89e8f);
  line-height: 1.6;
  margin: 0;
}

/* ---- 一键锁定 ---- */
.pdp-lock {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pdp-lock-status {
  font-size: 13px;
  color: var(--text-secondary, #a89e8f);
}

.pdp-lock-status--on {
  color: #f0c040;
}

.pdp-btn {
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(240, 192, 64, 0.4);
  background: rgba(240, 192, 64, 0.14);
  color: #f0c040;
  cursor: pointer;
  transition: opacity 0.2s;
}

.pdp-btn:hover {
  opacity: 0.85;
}

.pdp-btn--ghost {
  border-color: rgba(154, 143, 128, 0.3);
  background: transparent;
  color: var(--text-secondary, #a89e8f);
}

/* ---- 温和洞察 ---- */
.pdp-insights {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 16px 0 0;
  border-top: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
  padding-top: 14px;
}

.pdp-insight {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;
}

.pdp-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}

.pdp-insight-text {
  display: flex;
  flex-direction: column;
  color: var(--text-secondary, #a89e8f);
}

.pdp-insight-text b {
  color: var(--text-primary, #ece5da);
  font-weight: 600;
}
</style>
