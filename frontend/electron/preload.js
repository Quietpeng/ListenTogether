const { contextBridge, ipcRenderer } = require('electron')

// 将 Electron API 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 防休眠控制
  preventSleep: () => {
    return global.electronAPI ? global.electronAPI.preventSleep() : false
  },
  
  allowSleep: () => {
    return global.electronAPI ? global.electronAPI.allowSleep() : false
  },
  
  isPowerSaveBlockerActive: () => {
    return global.electronAPI ? global.electronAPI.isPowerSaveBlockerActive() : false
  },

  // 窗口控制
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // 应用信息
  getVersion: () => ipcRenderer.invoke('app-version'),
  getPlatform: () => process.platform,

  // 事件监听
  onWindowFocus: (callback) => {
    ipcRenderer.on('window-focus', callback)
  },
  
  onWindowBlur: (callback) => {
    ipcRenderer.on('window-blur', callback)
  },

  onWindowMinimize: (callback) => {
    ipcRenderer.on('window-minimize', callback)
  },

  onWindowRestore: (callback) => {
    ipcRenderer.on('window-restore', callback)
  }
})

// 在窗口加载完成时设置一些全局变量
window.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Electron 预加载脚本已就绪')
  
  // 设置平台信息
  window.platform = process.platform
  window.isElectron = true
  
  // 提供一些有用的信息
  console.log('📱 运行平台:', process.platform)
  console.log('⚡ Electron 版本:', process.versions.electron)
  console.log('🌐 Chrome 版本:', process.versions.chrome)
  console.log('🟢 Node.js 版本:', process.versions.node)
})
