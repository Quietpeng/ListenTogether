/**
 * 浏览器指纹生成工具
 * 用于在内网穿透等同IP环境下区分不同用户
 */

/**
 * 生成浏览器指纹
 * @returns {string} 浏览器指纹字符串
 */
export function generateFingerprint() {
  try {
    const components = []
    
    // 1. 用户代理
    components.push(navigator.userAgent || '')
    
    // 2. 屏幕分辨率
    components.push(`${screen.width}x${screen.height}`)
    
    // 3. 屏幕色彩深度
    components.push(screen.colorDepth || '')
    
    // 4. 时区偏移
    components.push(new Date().getTimezoneOffset())
    
    // 5. 语言设置
    components.push(navigator.language || navigator.userLanguage || '')
    
    // 6. 平台信息
    components.push(navigator.platform || '')
      // 7. 是否启用cookie
    components.push(navigator.cookieEnabled)
    
    // 8. 是否启用DNT
    components.push(navigator.doNotTrack || '')
    
    // 9. 浏览器插件数量（H5环境）
    // #ifdef H5
    if (navigator.plugins) {
      components.push(navigator.plugins.length)
    }
    // #endif
    
    // 10. Canvas指纹（H5环境）
    // #ifdef H5
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillText('fingerprint_test', 2, 2)  // 使用英文文本避免编码问题
        components.push(canvas.toDataURL())
      }
    } catch (e) {
      components.push('canvas_error')
    }
    // #endif
    
    // 11. WebGL指纹（H5环境）
    // #ifdef H5
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (gl) {
        const renderer = gl.getParameter(gl.RENDERER)
        const vendor = gl.getParameter(gl.VENDOR)
        components.push(`${vendor}|${renderer}`)
      }
    } catch (e) {
      components.push('webgl_error')
    }
    // #endif
    
    // 12. 设备相关信息（App环境）
    // #ifdef APP-PLUS
    try {
      const deviceInfo = uni.getSystemInfoSync()
      components.push(deviceInfo.brand || '')
      components.push(deviceInfo.model || '')
      components.push(deviceInfo.system || '')
      components.push(deviceInfo.platform || '')
    } catch (e) {
      components.push('device_error')
    }
    // #endif
    
    // 13. 小程序特殊信息（小程序环境）
    // #ifdef MP
    try {
      const accountInfo = uni.getAccountInfoSync()
      if (accountInfo) {
        components.push(accountInfo.miniProgram?.appId || '')
      }
    } catch (e) {
      components.push('mp_error')
    }
    // #endif
    
    // 14. 随机数（第一次生成时保存到本地存储）
    let randomSeed = uni.getStorageSync('fingerprint_seed')
    if (!randomSeed) {
      randomSeed = Math.random().toString(36).substring(2, 15)
      uni.setStorageSync('fingerprint_seed', randomSeed)
    }
    components.push(randomSeed)
      // 将所有组件拼接并生成哈希
    const fingerprint = components.join('|')
    
    // 对指纹进行安全处理，移除非ASCII字符
    const safeFingerprint = fingerprint.replace(/[^\x00-\x7F]/g, '_')
    
    return hashCode(safeFingerprint).toString()
    
  } catch (error) {
    console.error('生成浏览器指纹失败:', error)
    // 失败时返回随机字符串
    return Math.random().toString(36).substring(2, 15)
  }
}

/**
 * 简单哈希函数
 * @param {string} str 要哈希的字符串
 * @returns {number} 哈希值
 */
function hashCode(str) {
  let hash = 0
  if (str.length === 0) return hash
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  
  return Math.abs(hash)
}

/**
 * 获取用户唯一标识
 * 结合用户信息和浏览器指纹
 * @returns {string} 用户唯一标识
 */
export function getUserUniqueId() {
  try {
    // 获取用户信息
    const userInfo = uni.getStorageSync('userInfo')
    const userId = userInfo?.id || userInfo?.username || ''
    
    // 获取浏览器指纹
    const fingerprint = generateFingerprint()
    
    // 组合用户ID和指纹，并进行Base64编码以确保HTTP头兼容性
    let uniqueId = ''
    if (userId) {
      uniqueId = `${userId}_${fingerprint}`
    } else {
      uniqueId = `guest_${fingerprint}`
    }
    
    // 将结果进行Base64编码，确保只包含ASCII字符
    try {
      // #ifdef H5
      return btoa(unescape(encodeURIComponent(uniqueId)))
      // #endif
      
      // #ifndef H5
      // 非H5环境使用简单的编码替换
      return uniqueId.replace(/[^\x00-\x7F]/g, '_')
      // #endif
    } catch (e) {
      // 编码失败时使用简单替换
      return uniqueId.replace(/[^\x00-\x7F]/g, '_')
    }
  } catch (error) {
    console.error('获取用户唯一标识失败:', error)
    return `unknown_${Date.now()}`
  }
}

/**
 * 获取简短的用户标识（用于显示）
 * @returns {string} 简短标识
 */
export function getShortUserId() {
  try {
    const uniqueId = getUserUniqueId()
    return uniqueId.substring(0, 8) + '...'
  } catch (error) {
    return 'unknown'
  }
}

/**
 * 安全地获取用户指纹，确保HTTP头兼容性
 * @returns {string} 安全的用户指纹
 */
export function getSafeUserFingerprint() {
  try {
    // 获取用户信息
    const userInfo = uni.getStorageSync('userInfo')
    const userId = userInfo?.id || userInfo?.username || ''
    
    // 生成基础指纹组件
    const components = []
    
    // 1. 用户代理（简化）
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      components.push(hashCode(navigator.userAgent).toString())
    }
    
    // 2. 屏幕信息
    if (typeof screen !== 'undefined') {
      components.push(`${screen.width || 0}x${screen.height || 0}`)
    }
    
    // 3. 时区
    if (typeof Intl !== 'undefined') {
      try {
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/[^a-zA-Z0-9]/g, ''))
      } catch (e) {
        components.push('UTC')
      }
    }
    
    // 4. 语言
    if (typeof navigator !== 'undefined') {
      const lang = navigator.language || navigator.languages?.[0] || 'en'
      components.push(lang.replace(/[^a-zA-Z0-9]/g, ''))
    }
    
    // 5. 添加用户ID（如果有）
    if (userId) {
      // 对用户ID进行安全编码
      const safeUserId = userId.toString().replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)
      components.push(`user_${safeUserId}`)
    }
    
    // 组合并创建最终的安全指纹
    const baseFingerprint = components.join('_')
    const hash = hashCode(baseFingerprint)
    
    // 创建完全ASCII安全的指纹
    return `fp_${hash}_${Date.now().toString(36)}`
    
  } catch (error) {
    console.error('获取安全用户指纹失败:', error)
    // 返回纯ASCII的后备指纹
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `safe_${timestamp}_${random}`
  }
}

/**
 * 测试指纹ASCII安全性
 */
export function testFingerprintSafety() {
  try {
    const fingerprint = getSafeUserFingerprint()
    console.log('=== 指纹安全性测试 ===')
    console.log('生成的指纹:', fingerprint)
    console.log('指纹长度:', fingerprint.length)
    
    // 测试ASCII安全性
    const isAsciiSafe = /^[a-zA-Z0-9_-]+$/.test(fingerprint)
    console.log('ASCII安全性:', isAsciiSafe ? '✅ 通过' : '❌ 失败')
    
    // 测试字符码范围
    let hasNonAscii = false
    for (let i = 0; i < fingerprint.length; i++) {
      const charCode = fingerprint.charCodeAt(i)
      if (charCode > 127) {
        console.log(`❌ 发现非ASCII字符: "${fingerprint[i]}" (码点: ${charCode}) 位置: ${i}`)
        hasNonAscii = true
      }
    }
    
    if (!hasNonAscii) {
      console.log('✅ 所有字符都在ASCII范围内')
    }
    
    console.log('=== 测试结束 ===')
    return isAsciiSafe && !hasNonAscii
  } catch (error) {
    console.error('指纹安全性测试失败:', error)
    return false
  }
}
