<template>
  <div class="bedroom" :style="nightLightStyle">
    <!-- 氛围背景 -->
    <div class="bedroom-atmos">
      <div class="atmos-ambient-glow" :style="{ opacity: brightness / 100 }"></div>
      <div class="atmos-ceiling-gradient"></div>
    </div>

    <!-- 主内容区 -->
    <div class="bedroom-content">
      <!-- 头部 -->
      <header class="bedroom-header">
        <div class="header-ornament">
          <span class="orn-line"></span>
          <span class="orn-moon">&#9790;</span>
          <span class="orn-line"></span>
        </div>
        <h1 class="bedroom-title">卧室</h1>
        <p class="bedroom-subtitle">安眠与休憩的私密空间</p>
      </header>

      <!-- 睡眠数据面板 -->
      <section class="sleep-panel">
        <h2 class="panel-title">睡眠概况 · 近 7 日</h2>
        <div v-if="sleepStats.hasData" class="sleep-grid">
          <div class="sleep-card">
            <span class="sleep-value">{{ sleepStats.duration }}</span>
            <span class="sleep-unit">小时</span>
            <span class="sleep-label">平均时长</span>
          </div>
          <div class="sleep-card">
            <span class="sleep-value">{{ sleepStats.quality }}</span>
            <span class="sleep-unit">/ 5</span>
            <span class="sleep-label">睡眠质量</span>
          </div>
          <div class="sleep-card">
            <span class="sleep-value">{{ sleepStats.deepSleep }}</span>
            <span class="sleep-unit">%</span>
            <span class="sleep-label">深睡占比</span>
          </div>
          <div class="sleep-card">
            <span class="sleep-value">{{ sleepStats.bedtime }}</span>
            <span class="sleep-unit"></span>
            <span class="sleep-label">最近就寝</span>
          </div>
        </div>
        <div v-else class="sleep-empty">
          <p>还没有睡眠记录。身体温室里的睡眠数据会在这里汇聚成你的安眠画像。</p>
        </div>
        <button class="sleep-record-btn" @click="showRecordForm = !showRecordForm">
          {{ showRecordForm ? '收起' : '记录昨夜睡眠' }}
        </button>

        <!-- 记录睡眠表单 -->
        <div v-if="showRecordForm" class="sleep-form">
          <div class="form-row">
            <label class="form-label">入睡</label>
            <input type="time" v-model="sleepTime" class="form-input" />
          </div>
          <div class="form-row">
            <label class="form-label">起床</label>
            <input type="time" v-model="wakeTime" class="form-input" />
          </div>
          <div class="form-row">
            <label class="form-label">质量 {{ sleepQuality }} / 5</label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              v-model.number="sleepQuality"
              class="form-range"
            />
          </div>
          <div class="form-row">
            <label class="form-label">梦境</label>
            <input
              type="text"
              v-model="dreamNote"
              maxlength="60"
              placeholder="可选 · 记下今夜的梦"
              class="form-input"
            />
          </div>
          <button class="sleep-submit" @click="submitSleep">保存睡眠</button>
        </div>
      </section>

      <!-- 最近梦境（真实数据联动） -->
      <section v-if="latestDream" class="dream-section">
        <h2 class="panel-title">最近梦境</h2>
        <div class="dream-card">
          <span class="dream-quote">“</span>
          <p class="dream-text">{{ latestDream }}</p>
          <span class="dream-foot">— 来自昨夜的睡眠记录</span>
        </div>
      </section>

      <!-- 功能入口 -->
      <section class="action-panel">
        <!-- 梦乡小筑 -->
        <button class="action-btn dream-btn" @click="goDreamNook">
          <span class="action-icon">&#x1F319;</span>
          <span class="action-info">
            <span class="action-label">梦乡小筑</span>
            <span class="action-desc">进入梦境记录与探索</span>
          </span>
          <span class="action-arrow">&rarr;</span>
        </button>

        <!-- 夜灯控制 -->
        <div class="nightlight-control">
          <div class="nightlight-header">
            <span class="nightlight-icon">&#x1F4A1;</span>
            <span class="nightlight-label">夜灯</span>
            <span class="nightlight-value">{{ brightness }}%</span>
          </div>
          <div class="nightlight-slider-track">
            <input
              type="range"
              class="nightlight-slider"
              min="0"
              max="100"
              v-model.number="brightness"
              @input="onBrightnessChange"
              aria-label="夜灯亮度调节"
            />
            <div class="slider-fill" :style="{ width: brightness + '%' }"></div>
          </div>
          <div class="nightlight-footer">
            <span class="nightlight-temp">柔和琥珀 2200K</span>
            <span class="nightlight-color-swatch" :style="{ background: '#f0d5b0' }"></span>
          </div>
        </div>
      </section>

      <!-- 导航按钮 -->
      <section class="navigation-panel">
        <h2 class="panel-title">前往其他房间</h2>
        <div class="nav-buttons">
          <button
            class="nav-btn"
            @click="emit('navigate', 'bathroom')"
          >
            <span class="nav-btn-icon">&#x1F6C1;</span>
            <span class="nav-btn-label">走向浴室</span>
          </button>
          <button
            class="nav-btn"
            @click="emit('navigate', 'wardrobe')"
          >
            <span class="nav-btn-icon">&#x1F454;</span>
            <span class="nav-btn-label">走向衣帽间</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storage } from '../../engine/storage'
import { useBodyGreenhouse } from '../../modules/body'

const emit = defineEmits<{
  (e: 'navigate', roomId: string): void
}>()

// ---- 夜灯亮度（房间本地偏好，保留）----
const brightness = ref(30)

// ---- 睡眠数据（接通 Body 温室真实记录）----
const greenhouse = useBodyGreenhouse()

const sleepStats = computed(() => {
  const recs = greenhouse.sleepRecords.value
  if (recs.length === 0) {
    return { hasData: false, duration: '--', quality: '--', deepSleep: '--', bedtime: '--', count: 0 }
  }
  const avgMin = greenhouse.getSleepAvg7d()
  const quality = greenhouse.getSleepQualityAvg7d()
  const withDeep = recs.filter((r) => typeof r.deepSleep === 'number' && r.duration > 0)
  const deepPct =
    withDeep.length > 0
      ? Math.round(
          withDeep.reduce((s, r) => s + ((r.deepSleep as number) / r.duration) * 100, 0) /
            withDeep.length,
        )
      : null
  const sorted = [...recs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  const latest = sorted[0]
  return {
    hasData: true,
    duration: avgMin > 0 ? (avgMin / 60).toFixed(1) : '--',
    quality: quality > 0 ? quality.toFixed(1) : '--',
    deepSleep: deepPct !== null ? String(deepPct) : '--',
    bedtime: latest.sleepAt ? formatClock(latest.sleepAt) : '--',
    count: recs.length,
  }
})

function formatClock(iso: string): string {
  const t = iso.includes('T') ? iso.slice(11, 16) : iso
  return t || '--'
}

// ---- 记录睡眠（真实持久化到 Body 温室）----
const showRecordForm = ref(false)
const sleepTime = ref('23:00')
const wakeTime = ref('07:00')
const sleepQuality = ref(4)
const dreamNote = ref('')

function buildIso(time: string, nextDay = false): string {
  const now = new Date()
  const [h, m] = time.split(':').map(Number)
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0)
  if (nextDay) d.setDate(d.getDate() + 1)
  return d.toISOString()
}

function submitSleep() {
  const sleepAt = buildIso(sleepTime.value)
  const wakeAt = wakeTime.value <= sleepTime.value ? buildIso(wakeTime.value, true) : buildIso(wakeTime.value)
  greenhouse.addSleep(sleepAt, wakeAt, sleepQuality.value, dreamNote.value.trim() || undefined)
  showRecordForm.value = false
  dreamNote.value = ''
}

// ---- 最近梦境（真实数据联动）----
const latestDream = computed(() => {
  const recs = [...greenhouse.sleepRecords.value]
    .filter((r) => r.dreamNote && r.dreamNote.trim().length > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return recs.length > 0 ? recs[0].dreamNote!.trim() : null
})

// ---- 夜灯亮度持久化 ----
function loadBrightness() {
  const saved = storage.getKV('hf:home:bedroom:nightLightBrightness', null)
  if (saved !== null) brightness.value = Number(saved)
}

function saveBrightness() {
  storage.setKV('hf:home:bedroom:nightLightBrightness', brightness.value)
}

function onBrightnessChange() {
  saveBrightness()
}

// ---- 氛围光色计算 ----
const nightLightStyle = computed(() => ({
  '--ambient-color': '#f0d5b0',
  '--ambient-opacity': brightness.value / 100,
}))

// ---- 导航 ----
function goDreamNook() {
  // 通过 window.location 导航到 /dream-nook
  // 父组件也可通过 emit('navigate') 实现自定义导航逻辑
  window.location.href = '/dream-nook'
}

// ---- 初始化 ----
onMounted(() => {
  loadBrightness()
})
</script>

<style scoped>
/* ============================================================
   卧室 · 深夜食堂暖琥珀主题
   深色背景 + 暖琥珀强调色 var(--amber-100) (2200K)
   ============================================================ */

.bedroom {
  position: relative;
  min-height: 100vh;
  background: transparent;
  color: var(--text-primary);
  overflow: hidden;
  font-family: var(--font-body-zh);
}

/* ---- 氛围背景 ---- */
.bedroom-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.atmos-ambient-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 60% 40% at 50% 70%,
      rgba(240, 213, 176, 0.15) 0%,
      transparent 70%
    ),
    radial-gradient(
      ellipse 40% 30% at 30% 50%,
      rgba(240, 213, 176, 0.08) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 40% 30% at 70% 50%,
      rgba(240, 213, 176, 0.06) 0%,
      transparent 60%
    );
  transition: opacity 0.6s ease;
}

.atmos-ceiling-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(
    180deg,
    rgba(240, 213, 176, 0.04) 0%,
    transparent 100%
  );
}

/* ---- 主内容区 ---- */
.bedroom-content {
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
.bedroom-content > * {
  animation: bedroom-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.bedroom-content > *:nth-child(1) { animation-delay: 0.04s; }
.bedroom-content > *:nth-child(2) { animation-delay: 0.10s; }
.bedroom-content > *:nth-child(3) { animation-delay: 0.16s; }
.bedroom-content > *:nth-child(4) { animation-delay: 0.22s; }
.bedroom-content > *:nth-child(5) { animation-delay: 0.28s; }

@keyframes bedroom-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .bedroom-content > * { animation: none; }
}

/* ---- 头部 ---- */
.bedroom-header {
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
    rgba(240, 213, 176, 0.2),
    transparent
  );
}

.orn-moon {
  font-size: 14px;
  color: rgba(240, 213, 176, 0.5);
  letter-spacing: 2px;
}

.bedroom-title {
  font-size: 26px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.bedroom-subtitle {
  font-size: 13px;
  color: var(--text-low);
  margin: 0;
  letter-spacing: 1px;
}

/* ---- 通用面板标题 ---- */
.panel-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-dim);
  margin: 0 0 14px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

/* ---- 睡眠数据面板 ---- */
.sleep-panel {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(240, 213, 176, 0.06);
  backdrop-filter: blur(8px);
}

.sleep-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.sleep-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 16px 8px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(240, 213, 176, 0.04);
  transition: all 0.3s ease;
}

.sleep-card:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(240, 213, 176, 0.08);
}

.sleep-value {
  font-size: 24px;
  font-weight: 500;
  color: var(--amber-100);
  line-height: 1.2;
}

.sleep-unit {
  font-size: 11px;
  color: rgba(240, 213, 176, 0.4);
  letter-spacing: 0.5px;
}

.sleep-label {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 4px;
  letter-spacing: 0.5px;
}

/* 空态 */
.sleep-empty {
  padding: 20px 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px dashed rgba(240, 213, 176, 0.12);
}

.sleep-empty p {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.sleep-record-btn {
  margin-top: 14px;
  width: 100%;
  padding: 11px;
  border-radius: 12px;
  border: 1px solid rgba(240, 213, 176, 0.14);
  background: rgba(240, 213, 176, 0.04);
  color: var(--amber-100);
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.25s ease;
}

.sleep-record-btn:hover {
  background: rgba(240, 213, 176, 0.09);
  border-color: rgba(240, 213, 176, 0.24);
}

/* 记录表单 */
.sleep-form {
  margin-top: 14px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(240, 213, 176, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-label {
  flex: 0 0 84px;
  font-size: 12px;
  color: var(--text-medium);
  letter-spacing: 0.3px;
}

.form-input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(240, 213, 176, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: rgba(240, 213, 176, 0.3);
}

.form-range {
  flex: 1;
  accent-color: var(--amber-100);
}

.sleep-submit {
  margin-top: 4px;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--amber-100), #d8b486);
  color: #1a140d;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.25s ease;
}

.sleep-submit:hover {
  filter: brightness(1.08);
}

/* ---- 最近梦境 ---- */
.dream-section {
  padding: 0;
}

.dream-card {
  position: relative;
  padding: 20px 22px 16px;
  border-radius: 16px;
  background: rgba(240, 213, 176, 0.03);
  border: 1px solid rgba(240, 213, 176, 0.08);
}

.dream-quote {
  position: absolute;
  top: 4px;
  left: 14px;
  font-size: 28px;
  line-height: 1;
  color: rgba(240, 213, 176, 0.45);
  font-family: var(--font-heading-zh);
}

.dream-text {
  margin: 6px 0 8px;
  padding-left: 22px;
  font-size: 14px;
  line-height: 1.8;
  color: rgba(240, 213, 176, 0.75);
  font-style: italic;
  letter-spacing: 0.3px;
  word-break: break-word;
}

.dream-foot {
  display: block;
  text-align: right;
  font-size: 11px;
  color: rgba(240, 213, 176, 0.3);
  letter-spacing: 0.5px;
}

/* ---- 功能面板 ---- */
.action-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 梦乡小筑入口 */
.action-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 20px;
  border: 1px solid rgba(240, 213, 176, 0.1);
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(240, 213, 176, 0.06) 0%,
    rgba(240, 213, 176, 0.02) 100%
  );
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  text-align: left;
}

.action-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(240, 213, 176, 0.1) 0%,
    rgba(240, 213, 176, 0.04) 100%
  );
  border-color: rgba(240, 213, 176, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(240, 213, 176, 0.04);
}

.action-btn:active {
  transform: translateY(0);
}

.action-icon {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.action-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--amber-100);
  letter-spacing: 0.5px;
}

.action-desc {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.action-arrow {
  font-size: 18px;
  color: rgba(240, 213, 176, 0.3);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.action-btn:hover .action-arrow {
  color: rgba(240, 213, 176, 0.6);
  transform: translateX(3px);
}

/* 夜灯控制 */
.nightlight-control {
  padding: 18px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(240, 213, 176, 0.06);
}

.nightlight-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.nightlight-icon {
  font-size: 20px;
  line-height: 1;
}

.nightlight-label {
  font-size: 13px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
  flex: 1;
}

.nightlight-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--amber-100);
  font-variant-numeric: tabular-nums;
}

/* 自定义滑块轨道 */
.nightlight-slider-track {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: rgba(240, 213, 176, 0.08);
  margin-bottom: 12px;
}

.slider-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(
    90deg,
    rgba(240, 213, 176, 0.3) 0%,
    var(--amber-100) 100%
  );
  pointer-events: none;
  transition: width 0.05s ease;
}

.nightlight-slider {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  margin: 0;
  z-index: 1;
}

.nightlight-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--amber-100);
  border: 2px solid rgba(240, 213, 176, 0.3);
  box-shadow: 0 0 12px rgba(240, 213, 176, 0.2), 0 0 24px rgba(240, 213, 176, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.nightlight-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 0 16px rgba(240, 213, 176, 0.3), 0 0 32px rgba(240, 213, 176, 0.15);
}

.nightlight-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--amber-100);
  border: 2px solid rgba(240, 213, 176, 0.3);
  box-shadow: 0 0 12px rgba(240, 213, 176, 0.2);
  cursor: pointer;
}

.nightlight-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nightlight-temp {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.25);
  letter-spacing: 0.3px;
}

.nightlight-color-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(240, 213, 176, 0.15);
  flex-shrink: 0;
}

/* ---- 导航面板 ---- */
.navigation-panel {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(240, 213, 176, 0.06);
}

.nav-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 12px;
  border-radius: 14px;
  border: 1px solid rgba(240, 213, 176, 0.08);
  background: rgba(0, 0, 0, 0.15);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.nav-btn:hover {
  background: rgba(240, 213, 176, 0.06);
  border-color: rgba(240, 213, 176, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(240, 213, 176, 0.03);
}

.nav-btn:active {
  transform: translateY(0);
}

.nav-btn-icon {
  font-size: 24px;
  line-height: 1;
}

.nav-btn-label {
  font-size: 12px;
  color: var(--text-medium);
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
}

.nav-btn:hover .nav-btn-label {
  color: var(--amber-100);
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .bedroom-content {
    padding: 32px 16px 80px;
    gap: 24px;
  }

  .bedroom-title {
    font-size: 22px;
  }

  .sleep-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .sleep-card {
    padding: 14px 8px;
  }

  .sleep-value {
    font-size: 20px;
  }

  .action-btn {
    padding: 14px 16px;
  }

  .action-icon {
    font-size: 24px;
  }

  .nightlight-control {
    padding: 14px 16px;
  }

  .nav-buttons {
    grid-template-columns: 1fr;
  }

  .nav-btn {
    flex-direction: row;
    justify-content: center;
    padding: 14px 16px;
  }

  .navigation-panel {
    padding: 16px;
  }
}

@media (max-width: 400px) {
  .sleep-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>