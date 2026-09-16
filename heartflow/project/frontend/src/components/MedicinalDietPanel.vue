<template>
  <section class="md">
    <div class="md-head">
      <span class="md-title">🍲 药膳食谱</span>
      <span class="md-sub">知源中医「药膳食谱」借鉴 · 药食同源 · 食养非治疗</span>
    </div>

    <!-- ===== 今日药膳 ===== -->
    <div class="md-today">
      <div class="md-today-head">
        <span class="md-today-label">今日药膳</span>
        <button class="md-mini-btn" @click="shuffleToday">换一道</button>
      </div>
      <div class="md-today-body">
        <span class="md-today-name">{{ today.name }}</span>
        <span class="md-today-effect" :style="{ color: effectColor(today.effect) }">
          {{ RECIPE_EFFECT_META[today.effect].icon }} {{ today.effect }}
        </span>
      </div>
      <p class="md-today-desc">{{ today.description }}</p>
      <div class="md-today-tags">
        <span v-for="c in today.constitutions" :key="c" class="md-tag">{{ c }}</span>
        <span v-for="s in today.solarTerms.slice(0, 3)" :key="s" class="md-tag md-tag--term">{{ s }}</span>
      </div>
    </div>

    <!-- ===== 功效筛选 ===== -->
    <div class="md-card">
      <div class="md-card-head">
        <span class="md-card-title">🔍 检索药膳</span>
      </div>
      <input
        v-model="keyword"
        class="md-search"
        type="text"
        placeholder="搜索名称 / 功效 / 体质 / 节气 / 食材…"
      />
      <div class="md-effects">
        <button
          class="md-effect"
          :class="{ on: activeEffect === null }"
          @click="activeEffect = null"
        >全部</button>
        <button
          v-for="e in effectList"
          :key="e"
          class="md-effect"
          :class="{ on: activeEffect === e }"
          @click="activeEffect = e"
        >{{ RECIPE_EFFECT_META[e].icon }} {{ e }}</button>
      </div>
    </div>

    <!-- ===== 食谱列表 ===== -->
    <div class="md-card">
      <div class="md-card-head">
        <span class="md-card-title">📖 食谱（{{ filteredRecipes.length }}）</span>
      </div>
      <div v-for="r in filteredRecipes" :key="r.id" class="md-recipe">
        <div class="md-recipe-head" @click="toggleOpen(r.id)">
          <div class="md-recipe-info">
            <span class="md-recipe-name">{{ r.name }}</span>
            <span class="md-recipe-effect" :style="{ color: effectColor(r.effect) }">
              {{ RECIPE_EFFECT_META[r.effect].icon }} {{ r.effect }}
            </span>
          </div>
          <div class="md-recipe-meta">
            <span class="md-diff">{{ '●'.repeat(r.difficulty) }}{{ '○'.repeat(3 - r.difficulty) }}</span>
            <button class="md-fav" :class="{ on: isFav(r.id) }" @click.stop="toggleFav(r.id)">
              {{ isFav(r.id) ? '♥' : '♡' }}
            </button>
            <span class="md-arrow">{{ openId === r.id ? '▾' : '▸' }}</span>
          </div>
        </div>
        <div v-if="openId === r.id" class="md-recipe-detail">
          <p class="md-recipe-desc">{{ r.description }}</p>
          <div class="md-detail-block">
            <h5 class="md-detail-title">食材</h5>
            <div class="md-ingredients">
              <span v-for="(i, idx) in r.ingredients" :key="idx" class="md-ingredient">{{ i }}</span>
            </div>
          </div>
          <div class="md-detail-block">
            <h5 class="md-detail-title">做法</h5>
            <ol class="md-steps">
              <li v-for="(s, idx) in r.steps" :key="idx">{{ s }}</li>
            </ol>
          </div>
          <div class="md-detail-row">
            <span class="md-detail-label">频率</span>
            <span class="md-detail-value">{{ r.frequency }}</span>
          </div>
          <div class="md-detail-row md-detail-row--taboo">
            <span class="md-detail-label">禁忌</span>
            <span class="md-detail-value">{{ r.taboo }}</span>
          </div>
        </div>
      </div>
      <p v-if="filteredRecipes.length === 0" class="md-empty">未找到匹配的药膳</p>
    </div>

    <!-- ===== 收藏 ===== -->
    <div v-if="favoriteRecipes.length" class="md-card">
      <div class="md-card-head">
        <span class="md-card-title">♥ 我的收藏（{{ favoriteRecipes.length }}）</span>
      </div>
      <div v-for="r in favoriteRecipes" :key="r.id" class="md-fav-row">
        <span class="md-fav-name">{{ r.name }}</span>
        <span class="md-fav-effect" :style="{ color: effectColor(r.effect) }">{{ r.effect }}</span>
        <button class="md-fav" :class="{ on: true }" @click="toggleFav(r.id)">♥</button>
      </div>
    </div>

    <!-- ===== 功效统计 ===== -->
    <div class="md-card">
      <div class="md-card-head">
        <span class="md-card-title">📊 功效分布</span>
      </div>
      <div v-for="s in stats" :key="s.effect" class="md-stat-row">
        <span class="md-stat-label">{{ RECIPE_EFFECT_META[s.effect].icon }} {{ s.effect }}</span>
        <div class="md-stat-bar">
          <div class="md-stat-fill" :style="{ width: statWidth(s.count) + '%' }"></div>
        </div>
        <span class="md-stat-count">{{ s.count }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  RECIPE_EFFECT_META,
  searchRecipes,
  recipesByEffect,
  recipeOfTheDay,
  effectStats,
  getMedicinalDietStore,
} from '../modules/body-wisdom/medicinal-diet'
import type { RecipeEffect } from '../modules/body-wisdom/medicinal-diet'

const store = getMedicinalDietStore()

const today = ref(recipeOfTheDay(new Date()))
const keyword = ref('')
const activeEffect = ref<RecipeEffect | null>(null)
const openId = ref<string | null>(null)

const effectList = Object.keys(RECIPE_EFFECT_META) as RecipeEffect[]
const stats = effectStats()

const filteredRecipes = computed(() => {
  const byEffect = recipesByEffect(activeEffect.value)
  const searched = keyword.value ? searchRecipes(keyword.value) : byEffect
  return byEffect.filter(r => searched.some(s => s.id === r.id))
})

const favoriteRecipes = computed(() => store.favoriteRecipes.value)

function effectColor(e: RecipeEffect): string {
  return RECIPE_EFFECT_META[e].color
}

function statWidth(count: number): number {
  const max = Math.max(...stats.map(s => s.count))
  return Math.round((count / max) * 100)
}

function shuffleToday(): void {
  today.value = recipeOfTheDay(new Date(Date.now() + Math.floor(Math.random() * 86400000)))
}

function toggleOpen(id: string): void {
  openId.value = openId.value === id ? null : id
}

function isFav(id: string): boolean {
  return store.isFavorite(id)
}

function toggleFav(id: string): void {
  store.toggleFavorite(id)
}
</script>

<style scoped>
.md {
  margin-bottom: 56px;
  position: relative;
  z-index: 1;
}

.md-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.md-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
  letter-spacing: 0.5px;
}
.md-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

/* ---- 今日药膳 ---- */
.md-today {
  margin-bottom: 14px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.5), rgba(26, 22, 18, 0.7));
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--accent);
}
.md-today-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.md-today-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 1px;
}
.md-mini-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  font-size: 10px;
  font-family: inherit;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  cursor: pointer;

  min-height: 26px;
}
.md-mini-btn:hover {
  background: rgba(var(--accent-rgb), 0.2);
}
.md-today-body {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.md-today-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
}
.md-today-effect {
  font-size: 12px;
  font-weight: 500;
}
.md-today-desc {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.md-today-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.md-tag {
  padding: 3px 8px;
  font-size: 10px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  color: var(--text-secondary);
}
.md-tag--term {
  background: rgba(138, 154, 122, 0.08);
  border-color: rgba(138, 154, 122, 0.2);
}

/* ---- 卡片 ---- */
.md-card {
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
}
.md-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.md-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.md-search {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 10px;
  padding: 9px 12px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text-primary);
  background: rgba(var(--bg-card-rgb), 0.4);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  outline: none;
  transition: border-color var(--transition);
}
.md-search:focus {
  border-color: rgba(var(--accent-rgb), 0.4);
}

.md-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.md-effect {
  padding: 5px 10px;
  font-size: 11px;
  font-family: inherit;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: rgba(var(--bg-card-rgb), 0.3);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}
.md-effect:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
}
.md-effect.on {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.4);
  color: var(--accent);
}

/* ---- 食谱列表 ---- */
.md-recipe {
  border-bottom: 1px solid var(--border-color);
}
.md-recipe:last-child {
  border-bottom: none;
}
.md-recipe-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  cursor: pointer;
}
.md-recipe-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.md-recipe-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
.md-recipe-effect {
  font-size: 11px;
}
.md-recipe-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.md-diff {
  font-size: 9px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}
.md-fav {
  padding: 0;
  font-size: 14px;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--transition);
}
.md-fav.on {
  color: #c46a5a;
}
.md-arrow {
  font-size: 11px;
  color: var(--text-secondary);
}

.md-recipe-detail {
  padding: 0 0 12px;
}
.md-recipe-desc {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.md-detail-block {
  margin-bottom: 10px;
}
.md-detail-title {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 1px;
}
.md-ingredients {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.md-ingredient {
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  color: var(--text-secondary);
}
.md-steps {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.md-steps li {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.md-detail-row {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
}
.md-detail-row--taboo {
  border-top: 1px dashed var(--border-color);
  margin-top: 4px;
  padding-top: 8px;
}
.md-detail-label {
  flex-shrink: 0;
  font-weight: 500;
  color: var(--text-primary);
}
.md-detail-value {
  color: var(--text-secondary);
  line-height: 1.6;
}
.md-detail-row--taboo .md-detail-value {
  color: #c46a5a;
}
.md-empty {
  margin: 0;
  padding: 16px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ---- 收藏 ---- */
.md-fav-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 12px;
}
.md-fav-name {
  flex: 1;
  color: var(--text-primary);
}
.md-fav-effect {
  font-size: 11px;
}

/* ---- 功效统计 ---- */
.md-stat-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}
.md-stat-label {
  width: 72px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-secondary);
}
.md-stat-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}
.md-stat-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.4), var(--accent));
  transition: width var(--transition);
}
.md-stat-count {
  width: 20px;
  text-align: right;
  font-size: 11px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
