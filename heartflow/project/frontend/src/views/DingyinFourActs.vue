<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance dfa">
    <!-- 氛围背景 -->
    <div data-enter class="dfa-atmos" />

    <!-- 头部 -->
    <div data-enter class="dfa-header">
      <button class="dingyin-back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span class="back-label">返回</span>
      </button>
      <div class="dfa-title-group">
        <h1 class="dfa-title">定音锤</h1>
        <p class="dfa-subtitle">四幕 · 回响集</p>
      </div>
    </div>

    <!-- 汇总进度 -->
    <div data-enter class="dingyin-summary-progress">
      <div class="dfa-summary-stats">
        <span class="dfa-summary-label">定音进度</span>
        <span class="dfa-summary-value">{{ progress.completed }}/{{ progress.total }}</span>
      </div>
      <div class="dfa-progress-track">
        <div
          class="dfa-progress-fill"
          :style="{ width: (progress.total > 0 ? (progress.completed / progress.total) * 100 : 0) + '%' }"
        />
      </div>
      <div class="dfa-knock-row">
        <button class="dfa-knock-btn" @click="knock" title="重新聚合跨模块证据，敲响定音锤">🔨 重敲定音锤</button>
        <span v-if="lastKnockedAt" class="dfa-knock-time">上次 {{ lastKnockedAt }}</span>
      </div>
    </div>

    <!-- 四幕卡片列表 -->
    <div class="dfa-acts-list">
      <div v-if="acts.length > 0">
        <!-- 新鲜度提示 -->
        <div v-if="freshness?.hasSignificantChange" class="dfa-freshness-banner">
          <span class="dfa-freshness-icon">🆕</span>
          <span class="dfa-freshness-text">{{ freshness.suggestionReason }}</span>
        </div>

        <div
          v-for="(act, index) in acts"
          :key="act.id"
          class="dingyin-act-card"
          :class="{ expanded: expandedIndex === index }"
          @click="toggleExpand(index)"
        >
          <div class="dingyin-act-card-inner">
            <!-- 左侧：进度环 + 图标 -->
            <div class="dingyin-act-ring-area">
              <svg class="dingyin-act-ring" width="56" height="56" viewBox="0 0 56 56">
                <circle
                  cx="28" cy="28" r="24"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  stroke-width="4"
                />
                <circle
                  cx="28" cy="28" r="24"
                  fill="none"
                  :stroke="act.color"
                  stroke-width="4"
                  stroke-linecap="round"
                  :stroke-dasharray="`${2 * Math.PI * 24 * act.progress} ${2 * Math.PI * 24 * (1 - act.progress)}`"
                  transform="rotate(-90 28 28)"
                  class="dingyin-ring-fill"
                />
              </svg>
              <span class="dingyin-act-icon">{{ act.icon }}</span>
            </div>

            <!-- 中间：标题 + 摘要 -->
            <div class="dingyin-act-body">
              <h3 class="dingyin-act-title">{{ act.title }}</h3>
              <p class="dingyin-act-summary">{{ act.summary }}</p>
            </div>

            <!-- 右侧：展开箭头 -->
            <div class="dingyin-act-chevron" :class="{ open: expandedIndex === index }">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          <!-- 进度条 -->
          <div class="dingyin-progress-bar">
            <div
              class="dingyin-progress-fill"
              :style="{
                width: (act.progress * 100) + '%',
                background: `linear-gradient(90deg, ${act.color}66, ${act.color})`,
              }"
            />
          </div>

          <!-- 展开详情（使用 Transition 动画） -->
          <Transition name="dingyin-detail-expand">
            <div v-if="expandedIndex === index" class="dingyin-detail-area">
              <div class="dingyin-detail-inner">
                <div
                  v-for="(line, li) in act.detailLines"
                  :key="li"
                  class="dingyin-detail-line"
                >
                  <span class="dingyin-detail-bullet" :style="{ background: act.color }" />
                  <span class="dingyin-detail-text">{{ line }}</span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
      <div v-else class="dfa-empty">
        <div class="dfa-empty-icon-wrap">
          <span class="dfa-empty-icon">🔨</span>
        </div>
        <p class="dfa-empty-title">定音锤尚未敲响</p>
        <p class="dfa-empty-hint">当你在殿堂中留下足迹，定音锤会为你聚合来自所有角落的证据。先走走看看吧。</p>
      </div>
    </div>

    <!-- 铁律回应 -->
    <div v-if="showIronLaw" class="dfa-iron-law">
      <div class="dfa-iron-law-line"></div>
      <p class="dfa-iron-law-text">{{ ironLawResponse }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useViewEntrance } from '../composables/useViewEntrance'
import {
  gatherFourActs,
  getIronLawResponse,
  getFourActsProgress,
  knockAndGetFreshness,
  checkFreshness,
} from '../modules/mirror/dingyin-engine'
import type { FourActItem } from '../stores/advisor'
import type { DingyinFreshness } from '../modules/mirror/dingyin-engine'

const { entranceRef, entranceClass } = useViewEntrance()
const $router = useRouter()

// 四幕数据读自非响应式 storage，若用 computed 会被首次求值永久缓存，
// 导致停留页面期间其他模块新增数据无法回流。改为手动「敲锤」重读。
const acts = ref<FourActItem[]>([])
const progress = ref<{ completed: number; total: number }>({ completed: 0, total: 0 })
const lastKnockedAt = ref<string | null>(null)
const ironLawResponse = ref<string>('')
const freshness = ref<DingyinFreshness | null>(null)
const showIronLaw = ref(false)

const expandedIndex = ref<number | null>(null)

function knock() {
  acts.value = gatherFourActs()
  progress.value = getFourActsProgress()
  const f = knockAndGetFreshness()
  freshness.value = f
  ironLawResponse.value = getIronLawResponse()
  showIronLaw.value = acts.value.length > 0
  lastKnockedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })
}

function toggleExpand(index: number) {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function goBack() {
  $router.push('/advisor-hub')
}

onMounted(() => {
  // 先检查新鲜度（不记录敲锤），让用户知道是否有新证据
  freshness.value = checkFreshness()
  // 再执行初始敲锤
  knock()
})

</script>

<style scoped>
/* ============================================================
   DingyinFourActs — 定音锤四幕
   Full-screen reel style with dark gradient background
   ============================================================ */

/* ---- Root container ---- */
.dfa {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  position: relative;
  overflow: hidden;
}

/* ---- Atmosphere background ---- */
.dfa-atmos {
  position: absolute;
  top: -30%;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(140, 100, 200, 0.05) 0%, transparent 65%);
  pointer-events: none;
  z-index: 0;
}
.dfa-atmos::after {
  content: '';
  position: absolute;
  bottom: -20%;
  left: -30%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(200, 180, 120, 0.03) 0%, transparent 60%);
  pointer-events: none;
}

/* ---- Header ---- */
.dfa-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}

.dingyin-back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid rgba(200, 180, 160, 0.12);
  border-radius: 10px;
  padding: 8px 12px;
  color: rgba(200, 180, 160, 0.5);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-top: 4px;
}
.dingyin-back-btn:hover {
  border-color: rgba(200, 180, 160, 0.25);
  color: rgba(200, 180, 160, 0.75);
}
.back-label {
  letter-spacing: 1px;
}

.dfa-title-group {
  flex: 1;
}
.dfa-title {
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 6px;
  color: rgba(220, 200, 180, 0.9);
  margin: 0 0 4px;
}
.dfa-subtitle {
  font-size: 12px;
  letter-spacing: 3px;
  color: rgba(200, 180, 160, 0.35);
  margin: 0;
}

/* ---- Summary progress ---- */
.dingyin-summary-progress {
  position: relative;
  z-index: 1;
  margin-bottom: 28px;
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(200, 180, 160, 0.03);
  border: 1px solid rgba(200, 180, 160, 0.08);
}
.dfa-summary-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.dfa-summary-label {
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(200, 180, 160, 0.4);
}
.dfa-summary-value {
  font-size: 16px;
  font-weight: 600;
  color: rgba(220, 200, 180, 0.8);
  letter-spacing: 1px;
}
.dfa-progress-track {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(200, 180, 160, 0.06);
  overflow: hidden;
}
.dfa-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(200, 180, 120, 0.4), rgba(200, 180, 120, 0.7));
  transition: width 0.5s ease;
}

/* ---- Knock button ---- */
.dfa-knock-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.dfa-knock-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(200, 180, 120, 0.08);
  border: 1px solid rgba(200, 180, 120, 0.18);
  border-radius: 10px;
  padding: 7px 14px;
  color: rgba(220, 200, 180, 0.8);
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}
.dfa-knock-btn:hover {
  background: rgba(200, 180, 120, 0.16);
  border-color: rgba(200, 180, 120, 0.35);
  transform: translateY(-1px);
}
.dfa-knock-btn:active {
  transform: translateY(0);
}
.dfa-knock-time {
  font-size: 11px;
  color: rgba(200, 180, 160, 0.3);
  letter-spacing: 0.5px;
}

/* ---- Acts list ---- */
.dfa-acts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 1;
}

/* ---- Act card ---- */
.dingyin-act-card {
  background: rgba(200, 180, 160, 0.03);
  border: 1px solid rgba(200, 180, 160, 0.08);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
}
.dingyin-act-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: radial-gradient(ellipse at 50% 0%, rgba(200, 180, 160, 0.04) 0%, transparent 70%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.dingyin-act-card:hover::before {
  opacity: 1;
}
.dingyin-act-card:hover {
  background: rgba(200, 180, 160, 0.06);
  border-color: rgba(200, 180, 160, 0.15);
}
.dingyin-act-card.expanded {
  background: rgba(200, 180, 160, 0.06);
  border-color: rgba(200, 180, 160, 0.15);
}

/* ---- Card inner row ---- */
.dingyin-act-card-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  position: relative;
  z-index: 1;
}

/* ---- Ring area ---- */
.dingyin-act-ring-area {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dingyin-act-ring {
  position: absolute;
  top: 0;
  left: 0;
}
.dingyin-ring-fill {
  transition: stroke-dasharray 0.6s ease;
}
.dingyin-act-icon {
  font-size: 20px;
  z-index: 1;
  line-height: 1;
}

/* ---- Card body ---- */
.dingyin-act-body {
  flex: 1;
  min-width: 0;
}
.dingyin-act-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(220, 200, 180, 0.88);
  margin: 0 0 4px;
  letter-spacing: 1px;
}
.dingyin-act-summary {
  font-size: 12px;
  color: rgba(200, 180, 160, 0.45);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- Chevron ---- */
.dingyin-act-chevron {
  color: rgba(200, 180, 160, 0.25);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}
.dingyin-act-chevron.open {
  transform: rotate(180deg);
  color: rgba(200, 180, 160, 0.5);
}

/* ---- Progress bar ---- */
.dingyin-progress-bar {
  height: 3px;
  background: rgba(200, 180, 160, 0.04);
  position: relative;
  z-index: 1;
}
.dingyin-progress-fill {
  height: 100%;
  border-radius: 0 0 0 3px;
  transition: width 0.5s ease;
}

/* ---- Detail area (expandable) ---- */
.dingyin-detail-area {
  position: relative;
  z-index: 1;
}
.dingyin-detail-inner {
  padding: 4px 18px 16px 88px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dingyin-detail-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: rgba(200, 180, 160, 0.55);
  line-height: 1.5;
}
.dingyin-detail-bullet {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
}
.dingyin-detail-text {
  flex: 1;
}

/* ---- Transition animation ---- */
.dingyin-detail-expand-enter-active {
  transition: all 0.3s ease-out;
}
.dingyin-detail-expand-leave-active {
  transition: all 0.2s ease-in;
}
.dingyin-detail-expand-enter-from {
  opacity: 0;
  max-height: 0;
}
.dingyin-detail-expand-enter-to {
  opacity: 1;
  max-height: 300px;
}
.dingyin-detail-expand-leave-from {
  opacity: 1;
  max-height: 300px;
}
.dingyin-detail-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ---- Responsive ---- */
@media (max-width: 860px) {
  .dfa { padding: 32px 20px 64px; }
}

@media (max-width: 640px) {
  .dfa { padding: 24px 14px 56px; }
  .dfa-title { font-size: 22px; }
  .dingyin-act-card-inner { padding: 14px 14px; gap: 10px; }
  .dingyin-detail-inner { padding: 4px 14px 14px 78px; }
}

/* ---- 空状态 ---- */
.dfa-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  animation: dfa-empty-enter 0.5s ease-out;
}
.dfa-empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(200, 180, 160, 0.04);
  border: 1px solid rgba(200, 180, 160, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.dfa-empty-icon {
  font-size: 24px;
  opacity: 0.4;
}
.dfa-empty-title {
  font-size: 15px;
  color: rgba(220, 200, 180, 0.45);
  margin: 0 0 8px;
  font-weight: 500;
  letter-spacing: 2px;
}
.dfa-empty-hint {
  font-size: 12px;
  color: rgba(200, 180, 160, 0.25);
  margin: 0;
  line-height: 1.6;
  max-width: 260px;
  letter-spacing: 0.5px;
}
@keyframes dfa-empty-enter {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- 新鲜度提示 ---- */
.dfa-freshness-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(240, 192, 64, 0.06);
  border: 1px solid rgba(240, 192, 64, 0.15);
  margin-bottom: 4px;
  animation: dfa-freshness-enter 0.4s ease-out;
}
.dfa-freshness-icon {
  font-size: 14px;
  flex-shrink: 0;
}
.dfa-freshness-text {
  font-size: 12px;
  color: rgba(240, 210, 150, 0.6);
  letter-spacing: 0.5px;
  line-height: 1.4;
}
@keyframes dfa-freshness-enter {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- 铁律回应 ---- */
.dfa-iron-law {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px 20px;
  position: relative;
  z-index: 1;
  animation: dfa-iron-law-enter 0.6s ease-out 0.3s both;
}
.dfa-iron-law-line {
  width: 40px;
  height: 1px;
  background: rgba(200, 180, 160, 0.15);
  margin-bottom: 16px;
}
.dfa-iron-law-text {
  font-size: 13px;
  color: rgba(200, 180, 160, 0.35);
  letter-spacing: 2px;
  margin: 0;
  text-align: center;
  font-style: italic;
}
@keyframes dfa-iron-law-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>