<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDriftBottle, BOTTLE_MOODS } from '../modules/drift-bottle'
import type { BottleMood, DriftBottle } from '../modules/drift-bottle'

const { drifting, collected, driftingCount, collectedCount, isEmpty, throwBottle, pickBottle, removeBottle } =
  useDriftBottle()

const draft = ref('')
const mood = ref<BottleMood>('平静')
const justPicked = ref<DriftBottle | null>(null)
const picking = ref(false)

const MAX_VISIBLE = 10
const visibleBottles = computed(() => drifting.value.slice(0, MAX_VISIBLE))

function bottleStyle(index: number) {
  return {
    left: `${6 + ((index * 29) % 78)}%`,
    animationDuration: `${4.5 + (index % 4) * 1.1}s`,
    animationDelay: `${-(index * 0.9)}s`,
  } as Record<string, string>
}

function fmt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function onThrow() {
  if (throwBottle(draft.value, mood.value)) {
    draft.value = ''
    justPicked.value = null
  }
}

function onPick() {
  if (picking.value || driftingCount.value === 0) return
  picking.value = true
  justPicked.value = null
  window.setTimeout(() => {
    justPicked.value = pickBottle()
    picking.value = false
  }, 700)
}
</script>

<template>
  <section class="db-panel">
    <header class="db-head">
      <div class="db-head-text">
        <span class="db-kicker">情绪花房 · 漂流</span>
        <h3 class="db-title">漂流瓶</h3>
      </div>
      <span class="db-count">{{ driftingCount }} 只漂流中</span>
    </header>

    <div class="db-sea" :class="{ 'is-empty': isEmpty }">
      <div class="db-waves" aria-hidden="true"></div>
      <div
        v-for="(b, i) in visibleBottles"
        :key="b.id"
        class="db-bottle"
        :style="bottleStyle(i)"
        :title="b.mood"
      >
        <svg class="db-bottle-svg" viewBox="0 0 28 46" xmlns="http://www.w3.org/2000/svg">
          <rect class="db-cork" x="10" y="1" width="8" height="6" rx="1.5" />
          <path class="db-neck" d="M11 7 h6 v7 l4 6 v20 a3 3 0 0 1 -3 3 h-8 a3 3 0 0 1 -3 -3 v-20 l4 -6 z" />
          <path class="db-paper" d="M9 26 h10 v9 h-10 z" />
        </svg>
      </div>

      <p v-if="isEmpty" class="db-empty">海面空荡，投一只瓶子吧。</p>
    </div>

    <div class="db-compose">
      <textarea
        v-model="draft"
        class="db-textarea"
        rows="2"
        maxlength="200"
        placeholder="写下此刻的心事，封进瓶子…"
      ></textarea>
      <div class="db-moods">
        <button
          v-for="m in BOTTLE_MOODS"
          :key="m"
          type="button"
          class="db-mood"
          :class="{ 'is-active': mood === m }"
          @click="mood = m"
        >{{ m }}</button>
      </div>
      <div class="db-actions">
        <button class="db-btn db-btn--throw" type="button" :disabled="!draft.trim()" @click="onThrow">投入海中</button>
        <button class="db-btn db-btn--pick" type="button" :disabled="driftingCount === 0 || picking" @click="onPick">
          {{ picking ? '捞取中…' : '捞起一只' }}
        </button>
      </div>
    </div>

    <transition name="db-rise">
      <article v-if="justPicked" class="db-picked">
        <span class="db-picked-tag">{{ justPicked.mood }} · 捞于 {{ fmt(justPicked.collectedAt || justPicked.thrownAt) }}</span>
        <p class="db-picked-text">{{ justPicked.text }}</p>
        <span class="db-picked-from">封于 {{ fmt(justPicked.createdAt) }}</span>
      </article>
    </transition>

    <div class="db-stats">
      <div class="db-stat">
        <span class="db-stat-num">{{ driftingCount }}</span>
        <span class="db-stat-label">漂流中</span>
      </div>
      <div class="db-stat">
        <span class="db-stat-num">{{ collectedCount }}</span>
        <span class="db-stat-label">已拾取</span>
      </div>
    </div>

    <div v-if="collected.length" class="db-archive">
      <span class="db-archive-title">拾取留痕</span>
      <ul class="db-archive-list">
        <li v-for="b in collected" :key="b.id" class="db-archive-item">
          <div class="db-archive-main">
            <span class="db-archive-mood">{{ b.mood }}</span>
            <span class="db-archive-text">{{ b.text }}</span>
          </div>
          <button class="db-archive-del" type="button" aria-label="删除记录" @click="removeBottle(b.id)">×</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.db-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(122, 168, 178, 0.28);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(26, 44, 52, 0.55), rgba(20, 34, 42, 0.5));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  color: #dceef0;
}

.db-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.db-kicker { font-size: 12px; letter-spacing: 0.12em; color: #7ab0ba; opacity: 0.9; }
.db-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; color: #eaf6f7; }

.db-count {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(122, 168, 178, 0.16);
  font-size: 12px;
  color: #a9d2d8;
  font-variant-numeric: tabular-nums;
}

.db-sea {
  position: relative;
  height: 170px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(122, 168, 178, 0.22);
  background: linear-gradient(180deg, rgba(38, 78, 92, 0.55), rgba(14, 30, 40, 0.85));
}

.db-waves {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 25% 15%, rgba(160, 220, 235, 0.14), transparent 55%),
    radial-gradient(ellipse at 80% 85%, rgba(122, 168, 178, 0.16), transparent 60%);
  animation: db-shimmer 8s ease-in-out infinite alternate;
}

@keyframes db-shimmer {
  0% { opacity: 0.7; transform: translateX(-2%); }
  100% { opacity: 1; transform: translateX(2%); }
}

.db-bottle {
  position: absolute;
  bottom: 14px;
  width: 22px;
  height: 36px;
  transform-origin: 50% 100%;
  animation-name: db-bob;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  will-change: transform;
}

@keyframes db-bob {
  0% { transform: translateY(0) rotate(-7deg); }
  50% { transform: translateY(-8px) rotate(6deg); }
  100% { transform: translateY(0) rotate(-7deg); }
}

.db-bottle-svg { width: 100%; height: 100%; display: block; }
.db-cork { fill: #b98a55; }
.db-neck { fill: rgba(190, 230, 240, 0.5); stroke: rgba(220, 245, 250, 0.7); stroke-width: 1; }
.db-paper { fill: #f0e6d2; opacity: 0.85; }

.db-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 13px;
  color: #9cc2c8;
  letter-spacing: 0.05em;
}

.db-compose { margin-top: 14px; }

.db-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid rgba(122, 168, 178, 0.3);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.22);
  color: #dceef0;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
}

.db-textarea::placeholder { color: #7f9ea4; }

.db-moods { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }

.db-mood {
  padding: 4px 12px;
  border: 1px solid rgba(122, 168, 178, 0.3);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
  color: #b9d8dc;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.db-mood.is-active {
  border-color: #7ab0ba;
  color: #eaf6f7;
  box-shadow: 0 0 0 1px #7ab0ba inset;
}

.db-actions { display: flex; gap: 10px; margin-top: 12px; }

.db-btn {
  flex: 1;
  padding: 9px 0;
  border-radius: 10px;
  border: 1px solid rgba(122, 168, 178, 0.4);
  background: rgba(0, 0, 0, 0.2);
  color: #dceef0;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;
}

.db-btn:hover:not(:disabled) { background: rgba(122, 168, 178, 0.2); }
.db-btn:active:not(:disabled) { transform: scale(0.96); }
.db-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.db-btn--throw { border-color: rgba(122, 178, 150, 0.5); color: #cdeee0; }
.db-btn--throw:hover:not(:disabled) { background: rgba(122, 178, 150, 0.2); }

.db-picked {
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(212, 163, 90, 0.35);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(60, 48, 32, 0.6), rgba(42, 34, 24, 0.55));
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}

.db-picked-tag { font-size: 11px; letter-spacing: 0.08em; color: #d4a35a; }
.db-picked-text { margin: 8px 0; font-size: 14px; line-height: 1.6; color: #f3e9d6; white-space: pre-wrap; }
.db-picked-from { font-size: 11px; color: #b39a78; }

.db-rise-enter-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.db-rise-enter-from { opacity: 0; transform: translateY(14px) scale(0.97); }

.db-stats { display: flex; justify-content: center; gap: 30px; margin-top: 16px; }
.db-stat { display: flex; flex-direction: column; align-items: center; }

.db-stat-num {
  font-size: 24px;
  font-weight: 700;
  color: #eaf6f7;
  font-variant-numeric: tabular-nums;
}

.db-stat-label { margin-top: 2px; font-size: 12px; color: #8fb4ba; letter-spacing: 0.06em; }

.db-archive { margin-top: 16px; border-top: 1px solid rgba(122, 168, 178, 0.16); padding-top: 12px; }
.db-archive-title { font-size: 12px; letter-spacing: 0.1em; color: #7ab0ba; opacity: 0.85; }

.db-archive-list { margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }

.db-archive-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
}

.db-archive-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.db-archive-mood { font-size: 11px; color: #a9d2d8; }

.db-archive-text {
  font-size: 13px;
  color: #d6e8ea;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.db-archive-del {
  flex: none;
  width: 20px;
  height: 20px;
  line-height: 1;
  border: none;
  border-radius: 50%;
  background: rgba(196, 106, 90, 0.26);
  color: #f0c6bb;
  font-size: 14px;
  cursor: pointer;
}
</style>
