<script setup lang="ts">
// ============================================================
// 时间长廊 · 历史上的今天面板（INCR-510）
// 展示「今日历史事件」，支持分类筛选 / 关键词搜索 / 按日期浏览 /
// 随机一桩 / 收藏。数据纯本地静态库，零网络。
// ============================================================
import { ref, computed } from 'vue'
import {
  eventsOn,
  eventsByCategory,
  searchEvents,
  pickRandom,
  formatYear,
  useOnThisDay,
  HISTORY_EVENTS,
  HISTORY_CATEGORIES,
} from '../modules/on-this-day/on-this-day'
import type { HistoryEvent } from '../modules/on-this-day/on-this-day'

const { isFav, toggleFav, favEvents } = useOnThisDay()

const now = new Date()
const month = ref(now.getMonth() + 1)
const day = ref(now.getDate())
const category = ref('')
const query = ref('')
const randomPick = ref<HistoryEvent | null>(null)
const showFavs = ref(false)

const isToday = computed(() => {
  const n = new Date()
  return month.value === n.getMonth() + 1 && day.value === n.getDate()
})

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const dayOptions = computed(() => {
  const days = new Date(2024, month.value, 0).getDate()
  return Array.from({ length: days }, (_, i) => i + 1)
})

const list = computed<HistoryEvent[]>(() => {
  if (randomPick.value) return [randomPick.value]
  if (category.value) return eventsByCategory(category.value as never)
  if (query.value.trim()) return searchEvents(query.value)
  return eventsOn(month.value, day.value)
})

const listTitle = computed(() => {
  if (randomPick.value) return '随机一桩'
  if (category.value) return `分类 · ${category.value}`
  if (query.value.trim()) return `搜索 · ${query.value.trim()}`
  return isToday.value ? '今日历史事件' : `${month.value} 月 ${day.value} 日`
})

function onDayChange(): void {
  randomPick.value = null
}

function clearFilters(): void {
  category.value = ''
  query.value = ''
  randomPick.value = null
  const n = new Date()
  month.value = n.getMonth() + 1
  day.value = n.getDate()
}

function rollRandom(): void {
  category.value = ''
  query.value = ''
  randomPick.value = pickRandom(HISTORY_EVENTS)
}
</script>

<template>
  <section class="otd-panel">
    <header class="otd-head">
      <div>
        <span class="otd-kicker">时间长廊 · 今日</span>
        <h3 class="otd-title">历史上的今天</h3>
      </div>
      <span class="otd-date">{{ now.getFullYear() }} 年 {{ month }} 月 {{ day }} 日</span>
    </header>

    <div class="otd-controls">
      <select class="otd-select" :value="month" aria-label="月份" @change="month = Number(($event.target as HTMLSelectElement).value); onDayChange()">
        <option v-for="m in monthOptions" :key="m" :value="m">{{ m }} 月</option>
      </select>
      <select class="otd-select" :value="day" aria-label="日期" @change="day = Number(($event.target as HTMLSelectElement).value); onDayChange()">
        <option v-for="d in dayOptions" :key="d" :value="d">{{ d }} 日</option>
      </select>
      <button class="otd-btn" type="button" @click="rollRandom">🎲 随机一桩</button>
      <button class="otd-btn" type="button" :class="{ 'is-active': showFavs }" @click="showFavs = !showFavs">
        ★ 收藏 {{ favEvents.length }}
      </button>
    </div>

    <div class="otd-chips">
      <button class="otd-chip" :class="{ 'is-active': !category }" type="button" @click="category = ''; randomPick = null">全部</button>
      <button
        v-for="c in HISTORY_CATEGORIES"
        :key="c"
        class="otd-chip"
        :class="{ 'is-active': category === c }"
        type="button"
        @click="category = c; randomPick = null"
      >{{ c }}</button>
    </div>

    <input
      v-model="query"
      class="otd-search"
      type="search"
      placeholder="搜索历史事件关键词…"
      @input="randomPick = null"
    />

    <!-- 收藏夹 -->
    <div v-if="showFavs" class="otd-favs">
      <p v-if="favEvents.length === 0" class="otd-empty">还没有收藏的历史事件。</p>
      <div v-for="e in favEvents" :key="'fav-' + e.id" class="otd-item is-fav">
        <span class="otd-year">{{ formatYear(e.year) }}</span>
        <span class="otd-text">{{ e.title }}</span>
        <button class="otd-star is-on" type="button" aria-label="取消收藏" @click="toggleFav(e.id)">★</button>
      </div>
    </div>

    <!-- 事件列表 -->
    <div v-else class="otd-list">
      <div class="otd-list-head">
        <span>{{ listTitle }}</span>
        <button v-if="category || query || randomPick" class="otd-clear" type="button" @click="clearFilters">清除筛选</button>
      </div>
      <p v-if="list.length === 0" class="otd-empty">这一天暂未收录历史事件，换个日期或试试「随机一桩」。</p>
      <div v-for="e in list" :key="e.id" class="otd-item">
        <span class="otd-year">{{ formatYear(e.year) }}</span>
        <span class="otd-text">{{ e.title }}</span>
        <span class="otd-cat">{{ e.category }}</span>
        <button
          class="otd-star"
          :class="{ 'is-on': isFav(e.id) }"
          type="button"
          :aria-label="isFav(e.id) ? '取消收藏' : '收藏'"
          @click="toggleFav(e.id)"
        >★</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.otd-panel {
  margin: 16px 24px 0;
  padding: 14px 16px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.otd-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.otd-kicker { font-size: 11px; letter-spacing: 0.14em; color: rgba(var(--accent-rgb), 0.5); }
.otd-title { margin: 2px 0 0; font-size: 14px; font-weight: 500; color: var(--accent); letter-spacing: 1px; }
.otd-date { font-size: 12px; color: rgba(var(--accent-rgb), 0.55); font-variant-numeric: tabular-nums; }

.otd-controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.otd-select {
  padding: 5px 8px;
  border-radius: 7px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text, #e8e4dc);
  font-size: 12px;
  font-family: inherit;
}
.otd-btn {
  padding: 5px 12px;
  border-radius: 7px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--accent-rgb), 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.otd-btn:hover { border-color: rgba(var(--accent-rgb), 0.35); }
.otd-btn.is-active { background: rgba(var(--accent-rgb), 0.14); border-color: var(--accent); }

.otd-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.otd-chip {
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.6);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.otd-chip:hover { border-color: rgba(var(--accent-rgb), 0.3); }
.otd-chip.is-active { background: rgba(var(--accent-rgb), 0.12); border-color: var(--accent); color: var(--accent); }

.otd-search {
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text, #e8e4dc);
  font-size: 12px;
  font-family: inherit;
  box-sizing: border-box;
  margin-bottom: 10px;
}
.otd-search:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.35); }

.otd-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.otd-clear {
  font-size: 11px;
  font-family: inherit;
  border: none;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  cursor: pointer;
}
.otd-clear:hover { color: var(--accent); }

.otd-empty { font-size: 12px; color: rgba(var(--accent-rgb), 0.4); padding: 8px 0; margin: 0; }

.otd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  margin-bottom: 6px;
  font-size: 12px;
}
.otd-item.is-fav { border-color: rgba(var(--accent-rgb), 0.2); }
.otd-year {
  flex-shrink: 0;
  min-width: 76px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}
.otd-text { flex: 1; color: rgba(255, 255, 255, 0.72); line-height: 1.5; }
.otd-cat {
  flex-shrink: 0;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 5px;
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.7);
}
.otd-star {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.18);
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
  transition: color 0.2s;
}
.otd-star:hover { color: rgba(var(--accent-rgb), 0.6); }
.otd-star.is-on { color: #d4b872; }

.otd-favs { display: flex; flex-direction: column; }
</style>
