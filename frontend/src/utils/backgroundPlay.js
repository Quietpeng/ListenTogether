// 后台播放管理器
class BackgroundPlayManager {
  constructor() {
    this.isActive = false
    this.wakeLock = null
    this.audioContext = null
    this.networkKeepAlive = null
    this.heartbeatInterval = null
  }

  // 启用后台播放模式
  async enableBackgroundPlay() {
    if (this.isActive) return

    console.log('🔋 启用后台播放模式')
    
    try {
      // 1. 请求屏幕唤醒锁（防止黑屏暂停）
      await this.requestWakeLock()
      
      // 2. 创建音频上下文保持音频系统活跃
      this.createAudioContext()
      
      // 3. 启动网络保持连接
      this.startNetworkKeepAlive()
      
      // 4. 启动心跳包
      this.startHeartbeat()
      
      // 5. 注册可见性变化监听
      this.registerVisibilityChange()
      
      // 6. 如果是 Electron 环境，调用主进程防休眠
      if (window.electronAPI) {
        window.electronAPI.preventSleep()
      }

      this.isActive = true
      console.log('✅ 后台播放模式已启用')
      
    } catch (error) {
      console.error('❌ 启用后台播放模式失败:', error)
    }
  }

  // 禁用后台播放模式
  async disableBackgroundPlay() {
    if (!this.isActive) return

    console.log('🔋 禁用后台播放模式')

    try {
      // 释放屏幕唤醒锁
      if (this.wakeLock) {
        await this.wakeLock.release()
        this.wakeLock = null
      }

      // 关闭音频上下文
      if (this.audioContext) {
        await this.audioContext.close()
        this.audioContext = null
      }

      // 停止网络保持连接
      if (this.networkKeepAlive) {
        clearInterval(this.networkKeepAlive)
        this.networkKeepAlive = null
      }

      // 停止心跳包
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval)
        this.heartbeatInterval = null
      }

      // 如果是 Electron 环境，允许休眠
      if (window.electronAPI) {
        window.electronAPI.allowSleep()
      }

      this.isActive = false
      console.log('✅ 后台播放模式已禁用')
      
    } catch (error) {
      console.error('❌ 禁用后台播放模式失败:', error)
    }
  }

  // 请求屏幕唤醒锁
  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen')
        console.log('🔒 屏幕唤醒锁已获取')
        
        this.wakeLock.addEventListener('release', () => {
          console.log('🔓 屏幕唤醒锁已释放')
        })
      } catch (error) {
        console.warn('⚠️ 无法获取屏幕唤醒锁:', error)
      }
    }
  }

  // 创建音频上下文保持音频系统活跃
  createAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        this.audioContext = new AudioContext()
        
        // 创建静音振荡器保持音频系统活跃
        const oscillator = this.audioContext.createOscillator()
        const gainNode = this.audioContext.createGain()
        
        gainNode.gain.value = 0 // 静音
        oscillator.connect(gainNode)
        gainNode.connect(this.audioContext.destination)
        
        oscillator.frequency.value = 440
        oscillator.start()
        
        console.log('🎵 音频上下文已创建')
      }
    } catch (error) {
      console.warn('⚠️ 创建音频上下文失败:', error)
    }
  }

  // 启动网络保持连接
  startNetworkKeepAlive() {
    this.networkKeepAlive = setInterval(async () => {
      try {
        // 发送轻量级请求保持网络连接
        const response = await fetch(window.API_BASE_URL + '/health', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        
        if (response.ok) {
          console.log('💓 网络连接保持活跃')
        }
      } catch (error) {
        console.warn('⚠️ 网络保持连接失败:', error)
      }
    }, 30000) // 每30秒发送一次
  }

  // 启动心跳包
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      // 发送心跳包给 WebSocket
      if (window.socketService && window.socketService.connected) {
        window.socketService.emit('heartbeat', {
          timestamp: Date.now(),
          background: document.hidden
        })
        console.log('💓 WebSocket 心跳包已发送')
      }
    }, 15000) // 每15秒发送一次
  }

  // 注册页面可见性变化监听
  registerVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 页面进入后台，保持播放状态')
        // 页面隐藏时确保后台播放继续
        this.ensureBackgroundPlayback()
      } else {
        console.log('📱 页面回到前台')
        // 页面显示时重新激活
        this.reactivateOnForeground()
      }
    })

    // 监听页面失焦
    window.addEventListener('blur', () => {
      console.log('🔍 窗口失焦，保持播放状态')
    })

    // 监听页面获焦
    window.addEventListener('focus', () => {
      console.log('🔍 窗口获焦')
    })
  }

  // 确保后台播放
  ensureBackgroundPlayback() {
    // 重新获取唤醒锁（某些浏览器会在页面隐藏时释放）
    if (!this.wakeLock || this.wakeLock.released) {
      this.requestWakeLock()
    }

    // 确保音频上下文仍在运行
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  // 前台重新激活
  reactivateOnForeground() {
    // 重新激活音频上下文
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  // 获取状态
  getStatus() {
    return {
      isActive: this.isActive,
      hasWakeLock: this.wakeLock && !this.wakeLock.released,
      audioContextState: this.audioContext ? this.audioContext.state : 'none',
      networkKeepAlive: !!this.networkKeepAlive,
      heartbeat: !!this.heartbeatInterval
    }
  }
}

// 创建全局实例
window.backgroundPlayManager = new BackgroundPlayManager()

export default window.backgroundPlayManager
