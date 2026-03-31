import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

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
      { path: '/admin/crossview',        name: 'CrossView',          component: () => import('@/views/workreport/admin/CrossView.vue'),          meta: { title: '数据汇聚',   role: 'deptAdmin' } },
      // 机构端
      { path: '/org/task-list',    name: 'OrgTaskList',    component: () => import('@/views/workreport/org/OrgTaskList.vue'),    meta: { title: '上报任务', role: 'org' } },
      { path: '/org/report-form',  name: 'ReportForm',     component: () => import('@/views/workreport/org/ReportForm.vue'),     meta: { title: '填报表单', role: 'org', hidden: true } },
      { path: '/org/record-list',  name: 'OrgRecordList',  component: () => import('@/views/workreport/org/OrgRecordList.vue'),  meta: { title: '我的上报', role: 'org' } },
      { path: '/org/record-detail',name: 'OrgRecordDetail',component: () => import('@/views/workreport/org/OrgRecordDetail.vue'),meta: { title: '上报详情', role: 'org', hidden: true } },
    ]
  },
  { path: '/redirect', redirect: () => {
    const role = localStorage.getItem('wr_roleCode')
    return role === 'deptAdmin' ? '/admin/template-list' : '/org/task-list'
  }},
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// a 系统前端地址（含 context-path，生产环境改为实际域名）
const A_SYSTEM_URL = import.meta.env.VITE_A_SYSTEM_URL || 'http://localhost:18000/ylzlgl'

// hash 模式下从 location.search（# 之前的部分）读 ticket
function getSearchParam(name) {
  const params = new URLSearchParams(window.location.search)
  return params.get(name)
}

router.beforeEach(async (to, _from, next) => {
  if (to.path === '/login') return next()

  // 1. 优先处理 URL 中携带的 SSO ticket
  //    hash 模式下 ticket 在 location.search 里（?ticket=xxx#/...），不在 to.query 里
  const ticket = getSearchParam('ticket') || to.query.ticket
  if (ticket) {
    console.log('[SSO] 收到 ticket，开始兑换:', ticket)
    try {
      // 开发环境走 vite proxy /api/，生产环境走 nginx /wreport-api/
      const apiBase = import.meta.env.VITE_API_PREFIX || ''
      const res = await fetch(`${apiBase}/api/auth/sso-login?ticket=${ticket}`)
      const json = await res.json()
      console.log('[SSO] sso-login response:', json)
      if (json.code === 200 && json.data) {
        const { useUserStore } = await import('@/store/user')
        useUserStore().setUser(json.data)
        console.log('[SSO] 登录成功，用户:', json.data.account)
        // 清掉 URL 中的 ticket 参数（替换 history，不留记录）
        const cleanUrl = window.location.origin + window.location.pathname + '#' + to.path
        window.history.replaceState(null, '', cleanUrl)
        return next({ path: to.path, replace: true })
      } else {
        console.warn('[SSO] ticket 兑换失败:', json)
        return next('/login')
      }
    } catch (e) {
      console.warn('[SSO] ticket 兑换异常:', e)
      return next('/login')
    }
  }

  // 2. 已有本地 token，直接放行
  const token = localStorage.getItem('wr_token')
  if (token) return next()

  // 3. 无 token：跳转到 a 系统前端 SSO 中转页
  //    redirectUrl 只传 origin（不含 hash），避免 # 破坏 ticket 拼接
  const callbackUrl = encodeURIComponent(window.location.origin + window.location.pathname)
  console.log('[SSO] 无 token，跳转 a 系统 SSO 中转页，callbackUrl:', decodeURIComponent(callbackUrl))
  window.location.href = `${A_SYSTEM_URL}/sso?redirectUrl=${callbackUrl}`
})

export default router
