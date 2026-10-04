<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWidgetHotzone } from '../modules/widget-hotzone'

const { zones, canAdd, addZone, removeZone, updateZone, moveZone, resizeZone, clearAll, reset } =
  useWidgetHotzone()

const selectedId = ref<string | null>(zones.value[0]?.id ?? null)
const selected = computed(() => zones.value.find((z) => z.id === selectedId.value) ?? null)

function select(id: string) {
  selectedId.value = id
}

function onAdd() {
  const id = addZone()
  if (id) selectedId.value = id
}

function onRemove(id: string) {
  removeZone(id)
  if (selectedId.value === id) selectedId.value = zones.value[0]?.id ?? null
}

function nudge(dx: number, dy: number) {
  if (!selected.value) return
  moveZone(selected.value.id, selected.value.x + dx, selected.value.y + dy)
}

function grow(delta: number) {
  if (!selected.value) return
  resizeZone(selected.value.id, selected.value.w + delta, selected.value.h + delta)
}

function setLabel(e: Event) {
  if (!selected.value) return
  updateZone(selected.value.id, { label: (e.target as HTMLInputElement).value })
}

function setAction(e: Event) {
  if (!selected.value) return
  updateZone(selected.value.id, { action: (e.target as HTMLInputElement).value })
}

let dragging: { id: string; rect: DOMRect } | null = null

function onZoneDown(e: PointerEvent, id: string) {
  select(id)
  const canvas = (e.currentTarget as HTMLElement).closest('.whz-canvas') as HTMLElement | null
  if (!canvas) return
  dragging = { id, rect: canvas.getBoundingClientRect() }
}

function onCanvasMove(e: PointerEvent) {
  if (!dragging) return
  const { rect } = dragging
  if (!rect.width || !rect.height) return
  const z = zones.value.find((v) => v.id === dragging!.id)
  if (!z) return
  const x = ((e.clientX - rect.left) / rect.width) * 100 - z.w / 2
  const y = ((e.clientY - rect.top) / rect.height) * 100 - z.h / 2
  moveZone(dragging.id, x, y)
}

function onCanvasUp() {
  dragging = null
}
</script>

<template>
  <section class="whz-panel">
    <header class="whz-head">
      <span class="whz-kicker">触角 · 组件交互</span>
      <h3 class="whz-title">组件自定义点击热区</h3>
      <p class="whz-sub">在组件上划定可点击区域（拖拽移动 / 方向键微调 / 缩放）</p>
    </header>

    <div
      class="whz-canvas"
      @pointermove="onCanvasMove"
      @pointerup="onCanvasUp"
      @pointerleave="onCanvasUp"
    >
      <div
        v-for="z in zones"
        :key="z.id"
        class="whz-zone"
        :class="{ selected: z.id === selectedId }"
        :style="{ left: z.x + '%', top: z.y + '%', width: z.w + '%', height: z.h + '%' }"
        @pointerdown="onZoneDown($event, z.id)"
      >
        <span class="whz-zone-label">{{ z.label }}</span>
        <span class="whz-zone-action">{{ z.action }}</span>
      </div>
      <div v-if="zones.length === 0" class="whz-empty">尚无热区，点「新增热区」</div>
    </div>

    <div class="whz-toolbar">
      <button class="whz-add" type="button" :disabled="!canAdd" @click="onAdd">新增热区</button>
      <button class="whz-clear" type="button" @click="clearAll">清空</button>
      <button class="whz-reset" type="button" @click="reset">恢复默认</button>
    </div>

    <div v-if="selected" class="whz-editor">
      <label class="whz-field">
        <span class="whz-field-label">名称</span>
        <input class="whz-label-input" :value="selected.label" maxlength="12" @input="setLabel" />
      </label>
      <label class="whz-field">
        <span class="whz-field-label">动作</span>
        <input class="whz-action-input" :value="selected.action" maxlength="20" @input="setAction" />
      </label>
      <div class="whz-nudge">
        <span class="whz-field-label">移动</span>
        <button class="whz-up" type="button" @click="nudge(0, -4)">↑</button>
        <button class="whz-down" type="button" @click="nudge(0, 4)">↓</button>
        <button class="whz-left" type="button" @click="nudge(-4, 0)">←</button>
        <button class="whz-right" type="button" @click="nudge(4, 0)">→</button>
      </div>
      <div class="whz-grow">
        <span class="whz-field-label">尺寸</span>
        <button class="whz-grow-btn" type="button" @click="grow(4)">放大</button>
        <button class="whz-shrink-btn" type="button" @click="grow(-4)">缩小</button>
      </div>
      <button class="whz-del" type="button" @click="onRemove(selected.id)">删除热区</button>
    </div>
  </section>
</template>

<style scoped>
.whz-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.55), rgba(var(--bg-card-rgb), 0.4));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
}

.whz-head { margin-bottom: 14px; }
.whz-kicker { font-size: 12px; letter-spacing: 0.12em; color: rgba(var(--accent-rgb), 0.7); }
.whz-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; }
.whz-sub { margin: 6px 0 0; font-size: 12px; color: rgba(var(--accent-rgb), 0.55); }

.whz-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 14px;
  background:
    linear-gradient(rgba(var(--accent-rgb), 0.08) 1px, transparent 1px) 0 0 / 10% 10%,
    linear-gradient(90deg, rgba(var(--accent-rgb), 0.08) 1px, transparent 1px) 0 0 / 10% 10%,
    rgba(0, 0, 0, 0.22);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
  touch-action: none;
}

.whz-zone {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px dashed rgba(var(--accent-rgb), 0.6);
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--text-primary);
  cursor: grab;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.whz-zone.selected {
  border-style: solid;
  background: rgba(var(--accent-rgb), 0.3);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.4);
}

.whz-zone-label { font-size: 11px; font-weight: 600; }
.whz-zone-action { font-size: 9px; color: rgba(var(--accent-rgb), 0.7); }

.whz-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.45);
}

.whz-toolbar { display: flex; gap: 8px; margin-top: 12px; }

.whz-toolbar button {
  padding: 5px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.28);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.whz-toolbar button:disabled { opacity: 0.4; cursor: not-allowed; }

.whz-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.12);
}

.whz-field { display: flex; flex-direction: column; gap: 5px; }
.whz-field-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.6); }

.whz-label-input,
.whz-action-input {
  padding: 6px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
}

.whz-label-input { width: 110px; }
.whz-action-input { width: 140px; }

.whz-nudge,
.whz-grow { display: flex; align-items: center; gap: 4px; }

.whz-nudge button,
.whz-grow button {
  width: 30px;
  height: 30px;
  border: 1px solid rgba(var(--accent-rgb), 0.24);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.whz-grow button { width: auto; padding: 0 10px; font-size: 12px; }

.whz-del {
  margin-left: auto;
  padding: 6px 12px;
  border: 1px solid rgba(196, 106, 90, 0.4);
  border-radius: 8px;
  background: none;
  color: #c46a5a;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
</style>
