// ============================================================
// Capsule 时光胶囊视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getNotes: () => mockStore['hf:notes'] ?? [],
    setNotes: (n: any[]) => { mockStore['hf:notes'] = n },
  },
}))

// ---- 辅助函数 ----
async function createWrapper() {
  const { default: Capsule } = await import('../Capsule.vue')
  return mount(Capsule, { attachTo: document.body })
}

function makeCapsule(overrides: Record<string, any> = {}) {
  const now = new Date().toISOString()
  return {
    id: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: '默认胶囊',
    note: '',
    items: [],
    createdAt: now,
    at: now,
    openDate: '2099-01-01',
    openedAt: null,
    opened: false,
    ...overrides,
  }
}

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- 测试 ----
describe('Capsule 时光胶囊视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:time_capsules'] = '[]'
  })

  it('渲染标题与胶囊库档案面板空态引导', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('时光胶囊')
    expect(wrapper.find('.cvp').exists()).toBe(true)
    expect(wrapper.text()).toContain('胶囊库档案')
    expect(wrapper.text()).toContain('胶囊库未启')
  })

  it('胶囊库档案面板随胶囊数据渲染填充态', async () => {
    mockStore['hf:time_capsules'] = JSON.stringify([
      makeCapsule({ id: 'a', title: '逾期胶囊', openDate: iso(-3) }),
      makeCapsule({ id: 'b', title: '未来胶囊', openDate: iso(30) }),
    ])
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.cvp-tag').exists()).toBe(true)
    expect(wrapper.text()).toContain('逾末催启')
    expect(wrapper.text()).toContain('逾期胶囊')
  })
})

// ============================================================
// 照片进胶囊
// ============================================================
describe('Capsule 照片进胶囊', () => {
  function setPhotoDiary(entries: Record<string, any>[]) {
    // photo-diary 的 load() 直接读取数组（存储层负责序列化，mock 不反序列化），故此处存数组而非 JSON 字符串
    mockStore['hf:anchor:photo_diary'] = entries
  }

  beforeEach(() => {
    const stray = document.body.querySelector('.cap-photo-viewer')
    if (stray) stray.remove()
  })

  it('已开启胶囊渲染照片缩略图并可放大查看', async () => {
    setPhotoDiary([
      { id: 'e1', date: '2026-08-20', images: ['FULL_A'], thumbs: ['THUMB_A'], captions: [''], createdAt: new Date().toISOString() },
    ])
    mockStore['hf:time_capsules'] = JSON.stringify([
      makeCapsule({
        id: 'opened-cap',
        title: '带照片的胶囊',
        openDate: '2000-01-01',
        openedAt: '2000-01-02T00:00:00.000Z',
        opened: true,
        items: [
          { type: 'photo', id: '2026-08-20__0', title: '📷 照片 · 2026-08-20 · 第 1 张', photoRef: { date: '2026-08-20', index: 0 } },
        ],
      }),
    ])
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const tile = wrapper.find('[data-test="cap-item-photo"]')
    expect(tile.exists()).toBe(true)
    expect(tile.find('img').attributes('src')).toBe('THUMB_A')
    await tile.trigger('click')
    await wrapper.vm.$nextTick()
    const viewer = document.body.querySelector('.cap-photo-viewer')
    expect(viewer).not.toBeNull()
    expect(document.body.querySelector('.cap-photo-viewer-img')?.getAttribute('src')).toBe('FULL_A')
  })

  it('封存表单照片选择器可选中并写入胶囊', async () => {
    setPhotoDiary([
      { id: 'e1', date: '2026-08-20', images: ['FULL_A', 'FULL_B'], thumbs: ['THUMB_A', 'THUMB_B'], captions: ['', ''], createdAt: new Date().toISOString() },
    ])
    mockStore['hf:time_capsules'] = '[]'
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.find('.cap-btn-new').trigger('click')
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('input.cap-input')
    await inputs[0].setValue('给未来的我')
    await inputs[1].setValue('2099-01-01')
    await wrapper.vm.$nextTick()
    const chip = wrapper.find('[data-test="cap-photo-pick-2026-08-20__0"]')
    expect(chip.exists()).toBe(true)
    await chip.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.cap-btn-save').trigger('click')
    await wrapper.vm.$nextTick()
    const saved = JSON.parse(mockStore['hf:time_capsules'])
    expect(saved).toHaveLength(1)
    const photoItem = saved[0].items.find((i: Record<string, any>) => i.type === 'photo')
    expect(photoItem).toBeTruthy()
    expect(photoItem.photoRef).toEqual({ date: '2026-08-20', index: 0 })
  })
})

// ============================================================
// 连链封藏（消费 hf:note_links 出链/反链聚合）
// ============================================================
describe('Capsule 连链封藏', () => {
  it('起点笔记聚合出链/反链并可整链加入封存', async () => {
    const now = new Date().toISOString()
    const baseNotes = [
      { id: 'a', title: '起点', content: '见 [[b]]', tags: [], createdAt: now, updatedAt: now },
      { id: 'b', title: '出链笔记', content: '', tags: [], createdAt: now, updatedAt: now },
      { id: 'c', title: '反链笔记', content: '[[a]]', tags: [], createdAt: now, updatedAt: now },
    ]
    mockStore['hf:notes'] = baseNotes
    const { notes } = await import('../../engine/storage/notes-state')
    notes.value = baseNotes as any

    const { useNoteLinks } = await import('../../modules/study/note-links')
    const links = useNoteLinks()
    links.links.value = []
    links.syncLinksForNote('a', '见 [[b]]', notes.value) // a → b（出链）
    links.syncLinksForNote('c', '[[a]]', notes.value) // c → a（反链）

    mockStore['hf:time_capsules'] = '[]'
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.find('.cap-btn-new').trigger('click')
    await wrapper.vm.$nextTick()

    // 未选起点时不渲染连链面板
    expect(wrapper.find('[data-test="linked-items-panel"]').exists()).toBe(false)

    await wrapper.find('[data-test="cap-chain-root"]').setValue('a')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="linked-items-panel"]').exists()).toBe(true)
    expect(wrapper.findAll('.lip-item')).toHaveLength(3)
    expect(wrapper.text()).toContain('出链笔记')
    expect(wrapper.text()).toContain('反链笔记')

    await wrapper.find('[data-test="lip-select-all"]').trigger('click')
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('input.cap-input')
    await inputs[0].setValue('连链胶囊')
    await inputs[1].setValue('2099-01-01')
    await wrapper.vm.$nextTick()
    await wrapper.find('.cap-btn-save').trigger('click')
    await wrapper.vm.$nextTick()

    const saved = JSON.parse(mockStore['hf:time_capsules'])
    expect(saved).toHaveLength(1)
    const noteIds = saved[0].items
      .filter((i: Record<string, any>) => i.type === 'note')
      .map((i: Record<string, any>) => i.id)
      .sort()
    expect(noteIds).toEqual(['a', 'b', 'c'])
  })
})
