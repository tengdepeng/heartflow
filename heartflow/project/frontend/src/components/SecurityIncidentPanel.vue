<template>
  <section class="sip-panel" aria-label="安全事件响应">
    <div class="sip-head">
      <span class="sip-title">🛡️ 安全事件响应</span>
      <span class="sip-sub">态势总览 · 事件处置 · 威胁检测 · 规则管理</span>
    </div>
    <div class="sip-badge">
      <span>{{ incidents.length }} 事件</span>
      <span>{{ unresolvedCount }} 待处置</span>
      <span>{{ rules.length }} 规则</span>
    </div>

    <nav class="sip-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="sip-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="sip-tab-icon">{{ tab.icon }}</span>
        <span class="sip-tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- 态势 Tab -->
    <div v-if="activeTab === 'dashboard'" class="sip-body">
      <div class="sip-actions">
        <button class="sip-btn" @click="refreshDashboard">刷新态势</button>
      </div>
      <div v-if="dashboard" class="sip-dashboard">
        <div class="sip-score">
          <span class="sip-score-num">{{ dashboard.securityScore }}</span>
          <span class="sip-score-label">安全评分</span>
        </div>
        <div class="sip-dash-grid">
          <div class="sip-dash-cell"><b>{{ dashboard.totalIncidents }}</b><span>总事件</span></div>
          <div class="sip-dash-cell"><b>{{ dashboard.unresolvedIncidents }}</b><span>未解决</span></div>
          <div class="sip-dash-cell"><b>{{ dashboard.weeklyIncidents }}</b><span>本周</span></div>
          <div class="sip-dash-cell"><b>{{ dashboard.activeThreats.length }}</b><span>活跃威胁</span></div>
        </div>
        <div class="sip-dist">
          <span v-for="(count, lvl) in dashboard.threatDistribution" :key="lvl" class="sip-dist-item">
            <span class="sip-dist-dot" :style="{ background: levelColor(String(lvl)) }"></span>
            {{ levelLabel(String(lvl)) }} {{ count }}
          </span>
        </div>
        <div v-if="dashboard.activeThreats.length" class="sip-threats">
          <span class="sip-threats-label">活跃威胁：</span>
          <span v-for="t in dashboard.activeThreats" :key="t" class="sip-chip">{{ typeLabel(t) }}</span>
        </div>
        <ul v-if="dashboard.recentIncidents.length" class="sip-list">
          <li v-for="inc in dashboard.recentIncidents" :key="inc.id" class="sip-item">
            <span class="sip-chip" :style="levelChip(inc.level)">{{ levelLabel(inc.level) }}</span>
            <span class="sip-item-type">{{ typeLabel(inc.type) }}</span>
            <span class="sip-item-desc">{{ inc.description }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- 事件 Tab -->
    <div v-if="activeTab === 'incidents'" class="sip-body">
      <div class="sip-actions">
        <button class="sip-btn" @click="showCreate = !showCreate">登记事件</button>
        <button class="sip-btn" @click="clearResolved">清除已解决</button>
      </div>
      <form v-if="showCreate" class="sip-form" @submit.prevent="createIncident">
        <select v-model="form.type" class="sip-input">
          <option v-for="(m, t) in THREAT_TYPE_META" :key="t" :value="t">{{ m.label }}</option>
        </select>
        <select v-model="form.level" class="sip-input">
          <option v-for="(m, l) in THREAT_LEVEL_META" :key="l" :value="l">{{ m.label }}</option>
        </select>
        <input v-model="form.description" class="sip-input" placeholder="事件描述" />
        <input v-model="form.source" class="sip-input" placeholder="来源" />
        <button type="submit" class="sip-btn sip-btn-primary">创建</button>
      </form>
      <div class="sip-filter">
        <select v-model="filterLevel" class="sip-input">
          <option value="">全部等级</option>
          <option v-for="(m, l) in THREAT_LEVEL_META" :key="l" :value="l">{{ m.label }}</option>
        </select>
        <label class="sip-check"><input type="checkbox" v-model="showResolved" /> 显示已解决</label>
      </div>
      <p v-if="filteredIncidents.length === 0" class="sip-empty-hint">暂无安全事件，可登记事件或运行威胁检测</p>
      <ul v-else class="sip-list">
        <li v-for="inc in filteredIncidents" :key="inc.id" class="sip-item" :class="{ resolved: inc.resolved }">
          <span class="sip-chip" :style="levelChip(inc.level)">{{ levelLabel(inc.level) }}</span>
          <span class="sip-item-type">{{ typeLabel(inc.type) }}</span>
          <span class="sip-item-desc">{{ inc.description }}</span>
          <span class="sip-item-src">{{ inc.source }}</span>
          <span class="sip-item-time">{{ fmtTime(inc.timestamp) }}</span>
          <button v-if="!inc.resolved" class="sip-btn sip-btn-small" @click="resolve(inc.id)">解决</button>
          <span v-else class="sip-item-res">{{ inc.resolution }}</span>
        </li>
      </ul>
    </div>

    <!-- 检测 Tab -->
    <div v-if="activeTab === 'detect'" class="sip-body">
      <div class="sip-actions">
        <button class="sip-btn" @click="runDetect">运行威胁检测</button>
      </div>
      <div class="sip-detect-grid">
        <label class="sip-field">失败登录次数 <input v-model.number="ctx.failedLoginAttempts" type="number" class="sip-input" /></label>
        <label class="sip-field">导出数据量 <input v-model.number="ctx.exportDataSize" type="number" class="sip-input" /></label>
        <label class="sip-field">外部连接尝试 <input v-model.number="ctx.externalConnectionAttempts" type="number" class="sip-input" /></label>
        <label class="sip-field">行为偏离分 <input v-model.number="ctx.behaviorDeviationScore" type="number" step="0.1" class="sip-input" /></label>
        <label class="sip-check"><input type="checkbox" v-model="ctx.isKnownDevice" /> 已知设备</label>
        <label class="sip-check"><input type="checkbox" v-model="ctx.locationChanged" /> 位置变更</label>
      </div>
      <div v-if="lastDetection" class="sip-detect-result">
        <p class="sip-detect-title">检测结果：命中 {{ lastDetection.triggered.length }} 条规则</p>
        <ul v-if="lastDetection.triggered.length" class="sip-list">
          <li v-for="r in lastDetection.triggered" :key="r.id" class="sip-item">
            <span class="sip-chip" :style="levelChip(r.level)">{{ levelLabel(r.level) }}</span>
            <span class="sip-item-type">{{ typeLabel(r.type) }}</span>
            <span class="sip-item-desc">{{ r.name }}</span>
            <span class="sip-item-src">{{ r.condition }}</span>
          </li>
        </ul>
        <button
          v-if="lastDetection.triggered.length"
          class="sip-btn sip-btn-primary"
          @click="registerDetected"
        >
          将命中登记为事件
        </button>
      </div>
    </div>

    <!-- 规则 Tab -->
    <div v-if="activeTab === 'rules'" class="sip-body">
      <div class="sip-actions">
        <button class="sip-btn" @click="resetRules">重置默认</button>
      </div>
      <ul class="sip-list">
        <li v-for="r in rules" :key="r.id" class="sip-item">
          <span class="sip-chip" :style="levelChip(r.level)">{{ levelLabel(r.level) }}</span>
          <span class="sip-item-type">{{ typeLabel(r.type) }}</span>
          <span class="sip-item-desc">{{ r.name }}</span>
          <span class="sip-item-src">{{ r.condition }}</span>
          <label class="sip-check">
            <input type="checkbox" :checked="r.enabled" @change="toggle(r.id, ($event.target as HTMLInputElement).checked)" />
            启用
          </label>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  useIncidentResponse,
  useThreatDetection,
  useSecurityDashboard,
  THREAT_LEVEL_META,
  THREAT_TYPE_META,
} from '../modules/safety/incident-response'
import type { ThreatLevel, ThreatType, ThreatRule } from '../modules/safety/incident-response'

const response = useIncidentResponse()
const detection = useThreatDetection()
const dashboardApi = useSecurityDashboard()

const incidents = response.incidents
const rules = detection.rules
const dashboard = ref<ReturnType<typeof dashboardApi.getDashboard> | null>(null)

const unresolvedCount = computed(() => incidents.value.filter(i => !i.resolved).length)

function refreshDashboard() {
  dashboard.value = dashboardApi.getDashboard()
}
onMounted(refreshDashboard)

type TabId = 'dashboard' | 'incidents' | 'detect' | 'rules'
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'dashboard', label: '态势', icon: '📊' },
  { id: 'incidents', label: '事件', icon: '🚨' },
  { id: 'detect', label: '检测', icon: '🔍' },
  { id: 'rules', label: '规则', icon: '📜' },
]
const activeTab = ref<TabId>('dashboard')

function levelLabel(level: string): string {
  return THREAT_LEVEL_META[level as ThreatLevel]?.label ?? level
}
function levelColor(level: string): string {
  return THREAT_LEVEL_META[level as ThreatLevel]?.color ?? '#888'
}
function levelChip(level: string) {
  const c = THREAT_LEVEL_META[level as ThreatLevel]?.color ?? '#888'
  return { background: `${c}22`, color: c, borderColor: c }
}
function typeLabel(type: string): string {
  return THREAT_TYPE_META[type as ThreatType]?.label ?? type
}

const showCreate = ref(false)
const showResolved = ref(true)
const filterLevel = ref('')
const form = ref<{ type: ThreatType; level: ThreatLevel; description: string; source: string }>({
  type: 'unauthorized_access',
  level: 'medium',
  description: '',
  source: '',
})

const filteredIncidents = computed(() => {
  let list = incidents.value
  if (!showResolved.value) list = list.filter(i => !i.resolved)
  if (filterLevel.value) list = list.filter(i => i.level === filterLevel.value)
  return list
})

function createIncident() {
  if (!form.value.description.trim()) return
  response.createIncident(form.value.type, form.value.level, form.value.description.trim(), form.value.source.trim() || '手动登记')
  form.value.description = ''
  form.value.source = ''
  showCreate.value = false
  refreshDashboard()
}
function resolve(id: string) {
  response.resolveIncident(id, '已人工处置')
  refreshDashboard()
}
function clearResolved() {
  response.clearResolvedIncidents()
  refreshDashboard()
}

const ctx = ref<Record<string, unknown>>({
  failedLoginAttempts: 0,
  exportDataSize: 0,
  externalConnectionAttempts: 0,
  behaviorDeviationScore: 0,
  isKnownDevice: true,
  locationChanged: false,
})
const lastDetection = ref<{ triggered: ThreatRule[]; threats: { type: ThreatType; level: ThreatLevel }[] } | null>(null)

function runDetect() {
  lastDetection.value = detection.runDetection(ctx.value)
  refreshDashboard()
}
function registerDetected() {
  if (!lastDetection.value) return
  for (const r of lastDetection.value.triggered) {
    response.createIncident(r.type, r.level, r.name, '威胁检测')
  }
  refreshDashboard()
}

function toggle(id: string, enabled: boolean) {
  detection.toggleRule(id, enabled)
}
function resetRules() {
  detection.resetRules()
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.sip-panel {
  margin-top: 18px;
  padding: 16px;
  border: 1px solid rgba(240, 192, 64, 0.22);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(240, 192, 64, 0.06), rgba(138, 154, 122, 0.05));
}
.sip-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.sip-title {
  font-size: 17px;
  font-weight: 700;
  color: #f0c040;
}
.sip-sub {
  font-size: 12px;
  color: rgba(230, 230, 220, 0.55);
}
.sip-badge {
  display: flex;
  gap: 8px;
  margin: 10px 0;
  flex-wrap: wrap;
}
.sip-badge span {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(240, 192, 64, 0.12);
  color: #e8d9a0;
}
.sip-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.sip-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: 1px solid rgba(230, 230, 220, 0.14);
  border-radius: 999px;
  background: transparent;
  color: rgba(230, 230, 220, 0.6);
  font-size: 13px;
  cursor: pointer;
}
.sip-tab.active {
  border-color: rgba(240, 192, 64, 0.55);
  background: rgba(240, 192, 64, 0.12);
  color: #f0c040;
}
.sip-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sip-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sip-btn {
  padding: 5px 12px;
  border: 1px solid rgba(138, 154, 122, 0.5);
  border-radius: 8px;
  background: rgba(138, 154, 122, 0.12);
  color: #cfe0c0;
  font-size: 12px;
  cursor: pointer;
}
.sip-btn:hover {
  background: rgba(138, 154, 122, 0.22);
}
.sip-btn-primary {
  border-color: rgba(240, 192, 64, 0.55);
  background: rgba(240, 192, 64, 0.14);
  color: #f0c040;
}
.sip-btn-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 2px 8px;
  font-size: 11px;

  min-height: 26px;
}
.sip-input {
  padding: 5px 8px;
  border: 1px solid rgba(230, 230, 220, 0.16);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  color: #e6e6dc;
  font-size: 12px;
}
.sip-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.sip-filter {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.sip-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: rgba(230, 230, 220, 0.7);
  cursor: pointer;
}
.sip-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sip-score {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.sip-score-num {
  font-size: 34px;
  font-weight: 800;
  color: #f0c040;
}
.sip-score-label {
  font-size: 12px;
  color: rgba(230, 230, 220, 0.55);
}
.sip-dash-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.sip-dash-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 10px;
  background: rgba(230, 230, 220, 0.05);
}
.sip-dash-cell b {
  font-size: 18px;
  color: #e6e6dc;
}
.sip-dash-cell span {
  font-size: 11px;
  color: rgba(230, 230, 220, 0.5);
}
.sip-dist {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: rgba(230, 230, 220, 0.7);
}
.sip-dist-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.sip-dist-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.sip-threats {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
}
.sip-threats-label {
  color: rgba(230, 230, 220, 0.55);
}
.sip-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: rgba(230, 230, 220, 0.08);
  color: rgba(230, 230, 220, 0.75);
}
.sip-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 7px 10px;
  border-radius: 10px;
  background: rgba(230, 230, 220, 0.04);
  font-size: 12px;
}
.sip-item.resolved {
  opacity: 0.55;
}
.sip-item-type {
  color: #e6e6dc;
  font-weight: 600;
}
.sip-item-desc {
  color: rgba(230, 230, 220, 0.8);
  flex: 1;
  min-width: 120px;
}
.sip-item-src {
  color: rgba(230, 230, 220, 0.45);
}
.sip-item-time {
  color: rgba(230, 230, 220, 0.4);
  font-size: 11px;
}
.sip-item-res {
  color: #8a9a7a;
  font-size: 11px;
}
.sip-empty-hint {
  font-size: 12px;
  color: rgba(230, 230, 220, 0.45);
}
.sip-detect-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}
.sip-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: rgba(230, 230, 220, 0.65);
}
.sip-detect-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sip-detect-title {
  font-size: 13px;
  color: #e6e6dc;
  margin: 0;
}
</style>
