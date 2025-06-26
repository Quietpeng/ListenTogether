// 模拟数据，用于开发测试
export const mockPlaylist = [
  {
    id: 1,
    name: "示例歌曲1",
    format: "mp3",
    url: "https://example.com/song1.mp3",
    duration: 180
  },
  {
    id: 2,
    name: "示例歌曲2", 
    format: "wav",
    url: "https://example.com/song2.wav",
    duration: 220
  },
  {
    id: 3,
    name: "示例歌曲3",
    format: "flac",
    url: "https://example.com/song3.flac", 
    duration: 195
  }
]

export const mockServerConfig = {
  serverHost: "localhost",
  serverPort: "8080",
  useHttps: false,
  url: "http://localhost:8080"
}

export const mockUserInfo = {
  userId: "user_123",
  username: "测试用户",
  loginTime: Date.now()
}
