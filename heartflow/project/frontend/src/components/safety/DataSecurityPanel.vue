<template>
  <div data-enter class="safety-panel data-security-panel">
    <div class="panel-header">
      <span class="panel-icon">&#x1F512;</span>
      <div>
        <h4 class="panel-title">数据安全</h4>
        <p class="panel-desc">本地存储加密和备份状态管理</p>
      </div>
    </div>

    <div class="panel-body">
      <!-- 数据加密开关（B0：接活为真正的整库加密） -->
      <div class="setting-row">
        <span class="setting-label">数据加密（本地存储）</span>
        <label class="toggle">
          <input type="checkbox" :checked="encryptionOn" @change="toggleEncryption" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <p v-if="encryptionOn" class="enc-hint">
        已启用：整库 AES-GCM-256 加密落盘。本机已开启设备兜底解锁——即使忘记口令，也能在本机恢复数据。
      </p>

      <div v-if="encryptionOn" class="panel-actions inline">
        <button class="panel-btn" @click="openChange">修改口令</button>
        <button class="panel-btn danger" @click="disableConfirmOpen = true">关闭加密</button>
      </div>

      <!-- 自动备份 -->
      <div class="setting-row">
        <span class="setting-label">自动备份</span>
        <label class="toggle">
          <input type="checkbox" :checked="dataSecurity.backupEnabled" @change="toggleBackup" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 备份间隔 -->
      <div class="setting-row" v-if="dataSecurity.backupEnabled">
        <span class="setting-label">备份间隔</span>
        <select
          class="panel-select"
          :value="dataSecurity.autoBackupInterval"
          @change="updateBackupInterval"
        >
          <option :value="6">每 6 小时</option>
          <option :value="12">每 12 小时</option>
          <option :value="24">每 24 小时</option>
          <option :value="48">每 48 小时</option>
          <option :value="72">每 72 小时</option>
        </select>
      </div>

      <!-- 自毁计时器 -->
      <div class="setting-row">
        <span class="setting-label">自毁计时器</span>
        <select
          class="panel-select"
          :value="dataSecurity.selfDestructTimer"
          @change="updateSelfDestruct"
        >
          <option :value="0">禁用</option>
          <option :value="7">7 天</option>
          <option :value="14">14 天</option>
          <option :value="30">30 天</option>
          <option :value="60">60 天</option>
          <option :value="90">90 天</option>
        </select>
      </div>

      <!-- 上次备份时间 -->
      <div class="setting-row">
        <span class="setting-label">上次备份</span>
        <span class="setting-value backup-time">{{ formatBackupTime(dataSecurity.lastBackupTime) }}</span>
      </div>

      <!-- 备份统计 -->
      <div class="backup-stats">
        <div class="stat-item">
          <span class="stat-num">{{ backupStatus.backupCount }}</span>
          <span class="stat-desc">备份次数</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ backupStatus.totalSize > 1024 ? (backupStatus.totalSize / 1024).toFixed(1) + 'KB' : backupStatus.totalSize + 'B' }}</span>
          <span class="stat-desc">备份大小</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="panel-actions">
        <button class="panel-btn primary" @click="handleBackup">&#x1F4BE; 手动备份</button>
        <button class="panel-btn danger" @click="handleClear">&#x1F5D1; 清除数据</button>
      </div>
    </div>

    <!-- 启用加密：设口令模态 -->
    <div v-if="setModalOpen" class="modal-mask" @click.self="setModalOpen = false">
      <div class="modal-card">
        <h4 class="modal-title">启用本地存储加密</h4>
        <p class="modal-warn">
          ⚠ 口令将用于加密全部本地数据。忘记口令将无法恢复（本机可用设备兜底解锁）。
          建议启用前先手动备份。
        </p>
        <input type="password" v-model="setPw" class="modal-input" placeholder="设口令（≥4 位）" />
        <input type="password" v-model="setConfirm" class="modal-input" placeholder="确认口令" />
        <input type="text" v-model="setHint" class="modal-input" placeholder="口令提示（可选）" />
        <p v-if="setError" class="modal-err">{{ setError }}</p>
        <div class="modal-actions">
          <button class="panel-btn" @click="setModalOpen = false">取消</button>
          <button class="panel-btn primary" :disabled="busy" @click="confirmEnable">启用加密</button>
        </div>
      </div>
    </div>

    <!-- 修改口令模态 -->
    <div v-if="changeModalOpen" class="modal-mask" @click.self="changeModalOpen = false">
      <div class="modal-card">
        <h4 class="modal-title">修改存储口令</h4>
        <input type="password" v-model="changeOld" class="modal-input" placeholder="当前口令" />
        <input type="password" v-model="changeNew" class="modal-input" placeholder="新口令（≥4 位）" />
        <input type="password" v-model="changeConfirm" class="modal-input" placeholder="确认新口令" />
        <p v-if="changeError" class="modal-err">{{ changeError }}</p>
        <div class="modal-actions">
          <button class="panel-btn" @click="changeModalOpen = false">取消</button>
          <button class="panel-btn primary" :disabled="busy" @click="confirmChange">修改口令</button>
        </div>
      </div>
    </div>

    <!-- 关闭加密确认 -->
    <div v-if="disableConfirmOpen" class="modal-mask" @click.self="disableConfirmOpen = false">
      <div class="modal-card">
        <h4 class="modal-title">关闭本地存储加密</h4>
        <p class="modal-warn">关闭后整库将以明文 JSON 落盘，任何能访问本机文件者均可读取。确定继续？</p>
        <div class="modal-actions">
          <button class="panel-btn" @click="disableConfirmOpen = false">取消</button>
          <button class="panel-btn danger" :disabled="busy" @click="confirmDisable">关闭加密</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useViewEntrance } from '../../composables/useViewEntrance'
import { useDataSecurity } from '../../modules/safety/composables/useDataSecurity'
import { getSafetyConfig, updateDataSecurity } from '../../modules/safety'
import { useUnlockStore } from '../../stores/unlock'

useViewEntrance()

const { backupStatus, formatBackupTime, backupData, clearData } = useDataSecurity()

const config = getSafetyConfig()
const dataSecurity = computed(() => config.value.dataSecurity)
const unlockStore = useUnlockStore()
const encryptionOn = computed(() => unlockStore.isEncryptionActive)

const busy = ref(false)

// 启用加密模态
const setModalOpen = ref(false)
const setPw = ref('')
const setConfirm = ref('')
const setHint = ref('')
const setError = ref('')

// 修改口令模态
const changeModalOpen = ref(false)
const changeOld = ref('')
const changeNew = ref('')
const changeConfirm = ref('')
const changeError = ref('')

// 关闭加密确认
const disableConfirmOpen = ref(false)

function toggleEncryption(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (checked) {
    resetSet()
    setModalOpen.value = true
  } else {
    disableConfirmOpen.value = true
  }
}

function openChange() {
  changeOld.value = ''
  changeNew.value = ''
  changeConfirm.value = ''
  changeError.value = ''
  changeModalOpen.value = true
}

function resetSet() {
  setPw.value = ''
  setConfirm.value = ''
  setHint.value = ''
  setError.value = ''
}

async function confirmEnable() {
  if (setPw.value.length < 4) { setError.value = '口令至少 4 位'; return }
  if (setPw.value !== setConfirm.value) { setError.value = '两次输入不一致'; return }
  busy.value = true
  setError.value = ''
  try {
    await unlockStore.enable(setPw.value)
    updateDataSecurity({ encryptionEnabled: true })
    setModalOpen.value = false
  } catch {
    setError.value = '启用失败，请重试'
  } finally {
    busy.value = false
    resetSet()
  }
}

async function confirmChange() {
  if (changeNew.value.length < 4) { changeError.value = '口令至少 4 位'; return }
  if (changeNew.value !== changeConfirm.value) { changeError.value = '两次输入不一致'; return }
  busy.value = true
  changeError.value = ''
  const ok = await unlockStore.change(changeOld.value, changeNew.value)
  busy.value = false
  if (!ok) { changeError.value = '当前口令错误'; return }
  changeModalOpen.value = false
}

async function confirmDisable() {
  busy.value = true
  try {
    await unlockStore.disable()
    updateDataSecurity({ encryptionEnabled: false })
    disableConfirmOpen.value = false
  } finally {
    busy.value = false
  }
}

function toggleBackup(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  updateDataSecurity({ backupEnabled: checked })
}

function updateBackupInterval(e: Event) {
  const value = Number((e.target as HTMLSelectElement).value)
  updateDataSecurity({ autoBackupInterval: value })
}

function updateSelfDestruct(e: Event) {
  const value = Number((e.target as HTMLSelectElement).value)
  updateDataSecurity({ selfDestructTimer: value })
}

function handleBackup() {
  backupData()
  updateDataSecurity({ lastBackupTime: Date.now() })
}

function handleClear() {
  const cleared = clearData()
  if (cleared) {
    updateDataSecurity({
      encryptionEnabled: false,
      backupEnabled: false,
      lastBackupTime: null,
    })
  }
}
</script>

<style scoped>
/* 复用 GuardRoom.vue 中的子卡片样式，仅做面板级扩展 */
.data-security-panel {
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border, rgba(var(--accent-rgb), 0.12));
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
  transition: all var(--transition, 0.25s cubic-bezier(0.4, 0, 0.2, 1));
}

.data-security-panel:hover {
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

.setting-value {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.backup-time {
  color: var(--accent, #d4a574);
}

.enc-hint {
  margin: 0;
  padding: 8px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(var(--accent-rgb), 0.7);
}

.backup-stats {
  display: flex;
  gap: 12px;
  padding: 12px 0;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.stat-num {
  font-size: 18px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.8);
}

.stat-desc {
  font-size: 11px;
  color: var(--text-low);
}

.panel-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.panel-actions.inline {
  margin-top: 8px;
}

.panel-btn {
  flex: 1;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
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

.panel-btn.danger {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--error);
}

.panel-btn.danger:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
}

.panel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-select {
  padding: 6px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  cursor: pointer;
}

.panel-select:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

/* Toggle 开关 — 复用 GuardRoom 风格 */
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

/* 模态 */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
}

.modal-card {
  width: min(360px, 88vw);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(42, 36, 30, 0.96);
  border: 1px solid rgba(212, 165, 116, 0.22);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: rgba(245, 232, 210, 0.9);
}

.modal-warn {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(245, 232, 210, 0.55);
}

.modal-input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(212, 165, 116, 0.22);
  background: rgba(20, 16, 14, 0.5);
  color: rgba(245, 232, 210, 0.9);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.modal-input:focus {
  border-color: rgba(212, 165, 116, 0.5);
}

.modal-err {
  margin: 0;
  font-size: 12px;
  color: #ef8a8a;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
