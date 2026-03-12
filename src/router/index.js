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

router.beforeEach((to, _from, next) => {
  if (to.path === '/login') return next()
  const token = localStorage.getItem('wr_token')
  if (!token) return next('/login')
  next()
})

export default router
