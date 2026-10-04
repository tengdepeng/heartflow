<script setup lang="ts">
// ============================================================
// 藏象阁 · AI 拍照引导取景面板（INCR-506）
// 选场景 → 对齐取景（分步引导 + 取景框）→ 倒计时拍摄 →
// 本地画质评估（亮度/清晰度/主体占比）→ 结果与历史。
// 合规：零网络，图像仅在内存画布做本地统计，不上传、不落盘、
// 不作医疗诊断；历史仅存元数据。
// ============================================================
import { ref, computed, onUnmounted } from 'vue'
import { usePhotoGuide, analyzeImageData, LEVEL_LABEL } from '../modules/photo-guide/photo-guide'
import type { CaptureSceneId } from '../modules/photo-guide/photo-guide'

const {
  scenes,
  scene,
  activeSceneId,
  phase,
  result,
  records,
  selectScene,
  beginAligning,
  markCaptured,
  submitMetrics,
  reset,
  clearHistory,
} = usePhotoGuide()

const video = ref<HTMLVideoElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const error = ref('')
const countdown = ref(0)

let streamRef: MediaStream | null = null
let timer: ReturnType<typeof setInterval> | null = null

const isLive = computed(() => phase.value === 'aligning')

const reticleClass = computed(() => `gcap-reticle--${scene.value.reticle}`)
const stageStyle = computed<Record<string, string>>(() => ({
  aspectRatio: scene.value.aspect === '1:1' ? '1 / 1' : '4 / 3',
}))

function clearTimer(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function stopCamera(): void {
  clearTimer()
  countdown.value = 0
  streamRef?.getTracks().forEach((t) => t.stop())
  streamRef = null
}

async function startCamera(): Promise<void> {
  error.value = ''
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = '当前环境不支持摄像头（需在桌面/移动端授权后使用）'
    return
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    streamRef = stream
    const v = video.value
    if (!v) return
    v.srcObject = stream
    await v.play()
    beginAligning()
    startCountdown()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    error.value = msg.includes('NotAllowed')
      ? '摄像头权限被拒绝，请在系统设置中允许后重试'
      : '无法访问摄像头：' + msg
    reset()
  }
}

function startCountdown(): void {
  clearTimer()
  countdown.value = 3
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearTimer()
      capture()
    }
  }, 1000)
}

function capture(): void {
  const v = video.value
  const c = canvas.value
  if (v && c && v.videoWidth > 0 && v.videoHeight > 0) {
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.drawImage(v, 0, 0, c.width, c.height)
      const img = ctx.getImageData(0, 0, c.width, c.height)
      markCaptured()
      submitMetrics(analyzeImageData(img.data, img.width, img.height))
      stopCamera()
      return
    }
  }
  // 取不到帧：给中性提示并回到待机，不写入历史
  error.value = '未能读取画面，请重试'
  stopCamera()
  reset()
}

function retake(): void {
  reset()
  error.value = ''
}

function switchScene(id: CaptureSceneId): void {
  stopCamera()
  error.value = ''
  selectScene(id)
}

function levelText(level: string): string {
  return LEVEL_LABEL[level as keyof typeof LEVEL_LABEL] ?? level
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onUnmounted(stopCamera)
</script>

<template>
  <section class="gcap-panel">
    <header class="gcap-head">
      <span class="gcap-kicker">藏象阁 · 三诊取景</span>
      <h3 class="gcap-title">AI 拍照引导取景</h3>
      <p class="gcap-sub">按引导对齐取景，拍摄后本地评估画质，图像不留存</p>
    </header>

    <div class="gcap-scenes">
      <button
        v-for="s in scenes"
        :key="s.id"
        class="gcap-scene"
        :class="{ 'is-active': s.id === activeSceneId }"
        type="button"
        @click="switchScene(s.id)"
      >
        <span class="gcap-scene-icon">{{ s.icon }}</span>
        <span class="gcap-scene-label">{{ s.label }}</span>
      </button>
    </div>

    <div class="gcap-stage" :style="stageStyle">
      <video ref="video" class="gcap-video" playsinline muted aria-label="取景预览" />
      <canvas ref="canvas" class="gcap-canvas" />

      <!-- 取景框 + 分步序号 -->
      <div v-if="isLive" class="gcap-overlay" aria-hidden="true">
        <div class="gcap-reticle" :class="reticleClass">
          <span class="gcap-corner tl" />
          <span class="gcap-corner tr" />
          <span class="gcap-corner bl" />
          <span class="gcap-corner br" />
        </div>
        <div v-if="countdown > 0" class="gcap-count">{{ countdown }}</div>
      </div>

      <!-- 待机引导 -->
      <div v-if="!isLive && phase !== 'result'" class="gcap-idle">
        <span class="gcap-idle-icon">{{ scene.icon }}</span>
        <p class="gcap-idle-title">{{ scene.desc }}</p>
        <p class="gcap-idle-sub">点击下方「开启取景」，对准后自动拍摄</p>
      </div>

      <!-- 结果覆盖 -->
      <div v-if="phase === 'result' && result" class="gcap-result-overlay">
        <span class="gcap-result-score" :class="'is-' + result.level">{{ result.score }}</span>
        <span class="gcap-result-level" :class="'is-' + result.level">{{ levelText(result.level) }}</span>
      </div>
    </div>

    <p v-if="error" class="gcap-error" role="alert">{{ error }}</p>

    <!-- 分步引导 -->
    <ol class="gcap-steps">
      <li v-for="(st, i) in scene.steps" :key="i" class="gcap-step">
        <span class="gcap-step-no">{{ i + 1 }}</span>
        <span>{{ st }}</span>
      </li>
    </ol>

    <ul class="gcap-tips">
      <li v-for="(t, i) in scene.tips" :key="i">· {{ t }}</li>
    </ul>

    <div class="gcap-actions">
      <button
        v-if="!isLive && phase !== 'result'"
        class="gcap-btn gcap-btn--primary"
        type="button"
        @click="startCamera"
      >开启取景</button>
      <button v-else-if="isLive" class="gcap-btn" type="button" @click="stopCamera(); reset()">停止</button>
      <button v-else class="gcap-btn" type="button" @click="retake">重拍</button>
    </div>

    <!-- 评估结果 -->
    <div v-if="result" class="gcap-eval" :class="'is-' + result.level">
      <div class="gcap-eval-head">
        <span class="gcap-eval-title">取景质量评估</span>
        <span class="gcap-eval-score">{{ result.score }} 分 · {{ levelText(result.level) }}</span>
      </div>
      <div v-if="result.issues.length" class="gcap-eval-row">
        <span class="gcap-eval-tag is-issue">问题</span>
        <span>{{ result.issues.join('、') }}</span>
      </div>
      <div v-if="result.tips.length" class="gcap-eval-row">
        <span class="gcap-eval-tag">建议</span>
        <span>{{ result.tips.join('；') }}</span>
      </div>
      <p class="gcap-eval-note">本地画质评估，仅作取景参考，不构成任何医疗诊断。</p>
    </div>

    <!-- 历史 -->
    <div v-if="records.length" class="gcap-history">
      <div class="gcap-history-head">
        <span>取景记录</span>
        <button class="gcap-clear" type="button" @click="clearHistory">清空</button>
      </div>
      <div v-for="r in records.slice(0, 6)" :key="r.id" class="gcap-history-item">
        <span class="gcap-history-scene">{{ scenes.find(s => s.id === r.sceneId)?.label ?? r.sceneId }}</span>
        <span class="gcap-history-score" :class="'is-' + r.level">{{ r.score }}</span>
        <span class="gcap-history-time">{{ formatTime(r.at) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.gcap-panel {
  margin-top: 12px;
  padding: 14px 16px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(255, 255, 255, 0.015);
}

.gcap-head { margin-bottom: 12px; }
.gcap-kicker { font-size: 11px; letter-spacing: 0.14em; color: rgba(var(--accent-rgb), 0.6); }
.gcap-title { margin: 2px 0 0; font-size: 14px; font-weight: 500; color: var(--accent); letter-spacing: 1px; }
.gcap-sub { margin: 4px 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.42); }

.gcap-scenes { display: flex; gap: 8px; margin-bottom: 12px; }
.gcap-scene {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 6px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.gcap-scene:hover { border-color: rgba(var(--accent-rgb), 0.24); color: rgba(255, 255, 255, 0.75); }
.gcap-scene.is-active {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}
.gcap-scene-icon { font-size: 18px; }

.gcap-stage {
  position: relative;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  background: #000;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}
.gcap-video { width: 100%; height: 100%; object-fit: cover; background: #000; }
.gcap-canvas { display: none; }

.gcap-overlay { position: absolute; inset: 0; pointer-events: none; }
.gcap-reticle { position: absolute; inset: 12%; }
.gcap-reticle--oval { border-radius: 50%; }
.gcap-reticle--circle { inset: 18%; border-radius: 50%; }
.gcap-reticle--rect { border-radius: 10px; }
.gcap-corner {
  position: absolute;
  width: 24px;
  height: 24px;
  border: 2px solid var(--accent);
  filter: drop-shadow(0 0 4px rgba(var(--accent-rgb), 0.6));
}
.gcap-reticle--oval .gcap-corner,
.gcap-reticle--circle .gcap-corner { display: none; }
.gcap-reticle--oval::before,
.gcap-reticle--circle::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px dashed rgba(var(--accent-rgb), 0.85);
  border-radius: 50%;
}
.gcap-corner.tl { top: 0; left: 0; border-right: none; border-bottom: none; }
.gcap-corner.tr { top: 0; right: 0; border-left: none; border-bottom: none; }
.gcap-corner.bl { bottom: 0; left: 0; border-right: none; border-top: none; }
.gcap-corner.br { bottom: 0; right: 0; border-left: none; border-top: none; }

.gcap-count {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 64px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 18px rgba(var(--accent-rgb), 0.9);
  animation: gcap-pulse 1s ease-out;
}
@keyframes gcap-pulse {
  from { transform: translate(-50%, -50%) scale(1.35); opacity: 0.4; }
  to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

.gcap-idle {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
}
.gcap-idle-icon { font-size: 30px; }
.gcap-idle-title { margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.85); }
.gcap-idle-sub { margin: 0; font-size: 11px; color: rgba(255, 255, 255, 0.45); }

.gcap-result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.55);
}
.gcap-result-score { font-size: 46px; font-weight: 700; line-height: 1; }
.gcap-result-score.is-good { color: #8ac48a; }
.gcap-result-score.is-fair { color: #d4b872; }
.gcap-result-score.is-poor { color: #cf7e7e; }
.gcap-result-level { font-size: 13px; }
.gcap-result-level.is-good { color: #8ac48a; }
.gcap-result-level.is-fair { color: #d4b872; }
.gcap-result-level.is-poor { color: #cf7e7e; }

.gcap-error {
  margin: 10px 0 0;
  font-size: 12px;
  color: #cf7e7e;
  text-align: center;
  line-height: 1.5;
}

.gcap-steps { margin: 12px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.gcap-step { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: rgba(255, 255, 255, 0.6); line-height: 1.5; }
.gcap-step-no {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
}

.gcap-tips { margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; }
.gcap-tips li { font-size: 11px; color: rgba(255, 255, 255, 0.38); line-height: 1.5; }

.gcap-actions { display: flex; justify-content: center; margin-top: 12px; }
.gcap-btn {
  padding: 7px 18px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.gcap-btn:hover { border-color: rgba(var(--accent-rgb), 0.3); }
.gcap-btn--primary {
  border-color: rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.gcap-eval {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}
.gcap-eval.is-good { border-color: rgba(138, 196, 138, 0.3); }
.gcap-eval.is-fair { border-color: rgba(212, 184, 114, 0.3); }
.gcap-eval.is-poor { border-color: rgba(207, 126, 126, 0.3); }
.gcap-eval-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
.gcap-eval-title { font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, 0.8); }
.gcap-eval-score { font-size: 12px; color: var(--accent); font-variant-numeric: tabular-nums; }
.gcap-eval-row { display: flex; gap: 6px; font-size: 12px; color: rgba(255, 255, 255, 0.55); line-height: 1.5; margin-bottom: 3px; }
.gcap-eval-tag {
  flex-shrink: 0;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 5px;
  background: rgba(var(--accent-rgb), 0.12);
  color: rgba(var(--accent-rgb), 0.8);
  align-self: center;
}
.gcap-eval-tag.is-issue { background: rgba(207, 126, 126, 0.14); color: #cf7e7e; }
.gcap-eval-note { margin: 6px 0 0; font-size: 10px; color: rgba(255, 255, 255, 0.3); line-height: 1.5; }

.gcap-history { margin-top: 14px; }
.gcap-history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 6px;
}
.gcap-clear {
  font-size: 11px;
  font-family: inherit;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
}
.gcap-clear:hover { color: rgba(255, 255, 255, 0.6); }
.gcap-history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.02);
  margin-bottom: 4px;
  font-size: 12px;
}
.gcap-history-scene { color: rgba(255, 255, 255, 0.6); }
.gcap-history-score { font-weight: 600; font-variant-numeric: tabular-nums; }
.gcap-history-score.is-good { color: #8ac48a; }
.gcap-history-score.is-fair { color: #d4b872; }
.gcap-history-score.is-poor { color: #cf7e7e; }
.gcap-history-time { margin-left: auto; font-size: 11px; color: rgba(255, 255, 255, 0.32); }
</style>
