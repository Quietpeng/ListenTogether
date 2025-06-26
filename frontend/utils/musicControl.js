import { reactive, ref, computed } from 'vue'

// 播放器状态
const playerState = reactive({
  playlist: [],
  currentIndex: 0,
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  playMode: 'list', // list: 列表播放, random: 随机播放, loop: 循环播放
  audioContext: null,
  backgroundAudioManager: null,
  hasErrorShown: false, // 是否已显示错误提示，避免重复提示
  isLoadingAudio: false // 是否正在加载音频，防止重复调用
})

// 音频实例
let audioContext = null
let backgroundAudioManager = null

/**
 * 音乐播放器组合式函数
 */
export function useMusicPlayer() {

  // 当前播放的歌曲
  const currentSong = computed(() => {
    return playerState.playlist[playerState.currentIndex] || null
  })

  // 是否有歌曲在播放列表中
  const hasPlaylist = computed(() => {
    return playerState.playlist.length > 0
  })

  // 播放进度百分比
  const progressPercent = computed(() => {
    if (playerState.duration === 0) return 0
    return (playerState.currentTime / playerState.duration) * 100
  })

  /**
   * 初始化音频管理器（多端适配）
   */
  const initAudioManager = () => {
    try {
      // #ifdef H5
      // H5端用原生Audio
      if (!audioContext) {
        audioContext = new window.Audio();
        setupAudioEvents(audioContext);
        playerState.audioContext = audioContext;
      }
      // #endif

      // #ifdef APP-PLUS
      // App端用uni.createInnerAudioContext
      if (!audioContext) {
        audioContext = uni.createInnerAudioContext();
        setupAudioEvents(audioContext);
        playerState.audioContext = audioContext;
      }
      // #endif

      // #ifdef MP
      // 小程序用背景音频管理器
      if (!backgroundAudioManager) {
        backgroundAudioManager = uni.getBackgroundAudioManager();
        setupBackgroundAudioEvents(backgroundAudioManager);
        playerState.backgroundAudioManager = backgroundAudioManager;
      }
      // #endif

      console.log('音频管理器初始化成功');
    } catch (error) {
      console.error('音频管理器初始化失败:', error);
      uni.showToast({
        title: '音频初始化失败',
        icon: 'error'
      });
    }
  }
  /**
   * 设置音频事件监听（内部音频）
   */
  const setupAudioEvents = (audio) => {
    // #ifdef H5
    // H5原生Audio事件监听
    audio.addEventListener('play', () => {
      console.log('音频开始播放')
      playerState.isPlaying = true
      playerState.isPaused = false
      // 发送状态更新事件到页面组件
      uni.$emit('player_state_change', {
        isPlaying: true,
        isPaused: false
      })
    });

    audio.addEventListener('pause', () => {
      console.log('音频暂停')
      playerState.isPlaying = false
      playerState.isPaused = true
      // 发送状态更新事件到页面组件
      uni.$emit('player_state_change', {
        isPlaying: false,
        isPaused: true
      })
    });

    audio.addEventListener('ended', () => {
      console.log('音频播放结束')
      playerState.isPlaying = false
      playerState.isPaused = false
      // 只发送音频结束事件，让上层处理是否自动播放下一首
      uni.$emit('audio_ended')
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime !== undefined && audio.duration !== undefined) {
        playerState.currentTime = audio.currentTime
        playerState.duration = audio.duration
        // 发送时间更新事件到页面组件
        uni.$emit('player_time_update', {
          currentTime: audio.currentTime,
          duration: audio.duration
        })
      }
    });

    audio.addEventListener('error', (error) => {
      const errorMsg = error.message || '播放失败';
      console.error(`音频播放错误: ${errorMsg}`);
      
      // 设置播放状态为停止
      playerState.isPlaying = false;
      playerState.isPaused = false;
      
      // 通知用户错误，但只在首次出现时
      if (!playerState.hasErrorShown) {
        uni.showToast({
          title: '播放失败，正在尝试下一首',
          icon: 'none',
          duration: 2000
        });
        playerState.hasErrorShown = true;
        
        // 3秒后重置错误状态标记
        setTimeout(() => {
          playerState.hasErrorShown = false;
        }, 3000);
      }
      
      // 立即尝试播放下一首
      if (playerState.playlist.length > 1) {
        playNext();
      }
    });
    // #endif

    // #ifndef H5
    // UniApp音频API事件监听
    audio.onPlay(() => {
      console.log('音频开始播放')
      playerState.isPlaying = true
      playerState.isPaused = false
      // 发送状态更新事件到页面组件
      uni.$emit('player_state_change', {
        isPlaying: true,
        isPaused: false
      })
    });

    audio.onPause(() => {
      console.log('音频暂停')
      playerState.isPlaying = false
      playerState.isPaused = true
      // 发送状态更新事件到页面组件
      uni.$emit('player_state_change', {
        isPlaying: false,
        isPaused: true
      })
    });

    audio.onStop(() => {
      console.log('音频停止')
      playerState.isPlaying = false
      playerState.isPaused = false
      // 发送状态更新事件到页面组件
      uni.$emit('player_state_change', {
        isPlaying: false,
        isPaused: false
      })
    });

    audio.onEnded(() => {
      console.log('音频播放结束')
      playerState.isPlaying = false
      playerState.isPaused = false
      // 只发送音频结束事件，让上层处理是否自动播放下一首
      uni.$emit('audio_ended')
    });

    audio.onTimeUpdate(() => {
      if (audio.currentTime !== undefined && audio.duration !== undefined) {
        playerState.currentTime = audio.currentTime
        playerState.duration = audio.duration
        // 发送时间更新事件到页面组件
        uni.$emit('player_time_update', {
          currentTime: audio.currentTime,
          duration: audio.duration
        })
      }
    });

    audio.onError((error) => {
      // 避免重复错误日志
      const errorCode = error ? error.errCode || error.code || 0 : 0;
      const errorMsg = error ? error.errMsg || error.message || '未知错误' : '格式不支持或URL无效';
      
      // 记录一次详细的错误信息
      console.error(`音频播放错误(${errorCode}): ${errorMsg}`);
      
      // 设置播放状态为停止
      playerState.isPlaying = false;
      playerState.isPaused = false;
      
      // 通知用户错误，但只在首次出现时
      if (!playerState.hasErrorShown) {
        uni.showToast({
          title: '播放失败，正在尝试下一首',
          icon: 'none',
          duration: 2000
        });
        playerState.hasErrorShown = true;
        
        // 3秒后重置错误状态标记
        setTimeout(() => {
          playerState.hasErrorShown = false;
        }, 3000);
      }
      
      // 立即尝试播放下一首
      if (playerState.playlist.length > 1) {
        playNext();
      }
    });
    // #endif
  }
  /**
   * 设置背景音频事件监听
   */
  const setupBackgroundAudioEvents = (bgAudio) => {    bgAudio.onPlay(() => {
      console.log('背景音频开始播放');
      playerState.isPlaying = true;
      playerState.isPaused = false;
      // 发送状态更新事件到页面组件
      uni.$emit('player_state_change', {
        isPlaying: true,
        isPaused: false
      })
    });    bgAudio.onPause(() => {
      console.log('背景音频暂停');
      playerState.isPlaying = false;
      playerState.isPaused = true;
      // 发送状态更新事件到页面组件
      uni.$emit('player_state_change', {
        isPlaying: false,
        isPaused: true
      })
    });
      bgAudio.onStop(() => {
      console.log('背景音频停止');
      playerState.isPlaying = false;
      playerState.isPaused = false;
      // 发送状态更新事件到页面组件
      uni.$emit('player_state_change', {
        isPlaying: false,
        isPaused: false
      })
    });
      bgAudio.onEnded(() => {
      console.log('背景音频播放结束');
      playerState.isPlaying = false
      playerState.isPaused = false
      // 只发送音频结束事件，让上层处理是否自动播放下一首
      uni.$emit('audio_ended');
    });    bgAudio.onTimeUpdate(() => {
      playerState.currentTime = bgAudio.currentTime;
      playerState.duration = bgAudio.duration;
      // 发送时间更新事件到页面组件
      uni.$emit('player_time_update', {
        currentTime: bgAudio.currentTime,
        duration: bgAudio.duration
      })
    });bgAudio.onError((error) => {
      // 避免重复错误日志
      const errorCode = error ? error.errCode || error.code || 0 : 0;
      const errorMsg = error ? error.errMsg || error.message || '未知错误' : '格式不支持或URL无效';
      
      // 记录一次详细的错误信息
      console.error(`背景音频播放错误(${errorCode}): ${errorMsg}`);
      
      // 设置播放状态为停止
      playerState.isPlaying = false;
      playerState.isPaused = false;
      
      // 通知用户错误，但只在首次出现时
      if (!playerState.hasErrorShown) {
        uni.showToast({
          title: '播放失败，正在尝试下一首',
          icon: 'none',
          duration: 2000
        });
        playerState.hasErrorShown = true;
        
        // 3秒后重置错误状态标记
        setTimeout(() => {
          playerState.hasErrorShown = false;
        }, 3000);
      }
      
      // 立即尝试播放下一首
      if (playerState.playlist.length > 1) {
        playNext();
      }
    })}

  /**
   * 播放音乐（多端适配）
   * @param {object} song - 歌曲对象
   * @param {number} index - 播放列表中的索引
   */
  const playMusic = async (song, index) => {
    try {
      if (playerState.isLoadingAudio) {
        console.log('音频正在加载中，忽略重复请求');
        return;
      }
      playerState.isLoadingAudio = true;
      playerState.hasErrorShown = false;
      if (index !== undefined) {
        playerState.currentIndex = index;
      }
      if (!song) song = currentSong.value;
      if (!song) throw new Error('没有可播放的歌曲');
      console.log('开始播放:', song.name, '-', song.artist || '未知艺术家');
      // 停止当前播放
      try {
        if (playerState.isPlaying) {
          if (audioContext && audioContext.pause) audioContext.pause();
          if (backgroundAudioManager && backgroundAudioManager.pause) backgroundAudioManager.pause();
        }
      } catch (stopError) {
        console.warn('停止当前音频失败:', stopError);
      }
      let audioUrl;
      try {
        audioUrl = getAudioUrl(song);
      } catch (urlError) {
        console.error('获取音频URL失败:', urlError);
        throw new Error('获取音频URL失败');
      }
      if (!audioUrl || typeof audioUrl !== 'string') {
        console.error('无效的音频URL(为空或非字符串)');
        throw new Error('无法获取有效的音频URL');
      }
      if (!audioUrl.startsWith('http')) {
        console.error('无效的音频URL(协议错误):', audioUrl.substring(0, 30));
        throw new Error('音频URL协议错误');
      }
      // #ifdef H5
      if (audioContext) {
        audioContext.src = audioUrl;
        audioContext.autoplay = true;
        audioContext.load && audioContext.load();
        audioContext.play().catch(e => {
          console.warn('音频自动播放被拦截:', e);
        });
      }
      // #endif
      // #ifdef APP-PLUS
      if (audioContext) {
        audioContext.src = audioUrl;
        audioContext.play();
      }
      // #endif
      // #ifdef MP
      if (backgroundAudioManager) {
        backgroundAudioManager.title = song.name;
        backgroundAudioManager.singer = song.artist || '未知艺术家';
        backgroundAudioManager.coverImgUrl = song.cover || '/static/default-cover.png';
        backgroundAudioManager.src = audioUrl;
      }
      // #endif
      uni.$emit('send_play_state', {
        action: 'play',
        song: song,
        currentTime: 0,
        timestamp: Date.now()
      });
      setTimeout(() => {
        playerState.isLoadingAudio = false;
      }, 2000);
    } catch (error) {
      playerState.isLoadingAudio = false;
      console.error('播放音乐失败:', error);
      uni.showToast({
        title: error.message || '播放失败',
        icon: 'none',
        duration: 2000
      });
    }
  }

  /**
   * 暂停播放
   */
  const pauseMusic = () => {
    try {
      // #ifdef APP-PLUS || H5
      if (audioContext) {
        audioContext.pause()
      }
      // #endif

      // #ifdef MP
      if (backgroundAudioManager) {
        backgroundAudioManager.pause()
      }
      // #endif

      // 发送暂停状态到服务器
      uni.$emit('send_play_state', {
        action: 'pause',
        currentTime: playerState.currentTime,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('暂停播放失败:', error)
    }
  }

  /**
   * 恢复播放
   */
  const resumeMusic = () => {
    try {
      // #ifdef APP-PLUS || H5
      if (audioContext) {
        audioContext.play()
      }
      // #endif

      // #ifdef MP
      if (backgroundAudioManager) {
        backgroundAudioManager.play()
      }
      // #endif

      // 发送恢复状态到服务器
      uni.$emit('send_play_state', {
        action: 'resume',
        currentTime: playerState.currentTime,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('恢复播放失败:', error)
    }
  }
  /**
   * 停止播放
   */
  const stopMusic = () => {
    try {
      // #ifdef H5
      if (audioContext) {
        audioContext.pause()
        audioContext.currentTime = 0
      }
      // #endif

      // #ifdef APP-PLUS
      if (audioContext) {
        audioContext.stop()
      }
      // #endif

      // #ifdef MP
      if (backgroundAudioManager) {
        backgroundAudioManager.stop()
      }
      // #endif

      playerState.currentTime = 0

      // 发送停止状态到服务器
      uni.$emit('send_play_state', {
        action: 'stop',
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('停止播放失败:', error)
    }
  }

  /**
   * 切换播放/暂停
   */
  const togglePlay = () => {
    if (playerState.isPlaying) {
      pauseMusic()
    } else if (playerState.isPaused) {
      resumeMusic()
    } else {
      playMusic()
    }
  }

  /**
   * 播放上一首
   */
  const playPrevious = () => {
    if (playerState.playlist.length === 0) return

    let newIndex = playerState.currentIndex - 1
    if (newIndex < 0) {
      newIndex = playerState.playlist.length - 1
    }

    playerState.currentIndex = newIndex
    playMusic(playerState.playlist[newIndex])
  }

  /**
   * 播放下一首
   */
  const playNext = () => {
    if (playerState.playlist.length === 0) return

    let newIndex = getNextIndex()
    playerState.currentIndex = newIndex
    playMusic(playerState.playlist[newIndex])
  }

  /**
   * 获取下一首歌曲索引
   */
  const getNextIndex = () => {
    const length = playerState.playlist.length
    if (length === 0) return 0

    switch (playerState.playMode) {
      case 'random':
        return Math.floor(Math.random() * length)
      case 'loop':
        return playerState.currentIndex
      case 'list':
      default:
        return (playerState.currentIndex + 1) % length
    }
  }
  /**
   * 设置播放进度
   * @param {number} progress - 进度百分比 (0-100)
   */
  const setProgress = (progress) => {
    try {
      const time = (progress / 100) * playerState.duration

      // #ifdef H5
      if (audioContext) {
        audioContext.currentTime = time
      }
      // #endif

      // #ifdef APP-PLUS
      if (audioContext) {
        audioContext.seek(time)
      }
      // #endif

      // #ifdef MP
      if (backgroundAudioManager) {
        backgroundAudioManager.seek(time)
      }
      // #endif

      playerState.currentTime = time

    } catch (error) {
      console.error('设置播放进度失败:', error)
    }
  }

  /**
   * 设置音量
   * @param {number} volume - 音量 (0-1)
   */
  const setVolume = (volume) => {
    try {
      playerState.volume = Math.max(0, Math.min(1, volume))

      // #ifdef APP-PLUS || H5
      if (audioContext) {
        audioContext.volume = playerState.volume
      }
      // #endif

      // 小程序的背景音频管理器不支持设置音量

    } catch (error) {
      console.error('设置音量失败:', error)
    }
  }

  /**
   * 设置播放模式
   * @param {string} mode - 播放模式
   */
  const setPlayMode = (mode) => {
    const validModes = ['list', 'random', 'loop']
    if (validModes.includes(mode)) {
      playerState.playMode = mode
      
      uni.showToast({
        title: getPlayModeText(mode),
        icon: 'none',
        duration: 1500
      })
    }
  }

  /**
   * 获取播放模式文本
   */
  const getPlayModeText = (mode) => {
    switch (mode) {
      case 'list': return '列表播放'
      case 'random': return '随机播放'
      case 'loop': return '单曲循环'
      default: return '列表播放'
    }
  }

  /**
   * 添加歌曲到播放列表
   * @param {object} song - 歌曲对象
   */
  const addToPlaylist = (song) => {
    if (!song) return

    // 检查是否已存在
    const exists = playerState.playlist.some(item => item.id === song.id)
    if (exists) {
      uni.showToast({
        title: '歌曲已在播放列表中',
        icon: 'none'
      })
      return
    }

    playerState.playlist.push(song)
    
    uni.showToast({
      title: '已添加到播放列表',
      icon: 'success'
    })

    // 发送添加歌曲到服务器
    uni.$emit('send_add_song', song)
  }

  /**
   * 从播放列表移除歌曲
   * @param {number} index - 索引
   */
  const removeFromPlaylist = (index) => {
    if (index < 0 || index >= playerState.playlist.length) return

    const song = playerState.playlist[index]
    playerState.playlist.splice(index, 1)

    // 调整当前播放索引
    if (index < playerState.currentIndex) {
      playerState.currentIndex--
    } else if (index === playerState.currentIndex) {
      // 如果删除的是当前播放的歌曲
      if (playerState.playlist.length === 0) {
        stopMusic()
        playerState.currentIndex = 0
      } else {
        // 播放下一首或当前位置的歌曲
        if (playerState.currentIndex >= playerState.playlist.length) {
          playerState.currentIndex = 0
        }
        playMusic(playerState.playlist[playerState.currentIndex])
      }
    }

    uni.showToast({
      title: '已从播放列表移除',
      icon: 'success'
    })

    // 发送移除歌曲到服务器
    uni.$emit('send_remove_song', song.id)
  }

  /**
   * 清空播放列表
   */
  const clearPlaylist = () => {
    stopMusic()
    playerState.playlist = []
    playerState.currentIndex = 0
    
    uni.showToast({
      title: '播放列表已清空',
      icon: 'success'
    })
  }  /**
   * 获取音频URL
   * @param {object} song - 歌曲对象
   */  const getAudioUrl = (song) => {
    // 如果歌曲已经有完整URL，直接返回
    if (song.url && (song.url.startsWith('http://') || song.url.startsWith('https://'))) {
      return song.url
    }
    try {
      // 获取服务器配置
      const rawServerConfig = uni.getStorageSync('serverConfig')
      if (!rawServerConfig) {
        console.error('未配置服务器')
        return ''
      }
      
      // 标准化服务器配置
      const serverConfig = normalizeServerConfig(rawServerConfig)
      if (!serverConfig) {
        console.error('服务器配置格式错误')
        return ''
      }
      
      // 获取token
      const token = uni.getStorageSync('token')
      if (!token) {
        console.error('未登录，无法获取音频URL')
        return ''
      }
      
      // 构建音频文件名（只允许文件名，不允许路径）
      let filename = song.filename || `${song.name}.${song.format || 'mp3'}`
      if (filename.includes('/')) {
        filename = filename.split('/').pop()
      }
      if (filename.includes('\\')) {
        filename = filename.split('\\').pop()
      }
      
      // 调试日志
      console.log('getAudioUrl: 标准化配置 =', serverConfig)
      console.log('getAudioUrl: filename =', filename, 'song =', song)
      
      // 拼接最终URL
      let finalUrl = serverConfig.fullUrl + '/api/music/storage/' + encodeURIComponent(filename) + '?token=' + encodeURIComponent(token)
      console.log('构建音频URL:', finalUrl)
      return finalUrl
    } catch (error) {
      console.error('构建音频URL失败:', error)
      return ''
    }
  }

  /**
   * 格式化时间
   * @param {number} seconds - 秒数
   */
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00'
    
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * 销毁音频管理器
   */
  const destroy = () => {
    try {
      // #ifdef APP-PLUS || H5
      if (audioContext) {
        audioContext.destroy()
        audioContext = null
      }
      // #endif

      // 小程序的背景音频管理器不需要手动销毁

      playerState.audioContext = null
      playerState.backgroundAudioManager = null

    } catch (error) {
      console.error('销毁音频管理器失败:', error)
    }
  }
  /**
   * 调试服务器配置和URL构建
   */
  const debugServerConfig = () => {
    try {
      const rawServerConfig = uni.getStorageSync('serverConfig')
      console.log('=== 服务器配置调试信息 ===')
      console.log('原始配置:', JSON.stringify(rawServerConfig, null, 2))
      
      if (rawServerConfig) {
        console.log('原始配置字段:')
        console.log('- serverHost:', rawServerConfig.serverHost)
        console.log('- serverPort:', rawServerConfig.serverPort)
        console.log('- useHttps:', rawServerConfig.useHttps)
        console.log('- url:', rawServerConfig.url)
        console.log('- port:', rawServerConfig.port)
        
        // 标准化配置
        const normalizedConfig = normalizeServerConfig(rawServerConfig)
        console.log('标准化后配置:', normalizedConfig)
        
        // 测试URL构建
        const testSong = { name: 'test', filename: 'test.mp3' }
        const audioUrl = getAudioUrl(testSong)
        console.log('测试构建的音频URL:', audioUrl)
          // 显示当前主机地址问题
        if (audioUrl.includes('mysxelfservice.gcsyweb.cbn')) {
          console.error('❌ 发现问题: URL中包含意外的主机地址 mysxelfservice.gcsyweb.cbn')
          console.error('这可能是缓存或配置错误导致的')
          uni.showModal({
            title: '配置异常',
            content: '检测到异常的服务器地址，请重新配置服务器或清除缓存',
            showCancel: false
          })
        } else if (audioUrl.includes('localhost') || audioUrl.includes('127.0.0.1')) {
          console.log('✅ 使用本地开发服务器')
        } else {
          console.log('✅ URL构建正常，使用远程服务器')
        }
      }
      console.log('=== 调试信息结束 ===')
    } catch (error) {
      console.error('调试服务器配置失败:', error)
    }
  }

  /**
   * 标准化服务器配置
   * 将各种格式的服务器配置统一为标准格式
   */
  const normalizeServerConfig = (serverConfig) => {
    if (!serverConfig) return null
    
    // 如果是新版格式（有 serverHost 字段）
    if (serverConfig.serverHost && serverConfig.hasOwnProperty('useHttps')) {
      return {
        host: serverConfig.serverHost,
        port: serverConfig.serverPort || '',
        protocol: serverConfig.useHttps ? 'https' : 'http',
        fullUrl: `${serverConfig.useHttps ? 'https' : 'http'}://${serverConfig.serverHost}${serverConfig.serverPort ? ':' + serverConfig.serverPort : ''}`
      }
    }
    
    // 如果是旧版格式（只有 url 字段）
    if (serverConfig.url) {
      let url = serverConfig.url
      let protocol = 'http'
      let host = ''
      let port = ''
      
      // 解析协议
      if (url.startsWith('https://')) {
        protocol = 'https'
        url = url.substring(8)
      } else if (url.startsWith('http://')) {
        protocol = 'http'
        url = url.substring(7)
      } else if (url.startsWith('wss://')) {
        protocol = 'https'  // WebSocket Secure -> HTTPS
        url = url.substring(6)
      } else if (url.startsWith('ws://')) {
        protocol = 'http'   // WebSocket -> HTTP
        url = url.substring(5)
      }
      
      // 解析主机和端口
      if (url.includes('/')) {
        url = url.split('/')[0]  // 去除路径部分
      }
      
      if (url.includes(':')) {
        const parts = url.split(':')
        host = parts[0]
        port = parts[1]
      } else {
        host = url
        port = serverConfig.port || ''
      }
      
      return {
        host: host,
        port: port,
        protocol: protocol,
        fullUrl: `${protocol}://${host}${port ? ':' + port : ''}`
      }
    }
    
    return null
  }

  /**
   * 清理并重置服务器配置
   */
  const clearServerConfig = () => {
    try {
      console.log('清理服务器配置...')
      uni.removeStorageSync('serverConfig')
      uni.removeStorageSync('token')
      uni.removeStorageSync('userInfo')
      
      uni.showModal({
        title: '配置已清理',
        content: '所有服务器配置和登录信息已清除，请重新配置',
        showCancel: false,
        success: () => {
          // 返回登录页面
          uni.reLaunch({
            url: '/pages/login/login'
          })
        }
      })
    } catch (error) {
      console.error('清理配置失败:', error)
    }
  }

  return {
    // 状态
    playerState,
    currentSong,
    hasPlaylist,
    progressPercent,
    
    // 方法
    initAudioManager,
    playMusic,
    pauseMusic,
    resumeMusic,
    stopMusic,
    togglePlay,
    playPrevious,
    playNext,
    setProgress,
    setVolume,
    setPlayMode,
    getPlayModeText,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    formatTime,
    destroy,
    debugServerConfig,
    clearServerConfig
  }
}

// 默认导出播放器状态
export { playerState }
