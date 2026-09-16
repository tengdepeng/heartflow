<template>
  <section class="si-panel" aria-label="传感器感知">
    <div class="si-panel-head">
      <span class="si-panel-title">📡 传感器感知</span>
      <span class="si-panel-sub">设备感知 · 异常预警</span>
    </div>

    <!-- 检测 -->
    <div class="si-block">
      <div class="si-row">
        <button class="si-btn si-btn-primary" @click="runDetect" :disabled="detecting">
          {{ detecting ? '检测中…' : '检测设备传感器' }}
        </button>
        <span class="si-hint">{{ availableCount }} / {{ sensorStatuses.length }} 项可用</span>
      </div>
    </div>

    <!-- 传感器状态 -->
    <div class="si-block">
      <span class="si-block-label">传感器状态</span>
      <ul class="si-list">
        <li v-for="s in sensorStatuses" :key="s.sensorType" class="si-item" :class="{ on: s.available }">
          <span class="si-icon">{{ sensorIcon(s.sensorType) }}</span>
          <span class="si-name">{{ sensorLabel(s.sensorType) }}</span>
          <span class="si-state">{{ s.available ? '可用' : '不可用' }}</span>
          <span class="si-count">{{ s.readingCount }} 次读数</span>
        </li>
      </ul>
    </div>

    <!-- 读数录入 -->
    <div class="si-block">
      <span class="si-block-label">录入读数（异常自动预警）</span>
      <div class="si-row">
        <select v-model="readType" class="si-select">
          <option v-for="t in SENSOR_TYPES" :key="t" :value="t">{{ sensorLabel(t) }}</option>
        </select>
        <input v-model="readValue" type="number" class="si-input" placeholder="数值" />
        <input v-model="readUnit" class="si-input si-input-sm" placeholder="单位" />
        <button class="si-btn" @click="submitReading">录入</button>
      </div>
      <p class="si-hint">心率 40–180 外、电量低于 10%、加速度超 20 将触发安全警报</p>
    </div>

    <!-- 安全警报 -->
    <div class="si-block">
      <span class="si-block-label">安全警报 · {{ activeAlerts.length }}</span>
      <ul v-if="activeAlerts.length" class="si-alerts">
        <li v-for="a in activeAlerts" :key="a.id" class="si-alert" :class="`si-lv-${a.severity}`">
          <div class="si-alert-head">
            <strong>{{ a.title }}</strong>
            <span class="si-alert-sev">{{ severityLabel(a.severity) }}</span>
          </div>
          <p class="si-alert-desc">{{ a.description }}</p>
          <button class="si-btn si-btn-sm" @click="resolve(a.id)">标记已处理</button>
        </li>
      </ul>
      <p v-else class="si-empty">暂无待处理警报</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSensorIntegration } from '../modules/safety'
import type { SensorType, SafetyAlert } from '../modules/safety'

const s = useSensorIntegration()

const SENSOR_TYPES: SensorType[] = ['accelerometer', 'gyroscope', 'heart_rate', 'location', 'battery', 'network']

const SENSOR_META: Record<SensorType, { icon: string; label: string }> = {
  accelerometer: { icon: '🏃', label: '加速度计' },
  gyroscope: { icon: '🧭', label: '陀螺仪' },
  heart_rate: { icon: '💗', label: '心率' },
  location: { icon: '📍', label: '定位' },
  battery: { icon: '🔋', label: '电量' },
  network: { icon: '📶', label: '网络' },
}

const SEVERITY_META: Record<SafetyAlert['severity'], { label: string }> = {
  critical: { label: '严重' },
  high: { label: '高危' },
  medium: { label: '中危' },
  low: { label: '低危' },
}

const detecting = ref(false)
const readType = ref<SensorType>('heart_rate')
const readValue = ref('')
const readUnit = ref('bpm')

const sensorStatuses = computed(() => s.sensorStatuses.value)
const activeAlerts = computed(() => s.activeAlerts.value)
const availableCount = computed(() => s.availableSensors.value.length)

async function runDetect() {
  detecting.value = true
  try {
    await s.detectSensors()
  } finally {
    detecting.value = false
  }
}

function submitReading() {
  const v = Number(readValue.value)
  if (!Number.isFinite(v)) return
  s.recordReading({
    sensorType: readType.value,
    timestamp: new Date().toISOString(),
    value: v,
    unit: readUnit.value.trim() || '-',
    accuracy: 1,
  })
  readValue.value = ''
}

function resolve(id: string) {
  s.resolveAlert(id, '用户确认已处理')
}

function sensorIcon(t: SensorType) {
  return SENSOR_META[t]?.icon ?? '📟'
}

function sensorLabel(t: SensorType) {
  return SENSOR_META[t]?.label ?? t
}

function severityLabel(sev: SafetyAlert['severity']) {
  return SEVERITY_META[sev]?.label ?? sev
}
</script>

<style scoped>
.si-panel {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.si-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.si-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.si-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.si-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.si-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.si-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.si-btn {
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.2s ease;
}
.si-btn:hover {
  background: rgba(255, 255, 255, 0.09);
}
.si-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.si-btn-primary {
  background: rgba(138, 154, 122, 0.18);
  border-color: rgba(138, 154, 122, 0.35);
  color: #b8c4a0;
}
.si-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  font-size: 11px;

  min-height: 26px;
}
.si-hint {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
}
.si-select,
.si-input {
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.si-input {
  width: 110px;
}
.si-input-sm {
  width: 64px;
}
.si-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.si-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 12px;
}
.si-icon {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  flex: none;
}
.si-name {
  flex: 1;
  color: rgba(240, 242, 255, 0.85);
}
.si-state {
  font-size: 11px;
  color: var(--text-low);
}
.si-item.on .si-state {
  color: #8a9a7a;
}
.si-count {
  font-size: 10px;
  color: var(--text-low);
}
.si-alerts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.si-alert {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.025);
}
.si-alert-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: rgba(240, 242, 255, 0.9);
}
.si-alert-sev {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.08);
}
.si-lv-critical .si-alert-sev { background: rgba(224, 122, 106, 0.22); color: #e07a6a; }
.si-lv-high .si-alert-sev { background: rgba(240, 192, 64, 0.18); color: #f0c040; }
.si-lv-medium .si-alert-sev { background: rgba(138, 154, 122, 0.18); color: #b8c4a0; }
.si-lv-low .si-alert-sev { background: rgba(255, 255, 255, 0.08); color: var(--text-low); }
.si-alert-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-medium);
}
.si-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-low);
}
</style>
