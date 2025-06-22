import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import MusicPlayer from '../views/MusicPlayer.vue'
import EnvTest from '../views/EnvTest.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/player',
    name: 'MusicPlayer',
    component: MusicPlayer,
    meta: { requiresAuth: true }
  },
  {
    path: '/env-test',
    name: 'EnvTest', 
    component: EnvTest
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!token) {
      next('/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
