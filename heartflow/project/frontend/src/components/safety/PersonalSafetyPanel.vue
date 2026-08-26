<template>
  <div data-enter class="safety-panel personal-safety-panel">
    <div class="panel-header">
      <span class="panel-icon">&#x1F465;</span>
      <div>
        <h4 class="panel-title">人身安全</h4>
        <p class="panel-desc">紧急联系人管理、位置共享与健康数据</p>
      </div>
    </div>

    <div class="panel-body">
      <!-- 紧急联系人列表 -->
      <div class="panel-section">
        <h5 class="section-title">紧急联系人</h5>

        <div class="contact-list" v-if="contacts.length">
          <div
            v-for="c in contacts"
            :key="c.id"
            class="contact-row"
          >
            <span class="contact-priority" :class="c.priority">
              {{ c.priority === 'primary' ? '&#x2B50;' : '&#x1F539;' }}
            </span>
            <template v-if="editingContactId === c.id">
              <input v-model="editForm.name" class="panel-input" placeholder="姓名" />
              <input v-model="editForm.phone" class="panel-input" placeholder="电话" />
              <button class="panel-btn sm" @click="saveEdit(c.id)">保存</button>
              <button class="panel-btn sm" @click="cancelEdit">取消</button>
            </template>
            <template v-else>
              <span class="contact-name">{{ c.name }}</span>
              <span class="contact-phone">{{ c.phone }}</span>
              <span class="contact-tag">{{ c.priority === 'primary' ? '主要' : '备用' }}</span>
              <button class="contact-action" @click="startEdit(c)">&#x270E;</button>
              <button class="contact-action" @click="removeContact(c.id)">&#x00D7;</button>
            </template>
          </div>
        </div>
        <p v-else class="empty-hint">暂无紧急联系人，请在下方添加</p>

        <!-- 添加联系人 -->
        <div class="add-row">
          <input v-model="contactForm.name" placeholder="姓名" class="panel-input" />
          <input v-model="contactForm.phone" placeholder="电话" class="panel-input" />
          <select v-model="contactForm.priority" class="panel-select">
            <option value="primary">&#x2B50; 主要</option>
            <option value="secondary">&#x1F539; 备用</option>
          </select>
          <button
            class="panel-btn primary"
            @click="addContact"
            :disabled="!contactForm.name.trim() || !contactForm.phone.trim()"
          >
            + 添加
          </button>
        </div>
      </div>

      <!-- 位置共享 -->
      <div class="setting-row">
        <span class="setting-label">位置共享</span>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="personalSafety.locationSharingEnabled"
            @change="toggleLocationSharing"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 健康数据 -->
      <div class="setting-row">
        <span class="setting-label">健康数据</span>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="personalSafety.healthDataEnabled"
            @change="toggleHealthData"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useViewEntrance } from '../../composables/useViewEntrance'
import { getSafetyConfig, updatePersonalSafety } from '../../modules/safety'
import { storage } from '../../engine/storage'
import type { EmergencyContact } from '../../modules/safety/types'

useViewEntrance()

const CONTACTS_KEY = 'hf:contacts'

const config = getSafetyConfig()
const personalSafety = computed(() => config.value.personalSafety)

// 联系人管理
const contacts = ref<EmergencyContact[]>(loadContacts())

function loadContacts(): EmergencyContact[] {
  try {
    return storage.getKV<EmergencyContact[]>(CONTACTS_KEY, [])
  } catch {
    return []
  }
}

function saveContacts() {
  storage.setKV(CONTACTS_KEY, contacts.value)
  // 同步到安全配置
  updatePersonalSafety({ emergencyContacts: contacts.value })
}

const contactForm = reactive({
  name: '',
  phone: '',
  priority: 'primary' as 'primary' | 'secondary',
})

function addContact() {
  const name = contactForm.name.trim()
  const phone = contactForm.phone.trim()
  if (!name || !phone) return

  contacts.value.push({
    id: `c${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    phone,
    priority: contactForm.priority,
  })
  saveContacts()
  contactForm.name = ''
  contactForm.phone = ''
}

// 编辑联系人
const editingContactId = ref<string | null>(null)
const editForm = reactive({ name: '', phone: '', priority: 'primary' as 'primary' | 'secondary' })

function startEdit(c: EmergencyContact) {
  editingContactId.value = c.id
  editForm.name = c.name
  editForm.phone = c.phone
  editForm.priority = c.priority
}

function saveEdit(id: string) {
  const c = contacts.value.find(item => item.id === id)
  if (c) {
    c.name = editForm.name
    c.phone = editForm.phone
    c.priority = editForm.priority
    saveContacts()
  }
  editingContactId.value = null
}

function cancelEdit() {
  editingContactId.value = null
}

function removeContact(id: string) {
  contacts.value = contacts.value.filter(c => c.id !== id)
  saveContacts()
}

// 开关
function toggleLocationSharing(e: Event) {
  updatePersonalSafety({ locationSharingEnabled: (e.target as HTMLInputElement).checked })
}

function toggleHealthData(e: Event) {
  updatePersonalSafety({ healthDataEnabled: (e.target as HTMLInputElement).checked })
}
</script>

<style scoped>
.personal-safety-panel {
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border, rgba(var(--accent-rgb), 0.12));
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
  transition: all var(--transition, 0.25s ease);
}

.personal-safety-panel:hover {
  background: var(--bg-card-hover, rgba(55, 48, 40, 0.7));
  border-color: rgba(var(--accent-rgb), 0.18);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}

.panel-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.75);
  margin: 0 0 4px;
}

.panel-desc {
  font-size: 11px;
  color: var(--text-low);
  margin: 0;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel-section {
  margin-bottom: 6px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-medium);
  margin: 0 0 10px;
  letter-spacing: 0.3px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.65);
}

.setting-label {
  flex: 1;
}

/* 联系人列表 */
.contact-list {
  margin-bottom: 10px;
}

.contact-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  margin-bottom: 4px;
  font-size: 13px;
  transition: all 0.2s;
}

.contact-row:hover {
  background: rgba(55, 48, 40, 0.45);
}

.contact-row:hover .contact-action {
  opacity: 1;
}

.contact-priority {
  font-size: 12px;
  flex-shrink: 0;
}

.contact-name {
  color: rgba(var(--text-primary-rgb), 0.75);
  min-width: 60px;
}

.contact-phone {
  color: rgba(var(--text-primary-rgb), 0.45);
  flex: 1;
  text-align: right;
}

.contact-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent, #d4a574);
}

.contact-action {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.15);
  cursor: pointer;
  opacity: 0;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.contact-action:hover {
  background: rgba(255, 107, 107, 0.15);
  color: var(--danger);
}

.empty-hint {
  font-size: 12px;
  color: var(--text-low);
  margin: 8px 0;
}

/* 添加行 */
.add-row {
  display: flex;
  gap: 6px;
}

.panel-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 10px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.panel-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.panel-input::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}

.panel-select {
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 10px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.panel-select:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.panel-btn {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.panel-btn.primary {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent, #d4a574);
}

.panel-btn.primary:hover {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.panel-btn.primary:disabled {
  opacity: 0.35;
  cursor: default;
}

.panel-btn.sm {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 8px;
  background: var(--card-bg);
  border-color: rgba(var(--accent-rgb), 0.1);
  color: var(--text-secondary);
}

.panel-btn.sm:hover {
  background: rgba(55, 48, 40, 0.5);
}

/* Toggle 开关 */
.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 11px;
  transition: 0.3s;
  cursor: pointer;
}

.toggle input:checked + .toggle-slider {
  background: var(--accent, #d4a574);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(18px);
}
</style>