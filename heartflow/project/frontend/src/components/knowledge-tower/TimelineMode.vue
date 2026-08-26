<template>
    <!-- 时间线模式 -->
    <div data-enter class="kt-panel">
      <div v-for="(group,gid) in timelineGroups" :key="gid" class="kt-timeline-group">
        <span class="kt-tl-date">{{group.label}}</span>
        <div v-for="n in group.items" :key="n.id" class="kt-tl-item" @click="openEdit(n)">
          <span class="kt-tl-cat">{{catIcon(n.cat)}}</span><span>{{n.title}}</span>
        </div>
      </div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  timelineGroups,
  openEdit,
  catIcon,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
