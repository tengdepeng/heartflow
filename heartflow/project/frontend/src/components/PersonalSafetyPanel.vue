<template>
  <section class="ps-panel" aria-label="人身安全守护">
    <div class="ps-panel-head">
      <span class="ps-panel-title">🛡️ 人身安全</span>
      <span class="ps-panel-sub">SOS · 跌倒检测 · 紧急联系人</span>
    </div>

    <!-- SOS -->
    <div class="ps-block">
      <div class="ps-block-head">
        <span class="ps-block-label">🚨 SOS 紧急求助</span>
        <span class="ps-status" :class="`ps-status-${sosStatus}`">{{ sosStatusLabel }}</span>
      </div>
      <div class="ps-row">
        <input v-model="sosLocation" class="ps-input" placeholder="当前位置（可选）" />
        <button v-if="sosStatus === 'idle' || sosStatus === 'cancelled'" class="ps-btn ps-btn-sos" @click="onTriggerSOS">触发 SOS</button>
        <button v-else-if="sosStatus === 'counting'" class="ps-btn ps-btn-cancel" @click="cancelSOS">取消</button>
        <button v-else class="ps-btn" @click="resetSOS">重置</button>
      </div>
      <div class="ps-config">
        <label class="ps-cfg-item">倒计时 <input v-model.number="sosConfig.countdownSeconds" type="number" min="0" class="ps-input ps-input-xs" /></label>
        <label class="ps-cfg-item"><input v-model="sosConfig.autoSendLocation" type="checkbox" /> 自动发位置</label>
        <label class="ps-cfg-item"><input v-model="sosConfig.playAlarm" type="checkbox" /> 警报音</label>
        <label class="ps-cfg-item"><input v-model="sosConfig.autoDial" type="checkbox" /> 自动拨号</label>
      </div>
      <ul v-if="sosEvents.length" class="ps-list">
        <li v-for="e in sosEvents.slice(0, 5)" :key="e.id" class="ps-item">
          <span class="ps-item-icon">🆘</span>
          <span class="ps-item-text">{{ fmtTime(e.timestamp) }} · {{ e.status }}<template v-if="e.location"> · {{ e.location }}</template></span>
        </li>
      </ul>
    </div>

    <!-- 紧急联系人 -->
    <div class="ps-block">
      <span class="ps-block-label">📞 紧急联系人 · {{ contacts.length }}</span>
      <div class="ps-row">
        <input v-model="contactForm.name" class="ps-input" placeholder="姓名" />
        <input v-model="contactForm.phone" class="ps-input" placeholder="电话" />
        <select v-model="contactForm.priority" class="ps-select">
          <option value="primary">主要</option>
          <option value="secondary">次要</option>
        </select>
        <button class="ps-btn ps-btn-primary" @click="addContact">添加</button>
      </div>
      <ul v-if="contacts.length" class="ps-list">
        <li v-for="c in contacts" :key="c.id" class="ps-item">
          <span class="ps-item-icon">{{ c.priority === 'primary' ? '⭐' : '👤' }}</span>
          <span class="ps-item-text">{{ c.name }} · {{ c.phone }}</span>
          <span class="ps-item-relation">{{ c.priority === 'primary' ? '主要联系人' : '次要联系人' }}</span>
          <button class="ps-btn ps-btn-sm" @click="removeContact(c.id)">移除</button>
        </li>
      </ul>
    </div>

    <!-- 跌倒检测 -->
    <div class="ps-block">
      <div class="ps-block-head">
        <span class="ps-block-label">🦵 跌倒检测 · {{ fallStats.total }} 次</span>
        <label class="ps-cfg-item"><input v-model="fallConfig.enabled" type="checkbox" /> 启用</label>
      </div>
      <div class="ps-row">
        <span class="ps-hint">灵敏度 {{ Math.round(fallConfig.sensitivity * 100) }}%</span>
        <input v-model.number="fallConfig.sensitivity" type="range" min="0" max="1" step="0.05" class="ps-range" />
        <button class="ps-btn" @click="simulateFall">模拟跌倒</button>
      </div>
      <div class="ps-ov">
        <span>24h内 {{ fallStats.recent24h }}</span>
        <span>误报 {{ fallStats.falseAlarms }}</span>
        <span>触发SOS {{ fallStats.triggeredSOS }}</span>
      </div>
      <ul v-if="fallEvents.length" class="ps-list">
        <li v-for="f in fallEvents.slice(0, 5)" :key="f.id" class="ps-item">
          <span class="ps-item-icon">⚠️</span>
          <span class="ps-item-text">{{ fmtTime(f.timestamp) }} · 置信度 {{ Math.round(f.confidence * 100) }}%{{ f.falseAlarm ? ' · 已误报' : '' }}</span>
          <button v-if="!f.falseAlarm" class="ps-btn ps-btn-sm" @click="markFalse(f.id)">误报</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePersonalSafety } from '../modules/safety/composables/usePersonalSafety'
import type { EmergencyContact } from '../modules/safety/types'

const safety = usePersonalSafety()

const contacts = safety.contacts
const sosStatus = safety.sosStatus
const sosEvents = safety.sosEvents
const sosConfig = safety.sosConfig
const fallEvents = safety.fallEvents
const fallConfig = safety.fallConfig
const fallStats = safety.fallStats

const sosLocation = ref('')
const contactForm = ref({ name: '', phone: '', priority: 'primary' as EmergencyContact['priority'] })

const sosStatusLabel = computed(() => {
  const map: Record<string, string> = {
    idle: '待命', counting: '倒计时中', triggered: '已触发', cancelled: '已取消', sent: '已发送',
  }
  return map[sosStatus.value] ?? sosStatus.value
})

function onTriggerSOS() {
  safety.triggerSOS(sosLocation.value.trim() || undefined)
  sosLocation.value = ''
}

function cancelSOS() {
  safety.cancelSOS()
}

function resetSOS() {
  safety.resetSOS()
}

function addContact() {
  const name = contactForm.value.name.trim()
  const phone = contactForm.value.phone.trim()
  if (!name || !phone) return
  safety.addContact({
    name,
    phone,
    priority: contactForm.value.priority,
  })
  contactForm.value = { name: '', phone: '', priority: 'primary' as EmergencyContact['priority'] }
}

function removeContact(id: string) {
  safety.removeContact(id)
}

function simulateFall() {
  safety.detectFall({ x: 0.8, y: 12.5, z: 0.9 })
}

function markFalse(id: string) {
  safety.markFalseAlarm(id)
}

function fmtTime(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.ps-panel {
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
.ps-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.ps-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.ps-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.ps-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.ps-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ps-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.ps-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ps-select,
.ps-input {
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.ps-input { width: 130px; }
.ps-input-xs { width: 56px; }
.ps-select option { background: #14161d; color: rgba(240, 242, 255, 0.85); }
.ps-btn {
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s ease;
}
.ps-btn:hover { background: rgba(255, 255, 255, 0.09); }
.ps-btn-primary {
  background: rgba(138, 154, 122, 0.18);
  border-color: rgba(138, 154, 122, 0.35);
  color: #b8c4a0;
}
.ps-btn-sos {
  background: rgba(196, 106, 90, 0.22);
  border-color: rgba(196, 106, 90, 0.4);
  color: #e0a090;
}
.ps-btn-cancel {
  background: rgba(240, 192, 64, 0.16);
  border-color: rgba(240, 192, 64, 0.3);
  color: #f0c040;
}
.ps-btn-sm { padding: 4px 10px; font-size: 11px; }
.ps-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-medium);
}
.ps-status-sent { background: rgba(196, 106, 90, 0.2); color: #e0a090; }
.ps-status-counting { background: rgba(240, 192, 64, 0.18); color: #f0c040; }
.ps-config {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.ps-cfg-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-medium);
}
.ps-range { flex: 1; min-width: 120px; accent-color: #8a9a7a; }
.ps-ov {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-medium);
}
.ps-hint { font-size: 11px; color: var(--text-low); }
.ps-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ps-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 12px;
}
.ps-item-icon { flex: none; }
.ps-item-text { flex: 1; color: rgba(240, 242, 255, 0.85); }
.ps-item-relation { font-size: 11px; color: var(--text-low); }
</style>
