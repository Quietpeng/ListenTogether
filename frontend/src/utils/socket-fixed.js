import { io } from 'socket.io-client'
import { SOCKET_URL } from './env-fix'

class SocketService {
  constructor() {
    this.socket = null
    this.connected = false
    this.listeners = new Map()
  }
  
  connect() {
    const token = localStorage.getItem('token')
    if (!token) {
      console.error('No token found')
      return
    }
    
    // 直接使用配置常量
    console.log('WebSocket连接URL:', SOCKET_URL)

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('WebSocket连接成功')
      this.connected = true
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket连接断开')
      this.connected = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket连接失败:', error)
      this.connected = false
    })

    // 注册之前添加的监听器
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  on(event, callback) {
    this.listeners.set(event, callback)
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event) {
    this.listeners.delete(event)
    if (this.socket) {
      this.socket.off(event)
    }
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data)
    }
  }
}

export default new SocketService()
