<template>
  <section class="ajr" data-test="anchor-journal-retro-panel" aria-label="逐日心锚·手札回溯">
    <header class="ajr-head">
      <span class="ajr-title">📔 手札回溯</span>
      <span class="ajr-badge" data-test="ajr-badge">共 {{ journals.length }} 篇</span>
    </header>

    <!-- 那年今日 -->
    <div class="ajr-card" data-test="ajr-this-day">
      <span class="ajr-card-t">📅 那年今日</span>
      <div v-if="thisDayItems.length" class="ajr-list">
        <div v-for="j in thisDayItems" :key="j.anchorId + j.createdAt" class="ajr-item">
          <span class="ajr-item-title">{{ j.title || '无题' }}</span>
          <span class="ajr-item-date">{{ journalDateKey(j.createdAt) }}</span>
          <span v-if="j.mood" class="ajr-item-mood">{{ j.mood }}</span>
        </div>
      </div>
      <p v-else class="ajr-empty">往年今日还没有留下手札。让今天成为被未来回望的一天。</p>
    </div>

    <!-- 心情统计 -->
    <div v-if="moodEntries.length" class="ajr-card" data-test="ajr-moods">
      <span class="ajr-card-t">🎭 心情分布</span>
      <div v-for="[mood, count] in moodEntries" :key="mood" class="ajr-mood-row">
        <span class="ajr-mood-label">{{ mood }}</span>
        <div class="ajr-mood-bar">
          <div class="ajr-mood-seg" :style="{ width: moodPct(count) }"></div>
        </div>
        <span class="ajr-mood-count">{{ count }}</span>
      </div>
    </div>

    <!-- 组合检索 -->
    <div v-if="journals.length" class="ajr-card" data-test="ajr-search">
      <span class="ajr-card-t">🔍 组合检索</span>
      <div class="ajr-search-row">
        <input
          v-model="keyword"
          class="ajr-input"
          type="text"
          placeholder="关键词（标题或内容）"
          data-test="ajr-keyword"
        />
        <select v-model="mood" class="ajr-input ajr-select" data-test="ajr-mood">
          <option value="">全部心情</option>
          <option v-for="m in moodOptions" :key="m" :value="m">{{ m }}</option>
        </select>
        <input v-model="dateFrom" class="ajr-input ajr-date" type="date" data-test="ajr-from" />
        <span class="ajr-date-sep">至</span>
        <input v-model="dateTo" class="ajr-input ajr-date" type="date" data-test="ajr-to" />
      </div>
      <div class="ajr-list">
        <div v-for="j in searched" :key="j.anchorId + j.createdAt" class="ajr-item">
          <span class="ajr-item-title">{{ j.title || '无题' }}</span>
          <span class="ajr-item-date">{{ journalDateKey(j.createdAt) }}</span>
          <span v-if="j.mood" class="ajr-item-mood">{{ j.mood }}</span>
        </div>
        <p v-if="!searched.length" class="ajr-empty">没有匹配的手札。</p>
      </div>
    </div>

    <!-- 照片手札：照片日记回流的视觉碎片 -->
    <div v-if="photoJournals.length" class="ajr-card" data-test="ajr-photos">
      <span class="ajr-card-t">🖼️ 照片手札</span>
      <div class="ajr-photo-grid">
        <figure
          v-for="j in photoJournals"
          :key="j.anchorId + j.createdAt"
          class="ajr-photo-fig"
        >
          <img
            v-if="thumbOf(j)"
            :src="thumbOf(j)"
            class="ajr-photo"
            :alt="j.content"
            data-test="ajr-photo"
            @click="openPhoto(fullOf(j))"
          />
          <figcaption class="ajr-photo-cap">{{ j.content }}</figcaption>
        </figure>
      </div>
    </div>

    <!-- 书写脚手架 -->
    <div class="ajr-card" data-test="ajr-templates">
      <span class="ajr-card-t">🧩 书写脚手架</span>
      <div class="ajr-tpl-grid">
        <div v-for="t in JOURNAL_TEMPLATES" :key="t.id" class="ajr-tpl" :data-test="`ajr-tpl-${t.id}`">
          <span class="ajr-tpl-icon">{{ t.icon }}</span>
          <div class="ajr-tpl-body">
            <strong class="ajr-tpl-name">{{ journalTemplateName(t.id) }}</strong>
            <span class="ajr-tpl-hint">{{ t.hint }}</span>
            <code v-if="t.scaffold" class="ajr-tpl-scaffold">{{ t.scaffold }}</code>
          </div>
        </div>
      </div>
      <p v-if="journals.length === 0" class="ajr-empty">还没有手札。从上面的脚手架开始写下第一篇吧。</p>
    </div>
    <!-- 照片手札大图 -->
    <Teleport to="body">
      <div v-if="photoViewer.open" class="ajr-photo-viewer" @click="closePhoto">
        <img :src="photoViewer.src" class="ajr-photo-viewer-img" alt="照片手札" @click.stop />
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  filterJournals,
  journalMoodStats,
  journalsOnThisDay,
  journalDateKey,
} from '../modules/anchor/anchor-journals'
import type { AnchorJournal } from '../modules/anchor/anchor-journals'
import { usePhotoDiary } from '../modules/anchor/photo-diary'
import {
  JOURNAL_TEMPLATES,
  journalTemplateName,
} from '../modules/anchor/anchor-journal-templates'

const props = defineProps<{
  journals: AnchorJournal[]
}>()

// ---- 照片手札：从照片日记取缩略图/原图回显 ----
const diary = usePhotoDiary()
diary.load()
const photoJournals = computed(() =>
  props.journals.filter(j => Array.isArray(j.photoRef) && j.photoRef.length > 0),
)
function thumbOf(j: AnchorJournal): string {
  const ref = j.photoRef![0]
  const entry = diary.getByDate(ref.date)
  if (!entry) return ''
  return entry.thumbs[ref.index] || entry.images[ref.index] || ''
}
function fullOf(j: AnchorJournal): string {
  const ref = j.photoRef![0]
  return diary.getByDate(ref.date)?.images[ref.index] || ''
}
const photoViewer = reactive({ open: false, src: '' })
function openPhoto(src: string) {
  if (!src) return
  photoViewer.src = src
  photoViewer.open = true
}
function closePhoto() {
  photoViewer.open = false
}

// ---- 那年今日 ----
const thisDayItems = computed(() => journalsOnThisDay(props.journals, new Date()))

// ---- 心情统计 ----
const moodStats = computed(() => journalMoodStats(props.journals))
const moodEntries = computed(() => Object.entries(moodStats.value).sort((a, b) => b[1] - a[1]))
const moodOptions = computed(() => moodEntries.value.map(([m]) => m))

function moodPct(count: number): string {
  if (!props.journals.length) return '0%'
  return `${Math.round((count / props.journals.length) * 100)}%`
}

// ---- 组合检索 ----
const keyword = ref('')
const mood = ref('')
const dateFrom = ref('')
const dateTo = ref('')

const searched = computed(() =>
  filterJournals(props.journals, {
    mood: mood.value || undefined,
    keyword: keyword.value.trim() || undefined,
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
  }),
)
</script>

<style scoped>
.ajr {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 18px;
}
.ajr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ajr-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-strong, #e8e6e1);
}
.ajr-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--text-soft, #c9c5bc);
}
.ajr-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.ajr-card-t {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.75;
}
.ajr-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ajr-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 5px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}
.ajr-item-title {
  opacity: 0.92;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ajr-item-date {
  opacity: 0.55;
  font-size: 11px;
}
.ajr-item-mood {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(240, 192, 64, 0.14);
  color: #d8b458;
}
.ajr-empty {
  font-size: 12px;
  opacity: 0.7;
  margin: 0;
}
.ajr-mood-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.ajr-mood-label {
  width: 64px;
  opacity: 0.85;
}
.ajr-mood-bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}
.ajr-mood-seg {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #8a9a7a, #d8b458);
}
.ajr-mood-count {
  width: 24px;
  text-align: right;
  opacity: 0.7;
}
.ajr-search-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ajr-input {
  font-size: 12px;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-strong, #e8e6e1);
}
.ajr-select {
  max-width: 110px;
}
.ajr-date {
  max-width: 128px;
}
.ajr-date-sep {
  font-size: 11px;
  opacity: 0.6;
}
.ajr-tpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}
.ajr-tpl {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.ajr-tpl-icon {
  font-size: 16px;
}
.ajr-tpl-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ajr-tpl-name {
  font-size: 12px;
}
.ajr-tpl-hint {
  font-size: 11px;
  opacity: 0.6;
}
.ajr-tpl-scaffold {
  font-size: 10px;
  opacity: 0.5;
  white-space: pre-wrap;
}
.ajr-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}
.ajr-photo-fig {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ajr-photo {
  width: 100%;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: zoom-in;
  transition: transform 0.2s ease;
}
.ajr-photo:hover {
  transform: scale(1.04);
}
.ajr-photo-cap {
  font-size: 10px;
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ajr-photo-viewer {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(8, 10, 14, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  padding-top: calc(24px + env(safe-area-inset-top, 0px));
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
}
.ajr-photo-viewer-img {
  max-width: 92vw;
  max-height: 82vh;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  object-fit: contain;
}
</style>
