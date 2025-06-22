import axios from 'axios'
import { API_BASE_URL } from './env-fix'

// 检查主机可用性
export const checkHostAvailability = async () => {
  console.log('检查主机可用性，使用URL:', API_BASE_URL)

  try {
    console.log(`检查主机可用性: ${API_BASE_URL}`)
    
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000
    })
    
    if (response.status === 200) {
      console.log('✅ 后端服务可用')
      return true
    } else {
      console.error('❌ 后端服务响应异常')
      return false
    }
  } catch (error) {
    console.error('❌ 后端服务不可用:', error.message)
    return false
  }
}

// 显示连接状态
export const showConnectionStatus = (isAvailable) => {
  const statusElement = document.createElement('div')
  statusElement.id = 'connection-status'
  statusElement.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 9999;
    ${isAvailable 
      ? 'background-color: #4CAF50;' 
      : 'background-color: #f44336;'
    }
  `
  statusElement.textContent = isAvailable 
    ? '🟢 后端服务已连接' 
    : '🔴 后端服务连接失败'
  
  // 移除之前的状态显示
  const existing = document.getElementById('connection-status')
  if (existing) {
    existing.remove()
  }
  
  document.body.appendChild(statusElement)
  
  // 3秒后自动隐藏成功状态
  if (isAvailable) {
    setTimeout(() => {
      statusElement.remove()
    }, 3000)
  }
}
