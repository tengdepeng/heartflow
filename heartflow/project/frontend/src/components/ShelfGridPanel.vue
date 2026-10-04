<template>
  <section class="sgp" aria-label="书架封面网格">
    <div class="sgp-tools">
      <div class="sgp-stats">
        <span class="sgp-stat">共 {{ stats.total }} 本</span>
        <span v-if="stats.pinned" class="sgp-stat">置顶 {{ stats.pinned }}</span>
        <span v-if="stats.privateCount" class="sgp-stat">私密 {{ stats.privateCount }}</span>
      </div>
    </div>

    <div v-if="sections.pinned.length" class="sgp-section">
      <div class="sgp-sec-head">
        <span class="sgp-sec-name">📌 置顶</span>
        <span class="sgp-sec-count">{{ sections.pinned.length }}</span>
      </div>
      <div class="sgp-grid">
        <article
          v-for="b in sections.pinned"
          :key="b.id"
          class="sgp-card is-pinned"
          :class="{ 'is-private': isPrivate(b.id) }"
        >
          <button class="sgp-cover" type="button" :title="`打开《${b.title}》`" @click="openReading(b)">
            <img v-if="b.cover" class="sgp-cover-img" :src="b.cover" :alt="b.title" />
            <span v-else class="sgp-cover-ph" :style="coverStyle(b.title)">{{ initials(b.title) }}</span>
            <svg class="sgp-ring" viewBox="0 0 36 36" aria-hidden="true">
              <circle class="sgp-ring-bg" cx="18" cy="18" r="15.5" pathLength="100" />
              <circle
                class="sgp-ring-fg"
                cx="18"
                cy="18"
                r="15.5"
                pathLength="100"
                :stroke-dasharray="`${progressPercent(b)} 100`"
              />
            </svg>
            <span class="sgp-ring-val">{{ progressPercent(b) }}%</span>
          </button>
          <div class="sgp-meta">
            <div class="sgp-name">{{ b.title }}</div>
            <div class="sgp-author">{{ b.author || '佚名' }}</div>
          </div>
          <div class="sgp-actions">
            <button
              class="sgp-act sgp-pin"
              :class="{ on: isPinned(b.id) }"
              type="button"
              :title="isPinned(b.id) ? '取消置顶' : '置顶'"
              :aria-pressed="isPinned(b.id)"
              @click="emit('toggle-pin', b.id)"
            >📌</button>
            <button
              class="sgp-act sgp-priv"
              :class="{ on: isPrivate(b.id) }"
              type="button"
              :title="isPrivate(b.id) ? '取消私密' : '设为私密'"
              :aria-pressed="isPrivate(b.id)"
              @click="emit('toggle-private', b.id)"
            >{{ isPrivate(b.id) ? '🔒' : '🔓' }}</button>
            <button v-if="hasBookContent(b.id)" class="sgp-read" type="button" @click="openReading(b)">阅读</button>
          </div>
        </article>
      </div>
    </div>

    <div class="sgp-section">
      <div class="sgp-sec-head">
        <span class="sgp-sec-name">全部</span>
        <span class="sgp-sec-count">{{ sections.normal.length }}</span>
      </div>
      <p v-if="!sections.normal.length" class="sgp-empty">书架还空着，先加入一本想读的书吧。</p>
      <div class="sgp-grid">
        <article
          v-for="b in sections.normal"
          :key="b.id"
          class="sgp-card"
          :class="{ 'is-private': isPrivate(b.id) }"
        >
          <button class="sgp-cover" type="button" :title="`打开《${b.title}》`" @click="openReading(b)">
            <img v-if="b.cover" class="sgp-cover-img" :src="b.cover" :alt="b.title" />
            <span v-else class="sgp-cover-ph" :style="coverStyle(b.title)">{{ initials(b.title) }}</span>
            <svg class="sgp-ring" viewBox="0 0 36 36" aria-hidden="true">
              <circle class="sgp-ring-bg" cx="18" cy="18" r="15.5" pathLength="100" />
              <circle
                class="sgp-ring-fg"
                cx="18"
                cy="18"
                r="15.5"
                pathLength="100"
                :stroke-dasharray="`${progressPercent(b)} 100`"
              />
            </svg>
            <span class="sgp-ring-val">{{ progressPercent(b) }}%</span>
          </button>
          <div class="sgp-meta">
            <div class="sgp-name">{{ b.title }}</div>
            <div class="sgp-author">{{ b.author || '佚名' }}</div>
          </div>
          <div class="sgp-actions">
            <button
              class="sgp-act sgp-pin"
              :class="{ on: isPinned(b.id) }"
              type="button"
              :title="isPinned(b.id) ? '取消置顶' : '置顶'"
              :aria-pressed="isPinned(b.id)"
              @click="emit('toggle-pin', b.id)"
            >📌</button>
            <button
              class="sgp-act sgp-priv"
              :class="{ on: isPrivate(b.id) }"
              type="button"
              :title="isPrivate(b.id) ? '取消私密' : '设为私密'"
              :aria-pressed="isPrivate(b.id)"
              @click="emit('toggle-private', b.id)"
            >{{ isPrivate(b.id) ? '🔒' : '🔓' }}</button>
            <button v-if="hasBookContent(b.id)" class="sgp-read" type="button" @click="openReading(b)">阅读</button>
          </div>
        </article>
      </div>
    </div>

    <p v-if="sections.hiddenPrivate" class="sgp-hidden-note">
      另有 {{ sections.hiddenPrivate }} 本私密藏书已隐藏
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Book } from '../modules/reading/types'
import type { ShelfSort } from '../modules/reading/shelf-organizer'
import { progressPercent, shelfSections, shelfStats } from '../modules/reading/shelf-organizer'
import { hasBookContent } from '../modules/reading/book-content'

const props = withDefaults(
  defineProps<{
    books: Book[]
    pinnedIds?: string[]
    privateIds?: string[]
    sort?: ShelfSort
    showPrivate?: boolean
  }>(),
  {
    pinnedIds: () => [],
    privateIds: () => [],
    sort: 'manual',
    showPrivate: false,
  },
)

const emit = defineEmits<{
  (e: 'open-reading', id: string): void
  (e: 'toggle-pin', id: string): void
  (e: 'toggle-private', id: string): void
}>()

const sections = computed(() =>
  shelfSections(props.books, {
    pinnedIds: props.pinnedIds,
    privateIds: props.privateIds,
    showPrivate: props.showPrivate,
    sort: props.sort,
  }),
)

const stats = computed(() => shelfStats(props.books, props.pinnedIds, props.privateIds))

const isPinned = (id: string): boolean => props.pinnedIds.includes(id)
const isPrivate = (id: string): boolean => props.privateIds.includes(id)

/** 无封面图时按书名派生确定性渐变 + 首字，避免网络图片 */
function coverStyle(title: string): Record<string, string> {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0
  const hue = h % 360
  return {
    background: `linear-gradient(135deg, hsl(${hue} 30% 36%), hsl(${(hue + 42) % 360} 28% 22%))`,
  }
}

function initials(title: string): string {
  const t = title.trim()
  if (!t) return '书'
  return t.slice(0, 2)
}

function openReading(b: Book): void {
  emit('open-reading', b.id)
}
</script>

<style scoped>
.sgp {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sgp-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.sgp-stats {
  display: flex;
  gap: 10px;
}

.sgp-stat {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  white-space: nowrap;
}

.sgp-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}

.sgp-sec-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sgp-sec-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.sgp-sec-count {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
}

.sgp-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 12px 0;
}

.sgp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 14px;
}

.sgp-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.45);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: border-color 0.2s, transform 0.15s;
}

.sgp-card:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  transform: translateY(-2px);
}

.sgp-card.is-private {
  border-style: dashed;
}

.sgp-cover {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  padding: 0;
  border: none;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.25);
}

.sgp-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.sgp-cover-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 22px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.82);
  letter-spacing: 2px;
}

.sgp-ring {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 30px;
  height: 30px;
  transform: rotate(-90deg);
  pointer-events: none;
}

.sgp-ring-bg {
  fill: rgba(0, 0, 0, 0.35);
  stroke: rgba(255, 255, 255, 0.18);
  stroke-width: 3;
}

.sgp-ring-fg {
  fill: none;
  stroke: #c49a5a;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s;
}

.sgp-ring-val {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.9);
  pointer-events: none;
}

.sgp-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sgp-name {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sgp-author {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sgp-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sgp-act {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 3px 4px;
  border-radius: 6px;
  filter: grayscale(1) opacity(0.5);
  transition: filter 0.15s, background 0.15s;
}

.sgp-act:hover {
  background: rgba(var(--accent-rgb), 0.1);
}

.sgp-act.on {
  filter: none;
}

.sgp-read {
  margin-left: auto;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  font-size: 10px;
  font-family: inherit;
  padding: 3px 10px;
  border-radius: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.sgp-read:hover {
  background: rgba(var(--accent-rgb), 0.2);
  border-color: rgba(var(--accent-rgb), 0.45);
}

.sgp-hidden-note {
  margin: 0;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.4);
  text-align: center;
}

@media (max-width: 480px) {
  .sgp-grid {
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 10px;
  }
}
</style>
