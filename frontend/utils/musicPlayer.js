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
  backgroundAudioManager: null
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
   * 初始化音频管理器
   */
  const initAudioManager = () => {
    try {
      // #ifdef APP-PLUS || H5
      // App端和H5使用 HTML5 Audio
      audioContext = uni.createInnerAudioContext()
      setupAudioEvents(audioContext)
      playerState.audioContext = audioContext
      // #endif

      // #ifdef MP
      // 小程序使用背景音频管理器
      backgroundAudioManager = uni.getBackgroundAudioManager()
      setupBackgroundAudioEvents(backgroundAudioManager)
      playerState.backgroundAudioManager = backgroundAudioManager
      // #endif

      console.log('音频管理器初始化成功')
    } catch (error) {
      console.error('音频管理器初始化失败:', error)
      uni.showToast({
        title: '音频初始化失败',
        icon: 'error'
      })
    }
  }

  /**
   * 设置音频事件监听（内部音频）
   */
  const setupAudioEvents = (audio) => {
    audio.onPlay(() => {
      console.log('音频开始播放')
      playerState.isPlaying = true
      playerState.isPaused = false
    })

    audio.onPause(() => {
      console.log('音频暂停')
      playerState.isPlaying = false
      playerState.isPaused = true
    })

    audio.onStop(() => {
      console.log('音频停止')
      playerState.isPlaying = false
      playerState.isPaused = false
    })

    audio.onEnded(() => {
      console.log('音频播放结束')
      playNext()
    })

    audio.onTimeUpdate(() => {
      playerState.currentTime = audio.currentTime
      playerState.duration = audio.duration
    })

    audio.onError((error) => {
      console.error('音频播放错误:', error)
      uni.showToast({
        title: '播放失败',
        icon: 'error'
      })
    })
  }

  /**
   * 设置背景音频事件监听
   */
  const setupBackgroundAudioEvents = (bgAudio) => {
    bgAudio.onPlay(() => {
      console.log('背景音频开始播放')
      playerState.isPlaying = true
      playerState.isPaused = false
    })

    bgAudio.onPause(() => {
      console.log('背景音频暂停')
      playerState.isPlaying = false
      playerState.isPaused = true
    })

    bgAudio.onStop(() => {
      console.log('背景音频停止')
      playerState.isPlaying = false
      playerState.isPaused = false
    })

    bgAudio.onEnded(() => {
      console.log('背景音频播放结束')
      playNext()
    })

    bgAudio.onTimeUpdate(() => {
      playerState.currentTime = bgAudio.currentTime
      playerState.duration = bgAudio.duration
    })

    bgAudio.onError((error) => {
      console.error('背景音频播放错误:', error)
      uni.showToast({
        title: '播放失败',
        icon: 'error'
      })
    })
  }

  /**
   * 播放音乐
   * @param {object} song - 歌曲对象
   * @param {number} index - 播放列表中的索引
   */
  const playMusic = async (song, index) => {
    try {
      if (index !== undefined) {
        playerState.currentIndex = index
      }

      if (!song) {
        song = currentSong.value
      }

      if (!song) {
        throw new Error('没有可播放的歌曲')
      }

      console.log('开始播放:', song.name)

      // 构建音频URL
      const audioUrl = getAudioUrl(song)

      // #ifdef APP-PLUS || H5
      if (audioContext) {
        audioContext.src = audioUrl
        audioContext.play()
      }
      // #endif

      // #ifdef MP
      if (backgroundAudioManager) {
        backgroundAudioManager.title = song.name
        backgroundAudioManager.singer = song.artist || '未知艺术家'
        backgroundAudioManager.coverImgUrl = song.cover || '/static/default-cover.png'
        backgroundAudioManager.src = audioUrl
      }
      // #endif

      // 发送播放状态到服务器
      uni.$emit('send_play_state', {
        action: 'play',
        song: song,
        currentTime: 0,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('播放音乐失败:', error)
      uni.showToast({
        title: error.message || '播放失败',
        icon: 'error'
      })
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
      // #ifdef APP-PLUS || H5
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

      // #ifdef APP-PLUS || H5
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
  }

  /**
   * 获取音频URL
   * @param {object} song - 歌曲对象
   */
  const getAudioUrl = (song) => {
    if (song.url) {
      return song.url
    }
    
    // 构建服务器音频流URL
    const serverUrl = uni.getStorageSync('serverUrl') || ''
    if (serverUrl && song.filename) {
      return `${serverUrl}/api/stream/${encodeURIComponent(song.filename)}`
    }
    
    return ''
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
    destroy
  }
}

// 默认导出播放器状态
export { playerState }
