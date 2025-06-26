/**
 * 本地存储工具函数
 */

/**
 * 设置存储项
 * @param {string} key - 存储键
 * @param {any} value - 存储值
 * @returns {boolean} 是否成功
 */
export const setStorage = (key, value) => {
  try {
    uni.setStorageSync(key, value)
    return true
  } catch (error) {
    console.error(`设置存储失败 [${key}]:`, error)
    return false
  }
}

/**
 * 获取存储项
 * @param {string} key - 存储键
 * @param {any} defaultValue - 默认值
 * @returns {any} 存储值或默认值
 */
export const getStorage = (key, defaultValue = null) => {
  try {
    const value = uni.getStorageSync(key)
    return value !== undefined && value !== null ? value : defaultValue
  } catch (error) {
    console.error(`获取存储失败 [${key}]:`, error)
    return defaultValue
  }
}

/**
 * 移除存储项
 * @param {string} key - 存储键
 * @returns {boolean} 是否成功
 */
export const removeStorage = (key) => {
  try {
    uni.removeStorageSync(key)
    return true
  } catch (error) {
    console.error(`移除存储失败 [${key}]:`, error)
    return false
  }
}

/**
 * 清空所有存储
 * @returns {boolean} 是否成功
 */
export const clearStorage = () => {
  try {
    uni.clearStorageSync()
    return true
  } catch (error) {
    console.error('清空存储失败:', error)
    return false
  }
}

/**
 * 获取存储信息
 * @returns {object} 存储信息
 */
export const getStorageInfo = () => {
  try {
    return uni.getStorageInfoSync()
  } catch (error) {
    console.error('获取存储信息失败:', error)
    return {
      keys: [],
      currentSize: 0,
      limitSize: 0
    }
  }
}

/**
 * 用户配置管理
 */
export const userConfig = {
  /**
   * 保存用户信息
   */
  setUserInfo: (userInfo) => {
    return setStorage('userInfo', userInfo)
  },

  /**
   * 获取用户信息
   */
  getUserInfo: () => {
    return getStorage('userInfo', {
      username: '',
      userId: '',
      roomId: 'default'
    })
  },

  /**
   * 清除用户信息
   */
  clearUserInfo: () => {
    return removeStorage('userInfo')
  }
}

/**
 * 服务器配置管理
 */
export const serverConfig = {
  /**
   * 保存服务器配置
   */
  setConfig: (config) => {
    return setStorage('serverConfig', config)
  },

  /**
   * 获取服务器配置
   */
  getConfig: () => {
    return getStorage('serverConfig', {
      url: '',
      port: '',
      timeout: 10,
      autoReconnect: true
    })
  },

  /**
   * 清除服务器配置
   */
  clearConfig: () => {
    return removeStorage('serverConfig')
  }
}

/**
 * 播放器设置管理
 */
export const playerSettings = {
  /**
   * 保存播放器设置
   */
  setSettings: (settings) => {
    return setStorage('playerSettings', settings)
  },

  /**
   * 获取播放器设置
   */
  getSettings: () => {
    return getStorage('playerSettings', {
      volume: 0.8,
      repeat: 'none', // none, single, all
      shuffle: false,
      autoplay: true,
      quality: 'standard' // low, standard, high
    })
  },

  /**
   * 更新单个设置
   */
  updateSetting: (key, value) => {
    const settings = playerSettings.getSettings()
    settings[key] = value
    return playerSettings.setSettings(settings)
  }
}

/**
 * 播放历史管理
 */
export const playHistory = {
  /**
   * 添加播放记录
   */
  addRecord: (song) => {
    const history = playHistory.getHistory()
    
    // 去重
    const filtered = history.filter(item => item.id !== song.id)
    
    // 添加到开头
    const newHistory = [{
      ...song,
      playTime: Date.now()
    }, ...filtered].slice(0, 50) // 最多保存50条
    
    return setStorage('playHistory', newHistory)
  },

  /**
   * 获取播放历史
   */
  getHistory: () => {
    return getStorage('playHistory', [])
  },

  /**
   * 清除播放历史
   */
  clearHistory: () => {
    return removeStorage('playHistory')
  }
}

/**
 * 收藏歌曲管理
 */
export const favorites = {
  /**
   * 添加收藏
   */
  addFavorite: (song) => {
    const favoriteList = favorites.getFavorites()
    
    // 检查是否已存在
    if (favoriteList.some(item => item.id === song.id)) {
      return false // 已存在
    }
    
    const newList = [{
      ...song,
      favoriteTime: Date.now()
    }, ...favoriteList]
    
    return setStorage('favorites', newList)
  },

  /**
   * 移除收藏
   */
  removeFavorite: (songId) => {
    const favoriteList = favorites.getFavorites()
    const newList = favoriteList.filter(item => item.id !== songId)
    return setStorage('favorites', newList)
  },

  /**
   * 获取收藏列表
   */
  getFavorites: () => {
    return getStorage('favorites', [])
  },

  /**
   * 检查是否已收藏
   */
  isFavorite: (songId) => {
    const favoriteList = favorites.getFavorites()
    return favoriteList.some(item => item.id === songId)
  },

  /**
   * 清除所有收藏
   */
  clearFavorites: () => {
    return removeStorage('favorites')
  }
}
