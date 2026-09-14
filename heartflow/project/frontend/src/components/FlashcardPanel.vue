<template>
  <section class="flashcard-panel">
    <div class="fc-head">
      <h3 class="fc-title">闪卡复习 · SM-2</h3>
      <span class="fc-stats" v-if="stats.total > 0">
        共 {{ stats.total }} 张 · 待复习 {{ stats.due }} · 新卡 {{ stats.newCards }}
      </span>
    </div>

    <!-- 添加闪卡 -->
    <div class="fc-add">
      <input v-model="frontInput" class="fc-input" placeholder="正面（问题）…" @keyup.enter="addCard" />
      <input v-model="backInput" class="fc-input" placeholder="背面（答案）…" @keyup.enter="addCard" />
      <input v-model="deckInput" class="fc-input fc-input--deck" placeholder="牌组（默认）…" @keyup.enter="addCard" />
      <button class="fc-btn" @click="addCard">添加</button>
    </div>

    <!-- 复习区 -->
    <div v-if="currentCard" class="fc-review">
      <div class="fc-card" :class="{ flipped: showBack }" @click="showBack = !showBack">
        <div class="fc-card-face fc-front">
          <span class="fc-face-label">正面</span>
          <p class="fc-face-text">{{ currentCard.front }}</p>
        </div>
        <div class="fc-card-face fc-back">
          <span class="fc-face-label">背面</span>
          <p class="fc-face-text">{{ currentCard.back }}</p>
        </div>
      </div>
      <div v-if="showBack" class="fc-quality-row">
        <button v-for="q in qualityOptions" :key="q.value" class="fc-quality" @click="rate(q.value)">
          {{ q.label }}
        </button>
      </div>
      <p v-else class="fc-hint">点卡片翻面</p>
    </div>
    <p v-else-if="stats.total === 0" class="fc-empty">还没有闪卡，先添加一张吧。</p>
    <p v-else class="fc-empty">今日复习完成，暂无到期卡片。</p>

    <!-- 牌组筛选 -->
    <div v-if="deckList.length > 0" class="fc-decks">
      <button
        v-for="d in deckList"
        :key="d"
        class="fc-deck"
        :class="{ active: deckFilter === d }"
        @click="deckFilter = d"
      >
        {{ d }}<span class="fc-deck-count">{{ cardsInDeck(d).length }}</span>
      </button>
    </div>

    <!-- 卡片列表 -->
    <div v-if="visibleCards.length > 0" class="fc-list">
      <div v-for="c in visibleCards" :key="c.id" class="fc-list-item">
        <div class="fc-list-text">
          <span class="fc-list-front">{{ c.front }}</span>
          <span class="fc-list-back">{{ c.back }}</span>
        </div>
        <span class="fc-list-meta">
          <span class="fc-list-deck">{{ c.deck }}</span>
          <span class="fc-list-interval">{{ c.sm2.interval }}天</span>
        </span>
        <button class="fc-del" @click="removeCard(c.id)" title="删除">×</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFlashcards } from '../modules/knowledge/spaced-repetition'
import type { Flashcard, Sm2Quality } from '../modules/knowledge/spaced-repetition'

const api = useFlashcards()
const frontInput = ref('')
const backInput = ref('')
const deckInput = ref('')
const showBack = ref(false)
const currentCard = ref<Flashcard | null>(null)
const deckFilter = ref('全部')

const stats = computed(() => api.stats())

const qualityOptions: { value: Sm2Quality; label: string }[] = [
  { value: 0, label: '完全忘记' },
  { value: 3, label: '勉强想起' },
  { value: 4, label: '记得' },
  { value: 5, label: '轻松' },
]

const allCards = computed(() => api.load())
const deckList = computed(() => ['全部', ...api.decks()])
const visibleCards = computed(() =>
  deckFilter.value === '全部'
    ? allCards.value
    : allCards.value.filter((c) => c.deck === deckFilter.value),
)

function cardsInDeck(deck: string) {
  return deck === '全部' ? allCards.value : allCards.value.filter((c) => c.deck === deck)
}

function addCard() {
  const front = frontInput.value.trim()
  const back = backInput.value.trim()
  if (!front || !back) return
  api.add(front, back, deckInput.value.trim() || '默认')
  frontInput.value = ''
  backInput.value = ''
  nextCard()
}

function removeCard(id: string) {
  api.remove(id)
  if (currentCard.value?.id === id) nextCard()
}

function nextCard() {
  const due = api.dueCards()
  currentCard.value = due.length ? due[0] : null
  showBack.value = false
}

function rate(q: Sm2Quality) {
  if (!currentCard.value) return
  api.review(currentCard.value.id, q)
  nextCard()
}

onMounted(nextCard)
</script>

<style scoped>
.flashcard-panel {
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--card-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}
.fc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.fc-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb), 0.75);
}
.fc-stats {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
}
.fc-add {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.fc-input {
  flex: 1;
  min-width: 120px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(0, 0, 0, 0.2);
  color: rgba(var(--accent-rgb), 0.8);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.fc-input--deck {
  flex: 0 0 100px;
  min-width: 90px;
}
.fc-input:focus {
  border-color: rgba(var(--accent-rgb), 0.35);
}
.fc-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.fc-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
}
.fc-review {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}
.fc-card {
  width: 100%;
  min-height: 120px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
  position: relative;
  transition: transform 0.3s;
}
.fc-card.flipped {
  transform: rotateY(180deg);
}
.fc-card-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.fc-back {
  transform: rotateY(180deg);
}
.fc-face-label {
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.35);
}
.fc-face-text {
  margin: 0;
  font-size: 15px;
  color: rgba(var(--accent-rgb), 0.85);
  text-align: center;
  line-height: 1.6;
  word-break: break-word;
}
.fc-quality-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.fc-quality {
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.6);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.fc-quality:hover {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}
.fc-hint {
  margin: 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.3);
}
.fc-empty {
  margin: 0;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.35);
  text-align: center;
  padding: 10px 0;
}
.fc-decks {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 12px 0 10px;
}
.fc-deck {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.fc-deck.active {
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.3);
}
.fc-deck-count {
  font-size: 10px;
  opacity: 0.6;
}
.fc-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.fc-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(0, 0, 0, 0.15);
}
.fc-list-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fc-list-front {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-list-back {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-list-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.fc-list-deck {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.35);
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}
.fc-list-interval {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.3);
}
.fc-del {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.3);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
.fc-del:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
</style>
