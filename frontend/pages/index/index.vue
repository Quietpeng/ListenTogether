<template>
  <view class="index-page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <text class="navbar-title">音乐一起听</text>
      <view class="navbar-actions">
        <button 
          class="btn-config" 
          @click="goToServerConfig"
          size="mini"
          type="default"
        >
          服务器配置
        </button>
      </view>
    </view>

    <!-- 主内容区 -->
    <view class="main-content">
      <!-- 连接状态卡片 -->
      <view class="card connection-card">
        <view class="connection-status">
          <view class="status-indicator" :class="{ 'connected': isConnected }"></view>
          <text class="status-text">{{ connectionStatus }}</text>
        </view>
        <text class="server-info">服务器: {{ serverUrl }}</text>
      </view>

      <!-- 功能按钮区 -->
      <view class="action-buttons">
        <button 
          class="btn-primary large-btn"
          @click="goToMusicPlayer"
        >
          <text class="btn-icon">🎵</text>
          <text class="btn-text">进入音乐播放器</text>
        </button>

        <button 
          class="btn-secondary large-btn"
          @click="goToLogin"
        >
          <text class="btn-icon">👤</text>
          <text class="btn-text">用户登录</text>
        </button>
      </view>

      <!-- 功能介绍 -->
      <view class="card features-card">
        <view class="card-title">
          <text>功能特色</text>
        </view>
        <view class="features-list">
          <view class="feature-item">
            <text class="feature-icon">🎵</text>
            <text class="feature-text">多人同步听歌</text>
          </view>
          <view class="feature-item">
            <text class="feature-icon">🔄</text>
            <text class="feature-text">实时播放控制</text>
          </view>
          <view class="feature-item">
            <text class="feature-icon">💬</text>
            <text class="feature-text">聊天互动</text>
          </view>
          <view class="feature-item">
            <text class="feature-icon">📱</text>
            <text class="feature-text">后台播放支持</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 响应式数据
const isConnected = ref(false)
const connectionStatus = ref('未连接')
const serverUrl = ref('未配置')

// 生命周期
onMounted(() => {
  initConnection()
})

// 初始化连接
const initConnection = () => {
  try {
    // 从本地存储获取服务器配置
    const config = uni.getStorageSync('serverConfig')
    if (config && config.url) {
      serverUrl.value = config.url
      connectionStatus.value = '已配置，点击连接'
      isConnected.value = true
    } else {
      connectionStatus.value = '请先配置服务器'
    }
  } catch (error) {
    console.error('初始化连接失败:', error)
    connectionStatus.value = '配置错误'
  }
}

// 页面跳转
const goToMusicPlayer = () => {
  uni.switchTab({
    url: '/pages/music-player/music-player'
  })
}

const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/login'
  })
}

const goToServerConfig = () => {
  uni.navigateTo({
    url: '/pages/server-config/server-config'
  })
}
</script>

<style scoped>
.index-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 60rpx 40rpx 40rpx;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10rpx);
}

.navbar-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
}

.btn-config {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 40rpx;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
}

.main-content {
  padding: 40rpx;
}

.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.connection-card {
  text-align: center;
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.status-indicator {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background-color: #ff4757;
  margin-right: 16rpx;
}

.status-indicator.connected {
  background-color: #2ed573;
}

.status-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.server-info {
  font-size: 28rpx;
  color: #666;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.large-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  border-radius: 20rpx;
  font-size: 36rpx;
  font-weight: bold;
  border: none;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-secondary {
  background: #fff;
  color: #333;
  border: 2rpx solid #e9ecef;
}

.btn-icon {
  font-size: 48rpx;
  margin-right: 20rpx;
}

.btn-text {
  font-size: 36rpx;
}

.card-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  text-align: center;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
}

.feature-icon {
  font-size: 40rpx;
  margin-right: 24rpx;
  width: 60rpx;
  text-align: center;
}

.feature-text {
  font-size: 32rpx;
  color: #333;
}
</style>
