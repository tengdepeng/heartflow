<template>
  <section class="mdp" aria-label="药膳食谱">
    <div class="mdp-head">
      <span class="mdp-title">🍲 药膳食谱</span>
      <span class="mdp-sub">药膳库 · 功效检索 · 收藏 · 今日药膳</span>
    </div>

    <!-- 今日药膳 -->
    <div class="mdp-block">
      <span class="mdp-block-label">今日药膳</span>
      <div class="mdp-today">
        <div class="mdp-today-head">
          <strong class="mdp-today-name">{{ today.name }}</strong>
          <span class="mdp-effect-chip">{{ effectMeta[today.effect].icon }} {{ today.effect }}</span>
          <button class="mdp-fav-btn" @click="toggleFav(today.id)">
            {{ isFav(today.id) ? '★ 已收藏' : '☆ 收藏' }}
          </button>
        </div>
        <p class="mdp-today-desc">{{ today.description }}</p>
        <span class="mdp-today-meta">难度 {{ '●'.repeat(today.difficulty) }} · {{ today.frequency }}</span>
      </div>
    </div>

    <!-- 药膳库 -->
    <div class="mdp-block">
      <span class="mdp-block-label">药膳库 · {{ filtered.length }}</span>
      <div class="mdp-search-row">
        <input v-model="keyword" class="mdp-input" placeholder="搜索名称 / 功效 / 食材…" />
        <select v-model="effectFilter" class="mdp-select">
          <option value="">全部功效</option>
          <option v-for="(meta, e) in effectMeta" :key="e" :value="e">{{ meta.icon }} {{ e }}</option>
        </select>
        <!-- INCR-452：接线 recipesByConstitution（按体质筛选，此前引擎已实现却零 UI 消费） -->
        <select v-model="constitutionFilter" class="mdp-select">
          <option value="">全部体质</option>
          <option v-for="c in allConstitutions" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="mdp-recipe-list">
        <div v-for="r in filtered" :key="r.id" class="mdp-recipe" :class="{ open: expanded === r.id }">
          <div class="mdp-recipe-head" @click="toggleExpand(r.id)">
            <strong class="mdp-recipe-name">{{ r.name }}</strong>
            <span class="mdp-effect-chip">{{ effectMeta[r.effect].icon }} {{ r.effect }}</span>
            <button class="mdp-fav-btn" @click.stop="toggleFav(r.id)">{{ isFav(r.id) ? '★' : '☆' }}</button>
          </div>
          <p class="mdp-recipe-desc">{{ r.description }}</p>
          <div v-if="expanded === r.id" class="mdp-recipe-detail">
            <div class="mdp-detail-row"><strong>食材</strong><span>{{ r.ingredients.join('、') }}</span></div>
            <div class="mdp-detail-row"><strong>做法</strong><ol class="mdp-steps"><li v-for="s in r.steps" :key="s">{{ s }}</li></ol></div>
            <div class="mdp-detail-row"><strong>频率</strong><span>{{ r.frequency }}</span></div>
            <div class="mdp-detail-row"><strong>禁忌</strong><span>{{ r.taboo }}</span></div>
            <div class="mdp-detail-row"><strong>适用体质</strong><span>{{ r.constitutions.join('、') }}</span></div>
            <div class="mdp-detail-row"><strong>适用节气</strong><span>{{ r.solarTerms.join('、') }}</span></div>
          </div>
        </div>
      </div>
      <p v-if="!filtered.length" class="mdp-empty">没有匹配的药膳。</p>
    </div>

    <!-- 我的收藏 -->
    <div class="mdp-block">
      <span class="mdp-block-label">我的收藏 · {{ favoriteRecipes.length }}</span>
      <div v-if="favoriteRecipes.length" class="mdp-fav-list">
        <div v-for="r in favoriteRecipes" :key="r.id" class="mdp-fav">
          <span class="mdp-fav-name">{{ r.name }}</span>
          <span class="mdp-effect-chip">{{ effectMeta[r.effect].icon }} {{ r.effect }}</span>
          <button class="mdp-fav-btn" @click="toggleFav(r.id)">✕</button>
        </div>
      </div>
      <p v-else class="mdp-empty">还没有收藏的药膳，点击 ☆ 收藏喜欢的食谱。</p>
    </div>

    <!-- 功效分布 -->
    <div class="mdp-block">
      <span class="mdp-block-label">功效分布</span>
      <div class="mdp-stats">
        <div v-for="s in effectStatsList" :key="s.effect" class="mdp-stat">
          <span class="mdp-stat-icon">{{ effectMeta[s.effect].icon }}</span>
          <span class="mdp-stat-label">{{ s.effect }}</span>
          <span class="mdp-stat-count">{{ s.count }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getMedicinalDietStore } from '../../modules/body-wisdom/medicinal-diet'
import {
  RECIPE_EFFECT_META,
  recipeOfTheDay,
  searchRecipes,
  recipesByEffect,
  recipesByConstitution,
  effectStats,
  MEDICINAL_RECIPES,
} from '../../modules/body-wisdom/medicinal-diet'
import type { RecipeEffect } from '../../modules/body-wisdom/medicinal-diet'

const store = getMedicinalDietStore()
const today = recipeOfTheDay()
const effectMeta = RECIPE_EFFECT_META

const keyword = ref('')
const effectFilter = ref<RecipeEffect | ''>('')
/** INCR-452：体质筛选（体质清单取自食谱的 constitutions 并集，非硬编码） */
const constitutionFilter = ref('')
const expanded = ref('')

/** 全部可选体质 = MEDICINAL_RECIPES 中 constitutions 的去重并集 */
const allConstitutions = computed(() => {
  const set = new Set<string>()
  for (const r of MEDICINAL_RECIPES) for (const c of r.constitutions) set.add(c)
  return [...set].sort((a, b) => a.localeCompare(b, 'zh'))
})

const filtered = computed(() => {
  let list = searchRecipes(keyword.value)
  if (effectFilter.value) list = recipesByEffect(effectFilter.value)
  if (constitutionFilter.value) list = recipesByConstitution(constitutionFilter.value).filter(r => list.includes(r))
  return list
})

const favoriteRecipes = computed(() => store.favoriteRecipes.value)
const effectStatsList = computed(() => effectStats())

function isFav(id: string): boolean {
  return store.isFavorite(id)
}

function toggleFav(id: string) {
  store.toggleFavorite(id)
}

function toggleExpand(id: string) {
  expanded.value = expanded.value === id ? '' : id
}
</script>

<style scoped>
.mdp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border, rgba(120, 140, 120, 0.25));
  border-radius: 12px;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
}
.mdp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mdp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #e8ece4);
}
.mdp-sub {
  font-size: 12px;
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
}
.mdp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.mdp-block-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent, #d4a574);
}
.mdp-today {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(138, 154, 122, 0.08);
}
.mdp-today-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mdp-today-name {
  font-size: 14px;
  color: var(--text, #e8ece4);
  flex: 1;
}
.mdp-today-desc {
  font-size: 12px;
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
  margin: 0;
}
.mdp-today-meta {
  font-size: 11px;
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
}
.mdp-effect-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.15);
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
  white-space: nowrap;
}
.mdp-fav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  border: none;
  background: transparent;
  color: var(--accent, #d4a574);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;

  min-height: 26px;
}
.mdp-search-row {
  display: flex;
  gap: 8px;
}
.mdp-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid rgba(120, 140, 120, 0.25);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text, #e8ece4);
  font-size: 12px;
}
.mdp-select {
  padding: 6px 8px;
  border: 1px solid rgba(120, 140, 120, 0.25);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text, #e8ece4);
  font-size: 12px;
}
.mdp-recipe-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mdp-recipe {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.mdp-recipe-head {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.mdp-recipe-name {
  font-size: 13px;
  color: var(--text, #e8ece4);
  flex: 1;
}
.mdp-recipe-desc {
  font-size: 12px;
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
  margin: 0;
}
.mdp-recipe-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px solid rgba(120, 140, 120, 0.15);
}
.mdp-detail-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
}
.mdp-detail-row strong {
  color: var(--accent, #d4a574);
  min-width: 52px;
}
.mdp-detail-row span {
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
}
.mdp-steps {
  margin: 0;
  padding-left: 18px;
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
}
.mdp-empty {
  font-size: 12px;
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
  margin: 0;
}
.mdp-fav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mdp-fav {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.mdp-fav-name {
  color: var(--text, #e8ece4);
  flex: 1;
}
.mdp-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mdp-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
}
.mdp-stat-icon {
  font-size: 13px;
}
.mdp-stat-label {
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
}
.mdp-stat-count {
  color: var(--accent, #d4a574);
  font-weight: 600;
}
</style>
