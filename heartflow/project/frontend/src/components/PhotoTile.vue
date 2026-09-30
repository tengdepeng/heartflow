<script setup lang="ts">
// ============================================================
// 照片瓷砖 · 统一玻璃拟态图片组件
// ------------------------------------------------------------
// 「照片墙玻璃拟态统一（P2）」的核心交付：所有照片展示位（长廊 / 照片墙 /
// 相册封面）共用此组件，保证视觉语言与幕僚球（MirrorSelf .ms-orb）/
// 玉珠（JadeBead .bead-glass）完全同源——同一套层叠渐变 + 1px 亮边 +
// backdrop-filter + 内阴影高光组 + 外投影配方。
//
// 同时统一「懒加载」：默认 loading="lazy"，避免长照片墙一次性解码全部图。
// 宪法第1条「本地私有」：图片仅来自本地 dataURL，组件不触网。
// ============================================================

withDefaults(
  defineProps<{
    /** 图片源（通常来自本地降采样后的 dataURL） */
    src: string
    /** 无障碍替代文本 */
    alt?: string
    /** 是否懒加载（默认 true） */
    lazy?: boolean
    /** 圆角档：sm=8px，md=12px（默认 sm） */
    rounded?: 'sm' | 'md'
  }>(),
  { lazy: true, rounded: 'sm' },
)
</script>

<template>
  <figure class="hf-photo" :class="rounded === 'md' ? 'hf-photo--md' : 'hf-photo--sm'">
    <img
      class="hf-photo__img"
      :src="src"
      :alt="alt || ''"
      :loading="lazy === false ? 'eager' : 'lazy'"
      :draggable="false"
    />
    <!-- 玻璃上缘高光（与 .bgl-spec 同源，pointer-events:none 不挡交互） -->
    <span class="hf-photo__sheen" aria-hidden="true"></span>
  </figure>
</template>

<style scoped>
.hf-photo {
  position: relative;
  margin: 0;
  display: block;
  overflow: hidden;
  /* 与 MirrorSelf .ms-orb / JadeBead .bead-glass 完全同源的净透琉璃配方 */
  border: 1px solid rgba(255, 255, 255, 0.4);
  background:
    linear-gradient(178deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.07) 24%, rgba(255, 255, 255, 0) 44%),
    radial-gradient(ellipse 80% 32% at 50% 97%, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0) 74%),
    radial-gradient(circle at 74% 66%, rgba(150, 176, 216, 0.15), rgba(150, 176, 216, 0) 58%),
    radial-gradient(circle at 40% 34%, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.025) 56%, rgba(255, 255, 255, 0.008) 100%);
  backdrop-filter: blur(3px) saturate(1.5) brightness(1.08);
  -webkit-backdrop-filter: blur(3px) saturate(1.5) brightness(1.08);
  box-shadow:
    inset 0 1px 1.5px rgba(255, 255, 255, 0.78),
    inset 2px 3px 7px rgba(255, 255, 255, 0.28),
    inset -3px -4px 10px rgba(142, 172, 216, 0.2),
    inset 0 -2px 5px rgba(255, 255, 255, 0.22),
    0 4px 14px rgba(4, 8, 16, 0.3);
}
.hf-photo--sm { border-radius: 8px; }
.hf-photo--md { border-radius: 12px; }

.hf-photo__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 上缘锐高光 + 柔光斑（玻璃第一高光，与 .bgl-spec 同源） */
.hf-photo__sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(ellipse 24% 15% at 30% 21%, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0) 72%),
    radial-gradient(ellipse 38% 20% at 34% 29%, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 76%);
}
</style>
