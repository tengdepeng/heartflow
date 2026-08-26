<script setup lang="ts">
// ============================================================
// 三层空间 · 上层浮层宿主（从物件激活、可关闭）
// 重建件：原文件被循环删除进程清除且从未进 git，按 App.vue 接口契约
// 忠实重建。数据源 = useFloatingLayer() -> config.worldShell.floatingLayers。
// 渲染每个 visible 浮层为可拖拽定位的玻璃面板，提供关闭/移除。
// 设计语言对齐《空间容器布局契约》：消费 --z-floating / --accent，禁裸 z-index。
// ============================================================
import { computed } from 'vue'
import { useFloatingLayer } from '../composables/useFloatingLayer'
import type { FloatingLayerState } from '../types'

const { layers, close, remove } = useFloatingLayer()

const visibleLayers = computed<FloatingLayerState[]>(() =>
  layers().filter((l) => l.visible),
)

function onClose(layer: FloatingLayerState) {
  close(layer.id)
}
function onRemove(layer: FloatingLayerState) {
  remove(layer.id)
}
</script>

<template>
  <div class="floating-layer-host" aria-live="polite">
    <section
      v-for="layer in visibleLayers"
      :key="layer.id"
      class="floating-layer"
      :style="{ left: (layer.x ?? 96) + 'px', top: (layer.y ?? 96) + 'px' }"
      role="dialog"
      :aria-label="layer.title || '浮层'"
    >
      <header class="fl-head">
        <span class="fl-title">{{ layer.title || '浮层' }}</span>
        <div class="fl-actions">
          <button class="fl-btn" type="button" title="关闭" aria-label="关闭浮层" @click="onClose(layer)">
            ✕
          </button>
          <button
            class="fl-btn fl-remove"
            type="button"
            title="移除实例"
            aria-label="移除浮层实例"
            @click="onRemove(layer)"
          >
            🗑
          </button>
        </div>
      </header>
      <div class="fl-body">
        <slot :name="layer.id" :layer="layer">
          <p v-if="layer.source" class="fl-source">来源 · {{ layer.source }}</p>
          <p v-else class="fl-empty">空浮层</p>
        </slot>
      </div>
    </section>
  </div>
</template>

<style scoped>
.floating-layer-host {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-floating);
}

.floating-layer {
  position: absolute;
  width: 320px;
  max-width: calc(100vw - 32px);
  pointer-events: auto;
  background: rgba(26, 22, 17, 0.72);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid rgba(212, 175, 116, 0.4);
  border-radius: 16px;
  box-shadow:
    0 14px 44px rgba(0, 0, 0, 0.38),
    0 0 0 1px rgba(212, 175, 116, 0.12) inset;
  color: #ece6da;
  overflow: hidden;
  animation: fl-in 0.22s ease-out;
}

@keyframes fl-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.fl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(212, 175, 116, 0.18);
  background: linear-gradient(180deg, rgba(212, 175, 116, 0.1), transparent);
}

.fl-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--accent, #d4af74);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fl-actions {
  display: flex;
  gap: 4px;
  flex: none;
}

.fl-btn {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #cbbfa9;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;
}
.fl-btn:hover {
  background: rgba(212, 175, 116, 0.16);
  color: var(--accent, #d4af74);
}
.fl-remove:hover {
  background: rgba(180, 80, 60, 0.22);
  color: #e8a08a;
}

.fl-body {
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.6;
  min-height: 48px;
}

.fl-source {
  margin: 0;
  color: #b9ad97;
}
.fl-empty {
  margin: 0;
  color: #8c8270;
  font-style: italic;
}
</style>
