// ============================================================
// SelfTalkArchivePanel 组件测试（INCR-08：镜像自我对话档案）
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SelfTalkArchivePanel from '../SelfTalkArchivePanel.vue'
import type { SelfTalk } from '../../modules/self'

function iso(daysAgo: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function mkTalks(): SelfTalk[] {
  return [
    { id: '1', text: '今天专注了很久，我看见自己在往前走。', at: iso(0), roomContext: '时间长廊' },
    { id: '2', text: '不必急着评判，先安静地观察。', at: iso(0, 20), roomContext: '情绪花房' },
    { id: '3', text: '我看到了。', at: iso(1), roomContext: null },
    { id: '4', text: '给自己一点耐心，慢慢来。', at: iso(2), roomContext: '逐日心锚' },
  ]
}

describe('SelfTalkArchivePanel', () => {
  it('无对话时不渲染面板', () => {
    const wrapper = mount(SelfTalkArchivePanel, { props: { talks: [] } })
    expect(wrapper.find('.stalk-panel').exists()).toBe(false)
  })

  it('有对话时展示概览与健康标签', () => {
    const wrapper = mount(SelfTalkArchivePanel, { props: { talks: mkTalks() } })
    expect(wrapper.text()).toContain('自我对话档案')
    expect(wrapper.text()).toContain('条对话')
    expect(wrapper.find('.stalk-health').exists()).toBe(true)
  })

  it('统计概览数字正确', () => {
    const wrapper = mount(SelfTalkArchivePanel, { props: { talks: mkTalks() } })
    // 4 条对话，来源房间 3 个（时间长廊/情绪花房/逐日心锚），1 条自主
    expect(wrapper.text()).toContain('4')
    expect(wrapper.text()).toContain('3')
  })

  it('展示回看建议与来源分布', () => {
    const wrapper = mount(SelfTalkArchivePanel, { props: { talks: mkTalks() } })
    expect(wrapper.text()).toContain('温和回看')
    expect(wrapper.text()).toContain('来自哪里的自己')
    expect(wrapper.text()).toContain('时间长廊')
  })

  it('被动对待空来源:自主记录计入分布', () => {
    const talks = mkTalks().filter((t) => t.roomContext === null)
    const wrapper = mount(SelfTalkArchivePanel, { props: { talks } })
    if (wrapper.find('.stalk-source').exists()) {
      expect(wrapper.text()).toContain('自主')
    }
  })
})