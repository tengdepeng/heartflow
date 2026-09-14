<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  listPoems,
  poemById,
  searchPoems,
  poemsByDynasty,
  poemsByTag,
  dynasties,
  tags,
  poemOfTheDay,
  randomPoem,
  usePoetryFavorites,
  type Poem,
} from '../modules/wisdom/poetry'

const fav = usePoetryFavorites()
const favoriteIds = computed(() => fav.favoriteIds.value)

const currentPoem = ref<Poem>(poemOfTheDay())
const searchQuery = ref('')
const dynastyFilter = ref('')
const tagFilter = ref('')
const showDetail = ref(false)

const dynastyOptions = computed(() => dynasties())
const tagOptions = computed(() => tags())

const searchResults = computed(() => {
  let list = listPoems()
  if (dynastyFilter.value) list = poemsByDynasty(dynastyFilter.value)
  if (tagFilter.value) list = poemsByTag(tagFilter.value)
  if (searchQuery.value.trim()) list = searchPoems(searchQuery.value)
  return list
})

const favoritePoems = computed(() =>
  favoriteIds.value
    .map((id) => poemById(id))
    .filter((p): p is Poem => !!p),
)

function showToday() {
  currentPoem.value = poemOfTheDay()
  showDetail.value = false
}

function showRandom() {
  currentPoem.value = randomPoem()
  showDetail.value = false
}

function selectPoem(p: Poem) {
  currentPoem.value = p
  showDetail.value = false
}

function toggleFav(id: string) {
  fav.toggleFavorite(id)
}

function isFav(id: string): boolean {
  return fav.isFavorite(id)
}
</script>

<template>
  <section class="pcp-panel" data-enter aria-label="诗词卡片">
    <header class="pcp-header">
      <h4 class="pcp-title">📜 诗词卡片</h4>
      <p class="pcp-subtitle">今日一诗 · 检索 · 收藏</p>
    </header>

    <!-- 今日一诗 / 当前展示 -->
    <div class="pcp-today">
      <div class="pcp-today-head">
        <span class="pcp-today-label">今日一诗</span>
        <button class="pcp-btn pcp-btn-mini" @click="showToday">今日</button>
        <button class="pcp-btn pcp-btn-mini" @click="showRandom">随机一首</button>
      </div>
      <div class="pcp-poem-card">
        <div class="pcp-poem-head">
          <div class="pcp-poem-id">
            <span class="pcp-poem-title">{{ currentPoem.title }}</span>
            <span class="pcp-poem-meta">{{ currentPoem.author }} · {{ currentPoem.dynasty }} · {{ currentPoem.form }}</span>
          </div>
          <button class="pcp-fav" :class="{ 'is-fav': isFav(currentPoem.id) }" @click="toggleFav(currentPoem.id)">
            {{ isFav(currentPoem.id) ? '♥ 已收藏' : '♡ 收藏' }}
          </button>
        </div>
        <div class="pcp-poem-lines">
          <p v-for="(line, i) in currentPoem.lines" :key="i" class="pcp-poem-line">{{ line }}</p>
        </div>
        <div class="pcp-poem-tags">
          <span v-for="t in currentPoem.tags" :key="t" class="pcp-tag">{{ t }}</span>
        </div>
        <button class="pcp-btn pcp-btn-mini pcp-detail-toggle" @click="showDetail = !showDetail">
          {{ showDetail ? '收起译文赏析' : '查看译文赏析' }}
        </button>
        <div v-if="showDetail" class="pcp-detail">
          <p v-if="currentPoem.translation" class="pcp-detail-item">
            <span class="pcp-detail-label">译文</span>{{ currentPoem.translation }}
          </p>
          <p v-if="currentPoem.appreciation" class="pcp-detail-item">
            <span class="pcp-detail-label">赏析</span>{{ currentPoem.appreciation }}
          </p>
        </div>
      </div>
    </div>

    <!-- 检索 -->
    <div class="pcp-search">
      <span class="pcp-block-label">检索</span>
      <input v-model="searchQuery" class="pcp-input" placeholder="篇名 / 作者 / 朝代 / 体裁 / 题材 / 正文…" />
      <div class="pcp-filter-row">
        <select v-model="dynastyFilter" class="pcp-select">
          <option value="">全部朝代</option>
          <option v-for="d in dynastyOptions" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-model="tagFilter" class="pcp-select">
          <option value="">全部题材</option>
          <option v-for="t in tagOptions" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div v-if="searchResults.length" class="pcp-results">
        <button
          v-for="p in searchResults"
          :key="p.id"
          class="pcp-result"
          :class="{ 'is-active': p.id === currentPoem.id }"
          @click="selectPoem(p)"
        >
          <span class="pcp-result-title">{{ p.title }}</span>
          <span class="pcp-result-meta">{{ p.author }} · {{ p.dynasty }}</span>
        </button>
      </div>
      <p v-else class="pcp-hint">没有匹配的诗词。</p>
    </div>

    <!-- 收藏 -->
    <div class="pcp-favs">
      <span class="pcp-block-label">我的收藏（{{ favoriteIds.length }}）</span>
      <div v-if="favoritePoems.length" class="pcp-fav-list">
        <button
          v-for="p in favoritePoems"
          :key="p.id"
          class="pcp-result"
          :class="{ 'is-active': p.id === currentPoem.id }"
          @click="selectPoem(p)"
        >
          <span class="pcp-result-title">{{ p.title }}</span>
          <span class="pcp-result-meta">{{ p.author }} · {{ p.dynasty }}</span>
        </button>
      </div>
      <p v-else class="pcp-hint">还没有收藏。遇到喜欢的诗，点「♡ 收藏」收进自己的诗单。</p>
    </div>
  </section>
</template>

<style scoped>
.pcp-panel {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.45);
}

.pcp-header {
  margin-bottom: 10px;
}

.pcp-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.pcp-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.pcp-today-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.pcp-today-label {
  flex: 1;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.pcp-poem-card {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  margin-bottom: 12px;
}

.pcp-poem-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.pcp-poem-id {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pcp-poem-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(var(--text-primary-rgb), 0.9);
}

.pcp-poem-meta {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.pcp-fav {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 999px;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.6);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.pcp-fav:hover {
  border-color: rgba(196, 106, 90, 0.4);
  color: #c46a5a;
}

.pcp-fav.is-fav {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.4);
  background: rgba(196, 106, 90, 0.08);
}

.pcp-poem-lines {
  margin-bottom: 8px;
}

.pcp-poem-line {
  margin: 0 0 4px;
  font-size: 14px;
  line-height: 1.8;
  color: rgba(var(--text-primary-rgb), 0.8);
}

.pcp-poem-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.pcp-tag {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(138, 154, 122, 0.14);
  border: 1px solid rgba(138, 154, 122, 0.25);
  font-size: 10px;
  color: #8a9a7a;
}

.pcp-btn {
  padding: 6px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.pcp-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.2);
}

.pcp-btn-mini {
  padding: 4px 10px;
  font-size: 11px;
}

.pcp-detail-toggle {
  margin-top: 2px;
}

.pcp-detail {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(var(--accent-rgb), 0.14);
}

.pcp-detail-item {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.65);
}

.pcp-detail-label {
  display: inline-block;
  margin-right: 6px;
  font-size: 11px;
  color: #d9a441;
  letter-spacing: 1px;
}

.pcp-block-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.pcp-search {
  margin-bottom: 12px;
}

.pcp-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.16);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.6);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 13px;
  font-family: inherit;
  margin-bottom: 8px;
}

.pcp-input:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.35);
}

.pcp-filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.pcp-select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.16);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.6);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 12px;
  font-family: inherit;
}

.pcp-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
}

.pcp-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.7);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.pcp-result:hover {
  background: rgba(var(--accent-rgb), 0.06);
}

.pcp-result.is-active {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.08);
}

.pcp-result-title {
  color: rgba(var(--text-primary-rgb), 0.85);
}

.pcp-result-meta {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.4);
  white-space: nowrap;
}

.pcp-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.pcp-fav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
