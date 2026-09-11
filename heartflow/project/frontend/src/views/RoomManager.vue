<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance rm-room-manager">
    <!-- Ambient background -->
    <div data-enter class="rm-ambient" aria-hidden="true">
      <div class="rm-ambient-grid"></div>
      <div class="rm-ambient-glow"></div>
    </div>

    <!-- Header -->
    <header data-enter class="rm-header">
      <div class="rm-ornament">
        <span class="rm-ornament-line"></span>
        <span class="rm-ornament-diamond">✦</span>
        <span class="rm-ornament-line"></span>
      </div>
      <p class="rm-kicker">ROOM CONFIGURATION</p>
      <h1>房间管理器</h1>
      <p class="rm-subtitle">管理所有房间的可见性和自定义</p>
    </header>

    <!-- 复用聚合面板（与殿堂设置内的「房间设置」同源，单一实现、两处入口） -->
    <RoomSettingsPanel />

    <!-- 空间健康（INCR-237 补挂载孤儿组件 SpaceHealthPanel：报告/问题/告警/趋势，引擎唯一、零 props 直驱） -->
    <SpaceHealthPanel />

    <!-- 房间模板（INCR-238 补挂载孤儿组件 RoomTemplatesPanel：模板/布局/场景，引擎唯一、零 props 直驱） -->
    <RoomTemplatesPanel />
  </div>
</template>

<script setup lang="ts">
import { useViewEntrance } from '../composables/useViewEntrance'
import RoomSettingsPanel from '../components/RoomSettingsPanel.vue'
import SpaceHealthPanel from '../components/SpaceHealthPanel.vue'
import RoomTemplatesPanel from '../components/RoomTemplatesPanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
</script>

<style scoped>
/* =============================================
   CSS Variables — Room Manager Theme
   Accent color: var(--accent) (warm)
   ============================================= */
.rm-room-manager {
  --rm-accent: var(--accent);
  --rm-accent-rgb: 212, 165, 116;
  --rm-bg: #0a0a0a;

  position: relative;
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  background: transparent;
  min-height: 100vh;
  overflow: hidden;
}

/* =============================================
   Ambient Background Layer
   ============================================= */
.rm-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.rm-ambient-grid {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 0v60M0 30h60' stroke='%23d4a574' stroke-width='0.5' fill='none'/%3E%3Ccircle cx='30' cy='30' r='2' fill='%23d4a574' opacity='0.4'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23d4a574' opacity='0.25'/%3E%3Ccircle cx='60' cy='0' r='1.5' fill='%23d4a574' opacity='0.25'/%3E%3Ccircle cx='0' cy='60' r='1.5' fill='%23d4a574' opacity='0.25'/%3E%3Ccircle cx='60' cy='60' r='1.5' fill='%23d4a574' opacity='0.25'/%3E%3C/svg%3E");
  background-size: 60px 60px;
}

.rm-ambient-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse at center, rgba(var(--rm-accent-rgb), 0.06) 0%, transparent 70%);
  animation: rm-ambient-pulse 6s ease-in-out infinite alternate;
}

@keyframes rm-ambient-pulse {
  0% { opacity: 0.5; transform: translateX(-50%) scale(1); }
  100% { opacity: 1; transform: translateX(-50%) scale(1.08); }
}

/* =============================================
   Header
   ============================================= */
.rm-header {
  position: relative;
  z-index: 1;
  margin-bottom: 36px;
  text-align: center;
}

.rm-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.rm-ornament-line {
  display: block;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--rm-accent-rgb), 0.4), transparent);
}

.rm-ornament-diamond {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--rm-accent);
  opacity: 0.7;
  animation: rm-ornament-spin 8s linear infinite;
}

@keyframes rm-ornament-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.rm-kicker {
  font-size: 10px;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: rgba(var(--rm-accent-rgb), 0.5);
  margin: 0 0 10px;
  font-weight: 400;
}

.rm-header h1 {
  font-size: 22px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
}

.rm-subtitle {
  font-size: 13px;
  color: var(--text-muted, var(--text-muted));
  margin-top: 6px;
}

/* =============================================
   Responsive
   ============================================= */
@media (max-width: 480px) {
  .rm-room-manager {
    padding: 24px 16px 64px;
  }

  .rm-header {
    margin-bottom: 28px;
  }

  .rm-header h1 {
    font-size: 20px;
  }

  .rm-ornament-line {
    width: 28px;
  }
}
</style>
