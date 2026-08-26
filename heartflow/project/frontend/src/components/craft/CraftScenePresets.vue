<template>
    <section class="craft-section">
      <h2 class="section-label">
        <span class="section-label-icon">🎨</span>
        装修工坊 · 场景预设
      </h2>
      <p class="section-desc">将当前背景保存为场景预设，随时切换与恢复。</p>

      <!-- 保存当前场景 -->
      <div class="deco-save-form">
        <input
          v-model="presetNameInput"
          class="deco-input"
          type="text"
          placeholder="输入场景预设名称…"
          maxlength="24"
          @keyup.enter="handleSavePreset"
        />
        <button
          class="deco-btn deco-btn--primary"
          type="button"
          :disabled="!presetNameInput.trim()"
          @click="handleSavePreset"
        >
          保存当前场景
        </button>
      </div>

      <!-- 预设列表 -->
      <div v-if="scenePresets.length === 0" class="deco-empty">
        <span class="deco-empty-icon">🏗</span>
        <span class="deco-empty-text">尚未保存任何场景预设</span>
      </div>

      <div v-else class="deco-preset-grid">
        <div
          v-for="preset in scenePresets"
          :key="preset.id"
          class="deco-preset-card"
          :class="{ 'deco-preset-card--active': isActivePreset(preset) }"
        >
          <div class="deco-preset-header">
            <div class="deco-preset-scene-indicator" :class="sceneIndicatorClass(preset.background)">
              <span class="deco-preset-scene-icon">{{ sceneIndicatorIcon(preset.background) }}</span>
            </div>
            <div class="deco-preset-info">
              <!-- 编辑模式 -->
              <input
                v-if="renamingId === preset.id"
                v-model="renameInput"
                class="deco-input deco-input--inline"
                type="text"
                maxlength="24"
                @keyup.enter="handleRenameConfirm(preset.id)"
                @keyup.escape="renamingId = null"
                @blur="handleRenameConfirm(preset.id)"
                ref="renameInputRef"
              />
              <!-- 显示模式 -->
              <span v-else class="deco-preset-name">{{ preset.name }}</span>
              <span class="deco-preset-meta">{{ presetSceneLabel(preset.background) }}</span>
            </div>
          </div>

          <div class="deco-preset-actions">
            <button
              class="deco-btn deco-btn--sm deco-btn--apply"
              type="button"
              title="应用此场景"
              @click="handleApplyPreset(preset.id)"
            >
              应用
            </button>
            <button
              class="deco-btn deco-btn--sm deco-btn--rename"
              type="button"
              title="重命名"
              @click="startRenaming(preset)"
            >
              重命名
            </button>
            <button
              class="deco-btn deco-btn--sm deco-btn--delete"
              type="button"
              title="删除"
              @click="handleDeletePreset(preset.id)"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      <!-- 反馈消息 -->
      <p v-if="decoMessage" class="deco-message" :class="`deco-message--${decoMessageType}`">{{ decoMessage }}</p>
    </section>
</template>

<script setup lang="ts">
import { useCraftUi } from '../../modules/craft/useCraftUi'
const ui = useCraftUi()
const { scenePresets, presetNameInput, handleSavePreset, renamingId, renameInput, renameInputRef, handleRenameConfirm, handleApplyPreset, handleDeletePreset, startRenaming, isActivePreset, sceneIndicatorClass, sceneIndicatorIcon, presetSceneLabel, decoMessage, decoMessageType } = ui
</script>

<style scoped src="./craft-shared.css"></style>
