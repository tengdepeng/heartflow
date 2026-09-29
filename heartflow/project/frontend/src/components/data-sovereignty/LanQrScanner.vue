<template>
  <div class="lan-qr-scanner">
    <div class="lqs-stage">
      <video ref="video" class="lqs-video" playsinline muted aria-label="摄像头取景预览" />
      <canvas ref="canvas" class="lqs-canvas" />

      <!-- 取景框 + 扫描线（仅扫描中显示，引导对齐） -->
      <div v-if="scanning" class="lqs-reticle" aria-hidden="true">
        <span class="lqs-corner tl" />
        <span class="lqs-corner tr" />
        <span class="lqs-corner bl" />
        <span class="lqs-corner br" />
        <span class="lqs-scanline" />
      </div>

      <!-- 未开启：中性引导（不再误显「摄像头未开启」） -->
      <div v-if="!scanning && !error && !justDetected" class="lqs-idle">
        <span class="lqs-idle-icon" aria-hidden="true">▦</span>
        <p class="lqs-idle-title">点击下方开启摄像头</p>
        <p class="lqs-idle-sub">将源端二维码对准中央取景框，保持平稳</p>
      </div>

      <!-- 识别成功闪现 -->
      <div v-if="justDetected" class="lqs-success" aria-hidden="true">
        <span class="lqs-check">✓</span>
        <p>已识别</p>
      </div>
    </div>

    <p v-if="error" class="lqs-error">{{ error }}</p>
    <p v-else-if="scanning" class="lqs-hint">将二维码放入取景框内，保持平稳…</p>

    <div class="lqs-actions">
      <button
        v-if="!scanning && !justDetected"
        class="guard-btn"
        type="button"
        aria-label="开启摄像头"
        @click="start"
      >
        {{ error ? '重试' : '开启摄像头' }}
      </button>
      <button
        v-else-if="scanning"
        class="guard-btn"
        type="button"
        aria-label="停止扫描"
        @click="stop"
      >
        停止扫描
      </button>
      <button class="guard-btn guard-btn--ghost" type="button" aria-label="取消扫码" @click="$emit('close')">
        取消
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import jsQR from 'jsqr'

const emit = defineEmits<{
  (e: 'detected', text: string): void
  (e: 'close'): void
}>()

const video = ref<HTMLVideoElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const scanning = ref(false)
const justDetected = ref(false)
const error = ref('')

let streamRef: MediaStream | null = null
let rafId = 0
let successTimer: ReturnType<typeof setTimeout> | null = null

async function start() {
  error.value = ''
  justDetected.value = false
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = '当前环境不支持摄像头（需在桌面/移动端授权摄像头权限后使用）'
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
    scanning.value = true
    loop()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // 权限被拒等场景给出可读引导，而非裸错误
    error.value = msg.includes('NotAllowed')
      ? '摄像头权限被拒绝，请在系统设置中允许后重试'
      : '无法访问摄像头：' + msg
    scanning.value = false
  }
}

function loop() {
  if (!scanning.value) return
  const v = video.value
  const c = canvas.value
  if (v && c && v.readyState >= 2 && v.videoWidth > 0) {
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.drawImage(v, 0, 0, c.width, c.height)
      const img = ctx.getImageData(0, 0, c.width, c.height)
      const code = jsQR(img.data, img.width, img.height)
      if (code?.data) {
        stop()
        justDetected.value = true
        successTimer = setTimeout(() => emit('detected', code.data), 700)
        return
      }
    }
  }
  rafId = requestAnimationFrame(loop)
}

function stop() {
  scanning.value = false
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  if (successTimer) {
    clearTimeout(successTimer)
    successTimer = null
  }
  streamRef?.getTracks().forEach((t) => t.stop())
  streamRef = null
}

onUnmounted(stop)
</script>

<style scoped>
.lan-qr-scanner {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 取景舞台：居中、限定宽度，避免桌面端铺满 */
.lqs-stage {
  position: relative;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  aspect-ratio: 1 / 1;
  background: #000;
  border-radius: var(--radius-md, 10px);
  overflow: hidden;
  box-shadow: var(--shadow, 0 4px 24px rgba(0, 0, 0, 0.4));
}

.lqs-video {
  width: 100%;
  height: 100%;
  /* contain：展示完整画面，用户可见正在扫描的范围，避免 cover 截断误导 */
  object-fit: contain;
  background: #000;
}

/* 解码用离屏画布，无需显示 */
.lqs-canvas {
  display: none;
}

/* ---- 取景框（四角括号）+ 扫描线 ---- */
.lqs-reticle {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.lqs-corner {
  position: absolute;
  width: 26px;
  height: 26px;
  border: 2px solid var(--accent, #d4a574);
  filter: drop-shadow(0 0 4px rgba(var(--accent-rgb, 212, 165, 116), 0.6));
}
.lqs-corner.tl {
  top: 16%;
  left: 16%;
  border-right: none;
  border-bottom: none;
}
.lqs-corner.tr {
  top: 16%;
  right: 16%;
  border-left: none;
  border-bottom: none;
}
.lqs-corner.bl {
  bottom: 16%;
  left: 16%;
  border-right: none;
  border-top: none;
}
.lqs-corner.br {
  bottom: 16%;
  right: 16%;
  border-left: none;
  border-top: none;
}
.lqs-scanline {
  position: absolute;
  left: 16%;
  right: 16%;
  height: 2px;
  top: 16%;
  background: linear-gradient(90deg, transparent, var(--accent, #d4a574), transparent);
  box-shadow: 0 0 10px rgba(var(--accent-rgb, 212, 165, 116), 0.7);
  animation: lqs-scan 2s ease-in-out infinite;
}
@keyframes lqs-scan {
  0% {
    top: 16%;
  }
  50% {
    top: 82%;
  }
  100% {
    top: 16%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lqs-scanline {
    animation: none;
    top: 49%;
  }
}

/* ---- 未开启引导 ---- */
.lqs-idle {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  text-align: center;
  background: rgba(0, 0, 0, 0.55);
}
.lqs-idle-icon {
  font-size: 30px;
  color: var(--accent, #d4a574);
  opacity: 0.85;
}
.lqs-idle-title {
  font-size: 14px;
  color: var(--text-primary, #e8e0d8);
}
.lqs-idle-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  line-height: 1.5;
}

/* ---- 识别成功闪现 ---- */
.lqs-success {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.62);
  animation: lqs-pop 0.25s ease-out;
}
.lqs-check {
  font-size: 42px;
  line-height: 1;
  color: var(--success, #34d399);
  filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.5));
}
.lqs-success p {
  font-size: 14px;
  color: var(--success, #34d399);
}
@keyframes lqs-pop {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* ---- 文案 ---- */
.lqs-hint {
  font-size: 13px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  text-align: center;
}
.lqs-error {
  font-size: 13px;
  color: var(--error, #ef4444);
  text-align: center;
  line-height: 1.5;
}
.lqs-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 幽灵按钮（取消）：透明底 + 细边框，与设计令牌一致 */
.guard-btn--ghost {
  background: transparent;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.35);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.guard-btn--ghost:hover {
  border-color: rgba(var(--accent-rgb, 212, 165, 116), 0.6);
  color: var(--text-primary, #e8e0d8);
}
</style>
