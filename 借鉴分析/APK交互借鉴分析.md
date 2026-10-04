# APK 交互借鉴分析（96 APK · 交互/功能层）

> 数据来源：MT MCP 只读工作区（`http://192.168.1.17:8787/mcp`）对 96 个 APK 逐包解包。
> 分析链路：`mt-probe.ps1`（抽取交互信号）→ `_digest/*.md`（过滤框架噪声的摘要）→ 3 个分析组并行解读 → 本汇总。
> 生成时间：2026-10-04
> 证据口径：所有借鉴点均引用 APK 内真实出现的资源名 / 文案 / 布局名 / 小组件 provider / 深链 scheme，不臆造。

---

## 一、方法与数据链路

| 阶段 | 产出 | 说明 |
|---|---|---|
| 元数据 | `APK分析报告.md` | 96 包体积/权限/组件/技术栈 |
| 交互信号探针 | `_probe/*.json` + `*.strings.txt` | 启动页、深链 scheme·host、桌面小组件、shortcuts、Activity 数、layout/xml/menu/navigation/anim 资源名、assets 顶层、字符串表 |
| 摘要（去噪） | `_digest/*.md`（95 份） | 剔除 `abc_/androidx/mtrl_` 等框架前缀，保留业务资源名与中文/业务文案，每包约 7KB |
| 分组解读 | `_groups/A|B|C-*.md` | A 传统身心感官(25) / B 知识语言阅读笔记(30) / C 时间天文地图AI工具(40) |
| 本汇总 | 本文件 | 跨组归纳 + 按房间落点 + 立项候选 |

> 探针只取「静态资源与清单信号」，不含运行时 UI 截图；借鉴点定位在「功能结构 / 交互范式」层面。

---

## 二、跨组 Top 借鉴总表（30 条）

| # | 借鉴点 | 代表来源 App | 关键证据 | 落到心流房间 |
|---|---|---|---|---|
| 1 | **桌面小组件矩阵**：同功能做多尺寸(2x2/4x2/4x4)×多主题×多系统(标准/MIUI/Vivo) | 生辰、微信读书、OneNote、每日减脂、时光提醒 | 生辰 `Common2x2/4x2/4x4WidgetProvider`、`hitokoto_widget_info_default/red/white`；微信读书 `ReadingCalendarWidgetProvider`/`PlayerAppWidgetProvider`；OneNote `quick_capture/sticky_note/voice_capture_appwidget_provider`；每日减脂 `Water/FastingCount/WeightWidgetProvider` | 殿堂触角 / 家 / 各房间 |
| 2 | **时长·进度可视化日历 + 年度报告** | 微信读书、多邻国、云上写作、时光提醒 | 微信读书 `widget_reading_calender_info`；多邻国 `yir_report_*` + `monthly_goal`；云上写作 `activity_calendar_year_report`；时光提醒 `Life/Year/Month/Week/DayAppWidget` | 时间长廊 / 逐日心锚 / 留光阁 |
| 3 | **打卡+连续(streak)+排行+成就**成长闭环 | 知识星球、Quizlet、多邻国 | 知识星球 `activity_checkin_ranking_list`/`activity_checkin_poster`/`active_group_rank`「榜单每分钟更新一次」；Quizlet `achievements_badge_streaks_header`；多邻国 `streak_widget_info` | 逐日心锚 / 自律工坊 / 众生象 |
| 4 | **首页/入口配置化 JSON**（卡片与入口热改） | 海阔视界、酷安、可灵AI | 海阔 `home.json`/`homeSubView.json`；酷安 `config_card_app.json`/`config_card_discovery.json`；可灵 `home_entrance.json` | 心流 / 殿堂装修工坊 |
| 5 | **内容模块开关面板**（用户勾选生成哪些区块） | 批八字算命 | `bazi_neirong_setting`、`bazi_neirong_textview`「选择是否排出以下内容…」、`bazi_neirong_caiyun/hunyin/jiankang/...` | 殿堂装修工坊 / 众生象 / 镜我 |
| 6 | **装扮/换肤/贴纸系统** | 组件岛、人工桌面、酷安 | 组件岛 `activity_appwidget_dress_up`/`add_sticker`「贴纸库」；人工桌面「Change Outfit」「Change Color Palette」；酷安 `action_theme_to_use` | 殿堂装修工坊 |
| 7 | **可管理的内容源/订阅源** | 若风阅读、网易爆米花 | 若风 `activity_book_source_edit`/`activity_rss_source`/`book_source_share_url`；爆米花 `add_emby`/`add_jellyfin`/`add_smb`/`add_webdav` | 阅览殿 / 数据档案馆 |
| 8 | **自动备份 + 灾备恢复**（时间机器/回收站/WebDAV） | 纯纯写作、轻羽、椒盐、若风、时光序 | 纯纯 `activity_ultimate_article_recovery`/`menu_time_machine_search`；椒盐 `auto_backup_to_webdav`；若风 `backup_restore`「Backup the local and WebDav simultaneously」；时光序 `bill_recyclebin_restore` | 数据档案馆 / 保险库 |
| 9 | **AI 深度嵌入**（问书/写作补全/转写/生成/引用溯源/分支切换） | 微信读书、欧路词典、纯纯写作、秘塔、DeepSeek | 微信读书 `ai_wiki`「AI 问书」；欧路 `activity_ai_transcribe`；纯纯 `aiComplete`/`aiProofread`/`aiSuggestTitle`；秘塔 `cited_format`「被引 %d」；DeepSeek `branch_switcher_description`「Message %d of %d」/`citation_index` | 镜我 / 思绪书房 / 阅览殿 / 知微阁 |
| 10 | **划词多色标记 + 摘录收藏** | 欧路词典、每日英语听力 | `actionmode_light_color_blue/green/red/violet/yellow/orange`、`actionmode_addhighlight`「标记」、`actionmode_add_sentence`「收藏…保存到生词笔记」 | 阅览殿 / 字镜阁 / 书签 |
| 11 | **阅读器级护眼/主题/排版自定义** | 番茄浏览阅读器、静读天下、云上写作 | 番茄 `dialog_bluelight`/`dialog_custom_reading_modes`/`automatic_hyphenation`；静读天下 `bluelight_filter`/`amoled_mode`；云上写作 `HT_APPSetting_READ_BG_CUSTOM` | 殿堂装修工坊 / 守护室 |
| 12 | **房间级密码 / 生物识别锁** | 番茄、静读天下、云上写作、纯纯写作、相册 | 番茄 `dialog_app_password`/`authentication_required`；静读天下 `biometricprompt_fingerprint_verification`；相册 `add_secret_ensure_title`「Private album」；纯纯 `autoLock` | 保险库 / 守护室 |
| 13 | **快速捕获 / 灵感收集箱**（多入口一键入箱） | OneNote、云上写作、不背单词 | OneNote `bottom_sheet_quick_capture`；云上写作 `activity_inspiration`；不背单词 `add_new_word_method` | 未完成花园 / 思绪书房 |
| 14 | **系统级桌面快捷方式 + 自定义快捷栏** | 纯纯、云上写作、Quizlet、OneNote、ima | 各含 `shortcuts.xml`；纯纯 `activity_shortcut_bar_management`；云上写作 `activity_quick_menu_custom` | 殿堂触角 / 心流 |
| 15 | **专注会话结构 + 番茄钟参数化 + 挑战式自约束** | OffScreen | `activity_add_focus`/`add_focus_start/end/duration/mode/tag`/`activity_choose_emoji`；`choose_pomodoro_timer_duration/short_break/long_break/count`；`activity_screen_time_challenge`/`activity_continuous_use_challenge`/`activity_pickup_times_challenge` | 更漏 / 自律工坊 / 时间长廊 |
| 16 | **成长体系**：等级+勋章+晋升/降级动画+游戏化经济 | 华为运动健康、Keep、人升、天文大师 | 华为 `achieve_level_cn_rule`/`achieve_medal_all_share_layout`；Keep `achievement_people_count`「%d 人已获得」/`fd_rank_upgrade/keep/downgrade.json`；人升 `achievement_attribution_hero/...`（六维 50 级）+`Coin/Exp/Shop/InventoryAppWidget`+`dialog_open_loot_box` | 蜕变回廊 / 留光阁 / 劳酬 |
| 17 | **语音引导 cue 音频库**（流程节点化+逐段语音） | Keep | assets：`Egoal_achieved.mp3`/`Egoal_half_achieved.mp3`/`Erest.mp3`/`Etimer.mp3`/`Ecountdownend.mp3`/`Ekeep5second.mp3` 等 | 动律之间 / 息壤 / 逐日心锚 |
| 18 | **保活/守护策略面板**（自启动/后台/电池优化/通知常驻/壁纸守护） | 生辰、夜间模式、Salt Player | 生辰 `advanced_setting_auto_start/background/ignore_battery_opt/notification_background`；夜间模式「壁纸守护」；Salt Player「后台音乐保护」/`auto_start_permission_on_miui` | 守护室 / 自律工坊 |
| 19 | **环境自适应 + 安全阈值二次确认** | 夜间模式 | 「高光自动关闭」「亮度充足时提示关闭夜间模式」「暗度高于90%，太暗了…你是否坚持使用原有的高暗度？」 | 守护室 / 息壤 |
| 20 | **深链按功能域划分 host** | 正气、灵占 | 正气 host `book/checkin/checkinlog/music/thread`；灵占 host `dream/qiuqian/share_for_h5` | 殿堂触角 / 访客中心 |
| 21 | **时辰/身体时钟**（时间×身体状态绑成可视表盘） | 知源经络穴位、中医经络穴位流注 | `MeridianCirculationClockMini`/`MeridianFlowingClockMini`/`LingGuiClock`/`FeiTengClock`/`TrueSolarTime`；「人体24小时」`button24hours`/「健康报时」`healthAlarm`/`hourAlarmsCount` | 岁时阁 / 藏象阁 / 身体温室 |
| 22 | **目标四阶段 + 勋章动画反馈** | 时光序 | `fx_target_s1_prepare/s2_progress/s3_expired/s4_finish`、`fx_target_medal_cycle`、`fx_target_break_cycle` | 留光阁 / 蜕变回廊 |
| 23 | **那年今日 / 自动成集（故事·旅程）** | 相册 | `activity_that_year_today`、`activity_story_list`/`activity_story_detail`、`activity_media_journey` | 逐日心锚 / 时间长廊 |
| 24 | **足迹打卡 + 「连点成线」自动成线** | 元地球Earth | `activity_add_foot_print`、`auto_line_title`「连点成线」、`auto_line_all_connected`「一键连接文件夹内的所有标记点」、`all_distance`「总里程：%s Km」 | 地图室 / 时间长廊 |
| 25 | **折叠日历（月↔周 展开/收起）** | 万年日历 | `CalendarState.MONTH_STRETCH/WEEK`、`N_stretch_month_height`、`from_today`「回到今天」 | 时间长廊 |
| 26 | **规则/脚本引擎**（可编辑、可分享） | 海阔视界、嗅觉浏览器、自动点击器 | 海阔 `al_rule_edit_options`/`js_edit_options`/`help_rules.json`/`help_js.json`；自动点击器 `script`「Do you want to save the current script?」 | 自律工坊 |
| 27 | **就寝/睡眠多步引导向导** | 时钟 | `bedtime_guide_setting_welcome/sleeptime/wake_up_time/no_disturbance/complete`、`bedtime_setting_complete`「Sleep tight!」 | 梦乡小筑 / 息壤 |
| 28 | **历法/玄学数据**（黄历宜忌、财喜方位、干支生肖、星官星宿） | 万年日历、AR星座、系统语音引擎 | 万年历 `activity_almanac_now_article`/`activity_cai_xi_compass`/`shiChenHealth.json`/`DynastyInfo.db`；AR星座 `Data_XingguanMyth.csv`/`Data_Xingxiu.csv`/`Data_SolarTerm.csv` | 岁时阁 / 文明根系 |
| 29 | **难度/熟悉度自适应与分级** | 无痛单词、多邻国、每日英语听力 | 无痛 `change_quality`「修改熟悉度」/`child_prodigy_mode`「神童模式」/`article_level`「阅读分级」/`advancement_content`「建议切换至更高阶单词本」 | 知微阁 / 释光阁 / 阅览殿 |
| 30 | **多端/桌面版联动** | 纯纯写作、网易爆米花 | 纯纯 `autoConnectToDesktop`；爆米花 `activity_login_devices_setting`/`activity_login_device_detail` | 数据档案馆 / 访客中心 |

---

## 三、按心流房间的借鉴落点（房间 → 可直接借鉴的交互）

| 房间 | 可借鉴交互（来源） |
|---|---|
| **殿堂触角 / 心流** | 桌面小组件矩阵(生辰/微信读书/OneNote)、配置化首页 JSON(海阔/酷安/可灵)、系统快捷方式+自定义快捷栏(纯纯/云上写作)、深链功能域 host(正气/灵占) |
| **时间长廊** | 时长日历+年度报告(微信读书/多邻国/云上写作)、生命/时间进度组件(时光提醒)、折叠日历月↔周(万年日历)、那年今日(相册)、连点成线足迹(元地球) |
| **逐日心锚** | 打卡 streak+排行+成就(知识星球/Quizlet)、每日摘要组件(时光序)、那年今日、时辰报时(中医经络流注) |
| **情绪花房 / 安全岛** | 环境自适应+阈值二次确认(夜间模式)、就寝引导向导(时钟)、私密空间(相册) |
| **留光阁** | 目标四阶段+勋章动画(时光序)、成长等级+勋章(华为/Keep)、挑战式自约束(OffScreen) |
| **阅览殿** | 内容源/订阅源管理(若风/爆米花)、划词多色标记+摘录(欧路/每日英语听力)、听书后台播放+播放器组件(微信读书/听书)、AI 问书(微信读书)、阅读器护眼/排版自定义(番茄/静读天下) |
| **字镜阁 / 知微阁** | 难度自适应分级(无痛单词)、回答分支切换(DeepSeek)、AI 润色(时光序)、多色标记沉淀(欧路) |
| **思绪书房** | 快速捕获/灵感收集箱(OneNote/云上写作)、写作量化统计(纯纯/轻羽/云上写作)、时间机器灾备(纯纯)、AI 补全/校对(纯纯) |
| **身体温室 / 藏象阁** | 时辰/身体时钟(知源经络穴位)、时辰养生数据(万年日历)、语音引导 cue(Keep)、功能性微组件按数据源拆分(每日减脂) |
| **动律之间 / 息壤** | 语音引导 cue 库(Keep)、专注休息波浪动画(时光序)、就寝向导(时钟) |
| **更漏 / 自律工坊** | 专注会话结构+番茄参数化+挑战(OffScreen)、重复规则(时光序)、规则/脚本引擎(海阔/嗅觉/自动点击器)、AI Agent 集群(招募/解雇/状态, Kimi) |
| **守护室** | 保活/守护策略面板(生辰/夜间模式/Salt Player)、环境自适应阈值(夜间模式)、房间级密码/生物识别锁(番茄/静读天下) |
| **保险库 / 数据档案馆** | 房间级密码/生物识别锁、自动备份+灾备恢复(纯纯/椒盐/若风)、回收站(时光序)、多端联动(纯纯/爆米花) |
| **众生象 / 镜我 / 蜕变回廊** | 内容模块开关(批八字)、成长体系(华为/Keep/人升)、AI Agent 集群(Kimi)、AI 引用溯源(秘塔/DeepSeek) |
| **岁时阁 / 文明根系** | 时辰/身体时钟、历法玄学数据(万年历/AR星座)、中国历史朝代库(`DynastyInfo.db`) |
| **地图室** | 足迹打卡+连点成线(元地球)、财喜方位罗盘(万年历) |
| **殿堂装修工坊** | 装扮/换肤/贴纸(组件岛/人工桌面)、配置化首页(海阔)、阅读器主题自定义(番茄/静读天下) |
| **劳酬** | 游戏化经济(人升金币/经验/商店/背包)、分类预算+超支提醒(时光序)、重复记账规则(时光序) |
| **梦乡小筑** | 就寝/睡眠多步引导向导(时钟) |
| **根脉之庭 / 羁绊之厅** | 家谱成员(万年历) |

---

## 四、分类明细

各分类的逐 App 借鉴清单与逐 App 速览见三份分报告：

- **A 组**（中医/经络 7、健康/运动 5、玄学/命理 5、护眼/专注 3、音乐/音频 5）：`_groups/A-传统身心感官.md`
- **B 组**（语言/单词 12、阅读/古籍 8、笔记/写作 10）：`_groups/B-知识语言阅读笔记.md`
- **C 组**（时间/任务 7、天文/观星 5、地图/地球 3、AI/助手 8、工具/系统 15、其他 2）：`_groups/C-时间天文地图AI工具.md`

### 各组最强信号速记

- **A 组**：桌面小组件矩阵（生辰 12+ 组件）、时辰/身体时钟（知源经络穴位）、内容模块开关（批八字 30+ 模块）、专注+番茄+挑战（OffScreen）、成长等级勋章（华为/Keep）、保活守护面板（生辰/夜间模式/Salt Player）、音频控制条与音频焦点协作（ExoPlayer 系）。
- **B 组**：房间级小组件矩阵（奶酪/微信读书/OneNote）、时长日历+年度报告、打卡 streak+排行+成就、划词多色标记、可管理内容源、自动备份+灾备、写作量化统计、AI 深度嵌入、听书后台播放、阅读器护眼排版、房间级锁、快捷方式、快速捕获、多端联动、难度自适应。
- **C 组**：配置化首页 JSON、装扮换肤、小组件矩阵、时间/生命进度、回收站、目标四阶段勋章、六维属性+游戏化经济、AI Agent 集群、知识库引用溯源、回答分支切换、那年今日/自动成集、私密空间、足迹连点成线、折叠日历、规则脚本引擎、就寝引导、历法玄学数据。

### 低价值/负样本（证据不足，不建议借鉴）

| App | 原因 |
|---|---|
| Readable、百词斩托福、搜古籍、闪卡与笔记、OpenWrite | 摘要几乎只有 RN/Flutter 框架串或广告 SDK 文案 |
| 快背中医、文墨天机、称骨算命 | 逻辑在 webview / Adobe AIR(`App.swf`) 内，静态信号稀少 |
| 超级小爱、密码、蛋蛋分享库 | 极简代理/壳（1-10 Activity） |
| 工时记录、WorkBuddy、IMYAI | uni-app / Flutter / webview 壳，仅深链可借鉴 |
| 知源中医 | 中文文案被内置第三方音乐库字符串污染，仅采用资源名类证据 |

---

## 五、建议立项清单（INCR 候选）

> 按「可迁移价值 × 证据强度」排序，供后续在追踪文件 backlog 中立项。

| 优先级 | 建议项 | 借鉴源 | 落到房间 | 证据 |
|---|---|---|---|---|
| P1 | **多尺寸/多主题小组件体系**：把房间核心数据做成可配置的小组件/桌面卡片（尺寸×主题×深浅色） | 生辰、微信读书、OneNote、每日减脂 | 殿堂触角 / 家 / 各房间 | 见 Top#1 |
| P1 | **时长·进度可视化日历 + 年度报告** | 微信读书、多邻国、云上写作 | 时间长廊 / 逐日心锚 | Top#2 |
| P1 | **房间级密码/生物识别锁**（按房间粒度加锁） | 番茄、静读天下、纯纯、相册 | 保险库 / 守护室 | Top#12 |
| P1 | **快速捕获/灵感收集箱**（全局一键入箱，多入口） | OneNote、云上写作、不背单词 | 未完成花园 / 思绪书房 | Top#13 |
| P1 | **自动备份 + 灾备恢复（时间机器/回收站）** | 纯纯、椒盐、若风、时光序 | 数据档案馆 / 保险库 | Top#8 |
| P2 | **内容模块开关面板**（房间内容区块用户自选） | 批八字算命 | 殿堂装修工坊 / 众生象 | Top#5 |
| P2 | **配置化首页/入口 JSON**（卡片与入口热改） | 海阔视界、酷安、可灵AI | 心流 / 殿堂装修工坊 | Top#4 |
| P2 | **装扮/换肤/贴纸系统** | 组件岛、人工桌面、酷安 | 殿堂装修工坊 | Top#6 |
| P2 | **专注会话结构 + 番茄参数化 + 挑战式自约束** | OffScreen | 更漏 / 自律工坊 | Top#15 |
| P2 | **目标四阶段 + 勋章动画** | 时光序 | 留光阁 / 蜕变回廊 | Top#22 |
| P2 | **划词多色标记 + 摘录收藏** | 欧路、每日英语听力 | 阅览殿 / 字镜阁 | Top#10 |
| P2 | **AI 引用溯源 + 回答分支切换** | 秘塔、DeepSeek | 阅览殿 / 字镜阁 | Top#9 |
| P2 | **就寝/睡眠多步引导向导** | 时钟 | 梦乡小筑 / 息壤 | Top#27 |
| P3 | **时辰/身体时钟**（时间×身体状态表盘） | 知源经络穴位、中医经络流注 | 岁时阁 / 藏象阁 | Top#21 |
| P3 | **那年今日 / 自动成集** | 相册 | 逐日心锚 / 时间长廊 | Top#23 |
| P3 | **足迹连点成线** | 元地球Earth | 地图室 | Top#24 |
| P3 | **折叠日历 月↔周** | 万年日历 | 时间长廊 | Top#25 |
| P3 | **语音引导 cue 音频库** | Keep | 动律之间 / 息壤 | Top#17 |
| P3 | **难度/熟悉度自适应分级** | 无痛单词、多邻国 | 知微阁 / 释光阁 | Top#29 |
| P3 | **历法玄学数据接入**（黄历宜忌/星官星宿/朝代库） | 万年历、AR星座 | 岁时阁 / 文明根系 | Top#28 |

---

## 六、数据质量与局限

1. **静态信号**：全部来自 APK 静态解包（清单/资源/字符串），未做运行时抓取或截图，交互「手感/动效」层未覆盖。
2. **资源混淆**：部分 App 布局/资源名被混淆（如 人升 `res/-0.png`），此类以「资源名数量 + 字符串文案」为主证据。
3. **文案污染**：个别 App（知源中医）中文文案被内置第三方库字符串污染，已降级为仅采用资源名证据。
4. **框架壳**：RN/Flutter/uni-app/AIR 壳类 App 静态信号稀少，已在分报告中标注为低价值/负样本。
5. **借鉴≠照搬**：桌面端（Vue+Tauri）无移动传感器/桌面小组件运行环境，借鉴点应落在「信息结构、交互范式、可配置化」层面，落地时需按心流房间既有架构（薄委托面板 + modules composable + storage）改造。

---

## 七、真缺口核验结论（2026-10-04 · 代码库全量复核）

> 对候选池 INCR-467~486 逐项在 `heartflow/project/frontend/src` 全量 `rg` 复核既有实现（模块 / 组件 / 引擎 / 视图），按「引擎或模块是否已存在且被 UI 消费」判定。**目的**：避免把 Heartflow 已有的能力误当缺口立项（沿用项目「全 src 复核 → 确证真缺口」纪律）。

| INCR | 借鉴点 | 核验证据（真实存在的实现） | 结论 |
|---|---|---|---|
| 467 | 多尺寸/多主题小组件 | `touchpoints` 的 `WidgetInstance.size`（WidgetSize small/medium）+ `WidgetTheme`（accent/radius/alpha/bg）+ `WidgetThemeControls.vue` + 多实例(x/y) + `/widgets` 管理页 | 已覆盖 · 剔除 |
| 468 | 时长日历 + 年度报告 | `CalendarView.vue`（专注时长日历，`day-bar` 按当日 `totalMinutes` 定宽）+ `annual-review.ts`（年度陈列信）+ `NarrativeReportPanel.vue` + `HabitCalendarPanel.vue` + 小组件 `activityHeatmap` | 已覆盖 · 剔除 |
| **469** | **房间级密码/生物识别锁** | 核验时仅有**全局** `reward/privacy-lock.ts`（主密码/会话锁），`RoomSettingsPanel.vue` 只管理 name/icon/color/pin，全库无 per-room lock（`rg` 房间锁/perRoom/room.*password 零命中） | **真缺口 · 已落地（2026-10-04）** |
| 470 | 快速捕获/灵感收集箱 | `QuickCapture.vue` + `GlobalDropDrawer.vue` + `reading/inbox.ts` + `ClipboardPanel.vue` | 已覆盖 · 剔除 |
| 471 | 自动备份 + 灾备恢复 | `safety/backup-recovery.ts`（full/incremental/config-only + RestoreResult）+ `BackupRecoveryPanel.vue` + `SyncCenterPanel.vue` + `CloudSync.vue` + `RecoveryOptimizerPanel.vue` + `OutputSnapshotsPanel.vue` | 已覆盖 · 剔除 |
| 472 | 内容模块开关面板 | `room-manager` 的 per-room `visible` 显隐 + `RoomSettingsPanel.vue`（房间级而非房间内区块级） | 部分覆盖 · 降级 |
| 473 | 配置化首页/入口 | `HomeSpace` + `SpaceCustomizer.vue` + `room-manager` 钉位 + `HomeReplicaView.vue` | 已覆盖 · 剔除 |
| 474 | 装扮/换肤/贴纸 | `customization` 模块 + `aura/themes` + `SpaceCustomizer.vue` + `CustomizationAdvancedPanel.vue` + `astrolabe/useAstrolabeTheme` | 已覆盖 · 剔除 |
| 475 | 专注会话 + 番茄参数化 + 挑战 | `clepsydra/time-block.ts` + `discipline/pomodoro-forest.ts` + `ChallengeAdvisorPanel.vue` | 已覆盖 · 剔除 |
| 476 | 目标四阶段 + 勋章动画 | `goal/goal-state-machine.ts` + `craft/craft-badges.ts` + `reward` + `movement/achievements.ts` | 已覆盖 · 剔除 |
| 477 | 划词多色标记 + 摘录 | 摘录/划线回流已覆盖（`reading/highlight-flow.ts` → study `quickCapture`、`reading/hall.ts`、`classical-vertical.ts` 标注）；**多色**标记器未见 | 窄缺口 · 观察项 |
| 478 | AI 引用溯源 + 回答分支切换 | 引用溯源已覆盖（`mirror/knowledge-citation.ts`）；重答已覆盖（`MirrorDialogue.vue:65` `regenerate`）；DeepSeek 式「Message N of M」多分支导航未见 | 大部覆盖 · 观察项 |
| 479 | 就寝/睡眠引导向导 | `RestSleepPanel.vue` + `rest/sleep-quality.ts` + `home/Bedroom.vue` | 已覆盖 · 剔除 |
| 480 | 时辰/身体时钟 | `body-wisdom/meridian-visualization.ts` + `zeitgeist` | 已覆盖 · 剔除 |
| 481 | 那年今日/自动成集 | `anchor/photo-diary.ts` + `journey` + `timeline` | 已覆盖 · 剔除 |
| 482 | 足迹连点成线 | `MapRoom.vue:40` 已渲染 `polyline.map-journey`（`journeyPoints`）+ `footprint/footprint.ts` | 已覆盖 · 剔除 |
| 483 | 折叠日历月↔周 | `CalendarView.vue` 月视图 | 已覆盖 · 剔除 |
| 484 | 语音引导 cue | `reading/tts.ts` + `TtsControlPanel.vue` | 已覆盖 · 剔除 |
| 485 | 难度/熟悉度自适应 | `word-mirror/personal-vocabulary.ts` + `writing-enhance.ts` | 已覆盖 · 剔除 |
| 486 | 历法玄学数据 | `astrolabe` + `FourPillarsPanel.vue` + `seasonal` + `traditions` + `zeitgeist` | 已覆盖 · 剔除 |

**核验小结**：20 项候选中 **17 项 Heartflow 已有等价实现（剔除）**，1 项部分覆盖（472 降级），2 项窄缺口观察（477 多色标记 / 478 多分支导航），**唯一确定的真缺口为 INCR-469「房间级锁」**（现有隐私锁是全局主密码，`RoomSettingsPanel` 无 per-room 粒度）。

**结论**：96 APK 交互分析的主要价值是**确认既有能力面已完整 + 定位少数真空白**，而非大面积缺口；唯一真缺口 INCR-469 已于 2026-10-04 落地。

### 7.1 INCR-469 落地记录（2026-10-04）

**借鉴源**：番茄小说 / 静读天下 / 纯纯写作 / 相册等 APK 的「应用/房间锁」——为敏感房间单独设密码，进入前需解锁。

**实现**（与全局 `reward/privacy-lock` 相互独立，按房间粒度）：
- `src/modules/room-lock/index.ts`：纯函数 `fingerprintRoomPassword` / `verifyRoomPassword` / `isRoomLockConfigured`（复用 `reward/crypto-utils` 的迭代哈希，仅存指纹不存明文）；`useRoomLock()` 负责存储（`hf:room_locks`，roomId→`{enabled,passwordHash,salt,hint}`）与会话态（内存解锁集，刷新即重锁）。API：`setup` / `changePassword` / `disable` / `unlock` / `lock` / `isLocked` / `getHint` / `configuredCount`。
- `src/components/RoomLockGate.vue`：进入遮罩。当前房间「已配置且本会话未解锁」时覆盖全屏，校验通过即解锁；切换路由自动重判并清空输入。挂载于 `App.vue` 主内容区（`v-if="!showUnlock"`）。
- `src/components/RoomSettingsPanel.vue`：每房锁管理区（启用 / 改密码 / 关闭 / 立即锁定）+ 卡片头 🔒/🔓 标识。
- `src/modules/index.ts`：补 barrel 导出。

**验证**：定向 17 用例全过（引擎 11 / 组件 6）；room-mount 91/91；eslint 0 错；`check-circular-deps` 无新增环。

**结论**：候选池至此清空——真缺口已实现，477/478 维持观察项。

---

## 附：产物索引

| 产物 | 路径 |
|---|---|
| 元数据报告 | `E:\Heartflow\借鉴分析\APK分析报告.md` |
| 交互信号（原始） | `E:\Heartflow\借鉴分析\_probe\*.json` / `*.strings.txt` |
| 交互信号（摘要） | `E:\Heartflow\借鉴分析\_digest\*.md` |
| 分组报告 A/B/C | `E:\Heartflow\借鉴分析\_groups\*.md` |
| 本汇总 | `E:\Heartflow\借鉴分析\APK交互借鉴分析.md` |
