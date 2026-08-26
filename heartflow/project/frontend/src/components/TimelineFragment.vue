<template>
  <div class="fragment" :class="`frag-${type}`" @click="$emit('click')">
    <!-- 左侧时间线 -->
    <div class="frag-line">
      <div class="frag-dot" :style="{ background: dotColor }" />
      <div class="frag-connector" />
    </div>

    <!-- 内容 -->
    <div class="frag-body">
      <!-- 专注结晶 -->
      <template v-if="type === 'crystal'">
        <div class="frag-icon-wrap crystal-icon">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <polygon :points="shapePoly" :fill="crystal?.color + '33'" :stroke="crystal?.color" stroke-width="1" />
          </svg>
        </div>
        <div class="frag-main">
          <span class="frag-title">专注结晶 · {{ intensityLabel }}</span>
          <span class="frag-meta">{{ formatTimeShort(crystal?.createdAt) }} · {{ durationText }}</span>
        </div>
      </template>

      <!-- 笔记 -->
      <template v-else-if="type === 'note'">
        <div class="frag-icon-wrap note-icon">📝</div>
        <div class="frag-main">
          <span class="frag-title">{{ note?.title || '未命名笔记' }}</span>
          <span class="frag-meta">{{ formatTimeShort(note?.updatedAt || note?.createdAt) }}
            <span v-if="note?.tags?.length" class="frag-tags">
              <span v-for="t in note.tags.slice(0, 2)" :key="t" class="frag-tag">{{ t }}</span>
            </span>
          </span>
          <span v-if="note?.content" class="frag-excerpt">{{ note.content.slice(0, 60) }}{{ note.content.length > 60 ? '…' : '' }}</span>
        </div>
      </template>

      <!-- 情绪标记 -->
      <template v-else-if="type === 'emotion'">
        <div class="frag-icon-wrap emotion-icon">{{ emotionIcon }}</div>
        <div class="frag-main">
          <span class="frag-title">{{ emotionLabel }}</span>
          <span class="frag-meta">{{ formatTimeShort(emotion?.createdAt) }}</span>
          <span v-if="emotion?.note" class="frag-excerpt">{{ emotion.note }}</span>
        </div>
      </template>

      <!-- 专注记录 -->
      <template v-else-if="type === 'session'">
        <div class="frag-icon-wrap session-icon" :class="session?.status">
          {{ session?.status === 'completed' ? '✅' : '⏸' }}
        </div>
        <div class="frag-main">
          <span class="frag-title">{{ session?.mode === 'focus' ? '专注' : session?.mode === 'nap' ? '小憩' : '自由' }} · {{ formatDuration(Math.floor((session?.elapsed || 0) / 1000)) }}</span>
          <span class="frag-meta">{{ formatTimeShort(session?.completedAt || session?.startedAt) }}
            <span v-if="session?.tags?.length" class="frag-tags">
              <span v-for="t in session.tags.slice(0, 2)" :key="t" class="frag-tag">{{ t }}</span>
            </span>
          </span>
          <span v-if="session?.note" class="frag-excerpt">{{ session.note }}</span>
        </div>
      </template>

      <!-- 锚点 -->
      <template v-else-if="type === 'anchor'">
        <div class="frag-icon-wrap anchor-icon" :class="{ done: anchor?.done }">
          {{ anchor?.done ? '⚓' : '⊙' }}
        </div>
        <div class="frag-main">
          <span class="frag-title" :class="{ 'text-done': anchor?.done }">{{ anchor?.text }}</span>
          <span class="frag-meta">{{ formatTimeShort(anchor?.createdAt) }}
            <span v-if="anchor?.category" class="frag-category">@{{ anchor.category }}</span>
            <span v-if="anchor?.tags?.length" class="frag-tags">
              <span v-for="t in anchor.tags.slice(0, 2)" :key="t" class="frag-tag">{{ t }}</span>
            </span>
            <span v-if="anchor?.done" class="done-mark">已锚定</span>
            <span v-else class="pending-mark">停留中</span>
          </span>
        </div>
      </template>

      <!-- 身体三环 -->
      <template v-else-if="type === 'body'">
        <div class="frag-icon-wrap body-icon">🌿</div>
        <div class="frag-main">
          <span class="frag-title">身体三环 · 今日状态</span>
          <span class="frag-meta">{{ body?.date }}
            <span v-if="body" class="frag-body-stats">活动 {{ body.activityMinutes }} 分 · 休息 {{ body.restMinutes }} 分 · 感受 {{ TIER_LABELS[body.feeling ?? 0] }}</span>
          </span>
        </div>
      </template>

      <!-- 习惯打卡 -->
      <template v-else-if="type === 'habit'">
        <div class="frag-icon-wrap habit-icon">🎯</div>
        <div class="frag-main">
          <span class="frag-title">{{ habit?.icon || '🎯' }} {{ habit?.title || '习惯打卡' }}</span>
          <span class="frag-meta">完成打卡
            <span class="frag-difficulty" :style="{ color: difficultyColor }">@{{ difficultyLabel }}</span>
            <span class="frag-streak">连续 {{ habit?.streak ?? 0 }} 天 · 累计 {{ habit?.totalCompleted ?? 0 }} 次</span>
          </span>
        </div>
      </template>

      <!-- 运动记录 -->
      <template v-else-if="type === 'movement'">
        <div class="frag-icon-wrap movement-icon">{{ movementIcon }}</div>
        <div class="frag-main">
          <span class="frag-title">{{ movementLabel }} · {{ movement?.duration }} 分钟</span>
          <span class="frag-meta">
            <span class="frag-intensity" :style="{ color: dotColor }">@{{ movementIntensityLabel }}</span>
            <span v-if="movement?.calories">消耗 {{ movement.calories }} 千卡</span>
            <span v-if="movement?.distance">· {{ movement.distance }} 公里</span>
          </span>
        </div>
      </template>

      <!-- 休息记录 -->
      <template v-else-if="type === 'rest'">
        <div class="frag-icon-wrap rest-icon">🍃</div>
        <div class="frag-main">
          <span class="frag-title">{{ rest?.activity || '休息' }} · {{ rest?.duration }} 分钟</span>
          <span class="frag-meta">{{ formatTimeShort(rest?.date ? `${rest.date}T12:00:00` : null) }} · 心情 {{ restMoodLabel }}</span>
        </div>
      </template>

      <!-- 镜我对话 -->
      <template v-else-if="type === 'dialogue'">
        <div class="frag-icon-wrap dialogue-icon">💬</div>
        <div class="frag-main">
          <span class="frag-title">{{ dialogue?.title || '镜我对话' }}</span>
          <span class="frag-meta">{{ formatTimeShort(dialogue?.createdAt) }} · {{ dialogueRoundCount }} 轮对话
            <span v-if="dialogue?.primaryIntents?.length" class="frag-tags">
              <span v-for="t in dialogue.primaryIntents.slice(0, 2)" :key="t" class="frag-tag">{{ t }}</span>
            </span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TimeCrystal, FocusSession, Note } from '../types'
import type { EmotionRecord, EmotionType } from '../modules/emotion/types'
import type { Anchor } from '../modules/anchor/types'
import { EMOTION_FLOWERS } from '../modules/emotion/types'
import { TIER_LABELS, type DailyRingLog } from '../modules/body/rings'
import { HABIT_DIFFICULTY_META, type Habit } from '../modules/discipline'
import { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META, type MovementRecord } from '../modules/movement'
import type { BreakRecord } from '../modules/rest'
import type { DialogueSession } from '../modules/mirror'

const props = defineProps<{
  type: 'crystal' | 'note' | 'emotion' | 'session' | 'anchor' | 'body' | 'habit' | 'movement' | 'rest' | 'dialogue'
  crystal?: TimeCrystal | null
  session?: FocusSession | null
  note?: Note | null
  emotion?: EmotionRecord | null
  anchor?: Anchor | null
  body?: DailyRingLog | null
  habit?: Habit | null
  movement?: MovementRecord | null
  rest?: BreakRecord | null
  dialogue?: DialogueSession | null
}>()

defineEmits<{ click: [] }>()

const dotColor = computed(() => {
  switch (props.type) {
    case 'crystal': return props.crystal?.color ?? '#a07c8c'
    case 'note': return '#6b9fc4'
    case 'emotion': return EMOTION_FLOWERS[(props.emotion?.type ?? 'calm') as EmotionType]?.color ?? '#80b8d0'
    case 'session': return props.session?.status === 'completed' ? '#5ab8a0' : '#f59e0b'
    case 'anchor': return props.anchor?.done ? '#5ab8a0' : '#a07c8c'
    case 'body': return '#7ab87a'
    case 'habit': return HABIT_DIFFICULTY_META[props.habit?.difficulty ?? 'easy'].color
    case 'movement': return MOVEMENT_INTENSITY_META[props.movement?.intensity ?? 'light'].color
    case 'rest': return '#b5707a'
    case 'dialogue': return '#22d3ee'
    default: return '#555'
  }
})

const shapePoly = computed(() => {
  switch (props.crystal?.shape) {
    case 'sphere': return '12,3 20,9 18,19 6,19 4,9'
    case 'tetrahedron': return '12,2 22,18 2,18'
    case 'octahedron': return '12,2 22,12 12,22 2,12'
    case 'dodecahedron': return '12,1 21,7 19,18 5,18 3,7'
    default: return '12,2 19,6 22,14 16,22 8,20 3,14 4,6'
  }
})

const intensityLabel = computed(() => {
  const i = props.crystal?.intensity ?? 0
  if (i >= 0.9) return '完美之晶'
  if (i >= 0.75) return '精雕'
  if (i >= 0.5) return '成色'
  if (i >= 0.25) return '初凝'
  return '残晶'
})

const durationText = computed(() => {
  if (!props.session) return ''
  return formatDuration(Math.floor(props.session.elapsed / 1000))
})

const emotionIcon = computed(() => {
  const map: Record<string, string> = { happy: '☀️', calm: '🌙', sad: '🌧', anxious: '🌪', angry: '⚡' }
  return map[props.emotion?.type ?? 'calm'] ?? '🌙'
})

const emotionLabel = computed(() => {
  const map: Record<string, string> = { happy: '轻快', calm: '平静', sad: '低落', anxious: '紧绷', angry: '烦躁' }
  return map[props.emotion?.type ?? 'calm'] ?? ''
})

const difficultyLabel = computed(() => HABIT_DIFFICULTY_META[props.habit?.difficulty ?? 'easy'].label)
const difficultyColor = computed(() => HABIT_DIFFICULTY_META[props.habit?.difficulty ?? 'easy'].color)

const movementIcon = computed(() => MOVEMENT_TYPE_META[props.movement?.type ?? 'custom'].icon)
const movementLabel = computed(() => MOVEMENT_TYPE_META[props.movement?.type ?? 'custom'].label)
const movementIntensityLabel = computed(() => MOVEMENT_INTENSITY_META[props.movement?.intensity ?? 'light'].label)

const restMoodLabel = computed(() => {
  const map: Record<number, string> = { 1: '疲惫', 2: '一般', 3: '放松', 4: '愉悦', 5: '焕新' }
  return map[props.rest?.mood ?? 3] ?? '放松'
})

const dialogueRoundCount = computed(() => props.dialogue?.entries?.length ?? 0)

function formatDuration(s: number): string {
  if (s < 60) return `${s}秒`
  const m = Math.floor(s / 60)
  return `${m}分钟`
}

function formatTimeShort(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.fragment {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 8px;
  margin: 0 -8px;
  padding-left: 8px;
  padding-right: 8px;
}

.fragment:hover {
  background: var(--bg-surface);
}

/* 时间线装饰 */
.frag-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 16px;
}

.frag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.frag-connector {
  flex: 1;
  width: 1px;
  background: rgba(255,255,255,0.06);
  min-height: 100%;
  margin-top: 4px;
}

.fragment:last-child .frag-connector {
  display: none;
}

/* 正文 */
.frag-body {
  flex: 1;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}

.frag-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  background: rgba(255,255,255,0.04);
}

.frag-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.frag-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.8);
}

.text-done {
  text-decoration: line-through;
  opacity: 0.5;
}

.frag-meta {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.frag-category {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(160, 124, 140, 0.08);
  color: rgba(160, 124, 140, 0.5);
}

.frag-tags {
  display: flex;
  gap: 3px;
}

.frag-tag {
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.06);
  font-size: 10px;
}

.frag-excerpt {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  line-height: 1.4;
  margin-top: 2px;
}

.body-icon { color: #7ab87a; }
.frag-body-stats { color: rgba(122, 184, 122, 0.75); }

.habit-icon { color: #f59e0b; }
.frag-difficulty { font-size: 10px; padding: 1px 5px; border-radius: 3px; background: rgba(255,255,255,0.06); }
.frag-streak { color: rgba(255,255,255,0.3); }

.movement-icon { color: #5ab8a0; }
.frag-intensity { font-size: 10px; padding: 1px 5px; border-radius: 3px; background: rgba(255,255,255,0.06); }
.rest-icon { color: #b5707a; }
.dialogue-icon { color: #22d3ee; }

.done-mark { color: var(--success); }
.pending-mark { color: rgba(255,255,255,0.3); }
.session-icon.completed { color: var(--success); }
.session-icon.interrupted { color: #f59e0b; }
</style>
