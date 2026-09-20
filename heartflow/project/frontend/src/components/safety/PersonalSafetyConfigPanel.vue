<template>
  <div data-enter class="safety-panel personal-safety-config-panel">
    <div class="panel-header">
      <span class="panel-icon">&#x1F6E1;</span>
      <div>
        <h4 class="panel-title">人身安全</h4>
        <p class="panel-desc">位置共享与健康数据的隐私开关（守护室配置）</p>
      </div>
    </div>

    <div class="panel-body">
      <!-- 位置信息共享 -->
      <div class="setting-row">
        <span class="setting-label">位置信息共享</span>
        <label class="toggle">
          <input type="checkbox" :checked="personalSafety.locationSharingEnabled" @change="setLocationSharing" data-test="location-toggle" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 健康数据启用 -->
      <div class="setting-row">
        <span class="setting-label">健康数据记录</span>
        <label class="toggle">
          <input type="checkbox" :checked="personalSafety.healthDataEnabled" @change="setHealthData" data-test="health-toggle" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 紧急联系人（联系人与 SOS 在「人身安全」面板维护） -->
      <div class="setting-row">
        <span class="setting-label">已设紧急联系人</span>
        <span class="setting-value backup-time" data-test="contacts-count">{{ contactsCount }} 位</span>
      </div>
      <p class="enc-hint" v-if="contactsCount === 0">
        尚未设置紧急联系人。请到「人身安全」面板添加联系人并维护 SOS/跌倒检测。
      </p>

      <!-- 重载配置 -->
      <div class="panel-actions">
        <button class="panel-btn primary" @click="doReload" data-test="reload-btn">&#x21BB; 从存储重载配置</button>
      </div>
      <p v-if="reloadMsg" class="enc-hint" data-test="reload-msg">{{ reloadMsg }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getSafetyConfig, updatePersonalSafety, reloadSafetyConfig } from '../../modules/safety'

const config = getSafetyConfig()
const personalSafety = computed(() => config.value.personalSafety)
const contactsCount = computed(() => personalSafety.value.emergencyContacts.length)

const reloadMsg = ref('')
let reloadTimer: ReturnType<typeof setTimeout> | null = null

function setLocationSharing(e: Event) {
  updatePersonalSafety({ locationSharingEnabled: (e.target as HTMLInputElement).checked })
}

function setHealthData(e: Event) {
  updatePersonalSafety({ healthDataEnabled: (e.target as HTMLInputElement).checked })
}

function doReload() {
  reloadSafetyConfig()
  reloadMsg.value = '已从存储重新载入配置'
  if (reloadTimer) clearTimeout(reloadTimer)
  reloadTimer = setTimeout(() => { reloadMsg.value = '' }, 1600)
}
</script>

<style scoped>
.personal-safety-config-panel {
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border, rgba(var(--accent-rgb), 0.12));
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
  transition: all var(--transition, 0.25s ease);
}

.personal-safety-config-panel:hover {
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

.panel-icon { font-size: 24px; line-height: 1; flex-shrink: 0; }
.panel-title { font-size: 15px; font-weight: 500; color: rgba(var(--text-primary-rgb), 0.75); margin: 0 0 4px; }
.panel-desc { font-size: 11px; color: var(--text-low); margin: 0; }

.panel-body { display: flex; flex-direction: column; gap: 2px; }

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.65);
}
.setting-label { flex: 1; }
.setting-value { font-size: 12px; color: rgba(var(--text-primary-rgb), 0.45); }
.backup-time { color: var(--accent, #d4a574); }

.enc-hint {
  margin: 0;
  padding: 8px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(var(--accent-rgb), 0.7);
}

.panel-actions { display: flex; gap: 8px; margin-top: 12px; }
.panel-btn { flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.2s; text-align: center; }
.panel-btn.primary {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent, #d4a574);
}
.panel-btn.primary:hover { background: rgba(var(--accent-rgb), 0.14); border-color: rgba(var(--accent-rgb), 0.3); }
.panel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.toggle { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; inset: 0; background: rgba(255, 255, 255, 0.08); border-radius: 11px; transition: 0.3s; cursor: pointer; }
.toggle input:checked + .toggle-slider { background: var(--accent, #d4a574); }
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
.toggle input:checked + .toggle-slider::before { transform: translateX(18px); }
</style>