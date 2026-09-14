<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  searchFeatures,
  pickDirectJump,
  getFeatureEntries,
  type FeatureHit,
} from '@/modules/advisor/featureDictionary'

const router = useRouter()
const query = ref('')

const hits = computed<FeatureHit[]>(() =>
  query.value.trim().length >= 2 ? searchFeatures(query.value) : [],
)
const direct = computed<FeatureHit | null>(() =>
  query.value.trim().length >= 2 ? pickDirectJump(query.value, hits.value) : null,
)
// 推荐直达：取词典前若干项作为快捷入口（消费引擎运行时生成，非硬编码）
const recommended = computed(() => getFeatureEntries().slice(0, 6))

function go(route: string) {
  router.push(route).catch(() => {
    // 未知/非法路由静默忽略，避免 Vue Router 抛未处理错误
  })
}
function onDirect() {
  if (direct.value) go(direct.value.route)
}
function onChip(entry: { route: string }) {
  go(entry.route)
}
</script>

<template>
  <section class="fs">
    <h3 class="fs-title">功能直达</h3>
    <p class="fs-hint">说不出功能叫什么？输入关键词，直达真实存在的空间。</p>
    <input
      v-model="query"
      class="fs-input"
      type="text"
      placeholder="想找什么？比如：记账、花房、设置"
    />
    <div class="fs-chips">
      <button
        v-for="entry in recommended"
        :key="entry.route"
        class="fs-chip"
        type="button"
        @click="onChip(entry)"
      >
        {{ entry.name }}
      </button>
    </div>

    <div v-if="direct" class="fs-direct">
      <span class="fs-direct-text">直达：{{ direct.name }}</span>
      <button class="fs-btn--direct" type="button" @click="onDirect">前往</button>
    </div>
    <ul v-else-if="hits.length" class="fs-suggest">
      <li v-for="hit in hits" :key="hit.route" class="fs-suggest__item">
        {{ hit.name }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.fs {
  padding: calc(var(--hf-radius) * 0.8);
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  color: var(--hf-text);
}
.fs-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--hf-primary);
}
.fs-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--hf-text-muted);
}
.fs-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--hf-text);
  background: var(--hf-bg);
  border: 1px solid var(--hf-border);
  border-radius: calc(var(--hf-radius) * 0.6);
  outline: none;
}
.fs-input:focus {
  border-color: var(--hf-primary);
}
.fs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.fs-chip {
  padding: 5px 12px;
  font-size: 12px;
  color: var(--hf-text);
  background: var(--hf-bg);
  border: 1px solid var(--hf-border);
  border-radius: 999px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.fs-chip:hover {
  border-color: var(--hf-primary);
  color: var(--hf-primary);
}
.fs-direct {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--hf-bg);
  border: 1px solid var(--hf-primary);
  border-radius: calc(var(--hf-radius) * 0.6);
}
.fs-direct-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--hf-primary);
}
.fs-btn--direct {
  padding: 6px 16px;
  font-size: 13px;
  color: #fff;
  background: var(--hf-primary);
  border: none;
  border-radius: calc(var(--hf-radius) * 0.6);
  cursor: pointer;
}
.fs-suggest {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.fs-suggest__item {
  padding: 6px 10px;
  font-size: 13px;
  color: var(--hf-text-muted);
}
</style>
