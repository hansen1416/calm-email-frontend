import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/login', component: () => import('@/views/Login.vue') },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/audience',
    children: [
      { path: 'contacts', redirect: '/audience' },
      { path: 'groups', redirect: '/audience' },
      { path: 'audience', component: () => import('@/views/AudienceHub.vue') },
      { path: 'templates', component: () => import('@/views/Templates.vue') },
      { path: 'send-email', component: () => import('@/views/SendEmail.vue') },
      { path: 'workflow', component: () => import('@/views/Workflow.vue') },
      { path: 'instances', component: () => import('@/views/WorkflowInstances.vue') },
      { path: 'events', component: () => import('@/views/Events.vue') },
      { path: 'settings', component: () => import('@/views/SettingsCenter.vue') },
      { path: 'tasks', component: () => import('@/views/TaskList.vue') },
      { path: 'profile', component: () => import('@/views/ProfileCenter.vue') },
      { path: 'domain', redirect: '/settings' },
      { path: 'oauth', redirect: '/settings' },
      { path: 'affiliate', redirect: '/settings' },
      { path: 'email-senders', redirect: '/settings' },
      { path: 'segments', redirect: '/audience' }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (!token && to.path !== '/login') {
    // 保留 ref/query 参数，让注册页可以获取推荐码
    next({ path: '/login', query: to.query })
  } else {
    next()
  }
})

export default router