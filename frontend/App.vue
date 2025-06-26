<template>
  <view class="app">
    <!-- 这里是全局组件 -->
  </view>
</template>

<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch')
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* 全局样式 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  background-color: #f8f8f8;
}

.app {
  min-height: 100vh;
}

/* 通用样式 */
.container {
  padding: 20rpx;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background-color: #fff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background-color: #007aff;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  padding: 20rpx 40rpx;
  font-size: 32rpx;
}

.btn-secondary {
  background-color: #f8f9fa;
  color: #6c757d;
  border: 2rpx solid #dee2e6;
  border-radius: 8rpx;
  padding: 20rpx 40rpx;
  font-size: 32rpx;
}

.card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}
</style>
