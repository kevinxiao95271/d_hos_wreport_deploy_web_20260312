/** 季度日常工作任务启用的模块 */
export const DW_QUARTER_MODULES = ['meeting', 'training', 'guidance', 'survey']

/** 年度日常工作任务启用的模块（与 wr_api_guide 保持一致） */
export const DW_ANNUAL_MODULES = [
  'meeting', 'training', 'guidance', 'survey',
  'work_plan', 'annual_work',
  'national_report', 'prov_report',
  'activity_report', 'funding',
  'bonus_pub', 'bonus_comp', 'bonus_admin',
]

/** 年度任务不再启用的模块（兼容旧 scope / 自动补齐） */
export const DW_ANNUAL_EXCLUDED_MODULES = ['indicator_db', 'indicator_monitor', 'network_build']
