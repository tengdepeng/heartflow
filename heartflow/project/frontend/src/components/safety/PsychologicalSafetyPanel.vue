<template>
  <div data-enter class="safety-panel psychological-safety-panel">
    <div class="panel-header">
      <span class="panel-icon">&#x1F33F;</span>
      <div>
        <h4 class="panel-title">心理安全</h4>
        <p class="panel-desc">情绪觉察、光笺陪伴与心理支持</p>
      </div>
    </div>

    <div class="panel-body">
      <!-- 心理安全光笺开关 -->
      <div class="setting-row">
        <span class="setting-label">心理安全光笺</span>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="psyConfig.lightNoteEnabled"
            @change="toggleLightNote"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 情绪检测开关 -->
      <div class="setting-row">
        <span class="setting-label">情绪检测</span>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="psyConfig.moodDetectionEnabled"
            @change="toggleMoodDetection"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 情绪检测输入（仅情绪检测开启时显示） -->
      <div class="mood-section" v-if="psyConfig.moodDetectionEnabled">
        <textarea
          v-model="moodText"
          placeholder="写下你的感受，让我陪着你…"
          class="mood-input"
          rows="3"
          @input="onMoodInput"
        />
        <div v-if="detectionResult" class="mood-result">
          <div class="mood-tags">
            <span v-if="detectionResult.hasLowEnergy" class="mood-tag low-energy">低能量</span>
            <span v-if="detectionResult.hasSelfHarm" class="mood-tag crisis">危机</span>
            <span v-if="detectionResult.hasAnxiety" class="mood-tag anxiety">焦虑</span>
            <span v-if="detectionResult.hasSadness" class="mood-tag sadness">悲伤</span>
            <span v-if="detectionResult.hasAnger" class="mood-tag anger">愤怒</span>
          </div>
          <div class="light-note">
            <p class="note-text">{{ lightNote?.message }}</p>
          </div>
        </div>
      </div>

      <!-- 危机热线 -->
      <div class="hotline-section">
        <h5 class="section-title">危机热线</h5>
        <div class="hotline-list">
          <div v-for="line in hotlines" :key="line.phone" class="hotline-row">
            <span class="hotline-name">{{ line.name }}</span>
            <span class="hotline-phone">{{ line.phone }}</span>
            <span class="hotline-hours">{{ line.hours }}</span>
          </div>
        </div>
        <p class="hotline-hint">当你感到难以承受时，请拨打上面的电话。会有人陪着你。</p>
      </div>

      <!-- 心理安全评分 -->
      <div class="score-section">
        <h5 class="section-title">心理安全评分</h5>
        <div class="score-display">
          <div class="score-ring">
            <span class="score-value" :style="{ color: scoreColor }">{{ psyScore.psychologicalSafety }}</span>
            <span class="score-label">/ 25</span>
          </div>
          <div class="score-details">
            <div class="score-detail-item">
              <span>光笺 {{ psyConfig.lightNoteEnabled ? '+8' : '+0' }}</span>
              <span class="score-bar"><span class="bar-fill" :style="{ width: psyConfig.lightNoteEnabled ? '100%' : '0%' }"></span></span>
            </div>
            <div class="score-detail-item">
              <span>情绪检测 {{ psyConfig.moodDetectionEnabled ? '+7' : '+0' }}</span>
              <span class="score-bar"><span class="bar-fill" :style="{ width: psyConfig.moodDetectionEnabled ? '100%' : '0%' }"></span></span>
            </div>
            <div class="score-detail-item">
              <span>近期签到 {{ hasRecentCheckin ? '+10' : '+0' }}</span>
              <span class="score-bar"><span class="bar-fill" :style="{ width: hasRecentCheckin ? '100%' : '0%' }"></span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useViewEntrance } from '../../composables/useViewEntrance'
import { getSafetyConfig, updatePsychologicalSafety, getSafetyScore } from '../../modules/safety'
import { usePsychologicalSafety } from '../../modules/safety/composables/usePsychologicalSafety'
import type { MoodDetectionResult, LightNote } from '../../modules/safety/composables/usePsychologicalSafety'

useViewEntrance()

const config = getSafetyConfig()
const psyConfig = computed(() => config.value.psychologicalSafety)

const { detectMoodKeywords, getLightNote, getCrisisHotline } = usePsychologicalSafety()

const moodText = ref('')
const detectionResult = ref<MoodDetectionResult | null>(null)
const lightNote = ref<LightNote | null>(null)
const hotlines = getCrisisHotline()

const psyScore = computed(() => getSafetyScore())

const hasRecentCheckin = computed(() => {
  if (psyConfig.value.lastCheckIn === null) return false
  const daysSince = (Date.now() - psyConfig.value.lastCheckIn) / 86400000
  return daysSince <= 7
})

const scoreColor = computed(() => {
  const s = psyScore.value.psychologicalSafety
  if (s >= 20) return '#34d399'
  if (s >= 12) return '#f0c040'
  return '#ef4444'
})

function toggleLightNote(e: Event) {
  updatePsychologicalSafety({ lightNoteEnabled: (e.target as HTMLInputElement).checked })
}

function toggleMoodDetection(e: Event) {
  updatePsychologicalSafety({ moodDetectionEnabled: (e.target as HTMLInputElement).checked })
  if (!(e.target as HTMLInputElement).checked) {
    moodText.value = ''
    detectionResult.value = null
    lightNote.value = null
  }
}

function onMoodInput() {
  if (!moodText.value.trim()) {
    detectionResult.value = null
    lightNote.value = null
    return
  }

  const result = detectMoodKeywords(moodText.value)
  detectionResult.value = result
  lightNote.value = getLightNote(result)
}
</script>

<style scoped>
.psychological-safety-panel {
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border, rgba(var(--accent-rgb), 0.12));
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
  transition: all var(--transition, 0.25s cubic-bezier(0.4, 0, 0.2, 1));
}

.psychological-safety-panel:hover {
  background: var(--bg-card-hover, rgba(55, 48, 40, 0.7));
  border-color: rgba(var(--accent-rgb), 0.18);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}

.panel-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.75);
  margin: 0 0 4px;
}

.panel-desc {
  font-size: 11px;
  color: var(--text-low);
  margin: 0;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.65);
}

.setting-label {
  flex: 1;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-medium);
  margin: 0 0 10px;
  letter-spacing: 0.3px;
}

/* 情绪检测输入 */
.mood-section {
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}

.mood-input {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 12px;
  background: rgba(20, 18, 16, 0.6);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.6;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.mood-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.mood-input::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}

.mood-result {
  margin-top: 12px;
}

.mood-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.mood-tag {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.mood-tag.low-energy {
  background: rgba(107, 114, 128, 0.15);
  color: #9ca3af;
}

.mood-tag.crisis {
  background: rgba(239, 68, 68, 0.15);
  color: var(--error);
}

.mood-tag.anxiety {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.mood-tag.sadness {
  background: rgba(99, 102, 241, 0.15);
  color: #a07c8c;
}

.mood-tag.anger {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

.light-note {
  padding: 16px;
  border-radius: 12px;
  background: rgba(20, 18, 16, 0.8);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.note-text {
  font-size: 13px;
  line-height: 1.8;
  color: rgba(200, 180, 150, 0.7);
  margin: 0;
  white-space: pre-line;
}

/* 危机热线 */
.hotline-section {
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}

.hotline-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hotline-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.04);
  font-size: 12px;
  transition: all 0.2s;
}

.hotline-row:hover {
  background: rgba(55, 48, 40, 0.45);
}

.hotline-name {
  flex: 1;
  color: rgba(var(--text-primary-rgb), 0.65);
}

.hotline-phone {
  color: var(--accent, #d4a574);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.hotline-hours {
  font-size: 11px;
  color: var(--text-low);
}

.hotline-hint {
  font-size: 11px;
  color: var(--text-low);
  margin: 8px 0 0;
  line-height: 1.5;
}

/* 评分区域 */
.score-section {
  padding: 12px 0;
}

.score-display {
  display: flex;
  gap: 16px;
  align-items: center;
}

.score-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.score-value {
  font-size: 32px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.score-label {
  font-size: 11px;
  color: var(--text-low);
}

.score-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.score-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  background: var(--success);
  border-radius: 2px;
  transition: width 0.5s ease;
}

/* Toggle 开关 */
.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 11px;
  transition: 0.3s;
  cursor: pointer;
}

.toggle input:checked + .toggle-slider {
  background: var(--accent, #d4a574);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(18px);
}
</style>