<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  listMeridians,
  meridianById,
  listAcupoints,
  acupointById,
  searchAcupoints,
  meridianClock,
  activeMeridianSlot,
  classicExcerpts,
  acupointSongs,
  useTcmFavorites,
  tcmInsights,
  type Acupoint,
} from '../modules/wisdom/tcm'

const fav = useTcmFavorites()
const favoriteIds = computed(() => fav.favoriteIds.value)

const meridians = listMeridians()
const acupoints = listAcupoints()
const excerpts = classicExcerpts()
const songs = acupointSongs()

const nowHour = ref(new Date().getHours())
const activeSlot = computed(() => activeMeridianSlot(nowHour.value))
const clockSlots = computed(() => meridianClock(nowHour.value))

const searchQuery = ref('')
const selectedMeridianId = ref('')
const selectedAcupointId = ref('')
const expandedMeridianId = ref('')

const searchResults = computed(() => {
  if (searchQuery.value.trim()) return searchAcupoints(searchQuery.value)
  if (selectedMeridianId.value) return listAcupoints(selectedMeridianId.value)
  return acupoints
})

const selectedAcupoint = computed<Acupoint | undefined>(() =>
  selectedAcupointId.value ? acupointById(selectedAcupointId.value) : undefined,
)

const favoriteAcupoints = computed(() =>
  favoriteIds.value
    .map((id) => acupointById(id))
    .filter((a): a is Acupoint => !!a),
)

const insights = computed(() => tcmInsights(nowHour.value))

function selectAcupoint(id: string) {
  selectedAcupointId.value = id
  const a = acupointById(id)
  if (a) selectedMeridianId.value = a.meridianId
}

function toggleFav(id: string) {
  fav.toggleFavorite(id)
}

function isFav(id: string): boolean {
  return fav.isFavorite(id)
}

function toggleMeridian(id: string) {
  expandedMeridianId.value = expandedMeridianId.value === id ? '' : id
}

function filterByMeridian(id: string) {
  selectedMeridianId.value = selectedMeridianId.value === id ? '' : id
  selectedAcupointId.value = ''
  searchQuery.value = ''
}

function fmtHour(h: number): string {
  const hh = ((h % 24) + 24) % 24
  return `${String(hh).padStart(2, '0')}:00`
}
</script>

<template>
  <section class="tcp-panel" data-enter aria-label="经络穴位典籍">
    <header class="tcp-header">
      <h4 class="tcp-title">🧘 经络穴位典籍</h4>
      <p class="tcp-subtitle">经络 · 穴位 · 子午流注</p>
    </header>

    <!-- 子午流注钟 -->
    <div class="tcp-clock">
      <span class="tcp-block-label">子午流注钟</span>
      <div v-if="activeSlot" class="tcp-clock-active">
        <span class="tcp-clock-period">{{ activeSlot.period }}</span>
        <span class="tcp-clock-meridian">{{ activeSlot.meridian.name }}</span>
        <span class="tcp-clock-hours">{{ fmtHour(activeSlot.start) }} – {{ fmtHour(activeSlot.end) }}</span>
      </div>
      <div class="tcp-clock-list">
        <span
          v-for="s in clockSlots"
          :key="s.meridian.id"
          class="tcp-clock-slot"
          :class="{ 'is-active': activeSlot && s.meridian.id === activeSlot.meridian.id }"
          :title="`${s.period} ${s.meridian.name}`"
        >{{ s.period }}</span>
      </div>
    </div>

    <!-- 温和洞察 -->
    <div class="tcp-insights">
      <span class="tcp-block-label">温和洞察</span>
      <p v-for="(line, i) in insights" :key="i" class="tcp-insight-line">{{ line }}</p>
    </div>

    <!-- 经络 -->
    <div class="tcp-meridians">
      <span class="tcp-block-label">经络（{{ meridians.length }}）</span>
      <div class="tcp-meridian-list">
        <div
          v-for="m in meridians"
          :key="m.id"
          class="tcp-meridian"
          :class="{ 'is-expanded': expandedMeridianId === m.id }"
        >
          <div class="tcp-meridian-head" @click="toggleMeridian(m.id)">
            <span class="tcp-meridian-name">{{ m.name }}</span>
            <span class="tcp-meridian-meta">{{ m.code }} · {{ m.polarity }} · {{ m.element }}<template v-if="m.period !== '—'"> · {{ m.period }}</template></span>
            <span class="tcp-meridian-toggle">{{ expandedMeridianId === m.id ? '▾' : '▸' }}</span>
          </div>
          <div v-if="expandedMeridianId === m.id" class="tcp-meridian-detail">
            <p class="tcp-meridian-path"><span class="tcp-detail-label">循行</span>{{ m.path }}</p>
            <p class="tcp-meridian-ind"><span class="tcp-detail-label">主治</span>{{ m.indications }}</p>
            <button class="tcp-btn tcp-btn-mini" @click="filterByMeridian(m.id)">查看本经穴位（{{ listAcupoints(m.id).length }}）</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 穴位检索 -->
    <div class="tcp-search">
      <span class="tcp-block-label">穴位（{{ searchResults.length }}）</span>
      <input v-model="searchQuery" class="tcp-input" placeholder="穴名 / 拼音 / 代码 / 经络 / 主治…" />
      <div class="tcp-results">
        <button
          v-for="a in searchResults"
          :key="a.id"
          class="tcp-result"
          :class="{ 'is-active': a.id === selectedAcupointId }"
          @click="selectAcupoint(a.id)"
        >
          <span class="tcp-result-name">{{ a.name }}</span>
          <span class="tcp-result-meta">{{ a.code }} · {{ meridianById(a.meridianId)?.name }}</span>
          <span class="tcp-result-fav" :class="{ 'is-fav': isFav(a.id) }">{{ isFav(a.id) ? '♥' : '♡' }}</span>
        </button>
      </div>
      <p v-if="!searchResults.length" class="tcp-hint">没有匹配的穴位。</p>
    </div>

    <!-- 穴位详情 -->
    <div v-if="selectedAcupoint" class="tcp-detail">
      <div class="tcp-detail-head">
        <div class="tcp-detail-id">
          <span class="tcp-detail-name">{{ selectedAcupoint.name }}</span>
          <span class="tcp-detail-meta">{{ selectedAcupoint.code }} · {{ selectedAcupoint.pinyin }} · {{ meridianById(selectedAcupoint.meridianId)?.name }}</span>
        </div>
        <button class="tcp-fav" :class="{ 'is-fav': isFav(selectedAcupoint.id) }" @click="toggleFav(selectedAcupoint.id)">
          {{ isFav(selectedAcupoint.id) ? '♥ 已收藏' : '♡ 收藏' }}
        </button>
      </div>
      <p class="tcp-detail-item"><span class="tcp-detail-label">定位</span>{{ selectedAcupoint.location }}</p>
      <p class="tcp-detail-item"><span class="tcp-detail-label">主治</span>{{ selectedAcupoint.indications }}</p>
      <p v-if="selectedAcupoint.classic" class="tcp-detail-item">
        <span class="tcp-detail-label">{{ selectedAcupoint.classic.source }}</span>{{ selectedAcupoint.classic.text }}
      </p>
    </div>

    <!-- 收藏 -->
    <div class="tcp-favs">
      <span class="tcp-block-label">我的收藏（{{ favoriteIds.length }}）</span>
      <div v-if="favoriteAcupoints.length" class="tcp-fav-list">
        <button
          v-for="a in favoriteAcupoints"
          :key="a.id"
          class="tcp-result"
          :class="{ 'is-active': a.id === selectedAcupointId }"
          @click="selectAcupoint(a.id)"
        >
          <span class="tcp-result-name">{{ a.name }}</span>
          <span class="tcp-result-meta">{{ a.code }} · {{ meridianById(a.meridianId)?.name }}</span>
        </button>
      </div>
      <p v-else class="tcp-hint">还没有收藏。遇到想记住的穴位，点「♡ 收藏」收进自己的穴位册。</p>
    </div>

    <!-- 经典原文对照 -->
    <div class="tcp-excerpts">
      <span class="tcp-block-label">经典原文对照</span>
      <div v-for="e in excerpts" :key="e.id" class="tcp-excerpt">
        <p class="tcp-excerpt-head">{{ e.book }} · {{ e.chapter }}</p>
        <p class="tcp-excerpt-original">{{ e.original }}</p>
        <p class="tcp-excerpt-vernacular">{{ e.vernacular }}</p>
      </div>
    </div>

    <!-- 穴位歌诀 -->
    <div class="tcp-songs">
      <span class="tcp-block-label">穴位歌诀</span>
      <div v-for="s in songs" :key="s.id" class="tcp-song">
        <p class="tcp-song-title">{{ s.title }}</p>
        <p class="tcp-song-content">{{ s.content }}</p>
        <p class="tcp-song-note">{{ s.note }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tcp-panel {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.45);
}

.tcp-header {
  margin-bottom: 10px;
}

.tcp-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.tcp-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.tcp-block-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.tcp-clock {
  margin-bottom: 12px;
}

.tcp-clock-active {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(138, 154, 122, 0.12);
  border: 1px solid rgba(138, 154, 122, 0.25);
  margin-bottom: 8px;
}

.tcp-clock-period {
  font-size: 14px;
  font-weight: 600;
  color: #8a9a7a;
}

.tcp-clock-meridian {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.85);
}

.tcp-clock-hours {
  margin-left: auto;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.tcp-clock-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tcp-clock-slot {
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--bg-card-rgb), 0.4);
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.55);
}

.tcp-clock-slot.is-active {
  border-color: rgba(138, 154, 122, 0.45);
  background: rgba(138, 154, 122, 0.16);
  color: #8a9a7a;
  font-weight: 600;
}

.tcp-insights {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(217, 164, 65, 0.06);
  border: 1px solid rgba(217, 164, 65, 0.18);
}

.tcp-insight-line {
  margin: 0 0 4px;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.65);
}

.tcp-insight-line:last-child {
  margin-bottom: 0;
}

.tcp-meridians {
  margin-bottom: 12px;
}

.tcp-meridian-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tcp-meridian {
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.4);
}

.tcp-meridian-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
}

.tcp-meridian-name {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.85);
}

.tcp-meridian-meta {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.tcp-meridian-toggle {
  margin-left: auto;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.tcp-meridian-detail {
  padding: 0 10px 10px;
  border-top: 1px dashed rgba(var(--accent-rgb), 0.12);
}

.tcp-meridian-path,
.tcp-meridian-ind {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.65);
}

.tcp-detail-label {
  display: inline-block;
  margin-right: 6px;
  font-size: 11px;
  color: #d9a441;
  letter-spacing: 1px;
}

.tcp-btn {
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

.tcp-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.2);
}

.tcp-btn-mini {
  padding: 4px 10px;
  font-size: 11px;
  margin-top: 8px;
}

.tcp-search {
  margin-bottom: 12px;
}

.tcp-input {
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

.tcp-input:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.35);
}

.tcp-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
}

.tcp-result {
  display: flex;
  align-items: center;
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

.tcp-result:hover {
  background: rgba(var(--accent-rgb), 0.06);
}

.tcp-result.is-active {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.08);
}

.tcp-result-name {
  color: rgba(var(--text-primary-rgb), 0.85);
}

.tcp-result-meta {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.tcp-result-fav {
  margin-left: auto;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.35);
}

.tcp-result-fav.is-fav {
  color: #c46a5a;
}

.tcp-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.tcp-detail {
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.tcp-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.tcp-detail-id {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tcp-detail-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(var(--text-primary-rgb), 0.9);
}

.tcp-detail-meta {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.tcp-fav {
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

.tcp-fav:hover {
  border-color: rgba(196, 106, 90, 0.4);
  color: #c46a5a;
}

.tcp-fav.is-fav {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.4);
  background: rgba(196, 106, 90, 0.08);
}

.tcp-detail-item {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.65);
}

.tcp-detail-item:last-child {
  margin-bottom: 0;
}

.tcp-favs {
  margin-bottom: 12px;
}

.tcp-fav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tcp-excerpts {
  margin-bottom: 12px;
}

.tcp-excerpt {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.4);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  margin-bottom: 6px;
}

.tcp-excerpt-head {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: #d9a441;
}

.tcp-excerpt-original {
  margin: 0 0 4px;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.75);
}

.tcp-excerpt-vernacular {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.tcp-songs {
  margin-bottom: 4px;
}

.tcp-song {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(138, 154, 122, 0.08);
  border: 1px solid rgba(138, 154, 122, 0.18);
  margin-bottom: 6px;
}

.tcp-song-title {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  color: #8a9a7a;
}

.tcp-song-content {
  margin: 0 0 4px;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.8);
}

.tcp-song-note {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(var(--text-primary-rgb), 0.45);
}
</style>
