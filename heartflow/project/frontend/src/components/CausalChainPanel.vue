<template>
  <section class="ccp" aria-label="伤痕因果链">
    <div class="ccp-head">
      <div class="ccp-title-wrap">
        <span class="ccp-title">🔗 因果链</span>
        <span class="ccp-sub">从触发到伤痕，再到反思与成长，看清每一道印的来路</span>
      </div>
      <span v-if="analysis.chainCount" class="ccp-tag">{{ analysis.chainCount }} 条链路</span>
    </div>

    <!-- 空态 -->
    <div v-if="!props.marks.length" class="ccp-empty">
      <span class="ccp-empty-icon">🔗</span>
      <p class="ccp-empty-text">先记录一道工痕，才能展开它的因果链路</p>
    </div>

    <template v-else>
      <!-- 分析摘要 -->
      <div class="ccp-block">
        <span class="ccp-block-label">链路总览</span>
        <div class="ccp-metrics">
          <div class="ccp-metric"><b>{{ analysis.avgDepth }}</b><span>平均深度</span></div>
          <div class="ccp-metric"><b>{{ analysis.transformationRate }}%</b><span>转化率</span></div>
          <div class="ccp-metric"><b>{{ chains.length }}</b><span>链路数</span></div>
        </div>
        <div v-if="analysis.topRootCauses.length" class="ccp-roots">
          <span class="ccp-roots-label">常见根因</span>
          <div class="ccp-root-tags">
            <span v-for="r in analysis.topRootCauses" :key="r.label" class="ccp-root-tag">
              {{ rootLabel(r.label) }} <em>{{ r.count }}</em>
            </span>
          </div>
        </div>
        <div v-if="analysis.topGrowthDirections.length" class="ccp-growth">
          <span class="ccp-growth-label">成长方向</span>
          <div class="ccp-growth-tags">
            <span v-for="g in analysis.topGrowthDirections" :key="g.direction" class="ccp-growth-tag">{{ g.direction }}</span>
          </div>
        </div>
      </div>

      <!-- 单链选择 -->
      <div class="ccp-block">
        <span class="ccp-block-label">选择印记展开链路</span>
        <div class="ccp-picker">
          <button
            v-for="m in props.marks"
            :key="m.id"
            class="ccp-pick"
            :class="{ active: selectedId === m.id }"
            @click="select(m.id)"
          >
            <span class="ccp-pick-part">{{ partLabel(m.bodyPart) }}</span>
            <span class="ccp-pick-type">{{ typeLabel(m.scarType) }}</span>
          </button>
        </div>
      </div>

      <!-- 单链时间线 -->
      <div v-if="selectedChain" class="ccp-block">
        <span class="ccp-block-label">
          {{ partLabel(selectedChain.scar.bodyPart) }} · 链路深度 {{ selectedChain.depth }} · 强度 {{ Math.round(selectedChain.overallStrength * 100) }}%
        </span>
        <div class="ccp-chain">
          <div
            v-for="(e, i) in selectedChain.events"
            :key="e.id"
            class="ccp-event"
            :class="`is-${e.type}`"
          >
            <div class="ccp-event-rail">
              <span class="ccp-event-dot"></span>
              <span v-if="i < selectedChain.events.length - 1" class="ccp-event-line"></span>
            </div>
            <div class="ccp-event-body">
              <div class="ccp-event-head">
                <span class="ccp-event-type">{{ eventLabel(e.type) }}</span>
                <span class="ccp-event-intensity">{{ Math.round(e.intensity * 100) }}%</span>
              </div>
              <b class="ccp-event-label">{{ e.label }}</b>
              <p class="ccp-event-desc">{{ e.description }}</p>
              <div v-if="e.emotions.length" class="ccp-event-emotions">
                <span v-for="em in e.emotions" :key="em" class="ccp-emotion">{{ emLabel(em) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storage } from '../engine/storage'
import { useCausalChain } from '../modules/scar/causal-chain'
import { SCAR_STORAGE_KEYS } from '../modules/scar/types'
import type { BodyMark, GrowthRecord, BodyPart, ScarType } from '../modules/scar/types'

const props = defineProps<{ marks: BodyMark[] }>()

const causal = useCausalChain()
const growthRecords = ref<GrowthRecord[]>([])
const selectedId = ref<string | null>(null)

onMounted(() => {
  growthRecords.value = storage.getKV<GrowthRecord[]>(SCAR_STORAGE_KEYS.GROWTH, [])
})

const chains = computed(() => causal.buildAllChains(props.marks, growthRecords.value))
const analysis = computed(() => causal.analyzeChains(chains.value))

const selectedChain = computed(() => {
  if (!selectedId.value) return null
  return chains.value.find(c => c.scar.id === selectedId.value) ?? null
})

function select(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}

function partLabel(p: BodyPart) {
  const map: Record<string, string> = {
    head: '头部', neck: '颈部', shoulder: '肩部', back: '背部', chest: '胸部',
    arm: '手臂', hand: '手部', waist: '腰部', leg: '腿部', foot: '足部', eye: '眼部',
  }
  return map[p] ?? p
}

function typeLabel(t: ScarType) {
  const map: Record<string, string> = { impact: '撞击', cut: '割裂', burn: '灼烧', wear: '磨损' }
  return map[t] ?? t
}

function eventLabel(t: string) {
  const map: Record<string, string> = {
    trigger: '触发', scar_formation: '形成', impact: '影响',
    coping: '应对', reflection: '反思', growth: '成长',
  }
  return map[t] ?? t
}

function rootLabel(r: string) {
  const map: Record<string, string> = {
    work: '工作', relationship: '关系', health: '健康', growth: '成长',
    identity: '自我', environment: '环境', other: '其他',
  }
  return map[r] ?? r
}

function emLabel(em: string) {
  const map: Record<string, string> = {
    pain: '痛', fear: '惧', anger: '怒', confusion: '惑', hope: '望',
    acceptance: '接纳', growth: '成长', peace: '宁', neutral: '平静',
  }
  return map[em] ?? em
}
</script>

<style scoped>
.ccp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.ccp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.ccp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.ccp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.ccp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.ccp-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e0b88a; white-space: nowrap; }

.ccp-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 0 20px; }
.ccp-empty-icon { font-size: 26px; opacity: 0.6; }
.ccp-empty-text { font-size: 12px; color: rgba(232, 221, 208, 0.45); }

.ccp-block { margin-bottom: 14px; }
.ccp-block-label { display: block; font-size: 11px; letter-spacing: 1px; color: rgba(232, 221, 208, 0.55); margin-bottom: 10px; }

.ccp-metrics { display: flex; gap: 8px; margin-bottom: 12px; }
.ccp-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.ccp-metric b { font-size: 15px; font-weight: 500; color: #ecd6b5; }
.ccp-metric span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.ccp-roots, .ccp-growth { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.ccp-roots-label, .ccp-growth-label { font-size: 11px; color: rgba(232, 221, 208, 0.45); }
.ccp-root-tags, .ccp-growth-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.ccp-root-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.1); color: #e0b88a; }
.ccp-root-tag em { font-style: normal; opacity: 0.6; margin-left: 2px; }
.ccp-growth-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(138, 154, 122, 0.12); color: #8a9a7a; }

.ccp-picker { display: flex; gap: 6px; flex-wrap: wrap; }
.ccp-pick { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 10px; border: 1px solid var(--border, rgba(255,255,255,0.08)); background: transparent; color: rgba(232, 221, 208, 0.6); font-size: 11px; cursor: pointer; font-family: inherit; transition: all 0.3s; }
.ccp-pick:hover { border-color: rgba(var(--accent-rgb), 0.25); color: #ecd6b5; }
.ccp-pick.active { border-color: rgba(var(--accent-rgb), 0.4); background: rgba(var(--accent-rgb), 0.08); color: #ecd6b5; }
.ccp-pick-part { font-size: 12px; }
.ccp-pick-type { font-size: 10px; opacity: 0.6; }

.ccp-chain { display: flex; flex-direction: column; }
.ccp-event { display: flex; gap: 12px; }
.ccp-event-rail { display: flex; flex-direction: column; align-items: center; width: 14px; flex-shrink: 0; }
.ccp-event-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 16px; background: rgba(var(--accent-rgb), 0.5); box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.3); flex-shrink: 0; }
.ccp-event.is-growth .ccp-event-dot { background: #8a9a7a; box-shadow: 0 0 8px rgba(138, 154, 122, 0.4); }
.ccp-event.is-trigger .ccp-event-dot { background: #c46a5a; box-shadow: 0 0 8px rgba(196, 106, 90, 0.4); }
.ccp-event-line { flex: 1; width: 1px; background: rgba(var(--accent-rgb), 0.15); }
.ccp-event-body { flex: 1; padding: 10px 0 14px; }
.ccp-event-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.ccp-event-type { font-size: 10px; padding: 1px 8px; border-radius: 10px; background: rgba(var(--accent-rgb), 0.12); color: #e0b88a; }
.ccp-event.is-growth .ccp-event-type { background: rgba(138, 154, 122, 0.15); color: #8a9a7a; }
.ccp-event.is-trigger .ccp-event-type { background: rgba(196, 106, 90, 0.15); color: #c46a5a; }
.ccp-event-intensity { margin-left: auto; font-size: 10px; color: rgba(232, 221, 208, 0.35); }
.ccp-event-label { display: block; font-size: 12px; color: #ecd6b5; margin-bottom: 3px; }
.ccp-event-desc { margin: 0 0 6px; font-size: 11px; line-height: 1.6; color: rgba(232, 221, 208, 0.55); }
.ccp-event-emotions { display: flex; gap: 5px; flex-wrap: wrap; }
.ccp-emotion { font-size: 10px; padding: 1px 8px; border-radius: 10px; background: rgba(255,255,255,0.05); color: rgba(232, 221, 208, 0.5); }
</style>
