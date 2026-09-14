<template>
  <section class="rqp-panel" aria-label="息壤质量">
    <div class="rqp-head">
      <span class="rqp-title">🌿 息壤质量</span>
      <span class="rqp-badge">{{ seasonLabel }}</span>
    </div>

    <!-- 统计摘要 -->
    <div class="rqp-block">
      <h3 class="rqp-block-title">统计摘要</h3>
      <div class="rqp-grid">
        <div class="rqp-cell">
          <b>{{ summary.totalRecords }}</b><span>总休憩</span>
        </div>
        <div class="rqp-cell">
          <b>{{ summary.totalDuration }}</b><span>总时长(分)</span>
        </div>
        <div class="rqp-cell">
          <b>{{ summary.avgMood }}</b><span>平均心情</span>
        </div>
        <div class="rqp-cell">
          <b>{{ summary.plantCount }}</b><span>植物</span>
        </div>
      </div>
    </div>

    <!-- 记录休憩 -->
    <div class="rqp-block">
      <h3 class="rqp-block-title">记录休憩</h3>
      <div class="rqp-form">
        <select v-model="activity" class="rqp-select" aria-label="休憩活动">
          <option v-for="p in practices" :key="p.id" :value="p.name">{{ p.icon }} {{ p.name }}</option>
        </select>
        <input
          v-model.number="duration"
          type="number"
          min="1"
          max="600"
          class="rqp-input"
          placeholder="时长(分)"
          aria-label="休憩时长"
        />
        <div class="rqp-mood" aria-label="心情">
          <button
            v-for="m in 5"
            :key="m"
            type="button"
            class="rqp-mood-btn"
            :class="{ 'rqp-mood-btn--on': mood === m }"
            @click="mood = m"
          >{{ m }}</button>
        </div>
        <input
          v-model="note"
          type="text"
          class="rqp-input rqp-input--wide"
          placeholder="备注(可选)"
          aria-label="休憩备注"
        />
        <button class="rqp-save" :disabled="!canRecord" @click="onRecord">记录</button>
      </div>
    </div>

    <!-- 本周质量 -->
    <div class="rqp-block">
      <h3 class="rqp-block-title">本周质量</h3>
      <div class="rqp-grid">
        <div class="rqp-cell">
          <b>{{ analysis.weeklyCount }}</b><span>本周次数</span>
        </div>
        <div class="rqp-cell">
          <b>{{ analysis.weeklyAvgRecovery }}</b><span>平均恢复</span>
        </div>
        <div class="rqp-cell">
          <b>{{ analysis.weeklyAvgMood }}</b><span>平均心情</span>
        </div>
        <div class="rqp-cell">
          <b>{{ analysis.diversityScore }}%</b><span>多样性</span>
        </div>
      </div>
      <div class="rqp-freq">
        <span class="rqp-freq-badge" :class="'rqp-freq-badge--' + analysis.restFrequency">{{ frequencyLabel }}</span>
        <span class="rqp-freq-text">连续 {{ analysis.streakDays }} 天 · 理想间隔 {{ analysis.idealRestInterval }} 小时</span>
      </div>
      <div class="rqp-top" v-if="analysis.topPractices.length">
        <span class="rqp-top-label">常用方式</span>
        <span v-for="t in analysis.topPractices" :key="t.practice" class="rqp-top-chip">{{ t.practice }} ×{{ t.count }}</span>
      </div>
      <ul class="rqp-suggestions">
        <li v-for="s in analysis.suggestions" :key="s" class="rqp-suggestion">
          <span class="rqp-suggestion-mark">✦</span>
          <span class="rqp-suggestion-text">{{ s }}</span>
        </li>
      </ul>
    </div>

    <!-- 植被养成 -->
    <div class="rqp-block">
      <h3 class="rqp-block-title">植被养成</h3>
      <template v-if="plants.length">
        <div v-for="plant in plants" :key="plant.id" class="rqp-plant">
          <span class="rqp-plant-emoji">{{ plantEmoji(plant.name) }}</span>
          <div class="rqp-plant-info">
            <div class="rqp-plant-row">
              <span class="rqp-plant-name">{{ plant.name }}</span>
              <span class="rqp-plant-stage">{{ stageLabel(plant.growthStage) }}</span>
            </div>
            <div class="rqp-plant-bar"><i :style="{ width: plant.health + '%' }"></i></div>
            <span class="rqp-plant-meta">健康 {{ plant.health }} · 花开 {{ plant.bloomCount }} 次</span>
          </div>
        </div>
      </template>
      <p v-else class="rqp-empty">记录休憩后，关联的植物将在此萌芽生长。</p>
    </div>

    <!-- 季节推荐 -->
    <div class="rqp-block">
      <h3 class="rqp-block-title">季节推荐</h3>
      <div class="rqp-seasonal" v-if="seasonal.length">
        <span v-for="p in seasonal" :key="p.id" class="rqp-seasonal-chip">{{ p.icon }} {{ p.name }}</span>
      </div>
      <p v-else class="rqp-empty">当前季节暂无推荐休憩方式。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRestQuality } from '../modules/rest'
import type { RestSeason, RestQualityAnalysis } from '../modules/rest'

const quality = useRestQuality()
const { practices, plants } = quality

const summary = computed(() => quality.getSummary())
const analysis = computed(() => quality.getQualityAnalysis())
const seasonal = computed(() => quality.getSeasonalRecommendations())
const season = computed(() => quality.getCurrentSeason())

const SEASON_LABEL: Record<RestSeason, string> = {
  spring: '春 · 生发',
  summer: '夏 · 蕃秀',
  autumn: '秋 · 容平',
  winter: '冬 · 闭藏',
}
const seasonLabel = computed(() => SEASON_LABEL[season.value] ?? '春 · 生发')

const FREQ_LABEL: Record<RestQualityAnalysis['restFrequency'], string> = {
  insufficient: '休息偏少',
  adequate: '节奏适中',
  excellent: '状态极佳',
}
const frequencyLabel = computed(() => FREQ_LABEL[analysis.value.restFrequency])

const STAGE_LABEL = ['种子', '萌芽', '生长', '开花', '丰收']
function stageLabel(stage: number): string {
  return STAGE_LABEL[stage] ?? '种子'
}

function plantEmoji(name: string): string {
  return quality.getPlantEmoji(name)
}

const activity = ref('')
const duration = ref(15)
const mood = ref(3)
const note = ref('')

if (practices.value.length > 0) {
  activity.value = practices.value[0].name
}

const canRecord = computed(() => activity.value !== '' && duration.value > 0)

async function onRecord(): Promise<void> {
  if (!canRecord.value) return
  await quality.recordBreak(activity.value, duration.value, mood.value, note.value || undefined)
  duration.value = 15
  mood.value = 3
  note.value = ''
}
</script>

<style scoped>
.rqp-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(138, 154, 122, 0.08), rgba(232, 192, 96, 0.04));
  border: 1px solid rgba(138, 154, 122, 0.22);
}

.rqp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.rqp-title {
  font-size: 15px;
  font-weight: 600;
  color: #d8dcd0;
}

.rqp-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(232, 192, 96, 0.16);
  color: #e8c060;
  border: 1px solid rgba(232, 192, 96, 0.3);
}

.rqp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rqp-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #c8ccb8;
}

.rqp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.rqp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.07);
  text-align: center;
}

.rqp-cell b {
  font-size: 16px;
  color: #e8c060;
}

.rqp-cell span {
  font-size: 11px;
  color: #9aa090;
}

.rqp-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.rqp-select,
.rqp-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(138, 154, 122, 0.25);
  background: rgba(138, 154, 122, 0.08);
  color: #d8dcd0;
  font-size: 12px;
  outline: none;
}

.rqp-select {
  flex: 0 0 120px;
}

.rqp-input {
  flex: 0 0 80px;
}

.rqp-input--wide {
  flex: 1 1 140px;
  min-width: 120px;
}

.rqp-mood {
  display: flex;
  gap: 4px;
}

.rqp-mood-btn {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid rgba(138, 154, 122, 0.25);
  background: rgba(138, 154, 122, 0.08);
  color: #9aa090;
  font-size: 12px;
  cursor: pointer;
}

.rqp-mood-btn--on {
  background: rgba(232, 192, 96, 0.2);
  color: #e8c060;
  border-color: rgba(232, 192, 96, 0.4);
}

.rqp-save {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(232, 192, 96, 0.4);
  background: rgba(232, 192, 96, 0.16);
  color: #e8c060;
  font-size: 12px;
  cursor: pointer;
}

.rqp-save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.rqp-freq {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.rqp-freq-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.14);
  color: #c8ccb8;
  border: 1px solid rgba(138, 154, 122, 0.3);
}

.rqp-freq-badge--insufficient {
  background: rgba(196, 106, 90, 0.16);
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.35);
}

.rqp-freq-badge--excellent {
  background: rgba(138, 154, 122, 0.2);
  color: #8a9a7a;
  border-color: rgba(138, 154, 122, 0.4);
}

.rqp-freq-text {
  font-size: 11px;
  color: #9aa090;
}

.rqp-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.rqp-top-label {
  font-size: 11px;
  color: #9aa090;
}

.rqp-top-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.1);
  color: #c8ccb8;
}

.rqp-suggestions {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rqp-suggestion {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.6;
  color: #b8bca8;
}

.rqp-suggestion-mark {
  color: #e8c060;
  flex: 0 0 auto;
}

.rqp-plant {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.07);
}

.rqp-plant-emoji {
  flex: 0 0 34px;
  font-size: 24px;
  text-align: center;
}

.rqp-plant-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rqp-plant-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rqp-plant-name {
  font-size: 13px;
  font-weight: 600;
  color: #d8dcd0;
}

.rqp-plant-stage {
  font-size: 11px;
  color: #e8c060;
}

.rqp-plant-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.14);
  overflow: hidden;
}

.rqp-plant-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8a9a7a, #e8c060);
}

.rqp-plant-meta {
  font-size: 11px;
  color: #9aa090;
}

.rqp-seasonal {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rqp-seasonal-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.1);
  color: #c8ccb8;
  border: 1px solid rgba(138, 154, 122, 0.22);
}

.rqp-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #9aa090;
}
</style>
