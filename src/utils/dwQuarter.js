/**
 * 会议/培训/指导/调研：按活动开始时间从早到晚排序（无开始日期排最后）。
 * 规则：开始日期 ASC → 同日 上午 → 下午 → 记录 ID
 */
const START_KEYS = {
  meeting: { date: 'meetingStartDate', half: 'meetingStartHalf' },
  training: { date: 'trainingStartDate', half: 'trainingStartHalf' },
  guidance: { date: 'guidanceStartDate', half: 'guidanceStartHalf' },
  survey: { date: 'surveyStartDate', half: 'surveyStartHalf' },
  data_analysis_report: { date: 'reportDate', half: null },
}

function halfOrder(half) {
  if (!half) return 0
  const v = String(half).trim()
  if (v === 'PM' || v === '下午') return 1
  return 0
}

/** 可比较的排序键，越大表示时间越晚 */
function getSubRecordSortKey(item, keyDef) {
  if (!keyDef) return Number.MAX_SAFE_INTEGER
  const dateStr = item[keyDef.date]
  if (!dateStr) return Number.MAX_SAFE_INTEGER
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!m) return Number.MAX_SAFE_INTEGER
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dayNum = y * 10000 + mo * 100 + d
  const half = keyDef.half ? halfOrder(item[keyDef.half]) : 0
  return dayNum * 2 + half
}

export function sortDwSubRecordsByStartTime(items, moduleKey) {
  const k = START_KEYS[moduleKey]
  if (!k || !items?.length) return [...(items || [])]
  return [...items].sort((a, b) => {
    const diff = getSubRecordSortKey(a, k) - getSubRecordSortKey(b, k)
    if (diff !== 0) return diff
    return String(a.id ?? '').localeCompare(String(b.id ?? ''), undefined, { numeric: true })
  })
}

/** @deprecated 使用 sortDwSubRecordsByStartTime */
export function sortDwSubRecordsByStartDesc(items, moduleKey) {
  return sortDwSubRecordsByStartTime(items, moduleKey)
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
