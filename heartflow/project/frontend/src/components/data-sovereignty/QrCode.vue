<template>
  <!-- SVG 由 qrcode-generator 从受控接续数据生成（仅令牌/设备/房间，零外网），非外部 HTML 注入 -->
  <div class="qr-code" role="img" :aria-label="ariaLabel" v-html="svg"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { qrToSvg } from '../../modules/data-sovereignty/qrcode'

const props = withDefaults(
  defineProps<{ value: string; size?: number; ariaLabel?: string }>(),
  { size: 168, ariaLabel: '二维码' },
)

const svg = computed(() => (props.value ? qrToSvg(props.value, props.size) : ''))
</script>

<style scoped>
.qr-code {
  display: inline-block;
  line-height: 0;
  padding: 8px;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.qr-code :deep(svg) {
  display: block;
}
</style>
