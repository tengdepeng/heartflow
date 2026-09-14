<template>
  <section class="pdp" aria-label="隐私仪表盘">
    <div class="pdp-head">
      <span class="pdp-title">👁️ 隐私仪表盘</span>
      <span class="pdp-sub">数据暴露面 · 权限审计 · 隐私评分 · 一键锁定</span>
    </div>

    <!-- 总体状态 -->
    <div class="pdp-status" :class="'pdp-status--' + overallStatus">
      <span class="pdp-status-icon">{{ statusIcon }}</span>
      <div class="pdp-status-body">
        <strong class="pdp-status-title">{{ statusTitle }}</strong>
        <span class="pdp-status-desc">{{ statusDesc }}</span>
      </div>
      <span class="pdp-status-grade" v-if="latestScore">{{ latestScore.grade }} 级</span>
    </div>

    <!-- 隐私评分 -->
    <div class="pdp-block">
      <span class="pdp-block-label">隐私评分</span>
      <div class="pdp-score-row">
        <div class="pdp-score-ring" :style="{ '--score': scoreDeg }">
          <b>{{ latestScore ? latestScore.total : '--' }}</b>
          <span>总分</span>
        </div>
        <div v-if="latestScore && latestScore.dimensions.length" class="pdp-dims">
          <div v-for="d in latestScore.dimensions" :key="d.name" class="pdp-dim">
            <span class="pdp-dim-name">{{ d.name }}</span>
            <div class="pdp-dim-bar"><i :style="{ width: d.score + '%' }"></i></div>
            <span class="pdp-dim-num">{{ d.score }}</span>
          </div>
        </div>
      </div>
      <div class="pdp-actions">
        <button class="pdp-btn pdp-btn--primary" @click="runScore">📊 计算评分</button>
        <button class="pdp-btn" @click="runLeakCheck">🔍 泄露检测</button>
        <button class="pdp-btn" @click="runAudit">📋 权限审计</button>
      </div>
    </div>

    <!-- 数据暴露面 -->
    <div class="pdp-block">
      <span class="pdp-block-label">数据暴露面 · {{ exposureSummary.totalCategories }} 类</span>
      <div class="pdp-exposure-summary">
        <div class="pdp-expo-item"><b>{{ exposureSummary.safeCategories }}</b><span>安全</span></div>
        <div class="pdp-expo-item"><b>{{ exposureSummary.atRiskCategories }}</b><span>有风险</span></div>
        <div class="pdp-expo-item pdp-expo--bad"><b>{{ exposureSummary.breachedCategories }}</b><span>已泄露</span></div>
        <div class="pdp-expo-item"><b>{{ exposureSummary.totalRiskScore }}</b><span>风险均分</span></div>
      </div>
      <div v-if="exposures.length" class="pdp-expo-list">
        <div v-for="e in exposures" :key="e.category" class="pdp-expo">
          <span class="pdp-expo-icon">{{ categoryIcon(e.category) }}</span>
          <div class="pdp-expo-body">
            <strong class="pdp-expo-name">{{ categoryLabel(e.category) }}</strong>
            <span class="pdp-expo-meta">
              {{ SENSITIVITY_META[e.sensitivity].label }} · {{ e.estimatedCount }} 条 · {{ fmtSize(e.estimatedSize) }}
            </span>
          </div>
          <span class="pdp-expo-status" :style="{ color: EXPOSURE_STATUS_META[e.exposureStatus].color }">
            {{ EXPOSURE_STATUS_META[e.exposureStatus].icon }} {{ EXPOSURE_STATUS_META[e.exposureStatus].label }}
          </span>
          <span class="pdp-expo-risk" :style="{ color: riskColor(e.riskScore) }">{{ e.riskScore }}</span>
        </div>
      </div>
      <div v-else class="pdp-empty">暂无暴露面数据。</div>
    </div>

    <!-- 权限审计 -->
    <div class="pdp-block">
      <span class="pdp-block-label">权限审计 · {{ permissions.length }} 项</span>
      <div v-if="permissions.length" class="pdp-perm-list">
        <div v-for="p in permissions" :key="p.id" class="pdp-perm" :class="{ revoked: !p.granted }">
          <span class="pdp-perm-icon">{{ permRiskIcon(p.riskLevel) }}</span>
          <div class="pdp-perm-body">
            <strong class="pdp-perm-name">{{ p.name }}</strong>
            <span class="pdp-perm-meta">{{ p.module }} · {{ p.level }} 级</span>
          </div>
          <button
            v-if="p.revocable"
            class="pdp-btn pdp-btn--sm"
            :class="p.granted ? 'pdp-btn--danger' : 'pdp-btn--ok'"
            @click="togglePermission(p.id)"
          >{{ p.granted ? '撤销' : '授权' }}</button>
          <span v-else class="pdp-perm-fixed">{{ p.granted ? '已授权' : '未授权' }}</span>
        </div>
      </div>
      <div v-else class="pdp-empty">暂无权限条目。</div>
    </div>

    <!-- 泄露预警 -->
    <div class="pdp-block">
      <span class="pdp-block-label">泄露预警 · {{ activeWarnings.length }}</span>
      <div v-if="activeWarnings.length" class="pdp-warn-list">
        <div v-for="w in activeWarnings" :key="w.id" class="pdp-warn" :class="'pdp-warn--' + w.level">
          <span class="pdp-warn-icon">{{ warnIcon(w.level) }}</span>
          <div class="pdp-warn-body">
            <strong class="pdp-warn-title">{{ w.title }}</strong>
            <span class="pdp-warn-desc">{{ w.description }}</span>
          </div>
          <button class="pdp-btn pdp-btn--sm" @click="resolveWarning(w.id)">处理</button>
        </div>
      </div>
      <div v-else class="pdp-empty">没有泄露预警。</div>
    </div>

    <!-- 一键锁定 -->
    <div class="pdp-block">
      <span class="pdp-block-label">一键锁定</span>
      <div v-if="!lockState.locked" class="pdp-lock-row">
        <select v-model="lockScope" class="pdp-select">
          <option value="all">全部数据</option>
          <option value="sensitive_only">仅敏感数据</option>
          <option value="external_only">仅外部访问</option>
        </select>
        <button class="pdp-btn pdp-btn--danger pdp-lock-btn" @click="doLock">🔒 立即锁定</button>
      </div>
      <div v-else class="pdp-locked">
        <span class="pdp-locked-icon">🔐</span>
        <span class="pdp-locked-text">数据已锁定{{ lockState.reason ? '：' + lockState.reason : '' }}</span>
        <button class="pdp-btn pdp-btn--ok pdp-unlock-btn" @click="doUnlock">解锁</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  usePrivacyDashboard,
  DATA_CATEGORY_META,
  SENSITIVITY_META,
  EXPOSURE_STATUS_META,
} from '../../modules/safety'
import type { DataCategory, ThreatLevel } from '../../modules/safety'

const privacy = usePrivacyDashboard()

const exposures = privacy.exposures
const permissions = privacy.permissions
const activeWarnings = ref(privacy.getActiveWarnings())
const latestScore = ref(privacy.getLatestScore())
const latestAudit = ref(privacy.getLatestAudit())
const lockState = ref({ ...privacy.lockState.value })
const lockScope = ref<'all' | 'sensitive_only' | 'external_only'>('all')

const exposureSummary = computed(() => privacy.getExposureSummary())

const overallStatus = computed(() => {
  if (activeWarnings.value.some(w => w.level === 'critical')) return 'danger'
  if (
    activeWarnings.value.some(w => w.level === 'high') ||
    exposureSummary.value.breachedCategories > 0 ||
    (latestScore.value && latestScore.value.total < 60)
  ) return 'warning'
  return 'safe'
})

const statusIcon = computed(() => ({ safe: '🟢', warning: '🟠', danger: '🔴' }[overallStatus.value]))
const statusTitle = computed(() => ({ safe: '隐私状况良好', warning: '存在隐私风险', danger: '隐私严重威胁' }[overallStatus.value]))
const statusDesc = computed(() => {
  if (overallStatus.value === 'danger') return '存在严重泄露预警，建议立即锁定敏感数据。'
  if (overallStatus.value === 'warning') return '发现风险项，建议进行泄露检测与权限审计。'
  return '各项数据暴露面处于安全状态。'
})

const scoreDeg = computed(() => {
  const s = latestScore.value?.total ?? 0
  return `${Math.round((s / 100) * 180)}deg`
})

onMounted(() => {
  refresh()
})

function refresh() {
  activeWarnings.value = privacy.getActiveWarnings()
  latestScore.value = privacy.getLatestScore()
  latestAudit.value = privacy.getLatestAudit()
  lockState.value = { ...privacy.lockState.value }
}

function runScore() {
  privacy.calculatePrivacyScore()
  refresh()
}

function runLeakCheck() {
  privacy.runLeakDetection()
  refresh()
}

function runAudit() {
  privacy.performPermissionAudit()
  refresh()
}

function togglePermission(id: string) {
  const p = permissions.value.find(x => x.id === id)
  if (!p) return
  if (p.granted) privacy.revokePermission(id)
  else privacy.grantPermission(id)
}

function resolveWarning(id: string) {
  privacy.resolveWarning(id)
  refresh()
}

function doLock() {
  privacy.lock(lockScope.value, 0, '手动锁定')
  refresh()
}

function doUnlock() {
  privacy.unlock()
  refresh()
}

function categoryLabel(c: DataCategory) {
  return DATA_CATEGORY_META[c]?.label ?? c
}

function categoryIcon(c: DataCategory) {
  return DATA_CATEGORY_META[c]?.icon ?? '•'
}

function riskColor(score: number) {
  if (score >= 70) return '#e74c3c'
  if (score >= 40) return '#f39c12'
  return '#2ecc71'
}

function permRiskIcon(level: string) {
  return ({ low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' } as Record<string, string>)[level] ?? '⚪'
}

function warnIcon(level: ThreatLevel) {
  return ({ low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' } as Record<ThreatLevel, string>)[level] ?? '🟡'
}

function fmtSize(bytes: number) {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)}MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${bytes}B`
}
</script>

<style scoped>
.pdp {
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border, rgba(var(--accent-rgb), 0.12));
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
}
.pdp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}
.pdp-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.75);
}
.pdp-sub {
  font-size: 11px;
  color: var(--text-low);
}
.pdp-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 14px;
  border: 1px solid;
}
.pdp-status--safe { background: rgba(46, 204, 113, 0.08); border-color: rgba(46, 204, 113, 0.25); }
.pdp-status--warning { background: rgba(243, 156, 18, 0.08); border-color: rgba(243, 156, 18, 0.25); }
.pdp-status--danger { background: rgba(231, 76, 60, 0.08); border-color: rgba(231, 76, 60, 0.25); }
.pdp-status-icon { font-size: 22px; }
.pdp-status-body { flex: 1; min-width: 0; }
.pdp-status-title {
  display: block;
  font-size: 14px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.pdp-status-desc {
  display: block;
  font-size: 11px;
  color: var(--text-low);
  margin-top: 2px;
}
.pdp-status-grade {
  font-size: 20px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.7);
}
.pdp-block {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.25);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.pdp-block-label {
  display: block;
  font-size: 12px;
  letter-spacing: 1px;
  color: rgba(var(--text-primary-rgb), 0.55);
  margin-bottom: 10px;
}
.pdp-score-row {
  display: flex;
  gap: 16px;
  align-items: center;
}
.pdp-score-ring {
  flex: 0 0 88px;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: conic-gradient(var(--accent, #d4a574) var(--score), rgba(var(--accent-rgb), 0.12) 0);
}
.pdp-score-ring b {
  font-size: 22px;
  color: rgba(var(--text-primary-rgb), 0.85);
}
.pdp-score-ring span {
  font-size: 10px;
  color: var(--text-low);
}
.pdp-dims {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pdp-dim {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.pdp-dim-name {
  flex: 0 0 56px;
  color: rgba(var(--text-primary-rgb), 0.6);
}
.pdp-dim-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.1);
  overflow: hidden;
}
.pdp-dim-bar i {
  display: block;
  height: 100%;
  background: var(--accent, #d4a574);
  border-radius: 3px;
}
.pdp-dim-num {
  flex: 0 0 24px;
  text-align: right;
  color: rgba(var(--text-primary-rgb), 0.5);
}
.pdp-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.pdp-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--text-primary-rgb), 0.75);
  font-size: 12px;
  cursor: pointer;
}
.pdp-btn--primary {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.35);
}
.pdp-btn--danger {
  background: rgba(231, 76, 60, 0.14);
  border-color: rgba(231, 76, 60, 0.3);
  color: #e74c3c;
}
.pdp-btn--ok {
  background: rgba(46, 204, 113, 0.14);
  border-color: rgba(46, 204, 113, 0.3);
  color: #2ecc71;
}
.pdp-btn--sm {
  padding: 5px 10px;
  font-size: 11px;
}
.pdp-exposure-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}
.pdp-expo-item {
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
.pdp-expo-item b {
  font-size: 16px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.pdp-expo--bad b { color: #e74c3c; }
.pdp-expo-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pdp-expo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.3);
}
.pdp-expo-icon { font-size: 15px; }
.pdp-expo-body { flex: 1; min-width: 0; }
.pdp-expo-name {
  display: block;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.pdp-expo-meta {
  display: block;
  font-size: 10px;
  color: var(--text-low);
}
.pdp-expo-status {
  font-size: 11px;
  flex-shrink: 0;
}
.pdp-expo-risk {
  flex: 0 0 24px;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
}
.pdp-perm-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pdp-perm {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.3);
}
.pdp-perm.revoked { opacity: 0.55; }
.pdp-perm-icon { font-size: 14px; }
.pdp-perm-body { flex: 1; min-width: 0; }
.pdp-perm-name {
  display: block;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.pdp-perm-meta {
  display: block;
  font-size: 10px;
  color: var(--text-low);
}
.pdp-perm-fixed {
  font-size: 11px;
  color: var(--text-low);
}
.pdp-warn-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pdp-warn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border-left: 3px solid;
}
.pdp-warn--low { border-color: #2ecc71; }
.pdp-warn--medium { border-color: #f39c12; }
.pdp-warn--high { border-color: #e67e22; }
.pdp-warn--critical { border-color: #e74c3c; }
.pdp-warn-icon { font-size: 15px; }
.pdp-warn-body { flex: 1; min-width: 0; }
.pdp-warn-title {
  display: block;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.pdp-warn-desc {
  display: block;
  font-size: 10px;
  color: var(--text-low);
  margin-top: 2px;
}
.pdp-lock-row {
  display: flex;
  gap: 8px;
}
.pdp-select {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.4);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 12px;
}
.pdp-locked {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pdp-locked-icon { font-size: 20px; }
.pdp-locked-text {
  flex: 1;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.7);
}
.pdp-empty {
  font-size: 12px;
  color: var(--text-low);
}
</style>
