import { reactive, ref } from 'vue'
import { usePollingManager, pollingManager } from './pollingManager'
import { getSafeUserFingerprint } from './fingerprint.js'

// 全局连接状态
const connectionState = reactive({
  connected: false,
  connecting: false,
  serverUrl: '',
  userCount: 0,
  error: null,
  socket: null,
  usingPolling: false,  // 是否正在使用轮询模式
  heartbeatActive: false,  // 心跳是否激活
  lastHeartbeat: null      // 最后一次心跳时间
})

// WebSocket 连接实例
let socket = null
let heartbeatTimer = null
let reconnectTimer = null
let reconnectAttempts = 0
const maxReconnectAttempts = 5

// 心跳定时器
let userHeartbeatTimer = null
const HEARTBEAT_INTERVAL = 10000 // 10秒心跳间隔

/**
 * 服务器连接组合式函数
 */
export function useServerConnection() {
    /**
   * 发送用户心跳
   */
  const sendHeartbeat = async () => {
    try {
      const token = uni.getStorageSync('token')
      const userFingerprint = getSafeUserFingerprint()
      
      if (!token || !connectionState.serverUrl) {
        return false
      }
      
      const response = await new Promise((resolve, reject) => {
        uni.request({
          url: `${connectionState.serverUrl}/api/heartbeat`,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`,
            'X-User-Fingerprint': userFingerprint,
            'Content-Type': 'application/json'
          },
          success: resolve,
          fail: reject,
          timeout: 5000
        })
      })
      
      if (response.statusCode === 200) {
        connectionState.lastHeartbeat = new Date().toISOString()
        const onlineCount = response.data.online_count
        
        // 只在用户数变化时输出日志
        if (connectionState.userCount !== onlineCount) {
          console.log(`💓 在线用户: ${onlineCount}`)
          connectionState.userCount = onlineCount
        }
        
        // 广播在线用户数更新
        uni.$emit('poll_clients_update', {
          connected_clients: onlineCount
        })
        
        return true
      } else {
        console.error('❌ 心跳失败:', response.statusCode)
        return false
      }
    } catch (error) {
      console.error('❌ 心跳请求失败:', error.message || error)
      return false
    }
  }
    /**
   * 启动用户心跳
   */
  const startUserHeartbeat = () => {
    if (userHeartbeatTimer) {
      clearInterval(userHeartbeatTimer)
    }
    
    connectionState.heartbeatActive = true
    console.log('💓 启动心跳 (10秒间隔)')
    
    // 立即发送一次心跳
    sendHeartbeat()
    
    // 设置定时心跳
    userHeartbeatTimer = setInterval(() => {
      sendHeartbeat()
    }, HEARTBEAT_INTERVAL)
  }
  
  /**
   * 停止用户心跳
   */
  const stopUserHeartbeat = () => {
    if (userHeartbeatTimer) {
      clearInterval(userHeartbeatTimer)
      userHeartbeatTimer = null
    }
    connectionState.heartbeatActive = false
    console.log('🛑 停止心跳')
  }
    /**
   * 连接到服务器
   * @param {string} serverUrl - 服务器地址
   * @param {object} options - 连接选项
   */
  const connect = async (serverUrl, options = {}) => {
    if (connectionState.connecting || connectionState.connected) {
      return
    }    try {
      connectionState.connecting = true
      connectionState.error = null
      connectionState.serverUrl = serverUrl
	  console.log('设置服务器地址:', serverUrl)

      // 启动轮询作为主要连接方式
      connectionState.usingPolling = true;
      pollingManager.startPolling(serverUrl, {
        stateInterval: 2000,  // 2秒轮询一次状态  
        positionInterval: 3000,  // 3秒轮询一次位置
        clientsInterval: 5000  // 5秒轮询一次客户端数
      });      console.log('使用HTTP轮询模式连接服务器')
      connectionState.connected = true
      
      // 启动用户心跳
      startUserHeartbeat()
      
      connectionState.connecting = false
      console.log('服务器连接初始化完成')
      
    } catch (error) {
      console.error('连接服务器失败:', error)
      connectionState.connecting = false
      connectionState.error = error.message || '连接失败'
      
      // 即使WebSocket失败，也要设置serverUrl以便HTTP请求能正常工作
      connectionState.serverUrl = serverUrl
      
      uni.showToast({
        title: 'WebSocket连接失败，仅支持基本功能',
        icon: 'none',
        duration: 2000
      })
    }
  }

  /**
   * 设置 WebSocket 事件监听
   */
  const setupSocketEvents = () => {
    if (!socket) return

    // #ifdef H5
    socket.onopen = handleSocketOpen
    socket.onmessage = handleSocketMessage
    socket.onclose = handleSocketClose
    socket.onerror = handleSocketError
    // #endif

    // #ifndef H5
    socket.onOpen(handleSocketOpen)
    socket.onMessage(handleSocketMessage)
    socket.onClose(handleSocketClose)
    socket.onError(handleSocketError)
    // #endif
  }
  /**
   * WebSocket 连接成功
   */
  const handleSocketOpen = () => {
    console.log('WebSocket 连接成功')
    connectionState.connected = true
    connectionState.connecting = false
    connectionState.error = null
    reconnectAttempts = 0
    
    // 启动心跳
    startHeartbeat()
    
    // 发送用户信息
    sendUserInfo()      // WebSocket连接成功后，可以停止轮询以节省资源
    if (connectionState.usingPolling) {
      pollingManager.stopPolling();
      connectionState.usingPolling = false;
    }
  }

  /**
   * 接收 WebSocket 消息
   */
  const handleSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('收到服务器消息:', data)
      
      switch (data.type) {
        case 'user_count':
          connectionState.userCount = data.count
          break
        case 'heartbeat':
          // 心跳响应
          break
        case 'play_state_change':
          // 播放状态变化
          handlePlayStateChange(data)
          break
        case 'playlist_update':
          // 播放列表更新
          handlePlaylistUpdate(data)
          break
        default:
          console.log('未知消息类型:', data.type)
      }
    } catch (error) {
      console.error('解析服务器消息失败:', error)
    }
  }
  /**
   * WebSocket 连接关闭
   */
  const handleSocketClose = (event) => {
    console.log('WebSocket 连接关闭:', event)
    connectionState.connected = false
    connectionState.connecting = false
    
    // 停止心跳
    stopHeartbeat()
      // 不再尝试WebSocket重连，依赖已经启动的轮询
  }/**
   * WebSocket 连接错误
   */
  const handleSocketError = (error) => {
    console.error('WebSocket 连接错误:', error)
    
    // 不在这里调用handleConnectionError，因为我们不想显示错误消息
    // 只需更新连接状态
    connectionState.connected = false
    connectionState.connecting = false
      // 不需要重新启动轮询，因为已经在connect函数中开始了轮询
  }

  /**
   * 处理连接错误
   */
  const handleConnectionError = (error) => {
    connectionState.connected = false
    connectionState.connecting = false
    connectionState.error = error.message || '连接失败'
    
    uni.showToast({
      title: '连接服务器失败',
      icon: 'error',
      duration: 2000
    })
  }  /**
   * 断开连接
   */
  const disconnect = () => {
    if (socket) {
      // #ifdef H5
      socket.close()
      // #endif
      
      // #ifndef H5
      socket.close()
      // #endif
      
      socket = null
    }
    
    stopHeartbeat()
    stopUserHeartbeat()  // 停止用户心跳
    clearTimeout(reconnectTimer)
    
    // 如果正在使用轮询，停止轮询
    if (connectionState.usingPolling) {
      pollingManager.stopPolling();
      connectionState.usingPolling = false;
    }
    
    connectionState.connected = false
    connectionState.connecting = false
    connectionState.userCount = 0
  }
  /**
   * 发送消息到服务器
   */
  const sendMessage = (message) => {    // 如果WebSocket不可用但正在使用轮询，不需要警告，静默返回
    if (connectionState.usingPolling) {
      return false;
    }
    
    // 常规WebSocket检查
    if (!connectionState.connected || !socket) {
      console.warn('未连接到服务器，无法发送消息')
      return false
    }

    try {
      const data = JSON.stringify(message)
      
      // #ifdef H5
      socket.send(data)
      // #endif
      
      // #ifndef H5
      socket.send({
        data: data,
        success: () => {
          console.log('消息发送成功')
        },
        fail: (error) => {          // 如果消息发送失败，可能需要切换到轮询
          console.error('消息发送失败:', error)
          if (!connectionState.usingPolling && connectionState.serverUrl) {
            connectionState.usingPolling = true;
            pollingManager.startPolling(connectionState.serverUrl, {
              stateInterval: 3000,
              positionInterval: 5000,
              clientsInterval: 10000
            });
          }
        }
      })
      // #endif
      
      return true
    } catch (error) {
      console.error('发送消息失败:', error)
        // 如果发送失败，尝试切换到轮询
      if (!connectionState.usingPolling && connectionState.serverUrl) {
        connectionState.usingPolling = true;
        pollingManager.startPolling(connectionState.serverUrl, {
          stateInterval: 3000,
          positionInterval: 5000,
          clientsInterval: 10000
        });
      }
      
      return false
    }
  }

  /**
   * 发送用户信息
   */
  const sendUserInfo = () => {
    const userInfo = uni.getStorageSync('userInfo') || {}
    sendMessage({
      type: 'user_login',
      data: {
        username: userInfo.username || '匿名用户',
        userId: userInfo.userId || generateUserId()
      }
    })
  }

  /**
   * 启动心跳
   */
  const startHeartbeat = () => {
    heartbeatTimer = setInterval(() => {
      sendMessage({
        type: 'heartbeat',
        timestamp: Date.now()
      })
    }, 30000) // 30秒心跳
  }

  /**
   * 停止心跳
   */
  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  /**
   * 尝试重连
   */
  const attemptReconnect = () => {
    reconnectAttempts++
    console.log(`尝试重连 (${reconnectAttempts}/${maxReconnectAttempts})`)
    
    reconnectTimer = setTimeout(() => {
      if (connectionState.serverUrl) {
        connect(connectionState.serverUrl)
      }
    }, 3000 * reconnectAttempts) // 递增延迟
  }

  /**
   * 处理播放状态变化
   */
  const handlePlayStateChange = (data) => {
    // 触发自定义事件，让音乐播放器处理
    uni.$emit('play_state_change', data)
  }

  /**
   * 处理播放列表更新
   */
  const handlePlaylistUpdate = (data) => {
    // 触发自定义事件，让音乐播放器处理
    uni.$emit('playlist_update', data)
  }

  /**
   * 生成用户ID
   */
  const generateUserId = () => {
    return 'user_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 发送播放状态
   */
  const sendPlayState = (playState) => {
    sendMessage({
      type: 'play_state_change',
      data: playState
    })
  }

  /**
   * 发送添加歌曲请求
   */
  const sendAddSong = (song) => {
    sendMessage({
      type: 'add_song',
      data: song
    })
  }

  /**
   * 发送移除歌曲请求
   */
  const sendRemoveSong = (songId) => {
    sendMessage({
      type: 'remove_song',
      data: { songId }
    })
  }
  /**
   * 获取播放列表
   */
  const getPlaylist = async () => {
    if (!connectionState.serverUrl) {
      throw new Error('未连接到服务器')
    }    try {
      // 获取token      const token = uni.getStorageSync('token')
      if (!token) {
        throw new Error('未登录，无法获取播放列表')
      }

      const safeUniqueId = getSafeUserFingerprint();
      
      // 验证指纹是否为ASCII安全
      if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
        console.error('指纹包含非ASCII字符:', safeUniqueId);
        throw new Error('Fingerprint contains non-ASCII characters');
      }
      
      const response = await uni.request({
        url: `${connectionState.serverUrl}/api/songs`,
        method: 'GET',        header: {
          'Authorization': `Bearer ${token}`,
          'X-User-Fingerprint': safeUniqueId
        }
      })

      if (response.statusCode === 200) {
        console.log('📊 [播放列表] 服务器响应:', response.data);
        return response.data
      } else {
        console.error('📊 [播放列表] 请求失败:', response.statusCode, response.data);
        throw new Error('获取播放列表失败')
      }
    } catch (error) {
      console.error('获取播放列表失败:', error)
      throw error
    }
  }

  /**
   * 健康检查
   */
  const healthCheck = async (serverUrl) => {
    try {
      const response = await uni.request({
        url: `${serverUrl}/api/health`,
        method: 'GET',
        timeout: 5000
      })

      return response.statusCode === 200
    } catch (error) {
      console.error('健康检查失败:', error)
      return false
    }
  }
  /**
   * 测试服务器连接
   */
  const testConnection = async (config) => {
    try {
      const serverUrl = config.url + (config.port ? `:${config.port}` : '')
      
      // 健康检查
      const isHealthy = await healthCheck(serverUrl)
      
      if (isHealthy) {
        return {
          success: true,
          message: '连接成功',
          url: serverUrl
        }
      } else {
        return {
          success: false,
          message: '服务器无响应'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || '连接失败'
      }
    }
  }

  /**
   * 保存服务器配置
   */
  const saveServerConfig = async (config) => {
    try {
      // 保存配置到本地存储
      uni.setStorageSync('serverConfig', config)
      
      // 更新连接状态中的服务器URL
      const serverUrl = config.url + (config.port ? `:${config.port}` : '')
      connectionState.serverUrl = serverUrl
      
      return {
        success: true,
        message: '配置保存成功'
      }
    } catch (error) {
      throw new Error('保存配置失败: ' + error.message)
    }
  }
  return {
    // 状态
    connectionState,
      // 方法
    connect,
    disconnect,
    sendMessage,
    sendPlayState,
    sendAddSong,
    sendRemoveSong,
    getPlaylist,
    healthCheck,
    testConnection,
    saveServerConfig,
    
    // 心跳相关
    sendHeartbeat,
    startUserHeartbeat,
    stopUserHeartbeat
  }
}

// 默认导出连接状态，供其他组件使用
export { connectionState }
