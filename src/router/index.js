import { createRouter, createWebHashHistory } from 'vue-router'
import { isWreportAdmin } from '@/utils/roles'

const routes = [
  { path: '/login', component: () => import('@/views/login/index.vue') },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    redirect: '/redirect',
    children: [
      // 管理端
      { path: '/admin/template-list',   name: 'TemplateList',       component: () => import('@/views/workreport/admin/TemplateList.vue'),       meta: { title: '模板管理',   role: 'deptAdmin' } },
      { path: '/admin/template-header', name: 'TemplateHeaderEditor', component: () => import('@/views/workreport/admin/TemplateHeaderEditor.vue'), meta: { title: '配置表头',   role: 'deptAdmin', hidden: true } },
      { path: '/admin/task-list',       name: 'TaskList',           component: () => import('@/views/workreport/admin/TaskList.vue'),           meta: { title: '任务管理',   role: 'deptAdmin' } },
      { path: '/admin/record-review',   name: 'RecordAdminList',    component: () => import('@/views/workreport/admin/RecordAdminList.vue'),    meta: { title: '上报审阅',   role: 'deptAdmin' } },
      { path: '/admin/record-detail',   name: 'RecordAdminDetail',  component: () => import('@/views/workreport/admin/RecordAdminDetail.vue'),  meta: { title: '上报详情',   role: 'deptAdmin', hidden: true } },
      { path: '/admin/crossview',    name: 'CrossView',      component: () => import('@/views/workreport/admin/CrossView.vue'),      meta: { title: '数据汇聚',   role: 'deptAdmin' } },
      { path: '/admin/dw-config',   name: 'DwModuleConfig', component: () => import('@/views/dailywork/admin/DwModuleConfig.vue'),  meta: { title: '日常工作配置', role: 'deptAdmin' } },
      { path: '/admin/dw-view',     name: 'DwAdminView',    component: () => import('@/views/dailywork/admin/DwAdminView.vue'),    meta: { title: '日常工作详情', role: 'deptAdmin', hidden: true } },
      { path: '/score/board414',    name: 'ScoreBoard414',  component: () => import('@/views/score/ScoreBoard414.vue'),            meta: { title: '历史得分看板' } },
      // 机构端
      { path: '/org/task-list',    name: 'OrgTaskList',    component: () => import('@/views/workreport/org/OrgTaskList.vue'),    meta: { title: '上报任务', role: 'org' } },
      { path: '/org/report-form',  name: 'ReportForm',     component: () => import('@/views/workreport/org/ReportForm.vue'),     meta: { title: '填报表单', role: 'org', hidden: true } },
      { path: '/org/record-list',  name: 'OrgRecordList',  component: () => import('@/views/workreport/org/OrgRecordList.vue'),  meta: { title: '我的上报', role: 'org' } },
      { path: '/org/record-detail',name: 'OrgRecordDetail',component: () => import('@/views/workreport/org/OrgRecordDetail.vue'),meta: { title: '上报详情', role: 'org', hidden: true } },
      { path: '/dw/record/:taskId', name: 'DwRecordForm',  component: () => import('@/views/dailywork/org/DwRecordForm.vue'),   meta: { title: '日常工作填报', role: 'org', hidden: true } },
      { path: '/dw/record/:taskId/preview', name: 'DwRecordPreview', component: () => import('@/views/dailywork/org/DwRecordForm.vue'), meta: { title: '日常工作预览', role: 'org', hidden: true, preview: true } },
    ]
  },
  { path: '/redirect', redirect: () => {
    const role = localStorage.getItem('wr_roleCode')
    return isWreportAdmin(role) ? '/admin/template-list' : '/org/task-list'
  }},
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// a 系统前端地址（context-path）；生产环境由 .env.production 注入
const A_SYSTEM_URL = import.meta.env.VITE_A_SYSTEM_URL || 'http://localhost:18000/ylzlgl'

/** hash 模式下 ticket 往往在 ?ticket= ，位于 # 前，需从 location.search 读取 */
function getSearchParam(name) {
  const params = new URLSearchParams(window.location.search)
  return params.get(name)
}

router.beforeEach(async (to, _from, next) => {
  if (to.path === '/login') return next()

  const ticket = getSearchParam('ticket') || to.query.ticket
  if (ticket) {
    try {
      const apiBase = import.meta.env.VITE_API_PREFIX || ''
      const res = await fetch(`${apiBase}/api/auth/sso-login?ticket=${encodeURIComponent(ticket)}`)
      const json = await res.json()
      if (json.code === 200 && json.data) {
        const { useUserStore } = await import('@/store/user')
        useUserStore().setUser(json.data)
        const cleanUrl = window.location.origin + window.location.pathname + '#' + to.path
        window.history.replaceState(null, '', cleanUrl)
        return next({ path: to.path, replace: true })
      }
      return next('/login')
    } catch {
      return next('/login')
    }
  }

  const token = localStorage.getItem('wr_token')
  if (token) return next()

  const callbackUrl = encodeURIComponent(window.location.origin + window.location.pathname)
  window.location.href = `${A_SYSTEM_URL}/sso?redirectUrl=${callbackUrl}`
})

export default router
