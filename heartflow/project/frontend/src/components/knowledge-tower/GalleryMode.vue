<template>
    <!-- 画廊模式 -->
    <div data-enter class="kt-panel">
      <div v-if="nodes.length" class="kt-gallery-wrap">
        <div class="kt-gallery-header">
          <span class="kt-gallery-icon">🖼</span>
          <span>知识画廊 · {{ nodes.length }} 幅</span>
        </div>
        <div class="kt-gallery-grid">
          <div v-for="n in nodes" :key="n.id" class="kt-gallery-card" @click="openEdit(n)">
            <div class="kt-gallery-frame">
              <div class="kt-gallery-canvas" :style="{ background: catColor(n.cat) + '10', borderColor: catColor(n.cat) + '20' }">
                <span class="kt-gallery-cat-icon">{{ catIcon(n.cat) }}</span>
                <span class="kt-gallery-cat-label">{{ catLabel(n.cat) }}</span>
              </div>
              <div class="kt-gallery-matte">
                <h4 class="kt-gallery-title">{{ n.title }}</h4>
                <p class="kt-gallery-desc" v-if="n.desc">{{ n.desc.slice(0, 50) }}{{ n.desc.length > 50 ? '…' : '' }}</p>
                <div class="kt-gallery-meta">
                  <span class="kt-gallery-links" v-if="computedRelations.filter(r => r.sourceId === n.id || r.targetId === n.id).length">
                    {{ computedRelations.filter(r => r.sourceId === n.id || r.targetId === n.id).length }} 关联
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="kt-empty"><span>🖼</span><p>画廊等待第一幅作品</p></div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  nodes,
  catColor,
  catIcon,
  catLabel,
  computedRelations,
  openEdit,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
