<template>
  <!-- 桌面小组件管理页：从首页主窗移出后的「选组件 / 排布」唯一编辑面。
       常驻展示只发生在系统桌面（Tauri 置顶浮窗 / 安卓原生 widget）。
       WidgetBox 内的卡片即真实系统 widget 的同源预览。 -->
  <div class="widgets-manage">
    <WidgetBox />
  </div>
</template>

<script setup lang="ts">
import WidgetBox from '../components/WidgetBox.vue'
</script>

<style scoped>
.widgets-manage {
  padding: 20px 22px 32px;
  max-width: 1000px;
  margin: 0 auto;
  min-height: 100%;
}
</style>
