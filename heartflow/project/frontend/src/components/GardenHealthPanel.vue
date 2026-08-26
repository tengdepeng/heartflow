<template>
  <section class="ghp-panel" data-enter>
    <header class="ghp-head">
      <h2 class="ghp-title">花园状态</h2>
      <span class="ghp-season" :class="`ghp-season--${season}`">
        <span class="ghp-season-icon">{{ seasonIcon }}</span>
        {{ seasonLabel }}
      </span>
    </header>

    <div class="ghp-metrics">
      <div class="ghp-metric">
        <span class="ghp-metric-num">{{ collection.completionRate }}<i>%</i></span>
        <span class="ghp-metric-label">图鉴收藏</span>
        <span class="ghp-metric-sub">{{ collection.unlocked.length }} / {{ collection.total }} 品种</span>
      </div>
      <div class="ghp-metric">
        <span class="ghp-metric-num">{{ health.score }}</span>
        <span class="ghp-metric-label">花园健康度</span>
        <span class="ghp-metric-sub" :style="{ color: health.level.color }">{{ health.level.label }}</span>
      </div>
    </div>

    <ul class="ghp-varieties">
      <li
        v-for="item in varietyDisplay"
        :key="item.emotion"
        class="ghp-var-row"
      >
        <span class="ghp-var-icon">{{ emotionMeta(item.emotion).icon }}</span>
        <span class="ghp-var-label">{{ emotionMeta(item.emotion).label }}</span>
        <span class="ghp-var-dot" :style="dotStyle(item.variety)" />
        <span
          v-if="item.variety"
          class="ghp-var-name"
          :class="`ghp-rarity--${item.variety.rarity}`"
        >
          {{ item.variety.chineseName }}
          <i class="ghp-rarity-tag">{{ rarityLabel(item.variety.rarity) }}</i>
        </span>
        <span v-else class="ghp-var-empty">尚未绽放</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  useEmotionBridge,
  EMOTION_OPTIONS,
} from '../modules/emotion/emotion-bridge'
import type { EmotionType, FlowerVariety } from '../modules/emotion/emotion-bridge'

const bridge = useEmotionBridge()
const gardenState = bridge.gardenState
const health = bridge.emotionHealth

const collection = computed(() => gardenState.value.collection)
const varietyDisplay = computed(() => gardenState.value.varietyDisplay)
const season = computed(() => gardenState.value.season)

const SEASON_MAP: Record<string, { label: string; icon: string }> = {
  spring: { label: '春日', icon: '🌸' },
  summer: { label: '盛夏', icon: '🌻' },
  autumn: { label: '秋实', icon: '🍁' },
  winter: { label: '寒冬', icon: '❄' },
}
const seasonLabel = computed(() => SEASON_MAP[season.value]?.label ?? '春日')
const seasonIcon = computed(() => SEASON_MAP[season.value]?.icon ?? '🌸')

const RARITY_MAP: Record<string, string> = {
  common: '普通',
  uncommon: '稀少',
  rare: '珍稀',
  legendary: '传奇',
}
function rarityLabel(r: string): string {
  return RARITY_MAP[r] ?? r
}
function emotionMeta(type: EmotionType): { icon: string; label: string } {
  const opt = EMOTION_OPTIONS.find(o => o.type === type)
  return { icon: opt?.icon ?? '🌿', label: opt?.label ?? type }
}
function dotStyle(variety: FlowerVariety | null): Record<string, string> {
  if (!variety) return { background: 'transparent', border: '1px dashed rgba(255,255,255,0.25)' }
  return { background: variety.petalColor }
}
</script>

<style scoped>
.ghp-panel {
  margin: 18px 0;
  padding: 18px 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
}
.ghp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.ghp-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.92);
}
.ghp-season {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.ghp-season--spring { color: #f3a6c0; }
.ghp-season--summer { color: #f0c040; }
.ghp-season--autumn { color: #e08a4a; }
.ghp-season--winter { color: #9fc6e0; }
.ghp-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.ghp-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.ghp-metric-num {
  font-size: 26px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.1;
}
.ghp-metric-num i {
  font-size: 14px;
  font-style: normal;
  margin-left: 2px;
  color: rgba(255, 255, 255, 0.55);
}
.ghp-metric-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}
.ghp-metric-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
.ghp-varieties {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ghp-var-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
}
.ghp-var-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}
.ghp-var-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  width: 52px;
  flex-shrink: 0;
}
.ghp-var-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.15);
}
.ghp-var-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ghp-rarity-tag {
  font-style: normal;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
}
.ghp-rarity--rare .ghp-rarity-tag { color: #9fc6ff; background: rgba(159, 198, 255, 0.14); }
.ghp-rarity--legendary .ghp-rarity-tag { color: #f0c040; background: rgba(240, 192, 64, 0.16); }
.ghp-rarity--uncommon .ghp-rarity-tag { color: #8fe0b0; background: rgba(143, 224, 176, 0.14); }
.ghp-var-empty {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
}
</style>
