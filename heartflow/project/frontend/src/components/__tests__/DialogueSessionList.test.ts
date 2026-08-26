import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function seedSessions(sessions: any[]) {
  const storage = (globalThis as any).localStorage
  const schema = { version: 10, kvStore: { 'hf:mirror_sessions': sessions } }
  storage.setItem('heartflow:storage', JSON.stringify(schema))
}

async function mountPanel(sessions: any[]) {
  vi.resetModules()
  const storage = createMockStorage()
  ;(globalThis as any).localStorage = storage
  invalidateCache()
  seedSessions(sessions)
  const mod = await import('../DialogueSessionList.vue')
  return mount(mod.default)
}

function makeSession(id: string, title: string, archived: boolean) {
  return {
    id,
    title,
    entries: [{ role: 'user', text: title }],
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    tags: [],
    primaryIntents: archived ? [] : ['reflect'],
    archived,
    summary: archived ? '共 1 条对话' : '',
  }
}

describe('DialogueSessionList', () => {
  it('显示活跃会话并提供归档按钮', async () => {
    const wrapper = await mountPanel([makeSession('s1', '今天的心情', false)])
    expect(wrapper.text()).toContain('镜我对白会话')
    expect(wrapper.text()).toContain('今天的心情')
    const archiveBtn = wrapper.findAll('button.dsl-btn').find(b => b.text() === '归档')
    expect(archiveBtn).toBeTruthy()
  })

  it('点击归档将活跃会话移入已归档并可恢复', async () => {
    const wrapper = await mountPanel([makeSession('s1', '今天的心情', false)])
    const archiveBtn = wrapper.findAll('button.dsl-btn').find(b => b.text() === '归档')!
    await archiveBtn.trigger('click')

    // 已归档区出现「恢复」按钮
    const restoreBtn = wrapper.findAll('button.dsl-btn-restore').find(b => b.text() === '恢复')
    expect(restoreBtn).toBeTruthy()
    // 活跃区不再有「归档」按钮
    const stillActive = wrapper.findAll('button.dsl-btn').find(b => b.text() === '归档')
    expect(stillActive).toBeFalsy()

    await restoreBtn!.trigger('click')
    // 恢复后「归档」按钮再次出现在活跃区
    const activeAgain = wrapper.findAll('button.dsl-btn').find(b => b.text() === '归档')
    expect(activeAgain).toBeTruthy()
  })

  it('直接显示已归档会话并提供恢复按钮', async () => {
    const wrapper = await mountPanel([makeSession('s2', '上周的复盘', true)])
    expect(wrapper.text()).toContain('上周的复盘')
    const restoreBtn = wrapper.findAll('button.dsl-btn-restore').find(b => b.text() === '恢复')
    expect(restoreBtn).toBeTruthy()
  })
})
