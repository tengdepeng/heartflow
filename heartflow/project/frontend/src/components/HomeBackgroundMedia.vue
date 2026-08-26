<template>
  <!-- 单一背景根：仅在有内容（预设场景 或 曾经出现过的图片/视频）时渲染。
       关键：video 元素一旦创建就保活，仅用 v-show 隐藏，避免切换房间
       （video ↔ preset/default）反复销毁重建 <video> 造成重新播放、多路音频叠加。 -->
  <div
    v-if="isPreset || mediaSlot"
    class="home-background-media"
  >
    <!-- ===== Preset Scene（覆盖在媒体之上，自带不透明渐变） ===== -->
    <template v-if="isPreset">
      <div class="preset-scene" :class="`preset-scene--${background.presetScene}`">
        <div class="preset-scene__gradient" />

        <!-- ---- 晨曦森林 ---- -->
        <template v-if="background.presetScene === 'forest-dawn'">
          <svg class="preset-scene__svg preset-scene__svg--trees" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path d="M0 300 L40 180 L80 280 L120 160 L160 270 L200 140 L240 260 L280 150 L320 270 L360 170 L400 290 L440 200 L480 300 L520 210 L560 280 L600 190 L640 300 L680 220 L720 300 L760 190 L800 280 L840 200 L880 300 L920 230 L960 290 L1000 180 L1040 270 L1080 200 L1120 290 L1160 170 L1200 260 L1240 190 L1280 280 L1320 210 L1360 300 L1400 240 L1440 300 Z" fill="rgba(0,0,0,0.35)" />
            <path d="M0 300 L60 200 L120 280 L180 180 L240 260 L300 170 L360 250 L420 190 L480 280 L540 210 L600 300 L660 230 L720 290 L780 200 L840 270 L900 220 L960 300 L1020 240 L1080 280 L1140 190 L1200 260 L1260 210 L1320 290 L1380 180 L1440 260 Z" fill="rgba(0,0,0,0.2)" />
            <path d="M0 300 L100 240 L200 280 L300 220 L400 270 L500 230 L600 290 L700 250 L800 300 L900 260 L1000 280 L1100 240 L1200 290 L1300 250 L1400 270 L1440 300 Z" fill="rgba(0,0,0,0.12)" />
          </svg>
          <div class="preset-scene__particles">
            <span v-for="(p, i) in forestParticles" :key="i" class="particle particle--glow" :style="p.style" />
          </div>
        </template>

        <!-- ---- 星空海岸 ---- -->
        <template v-if="background.presetScene === 'coast-starlight'">
          <svg class="preset-scene__svg preset-scene__svg--waves" viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path d="M0 120 Q60 80 120 100 T240 90 T360 110 T480 80 T600 100 T720 85 T840 105 T960 95 T1080 110 T1200 90 T1320 105 T1440 100 V200 H0 Z" fill="rgba(54, 214, 231, 0.06)">
              <animate attributeName="d" dur="8s" repeatCount="indefinite" values="
                M0 120 Q60 80 120 100 T240 90 T360 110 T480 80 T600 100 T720 85 T840 105 T960 95 T1080 110 T1200 90 T1320 105 T1440 100 V200 H0 Z;
                M0 115 Q60 90 120 95 T240 105 T360 90 T480 100 T600 110 T720 95 T840 100 T960 110 T1080 95 T1200 105 T1320 100 T1440 115 V200 H0 Z;
                M0 120 Q60 80 120 100 T240 90 T360 110 T480 80 T600 100 T720 85 T840 105 T960 95 T1080 110 T1200 90 T1320 105 T1440 100 V200 H0 Z
              " />
            </path>
            <path d="M0 140 Q70 115 140 130 T280 120 T420 135 T560 115 T700 130 T840 120 T980 135 T1120 125 T1260 140 T1400 125 T1440 135 V200 H0 Z" fill="rgba(124, 108, 240, 0.08)">
              <animate attributeName="d" dur="10s" repeatCount="indefinite" values="
                M0 140 Q70 115 140 130 T280 120 T420 135 T560 115 T700 130 T840 120 T980 135 T1120 125 T1260 140 T1400 125 T1440 135 V200 H0 Z;
                M0 135 Q70 125 140 120 T280 130 T420 125 T560 135 T700 120 T840 130 T980 125 T1120 135 T1260 125 T1400 135 T1440 140 V200 H0 Z;
                M0 140 Q70 115 140 130 T280 120 T420 135 T560 115 T700 130 T840 120 T980 135 T1120 125 T1260 140 T1400 125 T1440 135 V200 H0 Z
              " />
            </path>
          </svg>
          <div class="preset-scene__particles">
            <span v-for="(p, i) in starParticles" :key="i" class="particle particle--star" :style="p.style" />
          </div>
        </template>

        <!-- ---- 秋日庭院 ---- -->
        <template v-if="background.presetScene === 'autumn-courtyard'">
          <svg class="preset-scene__svg preset-scene__svg--branches" viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path d="M0 200 Q180 140 360 170 Q540 120 720 160 Q900 100 1080 150 Q1260 110 1440 160 V200 H0 Z" fill="rgba(0,0,0,0.15)" />
            <path d="M0 200 Q200 160 400 180 Q600 140 800 170 Q1000 130 1200 160 Q1320 140 1440 170 V200 H0 Z" fill="rgba(0,0,0,0.1)" />
          </svg>
          <div class="preset-scene__particles">
            <span v-for="(p, i) in leafParticles" :key="i" class="particle particle--leaf" :style="p.style" />
          </div>
        </template>

        <!-- ---- 雨窗 ---- -->
        <template v-if="background.presetScene === 'rainy-window'">
          <div class="preset-scene__blur-overlay" />
          <div class="preset-scene__particles">
            <span v-for="(p, i) in rainParticles" :key="i" class="particle particle--rain" :style="p.style" />
          </div>
        </template>

        <!-- ---- 山间云海 ---- -->
        <template v-if="background.presetScene === 'mountain-cloud'">
          <svg class="preset-scene__svg preset-scene__svg--clouds" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <g class="cloud-group cloud-group--1">
              <path d="M120 280 Q140 250 170 255 Q190 230 220 235 Q240 215 270 220 Q290 200 320 210 Q340 195 370 205 Q390 190 420 200 Q440 185 470 195 Q490 180 520 190 Q540 175 570 185 Q590 175 620 185 Q640 180 670 190 Q690 185 720 195 Q740 190 770 200 Q790 200 820 210 Q840 210 870 220 Q890 225 920 235 Q940 240 970 250 Q990 255 1020 265 Q1040 270 1070 280 H120 Z" fill="rgba(200, 210, 230, 0.07)">
                <animateTransform attributeName="transform" type="translate" dur="24s" repeatCount="indefinite" values="0,0;30,0;0,0" />
              </path>
            </g>
            <g class="cloud-group cloud-group--2">
              <path d="M200 240 Q220 215 250 220 Q270 200 300 205 Q320 185 350 190 Q370 175 400 185 Q420 170 450 180 Q470 170 500 180 Q520 170 550 180 Q570 175 600 185 Q620 180 650 190 Q670 190 700 200 Q720 200 750 210 Q770 215 800 225 Q820 230 850 240 Q870 245 900 255 Q920 260 950 270 H200 Z" fill="rgba(200, 210, 230, 0.05)">
                <animateTransform attributeName="transform" type="translate" dur="30s" repeatCount="indefinite" values="0,0;-25,0;0,0" />
              </path>
            </g>
            <g class="cloud-group cloud-group--3">
              <path d="M400 300 Q420 275 450 280 Q470 260 500 265 Q520 245 550 250 Q570 235 600 245 Q620 230 650 240 Q670 235 700 245 Q720 240 750 250 Q770 250 800 260 Q820 265 850 275 Q870 280 900 290 Q920 295 950 305 H400 Z" fill="rgba(200, 210, 230, 0.04)">
                <animateTransform attributeName="transform" type="translate" dur="20s" repeatCount="indefinite" values="0,0;20,0;0,0" />
              </path>
            </g>
          </svg>
        </template>

        <!-- ---- 雪夜 ---- -->
        <template v-if="background.presetScene === 'snowy-night'">
          <div class="preset-scene__particles">
            <span v-for="(p, i) in snowParticles" :key="i" class="particle particle--snow" :style="p.style" />
          </div>
        </template>

        <!-- 通用遮罩层 -->
        <div class="home-background-media__veil" />
        <div class="home-background-media__grain" />
      </div>
    </template>

    <!-- ===== Image / Video（稳定保活，仅 visible 时显示并播放） ===== -->
    <div v-if="mediaSlot" class="home-background-media__media" v-show="mediaVisible">
      <img
        v-if="mediaSlot.type === 'image'"
        class="home-background-media__asset home-background-media__asset--image"
        :src="mediaSlot.dataUrl"
        :alt="background.fileName || '自定义背景图片'"
        @error="$emit('loadError')"
      />

      <video
        v-else
        ref="videoEl"
        class="home-background-media__asset home-background-media__asset--video"
        :src="mediaSlot.dataUrl"
        autoplay
        :muted="videoMuted"
        loop
        playsinline
        preload="metadata"
        @error="$emit('loadError')"
      />

      <div class="home-background-media__veil" :class="`home-background-media__veil--${mediaSlot.type}`" />
      <div class="home-background-media__grain" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { BackgroundMediaConfig } from '../types'
import { useBackgroundPreviewAudio, useBackgroundVideoSync, useVideoRateGuard } from '../modules/background'
import { useAppearance } from '../modules/customization/useAppearance'

const props = defineProps<{
  background: BackgroundMediaConfig
}>()

defineEmits<{
  loadError: []
}>()

// 视频背景是否静音：省略或 true 视为静音（默认），false 保留原声。
// 当背景配置界面（殿堂设置）在前台时，全局背景让出声音（previewOwnsAudio），改为预览出声，
// 避免两路同源音频叠加。
const { previewOwnsAudio } = useBackgroundPreviewAudio()
const { registerGlobalVideo, globalDecodingSuppressed } = useBackgroundVideoSync()
const { bgVideoRate } = useAppearance()
const videoMuted = computed(() => previewOwnsAudio.value || props.background.muted !== false)

// 是否为有效的预设场景
const isPreset = computed(
  () =>
    props.background.type === 'preset' &&
    !!props.background.presetScene &&
    props.background.presetScene !== 'none',
)

// 媒体插槽：一旦出现过图片/视频就保留其 DOM，避免切换房间（video ↔ preset/default）
// 反复销毁重建 <video> 造成重新播放、甚至多路音频叠加；仅用 v-show 隐藏/恢复。
const mediaSlot = ref<{ type: 'image' | 'video'; dataUrl: string } | null>(null)
watch(
  () => [props.background.type, props.background.dataUrl] as const,
  ([type, dataUrl]) => {
    if ((type === 'image' || type === 'video') && dataUrl) {
      mediaSlot.value = { type, dataUrl }
    }
  },
  { immediate: true },
)

// 当前是否应显示媒体层（预设/默认时隐藏）
const mediaVisible = computed(
  () => props.background.type === 'image' || props.background.type === 'video',
)

const videoEl = ref<HTMLVideoElement | null>(null)

// 统一同步视频播放状态：
// - 隐藏（切到预设/默认房间）时暂停，杜绝旧视频的音频泄漏到其它房间；
// - 显示且开启原声时续播（带声需用户手势，开关点击即手势）；
// - 静音开关变化立即同步 muted 属性。
function syncVideoPlayback() {
  const el = videoEl.value
  if (!el) return
  el.muted = videoMuted.value
  // 应用超级自定义 · 背景视频播放速度
  if (el.playbackRate !== bgVideoRate.value) {
    try { el.playbackRate = bgVideoRate.value } catch { /* 个别环境不支持 playbackRate 写入，忽略 */ }
  }
  // 媒体可见时务必播放：静音视频随时允许自动播放；开启原声时 play() 依赖用户手势
  // （开关点击即手势）。此前仅 !videoMuted 才 play，导致默认静音背景视频不动作——
  // <video autoplay> 在 muted 属性响应式晚绑定时常被浏览器拦截，画面停在第一帧。
  // 预览在前台且独立播放时，全局视频被抑制（暂停，避免双路同源软解卡顿）；
  // 仅在媒体可见且未被抑制时才播放。
  if (mediaVisible.value && !globalDecodingSuppressed.value) {
    el.play().catch(() => {})
  } else {
    el.pause()
  }
}

// 全局背景视频元素注册到同步模块（供殿堂设置预览对齐进度）
watch(
  videoEl,
  (el) => {
    registerGlobalVideo(el)
  },
  { immediate: true },
)

// 倍速守卫：对抗浏览器在 loop 续播 / 缓冲 / play() 后把 playbackRate 静默复位为 1，
// 确保背景视频速度始终等于设定值（与设置页预览守卫同源，已抽为共享 composable）。
useVideoRateGuard(videoEl, bgVideoRate)

watch(videoMuted, syncVideoPlayback)
watch(mediaVisible, syncVideoPlayback)
watch(bgVideoRate, syncVideoPlayback)
// 预览进入/离开前台时（globalDecodingSuppressed 翻转）重算全局视频播放状态
watch(globalDecodingSuppressed, syncVideoPlayback)
onMounted(syncVideoPlayback)
onBeforeUnmount(() => {
  videoEl.value?.pause()
  registerGlobalVideo(null)
})

// ---- 粒子工厂 ----

function makeParticles(
  count: number,
  sizeRange: [number, number],
  durationRange: [number, number],
  delayRange: [number, number],
  opacityRange: [number, number],
  leftRange: [number, number] = [0, 100],
): Array<{ style: Record<string, string> }> {
  return Array.from({ length: count }, () => {
    const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0])
    const duration = durationRange[0] + Math.random() * (durationRange[1] - durationRange[0])
    const delay = delayRange[0] + Math.random() * (delayRange[1] - delayRange[0])
    const opacity = opacityRange[0] + Math.random() * (opacityRange[1] - opacityRange[0])
    const left = leftRange[0] + Math.random() * (leftRange[1] - leftRange[0])
    return {
      style: {
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${duration.toFixed(1)}s`,
        animationDelay: `${delay.toFixed(1)}s`,
        opacity: opacity.toFixed(2),
      },
    }
  })
}

const forestParticles = computed(() =>
  makeParticles(16, [3, 6], [6, 12], [0, 6], [0.3, 0.8], [5, 95]),
)

const starParticles = computed(() =>
  makeParticles(28, [1, 3], [2, 6], [0, 5], [0.3, 1], [2, 98]),
)

const leafParticles = computed(() =>
  makeParticles(14, [6, 12], [8, 16], [0, 8], [0.4, 0.9], [2, 98]),
)

const rainParticles = computed(() =>
  makeParticles(24, [1, 1.5], [0.6, 1.8], [0, 1.2], [0.2, 0.7], [1, 99]),
)

const snowParticles = computed(() =>
  makeParticles(35, [2, 5], [10, 20], [0, 10], [0.3, 0.9], [1, 99]),
)
</script>

<style scoped>
.home-background-media {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  /* 超级自定义：全局自定义背景强度，默认 1 与现状一致（0 时完全透出壳层底色） */
  opacity: var(--app-bg-alpha, 1);
}

/* 媒体层：稳定保活容器，显隐由 v-show 控制（不销毁 video 元素） */
.home-background-media__media {
  position: absolute;
  inset: 0;
}

/* ---- 通用资源样式 ---- */

.home-background-media__asset {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.02);
  filter: saturate(0.94) brightness(0.55);
  opacity: 0;
  animation: background-fade-in 0.6s ease forwards;
}

.home-background-media__asset--video {
  filter: saturate(0.96) brightness(0.48) contrast(1.04);
}

.home-background-media__veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 18%, rgba(124, 108, 240, 0.16), transparent 36%),
    radial-gradient(circle at 80% 12%, rgba(54, 214, 231, 0.08), transparent 30%),
    linear-gradient(180deg, rgba(8, 10, 18, 0.16), rgba(8, 10, 18, 0.54));
}

.home-background-media__veil--video {
  background:
    radial-gradient(circle at 20% 18%, rgba(124, 108, 240, 0.14), transparent 32%),
    radial-gradient(circle at 80% 12%, rgba(54, 214, 231, 0.06), transparent 26%),
    linear-gradient(180deg, rgba(8, 10, 18, 0.24), rgba(8, 10, 18, 0.62));
}

.home-background-media__grain {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 20%, rgba(255, 255, 255, 0.01));
  mix-blend-mode: soft-light;
  opacity: 0.5;
}

/* ============================================================
   预设场景容器
   ============================================================ */

.preset-scene {
  position: absolute;
  inset: 0;
  opacity: 0;
  animation: background-fade-in 0.8s ease forwards;
}

.preset-scene__gradient {
  position: absolute;
  inset: 0;
}

.preset-scene__svg {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
}

.preset-scene__particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* ---- 粒子基类 ---- */

.particle {
  position: absolute;
  bottom: 0;
  border-radius: 50%;
  will-change: transform, opacity;
}

/* ============================================================
   场景 1：晨曦森林
   ============================================================ */

.preset-scene--forest-dawn .preset-scene__gradient {
  background: linear-gradient(
    180deg,
    #0d1f0d 0%,
    #142612 20%,
    #1e2a0e 40%,
    #2a1f08 60%,
    #3a2410 80%,
    #4a2a10 100%
  );
}

.preset-scene--forest-dawn .preset-scene__svg--trees {
  height: 35%;
  min-height: 120px;
}

.particle--glow {
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 220, 140, 0.9), rgba(255, 200, 100, 0.3));
  box-shadow: 0 0 6px 2px rgba(255, 200, 100, 0.3);
  animation: float-up-glow ease-in-out infinite;
}

@keyframes float-up-glow {
  0% {
    transform: translateY(0) translateX(0) scale(0.6);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  50% {
    transform: translateY(-45vh) translateX(15px) scale(1);
    opacity: 0.8;
  }
  90% {
    opacity: 0.4;
  }
  100% {
    transform: translateY(-90vh) translateX(-10px) scale(0.4);
    opacity: 0;
  }
}

/* ============================================================
   场景 2：星空海岸
   ============================================================ */

.preset-scene--coast-starlight .preset-scene__gradient {
  background: linear-gradient(
    180deg,
    #06061a 0%,
    #0a0a2e 15%,
    #120a30 30%,
    #0a1528 50%,
    #0a1e1a 70%,
    #0a2818 100%
  );
}

.preset-scene--coast-starlight .preset-scene__svg--waves {
  height: 25%;
  min-height: 100px;
}

.particle--star {
  top: 0;
  bottom: auto;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 4px 1px rgba(200, 220, 255, 0.5);
  animation: twinkle ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% {
    transform: scale(0.3);
    opacity: 0.2;
  }
  25% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  75% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

/* ============================================================
   场景 3：秋日庭院
   ============================================================ */

.preset-scene--autumn-courtyard .preset-scene__gradient {
  background: linear-gradient(
    180deg,
    #120800 0%,
    #1a0e00 20%,
    #241500 40%,
    #2e1c00 60%,
    #3a2508 80%,
    #4a3010 100%
  );
}

.preset-scene--autumn-courtyard .preset-scene__svg--branches {
  height: 20%;
  min-height: 80px;
}

.particle--leaf {
  width: 8px;
  height: 14px;
  border-radius: 2px 50% 2px 50%;
  background: linear-gradient(135deg, #c47030, #a05020);
  opacity: 0.7;
  animation: fall-leaf linear infinite;
}

@keyframes fall-leaf {
  0% {
    transform: translateY(-10vh) rotate(0deg) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  50% {
    transform: translateY(40vh) rotate(180deg) translateX(30px);
    opacity: 0.6;
  }
  90% {
    opacity: 0.3;
  }
  100% {
    transform: translateY(100vh) rotate(360deg) translateX(-20px);
    opacity: 0;
  }
}

/* ============================================================
   场景 4：雨窗
   ============================================================ */

.preset-scene--rainy-window .preset-scene__gradient {
  background: linear-gradient(
    180deg,
    #080810 0%,
    #0c0c1a 20%,
    #101020 40%,
    #141428 60%,
    #181830 80%,
    #1c1c38 100%
  );
}

.preset-scene--rainy-window .preset-scene__blur-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(20, 22, 40, 0.3), transparent 70%),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 80px,
      rgba(255, 255, 255, 0.008) 80px,
      rgba(255, 255, 255, 0.008) 82px
    );
  backdrop-filter: blur(2px);
}

.particle--rain {
  width: 1px;
  height: 12px;
  border-radius: 0;
  background: linear-gradient(180deg, transparent, rgba(180, 200, 230, 0.5), rgba(180, 200, 230, 0.3));
  animation: rain-fall linear infinite;
}

@keyframes rain-fall {
  0% {
    transform: translateY(-10vh);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  80% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(100vh);
    opacity: 0;
  }
}

/* ============================================================
   场景 5：山间云海
   ============================================================ */

.preset-scene--mountain-cloud .preset-scene__gradient {
  background: linear-gradient(
    180deg,
    #08081a 0%,
    #0e0e22 15%,
    #14142a 30%,
    #1a1a32 50%,
    #22223a 70%,
    #2a2a42 100%
  );
}

.preset-scene--mountain-cloud .preset-scene__svg--clouds {
  height: 50%;
  min-height: 160px;
}

/* ============================================================
   场景 6：雪夜
   ============================================================ */

.preset-scene--snowy-night .preset-scene__gradient {
  background: linear-gradient(
    180deg,
    #08081a 0%,
    #0a0a1e 15%,
    #0e0e22 35%,
    #121226 55%,
    #141428 75%,
    #16162a 100%
  );
}

.particle--snow {
  background: rgba(220, 230, 255, 0.8);
  box-shadow: 0 0 4px 1px rgba(200, 220, 255, 0.15);
  animation: snow-fall linear infinite;
}

@keyframes snow-fall {
  0% {
    transform: translateY(-5vh) translateX(0) scale(0.8);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  50% {
    transform: translateY(45vh) translateX(20px) scale(1.1);
    opacity: 0.8;
  }
  90% {
    opacity: 0.4;
  }
  100% {
    transform: translateY(100vh) translateX(-15px) scale(0.6);
    opacity: 0;
  }
}

/* ---- 通用淡入动画 ---- */

@keyframes background-fade-in {
  from {
    opacity: 0;
    transform: scale(1.04);
  }

  to {
    opacity: 1;
    transform: scale(1.02);
  }
}
</style>
