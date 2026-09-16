<template>
  <section class="poetry">
    <div class="poetry-head">
      <span class="poetry-title">🎴 诗词卡片</span>
      <span class="poetry-sub">诗词大全 / 国学大师 借鉴</span>
    </div>

    <!-- 今日一诗 / 当前诗词 -->
    <div class="poetry-card" v-if="current">
      <div class="poetry-card-head">
        <div class="poetry-card-meta">
          <span class="poetry-card-tag" v-if="isToday">{{ todayLabel }}</span>
          <span class="poetry-card-title">{{ current.title }}</span>
          <span class="poetry-card-author">{{ current.author }} · {{ current.dynasty }} · {{ current.form }}</span>
        </div>
        <button class="poetry-fav" :class="{ on: isFav(current.id) }" @click="toggleFav(current.id)">
          {{ isFav(current.id) ? '★ 已收藏' : '☆ 收藏' }}
        </button>
      </div>
      <div class="poetry-lines">
        <p v-for="(l, i) in current.lines" :key="i" class="poetry-line">{{ l }}</p>
      </div>
      <div v-if="current.translation" class="poetry-block">
        <span class="poetry-block-label">译文</span>
        <p class="poetry-block-text">{{ current.translation }}</p>
      </div>
      <div v-if="current.appreciation" class="poetry-block">
        <span class="poetry-block-label">赏析</span>
        <p class="poetry-block-text">{{ current.appreciation }}</p>
      </div>
    </div>

    <!-- 操作 -->
    <div class="poetry-actions">
      <button class="poetry-btn" @click="showToday">今日一诗</button>
      <button class="poetry-btn" @click="shuffle">随机一首</button>
    </div>

    <!-- 检索与筛选 -->
    <div class="poetry-filters">
      <input v-model="query" class="poetry-input" placeholder="搜索篇名 / 作者 / 朝代 / 题材 / 诗句…" />
      <select v-model="dynastyFilter" class="poetry-select">
        <option value="">全部朝代</option>
        <option v-for="d in dynastiesList" :key="d" :value="d">{{ d }}</option>
      </select>
      <select v-model="tagFilter" class="poetry-select">
        <option value="">全部题材</option>
        <option v-for="t in allTags" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>

    <!-- 诗词列表 -->
    <div v-if="filtered.length" class="poetry-list">
      <button
        v-for="p in filtered"
        :key="p.id"
        class="poetry-item"
        :class="{ sel: p.id === current?.id }"
        @click="open(p)"
      >
        <span class="poetry-item-title">{{ p.title }}</span>
        <span class="poetry-item-author">{{ p.author }} · {{ p.dynasty }}</span>
        <span class="poetry-item-tags">{{ p.tags.join(' / ') }}</span>
      </button>
    </div>
    <p v-else-if="query.trim() || dynastyFilter || tagFilter" class="poetry-empty">没有匹配的诗词。</p>

    <!-- 收藏列表 -->
    <div v-if="favorites.length" class="poetry-favs">
      <h4 class="poetry-subtitle">收藏的诗词</h4>
      <div class="poetry-fav-chips">
        <button v-for="p in favorites" :key="p.id" class="poetry-fav-chip" @click="open(p)">{{ p.title }}</button>
      </div>
    </div>

    <!-- 洞察 -->
    <ul v-if="insights.length" class="poetry-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  POEMS,
  poemById,
  searchPoems,
  dynasties,
  tags,
  poemOfTheDay,
  randomPoem,
  usePoetryFavorites,
  poetryInsights,
} from '../modules/wisdom/poetry'
import type { Poem } from '../modules/wisdom/poetry'

const current = ref<Poem>(poemOfTheDay())
const isToday = ref(true)

const query = ref('')
const dynastyFilter = ref('')
const tagFilter = ref('')

const allTags = tags()
const dynastiesList = dynasties()

const fav = usePoetryFavorites()
const favorites = computed(() =>
  fav.favoriteIds.value
    .map((id) => poemById(id))
    .filter((p): p is Poem => !!p),
)

const filtered = computed(() => {
  const q = query.value.trim()
  let list = q ? searchPoems(q) : POEMS
  if (dynastyFilter.value) list = list.filter((p) => p.dynasty === dynastyFilter.value)
  if (tagFilter.value) list = list.filter((p) => p.tags.includes(tagFilter.value))
  return list
})

const todayLabel = '今日一诗'
const insights = computed(() => poetryInsights())

function open(p: Poem) {
  current.value = p
  isToday.value = p.id === poemOfTheDay().id
}

function showToday() {
  current.value = poemOfTheDay()
  isToday.value = true
}

function shuffle() {
  current.value = randomPoem()
  isToday.value = false
}

function isFav(id: string): boolean {
  return fav.isFavorite(id)
}

function toggleFav(id: string) {
  fav.toggleFavorite(id)
}
</script>

<style scoped>
.poetry {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}
.poetry-head { margin-bottom: 14px; }
.poetry-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high); display: block; }
.poetry-sub { font-size: 11px; color: var(--text-faint); }

/* ---- 诗词卡片 ---- */
.poetry-card {
  margin-bottom: 12px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}
.poetry-card-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.poetry-card-meta { flex: 1; min-width: 0; }
.poetry-card-tag {
  display: inline-block;
  margin-bottom: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
  font-size: 10px;
}
.poetry-card-title { display: block; font-size: 20px; color: var(--text-high); margin-bottom: 4px; }
.poetry-card-author { font-size: 11px; color: var(--text-faint); }
.poetry-fav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: transparent;
  color: var(--text-dim);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;

  min-height: 26px;
}
.poetry-fav.on { background: rgba(var(--accent-rgb), 0.15); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.4); }

.poetry-lines { margin-bottom: 10px; }
.poetry-line {
  margin: 0 0 6px;
  font-size: 15px;
  line-height: 1.9;
  color: rgba(var(--text-primary-rgb), 0.9);
  letter-spacing: 1px;
}
.poetry-block { margin-bottom: 8px; }
.poetry-block-label {
  display: inline-block;
  margin-bottom: 3px;
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--accent);
}
.poetry-block-text { margin: 0; font-size: 12px; line-height: 1.8; color: var(--text-dim); }

/* ---- 操作 ---- */
.poetry-actions { display: flex; gap: 8px; margin-bottom: 12px; }
.poetry-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.poetry-btn:hover { background: rgba(var(--accent-rgb), 0.18); }

/* ---- 筛选 ---- */
.poetry-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.poetry-input {
  flex: 1;
  min-width: 160px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(0, 0, 0, 0.2);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.poetry-input:focus { border-color: rgba(var(--accent-rgb), 0.35); }
.poetry-select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(0, 0, 0, 0.2);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}

/* ---- 列表 ---- */
.poetry-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.poetry-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: rgba(0, 0, 0, 0.15);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 12px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.poetry-item:hover { border-color: rgba(var(--accent-rgb), 0.3); }
.poetry-item.sel { border-color: var(--accent); background: rgba(var(--accent-rgb), 0.1); }
.poetry-item-title { flex: 0 0 150px; color: var(--text-high); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.poetry-item-author { flex: 0 0 90px; color: var(--text-faint); font-size: 11px; }
.poetry-item-tags { flex: 1; min-width: 0; color: var(--text-dim); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.poetry-empty { margin: 0 0 12px; font-size: 11px; color: var(--text-faint); }

/* ---- 收藏 ---- */
.poetry-favs { margin-bottom: 12px; }
.poetry-subtitle { margin: 0 0 8px; font-size: 12px; color: var(--text-high); font-weight: 500; }
.poetry-fav-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.poetry-fav-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;

  min-height: 26px;
}
.poetry-fav-chip:hover { background: rgba(var(--accent-rgb), 0.16); }

/* ---- 洞察 ---- */
.poetry-insights { margin: 10px 0 0; padding-left: 18px; }
.poetry-insights li { font-size: 11px; color: var(--text-dim); line-height: 1.7; margin-bottom: 3px; }
</style>
