/** 报告撰写模块：统计年度及往前推两年，如 2026 → [2026, 2025, 2024] */
export function buildReportYears(statYear) {
  const y = parseInt(String(statYear ?? ''), 10)
  if (!Number.isFinite(y)) return []
  return [y, y - 1, y - 2]
}

export function yearSlotKey(year) {
  return `y${year}`
}

export function yearCheckedFieldKey(year) {
  return `checked_${year}`
}

export function isYearChecked(extra, year) {
  const v = extra?.[yearCheckedFieldKey(year)]
  return v === '1' || v === 'true' || v === true
}
