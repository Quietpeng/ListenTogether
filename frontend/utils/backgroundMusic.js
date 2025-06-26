import { ref, reactive } from 'vue'

// 后台播放状态
const backgroundState = reactive({
  enabled: false,
  wakeLock: null,
  audioContext: null,
  keepAliveTimer: null,
  networkTimer: null,
  isPageVisible: true
})

/**
 * 后台播放管理组合式函数
 */
export function useBackgroundPlay() {

  /**
   * 启用后台播放
   */
  const enableBackgroundPlay = async () => {
    try {
      console.log('启用后台播放模式')
      
      // 请求屏幕唤醒锁
      await requestWakeLock()
      
      // 创建音频上下文
      createAudioContext()
      
      // 启动网络保活
      startNetworkKeepAlive()
      
      // 监听页面可见性变化
      listenPageVisibility()
      
      // 启动心跳保活
      startHeartbeat()
      
      backgroundState.enabled = true
      
      uni.showToast({
        title: '后台播放已启用',
        icon: 'success',
        duration: 2000
      })
      
      return { success: true }
    } catch (error) {
      console.error('启用后台播放失败:', error)
      
      uni.showToast({
        title: '启用后台播放失败',
        icon: 'error',
        duration: 2000
      })
      
      return { success: false, error: error.message }
    }
  }

  /**
   * 禁用后台播放
   */
  const disableBackgroundPlay = async () => {
    try {
      console.log('禁用后台播放模式')
      
      // 释放屏幕唤醒锁
      releaseWakeLock()
      
      // 停止网络保活
      stopNetworkKeepAlive()
      
      // 停止心跳保活
      stopHeartbeat()
      
      backgroundState.enabled = false
      
      uni.showToast({
        title: '后台播放已禁用',
        icon: 'success',
        duration: 2000
      })
      
      return { success: true }
    } catch (error) {
      console.error('禁用后台播放失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 请求屏幕唤醒锁
   */
  const requestWakeLock = async () => {
    try {
      // #ifdef H5
      // H5环境使用 Screen Wake Lock API
      if ('wakeLock' in navigator) {
        backgroundState.wakeLock = await navigator.wakeLock.request('screen')
        console.log('屏幕唤醒锁获取成功')
        
        backgroundState.wakeLock.addEventListener('release', () => {
          console.log('屏幕唤醒锁已释放')
        })
      } else {
        console.warn('当前浏览器不支持 Wake Lock API')
      }
      // #endif
      
      // #ifdef APP-PLUS
      // App环境使用原生API
      plus.device.setWakelock(true)
      console.log('App端屏幕常亮设置成功')
      // #endif
      
      // #ifdef MP
      // 小程序环境使用保持屏幕常亮
      uni.setKeepScreenOn({
        keepScreenOn: true,
        success: () => {
          console.log('小程序屏幕常亮设置成功')
        },
        fail: (error) => {
          console.error('小程序屏幕常亮设置失败:', error)
        }
      })
      // #endif
      
    } catch (error) {
      console.error('请求屏幕唤醒锁失败:', error)
      throw error
    }
  }

  /**
   * 释放屏幕唤醒锁
   */
  const releaseWakeLock = () => {
    try {
      // #ifdef H5
      if (backgroundState.wakeLock) {
        backgroundState.wakeLock.release()
        backgroundState.wakeLock = null
      }
      // #endif
      
      // #ifdef APP-PLUS
      plus.device.setWakelock(false)
      // #endif
      
      // #ifdef MP
      uni.setKeepScreenOn({
        keepScreenOn: false
      })
      // #endif
      
      console.log('屏幕唤醒锁已释放')
    } catch (error) {
      console.error('释放屏幕唤醒锁失败:', error)
    }
  }

  /**
   * 创建音频上下文
   */
  const createAudioContext = () => {
    try {
      // #ifdef H5
      // H5环境创建 AudioContext
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        backgroundState.audioContext = new AudioContext()
        
        // 恢复音频上下文（某些浏览器需要用户交互）
        if (backgroundState.audioContext.state === 'suspended') {
          backgroundState.audioContext.resume()
        }
        
        console.log('音频上下文创建成功')
      }
      // #endif
      
      // #ifdef APP-PLUS || MP
      // App端和小程序使用uni-app的音频API
      backgroundState.audioContext = uni.createInnerAudioContext()
      console.log('uni音频上下文创建成功')
      // #endif
      
    } catch (error) {
      console.error('创建音频上下文失败:', error)
    }
  }

  /**
   * 启动网络保活
   */
  const startNetworkKeepAlive = () => {
    if (backgroundState.networkTimer) {
      clearInterval(backgroundState.networkTimer)
    }
    
    backgroundState.networkTimer = setInterval(() => {
      // 发送小的网络请求保持连接
      uni.request({
        url: 'data:text/plain,ping',
        method: 'GET',
        timeout: 3000,
        success: () => {
          // console.log('网络保活成功')
        },
        fail: (error) => {
          console.warn('网络保活失败:', error)
        }
      })
    }, 30000) // 每30秒发送一次
    
    console.log('网络保活已启动')
  }

  /**
   * 停止网络保活
   */
  const stopNetworkKeepAlive = () => {
    if (backgroundState.networkTimer) {
      clearInterval(backgroundState.networkTimer)
      backgroundState.networkTimer = null
      console.log('网络保活已停止')
    }
  }

  /**
   * 监听页面可见性变化
   */
  const listenPageVisibility = () => {
    // #ifdef H5
    // H5环境监听 visibilitychange 事件
    document.addEventListener('visibilitychange', handleVisibilityChange)
    // #endif
    
    // 监听应用前后台切换
    uni.onAppHide(() => {
      console.log('应用进入后台')
      backgroundState.isPageVisible = false
      handleAppBackground()
    })
    
    uni.onAppShow(() => {
      console.log('应用回到前台')
      backgroundState.isPageVisible = true
      handleAppForeground()
    })
  }

  /**
   * 处理页面可见性变化
   */
  const handleVisibilityChange = () => {
    // #ifdef H5
    if (document.hidden) {
      console.log('页面隐藏')
      backgroundState.isPageVisible = false
      handlePageHidden()
    } else {
      console.log('页面显示')
      backgroundState.isPageVisible = true
      handlePageVisible()
    }
    // #endif
  }

  /**
   * 处理应用进入后台
   */
  const handleAppBackground = () => {
    if (backgroundState.enabled) {
      // 保持音频播放
      maintainAudioPlayback()
      
      // 减少网络请求频率
      adjustNetworkActivity(true)
    }
  }

  /**
   * 处理应用回到前台
   */
  const handleAppForeground = () => {
    if (backgroundState.enabled) {
      // 恢复正常网络活动
      adjustNetworkActivity(false)
      
      // 重新获取唤醒锁（如果需要）
      if (!backgroundState.wakeLock) {
        requestWakeLock()
      }
    }
  }

  /**
   * 处理页面隐藏
   */
  const handlePageHidden = () => {
    if (backgroundState.enabled) {
      // 保持音频播放
      maintainAudioPlayback()
    }
  }

  /**
   * 处理页面显示
   */
  const handlePageVisible = () => {
    if (backgroundState.enabled) {
      // 恢复音频上下文
      if (backgroundState.audioContext && backgroundState.audioContext.state === 'suspended') {
        backgroundState.audioContext.resume()
      }
    }
  }

  /**
   * 维持音频播放
   */
  const maintainAudioPlayback = () => {
    try {
      // #ifdef H5
      // 保持音频上下文活跃
      if (backgroundState.audioContext && backgroundState.audioContext.state === 'suspended') {
        backgroundState.audioContext.resume()
      }
      // #endif
      
      // #ifdef MP
      // 小程序使用背景音频管理器
      const bgAudioManager = uni.getBackgroundAudioManager()
      if (bgAudioManager && bgAudioManager.paused === false) {
        // 音频正在播放，无需特殊处理
        console.log('背景音频正在播放')
      }
      // #endif
      
    } catch (error) {
      console.error('维持音频播放失败:', error)
    }
  }

  /**
   * 调整网络活动频率
   * @param {boolean} reduce - 是否减少频率
   */
  const adjustNetworkActivity = (reduce) => {
    // 重新启动网络保活，使用不同的间隔
    stopNetworkKeepAlive()
    
    if (backgroundState.enabled) {
      const interval = reduce ? 60000 : 30000 // 后台时60秒，前台时30秒
      
      backgroundState.networkTimer = setInterval(() => {
        uni.request({
          url: 'data:text/plain,ping',
          method: 'GET',
          timeout: 3000,
          success: () => {
            // console.log('网络保活成功')
          },
          fail: (error) => {
            console.warn('网络保活失败:', error)
          }
        })
      }, interval)
    }
  }

  /**
   * 启动心跳保活
   */
  const startHeartbeat = () => {
    if (backgroundState.keepAliveTimer) {
      clearInterval(backgroundState.keepAliveTimer)
    }
    
    backgroundState.keepAliveTimer = setInterval(() => {
      if (backgroundState.enabled) {
        // 发送心跳到服务器
        uni.$emit('send_heartbeat', {
          type: 'background_heartbeat',
          timestamp: Date.now(),
          isPageVisible: backgroundState.isPageVisible
        })
      }
    }, 45000) // 每45秒发送一次心跳
    
    console.log('心跳保活已启动')
  }

  /**
   * 停止心跳保活
   */
  const stopHeartbeat = () => {
    if (backgroundState.keepAliveTimer) {
      clearInterval(backgroundState.keepAliveTimer)
      backgroundState.keepAliveTimer = null
      console.log('心跳保活已停止')
    }
  }

  /**
   * 检查后台播放支持
   */
  const checkBackgroundSupport = () => {
    const support = {
      wakeLock: false,
      audioContext: false,
      backgroundAudio: false
    }
    
    // #ifdef H5
    support.wakeLock = 'wakeLock' in navigator
    support.audioContext = !!(window.AudioContext || window.webkitAudioContext)
    // #endif
    
    // #ifdef APP-PLUS
    support.wakeLock = true // App端支持屏幕常亮
    support.audioContext = true // App端支持音频播放
    support.backgroundAudio = true // App端支持后台音频
    // #endif
    
    // #ifdef MP
    support.wakeLock = true // 小程序支持屏幕常亮
    support.backgroundAudio = true // 小程序支持后台音频管理器
    // #endif
    
    return support
  }

  /**
   * 获取后台播放状态信息
   */
  const getStatusInfo = () => {
    return {
      enabled: backgroundState.enabled,
      wakeLockActive: !!backgroundState.wakeLock,
      audioContextState: backgroundState.audioContext ? backgroundState.audioContext.state : 'none',
      isPageVisible: backgroundState.isPageVisible,
      networkKeepAlive: !!backgroundState.networkTimer,
      heartbeatActive: !!backgroundState.keepAliveTimer
    }
  }

  /**
   * 销毁后台播放管理器
   */
  const destroy = () => {
    disableBackgroundPlay()
    
    // #ifdef H5
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    // #endif
    
    console.log('后台播放管理器已销毁')
  }

  return {
    // 状态
    backgroundState,
    
    // 方法
    enableBackgroundPlay,
    disableBackgroundPlay,
    checkBackgroundSupport,
    getStatusInfo,
    destroy
  }
}

// 默认导出后台播放状态
export { backgroundState }
