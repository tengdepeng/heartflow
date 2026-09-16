<template>
  <header class="room-header" :class="{ 'room-header--bare': !ornament }">
    <!-- 面包屑（可选）。传入 breadcrumb 数组时渲染，或完全用 #breadcrumb 插槽自定义 -->
    <nav v-if="breadcrumb && breadcrumb.length" class="rh-breadcrumb" aria-label="breadcrumb">
      <template v-for="(b, i) in breadcrumb" :key="i">
        <button
          v-if="b.to !== undefined"
          type="button"
          class="rh-crumb"
          @click="$emit('navigate', b)"
        >
          <span v-if="b.icon" class="rh-crumb-icon" aria-hidden="true">{{ b.icon }}</span
          ><span>{{ b.label }}</span>
        </button>
        <span v-else class="rh-crumb rh-crumb--current"
          ><span v-if="b.icon" class="rh-crumb-icon" aria-hidden="true">{{ b.icon }}</span
          ><span>{{ b.label }}</span></span
        >
        <span v-if="i < breadcrumb.length - 1" class="rh-crumb-sep" aria-hidden="true">›</span>
      </template>
    </nav>
    <slot name="breadcrumb" />

    <!-- 主行：装饰 / 标题组 / 操作 -->
    <div class="rh-main">
      <slot name="ornament">
        <span v-if="ornament" class="rh-ornament" aria-hidden="true">
          <span class="rh-orn-line" />
          <span class="rh-orn-diamond" />
          <span class="rh-orn-line" />
        </span>
      </slot>

      <div class="rh-titles">
        <p v-if="kicker || $slots.kicker" class="rh-kicker"><slot name="kicker">{{ kicker }}</slot></p>
        <h1 class="rh-title"><slot name="title">{{ title }}</slot></h1>
        <p v-if="subtitle || $slots.subtitle" class="rh-subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>

      <div v-if="$slots.actions" class="rh-actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- 次级内容（版本/元信息/概述卡片等），由各房通过 #meta 插槽注入 -->
    <slot name="meta" />
  </header>
</template>

<script setup lang="ts">
export interface BreadcrumbItem {
  label: string
  to?: string
  icon?: string
}

withDefaults(
  defineProps<{
    title?: string
    kicker?: string
    subtitle?: string
    breadcrumb?: BreadcrumbItem[]
    ornament?: boolean
  }>(),
  { title: '', kicker: '', subtitle: '', breadcrumb: undefined, ornament: true },
)

defineEmits<{ (e: 'navigate', item: BreadcrumbItem): void }>()
</script>

<!-- 全局类名（rh-*），便于各房在自己的 scoped <style> 中用 :deep() 接管视觉，保留房间美学 -->
<style>
.room-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
}
.rh-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 1.4;
}
.rh-crumb {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  background: none;
  border: none;
  font: inherit;
  color: var(--text-secondary);
  cursor: pointer;

  min-height: 26px;
}
.rh-crumb:hover {
  color: var(--accent);
}
.rh-crumb--current {
  color: var(--text-primary);
  cursor: default;
}
.rh-crumb-icon {
  font-size: 13px;
  line-height: 1;
}
.rh-crumb-sep {
  color: var(--text-faint);
}
.rh-main {
  display: flex;
  align-items: center;
  gap: 16px;
}
.rh-ornament {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.rh-orn-line {
  width: 28px;
  height: 1px;
  background: var(--accent);
  opacity: 0.4;
}
.rh-orn-diamond {
  width: 6px;
  height: 6px;
  transform: rotate(45deg);
  background: var(--accent);
}
.rh-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
}
.rh-kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-faint);
}
.rh-title {
  margin: 0;
  font-size: clamp(20px, 3vw, 30px);
  font-weight: 600;
  line-height: 1.15;
  color: var(--text-primary);
}
.rh-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.rh-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}
</style>
