import { ref, reactive } from 'vue';
import { getSafeUserFingerprint } from './fingerprint.js';

/**
 * 轮询管理器
 * 用于在WebSocket不可用时进行HTTP轮询
 */
export function usePollingManager() {
  // 轮询状态
  const pollingState = reactive({
    isActive: false,
    intervalIds: {
      state: null,
      position: null,
      clients: null
    },
    lastPosition: 0,
    lastTimestamp: null,
    pollInterval: 3000, // 默认轮询间隔
    positionPollInterval: 5000, // 位置轮询间隔
  });

  /**
   * 启动轮询
   * @param {string} serverUrl - 服务器URL
   * @param {object} options - 轮询选项
   */
  const startPolling = (serverUrl, options = {}) => {
    if (pollingState.isActive) {
      stopPolling();
    }

    pollingState.isActive = true;
    
    // 设置轮询间隔
    const stateInterval = options.stateInterval || pollingState.pollInterval;
    const positionInterval = options.positionInterval || pollingState.positionPollInterval;
    const clientsInterval = options.clientsInterval || pollingState.pollInterval * 2;

    // 获取token
    const token = uni.getStorageSync('token');
    if (!token) {
      console.warn('未登录，无法启动轮询');
      return;
    }

    // 初始立即执行一次
    pollPlayState(serverUrl, token);
    pollPosition(serverUrl, token);
    pollClients(serverUrl, token);    // 设置定时轮询
    pollingState.intervalIds.state = setInterval(() => pollPlayState(serverUrl, token), stateInterval);
    pollingState.intervalIds.position = setInterval(() => pollPosition(serverUrl, token), positionInterval);
    pollingState.intervalIds.clients = setInterval(() => pollClients(serverUrl, token), clientsInterval);
  };

  /**
   * 停止轮询
   */
  const stopPolling = () => {
    Object.keys(pollingState.intervalIds).forEach(key => {
      if (pollingState.intervalIds[key]) {
        clearInterval(pollingState.intervalIds[key]);
        pollingState.intervalIds[key] = null;
      }
    });    pollingState.isActive = false;
  };  /**
   * 轮询播放状态
   */
  const pollPlayState = async (serverUrl, token) => {    if (!pollingState.isActive) return;

    try {
      const safeUniqueId = getSafeUserFingerprint();
      
      // 验证指纹是否为ASCII安全
      if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
        console.error('指纹包含非ASCII字符:', safeUniqueId);
        throw new Error('Fingerprint contains non-ASCII characters');
      }
      
      const response = await uni.request({
        url: `${serverUrl}/api/poll/state`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'X-User-Fingerprint': safeUniqueId        }
      });      if (response.statusCode === 200) {
        const data = response.data;
        // console.log('📊 [轮询] 播放状态响应:', data);
        // 触发状态更新事件，让应用中的其他组件处理
        uni.$emit('poll_state_update', data);
      } else {
        console.error('📊 [轮询] 播放状态请求失败:', response.statusCode, response.data);
      }
    } catch (error) {
      console.error('轮询播放状态失败:', error);
    }
  };  /**
   * 轮询播放位置
   */
  const pollPosition = async (serverUrl, token) => {
    if (!pollingState.isActive) return;

    try {
      const safeUniqueId = getSafeUserFingerprint();
      
      // 验证指纹是否为ASCII安全
      if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
        console.error('指纹包含非ASCII字符:', safeUniqueId);
        throw new Error('Fingerprint contains non-ASCII characters');
      }
      
      const response = await uni.request({
        url: `${serverUrl}/api/poll/position`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'X-User-Fingerprint': safeUniqueId
        }
      });      if (response.statusCode === 200) {
        const data = response.data;
        pollingState.lastPosition = data.position;
        pollingState.lastTimestamp = data.timestamp;
        // 触发位置更新事件
        uni.$emit('poll_position_update', data);
        // console.log('轮询位置更新:', data); // 移除日志打印
      }
    } catch (error) {
      console.error('轮询播放位置失败:', error);
    }
  };  /**
   * 轮询客户端数量
   */
  const pollClients = async (serverUrl, token) => {
    if (!pollingState.isActive) return;

    try {
      const safeUniqueId = getSafeUserFingerprint();
      
      // 验证指纹是否为ASCII安全
      if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
        console.error('指纹包含非ASCII字符:', safeUniqueId);
        throw new Error('Fingerprint contains non-ASCII characters');
      }
      
      const response = await uni.request({
        url: `${serverUrl}/api/poll/clients`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'X-User-Fingerprint': safeUniqueId
        }      });      if (response.statusCode === 200) {
        const data = response.data;
        // console.log('📊 [轮询] 客户端数量响应:', data);
        // 触发客户端数量更新事件
        uni.$emit('poll_clients_update', data);
      } else {
        console.error('📊 [轮询] 客户端数量请求失败:', response.statusCode, response.data);
      }
    } catch (error) {
      console.error('轮询客户端数失败:', error);
    }
  };  /**
   * 更新播放位置
   */
  const updatePosition = async (serverUrl, token, position) => {
    if (!pollingState.isActive) return;

    try {
      const safeUniqueId = getSafeUserFingerprint();
      
      // 验证指纹是否为ASCII安全
      if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
        console.error('指纹包含非ASCII字符:', safeUniqueId);
        throw new Error('Fingerprint contains non-ASCII characters');
      }
      
      const response = await uni.request({
        url: `${serverUrl}/api/poll/update-position`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Fingerprint': safeUniqueId
        },
        data: {
          position: position
        }
      });      if (response.statusCode === 200) {
        return true;
      }
    } catch (error) {
      console.error('更新播放位置失败:', error);
      return false;
    }
  };  /**
   * 更新播放状态（播放/暂停）
   */
  const updatePlayState = async (serverUrl, token, isPlaying) => {
    if (!pollingState.isActive) return;

    try {
      const safeUniqueId = getSafeUserFingerprint();
      
      // 验证指纹是否为ASCII安全
      if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
        console.error('指纹包含非ASCII字符:', safeUniqueId);
        throw new Error('Fingerprint contains non-ASCII characters');
      }
      
      const response = await uni.request({
        url: `${serverUrl}/api/poll/update-play-state`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Fingerprint': safeUniqueId
        },
        data: {
          is_playing: isPlaying
        }
      });      if (response.statusCode === 200) {
        return true;
      }
    } catch (error) {
      console.error('更新播放状态失败:', error);
      return false;
    }
  };  /**
   * 切换歌曲
   */
  const changeSong = async (serverUrl, token, index) => {
    try {
      const safeUniqueId = getSafeUserFingerprint();
      
      // 验证指纹是否为ASCII安全
      if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
        console.error('指纹包含非ASCII字符:', safeUniqueId);
        throw new Error('Fingerprint contains non-ASCII characters');
      }
      
      const response = await uni.request({
        url: `${serverUrl}/api/poll/change-song`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Fingerprint': safeUniqueId
        },
        data: {
          index: index
        }
      });      if (response.statusCode === 200) {
        return response.data;
      } else {
        throw new Error('切换歌曲失败');
      }
    } catch (error) {
      console.error('切换歌曲失败:', error);
      throw error;
    }
  };

  return {
    pollingState,
    startPolling,
    stopPolling,
    updatePosition,
    updatePlayState,
    changeSong
  };
}

// 导出默认实例
export const pollingManager = usePollingManager();
