<template>
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">{{ isEditing ? '编辑作品' : '新作品' }}</h3>
            <button class="modal-close" type="button" @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">名称</label>
              <input v-model="form.name" class="form-input" type="text" placeholder="作品名称" maxlength="60" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">图标</label>
                <input v-model="form.icon" class="form-input" type="text" placeholder="🔨" maxlength="4" />
              </div>
              <div class="form-group">
                <label class="form-label">颜色</label>
                <input v-model="form.color" class="form-input" type="text" placeholder="#b8a080" maxlength="7" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea v-model="form.description" class="form-textarea" placeholder="作品描述" rows="3"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">类型</label>
                <select v-model="form.type" class="form-select">
                  <option v-for="(label, key) in TYPE_LABEL" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">状态</label>
                <select v-model="form.status" class="form-select">
                  <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">关联光质</label>
              <select v-model="form.lightFormId" class="form-select">
                <option value="">无关联</option>
                <option v-for="lf in lightForms" :key="lf.id" :value="lf.id">{{ lf.icon }} {{ lf.name }} — {{ lf.description }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">进化程度 ({{ form.evolution }}%)</label>
              <input v-model.number="form.evolution" class="form-range" type="range" min="0" max="100" step="5" />
            </div>
            <div class="form-group">
              <label class="form-label">标签（逗号分隔）</label>
              <input v-model="form.tagsInput" class="form-input" type="text" placeholder="vue, 前端, 设计" />
            </div>
            <div class="form-group">
              <label class="form-label">日期</label>
              <input v-model="form.date" class="form-input" type="text" placeholder="2026-07" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="deco-btn" type="button" @click="closeModal">取消</button>
            <button class="deco-btn deco-btn--primary" type="button" :disabled="!form.name.trim()" @click="handleSaveWork">
              {{ isEditing ? '保存修改' : '创建作品' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup lang="ts">
import { useCraftUi } from '../../modules/craft/useCraftUi'
import { STATUS_LABEL, TYPE_LABEL } from '../../modules/craft/types'
const ui = useCraftUi()
const { showModal, isEditing, form, closeModal, handleSaveWork, lightForms } = ui
</script>

<style scoped src="./craft-shared.css"></style>
