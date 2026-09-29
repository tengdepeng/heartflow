<template>
  <section class="aip">
    <div class="aip-head">
      <div class="aip-title-wrap">
        <span class="aip-title">🤝 幕僚互动</span>
        <span class="aip-sub">幕僚之间的协作、互学与共处</span>
      </div>
      <span v-if="relations.length" class="aip-count">{{ relations.length }} 段关系</span>
    </div>

    <!-- 空态 -->
    <div v-if="!advisors.length" class="aip-empty">
      <span class="aip-empty-icon">🤝</span>
      <p>先创建幕僚，才能记录他们之间的互动</p>
    </div>

    <template v-else>
      <!-- 记录互动 -->
      <div class="aip-add">
        <span class="aip-add-label">记录一次互动</span>
        <div class="aip-add-row">
          <select v-model="form.aId" class="aip-select">
            <option v-for="a in advisors" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
          <span class="aip-add-arrow">⇄</span>
          <select v-model="form.bId" class="aip-select">
            <option v-for="a in advisors" :key="a.id" :value="a.id" :disabled="a.id === form.aId">{{ a.name }}</option>
          </select>
        </div>
        <div class="aip-add-row">
          <select v-model="form.type" class="aip-select">
            <option v-for="(meta, type) in INTERACTION_TYPE_META" :key="type" :value="type">{{ meta.icon }} {{ meta.label }}</option>
          </select>
          <select v-model="form.outcome" class="aip-select">
            <option value="positive">正向</option>
            <option value="neutral">中性</option>
            <option value="negative">负向</option>
          </select>
        </div>
        <div class="aip-add-row">
          <input v-model="form.topic" class="aip-input" placeholder="主题（如：读书会）" />
        </div>
        <div class="aip-add-row">
          <input v-model="form.summary" class="aip-input" placeholder="互动摘要…" />
          <button class="aip-add-btn" :disabled="!form.summary.trim()" @click="record">记录</button>
        </div>
      </div>

      <!-- 关系列表 -->
      <div v-if="relations.length" class="aip-list">
        <div v-for="r in sortedRelations" :key="r.id" class="aip-rel">
          <div class="aip-rel-head">
            <span class="aip-rel-names">{{ nameOf(r.advisorAId) }} <i>⇄</i> {{ nameOf(r.advisorBId) }}</span>
            <span class="aip-rel-type" :style="{ color: relTypeColor(r.relationType) }">{{ relTypeLabel(r.relationType) }}</span>
          </div>
          <div class="aip-rel-body">
            <div class="aip-closeness">
              <div class="aip-closeness-bar">
                <i :style="{ width: r.closeness + '%', background: closenessColor(r.closeness) }"></i>
              </div>
              <span class="aip-closeness-val">{{ r.closeness }}</span>
            </div>
            <div class="aip-rel-meta">
              <span>互动 {{ r.interactionCount }} 次</span>
              <span v-if="r.sharedTopics.length">· 话题 {{ r.sharedTopics.join('、') }}</span>
              <span v-if="r.lastInteractionAt">· {{ fmtDate(r.lastInteractionAt) }}</span>
            </div>
            <div v-if="r.interactionHistory.length" class="aip-history">
              <div v-for="h in r.interactionHistory.slice(-3).reverse()" :key="h.id" class="aip-history-item">
                <span class="aip-history-type">{{ typeIcon(h.type) }}</span>
                <span class="aip-history-topic">{{ h.topic }}</span>
                <span class="aip-history-summary">{{ h.summary }}</span>
                <span class="aip-history-delta" :class="deltaClass(h.closenessDelta)">{{ h.closenessDelta > 0 ? '+' : '' }}{{ h.closenessDelta }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="aip-none">还没有关系。记录第一次互动，让幕僚相识。</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdvisorInteraction } from '../modules/advisor/interaction'
import { INTERACTION_TYPE_META } from '../modules/advisor/types'
import type { InteractionType } from '../modules/advisor/types'
import type { AdvisorProfile } from '../types/advisor'

const props = defineProps<{ advisors: AdvisorProfile[] }>()

const interaction = useAdvisorInteraction()

const relations = computed(() => interaction.allRelations.value)

const form = ref<{
  aId: string
  bId: string
  type: InteractionType
  outcome: 'positive' | 'neutral' | 'negative'
  topic: string
  summary: string
}>({
  aId: '',
  bId: '',
  type: 'collaboration',
  outcome: 'neutral',
  topic: '',
  summary: '',
})

const sortedRelations = computed(() =>
  [...relations.value].sort((a, b) => b.closeness - a.closeness)
)

function nameOf(id: string) {
  return props.advisors.find(a => a.id === id)?.name ?? '未知'
}

const REL_TYPE_META: Record<string, { label: string; color: string }> = {
  mentor: { label: '师徒', color: '#f0c040' },
  peer: { label: '同侪', color: '#6b9fc4' },
  rival: { label: '对手', color: '#c46a5a' },
  companion: { label: '同伴', color: '#8a9a7a' },
  stranger: { label: '陌路', color: '#94a3b8' },
}

function relTypeLabel(t: string) {
  return REL_TYPE_META[t]?.label ?? t
}
function relTypeColor(t: string) {
  return REL_TYPE_META[t]?.color ?? '#94a3b8'
}
function closenessColor(v: number) {
  if (v >= 70) return '#8a9a7a'
  if (v >= 40) return '#f0c040'
  return '#c46a5a'
}
function typeIcon(t: InteractionType) {
  return INTERACTION_TYPE_META[t]?.icon ?? '💬'
}
function deltaClass(v: number) {
  return v > 0 ? 'is-pos' : v < 0 ? 'is-neg' : 'is-zero'
}
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function record() {
  if (!form.value.aId || !form.value.bId || form.value.aId === form.value.bId) return
  if (!form.value.summary.trim()) return
  interaction.recordInteraction(
    form.value.aId,
    form.value.bId,
    form.value.type,
    form.value.topic.trim() || '日常互动',
    form.value.summary.trim(),
    form.value.outcome,
  )
  form.value.summary = ''
  form.value.topic = ''
}

onMounted(() => {
  if (props.advisors.length >= 2) {
    form.value.aId = props.advisors[0].id
    form.value.bId = props.advisors[1].id
  } else if (props.advisors.length === 1) {
    form.value.aId = props.advisors[0].id
  }
})
</script>

<style scoped>
.aip {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.aip-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.aip-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.aip-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.aip-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.aip-count { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); white-space: nowrap; }

.aip-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 0; text-align: center; }
.aip-empty-icon { font-size: 30px; opacity: 0.5; }
.aip-empty p { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }

.aip-add { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); }
.aip-add-label { font-size: 10px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); }
.aip-add-row { display: flex; gap: 8px; align-items: center; }
.aip-select { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-size: 12px; font-family: inherit; outline: none; }
.aip-select:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.aip-add-arrow { color: rgba(var(--accent-rgb), 0.5); font-size: 14px; flex-shrink: 0; }
.aip-input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-size: 12px; font-family: inherit; outline: none; }
.aip-input:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.aip-input::placeholder { color: rgba(232, 221, 208, 0.35); }
.aip-add-btn { padding: 8px 18px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d4a574); font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.aip-add-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }
.aip-add-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.aip-list { display: flex; flex-direction: column; gap: 8px; }
.aip-rel { padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.aip-rel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.aip-rel-names { font-size: 13px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.aip-rel-names i { font-style: normal; color: rgba(var(--accent-rgb), 0.5); margin: 0 4px; }
.aip-rel-type { font-size: 11px; }
.aip-rel-body { display: flex; flex-direction: column; gap: 6px; }
.aip-closeness { display: flex; align-items: center; gap: 8px; }
.aip-closeness-bar { flex: 1; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
.aip-closeness-bar i { display: block; height: 100%; border-radius: 999px; transition: width 0.3s ease; }
.aip-closeness-val { font-size: 11px; color: rgba(232, 221, 208, 0.6); font-variant-numeric: tabular-nums; width: 28px; text-align: right; }
.aip-rel-meta { font-size: 10px; color: rgba(232, 221, 208, 0.45); }
.aip-history { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; padding-top: 6px; border-top: 1px dashed rgba(var(--accent-rgb), 0.12); }
.aip-history-item { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.aip-history-type { flex-shrink: 0; }
.aip-history-topic { color: var(--text-high, rgba(232, 224, 216, 0.88)); flex-shrink: 0; }
.aip-history-summary { color: rgba(232, 221, 208, 0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.aip-history-delta { margin-left: auto; font-variant-numeric: tabular-nums; font-size: 10px; }
.aip-history-delta.is-pos { color: #8a9a7a; }
.aip-history-delta.is-neg { color: #c46a5a; }
.aip-history-delta.is-zero { color: rgba(232, 221, 208, 0.35); }

.aip-none { font-size: 12px; color: rgba(232, 221, 208, 0.45); text-align: center; padding: 16px 0; margin: 0; }

@media (max-width: 640px) {
  .aip { padding: 14px 14px; }
  .aip-add-row { flex-direction: column; align-items: stretch; }
  .aip-add-arrow { text-align: center; }
}
</style>