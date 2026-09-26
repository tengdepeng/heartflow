<template>
  <div class="kitchen-dining">
    <!-- 氛围光层 -->
    <div class="ambient-light" />

    <div class="kitchen-dining__inner">
      <!-- ===== 标题区 ===== -->
      <header class="header">
        <h1 class="header__title">深夜食堂</h1>
        <p class="header__subtitle">暖一锅人间烟火</p>
      </header>

      <!-- ===== 煲煮灵犀 ===== -->
      <section class="cooking-section">
        <div class="cooking-section__panel">
          <div class="panel-label">
            <span class="panel-label__icon">&#x1F373;</span>
            <span>煲煮灵犀</span>
          </div>

          <!-- 锅具 SVG -->
          <div class="pot-wrapper">
            <svg
              class="pot-svg"
              viewBox="0 0 160 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <!-- 锅身 -->
              <path
                d="M20 60 L30 120 L130 120 L140 60 Z"
                fill="var(--amber-800)"
                stroke="var(--amber-600)"
                stroke-width="2"
                opacity="0.9"
              />
              <!-- 锅沿 -->
              <rect x="14" y="54" width="132" height="8" rx="3"
                fill="var(--amber-600)"
                stroke="var(--amber-400)"
                stroke-width="1"
              />
              <!-- 汤面 -->
              <rect x="30" y="64" width="100" height="24" rx="2"
                fill="var(--amber-300)"
                opacity="0.6"
              >
                <animate
                  attributeName="opacity"
                  values="0.6;0.85;0.6"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </rect>
              <!-- 气泡 -->
              <circle
                v-for="(b, i) in bubblePositions"
                :key="'b' + i"
                :cx="b.cx"
                :cy="b.cy"
                r="3"
                fill="var(--amber-200)"
                opacity="0.5"
              >
                <animate
                  attributeName="cy"
                  :values="`${b.cy};${b.cy - 12};${b.cy}`"
                  dur="2s"
                  :begin="`${i * 0.4}s`"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5;0.1;0.5"
                  dur="2s"
                  :begin="`${i * 0.4}s`"
                  repeatCount="indefinite"
                />
              </circle>
              <!-- 蒸汽 -->
              <path
                v-for="(s, i) in steamPositions"
                :key="'s' + i"
                :d="s.path"
                stroke="var(--amber-200)"
                stroke-width="2"
                stroke-linecap="round"
                fill="none"
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  values="0;0.6;0"
                  dur="3s"
                  :begin="`${i * 0.6}s`"
                  repeatCount="indefinite"
                />
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0;-4,-12;0,0"
                  dur="3s"
                  :begin="`${i * 0.6}s`"
                  repeatCount="indefinite"
                />
              </path>
              <!-- 锅盖（半开） -->
              <path
                d="M10 54 L80 42 L150 54"
                fill="var(--amber-700)"
                stroke="var(--amber-500)"
                stroke-width="1.5"
                opacity="0.5"
              />
              <ellipse cx="80" cy="42" rx="8" ry="4"
                fill="var(--amber-500)"
                opacity="0.6"
              />
            </svg>
          </div>

          <!-- 灵犀炖煮进度 -->
          <div class="lingxi-progress">
            <div class="lingxi-progress__header">
              <span class="lingxi-progress__label">灵犀炖煮</span>
              <span class="lingxi-progress__value">{{ lingxiValue }}%</span>
            </div>
            <div class="lingxi-progress__track">
              <div
                class="lingxi-progress__fill"
                :style="{ width: lingxiValue + '%' }"
              />
              <div class="lingxi-progress__glow" :style="{ left: lingxiValue + '%' }" />
            </div>
          </div>

          <!-- 自动烹饪状态 -->
          <p class="cooking-status">{{ cookingStatusText }}</p>
        </div>
      </section>

      <!-- ===== 食材库存 / 饮食记录 ===== -->
      <section class="provision-section">
        <div class="provision-head">
          <div class="panel-label">
            <span class="panel-label__icon">&#x1F96B;</span>
            <span>{{ provisionTitle }}</span>
          </div>
          <div class="provision-tabs">
            <button
              class="provision-tab"
              :class="{ 'provision-tab--active': provisionTab === 0 }"
              @click="provisionTab = 0"
            >食材库存</button>
            <button
              class="provision-tab"
              :class="{ 'provision-tab--active': provisionTab === 1 }"
              @click="provisionTab = 1"
            >饮食记录</button>
          </div>
        </div>

        <!-- 食材库存（可编辑） -->
        <template v-if="provisionTab === 0">
          <div class="provision-list">
            <div
              v-for="(item, i) in provisionItems"
              :key="item.id"
              class="provision-item"
            >
              <span class="provision-item__emoji">{{ item.emoji }}</span>
              <div class="provision-item__body">
                <input
                  v-model="item.name"
                  class="provision-item__name-input"
                  placeholder="食材名"
                  @change="saveProvisions"
                />
                <input
                  v-model="item.stock"
                  class="provision-item__stock-input"
                  :class="stockLevelClass(item.stock)"
                  placeholder="库存量"
                  @change="saveProvisions"
                />
              </div>
              <button
                class="provision-item__remove"
                title="移除食材"
                @click="removeProvision(i)"
              >×</button>
            </div>
            <div v-if="provisionItems.length === 0" class="provision-empty">
              暂无食材，添置一些吧
            </div>
          </div>

          <!-- 新增食材 -->
          <div class="provision-add">
            <input
              v-model="newProvision.emoji"
              class="provision-add__emoji"
              maxlength="2"
              placeholder="🍚"
            />
            <input
              v-model="newProvision.name"
              class="provision-add__name"
              placeholder="食材名"
              @keyup.enter="addProvision"
            />
            <input
              v-model="newProvision.stock"
              class="provision-add__stock"
              placeholder="库存量"
              @keyup.enter="addProvision"
            />
            <button class="provision-add__btn" @click="addProvision">添加</button>
          </div>
        </template>

        <!-- 饮食记录（与餐厅共享） -->
        <template v-else>
          <div class="meal-list">
            <div
              v-for="meal in meals"
              :key="meal.id"
              class="meal-item"
            >
              <span class="meal-item__type" :class="mealTypeClass(meal.type)">{{ meal.type }}</span>
              <div class="meal-item__body">
                <span class="meal-item__name">{{ meal.name }}</span>
                <span v-if="meal.note" class="meal-item__note">{{ meal.note }}</span>
              </div>
              <span class="meal-item__time">{{ fmtTime(meal.at) }}</span>
              <button
                class="meal-item__remove"
                title="删除记录"
                @click="removeMeal(meal.id)"
              >×</button>
            </div>
            <div v-if="meals.length === 0" class="provision-empty">
              还没有饮食记录，吃顿好的犒劳自己
            </div>
          </div>

          <!-- 新增饮食 -->
          <div class="meal-add">
            <select v-model="newMeal.type" class="meal-add__type">
              <option v-for="t in mealTypes" :key="t" :value="t">{{ t }}</option>
            </select>
            <input
              v-model="newMeal.name"
              class="meal-add__name"
              placeholder="吃了什么"
              @keyup.enter="addMeal"
            />
            <input
              v-model="newMeal.note"
              class="meal-add__note"
              placeholder="备注（可选）"
              @keyup.enter="addMeal"
            />
            <button class="meal-add__btn" @click="addMeal">记录</button>
          </div>
        </template>
      </section>

      <!-- ===== 今日餐食（真实数据联动）===== -->
      <p class="kitchen-today-meals">
        今日已记录 <b>{{ todayMealCount }}</b> 餐 · 好好吃饭，好好生活
      </p>

      <!-- ===== 导航按钮 ===== -->
      <button
        class="nav-btn"
        @click="emit('navigate', 'dining-room')"
      >
        <span class="nav-btn__icon">&#x27A4;</span>
        <span>走向餐厅</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storage } from '../../engine/storage'

const emit = defineEmits(['navigate'])

// ---- 灵犀炖煮 ----
const lingxiValue = ref(0)
const cookingPhase = ref(0) // 0=准备, 1=炖煮中, 2=慢煨, 3=完成

const cookingStatusText = computed(() => {
  const phases = ['文火预热…', '食材入锅，心念翻涌…', '慢煨出味，灵犀渐浓…', '煲煮完成，余温尚存']
  return phases[cookingPhase.value]
})

const bubblePositions = computed(() => {
  const positions = []
  for (let i = 0; i < 6; i++) {
    positions.push({
      cx: 40 + Math.random() * 80,
      cy: 70 + Math.random() * 12,
    })
  }
  return positions
})

const steamPositions = computed(() => {
  const paths = [
    'M60 48 Q56 36 60 24',
    'M80 46 Q84 32 80 20',
    'M100 48 Q96 34 100 22',
  ]
  return paths.map((path, i) => ({
    id: i,
    path,
  }))
})

// ---- 食材库存（可编辑）----
interface ProvisionItem {
  id: string
  emoji: string
  name: string
  stock: string
}

const DEFAULT_PROVISIONS: ProvisionItem[] = [
  { id: 'p-rice', emoji: '\uD83C\uDF3E', name: '稻米', stock: '2.5 斤' },
  { id: 'p-veg', emoji: '\uD83E\uDDC4', name: '时蔬', stock: '3 份' },
  { id: 'p-chicken', emoji: '\uD83D\uDC14', name: '土鸡', stock: '半只' },
  { id: 'p-mushroom', emoji: '\uD83E\uDDA2', name: '菌菇', stock: '1 篮' },
  { id: 'p-spice', emoji: '\uD83C\uDF6B', name: '香料', stock: '5 味' },
]

const provisionTab = ref(0) // 0=食材库存, 1=饮食记录
const provisionTitle = computed(() => (provisionTab.value === 0 ? '今日食材库存' : '今日饮食记录'))

const provisionItems = ref<ProvisionItem[]>([])
const newProvision = ref({ emoji: '\uD83C\uDF3E', name: '', stock: '' })

function addProvision() {
  const name = newProvision.value.name.trim()
  if (!name) return
  provisionItems.value.push({
    id: `p-${Date.now()}`,
    emoji: newProvision.value.emoji.trim() || '\uD83C\uDF3E',
    name,
    stock: newProvision.value.stock.trim() || '—',
  })
  newProvision.value = { emoji: '\uD83C\uDF3E', name: '', stock: '' }
  saveProvisions()
}

function removeProvision(index: number) {
  provisionItems.value.splice(index, 1)
  saveProvisions()
}

function saveProvisions() {
  storage.setKV('hf:home:kitchen:provisions', provisionItems.value)
}

function stockLevelClass(stock: string) {
  const num = parseFloat(stock)
  if (isNaN(num)) return 'stock--medium'
  if (num >= 3) return 'stock--full'
  if (num >= 1) return 'stock--medium'
  return 'stock--low'
}

// ---- 饮食记录（与餐厅共享同一 KV）----
interface MealEntry {
  id: string
  type: string
  name: string
  note?: string
  at: string
}

const mealTypes = ['早餐', '午餐', '晚餐', '宵夜', '小食']
const meals = ref<MealEntry[]>([])
const newMeal = ref({ type: '晚餐', name: '', note: '' })

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
      note: newMeal.value.note.trim() || undefined,
      at: new Date().toISOString(),
    },
    ...meals.value,
  ].slice(0, 50)
  newMeal.value = { type: '晚餐', name: '', note: '' }
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

// ---- 今日餐食数（真实数据联动）----
const todayMealCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return meals.value.filter((m) => m.at.startsWith(today)).length
})

function fmtTime(iso: string) {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// ---- 模拟炖煮进度 ----
let cookingTimer: ReturnType<typeof setInterval> | null = null

function startCooking() {
  if (cookingTimer) return
  cookingTimer = setInterval(() => {
    if (lingxiValue.value < 100) {
      const increment = 1 + Math.floor(Math.random() * 3)
      lingxiValue.value = Math.min(lingxiValue.value + increment, 100)
      cookingPhase.value = lingxiValue.value < 30 ? 1 : lingxiValue.value < 70 ? 2 : 3
    } else {
      if (cookingTimer) clearInterval(cookingTimer)
      cookingTimer = null
    }
  }, 800)
}

// ---- 加载持久化数据 ----
function loadStorageData() {
  lingxiValue.value = storage.getKV<number>('hf:home:kitchen:lingxi', 0)
  provisionItems.value = storage.getKV<ProvisionItem[]>('hf:home:kitchen:provisions', DEFAULT_PROVISIONS)
  loadMeals()
}

onMounted(() => {
  loadStorageData()
  startCooking()
})

onUnmounted(() => {
  if (cookingTimer) {
    clearInterval(cookingTimer)
    cookingTimer = null
  }
  storage.setKV('hf:home:kitchen:lingxi', lingxiValue.value)
  saveProvisions()
})
</script>

<style scoped>
/* ============================================================
   深夜食堂暖琥珀主题
   深色背景 · 暖琥珀强调色 · 暖白 3500K 氛围光 (var(--amber-50))
   ============================================================ */

:root {
  --amber-50: var(--amber-50);
  --amber-100: #f5d5a0;
  --amber-200: #e8c078;
  --amber-300: #dbaa58;
  --amber-400: #cf9640;
  --amber-500: #c28130;
  --amber-600: #a66a24;
  --amber-700: #8a541c;
  --amber-800: #6e4016;
  --amber-900: #523010;
  --bg-dark: #1a1208;
  --bg-panel: #261c0e;
  --text-primary: #f5e6d0;
  --text-secondary: #c4b090;
}

.kitchen-dining {
  position: relative;
  width: 100%;
  min-height: 100%;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
  overflow: hidden;
}

/* ---- 氛围光 ---- */
.ambient-light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 50% at 50% 10%, rgba(253, 232, 200, 0.12) 0%, transparent 70%),
    radial-gradient(ellipse 40% 30% at 30% 60%, rgba(253, 232, 200, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 40% 30% at 70% 60%, rgba(253, 232, 200, 0.06) 0%, transparent 60%);
}

.kitchen-dining__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 18px 32px;
  max-width: 480px;
  margin: 0 auto;
}

/* ---- 内部区块入场错位动画 ---- */
.kitchen-dining__inner > * {
  animation: kitchen-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.kitchen-dining__inner > *:nth-child(1) { animation-delay: 0.04s; }
.kitchen-dining__inner > *:nth-child(2) { animation-delay: 0.10s; }
.kitchen-dining__inner > *:nth-child(3) { animation-delay: 0.16s; }
.kitchen-dining__inner > *:nth-child(4) { animation-delay: 0.22s; }
.kitchen-dining__inner > *:nth-child(5) { animation-delay: 0.28s; }

@keyframes kitchen-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .kitchen-dining__inner > * { animation: none; }
}

/* ============================================================
   标题
   ============================================================ */

.header {
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(194, 129, 48, 0.25);
}

.header__title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--amber-50);
  letter-spacing: 6px;
  text-shadow: 0 0 20px rgba(253, 232, 200, 0.3), 0 2px 4px rgba(0, 0, 0, 0.5);
}

.header__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 3px;
}

/* ============================================================
   面板通用
   ============================================================ */

.panel-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--amber-300);
  margin-bottom: 12px;
}

.panel-label__icon {
  font-size: 18px;
}

/* ============================================================
   煲煮灵犀
   ============================================================ */

.cooking-section__panel {
  background: var(--bg-panel);
  border: 1px solid rgba(194, 129, 48, 0.2);
  border-radius: 16px;
  padding: 20px 16px;
  box-shadow:
    inset 0 1px 0 rgba(253, 232, 200, 0.05),
    0 4px 20px rgba(0, 0, 0, 0.4);
}

/* ---- 锅具 ---- */
.pot-wrapper {
  display: flex;
  justify-content: center;
  margin: 8px 0 18px;
}

.pot-svg {
  width: 140px;
  height: 120px;
  filter: drop-shadow(0 4px 12px rgba(194, 129, 48, 0.25));
}

/* ---- 灵犀进度条 ---- */
.lingxi-progress {
  margin-top: 4px;
}

.lingxi-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.lingxi-progress__label {
  font-size: 12px;
  color: var(--text-secondary);
}

.lingxi-progress__value {
  font-size: 18px;
  font-weight: 700;
  color: var(--amber-200);
  font-variant-numeric: tabular-nums;
}

.lingxi-progress__track {
  position: relative;
  height: 6px;
  background: rgba(82, 48, 16, 0.6);
  border-radius: 3px;
  overflow: visible;
}

.lingxi-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--amber-600), var(--amber-300), var(--amber-100));
  border-radius: 3px;
  transition: width 0.6s ease;
  position: relative;
}

.lingxi-progress__glow {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(253, 232, 200, 0.6), transparent 70%);
  pointer-events: none;
  transition: left 0.6s ease;
}

/* ---- 烹饪状态 ---- */
.cooking-status {
  margin: 14px 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--amber-300);
  font-style: italic;
  letter-spacing: 1px;
  animation: status-pulse 3s ease-in-out infinite;
}

@keyframes status-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ============================================================
   食材库存
   ============================================================ */

.provision-section {
  background: var(--bg-panel);
  border: 1px solid rgba(194, 129, 48, 0.2);
  border-radius: 16px;
  padding: 20px 16px;
  box-shadow:
    inset 0 1px 0 rgba(253, 232, 200, 0.05),
    0 4px 20px rgba(0, 0, 0, 0.4);
}

.provision-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.provision-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(82, 48, 16, 0.25);
  border-radius: 10px;
  border: 1px solid rgba(194, 129, 48, 0.12);
  transition: background 0.2s;
}

.provision-item:hover {
  background: rgba(82, 48, 16, 0.45);
}

.provision-item__emoji {
  font-size: 18px;
  flex-shrink: 0;
}

.provision-item__name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
}

.provision-item__stock {
  font-size: 12px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 6px;
  background: rgba(82, 48, 16, 0.4);
}

.stock--full {
  color: var(--amber-200);
  background: rgba(219, 170, 88, 0.15);
}

.stock--medium {
  color: var(--amber-300);
  background: rgba(194, 129, 48, 0.12);
}

.stock--low {
  color: #c07050;
  background: rgba(192, 112, 80, 0.12);
}

/* ---- 库存/记录 标签切换 ---- */
.provision-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.provision-head .panel-label {
  margin-bottom: 0;
}

.provision-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(82, 48, 16, 0.4);
  border: 1px solid rgba(194, 129, 48, 0.15);
}

.provision-tab {
  padding: 5px 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.provision-tab--active {
  background: var(--amber-600);
  color: var(--amber-50);
}

.provision-tab:hover:not(.provision-tab--active) {
  color: var(--amber-200);
}

/* ---- 可编辑食材项 ---- */
.provision-item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.provision-item__name-input,
.provision-item__stock-input {
  width: 100%;
  padding: 2px 4px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.provision-item__stock-input {
  font-size: 12px;
  font-weight: 600;
}

.provision-item__name-input:focus,
.provision-item__stock-input:focus {
  outline: none;
  border-color: rgba(194, 129, 48, 0.4);
  background: rgba(82, 48, 16, 0.4);
}

.provision-item__stock-input.stock--full {
  color: var(--amber-200);
}

.provision-item__stock-input.stock--medium {
  color: var(--amber-300);
}

.provision-item__stock-input.stock--low {
  color: #c07050;
}

.provision-item__remove {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(194, 129, 48, 0.18);
  background: rgba(82, 48, 16, 0.35);
  color: rgba(245, 230, 208, 0.5);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  min-height: 24px;
  min-width: 24px;
}

.provision-item__remove:hover {
  color: #c07050;
  border-color: rgba(192, 112, 80, 0.4);
  background: rgba(192, 112, 80, 0.1);
}

.provision-empty {
  padding: 18px 0;
  text-align: center;
  font-size: 12px;
  color: rgba(196, 176, 144, 0.4);
  letter-spacing: 0.5px;
}

/* ---- 新增食材 ---- */
.provision-add {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(194, 129, 48, 0.12);
}

.provision-add__emoji {
  width: 42px;
  padding: 8px 4px;
  border-radius: 8px;
  border: 1px solid rgba(194, 129, 48, 0.15);
  background: rgba(82, 48, 16, 0.3);
  color: var(--text-primary);
  font-size: 16px;
  font-family: inherit;
  text-align: center;
}

.provision-add__name {
  flex: 1;
  min-width: 0;
}

.provision-add__stock {
  width: 84px;
}

.provision-add__name,
.provision-add__stock {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(194, 129, 48, 0.15);
  background: rgba(82, 48, 16, 0.3);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
}

.provision-add__emoji:focus,
.provision-add__name:focus,
.provision-add__stock:focus {
  outline: none;
  border-color: rgba(194, 129, 48, 0.4);
}

.provision-add__btn,
.meal-add__btn {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--amber-500);
  background: linear-gradient(135deg, var(--amber-700), var(--amber-600));
  color: var(--amber-50);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.provision-add__btn:hover,
.meal-add__btn:hover {
  background: linear-gradient(135deg, var(--amber-600), var(--amber-500));
}

/* ---- 饮食记录列表 ---- */
.meal-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meal-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(82, 48, 16, 0.25);
  border: 1px solid rgba(194, 129, 48, 0.12);
}

.meal-item__type {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--amber-50);
  background: rgba(194, 129, 48, 0.25);
}

.meal-type--breakfast { background: rgba(219, 170, 88, 0.3); }
.meal-type--lunch { background: rgba(194, 129, 48, 0.3); }
.meal-type--dinner { background: rgba(160, 106, 36, 0.35); }
.meal-type--midnight { background: rgba(138, 84, 28, 0.4); }
.meal-type--snack { background: rgba(224, 196, 150, 0.2); }

.meal-item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.meal-item__name {
  font-size: 13px;
  color: var(--text-primary);
}

.meal-item__note {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meal-item__time {
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(194, 129, 48, 0.4);
  font-variant-numeric: tabular-nums;
}

.meal-item__remove {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(194, 129, 48, 0.18);
  background: rgba(82, 48, 16, 0.35);
  color: rgba(245, 230, 208, 0.5);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.meal-item__remove:hover {
  color: #c07050;
  border-color: rgba(192, 112, 80, 0.4);
  background: rgba(192, 112, 80, 0.1);
}

/* ---- 新增饮食 ---- */
.meal-add {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(194, 129, 48, 0.12);
}

.meal-add__type {
  flex-shrink: 0;
  padding: 8px 6px;
  border-radius: 8px;
  border: 1px solid rgba(194, 129, 48, 0.15);
  background: rgba(82, 48, 16, 0.3);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
}

.meal-add__name {
  flex: 1;
  min-width: 0;
}

.meal-add__note {
  width: 90px;
}

.meal-add__name,
.meal-add__note {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(194, 129, 48, 0.15);
  background: rgba(82, 48, 16, 0.3);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
}

.meal-add__type:focus,
.meal-add__name:focus,
.meal-add__note:focus {
  outline: none;
  border-color: rgba(194, 129, 48, 0.4);
}

/* ============================================================
   导航按钮
   ============================================================ */

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 0;
  background: linear-gradient(135deg, var(--amber-700), var(--amber-600));
  border: 1px solid var(--amber-500);
  border-radius: 12px;
  color: var(--amber-50);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 12px rgba(194, 129, 48, 0.2);
  font-family: inherit;
}

.nav-btn:hover {
  background: linear-gradient(135deg, var(--amber-600), var(--amber-500));
  box-shadow: 0 4px 20px rgba(194, 129, 48, 0.35);
  transform: translateY(-1px);
}

.nav-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 6px rgba(194, 129, 48, 0.2);
}

.nav-btn__icon {
  font-size: 18px;
  transition: transform 0.2s;
}

.nav-btn:hover .nav-btn__icon {
  transform: translateX(4px);
}

/* ---- 今日餐食提示 ---- */
.kitchen-today-meals {
  margin: 0;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.5px;
  color: rgba(194, 129, 48, 0.5);
}

.kitchen-today-meals b {
  color: var(--amber-200);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ============================================================
   响应式
   ============================================================ */

@media (min-width: 600px) {
  .kitchen-dining__inner {
    padding: 32px 24px 40px;
  }

  .header__title {
    font-size: 34px;
  }

  .provision-list {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .pot-svg {
    width: 160px;
    height: 138px;
  }
}
</style>