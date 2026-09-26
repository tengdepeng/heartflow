<template>
  <section class="psp safety-panel" data-testid="psp-panel">
    <header class="panel-header">
      <span class="panel-icon">&#x1F50E;</span>
      <div>
        <h4 class="panel-title">财产安全实践</h4>
        <p class="panel-desc">诈骗检测 · 报平安签到 · 假来电脱身</p>
      </div>
    </header>

    <div class="panel-body">
      <!-- 反诈核验（safety·usePropertySafety detectFraud：8 类诈骗词库/风险分级/置信度/建议） -->
      <div class="psp-block">
        <div class="psp-block-title">
          <span>反诈核验</span>
          <span v-if="!fraudEnabled" class="psp-disabled-hint">未启用 · 请在财产安全设置开启</span>
        </div>
        <textarea
          v-model="fraudText"
          class="psp-textarea"
          rows="3"
          :disabled="!fraudEnabled"
          placeholder="粘贴可疑短信、链接、来电内容，检测诈骗风险…"
          data-testid="psp-fraud-input"
        />
        <div class="psp-actions">
          <button
            class="panel-btn primary"
            :disabled="!fraudEnabled || !fraudText.trim()"
            data-testid="psp-fraud-btn"
            @click="runFraudCheck"
          >&#x1F50D; 检测</button>
          <button v-if="fraudResult" class="panel-btn ghost" data-testid="psp-fraud-clear" @click="clearFraud">清除</button>
        </div>

        <div v-if="fraudResult" class="psp-fraud-result" data-testid="psp-fraud-result">
          <div class="psp-risk-row">
            <span class="psp-risk-badge" :style="{ background: riskColor }" data-testid="psp-risk-badge">{{ riskLabel }}</span>
            <span class="psp-risk-type">{{ fraudResult.type }}</span>
            <span class="psp-risk-confidence">置信度 {{ Math.round(fraudResult.confidence * 100) }}%</span>
          </div>
          <p class="psp-warning">{{ fraudResult.warning }}</p>
          <div class="psp-keywords">
            <span v-for="k in fraudResult.matchedKeywords" :key="k" class="psp-keyword-chip">{{ k }}</span>
          </div>
          <ul class="psp-suggestions">
            <li v-for="(s, i) in fraudResult.suggestions" :key="i">{{ s }}</li>
          </ul>
        </div>
        <p v-else-if="fraudChecked" class="psp-clean-hint" data-testid="psp-clean-hint">未发现已知风险模式</p>
      </div>

      <!-- 报平安签到（safety·usePropertySafety checkin/emergencyCheckin + checkinStats 连续统计） -->
      <div class="psp-block">
        <div class="psp-block-title">
          <span>报平安签到</span>
          <span v-if="!checkinEnabled" class="psp-disabled-hint">未启用 · 请在财产安全设置开启</span>
        </div>
        <div class="psp-stats">
          <div class="psp-stat">
            <b data-testid="psp-checkin-total">{{ stats.total }}</b>
            <span>累计签到</span>
          </div>
          <div class="psp-stat">
            <b data-testid="psp-checkin-streak">{{ stats.streak }}</b>
            <span>连续天数</span>
          </div>
          <div class="psp-stat">
            <b>{{ stats.safeCount }}</b>
            <span>安全</span>
          </div>
          <div class="psp-stat">
            <b>{{ stats.emergencyCount }}</b>
            <span>紧急</span>
          </div>
        </div>
        <div class="psp-actions">
          <button
            class="panel-btn primary"
            :disabled="!checkinEnabled"
            data-testid="psp-checkin-btn"
            @click="doCheckin"
          >&#x2705; 报平安</button>
          <button
            class="panel-btn danger"
            :disabled="!checkinEnabled"
            data-testid="psp-emergency-btn"
            @click="doEmergency"
          >&#x1F6A8; 紧急签到</button>
        </div>
        <p v-if="lastCheckinLabel" class="psp-last-checkin">最近签到：{{ lastCheckinLabel }}</p>
        <ul v-if="recentCheckins.length" class="psp-checkin-list" data-testid="psp-checkin-list">
          <li v-for="c in recentCheckins" :key="c.id" class="psp-checkin-item">
            <span class="psp-checkin-type" :class="'psp-type-' + c.type">{{ typeLabel(c.type) }}</span>
            <span :class="{ 'psp-safe': c.safe, 'psp-unsafe': !c.safe }">{{ c.safe ? '安全' : '紧急' }}</span>
            <span class="psp-checkin-time">{{ formatTime(c.timestamp) }}</span>
            <span v-if="c.note" class="psp-checkin-note">{{ c.note }}</span>
          </li>
        </ul>
      </div>

      <!-- 假来电脱身（safety·usePropertySafety createFakeCall/triggerFakeCall/cancelFakeCall） -->
      <div class="psp-block">
        <div class="psp-block-title">
          <span>假来电脱身</span>
          <span v-if="!fakeCallEnabled" class="psp-disabled-hint">未启用 · 请在财产安全设置开启</span>
        </div>
        <div class="psp-call-form">
          <input
            v-model="callerName"
            class="psp-input"
            placeholder="来电显示名称"
            :disabled="!fakeCallEnabled"
            data-testid="psp-call-name"
          />
          <input
            v-model="callReason"
            class="psp-input"
            placeholder="来电事由（如：快递、物业）"
            :disabled="!fakeCallEnabled"
            data-testid="psp-call-reason"
          />
          <label class="psp-delay">
            延迟
            <input
              v-model.number="callDelay"
              type="number"
              min="3"
              max="60"
              :disabled="!fakeCallEnabled"
              data-testid="psp-call-delay"
            />
            秒
          </label>
          <button
            class="panel-btn primary"
            :disabled="!fakeCallEnabled || !callerName.trim()"
            data-testid="psp-trigger-call"
            @click="startFakeCall"
          >&#x1F4DE; 触发假来电</button>
        </div>
        <div v-if="fakeCallActive && fakeCallConfig" class="psp-call-active" data-testid="psp-call-active">
          <p class="psp-call-ringing">&#x1F4DE; 来电中…</p>
          <p class="psp-call-from"><b>{{ fakeCallConfig.callerName }}</b> <span class="psp-call-phone">{{ fakeCallConfig.callerPhone }}</span></p>
          <p v-if="fakeCallConfig.reason" class="psp-call-reason-text">事由：{{ fakeCallConfig.reason }}</p>
          <button class="panel-btn danger" data-testid="psp-call-hangup" @click="hangUp">挂断</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useViewEntrance } from '../../composables/useViewEntrance'
import {
  usePropertySafety,
  createFakeCall,
  type FraudDetectionResult,
} from '../../modules/safety/composables/usePropertySafety'
import { getSafetyConfig } from '../../modules/safety'

useViewEntrance()

const safety = usePropertySafety()
const { checkins, checkinStats, fakeCallActive, fakeCallConfig } = safety

const config = getSafetyConfig()
const propertySecurity = computed(() => config.value.propertySecurity)
const fraudEnabled = computed(() => propertySecurity.value.fraudCheckEnabled)
const fakeCallEnabled = computed(() => propertySecurity.value.fakeCallEnabled)
const checkinEnabled = computed(() => propertySecurity.value.safetyCheckinEnabled)

// ---- 反诈核验 ----
const fraudText = ref('')
const fraudResult = ref<FraudDetectionResult | null>(null)
const fraudChecked = ref(false)

const RISK_COLORS: Record<string, string> = {
  low: '#8a9a7a',
  medium: '#f0c040',
  high: '#d98a3d',
  critical: '#c46a5a',
}
const RISK_LABELS: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '危急',
}

const riskColor = computed(() => (fraudResult.value ? RISK_COLORS[fraudResult.value.risk] ?? '#8a9a7a' : '#8a9a7a'))
const riskLabel = computed(() => (fraudResult.value ? RISK_LABELS[fraudResult.value.risk] ?? fraudResult.value.risk : ''))

function runFraudCheck() {
  fraudResult.value = safety.checkFraud(fraudText.value)
  fraudChecked.value = true
}

function clearFraud() {
  fraudText.value = ''
  fraudResult.value = null
  fraudChecked.value = false
}

// ---- 报平安 ----
const stats = computed(() => checkinStats.value)
const lastCheckinLabel = computed(() => {
  const t = stats.value.lastCheckin
  return t ? formatTime(t) : null
})
const recentCheckins = computed(() => checkins.value.slice(0, 8))

function doCheckin() {
  safety.checkin('manual')
}

function doEmergency() {
  safety.emergencyCheckin()
}

function typeLabel(t: string): string {
  const labels: Record<string, string> = { manual: '手动', auto: '自动', emergency: '紧急' }
  return labels[t] ?? t
}

// ---- 假来电 ----
const callerName = ref('')
const callReason = ref('')
const callDelay = ref(5)

function startFakeCall() {
  safety.triggerFakeCall(createFakeCall(callerName.value, callReason.value, callDelay.value))
}

function hangUp() {
  safety.cancelFakeCall()
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.psp-block {
  border-top: 1px solid rgba(var(--accent-rgb), 0.08);
  padding-top: 14px;
  margin-top: 14px;
}

.psp-block:first-child {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

.psp-block-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #ece5da);
}

.psp-disabled-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-dim, rgba(236, 229, 218, 0.45));
}

.psp-textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-primary, #ece5da);
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.psp-textarea:disabled {
  opacity: 0.45;
}

.psp-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.psp-fraud-result {
  margin-top: 12px;
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.psp-risk-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.psp-risk-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #2a241e;
}

.psp-risk-type {
  font-size: 13px;
  font-weight: 600;
}

.psp-risk-confidence {
  font-size: 12px;
  color: var(--text-dim, rgba(236, 229, 218, 0.55));
}

.psp-warning {
  margin: 10px 0 8px;
  font-size: 13px;
  line-height: 1.5;
}

.psp-keywords {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.psp-keyword-chip {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: rgba(var(--accent-rgb), 0.14);
  border: 1px solid rgba(var(--accent-rgb), 0.18);
}

.psp-suggestions {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-dim, rgba(236, 229, 218, 0.7));
}

.psp-clean-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #8a9a7a;
}

.psp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.psp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.psp-stat b {
  font-size: 17px;
}

.psp-stat span {
  font-size: 11px;
  color: var(--text-dim, rgba(236, 229, 218, 0.55));
}

.psp-last-checkin {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-dim, rgba(236, 229, 218, 0.65));
}

.psp-checkin-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.psp-checkin-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.12);
}

.psp-checkin-type {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  background: rgba(var(--accent-rgb), 0.14);
}

.psp-type-emergency {
  background: rgba(196, 106, 90, 0.22);
  color: #d98a7a;
}

.psp-safe {
  color: #8a9a7a;
}

.psp-unsafe {
  color: #c46a5a;
}

.psp-checkin-time {
  color: var(--text-dim, rgba(236, 229, 218, 0.5));
}

.psp-checkin-note {
  color: var(--text-dim, rgba(236, 229, 218, 0.7));
}

.psp-call-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.psp-input {
  flex: 1 1 180px;
  min-width: 0;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-primary, #ece5da);
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.psp-input:disabled {
  opacity: 0.45;
}

.psp-delay {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-dim, rgba(236, 229, 218, 0.65));
}

.psp-delay input {
  width: 56px;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 13px;
  color: var(--text-primary, #ece5da);
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.psp-call-active {
  margin-top: 12px;
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(196, 106, 90, 0.08);
  border: 1px solid rgba(196, 106, 90, 0.25);
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.psp-call-ringing {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #c46a5a;
  animation: psp-ring 1.1s ease-in-out infinite;
}

.psp-call-from {
  margin: 0;
  font-size: 14px;
}

.psp-call-phone {
  font-size: 12px;
  color: var(--text-dim, rgba(236, 229, 218, 0.55));
  margin-left: 6px;
}

.psp-call-reason-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim, rgba(236, 229, 218, 0.7));
}

@keyframes psp-ring {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

@media (max-width: 520px) {
  .psp-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
