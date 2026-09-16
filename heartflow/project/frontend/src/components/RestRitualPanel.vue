<template>
  <div class="ritual-panel">
    <!-- ===== 仪式分类 ===== -->
    <section data-enter class="rest-section">
      <h3 class="section-label">休息仪式</h3>
      <div class="ritual-categories">
        <button
          v-for="(meta, key) in RITUAL_CATEGORY_META"
          :key="key"
          class="ritual-cat-btn"
          :class="{ 'ritual-cat-btn--active': activeCategory === key }"
          @click="activeCategory = key as RitualCategory"
        >
          <span class="rcb-icon">{{ meta.icon }}</span>
          <span class="rcb-label">{{ meta.label }}</span>
        </button>
      </div>
    </section>

    <!-- ===== 当前分类仪式列表 ===== -->
    <section data-enter class="rest-section">
      <div class="ritual-list">
        <div
          v-for="ritual in filteredRituals"
          :key="ritual.id"
          class="ritual-card"
          :class="{ 'ritual-card--active': activeRitual?.id === ritual.id }"
          @click="selectRitual(ritual)"
        >
          <div class="rc-header">
            <span class="rc-name">{{ ritual.name }}</span>
            <span class="rc-count" v-if="ritual.executionCount > 0">{{ ritual.executionCount }}次</span>
          </div>
          <p class="rc-desc">{{ ritual.description }}</p>
          <div class="rc-meta">
            <span class="rc-duration">{{ ritual.totalDuration }}分钟</span>
            <span class="rc-recovery">恢复 {{ ritual.expectedRecovery }}%</span>
          </div>
          <div class="rc-tags">
            <span v-for="tag in ritual.tags" :key="tag" class="rc-tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 仪式步骤可视化 ===== -->
    <section v-if="activeRitual" data-enter class="rest-section">
      <h3 class="section-label">
        {{ activeRitual.name }} · 步骤
        <button class="ritual-execute-btn" @click="executeRitual">
          ▶ 开始执行
        </button>
      </h3>
      <div class="ritual-steps">
        <div
          v-for="(step, idx) in activeRitual.steps"
          :key="idx"
          class="ritual-step"
          :class="{
            'ritual-step--active': executingStep === idx,
            'ritual-step--done': executingStep > idx,
          }"
        >
          <div class="rs-connector">
            <div class="rs-dot"></div>
            <div v-if="idx < activeRitual.steps.length - 1" class="rs-line"></div>
          </div>
          <div class="rs-content">
            <div class="rs-header">
              <span class="rs-order">步骤 {{ step.order }}</span>
              <span class="rs-duration">{{ step.durationMinutes }}分钟</span>
            </div>
            <span class="rs-action">{{ step.action }}</span>
            <p class="rs-desc">{{ step.description }}</p>
            <span v-if="step.soundscape" class="rs-soundscape">
              🎵 {{ soundscapeLabel(step.soundscape) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 植物生长可视化 ===== -->
    <section data-enter class="rest-section">
      <h3 class="section-label">植被花园</h3>
      <div class="ritual-garden">
        <div
          v-for="plant in plants"
          :key="plant.plantId"
          class="garden-plant"
          :class="{ 'garden-plant--blooming': plant.isBlooming }"
        >
          <div class="gp-visual">
            <span class="gp-emoji">{{ getPlantEmoji(plant) }}</span>
            <div class="gp-progress-track">
              <div
                class="gp-progress-fill"
                :style="{ width: plant.health + '%', background: getPlantColor(plant) }"
              ></div>
            </div>
          </div>
          <div class="gp-info">
            <span class="gp-name">{{ plant.plantId }}</span>
            <span class="gp-phase">{{ getPhaseLabel(plant.phase) }}</span>
          </div>
        </div>
        <div v-if="plants.length === 0" class="garden-empty">
          <span class="ge-icon">🌱</span>
          <p class="ge-text">开始休憩，种下你的第一株植物</p>
        </div>
      </div>
    </section>

    <!-- ===== 休息日历 ===== -->
    <section data-enter class="rest-section">
      <h3 class="section-label">
        休息日历
        <span class="cal-month">{{ calendar.year }}年{{ calendar.month }}月</span>
      </h3>
      <div class="ritual-calendar" v-if="calendar.days.length > 0">
        <div class="cal-weekdays">
          <span v-for="d in weekDays" :key="d" class="cal-weekday">{{ d }}</span>
        </div>
        <div class="cal-grid">
          <div
            v-for="(day, idx) in calendar.days"
            :key="idx"
            class="cal-day"
            :class="{
              'cal-day--rest': day.isRestDay,
              'cal-day--streak': day.isStreakDay,
              'cal-day--today': day.date === today,
            }"
          >
            <span class="cal-day-num">{{ new Date(day.date).getDate() }}</span>
            <span v-if="day.isRestDay" class="cal-day-dot"></span>
          </div>
        </div>
        <div class="cal-legend">
          <span class="cal-legend-item"><span class="cal-legend-dot cal-legend-dot--rest"></span> 休息日</span>
          <span class="cal-legend-item"><span class="cal-legend-dot cal-legend-dot--streak"></span> 连续休息</span>
        </div>
      </div>
      <div v-else class="cal-empty">
        <p class="cal-empty-text">暂无休息记录</p>
      </div>
    </section>

    <!-- ===== 疲劳处方 ===== -->
    <section data-enter class="rest-section">
      <h3 class="section-label">疲劳评估</h3>
      <div class="ritual-fatigue">
        <div class="rf-levels">
          <button
            v-for="(meta, level) in FATIGUE_LEVEL_META"
            :key="level"
            class="rf-level-btn"
            :class="{ 'rf-level-btn--active': currentFatigue === level }"
            :style="{ '--fatigue-color': meta.color }"
            @click="currentFatigue = level as FatigueLevel"
          >
            <span class="rfl-icon">{{ meta.icon }}</span>
            <span class="rfl-label">{{ meta.label }}</span>
          </button>
        </div>
        <div v-if="prescription" class="rf-prescription">
          <div class="rfp-header">
            <span class="rfp-icon">💊</span>
            <span class="rfp-title">休息处方</span>
          </div>
          <div class="rfp-body">
            <div class="rfp-item">
              <span class="rfp-item-label">建议总时长</span>
              <span class="rfp-item-value">{{ prescription.suggestedDuration }}分钟</span>
            </div>
            <div class="rfp-item">
              <span class="rfp-item-label">建议频率</span>
              <span class="rfp-item-value">{{ prescription.suggestedFrequency }}</span>
            </div>
            <div class="rfp-item" v-if="prescription.recommendedRituals.length > 0">
              <span class="rfp-item-label">推荐仪式</span>
              <span class="rfp-item-value">{{ prescription.recommendedRituals.join('、') }}</span>
            </div>
            <div v-if="prescription.cautions.length > 0" class="rfp-cautions">
              <span class="rfp-cautions-label">⚠️ 注意事项</span>
              <ul class="rfp-cautions-list">
                <li v-for="(c, i) in prescription.cautions" :key="i">{{ c }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storage } from '../engine/storage'
import type { BreakRecord, RestPractice } from '../modules/rest/types'
import { DEFAULT_PRACTICES } from '../modules/rest/types'
import {
  useRestRituals,
  usePlantGrowth,
  useRestCalendar,
  useRestPrescription,
  RITUAL_CATEGORY_META,
  GROWTH_PHASE_META,
  FATIGUE_LEVEL_META,
  PRESET_RITUALS,
  type RitualCategory,
  type RestRitual,
  type FatigueLevel,
} from '../modules/rest/rest-rituals'

const rituals = useRestRituals()
const plantGrowth = usePlantGrowth()
const restCalendar = useRestCalendar()
const restPrescription = useRestPrescription()

// 加载休憩记录
function loadBreakRecords(): BreakRecord[] {
  try {
    const saved = storage.getKV<string>('rest:break_records', '[]')
    return JSON.parse(saved)
  } catch { return [] }
}

onMounted(() => {
  rituals.loadRituals()
})

// ---- 分类导航 ----
const activeCategory = ref<RitualCategory>('work-break')
const activeRitual = ref<RestRitual | null>(null)
const executingStep = ref(-1)

const filteredRituals = computed(() => {
  return rituals.getRitualsByCategory(activeCategory.value)
})

function selectRitual(ritual: RestRitual) {
  activeRitual.value = ritual
  executingStep.value = -1
}

async function executeRitual() {
  if (!activeRitual.value) return
  rituals.executeRitual(activeRitual.value.id)

  // 动画模拟步骤执行
  const steps = activeRitual.value.steps
  for (let i = 0; i < steps.length; i++) {
    executingStep.value = i
    await new Promise(r => setTimeout(r, 800))
  }
  executingStep.value = steps.length
}

// ---- 植物花园 ----
const plants = computed(() => plantGrowth.plantOverview.value)

function getPlantEmoji(plant: { emoji: string }): string {
  return plant.emoji || '🌱'
}

function getPlantColor(plant: { phase: string }): string {
  return GROWTH_PHASE_META[plant.phase as keyof typeof GROWTH_PHASE_META]?.color || '#90EE90'
}

function getPhaseLabel(phase: string): string {
  return GROWTH_PHASE_META[phase as keyof typeof GROWTH_PHASE_META]?.label || phase
}

// ---- 日历 ----
const today = new Date().toISOString().split('T')[0]
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const calendar = computed(() => {
  const now = new Date()
  const records = loadBreakRecords()
  return restCalendar.generateCalendar(now.getFullYear(), now.getMonth() + 1, records)
})

// ---- 疲劳评估 ----
const currentFatigue = ref<FatigueLevel>('normal')
const prescription = computed(() => {
  return restPrescription.generatePrescription(
    currentFatigue.value,
    PRESET_RITUALS,
    DEFAULT_PRACTICES as RestPractice[],
  )
})

// ---- 工具函数 ----
function soundscapeLabel(soundscape: string): string {
  const map: Record<string, string> = {
    birds: '鸟鸣', rain: '雨声', night: '夜晚', silence: '静默',
    nature: '自然', music: '音乐',
  }
  return map[soundscape] || soundscape
}
</script>

<style scoped>
/* ---- 仪式分类 ---- */
.ritual-categories {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ritual-cat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: 0.5px;
}

.ritual-cat-btn:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
  color: var(--text-primary);
}

.ritual-cat-btn--active {
  background: rgba(122, 184, 122, 0.1);
  border-color: rgba(122, 184, 122, 0.25);
  color: var(--accent);
}

.rcb-icon {
  font-size: 16px;
  line-height: 1;
}

.rcb-label {
  font-size: 11px;
  letter-spacing: 0.5px;
}

/* ---- 仪式列表 ---- */
.ritual-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ritual-card {
  padding: 14px 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition);
}

.ritual-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.ritual-card--active {
  border-color: rgba(122, 184, 122, 0.25);
  background: rgba(122, 184, 122, 0.06);
}

.rc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.rc-name {
  font-size: 14px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.rc-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: rgba(122, 184, 122, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
}

.rc-desc {
  margin: 0 0 8px;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.rc-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 6px;
}

.rc-duration {
  font-size: 11px;
  color: var(--text-secondary);
}

.rc-recovery {
  font-size: 11px;
  color: var(--accent);
}

.rc-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.rc-tag {
  font-size: 9px;
  padding: 2px 6px;
  background: rgba(122, 184, 122, 0.06);
  border: 1px solid rgba(122, 184, 122, 0.1);
  border-radius: 3px;
  color: var(--text-secondary);
}

/* ---- 仪式步骤可视化 ---- */
.ritual-execute-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  margin-left: 12px;
  padding: 4px 14px;
  background: rgba(122, 184, 122, 0.15);
  border: 1px solid rgba(122, 184, 122, 0.25);
  border-radius: 6px;
  color: var(--accent);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: 0.5px;

  min-height: 26px;
}

.ritual-execute-btn:hover {
  background: rgba(122, 184, 122, 0.25);
  border-color: rgba(122, 184, 122, 0.4);
}

.ritual-steps {
  display: flex;
  flex-direction: column;
}

.ritual-step {
  display: flex;
  gap: 14px;
  padding: 4px 0;
}

.rs-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 14px;
  flex-shrink: 0;
}

.rs-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--card-border);
  border: 2px solid var(--card-border);
  transition: all 0.3s ease;
  margin-top: 6px;
}

.ritual-step--active .rs-dot {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 8px rgba(122, 184, 122, 0.3);
}

.ritual-step--done .rs-dot {
  background: var(--accent);
  border-color: var(--accent);
}

.rs-line {
  flex: 1;
  width: 2px;
  min-height: 28px;
  background: var(--card-border);
  transition: background 0.3s ease;
}

.ritual-step--done .rs-line {
  background: rgba(122, 184, 122, 0.3);
}

.rs-content {
  flex: 1;
  padding: 6px 0 12px;
}

.rs-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.rs-order {
  font-size: 10px;
  color: var(--text-secondary);
  background: var(--card-bg);
  padding: 1px 6px;
  border-radius: 3px;
}

.rs-duration {
  font-size: 10px;
  color: var(--text-secondary);
}

.rs-action {
  font-size: 13px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 2px;
}

.ritual-step--active .rs-action {
  color: var(--accent);
}

.rs-desc {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.rs-soundscape {
  display: inline-block;
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-secondary);
  opacity: 0.7;
}

/* ---- 植物花园 ---- */
.ritual-garden {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.garden-plant {
  padding: 16px 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  text-align: center;
  transition: all var(--transition);
}

.garden-plant:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.garden-plant--blooming {
  border-color: rgba(255, 105, 180, 0.2);
  background: rgba(255, 105, 180, 0.03);
}

.gp-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.gp-emoji {
  font-size: 28px;
  line-height: 1;
}

.gp-progress-track {
  width: 100%;
  height: 4px;
  background: rgba(122, 184, 122, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.gp-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.gp-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gp-name {
  font-size: 11px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.gp-phase {
  font-size: 10px;
  color: var(--text-secondary);
}

.garden-empty {
  grid-column: 1 / -1;
  padding: 40px 20px;
  text-align: center;
}

.ge-icon {
  font-size: 36px;
  opacity: 0.3;
  display: block;
  margin-bottom: 8px;
}

.ge-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ---- 日历 ---- */
.cal-month {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 8px;
  font-weight: 300;
}

.ritual-calendar {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 16px;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.cal-weekday {
  text-align: center;
  font-size: 10px;
  color: var(--text-secondary);
  padding: 4px 0;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all var(--transition);
}

.cal-day--rest {
  background: rgba(122, 184, 122, 0.08);
}

.cal-day--streak {
  background: rgba(122, 184, 122, 0.15);
  border: 1px solid rgba(122, 184, 122, 0.2);
}

.cal-day--today {
  color: var(--accent);
  font-weight: 500;
}

.cal-day-num {
  font-size: 12px;
}

.cal-day-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
}

.cal-legend {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  justify-content: center;
}

.cal-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-secondary);
}

.cal-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.cal-legend-dot--rest {
  background: rgba(122, 184, 122, 0.3);
}

.cal-legend-dot--streak {
  background: rgba(122, 184, 122, 0.5);
  border: 1px solid rgba(122, 184, 122, 0.4);
}

.cal-empty {
  padding: 30px;
  text-align: center;
}

.cal-empty-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ---- 疲劳评估 ---- */
.ritual-fatigue {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rf-levels {
  display: flex;
  gap: 6px;
}

.rf-level-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
}

.rf-level-btn:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.rf-level-btn--active {
  background: color-mix(in srgb, var(--fatigue-color) 10%, transparent);
  border-color: color-mix(in srgb, var(--fatigue-color) 30%, transparent);
  color: var(--fatigue-color);
}

.rfl-icon {
  font-size: 18px;
  line-height: 1;
}

.rfl-label {
  font-size: 10px;
  letter-spacing: 0.5px;
}

.rf-prescription {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 16px;
}

.rfp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.rfp-icon {
  font-size: 18px;
}

.rfp-title {
  font-size: 14px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.rfp-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rfp-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--card-border);
}

.rfp-item:last-child {
  border-bottom: none;
}

.rfp-item-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.rfp-item-value {
  font-size: 12px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.rfp-cautions {
  margin-top: 8px;
  padding: 10px;
  background: rgba(232, 160, 64, 0.06);
  border: 1px solid rgba(232, 160, 64, 0.12);
  border-radius: 6px;
}

.rfp-cautions-label {
  font-size: 11px;
  color: #e8a040;
  display: block;
  margin-bottom: 4px;
}

.rfp-cautions-list {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .ritual-garden {
    grid-template-columns: repeat(2, 1fr);
  }

  .rf-levels {
    flex-wrap: wrap;
  }

  .rf-level-btn {
    flex: 0 0 auto;
    min-width: 60px;
}
}
</style>