<template>
  <section class="brv" aria-label="书评与笔记">
    <div class="brv-head">
      <div class="brv-title-wrap">
        <span class="brv-title">书评 · 笔记</span>
        <span class="brv-sub">记录读后感受，沉淀思考脉络</span>
      </div>
      <span class="brv-count">{{ reviews.length + notes.length }} 条记录</span>
    </div>

    <div class="brv-tabs" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        class="brv-tab"
        :class="{ 'is-active': tab === t.key }"
        role="tab"
        :aria-selected="tab === t.key"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- ============ 书评 ============ -->
    <div v-show="tab === 'reviews'" class="brv-body">
      <div class="brv-stats">
        <div class="brv-stat"><b>{{ reviewStats.totalReviews }}</b><span>书评</span></div>
        <div class="brv-stat"><b>{{ reviewStats.averageRating || '—' }}</b><span>平均评分</span></div>
        <div class="brv-stat"><b>{{ topBooks.length }}</b><span>评过书目</span></div>
      </div>

      <!-- 评分分布 -->
      <div v-if="reviews.length" class="brv-block">
        <span class="brv-block-label">评分分布</span>
        <div v-for="s in 5" :key="s" class="brv-dist-row">
          <span class="brv-dist-star">{{ '★'.repeat(6 - s) }}</span>
          <div class="brv-dist-bar"><i :style="{ width: distPercent(6 - s) + '%' }"></i></div>
          <span class="brv-dist-val">{{ reviewStats.ratingDistribution[6 - s] || 0 }}</span>
        </div>
      </div>

      <!-- 新建书评 -->
      <form class="brv-form" @submit.prevent="submitReview">
        <div class="brv-form-head">
          <span class="brv-block-label">写书评</span>
          <button type="button" class="brv-toggle" @click="showReviewForm = !showReviewForm">
            {{ showReviewForm ? '收起' : '展开' }}
          </button>
        </div>
        <template v-if="showReviewForm">
          <div class="brv-form-row">
            <input v-model="reviewForm.bookTitle" type="text" class="brv-input" placeholder="书名" />
            <select v-model.number="reviewForm.rating" class="brv-select">
              <option v-for="r in 5" :key="r" :value="r">{{ '★'.repeat(r) }}{{ '☆'.repeat(5 - r) }}</option>
            </select>
          </div>
          <div class="brv-form-row">
            <input v-model="reviewForm.title" type="text" class="brv-input" placeholder="评语标题" />
          </div>
          <textarea v-model="reviewForm.content" class="brv-textarea" rows="3" placeholder="写下你的读后感受……"></textarea>
          <div class="brv-form-row">
            <label class="brv-check">
              <input v-model="reviewForm.hasSpoiler" type="checkbox" />
              含剧透
            </label>
            <label class="brv-field">
              <span class="brv-field-label">推荐</span>
              <input v-model.number="reviewForm.recommendationScore" type="number" min="1" max="10" class="brv-input brv-input--num" />
            </label>
            <input v-model="reviewForm.tags" type="text" class="brv-input" placeholder="标签，逗号分隔" />
          </div>
          <button type="submit" class="brv-btn" :disabled="!reviewForm.bookTitle.trim() || !reviewForm.content.trim()">发布书评</button>
        </template>
      </form>

      <!-- 书评列表 -->
      <p v-if="!reviews.length" class="brv-empty">还没有书评，写下第一本读后感受吧。</p>
      <div v-else class="brv-reviews">
        <div v-for="r in reviews" :key="r.id" class="brv-review">
          <div class="brv-review-head">
            <div class="brv-review-title-wrap">
              <b class="brv-review-book">《{{ r.bookTitle }}》</b>
              <span class="brv-review-title">{{ r.title }}</span>
            </div>
            <span class="brv-review-rating">{{ '★'.repeat(Math.round(r.rating)) }}</span>
          </div>
          <p class="brv-review-content">{{ r.content }}</p>
          <div class="brv-review-meta">
            <span v-if="r.hasSpoiler" class="brv-spoiler">含剧透</span>
            <span v-if="r.recommendationScore" class="brv-rec-score">推荐 {{ r.recommendationScore }}/10</span>
            <span v-if="r.readingTime" class="brv-reading-time">{{ r.readingTime }}</span>
            <span class="brv-review-date">{{ fmt(r.timestamp) }}</span>
            <button type="button" class="brv-del" @click="removeReview(r.id)" title="删除">✕</button>
          </div>
          <div v-if="r.tags.length" class="brv-review-tags">
            <span v-for="t in r.tags" :key="t" class="brv-tag">{{ t }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 笔记 ============ -->
    <div v-show="tab === 'notes'" class="brv-body">
      <div class="brv-stats">
        <div class="brv-stat"><b>{{ noteStats.total }}</b><span>笔记</span></div>
        <div class="brv-stat"><b>{{ noteStats.notesWithConnections }}</b><span>关联笔记</span></div>
        <div class="brv-stat"><b>{{ Object.keys(noteStats.typeDistribution).length }}</b><span>笔记类型</span></div>
      </div>

      <!-- 类型分布 -->
      <div v-if="notes.length" class="brv-block">
        <span class="brv-block-label">类型分布</span>
        <div v-for="(m, k) in NOTE_TYPE_META" :key="k" v-show="noteStats.typeDistribution[k]" class="brv-dist-row">
          <span class="brv-dist-star">{{ m.icon }}</span>
          <div class="brv-dist-bar"><i :style="{ width: typePercent(noteStats.typeDistribution[k]) + '%' }"></i></div>
          <span class="brv-dist-val">{{ noteStats.typeDistribution[k] }}</span>
        </div>
      </div>

      <!-- 新建笔记 -->
      <form class="brv-form" @submit.prevent="submitNote">
        <div class="brv-form-head">
          <span class="brv-block-label">记笔记</span>
          <button type="button" class="brv-toggle" @click="showNoteForm = !showNoteForm">
            {{ showNoteForm ? '收起' : '展开' }}
          </button>
        </div>
        <template v-if="showNoteForm">
          <div class="brv-form-row">
            <input v-model="noteForm.bookTitle" type="text" class="brv-input" placeholder="书名" />
            <select v-model="noteForm.type" class="brv-select">
              <option v-for="(m, k) in NOTE_TYPE_META" :key="k" :value="k">{{ m.icon }} {{ m.label }}</option>
            </select>
          </div>
          <textarea v-model="noteForm.content" class="brv-textarea" rows="3" placeholder="写下你的想法……"></textarea>
          <div class="brv-form-row">
            <input v-model="noteForm.chapter" type="text" class="brv-input" placeholder="章节（可选）" />
            <input v-model.number="noteForm.page" type="number" min="1" class="brv-input brv-input--num" placeholder="页码" />
            <button type="submit" class="brv-btn" :disabled="!noteForm.bookTitle.trim() || !noteForm.content.trim()">保存笔记</button>
          </div>
        </template>
      </form>

      <!-- 笔记列表 -->
      <p v-if="!notes.length" class="brv-empty">还没有笔记，记录下阅读时的灵光一现。</p>
      <div v-else class="brv-notes">
        <div v-for="n in notes" :key="n.id" class="brv-note" :style="{ borderLeftColor: NOTE_TYPE_META[n.type].color }">
          <div class="brv-note-head">
            <span class="brv-note-icon">{{ NOTE_TYPE_META[n.type].icon }}</span>
            <div class="brv-note-title-wrap">
              <b class="brv-note-book">{{ bookTitle(n.bookId) }}</b>
              <span class="brv-note-meta">{{ NOTE_TYPE_META[n.type].label }}{{ n.chapter ? ' · ' + n.chapter : '' }}{{ n.page ? ' · P' + n.page : '' }}</span>
            </div>
            <button type="button" class="brv-del" @click="removeNote(n.id)" title="删除">✕</button>
          </div>
          <p class="brv-note-content">{{ n.content }}</p>
          <span class="brv-note-date">{{ fmt(n.timestamp) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useBookReviews, useReadingNotes, NOTE_TYPE_META } from '../modules/reading/challenges'
import type { ReadingNote } from '../modules/reading/challenges'

const TABS = [
  { key: 'reviews', label: '书评' },
  { key: 'notes', label: '笔记' },
] as const

type TabKey = (typeof TABS)[number]['key']
const tab = ref<TabKey>('reviews')

const reviewsStore = useBookReviews()
const notesStore = useReadingNotes()

const reviews = computed(() => reviewsStore.reviews.value)
const notes = computed(() => notesStore.notes.value)
const reviewStats = computed(() => reviewsStore.getReviewStats())
const noteStats = computed(() => notesStore.getNoteStats())
const topBooks = computed(() => reviewStats.value.topRatedBooks)

const maxRatingCount = computed(() => Math.max(1, ...Object.values(reviewStats.value.ratingDistribution)))
function distPercent(count: number): number {
  return Math.round((count / maxRatingCount.value) * 100)
}

const maxTypeCount = computed(() => Math.max(1, ...Object.values(noteStats.value.typeDistribution)))
function typePercent(count: number): number {
  return Math.round((count / maxTypeCount.value) * 100)
}

// ---- 书评表单 ----
const showReviewForm = ref(false)
const reviewForm = reactive({
  bookTitle: '',
  rating: 4,
  title: '',
  content: '',
  hasSpoiler: false,
  recommendationScore: 8,
  tags: '',
  readingTime: '',
})

function submitReview() {
  if (!reviewForm.bookTitle.trim() || !reviewForm.content.trim()) return
  const tags = reviewForm.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
  const id = slug(reviewForm.bookTitle)
  reviewsStore.createReview(
    id,
    reviewForm.bookTitle.trim(),
    reviewForm.rating,
    reviewForm.title.trim() || '读后随想',
    reviewForm.content.trim(),
    {
      hasSpoiler: reviewForm.hasSpoiler,
      recommendationScore: reviewForm.recommendationScore,
      tags,
      readingTime: reviewForm.readingTime.trim() || undefined,
    },
  )
  bookTitleMap.value[id] = reviewForm.bookTitle.trim()
  reviewForm.bookTitle = ''
  reviewForm.title = ''
  reviewForm.content = ''
  reviewForm.tags = ''
  reviewForm.readingTime = ''
}

function removeReview(id: string) {
  reviewsStore.deleteReview(id)
}

// ---- 笔记表单 ----
const showNoteForm = ref(false)
const noteForm = reactive({
  bookTitle: '',
  type: 'thought' as ReadingNote['type'],
  content: '',
  chapter: '',
  page: undefined as number | undefined,
})

const bookTitleMap = ref<Record<string, string>>({})

function submitNote() {
  if (!noteForm.bookTitle.trim() || !noteForm.content.trim()) return
  const id = slug(noteForm.bookTitle)
  notesStore.createNote(id, noteForm.content.trim(), noteForm.type, {
    chapter: noteForm.chapter.trim() || undefined,
    page: noteForm.page,
  })
  bookTitleMap.value[id] = noteForm.bookTitle.trim()
  noteForm.bookTitle = ''
  noteForm.content = ''
  noteForm.chapter = ''
  noteForm.page = undefined
}

function removeNote(id: string) {
  notesStore.deleteNote(id)
}

function bookTitle(bookId: string): string {
  return bookTitleMap.value[bookId] || reviews.value.find(r => r.bookId === bookId)?.bookTitle || bookId
}

function slug(s: string): string {
  return 'book_' + s.trim().replace(/\s+/g, '_').slice(0, 20)
}

function fmt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return '今天'
  if (diff < 172800000) return '昨天'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(() => {
  for (const r of reviews.value) {
    bookTitleMap.value[r.bookId] = r.bookTitle
  }
})
</script>

<style scoped>
.brv {
  position: relative;
  z-index: 1;
  width: 100%;
  background: rgba(16, 14, 11, 0.55);
  border: 1px solid rgba(138, 122, 106, 0.15);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(14px);
}
.brv-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.brv-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.brv-title { font-size: 15px; color: rgba(255, 246, 230, 0.92); letter-spacing: 2px; font-weight: 600; }
.brv-sub { font-size: 11px; color: rgba(138, 122, 106, 0.6); letter-spacing: 0.5px; }
.brv-count { font-size: 11px; color: rgba(138, 122, 106, 0.7); white-space: nowrap; padding-top: 2px; }

.brv-tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 14px; }
.brv-tab {
  border: 1px solid rgba(138, 122, 106, 0.15);
  background: transparent;
  color: rgba(255, 246, 230, 0.5);
  font-size: 11px;
  font-family: inherit;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.brv-tab:hover { color: rgba(255, 246, 230, 0.8); }
.brv-tab.is-active {
  background: rgba(138, 122, 106, 0.14);
  border-color: rgba(138, 122, 106, 0.3);
  color: #b8a088;
}

.brv-body { display: flex; flex-direction: column; gap: 14px; }
.brv-stats { display: flex; gap: 8px; }
.brv-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-radius: 10px; background: rgba(138, 122, 106, 0.05); }
.brv-stat b { font-size: 15px; font-weight: 600; color: #b8a088; font-variant-numeric: tabular-nums; }
.brv-stat span { font-size: 10px; color: rgba(255, 246, 230, 0.4); }
.brv-block { display: flex; flex-direction: column; gap: 7px; }
.brv-block-label { font-size: 10px; color: rgba(255, 246, 230, 0.45); letter-spacing: 1px; }
.brv-empty { margin: 8px 0; font-size: 12px; color: rgba(255, 246, 230, 0.45); text-align: center; padding: 18px 0; }

/* 分布 */
.brv-dist-row { display: flex; align-items: center; gap: 8px; }
.brv-dist-star { width: 64px; flex-shrink: 0; font-size: 10px; color: #b8a088; letter-spacing: 1px; }
.brv-dist-bar { flex: 1; height: 4px; border-radius: 999px; background: rgba(138, 122, 106, 0.1); overflow: hidden; }
.brv-dist-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, rgba(138, 122, 106, 0.4), #b8a088); }
.brv-dist-val { width: 24px; flex-shrink: 0; font-size: 10px; color: rgba(255, 246, 230, 0.45); text-align: right; font-variant-numeric: tabular-nums; }

/* 表单 */
.brv-form { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: rgba(138, 122, 106, 0.04); border: 1px solid rgba(138, 122, 106, 0.1); }
.brv-form-head { display: flex; align-items: center; justify-content: space-between; }
.brv-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   border: none; background: transparent; color: rgba(138, 122, 106, 0.7); font-size: 11px; font-family: inherit; cursor: pointer; padding: 2px 6px; 
  min-height: 26px;
}
.brv-toggle:hover { color: #b8a088; }
.brv-form-row { display: flex; gap: 8px; flex-wrap: wrap; }
.brv-form-row > .brv-input:not(.brv-input--num) { flex: 1; min-width: 100px;
}
.brv-input {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(138, 122, 106, 0.15);
  border-radius: 8px;
  padding: 8px 10px;
  color: rgba(255, 246, 230, 0.85);
  font-size: 12px;
  font-family: inherit;
}
.brv-input:focus { outline: none; border-color: rgba(138, 122, 106, 0.4); }
.brv-input::placeholder { color: rgba(255, 246, 230, 0.3); }
.brv-input--num { width: 64px; flex-shrink: 0; }
.brv-select {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(138, 122, 106, 0.15);
  border-radius: 8px;
  padding: 8px 10px;
  color: rgba(255, 246, 230, 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.brv-select:focus { outline: none; border-color: rgba(138, 122, 106, 0.4); }
.brv-select option { background: #100e0b; color: rgba(255, 246, 230, 0.85); }
.brv-textarea {
  width: 100%;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(138, 122, 106, 0.15);
  border-radius: 8px;
  padding: 8px 10px;
  color: rgba(255, 246, 230, 0.85);
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
}
.brv-textarea:focus { outline: none; border-color: rgba(138, 122, 106, 0.4); }
.brv-textarea::placeholder { color: rgba(255, 246, 230, 0.3); }
.brv-check {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255, 246, 230, 0.6); cursor: pointer; }
.brv-field {
  display: inline-flex; align-items: center; gap: 6px; }
.brv-field-label { font-size: 11px; color: rgba(255, 246, 230, 0.5); }
.brv-btn {
  border: 1px solid rgba(138, 122, 106, 0.3);
  background: rgba(138, 122, 106, 0.1);
  color: #b8a088;
  font-size: 12px;
  font-family: inherit;
  padding: 7px 14px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
  white-space: nowrap;
}
.brv-btn:hover:not(:disabled) { background: rgba(138, 122, 106, 0.18); border-color: rgba(138, 122, 106, 0.45); }
.brv-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* 书评列表 */
.brv-reviews { display: flex; flex-direction: column; gap: 8px; }
.brv-review { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(138, 122, 106, 0.1); }
.brv-review-head { display: flex; align-items: flex-start; gap: 10px; }
.brv-review-title-wrap { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.brv-review-book { font-size: 13px; color: rgba(255, 246, 230, 0.9); }
.brv-review-title { font-size: 11px; color: rgba(138, 122, 106, 0.7); }
.brv-review-rating { font-size: 12px; color: #f0c040; letter-spacing: 1px; flex-shrink: 0; }
.brv-review-content { margin: 0; font-size: 12px; color: rgba(255, 246, 230, 0.7); line-height: 1.6; }
.brv-review-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.brv-spoiler { font-size: 9px; padding: 2px 8px; border-radius: 999px; background: rgba(196, 106, 90, 0.12); color: #c46a5a; }
.brv-rec-score { font-size: 10px; color: #b8a088; }
.brv-reading-time { font-size: 10px; color: rgba(255, 246, 230, 0.4); }
.brv-review-date { font-size: 10px; color: rgba(255, 246, 230, 0.35); margin-left: auto; }
.brv-del { border: none; background: transparent; color: rgba(255, 246, 230, 0.35); cursor: pointer; font-size: 12px; padding: 2px 6px; }
.brv-del:hover { color: #c46a5a; }
.brv-review-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.brv-tag { font-size: 9px; padding: 2px 8px; border-radius: 6px; background: rgba(138, 122, 106, 0.1); color: rgba(255, 246, 230, 0.6); }

/* 笔记列表 */
.brv-notes { display: flex; flex-direction: column; gap: 8px; }
.brv-note { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(138, 122, 106, 0.1); border-left: 3px solid #6b9fc4; }
.brv-note-head { display: flex; align-items: center; gap: 8px; }
.brv-note-icon { font-size: 15px; }
.brv-note-title-wrap { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.brv-note-book { font-size: 12px; color: rgba(255, 246, 230, 0.85); }
.brv-note-meta { font-size: 10px; color: rgba(255, 246, 230, 0.4); }
.brv-note-content { margin: 0; font-size: 12px; color: rgba(255, 246, 230, 0.7); line-height: 1.6; }
.brv-note-date { font-size: 10px; color: rgba(255, 246, 230, 0.35); }
</style>
