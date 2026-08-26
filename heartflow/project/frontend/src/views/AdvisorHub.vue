<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance ah">
    <!-- Header ornament pattern -->
    <div data-enter class="ah-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">你的专属幕僚团</p>
      <h1 class="ah-title">幕僚阁</h1>
    </div>

    <!-- Overview cards -->
    <div data-enter class="ah-overview">
      <div class="ah-overview-card">
        <span class="ah-overview-value">{{ advisors.length }}</span>
        <span class="ah-overview-label">幕僚总数</span>
      </div>
      <div class="ah-overview-card">
        <span class="ah-overview-value">{{ advisors.filter(a => a.state !== 'slumber').length }}</span>
        <span class="ah-overview-label">在位幕僚</span>
      </div>
      <div class="ah-overview-card">
        <span class="ah-overview-value">{{ advisors.filter(a => !isPreset(a.id)).length }}</span>
        <span class="ah-overview-label">自建幕僚</span>
      </div>
    </div>

    <!-- 幕僚卡片 -->
    <div data-enter class="ah-advisor-grid" v-if="advisors.length">
      <div v-for="a in advisors" :key="a.id" class="ah-advisor-card" :class="{ dormant: a.state === 'slumber' }" @click="editAdvisor(a)">
        <div class="a-avatar" :style="{ background: (a.customColorScheme?.primary ?? '#a08a7a') + '22', borderColor: (a.customColorScheme?.primary ?? '#a08a7a') + '44' }">
          <img v-if="carrierIsImage(a.carrier, advisorCarrierStageOf(a))" :src="a.carrier?.imageData" class="a-avatar-img" :alt="a.name" />
          <span v-else class="a-icon">{{ glyphOf(a) }}</span>
          <div class="a-status" :class="a.state === 'slumber' ? 'dormant' : 'active'" />
        </div>
        <div class="a-info">
          <span class="a-name">{{ a.name }}</span>
          <span class="a-role">{{ roleLabel(a.role) }}<template v-if="isPreset(a.id)"> · 固定</template><template v-else-if="a.derivedFrom"> · 派生</template></span>
          <span class="a-personality">{{ personalityLabel(a.personality) }}<template v-if="a.derivedFrom"> · 源自{{ presetName(a.derivedFrom) }}</template></span>
        </div>
        <!-- 好感度等级标签（直接取自真实档案层，统一后不再恒为 --） -->
        <div class="a-affinity-tier" :style="affinityTierStyle(a.id)">
          {{ affinityTierLabel(a.id) }}
        </div>
        <div class="a-actions">
          <button v-if="isPreset(a.id)" @click.stop="deriveFromPreset(a)" title="基于该预设派生自定义幕僚">⧉ 派生</button>
          <button @click.stop="toggleDormant(a.id)" :title="a.state === 'slumber' ? '唤醒' : '沉睡'">{{ a.state === 'slumber' ? '🌱' : '💤' }}</button>
          <button v-if="!isPreset(a.id)" @click.stop="removeAdvisor(a.id)">×</button>
        </div>
      </div>
    </div>

    <!-- 操作按钮组 -->
    <div data-enter class="ah-action-row">
      <button class="ah-btn-new" @click="openCreate" :disabled="userAdvisors.length >= maxAdvisors">+ 创建幕僚</button>
      <button class="ah-btn-affinity" @click="$router.push('/advisor-affinity')" :disabled="!advisors.length">❤ 好感</button>
    </div>

    <!-- 镜我对白会话（归档） -->
    <section data-enter class="ah-dialogue-sessions">
      <DialogueSessionList />
    </section>

    <!-- 幕僚调度 -->
    <section data-enter class="ah-scheduler-section">
      <h3 class="ah-scheduler-heading">⚙ 幕僚调度</h3>
      <AdvisorScheduler />
    </section>

    <div data-enter v-if="!advisors.length" class="ah-empty-hint"><span>🏛</span><p>幕僚大厅等待第一位居民</p></div>

    <!-- 编辑弹窗 -->
    <Teleport to="body"><Transition name="modal">
      <div v-if="showModal" class="ah-dialog-overlay" @click.self="showModal = false">
        <div class="ah-dialog-card">
          <h3 class="ah-dialog-title">{{ editing ? '编辑幕僚' : '创建幕僚' }}</h3>
          <input v-model="form.name" placeholder="名字" class="ah-form-input" />
          <div class="ah-form-row">
            <select v-model="form.role" class="ah-select">
              <option v-for="o in ROLE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <select v-model="form.personality" class="ah-select">
              <option v-for="o in PERSONALITY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div class="ah-form-carrier">
            <AdvisorCarrierEditor v-model="form.carrier" />
          </div>
          <div class="ah-form-row">
            <select v-model="form.color" class="ah-select">
              <option value="">默认色</option>
              <option v-for="c in COLORS" :key="c" :value="c" :style="{ color: c }">● 配色</option>
            </select>
          </div>
          <div class="ah-dialog-actions">
            <button class="ah-btn-cancel" @click="showModal = false">取消</button>
            <button class="ah-btn-save" @click="saveAdvisor" :disabled="!form.name.trim()">保存</button>
          </div>
        </div>
      </div>
    </Transition></Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvisor } from '../resonance/bridges/advisor'
import { storage } from '../engine/storage'
import type { AdvisorProfile, AdvisorRole, AdvisorPersonality, AdvisorCarrier } from '../types'
import { advisorCarrierStageOf, carrierGlyph, carrierIsImage } from '../types'
import AdvisorScheduler from '../components/AdvisorScheduler.vue'
import DialogueSessionList from '../components/DialogueSessionList.vue'
import AdvisorCarrierEditor from '../components/AdvisorCarrierEditor.vue'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceRef, entranceClass } = useViewEntrance()
const $router = useRouter()

// ---- 统一到真实 advisor 档案层（含 6 固定预设）；与幕僚坞共享同一批幕僚 ----
const advisor = useAdvisor()
const advisors = computed<AdvisorProfile[]>(() => advisor.advisors)

const maxAdvisors = 5
const isPreset = (id: string) => id.startsWith('preset-')
const userAdvisors = computed(() => advisors.value.filter(a => !isPreset(a.id)))

// ---- 一次性迁移：旧表单层 hf:advisors → 真实档案层（保留用户已创建的幕僚） ----
const LEGACY_ADVISORS_KEY = 'hf:advisors'
interface LegacyAdvisor {
  id: string
  name: string
  role?: string
  personality?: string
  icon?: string
  color?: string
  rhythm?: string
  scene?: string
  dormant?: boolean
  createdAt?: string
}
const PERSONALITY_FROM_CN: Record<string, AdvisorPersonality> = {
  '沉稳': 'steady',
  '活泼': 'lively',
  '严谨': 'rigorous',
  '直觉': 'intuitive',
  '关怀': 'caring',
}
function migrateLegacyAdvisors() {
  const legacy = storage.getKV<LegacyAdvisor[]>(LEGACY_ADVISORS_KEY, [])
  if (!legacy.length) return
  for (const f of legacy) {
    if (advisor.advisors.some(a => a.id === f.id)) continue
    advisor.addAdvisorProfile({
      id: f.id,
      name: f.name || '无名幕僚',
      role: (f.role as AdvisorRole) || 'guardian',
      personality: PERSONALITY_FROM_CN[f.personality ?? ''] ?? 'steady',
      state: f.dormant ? 'slumber' : 'awake',
      affinity: 0,
      level: 1,
      totalInteractions: 0,
      createdAt: f.createdAt || new Date().toISOString(),
      lastActiveAt: null,
      unlocked: true,
      customColorScheme: f.color
        ? { primary: f.color, secondary: f.color, aura: f.color, text: '#ffffff' }
        : undefined,
      carrier: { kind: 'official-geometry', geometry: 'orb' },
    })
  }
  storage.setKV(LEGACY_ADVISORS_KEY, [])
}

onMounted(migrateLegacyAdvisors)

// ---- 展示映射 ----
const ROLE_OPTIONS: { value: AdvisorRole; label: string }[] = [
  { value: 'guardian', label: '陪伴型' },
  { value: 'scholar', label: '研究型' },
  { value: 'craftsman', label: '工作型' },
  { value: 'hermit', label: '生活型' },
]
const PERSONALITY_OPTIONS: { value: AdvisorPersonality; label: string }[] = [
  { value: 'steady', label: '沉稳' },
  { value: 'lively', label: '活泼' },
  { value: 'rigorous', label: '严谨' },
  { value: 'intuitive', label: '直觉' },
  { value: 'caring', label: '关怀' },
]
const COLORS = ['#f0c040', '#a07c8c', '#8a9a7a', '#d98c7a', '#6b9fc4', '#5ab8a0']

function roleLabel(r: AdvisorRole): string {
  return ROLE_OPTIONS.find(o => o.value === r)?.label ?? r
}
function personalityLabel(p: AdvisorPersonality): string {
  return PERSONALITY_OPTIONS.find(o => o.value === p)?.label ?? p
}
function glyphOf(a: AdvisorProfile): string {
  // 载体有官方几何 → 字形；用户图片 → 占位（模板改用 <img>）；无载体 → 回退星形
  // 按幕僚当前生命阶段解析对应形态（蓝图16:585 生命周期）
  return carrierGlyph(a.carrier, advisorCarrierStageOf(a)) ?? '✦'
}

// ---- 好感度等级（真实档案层，统一后有效） ----
const AFFINITY_BG = [
  'rgba(120,120,120,0.2)',
  'rgba(160,160,160,0.2)',
  'rgba(140,120,200,0.2)',
  'rgba(120,100,220,0.25)',
  'rgba(200,160,80,0.25)',
  'rgba(220,180,60,0.3)',
]
const AFFINITY_TEXT = [
  'rgba(255,255,255,0.35)',
  'rgba(255,255,255,0.45)',
  'rgba(255,255,255,0.55)',
  'rgba(200,180,255,0.75)',
  'rgba(255,220,120,0.85)',
  'rgba(255,200,80,1)',
]
function affinityTierLabel(id: string): string {
  return advisor.getAffinityTier(id)?.title ?? '--'
}
function affinityTierStyle(id: string): Record<string, string> {
  const tier = advisor.getAffinityTier(id)
  const idx = tier?.index ?? 0
  return { background: AFFINITY_BG[idx] ?? AFFINITY_BG[0], color: AFFINITY_TEXT[idx] ?? AFFINITY_TEXT[0] }
}

// ---- 创建 / 编辑 / 沉睡 / 删除（全部走真实档案层） ----
const showModal = ref(false)
const editing = ref(false)
const editingId = ref('')
const form = reactive<{
  name: string
  role: AdvisorRole
  personality: AdvisorPersonality
  carrier: AdvisorCarrier | undefined
  color: string
  derivedFrom: string
}>({
  name: '',
  role: 'guardian',
  personality: 'steady',
  carrier: undefined,
  color: '',
  derivedFrom: '',
})

function openCreate() {
  editing.value = false
  editingId.value = ''
  form.name = ''
  form.role = 'guardian'
  form.personality = 'steady'
  form.carrier = undefined
  form.color = ''
  form.derivedFrom = ''
  showModal.value = true
}

/** 基于某固定预设派生自定义幕僚：克隆其角色/性格/载体/色系/职责到表单，
 *  标 derivedFrom = 预设 id；保存时以非 preset- 前缀新 id 存入自定义层，
 *  绝不覆盖 6 固定预设（ensureDefaultAdvisors 幂等注入不受影响）。 */
function deriveFromPreset(preset: AdvisorProfile) {
  editing.value = false
  editingId.value = ''
  form.name = `${preset.name}的变体`
  form.role = preset.role
  form.personality = preset.personality
  form.carrier = preset.carrier ? (JSON.parse(JSON.stringify(preset.carrier)) as AdvisorCarrier) : undefined
  form.color = preset.customColorScheme?.primary ?? ''
  form.derivedFrom = preset.id
  showModal.value = true
}

/** 由预设 id 反查中文名（用于派生体「源自 X」展示） */
function presetName(presetId: string): string {
  return advisor.advisors.find(a => a.id === presetId)?.name ?? '预设'
}
function editAdvisor(a: AdvisorProfile) {
  editing.value = true
  editingId.value = a.id
  form.name = a.name
  form.role = a.role
  form.personality = a.personality
  // 深拷贝，避免编辑中途影响真实档案
  form.carrier = a.carrier ? (JSON.parse(JSON.stringify(a.carrier)) as AdvisorCarrier) : undefined
  form.color = a.customColorScheme?.primary ?? ''
  showModal.value = true
}
function saveAdvisor() {
  if (!form.name.trim()) return
  const colorScheme = form.color
    ? { primary: form.color, secondary: form.color, aura: form.color, text: '#ffffff' }
    : undefined
  if (editing.value) {
    advisor.updateAdvisorProfile(editingId.value, {
      name: form.name.trim(),
      role: form.role,
      personality: form.personality,
      carrier: form.carrier,
      customColorScheme: colorScheme,
    })
  } else {
    advisor.addAdvisorProfile({
      id: `adv${Date.now()}`,
      name: form.name.trim(),
      role: form.role,
      personality: form.personality,
      state: 'awake',
      affinity: 0,
      level: 1,
      totalInteractions: 0,
      createdAt: new Date().toISOString(),
      lastActiveAt: null,
      unlocked: true,
      customColorScheme: colorScheme,
      carrier: form.carrier,
      // 派生体溯源：标注入来源预设 id；空白创建时 derivedFrom 为空串 → undefined
      derivedFrom: form.derivedFrom || undefined,
    })
  }
  showModal.value = false
}
function toggleDormant(id: string) {
  const a = advisor.advisors.find(x => x.id === id)
  if (!a) return
  advisor.updateAdvisorProfile(id, { state: a.state === 'slumber' ? 'awake' : 'slumber' })
}
function removeAdvisor(id: string) {
  // 固定预设不可删，仅用户自建可删（避免误删 6 类固定幕僚）
  if (isPreset(id)) return
  advisor.removeAdvisorProfile(id)
}
</script>

<style scoped>
/* =========================================================
   Warm Amber Theme — 幕僚阁 (AdvisorHub)
   Background gradient: var(--bg-primary) → var(--bg-deep) → var(--bg-surface-alt) → var(--bg-deepest)
   Accent: var(--accent)
   Max-width: 600px
   ========================================================= */

/* ---- Root container ---- */
.ah {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  position: relative;
  overflow: hidden;
}
.ah::before {
  content: '';
  position: absolute;
  top: -40%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ---- Header ---- */
.ah-header {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}
.orn-line {
  display: inline-block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}
.orn-diamond {
  font-size: 14px;
  color: var(--accent);
  opacity: 0.7;
}
.header-kicker {
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(var(--accent-rgb), 0.5);
  margin-bottom: 6px;
}
.ah-title {
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 6px;
  color: var(--accent);
  margin: 0;
}

/* ---- Overview cards ---- */
.ah-overview {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}
.ah-overview-card {
  flex: 1;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  overflow: hidden;
}
.ah-overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.3), transparent);
  pointer-events: none;
}
.ah-overview-value {
  font-size: 22px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.1;
}
.ah-overview-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb), 0.4);
}

/* ---- Advisor grid ---- */
.ah-advisor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

/* ---- Advisor card ---- */
.ah-advisor-card {
  position: relative;
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}
.ah-advisor-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.ah-advisor-card:hover::before {
  opacity: 1;
}
.ah-advisor-card:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.ah-advisor-card.dormant {
  opacity: 0.35;
}

/* ---- Avatar / status (kept as a-*) ---- */
.a-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.a-icon {
  font-size: 24px;
}
.a-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.a-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--bg-primary);
}
.a-status.active {
  background: var(--success);
}
.a-status.dormant {
  background: #555;
}

/* ---- Info lines ---- */
.a-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.a-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255,240,224,0.92);
}
.a-role {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
}
.a-personality {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

/* ---- Affinity tier badge ---- */
.a-affinity-tier {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  pointer-events: none;
}

/* ---- Actions overlay ---- */
.a-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}
.ah-advisor-card:hover .a-actions {
  opacity: 1;
}
.a-actions button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--accent-rgb), 0.45);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}
.a-actions button:hover {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
}

/* ---- Action row ---- */
.ah-action-row {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

/* ---- Buttons ---- */
.ah-btn-new {
  display: block;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px dashed rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.04);
  color: var(--accent);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.ah-btn-new:hover {
  background: rgba(var(--accent-rgb), 0.09);
  border-color: rgba(var(--accent-rgb), 0.35);
}
.ah-btn-new:disabled {
  opacity: 0.25;
  cursor: default;
}

.ah-btn-affinity {
  display: block;
  width: 100%;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: rgba(var(--accent-rgb), 0.04);
  color: var(--accent);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.ah-btn-affinity:hover {
  background: rgba(var(--accent-rgb), 0.10);
}
.ah-btn-affinity:disabled {
  opacity: 0.25;
  cursor: default;
}

/* ---- Empty hint ---- */
.ah-empty-hint {
  text-align: center;
  padding: 60px 0;
  color: rgba(var(--accent-rgb), 0.18);
  position: relative;
  z-index: 1;
}
.ah-empty-hint span {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}

/* ---- Dialog overlay ---- */
.ah-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10,8,6,0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* ---- Dialog card ---- */
.ah-dialog-card {
  background: linear-gradient(145deg, var(--bg-deep) 0%, var(--bg-surface-alt) 100%);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 14px;
  padding: 28px 24px;
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--accent-rgb), 0.05);
}
.ah-dialog-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.25), transparent);
  border-radius: 14px 14px 0 0;
  pointer-events: none;
}
.ah-dialog-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 2px;
  margin: 0;
}

/* ---- Form inputs ---- */
.ah-form-input {
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
  color: rgba(255,240,224,0.85);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.ah-form-input::placeholder {
  color: rgba(var(--accent-rgb), 0.20);
}
.ah-form-input:focus {
  border-color: rgba(var(--accent-rgb), 0.30);
}

/* ---- Form row ---- */
.ah-form-row {
  display: flex;
  gap: 8px;
}

/* ---- Select ---- */
.ah-select {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
  color: rgba(255,240,224,0.75);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.ah-select:focus {
  border-color: rgba(var(--accent-rgb), 0.30);
}

/* ---- Dialog actions ---- */
.ah-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ---- Cancel / Save buttons ---- */
.ah-btn-cancel {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.45);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.ah-btn-cancel:hover {
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--accent-rgb), 0.65);
}

.ah-btn-save {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: var(--bg-primary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.ah-btn-save:hover {
  background: #debc8c;
}
.ah-btn-save:disabled {
  opacity: 0.35;
  cursor: default;
}

/* ---- Modal transition ---- */
.modal-enter-active {
  transition: all 0.2s ease-out;
}
.modal-leave-active {
  transition: all 0.15s ease-in;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- 幕僚调度面板 ---- */
.ah-scheduler-section {
  margin-top: 28px;
  position: relative;
  z-index: 1;
}
.ah-scheduler-heading {
  font-size: 14px;
  color: rgba(var(--accent-rgb), 0.55);
  margin-bottom: 12px;
  letter-spacing: 1px;
}

@media (max-width: 860px) {
  .ah { padding: 32px 20px 64px; }
  .ah-advisor-grid { gap: 8px; }
}

@media (max-width: 640px) {
  .ah { padding: 24px 14px 56px; }
  .ah-advisor-grid { grid-template-columns: 1fr; gap: 8px; }
  .ah-title { font-size: 22px; }
  .ah-action-row { flex-direction: column; }
  .ah-btn-new { width: 100%; }
  .ah-btn-affinity { width: 100%; }
}
</style>
