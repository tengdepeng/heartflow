<template>
  <section class="fbk-panel" aria-label="可翻阅成书">
    <header class="fbk-head">
      <div class="fbk-head-main">
        <span class="fbk-title">📖 成书</span>
        <span class="fbk-sub">把这一年装订成一本可翻阅的书</span>
      </div>
      <div class="fbk-tools">
        <div class="fbk-year">
          <button class="fbk-year-btn" type="button" aria-label="上一年" @click="shiftYear(-1)">‹</button>
          <span class="fbk-year-val">{{ viewYear }}</span>
          <button
            class="fbk-year-btn"
            type="button"
            aria-label="下一年"
            :disabled="viewYear >= thisYear"
            @click="shiftYear(1)"
          >›</button>
        </div>
        <button class="fbk-mode" type="button" @click="toggleDual">
          {{ dual ? '单页' : '双页' }}
        </button>
      </div>
    </header>

    <!-- 书台：3D 透视 + 方向感知翻页 -->
    <div
      class="fbk-stage"
      :class="{ dual }"
      tabindex="0"
      role="group"
      aria-label="成书翻页区"
      @keydown.left.prevent="prev"
      @keydown.right.prevent="next"
    >
      <Transition :name="flipDir === 'prev' ? 'fbk-prev' : 'fbk-next'">
        <div class="fbk-spread" :key="spreadKey">
          <article
            v-for="(idx, pos) in visiblePages"
            :key="idx"
            class="fbk-page"
            :class="[`kind-${book.pages[idx].kind}`, pos === 0 ? 'side-left' : 'side-right']"
          >
            <template v-if="book.pages[idx].kind === 'cover'">
              <span class="fbk-cover-year">{{ book.year }}</span>
              <h3 class="fbk-cover-title">{{ book.pages[idx].title }}</h3>
              <p class="fbk-cover-sub">{{ book.pages[idx].subtitle }}</p>
              <span class="fbk-cover-mark">心流工坊 · 阅览殿</span>
            </template>

            <template v-else>
              <h4 class="fbk-page-title">{{ book.pages[idx].title }}</h4>
              <p v-if="book.pages[idx].subtitle" class="fbk-page-sub">{{ book.pages[idx].subtitle }}</p>

              <div v-if="book.pages[idx].kind === 'persona'" class="fbk-chips">
                <span
                  v-for="(l, i) in book.pages[idx].lines"
                  :key="i"
                  class="fbk-chip"
                >
                  <b>{{ l.split(' · ')[0] }}</b>
                  <i>{{ l.split(' · ')[1] }}</i>
                </span>
              </div>

              <ul v-else-if="book.pages[idx].kind === 'photos'" class="fbk-photos">
                <li v-for="p in book.pages[idx].photos" :key="p.id" class="fbk-photo">
                  <PhotoTile :src="p.src" :alt="p.caption" rounded="md" />
                  <span class="fbk-photo-cap">{{ p.caption }}</span>
                </li>
              </ul>

              <p
                v-for="(l, i) in book.pages[idx].lines"
                v-else
                :key="i"
                class="fbk-line"
                :class="{ lead: book.pages[idx].kind === 'discovery' && i === 0 }"
              >{{ l }}</p>

              <div v-if="book.pages[idx].stats?.length" class="fbk-stats">
                <div v-for="s in book.pages[idx].stats" :key="s.label" class="fbk-stat">
                  <span class="fbk-stat-val">{{ s.value }}</span>
                  <span class="fbk-stat-label">{{ s.label }}</span>
                </div>
              </div>
            </template>

            <span class="fbk-folio">{{ idx + 1 }}</span>
          </article>
        </div>
      </Transition>

      <button
        class="fbk-zone zone-left"
        type="button"
        aria-label="上一页"
        :disabled="!canPrev"
        @click="prev"
      ></button>
      <button
        class="fbk-zone zone-right"
        type="button"
        aria-label="下一页"
        :disabled="!canNext"
        @click="next"
      ></button>
    </div>

    <footer class="fbk-foot">
      <button class="fbk-nav" type="button" :disabled="!canPrev" @click="prev">‹ 上一页</button>
      <span class="fbk-indicator">{{ indicator }}</span>
      <button class="fbk-nav" type="button" :disabled="!canNext" @click="next">下一页 ›</button>
    </footer>

    <div class="fbk-dots">
      <button
        v-for="(p, i) in book.pages"
        :key="p.id"
        class="fbk-dot"
        :class="{ active: i === current }"
        type="button"
        :title="p.title"
        :aria-label="p.title"
        @click="jump(i)"
      ></button>
    </div>

    <div class="fbk-foot2">
      <button class="fbk-btn" type="button" @click="onCopy">复制成书</button>
      <span v-if="copied" class="fbk-copied">已复制到剪贴板</span>
      <span class="fbk-meta">{{ summary.pages }} 页 · {{ summary.photos }} 张照片</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PhotoTile from './PhotoTile.vue'
import {
  useFlipBook,
  pageCount,
  clampPageIndex,
  turnPage,
  canTurn,
  spreadPair,
  bookSummary,
  buildFlipBookMarkdown,
} from '../modules/reading/flip-book'

const { viewYear, book, setYear } = useFlipBook()
const thisYear = new Date().getFullYear()

const current = ref(0)
const dual = ref(true)
const flipDir = ref<'next' | 'prev'>('next')
const copied = ref(false)

const total = computed(() => pageCount(book.value))
const summary = computed(() => bookSummary(book.value))
// 双页模式下「当前页」吸附到展台左页，翻页以整张跨页为单位（否则单击下一页画面不动）
const spreadIndex = computed(() => spreadPair(book.value, current.value, dual.value)[0])
const visiblePages = computed(() => {
  const [left, right] = spreadPair(book.value, spreadIndex.value, dual.value)
  return right === null ? [left] : [left, right]
})
const spreadKey = computed(() => visiblePages.value.join('-'))
const indicator = computed(() => {
  const s = spreadIndex.value
  if (!dual.value || s + 1 >= total.value) return `第 ${s + 1} / ${total.value} 页`
  return `第 ${s + 1}-${s + 2} / ${total.value} 页`
})
const canPrev = computed(() => canTurn(book.value, current.value, -1, dual.value))
const canNext = computed(() => canTurn(book.value, current.value, 1, dual.value))

function go(dir: number) {
  if (!canTurn(book.value, current.value, dir, dual.value)) return
  flipDir.value = dir >= 0 ? 'next' : 'prev'
  current.value = turnPage(book.value, current.value, dir, dual.value)
  copied.value = false
}

function prev() {
  go(-1)
}

function next() {
  go(1)
}

function jump(index: number) {
  const target = spreadPair(book.value, clampPageIndex(book.value, index), dual.value)[0]
  if (target === spreadIndex.value) return
  flipDir.value = target > spreadIndex.value ? 'next' : 'prev'
  current.value = target
  copied.value = false
}

function toggleDual() {
  dual.value = !dual.value
  current.value = spreadPair(book.value, current.value, dual.value)[0]
}

function shiftYear(delta: number) {
  const next = viewYear.value + delta
  if (next > thisYear || next < 1970) return
  setYear(next)
  current.value = 0
  copied.value = false
}

async function onCopy() {
  const text = buildFlipBookMarkdown(book.value)
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      fallbackCopy(text)
    }
    copied.value = true
  } catch {
    fallbackCopy(text)
    copied.value = true
  }
}

function fallbackCopy(text: string) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  } catch {
    /* 剪贴板不可用时静默降级 */
  }
}
</script>

<style scoped>
.fbk-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  margin-bottom: 18px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.fbk-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.fbk-head-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fbk-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
  letter-spacing: 1px;
}

.fbk-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 1px;
}

.fbk-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fbk-year {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fbk-year-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.05);
  color: var(--accent);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.fbk-year-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.fbk-year-val {
  font-size: 13px;
  color: var(--accent);
  letter-spacing: 1px;
  min-width: 34px;
  text-align: center;
}

.fbk-mode {
  padding: 5px 12px;
  border-radius: 13px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
  font-size: 11px;
  letter-spacing: 0.5px;
  cursor: pointer;
}

/* 书台 */
.fbk-stage {
  position: relative;
  perspective: 1800px;
  outline: none;
}

.fbk-spread {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  min-height: 300px;
  transform-style: preserve-3d;
}

.fbk-stage.dual .fbk-spread {
  grid-template-columns: 1fr 1fr;
}

.fbk-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 20px 30px;
  min-height: 300px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.9), rgba(var(--bg-card-rgb), 0.6));
  backface-visibility: hidden;
  overflow: hidden;
}

.fbk-stage.dual .fbk-page.side-left {
  border-radius: 10px 0 0 10px;
  box-shadow: inset -14px 0 22px -18px rgba(0, 0, 0, 0.6);
}

.fbk-stage.dual .fbk-page.side-right {
  border-radius: 0 10px 10px 0;
  border-left: none;
  box-shadow: inset 14px 0 22px -18px rgba(0, 0, 0, 0.6);
}

.fbk-stage:not(.dual) .fbk-page {
  border-radius: 10px;
}

/* 翻页过渡（方向感知） */
.fbk-next-enter-active,
.fbk-prev-enter-active,
.fbk-next-leave-active,
.fbk-prev-leave-active {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease;
}

.fbk-next-leave-active,
.fbk-prev-leave-active {
  position: absolute;
  inset: 0;
}

.fbk-next-enter-from {
  transform: rotateY(-72deg);
  opacity: 0;
}

.fbk-next-leave-to {
  transform: rotateY(72deg);
  opacity: 0;
}

.fbk-prev-enter-from {
  transform: rotateY(72deg);
  opacity: 0;
}

.fbk-prev-leave-to {
  transform: rotateY(-72deg);
  opacity: 0;
}

/* 页面内容 */
.fbk-cover-year {
  font-size: 46px;
  font-weight: 600;
  line-height: 1;
  color: rgba(var(--accent-rgb), 0.22);
  letter-spacing: 2px;
}

.fbk-cover-title {
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 2px;
}

.fbk-cover-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.fbk-cover-mark {
  margin-top: auto;
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.35);
}

.fbk-page-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.fbk-page-sub {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}

.fbk-line {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.fbk-line.lead {
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(var(--accent-rgb), 0.85);
  background: rgba(var(--accent-rgb), 0.06);
  border-left: 2px solid rgba(var(--accent-rgb), 0.4);
}

.fbk-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.fbk-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.fbk-chip b {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
}

.fbk-chip i {
  font-size: 10px;
  font-style: normal;
  color: var(--text-low);
}

.fbk-photos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.fbk-photo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fbk-photo-cap {
  font-size: 9px;
  color: var(--text-low);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fbk-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: auto;
  padding-top: 10px;
}

.fbk-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fbk-stat-val {
  font-size: 16px;
  font-weight: 500;
  color: var(--accent);
}

.fbk-stat-label {
  font-size: 10px;
  color: var(--text-low);
}

.fbk-folio {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.3);
}

.fbk-stage.dual .fbk-page.side-left .fbk-folio {
  right: auto;
  left: 12px;
}

/* 点击热区 */
.fbk-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 26%;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.fbk-zone:disabled {
  cursor: default;
}

.fbk-zone:not(:disabled):hover {
  opacity: 1;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.08), transparent);
}

.fbk-zone.zone-right:not(:disabled):hover {
  background: linear-gradient(270deg, rgba(var(--accent-rgb), 0.08), transparent);
}

.zone-left {
  left: 0;
}

.zone-right {
  right: 0;
}

/* 导航 */
.fbk-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.fbk-nav {
  padding: 6px 14px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
}

.fbk-nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.fbk-indicator {
  font-size: 11px;
  color: var(--text-low);
  letter-spacing: 0.5px;
  min-width: 84px;
  text-align: center;
}

.fbk-dots {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
}

.fbk-dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border-radius: 50%;
  border: none;
  background: rgba(var(--accent-rgb), 0.2);
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.fbk-dot.active {
  background: var(--accent);
  transform: scale(1.4);
}

.fbk-foot2 {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fbk-btn {
  padding: 6px 16px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 0.5px;
  cursor: pointer;
}

.fbk-copied {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.6);
}

.fbk-meta {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-low);
}

@media (max-width: 640px) {
  .fbk-stage.dual .fbk-spread {
    grid-template-columns: 1fr;
  }

  .fbk-stage.dual .fbk-page.side-left {
    display: none;
  }

  .fbk-stage.dual .fbk-page.side-right {
    border-radius: 10px;
    border-left: 1px solid rgba(var(--accent-rgb), 0.1);
    box-shadow: none;
  }

  .fbk-photos {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
