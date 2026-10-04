# APK 交互借鉴分析 · UI 交互层（96 APK 第三轮下钻）

> 上游：`APK交互借鉴分析.md`（第一层 · Top 30）、`APK交互借鉴分析-第二层.md`（第二层 · 功能缺口）。
> 本文件：第三轮下钻，聚焦 **UI 交互范式 / 微交互 / 组件类型 / 转场动效**。
> 生成时间：2026-10-04
> 证据口径：APK 内真实存在的 **anim / menu / xml(widget_info) / drawable** 资源名（加固后仍存活），逐项在 `heartflow/project/frontend/src` 全量 `rg` 复核。

---

## 一、方法与数据源

第二层已确认 12 个重点包 dex 全面加固不可用；本轮进一步把资源表下钻到**交互动效层**：

| 资源类型 | 交互语义 | 探针 |
|---|---|---|
| `anim` | 转场 / 微交互 / 弹窗进出 / 弹性插值 | `probe6.cjs` |
| `menu` | 上下文菜单 / 长按菜单 / 抽屉导航 | 同上 |
| `xml`（`*_widget_info`） | 桌面小组件类型矩阵 | 同上 |
| `drawable` | 图标语义（手势/悬浮/AR 等） | 同上 |

产物：`e:\Heartflow\.hf-tmp\ui-interact.jsonl`（12 包全量 anim/menu/xml/drawable）+ 控制台摘要。

**关键体量**：组件岛 anim=996、生辰 anim=122（含大量 widget 专用动效）、人升 menu=62、时光序 xml=26（26 个 `*_widget_info`）。

---

## 二、UI 交互层新候选

### 2.1 真缺口（桌面端可迁移）

| INCR | 借鉴点 | 来源 App | 第二层证据（真实资源名） | 落到房间 | 复核结论 |
|---|---|---|---|---|---|
| **491** | **径向 / 扇形展开菜单**（Radial / Fan-out Menu） | 生辰 | anim `widget_circle_folder_animation_controller_inner/outer/scale`、`widget_circle_folder_animation_inner/outer`、`widget_fan_animation`/`_1`/`_3`/`_controller` | 触角 / 全局 UI（快速操作） | **真缺口**：全 src 无 `radialMenu`/`pieMenu`/环形/花瓣/扇形菜单；`radial` 仅命中 `radial-gradient`（伪阳性），导航只有侧栏 + `command-palette` 列表式。**【已落地 2026-10-04: `modules/radial-menu` + `components/RadialMenuPanel.vue` 挂 `Touchpoints.vue` 触角, 径向扇形展开快捷动作 + 增删/恢复默认, 存 `hf:radial_menu`, 零网络】** |
| **492** | **滚轮 / 旋钮选择器**（Rotary / Click-wheel Picker） | 生辰 | anim `widget_ipod_flow_animation`/`_controller`（iPod 滚轮范式） | 全局 UI（数值/日期选择器） | **真缺口**：全 src `滚轮` 仅用于 3D 壳缩放（`world-shell/stars-3d.ts`、`canvas/Hall3DSurface.vue`）与图表缩放（`visualization/chart-interaction.ts:415`），无「拖拽旋转选择」控件。**【已落地 2026-10-04: `modules/rotary-picker` + `components/RotaryPickerPanel.vue` 挂 `Touchpoints.vue` 触角, 指针角度映射数值 + 步进吸附 + 预设增删, 存 `hf:rotary_picker`, 零网络】** |
| **493** | **桌面小组件类型矩阵扩展** | 时光序、时光提醒 | 时光序 xml：`calendar_moth_app_widget_info`、`class_schedule_app_widget_info`、`class_schedule_week_widget_info`、`daily_summary_grid/list_app_widget_info`、`drink_water_app_widget_info`、`everything_app_widget_info`、`fouces_list_app_widget_info`、`habit_app_widget_info`、`health_app_widget_info`、`important_day_app_widget_info`、`keep_account_app_widget_info`、`my_target_app_widget_info`、`quadrant_app_widget_info`、`schedule_app_widget_info`、`todo_app_widget_info`、`weather_app_widget_info`；时光提醒 xml：`time_progress_app_widget_info`、`multi_day/week/month/year/life_app_widget_info` | 触角 `touchpoints` | **真缺口**：`touchpoints/types.ts:7` `WidgetType` 仅 9 类（`pomodoro/daily-anchor/emotion-check/quick-note/weather/quote/quadrant/calendar/calendar-heatmap`），缺 **待办 / 目标 / 习惯 / 重要日子 / 记账 / 喝水 / 课表 / 每日总结 / 专注列表 / 时间进度** 等组件；「多粒度时间进度」（日/周/月/年/人生）仅人生级由 `life-epoch` 覆盖 |

### 2.2 窄缺口（微交互 / 组件级小增量）

| INCR | 借鉴点 | 来源 App | 第二层证据 | 落到房间 | 复核结论 |
|---|---|---|---|---|---|
| **494** | **垂直跑马灯**（Vertical Marquee） | 知源中医 | anim `vertical_marquee_in`/`vertical_marquee_out` | 触角 / 公告位 | **窄缺口**：全 src `跑马灯`/`marquee`/`ticker` 零命中。**【已落地 2026-10-04: `modules/vertical-marquee` + `components/VerticalMarqueePanel.vue` 挂 `Touchpoints.vue` 触角, 纵向上/下滚轮播 + 条目增删 + 间隔/暂停, 存 `hf:vertical_marquee`, 零网络】** |
| **495** | **翻页数字时钟组件**（Flip / Tick Clock） | 生辰 | anim `widget_digital_clock_tick_animation`/`_controller`/`_interpolator` | 触角 `touchpoints` | **窄缺口**：全 src `数字时钟`/`digitalClock`/`flipClock` 零命中；`touchpoints` 无时钟类组件。**【已落地 2026-10-04: `modules/flip-clock` + `components/FlipClockPanel.vue` 挂 `Touchpoints.vue` 触角, 时分秒翻页卡片(rotateX) + 12/24 制式 + 秒/日期开关, 存 `hf:flip_clock`, 零网络】** |
| **496** | **角落缩放展开转场**（Corner-origin Grow / Shrink Modal） | 微信读书、知源中医 | anim `grow_from_bottomleft_to_topright`、`grow_from_topright_to_bottomleft`、`shrink_from_*`（8 向）、`scale_in_center`/`scale_out_center` | 全局 UI（弹层转场） | **窄缺口**：全 src 有 `TransitionGroup` 与 CSS `transform-origin`（`WorkLog.vue:799` 等用于装饰动画），但无「弹层从被点元素角落生长展开」的共享位置转场 |

### 2.3 对第二层候选的动效强化（INCR-487 / 488）

| 候选 | 新增动效证据 | 意义 |
|---|---|---|
| **INCR-488 桌面宠物** | 组件岛 anim `dynamic_pet_20260810_big_walk_translate`/`_walk_scale`/`_big_shake`、`dynamic_pet_20260807_2_big_translate`、`desktop_pet_1_rotate_1`/`_2`、`disdain_kitten`、`duck_animation_small_1` | 明确了宠物的**行走 / 摇晃 / 位移 / 旋转**四类基础动效，可直接作为落地动作规格 |
| **INCR-487 电子木鱼** | 组件岛 anim `electronic_fish_fish`、`electronic_fish_text1`/`_text2`（+`_content`） | 明确了「木鱼体 + 功德文本」两层动效结构（点击时鱼体 + 数字/文案同步动） |

> 交叉引用：`借鉴分析/第12类-全局UI组件与主题.md` 中「人工桌面」App 已把「桌面陪伴角色」列为借鉴点（落 情绪花房「花房精灵」/ 守护室「守护灵」），但全 src 复核 **`花房精灵`/`守护灵`/`陪伴角色` 均零命中**（`spirit` 仅命中 `will` 遗嘱类型与 `stars-3d` 辉光精灵）——即该借鉴点**识别过但未落地**，与 INCR-488 互为印证。

---

## 三、全 src 复核矩阵（已覆盖 → 剔除）

| UI 交互信号 | 来源 App | 复核证据（真实实现） |
|---|---|---|
| 长按 / 手势 / 拖拽 | 人升（`menu_setting_swipe`）、多包 | `composables/useGesture.ts` + `gesture-analyzer.ts` + `useLayerSwitchTrigger.ts` |
| 页面转场 / 列表过渡 | 全包 | `TransitionGroup`/`Transition` 广泛用于 20+ 视图（`Sanctuary`/`Timeline`/`Study`/`RelationHall`…） |
| 进度环 | 小组件盒子 | `components/ProgressRing.vue` + `JadeBead.vue` |
| 日历热力图 | 小组件盒子 | `Reward.vue`/`ReadingHall.vue`/`DailyAnchor.vue`/`Career.vue` 等 |
| 侧栏 / 抽屉 / 分栏 | 人升（`activity_main_drawer`）、知源中医（`core_left/right_open/close`） | `App.vue` 侧栏多态（`sidebar-rail`/`rail-flyout`/`rail-expand`/`rail-text`/`three-state`/`glass`）+ `useLayerSwitch` |
| 生命进度条（含剩余倒计时） | 生辰（`death_glass`） | `life-epoch/life-epoch.ts:104 lifeProgress` + `LifeEpochPanel.vue`（注释即写「生辰启发」） |
| 呼吸效果 | 人升（`breath_effect`） | `breathing` 模块 |
| 成功庆祝动画 | 正气（`success_bow_roate`） | `AnchorCelebration` + `AdvisorCelebrationPanel.vue`（INCR-280） |
| 开箱 / 揭示动画 | 人升（`dialog_open_loot_box_*`） | 部分：`customization/carrier-advanced.ts:278 anim_geode_reveal` + 图表 `TransitionType 'reveal'`（`chart-interaction.ts:964`） |
| 图标点击缩放 / 滚动头部渐隐 | 时光序（`anim_icon_click`/`anim_header_alpha_scale_in`） | 各处 CSS 微交互（`WorkLog.vue` 齿轮、`useChromeAutoHide.ts` 铬自动隐藏） |
| 万能组件聚合器 | 时光序（`everything_app_widget_info`）、小组件盒子 | `第12类` 已登记「小组件盒子 → 信息卡片/进度环/日历热力图/数据看板」+ `touchpoints`/`desktop-widget` 组件体系 |
| 系统信息 / 天气 / 一言 组件 | 生辰、小组件盒子、组件岛 | `desktop-widget` + `aura/content.ts` + `GreetingWidgetPanel.vue` |

---

## 四、观察项（桌面端不适配 / 低价值）

| 借鉴点 | 来源 App | 证据 | 不立项原因 |
|---|---|---|---|
| 弹幕 | 组件岛（`app_widget_provider_handle_barrage_*`）、识典古籍（`bullet_*`） | anim/strings | 单机私有桌面无社区弹幕场景 |
| 横竖屏转场 | 识典古籍 | anim `landscape_enter/exit/reenter/return` | 桌面无横竖屏切换 |
| 边缘滑动返回 | 微信读书 | anim `swipe_back_enter/exit/still` | 移动手势；桌面触控板返回由系统处理 |
| SDK 转场库 | 时光序/识典古籍/知源中医 | anim `ttlive_standard_slide_*`、`annie_x_slide_*`、`aos_slide_*` | 字节系 SDK 自带转场，非产品设计信号 |
| 宝箱/属性增减场景 | 人升 | xml `dialog_attr_increase/decrease_scene`、`dialog_open_loot_box_*` | 已由 `anim_geode_reveal` 部分覆盖，且属游戏化叙事而非通用 UI |

---

## 五、drawable 图标语义 + 文案动词下钻（补 INCR-497~499）

### 5.1 方法

在第四节的 anim/menu/xml 之上，再下探到 **drawable 图标名**与 **strings 文案动词**两层：

- **drawable**：`ui-interact.jsonl` 12 包全量 drawable 约 2.1 万条，剔除 `abc_/mtrl_/m3_/ksad_/gdt_/umeng_/exo_/ucrop_/tt_` 等库·SDK·系统前缀后，剩约 **1.5 万条「产品自有」图标**（探针 `drawable-mine4.cjs`），再按「交互范式特征 token」白名单（pet/wheel/radial/flip/standby/magnet/long_press/gravity…）提取，避免 `\b` 在 `_` 分隔名上的失效与「indicator/background」误命中。
- **strings 文案动词**：95 个 `.strings.txt` 补扫双击/摇一摇/三指/画圈/长按加速/下拉刷新/上拉加载/悬浮球/手势密码/连点成线等低频动词。

### 5.2 新候选

| INCR | 借鉴点 | 来源 App | 证据（真实资源名 / 文案） | 落到房间 | 复核结论 |
|---|---|---|---|---|---|
| **497** | **桌面宠物养成系统**（Adopt→Name→Feed→Level→House） | 组件岛 | drawable `player_bg_pet_adoption_inner`（领养）、`player_bg_pet_naming_input`（命名）、`player_bg_pet_level_up_reward_item`（升级奖励）、`player_bg_pet_house_material`/`_selected`/`_panel`（宠物屋材质/面板）、`player_bg_pet_item_insufficient_*`（喂食不足提示）、`player_bg_pet_house_badge`/`_done`、`desktop_pet_zoom_*`（缩放互动） | 触角 / 情绪花房 | **真缺口**：全 src `宠物/养成/petHouse/petLevel/领养` 零命中（`adopt` 仅 `UnfinishedGarden.vue:38` 收为卡片、`DisciplineWorkshop.vue:163` 采纳建议，语义无关）。INCR-488 仅「桌面宠物」动作，本项补**养成闭环**（领养→命名→喂食→升级→建屋） |
| **498** | **空闲待机氛围场景**（Idle Standby Scene） | 生辰 | drawable `ill_standby_brown_cat_*`/`ill_standby_christmas_cat_*`（1~10）/`ill_standby_keyboard_cat_*`/`ill_standby_purple_cat_*`、`ill_standby_*` 系列 | 触角 / 全局 UI | **窄缺口**：全 src `screensaver/屏保/standby/待机场景` 零命中；`App.vue:38 ambient-layer` 仅被动光晕/尘埃/光痕，**无空闲触发的全屏插画场景**（季节主题可换）。**【已落地 2026-10-04: `modules/standby-scene` + `components/StandbyScenePanel.vue` 挂 `Touchpoints.vue` 触角, 夜猫/落雪/键盘/极光/呼吸五场景 + 静置阈值 + 全屏遮罩预览, 存 `hf:standby_scene`, 零网络】** |
| **499** | **长按变速**（Long-press to Accelerate） | 识典古籍 | drawable `familiar_long_press_speed_guide_bg`、`familiar_long_press_speed_ripple_left`/`_right`、`familiar_long_press_speed_2x`、`familiar_press_speed_text_container`、`finger_long_presspress_speed_guide`、`common_feed_long_press_fast_speed` | 阅览殿 `reading` | **窄缺口**：全 src `倍速` 仅用于 TTS（`reading/tts.ts:124` 0.5~2.0x）、视频速率守卫（`useVideoRateGuard.ts`）、回放（`branch-replay.ts`）；**无「长按内容区加速」手势**（涟漪 + 2x 引导）。**【已落地 2026-10-04: `modules/long-press-speed` + `components/LongPressSpeedPanel.vue` 挂 `Touchpoints.vue` 触角(阅览范式展示), 长按内容区基准→按住倍速线性爬升 + 涟漪/进度反馈 + 基准/按住/爬升时长可调, 存 `hf:long_press_speed`, 零网络】** |

### 5.3 对既有候选的补强

| 既有候选 | 新增证据 | 意义 |
|---|---|---|
| **INCR-487 电子木鱼** | 正气 drawable `ic_muyu_settings`/`ic_muyu_text`/`ic_muyu_timing`（定时）/`muyu_seekbar_thumb`（进度）/`muyu_1~4`/`icon_func_muyu`/`bg_muyu`/`muyu_bkg_shape` | 木鱼含**设置 / 定时 / 进度**三个能力面，非单一敲击动画 |
| **INCR-488 桌面宠物** | 组件岛 `desktop_pet_1_rotate_1`/`_2`、`desktop_pet_zoom_1_*`/`_2_*`、`duck_animation_middle_1_*`/`_small_1_*`、`disdain_kitten`、`player_bg_pet_*` | 动作清单 = **旋转 / 缩放 / 行走 / 摇晃** 四式；再叠 497 的养成闭环 |
| **INCR-493 组件类型矩阵** | 生辰 `app_widget_bg_flip_time`（翻页时钟组件）、`life_appwidget_preview`/`multi_life_appwidget_preview`（人生刻度组件）、`ill_ipod_music_widget_2x2/4x2_*`（iPod 音乐组件）、`ic_death_clock`/`death_clock_bg`/`death_hour`/`death_minute`（死亡时钟组件） | 组件类型可照搬，且与 INCR-495 翻页时钟互为印证 |
| **INCR-495 翻页数字时钟** | 生辰 `app_widget_bg_flip_time` | 印证翻页时钟是**独立桌面组件**而非页内装饰 |

### 5.4 观察项（桌面端不适配 / 低价值）

| 信号 | 来源 App | 不立项原因 |
|---|---|---|
| 摇一摇 | 奶酪单词、闪卡与笔记、天文大师、正气 | 命中均为**广告 SDK**（`ksad_splash_shake`/`tt_splash_rock`/`fanti_ad_splash_shake`），非产品交互 |
| 下拉刷新 / 上拉加载 | 可灵AI、识典古籍 | 桌面无此手势；列表滚动加载已覆盖 |
| 手势密码（3×3 图案） | 时光序、正气 | 桌面鼠标绘制别扭；`room-lock` 已有密码指纹方案 |
| 重力感应组件 | 组件岛 `gravity_guide_01~03`/`wi_icon_gravity` | 桌面无陀螺仪 |
| 连点成线 | 元地球Earth | niche；已有 polyline 连线（`WorkLog.vue:228` 光轨、`AssociationGraph`） |
| 悬浮球（事项） | 时光序 `事项悬浮球` | 已被可拖拽悬浮侧栏（`App.vue` 松手吸附最近边）+ `hf-fab` 覆盖 |
| 双击编辑 / 重置 | 天文大师、夜间模式 | 已广泛覆盖（`dblclick`、`chart-interaction.ts:432 handleDoubleClick`、`customization/interaction-engine.ts` `double-tap`） |

---

## 六、array / animator / raw / font / bool / integer / fraction 资源层下钻（补 INCR-500~506）

### 6.1 方法

前五节集中在 `anim/menu/xml/drawable/strings`。本节继续下探 MT 资源表**其余七类**（探针 `probe7.cjs`，产物 `ui-extra.jsonl`），这些类型加固后同样存活，承载**音视频资产 / 字体 / 配置矩阵 / 开关**四类信号：

| 资源类型 | 交互语义 | 高信号样例 |
|---|---|---|
| `raw` | 音频/视频/资产（音色包、环境音、动效资产、教程音） | 时光序 `female_voice1~8`、组件岛 `audio_air_conditioner`/`audio_fan`、知源中医 `ai_tongue`/`face_analysis`/`take_photo` |
| `font` | 字体 / 排版 | 生辰 `digital`/`hugmate`/`lilita`/`linhailishu`/`sourcehanserifcnbold`/…、微信读书 `wereadls_*` |
| `array` | 选项矩阵（预设 / 分类 / 行政区划） | 万年日历 `text_hours`/`text_minute`、观星 `sensor_damping`/`sensor_speed`、正气 `knock_counts`/`stop_times`/`timer_durations` |
| `bool` / `integer` | 显示 / 行为开关与时长 | 万年日历 `N_showLunar`/`N_showHolidayWorkday`/`N_allMonthSixLine`/`N_stretchCalendarEnable`/…、知源中医 `afc_pkey_display_*` |
| `animator` / `interpolator` | 状态驱动动画（多为库） | 组件岛 `baji_rotate_front`/`_back`（八卦旋转）、时光提醒 `jelly` |

> 过滤口径同第五节：剔除 `m3_/mtrl_/design_/abc_/exo_/cpv_/glance_/ksad_/nav_/fragment_` 等库前缀，只保留产品自有资源。

### 6.2 新候选

| INCR | 借鉴点 | 来源 App | 证据（真实资源名） | 落到房间 | 复核结论 |
|---|---|---|---|---|---|
| **500** | **分步引导 / 新手教程蒙层**（Step-by-step Onboarding Tour） | 组件岛 | raw `status_bar_tutorial_1`/`_2`/`_3`/`_4`（状态栏分步教程）、`how_install`、`custom_wallpaper_introduction`、`introduction_1`/`_2`/`_3` | 全局 UI / 触角 | **真缺口**：全 src `新手引导/coachmark/featureTour/引导蒙层/首次引导/tutorial` 零命中；仅 `DailyAnchor.vue:8 .anchor-spotlight`（装饰光斑，非引导） |
| **501** | **字体库 / 字体选择**（Typeface Picker） | 生辰、微信读书、组件岛 | 生辰 font `digital`/`hugmate`/`lilita`/`linhailishu`(林海隶书)/`sourcehanserifcnbold`(思源宋体)/`ibarrarealnovabold`/`ibarrarealnovasemibold`/`bigshouldersstenciltextregular`/`fsbdplus`/`rakkas`（10 款）；微信读书 `wereadls_bold`/`_medium`/`_regular`；组件岛 `alimamashuheiti`(阿里妈妈数黑)/`anjianhaoti`(按键黑体) | 全局 UI（壳层外观）/ 阅览殿 | **真缺口**：全 src `字体市场/字体选择/fontMarket/fontPreset/fontList/字体库` 零命中（`font-family` 948 处均为 CSS 系统字体栈，无用户可选字体） |
| **502** | **悬浮迷你播放器**（Floating Mini Player / PiP） | 知源中医 | raw `video_float_mini_window_guide`/`_night`（浮窗引导）、`float_listener_play`/`_pause`、`book_listener_play`/`_pause`、`video_pause_to_resume`/`video_resume_to_pause`、`video_playing`/`video_play_times` | 阅览殿 / 听书 | **真缺口**：全 src `miniPlayer/播放条/playerBar/nowPlaying/音频条` 零命中；`浮窗` 命中均为侧栏 / 外观悬浮窗（`App.vue` 悬浮窗侧栏、`WidgetsManage.vue` Tauri 置顶浮窗），**无媒体迷你播放器** |
| **503** | **日历 / 列表显示偏好面板**（Display Preference Matrix） | 万年日历、知源中医 | 万年日历 bool/integer `N_showLunar`/`N_showHolidayWorkday`/`N_allMonthSixLine`/`N_stretchCalendarEnable`/`N_lastNextMonthClickEnable`/`N_showNumberBackground`/`N_textBold`/`N_animationDuration`/`N_disabledAlphaColor`/`N_lastNextMothAlphaColor`/`N_numberBackgroundAlphaColor`；array `npv_lunar_day/month/year_*`、`text_hours`/`text_minute`；知源中医 bool/integer `afc_pkey_display_sort_type_def`/`view_type_def`/`sort_ascending_def`/`remember_last_location_def`/`show_time_for_old_days_def` | 四季 / 时间线 / 万年历 | **真缺口**：全 src `显示农历/showLunar/农历显示/显示节假日/调休/日历偏好/日历设置` 零命中（`seasonal` 有节气 / 节日数据但**无显示开关面板**） |
| **504** | **朗读音色库**（TTS Voice Picker） | 时光序 | raw `female_voice1`~`female_voice8`（8 女声语音包）、`me`/`melodious`/`mysterious`/`quiet`/`dexterous`（音色命名） | 阅览殿 TTS | **窄缺口**：全 src `音色/voicePack/语音包/音色库/voiceName` 仅 2 命中——`reading/tts.ts:7`（注释「WebView2 语音包」）+ `rest/sleep-quality.ts:121`（闹铃音色字段），**无音色选择 UI** |
| **505** | **组件自定义点击热区**（Custom Click Hotzones） | 组件岛 | array `dynamic_custom_click_view_ids`（自定义可点击视图 id 集）、`dynamic_custom_legacy_click_layouts`、`dynamic_custom_legacy_frame_layouts`（自定义点击 / 框架布局） | 触角 touchpoints | **窄缺口**：全 src `热区/clickArea/hotZone/hitArea/dynamicCustom` 零命中；`customization/layouts.ts:101 freeform` 仅**整体布局模板**（拖拽排布），非「组件内区域点击定义」。**【已落地 2026-10-04: `modules/widget-hotzone` + `components/WidgetHotzonePanel.vue` 挂 `Touchpoints.vue` 触角, 百分比坐标热区画布 + 拖拽定位/方向微调 + 名称/动作编辑 + 增删/复位, 存 `hf:widget_hotzone`, 零网络】** |
| **506** | **AI 拍照引导取景**（Guided Photo Capture） | 知源中医 | raw `ai_tongue`/`ai_tongue_night`（AI 舌诊）、`tongue_front`（舌面取景）、`face_analysis`/`face_front_hint`（面诊正面提示）、`take_photo`、`shitu_loding`（识图 loading）、`scan_loading`、`analysis` | 中医 / 身体智慧 | **窄缺口**：全 src 仅 `data-sovereignty/LanQrScanner.vue` 有取景框（二维码），**无「拍照→AI 分析」引导流程**；桌面端经 Tauri `getUserMedia` 可行（LanQrScanner 已证） |

### 6.3 观察项（桌面端不适配 / 已覆盖）

| 信号 | 来源 App | 证据 | 不立项原因 |
|---|---|---|---|
| 传感器灵敏度 / 朝向设置 | 观星 | array `sensor_damping`/`sensor_damping_values`、`sensor_speed`/`_values`、`viewing_direction`/`_values` | 桌面无陀螺仪 / 磁力计 |
| 重力壁纸预览 | 组件岛 | raw `wallpaper_gravity_preview`、`gravity_guide_01~03` | 同上（桌面无重力感应） |
| 环境音景库 | 组件岛、时光序 | 组件岛 raw `audio_air_conditioner`/`audio_cleaner`/`audio_fan`/`audio_pinching`；时光序 `radio_station`/`city_afternoon`/`buzzing` | 已由 `sound-scene` + `WhiteNoisePanel.vue` 完整覆盖 |
| 提示音 / 闹铃音色 | 时光序、时光提醒、正气 | 时光序 `chime`/`dingdong`/`keyboard`/`guitar`/`pipa`/`hawaiian_smile`；时光提醒 `remind`/`remind_long`；正气 `sound_muyu`/`muyu_silence` | 已由 `sound-scene` tone 类（`冥想铃声`）+ `sleep-quality.ts` 闹铃音色覆盖 |
| 干支 / 农历 / 节气数据表 | 组件岛、人升 | 组件岛 array `tiangan_array`/`dizhi_array`/`chinese_month_array`/`chinese_month_day_1/2`；人升 `lunar_str`/`solar_term`/`solar_festival`/`tradition_festival` | 已由 `seasonal`（节气 / 节日）+ `zeitgeist`（时辰 / 节气）覆盖 |
| emoji 分类矩阵 | 人升 | array `emoji_by_category_raw_resources`（+`_gender_inclusive`）、`emoji_categories_icons` | 心流表情为静态情绪图标（`PlayGallery.vue MOOD_ICONS`），无 emoji 输入器场景 |
| 成就音效 / 开箱资产 | 人升 | raw `trophy`/`bag_of_coins_b`/`gifts_open`/`exploding_ribbon_and_confetti`/`checked_done`/`loading_shapes`/`ripple_16138` | 已由 `AnchorCelebration`/`AdvisorCelebrationPanel`（INCR-280）+ `anim_geode_reveal` 覆盖 |
| 会员权益矩阵 | 观星 | array `privilege_descriptions`/`privilege_icons_normal`/`privilege_icons_vip`/`privilege_titles`/`privilege_target_users` | 心流无付费会员体系 |

---

## 七、assets / Lottie 资源层下钻（补 INCR-507~510）

### 7.1 方法

资源表之外，`assets/` 是最后一层未覆盖的高信号区（探针 `probe8.cjs`，产物 `ui-assets.jsonl`）——它以 **Lottie 动效 JSON / 逐功能配置 JSON** 形式暴露「动效设计 + 功能清单」，且加固后完全存活：

| 资源形态 | 交互语义 | 高信号样例 |
|---|---|---|
| `assets/**/*.json`（Lottie 动效） | 复杂转场 / 状态动效 / 加载动画 | 生辰 `dynamic_island_charging.json`/`dynamic_island_music_animation.json`、知源中医 `lottie/*`、组件岛 `anim/player_pet_hatch_egg_tap/data.json` |
| `assets/**/*/info.json`（逐功能配置） | 功能清单 / 款式矩阵 / 教程项 | 组件岛 `tutorial/item/{floating,shortcut,spiritisland,statusbar,theme,widget}/info.json`、`*/choice_style/info.json` |
| `assets/*.json`（数据表） | 领域数据 | 万年日历 `chinaHistoryEvent.json`/`shiChenHealth.json`、天文通 `deep_sky/{messier,caldwell}_db.json`、时光序 `city_list.json` |

**关键体量**：组件岛 assets=77 JSON + 39 Lottie（全包最丰）、知源中医 21 JSON + 48 Lottie、生辰 21 JSON + 10 Lottie、天文通 20 JSON。

### 7.2 新候选

| INCR | 借鉴点 | 来源 App | 证据（真实资源名） | 落到房间 | 复核结论 |
|---|---|---|---|---|---|
| **507** | **随机决策器 / 决定转盘**（Decision Picker / Wheel） | 组件岛 | `assets/decision/decision_list.json`、`assets/decision/decision_list4.json`、`assets/decision/decision_name.json` | 全局 UI / 幕僚 / 触角 | **真缺口**：全 src `决策器/决定器/转盘/抽签/随机决策/decisionWheel` 零命中（`advisor` 为顾问建议、`will` 为遗嘱，语义无关）。**【已落地 2026-10-04: `modules/decision-wheel` + `components/DecisionWheelPanel.vue` 挂 `AdvisorHub.vue` 幕僚, 纯本地选项增删/旋转抽选/转动留痕, 零网络】** |
| **508** | **组件款式 / 皮肤矩阵**（Widget Style Variants） | 组件岛 | `assets/ocean_{big_1,middle_1,middle_4,small_1,small_4}/choice_style/info.json`、`assets/drink_water_{middle,small}/choice_style/info.json`、`assets/electronic_animal_{pixel_small,small}/choice_style/info.json`、`assets/ps_box_{middle,pixel_middle}/choice_style/info.json`、`assets/card_holder_{small_1,pixel_small_1}/choice_style/info.json`、`assets/roll_baji_middle_1/choice_style/info.json`、`assets/widget/game_score_small_1/choice_style/info.json`、`assets/{dress_up,sticker}/shape/info.json` | 触角 touchpoints | **真缺口**：全 src `款式/choiceStyle/styleVariant/外观款式` 零命中（`皮肤` 仅命中 TCM 身体皮肤）；`touchpoints/types.ts` 的 `WidgetType` 为单一样式，**无「每组件多款式可选」维度**（为 INCR-493 补款式面）。**【已落地 2026-10-04: `modules/widget-style` + `components/WidgetStylePanel.vue` 挂 `Touchpoints.vue` 触角, 每组件可选 简约/拟物/像素 三款式(实时预览) + 单件复位/全局复位, 存 `hf:widget_style`, 零网络】** |
| **509** | **动态岛 / 状态胶囊**（Dynamic Island） | 生辰 | `assets/dynamic_island_charging.json`（充电）、`assets/dynamic_island_music_animation.json`（音乐）、`assets/btn_charging.json`、`assets/charging_animation_bottom.json` | 触角 / 全局 UI | **窄缺口**：全 src `动态岛/灵动岛/dynamicIsland/statusCapsule/状态胶囊` 零命中；现有 `Touchpoints.vue` 幕僚问候浮窗为**底部卡片**，无「顶部居中状态胶囊」范式。**【已落地 2026-10-04: `modules/dynamic-island` + `components/DynamicIslandPanel.vue` 挂 `Touchpoints.vue` 触角, 时钟/专注/通知/电量/音乐五态平滑变形 + 自动轮播, 存 `hf:dynamic_island`, 零网络】** |
| **510** | **历史上的今天（历史事件）**（On This Day · History） | 万年日历 | `assets/chinaHistoryEvent.json`（中国历史事件表） | 时间线 / 万年历 | **窄缺口**：全 src 仅 `anchor/anchor-journals.ts:86 journalsOnThisDay`（**个人日志**回溯，`AnchorJournalRetroPanel.vue` 消费），**无公共历史事件库**与「今日历史事件」呈现 |

### 7.3 对既有候选的补强

| 既有候选 | 新增证据 | 意义 |
|---|---|---|
| **INCR-500 分步引导蒙层** | 组件岛 `assets/tutorial/tutorial/info.json` + `assets/tutorial/item/{floating,shortcut,spiritisland,statusbar,theme,widget}/info.json`（6 个引导项） | 教程是 **data-driven 逐功能配置**（浮窗/快捷方式/精灵岛/状态栏/主题/组件），印证「分步引导」为可配置子系统而非硬编码 |
| **INCR-497 桌面宠物养成** | 组件岛 `assets/anim/player_pet_hatch_egg_tap/data.json`（**孵蛋点击**动画）、`assets/anim/player_pet_hatch_egg_tap/` | 养成闭环起点补「孵蛋」——领养前有「蛋→孵化」环节 |
| **INCR-506 AI 拍照引导** | 知源中医 `assets/flutter_assets/assets/lottie/pulse.zip`/`pulse_camera.zip`/`pulse_loading.zip`（**脉诊相机**） | 拍照引导不止舌/面诊，还有**脉诊相机**场景（三诊齐全） |
| **INCR-501 字体库** | 天文通/知源中医 `assets/flutter_assets/FontManifest.json`（Flutter 字体清单） | 印证多字体为跨端常规能力 |

### 7.4 观察项（桌面端不适配 / 共享 SDK / 已覆盖）

| 信号 | 来源 App | 证据 | 不立项原因 |
|---|---|---|---|
| 手势引导 Lottie | 天文通、知源中医、组件岛、生辰、万年日历 | `assets/lottie_json/{shake_phone,swipe_right,twist_multi_angle}.json`（**5+ 包同名重复**） | 同名跨包重复 → 疑似共享 SDK / 广告引导，非产品设计信号 |
| 精灵岛（音乐/耳机联动） | 组件岛 | `assets/anim/spiritisland/{spirit_island,headset,music}.json` | 依赖耳机/音频外设联动，桌面场景弱 |
| 摇一摇音乐 | 组件岛 | `assets/shakeMusic/shakeMusic_{small_1,middle_1,pixel_small_3…}/data.json` | 桌面无摇动手势 |
| 打工人工牌 / 语录 | 组件岛 | `assets/workLicense/{name,quotes}.json`、`assets/worker/work_info.json` | 娱乐化，价值低 |
| 古籍标尺 | 识典古籍 | `assets/ruler_config.json` | 古籍阅读专用工具，通用性低 |
| 抽卡 / 扭蛋 | 组件岛 | `assets/acgn_lottery/lamination/info_{en,zh}.json` | 游戏化叙事，已由 `reward`/图鉴部分覆盖 |
| 深空天体目录 | 天文通 | `assets/modules/star_chart_module/catalogs/deep_sky/{messier,caldwell,bright_dso}_db.json` | 已由 `astronomy`/`sky` 模块覆盖 |
| 时辰养生 / 城市列表 | 万年日历、时光序 | 万年日历 `assets/shiChenHealth.json`；时光序 `assets/city_list.json`/`new_city_json.json` | 时辰养生已由 `zeitgeist`+`tcm` 覆盖；城市列表为行政区划数据（与 `common_area` 印证） |

---

## 八、assets 残余高信号补扫（第五轮 · 完备性收口）

### 8.1 方法

第七节的 assets 下钻以「Lottie 动效 / 逐功能配置 / 领域数据表」三类取样为主，仍有一批高信号 JSON 未逐项分析。本节对 `ui-assets.jsonl` 逐包做**完备性清点**（探针 `probe9.cjs`，用 `mt_apk_read_text` 实读内容而非只看路径名），确认 12 包 assets 层已无遗漏：

| 未分析文件（来源包） | 实读内容 | 判定 |
|---|---|---|
| 组件岛 `missFriend/{top,click/left,click/right}/data.json` | Lottie：想念朋友组件的顶部 + 左右点击动效 | 观察（社交需对端） |
| 组件岛 `certificate/certificate.json` | 39 个趣味称号（抬杠大王/熬夜大王/干饭大王…） | 观察（心流已有挑战称号 `discipline/challenge-recommender.ts`） |
| 组件岛 `static_wallpaper/{info,data}.json` | 分层壁纸合成配置（isLottie/isVideo/hasText/loopPlayback + list[base/sticker] + stickerList） | 观察（`aura/themes` + `HomeRoomAtmosphere` 已覆盖壁纸） |
| 组件岛 `baji/lamination/info_zh.json` | 11 种卡牌镭射膜工艺（亮膜/磨砂/十字镭射/珠光/动态玻璃/泡泡…） | 观察（实体收藏卡工艺，桌面无载体；`磨砂/珠光` 心流仅玻璃材质 `customization-advanced.ts:127`） |
| 组件岛 `dailysentence/daily_sentence.json` | 书籍名句库 | 已覆盖（`aura/content` 每日一句） |
| 组件岛 `app/system_app.json`、`SocialMedia.json` | OEM 相机/天气包名、社交平台分享链接 | 非 UI |
| 组件岛 `pinyin.json`、`weather/weather_info.json` | 拼音表、天气类型映射 | 已覆盖（`hanzi` / `aura` 天气） |
| 天文通 `js/meteor_events.json`、`js/all_meteor.json` | 流星雨事件表（日期/ZHR）+ 全目录（赤经赤纬/速度/峰值） | **已覆盖**（`timeline/astronomy.ts` `METEOR_SHOWERS` 8 大流星雨 + `getUpcomingMeteorShowers`；`observing/observation-plan.ts`） |
| 天文通 `curated_stargazing_spots.json` | 40+ 精选观星地点（省/坐标/海拔） | **新候选（8.2）** |
| 天文通 `moon_locations.json` | 月面地名库（月海/环形山，含经纬/直径） | **新候选（8.2）** |
| 天文通 `js/camera.json` | 天文相机硬件库（ZWO ASI 型号/芯片尺寸） | 观察（硬件选型，桌面无载体） |
| 生辰 `golden_tickets.json`、`explore/data.json` | 金券 Lottie、组件市场（VIP/付费/预览） | 已覆盖（`reward`）/ 补强 493·508 |
| 生辰 `Home/Setting/Discover.json` | 图标 Lottie | 装饰 |
| 识典古籍 `gif_push_permission_hand_lottie.json` | 推送权限「引导小手」 | 补强 500（引导层） |
| 知源中医 `data/wiki/lunar.json` | 加密二进制 | 不可读 |

### 8.2 新候选

| INCR | 借鉴点 | 来源 App | 证据（真实资源名） | 落到房间 | 复核结论 |
|---|---|---|---|---|---|
| **511** | **精选观星地点库 / 暗夜地点推荐**（Curated Dark-sky Spots） | 天文通 | `assets/flutter_assets/assets/curated_stargazing_spots.json`（40+ 地点：`怀柔·小梁前观星点`/`乌兰哈达火山`/`腾格里沙漠营地`… 含省 / desc / lat / lon / altitude） | 星空 sky / 观星 | **窄缺口【已落地 2026-10-04，commit 46b9f385】**：`sky/starfield.ts:369` 与 `sky/planets.ts:261` 观测地**硬编码北京 `(39.9,116.4)`**，`observing/observing.ts` 仅手动 `lightPollution` 0~10，**无地点库 / 城市选择**（全 src `观星点/暗夜/Bortle/光污染地图` 零命中）。价值：地点库→自动经纬度 + 海拔 + 光害，直接喂给既有 `starfield`/`observation-plan` 引擎。落地：建 `modules/sky/stargazing-spots.ts`（`CURATED_SPOTS` ~42 真实观星地 + 纯函数 + `useStargazingSpots` 单例持久化）+ `components/StargazingSpotsPanel.vue` 挂 `TimeCorridorView.vue`，`SkyGazePanel.vue` 读 `selectedSpot` 驱星图投影坐标（原硬编码北京已闭环） |
| **512** | **月面地名导览**（Lunar Feature Atlas） | 天文通 | `assets/flutter_assets/assets/moon_locations.json`（月海/环形山 ~50 项：`Oceanus Procellarum`/`Mare Imbrium`… 含 lat / lon / diameter） | 星空 sky | **窄缺口**：心流有月相（`timeline/astronomy.ts` + `observing`）但**无月面特征标注**（全 src `月面/环形山/月海/lunarFeature` 零命中）；niche（需月面图渲染），暂列观察待立项 |

### 8.3 收口判定

12 包 assets 层经第五轮完备性清点后**无更多达标候选**：流星雨 / 每日一句 / 天气 / 壁纸 / 组件市场 / 金券均已被既有模块覆盖；余下（想念朋友 / 趣味证书 / 静态壁纸贴纸 / 卡牌镭射膜 / 天文相机库）为社交依赖 · 实体载体 · 低价值观察项。结合第六 / 七节，**「96 APK 资源层下钻」正式收口**，UI 交互层候选池定格 **INCR-491~512**。

---

## 九、84 补扫包 anim/menu/xml/drawable 下钻（第六轮 · 全包完备性）

### 9.1 方法

前八节把 **12 个重点包**的 `anim/menu/xml/drawable` + 资源类型 + assets 逐层穷尽；本节把**同一交互资源层**扩到 96 包中的**其余 84 包**——探针 `probe-rest.cjs` 逐包提取 `anim/menu/xml(*_widget_info)/drawable` 去重名 + 八类资源计数，产物 `ui-rest.jsonl`（**84/84 全量完成**），再由 `mine-rest.cjs` 按 90+ 交互范式 token 白名单聚合（库前缀黑名单 `abc_/mtrl_/ksad_/gdt_/umeng_/exo_/tt_/ms_/ks_`… + 通用 UI 噪声 `dialog/spinner/indicator/background`… 剔除），逐项在 `heartflow/project/frontend/src` 全量 `rg` 复核。

**新增信号源**：酷安（drawable=2425）、相册（drawable=2590）、组件岛（`ocean` 水族系 530 条 / `ferriswheel` 摩天轮 / `fan_small_1_rotate` 风扇 / `christmas_crystal_ball` 水晶球 / `lyrics_scrolling` 滚动歌词）、灵占算命八字星座（`tarot`/`bazi_dial`/`divination_fire`/`pray` 命理集群）、堪舆山水卫星地图（`compass`/`svg_luban_ruler` 风水罗盘·鲁班尺）、多邻国（`widget_duo_streak_frozen` 连胜冻结）、OffScreen（`white_noise_wind_chime`/`white_noise_temple`）、Salt Player（`ic_hearusy_spectrum` 频谱）。

### 9.2 新候选

| INCR | 借鉴点 | 来源 App | 证据（真实资源名） | 落到房间 | 复核结论 |
|---|---|---|---|---|---|
| **513** | **电子水族箱 / 养鱼组件**（Aquarium / Fish-keeping Widget） | 组件岛 | drawable/anim `ocean_fish_01_01`~`ocean_fish_01_0N`（成组游鱼帧）、`ocean_4_feeding`（**喂食**）、`ocean_big_10_shader_0`~`_6` / `ocean_11_shader` / `ocean_9_shader`（水面着色器）、`ocean_big_10_bg` | 情绪花房 / 触角 | **真缺口**：全 src `水族/鱼缸/养鱼/aquarium/fishTank/fishbowl` 零命中（`鱼` 仅命中食材 `body/meal-nutrition.ts` 与汉字 `hanzi/hanzi-data.ts`）。既有 `emotion` 花房为**植物**养成载体，**无水生生物养成**（游鱼 / 喂食 / 水质），与 INCR-488/497 桌面宠物构成「陆·水」互补。**【已落地 2026-10-04: `modules/aquarium` + `components/AquariumPanel.vue` 挂 `EmotionGarden.vue` 情绪花房, 纯本地放养/投食/成长, 零网络】** |
| **514** | **漂流瓶 / 瓶中信**（Message in a Bottle） | 生辰、小组件盒子 | 生辰 drawable `ic_drift_bottle`/`ic_explore_drift_bottle`/`ic_tab_bottle`/`bg_drift_bottle`/`ill_drift_bottle_not_full`；小组件盒子 `ic_fishbowl_ship_bottle` | 留光阁 / 情绪 | **窄缺口**：全 src `瓶中信/寄信/信箱/明信片/邮筒` 零命中；仅 `light` 模块「落叶漂流」仪式（`light/types.ts:78`「将心事写在叶子上，放入溪流任其漂远」）语义相近，但**无「瓶身 / 封口 / 漂浮 / 拾取」范式**（`anchor.driftCount` 为锚点漂流计数，非信件）。**【已落地 2026-10-04: `modules/drift-bottle` + `components/DriftBottlePanel.vue` 挂 `EmotionGarden.vue` 情绪花房, 纯本地投递/漂浮/随机捞取/心情标记, 零网络】** |
| **515** | **逐句滚动跟读高亮**（Scrolling Lyrics / Sentence-sync Highlight） | 组件岛 | anim `lyrics_scrolling_1_20260410_middle_1`/`_2`/`_3` + `_scale`/`_translate`/`_content` 变体（歌词行**滚动 + 缩放 + 翻译**三层联动） | 阅览殿 / 听书 | **窄缺口**：全 src `歌词/lyrics/跟读/逐句/字幕` 零命中；`reading/tts.ts` 有朗读能力但**无逐句滚动高亮 / 双语联动**（与 INCR-502 悬浮迷你播放器、504 音色库同属「听书」簇）。**【已落地 2026-10-04: `reading/tts.ts` 暴露句块列表 `sentences` + `TtsControlPanel.vue` 逐句滚动跟读高亮区(当前句 accent 高亮+放大+自动滚动入视, 已读句变淡), 挂 `ReadingHall.vue` 听书区】** |

### 9.3 对既有候选的补强

| 既有候选 | 新增证据 | 意义 |
|---|---|---|
| **INCR-493 组件类型矩阵** | 组件岛 `ferriswheel_20250521_small_1`/`_2`（摩天轮组件）、`fan_small_1_rotate_1~4` + `ill_widget_fan_*` + `ic_fan_widget_cpu_temp`（**CPU 温度风扇组件**）、`christmas_crystal_ball_small_rotate_*`（水晶球组件）、`lyrics_scrolling_*`（滚动歌词组件）、`ocean_*`（水族箱组件）；时光序 `bookkeeping_*`（记账组件）、`drink_water_*`（喝水组件） | 组件类型再扩 6 类（摩天轮 / 风扇 / 水晶球 / 歌词 / 水族箱 / 记账 / 喝水），且多为**动画型组件**（旋转 / 滚动） |
| **INCR-509 动态岛 / 状态胶囊** | 生辰、小组件盒子 `ic_dynamic_island_move`/`_height_left·right_move`/`_width_left_move`/`_notification_type_selected·unselected`/`_chat`/`_bluetooth`/`_charging`/`_red_packet_switch`/`_type_switch` | 动态岛为**多状态可配置**（移动 / 宽高 / 通知类型 / 蓝牙 / 充电 / 红包），印证 509 的「状态胶囊」应为多态系统而非单态 |
| **INCR-498 空闲待机氛围场景** | 生辰、小组件盒子 `ill_standby_basketball_1~5`/`_battery_emoji_*`/`_cat_*` 系列 | 待机场景含**运动 / 电量 / 宠物**多主题，印证「季节主题可换的全屏插画」 |
| **INCR-487 电子木鱼** | 正气 anim `record_zen`/`record_zen_l`/`record_gong`/`record_gong_l`（禅意 · 锣音记录动效） | 木鱼同族含「禅意记录 / 锣音」变体，可作敲击音效与动效规格补充 |

### 9.4 观察项（桌面端不适配 / 共享库 / 已覆盖）

| 信号 | 来源 App | 证据 | 不立项原因 |
|---|---|---|---|
| 塔罗牌阵 / 八字盘 / 占卜 / 祈福 / 周公解梦 | 灵占算命八字星座 | drawable `tarot_arrays_shape`/`tarot_item_shape`/`tarot_keyword_shape_1~8`/`btn_tarot_shuffle_button_shape`、`bazi_dial_1~3`、`divination_fire_animation`、`btn_pray_wish_select`/`pray_progressbar`/`img_prayerbook`、`home_title_zhougongjiemeng` | **已覆盖 + 设计原则不符**：心流已有 `BodyWisdom.vue:111`「🃏 抽三张塔罗」、`self-mirror` 四柱八字 / 命盘 / 十二宫、`dream/dream-omen.ts` 梦象解读；且属命理迷信，宪法第 1 条本地私有 + 设计不引入 |
| 风水罗盘 / 鲁班尺 | 堪舆山水卫星地图 | drawable `compass_shape_*`/`flat_compass_image`/`svg_box_compass_rotate`/`svg_luban_ruler`（鲁班尺） | **观察**：`map/spatial-pattern.ts:6` 注释明确「**不引入任何风水迷信**，仅取纯几何方位格局」；罗盘 UI 已由 `Astrolabe.vue`（星盘罗盘环 N/S/E/W）呈现 |
| 气球互动 | Quizlet、椒盐笔记 | anim `balloon_heartbeat_*`/`balloon_shake_*`/`balloon_dispose_center`/`balloon_overshoot_center`/`balloon_elastic_center`/`balloon_none_in|out`/`balloon_fade_in|out` | **观察**：**两包同名资源** → 共享库 / 广告动效，非产品设计信号 |
| 音频频谱可视化 | Salt Player | drawable `ic_hearusy_spectrum` | **已覆盖**：`visualization/workshop/presets.ts:43` 已有「音波」预设（波形线 / **频谱柱列** / 节拍点） |
| 风铃 / 寺庙白噪音 | OffScreen | drawable `white_noise_wind_chime`、`white_noise_temple` | **已覆盖**：`cognition/types.ts`（禅院钟声木鱼 / 西藏颂钵）+ `sound-scene` 音景已覆盖 |
| 连续打卡冻结 / 补签 | 多邻国 | drawable `widget_duo_streak_frozen_*` + anim `widget_animate_duo_streak_frozen_*`（连胜冻结） | **观察**：心流宪法第 51 条「**不要求连续签到，中断后可直接继续**」已从设计上规避连续压力；`discipline/streak-system.ts:189` 中断仅**保存旧连续记录不施惩罚** → 冻结卡冗余 |
| 未来信件 | 时光序 | `future_letter_line_bitmap` | **已覆盖**：`Capsule.vue` + `parallel-world/time-capsule.ts` 时间胶囊 |
| 节拍器 / 计数器 / 标尺 / 魔方 / 镜子 | 单位换算、Keep、酷安、相册 | `ic_metronome`/`ic_tool_counter`、`ic_full_ruler`、`ic_cube_outline_white_24dp`、`icon_mirror` | **观察**：单图标小工具 / 图片镜像，桌面价值低 |

### 9.5 收口判定

84 补扫包交互资源层经全量扫描 + token 聚合 + 全 src 复核后**无更多达标候选**：命理 / 风水集群与心流宪法设计原则不符，共享库同名资源（气球）非产品信号，频谱 / 白噪音 / 时间胶囊 / 罗盘 / 塔罗 / 四柱均已覆盖，余下为单图标小工具。**「96 APK 交互资源层」至此双轮完备**（12 重点包 → 84 补扫包），UI 交互层候选池更新为 **INCR-491~515**。

---

## 十、结论

1. **UI 交互层共得 25 项新候选**：真缺口 10 项（**491 径向/扇形菜单**、**492 滚轮/旋钮选择器**、**493 桌面小组件类型矩阵扩展**、**497 桌面宠物养成系统**、**500 分步引导蒙层**、**501 字体库/字体选择**、**502 悬浮迷你播放器**、**503 日历显示偏好面板**、**507 随机决策器/决定转盘**、**508 组件款式/皮肤矩阵**）+ 窄缺口 10 项（494 垂直跑马灯、495 翻页数字时钟、496 角落缩放转场、498 空闲待机氛围场景、499 长按变速、**504 朗读音色库**、**505 组件自定义点击热区**、**506 AI 拍照引导取景**、**509 动态岛/状态胶囊**、**510 历史上的今天**）；第八节 assets 残余补扫再补 2 项窄缺口（**511 观星地点库**【已落地 2026-10-04】、**512 月面地名导览**）；第九节 84 补扫包下钻再补 3 项（**513 电子水族箱/养鱼组件** = 真缺口 + **514 漂流瓶/瓶中信**、**515 逐句滚动跟读高亮** = 窄缺口）。
2. **桌面端适配性**：径向菜单（491）与滚轮选择器（492）是**通用输入范式**，在桌面（鼠标拖拽 / 滚轮）上同样成立且心流当前完全缺失，价值最高；493 是**组件类型面**的直接补齐，与既有 `touchpoints` 架构天然兼容，落地成本最低。
3. **动效规格补齐**：组件岛的 anim 资源为 INCR-487/488 提供了可直接照搬的动作清单（木鱼「鱼体+功德文本」两层；宠物「行走/摇晃/位移/旋转」四式），drawable 层进一步把宠物补成**养成闭环**（497：领养→命名→喂食→升级→建屋）、把木鱼补成**设置/定时/进度**三面。
4. **复核纪律**：anim/menu/xml 层 **12 项已覆盖剔除 / 5 项观察**；drawable + 文案动词层再剔 **7 项观察**（摇一摇[广告 SDK]/下拉刷新/手势密码/重力感应/连点成线/悬浮球/双击）；array/raw/font/bool 层再剔 **8 项观察**（传感器灵敏度/重力壁纸/环境音景[已覆盖]/提示音[已覆盖]/干支农历[已覆盖]/emoji/成就音效[已覆盖]/会员权益）；assets/Lottie 层再剔 **8 项观察**（手势引导 Lottie[共享 SDK]/精灵岛/摇一摇音乐/工牌/古籍标尺/抽卡/深空目录[已覆盖]/时辰养生[已覆盖]）；第九节 84 补扫包层再剔 **8 项观察**（塔罗/八字/占卜/祈福/周公解梦[已覆盖+迷信]/风水罗盘·鲁班尺[设计原则]/气球[共享库]/频谱[已覆盖]/风铃·寺庙白噪音[已覆盖]/连胜冻结[宪法第51条规避]/未来信件[已覆盖]/节拍器等单图标小工具）。心流 UI 底座（手势、转场、进度环、热力图、侧栏多态、生命刻度、声场）覆盖度极高，新缺口集中在「**输入范式**（径向/滚轮/长按变速）」「**组件类型 / 款式广度**（493/495/498/503/508）」「**拟人陪伴养成**（497）」「**个性化 / 引导层**（500/501/504/505/506）」与「**媒体 / 状态呈现**（502/509/510/507）」五端。
5. **证据分级提示**：drawable 名易被库/SDK 前缀污染（`abc_/mtrl_/ksad_/gdt_/umeng_`），本轮以「库前缀黑名单 + 交互范式 token 白名单」双层过滤；`摇一摇`等高频词实为广告 SDK 触发语；assets 中 `lottie_json/{shake_phone,swipe_right,twist_multi_angle}.json` 在 5+ 包同名重复，同属**共享 SDK 引导**，**均不可**直接当作产品设计信号。
6. **资源层（第六 / 七节）独有价值**：`raw` 是唯一能暴露**音色包（`female_voice1~8`）/ 拍照 AI 引导（`ai_tongue`/`face_analysis`）/ 悬浮播放（`video_float_mini_window_guide`）**的层——这些能力在 dex 加固后仍以素材名存活；`font` 是**字体个性化**的唯一证据源；`bool`/`integer` 是**显示偏好矩阵**（万年日历 `N_*`）的唯一证据源；`assets/*/info.json` 是**功能清单 / 款式矩阵 / 教程项**的唯一证据源（组件岛 `choice_style`、`tutorial/item`）。四者共同补齐了 anim/drawable 无法覆盖的「个性化 + 引导 + 媒体 + 款式」缺口面。

> 候选池已登记于 `各类文件/markdown-历史报告/房间功能差距-136apk追踪.md`（UI 交互层块 + 更新日志），编号 **INCR-491~515**，按需立项。

---

## 附：产物索引

| 产物 | 路径 |
|---|---|
| 第一层汇总 | `借鉴分析/APK交互借鉴分析.md` |
| 第二层（功能缺口） | `借鉴分析/APK交互借鉴分析-第二层.md` |
| 第三层（UI 交互，本文件） | `借鉴分析/APK交互借鉴分析-UI交互层.md` |
| UI 交互探针（anim/menu/xml/drawable） | `e:\Heartflow\.hf-tmp\probe6.cjs` |
| drawable 语义探针 | `e:\Heartflow\.hf-tmp\drawable-mine4.cjs` |
| 资源类型探针（array/animator/raw/font/bool/integer/fraction） | `e:\Heartflow\.hf-tmp\probe7.cjs` |
| assets / Lottie 探针 | `e:\Heartflow\.hf-tmp\probe8.cjs` |
| assets 残余补扫探针（实读内容） | `e:\Heartflow\.hf-tmp\probe9.cjs` |
| UI 交互中间产物 | `e:\Heartflow\.hf-tmp\ui-interact.jsonl` |
| 资源类型中间产物 | `e:\Heartflow\.hf-tmp\ui-extra.jsonl` |
| assets 中间产物 | `e:\Heartflow\.hf-tmp\ui-assets.jsonl` |
