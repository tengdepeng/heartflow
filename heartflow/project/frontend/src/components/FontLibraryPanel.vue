<script setup lang="ts">
// ============================================================
// 全局 UI · 字体库面板（INCR-501）
// 正文 / 标题可分别选择字族，卡片以内联字体即时预览；
// 选中写入 CSS 变量全局生效并持久化。纯本地、零网络。
// ============================================================
import { useFontLibrary } from '../modules/font-library/font-library'

const { presets, bodyId, headingId, body, heading, setBody, setHeading, reset } = useFontLibrary()

const SAMPLE_ZH = '心流所至，皆是归途'
const SAMPLE_EN = 'Mind in flow'
</script>

<template>
  <section class="flp-panel">
    <header class="flp-head">
      <span class="flp-kicker">外观 · 字体</span>
      <h4 class="flp-title">字体库</h4>
      <p class="flp-sub">正文与标题分别选字族，选中即全局生效</p>
    </header>

    <div class="flp-group">
      <div class="flp-group-head">
        <span class="flp-group-label">正文字体</span>
        <span class="flp-group-current">当前：{{ body.label }}</span>
      </div>
      <div class="flp-grid">
        <button
          v-for="p in presets"
          :key="'body-' + p.id"
          class="flp-card"
          :class="{ 'is-active': p.id === bodyId }"
          type="button"
          :title="p.desc"
          @click="setBody(p.id)"
        >
          <span class="flp-sample" :style="{ fontFamily: p.stackZh }">{{ SAMPLE_ZH }}</span>
          <span class="flp-sample-en" :style="{ fontFamily: p.stackEn }">{{ SAMPLE_EN }}</span>
          <span class="flp-name">{{ p.label }}<em>{{ p.labelEn }}</em></span>
        </button>
      </div>
    </div>

    <div class="flp-group">
      <div class="flp-group-head">
        <span class="flp-group-label">标题字体</span>
        <span class="flp-group-current">当前：{{ heading.label }}</span>
      </div>
      <div class="flp-grid">
        <button
          v-for="p in presets"
          :key="'head-' + p.id"
          class="flp-card"
          :class="{ 'is-active': p.id === headingId }"
          type="button"
          :title="p.desc"
          @click="setHeading(p.id)"
        >
          <span class="flp-sample flp-sample--head" :style="{ fontFamily: p.stackZh }">{{ p.label }}</span>
          <span class="flp-sample-en" :style="{ fontFamily: p.stackEn }">{{ p.labelEn }}</span>
          <span class="flp-tags"><em v-for="t in p.tags" :key="t">{{ t }}</em></span>
        </button>
      </div>
    </div>

    <div class="flp-foot">
      <span class="flp-hint">仅使用系统 / 随包字体，不联网加载</span>
      <button class="flp-reset" type="button" @click="reset">恢复默认</button>
    </div>
  </section>
</template>

<style scoped>
.flp-panel {
  padding: 14px 16px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.45);
}

.flp-head { margin-bottom: 12px; }
.flp-kicker { font-size: 11px; letter-spacing: 0.14em; color: rgba(var(--accent-rgb), 0.6); }
.flp-title { margin: 2px 0 0; font-size: 14px; font-weight: 500; color: var(--accent); letter-spacing: 1px; }
.flp-sub { margin: 4px 0 0; font-size: 12px; color: rgba(var(--text-primary-rgb), 0.42); }

.flp-group { margin-bottom: 14px; }

.flp-group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}
.flp-group-label { font-size: 12px; font-weight: 600; color: var(--text-primary); letter-spacing: 0.5px; }
.flp-group-current { font-size: 11px; color: rgba(var(--accent-rgb), 0.7); }

.flp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 8px;
}

.flp-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.12);
  color: rgba(var(--text-primary-rgb), 0.7);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}
.flp-card:hover { border-color: rgba(var(--accent-rgb), 0.32); transform: translateY(-1px); }
.flp-card.is-active {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.12);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.25);
}

.flp-sample {
  font-size: 15px;
  line-height: 1.4;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.flp-sample--head { font-size: 17px; font-weight: 600; }

.flp-sample-en {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: rgba(var(--accent-rgb), 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flp-name {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--text-primary-rgb), 0.85);
}
.flp-name em {
  font-style: normal;
  font-size: 10px;
  font-weight: 400;
  color: rgba(var(--accent-rgb), 0.55);
}

.flp-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.flp-tags em {
  font-style: normal;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.7);
}

.flp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 4px;
}

.flp-hint { font-size: 11px; color: rgba(var(--text-primary-rgb), 0.4); }

.flp-reset {
  padding: 6px 12px;
  font-size: 12px;
  font-family: inherit;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--text-primary-rgb), 0.8);
  cursor: pointer;
  transition: all 0.2s;
}
.flp-reset:hover { border-color: rgba(var(--accent-rgb), 0.34); }
</style>
