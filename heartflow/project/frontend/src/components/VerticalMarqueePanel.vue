<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  useVerticalMarquee,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
} from '../modules/vertical-marquee'

const {
  items,
  intervalMs,
  direction,
  paused,
  canAdd,
  addItem,
  removeItem,
  setIntervalMs,
  setDirection,
  togglePause,
  reset,
} = useVerticalMarquee()

const draft = ref('')
const active = ref(0)
const ROW = 44
let timer: number | null = null

function stopTimer() {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}

function startTimer() {
  stopTimer()
  if (paused.value || items.value.length <= 1) return
  timer = window.setInterval(() => {
    const n = items.value.length
    if (n <= 1) return
    active.value = direction.value === 'up' ? (active.value + 1) % n : (active.value - 1 + n) % n
  }, intervalMs.value)
}

onMounted(startTimer)
onBeforeUnmount(stopTimer)
watch([intervalMs, paused, direction, items], startTimer, { deep: true })

const trackStyle = computed(() => ({ transform: `translateY(${-active.value * ROW}px)` }))

function submit() {
  if (addItem(draft.value)) {
    draft.value = ''
  }
}

function onRemove(index: number) {
  removeItem(index)
  if (active.value >= items.value.length) active.value = 0
}

function onRange(e: Event) {
  setIntervalMs(Number((e.target as HTMLInputElement).value))
}

function onReset() {
  reset()
  active.value = 0
}
</script>

<template>
  <section class="vmq-panel">
    <header class="vmq-head">
      <div class="vmq-head-text">
        <span class="vmq-kicker">触角 · 公告轮播</span>
        <h3 class="vmq-title">垂直跑马灯</h3>
      </div>
      <button
        class="vmq-pause"
        type="button"
        :class="{ 'is-paused': paused }"
        :aria-pressed="paused"
        @click="togglePause"
      >{{ paused ? '已暂停' : '播放中' }}</button>
    </header>

    <div class="vmq-viewport">
      <div class="vmq-track" :style="trackStyle">
        <div
          v-for="(it, i) in items"
          :key="i"
          class="vmq-row"
          :class="{ 'is-active': i === active }"
        >
          <span class="vmq-bullet">◆</span>
          <span class="vmq-text">{{ it }}</span>
        </div>
      </div>
      <div v-if="items.length === 0" class="vmq-empty">暂无轮播内容</div>
    </div>

    <div class="vmq-controls">
      <div class="vmq-field">
        <span class="vmq-label">方向</span>
        <div class="vmq-seg">
          <button type="button" :class="{ active: direction === 'up' }" @click="setDirection('up')">上滚</button>
          <button type="button" :class="{ active: direction === 'down' }" @click="setDirection('down')">下滚</button>
        </div>
      </div>
      <div class="vmq-field vmq-field-range">
        <span class="vmq-label">间隔 {{ (intervalMs / 1000).toFixed(1) }}s</span>
        <input
          class="vmq-range"
          type="range"
          :min="MIN_INTERVAL_MS"
          :max="MAX_INTERVAL_MS"
          :step="500"
          :value="intervalMs"
          @input="onRange"
        />
      </div>
    </div>

    <div class="vmq-add">
      <input
        v-model="draft"
        class="vmq-input"
        type="text"
        maxlength="40"
        placeholder="新增一条轮播文案"
        @keyup.enter="submit"
      />
      <button class="vmq-add-btn" type="button" :disabled="!canAdd || !draft.trim()" @click="submit">添加</button>
    </div>

    <ul class="vmq-list">
      <li v-for="(it, i) in items" :key="'l' + i" class="vmq-list-item">
        <span class="vmq-list-text">{{ it }}</span>
        <button class="vmq-del" type="button" @click="onRemove(i)">移除</button>
      </li>
    </ul>

    <button class="vmq-reset" type="button" @click="onReset">恢复默认</button>
  </section>
</template>

<style scoped>
.vmq-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.55), rgba(var(--bg-card-rgb), 0.4));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
}

.vmq-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.vmq-kicker { font-size: 12px; letter-spacing: 0.12em; color: rgba(var(--accent-rgb), 0.7); }
.vmq-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; }

.vmq-pause {
  flex: none;
  padding: 5px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--accent-rgb), 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.vmq-pause.is-paused { background: rgba(var(--accent-rgb), 0.22); color: var(--text-primary); }

.vmq-viewport {
  position: relative;
  height: 132px;
  overflow: hidden;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb), 0.1);
}

.vmq-track {
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.vmq-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 16px;
  opacity: 0.42;
  transition: opacity 0.4s ease, color 0.4s ease;
}

.vmq-row.is-active { opacity: 1; }

.vmq-bullet { font-size: 9px; color: var(--accent); opacity: 0.7; }

.vmq-text {
  font-size: 13px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vmq-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.4);
}

.vmq-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 14px;
}

.vmq-field { display: flex; flex-direction: column; gap: 6px; }
.vmq-field-range { flex: 1; min-width: 160px; }

.vmq-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.6); }

.vmq-seg {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
}

.vmq-seg button {
  padding: 4px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.vmq-seg button.active { background: var(--accent); color: var(--bg-primary); font-weight: 600; }

.vmq-range { width: 100%; accent-color: var(--accent); }

.vmq-add { display: flex; gap: 8px; margin-top: 14px; }

.vmq-input {
  flex: 1;
  min-width: 0;
  padding: 7px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
}

.vmq-input::placeholder { color: rgba(var(--accent-rgb), 0.35); }

.vmq-add-btn {
  flex: none;
  padding: 7px 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.vmq-add-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.vmq-list { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }

.vmq-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.14);
}

.vmq-list-text { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.vmq-del {
  flex: none;
  border: none;
  background: none;
  color: rgba(var(--accent-rgb), 0.55);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}

.vmq-del:hover { color: #c46a5a; }

.vmq-reset {
  display: block;
  margin: 14px auto 0;
  padding: 5px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.24);
  border-radius: 8px;
  background: none;
  color: rgba(var(--accent-rgb), 0.7);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.vmq-reset:hover { color: var(--text-primary); }
</style>
