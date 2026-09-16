<template>
  <section class="acp">
    <div class="acp-head">
      <div class="acp-title-wrap">
        <span class="acp-title">🎉 庆祝与退休</span>
        <span class="acp-sub">为幕僚的里程碑举杯，为告别留一份遗产</span>
      </div>
      <span v-if="stats.total" class="acp-count">{{ stats.total }} 场仪式</span>
    </div>

    <!-- 空态 -->
    <div v-if="!advisors.length" class="acp-empty">
      <span class="acp-empty-icon">🎉</span>
      <p>先创建幕僚，才能为他们庆祝</p>
    </div>

    <template v-else>
      <!-- 创建庆祝 -->
      <div class="acp-add">
        <span class="acp-add-label">创建庆祝事件</span>
        <div class="acp-add-row">
          <select v-model="form.advisorId" class="acp-select">
            <option v-for="a in advisors" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
          <select v-model="form.type" class="acp-select">
            <option v-for="(meta, type) in CELEBRATION_TYPE_META" :key="type" :value="type">{{ meta.icon }} {{ meta.label }}</option>
          </select>
        </div>
        <div class="acp-add-row">
          <input v-model="form.title" class="acp-input" placeholder="标题（如：入幕满百日）" />
          <input v-model="form.description" class="acp-input" placeholder="描述…" />
          <button class="acp-add-btn" :disabled="!form.title.trim()" @click="create">创建</button>
        </div>
      </div>

      <!-- 庆祝列表 -->
      <div v-if="celebrations.length" class="acp-list">
        <div v-for="e in sortedCelebrations" :key="e.id" class="acp-item" :class="{ done: e.celebrated }">
          <div class="acp-item-head">
            <span class="acp-item-icon">{{ celIcon(e.type) }}</span>
            <span class="acp-item-name">{{ nameOf(e.advisorId) }}</span>
            <span class="acp-item-type">{{ celLabel(e.type) }}</span>
            <span class="acp-item-date">{{ e.date }}</span>
            <span v-if="e.celebrated" class="acp-done">已庆祝</span>
            <button v-else class="acp-btn acp-btn--small" @click="complete(e.id)">完成</button>
          </div>
          <p class="acp-item-title">{{ e.title }}</p>
          <p v-if="e.description" class="acp-item-desc">{{ e.description }}</p>
          <div v-if="e.ritual && !e.celebrated" class="acp-ritual">
            <span class="acp-ritual-name">{{ e.ritual.name }}</span>
            <ol class="acp-ritual-steps">
              <li v-for="(s, i) in e.ritual.steps" :key="i">{{ s }}</li>
            </ol>
          </div>
        </div>
      </div>
      <p v-else class="acp-none">还没有庆祝事件。为幕僚的里程碑举杯。</p>

      <!-- 退休仪式 -->
      <div v-if="activeRetirements.length || legacies.length" class="acp-retire">
        <div class="acp-retire-head">
          <span class="acp-retire-title">🕊 退休与遗产</span>
          <span class="acp-retire-sub">{{ stats.completed }} 场完成 · {{ legacies.length }} 件遗产</span>
        </div>
        <div v-for="r in activeRetirements" :key="r.id" class="acp-retire-item">
          <div class="acp-retire-item-head">
            <span class="acp-retire-name">{{ nameOf(r.advisorId) }} 的退休仪式</span>
            <span class="acp-retire-phase">{{ phaseLabel(r.phase) }}</span>
          </div>
          <p class="acp-retire-reason">{{ r.reason }}</p>
          <div class="acp-retire-ctrl">
            <button class="acp-btn acp-btn--small" @click="advance(r.id)">推进阶段</button>
            <button class="acp-btn acp-btn--small acp-btn--ghost" @click="startRetire(r.advisorId)">新退休仪式</button>
          </div>
        </div>
        <div v-if="legacies.length" class="acp-legacies">
          <div v-for="l in legacies" :key="l.id" class="acp-legacy">
            <span class="acp-legacy-icon">{{ legacyIcon(l.type) }}</span>
            <div class="acp-legacy-body">
              <span class="acp-legacy-title">{{ l.title }}</span>
              <p class="acp-legacy-content">{{ l.content }}</p>
            </div>
            <span v-if="l.inheritable" class="acp-legacy-inherit">可继承</span>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdvisorCelebration } from '../modules/advisor/celebration'
import { CELEBRATION_TYPE_META } from '../modules/advisor/types'
import type { CelebrationType, RetirementPhase } from '../modules/advisor/types'
import type { AdvisorProfile } from '../types/advisor'

const props = defineProps<{ advisors: AdvisorProfile[] }>()

const cel = useAdvisorCelebration()

const celebrations = computed(() => cel.celebrations.value)
const retirements = computed(() => cel.retirements.value)
const stats = computed(() => cel.getRetirementStats())
const legacies = computed(() => cel.getAllLegacies())
const activeRetirements = computed(() =>
  retirements.value.filter(r => !r.completedAt)
)

const form = ref<{ advisorId: string; type: CelebrationType; title: string; description: string }>({
  advisorId: '',
  type: 'milestone',
  title: '',
  description: '',
})

const sortedCelebrations = computed(() =>
  [...celebrations.value].sort((a, b) => (a.date < b.date ? 1 : -1))
)

function nameOf(id: string) {
  return props.advisors.find(a => a.id === id)?.name ?? '未知'
}
function celLabel(t: CelebrationType) {
  return CELEBRATION_TYPE_META[t]?.label ?? t
}
function celIcon(t: CelebrationType) {
  return CELEBRATION_TYPE_META[t]?.icon ?? '🎉'
}
const PHASE_META: Record<RetirementPhase, string> = {
  contemplation: '沉思',
  farewell: '告别',
  archiving: '归档',
  legacy: '传承',
}
function phaseLabel(p: RetirementPhase) {
  return PHASE_META[p] ?? p
}
const LEGACY_ICON: Record<string, string> = {
  wisdom: '🦉',
  memory: '📷',
  artifact: '🏺',
  blessing: '🕊',
}
function legacyIcon(t: string) {
  return LEGACY_ICON[t] ?? '📦'
}

function create() {
  if (!form.value.advisorId || !form.value.title.trim()) return
  cel.createCelebration(form.value.advisorId, form.value.type, form.value.title.trim(), form.value.description.trim())
  form.value.title = ''
  form.value.description = ''
}
function complete(id: string) {
  cel.completeCelebration(id)
}
function advance(id: string) {
  cel.advanceRetirementPhase(id)
}
function startRetire(advisorId: string) {
  cel.startRetirement(advisorId, '完成使命，荣休归隐')
}

onMounted(() => {
  if (props.advisors.length) form.value.advisorId = props.advisors[0].id
})
</script>

<style scoped>
.acp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.acp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.acp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.acp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.acp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.acp-count { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); white-space: nowrap; }

.acp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 0; text-align: center; }
.acp-empty-icon { font-size: 30px; opacity: 0.5; }
.acp-empty p { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }

.acp-add { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); }
.acp-add-label { font-size: 10px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); }
.acp-add-row { display: flex; gap: 8px; align-items: center; }
.acp-select { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, #d8c3a5); font-size: 12px; font-family: inherit; outline: none; }
.acp-select:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.acp-input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, #d8c3a5); font-size: 12px; font-family: inherit; outline: none; }
.acp-input:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.acp-input::placeholder { color: rgba(232, 221, 208, 0.35); }
.acp-add-btn { padding: 8px 18px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d8c3a5); font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.acp-add-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }
.acp-add-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.acp-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.acp-item { padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.acp-item.done { opacity: 0.55; }
.acp-item-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.acp-item-icon { font-size: 14px; }
.acp-item-name { font-size: 13px; font-weight: 600; color: var(--text-high, #d8c3a5); }
.acp-item-type { font-size: 11px; color: rgba(var(--accent-rgb), 0.7); }
.acp-item-date { margin-left: auto; font-size: 10px; color: rgba(232, 221, 208, 0.35); }
.acp-done { font-size: 10px; padding: 1px 8px; border-radius: 8px; background: rgba(138,154,122,0.15); color: #8a9a7a; }
.acp-item-title { font-size: 12px; color: var(--text-high, #d8c3a5); margin: 0 0 2px; }
.acp-item-desc { font-size: 11px; color: rgba(232, 221, 208, 0.5); margin: 0 0 6px; line-height: 1.5; }
.acp-ritual { padding: 8px 10px; border-radius: 8px; background: rgba(240,192,64,0.06); border: 1px dashed rgba(240,192,64,0.2); }
.acp-ritual-name { font-size: 11px; color: #f0c040; }
.acp-ritual-steps { margin: 4px 0 0; padding-left: 18px; font-size: 10px; color: rgba(232, 221, 208, 0.55); line-height: 1.7; }

.acp-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d8c3a5); font-size: 11px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.acp-btn:hover { background: rgba(var(--accent-rgb), 0.18); }
.acp-btn--small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   padding: 3px 10px; font-size: 10px; 
  min-height: 26px;
}
.acp-btn--ghost { background: transparent; border-color: rgba(255,255,255,0.15); color: rgba(232, 221, 208, 0.6); }
.acp-btn--ghost:hover { border-color: rgba(196,106,90,0.4); color: #c46a5a; background: rgba(196,106,90,0.08); }

.acp-none { font-size: 12px; color: rgba(232, 221, 208, 0.45); text-align: center; padding: 16px 0; margin: 0; }

.acp-retire { padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); }
.acp-retire-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.acp-retire-title { font-size: 12px; font-weight: 600; color: var(--text-high, #d8c3a5); }
.acp-retire-sub { font-size: 10px; color: rgba(232, 221, 208, 0.4); }
.acp-retire-item { padding: 10px 0; border-top: 1px dashed rgba(255,255,255,0.06); }
.acp-retire-item-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.acp-retire-name { font-size: 12px; font-weight: 600; color: var(--text-high, #d8c3a5); }
.acp-retire-phase { font-size: 10px; padding: 1px 8px; border-radius: 8px; background: rgba(240,192,64,0.12); color: #f0c040; }
.acp-retire-reason { font-size: 11px; color: rgba(232, 221, 208, 0.5); margin: 4px 0 8px; }
.acp-retire-ctrl { display: flex; gap: 6px; }
.acp-legacies { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.acp-legacy { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); }
.acp-legacy-icon { font-size: 16px; }
.acp-legacy-body { flex: 1; min-width: 0; }
.acp-legacy-title { font-size: 12px; font-weight: 600; color: var(--text-high, #d8c3a5); }
.acp-legacy-content { font-size: 11px; color: rgba(232, 221, 208, 0.55); margin: 2px 0 0; line-height: 1.5; }
.acp-legacy-inherit { font-size: 9px; padding: 1px 6px; border-radius: 6px; background: rgba(138,154,122,0.15); color: #8a9a7a; white-space: nowrap; }

@media (max-width: 640px) {
  .acp { padding: 14px 14px; }
  .acp-add-row { flex-direction: column; align-items: stretch; }
}
</style>