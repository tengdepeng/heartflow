<template>
  <section class="bsf" aria-label="我的书架">
    <div class="bsf-head">
      <div class="bsf-title-wrap">
        <span class="bsf-title">📚 我的书架</span>
        <span class="bsf-sub">录入藏书与阅读进度，驱动总览、习惯与荐书</span>
      </div>
      <span class="bsf-count">{{ books.length }} 本</span>
    </div>

    <!-- 年度目标 -->
    <div class="bsf-goal">
      <div class="bsf-goal-row">
        <span class="bsf-goal-label">年度目标</span>
        <span class="bsf-goal-val">{{ goal.finished }} / {{ goal.yearlyTarget }} 本</span>
        <button class="bsf-link" type="button" @click="editingGoal = !editingGoal">
          {{ editingGoal ? '收起' : '设定' }}
        </button>
      </div>
      <div class="bsf-goal-bar"><i :style="{ width: goalPct + '%' }"></i></div>
      <div v-if="editingGoal" class="bsf-goal-edit">
        <label class="bsf-field">
          <span>年度本数</span>
          <input v-model.number="goalForm.yearlyTarget" type="number" min="1" class="bsf-num" />
        </label>
        <label class="bsf-field">
          <span>每日分钟</span>
          <input v-model.number="goalForm.dailyTarget" type="number" min="1" class="bsf-num" />
        </label>
        <button class="bsf-btn" type="button" @click="saveGoal">保存目标</button>
      </div>
    </div>

    <!-- 新增书籍 -->
    <form class="bsf-add" @submit.prevent="onAdd">
      <input v-model="newBook.title" class="bsf-input" placeholder="书名" aria-label="书名" />
      <input v-model="newBook.author" class="bsf-input" placeholder="作者" aria-label="作者" />
      <input v-model.number="newBook.totalPages" type="number" min="1" class="bsf-input bsf-input--num" placeholder="页数" aria-label="页数" />
      <input v-model="newBook.tags" class="bsf-input" placeholder="标签,逗号分隔" aria-label="标签" />
      <button type="submit" class="bsf-btn" :disabled="!newBook.title.trim()">加入书架</button>
    </form>

    <!-- 导入电子书（本地解析 .txt/.epub/.pdf → 按书正文） -->
    <button type="button" class="bsf-btn bsf-import-btn" @click="importInput?.click()">导入电子书 (.txt/.epub/.pdf)</button>
    <input ref="importInput" type="file" accept=".txt,.epub,.pdf" hidden @change="onImportBook" />

    <!-- 书架分区 -->
    <p v-if="books.length === 0" class="bsf-empty">书架还空着，先加入一本想读的书吧。</p>
    <div v-for="st in STATUS_ORDER" :key="st" class="bsf-shelf">
      <div class="bsf-shelf-head">
        <span class="bsf-shelf-icon">{{ READING_STATUS_META[st].icon }}</span>
        <span class="bsf-shelf-name">{{ READING_STATUS_META[st].label }}</span>
        <span class="bsf-shelf-count">{{ booksByStatus[st].length }}</span>
      </div>

      <p v-if="!booksByStatus[st].length" class="bsf-shelf-empty">—</p>

      <div v-for="b in booksByStatus[st]" :key="b.id" class="bsf-book">
        <div class="bsf-book-main">
          <div class="bsf-book-title">{{ b.title }}</div>
          <div class="bsf-book-meta">
            {{ b.author }}
            <template v-if="b.totalPages"> · {{ b.currentPage }}/{{ b.totalPages }} 页</template>
            <template v-if="b.totalReadingTime"> · 已读 {{ b.totalReadingTime }} 分</template>
          </div>
          <div v-if="b.tags.length" class="bsf-tags">
            <span v-for="t in b.tags" :key="t" class="bsf-tag">{{ t }}</span>
          </div>
        </div>

        <div class="bsf-book-side">
          <!-- 已读：评分 -->
          <div v-if="st === 'finished'" class="bsf-stars" :aria-label="`评分 ${b.rating || 0} / 5`">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="bsf-star"
              :class="{ on: (b.rating || 0) >= n }"
              :aria-pressed="(b.rating || 0) >= n"
              @click="onRate(b, n)"
            >★</button>
          </div>

          <!-- 状态切换 -->
          <select
            :value="b.status"
            class="bsf-select"
            aria-label="阅读状态"
            @change="onStatus(b, $event)"
          >
            <option v-for="s in STATUS_ORDER" :key="s" :value="s">{{ READING_STATUS_META[s].label }}</option>
          </select>

          <!-- 在读：记进度 -->
          <button v-if="st === 'reading'" type="button" class="bsf-link" @click="openSession(b)">记进度</button>

          <!-- 有导入正文：打开逐书阅读器（自动定位续读） -->
          <button v-if="hasBookContent(b.id)" type="button" class="bsf-read" @click="openReading(b)">打开阅读</button>

          <button type="button" class="bsf-del" :title="`移除《${b.title}》`" @click="onRemove(b)">✕</button>
        </div>

        <!-- 阅读会话录入 -->
        <div v-if="sessionFor === b.id" class="bsf-session">
          <input v-model.number="session.startPage" type="number" min="0" class="bsf-input bsf-input--num" placeholder="起页" aria-label="起页" />
          <input v-model.number="session.endPage" type="number" min="0" class="bsf-input bsf-input--num" placeholder="止页" aria-label="止页" />
          <input v-model.number="session.duration" type="number" min="0" class="bsf-input bsf-input--num" placeholder="分钟" aria-label="分钟" />
          <button type="button" class="bsf-btn" @click="saveSession(b)">记录</button>
          <button type="button" class="bsf-link" @click="sessionFor = ''">取消</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useReadingBridge } from '../modules/reading/reading-bridge'
import { READING_STATUS_META } from '../modules/reading/types'
import { hasBookContent, parseBookFile } from '../modules/reading'
import type { Book, ReadingStatus } from '../modules/reading/types'

const bridge = useReadingBridge()
const emit = defineEmits<{ (e: 'open-reading', id: string): void }>()

const books = bridge.books
const booksByStatus = bridge.booksByStatus
const readingGoal = bridge.readingGoal

const STATUS_ORDER: ReadingStatus[] = ['want_to_read', 'reading', 'finished', 'rereading', 'abandoned']

const goal = computed(() => ({
  yearlyTarget: readingGoal.value.yearlyTarget || 12,
  dailyTarget: readingGoal.value.dailyTarget || 30,
  finished: books.value.filter(b => b.status === 'finished').length,
}))

const goalPct = computed(() =>
  Math.max(0, Math.min(100, Math.round((goal.value.finished / (goal.value.yearlyTarget || 1)) * 100))),
)

// ---- 新增书籍 ----
const newBook = reactive({ title: '', author: '', totalPages: 200 as number | null, tags: '' })
const importInput = ref<HTMLInputElement | null>(null)

function onAdd() {
  if (!newBook.title.trim()) return
  const pages = Number(newBook.totalPages) > 0 ? Number(newBook.totalPages) : 1
  const tags = newBook.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
  bridge.addBook(newBook.title.trim(), newBook.author.trim(), pages, tags)
  newBook.title = ''
  newBook.author = ''
  newBook.totalPages = 200
  newBook.tags = ''
}

// 导入电子书：本地解析为纯文本并按书名建书（含按书正文），随后可在书卡上「打开阅读」
async function onImportBook(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  input.value = '' // 允许重复导入同名文件
  if (!file) return
  try {
    const { title, text } = await parseBookFile(file)
    if (!text) return
    bridge.addBookFromText(
      title || file.name.replace(/\.[^.]+$/, ''),
      '',
      Math.max(1, text.split(/\n+/).filter(p => p.trim()).length),
      text,
    )
  } catch (err) {
    console.error('[BookShelfPanel] 导入电子书失败', err)
  }
}

// ---- 状态 / 评分 / 移除 ----
function onStatus(b: Book, e: Event) {
  const v = (e.target as HTMLSelectElement).value as ReadingStatus
  bridge.updateBookStatus(b.id, v)
}

function onRate(b: Book, n: number) {
  bridge.rateBook(b.id, n)
}

function onRemove(b: Book) {
  bridge.removeBook(b.id)
}

// 打开逐书阅读器（由父组件 ReadingHall 接管加载正文 + 续读定位）
function openReading(b: Book) {
  emit('open-reading', b.id)
}

// ---- 年度目标 ----
const editingGoal = ref(false)
const goalForm = reactive({ yearlyTarget: 12, dailyTarget: 30 })

function openGoalEditor() {
  goalForm.yearlyTarget = goal.value.yearlyTarget
  goalForm.dailyTarget = goal.value.dailyTarget
  editingGoal.value = true
}

function saveGoal() {
  bridge.updateGoal({
    yearlyTarget: Math.max(1, Number(goalForm.yearlyTarget) || 12),
    dailyTarget: Math.max(1, Number(goalForm.dailyTarget) || 30),
  })
  editingGoal.value = false
}

// ---- 阅读会话录入 ----
const sessionFor = ref('')
const session = reactive({ startPage: 0, endPage: 0, duration: 0 })

function openSession(b: Book) {
  sessionFor.value = b.id
  session.startPage = b.currentPage
  session.endPage = b.currentPage
  session.duration = 0
}

function saveSession(b: Book) {
  const start = Math.max(0, Number(session.startPage) || 0)
  const end = Math.max(0, Number(session.endPage) || 0)
  const dur = Math.max(0, Number(session.duration) || 0)
  bridge.recordSession(b.id, start, end, dur)
  sessionFor.value = ''
}

// 暴露给模板（openGoalEditor 在模板里没有直接引用，保留以备将来扩展）
void openGoalEditor
</script>

<style scoped>
.bsf {
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

.bsf-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.bsf-title-wrap { display: flex; flex-direction: column; gap: 2px; }
.bsf-title { font-size: 16px; font-weight: 500; color: rgba(var(--text-primary-rgb), 0.85); letter-spacing: 1px; }
.bsf-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.4); letter-spacing: 0.5px; }
.bsf-count { font-size: 11px; color: rgba(var(--accent-rgb), 0.5); white-space: nowrap; padding-top: 2px; }

/* 年度目标 */
.bsf-goal { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 10px; background: rgba(var(--bg-card-rgb), 0.5); border: 1px solid rgba(var(--accent-rgb), 0.06); }
.bsf-goal-row { display: flex; align-items: center; gap: 10px; }
.bsf-goal-label { font-size: 12px; color: var(--text-secondary); }
.bsf-goal-val { font-size: 13px; color: var(--accent); font-weight: 500; }
.bsf-goal-bar { height: 6px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.1); overflow: hidden; }
.bsf-goal-bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #c49a5a, #8a9a7a); transition: width 0.3s; }
.bsf-goal-edit { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; }
.bsf-field { display: inline-flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--text-secondary); }
.bsf-num { width: 84px; padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.15); background: rgba(0,0,0,0.25); color: var(--text-high); font-size: 12px; font-family: inherit; }
.bsf-num:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.4); }

/* 新增书籍 */
.bsf-add { display: flex; flex-wrap: wrap; gap: 8px; }
.bsf-input {
  flex: 1;
  min-width: 100px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(0,0,0,0.22);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
}
.bsf-input:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.4); }
.bsf-input--num { width: 72px; flex: 0 0 auto; }
.bsf-btn {
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  padding: 7px 14px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.bsf-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.45); }
.bsf-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* 书架分区 */
.bsf-shelf { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(var(--accent-rgb), 0.06); }
.bsf-shelf-head { display: flex; align-items: center; gap: 8px; }
.bsf-shelf-icon { font-size: 14px; }
.bsf-shelf-name { font-size: 13px; font-weight: 500; color: var(--accent); letter-spacing: 1px; }
.bsf-shelf-count { font-size: 11px; color: rgba(var(--accent-rgb), 0.5); }
.bsf-shelf-empty { margin: 0; font-size: 12px; color: var(--text-low); padding-left: 4px; }

.bsf-empty { margin: 0; font-size: 12px; color: var(--text-secondary); text-align: center; padding: 18px 0; }

.bsf-book { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px; border-radius: 12px; background: rgba(var(--bg-card-rgb), 0.45); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.bsf-book-main { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 3px; }
.bsf-book-title { font-size: 14px; color: rgba(var(--text-primary-rgb), 0.9); }
.bsf-book-meta { font-size: 11px; color: rgba(var(--text-primary-rgb), 0.4); }
.bsf-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.bsf-tag { font-size: 9px; padding: 2px 8px; border-radius: 6px; background: rgba(var(--accent-rgb), 0.1); color: rgba(var(--text-primary-rgb), 0.6); }

.bsf-book-side { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.bsf-stars { display: inline-flex; gap: 1px; }
.bsf-star { border: none; background: transparent; cursor: pointer; font-size: 15px; line-height: 1; color: rgba(var(--accent-rgb), 0.25); padding: 0 1px; transition: color 0.15s; }
.bsf-star.on { color: #f0c040; }
.bsf-select {
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 8px;
  padding: 5px 8px;
  color: var(--text-high);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}
.bsf-select:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.4); }
.bsf-link { border: none; background: transparent; color: var(--accent); font-size: 11px; font-family: inherit; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.bsf-link:hover { background: rgba(var(--accent-rgb), 0.1); }
.bsf-read { border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.12); color: var(--accent); font-size: 11px; font-family: inherit; padding: 4px 10px; border-radius: 14px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.bsf-read:hover { background: rgba(var(--accent-rgb), 0.2); border-color: rgba(var(--accent-rgb), 0.45); }
.bsf-del { border: none; background: transparent; color: rgba(var(--text-primary-rgb), 0.35); cursor: pointer; font-size: 12px; padding: 4px 6px; }
.bsf-del:hover { color: #c46a5a; }

.bsf-session { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding-top: 8px; border-top: 1px dashed rgba(var(--accent-rgb), 0.12); margin-top: 2px; }

@media (max-width: 480px) {
  .bsf { padding: 14px 14px; }
  .bsf-input { min-width: 0; flex: 1 1 100%; }
  .bsf-input--num { width: 100%; flex: 1 1 100%; }
  .bsf-add .bsf-btn { flex: 1 1 100%; }
.bsf-import-btn { width: 100%; }
  .bsf-book-main { min-width: 0; flex-basis: 100%; }
}
</style>
