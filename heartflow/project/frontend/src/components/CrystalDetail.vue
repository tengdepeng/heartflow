<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="crystal" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-card" :style="{ borderColor: crystal.color + '44' }">
          <!-- 结晶展示区 -->
          <div class="crystal-display">
            <div class="crystal-icon" :style="{ color: crystal.color }">
              <svg viewBox="0 0 48 48" width="80" height="80">
                <polygon
                  :points="shapePoints"
                  fill="none"
                  :stroke="crystal.color"
                  stroke-width="1.5"
                  opacity="0.9"
                />
                <polygon
                  :points="shapePoints"
                  :fill="crystal.color + '22'"
                  :stroke="crystal.color"
                  stroke-width="0.5"
                  opacity="0.6"
                />
                <circle
                  v-for="i in 5" :key="i"
                  :cx="glowCx(i)" :cy="glowCy(i)" :r="glowR(i)"
                  :fill="crystal.color"
                  :opacity="glowOpacity(i)"
                  class="glow-particle"
                />
              </svg>
            </div>
            <div class="crystal-intensity">
              <div class="intensity-bar">
                <div class="intensity-fill" :style="{ width: `${crystal.intensity * 100}%`, background: crystal.color }"></div>
              </div>
              <span class="intensity-label">{{ Math.round(crystal.intensity * 100) }}% 纯度</span>
            </div>
          </div>

          <!-- 结晶信息 -->
          <div class="crystal-info">
            <div class="info-row">
              <span class="info-label">形状</span>
              <span class="info-value">{{ shapeLabel }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">生成时间</span>
              <span class="info-value">{{ formatCreatedAt }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">专注时长</span>
              <span class="info-value">{{ sessionDuration }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">专注状态</span>
              <span class="info-value" :class="sessionStatusClass">{{ sessionStatusLabel }}</span>
            </div>
            <div v-if="crystal.tags.length" class="info-row tags-row">
              <span class="info-label">标签</span>
              <span class="tags-list">
                <span v-for="tag in crystal.tags" :key="tag" class="tag" :style="{ borderColor: crystal.color + '44', color: crystal.color }">
                  {{ tag }}
                </span>
              </span>
            </div>
          </div>

          <!-- 感悟 -->
          <div v-if="crystal.insight" class="crystal-insight">
            <div class="insight-text">"{{ crystal.insight }}"</div>
          </div>

          <!-- 关闭按钮 -->
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TimeCrystal, FocusSession } from '../types'
import { formatDate, formatDuration } from '../utils/time'

const props = defineProps<{
  crystal: TimeCrystal | null
  session: FocusSession | null
}>()

defineEmits<{ close: [] }>()

const crystal = computed(() => props.crystal)
const session = computed(() => props.session)

/** 生成结晶 SVG 多边形点 */
const shapePoints = computed(() => {
  if (!crystal.value) return '24,4 44,24 24,44 4,24'
  switch (crystal.value.shape) {
    case 'sphere':
      return '24,6 40,18 36,38 12,38 8,18'
    case 'tetrahedron':
      return '24,4 44,36 4,36'
    case 'octahedron':
      return '24,4 44,24 24,44 4,24'
    case 'dodecahedron':
      return '24,2 42,14 38,36 10,36 6,14'
    case 'irregular':
      return '24,4 38,12 44,28 32,44 16,40 6,28 8,12'
    default:
      return '24,4 44,24 24,44 4,24'
  }
})

const shapeLabel = computed(() => {
  const map: Record<string, string> = {
    sphere: '灵球',
    tetrahedron: '四面体',
    octahedron: '八面体',
    dodecahedron: '十二面体',
    irregular: '异形',
  }
  return map[crystal.value?.shape ?? ''] ?? crystal.value?.shape ?? '--'
})

const formatCreatedAt = computed(() => {
  if (!crystal.value?.createdAt) return '--'
  return formatDate(crystal.value.createdAt, 'full')
})

const sessionDuration = computed(() => {
  if (!session.value) return '--'
  return formatDuration(Math.floor(session.value.elapsed / 1000))
})

const sessionStatusLabel = computed(() => {
  if (!session.value) return '--'
  const map: Record<string, string> = {
    completed: '完成',
    interrupted: '中断',
    focusing: '进行中',
  }
  return map[session.value.status] ?? session.value.status
})

const sessionStatusClass = computed(() => {
  return session.value?.status ?? ''
})

// 辉光粒子位置
function glowCx(i: number): number {
  return [24, 16, 32, 20, 28][i - 1] ?? 24
}
function glowCy(i: number): number {
  return [8, 28, 12, 36, 40][i - 1] ?? 24
}
function glowR(i: number): number {
  return [2, 1.5, 2.5, 1, 1.8][i - 1] ?? 2
}
function glowOpacity(i: number): number {
  return [0.6, 0.4, 0.7, 0.3, 0.5][i - 1] ?? 0.5
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  position: relative;
  width: 380px;
  max-width: 90vw;
  background: var(--bg-surface, rgba(255,255,255,0.06));
  border: 1px solid var(--border, rgba(255,255,255,0.12));
  border-radius: 24px;
  padding: 32px;
  max-height: 86vh;
  overflow-y: auto;
  backdrop-filter: blur(24px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

/* 结晶展示区 */
.crystal-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.crystal-icon {
  margin-bottom: 12px;
  filter: drop-shadow(0 0 20px currentColor);
}

.glow-particle {
  animation: float 3s ease-in-out infinite;
}
.glow-particle:nth-child(2) { animation-delay: 0.5s; }
.glow-particle:nth-child(3) { animation-delay: 1s; }
.glow-particle:nth-child(4) { animation-delay: 1.5s; }
.glow-particle:nth-child(5) { animation-delay: 2s; }

@keyframes float {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 0.8; transform: translateY(-3px); }
}

.intensity-bar {
  width: 160px;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}

.intensity-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

.intensity-label {
  font-size: 12px;
  opacity: 0.5;
  margin-top: 4px;
  display: block;
  text-align: center;
}

/* 信息区 */
.crystal-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 14px;
}

.info-label {
  opacity: 0.4;
  flex-shrink: 0;
}

.info-value {
  text-align: right;
}

.tags-row {
  flex-direction: column;
  gap: 4px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid;
  font-size: 12px;
  opacity: 0.8;
}

/* 专注状态颜色 */
.completed { color: #81c784; }
.interrupted { color: #ffb74d; }
.focusing { color: #64b5f6; }

/* 感悟 */
.crystal-insight {
  background: rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
}

.insight-text {
  font-size: 13px;
  font-style: italic;
  line-height: 1.6;
  opacity: 0.8;
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.06);
  color: var(--text-secondary, rgba(255,255,255,0.5));
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255,255,255,0.12);
  color: var(--text-primary, #e0e0e0);
}

/* 弹窗动画 */
.modal-enter-active {
  transition: all 0.3s ease-out;
}
.modal-leave-active {
  transition: all 0.2s ease-in;
}
.modal-enter-from {
  opacity: 0;
}
.modal-enter-from .modal-card {
  transform: scale(0.9) translateY(20px);
}
.modal-leave-to {
  opacity: 0;
}
.modal-leave-to .modal-card {
  transform: scale(0.95) translateY(10px);
}
</style>
