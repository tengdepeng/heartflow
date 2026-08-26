<template>
    <!-- 导入来源模式 -->
    <div data-enter class="kt-panel">
      <div class="kt-import-toolbar">
        <span class="kt-import-label">已导入 {{ importSources.length }} 条内容</span>
        <button class="kt-btn" @click="showImportModal=true">📥 新导入</button>
      </div>
      <div v-if="importSources.length" class="kt-import-list">
        <div v-for="s in importSources" :key="s.id" class="kt-import-item">
          <span class="kt-import-type-icon">{{ IMPORT_SOURCE_ICONS[s.type] }}</span>
          <div class="kt-import-info">
            <span class="kt-import-title">{{ s.title }}</span>
            <span class="kt-import-meta" v-if="s.sourceMeta">
              <template v-if="s.type==='book' && s.sourceMeta.author">{{ s.sourceMeta.author }}</template>
              <template v-else-if="s.type==='web' && s.sourceMeta.url">{{ s.sourceMeta.url }}</template>
              <template v-else-if="s.type==='chat' && s.sourceMeta.source">{{ s.sourceMeta.source }}</template>
              <template v-else-if="s.type==='call' && s.sourceMeta.duration">{{ s.sourceMeta.duration }}</template>
            </span>
            <span class="kt-import-date">{{ formatImportDate(s.importedAt) }}</span>
          </div>
          <p class="kt-import-content">{{ s.content.slice(0, 80) }}{{ s.content.length > 80 ? '…' : '' }}</p>
          <button class="kt-del" @click.stop="deleteImportSource(s.id)">×</button>
        </div>
      </div>
      <div v-else class="kt-empty"><span>📥</span><p>还没有导入的内容，点击上方按钮开始导入</p></div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  importSources,
  showImportModal,
  IMPORT_SOURCE_ICONS,
  formatImportDate,
  deleteImportSource,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
