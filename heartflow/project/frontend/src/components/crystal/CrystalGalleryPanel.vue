<template>
  <section class="cry-panel" aria-label="结晶画廊">
    <div class="cry-panel-head">
      <span class="cry-panel-title">💎 结晶画廊</span>
      <span class="cry-panel-sub">专注完成 · 凝时成晶</span>
    </div>

    <!-- 概览 -->
    <div class="cry-block">
      <span class="cry-block-label">结晶概览</span>
      <div class="cry-stats">
        <div class="cry-stat"><span class="cry-stat-num">{{ crystals.length }}</span><span class="cry-stat-label">结晶</span></div>
        <div class="cry-stat"><span class="cry-stat-num">{{ perfectCount }}</span><span class="cry-stat-label">完美之晶</span></div>
        <div class="cry-stat"><span class="cry-stat-num">{{ avgIntensity }}</span><span class="cry-stat-label">均强度</span></div>
        <div class="cry-stat"><span class="cry-stat-num">{{ todayCount }}</span><span class="cry-stat-label">今日</span></div>
      </div>
      <p v-if="crystals.length === 0" class="cry-empty">尚无结晶。完成一次专注，时间将凝结为第一颗结晶。</p>
    </div>

    <!-- 画廊 -->
    <div v-if="crystals.length" class="cry-block">
      <span class="cry-block-label">画廊 · 最近 {{ crystals.length }} 颗</span>
      <div class="cry-gallery">
        <div v-for="c in crystals" :key="c.id" class="cry-gem" :style="{ borderColor: c.color + '44' }">
          <div class="cry-gem-visual" :style="{ background: `radial-gradient(circle at 35% 30%, ${c.color}66, ${c.color}22 70%)` }">
            <span class="cry-gem-shape" :style="{ color: c.color }">{{ shapeIcon(c.shape) }}</span>
          </div>
          <div class="cry-gem-body">
            <strong class="cry-gem-name" :style="{ color: c.color }">{{ shapeLabel(c.shape) }}</strong>
            <span class="cry-gem-meta">强度 {{ Math.round(c.intensity * 100) }}% · {{ fmtDate(c.createdAt) }}</span>
            <span v-if="c.tags.length" class="cry-gem-tags">{{ c.tags.slice(0, 3).join(' · ') }}</span>
            <span v-if="c.insight" class="cry-gem-insight">{{ c.insight }}</span>
          </div>
          <button class="cry-btn danger" @click="removeCrystal(c.id)">×</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storage } from '../../engine/storage'
import { remove } from '../../modules/crystal'
import type { TimeCrystal, CrystalShape } from '../../types'

const crystals = ref<TimeCrystal[]>([])

const SHAPE_META: Record<CrystalShape, { label: string; icon: string }> = {
  sphere: { label: '完美之晶', icon: '💎' },
  dodecahedron: { label: '精雕', icon: '✨' },
  octahedron: { label: '成色', icon: '💠' },
  tetrahedron: { label: '初凝', icon: '🔷' },
  irregular: { label: '残晶', icon: '🪨' },
}

const perfectCount = computed(() => crystals.value.filter(c => c.shape === 'sphere').length)
const todayCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return crystals.value.filter(c => c.createdAt.startsWith(today)).length
})
const avgIntensity = computed(() => {
  if (!crystals.value.length) return 0
  return Math.round(crystals.value.reduce((s, c) => s + c.intensity, 0) / crystals.value.length * 100)
})

function shapeLabel(shape: CrystalShape): string {
  return SHAPE_META[shape]?.label ?? shape
}

function shapeIcon(shape: CrystalShape): string {
  return SHAPE_META[shape]?.icon ?? '💎'
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function removeCrystal(id: string) {
  remove(id)
  load()
}

function load() {
  crystals.value = [...storage.getCrystals()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

onMounted(load)
</script>

<style scoped>
.cry-panel {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}

.cry-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.cry-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}

.cry-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}

.cry-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.cry-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}

.cry-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.cry-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.cry-stat-num {
  font-size: 18px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}

.cry-stat-label {
  font-size: 10px;
  color: var(--text-low);
}

.cry-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
  text-align: center;
}

.cry-gallery {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cry-gem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.cry-gem-visual {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cry-gem-shape {
  font-size: 22px;
}

.cry-gem-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cry-gem-name {
  font-size: 12px;
  font-weight: 600;
}

.cry-gem-meta {
  font-size: 10px;
  color: var(--text-low);
}

.cry-gem-tags {
  font-size: 10px;
  color: var(--text-medium);
}

.cry-gem-insight {
  font-size: 10px;
  line-height: 1.5;
  color: rgba(240, 242, 255, 0.7);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cry-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  flex-shrink: 0;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.12);
  color: rgba(var(--accent-rgb), 0.9);
  cursor: pointer;

  min-height: 26px;
}

.cry-btn.danger {
  border-color: rgba(196, 106, 90, 0.4);
  background: rgba(196, 106, 90, 0.12);
  color: rgba(196, 106, 90, 0.9);
}
</style>
