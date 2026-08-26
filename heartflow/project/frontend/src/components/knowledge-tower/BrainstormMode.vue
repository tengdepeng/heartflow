<template>
    <!-- 头脑风暴 -->
    <div data-enter class="kt-panel">
      <div class="kt-storm-area">
        <div v-for="b in stormItems" :key="b.id" class="kt-storm-bubble" :style="{left:b.x+'%',top:b.y+'%'}" draggable="true">
          {{b.text}}
        </div>
      </div>
      <div class="kt-input-row">
        <input v-model="stormInput" placeholder="快速输入想法…" @keyup.enter="addStorm" class="kt-input"/>
        <button @click="addStorm" class="kt-btn">→</button>
        <button @click="convertStormToNodes" class="kt-btn" :disabled="!stormItems.length">转为节点</button>
      </div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  stormItems,
  stormInput,
  addStorm,
  convertStormToNodes,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
