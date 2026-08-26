<template>
    <!-- 磁带模式 — 通话磁带可视化 -->
    <div data-enter class="kt-panel">
      <div class="kt-tapes-header">
        <span class="kt-header-icon">📼</span>
        <h3 class="kt-header-title">通话磁带</h3>
        <span class="kt-header-count">{{ callSources.length }} 卷</span>
      </div>
      <div v-if="callSources.length" class="kt-tapes-grid">
        <div v-for="s in callSources" :key="s.id" class="kt-tape-card">
          <!-- 磁带可视化 -->
          <div class="kt-tape-visual">
            <div class="kt-tape-reel kt-tape-reel--left">
              <div class="kt-reel-hole"></div>
            </div>
            <div class="kt-tape-reel kt-tape-reel--right">
              <div class="kt-reel-hole"></div>
            </div>
            <div class="kt-tape-band">
              <svg viewBox="0 0 80 20" class="kt-tape-wave">
                <rect x="0" y="8" width="80" height="4" rx="2" fill="rgba(var(--accent-rgb), 0.15)" />
                <path :d="tapeWavePath(s.id)" fill="none" stroke="rgba(var(--accent-rgb), 0.4)" stroke-width="1.5" />
              </svg>
            </div>
            <div class="kt-tape-label">VOICE</div>
          </div>
          <div class="kt-tape-body">
            <div class="kt-tape-meta">
              <span class="kt-tape-duration" v-if="s.sourceMeta?.duration">{{ s.sourceMeta.duration }}</span>
              <span class="kt-tape-date">{{ formatImportDate(s.importedAt) }}</span>
            </div>
            <h4 class="kt-tape-title">{{ s.title }}</h4>
            <p class="kt-tape-content">{{ s.content.slice(0, 100) }}{{ s.content.length > 100 ? '…' : '' }}</p>
          </div>
          <button class="kl-del-btn" @click.stop="deleteImportSource(s.id)" title="移除">×</button>
        </div>
      </div>
      <div v-else class="kt-empty">
        <span>📼</span>
        <p>还没有通话磁带</p>
        <p class="kt-empty-hint">通过「导入来源」导入通话记录，它们会以磁带形式展示在这里</p>
      </div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  callSources,
  tapeWavePath,
  formatImportDate,
  deleteImportSource,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
