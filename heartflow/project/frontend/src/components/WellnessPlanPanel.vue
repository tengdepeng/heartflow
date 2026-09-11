<template>
  <section data-enter class="wellness-plan">
    <header class="wp-head">
      <span class="wp-icon">🌿</span>
      <div>
        <h3 class="wp-title">体质调理方案</h3>
        <p class="wp-desc">依体质选一方养法：吃、动、息、按、饮，四季调护（知源中医「体质调理」借鉴）</p>
      </div>
    </header>

    <!-- 体质选择 -->
    <div class="wp-select">
      <button
        v-for="c in CONSTITUTION_ORDER"
        :key="c"
        class="wp-chip"
        :class="{ 'wp-chip-on': selectedType === c }"
        @click="selectedType = c"
      >
        <span class="wp-chip-label">{{ CONSTITUTION_META[c].label }}</span>
        <span class="wp-chip-desc">{{ CONSTITUTION_META[c].description }}</span>
      </button>
    </div>
    <p v-if="savedType" class="wp-hint">已根据你的体质画像，为你预选「{{ CONSTITUTION_META[savedType].label }}」。</p>

    <!-- 方案 -->
    <div v-if="plan" class="wp-grid">
      <div class="wp-card">
        <h4 class="wp-card-title">🍚 饮食建议</h4>
        <ul class="wp-list"><li v-for="(d, i) in plan.dietAdvice" :key="i">{{ d }}</li></ul>
      </div>
      <div class="wp-card">
        <h4 class="wp-card-title">🚶 运动建议</h4>
        <ul class="wp-list"><li v-for="(d, i) in plan.exerciseAdvice" :key="i">{{ d }}</li></ul>
      </div>
      <div class="wp-card">
        <h4 class="wp-card-title">🛌 作息建议</h4>
        <ul class="wp-list"><li v-for="(d, i) in plan.lifestyleAdvice" :key="i">{{ d }}</li></ul>
      </div>
      <div class="wp-card">
        <h4 class="wp-card-title">💆 穴位按摩</h4>
        <div v-for="p in plan.acupressurePoints" :key="p.name" class="wp-acu">
          <b class="wp-acu-name">{{ p.name }} <span class="wp-acu-pos">{{ p.location }}</span></b>
          <p class="wp-acu-tech">{{ p.technique }}</p>
        </div>
      </div>
      <div class="wp-card">
        <h4 class="wp-card-title">🍵 推荐茶饮</h4>
        <div class="wp-tea">
          <span v-for="(t, i) in plan.teaRecommendations" :key="i" class="wp-tea-chip">{{ t }}</span>
        </div>
      </div>
      <div class="wp-card">
        <h4 class="wp-card-title">🍃 四季调整</h4>
        <ul class="wp-list">
          <li v-for="(advice, season) in plan.seasonalAdjustments" :key="season">
            <b class="wp-season">{{ season }}</b> {{ advice }}
          </li>
        </ul>
      </div>
    </div>

    <p class="wp-foot">方案生成于 {{ fmtTime(plan.generatedAt) }} · 供参考，不适请以医嘱为准</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storage } from '../engine/storage'
import {
  useWellnessPlan,
  BODY_WISDOM_STORAGE_KEYS,
  CONSTITUTION_META,
} from '../modules/body-wisdom'
import type { ConstitutionType, ConstitutionAnalysis } from '../modules/body-wisdom'

const CONSTITUTION_ORDER: ConstitutionType[] = [
  'balanced', 'qi-deficiency', 'yang-deficiency', 'yin-deficiency',
  'phlegm-dampness', 'damp-heat', 'blood-stasis', 'qi-stagnation', 'allergic',
]

const saved = storage.getKV<ConstitutionAnalysis | null>(BODY_WISDOM_STORAGE_KEYS.CONSTITUTION, null)
const savedType: ConstitutionType | null =
  saved && CONSTITUTION_META[saved.type] ? saved.type : null
const selectedType = ref<ConstitutionType>(savedType ?? 'balanced')

const wp = useWellnessPlan()
const plan = computed(() => wp.generateWellnessPlan(minimalAnalysis(selectedType.value)))

function minimalAnalysis(type: ConstitutionType): ConstitutionAnalysis {
  const meta = CONSTITUTION_META[type]
  return {
    type,
    label: meta.label,
    scores: {} as Record<ConstitutionType, number>,
    characteristics: [],
    recommendations: [],
    analyzedAt: new Date().toISOString(),
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.wellness-plan {
  margin-top: 26px;
  padding: 20px 20px 24px;
  border-radius: 18px;
  background: radial-gradient(circle at 15% 0%, rgba(138, 154, 122, 0.1), rgba(0, 0, 0, 0.18));
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.wp-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.wp-icon { font-size: 24px; line-height: 1; }
.wp-title { margin: 0; font-size: 18px; letter-spacing: 2px; color: var(--text-high, #fff); }
.wp-desc { margin: 4px 0 0; font-size: 12px; opacity: 0.6; line-height: 1.6; }

.wp-select { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.wp-chip {
  text-align: left; padding: 10px 12px; border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  font-family: inherit; color: var(--text-high, #fff);
  cursor: pointer; transition: all 0.25s; display: flex; flex-direction: column; gap: 3px;
}
.wp-chip:hover { border-color: rgba(138, 154, 122, 0.4); }
.wp-chip-on { border-color: rgba(138, 154, 122, 0.7); background: rgba(138, 154, 122, 0.14); }
.wp-chip-label { font-size: 13px; font-weight: 600; }
.wp-chip-desc { font-size: 10px; opacity: 0.6; line-height: 1.5; }
.wp-hint { margin: 12px 0 0; font-size: 12px; opacity: 0.65; }

.wp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-top: 16px; }
.wp-card {
  padding: 16px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
}
.wp-card-title { margin: 0 0 12px; font-size: 14px; letter-spacing: 1px; color: var(--text-high, #fff); }
.wp-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.wp-list li { font-size: 13px; opacity: 0.85; line-height: 1.7; padding-left: 14px; position: relative; }
.wp-list li::before { content: '·'; position: absolute; left: 0; color: #8a9a7a; font-weight: 700; }
.wp-season { color: #f0c040; font-weight: 600; }

.wp-acu { margin-bottom: 10px; }
.wp-acu:last-child { margin-bottom: 0; }
.wp-acu-name { font-size: 13px; color: var(--text-high, #fff); display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.wp-acu-pos { font-size: 11px; opacity: 0.55; font-weight: 400; }
.wp-acu-tech { margin: 4px 0 0; font-size: 12px; opacity: 0.7; }

.wp-tea { display: flex; flex-wrap: wrap; gap: 8px; }
.wp-tea-chip {
  padding: 5px 12px; border-radius: 999px; font-size: 12px;
  background: rgba(240, 192, 64, 0.12); color: #e0bd6e;
  border: 1px solid rgba(240, 192, 64, 0.2);
}

.wp-foot { margin: 16px 0 0; font-size: 11px; opacity: 0.5; text-align: center; }
</style>