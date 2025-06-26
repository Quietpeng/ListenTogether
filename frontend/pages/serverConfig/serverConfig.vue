<template>
  <view class="server-config-page">
    <!-- 返回按钮 -->
    <view class="nav-bar">
      <button class="btn-back" @click="goBack" size="mini">
        <text class="back-icon">←</text>
        <text>返回</text>
      </button>
    </view>

    <!-- 配置卡片 -->
    <view class="config-card">
      <!-- 应用头部 -->
      <view class="app-header">
        <text class="app-icon">🎵</text>
        <text class="app-title">音乐一起听</text>
        <text class="app-author">作者：QuietPeng</text>
      </view>

      <!-- 配置表单 -->
      <view class="config-form">
        <text class="form-title">服务器配置</text>
        <text class="form-description">请输入您的服务器地址以开始使用</text>

        <!-- 服务器地址输入 -->
        <view class="form-group">
          <text class="form-label">服务器地址</text>
          <view class="input-group">
            <text class="input-prefix">https://</text>
            <input 
              class="server-input"
              v-model="serverHost"
              placeholder="www.example.com"
              @input="onServerHostInput"
              @blur="validateServerHost"
            />
          </view>
          <view class="input-hint">
            <text class="hint-icon">ℹ️</text>
            <text class="hint-text">请输入服务器的域名或IP地址</text>
          </view>
          <text class="error-text" v-if="hostError">{{ hostError }}</text>
        </view>

        <!-- 示例服务器 -->
        <view class="examples-section">
          <text class="examples-title">常用示例：</text>
          <view class="example-chips">
            <button 
              class="example-chip"
              v-for="example in serverExamples"
              :key="example.host"
              @click="selectExample(example.host)"
            >
              {{ example.label }}
            </button>
          </view>
        </view>

        <!-- 高级选项 -->
        <view class="advanced-section">
          <view class="advanced-header" @click="toggleAdvanced">
            <text class="advanced-title">高级选项</text>
            <text class="advanced-arrow" :class="{ 'expanded': showAdvanced }">▼</text>
          </view>
          
          <view class="advanced-content" v-if="showAdvanced">
            <!-- 端口号 -->
            <view class="form-group">
              <text class="form-label">端口号</text>
              <input 
                class="port-input"
                v-model="serverPort"
                type="number"
                placeholder="8080"
                @input="onPortInput"
              />
            </view>
            
            <!-- HTTPS开关 -->
            <view class="form-group">
              <view class="switch-row">
                <text class="switch-label">使用 HTTPS</text>
                <switch 
                  :checked="useHttps"
                  @change="onHttpsChange"
                  color="#667eea"
                />
              </view>
            </view>
          </view>
        </view>

        <!-- 连接测试 -->
        <view class="connection-test" v-if="serverHost">
          <button 
            class="test-btn"
            :class="{ 'testing': testing }"
            @click="testConnection"
            :disabled="testing"
          >
            <text class="test-icon">🔍</text>
            <text>{{ testing ? '测试连接中...' : '测试连接' }}</text>
          </button>
          
          <view class="test-result" v-if="testResult">
            <view 
              class="result-alert"
              :class="{ 'success': testResult.success, 'error': !testResult.success }"
            >
              <text class="result-icon">{{ testResult.success ? '✅' : '❌' }}</text>
              <view class="result-content">
                <text class="result-title">{{ testResult.title }}</text>
                <text class="result-message">{{ testResult.message }}</text>
                <text class="result-time" v-if="testResult.responseTime">
                  响应时间: {{ testResult.responseTime }}ms
                </text>
              </view>
            </view>
          </view>
        </view>        <!-- 操作按钮 -->
        <view class="form-actions">
          <button 
            class="clear-btn"
            @click="clearConfig"
          >
            🗑️ 清除配置
          </button>
          
          <button 
            class="save-btn"
            @click="saveConfig"
            :disabled="!canSave || saving"
            :class="{ 'saving': saving }"
          >
            <text v-if="saving">保存中...</text>
            <text v-else>💾 保存配置</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useServerConnection } from '../../utils/serverConnection.js'

// 使用组合式函数
const { testConnection: testServerConnection, saveServerConfig: saveServerConfig, connectionState } = useServerConnection()

// 响应式数据
const serverHost = ref('')
const serverPort = ref('')
const useHttps = ref(true)
const showAdvanced = ref(false)
const testing = ref(false)
const saving = ref(false)
const hostError = ref('')
const testResult = ref(null)

// 示例服务器
const serverExamples = ref([
  { label: 'localhost', host: 'localhost' },
  { label: '本地IP', host: '192.168.1.100' },
  { label: '内网穿透示例', host: 'xxxx.gcsyweb.cn' }
])

// 计算属性
const canSave = computed(() => {
  return serverHost.value && !hostError.value
})

const fullServerUrl = computed(() => {
  if (!serverHost.value) return ''
  
  const protocol = useHttps.value ? 'https' : 'http'
  const port = serverPort.value ? `:${serverPort.value}` : ''
  return `${protocol}://${serverHost.value}${port}`
})

// 生命周期
onMounted(() => {
  loadSavedConfig()
})

// 加载保存的配置
const loadSavedConfig = () => {
  try {
    const config = uni.getStorageSync('serverConfig')
    if (config) {
      serverHost.value = config.serverHost || ''
      serverPort.value = config.serverPort || ''
      useHttps.value = config.useHttps !== undefined ? config.useHttps : true
    } else {
      // 清空所有字段，强制用户手动配置
      serverHost.value = ''
      serverPort.value = ''
      useHttps.value = true
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

// 输入处理
const onServerHostInput = (e) => {
  serverHost.value = e.detail.value.trim()
  hostError.value = ''
  testResult.value = null
}

const onPortInput = (e) => {
  serverPort.value = e.detail.value
}

const onHttpsChange = (e) => {
  useHttps.value = e.detail.value
}

// 验证服务器地址
const validateServerHost = () => {
  if (!serverHost.value) {
    hostError.value = '请输入服务器地址'
    return false
  }

  // 简单的域名/IP验证
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
  const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  
  if (!domainRegex.test(serverHost.value) && !ipRegex.test(serverHost.value)) {
    hostError.value = '请输入有效的域名或IP地址'
    return false
  }

  hostError.value = ''
  return true
}

// 选择示例
const selectExample = (host) => {
  serverHost.value = host
  hostError.value = ''
  testResult.value = null
  
  uni.showToast({
    title: `已选择: ${host}`,
    icon: 'none'
  })
}

// 切换高级选项
const toggleAdvanced = () => {
  showAdvanced.value = !showAdvanced.value
}

// 测试连接
const testConnection = async () => {
  if (!validateServerHost()) return

  testing.value = true
  testResult.value = null

  try {
    const config = {
      url: fullServerUrl.value,
      serverHost: serverHost.value,
      serverPort: serverPort.value,
      useHttps: useHttps.value
    }
    
    // 使用工具函数测试连接
    const result = await testServerConnection(config)
    
    if (result.success) {
      testResult.value = {
        success: true,
        title: '连接成功',
        message: result.message || '服务器响应正常'
      }
      
      uni.showToast({
        title: '连接成功',
        icon: 'success'
      })
    } else {
      testResult.value = {
        success: false,
        title: '连接失败',
        message: result.message || '无法连接到服务器'
      }
    }
  } catch (error) {
    testResult.value = {
      success: false,
      title: '连接失败',
      message: error.message || '连接出现异常'
    }
    console.error('测试连接失败:', error)
  } finally {
    testing.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  if (!validateServerHost()) return

  saving.value = true

  try {
    const config = {
      serverHost: serverHost.value,
      serverPort: serverPort.value,
      useHttps: useHttps.value,
      url: fullServerUrl.value,
      savedTime: Date.now()
    }

    // 使用工具函数保存配置
    const result = await saveServerConfig(config)
    
    if (result.success) {
      uni.showToast({
        title: result.message || '配置已保存',
        icon: 'success'
      })

      // 延迟返回
      setTimeout(() => {
        goBack()
      }, 1500)
    } else {
      throw new Error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    uni.showToast({
      title: error.message || '保存失败',
      icon: 'none'
    })
  } finally {
    saving.value = false
  }
}

// 清除配置
const clearConfig = () => {
  uni.showModal({
    title: '确认清除',
    content: '确定要清除所有服务器配置吗？',
    success: (res) => {
      if (res.confirm) {
        // 清除本地存储
        uni.removeStorageSync('serverConfig')
        uni.removeStorageSync('userInfo')
        uni.removeStorageSync('token')
        
        // 重置表单
        serverHost.value = ''
        serverPort.value = ''
        useHttps.value = true
        testResult.value = null
        
        uni.showToast({
          title: '配置已清除',
          icon: 'success'
        })
      }
    }
  })
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.server-config-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.nav-bar {
  padding: 60rpx 40rpx 20rpx;
}

.btn-back {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: none;
  border-radius: 40rpx;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.back-icon {
  font-size: 32rpx;
  font-weight: bold;
}

.config-card {
  margin: 40rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  padding: 50rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10rpx);
}

.app-header {
  text-align: center;
  margin-bottom: 60rpx;
}

.app-icon {
  font-size: 100rpx;
  display: block;
  margin-bottom: 20rpx;
}

.app-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.app-author {
  font-size: 28rpx;
  color: #999;
  display: block;
}

.form-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.form-description {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 50rpx;
}

.form-group {
  margin-bottom: 40rpx;
}

.form-label {
  font-size: 32rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 15rpx;
}

.input-group {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
}

.input-group:focus-within {
  border-color: #667eea;
  background: #fff;
}

.input-prefix {
  padding: 0 20rpx 0 30rpx;
  font-size: 32rpx;
  color: #666;
  border-right: 1rpx solid #eee;
}

.server-input {
  flex: 1;
  height: 100rpx;
  padding: 0 30rpx;
  font-size: 32rpx;
  border: none;
  background: transparent;
  outline: none;
}

.port-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  font-size: 32rpx;
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  background: #f8f9fa;
}

.input-hint {
  display: flex;
  align-items: center;
  margin-top: 15rpx;
  gap: 10rpx;
}

.hint-icon {
  font-size: 24rpx;
}

.hint-text {
  font-size: 24rpx;
  color: #999;
}

.error-text {
  font-size: 24rpx;
  color: #ff4757;
  margin-top: 10rpx;
  display: block;
}

.examples-section {
  margin-bottom: 40rpx;
}

.examples-title {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 20rpx;
}

.example-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
}

.example-chip {
  background: rgba(103, 126, 234, 0.1);
  color: #667eea;
  border: 2rpx solid rgba(103, 126, 234, 0.3);
  border-radius: 30rpx;
  padding: 15rpx 25rpx;
  font-size: 26rpx;
}

.advanced-section {
  border: 2rpx solid #eee;
  border-radius: 16rpx;
  margin-bottom: 40rpx;
  overflow: hidden;
}

.advanced-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  background: #f8f9fa;
  cursor: pointer;
}

.advanced-title {
  font-size: 32rpx;
  color: #333;
  font-weight: bold;
}

.advanced-arrow {
  font-size: 24rpx;
  color: #666;
  transition: transform 0.3s ease;
}

.advanced-arrow.expanded {
  transform: rotate(180deg);
}

.advanced-content {
  padding: 30rpx;
  background: #fff;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-label {
  font-size: 32rpx;
  color: #333;
}

.connection-test {
  margin-bottom: 40rpx;
}

.test-btn {
  width: 100%;
  height: 80rpx;
  background: rgba(103, 126, 234, 0.1);
  color: #667eea;
  border: 2rpx solid rgba(103, 126, 234, 0.3);
  border-radius: 16rpx;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15rpx;
  margin-bottom: 30rpx;
}

.test-btn.testing {
  background: #ccc;
  color: #999;
  border-color: #ccc;
}

.test-icon {
  font-size: 28rpx;
}

.test-result {
  margin-top: 20rpx;
}

.result-alert {
  padding: 30rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.result-alert.success {
  background: rgba(46, 213, 115, 0.1);
  border: 2rpx solid rgba(46, 213, 115, 0.3);
}

.result-alert.error {
  background: rgba(255, 71, 87, 0.1);
  border: 2rpx solid rgba(255, 71, 87, 0.3);
}

.result-icon {
  font-size: 36rpx;
}

.result-content {
  flex: 1;
}

.result-title {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.result-title {
  color: #2ed573;
}

.result-alert.error .result-title {
  color: #ff4757;
}

.result-message {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 5rpx;
}

.result-time {
  font-size: 24rpx;
  color: #999;
  display: block;
}

.form-actions {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.clear-btn {
  width: 100%;
  height: 80rpx;
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
  border: 2rpx solid rgba(255, 71, 87, 0.3);
  border-radius: 16rpx;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn {
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
}

.save-btn:disabled {
  background: #ccc;
}

.save-btn.saving {
  background: #999;
}
</style>
