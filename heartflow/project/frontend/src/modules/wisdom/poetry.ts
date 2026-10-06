// ============================================================
// 知微阁 · 诗词卡片 (模块三十四)
// 借鉴诗词大全 / 国学大师：
//   - 历代诗词卡片（作者 / 朝代 / 体裁 / 正文 / 译文 / 赏析）
//   - 今日一诗（按日期确定性轮换）+ 随机一首
//   - 按朝代 / 题材 / 作者 / 关键词检索
//   - 收藏持久化（hf:poetry_favorites）
// 内容为传统文化知识呈现，纯函数 + 本地收藏持久化。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 一首诗 */
export interface Poem {
  id: string
  /** 篇名 */
  title: string
  /** 作者 */
  author: string
  /** 朝代 */
  dynasty: string
  /** 体裁（五言绝句 / 七言绝句 / 词 / 诗经 等） */
  form: string
  /** 正文（逐行） */
  lines: string[]
  /** 白话译文 */
  translation?: string
  /** 赏析 */
  appreciation?: string
  /** 题材标签（思乡 / 山水 / 送别 / 哲理 等） */
  tags: string[]
}

// ============================================================
// 诗词数据（历代精选 24 首）
// ============================================================

export const POEMS: Poem[] = [
  {
    id: 'p01', title: '静夜思', author: '李白', dynasty: '唐', form: '五言绝句',
    lines: ['床前明月光，疑是地上霜。', '举头望明月，低头思故乡。'],
    translation: '明亮的月光洒在床前，好像地上泛起一层白霜。抬头望着天上的明月，低头思念远方的故乡。',
    appreciation: '以月光起兴，由景入情，二十字写尽游子思乡之情，明白如话却意境深远。',
    tags: ['思乡', '月'],
  },
  {
    id: 'p02', title: '春晓', author: '孟浩然', dynasty: '唐', form: '五言绝句',
    lines: ['春眠不觉晓，处处闻啼鸟。', '夜来风雨声，花落知多少。'],
    translation: '春夜酣睡天亮了也不知道，醒来只听见处处鸟啼。回想昨夜的风雨声，不知花儿落了多少。',
    appreciation: '抓住春晨的一瞬，惜春之情含而不露，语言平易而韵味隽永。',
    tags: ['春天', '惜时'],
  },
  {
    id: 'p03', title: '登鹳雀楼', author: '王之涣', dynasty: '唐', form: '五言绝句',
    lines: ['白日依山尽，黄河入海流。', '欲穷千里目，更上一层楼。'],
    translation: '夕阳依傍着西山慢慢沉没，滔滔黄河朝着东海奔流。若想把千里的风光看遍，那就要登上更高的一层楼。',
    appreciation: '前两句写景壮阔，后两句说理深刻，蕴含积极向上的进取精神。',
    tags: ['哲理', '登高'],
  },
  {
    id: 'p04', title: '望庐山瀑布', author: '李白', dynasty: '唐', form: '七言绝句',
    lines: ['日照香炉生紫烟，遥看瀑布挂前川。', '飞流直下三千尺，疑是银河落九天。'],
    translation: '阳光照耀香炉峰生出紫色烟霞，远远望去瀑布像白练挂在山前。飞流直下仿佛有三千尺长，让人怀疑是银河从九天倾落。',
    appreciation: '夸张与想象并用，把瀑布的雄奇壮美写得淋漓尽致。',
    tags: ['山水', '壮丽'],
  },
  {
    id: 'p05', title: '春夜喜雨', author: '杜甫', dynasty: '唐', form: '五言律诗',
    lines: ['好雨知时节，当春乃发生。', '随风潜入夜，润物细无声。', '野径云俱黑，江船火独明。', '晓看红湿处，花重锦官城。'],
    translation: '好雨似乎会挑选时节，正当春天万物萌发时降临。它随风悄悄潜入夜色，滋润万物却悄无声息。田野小径乌云笼罩，江上渔火独自明亮。天亮再看那湿润的红花，沉甸甸开满锦官城。',
    appreciation: '以「喜」字贯穿全篇，拟人化写春雨，细腻传神，是咏雨名篇。',
    tags: ['春天', '喜悦'],
  },
  {
    id: 'p06', title: '相思', author: '王维', dynasty: '唐', form: '五言绝句',
    lines: ['红豆生南国，春来发几枝。', '愿君多采撷，此物最相思。'],
    translation: '红豆生长在南方，春天来了又发几枝。希望你能多采撷一些，因为它最能寄托相思之情。',
    appreciation: '借红豆寄托相思，语浅情深，含蓄隽永。',
    tags: ['红豆', '情思'],
  },
  {
    id: 'p07', title: '鹿柴', author: '王维', dynasty: '唐', form: '五言绝句',
    lines: ['空山不见人，但闻人语响。', '返景入深林，复照青苔上。'],
    translation: '空寂的山中看不见人影，只隐约听到说话的声音。落日的余晖返照进深林，又映照在青苔之上。',
    appreciation: '以动衬静，以光写幽，营造出空灵静谧的意境。',
    tags: ['山水', '空灵'],
  },
  {
    id: 'p08', title: '枫桥夜泊', author: '张继', dynasty: '唐', form: '七言绝句',
    lines: ['月落乌啼霜满天，江枫渔火对愁眠。', '姑苏城外寒山寺，夜半钟声到客船。'],
    translation: '月亮落下乌鸦啼叫寒霜满天，江边枫树与渔火相对，我满怀愁绪难以入眠。姑苏城外那寒山古寺，半夜里敲响的钟声传到了客船。',
    appreciation: '以「愁」为诗眼，月落、乌啼、霜、渔火、钟声交织成一幅清冷孤寂的夜泊图。',
    tags: ['羁旅', '愁思'],
  },
  {
    id: 'p09', title: '山行', author: '杜牧', dynasty: '唐', form: '七言绝句',
    lines: ['远上寒山石径斜，白云生处有人家。', '停车坐爱枫林晚，霜叶红于二月花。'],
    translation: '沿着弯弯曲曲的小路上山，白云生起的地方隐约有人家。停下车来是因为喜爱这傍晚的枫林，经霜的枫叶比二月的春花还要红艳。',
    appreciation: '色彩鲜明，动静相宜，末句「霜叶红于二月花」是千古名句。',
    tags: ['秋景', '山林'],
  },
  {
    id: 'p10', title: '悯农（其二）', author: '李绅', dynasty: '唐', form: '五言绝句',
    lines: ['锄禾日当午，汗滴禾下土。', '谁知盘中餐，粒粒皆辛苦。'],
    translation: '烈日当空锄禾，汗水滴进禾下的泥土。有谁知道盘中的饭食，每一粒都饱含辛苦。',
    appreciation: '以朴素语言揭示劳动艰辛，劝人珍惜粮食，感人至深。',
    tags: ['悯农', '劳动'],
  },
  {
    id: 'p11', title: '江雪', author: '柳宗元', dynasty: '唐', form: '五言绝句',
    lines: ['千山鸟飞绝，万径人踪灭。', '孤舟蓑笠翁，独钓寒江雪。'],
    translation: '千山万壑飞鸟绝迹，条条小路不见人影。孤舟上披蓑戴笠的老翁，独自在寒冷的江面垂钓。',
    appreciation: '二十字勾勒出天地苍茫的雪景，以「独钓」寄托诗人孤傲不屈的情怀。',
    tags: ['孤寂', '雪景'],
  },
  {
    id: 'p12', title: '游子吟', author: '孟郊', dynasty: '唐', form: '五言古诗',
    lines: ['慈母手中线，游子身上衣。', '临行密密缝，意恐迟迟归。', '谁言寸草心，报得三春晖。'],
    translation: '慈母手中的针线，缝成游子身上的衣裳。临行前密密缝补，唯恐儿子迟迟不归。谁说小草般的孝心，能报答春天阳光般的母爱呢。',
    appreciation: '以「线」与「衣」起兴，末句设问升华，写尽母爱的深沉与无私。',
    tags: ['母爱', '亲情'],
  },
  {
    id: 'p13', title: '出塞', author: '王昌龄', dynasty: '唐', form: '七言绝句',
    lines: ['秦时明月汉时关，万里长征人未还。', '但使龙城飞将在，不教胡马度阴山。'],
    translation: '依旧是秦汉时的明月与边关，万里征战的将士尚未归还。倘若龙城的飞将军李广还在，绝不会让胡人骑兵越过阴山。',
    appreciation: '时空交错，古今对照，既有边塞的苍凉，又有对良将的期盼。',
    tags: ['边塞', '豪情'],
  },
  {
    id: 'p14', title: '黄鹤楼送孟浩然之广陵', author: '李白', dynasty: '唐', form: '七言绝句',
    lines: ['故人西辞黄鹤楼，烟花三月下扬州。', '孤帆远影碧空尽，唯见长江天际流。'],
    translation: '老朋友在黄鹤楼与我辞别，在繁花似锦的三月顺流而下往扬州。孤帆的远影消失在碧空尽头，只看见长江向天际奔流。',
    appreciation: '以景结情，目送孤帆远去，离情尽在不言中。',
    tags: ['送别', '友情'],
  },
  {
    id: 'p15', title: '水调歌头·明月几时有', author: '苏轼', dynasty: '宋', form: '词',
    lines: [
      '明月几时有？把酒问青天。不知天上宫阙，今夕是何年。我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间。',
      '转朱阁，低绮户，照无眠。不应有恨，何事长向别时圆？人有悲欢离合，月有阴晴圆缺，此事古难全。但愿人长久，千里共婵娟。',
    ],
    translation: '明月从何时开始出现？我端起酒杯遥问苍天。不知天上的宫殿，今晚是哪一年。我想乘风归去，又怕那琼楼玉宇太高，经受不住寒冷。起舞玩赏清影，哪里比得上人间。转过朱红楼阁，低低挂在雕花窗上，照着难以入眠的人。月亮不该有恨吧，为何总在离别时圆？人有悲欢离合，月有阴晴圆缺，此事自古难以两全。只愿亲人平安长久，虽隔千里也能共赏明月。',
    appreciation: '全词以问月起兴，借月抒怀，既有出世之想又有入世之情，最后以旷达之语收束，是中秋词中的千古绝唱。',
    tags: ['中秋', '哲理'],
  },
  {
    id: 'p16', title: '念奴娇·赤壁怀古', author: '苏轼', dynasty: '宋', form: '词',
    lines: [
      '大江东去，浪淘尽，千古风流人物。故垒西边，人道是，三国周郎赤壁。乱石穿空，惊涛拍岸，卷起千堆雪。江山如画，一时多少豪杰。',
      '遥想公瑾当年，小乔初嫁了，雄姿英发。羽扇纶巾，谈笑间，樯橹灰飞烟灭。故国神游，多情应笑我，早生华发。人生如梦，一尊还酹江月。',
    ],
    translation: '大江浩荡东流，浪涛淘尽千古风流人物。旧营垒西边，人们说那是三国周瑜大破曹军的赤壁。乱石穿空，惊涛拍岸，卷起千堆雪浪。江山如画，一时涌现多少豪杰。遥想当年的周瑜，小乔初嫁，英姿勃发。手摇羽扇头戴纶巾，谈笑之间，曹军战船便灰飞烟灭。神游故国，多情的人该笑我早生白发。人生如梦，且洒一杯酒祭奠江月。',
    appreciation: '雄浑豪放，怀古伤今，将写景、咏史、抒情融为一体，是豪放词的代表作。',
    tags: ['怀古', '豪放'],
  },
  {
    id: 'p17', title: '如梦令·昨夜雨疏风骤', author: '李清照', dynasty: '宋', form: '词',
    lines: ['昨夜雨疏风骤，浓睡不消残酒。', '试问卷帘人，却道海棠依旧。', '知否，知否？应是绿肥红瘦。'],
    translation: '昨夜雨点稀疏风却猛烈，酣睡一觉残酒还未消。问那卷帘的侍女，她却说海棠花依旧。你知道吗？应是绿叶繁茂红花凋零。',
    appreciation: '以对话写惜春之情，「绿肥红瘦」造语新奇，极尽婉约之致。',
    tags: ['惜春', '婉约'],
  },
  {
    id: 'p18', title: '满江红·怒发冲冠', author: '岳飞', dynasty: '宋', form: '词',
    lines: [
      '怒发冲冠，凭栏处、潇潇雨歇。抬望眼、仰天长啸，壮怀激烈。三十功名尘与土，八千里路云和月。莫等闲、白了少年头，空悲切。',
      '靖康耻，犹未雪。臣子恨，何时灭。驾长车，踏破贺兰山缺。壮志饥餐胡虏肉，笑谈渴饮匈奴血。待从头、收拾旧山河，朝天阙。',
    ],
    translation: '怒发冲冠，凭栏远望，潇潇细雨刚停。抬头远望，仰天长啸，壮怀激烈。三十年的功名如尘土，八千里路的征程披星戴月。不要虚度光阴，等白了少年头，空自悲切。靖康之耻还未洗雪，臣子的仇恨何时能灭。驾着战车，踏破贺兰山缺。壮志满怀，饥餐胡虏肉，笑谈之间，渴饮匈奴血。待我重新收拾旧山河，再朝拜天阙。',
    appreciation: '慷慨激昂，气壮山河，将爱国之情与报国之志熔铸一炉，激励了无数后来者。',
    tags: ['爱国', '壮志'],
  },
  {
    id: 'p19', title: '题西林壁', author: '苏轼', dynasty: '宋', form: '七言绝句',
    lines: ['横看成岭侧成峰，远近高低各不同。', '不识庐山真面目，只缘身在此山中。'],
    translation: '横看是山岭侧看是山峰，远近高低各不同。看不清庐山的真面目，只因为自己就在这座山中。',
    appreciation: '借庐山说理，揭示「当局者迷」的哲理，深入浅出。',
    tags: ['哲理', '庐山'],
  },
  {
    id: 'p20', title: '泊船瓜洲', author: '王安石', dynasty: '宋', form: '七言绝句',
    lines: ['京口瓜洲一水间，钟山只隔数重山。', '春风又绿江南岸，明月何时照我还。'],
    translation: '京口与瓜洲只隔一水，钟山也不过隔着几重山。春风又吹绿了江南两岸，明月何时才能照我归乡。',
    appreciation: '「绿」字炼字精妙，千古传诵，思乡之情含蓄深婉。',
    tags: ['思乡', '江南'],
  },
  {
    id: 'p21', title: '小池', author: '杨万里', dynasty: '宋', form: '七言绝句',
    lines: ['泉眼无声惜细流，树阴照水爱晴柔。', '小荷才露尖尖角，早有蜻蜓立上头。'],
    translation: '泉眼悄然无声是因爱惜细流，树阴倒映水面是因喜爱晴日的柔和。小荷才露出尖尖的角，早有蜻蜓立在上面。',
    appreciation: '以「惜」「爱」拟人，捕捉初夏生机，画面清新灵动。',
    tags: ['夏日', '清新'],
  },
  {
    id: 'p22', title: '关雎（节选）', author: '《诗经》', dynasty: '先秦', form: '诗经',
    lines: ['关关雎鸠，在河之洲。窈窕淑女，君子好逑。', '参差荇菜，左右流之。窈窕淑女，寤寐求之。'],
    translation: '关关鸣叫的雎鸠，栖息在河中的小洲。文静美好的女子，是君子好的配偶。长短不齐的荇菜，左右采摘。文静美好的女子，日夜都在思念追求。',
    appreciation: '《诗经》开篇之作，以雎鸠和鸣起兴，写君子对淑女的思慕，是中国爱情诗的源头。',
    tags: ['爱情', '诗经'],
  },
  {
    id: 'p23', title: '蒹葭（节选）', author: '《诗经》', dynasty: '先秦', form: '诗经',
    lines: ['蒹葭苍苍，白露为霜。所谓伊人，在水一方。', '溯洄从之，道阻且长。溯游从之，宛在水中央。'],
    translation: '芦苇茂密苍苍，白露凝结成霜。所说的那个人，就在河水那一方。逆流而上去追寻，道路险阻又漫长。顺流而下去追寻，仿佛就在水中央。',
    appreciation: '以秋水蒹葭营造朦胧意境，写可望而不可即的思念，意境空灵悠远。',
    tags: ['思念', '秋水'],
  },
  {
    id: 'p24', title: '观沧海', author: '曹操', dynasty: '汉', form: '乐府',
    lines: [
      '东临碣石，以观沧海。水何澹澹，山岛竦峙。树木丛生，百草丰茂。秋风萧瑟，洪波涌起。',
      '日月之行，若出其中；星汉灿烂，若出其里。幸甚至哉，歌以咏志。',
    ],
    translation: '东行登上碣石山，来观赏大海。海水多么宽阔浩荡，山岛高高耸立。树木葱茏，百草丰茂。秋风萧瑟，巨浪翻涌。日月的运行，好像从海中升起；银河灿烂，好像出自大海。庆幸得很啊，用诗歌来抒发志向。',
    appreciation: '借大海吞吐日月的气象，抒写统一天下的雄心壮志，意境雄浑开阔。',
    tags: ['壮阔', '咏志'],
  },
]

export function listPoems(): Poem[] {
  return POEMS
}

export function poemById(id: string): Poem | undefined {
  return POEMS.find((p) => p.id === id)
}

/** 诗词检索：篇名 / 作者 / 朝代 / 体裁 / 题材 / 正文 */
export function searchPoems(query: string): Poem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return POEMS.filter((p) => {
    const hay = [
      p.title,
      p.author,
      p.dynasty,
      p.form,
      ...p.tags,
      ...p.lines,
    ].join(' ').toLowerCase()
    return hay.includes(q)
  })
}

export function poemsByDynasty(dynasty: string): Poem[] {
  return POEMS.filter((p) => p.dynasty === dynasty)
}

export function poemsByTag(tag: string): Poem[] {
  return POEMS.filter((p) => p.tags.includes(tag))
}

/** 去重后的朝代列表 */
export function dynasties(): string[] {
  return [...new Set(POEMS.map((p) => p.dynasty))]
}

/** 去重后的题材标签列表 */
export function tags(): string[] {
  return [...new Set(POEMS.flatMap((p) => p.tags))]
}

/** 今日一诗：按日期确定性轮换 */
export function poemOfTheDay(dateStr?: string): Poem {
  const d = dateStr ?? getLocalDateKey()
  let hash = 0
  for (let i = 0; i < d.length; i++) {
    hash = (hash * 31 + d.charCodeAt(i)) >>> 0
  }
  return POEMS[hash % POEMS.length]
}

/** 随机一首 */
export function randomPoem(): Poem {
  return POEMS[Math.floor(Math.random() * POEMS.length)]
}

// ============================================================
// 收藏持久化
// ============================================================

const FAV_KEY = 'hf:poetry_favorites'

const favoriteIds = ref<string[]>(loadFavorites())

function loadFavorites(): string[] {
  try {
    return storage.getKV<string[]>(FAV_KEY, [])
  } catch {
    return []
  }
}

function persistFavorites() {
  storage.setKV(FAV_KEY, favoriteIds.value)
}

export function usePoetryFavorites() {
  function toggleFavorite(id: string) {
    const idx = favoriteIds.value.indexOf(id)
    if (idx >= 0) favoriteIds.value.splice(idx, 1)
    else favoriteIds.value.push(id)
    persistFavorites()
  }

  function isFavorite(id: string): boolean {
    return favoriteIds.value.includes(id)
  }

  return {
    favoriteIds,
    toggleFavorite,
    isFavorite,
  }
}

// ============================================================
// 洞察
// ============================================================

/** 温和洞察：今日一诗 / 收藏诗词 / 题材分布 */
export function poetryInsights(): string[] {
  const lines: string[] = []
  const today = poemOfTheDay()
  lines.push(`今日一诗：《${today.title}》——${today.author}（${today.dynasty}）。`)
  if (favoriteIds.value.length > 0) {
    const names = favoriteIds.value
      .map((id) => poemById(id)?.title)
      .filter(Boolean)
      .join('、')
    lines.push(`你收藏了 ${favoriteIds.value.length} 首诗词：${names}。`)
  } else {
    lines.push('可以从收藏几首喜欢的诗词开始，慢慢积累自己的诗单。')
  }
  return lines
}
