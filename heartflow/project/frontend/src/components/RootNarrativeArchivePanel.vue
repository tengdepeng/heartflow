<template>
  <section class="rna-panel" aria-label="根脉叙事档案">
    <!-- 空态：根脉未显影 -->
    <template v-if="!hasData">
      <div class="rna-head">
        <span class="rna-title">🪴 根脉叙事档案</span>
        <span class="rna-badge rna-badge-neutral">根脉未显影</span>
      </div>
      <p class="rna-empty">
        还没有根系记录可供叙事。种下第一个根系节点后，溯源叙事、时代回顾与支线故事便会在此显影。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="rna-head">
        <span class="rna-title">🪴 根脉叙事档案</span>
        <span class="rna-badge" :class="badgeClass">{{ badge.text }}</span>
      </div>

      <!-- 叙事模式切换 -->
      <div class="rna-modes">
        <button
          v-for="m in modes"
          :key="m.key"
          class="rna-mode"
          :class="{ 'rna-mode--active': mode === m.key }"
          @click="switchMode(m.key)"
        >
          {{ m.label }}
        </button>
      </div>

      <!-- 当前叙事 -->
      <div v-if="narrative" class="rna-block">
        <h3 class="rna-block-title">{{ narrative.title }}</h3>
        <p class="rna-subtitle">{{ narrative.subtitle }}</p>

        <!-- 支线故事：选择根系 -->
        <div v-if="mode === 'branch'" class="rna-branch-select">
          <select v-model="branchId" class="rna-select">
            <option v-for="r in roots" :key="r.id" :value="r.id">{{ r.text }}</option>
          </select>
        </div>

        <!-- 叙事段落 -->
        <div class="rna-paragraphs">
          <div
            v-for="p in narrative.paragraphs"
            :key="p.id"
            class="rna-paragraph"
            :class="`rna-tone--${p.emotionalTone}`"
          >
            <div class="rna-paragraph-head">
              <span class="rna-paragraph-era">{{ p.era || layerLabel(p.layer) }}</span>
              <span class="rna-paragraph-tone">{{ toneLabel(p.emotionalTone) }}</span>
            </div>
            <p class="rna-paragraph-text">{{ p.text }}</p>
            <div class="rna-paragraph-bar">
              <div class="rna-paragraph-fill" :style="{ width: intensityWidth(p.intensity) }"></div>
            </div>
          </div>
        </div>

        <!-- 关键人物 -->
        <div v-if="narrative.keyCharacters.length" class="rna-chars">
          <span class="rna-chars-label">关键人物</span>
          <span v-for="c in narrative.keyCharacters" :key="c" class="rna-char">{{ c }}</span>
        </div>

        <!-- 时间线 -->
        <div v-if="narrative.timeline.length" class="rna-timeline">
          <h4 class="rna-mini-title">时间脉络</h4>
          <div v-for="(t, i) in narrative.timeline" :key="i" class="rna-timeline-item">
            <span class="rna-timeline-era">{{ t.era }}</span>
            <span class="rna-timeline-summary">{{ t.summary }}</span>
          </div>
        </div>

        <!-- 情感曲线 -->
        <div v-if="narrative.emotionalCurve.length" class="rna-curve">
          <h4 class="rna-mini-title">情感曲线</h4>
          <div class="rna-curve-bars">
            <div
              v-for="pt in narrative.emotionalCurve"
              :key="pt.position"
              class="rna-curve-dot"
              :class="`rna-tone--${pt.tone}`"
              :style="{ height: curveHeight(pt.intensity) }"
              :title="`${toneLabel(pt.tone)} · ${Math.round(pt.intensity * 100)}`"
            ></div>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul class="rna-insights">
        <li v-for="ins in insights" :key="ins.title" class="rna-insight">
          <span class="rna-insight-mark">✦</span>
          <span class="rna-insight-text">
            <b>{{ ins.title }}</b>
            <span>{{ ins.description }}</span>
          </span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRootGarden } from '../modules/roots/roots-garden'
import {
  generateOriginNarrative,
  generateEraNarrative,
  generateBranchNarrative,
} from '../modules/roots/root-narrative'
import { weaveTraceTree } from '../modules/roots/root-tree'
import type { NarrativeMode } from '../modules/roots/root-narrative'

const rootGarden = useRootGarden()
const roots = rootGarden.items

const mode = ref<NarrativeMode>('origin')
const branchId = ref<string>('')

const hasData = computed(() => roots.value.length > 0)

const modes: { key: NarrativeMode; label: string }[] = [
  { key: 'origin', label: '溯源叙事' },
  { key: 'era', label: '时代回顾' },
  { key: 'branch', label: '支线故事' },
]

const narrative = computed(() => {
  const data = roots.value
  if (!data.length) return null
  if (mode.value === 'origin') return generateOriginNarrative(data, weaveTraceTree(data))
  if (mode.value === 'era') return generateEraNarrative(data)
  const target = data.find(r => r.id === branchId.value) || strongestRoot(data)
  return generateBranchNarrative(target, data)
})

const badge = computed(() => {
  const n = narrative.value
  if (!n || !n.paragraphs.length) return { text: '根脉未显影' }
  return { text: `${n.paragraphs.length} 段叙事` }
})

const badgeClass = computed(() => {
  const n = narrative.value
  if (!n || !n.paragraphs.length) return 'rna-badge-neutral'
  return 'rna-badge-positive'
})

const insights = computed(() => buildInsights())

function switchMode(key: NarrativeMode) {
  mode.value = key
  if (key === 'branch' && !branchId.value) {
    const top = strongestRoot(roots.value)
    if (top) branchId.value = top.id
  }
}

function strongestRoot(data: typeof roots.value): (typeof roots.value)[number] {
  return [...data].sort((a, b) => b.strength - a.strength)[0]
}

function buildInsights(): { title: string; description: string }[] {
  const out: { title: string; description: string }[] = []
  const n = narrative.value
  if (!n) return out

  const eraCount = new Set(n.timeline.map(t => t.era)).size
  out.push({
    title: '叙事已显影',
    description: `根系共 ${roots.value.length} 条，跨越 ${eraCount} 个时期，可在三种叙事模式间回望来路。`,
  })

  if (n.keyCharacters.length) {
    out.push({
      title: '关键人物',
      description: `叙事中浮现 ${n.keyCharacters.length} 位关键人物或意象，构成生命的经纬。`,
    })
  }

  const toneCounts = n.emotionalCurve.reduce<Record<string, number>>((acc, pt) => {
    acc[pt.tone] = (acc[pt.tone] || 0) + 1
    return acc
  }, {})
  const dominant = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]
  if (dominant) {
    out.push({
      title: '情感光谱',
      description: `叙事以「${toneLabel(dominant[0])}」色调为主，${n.emotionalCurve.length} 处情绪起伏。`,
    })
  }

  return out.slice(0, 3)
}

function toneLabel(tone: string): string {
  const map: Record<string, string> = {
    positive: '积极',
    neutral: '平静',
    reflective: '沉思',
    nostalgic: '怀旧',
    challenging: '挑战',
  }
  return map[tone] || tone
}

function layerLabel(layer: string): string {
  const map: Record<string, string> = { soil: '根系', era: '树干', branch: '枝桠' }
  return map[layer] || layer
}

function intensityWidth(intensity: number): string {
  return `${Math.max(6, Math.min(100, Math.round(intensity * 100)))}%`
}

function curveHeight(intensity: number): string {
  return `${Math.max(10, Math.min(56, Math.round(intensity * 56)))}px`
}

onMounted(() => {
  rootGarden.load()
})
</script>

<style scoped>
.rna-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.rna-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rna-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-high);
  letter-spacing: 0.02em;
}

.rna-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10px;
  border: 1px solid;
}

.rna-badge-neutral {
  color: var(--text-secondary);
  border-color: rgba(var(--accent-rgb), 0.18);
  background: rgba(var(--accent-rgb), 0.06);
}

.rna-badge-positive {
  color: #8a9a7a;
  border-color: rgba(138, 154, 122, 0.3);
  background: rgba(138, 154, 122, 0.08);
}

.rna-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* ---- 模式切换 ---- */
.rna-modes {
  display: flex;
  gap: 6px;
}

.rna-mode {
  flex: 1;
  padding: 7px 4px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.rna-mode--active {
  color: #f0c040;
  border-color: rgba(240, 192, 64, 0.35);
  background: rgba(240, 192, 64, 0.08);
}

/* ---- 叙事块 ---- */
.rna-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rna-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-high);
}

.rna-subtitle {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
}

.rna-branch-select {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rna-select {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}

.rna-select option {
  background: var(--bg-deep);
  color: var(--text-high);
}

/* ---- 叙事段落 ---- */
.rna-paragraphs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rna-paragraph {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  border-left: 3px solid var(--text-dim);
}

.rna-paragraph-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rna-paragraph-era {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}

.rna-paragraph-tone {
  font-size: 10px;
  color: var(--text-dim);
}

.rna-paragraph-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-high);
}

.rna-paragraph-bar {
  height: 4px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}

.rna-paragraph-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8B6F47, #f0c040);
}

/* ---- 情感色调 ---- */
.rna-tone--positive { border-left-color: #8a9a7a; }
.rna-tone--neutral { border-left-color: var(--text-dim); }
.rna-tone--reflective { border-left-color: #6b9fc4; }
.rna-tone--nostalgic { border-left-color: #f0c040; }
.rna-tone--challenging { border-left-color: #c46a5a; }

/* ---- 关键人物 ---- */
.rna-chars {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.rna-chars-label {
  font-size: 11px;
  color: var(--text-low);
  margin-right: 2px;
}

.rna-char {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  color: #c4956a;
  border: 1px solid rgba(196, 149, 106, 0.3);
  background: rgba(196, 149, 106, 0.08);
}

/* ---- 时间线 ---- */
.rna-timeline {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rna-mini-title {
  margin: 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}

.rna-timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.05);
}

.rna-timeline-era {
  flex-shrink: 0;
  min-width: 72px;
  font-size: 11px;
  font-weight: 500;
  color: #c4956a;
}

.rna-timeline-summary {
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
}

/* ---- 情感曲线 ---- */
.rna-curve {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rna-curve-bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 60px;
  padding: 0 2px;
}

.rna-curve-dot {
  flex: 1;
  min-width: 8px;
  border-radius: 4px 4px 0 0;
  opacity: 0.75;
  transition: opacity 0.15s;
}

.rna-curve-dot:hover {
  opacity: 1;
}

.rna-curve-dot.rna-tone--positive { background: #8a9a7a; }
.rna-curve-dot.rna-tone--neutral { background: var(--text-dim); }
.rna-curve-dot.rna-tone--reflective { background: #6b9fc4; }
.rna-curve-dot.rna-tone--nostalgic { background: #f0c040; }
.rna-curve-dot.rna-tone--challenging { background: #c46a5a; }

/* ---- 温和洞察 ---- */
.rna-insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rna-insight {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.rna-insight-mark {
  flex-shrink: 0;
  color: #f0c040;
  font-size: 12px;
  line-height: 1.6;
}

.rna-insight-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rna-insight-text b {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-high);
}

.rna-insight-text span {
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
}

@media (max-width: 520px) {
  .rna-modes {
    flex-direction: column;
  }
}
</style>
