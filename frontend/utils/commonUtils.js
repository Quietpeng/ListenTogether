/**
 * 通用工具函数
 */

/**
 * 格式化时间
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串 (MM:SS)
 */
export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * 格式化日期时间
 * @param {number|Date} timestamp - 时间戳或日期对象
 * @param {string} format - 格式模板
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (timestamp, format = 'YYYY-MM-DD HH:mm:ss') => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export const debounce = (func, delay) => {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export const throttle = (func, limit) => {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 生成随机ID
 * @param {number} length - ID长度
 * @returns {string} 随机ID
 */
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

/**
 * 检查是否为空值
 * @param {any} value - 要检查的值
 * @returns {boolean} 是否为空
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 扩展名
 */
export const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase()
}

/**
 * 检查音频文件格式
 * @param {string} filename - 文件名
 * @returns {boolean} 是否为支持的音频格式
 */
export const isAudioFile = (filename) => {
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma']
  const extension = getFileExtension(filename)
  return audioExtensions.includes(extension)
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i]
}

/**
 * URL参数解析
 * @param {string} url - URL字符串
 * @returns {object} 参数对象
 */
export const parseUrlParams = (url) => {
  const params = {}
  const urlObj = new URL(url)
  
  for (const [key, value] of urlObj.searchParams) {
    params[key] = value
  }
  
  return params
}

/**
 * 构建URL参数
 * @param {object} params - 参数对象
 * @returns {string} URL参数字符串
 */
export const buildUrlParams = (params) => {
  const searchParams = new URLSearchParams()
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      searchParams.append(key, value)
    }
  }
  
  return searchParams.toString()
}

/**
 * 休眠函数
 * @param {number} ms - 毫秒数
 * @returns {Promise} Promise对象
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重试函数
 * @param {Function} fn - 要重试的函数
 * @param {number} retries - 重试次数
 * @param {number} delay - 重试间隔（毫秒）
 * @returns {Promise} Promise对象
 */
export const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0) {
      await sleep(delay)
      return retry(fn, retries - 1, delay)
    }
    throw error
  }
}

/**
 * 获取设备信息
 * @returns {object} 设备信息
 */
export const getDeviceInfo = () => {
  try {
    const systemInfo = uni.getSystemInfoSync()
    return {
      platform: systemInfo.platform,
      system: systemInfo.system,
      version: systemInfo.version,
      model: systemInfo.model,
      pixelRatio: systemInfo.pixelRatio,
      windowWidth: systemInfo.windowWidth,
      windowHeight: systemInfo.windowHeight,
      screenWidth: systemInfo.screenWidth,
      screenHeight: systemInfo.screenHeight,
      statusBarHeight: systemInfo.statusBarHeight,
      safeArea: systemInfo.safeArea,
      safeAreaInsets: systemInfo.safeAreaInsets
    }
  } catch (error) {
    console.error('获取设备信息失败:', error)
    return {}
  }
}

/**
 * 检查网络状态
 * @returns {Promise<object>} 网络状态信息
 */
export const getNetworkStatus = () => {
  return new Promise((resolve, reject) => {
    uni.getNetworkType({
      success: (res) => {
        resolve({
          networkType: res.networkType,
          isConnected: res.networkType !== 'none'
        })
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * 显示加载提示
 * @param {string} title - 提示文字
 * @param {boolean} mask - 是否显示透明蒙层
 */
export const showLoading = (title = '加载中...', mask = true) => {
  uni.showLoading({
    title,
    mask
  })
}

/**
 * 隐藏加载提示
 */
export const hideLoading = () => {
  uni.hideLoading()
}

/**
 * 显示消息提示
 * @param {string} title - 提示文字
 * @param {string} icon - 图标类型
 * @param {number} duration - 显示时长
 */
export const showToast = (title, icon = 'none', duration = 2000) => {
  uni.showToast({
    title,
    icon,
    duration
  })
}

/**
 * 显示模态对话框
 * @param {string} title - 标题
 * @param {string} content - 内容
 * @param {boolean} showCancel - 是否显示取消按钮
 * @returns {Promise<boolean>} 是否确认
 */
export const showModal = (title, content, showCancel = true) => {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      showCancel,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * 复制到剪贴板
 * @param {string} data - 要复制的内容
 * @returns {Promise<boolean>} 是否成功
 */
export const copyToClipboard = (data) => {
  return new Promise((resolve) => {
    uni.setClipboardData({
      data,
      success: () => {
        showToast('复制成功')
        resolve(true)
      },
      fail: () => {
        showToast('复制失败')
        resolve(false)
      }
    })
  })
}

/**
 * 从剪贴板获取内容
 * @returns {Promise<string>} 剪贴板内容
 */
export const getClipboardData = () => {
  return new Promise((resolve, reject) => {
    uni.getClipboardData({
      success: (res) => {
        resolve(res.data)
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}
