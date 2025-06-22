<template>
  <div class="music-player">
    <!-- 头部 -->
    <el-header class="header">
      <div class="header-content">
        <h2>音乐一起听</h2>
        <div class="header-actions">
          <el-badge :value="connectedClients" class="badge">
            <el-button type="info" size="small">
              <el-icon><User /></el-icon>
              在线用户
            </el-button>
          </el-badge>
          <el-button type="danger" size="small" @click="logout">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-button>
        </div>
      </div>
    </el-header>

    <!-- 主要内容 -->
    <el-container class="main-container">
      <!-- 播放器控制区 -->
      <el-header height="200px" class="player-section">
        <div class="player-card">
          <div class="current-song">
            <h3>{{ currentSong ? currentSong.name : '暂无播放' }}</h3>
            <!-- <p>{{ connectionStatus }}</p> -->
          </div>
          
          <!-- 音频元素 -->
          <audio
            ref="audioPlayer"
            @timeupdate="onTimeUpdate"
            @ended="onSongEnded"
            @loadedmetadata="onLoadedMetadata"
            @play="onPlay"
            @pause="onPause"
          ></audio>
          
          <!-- 进度条 -->
          <div class="progress-section">
            <span class="time">{{ formatTime(currentTime) }}</span>
            <el-slider
              v-model="currentTime"
              :max="duration"
              :format-tooltip="formatTime"
              @change="onSeek"
              class="progress-slider"
            />
            <span class="time">{{ formatTime(duration) }}</span>
          </div>
          
          <!-- 控制按钮 -->
          <div class="controls">
            <el-button-group>
              <el-button @click="prevSong" :disabled="!playlist.length">
                <el-icon><DArrowLeft /></el-icon>
              </el-button>
              <el-button type="primary" @click="togglePlay" :disabled="!currentSong">
                <el-icon>
                  <VideoPause v-if="isPlaying" />
                  <VideoPlay v-else />
                </el-icon>
              </el-button>
              <el-button @click="nextSong" :disabled="!playlist.length">
                <el-icon><DArrowRight /></el-icon>
              </el-button>
            </el-button-group>
            
            <el-button @click="shufflePlaylist" :disabled="!playlist.length">
              <el-icon><Refresh /></el-icon>
              随机播放
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- 播放列表 -->
      <el-main class="playlist-section">
        <div class="playlist-header">
          <h3>播放列表 ({{ playlist.length }}首)</h3>
          <div class="playlist-actions">
            <el-upload
              :action="uploadUrl"
              :headers="uploadHeaders"
              :on-success="onUploadSuccess"
              :on-error="onUploadError"
              :before-upload="beforeUpload"
              accept=".mp3,.wav,.flac,.m4a"
              :show-file-list="false"
            >
              <el-button type="primary">
                <el-icon><Plus /></el-icon>
                上传音乐
              </el-button>
            </el-upload>
          </div>
        </div>
        
        <div class="playlist-content">
          <el-empty v-if="!playlist.length" description="暂无音乐文件" />
          <div v-else class="song-list">
            <div
              v-for="(song, index) in playlist"
              :key="index"
              class="song-item"
              :class="{ active: index === currentIndex }"
              @click="playSong(index)"
            >
              <div class="song-info">
                <div class="song-index">{{ index + 1 }}</div>
                <div class="song-details">
                  <div class="song-name">{{ song.name }}</div>
                  <div class="song-format">{{ song.format.toUpperCase() }}</div>
                </div>
              </div>
              <div class="song-actions">
                <el-button
                  v-if="index === currentIndex && isPlaying"
                  type="primary"
                  size="small"
                  circle
                  disabled
                >
                  <el-icon><VideoPlay /></el-icon>
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  circle
                  @click.stop="deleteSong(index)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User, SwitchButton, DArrowLeft, DArrowRight, VideoPlay, VideoPause,
  Refresh, Plus, Delete
} from '@element-plus/icons-vue'
import api from '../utils/api'
import socketService from '../utils/socket'
import { API_BASE_URL } from '../utils/env-fix'

const router = useRouter()
const audioPlayer = ref(null)

// 状态数据
const state = reactive({
  playlist: [],
  currentIndex: 0,
  isPlaying: false,
  currentPosition: 0
})

const currentTime = ref(0)
const duration = ref(0)
const connectedClients = ref(1)
const connectionStatus = ref('连接中...')
const syncLock = ref(false)

// 计算属性
const playlist = computed(() => state.playlist || [])
const currentIndex = computed(() => state.currentIndex || 0)
const isPlaying = computed(() => state.isPlaying || false)
const currentSong = computed(() => {
  if (playlist.value.length > 0 && currentIndex.value < playlist.value.length) {
    return playlist.value[currentIndex.value]
  }
  return null
})

// 上传相关
const uploadUrl = `${API_BASE_URL}/upload`
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}))

// WebSocket事件处理
const setupWebSocket = () => {
  socketService.on('state_update', (data) => {
    console.log('收到状态更新:', data)
    const oldSong = currentSong.value
    const oldPlaying = isPlaying.value
    
    // 明确更新每个状态属性，确保响应式更新
    state.playlist = data.playlist || []
    state.currentIndex = data.current_index || 0
    state.isPlaying = data.is_playing || false
    state.currentPosition = data.current_position || 0
    
    // 更新在线用户数
    if (typeof data.connected_clients === 'number') {
      connectedClients.value = data.connected_clients
      console.log('更新在线用户数:', data.connected_clients)
    }
    
    console.log('状态更新对比:', {
      歌曲变化: oldSong?.name !== currentSong.value?.name,
      播放状态变化: oldPlaying !== isPlaying.value,
      当前歌曲: currentSong.value?.name,
      播放状态: isPlaying.value,
      后端状态: data.is_playing,
      前端状态: state.isPlaying,
      在线用户数: data.connected_clients
    })
    
    // 使用nextTick确保DOM更新后再调用
    nextTick(() => {
      updateAudioPlayer()
    })
  })
  socketService.on('position_sync', (data) => {
    console.log('收到位置同步:', data)
    // 只有在用户主动拖动进度条时才接受位置同步
    // 并且只有在时间差异较大时才更新（避免微小差异导致的频繁跳跃）
    if (!syncLock.value && audioPlayer.value) {
      const timeDiff = Math.abs(audioPlayer.value.currentTime - data.position)
      if (timeDiff > 1) { // 只有相差超过1秒才同步
        console.log('应用位置同步，时间差异:', timeDiff)
        currentTime.value = data.position
        audioPlayer.value.currentTime = data.position
      }
    }
  })

  socketService.connect()
  connectionStatus.value = 'WebSocket已连接'
}

// 更新音频播放器
const updateAudioPlayer = () => {
  if (!audioPlayer.value || !currentSong.value) {
    console.log('updateAudioPlayer: 缺少必要元素', {
      audioPlayer: !!audioPlayer.value,
      currentSong: !!currentSong.value
    })
    return
  }
  const token = localStorage.getItem('token')
  const newUrl = `${API_BASE_URL}/music/storage/${encodeURIComponent(currentSong.value.name)}.${currentSong.value.format}?token=${token}`
  
  console.log('updateAudioPlayer:', {
    currentSong: currentSong.value.name,
    isPlaying: isPlaying.value,
    newUrl: newUrl,
    audioPlayerSrc: audioPlayer.value.src
  })
  
  if (audioPlayer.value.src !== newUrl) {
    console.log('更新音频源:', newUrl)
    audioPlayer.value.src = newUrl
    audioPlayer.value.load() // 强制重新加载
  }
  if (isPlaying.value && audioPlayer.value.paused) {
    console.log('开始播放音频')
    audioPlayer.value.play().catch(error => {
      console.error('音频播放失败:', error)
      // 如果自动播放失败，尝试在用户交互后播放
    //   ElMessage.warning('自动播放受限，请手动点击播放按钮')
    })
  } else if (!isPlaying.value && !audioPlayer.value.paused) {
    console.log('暂停音频')
    audioPlayer.value.pause()
  }
  
  console.log('updateAudioPlayer 完成:', {
    audioPlayerPaused: audioPlayer.value.paused,
    isPlayingState: isPlaying.value,
    audioPlayerCurrentTime: audioPlayer.value.currentTime,
    audioPlayerDuration: audioPlayer.value.duration
  })
}

// 音频事件处理
const onTimeUpdate = () => {
  if (!syncLock.value && audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime
    // 移除自动时间同步，避免多设备互相干扰
    // 只在用户主动拖动进度条时才同步时间位置
  }
}

const onLoadedMetadata = () => {
  if (audioPlayer.value) {
    duration.value = audioPlayer.value.duration
  }
}

const onPlay = () => {
  if (!syncLock.value) {
    api.post('/resume').catch(console.error)
  }
}

const onPause = () => {
  if (!syncLock.value) {
    api.post('/pause').catch(console.error)
  }
}

const onSongEnded = () => {
  nextSong()
}

const onSeek = (value) => {
  console.log('用户拖动进度条到:', value)
  syncLock.value = true
  if (audioPlayer.value) {
    audioPlayer.value.currentTime = value
    // 只有在用户主动拖动进度条时才同步位置
    socketService.emit('sync_position', {
      position: value
    })
  }
  setTimeout(() => {
    syncLock.value = false
  }, 1000)
}

// 播放控制
const togglePlay = async () => {
  try {
    if (isPlaying.value) {
      await api.post('/pause')
    } else {
      await api.post('/resume')
      // 手动点击播放时，强制音频播放器播放
      if (audioPlayer.value && currentSong.value) {
        setTimeout(() => {
          if (audioPlayer.value.paused) {
            console.log('手动触发音频播放')
            audioPlayer.value.play().catch(error => {
              console.error('手动播放失败:', error)
            })
          }
        }, 100)
      }
    }
  } catch (error) {
    console.error('播放控制失败:', error)
  }
}

const playSong = async (index) => {
  try {
    await api.post(`/play/${index}`)
    // 手动选择歌曲时，强制音频播放器播放
    setTimeout(() => {
      if (audioPlayer.value && currentSong.value && !audioPlayer.value.paused) {
        return // 已经在播放了
      }
      if (audioPlayer.value && currentSong.value) {
        console.log('手动选择歌曲，触发播放')
        audioPlayer.value.play().catch(error => {
          console.error('选择歌曲播放失败:', error)
        })
      }
    }, 200)
  } catch (error) {
    console.error('播放歌曲失败:', error)
  }
}

const prevSong = async () => {
  try {
    await api.post('/prev')
  } catch (error) {
    console.error('上一首失败:', error)
  }
}

const nextSong = async () => {
  try {
    await api.post('/next')
  } catch (error) {
    console.error('下一首失败:', error)
  }
}

const shufflePlaylist = async () => {
  try {
    const response = await api.post('/shuffle')
    ElMessage.success('播放列表已随机排列并开始播放')
    console.log('随机播放响应:', response.data)
    
    // 状态会通过WebSocket自动更新，等待状态同步后更新播放器
    setTimeout(() => {
      console.log('延迟更新音频播放器')
      updateAudioPlayer()
    }, 200)
  } catch (error) {
    console.error('随机播放失败:', error)
    ElMessage.error('随机播放失败')
  }
}

const deleteSong = async (index) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 "${playlist.value[index].name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await api.delete(`/delete/${index}`)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除歌曲失败:', error)
    }
  }
}

// 上传处理
const beforeUpload = (file) => {
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4']
  const allowedExtensions = ['.mp3', '.wav', '.flac', '.m4a']
  
  const fileName = file.name.toLowerCase()
  const isValidType = allowedTypes.includes(file.type) || 
                     allowedExtensions.some(ext => fileName.endsWith(ext))
  
  if (!isValidType) {
    ElMessage.error('只支持 MP3, WAV, FLAC, M4A 格式的音频文件!')
    return false
  }
  
  const isLt50M = file.size / 1024 / 1024 < 50
  if (!isLt50M) {
    ElMessage.error('文件大小不能超过 50MB!')
    return false
  }
  
  return true
}

const onUploadSuccess = () => {
  ElMessage.success('上传成功')
  loadPlaylist()
}

const onUploadError = () => {
  ElMessage.error('上传失败')
}

// 工具函数
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const loadPlaylist = async () => {
  try {
    const response = await api.get('/songs')
    // 明确更新每个状态属性，确保响应式更新
    state.playlist = response.data.playlist || []
    state.currentIndex = response.data.current_index || 0
    state.isPlaying = response.data.is_playing || false
    state.currentPosition = response.data.current_position || 0
    
    console.log('初始加载播放列表:', {
      playlist: state.playlist.length,
      currentIndex: state.currentIndex,
      isPlaying: state.isPlaying,
      currentSong: currentSong.value?.name
    })
    
    updateAudioPlayer()
  } catch (error) {
    console.error('加载播放列表失败:', error)
  }
}

const logout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '确认退出', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    localStorage.removeItem('token')
    socketService.disconnect()
    router.push('/login')
  } catch (error) {
    // 用户取消
  }
}

// 生命周期
onMounted(() => {
  loadPlaylist()
  setupWebSocket()
})

onUnmounted(() => {
  socketService.disconnect()
})

// 监听当前歌曲变化
watch(currentSong, (newSong) => {
  if (newSong) {
    updateAudioPlayer()
  }
}, { immediate: true })
</script>

<style scoped>
.music-player {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.header {
  background: white;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-content h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.badge {
  margin-right: 10px;
}

.main-container {
  flex: 1;
  overflow: hidden;
}

.player-section {
  background: white;
  margin: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.player-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.current-song {
  text-align: center;
  margin-bottom: 20px;
}

.current-song h3 {
  margin: 0 0 5px 0;
  color: #303133;
  font-size: 20px;
}

.current-song p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.progress-slider {
  flex: 1;
}

.time {
  font-size: 12px;
  color: #909399;
  min-width: 40px;
  text-align: center;
}

.controls {
  display: flex;
  justify-content: center;
  gap: 20px;
  align-items: center;
}

.playlist-section {
  margin: 0 20px 20px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow: hidden;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.playlist-header h3 {
  margin: 0;
  color: #303133;
}

.playlist-content {
  height: calc(100% - 60px);
  overflow-y: auto;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.song-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.song-item:hover {
  background-color: #f5f7fa;
}

.song-item.active {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.song-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.song-index {
  width: 30px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.song-details {
  flex: 1;
}

.song-name {
  font-size: 14px;
  color: #303133;
  margin-bottom: 2px;
}

.song-format {
  font-size: 12px;
  color: #909399;
}

.song-actions {
  display: flex;
  gap: 8px;
}
</style>
