<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance prs">
    <!-- 装饰性顶部 -->
    <div class="header-ornament" data-enter>
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <div class="header-kicker" data-enter>插件贡献房间</div>

    <div class="prs-title-row" data-enter>
      <span class="prs-icon">{{ room?.icon ?? '🧩' }}</span>
      <h1 class="prs-title">{{ room?.name ?? '插件房间' }}</h1>
    </div>

    <p class="prs-desc" data-enter>
      {{ room?.description ?? '该房间由插件在运行时贡献，可直达访问、出现在侧栏与星盘导航中。' }}
    </p>

    <div class="prs-meta" data-enter>
      <div class="prs-meta-card">
        <span class="prs-meta-icon">🔌</span>
        <span class="prs-meta-label">来源插件</span>
        <span class="prs-meta-value">{{ pluginName ?? '未知插件' }}</span>
      </div>
      <div class="prs-meta-card">
        <span class="prs-meta-icon">🗺</span>
        <span class="prs-meta-label">所属组</span>
        <span class="prs-meta-value">{{ groupLabel }}</span>
      </div>
      <div class="prs-meta-card">
        <span class="prs-meta-icon">🧭</span>
        <span class="prs-meta-label">注册方式</span>
        <span class="prs-meta-value">room-graph 覆盖层 + router.addRoute</span>
      </div>
    </div>

    <div class="prs-adj" data-enter>
      <div class="prs-adj-title">邻接房间</div>
      <div v-if="adjacent.length" class="prs-adj-list">
        <button
          v-for="r in adjacent"
          :key="r.id"
          class="prs-adj-link"
          type="button"
          role="link"
          @click="go(r.path)"
        >
          <span class="prs-adj-icon">{{ r.icon }}</span>
          <span>{{ r.name }}</span>
        </button>
      </div>
      <p v-else class="prs-adj-empty">暂无邻接房间</p>
    </div>

    <div class="prs-note" data-enter>
      在插件管理器中停用或卸载来源插件后，本房间会从导航与路由中消失。
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRoom, getAdjacentRooms } from '../engine/room-graph'
import { safePush } from '@/utils/router-safe'
import { useViewEntrance } from '../composables/useViewEntrance'

defineOptions({ name: 'PluginRoomShell' })

const { entranceRef, entranceClass } = useViewEntrance()

const route = useRoute()
const router = useRouter()

const roomId = computed(() => route.meta.roomId as string | undefined)
const pluginName = computed(() => route.meta.pluginName as string | undefined)
const room = computed(() => (roomId.value ? getRoom(roomId.value) : undefined))
const adjacent = computed(() => (roomId.value ? getAdjacentRooms(roomId.value) : []))

const GROUP_LABELS: Record<string, string> = {
  gravity: '引力场',
  'main-path': '主链路',
  work: '工作',
  world: '世界',
  system: '系统',
  tool: '工具',
  supplement: '补充',
}

const groupLabel = computed(() => {
  const g = room.value?.group
  return g ? (GROUP_LABELS[g] ?? g) : '世界'
})

function go(path: string): void {
  safePush(router, path)
}
</script>

<style scoped>
.prs {
  max-width: 680px;
  margin: 0 auto;
  padding: 48px 20px 64px;
  color: var(--text-primary, #e8e0d0);
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
}
.orn-line {
  width: 56px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 165, 116, 0.6), transparent);
}
.orn-diamond {
  color: rgba(212, 165, 116, 0.85);
  font-size: 12px;
}

.header-kicker {
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: rgba(212, 165, 116, 0.65);
  margin-bottom: 10px;
}

.prs-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 18px;
}
.prs-icon {
  font-size: 30px;
}
.prs-title {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-primary, #e8e0d0);
  margin: 0;
}

.prs-desc {
  font-size: 14px;
  line-height: 1.8;
  color: rgba(232, 224, 208, 0.72);
  text-align: center;
  max-width: 520px;
  margin: 0 auto 28px;
}

.prs-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.prs-meta-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.prs-meta-icon {
  font-size: 22px;
}
.prs-meta-label {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(232, 224, 208, 0.5);
}
.prs-meta-value {
  font-size: 13px;
  color: rgba(232, 224, 208, 0.85);
  text-align: center;
}

.prs-adj {
  margin-bottom: 24px;
}
.prs-adj-title {
  font-size: 12px;
  letter-spacing: 0.14em;
  color: rgba(232, 224, 208, 0.5);
  margin-bottom: 10px;
  text-align: center;
}
.prs-adj-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.prs-adj-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(212, 165, 116, 0.22);
  background: rgba(212, 165, 116, 0.06);
  color: rgba(232, 224, 208, 0.82);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}
.prs-adj-link:hover {
  border-color: rgba(212, 165, 116, 0.45);
  background: rgba(212, 165, 116, 0.12);
  color: #fff;
}
.prs-adj-icon {
  font-size: 15px;
}
.prs-adj-empty {
  text-align: center;
  font-size: 12px;
  color: rgba(232, 224, 208, 0.4);
}

.prs-note {
  font-size: 12px;
  line-height: 1.7;
  color: rgba(232, 224, 208, 0.55);
  text-align: center;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(212, 165, 116, 0.06);
  border: 1px dashed rgba(212, 165, 116, 0.25);
}
</style>
