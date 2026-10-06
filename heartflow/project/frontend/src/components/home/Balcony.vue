<template>
  <div class="balcony">
    <!-- 氛围背景 -->
    <div class="balcony-atmos">
      <div class="atmos-city-glow"></div>
      <div class="atmos-horizon-mist"></div>
      <div class="atmos-starfield"></div>
    </div>

    <!-- 主内容区 -->
    <div class="balcony-content">
      <!-- 头部 -->
      <header class="balcony-header">
        <div class="header-ornament">
          <span class="orn-line"></span>
          <span class="orn-sun">&#127769;</span>
          <span class="orn-line"></span>
        </div>
        <h1 class="balcony-title">阳台</h1>
        <p class="balcony-subtitle">推开窗 · 让夜色落进眼里</p>
      </header>

      <!-- 此刻时分 -->
      <section class="clock-section">
        <div class="clock-card">
          <span class="clock-time">{{ clockText }}</span>
          <span class="clock-greeting">{{ clockGreeting }}</span>
        </div>
      </section>

      <!-- 驻足片刻 -->
      <section class="moment-section">
        <div class="panel-label">
          <span class="panel-label__icon">&#9998;</span>
          <span>驻足片刻</span>
        </div>

        <div class="moment-form">
          <textarea
            v-model="newMoment"
            class="moment-input"
            rows="2"
            maxlength="120"
            placeholder="此刻看到的、想到的，轻轻记下来…"
            @keydown.enter.exact.prevent="addMoment"
          ></textarea>
          <button class="moment-add" :disabled="!newMoment.trim()" @click="addMoment">
            记下
          </button>
        </div>

        <div class="moment-list">
          <div
            v-for="(m, idx) in moments"
            :key="m.id"
            class="moment-item"
          >
            <p class="moment-text">{{ m.text }}</p>
            <div class="moment-meta">
              <span class="moment-time">{{ m.at }}</span>
              <button class="moment-del" @click="removeMoment(idx)" aria-label="删除">×</button>
            </div>
          </div>
          <div v-if="moments.length === 0" class="moment-empty">
            还没有驻足的记录，今晚的风正合适
          </div>
        </div>
      </section>

      <!-- 今日思绪（真实数据） -->
      <section class="stat-section">
        <div class="stat-card">
          <span class="stat-value">{{ todayNoteCount }}</span>
          <span class="stat-label">今日写下的思绪</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ moments.length }}</span>
          <span class="stat-label">阳台驻足记录</span>
        </div>
      </section>

      <!-- 导航 -->
      <section class="navigation-panel">
        <button class="nav-btn" @click="emit('navigate', 'courtyard')">
          <span class="nav-btn-icon">&#127807;</span>
          <span class="nav-btn-label">走向庭院</span>
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import { storage } from '../../engine/storage'

const emit = defineEmits<{
  (e: 'navigate', roomId: string): void
}>()

// ---- 此刻时分 ----
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | null = null

const clockText = computed(() => {
  const h = String(now.value.getHours()).padStart(2, '0')
  const m = String(now.value.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
})

const clockGreeting = computed(() => {
  const h = now.value.getHours()
  if (h < 5) return '夜深了，城市已入睡'
  if (h < 9) return '清晨的光正漫过窗台'
  if (h < 12) return '上午好，风很轻'
  if (h < 14) return '正午，远处的楼群发亮'
  if (h < 18) return '午后，云在慢行'
  if (h < 21) return '黄昏退场，灯火初上'
  return '夜里，星子落进阳台'
})

// ---- 驻足片刻（本地 KV）----
const KV_PREFIX = 'hf:home:balcony'
interface Moment {
  id: string
  text: string
  at: string
}

const moments = ref<Moment[]>([])
const newMoment = ref('')

function loadMoments() {
  moments.value = storage.getKV<Moment[]>(`${KV_PREFIX}:moments`, [])
}

function addMoment() {
  const text = newMoment.value.trim()
  if (!text) return
  const d = new Date()
  const at = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  moments.value = [
    { id: `m-${Date.now()}`, text, at },
    ...moments.value,
  ].slice(0, 30)
  storage.setKV(`${KV_PREFIX}:moments`, moments.value)
  newMoment.value = ''
}

function removeMoment(idx: number) {
  moments.value.splice(idx, 1)
  storage.setKV(`${KV_PREFIX}:moments`, moments.value)
}

// ---- 今日思绪（真实笔记数据）----
const todayNoteCount = computed(() => {
  const notes = storage.getNotes()
  const today = getLocalDateKey()
  return notes.filter((n: { createdAt?: string }) => !!n.createdAt && getLocalDateKey(new Date(n.createdAt)) === today).length
})

onMounted(() => {
  loadMoments()
  clockTimer = setInterval(() => {
    now.value = new Date()
  }, 30_000)
})

onUnmounted(() => {
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }
})
</script>

<style scoped>
/* ============================================================
   阳台 · 深夜食堂暖琥珀主题
   深色背景 + 夜空蓝强调色 (#b8d0e8)
   ============================================================ */

.balcony {
  position: relative;
  min-height: 100vh;
  background: transparent;
  color: var(--text-primary);
  overflow: hidden;
  font-family: var(--font-body-zh);
}

/* ---- 氛围背景 ---- */
.balcony-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.atmos-city-glow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 55%;
  background:
    radial-gradient(ellipse 60% 40% at 30% 100%, rgba(184, 208, 232, 0.1) 0%, transparent 60%),
    radial-gradient(ellipse 50% 35% at 70% 100%, rgba(184, 208, 232, 0.07) 0%, transparent 55%),
    linear-gradient(0deg, rgba(184, 208, 232, 0.05) 0%, transparent 70%);
  animation: balcony-breathe 9s ease-in-out infinite;
}

@keyframes balcony-breathe {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}

.atmos-horizon-mist {
  position: absolute;
  bottom: 38%;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(184, 208, 232, 0.25),
    transparent
  );
  filter: blur(1px);
}

.atmos-starfield {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 45%;
  background:
    radial-gradient(1.5px 1.5px at 15% 20%, rgba(240, 213, 176, 0.5) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 40% 12%, rgba(240, 213, 176, 0.35) 0%, transparent 100%),
    radial-gradient(2px 2px at 65% 22%, rgba(240, 213, 176, 0.4) 0%, transparent 100%),
    radial-gradient(1px 1px at 80% 15%, rgba(240, 213, 176, 0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 25% 30%, rgba(240, 213, 176, 0.25) 0%, transparent 100%),
    radial-gradient(1px 1px at 55% 35%, rgba(240, 213, 176, 0.2) 0%, transparent 100%);
}

/* ---- 主内容区 ---- */
.balcony-content {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px 100px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ---- 头部 ---- */
.balcony-header {
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
    rgba(184, 208, 232, 0.25),
    transparent
  );
}

.orn-sun {
  font-size: 14px;
  color: rgba(184, 208, 232, 0.55);
  letter-spacing: 2px;
}

.balcony-title {
  font-size: 26px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.balcony-subtitle {
  font-size: 13px;
  color: var(--text-low);
  margin: 0;
  letter-spacing: 1px;
}

/* ---- 此刻时分 ---- */
.clock-section {
  padding: 0;
}

.clock-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(184, 208, 232, 0.07) 0%,
    rgba(184, 208, 232, 0.02) 100%
  );
  border: 1px solid rgba(184, 208, 232, 0.12);
}

.clock-time {
  font-size: 40px;
  font-weight: 300;
  letter-spacing: 4px;
  color: #b8d0e8;
  font-variant-numeric: tabular-nums;
}

.clock-greeting {
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

/* ---- 面板标签 ---- */
.panel-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 13px;
  letter-spacing: 1px;
  color: var(--text-secondary);
}

.panel-label__icon {
  font-size: 15px;
  opacity: 0.6;
}

/* ---- 驻足片刻 ---- */
.moment-form {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.moment-input {
  flex: 1;
  resize: none;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(184, 208, 232, 0.12);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  transition: border-color 0.3s ease;
}

.moment-input:focus {
  outline: none;
  border-color: rgba(184, 208, 232, 0.3);
}

.moment-input::placeholder {
  color: var(--text-faint);
}

.moment-add {
  flex-shrink: 0;
  padding: 0 20px;
  border: 1px solid rgba(184, 208, 232, 0.18);
  border-radius: 12px;
  background: rgba(184, 208, 232, 0.08);
  color: #b8d0e8;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.moment-add:hover:not(:disabled) {
  background: rgba(184, 208, 232, 0.14);
  border-color: rgba(184, 208, 232, 0.3);
}

.moment-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.moment-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.moment-item {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(184, 208, 232, 0.06);
  transition: border-color 0.3s ease;
}

.moment-item:hover {
  border-color: rgba(184, 208, 232, 0.14);
}

.moment-text {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.moment-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.moment-time {
  font-size: 11px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.moment-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-faint);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;

  min-height: 24px;
  min-width: 24px;
}

.moment-del:hover {
  background: rgba(192, 80, 80, 0.12);
  color: #c05050;
}

.moment-empty {
  padding: 20px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
  letter-spacing: 0.5px;
}

/* ---- 统计 ---- */
.stat-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(184, 208, 232, 0.08);
}

.stat-value {
  font-size: 26px;
  font-weight: 500;
  color: #b8d0e8;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

/* ---- 导航面板 ---- */
.navigation-panel {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  border-radius: 14px;
  border: 1px solid rgba(184, 208, 232, 0.12);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  font-size: 14px;
}

.nav-btn:hover {
  background: rgba(184, 208, 232, 0.06);
  border-color: rgba(184, 208, 232, 0.22);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(184, 208, 232, 0.04);
}

.nav-btn:active {
  transform: translateY(0);
}

.nav-btn-icon {
  font-size: 20px;
  line-height: 1;
}

.nav-btn-label {
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
}

.nav-btn:hover .nav-btn-label {
  color: #b8d0e8;
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .balcony-content {
    padding: 32px 16px 80px;
    gap: 24px;
  }

  .balcony-title {
    font-size: 22px;
  }

  .clock-time {
    font-size: 34px;
  }

  .stat-value {
    font-size: 22px;
  }
}
</style>
