<template>
  <section class="vb-panel" aria-label="词书背单词">
    <div class="vb-panel-head">
      <span class="vb-panel-title">📚 词书背单词</span>
      <span class="vb-panel-sub">词书 · 三档反馈 · SM-2 记忆</span>
    </div>
    <!-- 总览 -->
    <div class="vb-block">
      <span class="vb-block-label">学习总览</span>
      <div class="vb-stats">
        <div class="vb-stat">
          <span class="vb-stat-num">{{ overview.total }}</span>
          <span class="vb-stat-label">单词</span>
        </div>
        <div class="vb-stat">
          <span class="vb-stat-num">{{ overview.masteredPct }}%</span>
          <span class="vb-stat-label">掌握</span>
        </div>
        <div class="vb-stat">
          <span class="vb-stat-num">{{ plan.reviewCount }}</span>
          <span class="vb-stat-label">待复习</span>
        </div>
      </div>
      <div class="vb-progress">
        <span class="vb-progress-fill" :style="{ width: overview.masteredPct + '%' }"></span>
      </div>
      <p class="vb-plan-hint">今日计划：新学 {{ plan.newCount }} 词 · 复习 {{ plan.reviewCount }} 词</p>
    </div>
    <!-- 词书管理 -->
    <div class="vb-block">
      <span class="vb-block-label">词书管理</span>
      <div class="vb-row">
        <select v-model="activeBookId" class="vb-select">
          <option v-for="b in books" :key="b.id" :value="b.id">{{ b.name }}（{{ b.words.length }}）</option>
        </select>
        <button class="vb-btn vb-btn-danger" :disabled="!activeBook" @click="removeActiveBook">删书</button>
      </div>
      <div class="vb-row">
        <input v-model="newBookName" class="vb-input" placeholder="新词书名称" @keyup.enter="doCreateBook" />
        <button class="vb-btn vb-btn-primary" :disabled="!newBookName.trim()" @click="doCreateBook">新建</button>
      </div>
    </div>
    <!-- 添加单词 -->
    <div v-if="activeBook" class="vb-block">
      <span class="vb-block-label">添加单词 → {{ activeBook.name }}</span>
      <div class="vb-row">
        <input v-model="wordForm.term" class="vb-input" placeholder="单词" />
        <input v-model="wordForm.phonetic" class="vb-input vb-input-sm" placeholder="音标" />
      </div>
      <input v-model="wordForm.definition" class="vb-input" placeholder="释义" />
      <input v-model="wordForm.example" class="vb-input" placeholder="例句（可选）" />
      <button class="vb-btn vb-btn-primary" :disabled="!wordForm.term.trim() || !wordForm.definition.trim()" @click="doAddWord">添加</button>
    </div>
    <!-- 单词列表 -->
    <div v-if="activeBook && activeBook.words.length" class="vb-block">
      <span class="vb-block-label">单词列表（{{ activeBook.words.length }}）</span>
      <div v-for="w in activeBook.words" :key="w.id" class="vb-word">
        <div class="vb-word-head">
          <span class="vb-word-term">{{ w.term }}</span>
          <span v-if="w.phonetic" class="vb-word-phonetic">{{ w.phonetic }}</span>
          <span :class="['vb-status', 'st-' + w.status]">{{ statusLabel(w.status) }}</span>
          <button class="vb-word-del" @click="removeWord(w.id)">×</button>
        </div>
        <p class="vb-word-def">{{ w.definition }}</p>
        <p v-if="w.example" class="vb-word-ex">{{ w.example }}</p>
        <div class="vb-review">
          <button class="vb-btn vb-btn-forget" @click="review(w.id, 0)">忘记</button>
          <button class="vb-btn vb-btn-fuzzy" @click="review(w.id, 1)">模糊</button>
          <button class="vb-btn vb-btn-know" @click="review(w.id, 2)">认识</button>
          <span class="vb-review-meta">复习 {{ w.reviewCount }} · 忘 {{ w.wrongCount }}</span>
        </div>
      </div>
    </div>
    <!-- 洞察 -->
    <div v-if="insights.length" class="vb-block">
      <span class="vb-block-label">学习洞察</span>
      <p v-for="(ins, i) in insights" :key="i" class="vb-insight">{{ ins }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useVocab } from '../modules/wisdom/vocab'
import type { WordStatus } from '../modules/wisdom/vocab'

const vocab = useVocab()

const books = computed(() => vocab.books.value)
const overview = computed(() => vocab.vocabProgress(books.value))
const plan = computed(() => vocab.dailyPlan(books.value))
const insights = computed(() => vocab.vocabInsights(books.value))

const activeBookId = ref('')
const activeBook = computed(() => books.value.find(b => b.id === activeBookId.value) || null)

onMounted(() => {
  if (!activeBookId.value && books.value.length) {
    activeBookId.value = books.value[0].id
  }
})

const newBookName = ref('')
const wordForm = reactive({ term: '', definition: '', example: '', phonetic: '' })

function doCreateBook() {
  const b = vocab.createBook(newBookName.value)
  newBookName.value = ''
  activeBookId.value = b.id
}

function removeActiveBook() {
  if (!activeBook.value) return
  vocab.removeBook(activeBook.value.id)
  activeBookId.value = ''
}

function doAddWord() {
  if (!activeBook.value) return
  vocab.addWord(
    activeBook.value.id,
    wordForm.term,
    wordForm.definition,
    wordForm.example,
    wordForm.phonetic,
  )
  wordForm.term = ''
  wordForm.definition = ''
  wordForm.example = ''
  wordForm.phonetic = ''
}

function removeWord(wordId: string) {
  if (!activeBook.value) return
  vocab.removeWord(activeBook.value.id, wordId)
}

function review(wordId: string, q: 0 | 1 | 2) {
  if (!activeBook.value) return
  vocab.reviewWord(activeBook.value.id, wordId, q)
}

function statusLabel(s: WordStatus) {
  return s === 'mastered' ? '已掌握' : s === 'learning' ? '巩固中' : '新词'
}
</script>

<style scoped>
.vb-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.vb-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.vb-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.vb-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.vb-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.vb-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.vb-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}
.vb-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.vb-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #c9d6b8;
}
.vb-stat-label {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
}
.vb-progress {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  margin-bottom: 8px;
}
.vb-progress-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #c9d6b8);
  transition: width 0.4s ease;
}
.vb-plan-hint {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
}
.vb-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.vb-select,
.vb-input {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(10, 12, 10, 0.5);
  color: #e8e4d8;
  font-size: 13px;
}
.vb-input-sm {
  flex: 0 0 96px;
}
.vb-input {
  margin-bottom: 8px;
  width: 100%;
  box-sizing: border-box;
}
.vb-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
  color: #e8e4d8;
  background: rgba(139, 155, 122, 0.2);
}
.vb-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.vb-btn-primary {
  background: rgba(138, 154, 122, 0.35);
}
.vb-btn-danger {
  background: rgba(196, 106, 90, 0.3);
}
.vb-btn-forget {
  background: rgba(196, 106, 90, 0.28);
}
.vb-btn-fuzzy {
  background: rgba(224, 169, 109, 0.28);
}
.vb-btn-know {
  background: rgba(138, 154, 122, 0.35);
}
.vb-word {
  padding: 10px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.15);
}
.vb-word:last-child {
  border-bottom: none;
}
.vb-word-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vb-word-term {
  font-size: 15px;
  font-weight: 600;
  color: #e8e4d8;
}
.vb-word-phonetic {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.5);
}
.vb-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
}
.vb-status.st-new {
  color: #e0a96d;
}
.vb-status.st-learning {
  color: #c9d6b8;
}
.vb-status.st-mastered {
  color: #8a9a7a;
}
.vb-word-del {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(232, 228, 216, 0.4);
  font-size: 16px;
  cursor: pointer;
}
.vb-word-def {
  font-size: 13px;
  color: rgba(232, 228, 216, 0.75);
  margin: 4px 0;
}
.vb-word-ex {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.45);
  font-style: italic;
}
.vb-review {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.vb-review-meta {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.4);
}
.vb-insight {
  font-size: 13px;
  color: rgba(232, 228, 216, 0.7);
  margin: 4px 0;
}
</style>
