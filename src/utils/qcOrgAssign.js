/** 任务分配机构：名称含以下关键字的机构不可选（与后端 QcOrgAssignExclusions 保持一致） */
export const QC_ORG_ASSIGN_EXCLUDED_KEYWORDS = ['医疗废物']

export function isExcludedQcOrgName(orgName) {
  const name = String(orgName || '')
  return QC_ORG_ASSIGN_EXCLUDED_KEYWORDS.some(kw => kw && name.includes(kw))
}

export function filterAssignableQcOrgs(orgs) {
  return (orgs || []).filter(o => !isExcludedQcOrgName(o.orgName))
}
