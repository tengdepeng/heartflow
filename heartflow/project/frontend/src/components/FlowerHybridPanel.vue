<template>
  <section class="cbp" aria-label="花种杂交">
    <div class="cbp-head">
      <span class="cbp-title">🌼 花种杂交</span>
      <span class="cbp-sub">配方 · 季候 · 变异</span>
    </div>

    <!-- 季候选择 -->
    <div class="cbp-climate">
      <div class="cbp-climate-label">当前季候与心情</div>
      <div class="cbp-climate-chips">
        <button
          v-for="(s, key) in SEASON_LABELS"
          :key="key"
          class="cbp-chip"
          :class="{ on: season === key }"
          @click="season = key"
        >{{ s.label }} {{ s.emoji }}</button>
      </div>
      <div class="cbp-climate-chips">
        <button
          v-for="m in moods"
          :key="m.key"
          class="cbp-chip"
          :class="{ on: mood === m.key }"
          @click="mood = m.key"
        >{{ m.label }}</button>
      </div>
    </div>

    <!-- 统计 -->
    <div v-if="stats" class="cbp-stats">
      <div class="cbp-stat">
        <span class="cbp-stat-value">{{ stats.totalAttempts }}</span>
        <span class="cbp-stat-label">总尝试</span>
      </div>
      <div class="cbp-stat">
        <span class="cbp-stat-value">{{ stats.successCount }}</span>
        <span class="cbp-stat-label">成功</span>
      </div>
      <div class="cbp-stat">
        <span class="cbp-stat-value">{{ Math.round(stats.successRate * 100) }}%</span>
        <span class="cbp-stat-label">成功率</span>
      </div>
      <div class="cbp-stat">
        <span class="cbp-stat-value">{{ stats.uniqueResults }}</span>
        <span class="cbp-stat-label">唯一产出</span>
      </div>
    </div>

    <!-- 结果 -->
    <div v-if="last" class="cbp-result" :class="{ fail: !last.success }">
      <span class="cbp-result-emoji">{{ last.success ? '🌸' : '🍂' }}</span>
      <div class="cbp-result-info">
        <span class="cbp-result-line">
          {{ last.success ? '杂交成功' : '杂交失败' }}：
          {{ last.success ? last.result : (last.mutation ?? '无收获') }}
        </span>
        <span class="cbp-result-meta">
          {{ flowerName(last.parentA) }} × {{ flowerName(last.parentB) }} · {{ shortTime(last.timestamp) }}
        </span>
      </div>
    </div>

    <!-- 配方列表 -->
    <div v-if="recipeList.length" class="cbp-recipes">
      <div v-for="r in recipeList" :key="r.id" class="cbp-recipe">
        <span class="cbp-recipe-icon">🌱</span>
        <div class="cbp-recipe-info">
          <span class="cbp-recipe-name">{{ flowerName(r.parentA) }} × {{ flowerName(r.parentB) }} → {{ flowerName(r.result) }}</span>
          <span class="cbp-recipe-desc">{{ r.description }}</span>
          <span class="cbp-recipe-meta">
            成功率 {{ Math.round(r.successRate * 100) }}%
            <span v-if="r.requiredSeason" class="cbp-recipe-tag">{{ SEASON_LABELS[r.requiredSeason].label }}限定</span>
            <span v-if="r.requiredEmotion" class="cbp-recipe-tag">{{ MOOD_LABELS[r.requiredEmotion] }}心境</span>
          </span>
        </div>
        <button class="cbp-btn cbp-btn--primary" @click="hybrid(r)">杂交</button>
      </div>
    </div>
    <p v-else class="cbp-empty">暂无杂交配方。</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCrossBreeding } from '../modules/emotion/flower-season'
import type { Season, CrossBreedRecipe, CrossBreedResult } from '../modules/emotion/flower-season'
import type { EmotionType } from '../modules/emotion/types'

const {
  recipes,
  results,
  initRecipes,
  performCrossBreed,
  getAvailableRecipes,
  getBreedStats,
} = useCrossBreeding()

onMounted(() => {
  initRecipes()
})

const season = ref<Season>('autumn')
const mood = ref<EmotionType>('calm')

const SEASON_LABELS: Record<Season, { label: string; emoji: string }> = {
  spring: { label: '春', emoji: '🌸' },
  summer: { label: '夏', emoji: '☀️' },
  autumn: { label: '秋', emoji: '🍂' },
  winter: { label: '冬', emoji: '❄️' },
}

const moods: Array<{ key: EmotionType; label: string }> = [
  { key: 'happy', label: '愉悦' },
  { key: 'calm', label: '平静' },
  { key: 'sad', label: '悲伤' },
  { key: 'angry', label: '愤怒' },
  { key: 'anxious', label: '焦虑' },
]

const MOOD_LABELS: Record<string, string> = {
  happy: '愉悦', calm: '平静', sad: '悲伤', angry: '愤怒', anxious: '焦虑',
}

const FLOWER_LABELS: Record<string, string> = {
  'joy-rose': '喜悦玫瑰', 'calm-lavender': '宁静薰衣草', 'serene-peony': '平和牡丹',
  'passion-tulip': '热情郁金香', 'hope-sunflower': '希望向日葵', 'vibrant-dahlia': '活力大丽花',
  'nostalgia-maple': '怀旧枫叶', 'calm-chrysanthemum': '平静菊花', 'reflective-cosmos': '沉思波斯菊',
  'peace-plum': '平和梅花', 'contemplation-camellia': '沉思山茶', 'tranquil-orchid': '清幽兰花',
  'joy-sakura': '喜悦樱花', 'hope-lily': '希望百合', 'radiant-lotus': '灿烂莲花',
  'passion-rose': '热情玫瑰', 'vitality-orchid': '活力兰花', 'fiery-amaryllis': '炽热朱顶红',
}

function flowerName(id: string): string {
  return FLOWER_LABELS[id] ?? id
}

const recipeList = computed<CrossBreedRecipe[]>(() => {
  if (!recipes.value.length) return []
  // 面板无花朵持有数据，采用配方全集父本并集作为“已拥有”花种以驱动季候过滤
  const owned = Array.from(new Set(recipes.value.flatMap(r => [r.parentA, r.parentB])))
  return getAvailableRecipes(owned, season.value)
})
const stats = computed(() => getBreedStats())
const last = computed<CrossBreedResult | null>(() => (results.value.length > 0 ? results.value[results.value.length - 1] : null))

function hybrid(r: CrossBreedRecipe): void {
  performCrossBreed(r.parentA, r.parentB, season.value, mood.value)
}

function shortTime(iso: string): string {
  return iso.slice(5, 16).replace('T', ' ')
}
</script>

<style scoped>
.cbp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--bg-panel, #1a1612);
}
.cbp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.cbp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.cbp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cbp-climate {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.cbp-climate-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cbp-climate-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cbp-chip {
  padding: 4px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 14px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.cbp-chip.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.cbp-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.cbp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.05);
  border: 1px solid rgba(240, 192, 64, 0.12);
  min-width: 68px;
}
.cbp-stat-value {
  font-size: 17px;
  font-weight: 600;
  color: #f0c040;
}
.cbp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cbp-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.08);
  border: 1px solid rgba(138, 154, 122, 0.25);
}
.cbp-result.fail {
  background: rgba(196, 106, 90, 0.08);
  border-color: rgba(196, 106, 90, 0.25);
}
.cbp-result-emoji {
  font-size: 22px;
}
.cbp-result-info {
  flex: 1;
  min-width: 0;
}
.cbp-result-line {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
}
.cbp-result-meta {
  display: block;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-top: 2px;
}
.cbp-recipes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cbp-recipe {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
}
.cbp-recipe-icon {
  font-size: 20px;
  flex-shrink: 0;
}
.cbp-recipe-info {
  flex: 1;
  min-width: 0;
}
.cbp-recipe-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
}
.cbp-recipe-desc {
  display: block;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-top: 2px;
}
.cbp-recipe-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-top: 4px;
  flex-wrap: wrap;
}
.cbp-recipe-tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(240, 192, 64, 0.1);
  color: rgba(240, 192, 64, 0.7);
}
.cbp-btn {
  padding: 5px 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.cbp-btn:hover {
  border-color: rgba(240, 192, 64, 0.4);
  color: #f0c040;
}
.cbp-btn--primary {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.cbp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  padding: 16px 0;
  text-align: center;
}
</style>