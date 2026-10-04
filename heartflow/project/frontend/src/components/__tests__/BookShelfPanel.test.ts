import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BookShelfPanel from '../BookShelfPanel.vue'
import { useReadingBridge } from '../../modules/reading/reading-bridge'
import { useShelfOrganizer } from '../../modules/reading/shelf-organizer'

describe('BookShelfPanel 书架录入（接 hall 引擎）', () => {
  let bridge: ReturnType<typeof useReadingBridge>

  beforeEach(() => {
    bridge = useReadingBridge()
    // 模块单例在首次加载时已读入 storage；测试间直接重置内存态，保证彼此独立
    bridge.books.value = []
    bridge.readingGoal.value = { yearlyTarget: 12, yearlyCompleted: 0, dailyTarget: 30, streak: 0 }
    // 书架整理偏好/集合同样为模块单例，重置以避免测试间串扰
    useShelfOrganizer().reset()
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

  it('有导入正文的书籍显示「打开阅读」并向上 emit 书的 id', async () => {
    const created = bridge.addBookFromText('有正文的书', '', 3, '第一段\n第二段\n第三段')
    const w = mount(BookShelfPanel)

    const openBtn = w.find('.bsf-read')
    expect(openBtn.exists()).toBe(true)
    expect(openBtn.text()).toContain('打开阅读')

    await openBtn.trigger('click')
    expect(w.emitted('open-reading')).toBeTruthy()
    expect(w.emitted('open-reading')![0]).toEqual([created.id])
  })

  it('无导入正文的书籍（仅录入元数据）不显示「打开阅读」', () => {
    bridge.addBook('只有书名的书', '某作者', 200, ['测试'])
    const w = mount(BookShelfPanel)
    expect(w.find('.bsf-read').exists()).toBe(false)
  })

  it('默认列表视图，切到「网格」渲染封面网格', async () => {
    bridge.addBook('三体', '刘慈欣', 300, ['科幻'])
    const w = mount(BookShelfPanel)
    expect(w.find('.bsf-shelf').exists()).toBe(true)
    expect(w.find('.sgp').exists()).toBe(false)

    const viewBtns = w.findAll('.bsf-view-btn')
    expect(viewBtns).toHaveLength(2)
    await viewBtns[1].trigger('click') // 网格
    await w.vm.$nextTick()

    expect(w.find('.sgp').exists()).toBe(true)
    expect(w.find('.bsf-shelf').exists()).toBe(false)
    expect(w.find('.sgp-card').text()).toContain('三体')
  })

  it('列表态点击置顶写入引擎并显示标记', async () => {
    const book = bridge.addBook('三体', '刘慈欣', 300, [])
    const w = mount(BookShelfPanel)
    await w.find('.bsf-pin').trigger('click')
    await w.vm.$nextTick()

    const shelf = useShelfOrganizer()
    expect(shelf.isPinned(book.id)).toBe(true)
    expect(w.find('.bsf-pin-flag').exists()).toBe(true)
  })

  it('私密书默认隐藏，勾选「显示私密」后出现', async () => {
    bridge.addBook('秘藏', '某作者', 200, [])
    const w = mount(BookShelfPanel)
    await w.find('.bsf-priv').trigger('click')
    await w.vm.$nextTick()

    // 默认隐藏：书名消失、出现隐藏提示
    expect(w.text()).not.toContain('秘藏')
    expect(w.find('.bsf-hidden-note').text()).toContain('1 本私密藏书')

    await w.find('.bsf-private-toggle input').setValue(true)
    await w.vm.$nextTick()
    expect(w.text()).toContain('秘藏')
    expect(w.find('.bsf-hidden-note').exists()).toBe(false)
  })
})
