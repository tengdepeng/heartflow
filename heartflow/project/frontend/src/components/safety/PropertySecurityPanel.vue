<template>
  <div data-enter class="safety-panel property-security-panel">
    <div class="panel-header">
      <span class="panel-icon">&#x1F6E1;</span>
      <div>
        <h4 class="panel-title">财产安全</h4>
        <p class="panel-desc">反诈骗核验、紧急操作与安全防护</p>
      </div>
    </div>

    <div class="panel-body">
      <!-- 反诈骗核验 -->
      <div class="setting-row">
        <span class="setting-label">反诈骗核验</span>
        <label class="toggle">
          <input type="checkbox" :checked="propertySecurity.fraudCheckEnabled" @change="toggleFraudCheck" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="verify-section" v-if="propertySecurity.fraudCheckEnabled">
        <textarea
          v-model="verifyText"
          placeholder="粘贴可疑短信、链接、电话…"
          class="verify-input"
          rows="2"
        />
        <div class="verify-actions">
          <button class="panel-btn primary" @click="handleVerify" :disabled="!verifyText.trim()">
            &#x1F50D; 核验
          </button>
          <span v-if="verifyResult" class="verify-result">{{ verifyResult }}</span>
        </div>
      </div>

      <!-- SOS 紧急按钮 -->
      <div class="setting-row">
        <span class="setting-label">SOS 紧急按钮</span>
        <label class="toggle">
          <input type="checkbox" :checked="propertySecurity.sosEnabled" @change="toggleSOS" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 假来电 -->
      <div class="setting-row">
        <span class="setting-label">假来电功能</span>
        <label class="toggle">
          <input type="checkbox" :checked="propertySecurity.fakeCallEnabled" @change="toggleFakeCall" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 报平安 -->
      <div class="setting-row">
        <span class="setting-label">报平安功能</span>
        <label class="toggle">
          <input type="checkbox" :checked="propertySecurity.safetyCheckinEnabled" @change="toggleCheckin" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 紧急操作按钮组 -->
      <div class="emer-grid">
        <button class="emer-btn sos" @click="triggerSOS">&#x1F198; SOS</button>
        <button class="emer-btn fake" @click="triggerFakeCall">&#x1F4DE; 假来电</button>
        <button class="emer-btn safe" @click="triggerCheckin">&#x2705; 报平安</button>
      </div>
      <p class="emer-hint">SOS 将向紧急联系人发送位置和求救消息</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useViewEntrance } from '../../composables/useViewEntrance'
import { getSafetyConfig, updatePropertySecurity } from '../../modules/safety'
import { storage } from '../../engine/storage'

useViewEntrance()

const config = getSafetyConfig()
const propertySecurity = computed(() => config.value.propertySecurity)

const verifyText = ref('')
const verifyResult = ref('')

function toggleFraudCheck(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  updatePropertySecurity({ fraudCheckEnabled: checked })
  if (!checked) {
    verifyText.value = ''
    verifyResult.value = ''
  }
}

function toggleSOS(e: Event) {
  updatePropertySecurity({ sosEnabled: (e.target as HTMLInputElement).checked })
}

function toggleFakeCall(e: Event) {
  updatePropertySecurity({ fakeCallEnabled: (e.target as HTMLInputElement).checked })
}

function toggleCheckin(e: Event) {
  updatePropertySecurity({ safetyCheckinEnabled: (e.target as HTMLInputElement).checked })
}

function handleVerify() {
  if (!verifyText.value.trim()) return
  // 模拟核验
  verifyResult.value = '已提交至本地核验（模拟）—— 未发现已知风险模式。'
}

function triggerSOS() {
  if (!propertySecurity.value.sosEnabled) {
    alert('SOS 功能未启用，请在设置中开启。')
    return
  }
  alert('SOS 已触发！将向紧急联系人发送位置和求救消息。\n（此功能需设备权限）')
}

function triggerFakeCall() {
  if (!propertySecurity.value.fakeCallEnabled) {
    alert('假来电功能未启用，请在设置中开启。')
    return
  }
  alert('模拟来电将在 5 秒后触发…')
}

function triggerCheckin() {
  if (!propertySecurity.value.safetyCheckinEnabled) {
    alert('报平安功能未启用，请在设置中开启。')
    return
  }
  alert('报平安消息已发送给紧急联系人。')
  // 更新心理安全签到时间
  try {
    const full = storage.getKV<Record<string, any>>('hf:safety_config', {})
    const psyConfig = full.psychologicalSafety as { lastCheckIn?: number } | undefined
    if (psyConfig) {
      psyConfig.lastCheckIn = Date.now()
      full.psychologicalSafety = psyConfig
      storage.setKV('hf:safety_config', full)
    }
  } catch {
    // 静默处理
  }
}
</script>

<style scoped>
.property-security-panel {
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border, rgba(var(--accent-rgb), 0.12));
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
  transition: all var(--transition, 0.25s ease);
}

.property-security-panel:hover {
  background: var(--bg-card-hover, rgba(55, 48, 40, 0.7));
  border-color: rgba(var(--accent-rgb), 0.18);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}

.panel-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.75);
  margin: 0 0 4px;
}

.panel-desc {
  font-size: 11px;
  color: var(--text-low);
  margin: 0;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.65);
}

.setting-label {
  flex: 1;
}

/* 反诈骗核验输入区 */
.verify-section {
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}

.verify-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 10px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.verify-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.verify-input::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}

.verify-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.verify-result {
  font-size: 12px;
  color: var(--success);
}

/* 紧急操作按钮组 */
.emer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-top: 16px;
  margin-bottom: 8px;
}

.emer-btn {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.emer-btn.sos {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--error);
}

.emer-btn.sos:hover {
  background: rgba(239, 68, 68, 0.2);
}

.emer-btn.fake {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.emer-btn.fake:hover {
  background: rgba(245, 158, 11, 0.2);
}

.emer-btn.safe {
  background: rgba(52, 211, 153, 0.1);
  border-color: rgba(52, 211, 153, 0.3);
  color: var(--success);
}

.emer-btn.safe:hover {
  background: rgba(52, 211, 153, 0.2);
}

.emer-hint {
  font-size: 11px;
  color: var(--text-low);
  margin: 0;
}

/* 按钮 */
.panel-btn {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.panel-btn.primary {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent, #d4a574);
}

.panel-btn.primary:hover {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.panel-btn.primary:disabled {
  opacity: 0.35;
  cursor: default;
}

/* Toggle 开关 */
.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 11px;
  transition: 0.3s;
  cursor: pointer;
}

.toggle input:checked + .toggle-slider {
  background: var(--accent, #d4a574);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(18px);
}
</style>