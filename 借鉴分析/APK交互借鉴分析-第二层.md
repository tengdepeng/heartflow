# APK 交互借鉴分析 · 第二层信号（96 APK 深挖）

> 上游：`APK交互借鉴分析.md`（第一层 · Top 30 + 候选池 INCR-467~486）。
> 本文件：在第一层「静态资源 + 清单信号」之上，对 12 个重点包做**第二层下钻**（Smali / dex / 资源表 / native / assets），提炼 Top 30 之外的新借鉴候选，并逐项做 `heartflow/project/frontend/src` 全量复核。
> 生成时间：2026-10-04
> 证据口径：所有结论均引用 APK 内真实出现的资源名 / 布局名 / assets / provider，不臆造。

---

## 一、第二层下钻方法

| 层 | 手段 | 结论 |
|---|---|---|
| dex / Smali | `mt_apk_dex_outline_class` / `mt_apk_dex_xref`（复用工作区，非临时） | **不可用**：12 个目标包 `dexTotal=0`，dex 被加固/整体混淆（仅 `com.stub.StubApp` 等壳类），类名如 `a.a`/`a0.a` 无业务语义 |
| native | `mt_apk_native_*`（ELF 符号/反汇编/CFG） | 未深入：目标包业务逻辑不落 native，`so` 多为加固/风控/播放器库 |
| **资源表** | `mt_apk_list view=resource_table`（按 `type` 过滤 layout/string/xml） | **主证据来源**：资源名在加固后仍存活，可还原功能簇结构 |
| assets | `mt_apk_list view=assets` 顶层 | 补充证据：Lottie 动画 / 音效 / 数据文件（如 `Bottle.json`、`birth-day.mp3`、`barrage`） |

> 探针脚本：`e:\Heartflow\.hf-tmp\{mtc.cjs, probe5.cjs, vocab.cjs, layout-mine.cjs}`；中间产物 `vocab.jsonl`（856KB 资源名）→ `layout-mine.txt`（按 App 分组的「双 token 前缀」簇）。

**12 个重点包**：时光序 / 正气 / 人升 / 时光提醒 / 天文通 / 观星 / 识典古籍 / 知源中医 / 组件岛Widget Island / 生辰 / 万年日历 / 微信读书。

---

## 二、第二层信号 → 新借鉴候选

> 判定沿用项目纪律：**映射心流房间 → 全 src 递归 `rg` 复核（含子路径 / 单例访问器 / barrel 转发）→ 确证真缺口**，避免把已有能力误当缺口。

### 2.1 强候选（真缺口 · 桌面端可迁移）

| INCR | 借鉴点 | 来源 App | 第二层证据 | 落到房间 | 复核结论 |
|---|---|---|---|---|---|
| **487** | **电子木鱼 · 功德计数器** | 组件岛Widget Island、万年日历 | 组件岛 layouts `electronic_fish`(3)/`dynamic_pet`(6)/assets `barrage`；万年日历 layouts `pop_fish`/`fish_music`、anim `baji_small_*` | 息壤 / 情绪花房 / 静心角 | **真缺口**：全 src 仅 `cognition/types.ts:306` 音景描述「偶有钟声与木鱼声」，无点击计数/功德/音效交互 |
| **488** | **桌面宠物 · 陪伴精灵** | 组件岛Widget Island | layouts `desktop_pet`(7)/`dynamic_pet`(6)/`disdain_kitten`(5)/`duck_animation`(4)；assets `anim`/`audio`/`card_holder_*` | 殿堂触角 / 家（桌面陪伴，可与幕僚好感联动） | **真缺口**：全 src 无宠物/精灵/companion 实体（`宠物` 仅作记账自定义分类示例；`companion` 仅运动「同伴」聚合） |

### 2.2 窄候选（可作小增量 · 组件级）

| INCR | 借鉴点 | 来源 App | 第二层证据 | 落到房间 | 复核结论 |
|---|---|---|---|---|---|
| **489** | **摸鱼倒计时 / 摸鱼工资 组件** | 小组件盒子 | provider `MiuiFishWorkCountdownWidgetProvider`/`MiuiFishWorkMoneyWidgetProvider` | 工痕 / 触角小组件 | **窄缺口**：`WorkHub.vue` 仅把「摸鱼」作休息类型（`:322` `<option value="slack">摸鱼</option>`），无「距下班倒计时 / 已赚工资实时累加」**【已落地 2026-10-04 · commit acbfae58：`modules/slacking` + `components/SlackingPanel.vue` 挂 `WorkHub.vue` 工痕，班次/时薪可配 + 今日已赚/下班倒计时/摸鱼计时，存 `hf:slacking`】** |
| **490** | **多时段提醒** | 时光提醒 | layouts `multi_period`/`period_app`/`time_progress` | 自律工坊 / 逐日心锚 | **窄缺口**：`tasks/task.ts` 无 `remindAt`（仅 `dueDate`）；`reward/daily-reminder` 仅「单日单时刻」记账提醒 **【已落地 2026-10-04 · commit 153b8b95：`modules/multi-reminder` + `components/MultiPeriodReminderPanel.vue` 挂 `DisciplineWorkshop.vue` 自律工坊，24h 时间进度条 + 时段增删/开关/状态分类/下一时段倒计时，存 `hf:multi_reminder`】** |

### 2.3 观察项（低价值 / 桌面端不适配）

| 借鉴点 | 来源 App | 第二层证据 | 不立项原因 |
|---|---|---|---|
| 弹幕 | 识典古籍 | layouts `bullet_*`、`barrage` | 单机私有桌面无社区弹幕场景 |
| 漫画阅读 | 微信读书 | layouts `comic_reader`/`comic_page` | 心流阅读定位为文本/古籍，非漫画排版 |
| 摇一摇 | 正气 | layouts `feeds_shake` | 桌面端无加速度传感器 |
| 歌词滚动 | 组件岛 | layouts `lyrics_scrolling`/`lyrics_circle` | 心流仅有冥想序列播放器，无音乐库 |
| 漂流瓶 / 许愿瓶 | 组件岛 | assets `Bottle.json` | 社交属性；单机版「给未来的信」已由 `capsule`（时间胶囊）覆盖 |
| 控制中心换肤 | 组件岛 | strings `beautification_control_center_*` | 已由 `command-palette` + `customization` 覆盖 |
| 贴纸岛 | 组件岛 | strings `beautification_sticker_*`「左侧贴纸/右侧贴纸」 | 依附刘海/灵动岛，桌面无对应载体 |
| 碎屏 / 光绘 / 唱片 装饰组件 | 组件岛 | layouts `broken_screen`/`light_painting`/`disc_album` | 纯装饰恶搞，无用户价值增量 |
| 组队 | 人升 | layouts `content_team` | 单机应用，无多人协作 |

---

## 三、全 src 复核矩阵（已覆盖 → 剔除）

> 第二层信号中，以下项经 `heartflow/project/frontend/src` 全量 `rg` 复核，**Heartflow 已有等价实现**，剔除，不立项。

| 第二层信号 | 来源 App | 复核证据（真实实现） |
|---|---|---|
| 家谱 / 家庭 | 万年日历（`pop_family`/`pop_framily`） | `relation/relation-network.ts` `createFamilyTree`（以自己为中心的三代家谱）+ `relation-store` |
| 壁纸 / 换肤 | 组件岛（`wallpaper_item`/`wi_wallpaper`）、生辰 | `aura/themes.ts`（六类氛围含流体壁纸）+ `home/HomeRoomAtmosphere.vue`（房间壁纸图案） |
| 每日一句 / 一言 | 组件岛、小组件盒子（`hitokoto_*`） | `aura/content.ts` + `desktop-widget` + `GreetingWidgetPanel.vue` |
| 喝水提醒 | 时光序（`itemview_drink`） | `views/Rest.vue:672` 「补水提醒」+ `Constitution` 习惯项 |
| 语音记录 | 时光序（`voice_record`） | `mirror/voice-input.ts` + `NaturalLanguageCreate.vue`（语音输入） |
| 闹钟 | 时光序（`fm_alarm`） | `rest/sleep-quality.ts` 起床闹钟 + `RestSleepPanel.vue` |
| 生命倒计时 | 生辰（`death_glass`） | `life-epoch/life-epoch.ts` + `LifeEpochPanel.vue`（INCR-99） |
| 时间星图拖动 / 时间回溯 | 观星（`time_player`） | `components/SkyGazePanel.vue:24` 「时间星图」range 滑块（18..30 时）+ 四季轮转「时间回溯」 |
| 习题 / 自测 | 知源中医（`exercise_exam`/`exercise_test`） | `mastery/mastery.ts`（知识点掌握度 0-100，随自我测验更新） |
| 戒断 / 违规记录 | 正气（`dlg_violation`/`dlg_record`） | `HabitFailurePanel.vue` + `discipline` 习惯失败分析 |
| 小程序聚合 | 时光序（`applet_clock/daily/food/habit/health/read`） | `modules/plugin`（plugin-marketplace / registry）+ `modules/launcher` |
| 控制中心 | 组件岛（`control_center`） | `modules/command-palette` |
| 日程 / 重复 | 时光序（`sch_*`）、万年日历（`pop_repeat`/`pop_schedule`） | `tasks/task.ts`（dueDate + 四象限）+ `automation` |
| 记账 | 时光序（`accounting_drawer`/`all_biil`） | `modules/reward`（收支记录 + 分类 + 统计） |
| 图鉴 / 点亮 / 收集 | 时光序（`lit_pg`/`all_lit`） | `LightPavilion.vue` + `Crystal.vue` + `PlayGallery.vue` + `EmotionGarden.vue` |
| 八字 / 排盘 | 组件岛（`baji_small`/`baji_middle`）、万年日历 | `astrolabe` + `FourPillarsPanel.vue` |
| 记步 / 运动组件 | 组件岛（`activity_recognition`） | `movement` 模块 + 运动档案 |

**复核小结**：第二层信号中 **17 项已覆盖剔除 / 2 项真缺口（487/488）/ 2 项窄缺口（489/490）/ 9 项观察项**。

---

## 四、结论

1. **第一层的判断被第二层证实**：96 APK 的主要价值是「确认既有能力面已完整 + 定位少数真空白」。第二层（资源表）在 dex 全面加固不可用的情况下，仍还原出各包的功能簇结构，进一步佐证 Heartflow 的房间覆盖度极高。
2. **第二层新发现 2 个真缺口**（均为桌面端**强适配**、此前 Top 30 未覆盖）：
   - **INCR-487 电子木鱼 · 功德计数器**（组件岛 / 万年日历）——点击木鱼累积功德 + 音效/动画 + 每日功德统计，落点「息壤 / 情绪花房 / 静心角」，与既有 `sound-scene`「禅院」音景天然契合。
   - **INCR-488 桌面宠物 · 陪伴精灵**（组件岛）——桌面常驻宠物，随心情/状态变化并可互动，落点「殿堂触角 / 家」，可与幕僚好感（`advisor`）联动。
3. **2 个窄缺口**（组件级小增量，**均已落地 2026-10-04**）：INCR-489 摸鱼倒计时/工资组件（小组件盒子 → 工痕，commit acbfae58）、INCR-490 多时段提醒（时光提醒 → 自律工坊，commit 153b8b95）。
4. **桌面端适配提醒**：桌面（Vue+Tauri）无移动传感器/桌面小组件运行环境；上述借鉴点须落在「信息结构 / 交互范式 / 可配置化」层面，按心流既有「薄委托面板 + modules composable + storage」架构改造，不可照搬移动端运行环境。

> 候选池已登记于 `各类文件/markdown-历史报告/房间功能差距-136apk追踪.md`（第二层信号块 + 更新日志），编号 INCR-487~490；**四项均已落地（INCR-487/488/489/490，2026-10-04）**。

---

## 附：产物索引

| 产物 | 路径 |
|---|---|
| 第一层汇总 | `借鉴分析/APK交互借鉴分析.md` |
| 第二层报告（本文件） | `借鉴分析/APK交互借鉴分析-第二层.md` |
| 分组报告 A/B/C | `借鉴分析/_groups/*.md` |
| 逐包摘要 | `借鉴分析/_digest/*.md` |
| 第二层探针脚本 | `e:\Heartflow\.hf-tmp\{mtc.cjs, probe5.cjs, vocab.cjs, layout-mine.cjs}` |
| 第二层中间产物 | `e:\Heartflow\.hf-tmp\{vocab.jsonl, layout-mine.txt, dex-groups.txt}` |
