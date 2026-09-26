// ============================================================
// 发布流水线面板测试（output · usePublishPipeline 真实引擎全链路）
// 流水线生命周期 / 版本管理 / 发布统计
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const RECORDS_KEY = 'hf:output_records'
const PIPELINES_KEY = 'hf:output:pipelines'

const RECORD_A = {
  id: 'rec_a',
  type: 'note',
  content: '第一篇笔记内容',
  createdAt: new Date(Date.now() - 7200000).toISOString(),
  updatedAt: new Date(Date.now() - 7200000).toISOString(),
  roomSource: '思绪书房',
  status: 'published',
  format: 'text',
}
const RECORD_B = {
  id: 'rec_b',
  type: 'emotion',
  content: '今天心情不错',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
  roomSource: '情绪花房',
  status: 'draft',
  format: 'text',
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../PublishPipelinePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('PublishPipelinePanel 发布流水线', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染标题与四个统计格（空态全 0）', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('发布流水线')
    expect(wrapper.text()).toContain('草稿 → 审核 → 发布 → 归档 · 版本管理 · 发布统计')
    expect(wrapper.find('[data-testid="ppl-total"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="ppl-pipeline-count"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="ppl-approval"]').text()).toBe('0%')
    expect(wrapper.text()).toContain('暂无流水线 · 发布引擎等待第一条产出')
  })

  it('预置记录渲染流水线列表与阶段徽标', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [RECORD_A, RECORD_B],
    })
    expect(wrapper.find('[data-testid="ppl-list"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('第一篇笔记内容')
    expect(wrapper.text()).toContain('今天心情不错')
    expect(wrapper.find('[data-testid="ppl-pipeline-count"]').text()).toBe('2')
    // 已发布记录从 published 起步，草稿从 draft 起步
    expect(wrapper.find('[data-testid="ppl-stage-rec_a"]').text()).toContain('已发布')
    expect(wrapper.find('[data-testid="ppl-stage-rec_b"]').text()).toContain('草稿')
  })

  it('流水线操作：草稿提交审核→通过→发布，阶段徽标联动更新', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [RECORD_B],
    })
    expect(wrapper.find('[data-testid="ppl-stage-rec_b"]').text()).toContain('草稿')

    await wrapper.find('[data-testid="ppl-act-review"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="ppl-stage-rec_b"]').text()).toContain('审核中')

    await wrapper.find('[data-testid="ppl-act-approve"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="ppl-stage-rec_b"]').text()).toContain('已审核')

    await wrapper.find('[data-testid="ppl-act-publish"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="ppl-stage-rec_b"]').text()).toContain('已发布')
    expect(wrapper.find('[data-testid="ppl-total"]').text()).toBe('1')

    // 持久化：流水线记录已落库
    const pipelines = readKv()[PIPELINES_KEY]
    expect(pipelines['rec_b'].stage).toBe('published')
    expect(pipelines['rec_b'].stageHistory).toHaveLength(4)
  })

  it('归档操作与阶段历史展开', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [RECORD_A],
    })
    await wrapper.find('[data-testid="ppl-act-archive"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="ppl-stage-rec_a"]').text()).toContain('已归档')

    await wrapper.find('.ppl-toggle').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="ppl-history"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('已发布')
    expect(wrapper.text()).toContain('已归档')
  })

  it('版本管理：选中记录→创建快照→版本列表出现', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [RECORD_A],
    })
    // 点击记录选中
    await wrapper.find('[data-testid="ppl-item-rec_a"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('版本档案')
    expect(wrapper.text()).toContain('尚无版本快照')

    await wrapper.find('[data-testid="ppl-create-version"]').trigger('click')
    await wrapper.vm.$nextTick()
    const versions = wrapper.findAll('[data-testid^="ppl-version-"]')
    expect(versions.length).toBe(1)
    expect(wrapper.text()).toContain('v1')
    expect(wrapper.text()).toContain('手动快照')
  })

  it('版本差异：两版本对比渲染 diff 块', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [RECORD_A],
    })
    await wrapper.find('[data-testid="ppl-item-rec_a"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="ppl-create-version"]').trigger('click')
    await wrapper.vm.$nextTick()

    // 创建第二个版本（内容已变化）
    const kv = readKv()
    kv[RECORDS_KEY] = [{ ...RECORD_A, content: '第一篇笔记内容更新后' }]
    ;(globalThis as any).localStorage.setItem('heartflow:storage', JSON.stringify({
      version: 10,
      kvStore: kv,
      sessions: [],
      crystals: [],
    }))
    invalidateCache()
    // 重挂载拉取更新后的记录
    const wrapper2 = await mountPanel(kv)
    await wrapper2.find('[data-testid="ppl-item-rec_a"]').trigger('click')
    await wrapper2.vm.$nextTick()
    await wrapper2.find('[data-testid="ppl-create-version"]').trigger('click')
    await wrapper2.vm.$nextTick()
    const versions = wrapper2.findAll('[data-testid^="ppl-version-"]')
    expect(versions.length).toBe(2)

    // 对比两个版本（首个点击进 A 槽，次个进 B 槽）
    await wrapper2.find('[data-testid="ppl-cmp-2"]').trigger('click')
    await wrapper2.vm.$nextTick()
    await wrapper2.find('[data-testid="ppl-rollback-1"]').exists()
    await wrapper2.find('[data-testid="ppl-cmp-1"]').trigger('click')
    await wrapper2.vm.$nextTick()
    expect(wrapper2.find('[data-testid="ppl-diff"]').exists()).toBe(true)
    expect(wrapper2.text()).toContain('差异对比')
  })

  it('发布统计：byType/byChannel/评论/版本统计渲染', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [RECORD_A, RECORD_B],
    })
    expect(wrapper.find('[data-testid="ppl-stat-grid"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('按类型')
    expect(wrapper.text()).toContain('按渠道')
    expect(wrapper.text()).toContain('热门标签')
    expect(wrapper.text()).toContain('笔记')
    expect(wrapper.text()).toContain('情绪')
    expect(wrapper.text()).toContain('协作')
    expect(wrapper.text()).toContain('版本快照')
  })

  it('撤回：已发布记录在窗口期内可撤回', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [RECORD_A],
    })
    await wrapper.find('[data-testid="ppl-act-withdraw"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="ppl-stage-rec_a"]').text()).toContain('已撤回')
  })
})
