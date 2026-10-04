<template>
  <section class="rcl-panel" aria-label="记忆回廊">
    <div class="rcl-head">
      <div class="rcl-head-main">
        <span class="rcl-title">🕰 记忆回廊</span>
        <span class="rcl-sub">flomo 式 · 让旧划线与旧照片重新浮现</span>
      </div>
      <div class="rcl-modes">
        <button
          class="rcl-mode"
          :class="{ active: mode === 'daily' }"
          type="button"
          data-test="rcl-mode-daily"
          @click="mode = 'daily'"
        >
          今日回顾
        </button>
        <button
          class="rcl-mode"
          :class="{ active: mode === 'roam' }"
          type="button"
          data-test="rcl-mode-roam"
          @click="showRoam"
        >
          随机漫游
        </button>
      </div>
    </div>

    <div class="rcl-stats">
      <span class="rcl-stat"><b>{{ stats.total }}</b> 条可回顾</span>
      <span class="rcl-stat">摘录 {{ stats.excerpts }}</span>
      <span class="rcl-stat">照片 {{ stats.photos }}</span>
      <span v-if="stats.oldestDays" class="rcl-stat">最早 {{ stats.oldestDays }} 天前</span>
    </div>

    <template v-if="cards.length">
      <div class="rcl-grid" :class="{ 'rcl-grid--single': mode === 'roam' }">
        <article
          v-for="m in cards"
          :key="m.key"
          class="rcl-card"
          :class="[`rcl-card--${m.kind}`, { 'rcl-card--roam': mode === 'roam' }]"
          :data-test="`rcl-card-${m.kind}`"
        >
          <header class="rcl-card-head">
            <span class="rcl-kind">
              <i v-if="m.kind === 'excerpt'" class="rcl-dot" :style="{ background: m.color || '#f0c040' }" />
              {{ m.kind === 'excerpt' ? '摘录' : '照片' }}
            </span>
            <span class="rcl-age">{{ ageLabel(m.date, today) }}</span>
          </header>

          <p class="rcl-card-title">{{ m.title }}</p>
          <p v-if="m.text" class="rcl-card-text">{{ m.text }}</p>
          <p v-if="m.note" class="rcl-card-note">随记：{{ m.note }}</p>

          <button
            v-if="m.kind === 'photo' && m.thumb"
            class="rcl-thumb-btn"
            type="button"
            aria-label="查看原图"
            @click="openViewer(m)"
          >
            <PhotoTile class="rcl-thumb" :src="m.thumb" alt="旧照片" rounded="md" />
          </button>
        </article>
      </div>

      <div v-if="mode === 'roam'" class="rcl-roam-actions">
        <button class="rcl-reroll" type="button" data-test="rcl-reroll" @click="roamOnce">🎲 换一条</button>
      </div>
    </template>

    <p v-else class="rcl-empty">{{ emptyHint }}</p>

    <Teleport to="body">
      <div v-if="viewer.open" class="rcl-viewer" data-test="rcl-viewer" @click="closeViewer">
        <img :src="viewer.src" class="rcl-viewer-img" alt="记忆原图" />
        <p v-if="viewer.caption" class="rcl-viewer-cap">{{ viewer.caption }}</p>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
// ============================================================
// 记忆回廊面板 · 每日回顾 + 随机漫游（flomo 式，P2 市面对标）
// ------------------------------------------------------------
// 挂载于阅览殿「回顾」页签。数据全部本地读取（阅读摘录 + 照片日记），
// 不触网。回顾流按日期确定性生成（同日稳定），漫游可反复换一条。
// ============================================================

import { computed, onMounted, ref } from 'vue'
import { useRecall, ageLabel, type RecallMemory } from '../modules/recall'
import PhotoTile from './PhotoTile.vue'

type Mode = 'daily' | 'roam'

const { today, dailyReview, stats, roam, refresh, roamOnce } = useRecall()

const mode = ref<Mode>('daily')

const cards = computed<RecallMemory[]>(() => {
  if (mode.value === 'daily') return dailyReview.value
  return roam.value ? [roam.value] : []
})

const emptyHint = computed(() =>
  mode.value === 'daily'
    ? '还没有可供回顾的旧记录。写下第一条摘录或照片，未来某天它会回到这里。'
    : '还没有可供漫游的旧记录，先攒几条摘录或照片吧。',
)

/** 切到漫游并确保有一条结果 */
function showRoam(): void {
  mode.value = 'roam'
  if (!roam.value) roamOnce()
}

const viewer = ref<{ open: boolean; src: string; caption: string }>({ open: false, src: '', caption: '' })

function openViewer(m: RecallMemory): void {
  if (!m.src) return
  viewer.value = { open: true, src: m.src, caption: m.text || m.title }
}

function closeViewer(): void {
  viewer.value = { open: false, src: '', caption: '' }
}

onMounted(() => {
  refresh()
})
</script>

<style scoped>
.rcl-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  margin-top: 16px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.rcl-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.rcl-head-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rcl-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
  letter-spacing: 1px;
}

.rcl-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 1px;
}

.rcl-modes {
  display: flex;
  gap: 6px;
}

.rcl-mode {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.04);
  color: rgba(var(--text-primary-rgb), 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.rcl-mode.active {
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.rcl-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.rcl-stat b {
  color: var(--accent);
  font-weight: 600;
  margin-right: 2px;
}

.rcl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.rcl-grid--single {
  grid-template-columns: 1fr;
}

.rcl-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: linear-gradient(178deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015));
  backdrop-filter: blur(3px) saturate(1.4);
  -webkit-backdrop-filter: blur(3px) saturate(1.4);
}

.rcl-card--roam {
  padding: 20px 22px;
}

.rcl-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rcl-kind {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.rcl-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.rcl-age {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.55);
}

.rcl-card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.82);
  line-height: 1.4;
}

.rcl-card-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: rgba(var(--text-primary-rgb), 0.72);
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rcl-card--roam .rcl-card-text {
  -webkit-line-clamp: 14;
  line-clamp: 14;
}

.rcl-card-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.rcl-thumb-btn {
  padding: 0;
  border: none;
  background: none;
  cursor: zoom-in;
  width: 100%;
}

.rcl-thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
}

.rcl-roam-actions {
  display: flex;
  justify-content: center;
}

.rcl-reroll {
  padding: 7px 22px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.rcl-reroll:hover {
  background: rgba(var(--accent-rgb), 0.16);
}

.rcl-empty {
  margin: 0;
  padding: 18px 4px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.rcl-viewer {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 32px;
  background: rgba(6, 10, 18, 0.88);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  cursor: zoom-out;
}

.rcl-viewer-img {
  max-width: 92vw;
  max-height: 80vh;
  border-radius: 12px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
}

.rcl-viewer-cap {
  margin: 0;
  max-width: 80vw;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
}
</style>
