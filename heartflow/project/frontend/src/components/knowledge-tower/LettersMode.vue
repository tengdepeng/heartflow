<template>
    <!-- 信笺模式 — 聊天信笺优雅展示 -->
    <div data-enter class="kt-panel">
      <div class="kt-letters-header">
        <span class="kl-header-icon">✉️</span>
        <h3 class="kl-header-title">聊天信笺</h3>
        <span class="kl-header-count">{{ chatSources.length }} 封</span>
      </div>
      <div v-if="chatSources.length" class="kt-letters-grid">
        <div v-for="s in chatSources" :key="s.id" class="kl-letter-card">
          <!-- 信封装饰 -->
          <div class="kl-envelope">
            <div class="kl-env-flap"></div>
            <div class="kl-env-body">
              <div class="kl-env-stamp">💮</div>
              <div class="kl-env-lines">
                <span class="kl-env-line"></span>
                <span class="kl-env-line kl-env-line--short"></span>
              </div>
            </div>
          </div>
          <div class="kl-letter-body">
            <div class="kl-letter-from">
              <span class="kl-letter-source">{{ s.sourceMeta?.source || '未知来源' }}</span>
              <span class="kl-letter-date">{{ formatImportDate(s.importedAt) }}</span>
            </div>
            <h4 class="kl-letter-title">{{ s.title }}</h4>
            <p class="kl-letter-content">{{ s.content }}</p>
          </div>
          <button class="kl-del-btn" @click.stop="deleteImportSource(s.id)" title="移除">×</button>
        </div>
      </div>
      <div v-else class="kt-empty">
        <span>✉️</span>
        <p>还没有聊天信笺</p>
        <p class="kt-empty-hint">通过「导入来源」导入聊天记录，它们会以信笺形式展示在这里</p>
      </div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  chatSources,
  formatImportDate,
  deleteImportSource,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
