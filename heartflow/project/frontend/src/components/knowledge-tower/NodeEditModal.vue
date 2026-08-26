<template>
    <!-- 编辑弹窗 -->
    <Teleport to="body"><Transition name="modal">
      <div v-if="showModal" class="kt-modal-overlay" @click.self="showModal=false">
        <div class="kt-modal-card">
          <h3>{{editing?'编辑':'新建'}}节点</h3>
          <input v-model="form.title" placeholder="标题" class="kt-form-input"/>
          <textarea v-model="form.desc" placeholder="核心内容…" class="kt-form-textarea" rows="3"/>
          <select v-model="form.cat" class="kt-select"><option value="concept">💡 概念</option><option value="rule">📏 法则</option><option value="frame">🔲 框架</option><option value="insight">✨ 直觉</option><option value="pitfall">⚠️ 误区</option><option value="metaphor">🎭 比喻</option></select>
          <div class="kt-modal-actions" style="justify-content:space-between;">
            <button class="kt-btn-relation" @click="openRelationEditor">🔗 关系</button>
            <div>
              <button class="kt-btn-cancel" @click="showModal=false">取消</button>
              <button class="kt-btn-save" @click="saveNode" :disabled="!form.title.trim()">保存</button>
            </div>
          </div>
        </div>
      </div>
    </Transition></Teleport>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  showModal,
  editing,
  form,
  openRelationEditor,
  saveNode,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
