<template>
  <section class="lep" aria-label="生命刻度">
    <div class="lep-head">
      <span class="lep-title">⏳ 生命刻度</span>
      <span class="lep-sub">生之时 · 死之时 · 里程碑</span>
    </div>

    <!-- 生之时 · 已流逝 -->
    <p class="lep-subtitle">生之时 · 已流逝</p>
    <div class="lep-elapsed">
      <div class="lep-elapsed-item">
        <span class="lep-elapsed-value">{{ overview.elapsed.years }}</span>
        <span class="lep-elapsed-label">年</span>
      </div>
      <div class="lep-elapsed-item">
        <span class="lep-elapsed-value">{{ overview.elapsed.months }}</span>
        <span class="lep-elapsed-label">月</span>
      </div>
      <div class="lep-elapsed-item">
        <span class="lep-elapsed-value">{{ overview.elapsed.days }}</span>
        <span class="lep-elapsed-label">天</span>
      </div>
      <div class="lep-elapsed-item">
        <span class="lep-elapsed-value">{{ overview.elapsed.hours }}</span>
        <span class="lep-elapsed-label">时</span>
      </div>
      <div class="lep-elapsed-item">
        <span class="lep-elapsed-value">{{ overview.elapsed.minutes }}</span>
        <span class="lep-elapsed-label">分</span>
      </div>
      <div class="lep-elapsed-item">
        <span class="lep-elapsed-value">{{ overview.elapsed.seconds }}</span>
        <span class="lep-elapsed-label">秒</span>
      </div>
    </div>

    <!-- 生命进度 -->
    <p class="lep-subtitle">生命进度</p>
    <div class="lep-progress">
      <div class="lep-progress-bar">
        <div class="lep-progress-fill" :style="{ width: overview.progress + '%' }"></div>
      </div>
      <span class="lep-progress-value">{{ overview.progress }}%</span>
    </div>
    <p class="lep-remaining">剩余：{{ overview.remaining }}</p>

    <!-- 里程碑 -->
    <p class="lep-subtitle">里程碑</p>
    <div v-if="overview.milestones.length" class="lep-milestones">
      <div
        v-for="m in overview.milestones"
        :key="m.name"
        class="lep-milestone"
        :class="{ passed: m.passed }"
      >
        <span class="lep-milestone-name">{{ m.name }}</span>
        <span class="lep-milestone-date">{{ m.date }}</span>
        <span class="lep-milestone-status">{{ m.passed ? '已过' : '未至' }}</span>
      </div>
    </div>
    <p v-else class="lep-empty">暂无里程碑。</p>

    <!-- 配置 -->
    <p class="lep-subtitle">配置</p>
    <div class="lep-config">
      <label class="lep-field">
        <span>出生日期</span>
        <input type="date" :value="config.birthDate" @change="handleBirthDate" />
      </label>
      <label class="lep-field">
        <span>期望寿命（年）</span>
        <input
          type="number"
          min="1"
          max="150"
          :value="config.expectedLifespan"
          @change="handleLifespan"
        />
      </label>

      <form class="lep-add" @submit.prevent="handleAddMilestone">
        <input
          v-model="newMilestoneName"
          class="lep-input"
          type="text"
          placeholder="里程碑名（如：而立之年）"
          maxlength="20"
        />
        <input
          v-model.number="newMilestoneYear"
          class="lep-input lep-input--year"
          type="number"
          min="1"
          max="150"
          placeholder="第 N 年"
        />
        <button class="lep-btn" type="submit" :disabled="!canAddMilestone">添加</button>
      </form>

      <div v-if="config.milestones.length" class="lep-remove">
        <span class="lep-remove-label">删除：</span>
        <button
          v-for="m in config.milestones"
          :key="m.name"
          class="lep-btn--small"
          @click="removeMilestone(m.name)"
        >
          {{ m.name }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLifeEpoch } from '../modules/life-epoch/life-epoch'

const {
  config,
  overview,
  setBirthDate,
  setExpectedLifespan,
  addMilestone,
  removeMilestone,
} = useLifeEpoch()

const newMilestoneName = ref('')
const newMilestoneYear = ref<number>(30)

const canAddMilestone = computed(
  () => newMilestoneName.value.trim().length > 0 && newMilestoneYear.value > 0,
)

function handleBirthDate(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  if (v) setBirthDate(v)
}

function handleLifespan(e: Event): void {
  const v = Number((e.target as HTMLInputElement).value)
  if (v > 0) setExpectedLifespan(v)
}

function handleAddMilestone(): void {
  if (!canAddMilestone.value) return
  addMilestone(newMilestoneName.value, newMilestoneYear.value)
  newMilestoneName.value = ''
  newMilestoneYear.value = 30
}
</script>

<style scoped>
/* =============================================
   生命刻度 · 生辰启发（INCR-99）
   ============================================= */

.lep {
  position: relative;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.lep-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.lep-title {
  font-size: 14px;
  color: rgba(var(--accent-rgb), 0.7);
  letter-spacing: 2px;
}

.lep-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

.lep-subtitle {
  margin: 14px 0 8px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  letter-spacing: 2px;
}

/* ---- 生之时 ---- */
.lep-elapsed {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.lep-elapsed-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 44px;
  padding: 8px 6px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.lep-elapsed-value {
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.lep-elapsed-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
  margin-top: 2px;
}

/* ---- 生命进度 ---- */
.lep-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lep-progress-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}

.lep-progress-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--accent));
  transition: width 0.4s ease;
}

.lep-progress-value {
  font-size: 12px;
  color: var(--accent);
  min-width: 36px;
  text-align: right;
}

.lep-remaining {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.55);
}

/* ---- 里程碑 ---- */
.lep-milestones {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lep-milestone {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  font-size: 12px;
}

.lep-milestone.passed {
  opacity: 0.55;
}

.lep-milestone-name {
  color: rgba(var(--accent-rgb), 0.75);
}

.lep-milestone-date {
  color: rgba(var(--accent-rgb), 0.4);
  font-size: 11px;
}

.lep-milestone-status {
  margin-left: auto;
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.35);
}

.lep-milestone.passed .lep-milestone-status {
  color: rgba(var(--accent-rgb), 0.5);
}

.lep-empty {
  margin: 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

/* ---- 配置 ---- */
.lep-config {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lep-field {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.55);
}

.lep-field input {
  flex: 1;
  max-width: 180px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12px;
  color: var(--text, #e8e4dc);
}

.lep-add {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.lep-input {
  flex: 1;
  min-width: 120px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12px;
  color: var(--text, #e8e4dc);
}

.lep-input--year {
  flex: 0 0 80px;
  min-width: 80px;
}

.lep-btn {
  font-size: 12px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 6px;
  padding: 5px 14px;
  cursor: pointer;
}

.lep-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lep-remove {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.lep-remove-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

.lep-btn--small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.6);
  background: transparent;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;

  min-height: 26px;
}

.lep-btn--small:hover {
  color: rgba(var(--accent-rgb), 0.9);
  border-color: rgba(var(--accent-rgb), 0.3);
}
</style>
