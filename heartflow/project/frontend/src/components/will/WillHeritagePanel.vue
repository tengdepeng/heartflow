<template>
  <section class="will-panel" aria-label="遗志谱系">
    <div class="will-panel-head">
      <span class="will-panel-title">📜 遗志谱系</span>
      <span class="will-panel-sub">载体退休 · 传承留痕</span>
    </div>

    <!-- 谱系概览 -->
    <div class="will-block">
      <span class="will-block-label">谱系概览</span>
      <div class="will-stats">
        <div class="will-stat"><span class="will-stat-num">{{ allWills.length }}</span><span class="will-stat-label">遗志</span></div>
        <div class="will-stat"><span class="will-stat-num">{{ uninherited.length }}</span><span class="will-stat-label">待继承</span></div>
        <div class="will-stat"><span class="will-stat-num">{{ inherited.length }}</span><span class="will-stat-label">已传承</span></div>
        <div class="will-stat"><span class="will-stat-num">{{ heritageCount }}</span><span class="will-stat-label">传承级</span></div>
      </div>
      <EmptyState
        v-if="allWills.length === 0"
        :glow="false"
        icon="📜"
        title="尚无遗志"
        hint="载体退休时，其积累将凝结为遗志，等待新载体继承。"
        cta-label=""
      />
    </div>

    <!-- 遗志列表 -->
    <div class="will-block">
      <span class="will-block-label">遗志清单</span>
      <ul v-if="allWills.length" class="will-list">
        <li v-for="w in allWills" :key="w.id" class="will-item">
          <span class="will-item-body">
            <span class="will-item-name">{{ w.name }}</span>
            <span class="will-item-meta">
              {{ w.carrierSnapshot.name }} · 珠 {{ w.carrierSnapshot.finalBeadCount }}/{{ w.carrierSnapshot.maxBeads }} · 使用 {{ w.carrierSnapshot.usageCount }} 次 · {{ fmtDate(w.createdAt) }}
            </span>
            <span v-if="w.insights.length" class="will-item-meta">洞见 {{ w.insights.length }} 条</span>
          </span>
          <span class="will-badge" :style="{ color: gradeMeta(w.grade).color, borderColor: gradeMeta(w.grade).color + '55' }">{{ gradeMeta(w.grade).label }}</span>
          <span v-if="w.inheritedByCarrierId" class="will-chip">已继承</span>
          <button class="will-btn" @click="toggleChain(w.id)">{{ expandedId === w.id ? '收起' : '谱系' }}</button>
          <button class="will-btn danger" @click="removeWill(w.id)">删除</button>
        </li>
      </ul>
      <EmptyState
        v-else
        :glow="false"
        icon="📜"
        title="暂无遗志记录"
        hint="载体退休时，其积累将凝结为遗志。"
        cta-label=""
      />
    </div>

    <!-- 传承链 -->
    <div v-if="chain.length" class="will-block">
      <span class="will-block-label">传承链 · {{ chainTitle }}</span>
      <div class="will-chain">
        <template v-for="(w, i) in chain" :key="w.id">
          <span v-if="i > 0" class="will-chain-arrow">→</span>
          <span class="will-chain-node" :style="{ color: gradeMeta(w.grade).color }">{{ w.name }}</span>
        </template>
      </div>
    </div>

    <!-- 清空 -->
    <div v-if="allWills.length" class="will-row">
      <button class="will-btn danger" @click="clearAll">清空全部遗志</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useWill } from '../../modules/will'
import { WILL_GRADES } from '../../modules/will'
import type { WillGrade } from '../../modules/will'
import EmptyState from '../EmptyState.vue'

const willApi = useWill()
const expandedId = ref<string | null>(null)

const allWills = computed(() => willApi.allWills.value)
const uninherited = computed(() => willApi.uninheritedWills.value)
const inherited = computed(() => willApi.inheritedWills.value)
const heritageCount = computed(() => allWills.value.filter(w => w.grade === 'heritage').length)
const chain = computed(() => (expandedId.value ? willApi.getInheritanceChain(expandedId.value) : []))
const chainTitle = computed(() => {
  const w = allWills.value.find(x => x.id === expandedId.value)
  return w ? w.name : ''
})

function gradeMeta(grade: WillGrade) {
  return WILL_GRADES.find(g => g.value === grade) ?? WILL_GRADES[0]
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function toggleChain(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function removeWill(id: string) {
  willApi.remove(id)
  if (expandedId.value === id) expandedId.value = null
}

function clearAll() {
  willApi.clear()
  expandedId.value = null
}

onMounted(() => {
  willApi.load()
})
</script>

<style scoped src="./will-shared.css"></style>
