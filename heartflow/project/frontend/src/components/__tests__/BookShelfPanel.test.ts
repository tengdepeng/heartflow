import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BookShelfPanel from '../BookShelfPanel.vue'
import { useReadingBridge } from '../../modules/reading/reading-bridge'

describe('BookShelfPanel 书架录入（接 hall 引擎）', () => {
  let bridge: ReturnType<typeof useReadingBridge>

  beforeEach(() => {
    bridge = useReadingBridge()
    // 模块单例在首次加载时已读入 storage；测试间直接重置内存态，保证彼此独立
    bridge.books.value = []
    bridge.readingGoal.value = { yearlyTarget: 12, yearlyCompleted: 0, dailyTarget: 30, streak: 0 }
  })

  it('挂载后空书架显示提示', () => {
    const w = mount(BookShelfPanel)
    expect(w.text()).toContain('书架还空着')
    expect(bridge.books.value).toHaveLength(0)
  })

  it('录入一本书 → 出现在「想读」分区并写入引擎', async () => {
    const w = mount(BookShelfPanel)
    await w.find('input[aria-label="书名"]').setValue('三体')
    await w.find('input[aria-label="作者"]').setValue('刘慈欣')
    await w.find('input[aria-label="页数"]').setValue(300)
    await w.find('input[aria-label="标签"]').setValue('科幻,经典')
    await w.find('form.bsf-add').trigger('submit')
    await w.vm.$nextTick()

    expect(w.text()).toContain('三体')
    expect(bridge.books.value).toHaveLength(1)
    expect(bridge.books.value[0]).toMatchObject({
      title: '三体',
      author: '刘慈欣',
      totalPages: 300,
      status: 'want_to_read',
    })
    expect(bridge.books.value[0].tags).toEqual(['科幻', '经典'])
  })

  it('切到「在读」并记阅读会话 → 页码与阅读时长更新', async () => {
    const w = mount(BookShelfPanel)
    await w.find('input[aria-label="书名"]').setValue('活着')
    await w.find('form.bsf-add').trigger('submit')
    await w.vm.$nextTick()

    // 切状态：想读 → 在读
    await w.find('select.bsf-select').setValue('reading')
    await w.vm.$nextTick()

    // 展开「记进度」
    await w.find('.bsf-book-side button.bsf-link').trigger('click')
    await w.vm.$nextTick()

    const sess = w.find('.bsf-session')
    const nums = sess.findAll('input')
    await nums[0].setValue(0) // 起页
    await nums[1].setValue(50) // 止页
    await nums[2].setValue(30) // 分钟
    await sess.find('button.bsf-btn').trigger('click')
    await w.vm.$nextTick()

    const book = bridge.books.value[0]
    expect(book.status).toBe('reading')
    expect(book.currentPage).toBe(50)
    expect(book.totalReadingTime).toBe(30)
  })

  it('已读后评分写入引擎', async () => {
    const w = mount(BookShelfPanel)
    await w.find('input[aria-label="书名"]').setValue('百年孤独')
    await w.find('form.bsf-add').trigger('submit')
    await w.vm.$nextTick()
    await w.find('select.bsf-select').setValue('finished')
    await w.vm.$nextTick()

    // 已读区出现 5 颗星
    const stars = w.findAll('.bsf-book-side .bsf-star')
    expect(stars).toHaveLength(5)
    await stars[3].trigger('click') // 评 4 星
    await w.vm.$nextTick()

    expect(bridge.books.value[0].rating).toBe(4)
  })

  it('设定年度目标写入 readingGoal', async () => {
    const w = mount(BookShelfPanel)
    await w.find('.bsf-goal-row button.bsf-link').trigger('click') // 设定
    await w.vm.$nextTick()

    const goalInputs = w.findAll('.bsf-goal-edit input.bsf-num')
    await goalInputs[0].setValue(20)
    await goalInputs[1].setValue(45)
    await w.find('.bsf-goal-edit button.bsf-btn').trigger('click')
    await w.vm.$nextTick()

    expect(bridge.readingGoal.value.yearlyTarget).toBe(20)
    expect(bridge.readingGoal.value.dailyTarget).toBe(45)
  })
})
