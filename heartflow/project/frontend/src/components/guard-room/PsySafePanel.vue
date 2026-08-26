<template>
  <div data-enter class="guard-tab-content">
    <!-- 心理安全光笺 -->
    <section class="guard-section">
      <h3 class="section-label">心理安全光笺</h3>
      <p class="setting-hint">当你感到难以承受时，这里有一封安静的信。</p>
      <button class="light-letter-btn" @click="showLetter=!showLetter">{{ showLetter?'收起':'打开光笺' }}</button>
      <div v-if="showLetter" class="light-letter">
        <p>如果你现在很难受，不用说话，不用解释。</p>
        <p>点一下这里，会有人陪着你。</p>
        <p class="letter-phone">全国心理援助热线：400-161-9995</p>
        <div class="letter-options">
          <button class="letter-opt" @click="showLetter=false">再坐一会儿</button>
        </div>
      </div>
    </section>

    <!-- 幕僚顾问 -->
    <section class="guard-section">
      <h3 class="section-label">幕僚顾问</h3>
      <div class="setting-row">
        <span>顾问弹窗</span>
        <label class="toggle"><input type="checkbox" v-model="advisorEnabled" /><span class="toggle-slider" /></label>
      </div>
      <p class="setting-hint">关闭后，幕僚不会弹出任何对话，专注时也不会有提醒。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfig } from '../../resonance/bridges/config'

const configBridge = useConfig()
const advisorEnabled = computed({
  get: () => configBridge.config.advisorEnabled,
  set: (v: boolean) => configBridge.updateAdvisorEnabled(v),
})

const showLetter = ref(false)
</script>

<style scoped src="./guard-shared.css"></style>
