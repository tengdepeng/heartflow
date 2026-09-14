<template>
  <section class="hwp">
    <div class="hwp-head">
      <span class="hwp-title">✍️ 手写查字</span>
      <span class="hwp-sub">现代汉语字典 / 中华汉语字典 借鉴 · 本地离线识别</span>
    </div>

    <!-- 画板 -->
    <div class="hwp-board-wrap">
      <canvas
        ref="canvasRef"
        class="hwp-canvas"
        width="560"
        height="200"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
      ></canvas>
      <div class="hwp-board-actions">
        <button class="hwp-btn" @click="undo">撤销</button>
        <button class="hwp-btn" @click="clear">清空</button>
        <button class="hwp-btn hwp-btn-primary" @click="recognize" :disabled="strokes.length === 0">识别</button>
      </div>
    </div>

    <!-- 部首精修 -->
    <div class="hwp-refine">
      <span class="hwp-refine-label">部首精修</span>
      <select v-model="radicalFilter" class="hwp-select">
        <option value="">不限</option>
        <option v-for="g in radicalGroups" :key="g.radical" :value="g.radical">{{ g.radical }}（{{ g.count }}）</option>
      </select>
    </div>

    <!-- 识别结果 -->
    <div v-if="result" class="hwp-result">
      <div class="hwp-result-head">
        <span class="hwp-stroke-num">{{ result.strokeCount }} 画</span>
        <span class="hwp-dirs" v-if="result.directions.length">
          {{ result.directions.map(d => STROKE_DIRECTION_META[d].label).join(' · ') }}
        </span>
      </div>

      <!-- 候选字 -->
      <div v-if="result.candidates.length" class="hwp-grid">
        <button
          v-for="m in result.candidates"
          :key="m.entry.char"
          class="hwp-char"
          :class="{ active: selected?.char === m.entry.char }"
          @click="select(m.entry)"
        >
          <b>{{ m.entry.char }}</b>
          <span>{{ m.entry.pinyin }}</span>
        </button>
      </div>
      <p v-else class="hwp-empty">未找到匹配的字，可调整笔画数或选择部首后重试</p>

      <!-- 洞察 -->
      <ul v-if="result.insights.length" class="hwp-insights">
        <li v-for="(s, i) in result.insights" :key="i">{{ s }}</li>
      </ul>
    </div>

    <!-- 汉字详情 -->
    <div v-if="selected" class="hwp-detail">
      <div class="hwp-detail-head">
        <span class="hwp-detail-char">{{ selected.char }}</span>
        <div class="hwp-detail-basic">
          <span class="hwp-detail-py">{{ selected.pinyin || '—' }}</span>
          <span class="hwp-detail-meta">
            部首 {{ selected.radical }} · {{ selected.radicalStrokes }}画 · 总 {{ selected.strokes }}画
          </span>
          <span v-if="selected.structure" class="hwp-detail-st">{{ selected.structure }}</span>
        </div>
      </div>
      <p v-if="selected.meaning" class="hwp-detail-meaning">{{ selected.meaning }}</p>
      <div v-if="selected.words && selected.words.length" class="hwp-detail-words">
        <span v-for="w in selected.words" :key="w" class="hwp-word">{{ w }}</span>
      </div>
      <button v-if="collectable" class="hwp-collect" @click="emitCollect(selected)">＋ 收录到殿堂词库</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { loadHanziAll, listRadicals } from '../modules/hanzi'
import type { HanziEntry } from '../modules/hanzi'
import {
  recognizeHandwriting,
  STROKE_DIRECTION_META,
} from '../modules/hanzi'
import type { HandwritingInput, HandwritingPoint, HandwritingResult } from '../modules/hanzi'

const props = defineProps<{
  /** 传入完整字库（缺省用内置字库） */
  library?: HanziEntry[]
  /** 是否允许「收录到殿堂词库」 */
  collectable?: boolean
}>()

const emit = defineEmits<{ (e: 'collect', entry: HanziEntry): void }>()

const library = computed(() => props.library || loadHanziAll())

const canvasRef = ref<HTMLCanvasElement>()
const strokes = ref<HandwritingInput>([])
const drawing = ref(false)
const currentStroke = ref<HandwritingPoint[]>([])
const result = ref<HandwritingResult | null>(null)
const selected = ref<HanziEntry | null>(null)
const radicalFilter = ref('')

const radicalGroups = computed(() => listRadicals(library.value).slice(0, 48))

function getPos(e: PointerEvent): HandwritingPoint {
  const rect = canvasRef.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function drawSegment(a: HandwritingPoint, b: HandwritingPoint) {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  ctx.strokeStyle = 'rgba(232, 230, 216, 0.92)'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}

function redraw() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const stroke of strokes.value) {
    for (let i = 1; i < stroke.length; i++) {
      drawSegment(stroke[i - 1], stroke[i])
    }
  }
}

function onPointerDown(e: PointerEvent) {
  if (!canvasRef.value) return
  drawing.value = true
  canvasRef.value.setPointerCapture(e.pointerId)
  const p = getPos(e)
  currentStroke.value = [p]
  strokes.value.push(currentStroke.value)
  drawSegment(p, p)
}

function onPointerMove(e: PointerEvent) {
  if (!drawing.value) return
  const p = getPos(e)
  const prev = currentStroke.value[currentStroke.value.length - 1]
  currentStroke.value.push(p)
  drawSegment(prev, p)
}

function onPointerUp() {
  if (!drawing.value) return
  drawing.value = false
  currentStroke.value = []
}

function undo() {
  strokes.value = strokes.value.slice(0, -1)
  redraw()
  result.value = null
  selected.value = null
}

function clear() {
  strokes.value = []
  redraw()
  result.value = null
  selected.value = null
}

function recognize() {
  if (strokes.value.length === 0) return
  result.value = recognizeHandwriting(strokes.value, library.value, {
    radical: radicalFilter.value || undefined,
  })
  selected.value = null
}

function select(e: HanziEntry) {
  selected.value = e
}

function emitCollect(e: HanziEntry) {
  emit('collect', e)
}

onMounted(() => {
  redraw()
})
</script>

<style scoped>
.hwp {
  margin-bottom: 24px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: var(--bg-card);
}
.hwp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.hwp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-high);
}
.hwp-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

/* 画板 */
.hwp-board-wrap {
  border-radius: 12px;
  border: 1px dashed rgba(var(--accent-rgb), 0.18);
  background: rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.hwp-canvas {
  display: block;
  width: 100%;
  height: 200px;
  touch-action: none;
  cursor: crosshair;
}
.hwp-board-actions {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.08);
  justify-content: flex-end;
}
.hwp-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.hwp-btn:hover:not(:disabled) {
  border-color: rgba(var(--accent-rgb), 0.35);
  color: var(--accent);
}
.hwp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.hwp-btn-primary {
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
}
.hwp-btn-primary:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.22);
}

/* 部首精修 */
.hwp-refine {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}
.hwp-refine-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.hwp-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}

/* 识别结果 */
.hwp-result {
  margin-top: 4px;
}
.hwp-result-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.hwp-stroke-num {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
}
.hwp-dirs {
  font-size: 12px;
  color: var(--text-secondary);
}
.hwp-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hwp-char {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 52px;
  padding: 8px 4px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--accent-rgb), 0.04);
  color: var(--text-high);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.hwp-char b {
  font-size: 22px;
  font-weight: 500;
}
.hwp-char span {
  font-size: 10px;
  color: var(--text-secondary);
}
.hwp-char:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
}
.hwp-char.active {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.18);
}
.hwp-empty {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.25);
  padding: 12px 0;
}
.hwp-insights {
  margin: 12px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.8;
}

/* 详情 */
.hwp-detail {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--accent-rgb), 0.05);
}
.hwp-detail-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.hwp-detail-char {
  font-size: 40px;
  color: var(--text-high);
}
.hwp-detail-basic {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.hwp-detail-py {
  font-size: 15px;
  color: var(--accent);
}
.hwp-detail-meta {
  font-size: 11px;
  color: var(--text-secondary);
}
.hwp-detail-st {
  display: inline-block;
  width: fit-content;
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}
.hwp-detail-meaning {
  font-size: 13px;
  color: var(--text-high);
  line-height: 1.6;
  margin: 10px 0 8px;
}
.hwp-detail-words {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.hwp-word {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}
.hwp-collect {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.hwp-collect:hover {
  background: rgba(var(--accent-rgb), 0.2);
}
</style>
