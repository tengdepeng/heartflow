<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRewardMilestones } from '@/modules/reward/milestones'

const props = defineProps<{ bridge: ReturnType<typeof useRewardMilestones> }>()

const milestones = computed(() => props.bridge.milestones?.value ?? [])
const achievedCount = computed(() => milestones.value.filter(m => m.achieved).length)

onMounted(() => { props.bridge.load() })
</script>

<template>
  <section class="rmp">
    <h3 class="rmp-title">🏆 里程碑</h3>
    <p class="rmp-sub">已达成 {{ achievedCount }} / {{ milestones.length }}</p>

    <ul v-if="milestones.length" class="rmp-list">
      <li
        v-for="m in milestones"
        :key="m.id"
        class="rmp-item"
        :class="{ 'rmp-item--done': m.achieved }"
      >
        <div class="rmp-item__head">
          <span class="rmp-item__name">{{ m.title }}</span>
          <span class="rmp-item__state">{{ m.achieved ? '已达成' : '进行中' }}</span>
        </div>
        <p class="rmp-item__desc">{{ m.description }}</p>
      </li>
    </ul>
    <p v-else class="rmp-empty">暂无里程碑</p>
  </section>
</template>

<style scoped>
.rmp {
  padding: calc(var(--hf-radius) * 0.8);
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  color: var(--hf-text);
}
.rmp-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: var(--hf-primary);
}
.rmp-sub {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--hf-text-muted);
}
.rmp-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.rmp-item {
  padding: 8px 10px;
  margin-bottom: 6px;
  background: var(--hf-bg);
  border: 1px solid var(--hf-border);
  border-radius: calc(var(--hf-radius) * 0.5);
}
.rmp-item--done {
  border-color: var(--hf-primary);
}
.rmp-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.rmp-item__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--hf-text);
}
.rmp-item__state {
  font-size: 11px;
  color: var(--hf-text-muted);
}
.rmp-item--done .rmp-item__state {
  color: var(--hf-primary);
}
.rmp-item__desc {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--hf-text-muted);
}
.rmp-empty {
  margin: 0;
  font-size: 12px;
  color: var(--hf-text-muted);
}
</style>
