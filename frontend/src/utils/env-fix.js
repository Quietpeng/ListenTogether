// 直接配置常量 - 彻底移除环境变量依赖
// 统一配置所有服务器地址

const CONFIG = {
  API_BASE_URL: 'http://localhost:8080/api',
  SOCKET_URL: 'http://localhost:8080'
}

console.log('🔧 使用直接配置:', CONFIG)

// 导出配置常量
export const API_BASE_URL = CONFIG.API_BASE_URL
export const SOCKET_URL = CONFIG.SOCKET_URL

// 向后兼容的导出
export const ENV_VARS = {
  API_BASE_URL: CONFIG.API_BASE_URL,
  SOCKET_URL: CONFIG.SOCKET_URL
}
