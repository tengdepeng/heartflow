<template>
  <section class="rdn-panel" aria-label="年度阅读叙事">
    <div class="rdn-head">
      <div class="rdn-head-main">
        <span class="rdn-title">✨ 年度叙事</span>
        <span class="rdn-sub">把这一年的阅读讲成一段故事</span>
      </div>
      <div class="rdn-year">
        <button class="rdn-year-btn" type="button" aria-label="上一年" @click="shiftYear(-1)">‹</button>
        <span class="rdn-year-val">{{ viewYear }}</span>
        <button class="rdn-year-btn" type="button" aria-label="下一年" :disabled="viewYear >= thisYear" @click="shiftYear(1)">›</button>
      </div>
    </div>

    <p v-if="!narrative.hasData" class="rdn-empty">
      {{ viewYear }} 年还没有阅读记录，翻开一本书，明年的故事就有了开头。
    </p>

    <template v-else>
      <!-- 封面卡 -->
      <div class="rdn-cover">
        <span class="rdn-cover-year">{{ narrative.year }}</span>
        <h3 class="rdn-cover-headline">{{ narrative.headline }}</h3>
        <p class="rdn-cover-overview">{{ narrative.overview }}</p>
      </div>

      <!-- 阅读人格 -->
      <div class="rdn-block">
        <h4 class="rdn-block-title">阅读人格</h4>
        <div class="rdn-persona">
          <span v-for="p in narrative.persona" :key="p.key" class="rdn-persona-chip"
            :title="p.detail">
            <b>{{ p.label }}</b>
            <i>{{ p.detail }}</i>
          </span>
        </div>
      </div>

      <!-- 分季 era -->
      <div class="rdn-block">
        <h4 class="rdn-block-title">分季</h4>
        <div v-if="narrative.eras.length" class="rdn-eras">
          <article v-for="e in narrative.eras" :key="e.id" class="rdn-era">
            <span class="rdn-era-season">{{ e.season }}</span>
            <span class="rdn-era-months">{{ e.months }}</span>
            <p class="rdn-era-highlight">{{ e.highlight }}</p>
            <div class="rdn-era-stats">
              <span>{{ e.minutes }} 分</span>
              <span>{{ e.books }} 本</span>
            </div>
          </article>
        </div>
        <p v-else class="rdn-empty-hint">本年暂无分季数据</p>
      </div>

      <!-- 叙事弧 -->
      <div class="rdn-block">
        <h4 class="rdn-block-title">叙事</h4>
        <ul class="rdn-highlights">
          <li v-for="(h, i) in narrative.highlights" :key="i">{{ h }}</li>
        </ul>
        <p class="rdn-discovery">{{ narrative.discovery }}</p>
      </div>

      <div class="rdn-foot">
        <button class="rdn-btn" type="button" @click="onCopy">复制叙事</button>
        <span v-if="copied" class="rdn-copied">已复制到剪贴板</span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useReadingNarrative, buildNarrativeMarkdown } from '../modules/reading'

const { viewYear, narrative, setYear } = useReadingNarrative()
const thisYear = new Date().getFullYear()
const copied = ref(false)

function shiftYear(delta: number) {
  const next = viewYear.value + delta
  if (next > thisYear) return
  if (next < 1970) return
  setYear(next)
}

async function onCopy() {
  const text = buildNarrativeMarkdown(narrative.value)
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      fallbackCopy(text)
    }
    copied.value = true
  } catch {
    fallbackCopy(text)
    copied.value = true
  }
}

function fallbackCopy(text: string) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  } catch {
    /* 剪贴板不可用时静默降级 */
  }
}
</script>

<style scoped>
.rdn-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 18px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.rdn-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.rdn-head-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rdn-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
  letter-spacing: 1px;
}

.rdn-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 1px;
}

.rdn-year {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rdn-year-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.05);
  color: var(--accent);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.rdn-year-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.rdn-year-val {
  font-size: 13px;
  color: var(--accent);
  letter-spacing: 1px;
  min-width: 34px;
  text-align: center;
}

.rdn-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}

.rdn-cover {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.1), rgba(var(--accent-rgb), 0.02));
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
}

.rdn-cover-year {
  position: absolute;
  top: -12px;
  right: 6px;
  font-size: 64px;
  font-weight: 600;
  color: rgba(var(--accent-rgb), 0.07);
  line-height: 1;
  pointer-events: none;
}

.rdn-cover-headline {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.rdn-cover-overview {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.rdn-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rdn-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.rdn-persona {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rdn-persona-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.rdn-persona-chip b {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 0.5px;
}

.rdn-persona-chip i {
  font-size: 10px;
  font-style: normal;
  color: var(--text-low);
}

.rdn-eras {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.rdn-era {
  flex: 0 0 150px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.rdn-era-season {
  font-size: 15px;
  font-weight: 500;
  color: var(--accent);
}

.rdn-era-months {
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}

.rdn-era-highlight {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.rdn-era-stats {
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.6);
}

.rdn-highlights {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rdn-highlights li {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.rdn-discovery {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.85);
  background: rgba(var(--accent-rgb), 0.06);
  border-left: 2px solid rgba(var(--accent-rgb), 0.4);
  line-height: 1.7;
}

.rdn-empty-hint {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
}

.rdn-foot {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rdn-btn {
  padding: 6px 16px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 0.5px;
  cursor: pointer;
}

.rdn-copied {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.6);
}

@media (max-width: 480px) {
  .rdn-panel {
    padding: 14px 14px;
  }

  .rdn-cover-headline {
    font-size: 16px;
  }
}
</style>
