<script setup lang="ts">
import { useWidgetStyle, STYLE_VARIANTS, WIDGET_KINDS } from '../modules/widget-style'

const { styleOf, setStyle, resetKind, resetAll } = useWidgetStyle()

function variantOf(kindId: string) {
  const id = styleOf(kindId)
  return STYLE_VARIANTS.find((v) => v.id === id) ?? STYLE_VARIANTS[0]
}
</script>

<template>
  <section class="wsp-panel">
    <header class="wsp-head">
      <span class="wsp-kicker">触角 · 组件外观</span>
      <h3 class="wsp-title">组件款式 / 皮肤矩阵</h3>
      <p class="wsp-sub">为每个触角组件挑选一套外观款式（简约 / 拟物 / 像素）</p>
    </header>

    <div class="wsp-grid">
      <div v-for="k in WIDGET_KINDS" :key="k.id" class="wsp-card">
        <div
          class="wsp-preview"
          :class="{ 'is-pixel': variantOf(k.id).pixel, 'is-shadow': variantOf(k.id).shadow }"
          :style="{ borderRadius: variantOf(k.id).radius + 'px' }"
        >
          <span class="wsp-icon">{{ k.icon }}</span>
          <span class="wsp-name">{{ k.label }}</span>
          <span class="wsp-variant-tag">{{ variantOf(k.id).label }}</span>
        </div>
        <div class="wsp-variants">
          <button
            v-for="v in STYLE_VARIANTS"
            :key="v.id"
            type="button"
            :class="{ active: styleOf(k.id) === v.id }"
            :title="v.desc"
            @click="setStyle(k.id, v.id)"
          >{{ v.label }}</button>
        </div>
        <button class="wsp-kind-reset" type="button" @click="resetKind(k.id)">复位</button>
      </div>
    </div>

    <button class="wsp-reset" type="button" @click="resetAll">全部恢复默认</button>
  </section>
</template>

<style scoped>
.wsp-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.55), rgba(var(--bg-card-rgb), 0.4));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
}

.wsp-head { margin-bottom: 14px; }
.wsp-kicker { font-size: 12px; letter-spacing: 0.12em; color: rgba(var(--accent-rgb), 0.7); }
.wsp-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; }
.wsp-sub { margin: 6px 0 0; font-size: 12px; color: rgba(var(--accent-rgb), 0.55); }

.wsp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.wsp-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.16);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb), 0.1);
}

.wsp-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 84px;
  border: 1px solid rgba(var(--accent-rgb), 0.28);
  background: rgba(var(--accent-rgb), 0.08);
  transition: border-radius 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.wsp-preview.is-shadow {
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.32);
  background: linear-gradient(160deg, rgba(var(--accent-rgb), 0.22), rgba(var(--accent-rgb), 0.06));
}

.wsp-preview.is-pixel {
  border-width: 2px;
  border-radius: 0 !important;
  box-shadow: 3px 3px 0 rgba(var(--accent-rgb), 0.35);
}

.wsp-icon { font-size: 22px; }
.wsp-name { font-size: 12px; }

.wsp-variant-tag {
  position: absolute;
  right: 6px;
  top: 6px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.18);
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.85);
}

.wsp-variants { display: flex; gap: 4px; }

.wsp-variants button {
  flex: 1;
  padding: 4px 0;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: rgba(var(--accent-rgb), 0.55);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.wsp-variants button.active { background: var(--accent); color: var(--bg-primary); font-weight: 600; }

.wsp-kind-reset {
  align-self: flex-end;
  border: none;
  background: none;
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}

.wsp-kind-reset:hover { color: var(--text-primary); }

.wsp-reset {
  display: block;
  margin: 16px auto 0;
  padding: 5px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.24);
  border-radius: 8px;
  background: none;
  color: rgba(var(--accent-rgb), 0.7);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.wsp-reset:hover { color: var(--text-primary); }
</style>
