<template>
  <div class="dining-room">
    <!-- 氛围背景 -->
    <div class="dining-atmos">
      <div class="atmos-table-glow"></div>
      <div class="atmos-corner-warm"></div>
    </div>

    <header class="dining-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <h1 class="dining-title">餐厅</h1>
      <p class="dining-subtitle">深夜食堂 · 围桌而坐</p>
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
    </header>

    <!-- 餐桌意象 -->
    <section class="table-section spatial-section">
      <div class="table-visual">
        <div class="table-surface">
          <div class="table-grain"></div>
          <div class="table-candle" v-for="n in 3" :key="'candle-' + n" :style="{ '--candle-delay': (n * 0.3) + 's' }">
            <div class="candle-flame">
              <div class="flame-core"></div>
              <div class="flame-aura"></div>
            </div>
            <div class="candle-body"></div>
          </div>
        </div>
      </div>
      <div class="table-poem">
        <p>「深夜的餐桌，是心的归处。」</p>
        <p class="poem-sub">一碗热汤，几句闲话，便是最好的治愈。</p>
      </div>
    </section>

    <!-- 今日餐桌 -->
    <section class="today-table spatial-section">
      <h3 class="section-label">今日餐桌</h3>
      <div class="today-card">
        <div class="today-kitchen-link">
          <span class="today-icon">🍲</span>
          <div class="today-info">
            <span class="today-title">灵犀炖煮</span>
            <span class="today-desc">厨房里正在慢炖的思绪，即将端上桌来</span>
          </div>
          <button class="today-go-btn" @click="navigateTo('kitchen')">去厨房看看</button>
        </div>
      </div>

      <!-- 今日笔记馈赠 -->
      <div class="table-notes" v-if="recentNotes.length > 0">
        <div class="note-card" v-for="note in recentNotes" :key="note.id">
          <span class="note-time">{{ fmtDate(note.createdAt) }}</span>
          <span class="note-title">{{ note.title || '无标题笔记' }}</span>
          <span class="note-excerpt">{{ excerpt(note.content) }}</span>
        </div>
      </div>
      <div v-else class="table-empty">
        <span class="empty-icon">🍽</span>
        <p>今日餐桌尚空，去写点什么吧</p>
      </div>

      <!-- 今日餐食（与厨房共享） -->
      <div class="table-meals">
        <div class="meals-head">
          <span class="meals-label">今日餐食</span>
          <span class="meals-count">{{ todayMeals.length }}</span>
        </div>
        <div v-if="todayMeals.length" class="meals-list">
          <div v-for="meal in todayMeals" :key="meal.id" class="meal-chip">
            <span class="meal-chip__type" :class="mealTypeClass(meal.type)">{{ meal.type }}</span>
            <span class="meal-chip__name">{{ meal.name }}</span>
            <button class="meal-chip__remove" title="移除" @click="removeMeal(meal.id)">×</button>
          </div>
        </div>
        <div class="meal-add-row">
          <select v-model="newMeal.type" class="meal-add-row__type">
            <option v-for="t in mealTypes" :key="t" :value="t">{{ t }}</option>
          </select>
          <input
            v-model="newMeal.name"
            class="meal-add-row__input"
            placeholder="记下今天的味道"
            @keyup.enter="addMeal"
          />
          <button class="meal-add-row__btn" @click="addMeal">记下</button>
        </div>
      </div>

      <p class="dining-week-meals">近 7 日共 <b>{{ weekMealCount }}</b> 餐 · 烟火长续</p>
    </section>

    <!-- 访客说明 -->
    <section class="guest-section spatial-section">
      <h3 class="section-label">访客可见</h3>
      <div class="guest-info-card">
        <span class="guest-info-icon">👥</span>
        <div class="guest-info-text">
          <p>餐厅是家中开放的公共空间。</p>
          <p class="guest-info-sub">开启访客模式后，客人可以在此与你共坐。</p>
        </div>
      </div>
    </section>

    <!-- 导航 -->
    <section class="nav-section spatial-section">
      <h3 class="section-label">走向</h3>
      <div class="nav-grid">
        <button class="nav-btn" @click="navigateTo('kitchen')">
          <span class="nav-icon">🍳</span>
          <span class="nav-label">走向厨房</span>
        </button>
        <button class="nav-btn" @click="navigateTo('living-room')">
          <span class="nav-icon">🛋</span>
          <span class="nav-label">走向客厅</span>
        </button>
        <button class="nav-btn" @click="navigateTo('yard')">
          <span class="nav-icon">🌿</span>
          <span class="nav-label">走向庭院</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { getLocalDateKey } from '../../utils/time'
import { computed, ref, onMounted } from 'vue'
import { storage } from '../../engine/storage'

const emit = defineEmits<{
  navigate: [roomId: string]
}>()

// ---- 今日笔记 ----
interface NoteRecord {
  id: string
  title?: string
  content?: string
  createdAt: string
  tags?: string[]
}

const recentNotes = computed<NoteRecord[]>(() => {
  const notes = storage.getNotes()
  const today = getLocalDateKey()
  return notes
    .filter((n: NoteRecord) => !!n.createdAt && getLocalDateKey(new Date(n.createdAt)) === today)
    .slice(0, 3)
})

// ---- 今日餐食（与厨房共享同一 KV）----
interface MealEntry {
  id: string
  type: string
  name: string
  note?: string
  at: string
}

const mealTypes = ['早餐', '午餐', '晚餐', '宵夜', '小食']
const meals = ref<MealEntry[]>([])
const newMeal = ref({ type: '晚餐', name: '' })

const todayMeals = computed<MealEntry[]>(() => {
  const today = getLocalDateKey()
  return meals.value
    .filter((m) => m.at.startsWith(today))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
})

function loadMeals() {
  meals.value = storage.getKV<MealEntry[]>('hf:home:meals', [])
}

function addMeal() {
  const name = newMeal.value.name.trim()
  if (!name) return
  meals.value = [
    {
      id: `m-${Date.now()}`,
      type: newMeal.value.type,
      name,
      at: new Date().toISOString(),
    },
    ...meals.value,
  ].slice(0, 50)
  newMeal.value = { type: '晚餐', name: '' }
  storage.setKV('hf:home:meals', meals.value)
}

function removeMeal(id: string) {
  meals.value = meals.value.filter((m) => m.id !== id)
  storage.setKV('hf:home:meals', meals.value)
}

function mealTypeClass(type: string) {
  const map: Record<string, string> = {
    早餐: 'meal-type--breakfast',
    午餐: 'meal-type--lunch',
    晚餐: 'meal-type--dinner',
    宵夜: 'meal-type--midnight',
    小食: 'meal-type--snack',
  }
  return map[type] ?? 'meal-type--snack'
}

function excerpt(content?: string): string {
  if (!content) return ''
  return content.length > 60 ? content.slice(0, 60) + '…' : content
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// ---- 导航 ----
function navigateTo(roomId: string) {
  emit('navigate', roomId)
}

// ---- 近 7 日餐食数（真实数据联动）----
const weekMealCount = computed(() => {
  const all = storage.getKV<MealEntry[]>('hf:home:meals', [])
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  weekAgo.setHours(0, 0, 0, 0)
  return all.filter((m) => new Date(m.at) >= weekAgo).length
})

onMounted(() => {
  loadMeals()
})
</script>

<style scoped>
/* ============================================================
   深夜食堂暖琥珀主题 · 餐厅
   暖橙 3000K · 餐桌意象 · 围桌而坐
   ============================================================ */

/* ---- 布局 ---- */
.dining-room {
  position: relative;
  max-width: 860px;
  margin: 0 auto;
  padding: 48px 32px 100px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* ---- 内部区块入场错位动画 ---- */
.dining-room > section {
  animation: dining-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.dining-room > section:nth-of-type(1) { animation-delay: 0.04s; }
.dining-room > section:nth-of-type(2) { animation-delay: 0.10s; }
.dining-room > section:nth-of-type(3) { animation-delay: 0.16s; }
.dining-room > section:nth-of-type(4) { animation-delay: 0.22s; }

@keyframes dining-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .dining-room > section { animation: none; }
}

/* ---- 氛围背景 ---- */
.dining-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.atmos-table-glow {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70%;
  height: 60%;
  background: radial-gradient(
    ellipse at 50% 60%,
    rgba(252, 200, 140, 0.06) 0%,
    rgba(var(--accent-rgb), 0.03) 30%,
    transparent 65%
  );
  animation: dining-breathe 8s ease-in-out infinite;
}

.atmos-corner-warm {
  position: absolute;
  bottom: -5%;
  right: -5%;
  width: 50%;
  height: 45%;
  background: radial-gradient(
    ellipse at center,
    rgba(252, 180, 120, 0.03) 0%,
    transparent 60%
  );
  animation: dining-breathe 10s ease-in-out infinite 3s;
}

@keyframes dining-breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* ---- 头部 ---- */
.dining-header {
  text-align: center;
  position: relative;
  z-index: 1;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 0;
}

.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.25),
    transparent
  );
}

.orn-diamond {
  font-size: 9px;
  color: var(--accent);
  opacity: 0.4;
}

.dining-title {
  font-size: 28px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-high);
  margin: 0;
}

.dining-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 8px 0 0;
  letter-spacing: 1px;
}

/* ---- 通用 section ---- */
.section-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0 0 16px;
  letter-spacing: 0.5px;
}

.spatial-section {
  position: relative;
  z-index: 1;
}

/* ---- 餐桌意象 ---- */
.table-section {
  text-align: center;
}

.table-visual {
  position: relative;
  height: 160px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-bottom: 20px;
}

.table-surface {
  position: relative;
  width: 320px;
  height: 50px;
  border-radius: 6px;
  background: linear-gradient(
    180deg,
    rgba(140, 100, 60, 0.3) 0%,
    rgba(100, 70, 40, 0.35) 40%,
    rgba(60, 42, 24, 0.4) 100%
  );
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(var(--accent-rgb), 0.08);
}

.table-grain {
  position: absolute;
  inset: 4px;
  border-radius: 3px;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 12px,
    rgba(var(--accent-rgb), 0.03) 12px,
    rgba(var(--accent-rgb), 0.03) 13px
  );
}

.table-candle {
  position: absolute;
  bottom: 100%;
  transform: translateX(-50%);
}

.table-candle:nth-child(1) { left: 25%; }
.table-candle:nth-child(2) { left: 50%; }
.table-candle:nth-child(3) { left: 75%; }

.candle-flame {
  position: relative;
  width: 14px;
  height: 24px;
  margin: 0 auto;
}

.flame-core {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 16px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: radial-gradient(
    ellipse at 50% 30%,
    rgba(255, 240, 200, 0.9) 0%,
    rgba(252, 180, 80, 0.6) 50%,
    transparent 100%
  );
  animation: candle-flicker 2s ease-in-out infinite var(--candle-delay, 0s);
}

.flame-aura {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at 50% 30%,
    rgba(252, 200, 120, 0.15) 0%,
    transparent 70%
  );
  animation: candle-aura 2s ease-in-out infinite var(--candle-delay, 0s);
}

.candle-body {
  width: 6px;
  height: 20px;
  margin: 0 auto;
  background: linear-gradient(
    180deg,
    rgba(220, 200, 160, 0.5) 0%,
    rgba(180, 160, 120, 0.4) 100%
  );
  border-radius: 1px;
}

@keyframes candle-flicker {
  0%, 100% { opacity: 0.8; transform: translateX(-50%) scaleY(1); }
  25% { opacity: 1; transform: translateX(-50%) scaleY(1.05); }
  50% { opacity: 0.7; transform: translateX(-50%) scaleY(0.95); }
  75% { opacity: 0.9; transform: translateX(-50%) scaleY(1.02); }
}

@keyframes candle-aura {
  0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.3); }
}

.table-poem {
  margin-top: 8px;
}

.table-poem p {
  font-size: 15px;
  color: rgba(var(--text-primary-rgb), 0.65);
  margin: 0;
  line-height: 1.8;
  letter-spacing: 0.5px;
}

.poem-sub {
  font-size: 12px !important;
  color: var(--text-low) !important;
  margin-top: 4px !important;
}

/* ---- 今日餐桌 ---- */
.today-card {
  border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  padding: 20px;
  margin-bottom: 16px;
}

.today-kitchen-link {
  display: flex;
  align-items: center;
  gap: 14px;
}

.today-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.today-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.today-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
}

.today-desc {
  font-size: 12px;
  color: var(--text-low);
  line-height: 1.5;
}

.today-go-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}

.today-go-btn:hover {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.3);
  transform: translateY(-1px);
}

/* ---- 笔记卡片 ---- */
.table-notes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  transition: all 0.25s ease;
}

.note-card:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.note-time {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  width: 36px;
}

.note-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.75);
  flex-shrink: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-excerpt {
  font-size: 12px;
  color: var(--text-low);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.table-empty {
  text-align: center;
  padding: 32px 0;
  color: rgba(var(--text-primary-rgb), 0.25);
  font-size: 13px;
}

.empty-icon {
  font-size: 28px;
  display: block;
  margin-bottom: 8px;
  opacity: 0.5;
}

/* ---- 今日餐食 ---- */
.table-meals {
  margin-top: 16px;
  border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  padding: 18px 20px;
}

.meals-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.meals-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
}

.meals-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  border-radius: 999px;
  padding: 1px 9px;
  font-variant-numeric: tabular-nums;
}

.meals-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.meal-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.meal-chip__type {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 6px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.12);
}

.meal-chip__name {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.8);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meal-chip__remove {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.3);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  min-height: 24px;
  min-width: 24px;
}

.meal-chip__remove:hover {
  color: #c07050;
}

.meal-add-row {
  display: flex;
  gap: 8px;
}

.meal-add-row__type {
  flex-shrink: 0;
  padding: 8px 6px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--accent-rgb), 0.04);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 12px;
  font-family: inherit;
}

.meal-add-row__input {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--accent-rgb), 0.04);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 13px;
  font-family: inherit;
}

.meal-add-row__input::placeholder {
  color: rgba(var(--text-primary-rgb), 0.25);
}

.meal-add-row__type:focus,
.meal-add-row__input:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.3);
}

.meal-add-row__btn {
  flex-shrink: 0;
  padding: 8px 18px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.meal-add-row__btn:hover {
  background: rgba(var(--accent-rgb), 0.14);
}

/* ---- 近 7 日餐食提示 ---- */
.dining-week-meals {
  margin: 0;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.5px;
  color: rgba(var(--text-primary-rgb), 0.3);
}

.dining-week-meals b {
  color: var(--accent);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ---- 访客说明 ---- */
.guest-info-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.guest-info-icon {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.guest-info-text p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.7;
}

.guest-info-sub {
  color: var(--text-secondary) !important;
  margin-top: 4px !important;
}

/* ---- 导航 ---- */
.nav-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px;
  border-radius: 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
}

.nav-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.2);
  transform: translateY(-2px);
}

.nav-icon {
  font-size: 32px;
  line-height: 1;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 0.5px;
}

/* ---- 响应式 ---- */
@media (max-width: 860px) {
  .dining-room {
    padding: 28px 20px 100px;
    gap: 32px;
  }

  .table-surface {
    width: 260px;
  }

  .dining-title {
    font-size: 24px;
  }

  .header-ornament {
    gap: 8px;
  }

  .orn-line {
    width: 40px;
  }
}

@media (max-width: 640px) {
  .dining-room {
    padding: 20px 14px 90px;
    gap: 24px;
  }

  .dining-header {
    padding-top: 40px;
  }

  .dining-title {
    font-size: 20px;
    letter-spacing: 2px;
  }

  .dining-subtitle {
    font-size: 11px;
  }

  .header-ornament {
    gap: 6px;
  }

  .orn-line {
    width: 28px;
  }

  .orn-diamond {
    font-size: 7px;
  }

  .table-surface {
    width: 220px;
    height: 40px;
  }

  .table-visual {
    height: 120px;
  }

  .table-poem p {
    font-size: 13px;
  }

  .today-kitchen-link {
    flex-wrap: wrap;
  }

  .today-go-btn {
    width: 100%;
    text-align: center;
  }

  .nav-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .nav-btn {
    padding: 18px 8px;
  }

  .nav-icon {
    font-size: 26px;
  }

  .nav-label {
    font-size: 12px;
  }

  .note-card {
    flex-wrap: wrap;
  }
}
</style>