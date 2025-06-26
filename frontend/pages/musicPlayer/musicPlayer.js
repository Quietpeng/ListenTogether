// musicPlayer.js 更新版
// 导入服务连接、轮询管理器和状态
import { useServerConnection, connectionState } from '../../utils/serverConnection.js';
import { usePollingManager, pollingManager } from '../../utils/pollingManager.js';
import { reactive, ref, onMounted, onBeforeUnmount, watch } from 'vue';

export default {
  setup() {
    // 获取服务器连接工具
    const { connect, disconnect, sendPlayState, getPlaylist } = useServerConnection();
    
    // 播放器状态
    const state = reactive({
      playlist: [],
      currentIndex: -1,
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      audioContext: null,
      isLoading: false,
      connectionStatus: '连接中...',
      connectedClients: 0,
      progressUpdateTimer: null,
      lastSyncTime: 0,
      serverUrl: ''
    });
    
    // 音频播放相关
    let audioContext = null;
    
    // 初始化连接和事件监听
    onMounted(async () => {
      try {
        // 恢复服务器连接
        const serverConfig = uni.getStorageSync('serverConfig');
        if (serverConfig) {
          state.serverUrl = serverConfig.url + (serverConfig.port ? `:${serverConfig.port}` : '');
          await connect(state.serverUrl);
        }
        
        // 初始化音频上下文
        state.audioContext = uni.createInnerAudioContext();
        setupAudioListeners();
        
        // 获取播放列表
        await fetchPlaylist();
        
        // 设置事件监听 - WebSocket和轮询都支持
        setupEventListeners();
        
        state.connectionStatus = connectionState.connected ? '已连接' : '使用HTTP轮询';
        
      } catch (error) {
        console.error('初始化播放器失败:', error);
        state.connectionStatus = '连接失败';
      }
    });
    
    // 清理定时器和事件监听
    onBeforeUnmount(() => {
      // 移除事件监听器
      uni.$off('state_update');
      uni.$off('position_sync');
      uni.$off('poll_state_update');
      uni.$off('poll_position_update');
      uni.$off('poll_clients_update');
      
      // 停止定时器
      if (state.progressUpdateTimer) {
        clearInterval(state.progressUpdateTimer);
      }
      
      // 释放音频资源
      if (state.audioContext) {
        state.audioContext.destroy();
      }
    });
    
    // 设置音频监听器
    const setupAudioListeners = () => {
      const audio = state.audioContext;
      
      audio.onPlay(() => {
        console.log('开始播放');
      });
      
      audio.onTimeUpdate(() => {
        state.currentTime = audio.currentTime || 0;
        
        // 每5秒同步一次播放位置到服务器
        const now = Date.now();
        if (now - state.lastSyncTime > 5000 && state.isPlaying) {
          syncPositionToServer();
          state.lastSyncTime = now;
        }
      });
      
      audio.onEnded(() => {
        console.log('播放结束');
        playNext();
      });
      
      audio.onError((err) => {
        console.error('音频播放错误:', err);
        uni.showToast({
          title: '播放错误，尝试下一首',
          icon: 'none'
        });
        setTimeout(playNext, 1000);
      });
      
      audio.onCanplay(() => {
        state.duration = audio.duration || 0;
        state.isLoading = false;
      });
    };
    
    // 设置事件监听器 - 同时监听WebSocket和轮询事件
    const setupEventListeners = () => {
      // WebSocket事件
      uni.$on('state_update', handleStateUpdate);
      uni.$on('position_sync', handlePositionSync);
      
      // 轮询事件
      uni.$on('poll_state_update', handleStateUpdate);
      uni.$on('poll_position_update', handlePositionSync);
      uni.$on('poll_clients_update', handleClientsUpdate);
    };
    
    // 处理状态更新（支持WebSocket和轮询）
    const handleStateUpdate = (data) => {
      console.log('收到状态更新:', data);
      
      // 更新播放列表
      if (data.playlist) {
        state.playlist = data.playlist;
      }
      
      // 更新当前索引
      if (data.current_index !== undefined) {
        state.currentIndex = data.current_index;
        state.currentSong = state.playlist[state.currentIndex] || null;
      }
      
      // 更新播放状态（只有在变化时才切换）
      if (data.is_playing !== undefined && data.is_playing !== state.isPlaying) {
        if (data.is_playing) {
          play(state.currentIndex, true);
        } else {
          pause(true);
        }
      }
      
      // 更新连接的客户端数
      if (data.connected_clients) {
        state.connectedClients = data.connected_clients;
      }
    };
    
    // 处理位置同步（支持WebSocket和轮询）
    const handlePositionSync = (data) => {
      console.log('收到位置同步:', data);
      
      // 只有在相差较大时才同步，避免抖动
      if (Math.abs(state.currentTime - data.position) > 3 && state.isPlaying) {
        state.audioContext.seek(data.position);
        state.currentTime = data.position;
      }
    };
    
    // 处理客户端数量更新（轮询专用）
    const handleClientsUpdate = (data) => {
      if (data.connected_clients !== undefined) {
        state.connectedClients = data.connected_clients;
      }
    };
    
    // 获取播放列表
    const fetchPlaylist = async () => {
      try {
        // 使用HTTP API获取播放列表
        const data = await getPlaylist();
        
        state.playlist = data.playlist || [];
        state.currentIndex = data.current_index || 0;
        state.currentSong = state.playlist[state.currentIndex] || null;
        state.isPlaying = data.is_playing || false;
        
        // 如果当前有歌曲且正在播放，则开始播放
        if (state.currentSong && state.isPlaying) {
          play(state.currentIndex, true, data.current_position || 0);
        }
        
        console.log('播放列表获取成功:', state.playlist);
      } catch (error) {
        console.error('获取播放列表失败:', error);
        uni.showToast({
          title: '获取播放列表失败',
          icon: 'none'
        });
      }
    };
    
    // 播放歌曲
    const play = async (index, fromServer = false, startPosition = 0) => {
      try {
        // 防止无效索引
        if (index < 0 || index >= state.playlist.length) {
          return;
        }
        
        // 切换到新歌曲
        if (index !== state.currentIndex || !state.audioContext.src) {
          state.isLoading = true;
          state.currentIndex = index;
          state.currentSong = state.playlist[index];
          
          // 如果不是从服务器通知的播放请求，则发送到服务器
          if (!fromServer) {
            // 发送请求 - 根据连接状态使用不同的方式
            if (connectionState.connected && !connectionState.usingPolling) {
              // WebSocket模式
              const response = await uni.request({
                url: `${state.serverUrl}/api/play/${index}`,
                method: 'POST',
                header: {
                  'Authorization': `Bearer ${uni.getStorageSync('token')}`
                }
              });
              
              if (response.statusCode === 200) {
                console.log('服务器接受了播放请求');
              }
            } else if (connectionState.usingPolling) {
              // 轮询模式
              const token = uni.getStorageSync('token');
              const result = await pollingManager.changeSong(state.serverUrl, token, index);
              
              if (result && result.url) {
                console.log('通过轮询切换歌曲成功');
              }
            }
          }
          
          // 获取歌曲URL
          const token = uni.getStorageSync('token');
          const songUrl = `${state.serverUrl}/api/music/storage/${state.currentSong.name}.${state.currentSong.format}?token=${token}`;
          
          // 设置新的音频源
          state.audioContext.stop();
          state.audioContext.src = songUrl;
          
          // 如果指定了起始位置
          if (startPosition > 0) {
            state.audioContext.startTime = startPosition;
          }
        }
        
        // 播放音频
        state.audioContext.play();
        state.isPlaying = true;
        
        // 如果不是从服务器通知的播放操作，则通知服务器
        if (!fromServer) {
          if (connectionState.connected && !connectionState.usingPolling) {
            // WebSocket模式
            const response = await uni.request({
              url: `${state.serverUrl}/api/resume`,
              method: 'POST',
              header: {
                'Authorization': `Bearer ${uni.getStorageSync('token')}`
              }
            });
          } else if (connectionState.usingPolling) {
            // 轮询模式
            const token = uni.getStorageSync('token');
            await pollingManager.updatePlayState(state.serverUrl, token, true);
          }
        }
      } catch (error) {
        console.error('播放失败:', error);
        state.isPlaying = false;
        uni.showToast({
          title: '播放失败',
          icon: 'none'
        });
      }
    };
    
    // 暂停播放
    const pause = async (fromServer = false) => {
      state.audioContext.pause();
      state.isPlaying = false;
      
      // 如果不是从服务器通知的暂停，则通知服务器
      if (!fromServer) {
        if (connectionState.connected && !connectionState.usingPolling) {
          // WebSocket模式
          await uni.request({
            url: `${state.serverUrl}/api/pause`,
            method: 'POST',
            header: {
              'Authorization': `Bearer ${uni.getStorageSync('token')}`
            }
          });
        } else if (connectionState.usingPolling) {
          // 轮询模式
          const token = uni.getStorageSync('token');
          await pollingManager.updatePlayState(state.serverUrl, token, false);
        }
      }
    };
    
    // 切换播放/暂停
    const togglePlay = () => {
      if (!state.currentSong) return;
      
      if (state.isPlaying) {
        pause();
      } else {
        play(state.currentIndex);
      }
    };
    
    // 播放下一首
    const playNext = async () => {
      if (!state.playlist.length) return;
      
      const nextIndex = (state.currentIndex + 1) % state.playlist.length;
      play(nextIndex);
    };
    
    // 播放上一首
    const playPrevious = () => {
      if (!state.playlist.length) return;
      
      let prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) prevIndex = state.playlist.length - 1;
      play(prevIndex);
    };
    
    // 调整播放位置
    const seek = (position) => {
      if (!state.audioContext || !state.currentSong) return;
      
      state.audioContext.seek(position);
      state.currentTime = position;
      
      // 同步位置到服务器
      syncPositionToServer();
    };
    
    // 同步位置到服务器
    const syncPositionToServer = async () => {
      if (!state.currentSong) return;
      
      try {
        if (connectionState.connected && !connectionState.usingPolling) {
          // WebSocket模式
          sendPlayState({
            position: state.currentTime,
            is_playing: state.isPlaying
          });
          
          await uni.request({
            url: `${state.serverUrl}/api/sync-position`,
            method: 'POST',
            header: {
              'Authorization': `Bearer ${uni.getStorageSync('token')}`,
              'Content-Type': 'application/json'
            },
            data: {
              position: state.currentTime
            }
          });
        } else if (connectionState.usingPolling) {
          // 轮询模式
          const token = uni.getStorageSync('token');
          await pollingManager.updatePosition(state.serverUrl, token, state.currentTime);
        }
      } catch (error) {
        console.error('同步位置失败:', error);
      }
    };
    
    // 格式化时间为分:秒
    const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds)) return '00:00';
      
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    // 计算进度百分比
    const getProgressPercent = () => {
      if (!state.duration) return 0;
      return (state.currentTime / state.duration) * 100;
    };
    
    // 进度条拖动处理
    const onSeek = (event) => {
      if (!state.duration) return;
      
      const percent = event.detail.value;
      const position = (percent / 100) * state.duration;
      seek(position);
    };
    
    return {
      // 状态
      ...state,
      progressPercent: getProgressPercent,
      
      // 方法
      togglePlay,
      playNext,
      playPrevious,
      onSeek,
      formatTime,
      
      // 服务器连接状态
      connected: () => connectionState.connected || connectionState.usingPolling,
      connectionStatus: () => {
        if (connectionState.connected) return '已连接 (WebSocket)';
        if (connectionState.usingPolling) return '已连接 (HTTP轮询)';
        return '连接中...';
      }
    };
  }
};
