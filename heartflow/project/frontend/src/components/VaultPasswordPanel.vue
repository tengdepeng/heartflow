<template>
  <section data-enter class="vpp">
    <h3 class="vpp-title">🔑 密码生成器</h3>
    <p class="vpp-kicker">本地生成强密码与可读口令短语，不联网、不落盘</p>

    <!-- 生成类型切换 -->
    <div class="vpp-mode">
      <button class="vpp-mode-btn" :class="{ active: mode === 'password' }" type="button" @click="mode = 'password'">密码</button>
      <button class="vpp-mode-btn" :class="{ active: mode === 'phrase' }" type="button" @click="mode = 'phrase'">口令短语</button>
    </div>

    <!-- 密码模式 -->
    <div v-if="mode === 'password'" class="vpp-body">
      <div class="vpp-presets">
        <button
          v-for="p in PASSWORD_PRESETS"
          :key="p.label"
          class="vpp-chip"
          :class="{ active: isPresetActive(p) }"
          type="button"
          @click="applyPreset(p.label)"
        >{{ p.label }}</button>
      </div>

      <label class="vpp-row">
        <span class="vpp-row-label">长度</span>
        <input v-model.number="length" type="range" min="4" max="64" :step="1" class="vpp-range" />
        <span class="vpp-row-value">{{ length }}</span>
      </label>

      <div class="vpp-opts">
        <label class="vpp-opt"><input type="checkbox" v-model="includeLower" /> <span>小写 a-z</span></label>
        <label class="vpp-opt"><input type="checkbox" v-model="includeUpper" /> <span>大写 A-Z</span></label>
        <label class="vpp-opt"><input type="checkbox" v-model="includeDigits" /> <span>数字</span></label>
        <label class="vpp-opt"><input type="checkbox" v-model="includeSymbols" /> <span>符号</span></label>
        <label class="vpp-opt"><input type="checkbox" v-model="excludeAmbiguous" /> <span>排除易混淆</span></label>
        <label class="vpp-opt"><input type="checkbox" v-model="requireEach" /> <span>每类至少一个</span></label>
      </div>

      <button class="vpp-gen" type="button" @click="generate">🔄 生成密码</button>

      <div class="vpp-result">
        <input :value="result" readonly class="vpp-result-input" data-test="password" />
        <button class="vpp-copy" type="button" @click="copy(result)">{{ copied ? '✓ 已复制' : '复制' }}</button>
      </div>
      <div class="vpp-strength">
        <div class="vpp-meter"><div class="vpp-meter-fill" :style="{ width: strength.score + '%', background: strength.color }" /></div>
        <span class="vpp-strength-label" :style="{ color: strength.color }">强度 {{ strength.label }}（{{ strength.score }}）</span>
      </div>
    </div>

    <!-- 口令短语模式 -->
    <div v-else class="vpp-body">
      <label class="vpp-row">
        <span class="vpp-row-label">词数</span>
        <input v-model.number="wordCount" type="range" min="2" max="8" :step="1" class="vpp-range" />
        <span class="vpp-row-value">{{ wordCount }}</span>
      </label>
      <label class="vpp-row">
        <span class="vpp-row-label">分隔符</span>
        <select v-model="separator" class="vpp-select">
          <option value="-">连字符 -</option><option value=".">点号 .</option>
          <option value="_">下划线 _</option><option value=" ">空格</option>
        </select>
      </label>

      <button class="vpp-gen" type="button" @click="generate">🔄 生成口令</button>

      <div class="vpp-result">
        <input :value="result" readonly class="vpp-result-input" data-test="phrase" />
        <button class="vpp-copy" type="button" @click="copy(result)">{{ copied ? '✓ 已复制' : '复制' }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  generatePassword,
  generatePassphrase,
  evaluatePasswordStrength,
  DEFAULT_PASSWORD_CONFIG,
  PASSWORD_PRESETS,
  type PasswordGeneratorConfig,
} from '../modules/vault/password-generator'

const mode = ref<'password' | 'phrase'>('password')

// ---- 密码配置 ----
const length = ref(DEFAULT_PASSWORD_CONFIG.length)
const includeLower = ref(DEFAULT_PASSWORD_CONFIG.includeLower)
const includeUpper = ref(DEFAULT_PASSWORD_CONFIG.includeUpper)
const includeDigits = ref(DEFAULT_PASSWORD_CONFIG.includeDigits)
const includeSymbols = ref(DEFAULT_PASSWORD_CONFIG.includeSymbols)
const excludeAmbiguous = ref(DEFAULT_PASSWORD_CONFIG.excludeAmbiguous)
const requireEach = ref(DEFAULT_PASSWORD_CONFIG.requireEach)

// ---- 口令短语 ----
const wordCount = ref(4)
const separator = ref('-')

const result = ref('')
const copied = ref(false)

const config = computed<PasswordGeneratorConfig>(() => ({
  length: Math.max(4, Math.min(64, length.value)),
  includeLower: includeLower.value,
  includeUpper: includeUpper.value,
  includeDigits: includeDigits.value,
  includeSymbols: includeSymbols.value,
  excludeAmbiguous: excludeAmbiguous.value,
  requireEach: requireEach.value,
}))

const strength = computed(() => evaluatePasswordStrength(result.value))

function isPresetActive(p: (typeof PASSWORD_PRESETS)[number]): boolean {
  const c = p.config
  return (
    length.value === c.length &&
    includeLower.value === c.includeLower &&
    includeUpper.value === c.includeUpper &&
    includeDigits.value === c.includeDigits &&
    includeSymbols.value === c.includeSymbols &&
    excludeAmbiguous.value === c.excludeAmbiguous &&
    requireEach.value === c.requireEach
  )
}

function applyPreset(label: string) {
  const p = PASSWORD_PRESETS.find((x) => x.label === label)
  if (!p) return
  mode.value = 'password'
  length.value = p.config.length
  includeLower.value = p.config.includeLower
  includeUpper.value = p.config.includeUpper
  includeDigits.value = p.config.includeDigits
  includeSymbols.value = p.config.includeSymbols
  excludeAmbiguous.value = p.config.excludeAmbiguous
  requireEach.value = p.config.requireEach
  generate()
}

function generate() {
  copied.value = false
  result.value =
    mode.value === 'phrase'
      ? generatePassphrase(Math.max(2, Math.min(8, wordCount.value)), separator.value)
      : generatePassword(config.value)
}

function copy(text: string) {
  try {
    navigator.clipboard?.writeText(text)
    copied.value = true
  } catch {
    copied.value = false
  }
}

// ---- 配置变更即自动重生成（保持结果与图形一致） ----
watch(config, () => { if (mode.value === 'password') generate() }, { deep: true })

onMounted(() => generate())
</script>

<style scoped>
.vpp {
  position: relative;
  z-index: 1;
  margin-bottom: 28px;
  padding: 20px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.vpp-title { font-size: 15px; font-weight: 500; margin: 0 0 4px; color: var(--text-high); }
.vpp-kicker { font-size: 11px; color: var(--text-secondary); margin: 0 0 14px; }

.vpp-mode { display: flex; gap: 8px; margin-bottom: 14px; }
.vpp-mode-btn {
  flex: 1;
  padding: 7px 0;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.vpp-mode-btn.active { background: rgba(var(--accent-rgb), 0.12); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.35); }

.vpp-body { display: flex; flex-direction: column; gap: 12px; }

.vpp-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.vpp-chip {
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: transparent;
  color: var(--text-medium);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.vpp-chip.active { background: rgba(var(--accent-rgb), 0.1); color: var(--accent); }

.vpp-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-bright); }
.vpp-row-label { width: 48px; flex: none; }
.vpp-range { flex: 1; accent-color: var(--accent); }
.vpp-row-value { width: 24px; text-align: right; font-variant-numeric: tabular-nums; color: var(--accent); }
.vpp-select {
  flex: 1;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}

.vpp-opts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.vpp-opt { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-medium); cursor: pointer; }
.vpp-opt input { accent-color: var(--accent); }

.vpp-gen {
  padding: 9px 0;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
}
.vpp-gen:hover { background: rgba(var(--accent-rgb), 0.16); }

.vpp-result { display: flex; gap: 8px; align-items: stretch; }
.vpp-result-input {
  flex: 1;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.6);
  color: var(--text-high);
  font-size: 14px;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.5px;
  outline: none;
}
.vpp-copy {
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.vpp-copy:hover { background: rgba(var(--accent-rgb), 0.14); }

.vpp-strength { display: flex; align-items: center; gap: 10px; }
.vpp-meter { flex: 1; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.04); overflow: hidden; }
.vpp-meter-fill { height: 100%; border-radius: 3px; transition: width 0.3s, background 0.3s; }
.vpp-strength-label { font-size: 11px; white-space: nowrap; }

@media (max-width: 640px) {
  .vpp-opts { grid-template-columns: 1fr; }
}
</style>