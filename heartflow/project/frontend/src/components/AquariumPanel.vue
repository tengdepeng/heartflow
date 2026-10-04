<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAquarium, speciesById, growthStage, FISH_SPECIES, MAX_FISH } from '../modules/aquarium'

const { fish, fishCount, totalFeeds, todayFeeds, isEmpty, isFull, addFish, feed } = useAquarium()

const selectedSpecies = ref<string>(FISH_SPECIES[0].id)

const growthHint = computed(() => {
  if (isEmpty.value) return ''
  return fish.value.map((f) => `${f.name}·${growthStage(f.feedCount).label}`).join('  ')
})

function fishStyle(index: number, speciesId: string) {
  const sp = speciesById(speciesId)
  const back = index % 2 === 1
  return {
    top: `${12 + ((index * 37) % 62)}%`,
    animationDuration: `${9 + (index % 5) * 1.6}s`,
    animationDelay: `${-(index * 1.9)}s`,
    animationDirection: back ? 'reverse' : 'normal',
    '--aq-body': sp.color,
    '--aq-accent': sp.accent,
  } as Record<string, string>
}

function onAdd() {
  addFish(selectedSpecies.value)
}
</script>

<template>
  <section class="aq-panel">
    <header class="aq-head">
      <div class="aq-head-text">
        <span class="aq-kicker">情绪花房 · 水族</span>
        <h3 class="aq-title">电子水族箱</h3>
      </div>
      <span class="aq-count">{{ fishCount }} / {{ MAX_FISH }} 尾</span>
    </header>

    <div class="aq-tank" :class="{ 'is-empty': isEmpty }">
      <div class="aq-water" aria-hidden="true"></div>
      <div class="aq-bubbles" aria-hidden="true">
        <span v-for="n in 6" :key="n" class="aq-bubble" :style="{ left: `${8 + n * 14}%`, animationDelay: `${n * 0.8}s` }" />
      </div>

      <div
        v-for="(f, i) in fish"
        :key="f.id"
        class="aq-fish"
        :class="{ 'aq-fish--back': i % 2 === 1 }"
        :style="fishStyle(i, f.speciesId)"
      >
        <svg class="aq-fish-svg" viewBox="0 0 64 38" xmlns="http://www.w3.org/2000/svg">
          <path class="aq-fish-tail" d="M44 19 L60 8 L56 19 L60 30 Z" />
          <path class="aq-fish-body" d="M6 19 Q20 5 38 12 Q46 16 46 19 Q46 22 38 26 Q20 33 6 19 Z" />
          <circle class="aq-fish-eye" cx="18" cy="16" r="2.1" />
          <path class="aq-fish-stripe" d="M26 11 Q30 19 26 27" />
        </svg>
      </div>

      <p v-if="isEmpty" class="aq-empty">水中尚空，放养一尾吧。</p>
    </div>

    <div class="aq-controls">
      <div class="aq-species">
        <button
          v-for="sp in FISH_SPECIES"
          :key="sp.id"
          type="button"
          class="aq-species-btn"
          :class="{ 'is-active': selectedSpecies === sp.id }"
          :style="{ '--aq-body': sp.color }"
          @click="selectedSpecies = sp.id"
        >{{ sp.name }}</button>
      </div>
      <div class="aq-actions">
        <button class="aq-btn aq-btn--add" type="button" :disabled="isFull" @click="onAdd">放养一尾</button>
        <button class="aq-btn aq-btn--feed" type="button" :disabled="isEmpty" @click="feed">投食</button>
      </div>
    </div>

    <div class="aq-stats">
      <div class="aq-stat">
        <span class="aq-stat-num">{{ fishCount }}</span>
        <span class="aq-stat-label">鱼数</span>
      </div>
      <div class="aq-stat">
        <span class="aq-stat-num">{{ totalFeeds }}</span>
        <span class="aq-stat-label">累计投食</span>
      </div>
      <div class="aq-stat">
        <span class="aq-stat-num">{{ todayFeeds }}</span>
        <span class="aq-stat-label">今日投食</span>
      </div>
    </div>

    <p v-if="growthHint" class="aq-growth">{{ growthHint }}</p>
  </section>
</template>

<style scoped>
.aq-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(90, 169, 201, 0.28);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(24, 44, 58, 0.55), rgba(18, 32, 44, 0.5));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  color: #dcecf5;
}

.aq-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.aq-kicker {
  font-size: 12px;
  letter-spacing: 0.12em;
  color: #5aa9c9;
  opacity: 0.9;
}

.aq-title {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 600;
  color: #eaf5fb;
}

.aq-count {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(90, 169, 201, 0.16);
  font-size: 12px;
  color: #a8d4e6;
  font-variant-numeric: tabular-nums;
}

.aq-tank {
  position: relative;
  height: 190px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(90, 169, 201, 0.22);
  background:
    linear-gradient(180deg, rgba(46, 104, 132, 0.5), rgba(14, 34, 48, 0.85));
}

.aq-water {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(150, 220, 245, 0.16), transparent 55%),
    radial-gradient(ellipse at 75% 80%, rgba(90, 169, 201, 0.14), transparent 60%);
  animation: aq-caustic 9s ease-in-out infinite alternate;
}

@keyframes aq-caustic {
  0% { opacity: 0.75; transform: translateX(-2%); }
  100% { opacity: 1; transform: translateX(2%); }
}

.aq-bubbles { position: absolute; inset: 0; }

.aq-bubble {
  position: absolute;
  bottom: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(200, 235, 250, 0.4);
  animation: aq-rise 7s linear infinite;
}

@keyframes aq-rise {
  0% { transform: translateY(0) scale(0.7); opacity: 0; }
  20% { opacity: 0.7; }
  100% { transform: translateY(-170px) scale(1.1); opacity: 0; }
}

.aq-fish {
  position: absolute;
  left: -14%;
  width: 54px;
  height: 32px;
  animation-name: aq-swim;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: left;
}

.aq-fish--back .aq-fish-svg { transform: scaleX(-1); }

@keyframes aq-swim {
  0% { left: -14%; }
  100% { left: 114%; }
}

.aq-fish-svg { width: 100%; height: 100%; display: block; }

.aq-fish-body { fill: var(--aq-body); }
.aq-fish-tail { fill: var(--aq-body); opacity: 0.75; }
.aq-fish-eye { fill: #10202c; }
.aq-fish-stripe { fill: none; stroke: var(--aq-accent); stroke-width: 2.4; opacity: 0.65; stroke-linecap: round; }

.aq-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 13px;
  color: #9dc2d4;
  letter-spacing: 0.05em;
}

.aq-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.aq-species { display: flex; gap: 8px; flex-wrap: wrap; }

.aq-species-btn {
  padding: 5px 11px;
  border: 1px solid rgba(90, 169, 201, 0.3);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
  color: #bcdbe8;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.aq-species-btn::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--aq-body);
  vertical-align: middle;
}

.aq-species-btn.is-active {
  border-color: var(--aq-body);
  color: #eaf5fb;
  box-shadow: 0 0 0 1px var(--aq-body) inset;
}

.aq-actions { display: flex; gap: 10px; }

.aq-btn {
  padding: 7px 16px;
  border-radius: 10px;
  border: 1px solid rgba(90, 169, 201, 0.4);
  background: rgba(0, 0, 0, 0.2);
  color: #dcecf5;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;
}

.aq-btn:hover:not(:disabled) { background: rgba(90, 169, 201, 0.2); }
.aq-btn:active:not(:disabled) { transform: scale(0.95); }
.aq-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.aq-btn--feed {
  border-color: rgba(232, 147, 74, 0.5);
  color: #f5d9b8;
}

.aq-btn--feed:hover:not(:disabled) { background: rgba(232, 147, 74, 0.2); }

.aq-stats {
  display: flex;
  justify-content: center;
  gap: 28px;
  margin-top: 16px;
}

.aq-stat { display: flex; flex-direction: column; align-items: center; }

.aq-stat-num {
  font-size: 24px;
  font-weight: 700;
  color: #eaf5fb;
  font-variant-numeric: tabular-nums;
}

.aq-stat-label {
  margin-top: 2px;
  font-size: 12px;
  color: #8fb4c6;
  letter-spacing: 0.06em;
}

.aq-growth {
  margin: 12px 0 0;
  text-align: center;
  font-size: 12px;
  color: #8fb4c6;
  letter-spacing: 0.04em;
}
</style>
