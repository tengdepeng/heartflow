<template>
  <div class="hallway">
    <!-- 氛围背景 -->
    <div class="hallway-atmos">
      <div class="atmos-warm-glow"></div>
      <div class="atmos-corridor-light"></div>
      <div class="atmos-floor-lamp"></div>
    </div>

    <!-- 走廊顶部装饰 -->
    <header class="hallway-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-lamp">◈</span>
        <span class="orn-line"></span>
      </div>
      <h1 class="hallway-title">走廊</h1>
      <p class="hallway-subtitle">深夜食堂 · 九间暖室</p>
    </header>

    <!-- 房间走廊网格 -->
    <div class="hallway-corridor">
      <div class="corridor-runner"></div>
      <div
        v-for="room in rooms"
        :key="room.id"
        class="room-door"
        :class="{ 'room-door--active': room.id === currentRoomId }"
        :style="{ '--door-index': rooms.indexOf(room) }"
        role="button"
        tabindex="0"
        :aria-label="`进入${room.name}`"
        @click="emit('navigate', room.id)"
        @keydown.enter="emit('navigate', room.id)"
        @keydown.space.prevent="emit('navigate', room.id)"
      >
        <div class="door-frame">
          <div class="door-panel">
            <div class="door-peephole"></div>
            <div class="door-handle"></div>
          </div>
          <div class="door-glow" :class="{ 'door-glow--lit': room.id === currentRoomId }"></div>
        </div>
        <div class="door-icon-wrapper">
          <span class="door-icon">{{ room.icon }}</span>
        </div>
        <div class="door-label">{{ room.name }}</div>
        <div
          v-if="roomNotesToday(room.id) > 0"
          class="door-activity"
          :title="`今日记录 ${roomNotesToday(room.id)} 条`"
        >{{ roomNotesToday(room.id) }}</div>
        <div v-if="room.id === currentRoomId" class="door-current-badge">当前</div>
      </div>
    </div>

    <!-- 底部提示 -->
    <footer class="hallway-footer">
      <span class="footer-hint">轻触门扉 · 步入心流</span>
      <div class="footer-amber-line"></div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRoomActivity } from '../../modules/home/useRoomActivity'
defineProps<{
  currentRoomId: string
  rooms: { id: string; name: string; icon: string }[]
}>()

const { roomNotesToday } = useRoomActivity()

const emit = defineEmits<{
  (e: 'navigate', roomId: string): void
}>()
</script>

<style scoped>
/* ============================================================
   走廊 · 深夜食堂暖琥珀主题
   深色背景 + 暖琥珀强调色 var(--amber-50) (2700K)
   ============================================================ */

/* ---- 布局 ---- */
.hallway {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 48px 32px 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: transparent;
  color: var(--text-primary);
  overflow: hidden;
  font-family: var(--font-body-zh);
}

/* ---- 氛围背景 ---- */
.hallway-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.atmos-warm-glow {
  position: absolute;
  top: -5%;
  left: 0;
  width: 100%;
  height: 60%;
  background: radial-gradient(
    ellipse at 50% 20%,
    rgba(252, 228, 179, 0.08) 0%,
    rgba(var(--accent-rgb), 0.04) 30%,
    transparent 65%
  );
  animation: hallway-breathe 8s ease-in-out infinite;
}

.atmos-corridor-light {
  position: absolute;
  bottom: -10%;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(252, 228, 179, 0.04) 0%,
    transparent 55%
  );
  animation: hallway-breathe 10s ease-in-out infinite 2s;
}

.atmos-floor-lamp {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(252, 228, 179, 0.015) 50%,
    rgba(252, 228, 179, 0.025) 100%
  );
}

@keyframes hallway-breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ---- 头部 ---- */
.hallway-header {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 40px;
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
  width: 64px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.25),
    transparent
  );
}

.orn-lamp {
  font-size: 12px;
  color: var(--amber-50);
  opacity: 0.5;
  animation: lamp-flicker 3s ease-in-out infinite;
}

@keyframes lamp-flicker {
  0%, 100% { opacity: 0.4; }
  25% { opacity: 0.7; }
  50% { opacity: 0.3; }
  75% { opacity: 0.6; }
}

.hallway-title {
  font-size: 28px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 4px;
  color: var(--text-high);
  margin: 0 0 8px;
}

.hallway-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  letter-spacing: 1.5px;
}

/* ---- 走廊网格 ---- */
.hallway-corridor {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 720px;
  width: 100%;
  padding: 0 12px;
}

.corridor-runner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 85%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(252, 228, 179, 0.06) 15%,
    rgba(252, 228, 179, 0.08) 50%,
    rgba(252, 228, 179, 0.06) 85%,
    transparent 100%
  );
  pointer-events: none;
}

/* ---- 房间门 ---- */
.room-door {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.35s ease;
  padding: 20px 12px 16px;
  border-radius: 18px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  position: relative;
  animation: door-appear 0.5s ease-out both;
  animation-delay: calc(var(--door-index, 0) * 0.06s);
}

@keyframes door-appear {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.room-door:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.15);
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(252, 228, 179, 0.03);
}

.room-door:active {
  transform: translateY(-1px);
}

/* 当前房间高亮 */
.room-door--active {
  background: rgba(55, 48, 40, 0.6);
  border-color: rgba(252, 228, 179, 0.18);
  box-shadow:
    0 0 24px rgba(252, 228, 179, 0.06),
    0 0 48px rgba(252, 228, 179, 0.03),
    inset 0 0 24px rgba(252, 228, 179, 0.03);
}

.room-door--active:hover {
  border-color: rgba(252, 228, 179, 0.25);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 0 24px rgba(252, 228, 179, 0.08),
    0 0 48px rgba(252, 228, 179, 0.04);
}

/* ---- 门扉装饰 ---- */
.door-frame {
  position: relative;
  width: 48px;
  height: 64px;
  margin-bottom: 4px;
}

.door-panel {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(
    180deg,
    rgba(60, 52, 44, 0.8) 0%,
    rgba(50, 43, 36, 0.8) 100%
  );
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  position: relative;
  transition: all 0.35s ease;
}

.room-door:hover .door-panel {
  border-color: rgba(252, 228, 179, 0.2);
  background: linear-gradient(
    180deg,
    rgba(70, 60, 50, 0.8) 0%,
    rgba(55, 48, 40, 0.8) 100%
  );
}

.room-door--active .door-panel {
  border-color: rgba(252, 228, 179, 0.2);
  background: linear-gradient(
    180deg,
    rgba(70, 60, 50, 0.8) 0%,
    rgba(55, 48, 40, 0.8) 100%
  );
}

.door-peephole {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(252, 228, 179, 0.15), rgba(252, 228, 179, 0.05));
  border: 1px solid rgba(var(--accent-rgb), 0.15);
}

.door-handle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.25);
  transition: background 0.3s ease;
}

.room-door:hover .door-handle {
  background: rgba(252, 228, 179, 0.4);
}

/* 门缝光 */
.door-glow {
  position: absolute;
  inset: -1px;
  border-radius: 7px;
  opacity: 0;
  transition: opacity 0.5s ease;
  background: rgba(252, 228, 179, 0.04);
  box-shadow: 0 0 12px rgba(252, 228, 179, 0.04);
  pointer-events: none;
}

.door-glow--lit {
  opacity: 1;
  background: rgba(252, 228, 179, 0.06);
  box-shadow: 0 0 16px rgba(252, 228, 179, 0.06);
  animation: door-glow-pulse 3s ease-in-out infinite;
}

@keyframes door-glow-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ---- 房间图标 ---- */
.door-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  transition: all 0.35s ease;
}

.room-door:hover .door-icon-wrapper {
  background: rgba(252, 228, 179, 0.04);
  border-color: rgba(252, 228, 179, 0.1);
}

.room-door--active .door-icon-wrapper {
  background: rgba(252, 228, 179, 0.06);
  border-color: rgba(252, 228, 179, 0.12);
  box-shadow: 0 0 16px rgba(252, 228, 179, 0.04);
}

.door-icon {
  font-size: 22px;
  line-height: 1;
  transition: transform 0.3s ease;
}

.room-door:hover .door-icon {
  transform: scale(1.1);
}

/* ---- 房间名称 ---- */
.door-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
}

.room-door:hover .door-label {
  color: var(--text-bright);
}

.room-door--active .door-label {
  color: var(--amber-50);
}

/* ---- 当前房间标记 ---- */
.door-current-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 9px;
  font-weight: 500;
  color: var(--amber-50);
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(252, 228, 179, 0.1);
  border: 1px solid rgba(252, 228, 179, 0.12);
  letter-spacing: 0.5px;
  line-height: 1.6;
}

.room-door:focus-visible {
  outline: 2px solid var(--amber-50);
  outline-offset: 2px;
}

/* ---- R6：房间门今日活跃度徽标 ---- */
.door-activity {
  position: absolute;
  bottom: 6px;
  right: 6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(252, 228, 179, 0.16);
  border: 1px solid rgba(252, 228, 179, 0.22);
  color: var(--amber-50);
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 0 10px rgba(252, 228, 179, 0.18);
}

/* ---- 底部 ---- */
.hallway-footer {
  position: relative;
  z-index: 1;
  margin-top: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.footer-hint {
  font-size: 12px;
  color: var(--text-faint);
  letter-spacing: 2px;
}

.footer-amber-line {
  width: 120px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(252, 228, 179, 0.15),
    transparent
  );
}

/* ---- 响应式 ---- */
@media (max-width: 768px) {
  .hallway {
    padding: 36px 20px 100px;
  }

  .hallway-corridor {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    max-width: 540px;
  }

  .room-door {
    padding: 16px 8px 12px;
    border-radius: 14px;
  }

  .door-frame {
    width: 40px;
    height: 54px;
  }

  .door-peephole {
    top: 10px;
    width: 7px;
    height: 7px;
  }

  .door-handle {
    right: 6px;
    width: 3px;
    height: 12px;
  }

  .door-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .door-icon {
    font-size: 18px;
  }

  .door-label {
    font-size: 12px;
  }

  .hallway-title {
    font-size: 24px;
  }

  .hallway-header {
    margin-bottom: 32px;
  }

  .hallway-footer {
    margin-top: 36px;
  }
}

@media (max-width: 480px) {
  .hallway {
    padding: 24px 12px 96px;
  }

  .hallway-corridor {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .room-door {
    padding: 12px 6px 10px;
    border-radius: 12px;
    gap: 8px;
  }

  .door-frame {
    width: 36px;
    height: 48px;
  }

  .door-peephole {
    top: 8px;
    width: 6px;
    height: 6px;
  }

  .door-handle {
    right: 5px;
    width: 3px;
    height: 10px;
  }

  .door-icon-wrapper {
    width: 32px;
    height: 32px;
  }

  .door-icon {
    font-size: 16px;
  }

  .door-label {
    font-size: 10px;
  }

  .door-current-badge {
    font-size: 8px;
    padding: 1px 6px;
    top: 4px;
    right: 4px;
  }

  .hallway-title {
    font-size: 20px;
    letter-spacing: 3px;
  }

  .hallway-subtitle {
    font-size: 11px;
  }

  .orn-line {
    width: 40px;
  }

  .hallway-header {
    margin-bottom: 24px;
  }

  .hallway-footer {
    margin-top: 28px;
  }

  .footer-hint {
    font-size: 11px;
  }
}
</style>