<template>
  <section class="csp csp-panel">
    <header class="csp-head">
      <h3 class="csp-title">🧭 协调权</h3>
      <p class="csp-sub">镜我的总管与协调职能可转移给其他幕僚，也可完全关闭集中协调机制</p>
    </header>

    <div class="csp-current">
      <span class="csp-current-label">当前协调者</span>
      <span v-if="currentCoordinator" class="csp-current-value">
        {{ currentCoordinator.name }}
        <span class="csp-current-role">{{ currentCoordinator.role || '幕僚' }}</span>
      </span>
      <span v-else class="csp-current-value--none">未设置协调者</span>
    </div>

    <div class="csp-modes">
      <button
        v-for="m in modes"
        :key="m.mode"
        class="csp-mode"
        :class="{ on: config.mode === m.mode }"
        :data-mode="m.mode"
        @click="selectMode(m.mode)"
      >
        <span class="csp-mode-label">{{ m.label }}</span>
        <span class="csp-mode-desc">{{ m.desc }}</span>
      </button>
    </div>

    <div v-if="config.mode === 'custom'" class="csp-custom">
      <label class="csp-field">指定幕僚
        <select v-model="selectedAdvisor" class="csp-input" @change="applyCustom">
          <option v-for="a in activeAdvisors" :key="a.id" :value="a.id">{{ a.name }}（{{ a.role || '幕僚' }}）</option>
          <option v-if="activeAdvisors.length === 0" value="">无在位幕僚</option>
        </select>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import {
  getCoordinatorConfig,
  setCoordinatorConfig,
  resolveCoordinator,
  type CoordinatorMode,
  type CoordinatorConfig,
} from '@/modules/advisor/coordinator'
import type { AdvisorProfile } from '@/types'

const DEFAULT_CONFIG: CoordinatorConfig = { mode: 'jingwo', advisorId: undefined }
const config = reactive<CoordinatorConfig>(getCoordinatorConfig() ?? DEFAULT_CONFIG)
const selectedAdvisor = ref<string>(config.advisorId ?? '')
const advisors = computed<AdvisorProfile[]>(
  () => (storage.getAdvisors() as AdvisorProfile[] | null | undefined) ?? [],
)
const activeAdvisors = computed(() =>
  advisors.value.filter(a => !a.retired && a.state !== 'slumber'),
)
const currentCoordinator = computed(() => {
  if (config.mode === 'off') return null
  return resolveCoordinator(advisors.value)
})

const modes: { mode: CoordinatorMode; label: string; desc: string }[] = [
  { mode: 'jingwo', label: '🤲 镜我任协调者', desc: '默认 · 镜我统筹全局调度' },
  { mode: 'custom', label: '🎯 指定幕僚', desc: '不在位时自动回退镜我，保证协调不中断' },
  { mode: 'off', label: '🔕 关闭集中协调', desc: '文案转为中性，不再署名协调者' },
]

function selectMode(mode: CoordinatorMode) {
  if (mode === 'custom') {
    config.mode = 'custom'
    config.advisorId = selectedAdvisor.value || undefined
  } else {
    config.mode = mode
    config.advisorId = undefined
  }
  setCoordinatorConfig({ ...config })
}
function applyCustom() {
  config.advisorId = selectedAdvisor.value || undefined
  setCoordinatorConfig({ ...config })
}
</script>

<style scoped>
.csp-panel {
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  padding: 16px;
  color: var(--hf-text);
  max-width: 480px;
}
.csp-head { margin-bottom: 12px; }
.csp-title { margin: 0; font-size: 16px; }
.csp-sub { margin: 2px 0 0; font-size: 12px; color: var(--hf-text-muted); }
.csp-current { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; }
.csp-current-label { color: var(--hf-text-muted); }
.csp-current-value { font-weight: 600; color: var(--hf-primary); }
.csp-current-role { font-size: 11px; color: var(--hf-text-muted); margin-left: 4px; }
.csp-current-value--none { color: var(--hf-text-muted); font-style: italic; }
.csp-modes { display: flex; flex-direction: column; gap: 8px; }
.csp-mode {
  display: flex; flex-direction: column; gap: 2px; text-align: left;
  background: var(--hf-bg); border: 1px solid var(--hf-border); border-radius: var(--hf-radius);
  padding: 10px; cursor: pointer; color: var(--hf-text);
}
.csp-mode.on { border-color: var(--hf-primary); box-shadow: 0 0 0 1px var(--hf-primary); }
.csp-mode-label { font-size: 14px; font-weight: 600; }
.csp-mode-desc { font-size: 11px; color: var(--hf-text-muted); }
.csp-custom { margin-top: 10px; }
.csp-field { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--hf-text-muted); }
.csp-input { background: var(--hf-surface); border: 1px solid var(--hf-border); border-radius: 6px; padding: 5px 8px; color: var(--hf-text); font-size: 13px; }
</style>
