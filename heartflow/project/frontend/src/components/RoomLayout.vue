<template>
  <div class="room-layout" :class="[`room-layout--${effSize}`, { 'room-layout--bare': bare }]">
    <!-- 统一房间头：复用现有 RoomHeader（全局 rh-* 类），各房间不再各自包裹 *-room-header -->
    <RoomHeader
      :title="title"
      :kicker="effKicker"
      :subtitle="subtitle"
      :breadcrumb="breadcrumb"
      :ornament="effOrnament"
      :align="effAlign"
      @navigate="(b) => $emit('navigate', b)"
    >
      <template v-if="$slots.breadcrumb" #breadcrumb><slot name="breadcrumb" /></template>
      <template v-if="$slots.ornament" #ornament><slot name="ornament" /></template>
      <template v-if="$slots.kicker" #kicker><slot name="kicker" /></template>
      <template v-if="$slots.title" #title><slot name="title" /></template>
      <template v-if="$slots.subtitle" #subtitle><slot name="subtitle" /></template>
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>
      <template v-if="$slots.meta" #meta><slot name="meta" /></template>
    </RoomHeader>

    <!-- 统一内容区：单一标准内边距，与壳层 .main-content 滚动契约一致 -->
    <div class="room-layout__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import RoomHeader, { type BreadcrumbItem } from './RoomHeader.vue'
import { useRoomShellAppearance } from '../modules/customization/useRoomShellAppearance'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 房间标题（传 title 或 #title 插槽） */
    title?: string
    /** 眉标（大写小字，如「向内 · 身体」） */
    kicker?: string
    /** 副标题 / 一句话描述 */
    subtitle?: string
    /** 面包屑 */
    breadcrumb?: BreadcrumbItem[]
    /** 是否显示装饰菱形（默认跟随全局；显式传即覆盖全局） */
    ornament?: boolean
    /** 标题尺寸：hero 用于房间首屏大标题，替代各视图 bespoke :deep(.rh-title) 字号覆写（默认跟随全局） */
    size?: 'default' | 'hero'
    /** 标题组对齐：left / center（默认跟随全局） */
    align?: 'left' | 'center'
    /** 极简模式：去掉内容区额外留白（如嵌入浮层时） */
    bare?: boolean
  }>(),
  {
    title: '',
    kicker: undefined,
    subtitle: '',
    breadcrumb: undefined,
    ornament: undefined,
    size: undefined,
    align: undefined,
    bare: false,
  },
)

defineEmits<{ (e: 'navigate', item: BreadcrumbItem): void }>()

// ---- 统一房间壳层外观（宪法第二条 · 超级自定义）----
// 全局默认（useRoomShellAppearance）+ 单房间可覆盖（房间显式传 prop 即覆盖全局）。
// 房间未传时回落到全局默认，使「全局外观编辑器」一处改动、所有房间即时生效。
const shell = useRoomShellAppearance()
const effOrnament = computed(() => props.ornament ?? shell.ornament.value)
const effKicker = computed(() =>
  props.kicker !== undefined ? props.kicker : shell.showKicker.value ? '' : undefined,
)
const effSize = computed(() => props.size ?? shell.titleScale.value)
const effAlign = computed(() => props.align ?? shell.headerAlign.value)
</script>

<style scoped>
.room-layout {
  display: flex;
  flex-direction: column;
  /* 视图根高用 min-height:100%（禁 HARD height:100vh），滚动交给壳层 .main-content */
  min-height: 100%;
  /* 移动端关键：允许整房在交叉轴收缩到视口宽，避免被子项 min-content 撑爆（修 .room-layout__body 整房溢出） */
  min-width: 0;
}

.room-layout__body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* 统一内容内边距：所有房间一致。可用 --room-content-pad 在主题层整体覆盖 */
  padding: var(--room-content-pad, 24px);
  /* 移动端关键：允许内容区在交叉轴收缩到视口宽，避免整房被子项 min-content 撑爆（修 .room-layout__body 溢出） */
  min-width: 0;
}

.room-layout--bare .room-layout__body {
  padding: 0;
}

/* hero：首屏大标题，集中管理字号/字距，取代各视图 :deep(.rh-title) 发散覆写 */
.room-layout--hero :deep(.rh-title) {
  font-size: clamp(28px, 4vw, 40px);
  letter-spacing: 4px;
}

@media (max-width: 640px) {
  .room-layout__body {
    padding: 16px;
    gap: 16px;
  }
}
</style>
