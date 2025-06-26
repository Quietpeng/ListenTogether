<template>
  <view class="login-page">
    <!-- 登录卡片 -->
    <view class="login-card">
      <!-- 头部 -->
      <view class="card-header">
        <text class="app-icon">🎵</text>
        <text class="app-title">音乐一起听</text>
        <text class="app-subtitle">请输入密码登录</text>
        <text class="app-author">作者：QuietPeng</text>
      </view>

      <!-- 登录表单 -->
      <view class="login-form">
        <view class="form-group">
          <view class="input-wrapper">
            <text class="input-icon">🔒</text>
            <input 
              class="password-input"
              v-model="password"
              type="password"
              placeholder="请输入密码"
              @confirm="handleLogin"
            />
          </view>
        </view>

        <button 
          class="login-btn"
          @click="handleLogin"
          :disabled="!password || loading"
          :class="{ 'loading': loading }"
        >
          <text v-if="loading">登录中...</text>
          <text v-else>登录</text>
        </button>
      </view>

      <!-- 底部信息 -->
      <view class="login-info">
        <text class="info-text">登录有效期：30天</text>
        
        <!-- 服务器配置入口 -->
        <view class="server-config-entry">
          <button 
            class="config-btn"
            @click="goToServerConfig"
          >
            <text class="config-icon">⚙️</text>
            <text>服务器配置</text>
          </button>
          <text class="server-hint">当前服务器: {{ currentServer }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// 响应式数据
const password = ref('')
const loading = ref(false)

// 当前服务器地址显示
const currentServer = computed(() => {
  const config = uni.getStorageSync('serverConfig')
  return config?.url || '未配置'
})

// 登录处理
const handleLogin = async () => {
  if (!password.value.trim()) {
    uni.showToast({
      title: '请输入密码',
      icon: 'none'
    })
    return
  }

  loading.value = true

  try {
    // 构建API URL
    const serverConfig = uni.getStorageSync('serverConfig')
    if (!serverConfig?.url) {
      uni.showToast({
        title: '请先配置服务器',
        icon: 'none'
      })
      goToServerConfig()
      return
    }

    const apiUrl = `${serverConfig.url}/login`
    
    // 发送登录请求
    const response = await uni.request({
      url: apiUrl,
      method: 'POST',
      data: {
        password: password.value
      },      timeout: 10000
    })

    console.log('登录响应:', response)
    
    if (response.statusCode === 200 && response.data?.success) {
      // 登录成功，保存token
      const token = response.data.token
      uni.setStorageSync('token', token)
      uni.setStorageSync('loginTime', Date.now())
      
      console.log('登录成功，准备跳转到音乐播放器')
      
      uni.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 跳转到音乐播放器
      setTimeout(() => {
        console.log('执行页面跳转')
        uni.redirectTo({
          url: '/pages/music-player/music-player',
          success: () => {
            console.log('跳转成功')
          },
          fail: (error) => {
            console.error('跳转失败:', error)
            uni.showToast({
              title: '页面跳转失败',
              icon: 'none'
            })
          }
        })
      }, 1500)

    } else {
      // 登录失败
      uni.showToast({
        title: response.data?.message || '密码错误',
        icon: 'none'
      })
    }

  } catch (error) {
    console.error('登录失败:', error)
    
    uni.showToast({
      title: '登录失败，请检查网络连接',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 跳转到服务器配置
const goToServerConfig = () => {
  uni.navigateTo({
    url: '/pages/server-config/server-config'
  })
}

// 检查是否已登录
onMounted(() => {
  const token = uni.getStorageSync('token')
  const loginTime = uni.getStorageSync('loginTime')
    if (token && loginTime) {
    // 检查登录是否过期（30天）
    const expireTime = 30 * 24 * 60 * 60 * 1000 // 30天
    
    if (Date.now() - loginTime < expireTime) {
      // 未过期，直接跳转到播放器
      console.log('检测到有效登录状态，准备跳转')
      uni.redirectTo({
        url: '/pages/music-player/music-player',
        success: () => {
          console.log('自动登录跳转成功')
        },
        fail: (error) => {
          console.error('自动登录跳转失败:', error)
        }
      })
    } else {
      // 已过期，清除token
      uni.removeStorageSync('token')
      uni.removeStorageSync('loginTime')
    }
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  padding: 60rpx 50rpx;
  width: 100%;
  max-width: 500rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10rpx);
}

.card-header {
  text-align: center;
  margin-bottom: 60rpx;
}

.app-icon {
  font-size: 120rpx;
  display: block;
  margin-bottom: 20rpx;
}

.app-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.app-subtitle {
  font-size: 32rpx;
  color: #666;
  display: block;
  margin-bottom: 10rpx;
}

.app-author {
  font-size: 28rpx;
  color: #999;
  display: block;
}

.login-form {
  margin-bottom: 50rpx;
}

.form-group {
  margin-bottom: 40rpx;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 0 30rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  border-color: #667eea;
  background: #fff;
}

.input-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
  color: #999;
}

.password-input {
  flex: 1;
  height: 100rpx;
  font-size: 32rpx;
  border: none;
  background: transparent;
  outline: none;
}

.login-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 16rpx;
  font-size: 36rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.login-btn:not(:disabled):active {
  transform: translateY(2rpx);
}

.login-btn:disabled {
  opacity: 0.6;
}

.login-btn.loading {
  background: #ccc;
}

.login-info {
  text-align: center;
}

.info-text {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 30rpx;
}

.server-config-entry {
  border-top: 1rpx solid #eee;
  padding-top: 30rpx;
}

.config-btn {
  background: rgba(103, 126, 234, 0.1);
  color: #667eea;
  border: 2rpx solid rgba(103, 126, 234, 0.3);
  border-radius: 40rpx;
  padding: 20rpx 40rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin-bottom: 20rpx;
}

.config-icon {
  font-size: 32rpx;
}

.server-hint {
  font-size: 24rpx;
  color: #999;
  display: block;
}
</style>
