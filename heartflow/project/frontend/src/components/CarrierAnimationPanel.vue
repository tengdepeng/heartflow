<template>
  <section class="cva">
    <!-- 标题 -->
    <header class="cva-header">
      <h3 class="cva-title">
        <svg class="cva-title-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="7" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
        </svg>
        载体动画与材质混合
      </h3>
      <p class="cva-sub">{{ morphCount }} 种形态 · {{ materialCount }} 种材质 · {{ glowCount }} 种光效 · {{ presetCount }} 套预设</p>
    </header>

    <!-- ============ 实时预览 ============ -->
    <div class="cva-preview-row">
      <div
        class="cva-preview"
        :style="previewStyle"
        :class="{ 'cva-preview--dim': !config.enabled }"
      >
        <span class="cva-preview-icon">{{ MORPH_ICONS[config.morph] }}</span>
        <span class="cva-preview-label">{{ MORPH_LABELS[config.morph] }}</span>
      </div>
      <div class="cva-preview-meta">
        <div class="cva-meta-line">
          <span class="cva-meta-key">形态</span><span class="cva-meta-val">{{ MORPH_LABELS[config.morph] }}</span>
        </div>
        <div class="cva-meta-line">
          <span class="cva-meta-key">材质</span><span class="cva-meta-val">{{ MATERIAL_LABELS[config.material] }}</span>
        </div>
        <div class="cva-meta-line">
          <span class="cva-meta-key">光效</span><span class="cva-meta-val">{{ GLOW_LABELS[config.glow] }}</span>
        </div>
        <div class="cva-meta-line">
          <span class="cva-meta-key">缓动</span><span class="cva-meta-val">{{ EASING_LABELS[config.easing] }}</span>
        </div>
        <div class="cva-meta-line">
          <span class="cva-meta-key">时长</span><span class="cva-meta-val">{{ config.duration }}ms{{ config.loop ? ' · 循环' : '' }}</span>
        </div>
      </div>
    </div>

    <!-- 生成的关键帧 / CSS 输出 -->
    <div class="cva-output">
      <div class="cva-output-block">
        <span class="cva-output-label">生成动画 CSS</span>
        <code class="cva-code">{{ animationCss }}</code>
      </div>
      <div class="cva-output-block">
        <span class="cva-output-label">关键帧</span>
        <button
          class="cva-copy"
          type="button"
          :data-testid="'cva-copy-css'"
          @click="copyKeyframes"
        >复制 CSS</button>
      </div>
      <pre class="cva-pre">{{ keyframes }}</pre>
      <span v-if="copyHint" class="cva-copy-hint">{{ copyHint }}</span>
    </div>

    <!-- ============ 形态选择 ============ -->
    <div class="cva-group">
      <span class="cva-group-label">形态</span>
      <div class="cva-chip-grid">
        <button
          v-for="m in MORPH_ORDER"
          :key="m"
          class="cva-chip"
          :class="{ 'cva-chip--active': config.morph === m }"
          type="button"
          :data-testid="'cva-morph-' + m"
          @click="config.morph = m"
        >
          <span class="cva-chip-icon">{{ MORPH_ICONS[m] }}</span>{{ MORPH_LABELS[m] }}
        </button>
      </div>
    </div>

    <!-- ============ 材质选择 ============ -->
    <div class="cva-group">
      <span class="cva-group-label">材质</span>
      <div class="cva-chip-grid cva-chip-grid--material">
        <button
          v-for="mat in MATERIAL_ORDER"
          :key="mat"
          class="cva-chip cva-chip--material"
          :class="{ 'cva-chip--active': config.material === mat }"
          type="button"
          :data-testid="'cva-material-' + mat"
          @click="config.material = mat"
        >
          <span class="cva-swatch" :style="swatchStyle(mat)"></span>{{ MATERIAL_LABELS[mat] }}
        </button>
      </div>
    </div>

    <!-- ============ 光效 + 缓动 + 时长 + 颜色 ============ -->
    <div class="cva-group cva-group--row">
      <div class="cva-subgroup">
        <span class="cva-group-label">光效</span>
        <div class="cva-chip-grid cva-chip-grid--compact">
          <button
            v-for="g in GLOW_ORDER"
            :key="g"
            class="cva-chip cva-chip--sm"
            :class="{ 'cva-chip--active': config.glow === g }"
            type="button"
            :data-testid="'cva-glow-' + g"
            @click="config.glow = g"
          >{{ GLOW_LABELS[g] }}</button>
        </div>
      </div>
      <div class="cva-subgroup">
        <span class="cva-group-label">缓动</span>
        <div class="cva-chip-grid cva-chip-grid--compact">
          <button
            v-for="e in EASING_ORDER"
            :key="e"
            class="cva-chip cva-chip--sm"
            :class="{ 'cva-chip--active': config.easing === e }"
            type="button"
            :data-testid="'cva-easing-' + e"
            @click="config.easing = e"
          >{{ EASING_LABELS[e] }}</button>
        </div>
      </div>
    </div>

    <div class="cva-control-row">
      <label class="cva-field">
        <span class="cva-field-label">时长 (ms)</span>
        <input v-model.number="config.duration" class="cva-number" type="number" min="200" max="12000" step="100" data-testid="cva-duration" />
      </label>
      <label class="cva-field">
        <span class="cva-field-label">主色</span>
        <input v-model="config.primaryColor" class="cva-color-text" type="text" maxlength="7" data-testid="cva-primary" />
        <input v-model="config.primaryColor" class="cva-color-picker" type="color" />
      </label>
      <label class="cva-field">
        <span class="cva-field-label">辅色</span>
        <input v-model="config.secondaryColor" class="cva-color-text" type="text" maxlength="7" data-testid="cva-secondary" />
        <input v-model="config.secondaryColor" class="cva-color-picker" type="color" />
      </label>
    </div>

    <div class="cva-toggle-row">
      <label class="cva-toggle">
        <input v-model="config.loop" type="checkbox" data-testid="cva-loop" />
        <span>循环播放</span>
      </label>
      <label class="cva-toggle">
        <input v-model="config.enabled" type="checkbox" data-testid="cva-enabled" />
        <span>启用动画</span>
      </label>
    </div>

    <!-- ============ 预设库 ============ -->
    <div class="cva-group">
      <span class="cva-group-label">动画预设 · 点击套用</span>
      <div class="cva-preset-grid">
        <button
          v-for="p in presets"
          :key="p.id"
          class="cva-preset"
          :class="{ 'cva-preset--active': presetIsActive(p) }"
          type="button"
          :data-testid="'cva-preset-' + p.id"
          @click="applyPreset(p)"
        >
          <span class="cva-preset-icon">{{ MORPH_ICONS[p.config.morph] }}</span>
          <span class="cva-preset-name">{{ p.name }}</span>
          <span class="cva-preset-desc">{{ p.description }}</span>
          <span class="cva-preset-tags">{{ MATERIAL_LABELS[p.config.material] }} · {{ GLOW_LABELS[p.config.glow] }} · {{ p.config.duration }}ms</span>
        </button>
      </div>
    </div>

    <!-- ============ 材质混合 ============ -->
    <div class="cva-group">
      <span class="cva-group-label">材质混合</span>
      <div class="cva-blend">
        <div class="cva-blend-selects">
          <label class="cva-field">
            <span class="cva-field-label">源材质</span>
            <select v-model="blendFrom" class="cva-select" data-testid="cva-blend-from">
              <option v-for="mat in MATERIAL_ORDER" :key="mat" :value="mat">{{ MATERIAL_LABELS[mat] }}</option>
            </select>
          </label>
          <label class="cva-field">
            <span class="cva-field-label">目标材质</span>
            <select v-model="blendTo" class="cva-select" data-testid="cva-blend-to">
              <option v-for="mat in MATERIAL_ORDER" :key="mat" :value="mat">{{ MATERIAL_LABELS[mat] }}</option>
            </select>
          </label>
          <label class="cva-field">
            <span class="cva-field-label">混合比例 {{ blendRatio.toFixed(2) }}</span>
            <input v-model.number="blendRatio" class="cva-range" type="range" min="0" max="1" step="0.05" data-testid="cva-blend-ratio" />
          </label>
        </div>
        <div class="cva-blend-result">
          <span class="cva-blend-result-label">混合结果</span>
          <span class="cva-blend-list">
            {{ MATERIAL_LABELS[blendFrom] }} ⇀ {{ MATERIAL_LABELS[blendTo] }}
          </span>
          <div class="cva-blend-swatches">
            <span class="cva-swatch cva-swatch--lg" :style="swatchStyle(blendFrom)"></span>
            <span class="cva-blend-arrow">→</span>
            <span class="cva-swatch cva-swatch--lg cva-swatch--mixed" :style="swatchStyle(blendResult)"></span>
          </div>
          <span class="cva-blend-result-name">{{ MATERIAL_LABELS[blendResult] }}<span class="cva-blend-result-mode"> · {{ blendModeText }}</span></span>
        </div>
      </div>
    </div>

    <!-- ============ 形态过渡 ============ -->
    <div class="cva-group" v-if="transitionList.length">
      <span class="cva-group-label">形态过渡</span>
      <div class="cva-transition-grid">
        <div v-for="t in transitionList" :key="t.id" class="cva-transition">
          <span class="cva-transition-path">✓ {{ MORPH_LABELS[t.from] }} → {{ MORPH_LABELS[t.to] }}</span>
          <span class="cva-transition-desc">{{ t.description }}</span>
          <span class="cva-transition-meta">{{ t.duration }}ms · {{ t.intermediateStates.length }} 阶段</span>
        </div>
      </div>
    </div>

    <!-- ============ 内置动画序列 ============ -->
    <div class="cva-group" v-if="sequences.length">
      <span class="cva-group-label">内置动画序列</span>
      <div class="cva-seq-grid">
        <div v-for="s in sequences" :key="s.id" class="cva-seq">
          <span class="cva-seq-name">{{ s.name }}<span class="cva-seq-loop">{{ s.loop ? ' · 循环' : '' }}</span></span>
          <ol class="cva-seq-steps">
            <li v-for="step in s.steps" :key="step.id" class="cva-seq-step">
              {{ MORPH_LABELS[step.config.morph] }} · {{ MATERIAL_LABELS[step.config.material] }} · {{ GLOW_LABELS[step.config.glow] }} · {{ step.duration }}ms
            </li>
          </ol>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  MORPH_LABELS,
  MORPH_ICONS,
  GLOW_LABELS,
  MATERIAL_LABELS,
  MATERIAL_CSS,
  EASING_LABELS,
  generateAnimationKeyframes,
  generateAnimationCSS,
  createAnimationConfig,
  blendMaterials,
  generateBlendCSS,
  MORPH_TRANSITIONS,
  CARRIER_ANIMATION_PRESETS,
  BUILTIN_ANIMATION_SEQUENCES,
} from '../modules/customization/carrier-advanced'
import type {
  CarrierVisualMorph,
  CarrierGlowEffect,
  CarrierMaterial,
  AnimationEasing,
  CarrierAnimationConfig,
  AnimationPreset,
} from '../modules/customization/carrier-advanced'

const MORPH_ORDER: CarrierVisualMorph[] = ['orb', 'crystal', 'flame', 'seed', 'spiral', 'geode', 'nebula', 'lotus']
const GLOW_ORDER: CarrierGlowEffect[] = ['glow', 'pulse', 'particles', 'sparkle', 'ripple', 'aurora']
const MATERIAL_ORDER: CarrierMaterial[] = ['glass', 'crystal', 'metal', 'jade', 'pearl', 'obsidian', 'amber', 'opal']
const EASING_ORDER: AnimationEasing[] = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'spring', 'bounce']

const config = ref<CarrierAnimationConfig>({
  morph: 'orb',
  glow: 'pulse',
  material: 'pearl',
  primaryColor: '#f0c040',
  secondaryColor: '#e0c090',
  duration: 3000,
  easing: 'ease-in-out',
  loop: true,
  enabled: true,
})

const morphCount = computed(() => MORPH_ORDER.length)
const materialCount = computed(() => MATERIAL_ORDER.length)
const glowCount = computed(() => GLOW_ORDER.length)
const presetCount = computed(() => presets.length)

// ---- 预设列表（引擎导出，惰性读取） ----
const presets = CARRIER_ANIMATION_PRESETS ?? []
const sequences = BUILTIN_ANIMATION_SEQUENCES ?? []
const transitionList = computed(() => Object.values(MORPH_TRANSITIONS))

const previewStyle = computed(() => {
  const mat = MATERIAL_CSS[config.value.material] ?? MATERIAL_CSS.pearl
  const glowDisabled = !config.value.enabled
  return {
    background: mat.bg,
    border: `1px solid ${mat.border}`,
    boxShadow: glowDisabled ? 'none' : mat.shadow,
    backgroundImage: mat.overlay,
  }
})

const keyframes = computed(() => generateAnimationKeyframes(config.value))
const animationCss = computed(() => generateAnimationCSS(config.value))

// ---- 材质混合 ----
const blendFrom = ref<CarrierMaterial>('glass')
const blendTo = ref<CarrierMaterial>('opal')
const blendRatio = ref(0.5)
const blendResult = computed(() => blendMaterials(blendFrom.value, blendTo.value, blendRatio.value))
const blendCss = computed(() => generateBlendCSS(blendFrom.value, blendTo.value, blendRatio.value))
const blendModeText = computed(() => blendCss.value.mixBlendMode === 'screen' ? 'screen 叠加' : 'normal 正常')

function swatchStyle(mat: CarrierMaterial): Record<string, string> {
  const c = MATERIAL_CSS[mat] ?? MATERIAL_CSS.pearl
  return { background: c.bg, border: `1px solid ${c.border}`, backgroundImage: c.overlay }
}

/** 由预设推导动画配置：走引擎构造器，统一默认值兜底口径 */
function presetToConfig(p: AnimationPreset): CarrierAnimationConfig {
  const c = p.config
  return createAnimationConfig(c.morph, c.glow, c.material, c.primaryColor, {
    secondaryColor: c.secondaryColor,
    duration: c.duration,
    easing: c.easing,
    loop: c.loop,
  })
}

function applyPreset(p: AnimationPreset) {
  config.value = presetToConfig(p)
}

function presetIsActive(p: AnimationPreset): boolean {
  const c = config.value
  const t = presetToConfig(p)
  return c.morph === t.morph
    && c.glow === t.glow
    && c.material === t.material
    && c.primaryColor === t.primaryColor
    && c.secondaryColor === t.secondaryColor
    && c.duration === t.duration
    && c.easing === t.easing
}

// ---- 复制 ----
const copyHint = ref('')
function copyKeyframes() {
  const text = keyframes.value + '\n' + animationCss.value
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => { copyHint.value = '已复制' }).catch(() => { copyHint.value = '复制失败' })
  } else {
    copyHint.value = '当前环境不支持剪贴板'
  }
  setTimeout(() => { copyHint.value = '' }, 1600)
}
</script>

<style scoped>
/* =============================================
   CarrierAnimationPanel — 载体动画与材质混合
   薄委托直引 modules/customization/carrier-advanced
   ============================================= */
.cva {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  border-radius: 14px;
  background: var(--card-bg, rgba(32, 28, 24, 0.5));
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.cva-header { display: flex; flex-direction: column; gap: 4px; }
.cva-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: rgba(var(--accent-rgb), 0.85); margin: 0; }
.cva-title-icon { opacity: 0.7; }
.cva-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.35); margin: 0; }

/* ---- 实时预览 ---- */
.cva-preview-row { display: flex; gap: 18px; align-items: center; }
.cva-preview {
  position: relative;
  width: 108px;
  height: 108px;
  min-width: 108px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  animation: cva-breathe 3s ease-in-out infinite;
  transition: box-shadow 0.4s, background 0.4s, border 0.4s;
}
.cva-preview--dim { filter: grayscale(0.6) opacity(0.6); animation: none; }
.cva-preview-icon { font-size: 40px; line-height: 1; }
.cva-preview-label { font-size: 11px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.6); }
@keyframes cva-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

.cva-preview-meta { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.cva-meta-line { display: flex; justify-content: space-between; gap: 12px; padding: 4px 10px; border-radius: 6px; background: rgba(var(--bg-card-rgb), 0.3); }
.cva-meta-key { font-size: 11px; color: rgba(var(--accent-rgb), 0.35); }
.cva-meta-val { font-size: 11px; color: rgba(var(--accent-rgb), 0.7); }

/* ---- 输出 ---- */
.cva-output { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 10px; background: rgba(var(--bg-card-rgb), 0.35); border: 1px solid rgba(var(--accent-rgb), 0.05); }
.cva-output-block { display: flex; align-items: center; justify-content: space-between; }
.cva-output-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.cva-copy { font-size: 10px; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(var(--accent-rgb), 0.15); background: transparent; color: rgba(var(--accent-rgb), 0.6); cursor: pointer; }
.cva-copy:hover { background: rgba(var(--accent-rgb), 0.1); }
.cva-code { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: rgba(var(--accent-rgb), 0.6); }
.cva-pre { margin: 0; font-size: 10px; line-height: 1.6; font-family: 'JetBrains Mono', monospace; color: rgba(var(--accent-rgb), 0.4); white-space: pre-wrap; overflow: auto; max-height: 120px; }
.cva-copy-hint { font-size: 10px; color: var(--green, #8a9a7a); }

/* ---- 分组 ---- */
.cva-group { display: flex; flex-direction: column; gap: 10px; }
.cva-group--row { flex-direction: row; gap: 22px; flex-wrap: wrap; }
.cva-subgroup { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
.cva-group-label { font-size: 11px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.45); }

/* ---- 形态 / 光效 / 缓动 chips ---- */
.cva-chip-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.cva-chip-grid--compact { gap: 6px; }
.cva-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: rgba(var(--accent-rgb), 0.55);
  font-size: 12px; font-family: inherit; cursor: pointer;
  transition: all 0.2s;
}
.cva-chip:hover { background: rgba(var(--accent-rgb), 0.08); }
.cva-chip--active { background: rgba(var(--accent-rgb), 0.14); border-color: rgba(var(--accent-rgb), 0.3); color: var(--accent); }
.cva-chip--sm { padding: 5px 9px; font-size: 11px; }
.cva-chip-icon { font-size: 14px; }
.cva-chip--material { padding: 6px 10px; }
.cva-swatch { width: 14px; height: 14px; border-radius: 4px; }
.cva-swatch--lg { width: 34px; height: 34px; border-radius: 8px; }
.cva-swatch--mixed { position: relative; }

/* ---- 控件行 ---- */
.cva-control-row { display: flex; flex-wrap: wrap; gap: 16px; padding: 12px; border-radius: 10px; background: rgba(var(--bg-card-rgb), 0.3); }
.cva-field { display: flex; flex-direction: column; gap: 6px; }
.cva-field-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.35); }
.cva-number, .cva-color-text, .cva-select {
  padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--card-bg); color: rgba(var(--accent-rgb), 0.7); font-size: 12px; font-family: inherit; outline: none;
}
.cva-number { width: 110px; }
.cva-color-text { width: 84px; font-family: 'JetBrains Mono', monospace; }
.cva-color-picker { width: 32px; height: 32px; padding: 2px; border-radius: 6px; border: 1px solid rgba(var(--accent-rgb), 0.12); cursor: pointer; }
.cva-range { width: 160px; accent-color: var(--accent); }

.cva-toggle-row { display: flex; gap: 18px; padding: 4px 2px; }
.cva-toggle { display: flex; align-items: center; gap: 7px; font-size: 12px; color: rgba(var(--accent-rgb), 0.6); cursor: pointer; }
.cva-toggle input { accent-color: var(--accent); }

/* ---- 预设 ---- */
.cva-preset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.cva-preset {
  display: flex; flex-direction: column; gap: 5px; text-align: left;
  padding: 12px 14px; border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: inherit; font-family: inherit; cursor: pointer;
  transition: all 0.2s;
}
.cva-preset:hover { background: rgba(var(--accent-rgb), 0.08); }
.cva-preset--active { border-color: rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.12); }
.cva-preset-icon { font-size: 22px; }
.cva-preset-name { font-size: 13px; font-weight: 500; color: rgba(var(--accent-rgb), 0.8); }
.cva-preset-desc { font-size: 11px; color: rgba(var(--accent-rgb), 0.4); line-height: 1.4; }
.cva-preset-tags { font-size: 10px; color: rgba(var(--accent-rgb), 0.32); }

/* ---- 材质混合 ---- */
.cva-blend { display: flex; flex-direction: column; gap: 14px; padding: 14px; border-radius: 10px; background: rgba(var(--bg-card-rgb), 0.3); border: 1px solid rgba(var(--accent-rgb), 0.05); }
.cva-blend-selects { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end; }
.cva-blend-result { display: flex; flex-direction: column; gap: 8px; }
.cva-blend-result-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.cva-blend-list { font-size: 12px; color: rgba(var(--accent-rgb), 0.7); }
.cva-blend-swatches { display: flex; align-items: center; gap: 10px; }
.cva-blend-arrow { color: rgba(var(--accent-rgb), 0.4); font-size: 16px; }
.cva-blend-result-name { font-size: 13px; font-weight: 500; color: rgba(var(--accent-rgb), 0.8); }
.cva-blend-result-mode { font-size: 11px; font-weight: 400; color: rgba(var(--accent-rgb), 0.4); }

/* ---- 形态过渡 ---- */
.cva-transition-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.cva-transition { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 10px; background: rgba(var(--bg-card-rgb), 0.3); }
.cva-transition-path { font-size: 12px; color: rgba(var(--accent-rgb), 0.7); }
.cva-transition-desc { font-size: 11px; color: rgba(var(--accent-rgb), 0.4); line-height: 1.4; }
.cva-transition-meta { font-size: 10px; color: rgba(var(--accent-rgb), 0.3); }

/* ---- 动画序列 ---- */
.cva-seq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
.cva-seq { padding: 12px 14px; border-radius: 10px; background: rgba(var(--bg-card-rgb), 0.3); border: 1px solid rgba(var(--accent-rgb), 0.05); }
.cva-seq-name { font-size: 13px; font-weight: 500; color: rgba(var(--accent-rgb), 0.8); }
.cva-seq-loop { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }
.cva-seq-steps { margin: 8px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.cva-seq-step { font-size: 11px; color: rgba(var(--accent-rgb), 0.5); }

@media (max-width: 640px) {
  .cva-preview-row { flex-direction: column; align-items: flex-start; }
  .cva-group--row { flex-direction: column; }
  .cva-preset-grid, .cva-transition-grid, .cva-seq-grid { grid-template-columns: 1fr; }
}
</style>