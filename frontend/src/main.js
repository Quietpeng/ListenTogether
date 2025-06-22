import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { checkHostAvailability, showConnectionStatus } from './utils/health'

// 临时修复：手动设置环境变量
import './utils/env-fix'

// 环境变量调试信息
console.log('=== 环境变量调试信息 ===')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('VUE_APP_API_BASE_URL:', process.env.VUE_APP_API_BASE_URL)
console.log('VUE_APP_SOCKET_URL:', process.env.VUE_APP_SOCKET_URL)
console.log('所有 process.env:', JSON.stringify(process.env, null, 2))

// 测试环境变量是否存在
const testVars = {
  NODE_ENV: process.env.NODE_ENV,
  VUE_APP_API_BASE_URL: process.env.VUE_APP_API_BASE_URL,
  VUE_APP_SOCKET_URL: process.env.VUE_APP_SOCKET_URL
}
console.log('环境变量测试:', testVars)

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
app.use(router)

// 启动前检查后端服务可用性
const initApp = async () => {
  console.log('🚀 启动音乐一起听前端应用')
  console.log('📡 检查后端服务连接状态...')
  
  const isAvailable = await checkHostAvailability()
  showConnectionStatus(isAvailable)
  
  if (!isAvailable) {
    console.error('⚠️ 警告: 后端服务不可用，某些功能可能无法正常工作')
    console.log('📋 请确保后端服务已启动:')
    console.log('   cd backend && python app.py')
  }
  
  app.mount('#app')
}

initApp()
