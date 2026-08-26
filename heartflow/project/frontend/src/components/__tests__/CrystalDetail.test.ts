// ============================================================
// CrystalDetail 组件测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockCrystal = {
  id: 'c1',
  sessionId: 's1',
  color: '#7c5cfc',
  intensity: 0.85,
  shape: 'octahedron',
  tags: ['学习', '数学'],
  createdAt: '2026-07-20T10:30:00.000Z',
  insight: '专注让时间变得有意义',
}

const mockSession = {
  id: 's1',
  status: 'completed',
  mode: 'focus',
  elapsed: 1800000, // 30 min
  startedAt: '2026-07-20T10:00:00.000Z',
  completedAt: '2026-07-20T10:30:00.000Z',
  tags: ['学习'],
  note: '数学作业',
  plannedDuration: 1800000,
  pausedDuration: 0,
  pausedAt: null,
  carrierId: null,
}

async function getWrapper(props: Record<string, any> = {}) {
  const { default: CrystalDetail } = await import('../CrystalDetail.vue')
  return mount(CrystalDetail, {
    props: {
      crystal: null,
      session: null,
      ...props,
    },
    attachTo: document.body,
  })
}

describe('CrystalDetail', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染结晶展示区', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const display = document.querySelector('.crystal-display')
    expect(display).not.toBeNull()
    wrapper.unmount()
  })

  it('显示纯度百分比', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const label = document.querySelector('.intensity-label')
    expect(label).not.toBeNull()
    expect(label?.textContent ?? '').toContain('85%')
    expect(label?.textContent ?? '').toContain('纯度')
    wrapper.unmount()
  })

  it('显示强度条', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const fill = document.querySelector('.intensity-fill') as HTMLElement
    expect(fill).not.toBeNull()
    expect(fill.style.width).toBe('85%')
    expect(fill.style.background).toBe('#7c5cfc')
    wrapper.unmount()
  })

  it('显示形状信息', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const infoRows = document.querySelectorAll('.info-row')
    let found = false
    infoRows.forEach(row => {
      const label = row.querySelector('.info-label')
      const value = row.querySelector('.info-value')
      if (label && label.textContent === '形状' && value) {
        expect(value.textContent).toBe('八面体')
        found = true
      }
    })
    expect(found).toBe(true)
    wrapper.unmount()
  })

  it('显示生成时间', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const infoRows = document.querySelectorAll('.info-row')
    let found = false
    infoRows.forEach(row => {
      const label = row.querySelector('.info-label')
      if (label && label.textContent === '生成时间') {
        found = true
      }
    })
    expect(found).toBe(true)
    wrapper.unmount()
  })

  it('显示专注时长', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const infoRows = document.querySelectorAll('.info-row')
    let found = false
    infoRows.forEach(row => {
      const label = row.querySelector('.info-label')
      const value = row.querySelector('.info-value')
      if (label && label.textContent === '专注时长' && value) {
        expect(value.textContent).toContain('30分钟')
        found = true
      }
    })
    expect(found).toBe(true)
    wrapper.unmount()
  })

  it('显示专注状态', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const infoRows = document.querySelectorAll('.info-row')
    let found = false
    infoRows.forEach(row => {
      const label = row.querySelector('.info-label')
      const value = row.querySelector('.info-value')
      if (label && label.textContent === '专注状态' && value) {
        expect(value.textContent).toBe('完成')
        found = true
      }
    })
    expect(found).toBe(true)
    wrapper.unmount()
  })

  it('显示标签', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const tags = document.querySelectorAll('.tag')
    expect(tags.length).toBe(2)
    expect(tags[0].textContent).toBe('学习')
    expect(tags[1].textContent).toBe('数学')
    wrapper.unmount()
  })

  it('无标签时隐藏标签区域', async () => {
    const crystalWithoutTags = { ...mockCrystal, tags: [] }
    const wrapper = await getWrapper({ crystal: crystalWithoutTags, session: mockSession })
    const tagsRow = document.querySelector('.tags-row')
    expect(tagsRow).toBeNull()
    wrapper.unmount()
  })

  it('渲染关闭按钮', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const closeBtn = document.querySelector('.close-btn') as HTMLButtonElement
    expect(closeBtn).not.toBeNull()
    wrapper.unmount()
  })

  it('点击关闭按钮触发 close 事件', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const closeBtn = document.querySelector('.close-btn') as HTMLButtonElement
    closeBtn.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('显示感悟文本', async () => {
    const wrapper = await getWrapper({ crystal: mockCrystal, session: mockSession })
    const insight = document.querySelector('.crystal-insight')
    expect(insight).not.toBeNull()
    const text = insight!.querySelector('.insight-text')
    expect(text?.textContent ?? '').toContain('专注让时间变得有意义')
    wrapper.unmount()
  })

  it('crystal 为 null 时不渲染弹窗', async () => {
    const wrapper = await getWrapper({ crystal: null, session: null })
    const overlay = document.querySelector('.modal-overlay')
    // v-if="crystal" 所以 crystal 为 null 时不渲染
    expect(overlay).toBeNull()
    wrapper.unmount()
  })

  it('中断状态的 session 显示"中断"', async () => {
    const interruptedSession = { ...mockSession, status: 'interrupted' }
    const wrapper = await getWrapper({ crystal: mockCrystal, session: interruptedSession })
    const infoRows = document.querySelectorAll('.info-row .info-value')
    let found = false
    infoRows.forEach((el: Element) => {
      if (el.textContent === '中断') found = true
    })
    expect(found).toBe(true)
    wrapper.unmount()
  })
})