/**
 * 账单分类自动映射规则
 * 支付宝：基于"交易分类"字段映射
 * 微信：基于"交易对方"关键词匹配
 */

export interface MappingSuggestion {
  l1Name: string    // 一级分类名称
  l2Name: string    // 二级分类名称
}

/** 支付宝"交易分类" → 我们的分类 */
const ALIPAY_CATEGORY_MAP: Record<string, MappingSuggestion> = {
  '餐饮美食':   { l1Name: '餐饮饮食', l2Name: '三餐主食' },
  '交通出行':   { l1Name: '交通出行', l2Name: '公共交通' },
  '生活服务':   { l1Name: '居住生活', l2Name: '水电燃气' },
  '日用百货':   { l1Name: '购物消费', l2Name: '日用百货' },
  '数码电器':   { l1Name: '购物消费', l2Name: '数码电器' },
  '教育培训':   { l1Name: '教育提升', l2Name: '学费培训' },
  '文化休闲':   { l1Name: '娱乐休闲', l2Name: '兴趣爱好' },
  '服饰美容':   { l1Name: '购物消费', l2Name: '美妆护肤' },
  '休闲娱乐':   { l1Name: '娱乐休闲', l2Name: '兴趣爱好' },
  '家居家装':   { l1Name: '居住生活', l2Name: '家居用品' },
  '医疗健康':   { l1Name: '医疗健康', l2Name: '门诊就医' },
  '住房物业':   { l1Name: '居住生活', l2Name: '房租房贷' },
  '通讯物流':   { l1Name: '居住生活', l2Name: '物业网费' },
  '运动户外':   { l1Name: '娱乐休闲', l2Name: '运动健身' },
  '珠宝配饰':   { l1Name: '购物消费', l2Name: '服装鞋帽' },
  '母婴亲子':   { l1Name: '人情社交', l2Name: '宠物开销' },
  '商业服务':   { l1Name: '其他',     l2Name: '其他支出' },
  '公共服务':   { l1Name: '居住生活', l2Name: '水电燃气' },
  '其他':       { l1Name: '其他',     l2Name: '其他支出' },
  '退款':       { l1Name: '其他',     l2Name: '其他支出' },
}

/** 微信"交易对方"关键词 → 我们的分类（按优先级排序，先匹配到的生效） */
const WECHAT_COUNTERPARTY_RULES: Array<{ keywords: string[]; mapping: MappingSuggestion }> = [
  {
    keywords: ['美团', '饿了么', '外卖', '黄焖鸡', '麻辣烫', '奶茶', '咖啡', '包子', '早餐', '午餐', '晚餐', '小吃', '零食', '水果', '买菜', '肯德基', '麦当劳', '汉堡', '披萨', '火锅', '烧烤', '餐饮'],
    mapping: { l1Name: '餐饮饮食', l2Name: '外卖配送' }
  },
  {
    keywords: ['拼多多', '淘宝', '京东', '天猫', '唯品会', '闲鱼'],
    mapping: { l1Name: '购物消费', l2Name: '日用百货' }
  },
  {
    keywords: ['滴滴', '出行', '骑安', '哈啰', '青桔', 'Ugo', '小绿车', '打车', '高铁', '火车', '机票', '航空', '地铁', '公交'],
    mapping: { l1Name: '交通出行', l2Name: '打车租车' }
  },
  {
    keywords: ['便利店', '超市', '百货', '商场', '小店'],
    mapping: { l1Name: '购物消费', l2Name: '日用百货' }
  },
  {
    keywords: ['大学', '学院', '学校', '教育', '培训', '考试'],
    mapping: { l1Name: '教育提升', l2Name: '学费培训' }
  },
  {
    keywords: ['水电', '燃气', '煤气', '水费', '电费', '物业', '宽带', '话费', '手机', '联通', '移动', '电信'],
    mapping: { l1Name: '居住生活', l2Name: '水电燃气' }
  },
  {
    keywords: ['医院', '药房', '药店', '诊所', '医疗', '体检', '卫生'],
    mapping: { l1Name: '医疗健康', l2Name: '药房购药' }
  },
  {
    keywords: ['电影', 'KTV', '游戏', 'TapTap', '哔哩哔哩', 'B站', '腾讯视频', '爱奇艺', '优酷', '会员', '视频', '音乐', '网咖', '网吧'],
    mapping: { l1Name: '娱乐休闲', l2Name: '游戏充值' }
  },
  {
    keywords: ['健身', '运动', '游泳', '瑜伽', '球', '体育'],
    mapping: { l1Name: '娱乐休闲', l2Name: '运动健身' }
  },
  {
    keywords: ['理发', '美发', '美容', '美甲', '护肤', '化妆', '造型'],
    mapping: { l1Name: '购物消费', l2Name: '美妆护肤' }
  },
  {
    keywords: ['酒店', '宾馆', '民宿', '旅游', '景点', '门票', '度假'],
    mapping: { l1Name: '娱乐休闲', l2Name: '旅游度假' }
  },
  {
    keywords: ['加油', '充电', '停车', '洗车', '保养', '维修', '车'],
    mapping: { l1Name: '交通出行', l2Name: '燃油充电' }
  },
  {
    keywords: ['书籍', '书', '文具', '深度求索', '知识付费', '课程'],
    mapping: { l1Name: '教育提升', l2Name: '知识付费' }
  },
  {
    keywords: ['房租', '房贷', '租房', '住房'],
    mapping: { l1Name: '居住生活', l2Name: '房租房贷' }
  },
  {
    keywords: ['红包', '转账', '礼金'],
    mapping: { l1Name: '人情社交', l2Name: '红包礼金' }
  },
  {
    keywords: ['宠物', '猫', '狗', '鱼', '鸟'],
    mapping: { l1Name: '人情社交', l2Name: '宠物开销' }
  },
  {
    keywords: ['衣服', '服装', '鞋', '帽', '袜', '包', '配饰'],
    mapping: { l1Name: '购物消费', l2Name: '服装鞋帽' }
  },
]

/**
 * 支付宝账单：根据"交易分类"字段获取映射建议
 */
export function mapAlipayCategory(tradeCategory: string): MappingSuggestion | null {
  const cat = tradeCategory.trim()
  return ALIPAY_CATEGORY_MAP[cat] || null
}

/**
 * 微信账单：根据"交易对方"关键词获取映射建议
 */
export function mapWechatCategory(counterparty: string, description: string): MappingSuggestion | null {
  const searchText = (counterparty + ' ' + description).toLowerCase()
  for (const rule of WECHAT_COUNTERPARTY_RULES) {
    for (const kw of rule.keywords) {
      if (searchText.includes(kw.toLowerCase())) {
        return rule.mapping
      }
    }
  }
  return null
}