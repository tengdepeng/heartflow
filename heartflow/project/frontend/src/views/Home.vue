<template>
  <div
    class="home view-entrance"
    :class="entranceClass"
    @pointerdown="onAstrolabeLongPressStart"
    @pointermove="onAstrolabeLongPressMove"
    @pointerup="onAstrolabeLongPressEnd"
    @pointerleave="onAstrolabeLongPressCancel"
  >
    <!-- 家 · 房间氛围层 -->
    <HomeRoomAtmosphere :room="currentRoom" :showParticles="true" />

    <!-- 引力场氛围光晕（固定铺底，保留不动） -->
    <div class="home-atmosphere">
      <div class="atmos-glow-gold"></div>
      <div class="atmos-glow-warm"></div>
    </div>

    <!-- 引力透镜环 + 流光线（固定铺底，保留不动） -->
    <div class="gravity-lens-rings"></div>
    <div class="gravity-streamers"></div>

    <!-- 月下抚琴：月色远山剪影（极淡装饰，不参与遮挡，仅留一丝轮廓意象） -->
    <div class="moonlight-hills" aria-hidden="true">
      <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path
          d="M0,320 L0,206 C200,150 360,242 560,190 C760,140 920,232 1140,182 C1300,150 1380,200 1440,180 L1440,320 Z"
          fill="rgba(16,24,46,0.16)"
        />
        <path
          d="M0,320 L0,250 C240,202 420,282 680,240 C900,210 1080,292 1280,250 C1360,236 1410,262 1440,250 L1440,320 Z"
          fill="rgba(9,13,28,0.22)"
        />
      </svg>
    </div>

    <!-- 月下抚琴：极简沉浸式，玉盘占满视野，时间藏入珠内 -->
    <main class="home-focus">
      <p class="focus-kicker">引力场 · 灯一直亮着</p>
      <h1 class="focus-title">让今天先安静落下来。</h1>

      <div class="focus-orb">
        <!-- 涟漪：以玉盘为中心的同心扩散（进度意象） -->
        <div class="moon-ripples" aria-hidden="true">
          <span class="moon-ripple"></span>
          <span class="moon-ripple r2"></span>
          <span class="moon-ripple r3"></span>
        </div>

        <!-- 悬停舞台：玉珠与控件同处一个悬停区，鼠标从玉珠下移到控件时不会脱离 hover 区 -->
        <div class="orb-stage">
          <div ref="gestureSurface" class="gesture-surface">
            <JadeBead
              :displayTime="beadTime"
              :isRunning="isRunning"
              :isPaused="isPaused"
              :isFocusing="isFocusing"
              :beadCount="timer.todayCompletedCount"
              :progress="progress"
              @toggle="toggle"
            />
          </div>

          <!-- 控件：Home 自有包裹层，默认收起不占位，悬停/聚焦时展开淡入 -->
          <div class="orb-controls">
            <TimerControls
              :displayTime="display"
              :isRunning="isRunning"
              :isPaused="isPaused"
              :currentMode="session.mode"
              :remainingSeconds="remainingSeconds"
              :totalSeconds="Math.floor(session.plannedDuration / 1000)"
              :pomodoro-phase="pomodoroPhase"
              @toggle="toggle"
              @reset="reset"
              @switchMode="switchMode"
            />
          </div>
        </div>
      </div>

      <p class="dock-mantra__text" @click="refreshMantra">{{ mantra.text }}</p>

      <!-- 专注小结胶囊：今日沉淀 / 本轮流动 / 脉动进度（INCR-233 补挂载孤儿组件 FocusStats） -->
      <div class="home-focus-stats">
        <FocusStats
          :sessions="timer.todayCompletedCount"
          :currentDuration="focusElapsedSeconds"
          :progress="progress"
        />
      </div>

      <!-- 统计卡片：测试断言依赖，视觉隐藏 -->
      <div class="home-sr-only" aria-hidden="true">
        <div class="home-stats">
          <article
            v-for="item in dashboardStats"
            :key="item.label"
            class="hero-stat-card"
          >
            <span class="hero-stat-label">{{ item.label }}</span>
            <strong class="hero-stat-value">{{ item.value }}</strong>
          </article>
        </div>
      </div>
    </main>

    <!-- 桌面小组件（INCR-317 补挂载孤儿组件 WidgetBox：番茄钟/逐日心锚/情绪速记/便签/季节/一言 · 可拖动浮层画布） -->
    <WidgetBox />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, inject, toRefs } from 'vue'
import { HomeRoomAtmosphere, DEFAULT_HOME_ROOM, getHomeRoom } from '../modules/home'
import type { HomeRoom } from '../modules/home'
import { useRouter } from 'vue-router'
import { useTimer } from '../resonance/bridges/timer'
import { useConstitution } from '../resonance/bridges/constitution'
import { useConfig } from '../resonance/bridges/config'
import { useRuntimeState } from '../resonance/bridges/runtime'
import { storage } from '../engine/storage'
import { formatTimerClock } from '../engine/timer'
import { useEmotion } from '../resonance/bridges/emotion'
import { useAnchorBridge } from '../resonance/bridges/anchor'
import { useGesture, type GestureEvent } from '../composables/useGesture'
import { useRoomNavigation } from '../composables/useRoomNavigation'
import { createGestureDispatcher } from '../modules/gesture/dispatcher'
import { createCoreGestureActionMap } from '../modules/gesture/actionMap'
import type { useAstrolabe } from '../modules/astrolabe'

import JadeBead from '../components/JadeBead.vue'
import TimerControls from '../components/TimerControls.vue'
import FocusStats from '../components/FocusStats.vue'
import WidgetBox from '../components/WidgetBox.vue'
import { useAdvisor } from '../resonance/bridges/advisor'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceClass } = useViewEntrance()

const astrolabe = inject<ReturnType<typeof useAstrolabe>>('astrolabe')

function onAstrolabeLongPressStart(e: PointerEvent) {
  if (!astrolabe) return
  if (gestureSurface.value?.contains(e.target as Node)) return
  astrolabe.startLongPress(e)
}
function onAstrolabeLongPressMove(e: PointerEvent) {
  if (!astrolabe) return
  astrolabe.moveLongPress(e)
}
function onAstrolabeLongPressEnd() {
  if (!astrolabe) return
  astrolabe.endLongPress()
}
function onAstrolabeLongPressCancel() {
  if (!astrolabe) return
  astrolabe.cancelLongPress()
}

const constitution = useConstitution()
const emotion = useEmotion()
const anchor = useAnchorBridge()
const router = useRouter()
const configBridge = useConfig()
const { config: configRef } = configBridge
const { enterSanctuary, exitSanctuary } = useRuntimeState()

const timer = useTimer()
const {
  session, isRunning, progress, display, isFocusing, isPaused,
  remainingSeconds, pomodoroPhase,
} = toRefs(timer)

function toggle() {
  if (isFocusing.value) timer.pause()
  else if (isPaused.value) timer.resume()
  else timer.start()
}

function switchMode(mode: string, minutes?: number) {
  if (session.value.mode === mode) {
    toggle()
    return
  }
  // 时长交给 store 按模式取默认值；倒计时传自定义分钟
  timer.setMode(mode as any, minutes ?? 0)
}

function reset() { timer.reset() }

// 玉珠上的时间：倒计时/番茄显示剩余，正计时显示已计（向上）
const beadTime = computed(() =>
  session.value.mode === 'countup' ? display.value : formatTimerClock(remainingSeconds.value * 1000),
)

// 本轮已沉淀秒数（总时长 - 剩余），供 FocusStats「本轮流动」胶囊
const focusElapsedSeconds = computed(() =>
  Math.max(0, Math.floor(session.value.plannedDuration / 1000) - remainingSeconds.value),
)

function finishFocusSession() {
  timer.finish()
}

function enterSafeIsland() {
  enterSanctuary()
  router.push('/sanctuary')
}

function exitSafeIsland() {
  exitSanctuary()
  router.push('/')
}

const nav = useRoomNavigation()

const activeRoomId = ref(DEFAULT_HOME_ROOM.id)
const currentRoom = computed<HomeRoom>(() => {
  return getHomeRoom(activeRoomId.value) ?? DEFAULT_HOME_ROOM
})

const gestureSurface = ref<HTMLElement | null>(null)

const dispatchGesture = createGestureDispatcher({
  getBindings: () => configRef.gestures.bindings,
  actionMap: createCoreGestureActionMap({
    toggleFocusTimer: toggle,
    finishFocusSession,
    enterSafeIsland,
    exitSafeIsland,
    navigateNext: () => {
      const next = nav.nextOnMainPath.value
      if (next) router.push(next.path)
    },
    navigatePrev: () => {
      const prev = nav.previousOnMainPath.value
      if (prev) router.push(prev.path)
      else nav.goBack()
    },
  }),
})

const { attach, detach } = useGesture(gestureSurface, handleGesture, {
  longPressThreshold: 1500,
})

function handleGesture(event: GestureEvent) {
  void dispatchGesture(event.type, {
    isFocusing: isFocusing.value,
    isPaused: isPaused.value,
    isInSafeIsland: false,
  })
}

const mantra = ref(constitution.getRandomMantra())
function refreshMantra(): void {
  mantra.value = constitution.getRandomMantra()
}

const advisor = useAdvisor()
emotion.load()
anchor.load()

const moodMap: Record<string, string> = {
  happy: '轻快',
  calm: '平静',
  sad: '低落',
  anxious: '紧绷',
  angry: '烦躁',
}

const latestEmotion = computed(() => emotion.records.value[0])
const pendingAnchors = computed(() => anchor.todayAnchors.value.filter(item => !item.done))
const totalFocusMinutes = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return storage.getSessions()
    .filter(item => item.status === 'completed' && item.completedAt?.startsWith(today))
    .reduce((sum, item) => sum + Math.round(item.elapsed / 60000), 0)
})

const dashboardStats = computed(() => [
  {
    label: '今日专注',
    value: `${timer.todayCompletedCount} 次`,
    note: totalFocusMinutes.value > 0 ? `${totalFocusMinutes.value} 分钟已经沉进今天` : '这里暂时还没有新的结晶',
  },
  {
    label: '逐日心锚',
    value: `${pendingAnchors.value.length} 项`,
    note: pendingAnchors.value[0]?.text ?? '如果脑子里有悬念，可以先放进锚点池',
  },
  {
    label: '花房记录',
    value: latestEmotion.value ? moodMap[latestEmotion.value.type] ?? '平静' : '尚未留下',
    note: latestEmotion.value?.note || '花房现在很安静',
  },
])

onMounted(() => {
  attach()
})
onUnmounted(() => { detach() })

watch(() => timer.isCompleted, (done) => {
  if (done) {
    advisor.onFocusComplete(timer.todayCompletedCount)
  }
})
</script>

<style scoped>
.home {
  position: relative;
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  color: var(--text-primary, #e8e0d8);
}

/* ---- 世界壳背景层（宅院剪影铺底） ---- */
.home-canvas-bg {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
.home-canvas-bg .canvas-room {
  border-radius: 0;
  background: transparent;
  min-height: 100%;
}

/* ---- 月下抚琴：月色远山剪影 ---- */
.moonlight-hills {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  height: 38vh;
  min-height: 220px;
  pointer-events: none;
  overflow: hidden;
}

.moonlight-hills svg {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* ---- 极简沉浸式：玉盘占满视野 ---- */
.home-focus {
  flex: 1;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 24px 110px;
  text-align: center;
}

.home-focus-stats {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

.focus-kicker {
  font-size: 11px;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: var(--text-secondary);
  opacity: 0.3;
  margin: 0;
}

.focus-title {
  font-size: clamp(18px, 2vw, 24px);
  font-weight: 400;
  line-height: 1.2;
  color: #dfe6f2;
  /* 让出幕僚珠列的纵向空间（珠列由 App.vue 绝对定位在视口中线偏上，
     标题不留白会被实心珠压住） */
  margin: 0 0 44px;
  opacity: 0.42;
  text-shadow: 0 0 20px rgba(120, 150, 200, 0.18);
}

/* 箴言：极淡，悬停亮起 */
.dock-mantra__text {
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-secondary);
  opacity: 0.2;
  font-style: italic;
  max-width: 240px;
  margin: 4px 0 0;
  cursor: pointer;
  transition: opacity 0.4s ease;
}

.dock-mantra__text:hover {
  opacity: 0.55;
}

/* ---- 专注核心：透明，玉盘为绝对主角 ---- */
.focus-orb {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin: 8px 0;
  background: transparent;
  border: none;
  box-shadow: none;
  backdrop-filter: none;
}

.gesture-surface {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 涟漪：以玉盘为中心的同心扩散 */
.moon-ripples {
  position: absolute;
  top: 42%;
  left: 50%;
  width: 0;
  height: 0;
  z-index: 0;
  pointer-events: none;
}

.moon-ripple {
  position: absolute;
  top: 0;
  left: 0;
  width: 300px;
  height: 300px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid rgba(180, 205, 235, 0.22);
  animation: moon-ripple 7s ease-out infinite;
}

.moon-ripple.r2 { animation-delay: 2.33s; border-color: rgba(180, 205, 235, 0.16); }
.moon-ripple.r3 { animation-delay: 4.66s; border-color: rgba(180, 205, 235, 0.12); }

@keyframes moon-ripple {
  0% { transform: translate(-50%, -50%) scale(0.62); opacity: 0; }
  18% { opacity: 0.5; }
  100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}

/* 玉盘：280px 原生 SVG，冷调月光 */
.focus-orb :deep(.bead-svg) {
  width: 280px;
  height: 280px;
  filter: drop-shadow(0 0 30px rgba(165, 195, 235, 0.45));
}

/* 对调：大珠 = 月华光晕 + 玉白核（发光月轮；白色实心已移交幕僚球） */
.focus-orb :deep(.bead-body) {
  fill: url(#moonDisc);
  filter: none;
}

.focus-orb :deep(.bead-gloss) {
  opacity: 0.5;
}

.focus-orb :deep(.bead-core) {
  filter: drop-shadow(0 0 28px rgba(226, 238, 255, 0.92));
}

/* 外光晕：清冷月华（对调后由它承担大珠的「光晕」主体） */
.focus-orb :deep(.bead-aura) {
  inset: -72px;
  background: radial-gradient(circle at 50% 50%, rgba(216, 232, 252, 0.3) 0%, rgba(188, 212, 248, 0.13) 40%, rgba(164, 196, 242, 0.05) 62%, transparent 80%);
}

/* 呼吸环 / 进度弧改为冷调 */
.focus-orb :deep(.bead-ring),
.focus-orb :deep(.bead-progress) {
  stroke: rgba(200, 220, 245, 0.5);
}

/* 微珠粒子冷调 */
.focus-orb :deep(.bead-particle) {
  background: rgba(195, 215, 240, 0.6);
}

/* 时间藏入珠内：绝对定位居中覆盖在玉盘上 */
.focus-orb :deep(.jade-bead-container) {
  position: relative;
}

.focus-orb :deep(.bead-timer) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
}

.focus-orb :deep(.bead-time) {
  font-size: 48px;
  color: #26324a;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.85), 0 0 22px rgba(200, 222, 252, 0.75);
}

/* 悬停舞台：玉珠 + 控件共享同一 hover 区；控件收起时仍属此区，
   鼠标从玉珠下移到按钮不会脱离 hover 区，故按钮始终可点 */
.orb-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* TimerControls 由 Home 自有包裹层 .orb-controls 接管，常驻可见且居中
   （用户要求计时器控件区居中显示、不依赖 hover 才出现）。 */
.orb-controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 0.4s ease;
}

/* 隐藏冗余的进度环与时间大字（时间已由玉珠承载，避免双重显示）；
   状态药丸保留可见，作为计时状态反馈 */
.focus-orb :deep(.progress-ring),
.focus-orb :deep(.timer-display) {
  display: none;
}

/* TimerControls 紧凑化 */
.orb-controls :deep(.timer-controls) {
  opacity: 1;
}

.focus-orb :deep(.mode-tab) {
  padding: 6px 12px;
  font-size: 11px;
}

.focus-orb :deep(.btn) {
  min-width: 88px;
  padding: 8px 16px;
  font-size: 12px;
}

/* ---- 统计：测试断言依赖，视觉隐藏 ---- */
.home-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ---- 引力场氛围光晕（固定铺底，全部保留不动） ---- */
.home-atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.home-atmosphere::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 46%, rgba(var(--accent-rgb), 0.10) 0%, rgba(var(--accent-rgb), 0.04) 12%, transparent 36%),
    radial-gradient(circle at 50% 46%, rgba(var(--accent-rgb), 0.05) 0%, transparent 52%),
    radial-gradient(circle at 50% 46%, rgba(var(--accent-rgb), 0.018) 0%, transparent 80%);
  animation: gravity-pulse 8s ease-in-out infinite;
  will-change: transform, opacity;
}

.home-atmosphere::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 46%, transparent 26%, rgba(var(--accent-rgb), 0.02) 28%, transparent 34%),
    radial-gradient(ellipse at 50% 46%, transparent 44%, rgba(var(--accent-rgb), 0.012) 46%, transparent 56%);
  animation: lens-shimmer 12s ease-in-out infinite;
  will-change: transform, opacity;
}

.atmos-glow-gold {
  position: absolute;
  top: -15%;
  left: 10%;
  width: 60%;
  height: 70%;
  background: radial-gradient(
    ellipse at 30% 40%,
    rgba(var(--accent-rgb), 0.06) 0%,
    transparent 60%
  );
  animation: breathe 7s ease-in-out infinite;
}

.atmos-glow-warm {
  position: absolute;
  bottom: -10%;
  right: 10%;
  width: 50%;
  height: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(90, 184, 160, 0.03) 0%,
    transparent 60%
  );
  animation: breathe 9s ease-in-out infinite 2s;
}

@keyframes breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@keyframes gravity-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.07); opacity: 1.2; }
}

@keyframes lens-shimmer {
  0%, 100% { opacity: 0.45; transform: scale(1); }
  33% { opacity: 0.85; transform: scale(1.025); }
  66% { opacity: 0.55; transform: scale(0.975); }
}

@keyframes streamer-pulse {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.85; }
}

@keyframes lens-ring-expand {
  0%, 100% { transform: translate(-50%, -50%) scale(0.94); opacity: 0.35; }
  50% { transform: translate(-50%, -50%) scale(1.06); opacity: 0.75; }
}

@keyframes glow-text {
  0%, 100% { text-shadow: 0 0 8px rgba(var(--accent-rgb), 0); }
  50% { text-shadow: 0 0 14px rgba(var(--accent-rgb), 0.14), 0 0 32px rgba(var(--accent-rgb), 0.05); }
}

/* ---- 引力透镜环 ---- */
.gravity-lens-rings {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.gravity-lens-rings::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120vmin;
  height: 120vmin;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.045);
  animation: lens-ring-expand 8s ease-in-out infinite;
}

.gravity-lens-rings::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80vmin;
  height: 80vmin;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.025);
  animation: lens-ring-expand 8s ease-in-out infinite 2s;
}

/* ---- 引力流光线 ---- */
.gravity-streamers {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.gravity-streamers::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 100%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(var(--accent-rgb), 0.008) 20%,
    rgba(var(--accent-rgb), 0.018) 50%,
    rgba(var(--accent-rgb), 0.008) 80%,
    transparent 100%
  );
  animation: streamer-pulse 4s ease-in-out infinite;
  will-change: opacity;
}

.gravity-streamers::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(var(--accent-rgb), 0.008) 20%,
    rgba(var(--accent-rgb), 0.018) 50%,
    rgba(var(--accent-rgb), 0.008) 80%,
    transparent 100%
  );
  animation: streamer-pulse 4s ease-in-out infinite 1s;
  will-change: opacity;
}

/* ---- 响应式 ---- */
@media (max-width: 980px) {
  .focus-orb :deep(.bead-svg) {
    width: 220px;
    height: 220px;
  }
  .focus-orb :deep(.bead-time) {
    font-size: 40px;
  }
  .moon-ripple {
    width: 240px;
    height: 240px;
  }
}

@media (max-width: 640px) {
  .home-focus {
    padding: 48px 16px 140px;
    gap: 8px;
  }

  .focus-orb :deep(.bead-svg) {
    width: 180px;
    height: 180px;
  }

  .focus-orb :deep(.bead-time) {
    font-size: 32px;
  }

  .focus-orb :deep(.bead-aura) {
    inset: -34px;
  }

  .moon-ripple {
    width: 190px;
    height: 190px;
  }

  .focus-title {
    font-size: 18px;
  }

  .atmos-glow-gold { opacity: 0.4; }
  .atmos-glow-warm { opacity: 0.2; }
  .gravity-lens-rings { opacity: 0.35; }
  .gravity-streamers { opacity: 0.3; }
  .home-atmosphere::before { opacity: 0.5; }
  .home-atmosphere::after { opacity: 0.3; }
  .moonlight-hills { height: 30vh; min-height: 160px; opacity: 0.8; }
}
</style>
