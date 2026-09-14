<template>
  <section class="sdp" aria-label="安全态势总览">
    <div class="sdp-head">
      <span class="sdp-title">🛡️ 安全态势</span>
      <span class="sdp-sub">事件响应 · 威胁分布 · 审计统计</span>
    </div>

    <!-- 统计总览 -->
    <div class="sdp-stats">
      <div class="sdp-stat sdp-stat--score">
        <b class="sdp-score" :style="{ color: scoreColor }">{{ dashboard.securityScore }}</b>
        <span>安全评分</span>
      </div>
      <div class="sdp-stat"><b>{{ dashboard.totalIncidents }}</b><span>事件总数</span></div>
      <div class="sdp-stat"><b>{{ dashboard.unresolvedIncidents }}</b><span>未解决</span></div>
      <div class="sdp-stat"><b>{{ dashboard.weeklyIncidents }}</b><span>本周</span></div>
    </div>

    <!-- 威胁分布 -->
    <div class="sdp-block">
      <span class="sdp-block-label">威胁等级分布</span>
      <div v-if="hasThreats" class="sdp-dist">
        <div v-for="lvl in LEVEL_ORDER" :key="lvl" class="sdp-dist-row">
          <span class="sdp-dist-name" :style="{ color: THREAT_LEVEL_META[lvl].color }">
            {{ THREAT_LEVEL_META[lvl].icon }} {{ THREAT_LEVEL_META[lvl].label }}
          </span>
          <div class="sdp-dist-bar">
            <i :style="{ width: distPercent(lvl), background: THREAT_LEVEL_META[lvl].color }"></i>
          </div>
          <span class="sdp-dist-num">{{ dashboard.threatDistribution[lvl] }}</span>
        </div>
      </div>
      <div v-else class="sdp-empty">暂无威胁事件，态势良好。</div>
    </div>

    <!-- 活跃威胁 -->
    <div class="sdp-block">
      <span class="sdp-block-label">活跃威胁 · {{ dashboard.activeThreats.length }}</span>
      <div v-if="dashboard.activeThreats.length" class="sdp-threats">
        <span v-for="t in dashboard.activeThreats" :key="t" class="sdp-threat">
          {{ THREAT_TYPE_META[t]?.icon }} {{ THREAT_TYPE_META[t]?.label ?? t }}
        </span>
      </div>
      <div v-else class="sdp-empty">没有活跃威胁。</div>
    </div>

    <!-- 事件录入 -->
    <div class="sdp-block">
      <span class="sdp-block-label">事件录入</span>
      <div class="sdp-create">
        <select v-model="form.type" class="sdp-select">
          <option v-for="(meta, t) in THREAT_TYPE_META" :key="t" :value="t">{{ meta.label }}</option>
        </select>
        <select v-model="form.level" class="sdp-select">
          <option v-for="lvl in LEVEL_ORDER" :key="lvl" :value="lvl">{{ THREAT_LEVEL_META[lvl].label }}</option>
        </select>
        <input v-model="form.description" class="sdp-input" placeholder="事件描述，如：检测到异常登录" />
        <input v-model="form.source" class="sdp-input" placeholder="来源，如：登录模块" />
        <button class="sdp-btn sdp-btn--primary sdp-create-btn" :disabled="!form.description.trim()" @click="addIncident">＋ 记录事件</button>
      </div>
    </div>

    <!-- 最近事件 -->
    <div class="sdp-block">
      <span class="sdp-block-label">最近事件 · {{ dashboard.recentIncidents.length }}</span>
      <div v-if="dashboard.recentIncidents.length" class="sdp-incident-list">
        <div v-for="i in dashboard.recentIncidents" :key="i.id" class="sdp-incident" :class="{ resolved: i.resolved }">
          <span class="sdp-incident-icon" :style="{ color: THREAT_LEVEL_META[i.level].color }">
            {{ THREAT_LEVEL_META[i.level].icon }}
          </span>
          <div class="sdp-incident-body">
            <strong class="sdp-incident-desc">{{ i.description }}</strong>
            <span class="sdp-incident-meta">
              {{ THREAT_TYPE_META[i.type]?.label ?? i.type }} · {{ THREAT_LEVEL_META[i.level].label }} · {{ i.source }} · {{ fmtTime(i.timestamp) }}
            </span>
          </div>
          <button v-if="!i.resolved" class="sdp-btn sdp-btn--sm sdp-resolve-btn" @click="resolveIncident(i.id)">解决</button>
          <span v-else class="sdp-incident-done">✓ 已解决</span>
        </div>
      </div>
      <div v-else class="sdp-empty">还没有事件记录。</div>
      <div v-if="dashboard.totalIncidents" class="sdp-actions">
        <button class="sdp-btn sdp-btn--sm sdp-clear-btn" @click="clearResolved">清除已解决</button>
      </div>
    </div>

    <!-- 审计统计 -->
    <div class="sdp-block">
      <span class="sdp-block-label">审计统计</span>
      <div class="sdp-audit">
        <div class="sdp-audit-item"><b>{{ auditStats.total }}</b><span>总记录</span></div>
        <div class="sdp-audit-item sdp-ok"><b>{{ auditStats.successCount }}</b><span>成功</span></div>
        <div class="sdp-audit-item sdp-warn"><b>{{ auditStats.failureCount }}</b><span>失败</span></div>
        <div class="sdp-audit-item sdp-blocked"><b>{{ auditStats.blockedCount }}</b><span>拦截</span></div>
      </div>
      <div v-if="auditStats.topActions.length" class="sdp-top-actions">
        <span v-for="a in auditStats.topActions.slice(0, 5)" :key="a.action" class="sdp-top-action">
          {{ a.action }} ×{{ a.count }}
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  useSecurityDashboard,
  useIncidentResponse,
  useAuditLog,
  THREAT_LEVEL_META,
  THREAT_TYPE_META,
} from '../../modules/safety'
import type { ThreatLevel, ThreatType } from '../../modules/safety'

const LEVEL_ORDER: ThreatLevel[] = ['critical', 'high', 'medium', 'low', 'none']

const dashApi = useSecurityDashboard()
const incidentApi = useIncidentResponse()
const auditApi = useAuditLog()

const form = reactive({
  type: 'unauthorized_access' as ThreatType,
  level: 'medium' as ThreatLevel,
  description: '',
  source: '手动录入',
})

const dashboard = ref(dashApi.getDashboard())
const auditStats = ref(auditApi.getAuditStats())

const hasThreats = computed(() =>
  LEVEL_ORDER.some(l => (dashboard.value.threatDistribution[l] ?? 0) > 0),
)

const scoreColor = computed(() => {
  const s = dashboard.value.securityScore
  if (s >= 80) return '#2ecc71'
  if (s >= 60) return '#f39c12'
  return '#e74c3c'
})

onMounted(() => {
  refresh()
})

function refresh() {
  dashboard.value = dashApi.getDashboard()
  auditStats.value = auditApi.getAuditStats()
}

function distPercent(lvl: ThreatLevel): string {
  const total = LEVEL_ORDER.reduce((acc, l) => acc + (dashboard.value.threatDistribution[l] ?? 0), 0)
  if (!total) return '0%'
  return `${Math.round(((dashboard.value.threatDistribution[lvl] ?? 0) / total) * 100)}%`
}

function addIncident() {
  const desc = form.description.trim()
  if (!desc) return
  incidentApi.createIncident(form.type, form.level, desc, form.source.trim() || '手动录入')
  form.description = ''
  form.source = '手动录入'
  refresh()
}

function resolveIncident(id: string) {
  incidentApi.resolveIncident(id, '已处理')
  refresh()
}

function clearResolved() {
  incidentApi.clearResolvedIncidents()
  refresh()
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.sdp {
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border, rgba(var(--accent-rgb), 0.12));
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
}
.sdp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}
.sdp-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.75);
}
.sdp-sub {
  font-size: 11px;
  color: var(--text-low);
}
.sdp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.sdp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.sdp-stat b {
  font-size: 18px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.sdp-stat span {
  font-size: 11px;
  color: var(--text-low);
}
.sdp-score {
  font-size: 22px !important;
}
.sdp-block {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.25);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.sdp-block-label {
  display: block;
  font-size: 12px;
  letter-spacing: 1px;
  color: rgba(var(--text-primary-rgb), 0.55);
  margin-bottom: 10px;
}
.sdp-dist-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12px;
}
.sdp-dist-name {
  flex: 0 0 72px;
}
.sdp-dist-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}
.sdp-dist-bar i {
  display: block;
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}
.sdp-dist-num {
  flex: 0 0 24px;
  text-align: right;
  color: rgba(var(--text-primary-rgb), 0.5);
}
.sdp-threats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sdp-threat {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(231, 76, 60, 0.12);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.25);
}
.sdp-create {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sdp-select,
.sdp-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.4);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 12px;
}
.sdp-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--text-primary-rgb), 0.75);
  font-size: 12px;
  cursor: pointer;
}
.sdp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.sdp-btn--primary {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.35);
}
.sdp-btn--sm {
  padding: 5px 10px;
  font-size: 11px;
}
.sdp-incident-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sdp-incident {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.sdp-incident.resolved {
  opacity: 0.55;
}
.sdp-incident-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.sdp-incident-body {
  flex: 1;
  min-width: 0;
}
.sdp-incident-desc {
  display: block;
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.sdp-incident-meta {
  display: block;
  font-size: 11px;
  color: var(--text-low);
  margin-top: 2px;
}
.sdp-incident-done {
  font-size: 11px;
  color: #2ecc71;
}
.sdp-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
.sdp-audit {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.sdp-audit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.35);
  font-size: 11px;
  color: var(--text-low);
}
.sdp-audit-item b {
  font-size: 16px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.sdp-audit-item.sdp-ok b { color: #2ecc71; }
.sdp-audit-item.sdp-warn b { color: #f39c12; }
.sdp-audit-item.sdp-blocked b { color: #e74c3c; }
.sdp-top-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.sdp-top-action {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--text-primary-rgb), 0.6);
}
.sdp-empty {
  font-size: 12px;
  color: var(--text-low);
}
</style>
