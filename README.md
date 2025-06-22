# 音乐一起听 🎵

一个支持多人实时同步播放音乐的Web应用，采用前后端分离架构，让你和朋友无论身在何处都能一起听歌！

**作者**: QuietPeng

## ✨ 特性

- 🎵 **多格式支持**: MP3, WAV, FLAC, M4A
- 🔄 **实时同步**: WebSocket确保所有终端同步播放
- 🔐 **安全认证**: JWT Token，30天有效期
- 📱 **跨平台**: 支持桌面端和移动端
- 🎨 **现代界面**: Vue3 + Element Plus
- ⚡ **高性能**: 前后端分离架构
- 👥 **多用户**: 实时显示在线用户数量
- 🔀 **随机播放**: 支持播放列表随机打乱

## 🏗️ 技术架构

### 后端 (Flask)
- **Flask**: Web框架
- **Flask-SocketIO**: WebSocket实时通信
- **Flask-CORS**: 跨域支持
- **PyJWT**: Token认证
- **文件存储**: 本地存储音乐文件

### 前端 (Vue3)
- **Vue 3**: 渐进式JavaScript框架 (Composition API)
- **Vue Router**: 单页面路由
- **Element Plus**: UI组件库
- **Socket.IO Client**: 实时通信客户端
- **Axios**: HTTP客户端
- **直接配置**: 不依赖环境变量，配置简单可靠

## 📁 项目结构

```
Music_together/
├── backend/                    # 后端服务
│   ├── app.py                 # Flask应用主文件
│   ├── requirements.txt       # Python依赖
│   └── auth.json             # 认证配置(自动生成)
├── frontend/                  # 前端应用
│   ├── src/
│   │   ├── views/            # 页面组件
│   │   │   ├── Login.vue     # 登录页面
│   │   │   └── MusicPlayer.vue # 音乐播放器
│   │   ├── utils/            # 工具模块
│   │   │   ├── api.js        # API请求封装
│   │   │   ├── socket.js     # WebSocket客户端
│   │   │   ├── health.js     # 健康检查
│   │   │   └── env-fix.js    # 配置管理 (统一服务器地址)
│   │   ├── router/           # 路由配置
│   │   ├── App.vue           # 根组件
│   │   └── main.js           # 应用入口
│   ├── .env.development      # 开发环境配置 (保留但不使用)
│   ├── .env.production       # 生产环境配置 (保留但不使用)
│   ├── package.json          # Node.js依赖
│   └── vue.config.js         # Vue配置
├── music/                     # 音乐存储
│   ├── storage/              # 音乐文件目录
│   └── songs.json           # 播放列表数据
└── README.md                 # 项目文档
```

## 🚀 快速开始

### 环境要求

- **Python**: 3.7+
- **Node.js**: 14+
- **包管理器**: npm 6+ 或 pnpm 7+

### 内网穿透推荐

🚀 **推荐使用 VSCode 的端口转发功能进行内网穿透！**

如果你想让朋友通过互联网访问你的音乐应用：

1. **安装 VSCode** 并打开项目
2. **启动服务**: 按照下面步骤启动前后端服务
3. **端口转发**: 在 VSCode 中按 `Ctrl+Shift+P`，输入 "Port Forward"
4. **转发端口**: 分别转发后端端口(8080)和前端端口(3000)
5. **分享链接**: VSCode 会生成公共链接，分享给朋友即可

**优点**:
- ✅ 免费且简单
- ✅ 自动HTTPS加密
- ✅ 无需复杂配置
- ✅ VSCode 集成，便于开发调试

### 1. 启动后端服务

```bash
cd backend
pip install -r requirements.txt
python app.py
```

后端服务将运行在 `http://localhost:8080`

### 2. 启动前端服务

```bash
cd frontend

# 使用 npm
npm install
npm run serve

# 或使用 pnpm (推荐)
pnpm install
pnpm run serve
```

前端服务将运行在 `http://localhost:3000`

应用启动时会自动检查后端服务的可用性。

## ⚙️ 配置说明

### 服务器地址配置

本项目采用**直接配置常量**的方式管理服务器地址，不依赖环境变量，更加稳定可靠。

**配置文件**: `frontend/src/utils/env-fix.js`

```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:8080/api',  // 后端API地址
  SOCKET_URL: 'http://localhost:8080'         // WebSocket地址
}
```

**部署时修改**: 
- **本地开发**: 保持上述配置
- **生产环境**: 修改为实际的服务器地址
- **内网穿透**: 修改为VSCode转发的公共地址

### 环境变量 (已弃用)

项目保留了 `.env` 文件但不再使用，配置统一由 `env-fix.js` 管理。

### 🔧 故障排除

如果遇到 ESLint 解析器错误，请确保安装了所有依赖：

```bash
cd frontend
pnpm install @babel/core @babel/eslint-parser @babel/preset-env
# 或者
npm install @babel/core @babel/eslint-parser @babel/preset-env
```

### 认证配置

- **默认密码**: `MusicTogether2024!@#`
- **Token有效期**: 30天
- **密码存储**: SHA256哈希，存储在 `backend/auth.json`

## 🎮 使用指南

### 登录
1. 访问前端应用
2. 输入密码登录
3. 获得30天有效Token

### 音乐管理
- **上传**: 拖拽或点击上传音乐文件
- **删除**: 点击歌曲右侧删除按钮
- **播放**: 点击歌曲开始播放

### 播放控制
- **播放/暂停**: 控制当前歌曲
- **上一首/下一首**: 切换歌曲
- **随机播放**: 打乱播放列表
- **进度控制**: 拖拽进度条调整播放位置

### 多人同步
- 所有操作会实时同步到所有在线用户
- 支持多个设备同时在线
- 播放状态、进度、歌曲切换都会同步
- 实时显示在线用户数量

## 🛠️ 开发指南

### API接口

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/api/login` | 用户登录 |
| GET | `/api/songs` | 获取播放列表 |
| POST | `/api/upload` | 上传音乐文件 |
| POST | `/api/play/{index}` | 播放指定歌曲 |
| POST | `/api/pause` | 暂停播放 |
| POST | `/api/resume` | 继续播放 |
| POST | `/api/prev` | 上一首 |
| POST | `/api/next` | 下一首 |
| DELETE | `/api/delete/{index}` | 删除歌曲 |
| GET | `/api/health` | 健康检查 |

### WebSocket事件

| 事件 | 说明 |
|-----|------|
| `state_update` | 播放状态更新(包含在线用户数) |
| `position_sync` | 播放位置同步 |
| `connect` | 客户端连接 |
| `disconnect` | 客户端断开 |

### 添加新功能

1. **后端**: 在 `backend/app.py` 中添加新的路由和WebSocket事件
2. **前端**: 在 `frontend/src/` 中添加新的组件和页面
3. **API**: 更新 `frontend/src/utils/api.js` 中的API调用

## 🚀 部署

### 开发环境
按照"快速开始"步骤运行即可

### 生产环境
1. 构建前端: `cd frontend && npm run build`
2. 配置反向代理 (Nginx)
3. 部署后端服务 (使用 Gunicorn 或 uWSGI)
4. 配置HTTPS和域名
5. 修改 `env-fix.js` 中的服务器地址

## 🐛 故障排除

### 常见问题

**Q: 前端启动时显示后端服务不可用**
A: 确保后端服务已启动且运行在正确端口(8080)

**Q: ESLint 解析器错误 "Cannot find module '@babel/eslint-parser'"**

A: 有以下几种解决方案：

1. **安装缺失依赖** (推荐)：
```bash
cd frontend
pnpm install @babel/core @babel/eslint-parser @babel/preset-env
```

2. **清除缓存重新安装**：
```bash
cd frontend
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

3. **使用 npm 替代 pnpm**：
```bash
cd frontend
rm -rf node_modules pnpm-lock.yaml
npm install
npm run serve
```

4. **临时禁用 ESLint** (快速解决)：
   项目已配置为禁用 ESLint 检查，可以直接运行

**Q: WebSocket连接失败**
A: 检查防火墙设置，确认8080端口可访问

**Q: 音乐文件播放时出现 401 认证错误**
A: 这是因为音频文件访问需要token认证。解决方案：
1. 确保已登录并获得有效token
2. 重启后端服务和前端应用
3. 检查浏览器网络面板，音频文件URL应该包含 `?token=xxx` 参数

**Q: 音乐文件上传失败**
A: 检查文件格式(支持MP3/WAV/FLAC/M4A)和文件大小(<50MB)

**Q: Token过期**
A: 重新登录获取新的Token

**Q: 在线用户数显示错误**
A: 确保前后端都已更新到最新版本，重新连接WebSocket

**Q: 多设备同步异常**
A: 刷新页面重新建立WebSocket连接

### 日志查看

- **后端日志**: 直接在终端查看Python输出
- **前端日志**: 浏览器开发者工具 Console面板

## 📝 更新日志

### v2.1.0 (当前版本)
- ✨ 前后端分离架构
- ✨ WebSocket实时同步
- ✨ JWT认证系统
- ✨ Vue3现代化界面
- ✨ 实时在线用户统计
- ✨ 直接配置方案（不依赖环境变量）
- ✨ 健康检查机制
- 🔧 改进的错误处理
- 🔧 更好的用户体验
- 🔧 稳定的配置管理

## 📄 许可证

Apache License 2.0

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！项目由 **QuietPeng** 创建和维护。

## 📞 联系

- **作者**: QuietPeng
- **问题反馈**: 请创建 GitHub Issue
- **建议**: 欢迎在 Issue 中提出改进建议

---

❤️ 感谢使用音乐一起听！让音乐连接你我，无论距离多远。
