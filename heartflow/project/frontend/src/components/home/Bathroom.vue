<template>
  <div class="bathroom" :style="ambientStyle">
    <!-- 氛围背景 -->
    <div class="bathroom-atmos">
      <div class="atmos-water-glow"></div>
      <div class="atmos-steam-layer"></div>
    </div>

    <div class="bathroom-content">
      <!-- 头部 -->
      <header class="bathroom-header">
        <div class="header-ornament">
          <span class="orn-line"></span>
          <span class="orn-wave">&#8767;</span>
          <span class="orn-line"></span>
        </div>
        <h1 class="bathroom-title">浴室</h1>
        <p class="bathroom-subtitle">水汽氤氲 · 身心涤荡</p>
      </header>

      <!-- 镜面雾气交互 -->
      <section class="mirror-section">
        <div
          class="mirror"
          @mouseenter="mirrorFogged = true"
          @mouseleave="mirrorFogged = false"
        >
          <div class="mirror-frame"></div>
          <div class="mirror-surface">
            <!-- 雾气层 -->
            <div class="mirror-fog" :class="{ 'mirror-fog--clear': !mirrorFogged }">
              <div class="fog-particles">
                <span v-for="i in 12" :key="i" class="fog-particle" :style="fogParticleStyle(i)"></span>
              </div>
            </div>
            <!-- 镜面后文字 -->
            <div class="mirror-notes" :class="{ 'mirror-notes--visible': !mirrorFogged }">
              <div class="mirror-notes-inner">
                <p
                  v-for="(note, idx) in hiddenNotes"
                  :key="idx"
                  class="mirror-note"
                >{{ note }}</p>
              </div>
              <div class="mirror-notes-hint">— 鼠标划过镜面可见 —</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 放松记录 -->
      <section class="relax-panel">
        <h2 class="panel-title">放松记录</h2>
        <div class="relax-list">
          <div
            v-for="(record, idx) in relaxRecords"
            :key="idx"
            class="relax-item"
          >
            <span class="relax-icon">{{ record.icon }}</span>
            <div class="relax-info">
              <span class="relax-type">{{ record.type }}</span>
              <span class="relax-time">{{ record.time }}</span>
            </div>
            <span class="relax-duration">{{ record.duration }}</span>
            <button
              class="relax-remove"
              title="删除该记录"
              @click="removeRelax(idx)"
            >×</button>
          </div>
          <div v-if="relaxRecords.length === 0" class="relax-empty">
            暂无放松记录，让热水冲刷疲惫吧
          </div>
        </div>

        <!-- 新增放松记录 -->
        <div class="relax-add">
          <div class="relax-add-presets">
            <button
              v-for="preset in relaxPresets"
              :key="preset"
              class="relax-preset"
              :class="{ 'relax-preset--active': newRelaxType === preset }"
              @click="newRelaxType = preset"
            >{{ preset }}</button>
          </div>
          <div class="relax-add-row">
            <div class="relax-add-field">
              <label class="relax-add-label">时长</label>
              <input
                v-model.number="newRelaxDuration"
                class="relax-add-input"
                type="number"
                min="1"
                max="180"
              />
              <span class="relax-add-unit">分钟</span>
            </div>
            <button class="relax-add-btn" @click="addRelax">
              记录一次放松
            </button>
          </div>
        </div>

        <p class="relax-total">累计放松 <b>{{ totalRelaxMinutes }}</b> 分钟 · 让水汽带走疲惫</p>
      </section>

      <!-- 身体护理习惯追踪 -->
      <section class="care-panel">
        <h2 class="panel-title">身体护理习惯</h2>
        <div class="care-grid">
          <div
            v-for="(habit, idx) in careHabits"
            :key="idx"
            class="care-card"
            :class="{ 'care-card--done': habit.done }"
            @click="toggleHabit(idx)"
          >
            <span class="care-icon">{{ habit.icon }}</span>
            <span class="care-label">{{ habit.label }}</span>
            <span class="care-check">{{ habit.done ? '&#10003;' : '&#9675;' }}</span>
          </div>
        </div>
        <div class="care-progress">
          <div class="care-progress-track">
            <div
              class="care-progress-fill"
              :style="{ width: careProgressPercent + '%' }"
            ></div>
          </div>
          <span class="care-progress-text">{{ doneCount }} / {{ careHabits.length }}</span>
        </div>
      </section>

      <!-- 导航按钮 -->
      <section class="navigation-panel">
        <button class="nav-btn" @click="emit('navigate', 'bedroom')">
          <span class="nav-btn-icon">&#x1F6AA;</span>
          <span class="nav-btn-label">回到卧室</span>
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storage } from '../../engine/storage'

const emit = defineEmits<{
  (e: 'navigate', roomId: string): void
}>()

// ---- KV 前缀 ----
const KV_PREFIX = 'hf:home:bath'

// ---- 镜面雾气交互 ----
const mirrorFogged = ref(true)

const hiddenNotes = ref<string[]>([
  '今天也要好好对待自己',
  '水知道答案，心知道方向',
  '每一次呼吸都是重生',
])

function fogParticleStyle(i: number) {
  const left = ((i * 37 + 13) % 100)
  const top = ((i * 23 + 7) % 100)
  const delay = (i * 0.7) % 3
  const size = 4 + (i % 6)
  return {
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`,
    width: `${size}px`,
    height: `${size}px`,
  }
}

// ---- 放松记录 ----
interface RelaxRecord {
  icon: string
  type: string
  time: string
  duration: string
}

const relaxRecords = ref<RelaxRecord[]>([])

const newRelaxType = ref('泡澡')
const newRelaxDuration = ref(20)
const relaxPresets = ['泡澡', '淋浴', '冥想', '拉伸', '蒸汽']

function addRelax() {
  const record: RelaxRecord = {
    icon: '🛁',
    type: newRelaxType.value.trim() || '放松',
    time: new Date().toISOString().slice(11, 16),
    duration: `${newRelaxDuration.value} 分钟`,
  }
  relaxRecords.value = [record, ...relaxRecords.value].slice(0, 20)
  storage.setKV(`${KV_PREFIX}:relaxRecords`, relaxRecords.value)
}

function removeRelax(index: number) {
  relaxRecords.value.splice(index, 1)
  storage.setKV(`${KV_PREFIX}:relaxRecords`, relaxRecords.value)
}

function loadRelaxRecords() {
  const saved = storage.getKV<RelaxRecord[] | null>(`${KV_PREFIX}:relaxRecords`, null)
  if (saved && Array.isArray(saved)) {
    relaxRecords.value = saved
  }
}

// ---- 身体护理习惯 ----
interface CareHabit {
  icon: string
  label: string
  done: boolean
}

const careHabits = ref<CareHabit[]>([
  { icon: '&#x1F9F6;', label: '面部清洁', done: false },
  { icon: '&#x1F9F4;', label: '牙齿护理', done: false },
  { icon: '&#x1F9F5;', label: '头发护理', done: false },
  { icon: '&#x1F9D6;', label: '身体保湿', done: false },
  { icon: '&#x1F9DC;', label: '泡脚放松', done: false },
  { icon: '&#x1F9CA;', label: '肩颈拉伸', done: false },
])

const doneCount = computed(() => careHabits.value.filter((h) => h.done).length)

const careProgressPercent = computed(() => {
  if (careHabits.value.length === 0) return 0
  return Math.round((doneCount.value / careHabits.value.length) * 100)
})

function toggleHabit(index: number) {
  careHabits.value[index].done = !careHabits.value[index].done
  saveCareHabits()
}

function loadCareHabits() {
  const saved = storage.getKV<CareHabit[] | null>(`${KV_PREFIX}:careHabits`, null)
  if (saved && Array.isArray(saved)) {
    careHabits.value = saved
  }
}

function saveCareHabits() {
  storage.setKV(`${KV_PREFIX}:careHabits`, careHabits.value)
}

// ---- 累计放松时长（真实数据联动）----
const totalRelaxMinutes = computed(() => {
  return relaxRecords.value.reduce((acc, r) => {
    const m = /(\d+)/.exec(r.duration)
    return acc + (m ? Number(m[1]) : 0)
  }, 0)
})

// ---- 氛围光色 ----
const ambientStyle = computed(() => ({
  '--ambient-color': '#c8e8f0',
  '--ambient-opacity': 0.15,
}))

// ---- 初始化 ----
onMounted(() => {
  loadRelaxRecords()
  loadCareHabits()
})
</script>

<style scoped>
/* ============================================================
   浴室 · 深夜食堂暖琥珀主题
   深色背景 + 水雾蓝 5000K (#c8e8f0) 氛围光
   ============================================================ */

.bathroom {
  position: relative;
  min-height: 100vh;
  background: transparent;
  color: var(--text-disabled);
  overflow: hidden;
  font-family: var(--font-body-zh);
}

/* ---- 氛围背景 ---- */
.bathroom-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.atmos-water-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 60% 40% at 50% 60%,
      rgba(200, 232, 240, 0.10) 0%,
      transparent 65%
    ),
    radial-gradient(
      ellipse 40% 30% at 30% 40%,
      rgba(200, 232, 240, 0.06) 0%,
      transparent 55%
    ),
    radial-gradient(
      ellipse 40% 30% at 70% 40%,
      rgba(200, 232, 240, 0.04) 0%,
      transparent 55%
    );
  animation: water-breathe 6s ease-in-out infinite;
}

.atmos-steam-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 180px;
  background: linear-gradient(
    180deg,
    rgba(200, 232, 240, 0.03) 0%,
    transparent 100%
  );
}

@keyframes water-breathe {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ---- 主内容区 ---- */
.bathroom-content {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px 100px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* ---- 内部区块入场错位动画 ---- */
.bathroom-content > * {
  animation: bathroom-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.bathroom-content > *:nth-child(1) { animation-delay: 0.04s; }
.bathroom-content > *:nth-child(2) { animation-delay: 0.10s; }
.bathroom-content > *:nth-child(3) { animation-delay: 0.16s; }
.bathroom-content > *:nth-child(4) { animation-delay: 0.22s; }
.bathroom-content > *:nth-child(5) { animation-delay: 0.28s; }

@keyframes bathroom-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .bathroom-content > * { animation: none; }
}

/* ---- 头部 ---- */
.bathroom-header {
  text-align: center;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
}

.orn-line {
  display: block;
  width: 48px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(200, 232, 240, 0.2),
    transparent
  );
}

.orn-wave {
  font-size: 16px;
  color: rgba(200, 232, 240, 0.4);
  letter-spacing: 2px;
}

.bathroom-title {
  font-size: 26px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-disabled);
  margin: 0 0 8px;
}

.bathroom-subtitle {
  font-size: 13px;
  color: rgba(224, 224, 224, 0.52);
  margin: 0;
  letter-spacing: 1px;
}

/* ---- 通用面板标题 ---- */
.panel-title {
  font-size: 12px;
  font-weight: 500;
  color: rgba(224, 224, 224, 0.55);
  margin: 0 0 14px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

/* ---- 镜面雾气交互 ---- */
.mirror-section {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.mirror {
  position: relative;
  width: 320px;
  height: 220px;
  cursor: pointer;
}

.mirror-frame {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  border: 2px solid rgba(200, 232, 240, 0.15);
  background: rgba(0, 0, 0, 0.3);
  box-shadow:
    0 0 30px rgba(200, 232, 240, 0.04),
    inset 0 0 40px rgba(200, 232, 240, 0.02);
}

.mirror-surface {
  position: absolute;
  inset: 6px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    rgba(200, 232, 240, 0.04) 0%,
    rgba(200, 232, 240, 0.01) 100%
  );
}

/* 雾气层 */
.mirror-fog {
  position: absolute;
  inset: 0;
  z-index: 2;
  transition: opacity 0.8s ease;
}

.mirror-fog--clear {
  opacity: 0;
}

.fog-particles {
  position: absolute;
  inset: 0;
}

.fog-particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(200, 232, 240, 0.15) 0%,
    transparent 70%
  );
  animation: fog-drift 4s ease-in-out infinite;
}

@keyframes fog-drift {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.3;
  }
  25% {
    transform: translate(4px, -3px) scale(1.15);
    opacity: 0.5;
  }
  50% {
    transform: translate(-2px, -6px) scale(0.9);
    opacity: 0.4;
  }
  75% {
    transform: translate(3px, -2px) scale(1.1);
    opacity: 0.5;
  }
}

/* 镜面后文字 */
.mirror-notes {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  opacity: 0;
  transition: opacity 0.8s ease;
}

.mirror-notes--visible {
  opacity: 1;
}

.mirror-notes-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mirror-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(200, 232, 240, 0.7);
  text-align: center;
  letter-spacing: 0.5px;
  font-style: italic;
}

.mirror-notes-hint {
  font-size: 10px;
  color: rgba(200, 232, 240, 0.4);
  letter-spacing: 1px;
  margin-top: 6px;
}

/* ---- 放松记录面板 ---- */
.relax-panel {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(200, 232, 240, 0.06);
  backdrop-filter: blur(8px);
}

.relax-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relax-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(200, 232, 240, 0.04);
  transition: all 0.3s ease;
}

.relax-item:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(200, 232, 240, 0.08);
}

.relax-icon {
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
}

.relax-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.relax-type {
  font-size: 13px;
  color: #c8e8f0;
  letter-spacing: 0.3px;
}

.relax-time {
  font-size: 11px;
  color: rgba(224, 224, 224, 0.5);
  letter-spacing: 0.3px;
}

.relax-duration {
  font-size: 13px;
  font-weight: 500;
  color: rgba(200, 232, 240, 0.5);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.relax-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 12px;
  color: rgba(224, 224, 224, 0.4);
  letter-spacing: 0.5px;
}

.relax-remove {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(200, 232, 240, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: rgba(200, 232, 240, 0.4);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.relax-remove:hover {
  color: #c8e8f0;
  border-color: rgba(200, 232, 240, 0.3);
  background: rgba(200, 232, 240, 0.06);
}

/* 新增放松记录 */
.relax-add {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(200, 232, 240, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.relax-add-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.relax-preset {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(200, 232, 240, 0.1);
  background: rgba(0, 0, 0, 0.2);
  color: rgba(224, 224, 224, 0.5);
  font-size: 12px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
}

.relax-preset:hover {
  color: #c8e8f0;
  border-color: rgba(200, 232, 240, 0.2);
}

.relax-preset--active {
  color: #0f0e0d;
  background: #c8e8f0;
  border-color: #c8e8f0;
}

.relax-add-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.relax-add-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.relax-add-label {
  font-size: 12px;
  color: rgba(224, 224, 224, 0.55);
  letter-spacing: 0.5px;
}

.relax-add-input {
  width: 60px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(200, 232, 240, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: #c8e8f0;
  font-size: 13px;
  font-family: inherit;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.relax-add-input:focus {
  outline: none;
  border-color: rgba(200, 232, 240, 0.3);
}

.relax-add-unit {
  font-size: 12px;
  color: rgba(224, 224, 224, 0.55);
}

.relax-add-btn {
  flex: 1;
  padding: 9px 16px;
  border-radius: 10px;
  border: 1px solid rgba(200, 232, 240, 0.15);
  background: rgba(200, 232, 240, 0.06);
  color: #c8e8f0;
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
}

.relax-add-btn:hover {
  background: rgba(200, 232, 240, 0.12);
  border-color: rgba(200, 232, 240, 0.28);
}

.relax-add-btn:active {
  transform: translateY(1px);
}

/* ---- 累计放松提示 ---- */
.relax-total {
  margin: 14px 0 0;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.5px;
  color: rgba(224, 224, 224, 0.5);
}

.relax-total b {
  color: #c8e8f0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ---- 身体护理习惯追踪 ---- */
.care-panel {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(200, 232, 240, 0.06);
  backdrop-filter: blur(8px);
}

.care-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.care-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(200, 232, 240, 0.04);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  color: var(--text-disabled);
}

.care-card:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(200, 232, 240, 0.1);
  transform: translateY(-1px);
}

.care-card--done {
  border-color: rgba(200, 232, 240, 0.15);
  background: rgba(200, 232, 240, 0.04);
}

.care-icon {
  font-size: 22px;
  line-height: 1;
}

.care-label {
  font-size: 11px;
  color: rgba(224, 224, 224, 0.5);
  letter-spacing: 0.3px;
  text-align: center;
}

.care-card--done .care-label {
  color: #c8e8f0;
}

.care-check {
  font-size: 14px;
  color: rgba(200, 232, 240, 0.15);
  transition: color 0.3s ease;
}

.care-card--done .care-check {
  color: rgba(200, 232, 240, 0.6);
}

/* 进度条 */
.care-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.care-progress-track {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(200, 232, 240, 0.06);
  overflow: hidden;
}

.care-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    rgba(200, 232, 240, 0.3) 0%,
    #c8e8f0 100%
  );
  transition: width 0.4s ease;
}

.care-progress-text {
  font-size: 11px;
  color: rgba(200, 232, 240, 0.55);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* ---- 导航面板 ---- */
.navigation-panel {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  border-radius: 999px;
  border: 1px solid rgba(200, 232, 240, 0.1);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-disabled);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  backdrop-filter: blur(8px);
}

.nav-btn:hover {
  background: rgba(200, 232, 240, 0.06);
  border-color: rgba(200, 232, 240, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(200, 232, 240, 0.03);
}

.nav-btn:active {
  transform: translateY(0);
}

.nav-btn-icon {
  font-size: 20px;
  line-height: 1;
}

.nav-btn-label {
  font-size: 14px;
  letter-spacing: 1px;
  color: rgba(224, 224, 224, 0.6);
  transition: color 0.3s ease;
}

.nav-btn:hover .nav-btn-label {
  color: #c8e8f0;
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .bathroom-content {
    padding: 32px 16px 80px;
    gap: 24px;
  }

  .bathroom-title {
    font-size: 22px;
  }

  .mirror {
    width: 260px;
    height: 180px;
  }

  .mirror-note {
    font-size: 12px;
  }

  .care-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .care-card {
    padding: 12px 8px;
  }

  .care-icon {
    font-size: 18px;
  }

  .care-label {
    font-size: 10px;
  }

  .relax-item {
    padding: 10px 12px;
  }

  .nav-btn {
    padding: 12px 24px;
  }
}

@media (max-width: 400px) {
  .care-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .mirror {
    width: 100%;
    max-width: 240px;
    height: 160px;
  }
}
</style>