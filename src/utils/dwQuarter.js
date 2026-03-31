/**
 * 会议/培训/指导/调研：按开始时间倒序（与后端约定一致，可作兜底）
 * 规则：开始日期 DESC → 同日 上下午 DESC（PM 在前）→ id DESC
 */
const START_KEYS = {
  meeting: { date: 'meetingStartDate', half: 'meetingStartHalf' },
  training: { date: 'trainingStartDate', half: 'trainingStartHalf' },
  guidance: { date: 'guidanceStartDate', half: 'guidanceStartHalf' },
  survey: { date: 'surveyStartDate', half: 'surveyStartHalf' },
}

export function sortDwSubRecordsByStartDesc(items, moduleKey) {
  const k = START_KEYS[moduleKey]
  if (!k || !items?.length) return [...(items || [])]
  return [...items].sort((a, b) => {
    const da = a[k.date] || ''
    const db = b[k.date] || ''
    if (da !== db) return db.localeCompare(da)
    const ha = a[k.half] === 'PM' ? 1 : 0
    const hb = b[k.half] === 'PM' ? 1 : 0
    if (ha !== hb) return hb - ha
    return String(b.id ?? '').localeCompare(String(a.id ?? ''), undefined, { numeric: true })
  })
}

/** quarterIndex 1～4 的默认底色（无 startYearQuarter 时） */
const QUARTER_INDEX_BG = {
  1: '#e8f4fc',
  2: '#e8fce8',
  3: '#fcf8e8',
  4: '#f3e8fc',
}

/** 有 startYearQuarter 时按字符串哈希取色，使不同年份同季度可区分 */
const YEAR_Q_PALETTE = [
  '#e8f4fc', '#e8fce8', '#fcf8e8', '#f3e8fc',
  '#e8eef8', '#e8fcf4', '#f8f0e8', '#f0e8fc',
  '#e4f0fc', '#ecf8e8', '#f8f4e8', '#e8eefc',
]

function hashStringToPalette(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return YEAR_Q_PALETTE[Math.abs(h) % YEAR_Q_PALETTE.length]
}

/**
 * 子记录行背景色（读 startYearQuarter / quarterIndex）
 * @returns {string} CSS 颜色
 */
export function dwQuarterBackground(item) {
  if (item?.startYearQuarter) return hashStringToPalette(String(item.startYearQuarter))
  const qi = Number(item?.quarterIndex)
  if (qi >= 1 && qi <= 4) return QUARTER_INDEX_BG[qi]
  return 'transparent'
}

/**
 * 用于 el-collapse-item 等：CSS 变量 --quarter-bg
 */
export function dwQuarterRowStyle(item) {
  return { '--quarter-bg': dwQuarterBackground(item) }
}
