<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance ce">
    <header data-enter class="ce-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">设计你的玉珠载体形态</p>
      <h1 class="ce-title">载体编辑器</h1>
    </header>

    <!-- Overview cards -->
    <div data-enter class="ce-overview">
      <div class="ce-overview-card">
        <span class="ce-ov-label">已保存载体</span>
        <span class="ce-ov-value">{{ carriers.length }}</span>
      </div>
      <div class="ce-overview-card">
        <span class="ce-ov-label">可选形态</span>
        <span class="ce-ov-value">4</span>
      </div>
      <div class="ce-overview-card">
        <span class="ce-ov-label">最大数量</span>
        <span class="ce-ov-value">6</span>
      </div>
    </div>

    <div data-enter class="ce-body">
      <!-- 预览区 -->
      <section class="ce-preview">
        <div class="ce-preview-stage" :style="previewStageStyle">
          <!-- 光晕背景 -->
          <div class="ce-preview-aura" :class="{ 'ce-preview-aura--glow': form.effects.includes('glow') }" />

          <!-- 根据形态渲染 SVG 预览 -->
          <svg class="ce-preview-svg" viewBox="0 0 240 240" :style="svgScale">
            <!-- Orb 形态 -->
            <g v-if="form.shape === 'orb'">
              <defs>
                <radialGradient id="orbGrad" cx="40%" cy="35%" r="60%">
                  <stop offset="0%" :stop-color="lightenColor(form.color, 40)" />
                  <stop offset="40%" :stop-color="form.color" />
                  <stop offset="80%" :stop-color="darkenColor(form.color, 20)" />
                  <stop offset="100%" :stop-color="darkenColor(form.color, 40)" />
                </radialGradient>
                <radialGradient id="orbGloss" cx="30%" cy="25%" r="30%">
                  <stop offset="0%" stop-color="rgba(255,255,255,0.45)" />
                  <stop offset="100%" stop-color="rgba(255,255,255,0)" />
                </radialGradient>
                <filter id="orbGlow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <!-- 外层光晕环 -->
              <circle cx="120" cy="120" r="90" fill="none" :stroke="form.color" stroke-width="0.5" opacity="0.15" class="orb-ring" />
              <circle cx="120" cy="120" r="75" fill="none" :stroke="form.color" stroke-width="0.3" opacity="0.1" class="orb-ring-2" />
              <!-- 主体 -->
              <circle cx="120" cy="120" r="65" :fill="`url(#orbGrad)`" filter="url(#orbGlow)" class="orb-body" />
              <!-- 光泽 -->
              <circle cx="120" cy="120" r="65" fill="url(#orbGloss)" />
              <!-- 脉动环 -->
              <circle v-if="form.effects.includes('pulse')" cx="120" cy="120" r="70" fill="none" :stroke="form.color" stroke-width="1.5" opacity="0.4" class="orb-pulse" />
              <!-- 粒子 -->
              <template v-if="form.effects.includes('particles')">
                <circle v-for="i in 8" :key="i" cx="120" cy="120" r="3" :fill="form.color" :class="['orb-particle', `orb-p-${i}`]" />
              </template>
            </g>

            <!-- Crystal 形态 -->
            <g v-if="form.shape === 'crystal'">
              <defs>
                <linearGradient id="crystalGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" :stop-color="lightenColor(form.color, 30)" />
                  <stop offset="50%" :stop-color="form.color" />
                  <stop offset="100%" :stop-color="darkenColor(form.color, 30)" />
                </linearGradient>
                <linearGradient id="crystalGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" :stop-color="lightenColor(form.color, 20)" />
                  <stop offset="100%" :stop-color="darkenColor(form.color, 20)" />
                </linearGradient>
                <filter id="crystalGlow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                </filter>
                <linearGradient id="crystalEdge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="rgba(255,255,255,0.6)" />
                  <stop offset="50%" stop-color="rgba(255,255,255,0.1)" />
                  <stop offset="100%" stop-color="rgba(255,255,255,0.4)" />
                </linearGradient>
              </defs>
              <!-- 菱形主晶体 -->
              <polygon points="120,25 195,120 120,215 45,120" :fill="`url(#crystalGrad1)`" class="crystal-main" />
              <!-- 内层切面 -->
              <polygon points="120,55 170,120 120,185 70,120" :fill="`url(#crystalGrad2)`" opacity="0.6" />
              <!-- 棱边 -->
              <polygon points="120,25 195,120 120,215 45,120" fill="none" :stroke="lightenColor(form.color, 50)" stroke-width="1.5" class="crystal-edge" />
              <!-- 内部棱线 -->
              <line x1="120" y1="55" x2="120" y2="185" :stroke="lightenColor(form.color, 40)" stroke-width="0.8" opacity="0.5" />
              <line x1="70" y1="120" x2="170" y2="120" :stroke="lightenColor(form.color, 40)" stroke-width="0.8" opacity="0.5" />
              <line x1="85" y1="75" x2="155" y2="165" :stroke="lightenColor(form.color, 30)" stroke-width="0.5" opacity="0.3" />
              <line x1="155" y1="75" x2="85" y2="165" :stroke="lightenColor(form.color, 30)" stroke-width="0.5" opacity="0.3" />
              <!-- 棱角光效 -->
              <circle cx="120" cy="25" r="4" :fill="lightenColor(form.color, 60)" filter="url(#crystalGlow)" class="crystal-tip" />
              <circle cx="195" cy="120" r="3" :fill="lightenColor(form.color, 50)" filter="url(#crystalGlow)" />
              <circle cx="120" cy="215" r="3" :fill="lightenColor(form.color, 50)" filter="url(#crystalGlow)" />
              <circle cx="45" cy="120" r="3" :fill="lightenColor(form.color, 50)" filter="url(#crystalGlow)" />
              <!-- 脉动光晕 -->
              <polygon v-if="form.effects.includes('pulse')" points="120,15 205,120 120,225 35,120" fill="none" :stroke="form.color" stroke-width="0.5" opacity="0.3" class="crystal-pulse" />
            </g>

            <!-- Flame 形态 -->
            <g v-if="form.shape === 'flame'">
              <defs>
                <radialGradient id="flameGrad" cx="50%" cy="60%" r="50%">
                  <stop offset="0%" :stop-color="lightenColor(form.color, 50)" />
                  <stop offset="35%" :stop-color="form.color" />
                  <stop offset="70%" :stop-color="darkenColor(form.color, 15)" />
                  <stop offset="100%" :stop-color="darkenColor(form.color, 35)" />
                </radialGradient>
                <filter id="flameBlur">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
                </filter>
              </defs>
              <!-- 外焰（大） -->
              <path d="M120,20 C150,60 175,90 180,130 C185,170 160,200 120,205 C80,200 55,170 60,130 C65,90 90,60 120,20Z" :fill="`url(#flameGrad)`" class="flame-outer" />
              <!-- 内焰 -->
              <path d="M120,55 C140,85 155,105 158,135 C161,160 145,185 120,188 C95,185 79,160 82,135 C85,105 100,85 120,55Z" :fill="lightenColor(form.color, 30)" opacity="0.6" class="flame-inner" />
              <!-- 核心 -->
              <ellipse cx="120" cy="165" rx="18" ry="12" :fill="lightenColor(form.color, 60)" opacity="0.7" filter="url(#flameBlur)" class="flame-core" />
              <!-- 脉动光效 -->
              <path v-if="form.effects.includes('pulse')" d="M120,10 C155,55 185,85 190,130 C195,180 165,210 120,215 C75,210 45,180 50,130 C55,85 85,55 120,10Z" fill="none" :stroke="lightenColor(form.color, 30)" stroke-width="1" opacity="0.25" class="flame-pulse" />
              <!-- 粒子效果 -->
              <template v-if="form.effects.includes('particles')">
                <circle v-for="i in 5" :key="i" :cx="115 + (i - 3) * 8" cy="15" r="2" :fill="lightenColor(form.color, 50)" :class="['flame-spark', `flame-s-${i}`]" />
              </template>
            </g>

            <!-- Seed 形态 -->
            <g v-if="form.shape === 'seed'">
              <defs>
                <radialGradient id="seedGrad" cx="50%" cy="45%" r="50%">
                  <stop offset="0%" :stop-color="lightenColor(form.color, 30)" />
                  <stop offset="60%" :stop-color="form.color" />
                  <stop offset="100%" :stop-color="darkenColor(form.color, 25)" />
                </radialGradient>
                <filter id="seedGlow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
                </filter>
              </defs>
              <!-- 种子主体（水滴形） -->
              <path d="M120,40 C145,80 160,110 160,140 C160,170 142,195 120,200 C98,195 80,170 80,140 C80,110 95,80 120,40Z" :fill="`url(#seedGrad)`" class="seed-body" />
              <!-- 种子顶部尖芽 -->
              <path d="M120,40 Q130,30 135,25 Q125,35 120,40Z" :fill="lightenColor(form.color, 40)" opacity="0.8" />
              <!-- 发芽光效 -->
              <path d="M120,40 Q125,20 120,5" fill="none" :stroke="lightenColor(form.color, 50)" stroke-width="2" stroke-linecap="round" opacity="0.6" class="seed-sprout" />
              <path d="M120,40 Q110,25 100,15" fill="none" :stroke="lightenColor(form.color, 40)" stroke-width="1.5" stroke-linecap="round" opacity="0.4" class="seed-sprout-2" />
              <!-- 根部纹理 -->
              <path d="M120,200 Q115,210 110,220" fill="none" :stroke="darkenColor(form.color, 10)" stroke-width="1" opacity="0.3" />
              <path d="M120,200 Q125,212 130,218" fill="none" :stroke="darkenColor(form.color, 10)" stroke-width="0.8" opacity="0.2" />
              <!-- 光晕环 -->
              <ellipse v-if="form.effects.includes('glow')" cx="120" cy="120" rx="80" ry="85" fill="none" :stroke="form.color" stroke-width="0.5" opacity="0.15" class="seed-glow-ring" />
              <!-- 粒子 -->
              <template v-if="form.effects.includes('particles')">
                <circle v-for="i in 4" :key="i" :cx="110 + i * 7" :cy="15 + i * 3" r="2" :fill="lightenColor(form.color, 50)" :class="['seed-particle', `seed-p-${i}`]" />
              </template>
            </g>
          </svg>

          <!-- 载体名称水印 -->
          <div class="ce-preview-label">{{ form.name || '未命名载体' }}</div>
        </div>

        <!-- 形态标签 -->
        <div class="ce-preview-shape-label">{{ shapeLabel }}</div>
      </section>

      <!-- 编辑区 -->
      <section class="ce-editor">
        <!-- 载体名称 -->
        <div class="ce-field">
          <label class="ce-field-label">载体名称</label>
          <input v-model="form.name" placeholder="为你的载体命名..." class="ce-field-input" maxlength="20" />
        </div>

        <!-- 形态选择 -->
        <div class="ce-field">
          <label class="ce-field-label">形态选择</label>
          <div class="ce-shape-picker">
            <button
              v-for="s in shapes"
              :key="s.value"
              :class="['ce-shape-btn', { active: form.shape === s.value }]"
              :style="form.shape === s.value ? { borderColor: '#d4a574', boxShadow: '0 0 12px rgba(var(--accent-rgb), 0.35)' } : {}"
              @click="form.shape = s.value"
            >
              <span class="ce-shape-icon" v-html="s.icon" />
              <span class="ce-shape-name">{{ s.label }}</span>
            </button>
          </div>
        </div>

        <!-- 颜色选择 -->
        <div class="ce-field">
          <label class="ce-field-label">颜色选择</label>
          <div class="ce-color-picker">
            <button
              v-for="c in presetColors"
              :key="c"
              :class="['ce-color-swatch', { active: form.color === c }]"
              :style="{ background: c, boxShadow: form.color === c ? `0 0 12px ${c}66` : 'none' }"
              @click="form.color = c"
            />
          </div>
        </div>

        <!-- 大小 -->
        <div class="ce-field">
          <label class="ce-field-label">大小 <span class="ce-field-hint">({{ sizeLabel }})</span></label>
          <div class="ce-size-row">
            <input type="range" v-model.number="form.size" min="1" max="3" step="1" class="ce-size-slider" />
            <div class="ce-size-indicator">
              <span v-for="i in 3" :key="i" :class="['ce-size-dot', { fill: i <= form.size }]" :style="i <= form.size ? { background: '#d4a574' } : {}" />
            </div>
          </div>
        </div>

        <!-- 光效 -->
        <div class="ce-field">
          <label class="ce-field-label">光效</label>
          <div class="ce-effects-row">
            <label v-for="eff in effectOptions" :key="eff.value" class="ce-effect-toggle">
              <input type="checkbox" :value="eff.value" :checked="form.effects.includes(eff.value)" @change="toggleEffect(eff.value)" />
              <span class="ce-toggle-track" :class="{ on: form.effects.includes(eff.value) }" :style="form.effects.includes(eff.value) ? { borderColor: '#d4a574', background: 'rgba(var(--accent-rgb), 0.15)' } : {}">
                <span class="ce-toggle-thumb" :class="{ on: form.effects.includes(eff.value) }" />
              </span>
              <span class="ce-effect-label">{{ eff.label }}</span>
            </label>
          </div>
        </div>

        <!-- 绑定专注类型 -->
        <div class="ce-field">
          <label class="ce-field-label">绑定专注类型</label>
          <select v-model="form.focusType" class="ce-field-select">
            <option v-for="ft in focusTypes" :key="ft.value" :value="ft.value">{{ ft.label }}</option>
          </select>
        </div>

        <!-- 操作按钮 -->
        <div class="ce-editor-actions">
          <button class="ce-btn-save" :disabled="!form.name.trim()" @click="saveCarrier">
            {{ editingId ? '更新载体' : '保存载体' }}
          </button>
          <button v-if="editingId" class="ce-btn-cancel" @click="resetForm">取消编辑</button>
        </div>
      </section>
    </div>

    <!-- 底部：载体列表 -->
    <section data-enter class="ce-carriers">
      <h2 class="ce-carriers-title">已保存载体 <span class="ce-carriers-count">{{ carriers.length }}/6</span></h2>
      <div v-if="carriers.length === 0" class="ce-carriers-empty">
        <span>暂无保存的载体，在上方编辑后保存</span>
      </div>
      <div v-else class="ce-carriers-grid">
        <div
          v-for="c in carriers"
          :key="c.id"
          :class="['ce-carrier-card', { active: c.id === editingId }]"
          @click="loadCarrier(c)"
        >
          <div class="ce-cc-preview">
            <svg viewBox="0 0 60 60" class="ce-cc-svg">
              <circle v-if="c.shape === 'orb' || !c.shape" cx="30" cy="30" r="18" :fill="c.colors?.primary || '#d4a574'" opacity="0.8" />
              <polygon v-if="c.shape === 'crystal'" points="30,8 50,30 30,52 10,30" :fill="c.colors?.primary || '#d4a574'" opacity="0.8" />
              <path v-if="c.shape === 'flame'" d="M30,8 C42,28 48,38 48,44 C48,52 40,55 30,55 C20,55 12,52 12,44 C12,38 18,28 30,8Z" :fill="c.colors?.primary || '#d4a574'" opacity="0.8" />
              <path v-if="c.shape === 'seed'" d="M30,10 C42,30 46,42 46,50 C46,54 38,56 30,56 C22,56 14,54 14,50 C14,42 18,30 30,10Z" :fill="c.colors?.primary || '#d4a574'" opacity="0.8" />
            </svg>
          </div>
          <div class="ce-cc-info">
            <span class="ce-cc-name">{{ c.name }}</span>
            <span class="ce-cc-meta">{{ shapeLabelFor(c.shape) }} | {{ focusTypeLabel(c.focusType) }}</span>
          </div>
          <button class="ce-cc-delete" @click.stop="deleteCarrier(c.id)" title="删除">×</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { storage } from '../engine/storage'
import type { JadeBeadCarrier } from '../types'
import { useViewEntrance } from '../composables/useViewEntrance'
import { CATEGORY_PALETTE } from '../theme/categoryColors'

// ---- 类型定义 ----

const { entranceRef, entranceClass } = useViewEntrance()
type CarrierShape = 'orb' | 'crystal' | 'flame' | 'seed'

interface CarrierForm {
  name: string
  shape: CarrierShape
  color: string
  size: number
  effects: string[]
  focusType: string
}

// ---- 常量 ----

const shapes: { value: CarrierShape; label: string; icon: string }[] = [
  { value: 'orb', label: '圆球', icon: '&#9678;' },
  { value: 'crystal', label: '结晶', icon: '&#9670;' },
  { value: 'flame', label: '火焰', icon: '&#9731;' },
  { value: 'seed', label: '种子', icon: '&#9679;' },
]

const presetColors = [
  CATEGORY_PALETTE[0],  // 琥珀（品牌主色）
  CATEGORY_PALETTE[12], // 暖金
  CATEGORY_PALETTE[14], // 暖锈（红·暖替）
  CATEGORY_PALETTE[5],  // 陶土玫（粉·暖替）
  CATEGORY_PALETTE[7],  // 雾紫（低饱和紫点缀）
  CATEGORY_PALETTE[10], // 雾青（低饱和青点缀）
  CATEGORY_PALETTE[11], // 雾蓝（低饱和蓝点缀）
  CATEGORY_PALETTE[8],  // 暖鼠尾草（绿·暖替）
]

const effectOptions = [
  { value: 'glow', label: '辉光' },
  { value: 'pulse', label: '脉动' },
  { value: 'particles', label: '粒子' },
]

const focusTypes = [
  { value: 'default', label: '默认' },
  { value: 'work', label: '工作' },
  { value: 'study', label: '学习' },
  { value: 'creative', label: '创作' },
  { value: 'meditation', label: '冥想' },
]

// ---- 状态 ----

const carriers = ref<JadeBeadCarrier[]>([])
const editingId = ref<string | null>(null)

const form = reactive<CarrierForm>({
  name: '',
  shape: 'orb',
  color: '#d4a574',
  size: 2,
  effects: ['glow'],
  focusType: 'default',
})

// ---- 计算属性 ----

const shapeLabel = computed(() => {
  return shapes.find(s => s.value === form.shape)?.label ?? '圆球'
})

const sizeLabel = computed(() => {
  const map = { 1: '小巧', 2: '适中', 3: '庞大' }
  return map[form.size as keyof typeof map] ?? '适中'
})

const svgScale = computed(() => {
  const scale = 0.7 + form.size * 0.15
  return { transform: `scale(${scale})` }
})

const previewStageStyle = computed(() => ({
  '--preview-color': form.color,
}))

// ---- 工具函数 ----

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100))
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100))
  return `rgb(${r},${g},${b})`
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100))
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100))
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100))
  return `rgb(${r},${g},${b})`
}

function shapeLabelFor(shape?: string): string {
  return shapes.find(s => s.value === shape)?.label ?? '圆球'
}

function focusTypeLabel(type?: string): string {
  return focusTypes.find(ft => ft.value === type)?.label ?? '默认'
}

// ---- 方法 ----

function toggleEffect(value: string) {
  const idx = form.effects.indexOf(value)
  if (idx >= 0) {
    form.effects.splice(idx, 1)
  } else {
    form.effects.push(value)
  }
}

function loadCarriers() {
  carriers.value = storage.getCarriers()
}

function saveCarrier() {
  const all = storage.getCarriers()
  const now = new Date().toISOString()

  if (editingId.value) {
    // 更新已有载体
    const idx = all.findIndex(c => c.id === editingId.value)
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        name: form.name,
        shape: form.shape,
        colors: { primary: form.color, secondary: form.color, accent: form.color },
        effects: [...form.effects],
        focusType: form.focusType,
      }
    }
  } else {
    // 限制最多6个
    if (all.length >= 6) {
      alert('最多保存 6 个载体')
      return
    }
    // 创建新载体
    const newCarrier: JadeBeadCarrier = {
      id: `carrier_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: form.name,
      type: 'jade-bead',
      beadCount: 0,
      maxBeads: 108,
      segment: 1,
      colors: {
        primary: form.color,
        secondary: darkenColor(form.color, 15),
        accent: lightenColor(form.color, 20),
      },
      active: false,
      advisorId: null,
      shape: form.shape,
      effects: [...form.effects],
      focusType: form.focusType,
      createdAt: now,
      lifecycleStage: 'newborn',
      lastUsedAt: null,
      usageCount: 0,
      inheritedTo: null,
      inheritedFrom: null,
    }
    all.push(newCarrier)
    editingId.value = newCarrier.id
  }

  storage.setCarriers(all)
  loadCarriers()
}

function loadCarrier(c: JadeBeadCarrier) {
  editingId.value = c.id
  form.name = c.name
  form.shape = (c.shape as CarrierShape) || 'orb'
  form.color = c.colors?.primary || '#d4a574'
  form.size = (c as any).size || 2
  form.effects = c.effects ? [...c.effects] : ['glow']
  form.focusType = c.focusType || 'default'
}

function deleteCarrier(id: string) {
  const all = storage.getCarriers().filter(c => c.id !== id)
  storage.setCarriers(all)
  if (editingId.value === id) {
    resetForm()
  }
  loadCarriers()
}

function resetForm() {
  editingId.value = null
  form.name = ''
  form.shape = 'orb'
  form.color = '#d4a574'
  form.size = 2
  form.effects = ['glow']
  form.focusType = 'default'
}

// ---- 初始化 ----

onMounted(() => {
  loadCarriers()
})
</script>

<style scoped>
/* ============================================================
   CarrierEditor — 暖琥珀视觉主题 (Warm Amber Theme)
   ============================================================ */

/* ---- 容器 ---- */
.ce {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  overflow: hidden;
}

/* 环境光晕 */
.ce::before {
  content: '';
  position: fixed;
  top: -40%;
  left: -20%;
  width: 140%;
  height: 120%;
  background: radial-gradient(ellipse at 50% 20%, rgba(var(--accent-rgb), 0.06) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.ce::after {
  content: '';
  position: fixed;
  bottom: -30%;
  right: -20%;
  width: 120%;
  height: 100%;
  background: radial-gradient(ellipse at 50% 80%, rgba(var(--accent-rgb), 0.04) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* ---- 头部 ---- */
.ce-header {
  position: relative;
  z-index: 1;
  text-align: center;
  padding-bottom: 12px;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 10px;
}

.orn-line {
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.3), transparent);
}

.orn-diamond {
  font-size: 10px;
  color: var(--accent);
  opacity: 0.7;
}

.ce-title {
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 3px;
  color: var(--text-primary);
  margin: 0;
}

.header-kicker {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 2px;
  margin: 0 0 6px;
  text-transform: uppercase;
}

/* ---- 概览卡片 ---- */
.ce-overview {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 20px 0 24px;
}

.ce-overview-card {
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 10px;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  transition: border-color 0.2s;
}

.ce-overview-card:hover {
  border-color: rgba(var(--accent-rgb), 0.18);
}

.ce-ov-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  letter-spacing: 0.5px;
}

.ce-ov-value {
  font-size: 22px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

/* ---- 主体布局 ---- */
.ce-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ---- 预览区 ---- */
.ce-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.ce-preview-stage {
  position: relative;
  width: 240px;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: radial-gradient(circle at 50% 50%, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  overflow: hidden;
  box-shadow: 0 0 40px rgba(var(--accent-rgb), 0.05), inset 0 0 60px rgba(var(--accent-rgb), 0.03);
}

.ce-preview-aura {
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, var(--preview-color) 0%, transparent 65%);
  opacity: 0.04;
  transition: opacity 0.3s;
}

.ce-preview-aura.ce-preview-aura--glow {
  opacity: 0.08;
  animation: aura-breathe 6s ease-in-out infinite;
}

@keyframes aura-breathe {
  0%, 100% { transform: scale(0.95); opacity: 0.04; }
  50% { transform: scale(1.05); opacity: 0.1; }
}

.ce-preview-svg {
  width: 200px;
  height: 200px;
  transition: transform 0.3s ease;
  filter: drop-shadow(0 0 20px rgba(0,0,0,0.3));
}

.ce-preview-label {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.3);
  letter-spacing: 1px;
  white-space: nowrap;
}

.ce-preview-shape-label {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 1px;
}

/* ---- Orb 动画 ---- */
.orb-body {
  transform-origin: 120px 120px;
  animation: orb-float 8s ease-in-out infinite;
}

@keyframes orb-float {
  0%, 100% { transform: scale(0.98); }
  50% { transform: scale(1.02); }
}

.orb-ring {
  animation: orb-ring-pulse 5s ease-in-out infinite;
}

.orb-ring-2 {
  animation: orb-ring-pulse 7s ease-in-out infinite reverse;
}

@keyframes orb-ring-pulse {
  0%, 100% { opacity: 0.1; r: 90px; }
  50% { opacity: 0.25; r: 95px; }
}

.orb-pulse {
  animation: orb-pulse-ring 2s ease-out infinite;
  transform-origin: 120px 120px;
}

@keyframes orb-pulse-ring {
  0% { transform: scale(0.85); opacity: 0.5; }
  100% { transform: scale(1.15); opacity: 0; }
}

.orb-particle {
  opacity: 0;
  animation: orb-particle-drift 3s ease-in-out infinite;
}

.orb-p-1 { animation-delay: 0s; }
.orb-p-2 { animation-delay: 0.4s; }
.orb-p-3 { animation-delay: 0.8s; }
.orb-p-4 { animation-delay: 1.2s; }
.orb-p-5 { animation-delay: 1.6s; }
.orb-p-6 { animation-delay: 2.0s; }
.orb-p-7 { animation-delay: 2.4s; }
.orb-p-8 { animation-delay: 2.8s; }

@keyframes orb-particle-drift {
  0% { opacity: 0; transform: translate(0, 0); }
  20% { opacity: 0.8; }
  100% { opacity: 0; transform: translate(var(--dx, 20px), var(--dy, -30px)); }
}

/* ---- Crystal 动画 ---- */
.crystal-main {
  transform-origin: 120px 120px;
  animation: crystal-rotate 12s ease-in-out infinite;
}

@keyframes crystal-rotate {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(3deg); }
  75% { transform: rotate(-3deg); }
}

.crystal-edge {
  animation: crystal-edge-glow 3s ease-in-out infinite;
}

@keyframes crystal-edge-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.crystal-tip {
  animation: crystal-tip-pulse 2s ease-in-out infinite;
}

@keyframes crystal-tip-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.crystal-pulse {
  animation: crystal-pulse-ring 3s ease-out infinite;
  transform-origin: 120px 120px;
}

@keyframes crystal-pulse-ring {
  0% { transform: scale(0.9); opacity: 0.4; }
  100% { transform: scale(1.1); opacity: 0; }
}

/* ---- Flame 动画 ---- */
.flame-outer {
  animation: flame-flicker 3s ease-in-out infinite;
  transform-origin: 120px 140px;
}

@keyframes flame-flicker {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.02, 1.04) rotate(-1deg); }
  50% { transform: scale(0.98, 0.96) rotate(0deg); }
  75% { transform: scale(1.01, 1.03) rotate(1deg); }
}

.flame-inner {
  animation: flame-inner-flicker 2s ease-in-out infinite;
  transform-origin: 120px 140px;
}

@keyframes flame-inner-flicker {
  0%, 100% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.05); opacity: 0.7; }
}

.flame-core {
  animation: flame-core-pulse 1.5s ease-in-out infinite;
}

@keyframes flame-core-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.9); }
  50% { opacity: 0.9; transform: scale(1.1); }
}

.flame-pulse {
  animation: flame-pulse-ring 2.5s ease-out infinite;
  transform-origin: 120px 120px;
}

@keyframes flame-pulse-ring {
  0% { transform: scale(0.9); opacity: 0.3; }
  100% { transform: scale(1.1); opacity: 0; }
}

.flame-spark {
  animation: flame-spark-rise 2s ease-in-out infinite;
}

.flame-s-1 { animation-delay: 0s; }
.flame-s-2 { animation-delay: 0.3s; }
.flame-s-3 { animation-delay: 0.6s; }
.flame-s-4 { animation-delay: 0.9s; }
.flame-s-5 { animation-delay: 1.2s; }

@keyframes flame-spark-rise {
  0% { opacity: 0; transform: translateY(0); }
  30% { opacity: 0.8; }
  100% { opacity: 0; transform: translateY(-20px); }
}

/* ---- Seed 动画 ---- */
.seed-body {
  transform-origin: 120px 120px;
  animation: seed-breathe 6s ease-in-out infinite;
}

@keyframes seed-breathe {
  0%, 100% { transform: scale(0.98); }
  50% { transform: scale(1.02); }
}

.seed-sprout {
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  animation: seed-grow 3s ease-in-out infinite;
}

@keyframes seed-grow {
  0% { stroke-dashoffset: 60; }
  50% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 60; }
}

.seed-sprout-2 {
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: seed-grow-2 3.5s ease-in-out infinite;
}

@keyframes seed-grow-2 {
  0% { stroke-dashoffset: 40; }
  40% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 40; }
}

.seed-glow-ring {
  animation: seed-glow-ring-pulse 4s ease-in-out infinite;
}

@keyframes seed-glow-ring-pulse {
  0%, 100% { opacity: 0.1; transform: scale(0.95); }
  50% { opacity: 0.2; transform: scale(1.05); }
}

.seed-particle {
  animation: seed-particle-float 3s ease-in-out infinite;
}

.seed-p-1 { animation-delay: 0s; }
.seed-p-2 { animation-delay: 0.6s; }
.seed-p-3 { animation-delay: 1.2s; }
.seed-p-4 { animation-delay: 1.8s; }

@keyframes seed-particle-float {
  0% { opacity: 0; transform: translate(0, 0); }
  30% { opacity: 0.7; }
  100% { opacity: 0; transform: translate(-10px, -25px); }
}

/* ---- 编辑区 ---- */
.ce-editor {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.ce-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ce-field-label {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.6);
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ce-field-hint {
  font-size: 11px;
  opacity: 0.5;
}

.ce-field-input {
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.ce-field-input:focus {
  border-color: var(--accent);
}

.ce-field-input::placeholder {
  color: rgba(var(--accent-rgb), 0.2);
}

.ce-field-select {
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(var(--accent-rgb), 0.3)' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.ce-field-select:focus {
  border-color: var(--accent);
}

.ce-field-select option {
  background: var(--bg-deep);
  color: var(--text-primary);
}

/* 形态选择 */
.ce-shape-picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.ce-shape-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  background: var(--card-bg);
  color: rgba(var(--accent-rgb), 0.45);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.ce-shape-btn:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
}

.ce-shape-btn.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: var(--accent);
  color: var(--accent);
}

.ce-shape-icon {
  font-size: 20px;
  line-height: 1;
}

.ce-shape-name {
  font-size: 11px;
}

/* 颜色选择 */
.ce-color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ce-color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
}

.ce-color-swatch:hover {
  transform: scale(1.15);
}

.ce-color-swatch.active {
  border-color: var(--accent);
  transform: scale(1.1);
}

/* 大小滑块 */
.ce-size-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ce-size-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.1);
  outline: none;
  cursor: pointer;
}

.ce-size-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid rgba(var(--accent-rgb), 0.3);
  cursor: pointer;
  transition: all 0.2s;
}

.ce-size-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.ce-size-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid rgba(var(--accent-rgb), 0.3);
  cursor: pointer;
}

.ce-size-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.ce-size-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.12);
  transition: all 0.3s;
}

.ce-size-dot.fill {
  background: var(--accent);
}

/* 光效开关 */
.ce-effects-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.ce-effect-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.ce-effect-toggle input {
  display: none;
}

.ce-toggle-track {
  width: 32px;
  height: 18px;
  border-radius: 9px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: var(--card-bg);
  position: relative;
  transition: all 0.25s;
}

.ce-toggle-track.on {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.15);
}

.ce-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.3);
  transition: all 0.25s;
}

.ce-toggle-thumb.on {
  left: 16px;
  background: var(--accent);
}

.ce-effect-label {
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.55);
}

/* 操作按钮 */
.ce-editor-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.ce-btn-save {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: var(--bg-primary);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 1px;
  font-weight: 500;
}

.ce-btn-save:hover {
  background: #e0b88a;
  box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.35);
}

.ce-btn-save:disabled {
  opacity: 0.35;
  cursor: default;
  box-shadow: none;
}

.ce-btn-cancel {
  padding: 12px 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 10px;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ce-btn-cancel:hover {
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
}

/* ---- 底部载体列表 ---- */
.ce-carriers {
  position: relative;
  z-index: 1;
  margin-top: 8px;
  padding-top: 20px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}

.ce-carriers-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.55);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ce-carriers-count {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.35);
  font-weight: 400;
}

.ce-carriers-empty {
  text-align: center;
  padding: 24px;
  color: rgba(var(--accent-rgb), 0.3);
  font-size: 13px;
}

.ce-carriers-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.ce-carrier-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.04);
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.ce-carrier-card:hover {
  background: var(--bg-card);
  border-color: rgba(var(--accent-rgb), 0.1);
}

.ce-carrier-card.active {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
}

.ce-cc-preview {
  flex-shrink: 0;
}

.ce-cc-svg {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 0 6px rgba(0,0,0,0.3));
}

.ce-cc-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ce-cc-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ce-cc-meta {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.35);
}

.ce-cc-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: var(--bg-card);
  color: rgba(var(--accent-rgb), 0.2);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
  font-family: inherit;
  line-height: 1;
}

.ce-carrier-card:hover .ce-cc-delete {
  opacity: 1;
}

.ce-cc-delete:hover {
  background: rgba(239,68,68,0.15);
  color: var(--error);
}

/* ---- 响应式 ---- */
@media (max-width: 768px) {
  .ce {
    padding: 32px 20px 60px;
  }

  .ce-overview {
    gap: 8px;
  }

  .ce-carriers-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .ce {
    padding: 24px 16px 48px;
  }

  .ce-overview {
    grid-template-columns: 1fr;
  }

  .ce-carriers-grid {
    grid-template-columns: 1fr;
  }

  .ce-shape-picker {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>