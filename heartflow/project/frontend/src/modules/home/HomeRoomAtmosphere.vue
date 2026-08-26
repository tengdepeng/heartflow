<template>
  <div
    class="room-atmosphere"
    :style="atmosphereStyle"
    aria-hidden="true"
  >
    <!-- 基础氛围光晕 -->
    <div class="atmosphere-base" :style="baseStyle"></div>

    <!-- 纹理层 -->
    <div class="atmosphere-texture" :class="`texture--${room.texture}`"></div>

    <!-- 壁纸图案层 -->
    <div class="atmosphere-pattern" :class="`pattern--${room.texture}`"></div>

    <!-- 装饰粒子 -->
    <div class="atmosphere-particles" v-if="showParticles">
      <div
        v-for="i in particleProfile.count"
        :key="i"
        class="particle"
        :class="`particle--${particleProfile.motion}`"
        :style="particleStyle(i)"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HomeRoom } from './rooms'

const props = defineProps<{
  room: HomeRoom
  showParticles?: boolean
}>()

const atmosphereStyle = computed(() => ({
  '--atmosphere-color': props.room.atmosphereColor,
  '--atmosphere-end': props.room.atmosphereEndColor,
}))

const baseStyle = computed(() => ({
  background: `radial-gradient(
    ellipse 60% 55% at 50% 48%,
    color-mix(in srgb, ${props.room.atmosphereColor} 6%, transparent) 0%,
    color-mix(in srgb, ${props.room.atmosphereColor} 3%, transparent) 30%,
    transparent 70%
  )`,
}))

// R4 氛围语义化：按房间性格 + 时段生成粒子（取代纯随机 Math.random）
type ParticleMotion = 'float' | 'fall' | 'twinkle' | 'drift'
interface ParticleProfile {
  color: string
  motion: ParticleMotion
  sizeMul: number
  durMul: number
  count: number
}

// 各房间粒子性格：书房墨色慢浮 / 庭院阳台绿点飘落 / 卧室浴室冷蓝微星 / 客厅厨房暖光缓移
const ROOM_PARTICLE_PROFILES: Record<string, ParticleProfile> = {
  study:     { color: 'rgba(196, 186, 165, 0.6)',  motion: 'float',   sizeMul: 1.0,  durMul: 1.6, count: 12 },
  yard:      { color: 'rgba(150, 205, 150, 0.6)',  motion: 'fall',    sizeMul: 0.9,  durMul: 1.2, count: 14 },
  courtyard: { color: 'rgba(150, 205, 150, 0.6)',  motion: 'fall',    sizeMul: 0.9,  durMul: 1.2, count: 14 },
  bedroom:   { color: 'rgba(170, 178, 225, 0.6)',  motion: 'twinkle', sizeMul: 0.8,  durMul: 2.2, count: 10 },
  bath:      { color: 'rgba(170, 210, 225, 0.55)', motion: 'twinkle', sizeMul: 0.85, durMul: 2.0, count: 10 },
  living:    { color: 'rgba(240, 213, 176, 0.5)',  motion: 'drift',   sizeMul: 1.0,  durMul: 1.4, count: 12 },
  kitchen:   { color: 'rgba(230, 200, 160, 0.5)',  motion: 'drift',   sizeMul: 1.0,  durMul: 1.3, count: 12 },
}

const hour = new Date().getHours()
const isNight = hour >= 19 || hour < 6
const isDawnDusk = (hour >= 6 && hour < 8) || (hour >= 17 && hour < 19)
// 夜深粒子更慢更静，破晓/黄昏略缓
const timeFactor = isNight ? 1.3 : isDawnDusk ? 1.1 : 1

const particleProfile = computed<ParticleProfile>(() => {
  const base = ROOM_PARTICLE_PROFILES[props.room.id]
  if (base) return { ...base, durMul: base.durMul * timeFactor }
  // 默认：沿用房间主色，缓慢上浮
  return {
    color: props.room.color,
    motion: 'float',
    sizeMul: 1,
    durMul: 1.4 * timeFactor,
    count: 12,
  }
})

function particleStyle(_i: number) {
  const x = 8 + Math.random() * 84
  const y = isNight ? Math.random() * 90 : 10 + Math.random() * 80
  const size = (1.5 + Math.random() * 2.5) * particleProfile.value.sizeMul
  const delay = Math.random() * 8
  const dur = (6 + Math.random() * 6) * particleProfile.value.durMul
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${dur}s`,
    background: particleProfile.value.color,
  }
}
</script>

<style scoped>
.room-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  transition: background 0.8s ease;
}

/* ---- 基础光晕 ---- */
.atmosphere-base {
  position: absolute;
  inset: 0;
  transition: all 0.8s ease;
  animation: atmos-pulse 8s ease-in-out infinite;
}

@keyframes atmos-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ---- 纹理层 ---- */
.atmosphere-texture {
  position: absolute;
  inset: 0;
  opacity: 0.03;
  transition: opacity 0.8s ease;
}

/* 墙面纹理 */
.texture--wall {
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(255, 255, 255, 0.02) 3px,
      rgba(255, 255, 255, 0.02) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 6px,
      rgba(255, 255, 255, 0.015) 6px,
      rgba(255, 255, 255, 0.015) 7px
    );
}

/* 木纹 */
.texture--wood {
  background-image:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 8px,
      rgba(255, 255, 255, 0.02) 8px,
      rgba(255, 255, 255, 0.02) 9px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 20px,
      rgba(255, 255, 255, 0.01) 20px,
      rgba(255, 255, 255, 0.01) 21px
    );
}

/* 石纹 */
.texture--stone {
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.02) 0%, transparent 20px),
    radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.015) 0%, transparent 30px),
    radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.01) 0%, transparent 15px);
}

/* 织物 */
.texture--fabric {
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(255, 255, 255, 0.01) 1px,
      rgba(255, 255, 255, 0.01) 2px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 1px,
      rgba(255, 255, 255, 0.015) 1px,
      rgba(255, 255, 255, 0.015) 2px
    );
}

/* 玻璃 */
.texture--glass {
  background-image:
    linear-gradient(
      135deg,
      transparent 0%,
      rgba(255, 255, 255, 0.02) 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.015) 75%,
      transparent 100%
    );
  background-size: 200% 200%;
  animation: glass-shimmer 10s ease-in-out infinite;
}

@keyframes glass-shimmer {
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}

/* 纸张 */
.texture--paper {
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.008) 2px,
      rgba(255, 255, 255, 0.008) 3px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 5px,
      rgba(255, 255, 255, 0.006) 5px,
      rgba(255, 255, 255, 0.006) 6px
    );
}

/* 瓷砖 */
.texture--tile {
  background-image:
    linear-gradient(0deg, transparent 49%, rgba(255, 255, 255, 0.01) 50%, transparent 51%),
    linear-gradient(90deg, transparent 49%, rgba(255, 255, 255, 0.01) 50%, transparent 51%);
  background-size: 20px 20px;
}

/* 金属 */
.texture--metal {
  background-image:
    linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.015) 20%,
      transparent 40%,
      rgba(255, 255, 255, 0.01) 60%,
      transparent 80%,
      rgba(255, 255, 255, 0.015) 100%
    );
  background-size: 60px 100%;
  animation: metal-sweep 6s linear infinite;
}

@keyframes metal-sweep {
  0% { background-position: 0 0; }
  100% { background-position: 60px 0; }
}

/* 植物 */
.texture--plant {
  background-image:
    radial-gradient(ellipse at 30% 40%, rgba(255, 255, 255, 0.02) 0%, transparent 15px),
    radial-gradient(ellipse at 70% 60%, rgba(255, 255, 255, 0.015) 0%, transparent 20px),
    radial-gradient(ellipse at 50% 80%, rgba(255, 255, 255, 0.01) 0%, transparent 12px);
}

/* ---- 壁纸图案 ---- */
.atmosphere-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.02;
  transition: opacity 0.8s ease;
}

/* 各房间壁纸图案 */
.pattern--wall {
  background-image:
    repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255, 255, 255, 0.02) 40px, rgba(255, 255, 255, 0.02) 41px);
  background-size: 60px 100%;
}

.pattern--wood {
  background-image: radial-gradient(circle at 50% 50%, var(--bg-surface) 0%, transparent 4px);
  background-size: 30px 30px;
}

.pattern--stone {
  background-image: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.02) 0%, transparent 3px);
  background-size: 24px 24px;
}

.pattern--fabric {
  background-image: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.015) 0%, transparent 2px);
  background-size: 8px 8px;
}

.pattern--tile {
  background-image: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.02) 0%, transparent 3px);
  background-size: 20px 20px;
}

/* ---- 装饰粒子 ---- */
.atmosphere-particles {
  position: absolute;
  inset: 0;
}

.particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0;
  filter: blur(0.5px);
}
.particle--float { animation-name: particle-float; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.particle--fall { animation-name: particle-fall; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.particle--twinkle { animation-name: particle-twinkle; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.particle--drift { animation-name: particle-drift; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }

@keyframes particle-float {
  0%, 100% {
    opacity: 0;
    transform: translateY(0) scale(0.5);
  }
  20% {
    opacity: 0.15;
  }
  50% {
    opacity: 0.1;
    transform: translateY(-30px) scale(1);
  }
  80% {
    opacity: 0.05;
  }
}

/* 飘落：庭院/阳台的绿点向下沉落 */
@keyframes particle-fall {
  0%, 100% { opacity: 0; transform: translateY(-12px) scale(0.5); }
  20% { opacity: 0.16; }
  50% { opacity: 0.12; transform: translateY(34px) scale(1); }
  80% { opacity: 0.05; }
}

/* 微星：卧室/浴室的冷蓝星点明灭闪烁 */
@keyframes particle-twinkle {
  0%, 100% { opacity: 0.04; transform: scale(0.6); }
  50% { opacity: 0.24; transform: scale(1.1); }
}

/* 缓移：客厅/厨房的暖光轻微漂移 */
@keyframes particle-drift {
  0%, 100% { opacity: 0; transform: translate(0, 0) scale(0.6); }
  25% { opacity: 0.13; transform: translate(8px, -10px) scale(1); }
  50% { opacity: 0.08; transform: translate(-6px, -20px) scale(0.9); }
  75% { opacity: 0.11; transform: translate(4px, -30px) scale(1); }
  80% { opacity: 0.04; }
}
</style>