import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/login', component: () => import('@/views/Login.vue') },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/contacts',
    children: [
      { path: 'contacts', component: () => import('@/views/Contacts.vue') },
      { path: 'groups', component: () => import('@/views/Groups.vue') },
      { path: 'templates', component: () => import('@/views/Templates.vue') },
      { path: 'send-email', component: () => import('@/views/SendEmail.vue') },
      { path: 'workflow', component: () => import('@/views/Workflow.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (!token && to.path !== '/login') next('/login')
  else next()
})

export default router
