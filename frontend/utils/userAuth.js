import { reactive, ref } from 'vue'
import { getSafeUserFingerprint } from './fingerprint.js'
import { useServerConnection } from './serverConnection.js'

// 用户状态
const userState = reactive({
  isLoggedIn: false,
  userInfo: null,
  token: null,
  loginTime: null
})

/**
 * 用户认证组合式函数
 */
export function useUserAuth() {
  /**
   * 用户登录
   * @param {string} password - 登录密码
   */
  const login = async (password) => {
    try {
      // 验证密码
      if (!password || !password.trim()) {
        throw new Error('请输入密码')
      }

      // 检查服务器配置
      const serverConfig = uni.getStorageSync('serverConfig')
      if (!serverConfig?.url) {
        throw new Error('请先配置服务器')
      }      const apiUrl = `${serverConfig.url}/api/login`
      
      // 获取用户指纹
      const userFingerprint = getSafeUserFingerprint()
      
      // 发送登录请求
      const response = await uni.request({
        url: apiUrl,
        method: 'POST',
        data: {
          password: password.trim()
        },
        header: {
          'X-User-Fingerprint': userFingerprint,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      console.log('登录响应:', response)
      
      if (response.statusCode === 200) {
        // 登录成功，保存token
        const token = response.data.token
        const loginTime = Date.now()
        
        // 生成用户信息
        const userInfo = {
          userId: generateUserId(),
          username: '用户',
          loginTime: loginTime
        }

        // 保存到本地存储
        uni.setStorageSync('userInfo', userInfo)
        uni.setStorageSync('token', token)
        uni.setStorageSync('loginTime', loginTime)        // 更新状态
        userState.isLoggedIn = true
        userState.userInfo = userInfo
        userState.token = token
        userState.loginTime = loginTime
        
        // 登录成功后，启动用户心跳
        try {
          const { startUserHeartbeat } = useServerConnection()
          startUserHeartbeat()
          console.log('登录成功后启动用户心跳')
        } catch (heartbeatError) {
          console.warn('启动心跳失败:', heartbeatError)
        }

        return { 
          success: true, 
          userInfo, 
          token,
          message: response.data.message || '登录成功',
          heartbeat_interval: response.data.heartbeat_interval || 10
        }
      } else {
        throw new Error(response.data?.message || '密码错误')
      }
    } catch (error) {
      console.error('登录失败:', error)
      return { 
        success: false, 
        error: error.message,
        message: error.message || '登录失败'
      }
    }
  }
  /**
   * 用户登出
   */
  const logout = async () => {
    try {
      // 停止用户心跳
      try {
        const { stopUserHeartbeat } = useServerConnection()
        stopUserHeartbeat()
        console.log('登出时停止用户心跳')
      } catch (heartbeatError) {
        console.warn('停止心跳失败:', heartbeatError)
      }
      
      // 清除本地存储
      uni.removeStorageSync('userInfo')
      uni.removeStorageSync('token')
      uni.removeStorageSync('token')

      // 重置状态
      userState.isLoggedIn = false
      userState.userInfo = null
      userState.token = null
      userState.loginTime = null

      uni.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 2000
      })

      return { success: true }
    } catch (error) {
      console.error('登出失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 检查登录状态
   */
  const checkLoginStatus = () => {
    try {
      const userInfo = uni.getStorageSync('userInfo')
      const token = uni.getStorageSync('token')

      if (userInfo && token) {
        // 检查token是否过期（7天有效期）
        const loginTime = userInfo.loginTime || 0
        const now = Date.now()
        const expireTime = 7 * 24 * 60 * 60 * 1000 // 7天

        if (now - loginTime < expireTime) {
          userState.isLoggedIn = true
          userState.userInfo = userInfo
          userState.token = token
          userState.loginTime = loginTime
          return true
        } else {
          // token过期，清除存储
          logout()
          return false
        }
      }

      return false
    } catch (error) {
      console.error('检查登录状态失败:', error)
      return false
    }
  }

  /**
   * 获取存储的认证信息
   */
  const getStoredAuth = () => {
    try {
      const token = uni.getStorageSync('token')
      const userInfo = uni.getStorageSync('userInfo')
      
      if (!token) {
        return null
      }
      
      return {
        token: token,
        userInfo: userInfo
      }
    } catch (error) {
      console.error('获取存储的认证信息失败:', error)
      return null
    }
  }

  /**
   * 更新用户信息
   * @param {object} updateData - 更新数据
   */
  const updateUserInfo = async (updateData) => {
    try {
      if (!userState.isLoggedIn) {
        throw new Error('用户未登录')
      }

      const updatedUserInfo = {
        ...userState.userInfo,
        ...updateData,
        updateTime: Date.now()
      }

      // 保存到本地存储
      uni.setStorageSync('userInfo', updatedUserInfo)

      // 更新状态
      userState.userInfo = updatedUserInfo

      uni.showToast({
        title: '信息更新成功',
        icon: 'success',
        duration: 2000
      })

      return { success: true, userInfo: updatedUserInfo }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      
      uni.showToast({
        title: error.message || '更新失败',
        icon: 'error',
        duration: 2000
      })

      return { success: false, error: error.message }
    }
  }

  /**
   * 获取用户头像URL
   */
  const getAvatarUrl = (avatar) => {
    if (!avatar) {
      return '/static/default-avatar.png'
    }
    
    if (avatar.startsWith('http')) {
      return avatar
    }
    
    return `/static/avatars/${avatar}`
  }

  /**
   * 验证用户名
   * @param {string} username - 用户名
   */
  const validateUsername = (username) => {
    if (!username || !username.trim()) {
      return { valid: false, message: '用户名不能为空' }
    }

    if (username.length < 2) {
      return { valid: false, message: '用户名至少2个字符' }
    }

    if (username.length > 20) {
      return { valid: false, message: '用户名不能超过20个字符' }
    }

    // 检查特殊字符
    const regex = /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/
    if (!regex.test(username)) {
      return { valid: false, message: '用户名只能包含字母、数字、中文、下划线和短横线' }
    }

    return { valid: true }
  }

  /**
   * 生成用户ID
   */
  const generateUserId = () => {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 生成token
   * @param {object} userInfo - 用户信息
   */
  const generateToken = (userInfo) => {
    const data = {
      userId: userInfo.userId,
      username: userInfo.username,
      loginTime: userInfo.loginTime
    }
    
    // 简单的base64编码（实际项目中应该使用更安全的方式）
    return btoa(JSON.stringify(data))
  }

  /**
   * 获取在线时长（分钟）
   */
  const getOnlineTime = () => {
    if (!userState.isLoggedIn || !userState.loginTime) {
      return 0
    }
    
    return Math.floor((Date.now() - userState.loginTime) / (1000 * 60))
  }

  /**
   * 格式化在线时长
   */
  const formatOnlineTime = () => {
    const minutes = getOnlineTime()
    
    if (minutes < 60) {
      return `${minutes}分钟`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (hours < 24) {
      return `${hours}小时${remainingMinutes}分钟`
    }
    
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    
    return `${days}天${remainingHours}小时`
  }

  // 初始化时检查登录状态
  checkLoginStatus()
  return {
    // 状态
    userState,
    
    // 方法
    login,
    logout,
    getStoredAuth,
    checkLoginStatus,
    updateUserInfo,
    getAvatarUrl,
    validateUsername,
    getOnlineTime,
    formatOnlineTime
  }
}

// 默认导出用户状态
export { userState }
