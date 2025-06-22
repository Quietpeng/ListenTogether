const { app, BrowserWindow, powerSaveBlocker, protocol, ipcMain } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'

let mainWindow
let powerSaveBlockerId

// 阻止应用进入休眠状态
function preventSleep() {
  if (powerSaveBlockerId === undefined) {
    powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension')
    console.log('已启用防休眠模式，ID:', powerSaveBlockerId)
  }
}

// 允许应用休眠
function allowSleep() {
  if (powerSaveBlockerId !== undefined) {
    powerSaveBlocker.stop(powerSaveBlockerId)
    console.log('已停用防休眠模式')
    powerSaveBlockerId = undefined
  }
}

function createWindow() {  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // 允许跨域请求
      backgroundThrottling: false, // 禁用后台节流
      experimentalFeatures: true
    },
    show: false, // 初始不显示，等待页面加载完成
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../public/favicon.ico')
  })

  // 设置窗口最小尺寸
  mainWindow.setMinimumSize(800, 600)

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080')
    // 开发模式下打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 窗口准备显示时显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // 启动时启用防休眠
    preventSleep()
  })

  // 窗口关闭时的处理
  mainWindow.on('closed', () => {
    allowSleep()
    mainWindow = null
  })

  // 处理窗口最小化（移动端后台）
  mainWindow.on('minimize', () => {
    console.log('窗口最小化，保持播放状态')
    // 确保防休眠仍然激活
    preventSleep()
  })

  // 处理窗口恢复
  mainWindow.on('restore', () => {
    console.log('窗口恢复')
  })

  // 防止窗口关闭，最小化到后台
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' || process.platform === 'android') {
      event.preventDefault()
      mainWindow.hide()
      console.log('应用已隐藏到后台，音乐继续播放')
    }
  })

  // 设置应用保持激活
  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })
}

// 应用准备就绪
app.whenReady().then(() => {
  // 注册自定义协议以支持本地文件访问
  protocol.registerFileProtocol('safe-file', (request, callback) => {
    const url = request.url.substr(10)
    callback({ path: path.normalize(`${__dirname}/${url}`) })
  })

  createWindow()

  // macOS 特殊处理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用（除了 macOS）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    allowSleep()
    app.quit()
  }
})

// 应用即将退出
app.on('before-quit', () => {
  allowSleep()
})

// 处理应用挂起（移动端锁屏）
app.on('will-finish-launching', () => {
  // 设置应用在后台时的行为
  app.setAppUserModelId('com.quietpeng.music-together')
})

// 导出函数供渲染进程调用
global.electronAPI = {
  preventSleep,
  allowSleep,
  isPowerSaveBlockerActive: () => powerSaveBlockerId !== undefined
}

// IPC 处理器
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle('app-version', () => {
  return app.getVersion()
})

console.log('Electron 主进程已启动')
