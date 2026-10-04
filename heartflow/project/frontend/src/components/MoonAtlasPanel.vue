<script setup lang="ts">
// ============================================================
// 星空 · 月面地名导览面板（INCR-512）
// 正交投影把月面地名（月海/环形山/山脉…）绘到单位月盘上，
// 支持按类型筛选 / 关键词搜索 / 按直径排序 / 悬停查看详情。
// 数据纯本地静态库，零网络。
// ============================================================
import { ref, computed } from 'vue'
import {
  LUNAR_FEATURES,
  FEATURE_TYPE_LABEL,
  FEATURE_TYPE_ORDER,
  featuresByType,
  searchFeatures,
  sortByDiameter,
  projectToDisc,
  discRadius,
  isFarSide,
} from '../modules/sky/moon-atlas'
import type { LunarFeature, LunarFeatureType } from '../modules/sky/moon-atlas'

const cx = 150
const cy = 150
const R = 132

const type = ref<LunarFeatureType | ''>('')
const query = ref('')
const desc = ref(true)
const hover = ref<LunarFeature | null>(null)
const selected = ref<LunarFeature | null>(null)

const list = computed<LunarFeature[]>(() => {
  const base = searchFeatures(query.value)
  const byType = featuresByType(type.value).filter((f) => base.includes(f))
  return sortByDiameter(byType, desc.value)
})

const nearSideCount = computed(() => list.value.filter((f) => !isFarSide(f)).length)

interface Plotted {
  feature: LunarFeature
  x: number
  y: number
  r: number
  visible: boolean
  far: boolean
}

const plotted = computed<Plotted[]>(() =>
  list.value.map((f) => {
    const p = projectToDisc(f.lat, f.lon)
    return {
      feature: f,
      x: cx + p.x * R,
      y: cy - p.y * R,
      r: Math.max(2.5, discRadius(f.diameter) * R),
      visible: p.visible,
      far: isFarSide(f),
    }
  }),
)

const active = computed<LunarFeature | null>(() => hover.value ?? selected.value)

function typeLabel(t: LunarFeatureType): string {
  return FEATURE_TYPE_LABEL[t]
}

function pick(f: LunarFeature): void {
  selected.value = selected.value?.id === f.id ? null : f
}
</script>

<template>
  <section class="mna-panel">
    <header class="mna-head">
      <div>
        <h4 class="mna-title">🌕 月面地名导览</h4>
        <p class="mna-hint">正交投影 · 月海/环形山/山脉标注 · 近地面 {{ nearSideCount }} / 共 {{ LUNAR_FEATURES.length }}</p>
      </div>
      <button class="mna-sort" type="button" @click="desc = !desc">
        {{ desc ? '直径 ↓' : '直径 ↑' }}
      </button>
    </header>

    <div class="mna-body">
      <!-- 月盘 -->
      <div class="mna-disc-wrap">
        <svg :viewBox="`0 0 300 300`" class="mna-svg" role="img" aria-label="月面地名投影图">
          <defs>
            <radialGradient id="mnaSurface" cx="42%" cy="38%" r="72%">
              <stop offset="0%" stop-color="rgba(232,228,214,0.20)" />
              <stop offset="70%" stop-color="rgba(180,176,164,0.10)" />
              <stop offset="100%" stop-color="rgba(120,118,110,0.05)" />
            </radialGradient>
          </defs>
          <circle :cx="cx" :cy="cy" :r="R" fill="url(#mnaSurface)" stroke="rgba(214,208,190,0.4)" />
          <ellipse :cx="cx" :cy="cy" :rx="R * 0.66" :ry="R" fill="none" stroke="rgba(214,208,190,0.12)" stroke-dasharray="3 5" />
          <ellipse :cx="cx" :cy="cy" :rx="R * 0.33" :ry="R" fill="none" stroke="rgba(214,208,190,0.12)" stroke-dasharray="3 5" />

          <g v-for="p in plotted" :key="p.feature.id">
            <circle
              :cx="p.x"
              :cy="p.y"
              :r="p.r"
              class="mna-feat"
              :class="[{ 'is-far': p.far, 'is-active': active?.id === p.feature.id }, 'mna-' + p.feature.type]"
              @mouseenter="hover = p.feature"
              @mouseleave="hover = null"
              @click="pick(p.feature)"
            />
          </g>
        </svg>

        <!-- 悬停/选中详情卡 -->
        <div v-if="active" class="mna-card">
          <div class="mna-card-head">
            <b>{{ active.nameZh }}</b>
            <span class="mna-card-type">{{ typeLabel(active.type) }}</span>
          </div>
          <p class="mna-card-latin">{{ active.name }}</p>
          <p class="mna-card-meta">
            {{ active.lat >= 0 ? 'N' : 'S' }}{{ Math.abs(active.lat) }}° ·
            {{ active.lon >= 0 ? 'E' : 'W' }}{{ Math.abs(active.lon) }}° · ⌀ {{ active.diameter }} km
          </p>
          <p v-if="isFarSide(active)" class="mna-card-far">🌑 位于月面背面，正面观测不可见</p>
        </div>
      </div>

      <!-- 侧栏：筛选 + 列表 -->
      <div class="mna-side">
        <input class="mna-search" type="search" v-model="query" placeholder="搜索中/拉丁名…" aria-label="搜索月面地名" />
        <div class="mna-chips">
          <button class="mna-chip" :class="{ 'is-active': !type }" type="button" @click="type = ''">全部</button>
          <button
            v-for="t in FEATURE_TYPE_ORDER"
            :key="t"
            class="mna-chip"
            :class="{ 'is-active': type === t }"
            type="button"
            @click="type = t"
          >{{ typeLabel(t) }}</button>
        </div>

        <ul class="mna-list">
          <li
            v-for="f in list"
            :key="f.id"
            class="mna-item"
            :class="{ 'is-active': active?.id === f.id, 'is-far': isFarSide(f) }"
            @mouseenter="hover = f"
            @mouseleave="hover = null"
            @click="pick(f)"
          >
            <span class="mna-dot" :class="'mna-' + f.type" />
            <span class="mna-item-name">{{ f.nameZh }}</span>
            <span class="mna-item-d">{{ f.diameter }}km</span>
          </li>
          <li v-if="list.length === 0" class="mna-empty">未找到匹配的月面地名。</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mna-panel {
  margin-top: 18px; padding-top: 14px; border-top: 1px dashed rgba(255, 255, 255, 0.14);
}
.mna-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.mna-title { margin: 0; }
.mna-hint { margin: 4px 0 12px; font-size: 12px; opacity: 0.62; }
.mna-sort {
  padding: 4px 11px; font-size: 12px; border: 1px solid rgba(214, 208, 190, 0.3);
  border-radius: 999px; background: rgba(255, 255, 255, 0.03); color: inherit; cursor: pointer;
}
.mna-body { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
.mna-disc-wrap { position: relative; flex: 0 0 300px; max-width: 300px; }
.mna-svg { width: 100%; height: auto; display: block; }
.mna-feat {
  fill: rgba(214, 208, 190, 0.28); stroke: rgba(214, 208, 190, 0.55); stroke-width: 0.8;
  cursor: pointer; transition: fill 0.16s, stroke 0.16s;
}
.mna-feat.is-active { fill: rgba(138, 180, 255, 0.5); stroke: #8ab4ff; }
.mna-feat.is-far { opacity: 0.35; stroke-dasharray: 2 2; }
.mna-mare, .mna-oceanus { fill: rgba(120, 140, 180, 0.30); }
.mna-sinus { fill: rgba(120, 160, 180, 0.30); }
.mna-crater { fill: rgba(200, 190, 170, 0.24); }
.mna-montes { fill: rgba(190, 150, 120, 0.32); }
.mna-basin { fill: rgba(160, 130, 190, 0.28); }
.mna-rupes { fill: rgba(220, 180, 140, 0.32); }
.mna-card {
  margin-top: 10px; padding: 10px 12px; border: 1px solid rgba(138, 180, 255, 0.35);
  border-radius: 10px; background: rgba(14, 18, 34, 0.5);
}
.mna-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.mna-card-head b { font-size: 13px; }
.mna-card-type { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: rgba(138, 180, 255, 0.14); color: #8ab4ff; }
.mna-card-latin { margin: 3px 0; font-size: 11px; opacity: 0.6; }
.mna-card-meta { margin: 3px 0 0; font-size: 11px; opacity: 0.78; }
.mna-card-far { margin: 6px 0 0; font-size: 11px; color: #f0c040; opacity: 0.85; }
.mna-side { flex: 1 1 240px; min-width: 220px; }
.mna-search {
  width: 100%; padding: 7px 11px; font-size: 13px; box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.28); border-radius: 8px;
  background: rgba(255, 255, 255, 0.04); color: inherit; margin-bottom: 10px;
}
.mna-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.mna-chip {
  padding: 3px 10px; font-size: 11px; border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 999px; background: transparent; color: inherit; cursor: pointer; transition: all 0.16s;
}
.mna-chip.is-active { border-color: #8ab4ff; color: #8ab4ff; background: rgba(138, 180, 255, 0.12); }
.mna-list { list-style: none; margin: 0; padding: 0; max-height: 320px; overflow-y: auto; display: grid; gap: 4px; }
.mna-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 9px; border-radius: 7px;
  font-size: 12px; cursor: pointer; border: 1px solid transparent; transition: all 0.14s;
}
.mna-item:hover { background: rgba(255, 255, 255, 0.04); }
.mna-item.is-active { border-color: rgba(138, 180, 255, 0.4); background: rgba(138, 180, 255, 0.1); }
.mna-item.is-far { opacity: 0.6; }
.mna-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(214, 208, 190, 0.5); }
.mna-item-name { flex: 1; }
.mna-item-d { font-size: 11px; opacity: 0.55; font-variant-numeric: tabular-nums; }
.mna-empty { padding: 16px; text-align: center; font-size: 13px; opacity: 0.55; }
</style>
