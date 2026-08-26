<template>
  <div class="clock-quote" :class="{ 'clock-quote--hidden': !showClock && !showQuote }" aria-hidden="true">
    <div v-if="showClock" class="cq__clock">
      <span class="cq__time">{{ hhmm }}</span>
      <span class="cq__sec">{{ ss }}</span>
    </div>
    <div v-if="showQuote" class="cq__quote">{{ quote }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { quoteForDate } from '../content'

withDefaults(defineProps<{
  accent?: string
  showClock?: boolean
  showQuote?: boolean
}>(), {
  accent: '#d4a574',
  showClock: true,
  showQuote: true,
})

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => { now.value = new Date() }, 1000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = computed(() => `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}`)
const ss = computed(() => pad(now.value.getSeconds()))
const quote = quoteForDate()
</script>

<style scoped>
.clock-quote {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding-bottom: 12vh;
  color: rgba(232, 224, 216, 0.82);
}
.clock-quote--hidden { display: none; }
.cq__clock {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-weight: 200;
  letter-spacing: 4px;
  text-shadow: 0 0 24px rgba(0, 0, 0, 0.5);
}
.cq__time {
  font-size: clamp(40px, 9vmin, 84px);
  font-variant-numeric: tabular-nums;
}
.cq__sec {
  font-size: clamp(16px, 3vmin, 26px);
  color: v-bind(accent);
  opacity: 0.8;
}
.cq__quote {
  font-size: clamp(13px, 2.2vmin, 18px);
  font-weight: 300;
  letter-spacing: 3px;
  color: rgba(232, 224, 216, 0.55);
  max-width: 70vw;
  text-align: center;
}
</style>
