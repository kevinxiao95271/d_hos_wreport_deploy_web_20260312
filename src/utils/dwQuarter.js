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

/** Q1-Q4 底色，Q3 统一使用 Q1 的蓝色调 */
const QUARTER_INDEX_BG = {
  1: '#e8f4fc',
  2: '#e8fce8',
  3: '#e8f4fc',
  4: '#e8fce8',
}

/**
 * 子记录行背景色：优先从 startYearQuarter 解析季度号，其次用 quarterIndex
 * @returns {string} CSS 颜色
 */
export function dwQuarterBackground(item) {
  let qi = 0
  if (item?.startYearQuarter) {
    const m = String(item.startYearQuarter).match(/Q(\d)/)
    if (m) qi = Number(m[1])
  }
  if (!qi) qi = Number(item?.quarterIndex)
  if (qi >= 1 && qi <= 4) return QUARTER_INDEX_BG[qi]
  return 'transparent'
}

/**
 * 用于 el-collapse-item 等：CSS 变量 --quarter-bg
 */
export function dwQuarterRowStyle(item) {
  return { '--quarter-bg': dwQuarterBackground(item) }
}
