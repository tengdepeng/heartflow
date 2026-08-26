<template>
    <!-- 深度追问 -->
    <div data-enter class="kt-panel">
      <div v-if="activeNode" class="kt-socratic-area">
        <h4>追问：{{activeNode.title}}</h4>
        <div class="kt-socratic-question">
          <button v-for="q in socraticQuestions" :key="q" @click="socraticAnswer=q" class="kt-socratic-btn">{{q}}</button>
        </div>
        <div v-if="socraticAnswer" class="kt-socratic-answer"><p>{{socraticAnswer}}</p></div>
      </div>
      <p v-else class="kt-empty">选择一个节点开始追问</p>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  activeNode,
  socraticQuestions,
  socraticAnswer,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
