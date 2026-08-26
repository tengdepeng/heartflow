<template>
    <section class="craft-section">
      <h2 class="section-label">
        <span class="section-label-icon">✨</span>
        展架 · 光质形态
      </h2>
      <p class="section-desc">每件作品都承载着独特的光质，九种光质形态汇聚于此。</p>
      <div class="exhibition-shelf" :class="`exhibition-shelf--${shelfGlowLevel}`">
        <div
          v-for="form in lightForms"
          :key="form.id"
          class="light-form-badge"
          :style="{
            '--lf-accent': form.color,
            '--lf-glow': form.glowColor,
          }"
        >
          <div class="lf-glow-ring"></div>
          <span class="lf-icon">{{ form.icon }}</span>
          <span class="lf-name">{{ form.name }}</span>
          <span class="lf-desc">{{ form.description }}</span>
        </div>
      </div>
    </section>
</template>

<script setup lang="ts">
import { useCraftUi } from '../../modules/craft/useCraftUi'
const ui = useCraftUi()
const { lightForms, shelfGlowLevel } = ui
</script>

<style scoped src="./craft-shared.css"></style>
