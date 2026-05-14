/**
 * 管理端角色：与后端 LoginUser.isAdmin() 一致（department 主管管理员 + 超级管理员）
 */
export const WR_ADMIN_ROLE_CODES = ['deptAdmin', 'superAdmin']

export function isWreportAdmin(roleCode) {
  return !!(roleCode && WR_ADMIN_ROLE_CODES.includes(roleCode))
}
