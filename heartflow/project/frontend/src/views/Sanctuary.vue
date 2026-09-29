<template>
  <div class="sanctuary view-entrance" :class="entranceClass" @contextmenu.prevent>
    <!-- ============ Ambient atmosphere layers ============ -->
    <div class="ambient-vignette" aria-hidden="true"></div>
    <div class="ambient-warm-light" aria-hidden="true"></div>
    <div class="ambient-wall-texture" aria-hidden="true"></div>

    <!-- ============ 0. 退出按钮 ============ -->
    <button class="exit-btn" @click="exitSanctuary" title="退出安全岛" aria-label="退出安全岛">
      <span class="exit-btn-icon">←</span>
      <span class="exit-btn-label">退出</span>
    </button>

    <!-- ============ 0.5 桌面静默覆盖开关 ============ -->
    <section class="desktop-overlay-card" aria-label="桌面静默覆盖">
      <div class="doc-row">
        <div class="doc-text">
          <span class="doc-title">桌面静默覆盖</span>
          <span class="doc-desc">{{ overlayToggleDesc }}</span>
        </div>
        <button
          class="doc-toggle"
          :class="{ 'doc-toggle--on': isActive, 'doc-toggle--disabled': !isAllowed }"
          :disabled="!isAllowed"
          :title="isAllowed ? '切换桌面静默覆盖' : '安全岛开启且为桌面端时可用'"
          @click="onToggleDesktopOverlay"
          role="switch"
          :aria-checked="isActive"
        >
          <span class="doc-knob" />
        </button>
      </div>
      <div class="doc-row doc-row--sub">
        <div class="doc-text">
          <span class="doc-title">仅锁屏时显示</span>
          <span class="doc-desc">{{ lockModeDesc }}</span>
        </div>
        <button
          class="doc-toggle"
          :class="{ 'doc-toggle--on': lockModeWantsOverlay, 'doc-toggle--disabled': !isAllowed }"
          :disabled="!isAllowed"
          :title="isAllowed ? '切换仅锁屏显示' : '安全岛开启且为桌面端时可用'"
          @click="onToggleLockMode"
          role="switch"
          :aria-checked="lockModeWantsOverlay"
        >
          <span class="doc-knob" />
        </button>
      </div>
      <div class="doc-row doc-row--form">
        <div class="doc-text">
          <span class="doc-title">覆盖形态</span>
          <span class="doc-desc">静默陪伴的视觉形态（仅外观，不改门控）</span>
        </div>
        <div class="form-seg" role="radiogroup" aria-label="覆盖形态">
          <button
            v-for="f in overlayForms"
            :key="f.id"
            class="form-seg__item hf-press"
            :class="{ 'form-seg__item--on': overlayForm === f.id }"
            :disabled="!isAllowed"
            :title="f.desc"
            role="radio"
            :aria-checked="overlayForm === f.id"
            @click="onSelectForm(f.id)"
          >
            <span class="form-seg__dot" :style="{ background: f.glow }" />
            <span class="form-seg__label">{{ f.label }}</span>
          </button>
        </div>
      </div>
      <div class="doc-row doc-row--content">
        <div class="doc-text">
          <span class="doc-title">报点</span>
          <span class="doc-desc">中心呼吸光点</span>
        </div>
        <button
          class="doc-toggle"
          :class="{ 'doc-toggle--on': showBeacon, 'doc-toggle--disabled': !isAllowed }"
          :disabled="!isAllowed"
          :title="isAllowed ? '切换中心呼吸光点' : '安全岛开启后可用'"
          @click="onToggleBeacon"
          role="switch"
          :aria-checked="showBeacon"
        >
          <span class="doc-knob" />
        </button>
      </div>
      <div class="doc-row doc-row--content">
        <div class="doc-text">
          <span class="doc-title">落款</span>
          <span class="doc-desc">底部静/息/廊字样</span>
        </div>
        <button
          class="doc-toggle"
          :class="{ 'doc-toggle--on': showHint, 'doc-toggle--disabled': !isAllowed }"
          :disabled="!isAllowed"
          :title="isAllowed ? '切换底部落款' : '安全岛开启后可用'"
          @click="onToggleHint"
          role="switch"
          :aria-checked="showHint"
        >
          <span class="doc-knob" />
        </button>
      </div>
      <div class="doc-row doc-row--content doc-row--intensity">
        <div class="doc-text">
          <span class="doc-title">辉光强度</span>
          <span class="doc-desc">{{ glowIntensity.toFixed(1) }}</span>
        </div>
        <input
          class="doc-range"
          type="range"
          min="0"
          max="2"
          step="0.1"
          :value="glowIntensity"
          :disabled="!isAllowed"
          @input="onIntensityInput"
          @change="onIntensityChange"
          aria-label="辉光强度"
        />
      </div>
      <p v-if="lastError" class="doc-error">{{ lastError }}</p>
    </section>

    <!-- ============ 1. 统计概览行 ============ -->
    <section class="stats-overview" data-enter aria-label="安全岛统计概览">
      <div class="stat-item">
        <span class="stat-value">{{ stats.totalVisits }}</span>
        <span class="stat-label">总访问</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.weeklyVisits }}</span>
        <span class="stat-label">本周访问</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.totalMinutes }}</span>
        <span class="stat-label">总停留(分钟)</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.totalNotes }}</span>
        <span class="stat-label">释放便签</span>
      </div>
    </section>

    <!-- 安全岛档案（INCR-19）档案概览/驻足节奏/深研修习/温和洞察 -->
    <SanctuaryArchivePanel :logs="logs" :notes="notes" />

    <!-- ============ 2. 呼吸引导（原有） ============ -->
    <div class="breath-guide" data-enter>
      <div
        class="breath-orb"
        :class="{ holding: isHolding }"
        @pointerdown="startHold"
        @pointerup="cancelHold"
        @pointerleave="cancelHold"
        @touchstart.prevent="startHold"
        @touchend.prevent="cancelHold"
      >
        <div class="orb-core" />
        <div class="orb-glow" />
        <div class="orb-ring" />
        <div class="orb-heart" v-if="isHolding">&#9829;</div>
      </div>
    </div>

    <!-- ============ 2.5 安全岛·中枢总览（INCR-389 补挂载孤儿桥接面板 SanctuaryBridgePanel：useSanctuaryBridge 聚合 激活态 sanctuaryState/触发配置 triggerConfig/会话统计 sessionStats/使用建议 recommendations/激活历史 activationHistory 的 安全岛激活中枢态, Sanctuary.vue 原仅直引 useSanctuary+useDesktopSilentOverlay 专项引擎+SanctuaryArchivePanel 档案面板, 桥接层中枢聚合面零呈现, 真缺口） ============ -->
    <SanctuaryBridgePanel />

    <!-- ============ 3. 呼吸练习统计 ============ -->
    <section class="breath-stats" aria-label="呼吸练习统计" v-if="sessionBreathCount > 0">
      <span class="breath-stats-text">呼吸练习 &#183; {{ sessionBreathCount }} 次</span>
    </section>

    <!-- ============ 4. 安全岛状态摘要 ============ -->
    <section class="session-summary" aria-label="当前 session 摘要" v-if="sessionDuration > 0">
      <div class="summary-item">
        <span class="summary-label">本次停留</span>
        <span class="summary-value">{{ formatDuration(sessionDuration) }}</span>
      </div>
      <div class="summary-item" v-if="sessionBreathCount > 0">
        <span class="summary-label">呼吸练习</span>
        <span class="summary-value">{{ sessionBreathCount }} 次</span>
      </div>
      <div class="summary-item" v-if="sessionNotesReleased > 0">
        <span class="summary-label">释放便签</span>
        <span class="summary-value">{{ sessionNotesReleased }} 条</span>
      </div>
    </section>

    <!-- ============ 5. 退出条（原有） ============ -->
    <div v-if="isHolding" class="exit-bar-wrap">
      <div class="exit-bar" :class="{ 'exit-bar--active': isHolding }" />
      <span class="exit-hint">长按片刻，回到前页</span>
    </div>

    <!-- ============ 6. 释放便签（原有） ============ -->
    <Transition name="note-fade">
      <div v-if="showNote" class="release-note">
        <textarea
          ref="noteInputRef"
          v-model="releaseText"
          class="release-textarea"
          placeholder="如果想释放一点什么，可以留在这里&#8230;"
          rows="4"
          autofocus
        />
        <div class="release-actions">
          <button class="release-btn dissolve-btn" @click="dissolveNote">缓缓放下</button>
          <button class="release-btn keep-btn" @click="keepNote">留在这里</button>
        </div>
      </div>
    </Transition>

    <!-- ============ 7. 已留便签（原有） ============ -->
    <TransitionGroup
      v-if="notes.length > 0"
      name="kept-note-fade"
      tag="section"
      class="kept-notes"
      aria-label="已留在这里的便签"
    >
      <article v-for="note in notes" :key="note.id" class="kept-note-card">
        <p class="kept-note-text">{{ note.text }}</p>
        <span class="kept-note-time">{{ formatNoteTime(note.at) }}</span>
      </article>
    </TransitionGroup>

    <!-- ============ 8. 便签管理 ============ -->
    <section class="note-management" aria-label="便签管理" v-if="notes.length > 0">
      <span class="note-count">便签 &#183; {{ notes.length }} 条</span>
      <button class="clear-notes-btn" @click="confirmClearNotes">清空便签</button>

      <!-- 清空确认弹窗 -->
      <Transition name="confirm-fade">
        <div v-if="showClearConfirm" class="confirm-overlay" @click.self="showClearConfirm = false">
          <div class="confirm-dialog">
            <p class="confirm-text">确定清空所有便签吗？</p>
            <p class="confirm-hint">此操作不可撤销</p>
            <div class="confirm-actions">
              <button class="confirm-btn confirm-cancel" @click="showClearConfirm = false">取消</button>
              <button class="confirm-btn confirm-ok" @click="clearNotes">确认清空</button>
            </div>
          </div>
        </div>
      </Transition>
    </section>

    <!-- ============ 9. 访问记录 ============ -->
    <section class="visit-records" aria-label="访问记录" v-if="logs.length > 0">
      <h3 class="visit-records-title">访问记录</h3>
      <div class="visit-records-list">
        <div
          v-for="log in logs.slice(0, 20)"
          :key="log.id"
          class="visit-record-item hf-press"
          :class="{ 'visit-record-item--current': log.id === currentLogId }"
        >
          <span class="visit-record-time">{{ formatVisitTime(log.enterAt) }}</span>
          <span class="visit-record-duration">{{ formatDuration(log.durationSec) }}</span>
          <button
            class="visit-record-delete"
            @click="deleteVisitLog(log.id)"
            :disabled="log.id === currentLogId"
            :title="log.id === currentLogId ? '当前 session 无法删除' : '删除此记录'"
          >
            &#10005;
          </button>
        </div>
      </div>
    </section>

    <!-- ============ 10. 便签触发按钮（原有） ============ -->
    <button v-if="!showNote" class="note-trigger" aria-label="打开释放便签" @click="showNote = true">&#183;</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRuntimeState } from '../resonance/bridges/runtime'
import { useSanctuary } from '../modules/sanctuary'
import { useDesktopSilentOverlay } from '../modules/sanctuary'
import SanctuaryArchivePanel from '../components/SanctuaryArchivePanel.vue'
import SanctuaryBridgePanel from '../components/SanctuaryBridgePanel.vue'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceClass } = useViewEntrance()

const router = useRouter()
const runtime = useRuntimeState()

// 安全岛便签与访问记录：持久化已下沉至 useSanctuary()
const { notes, logs, loadNotes, addNote, clearNotes: clearAllNotes, loadLogs, createLog, updateLog, removeLog } = useSanctuary()

// 桌面静默覆盖：宪法 fail-closed 门控（sanctuary:enable ∧ 桌面端）+ 用户显式偏好
const {
  userWantsOverlay,
  lockModeWantsOverlay,
  isAllowed,
  isActive,
  lastError,
  sessionLocked,
  overlayForm,
  overlayForms,
  showBeacon,
  showHint,
  glowIntensity,
  toggle: toggleDesktopOverlay,
  enableLockMode,
  disableLockMode,
  setForm,
  setContent,
} = useDesktopSilentOverlay()

const overlayToggleDesc = computed(() => {
  if (!isAllowed.value) return '安全岛开启且为桌面端时可用'
  return userWantsOverlay.value ? '已开启 · 桌面常驻静默暖光' : '开启后桌面常驻一盏静默暖光'
})

async function onToggleDesktopOverlay() {
  await toggleDesktopOverlay()
}

// 仅锁屏时显示：锁屏模式开关（与常驻模式共用 shouldBeOpen 收敛点）
const lockModeDesc = computed(() => {
  if (!isAllowed.value) return '安全岛开启且为桌面端时可用'
  if (!lockModeWantsOverlay.value) return '开启后仅在系统锁屏时浮现静默暖光'
  return sessionLocked.value ? '已生效 · 锁屏中已浮现静默暖光' : '已开启 · 锁屏时自动浮现'
})

async function onToggleLockMode() {
  if (lockModeWantsOverlay.value) await disableLockMode()
  else await enableLockMode()
}

// 覆盖形态（B2-EXT-1）：仅切换视觉，不触碰宪法/平台门控；窗口开启时重建以应用新形态
async function onSelectForm(id: 'silent' | 'breath' | 'timeline') {
  if (!isAllowed.value) return
  await setForm(id)
}

// 覆盖内容（B2-EXT-2）：仅切换视觉（报点/落款/辉光强度），不触碰宪法/平台门控
async function onToggleBeacon() {
  if (!isAllowed.value) return
  await setContent({ showBeacon: !showBeacon.value })
}

async function onToggleHint() {
  if (!isAllowed.value) return
  await setContent({ showHint: !showHint.value })
}

// 强度滑杆：拖动中仅本地预览（不重建窗口），松开时一次性重建以让原生覆盖层采纳
function onIntensityInput(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  void setContent({ glowIntensity: v }, false)
}

async function onIntensityChange(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  await setContent({ glowIntensity: v }, true)
}

// ============================================================
// 呼吸练习统计（在 startHold 前声明）
// ============================================================
const sessionBreathCount = ref(0)
const sessionNotesReleased = ref(0)

// ============================================================
// 原有呼吸球逻辑
// ============================================================
const EXIT_DURATION = 3000
const isHolding = ref(false)
let exitTimer: ReturnType<typeof setTimeout> | null = null

function exitSanctuary() {
  cancelHold()
  runtime.exitSanctuary()
  if (window.history.length > 1) router.back()
  else router.push('/')
}

function startHold() {
  if (showNote.value || isHolding.value) return
  isHolding.value = true
  sessionBreathCount.value++
  exitTimer = setTimeout(() => {
    exitSanctuary()
  }, EXIT_DURATION)
}

function cancelHold() {
  isHolding.value = false
  if (exitTimer) {
    clearTimeout(exitTimer)
    exitTimer = null
  }
}

// ============================================================
// 原有便签逻辑
// ============================================================
const showNote = ref(false)
const releaseText = ref('')
const noteInputRef = ref<HTMLTextAreaElement | null>(null)

// 便签（释放便签）的加载/持久化已下沉至 useSanctuary()
// 视图仅消费 notes / addNote / clearNotes

function formatNoteTime(iso: string) {
  const date = new Date(iso)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function dissolveNote() {
  const el = document.querySelector('.release-note') as HTMLElement | null
  if (el) {
    el.style.transition = 'all 1.5s ease-out'
    el.style.opacity = '0'
    el.style.filter = 'blur(12px)'
    el.style.transform = 'translateY(40px)'
  }
  setTimeout(() => {
    showNote.value = false
    releaseText.value = ''
  }, 1500)
}

function keepNote() {
  const text = releaseText.value.trim()
  if (text) {
    addNote(text)
    sessionNotesReleased.value++
  }
  showNote.value = false
  releaseText.value = ''
}

// ============================================================
// 访问记录与统计（存储 key: hf:sanctuary_logs）
// ============================================================
// 访问记录的加载/持久化已下沉至 useSanctuary()
// 视图保留会话态（currentLogId / 呼吸与便签计数），经 createLog/updateLog/removeLog 写回

const currentLogId = ref('')

function createSessionLog() {
  const log = createLog()
  currentLogId.value = log.id
}

function updateSessionLog() {
  if (!currentLogId.value) return
  const idx = logs.value.findIndex((l) => l.id === currentLogId.value)
  if (idx === -1) return
  const now = Date.now()
  const start = new Date(logs.value[idx].enterAt).getTime()
  updateLog(currentLogId.value, {
    exitAt: new Date().toISOString(),
    durationSec: Math.floor((now - start) / 1000),
    breathCount: sessionBreathCount.value,
    notesReleased: sessionNotesReleased.value,
  })
}

function deleteVisitLog(id: string) {
  removeLog(id)
}

function formatVisitTime(iso: string) {
  const date = new Date(iso)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}

// 计算统计概览
const stats = computed(() => {
  const allLogs = logs.value
  const totalVisits = allLogs.length

  // 最近 7 天
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weeklyVisits = allLogs.filter((l) => new Date(l.enterAt).getTime() > weekAgo).length

  // 总停留分钟数
  const totalMinutes = Math.round(allLogs.reduce((sum, l) => sum + l.durationSec, 0) / 60)

  // 总释放便签数
  const totalNotes = allLogs.reduce((sum, l) => sum + l.notesReleased, 0)

  return { totalVisits, weeklyVisits, totalMinutes, totalNotes }
})

// ============================================================
// 安全岛状态摘要
// ============================================================
const sessionStartTime = ref(0)
const sessionDuration = ref(0)
let sessionTimerInterval: ReturnType<typeof setInterval> | null = null

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}秒`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`
}

// ============================================================
// 便签管理
// ============================================================
const showClearConfirm = ref(false)

function confirmClearNotes() {
  showClearConfirm.value = true
}

function clearNotes() {
  clearAllNotes()
  showClearConfirm.value = false
}

// ============================================================
// 生命周期
// ============================================================
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    exitSanctuary()
  }
}

onMounted(() => {
  runtime.enterSanctuary()
  // 宪法死开关：安全岛功能被禁用时即便导航到本视图也不真正进入，立即返回首页，
  // 避免展示一个未激活的「空壳」安全岛。
  if (!runtime.isSanctuaryActive.value) {
    router.replace('/')
    return
  }
  loadNotes()
  loadLogs()
  createSessionLog()

  sessionStartTime.value = Date.now()
  sessionTimerInterval = setInterval(() => {
    sessionDuration.value = Math.floor((Date.now() - sessionStartTime.value) / 1000)
  }, 1000)

  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  cancelHold()
  updateSessionLog()
  runtime.exitSanctuary()
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleKeydown)
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval)
    sessionTimerInterval = null
  }
})
</script>

<style scoped>
/* ================================================================
   安全岛 - 视觉语言：深夜温暖房间 · 庇护所 · 暖琥珀色包裹
   CSS 变量
   ================================================================ */
.sanctuary {
  --accent: var(--accent);
  --accent-light: #e8c8a8;
  --accent-dark: #a08060;
  --bg-deep: #0d0a08;
  --bg-warm: #120e0a;
  --text-primary: rgba(220, 200, 180, 0.8);
  --text-secondary: rgba(200, 180, 160, 0.6);
  --text-muted: rgba(160, 130, 100, 0.4);
  --glow-soft: 0 0 20px rgba(var(--accent-rgb), 0.12);
  --glow-medium: 0 0 40px rgba(var(--accent-rgb), 0.18);
  --glow-strong: 0 0 60px rgba(var(--accent-rgb), 0.25);
  --border-subtle: rgba(var(--accent-rgb), 0.1);
  --border-visible: rgba(var(--accent-rgb), 0.2);
  --border-strong: rgba(var(--accent-rgb), 0.35);

  position: fixed;
  inset: 0;
  z-index: 2000;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
}

/* ================================================================
   环境氛围层
   ================================================================ */

/* --- 暗角 vignette：四周向中心渐暗，形成"被包裹"感 --- */
.ambient-vignette {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 80% 70% at 50% 50%,
    transparent 0%,
    rgba(5, 3, 2, 0.3) 40%,
    rgba(5, 3, 2, 0.55) 65%,
    rgba(3, 2, 1, 0.8) 85%,
    rgba(0, 0, 0, 0.95) 100%
  );
}

/* --- 暖色中心光晕：深夜房间的一盏灯 --- */
.ambient-warm-light {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 60% 55% at 50% 48%,
    rgba(var(--accent-rgb), 0.06) 0%,
    rgba(var(--accent-rgb), 0.03) 25%,
    rgba(180, 140, 100, 0.015) 50%,
    transparent 75%
  );
  animation: ambient-light-pulse 8s ease-in-out infinite;
}

/* --- 墙壁微光纹理 --- */
.ambient-wall-texture {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.25;
  background-image:
    /* 水平微纹理 */ repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(var(--accent-rgb), 0.004) 2px,
      rgba(var(--accent-rgb), 0.004) 4px
    ),
    /* 垂直微纹理 */ repeating-linear-gradient(
      90deg,
      transparent,
      transparent 4px,
      rgba(var(--accent-rgb), 0.003) 4px,
      rgba(var(--accent-rgb), 0.003) 6px
    ),
    /* 大范围墙面斑驳 */ repeating-radial-gradient(
      circle at 20% 30%,
      transparent 0,
      transparent 30px,
      rgba(var(--accent-rgb), 0.008) 30px,
      rgba(var(--accent-rgb), 0.008) 31px
    ),
    repeating-radial-gradient(
      circle at 80% 70%,
      transparent 0,
      transparent 50px,
      rgba(var(--accent-rgb), 0.006) 50px,
      rgba(var(--accent-rgb), 0.006) 51px
    );
}

/* ================================================================
   0. 退出按钮 - 柔和温暖
   ================================================================ */
.exit-btn {
  position: fixed;
  top: 28px;
  right: 28px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  background: rgba(10, 8, 6, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.4s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.exit-btn:hover {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: var(--border-visible);
  color: var(--text-secondary);
  box-shadow: 0 2px 20px rgba(var(--accent-rgb), 0.06), var(--glow-soft);
}

.exit-btn-icon {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.exit-btn:hover .exit-btn-icon {
  transform: translateX(-2px);
}

/* ================================================================
   0.5 桌面静默覆盖开关
   ================================================================ */
.desktop-overlay-card {
  position: fixed;
  top: 28px;
  left: 28px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  width: 240px;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  background: rgba(10, 8, 6, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  transition: border-color 0.4s ease, box-shadow 0.4s ease;
}

.desktop-overlay-card:hover {
  border-color: var(--border-visible);
  box-shadow: 0 2px 20px rgba(var(--accent-rgb), 0.06), var(--glow-soft);
}

.doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.doc-row--sub {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.doc-row--form {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
  flex-wrap: wrap;
}

.doc-row--content {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.doc-row--intensity {
  align-items: center;
}

.doc-range {
  flex-shrink: 0;
  width: 110px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(var(--accent-rgb), 0.15);
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}

.doc-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-light);
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.4);
}

.doc-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: none;
  border-radius: 50%;
  background: var(--accent-light);
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.4);
}

.doc-range:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.form-seg {
  display: flex;
  gap: 6px;
  width: 100%;
  margin-top: 8px;
}

.form-seg__item {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 4px;
  font-size: 10px;
  color: var(--text-muted);
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: 9px;
  cursor: pointer;
  transition: border-color 0.3s ease, background 0.3s ease, color 0.3s ease, transform calc(0.16s / var(--hf-animate-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1);
}

.form-seg__item:hover:not(:disabled) {
  border-color: var(--border-visible);
  color: var(--text-secondary);
}

.form-seg__item--on {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--text-secondary);
}

.form-seg__item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.form-seg__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
  flex-shrink: 0;
}

.form-seg__label {
  white-space: nowrap;
}

.doc-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.doc-title {
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.doc-desc {
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.4;
}

.doc-toggle {
  flex-shrink: 0;
  position: relative;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: rgba(var(--accent-rgb), 0.06);
  cursor: pointer;
  padding: 0;
  transition: all 0.3s ease;
}

.doc-toggle--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.doc-toggle--on {
  background: rgba(var(--accent-rgb), 0.25);
  border-color: var(--border-visible);
}

.doc-knob {
  position: absolute;
  top: 50%;
  left: 3px;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-secondary);
  transition: all 0.3s ease;
}

.doc-toggle--on .doc-knob {
  left: 21px;
  background: var(--accent-light);
  box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.4);
}

.doc-error {
  font-size: 10px;
  color: rgba(200, 120, 100, 0.6);
  margin: 0;
}

/* ================================================================
   1. 统计概览行 - 发光边框 + 悬浮效果
   ================================================================ */
.stats-overview {
  position: fixed;
  top: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 32px;
  z-index: 10;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  background: rgba(13, 10, 8, 0.4);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: all 0.4s ease;
  cursor: default;
  position: relative;
  overflow: hidden;
}

/* 统计卡片顶部微光 */
.stat-item::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.2),
    transparent
  );
  opacity: 0;
  transition: opacity 0.6s ease;
}

.stat-item:hover {
  border-color: var(--border-visible);
  background: rgba(20, 15, 12, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), var(--glow-soft);
}

.stat-item:hover::before {
  opacity: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: 300;
  color: var(--text-secondary);
  letter-spacing: 1px;
  transition: color 0.4s ease, text-shadow 0.4s ease;
}

.stat-item:hover .stat-value {
  color: var(--accent-light);
  text-shadow: 0 0 12px rgba(var(--accent-rgb), 0.15);
}

.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: color 0.4s ease;
}

.stat-item:hover .stat-label {
  color: rgba(var(--accent-rgb), 0.5);
}

/* ================================================================
   2. 呼吸引导 - 增强发光 · 心跳 · 旋转环
   ================================================================ */
.breath-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  z-index: 5;
}

.breath-orb {
  position: relative;
  width: 80px;
  height: 80px;
  cursor: pointer;
  touch-action: none;
}

/* --- orb-core: 多层发光核心 --- */
.orb-core {
  position: absolute;
  inset: 22%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 42% 38%,
    rgba(232, 200, 168, 0.5) 0%,
    rgba(var(--accent-rgb), 0.35) 30%,
    rgba(160, 120, 80, 0.15) 70%,
    transparent 100%
  );
  box-shadow:
    0 0 15px rgba(var(--accent-rgb), 0.08),
    inset 0 0 20px rgba(var(--accent-rgb), 0.04);
  transition: transform 0.3s, background 0.6s, box-shadow 0.6s;
  animation: sanctuary-core 6s ease-in-out infinite;
}

/* orb-core 伪元素：额外内层光晕 */
.orb-core::before {
  content: '';
  position: absolute;
  inset: 15%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 45% 40%,
    rgba(232, 200, 168, 0.3) 0%,
    transparent 70%
  );
  animation: orb-inner-pulse 3s ease-in-out infinite;
}

/* orb-core 伪元素：外发光层 */
.orb-core::after {
  content: '';
  position: absolute;
  inset: -30%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(var(--accent-rgb), 0.06) 0%,
    transparent 70%
  );
  animation: sanctuary-glow 6s ease-in-out infinite;
}

.breath-orb.holding .orb-core {
  background: radial-gradient(
    circle at 42% 38%,
    rgba(240, 215, 190, 0.6) 0%,
    rgba(var(--accent-rgb), 0.45) 30%,
    rgba(180, 140, 100, 0.25) 70%,
    transparent 100%
  );
  box-shadow:
    0 0 30px rgba(var(--accent-rgb), 0.15),
    0 0 60px rgba(var(--accent-rgb), 0.08),
    inset 0 0 30px rgba(var(--accent-rgb), 0.08);
}

/* --- orb-glow: 扩大光晕，呼吸动画 --- */
.orb-glow {
  position: absolute;
  inset: -60%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(var(--accent-rgb), 0.06) 0%,
    rgba(var(--accent-rgb), 0.03) 30%,
    transparent 70%
  );
  animation: sanctuary-glow 6s ease-in-out infinite;
  filter: blur(4px);
}

.breath-orb.holding .orb-glow {
  background: radial-gradient(
    circle at 50% 50%,
    rgba(var(--accent-rgb), 0.12) 0%,
    rgba(var(--accent-rgb), 0.06) 30%,
    transparent 70%
  );
}

/* --- orb-ring: 旋转光环 --- */
.orb-ring {
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  border: 0.5px solid rgba(var(--accent-rgb), 0.1);
  box-shadow:
    0 0 8px rgba(var(--accent-rgb), 0.04),
    inset 0 0 8px rgba(var(--accent-rgb), 0.02);
  animation: orb-ring-rotate 20s linear infinite;
}

/* orb-ring 第二个环（伪元素） */
.orb-ring::before {
  content: '';
  position: absolute;
  inset: -8%;
  border-radius: 50%;
  border: 0.5px solid rgba(var(--accent-rgb), 0.06);
  animation: orb-ring-rotate 15s linear infinite reverse;
}

.breath-orb.holding .orb-ring {
  border-color: rgba(var(--accent-rgb), 0.2);
  box-shadow:
    0 0 12px rgba(var(--accent-rgb), 0.08),
    inset 0 0 12px rgba(var(--accent-rgb), 0.04);
}

/* --- orb-heart: 温暖心跳 --- */
.orb-heart {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: rgba(var(--accent-rgb), 0.6);
  text-shadow: 0 0 12px rgba(var(--accent-rgb), 0.2);
  animation: heart-beat 0.8s ease-in-out infinite;
  z-index: 2;
}

/* ================================================================
   3. 呼吸练习统计
   ================================================================ */
.breath-stats {
  margin-top: 24px;
  text-align: center;
  z-index: 5;
}

.breath-stats-text {
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 2px;
}

/* ================================================================
   4. 安全岛状态摘要
   ================================================================ */
.session-summary {
  margin-top: 16px;
  display: flex;
  gap: 24px;
  align-items: center;
  z-index: 5;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.summary-label {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.summary-value {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 300;
}

/* ================================================================
   5. 退出条
   ================================================================ */
.exit-bar-wrap {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 5;
}

.exit-bar {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 1px;
  min-width: 4px;
  max-width: 200px;
  width: 0;
  box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.15);
}

.exit-bar--active {
  animation: exit-progress 3s linear forwards;
}

@keyframes exit-progress {
  from { width: 0; }
  to { width: 200px; }
}

.exit-hint {
  font-size: 11px;
  color: var(--text-secondary);
}

/* ================================================================
   6. 释放便签
   ================================================================ */
.note-trigger {
  position: fixed;
  bottom: 30px;
  /* P1 修复：原 bottom:28 right:28 与右下角「访问记录」面板首条删除钮（visit-record-delete）争角互压，
     删除钮被遮不可点。改到屏幕底部居中（与释放便签编辑器同锚点、语义一致），彻底避开记录面板。
     居中用 margin-left 而非 transform，避免与 hover 的 transform:scale 冲突。 */
  left: 50%;
  margin-left: -18px;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s ease;
  border-radius: 50%;
  z-index: 5;
}

.note-trigger:hover {
  color: var(--accent);
  text-shadow: 0 0 12px rgba(var(--accent-rgb), 0.2);
  transform: scale(1.15);
}

.release-note {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
}

.release-textarea {
  width: 100%;
  padding: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  background: rgba(13, 10, 8, 0.85);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: none;
  outline: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  transition: border-color 0.4s ease, box-shadow 0.4s ease;
}

.release-textarea:focus {
  border-color: var(--border-visible);
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.35), var(--glow-soft);
}

.release-textarea::placeholder {
  color: rgba(160, 130, 100, 0.25);
}

.release-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.release-btn {
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid;
  font-family: inherit;
  transition: all 0.3s ease;
}

.dissolve-btn {
  background: transparent;
  border-color: var(--border-subtle);
  color: var(--text-secondary);
}

.dissolve-btn:hover {
  border-color: var(--border-visible);
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.04);
}

.keep-btn {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: var(--border-visible);
  color: var(--accent-dark);
}

.keep-btn:hover {
  background: rgba(var(--accent-rgb), 0.15);
  border-color: var(--border-strong);
  color: var(--accent-light);
  box-shadow: var(--glow-soft);
}

/* ================================================================
   7. 已留便签 - 纸片质感 · 边缘发光
   ================================================================ */
.kept-notes {
  position: fixed;
  left: calc(var(--sidebar-w, 220px) + 24px);
  bottom: 24px;
  width: min(320px, calc(100vw - 96px));
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 5;
  pointer-events: none;
}

.kept-note-card {
  position: relative;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  background: linear-gradient(
    165deg,
    rgba(30, 22, 16, 0.92) 0%,
    rgba(18, 14, 10, 0.95) 50%,
    rgba(13, 10, 8, 0.97) 100%
  );
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.28),
    0 0 12px rgba(var(--accent-rgb), 0.03);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: auto;
  overflow: hidden;
  animation: note-card-appear 0.6s ease-out;
}

/* 纸片顶部边缘微光 */
.kept-note-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.12),
    transparent
  );
}

/* 纸片纹理 overlay */
.kept-note-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(var(--accent-rgb), 0.005) 3px,
    rgba(var(--accent-rgb), 0.005) 4px
  );
  opacity: 0.3;
}

.kept-note-card:hover {
  border-color: var(--border-visible);
  box-shadow:
    0 20px 56px rgba(0, 0, 0, 0.32),
    0 0 20px rgba(var(--accent-rgb), 0.05);
}

.kept-note-text {
  position: relative;
  z-index: 1;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.kept-note-time {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-secondary);
  position: relative;
  z-index: 1;
}

/* ================================================================
   8. 便签管理
   ================================================================ */
.note-management {
  position: fixed;
  left: calc(var(--sidebar-w, 220px) + 24px);
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 6;
}

/* 移动端：固定浮层避让 56px 底栏，否则被底栏遮住形成割裂 */
@media (max-width: 639px) {
  .kept-notes {
    bottom: calc(56px + 12px + 56px);
  }
  .note-management {
    bottom: calc(56px + 12px);
  }
}

.note-count {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.clear-notes-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 12px;
  border: 0.5px solid var(--border-subtle);
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.3s;
  letter-spacing: 1px;
  font-family: inherit;

  min-height: 26px;
}

.clear-notes-btn:hover {
  border-color: rgba(180, 100, 80, 0.25);
  color: rgba(200, 120, 100, 0.5);
}

/* 清空确认弹窗 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 3, 2, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.confirm-dialog {
  background: linear-gradient(
    165deg,
    rgba(30, 22, 16, 0.96) 0%,
    rgba(13, 10, 8, 0.98) 100%
  );
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 28px 32px;
  max-height: 86vh;
  overflow-y: auto;
  width: 280px;
  text-align: center;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4), var(--glow-soft);
}

.confirm-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 6px;
}

.confirm-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0 0 20px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.confirm-btn {
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.3s;
  font-family: inherit;
}

.confirm-cancel {
  background: transparent;
  border-color: var(--border-subtle);
  color: var(--text-secondary);
}

.confirm-cancel:hover {
  border-color: var(--border-visible);
  color: var(--text-secondary);
}

.confirm-ok {
  background: rgba(180, 80, 60, 0.1);
  border-color: rgba(180, 80, 60, 0.2);
  color: rgba(200, 120, 100, 0.5);
}

.confirm-ok:hover {
  background: rgba(180, 80, 60, 0.2);
  border-color: rgba(180, 80, 60, 0.35);
  color: rgba(220, 140, 120, 0.7);
}

/* ================================================================
   9. 访问记录
   ================================================================ */
.visit-records {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 200px;
  max-height: 40vh;
  display: flex;
  flex-direction: column;
  z-index: 5;
  pointer-events: none;
}

.visit-records-title {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin: 0 0 8px;
  font-weight: 400;
}

.visit-records-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  pointer-events: auto;
  padding-right: 4px;
}

.visit-records-list::-webkit-scrollbar {
  width: 2px;
}

.visit-records-list::-webkit-scrollbar-track {
  background: transparent;
}

.visit-records-list::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-rgb), 0.08);
  border-radius: 1px;
}

.visit-record-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(10, 8, 6, 0.3);
  transition: background 0.3s, border-color 0.3s, transform calc(0.16s / var(--hf-animate-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1);
  border: 0.5px solid transparent;
}

.visit-record-item:hover {
  background: rgba(var(--accent-rgb), 0.04);
  border-color: var(--border-subtle);
}

.visit-record-item--current {
  border-left: 2px solid var(--border-visible);
  background: rgba(var(--accent-rgb), 0.03);
}

.visit-record-time {
  font-size: 10px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.visit-record-duration {
  font-size: 10px;
  color: rgba(160, 130, 100, 0.45);
  flex: 1;
  text-align: right;
}

.visit-record-delete {
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  color: rgba(160, 130, 100, 0.38);
  font-size: 9px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s;
  padding: 0;
  flex-shrink: 0;

  min-height: 24px;
  min-width: 24px;
}

.visit-record-delete:not(:disabled):hover {
  color: rgba(200, 120, 100, 0.5);
}

.visit-record-delete:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

/* ================================================================
   过渡动画（原有）
   ================================================================ */
.note-fade-enter-active {
  transition: all 0.4s ease-out;
}

.note-fade-leave-active {
  transition: all 1.5s ease-out;
}

.note-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.note-fade-leave-to {
  opacity: 0;
  filter: blur(12px);
  transform: translateX(-50%) translateY(40px);
}

.kept-note-fade-enter-active,
.kept-note-fade-leave-active {
  transition: all 0.4s ease;
}

.kept-note-fade-enter-from,
.kept-note-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: all 0.25s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-from .confirm-dialog,
.confirm-fade-leave-to .confirm-dialog {
  transform: scale(0.92);
}

/* ================================================================
   关键帧动画
   ================================================================ */

/* 呼吸核心脉动 */
@keyframes sanctuary-core {
  0%, 100% {
    transform: scale(0.85);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 光晕呼吸 */
@keyframes sanctuary-glow {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

/* 内层光晕微脉动 */
@keyframes orb-inner-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.15);
  }
}

/* 光环旋转 */
@keyframes orb-ring-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 心跳 */
@keyframes heart-beat {
  0%, 100% {
    transform: scale(1);
  }
  15% {
    transform: scale(1.3);
  }
  30% {
    transform: scale(1);
  }
}

/* 环境暖光微脉动 */
@keyframes ambient-light-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.9;
  }
}

/* 便签卡片出现动画 */
@keyframes note-card-appear {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ================================================================
   响应式
   ================================================================ */
@media (max-width: 640px) {
  /* 移动端：安全岛全屏重排 */
  .exit-btn {
    top: 48px;
    right: 12px;
    padding: 6px 12px;
    font-size: 11px;
  }

  .exit-btn-icon {
    font-size: 12px;
  }

  .exit-btn-label {
    display: none;
  }

  .stats-overview {
    top: 48px;
    gap: 12px;
  }

  .stat-item {
    padding: 8px 10px;
    border-radius: 10px;
  }

  .stat-value {
    font-size: 14px;
  }

  .stat-label {
    font-size: 9px;
  }

  .breath-orb {
    width: 60px;
    height: 60px;
  }

  .breath-stats {
    margin-top: 16px;
  }

  .breath-stats-text {
    font-size: 10px;
  }

  .session-summary {
    gap: 16px;
    margin-top: 12px;
  }

  .summary-value {
    font-size: 11px;
  }

  .summary-label {
    font-size: 9px;
  }

  .exit-bar-wrap {
    bottom: 48px;
  }

  .exit-hint {
    font-size: 10px;
  }

  .note-trigger {
    bottom: 20px;
    left: auto;
    right: 16px;
    margin-left: 0;
    font-size: 16px;
  }

  .release-note {
    bottom: 80px;
    width: calc(100vw - 32px);
  }

  .release-textarea {
    padding: 12px;
    font-size: 13px;
  }

  .kept-notes {
    left: 12px;
    bottom: 12px;
    width: calc(100vw - 24px);
    max-height: 30vh;
  }

  .kept-note-card {
    padding: 12px 14px;
    border-radius: 12px;
  }

  .kept-note-text {
    font-size: 12px;
  }

  .kept-note-time {
    font-size: 10px;
  }

  .note-management {
    left: 12px;
    bottom: 64px;
  }

  .visit-records {
    display: none;
  }

  .desktop-overlay-card {
    top: 48px;
    left: 12px;
    right: 52px;
    width: auto;
    padding: 10px 12px;
  }

  .doc-title {
    font-size: 11px;
  }

  .doc-desc {
    font-size: 9px;
  }
}
</style>