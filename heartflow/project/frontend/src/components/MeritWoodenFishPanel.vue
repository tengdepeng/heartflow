<script setup lang="ts">
import { useMeritWoodenFish } from '../modules/merit-wooden-fish'

const { merit, today, soundOn, isEmpty, knock, toggleSound } = useMeritWoodenFish()
</script>

<template>
  <section class="mwf-panel">
    <header class="mwf-head">
      <div class="mwf-head-text">
        <span class="mwf-kicker">息壤 · 静心</span>
        <h3 class="mwf-title">电子木鱼 · 功德计数器</h3>
      </div>
      <button
        class="mwf-sound"
        :class="{ 'is-off': !soundOn }"
        type="button"
        :aria-label="soundOn ? '关闭敲击声' : '开启敲击声'"
        @click="toggleSound"
      >
        {{ soundOn ? '🔊' : '🔇' }}
      </button>
    </header>

    <button class="mwf-fish" type="button" aria-label="敲击木鱼" @click="knock">
      <span class="mwf-fish-body">
        <span class="mwf-fish-slit"></span>
      </span>
      <span class="mwf-fish-caption">轻点木鱼</span>
    </button>

    <div class="mwf-stats">
      <div class="mwf-stat">
        <span class="mwf-stat-num">{{ merit }}</span>
        <span class="mwf-stat-label">累计功德</span>
      </div>
      <div class="mwf-stat">
        <span class="mwf-stat-num">{{ today }}</span>
        <span class="mwf-stat-label">今日敲击</span>
      </div>
    </div>

    <p v-if="isEmpty" class="mwf-guide">轻点木鱼，静心积福。</p>
  </section>
</template>

<style scoped>
.mwf-panel {
  margin: 18px 0;
  padding: 18px 20px 22px;
  border: 1px solid rgba(212, 163, 90, 0.28);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(58, 42, 28, 0.55), rgba(40, 30, 22, 0.5));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  color: #f3e6d2;
}

.mwf-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.mwf-kicker {
  font-size: 12px;
  letter-spacing: 0.12em;
  color: #d4a35a;
  opacity: 0.85;
}

.mwf-title {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 600;
  color: #f6ecd9;
}

.mwf-sound {
  flex: none;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(212, 163, 90, 0.4);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  font-size: 17px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.mwf-sound:hover {
  background: rgba(212, 163, 90, 0.18);
}

.mwf-sound:active {
  transform: scale(0.92);
}

.mwf-sound.is-off {
  opacity: 0.55;
}

.mwf-fish {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 0 4px;
  background: none;
  border: none;
  cursor: pointer;
}

.mwf-fish-body {
  position: relative;
  width: 132px;
  height: 96px;
  border-radius: 50% 50% 46% 46% / 60% 60% 40% 40%;
  background:
    radial-gradient(circle at 38% 32%, rgba(255, 236, 200, 0.35), transparent 45%),
    linear-gradient(150deg, #7a4f2a, #5a371c 60%, #43280f);
  box-shadow:
    inset 0 -6px 14px rgba(0, 0, 0, 0.4),
    inset 0 6px 12px rgba(255, 220, 170, 0.18),
    0 8px 20px rgba(0, 0, 0, 0.35);
  transition: transform 0.12s ease;
}

.mwf-fish-body::before {
  content: '';
  position: absolute;
  top: 30%;
  left: 22%;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, rgba(255, 240, 210, 0.5), rgba(120, 80, 40, 0.2));
  opacity: 0.7;
}

.mwf-fish-slit {
  position: absolute;
  right: 18%;
  bottom: 30%;
  width: 30px;
  height: 12px;
  border-radius: 0 0 60% 60%;
  background: rgba(20, 12, 6, 0.7);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
}

.mwf-fish:active .mwf-fish-body {
  transform: scale(0.94);
}

.mwf-fish-caption {
  font-size: 13px;
  color: #d9c4a4;
  letter-spacing: 0.05em;
}

.mwf-stats {
  display: flex;
  justify-content: center;
  gap: 28px;
  margin-top: 14px;
}

.mwf-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mwf-stat-num {
  font-size: 26px;
  font-weight: 700;
  color: #f6ecd9;
  font-variant-numeric: tabular-nums;
}

.mwf-stat-label {
  margin-top: 2px;
  font-size: 12px;
  color: #c9b48f;
  letter-spacing: 0.06em;
}

.mwf-guide {
  margin: 14px 0 0;
  text-align: center;
  font-size: 13px;
  color: #cdbb96;
}
</style>
