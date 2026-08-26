<template>
    <!-- 书架模式 -->
    <div data-enter class="kt-panel">
      <div v-if="nodes.length" class="kt-bookshelf-wrap">
        <div class="kt-bookshelf-header">
          <span class="kt-bookshelf-icon">📚</span>
          <span>知识书架 · {{ nodes.length }} 册</span>
        </div>
        <div class="kt-bookshelf">
          <div v-for="cat in categories" :key="cat.key" class="kt-bookshelf-row" v-show="nodesByCat(cat.key).length > 0">
            <div class="kt-bookshelf-shelf-label">
              <span class="kt-bookshelf-cat-icon">{{ cat.icon }}</span>
              <span class="kt-bookshelf-cat-name">{{ cat.label }}</span>
              <span class="kt-bookshelf-cat-count">{{ nodesByCat(cat.key).length }} 册</span>
            </div>
            <div class="kt-bookshelf-shelf">
              <div class="kt-bookshelf-wood">
                <div class="kt-bookshelf-grain"></div>
              </div>
              <div class="kt-bookshelf-books">
                <div v-for="(n, i) in nodesByCat(cat.key)" :key="n.id"
                  class="kt-book"
                  :style="{
                    height: bookHeight(n),
                    background: bookColor(cat.key, i),
                    '--book-delay': (i * 0.05) + 's',
                  }"
                  @click="openEdit(n)"
                  :title="n.title + (n.desc ? ' — ' + n.desc : '')">
                  <span class="kt-book-spine"></span>
                  <span class="kt-book-title">{{ n.title.slice(0, 6) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="kt-empty"><span>📚</span><p>书架等待第一本书</p></div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  nodes,
  categories,
  nodesByCat,
  bookHeight,
  bookColor,
  openEdit,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
