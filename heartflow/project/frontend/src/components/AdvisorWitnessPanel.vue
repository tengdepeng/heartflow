<template>
  <section class="awp">
    <div class="awp-head">
      <div class="awp-title-wrap">
        <span class="awp-title">📜 见证收件箱</span>
        <span class="awp-sub">幕僚见证你的每一次成长</span>
      </div>
      <span v-if="stats.totalWitnessed" class="awp-count">{{ stats.totalWitnessed }} 次见证</span>
    </div>

    <!-- 空态 -->
    <EmptyState v-if="!advisors.length" icon="📜" title="先创建幕僚，才能记录见证" :glow="false" cta-label="" />

    <template v-else>
      <!-- 记录见证 -->
      <div class="awp-add">
        <span class="awp-add-label">记录一次见证</span>
        <div class="awp-add-row">
          <select v-model="form.advisorId" class="awp-select">
            <option v-for="a in advisors" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
          <select v-model="form.eventType" class="awp-select">
            <option v-for="(meta, type) in WITNESS_EVENT_META" :key="type" :value="type">{{ meta.icon }} {{ meta.label }}</option>
          </select>
        </div>
        <div class="awp-add-row">
          <input v-model="form.title" class="awp-input" placeholder="事件标题（如：连续专注 7 天）" />
          <button class="awp-add-btn" :disabled="!form.title.trim()" @click="record">见证</button>
        </div>
      </div>

      <!-- 统计 -->
      <div v-if="stats.totalWitnessed" class="awp-stats">
        <div class="awp-stat" v-for="(meta, type) in WITNESS_EVENT_META" :key="type" v-show="stats.byType[type]">
          <b>{{ stats.byType[type] || 0 }}</b>
          <span>{{ meta.icon }} {{ meta.label }}</span>
        </div>
      </div>

      <!-- 见证列表 -->
      <div v-if="witnesses.length" class="awp-list">
        <div v-for="w in sortedWitnesses" :key="w.id" class="awp-item" :class="{ unviewed: !w.viewed }" @click="markViewed(w.id)">
          <div class="awp-item-head">
            <span class="awp-item-icon">{{ eventIcon(w.eventType) }}</span>
            <span class="awp-item-name">{{ nameOf(w.advisorId) }}</span>
            <span class="awp-item-type">{{ eventLabel(w.eventType) }}</span>
            <span class="awp-item-date">{{ fmtDate(w.timestamp) }}</span>
            <span v-if="!w.viewed" class="awp-unviewed-dot" title="未读"></span>
          </div>
          <p class="awp-item-title">{{ w.title }}</p>
          <p v-if="w.viewed" class="awp-reaction">「{{ reactionOf(w) }}」</p>
        </div>
      </div>
      <p v-else class="awp-none">还没有见证。记录第一次见证，让幕僚看见你的成长。</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdvisorWitness, generateReaction } from '../modules/advisor/witness'
import { WITNESS_EVENT_META } from '../modules/advisor/types'
import type { WitnessEventType, AdvisorWitnessRecord } from '../modules/advisor/types'
import type { AdvisorProfile } from '../types/advisor'
import EmptyState from './EmptyState.vue'

const props = defineProps<{ advisors: AdvisorProfile[] }>()

const witness = useAdvisorWitness()

const witnesses = computed(() => witness.witnesses.value)
const stats = computed(() => witness.getWitnessStats())

const form = ref<{ advisorId: string; eventType: WitnessEventType; title: string }>({
  advisorId: '',
  eventType: 'first-focus',
  title: '',
})

const sortedWitnesses = computed(() =>
  [...witnesses.value].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
)

function nameOf(id: string) {
  return props.advisors.find(a => a.id === id)?.name ?? '未知幕僚'
}
function eventLabel(t: WitnessEventType) {
  return WITNESS_EVENT_META[t]?.label ?? t
}
function eventIcon(t: WitnessEventType) {
  return WITNESS_EVENT_META[t]?.icon ?? '📜'
}
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function reactionOf(w: AdvisorWitnessRecord) {
  const advisor = props.advisors.find(a => a.id === w.advisorId)
  return generateReaction(w.eventType, advisor?.personality)
}

function record() {
  if (!form.value.advisorId || !form.value.title.trim()) return
  witness.recordWitness(form.value.advisorId, form.value.eventType, form.value.title.trim())
  form.value.title = ''
}

function markViewed(id: string) {
  witness.markViewed(id)
}

onMounted(() => {
  if (props.advisors.length) form.value.advisorId = props.advisors[0].id
})
</script>

<style scoped>
.awp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.awp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.awp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.awp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.awp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.awp-count { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); white-space: nowrap; }

.awp-add { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); }
.awp-add-label { font-size: 10px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); }
.awp-add-row { display: flex; gap: 8px; align-items: center; }
.awp-select { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-size: 12px; font-family: inherit; outline: none; }
.awp-select:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.awp-input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-size: 12px; font-family: inherit; outline: none; }
.awp-input:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.awp-input::placeholder { color: rgba(232, 221, 208, 0.35); }
.awp-add-btn { padding: 8px 18px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d4a574); font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.awp-add-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }
.awp-add-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.awp-stats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.awp-stat { flex: 1; min-width: 80px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.awp-stat b { font-size: 17px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.awp-stat span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.awp-list { display: flex; flex-direction: column; gap: 8px; }
.awp-item { padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: all 0.2s; }
.awp-item:hover { border-color: rgba(var(--accent-rgb), 0.25); }
.awp-item.unviewed { border-left: 2px solid #f0c040; }
.awp-item-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.awp-item-icon { font-size: 14px; }
.awp-item-name { font-size: 13px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.awp-item-type { font-size: 11px; color: rgba(var(--accent-rgb), 0.7); }
.awp-item-date { margin-left: auto; font-size: 10px; color: rgba(232, 221, 208, 0.35); }
.awp-unviewed-dot { width: 8px; height: 8px; border-radius: 50%; background: #f0c040; }
.awp-item-title { font-size: 12px; color: rgba(232, 221, 208, 0.75); margin: 0 0 4px; line-height: 1.5; }
.awp-reaction { font-size: 11px; color: rgba(var(--accent-rgb), 0.65); margin: 0; font-style: italic; }

.awp-none { font-size: 12px; color: rgba(232, 221, 208, 0.45); text-align: center; padding: 16px 0; margin: 0; }

@media (max-width: 640px) {
  .awp { padding: 14px 14px; }
  .awp-add-row { flex-direction: column; align-items: stretch; }
}
</style>