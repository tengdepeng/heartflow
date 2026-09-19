<template>
  <section class="fc-panel" aria-label="间隔复习">
    <div class="fc-panel-head">
      <span class="fc-panel-title">🃏 间隔复习</span>
      <span class="fc-panel-sub">SM-2 调度 · 闪卡记忆</span>
    </div>
    <!-- 概览 -->
    <div class="fc-block">
      <span class="fc-block-label">复习概览</span>
      <div class="fc-stats">
        <div class="fc-stat">
          <span class="fc-stat-num">{{ stats.total }}</span>
          <span class="fc-stat-label">卡片</span>
        </div>
        <div class="fc-stat">
          <span class="fc-stat-num">{{ stats.due }}</span>
          <span class="fc-stat-label">待复习</span>
        </div>
        <div class="fc-stat">
          <span class="fc-stat-num">{{ stats.newCards }}</span>
          <span class="fc-stat-label">新卡</span>
        </div>
      </div>
      <p class="fc-easiness">平均易度因子 {{ stats.avgEasiness.toFixed(2) }}</p>
    </div>
    <!-- 添加卡片 -->
    <div class="fc-block">
      <span class="fc-block-label">添加卡片</span>
      <input v-model="form.front" class="fc-input" placeholder="正面（问题/提示）" />
      <input v-model="form.back" class="fc-input" placeholder="背面（答案/要点）" />
      <div class="fc-row">
        <input v-model="form.deck" class="fc-input" placeholder="牌组（默认）" />
        <input v-model="form.tags" class="fc-input" placeholder="标签，逗号分隔" />
      </div>
      <button class="fc-btn fc-btn-primary" :disabled="!form.front.trim() || !form.back.trim()" @click="doAdd">添加</button>
    </div>
    <!-- 待复习 -->
    <div v-if="due.length" class="fc-block">
      <span class="fc-block-label">待复习（{{ due.length }}）</span>
      <div v-for="card in due" :key="card.id" class="fc-card">
        <div class="fc-card-front">{{ card.front }}</div>
        <div v-if="revealed === card.id" class="fc-card-back">{{ card.back }}</div>
        <div v-else class="fc-card-hint">点击下方评分后显示答案</div>
        <div class="fc-card-actions">
          <button class="fc-btn fc-btn-again" @click="reveal(card.id); review(card.id, 0)">重来</button>
          <button class="fc-btn fc-btn-hard" @click="reveal(card.id); review(card.id, 3)">困难</button>
          <button class="fc-btn fc-btn-good" @click="reveal(card.id); review(card.id, 4)">良好</button>
          <button class="fc-btn fc-btn-easy" @click="reveal(card.id); review(card.id, 5)">简单</button>
        </div>
      </div>
    </div>
    <div v-else-if="stats.total" class="fc-block">
      <span class="fc-block-label">待复习</span>
      <p class="fc-empty">🎉 当前没有到期的卡片</p>
    </div>
    <!-- 牌组与卡片管理 -->
    <div v-if="deckList.length" class="fc-block">
      <span class="fc-block-label">牌组与卡片</span>
      <div class="fc-decks">
        <button
          v-for="d in deckList"
          :key="d"
          class="fc-deck-chip"
          :class="{ active: deckFilter === d }"
          @click="deckFilter = d"
        >{{ d }}<span class="fc-deck-count">{{ cardsInDeck(d).length }}</span></button>
      </div>
      <div v-if="visibleCards.length" class="fc-manage-list">
        <div v-for="c in visibleCards" :key="c.id" class="fc-manage-item">
          <div class="fc-manage-text">
            <span class="fc-manage-front">{{ c.front }}</span>
            <span class="fc-manage-back">{{ c.back }}</span>
          </div>
          <span class="fc-manage-meta">
            <span class="fc-manage-deck">{{ c.deck }}</span>
            <span class="fc-manage-interval">{{ c.sm2.interval }}天</span>
          </span>
          <button class="fc-del-btn" @click="removeCard(c.id)" title="删除">×</button>
        </div>
      </div>
      <p v-else class="fc-empty">还没有卡片，添加一张吧。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useFlashcards } from '../modules/knowledge/spaced-repetition'
import type { Flashcard, Sm2Quality } from '../modules/knowledge/spaced-repetition'

const flashcards = useFlashcards()

// 模块 API 每次从 storage 读取，非响应式；用版本号触发 computed 重算
const version = ref(0)
function bump() {
  version.value++
}

const stats = computed(() => {
  void version.value
  return flashcards.stats()
})
const due = computed(() => {
  void version.value
  return flashcards.dueCards()
})
const deckList = computed(() => {
  void version.value
  return ['全部', ...flashcards.decks()]
})
// 卡片管理（并入自 FlashcardPanel）：牌组筛选 + 卡片列表删除
const deckFilter = ref('全部')
const allCards = computed<Flashcard[]>(() => {
  void version.value
  return flashcards.load()
})
const visibleCards = computed<Flashcard[]>(() =>
  deckFilter.value === '全部'
    ? allCards.value
    : allCards.value.filter(c => c.deck === deckFilter.value),
)
function cardsInDeck(deck: string) {
  return deck === '全部' ? allCards.value : allCards.value.filter(c => c.deck === deck)
}
function removeCard(id: string) {
  flashcards.remove(id)
  bump()
}

const form = reactive({ front: '', back: '', deck: '默认', tags: '' })
const revealed = ref('')

function doAdd() {
  const tags = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
  flashcards.add(form.front, form.back, form.deck.trim() || '默认', tags)
  form.front = ''
  form.back = ''
  form.tags = ''
  bump()
}

function reveal(id: string) {
  revealed.value = id
}

function review(cardId: string, q: Sm2Quality) {
  flashcards.review(cardId, q)
  bump()
}
</script>

<style scoped>
.fc-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.fc-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.fc-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.fc-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.fc-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.fc-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.fc-stats {
  display: flex;
  gap: 20px;
}
.fc-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.fc-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #c9d6b8;
}
.fc-stat-label {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
}
.fc-easiness {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-top: 8px;
}
.fc-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(10, 12, 10, 0.5);
  color: #e8e4d8;
  font-size: 13px;
  margin-bottom: 8px;
}
.fc-row {
  display: flex;
  gap: 8px;
}
.fc-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
  color: #e8e4d8;
  background: rgba(139, 155, 122, 0.2);
}
.fc-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.fc-btn-primary {
  background: rgba(138, 154, 122, 0.35);
}
.fc-btn-again {
  background: rgba(196, 106, 90, 0.28);
}
.fc-btn-hard {
  background: rgba(224, 169, 109, 0.28);
}
.fc-btn-good {
  background: rgba(138, 154, 122, 0.35);
}
.fc-btn-easy {
  background: rgba(107, 159, 196, 0.3);
}
.fc-card {
  padding: 10px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.15);
}
.fc-card:last-child {
  border-bottom: none;
}
.fc-card-front {
  font-size: 15px;
  font-weight: 600;
  color: #e8e4d8;
}
.fc-card-back {
  font-size: 13px;
  color: #c9d6b8;
  margin-top: 4px;
}
.fc-card-hint {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.35);
  margin-top: 4px;
}
.fc-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.fc-empty {
  font-size: 13px;
  color: rgba(232, 228, 216, 0.6);
}
.fc-decks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.fc-deck-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
  background: rgba(139, 155, 122, 0.15);
  color: rgba(232, 228, 216, 0.7);
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.fc-deck-chip:hover {
  background: rgba(139, 155, 122, 0.22);
}
.fc-deck-chip.active {
  background: rgba(139, 155, 122, 0.3);
  color: #e8e4d8;
  border-color: rgba(139, 155, 122, 0.5);
}
.fc-deck-count {
  font-size: 10px;
  opacity: 0.6;
}
.fc-manage-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fc-manage-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.14);
  background: rgba(10, 12, 10, 0.35);
}
.fc-manage-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fc-manage-front {
  font-size: 13px;
  color: #e8e4d8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-manage-back {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-manage-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.fc-manage-deck {
  font-size: 10px;
  color: rgba(232, 228, 216, 0.55);
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(139, 155, 122, 0.15);
}
.fc-manage-interval {
  font-size: 10px;
  color: rgba(232, 228, 216, 0.4);
}
.fc-del-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(232, 228, 216, 0.4);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.15s;
}
.fc-del-btn:hover {
  background: rgba(196, 106, 90, 0.18);
  color: #e0a096;
}
</style>
