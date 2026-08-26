<template>
  <section class="val-panel" aria-label="自动锁定">
    <div class="val-panel-head">
      <span class="val-panel-title">⏱ 自动锁定</span>
      <span class="val-panel-sub">空闲计时 · 切页保护</span>
    </div>

    <!-- 空闲锁定 -->
    <div class="val-block">
      <span class="val-block-label">空闲自动锁定</span>
      <div class="val-row">
        <select :value="settings.idleMinutes" class="val-select" @change="onIdleChange">
          <option v-for="m in IDLE_OPTIONS" :key="m" :value="m">{{ idleLabel(m) }}</option>
        </select>
        <span class="val-hint">{{ idleHint }}</span>
      </div>
    </div>

    <!-- 切页保护 -->
    <div class="val-block">
      <span class="val-block-label">页面保护</span>
      <label class="val-check">
        <input type="checkbox" :checked="settings.lockOnBlur" @change="onBlurChange" />
        切换离开页面时立即锁定
      </label>
    </div>

    <p class="val-status" :class="{ on: active }">
      {{ active ? '● 自动锁定已启用' : '○ 自动锁定未启用' }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IDLE_OPTIONS } from '../modules/vault/auto-lock'
import type { AutoLockSettings } from '../modules/vault/auto-lock'

const props = defineProps<{ settings: AutoLockSettings }>()
const emit = defineEmits<{ (e: 'update', patch: Partial<AutoLockSettings>): void }>()

const active = computed(() => props.settings.idleMinutes > 0 || props.settings.lockOnBlur)

const idleHint = computed(() => {
  if (props.settings.idleMinutes <= 0) return '空闲锁定已关闭'
  return `无操作 ${props.settings.idleMinutes} 分钟后自动锁定`
})

function idleLabel(m: number) {
  return m === 0 ? '关闭' : `${m} 分钟`
}

function onIdleChange(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  emit('update', { idleMinutes: v })
}

function onBlurChange(e: Event) {
  emit('update', { lockOnBlur: (e.target as HTMLInputElement).checked })
}
</script>

<style scoped>
.val-panel {
  width: 100%;
  max-width: 520px;
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
.val-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.val-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.val-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.val-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.val-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.val-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.val-select {
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.val-hint {
  font-size: 11px;
  color: var(--text-low);
}
.val-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(240, 242, 255, 0.8);
  cursor: pointer;
}
.val-status {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--text-low);
}
.val-status.on {
  color: #8a9a7a;
}
</style>
