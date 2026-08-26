<template>
  <div class="closet-room">
    <!-- 氛围光 -->
    <div class="ambient-light"></div>

    <!-- 场景装饰：衣帽间轮廓 -->
    <div class="room-decoration">
      <div class="wardrobe-outline">
        <div class="wardrobe-door wardrobe-door--left">
          <span class="door-handle"></span>
        </div>
        <div class="wardrobe-door wardrobe-door--right">
          <span class="door-handle"></span>
        </div>
      </div>
      <div class="shelf-line shelf-line--top"></div>
      <div class="shelf-line shelf-line--bottom"></div>
    </div>

    <!-- 标题 -->
    <div class="room-title">
      <span class="title-text">衣帽间</span>
      <span class="title-sub">记忆在此悬挂</span>
    </div>

    <!-- 记忆藏量（真实数据联动） -->
    <div class="closet-summary">
      <span class="summary-item"><b>{{ noteCount }}</b> 笔记</span>
      <span class="summary-dot">·</span>
      <span class="summary-item"><b>{{ crystalCount }}</b> 结晶</span>
      <span class="summary-dot">·</span>
      <span class="summary-item"><b>{{ memoryCount }}</b> 记忆</span>
    </div>

    <!-- 记忆光点 -->
    <div class="memory-points-container">
      <div
        v-for="(point, index) in memoryPoints"
        :key="point.id"
        class="memory-point"
        :class="{
          'memory-point--active': selectedPoint?.id === point.id,
          'memory-point--note': point.type === 'note',
          'memory-point--crystal': point.type === 'crystal',
        }"
        :style="point.style"
        @click="selectPoint(point)"
      >
        <div class="point-glow"></div>
        <div class="point-core"></div>
        <div class="point-ripple" :style="{ animationDelay: `${index * 0.3 + 2}s` }"></div>
      </div>
    </div>

    <!-- 展开详情 -->
    <Transition name="point-expand">
      <div v-if="selectedPoint" class="point-detail-overlay" @click="selectedPoint = null">
        <div class="point-detail" @click.stop>
          <button class="close-btn" @click="selectedPoint = null" aria-label="关闭">&times;</button>
          <div class="detail-header">
            <span class="detail-type">{{ typeLabel(selectedPoint.type) }}</span>
            <span class="detail-date">{{ formatDate(selectedPoint.createdAt) }}</span>
          </div>
          <h3 class="detail-title">{{ selectedPoint.title }}</h3>
          <p class="detail-content">{{ selectedPoint.content }}</p>
          <div v-if="selectedPoint.tags && selectedPoint.tags.length" class="detail-tags">
            <span v-for="tag in selectedPoint.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 手动记忆表单 -->
    <Transition name="point-expand">
      <div v-if="showMemoryForm" class="memory-form-overlay" @click="showMemoryForm = false">
        <div class="memory-form" @click.stop>
          <button class="close-btn" @click="showMemoryForm = false" aria-label="关闭">&times;</button>
          <h3 class="form-title">悬挂一段记忆</h3>
          <input
            v-model="memoryForm.title"
            class="form-input"
            placeholder="标题（如：那年夏天的风）"
            maxlength="40"
          />
          <textarea
            v-model="memoryForm.content"
            class="form-textarea"
            placeholder="写点什么，让它在衣帽间里发光…"
            rows="4"
          ></textarea>
          <div class="form-actions">
            <button class="form-cancel" @click="showMemoryForm = false">取消</button>
            <button class="form-submit" @click="addMemory">悬挂</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 底部导航 -->
    <div class="room-footer">
      <button class="add-btn" @click="showMemoryForm = true">
        <span class="add-btn-icon">&#10010;</span>
        添加记忆
      </button>
      <button class="nav-btn" @click="emit('navigate', 'bedroom')">
        <span class="nav-btn-icon">&#8594;</span>
        走向卧室
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storage } from '../../engine/storage'

const emit = defineEmits<{
  (e: 'navigate', roomId: string): void
}>()

// ---- 类型 ----

interface MemoryPoint {
  id: string
  type: 'note' | 'crystal' | 'memory'
  title: string
  content: string
  tags: string[]
  createdAt: string
  style: {
    left: string
    top: string
    animationDelay: string
    size: string
  }
  color: string
}

interface ClosetMemory {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
}

// ---- 状态 ----

const memoryPoints = ref<MemoryPoint[]>([])
const selectedPoint = ref<MemoryPoint | null>(null)
const closetMemories = ref<ClosetMemory[]>([])
const showMemoryForm = ref(false)
const memoryForm = ref({ title: '', content: '' })

// ---- 记忆藏量（真实数据联动）----
const noteCount = computed(
  () => storage.getNotes().filter((n) => !n.archived && !n.deletedAt).length,
)
const crystalCount = computed(() => storage.getCrystals().length)
const memoryCount = computed(
  () => storage.getKV<ClosetMemory[]>('hf:home:closet:memories', []).length,
)

// ---- 工具 ----

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// ---- 加载数据 ----

onMounted(() => {
  const points: MemoryPoint[] = []

  // 加载笔记
  const notes = storage.getNotes()
  for (const note of notes) {
    if (note.archived || note.deletedAt) continue
    points.push({
      id: `note-${note.id}`,
      type: 'note',
      title: note.title || '无标题',
      content: note.content,
      tags: note.tags || [],
      createdAt: note.createdAt,
      style: {
        left: `${randomBetween(8, 85)}%`,
        top: `${randomBetween(12, 72)}%`,
        animationDelay: `${randomBetween(0, 4)}s`,
        size: `${randomBetween(6, 14)}px`,
      },
      color: '#d4a574',
    })
  }

  // 加载结晶
  const crystals = storage.getCrystals()
  for (const crystal of crystals) {
    points.push({
      id: `crystal-${crystal.id}`,
      type: 'crystal',
      title: `时间结晶 · ${crystal.shape}`,
      content: crystal.insight || '一段专注的时光凝聚而成',
      tags: crystal.tags || [],
      createdAt: crystal.createdAt,
      style: {
        left: `${randomBetween(8, 85)}%`,
        top: `${randomBetween(12, 72)}%`,
        animationDelay: `${randomBetween(0, 4)}s`,
        size: `${randomBetween(8, 16)}px`,
      },
      color: crystal.color || '#5ab8a0',
    })
  }

  // 加载衣帽间手动记忆
  closetMemories.value = storage.getKV<ClosetMemory[]>('hf:home:closet:memories', [])
  for (const mem of closetMemories.value) {
    points.push({
      id: `mem-${mem.id}`,
      type: 'memory',
      title: mem.title,
      content: mem.content,
      tags: mem.tags,
      createdAt: mem.createdAt,
      style: {
        left: `${randomBetween(8, 85)}%`,
        top: `${randomBetween(12, 72)}%`,
        animationDelay: `${randomBetween(0, 4)}s`,
        size: `${randomBetween(6, 14)}px`,
      },
      color: '#e8c078',
    })
  }

  memoryPoints.value = points
})

// ---- 交互 ----

function selectPoint(point: MemoryPoint) {
  selectedPoint.value = point
}

function typeLabel(t: MemoryPoint['type']): string {
  if (t === 'note') return '笔记'
  if (t === 'memory') return '记忆'
  return '时间结晶'
}

function addMemory() {
  const title = memoryForm.value.title.trim()
  const content = memoryForm.value.content.trim()
  if (!title && !content) return
  const now = new Date().toISOString()
  const mem: ClosetMemory = {
    id: `${Date.now()}`,
    title: title || '未命名记忆',
    content,
    tags: ['衣帽间'],
    createdAt: now,
  }
  closetMemories.value = [...closetMemories.value, mem]
  storage.setKV('hf:home:closet:memories', closetMemories.value)
  memoryPoints.value = [
    ...memoryPoints.value,
    {
      id: `mem-${mem.id}`,
      type: 'memory',
      title: mem.title,
      content: mem.content,
      tags: mem.tags,
      createdAt: mem.createdAt,
      style: {
        left: `${randomBetween(8, 85)}%`,
        top: `${randomBetween(12, 72)}%`,
        animationDelay: `${randomBetween(0, 4)}s`,
        size: `${randomBetween(6, 14)}px`,
      },
      color: '#e8c078',
    },
  ]
  memoryForm.value = { title: '', content: '' }
  showMemoryForm.value = false
}
</script>

<style scoped>
/* ============================================================
   衣帽间 · 深夜食堂暖琥珀主题
   ============================================================ */

.closet-room {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 560px;
  background: transparent;
  overflow: hidden;
  font-family: inherit;
}

/* ---- 内部区块入场错位动画 ---- */
.room-title,
.memory-points-container,
.room-footer {
  animation: closet-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.room-title { animation-delay: 0.04s; }
.memory-points-container { animation-delay: 0.16s; }
.room-footer { animation-delay: 0.22s; }

/* 摘要行已用 translateX(-50%) 居中，仅做淡入以免覆盖定位 */
.closet-summary {
  animation: closet-fade 0.6s ease both;
  animation-delay: 0.10s;
}

@keyframes closet-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes closet-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .room-title,
  .closet-summary,
  .memory-points-container,
  .room-footer { animation: none; }
}

/* ---- 氛围光 ---- */

.ambient-light {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 30%,
    rgba(var(--text-primary-rgb), 0.04) 0%,
    transparent 60%
  );
}

/* ---- 场景装饰 ---- */

.room-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.wardrobe-outline {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 280px;
  height: 340px;
  display: flex;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.01);
}

.wardrobe-door {
  flex: 1;
  position: relative;
  border-right: 1px solid rgba(var(--accent-rgb), 0.06);
}

.wardrobe-door:last-child {
  border-right: none;
}

.door-handle {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 40px;
  background: rgba(var(--accent-rgb), 0.12);
  border-radius: 2px;
}

.wardrobe-door:last-child .door-handle {
  right: auto;
  left: 16px;
}

.shelf-line {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.1),
    transparent
  );
}

.shelf-line--top {
  top: 30%;
}

.shelf-line--bottom {
  top: 70%;
}

/* ---- 标题 ---- */

.room-title {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 2;
  pointer-events: none;
}

.title-text {
  display: block;
  font-size: 15px;
  letter-spacing: 4px;
  color: var(--text-primary, #e8e0d8);
  font-weight: 400;
}

.title-sub {
  display: block;
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(var(--text-primary-rgb), 0.25);
  margin-top: 4px;
}

/* ---- 记忆藏量 ---- */
.closet-summary {
  position: absolute;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: rgba(var(--text-primary-rgb), 0.45);
  pointer-events: none;
  white-space: nowrap;
}

.summary-item b {
  color: var(--accent, #d4a574);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.summary-dot {
  opacity: 0.35;
}

/* ---- 记忆光点容器 ---- */

.memory-points-container {
  position: absolute;
  inset: 0;
  z-index: 3;
}

/* ---- 记忆光点 ---- */

.memory-point {
  position: absolute;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.memory-point:hover {
  transform: translate(-50%, -50%) scale(1.4);
  z-index: 10;
}

.memory-point--active {
  transform: translate(-50%, -50%) scale(1.6);
  z-index: 10;
}

.point-core {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--point-color, #d4a574);
  position: relative;
  z-index: 2;
  transition: box-shadow 0.3s ease;
}

.memory-point--note .point-core {
  background: var(--accent);
  box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.5);
}

.memory-point--crystal .point-core {
  background: var(--accent-cyan);
  box-shadow: 0 0 6px rgba(90, 184, 160, 0.5);
}

.memory-point:hover .point-core {
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.7);
}

.memory-point--crystal:hover .point-core {
  box-shadow: 0 0 12px rgba(90, 184, 160, 0.7);
}

.point-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(var(--accent-rgb), 0.15) 0%,
    transparent 70%
  );
  animation: glow-pulse 3s ease-in-out infinite;
  pointer-events: none;
}

.memory-point--crystal .point-glow {
  background: radial-gradient(
    circle,
    rgba(90, 184, 160, 0.15) 0%,
    transparent 70%
  );
}

.point-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  animation: ripple-expand 5s ease-out infinite;
  pointer-events: none;
}

.memory-point--crystal .point-ripple {
  border-color: rgba(90, 184, 160, 0.08);
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.3); }
}

@keyframes ripple-expand {
  0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.8); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(2.5); }
}

/* ---- 详情弹窗 ---- */

.point-detail-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.point-detail {
  width: 320px;
  max-width: 88vw;
  max-height: 70vh;
  overflow-y: auto;
  background: rgba(16, 13, 10, 0.96);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 14px;
  padding: 24px 20px 20px;
  box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.5),
    0 0 24px rgba(var(--accent-rgb), 0.03);
  position: relative;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 14px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
  transition: color 0.2s ease;
  font-family: inherit;
}

.close-btn:hover {
  color: var(--text-bright);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.detail-type {
  font-size: 10px;
  letter-spacing: 1px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.detail-date {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.detail-title {
  font-size: 15px;
  font-weight: 400;
  color: var(--text-primary, #e8e0d8);
  margin: 0 0 10px;
  line-height: 1.4;
  letter-spacing: 1px;
}

.detail-content {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.6);
  margin: 0 0 14px;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 9px;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--accent-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

/* ---- 弹窗动画 ---- */

.point-expand-enter-active {
  transition: all 0.3s ease-out;
}
.point-expand-leave-active {
  transition: all 0.2s ease-in;
}
.point-expand-enter-from {
  opacity: 0;
}
.point-expand-enter-from .point-detail {
  transform: scale(0.92) translateY(8px);
}
.point-expand-leave-to {
  opacity: 0;
}
.point-expand-leave-to .point-detail {
  transform: scale(0.96);
}

.point-detail {
  transition: transform 0.3s ease-out;
}

/* ---- 底部导航 ---- */

.room-footer {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  gap: 10px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 999px;
  background: rgba(13, 11, 9, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.add-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.35);
  color: var(--text-primary, #e8e0d8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 16px rgba(var(--accent-rgb), 0.06);
  transform: translateY(-1px);
}

.add-btn-icon {
  font-size: 14px;
  opacity: 0.7;
  transition: transform 0.3s ease;
}

.add-btn:hover .add-btn-icon {
  transform: rotate(90deg);
  opacity: 1;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 999px;
  background: rgba(13, 11, 9, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--text-medium);
  font-size: 12px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.nav-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--text-primary, #e8e0d8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 16px rgba(var(--accent-rgb), 0.03);
  transform: translateY(-1px);
}

.nav-btn-icon {
  font-size: 14px;
  opacity: 0.5;
  transition: transform 0.3s ease;
}

.nav-btn:hover .nav-btn-icon {
  transform: translateX(3px);
  opacity: 0.8;
}

/* ---- 手动记忆表单 ---- */

.memory-form-overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.memory-form {
  width: 320px;
  max-width: 88vw;
  background: rgba(16, 13, 10, 0.97);
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  border-radius: 14px;
  padding: 24px 20px 20px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  position: relative;
}

.form-title {
  font-size: 15px;
  font-weight: 400;
  color: var(--text-primary, #e8e0d8);
  margin: 0 0 16px;
  letter-spacing: 1px;
  text-align: center;
}

.form-input,
.form-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--accent-rgb), 0.04);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 13px;
  font-family: inherit;
  margin-bottom: 12px;
  resize: none;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.3);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: rgba(var(--text-primary-rgb), 0.25);
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.form-cancel,
.form-submit {
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-cancel {
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-medium);
}

.form-cancel:hover {
  color: var(--text-primary, #e8e0d8);
}

.form-submit {
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}

.form-submit:hover {
  background: rgba(var(--accent-rgb), 0.18);
}

/* ---- 无数据提示 ---- */

.memory-points-container:empty::after {
  content: '暂无记忆光点，开始专注或记录笔记吧';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  letter-spacing: 1px;
  color: rgba(var(--text-primary-rgb), 0.15);
  pointer-events: none;
}

/* ---- 响应式 ---- */

@media (max-width: 640px) {
  .wardrobe-outline {
    width: 200px;
    height: 260px;
  }

  .shelf-line {
    width: 120px;
  }

  .room-title {
    top: 12px;
  }

  .title-text {
    font-size: 13px;
  }

  .point-detail {
    width: 280px;
    padding: 20px 16px 16px;
  }
}
</style>