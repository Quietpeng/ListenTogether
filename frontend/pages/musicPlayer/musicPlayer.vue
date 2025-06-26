<template>
	<view class="music-player">
		<!-- 头部 -->
		<view class="header">
			<view class="header-content">
				<text class="header-title">音乐一起听</text>
				<view class="header-actions">
					<view class="online-badge">
						<text class="user-icon">👥</text>
						<text class="user-count">{{ connectedClients }}</text>
						<text class="badge-text">在线用户</text>
					</view>
					<button class="logout-btn" @click="logout">
						<text class="btn-icon">🚪</text>
						<text class="btn-text">退出登录</text>
					</button>
					<!-- 临时调试按钮 -->
					<!--          <button class="debug-btn" @click="debugServerConfig">
            <text class="btn-icon">🔍</text>
            <text class="btn-text">服务器</text>
          </button> -->

					<!-- 指纹调试按钮 -->
					<!--          <button class="fingerprint-btn" @click="debugFingerprint">
            <text class="btn-icon">👤</text>
            <text class="btn-text">指纹</text>
          </button>    
          <button class="online-debug-btn" @click="debugOnlineUsers">
            <text class="btn-icon">📊</text>
            <text class="btn-text">在线数</text>
          </button>
          <button class="users-detail-btn" @click="showOnlineUsersDetail">
            <text class="btn-icon">👥</text>
            <text class="btn-text">用户详情</text>
          </button> -->

					<!-- 清理离线用户按钮 -->
					<!--          <button class="cleanup-users-btn" @click="cleanupOfflineUsers">
            <text class="btn-icon">🧹</text>
            <text class="btn-text">清理离线</text>
          </button> -->

					<!-- 实时监控按钮 -->
					<!--          <button class="monitor-btn" @click="toggleOnlineMonitor">
            <text class="btn-icon">📈</text>
            <text class="btn-text">{{ monitoringOnline ? '停止监控' : '监控在线' }}</text>
          </button> -->
					<!-- 测试指纹头按钮 -->
					<!--          <button class="test-header-btn" @click="testFingerprintHeader">
            <text class="btn-icon">🧪</text>
            <text class="btn-text">测试头</text>
          </button> -->

					<!-- 清理离线用户按钮 -->
					<!--          <button class="cleanup-users-btn" @click="cleanupOfflineUsers">
            <text class="btn-icon">🧹</text>
            <text class="btn-text">清理离线</text>
          </button> -->
					<!-- 清理配置按钮 -->
					<!--          <button class="clear-btn" @click="clearServerConfig">
            <text class="btn-icon">🗑</text>
            <text class="btn-text">清理</text>
          </button> -->

					<!-- 系统测试按钮 -->
					<!--          <button class="system-test-btn" @click="runSystemTest">
            <text class="btn-icon">🧪</text>  
            <text class="btn-text">系统测试</text>
          </button> -->
				</view>
			</view>
		</view>

		<!-- 播放器控制区 -->
		<view class="player-section">
			<view class="player-card">
				<view class="current-song">
					<text class="song-title">{{ currentSong ? currentSong.name : '暂无播放' }}</text>
					<view class="status-info">
						<text class="connection-status">{{ connectionStatus }}</text>
						<text class="user-fingerprint">指纹: {{ userFingerprint }}</text>
					</view>
				</view>
				<!-- 音频播放使用UniApp API，无需HTML元素 -->

				<!-- 进度条 -->
				<view class="progress-section">
					<text class="time">{{ formatTime(currentTime) }}</text>
					<slider class="progress-slider" :value="progressPercent" :max="100" block-size="20" backgroundColor="#e9ecef" activeColor="#667eea" @change="onSeek" />
					<text class="time">{{ formatTime(duration) }}</text>
				</view>

				<!-- 控制按钮 -->
				<view class="controls">
					<button class="control-btn" @click="prevSong" :disabled="!playlist.length">
						<text class="control-icon">⏮</text>
					</button>
					<button class="play-btn" @click="togglePlay" :disabled="!currentSong">
						<text class="play-icon">{{ isPlaying ? '⏸' : '▶️' }}</text>
					</button>
					<button class="control-btn" @click="nextSong" :disabled="!playlist.length">
						<text class="control-icon">⏭</text>
					</button>
					<button class="shuffle-btn" @click="shufflePlaylist" :disabled="!playlist.length">
						<text class="shuffle-icon">🔀</text>
						<text class="shuffle-text">随机</text>
					</button>
				</view>
			</view>
		</view>

		<!-- 播放列表 -->
		<view class="playlist-section">
			<view class="playlist-header">
				<text class="playlist-title">播放列表 ({{ playlist.length }}首)</text>
				<view class="playlist-actions">
					<button class="upload-btn" @click="showUploadDialog">
						<text class="upload-icon">⬆️</text>
						<text class="upload-text">上传音乐</text>
					</button>
				</view>
			</view>

			<view class="playlist-content">
				<!-- 空状态 -->
				<view v-if="!playlist.length" class="empty-playlist">
					<text class="empty-icon">🎵</text>
					<text class="empty-text">暂无音乐文件</text>
					<text class="empty-tip">请上传音乐文件开始播放</text>
				</view>

				<!-- 歌曲列表 -->
				<scroll-view v-else class="song-list" scroll-y>
					<view v-for="(song, index) in playlist" :key="index" class="song-item" :class="{ active: index === currentIndex }" @click="playSong(index)">
						<view class="song-info">
							<text class="song-index">{{ index + 1 }}</text>
							<view class="song-details">
								<text class="song-name">{{ song.name }}</text>
								<text class="song-format">{{ song.format?.toUpperCase() || 'MP3' }}</text>
							</view>
						</view>
						<view class="song-actions">
							<button v-if="index === currentIndex && isPlaying" class="playing-indicator">
								<text class="playing-icon">🎵</text>
							</button>
							<button class="delete-btn" @click.stop="deleteSong(index)">
								<text class="delete-icon">🗑</text>
							</button>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- 上传对话框 -->
		<view v-if="showUpload" class="upload-dialog">
			<view class="dialog-mask" @click="hideUploadDialog"></view>
			<view class="dialog-content">
				<view class="dialog-header">
					<text class="dialog-title">上传音乐</text>
					<button class="dialog-close" @click="hideUploadDialog">
						<text>✕</text>
					</button>
				</view>
				<view class="dialog-body">
					<text class="upload-tips">请选择音乐文件 (支持 MP3, WAV, FLAC, M4A)</text>
					<button class="file-select-btn" @click="selectMusicFile">
						<text class="select-icon">📁</text>
						<text class="select-text">选择文件</text>
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useUserAuth } from '../../utils/userAuth.js';
import { useServerConnection } from '../../utils/serverConnection.js';
import { useMusicPlayer } from '../../utils/musicControl.js';
import { useBackgroundPlay } from '../../utils/backgroundMusic.js';
import { getSafeUserFingerprint, getShortUserId } from '../../utils/fingerprint.js';
import { pollingManager } from '../../utils/pollingManager.js';

// 使用组合式函数
const { logout: userLogout, currentUser, getStoredAuth } = useUserAuth();
const { connectionState, connect, disconnect, getPlaylist } = useServerConnection();
const { playerState, initAudioManager, playMusic, pauseMusic, resumeMusic, stopMusic, playNext, playPrevious, setVolume, setProgress, debugServerConfig, clearServerConfig } =
	useMusicPlayer();
const { enabled: backgroundPlayActive, enableBackgroundPlay, disableBackgroundPlay } = useBackgroundPlay();

// 响应式数据
const showUpload = ref(false);

const state = reactive({
	playlist: [],
	currentIndex: 0,
	isPlaying: false,
	currentPosition: 0
});

const connectedClients = ref(0); // 初始值设为0，等待服务器返回真实数据
const monitoringOnline = ref(false); // 是否正在监控在线用户数
const onlineHistory = ref([]); // 在线用户数历史记录
const connectionStatus = ref('连接中...');
const syncLock = ref(false);
const userFingerprint = ref('');

console.log('📊 [初始化] 在线用户数初始值:', connectedClients.value);

// 获取用户指纹
try {
	userFingerprint.value = getShortUserId();
	console.log('🔍 [指纹] 用户指纹:', userFingerprint.value);

	// 初始化时测试指纹安全性
	testFingerprintSafety();
} catch (error) {
	console.error('获取用户指纹失败:', error);
	userFingerprint.value = 'unknown';
}

// 后台播放状态
const backgroundPlayStatus = ref({
	isActive: false,
	hasWakeLock: false,
	audioContextState: 'none',
	networkKeepAlive: false,
	heartbeat: false
});

// 计算属性
const playlist = computed(() => state.playlist || []);
const currentIndex = computed(() => state.currentIndex || 0);
const isPlaying = computed(() => state.isPlaying || false);
const currentSong = computed(() => {
	return playlist.value[currentIndex.value] || null;
});

const progressPercent = computed(() => {
	if (playerState.duration === 0) return 0;
	return (playerState.currentTime / playerState.duration) * 100;
});

const currentTime = computed(() => playerState.currentTime || 0);
const duration = computed(() => playerState.duration || 0);

// 工具函数
const formatTime = (seconds) => {
	if (!seconds || isNaN(seconds)) return '00:00';

	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 生命周期
onMounted(async () => {
	console.log('音乐播放器页面挂载开始');
	console.log('📊 [初始化] 当前在线用户数:', connectedClients.value);

	try {
		await initializePlayer();
		console.log('播放器初始化完成，开始加载播放列表');

		await loadPlaylist();
		console.log('播放列表加载完成');

		// 监听服务器消息
		setupEventListeners();
		console.log('事件监听器设置完成');

		// 添加监听音频结束事件
		uni.$on('audio_ended', onSongEnded);
		console.log('音频结束事件监听已设置');

		console.log('音乐播放器初始化全部完成');
		console.log('📊 [初始化完成] 最终在线用户数:', connectedClients.value);
	} catch (error) {
		console.error('音乐播放器初始化失败:', error);
	}
});

onUnmounted(() => {
	cleanup();
});

// 初始化播放器
const initializePlayer = async () => {
	try {
		console.log('开始初始化播放器...');

		// 调试服务器配置
		debugServerConfig();

		// 初始化音频管理器
		initAudioManager();
		console.log('音频管理器初始化完成');

		// 默认启用后台播放
		await enableBackgroundPlay();
		backgroundPlayStatus.value.isActive = true;
		console.log('后台播放启用完成');
		// 连接到服务器
		const serverConfig = uni.getStorageSync('serverConfig');
		console.log('获取服务器配置:', serverConfig);

		if (serverConfig) {
			// 构建标准化的服务器URL
			let serverUrl = '';
			if (serverConfig.serverHost && serverConfig.hasOwnProperty('useHttps')) {
				// 新版配置格式
				const protocol = serverConfig.useHttps ? 'https' : 'http';
				const host = serverConfig.serverHost;
				const port = serverConfig.serverPort ? `:${serverConfig.serverPort}` : '';
				serverUrl = `${protocol}://${host}${port}`;
			} else if (serverConfig.url) {
				// 旧版配置格式，需要清理
				serverUrl = serverConfig.url;
				// 移除可能的路径部分
				if (serverUrl.includes('/api') || serverUrl.includes('/ws')) {
					const urlParts = serverUrl.split('/');
					serverUrl = `${urlParts[0]}//${urlParts[2]}`;
				}
			}

			if (serverUrl) {
				console.log('使用服务器URL连接:', serverUrl);
				await connect(serverUrl);
				connectionStatus.value = '已连接';
				console.log('服务器连接完成');
			} else {
				connectionStatus.value = '服务器配置无效';
				console.error('无法构建有效的服务器URL');
			}
		} else {
			connectionStatus.value = '未配置服务器';
			console.warn('未找到服务器配置');
		}
	} catch (error) {
		console.error('初始化播放器失败:', error);
		connectionStatus.value = '连接失败';
	}
};

// 加载播放列表
const loadPlaylist = async () => {
	try {
		console.log('开始加载播放列表...');
		const playlistData = await getPlaylist();
		console.log('播放列表数据:', playlistData);

		if (playlistData && playlistData.playlist) {
			state.playlist = playlistData.playlist;
			state.currentIndex = playlistData.current_index || 0;
			state.isPlaying = playlistData.is_playing || false;
			state.currentPosition = playlistData.current_position || 0;
			console.log('播放列表加载成功，歌曲数量:', playlistData.playlist.length);
		} else {
			console.warn('播放列表数据格式不正确:', playlistData);
		}
	} catch (error) {
		console.error('加载播放列表失败:', error);
	}
};

// 设置事件监听
const setupEventListeners = () => {
	// 监听播放状态变化
	uni.$on('play_state_change', handlePlayStateChange);

	// 监听播放列表更新
	uni.$on('playlist_update', handlePlaylistUpdate);

	// 监听轮询状态更新
	uni.$on('poll_state_update', handlePollStateUpdate);

	// 监听轮询客户端数量更新
	uni.$on('poll_clients_update', handlePollClientsUpdate);

	// 监听音频控制器状态变化
	uni.$on('player_state_change', handlePlayerStateChange);

	// 监听音频时间更新
	uni.$on('player_time_update', handlePlayerTimeUpdate);
};

// 清理资源
const cleanup = () => {
	uni.$off('play_state_change', handlePlayStateChange);
	uni.$off('playlist_update', handlePlaylistUpdate);
	uni.$off('poll_state_update', handlePollStateUpdate);
	uni.$off('poll_clients_update', handlePollClientsUpdate);
	uni.$off('player_state_change', handlePlayerStateChange);
	uni.$off('player_time_update', handlePlayerTimeUpdate);
	uni.$off('audio_ended', onSongEnded);
	// 停止位置同步
	stopPositionSync();

	disconnect();
};

// 播放控制
const togglePlay = async () => {
	if (!currentSong.value) return;

	try {
		if (isPlaying.value) {
			// 当前正在播放，执行暂停
			await pauseMusic();
			state.isPlaying = false;
			playerState.isPlaying = false;
			stopPositionSync();
		} else {
			// 当前不在播放状态，需要判断是否是暂停状态
			if (playerState.isPaused) {
				// 从暂停状态恢复播放
				await resumeMusic();
			} else {
				// 重新开始播放当前歌曲
				await playMusic(currentSong.value);
			}
			state.isPlaying = true;
			playerState.isPlaying = true;
			startPositionSync();
		}

		// 同步播放状态到服务器
		syncPlayState();
	} catch (error) {
		console.error('播放控制失败:', error);
		uni.showToast({
			title: '播放失败',
			icon: 'none'
		});
	}
};

const prevSong = async () => {
	if (playlist.value.length === 0) return;

	const newIndex = currentIndex.value > 0 ? currentIndex.value - 1 : playlist.value.length - 1;
	await playSong(newIndex);
};

const nextSong = async () => {
	if (playlist.value.length === 0) return;

	const newIndex = currentIndex.value < playlist.value.length - 1 ? currentIndex.value + 1 : 0;
	await playSong(newIndex);
};

const playSong = async (index) => {
	if (index < 0 || index >= playlist.value.length) return;
	try {
		// 停止当前播放
		if (state.isPlaying) {
			await stopMusic();
		}

		// 设置新的当前歌曲
		state.currentIndex = index;

		// 播放新歌曲
		await playMusic(playlist.value[index]);
		state.isPlaying = true;
		playerState.isPlaying = true;

		// 启动位置同步
		startPositionSync();

		// 同步歌曲切换状态到服务器
		await syncSongChange(index);

		// 同步播放状态
		syncPlayState();
	} catch (error) {
		console.error('播放歌曲失败:', error);
		uni.showToast({
			title: '播放失败',
			icon: 'none'
		});
	}
};

const shufflePlaylist = () => {
	if (playlist.value.length <= 1) return;

	// 简单的随机播放下一首
	const randomIndex = Math.floor(Math.random() * playlist.value.length);
	playSong(randomIndex);
};

// 删除歌曲
const deleteSong = async (index) => {
	if (index < 0 || index >= playlist.value.length) {
		console.error('无效的歌曲索引:', index);
		return;
	}

	const song = playlist.value[index];
	console.log('准备删除歌曲:', song.name, '索引:', index);

	try {
		uni.showModal({
			title: '确认删除',
			content: `确定要删除 "${song.name}" 吗？`,
			success: async (res) => {
				if (res.confirm) {
					try {
						uni.showLoading({
							title: '删除中...'
						});

						await deleteSongFromServer(index);

						// 立即从本地播放列表中移除该歌曲
						const newPlaylist = [...state.playlist];
						newPlaylist.splice(index, 1);
						state.playlist = newPlaylist;

						// 如果删除的是当前播放的歌曲，需要调整当前索引
						if (index === state.currentIndex) {
							// 如果删除的是最后一首歌，播放前一首
							if (state.currentIndex >= newPlaylist.length && newPlaylist.length > 0) {
								state.currentIndex = newPlaylist.length - 1;
							}
							// 如果删除后没有歌曲了，停止播放
							if (newPlaylist.length === 0) {
								state.currentIndex = 0;
								state.isPlaying = false;
								await stopMusic();
							}
						} else if (index < state.currentIndex) {
							// 如果删除的歌曲在当前播放歌曲之前，需要调整当前索引
							state.currentIndex = state.currentIndex - 1;
						}

						// 异步刷新播放列表以确保与服务器同步
						setTimeout(() => {
							getPlaylist();
						}, 1000);

						uni.hideLoading();
						uni.showToast({
							title: '删除成功',
							icon: 'success'
						});
					} catch (error) {
						console.error('删除歌曲失败:', error);
						uni.hideLoading();
						uni.showToast({
							title: '删除失败: ' + (error.message || '未知错误'),
							icon: 'error'
						});
					}
				}
			}
		});
	} catch (error) {
		console.error('删除歌曲失败:', error);
	}
};

// 从服务器删除歌曲
const deleteSongFromServer = async (index) => {
	const auth = getStoredAuth();

	if (!auth || !auth.token) {
		throw new Error('未登录');
	}

	// 获取服务器URL
	const serverUrl = connectionState.serverUrl || uni.getStorageSync('serverConfig')?.url;
	if (!serverUrl) {
		throw new Error('服务器地址未配置');
	}
	console.log('向服务器发送删除请求，索引:', index);
	console.log('服务器地址:', serverUrl);
	return new Promise((resolve, reject) => {
		const safeUniqueId = getSafeUserFingerprint();

		// 验证指纹是否为ASCII安全
		if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
			console.error('指纹包含非ASCII字符:', safeUniqueId);
			reject(new Error('Fingerprint contains non-ASCII characters'));
			return;
		}

		uni.request({
			url: `${serverUrl}/api/delete/${index}`,
			method: 'DELETE',
			header: {
				Authorization: `Bearer ${auth.token}`,
				'Content-Type': 'application/json',
				'X-User-Fingerprint': safeUniqueId
			},
			success: (res) => {
				console.log('删除响应:', res);
				if (res.statusCode === 200) {
					console.log('删除成功:', res.data);
					resolve(res.data);
				} else {
					console.error('删除失败，状态码:', res.statusCode, '响应:', res.data);
					reject(new Error(`删除失败: HTTP ${res.statusCode}`));
				}
			},
			fail: (error) => {
				console.error('删除请求失败:', error);
				reject(error);
			}
		});
	});
};

// 音频事件处理已移到musicControl.js中，这里不再需要
// 当歌曲播放结束时自动播放下一首
const onSongEnded = async () => {
	console.log('当前歌曲播放结束，准备播放下一首');

	// 更新播放状态
	state.isPlaying = false;
	playerState.isPlaying = false;

	// 如果播放列表为空或只有一首歌，则不执行任何操作
	if (!playlist.value || playlist.value.length <= 1) {
		console.log('播放列表为空或只有一首歌，不执行自动播放下一首');
		return;
	}

	try {
		// 使用定时器延迟一点点执行，避免可能的时序问题
		setTimeout(async () => {
			await nextSong();
			console.log('已自动切换到下一首歌曲');
		}, 300);
	} catch (error) {
		console.error('自动切换下一首歌曲失败:', error);
	}
};

const onSeek = (e) => {
	try {
		const progress = e.detail.value || 0;
		console.log('拖动进度条到:', progress + '%');

		// 使用音频控制器的setProgress方法
		setProgress(progress);

		// 同步播放位置到服务器
		syncPlayState();
	} catch (error) {
		console.error('设置播放进度失败:', error);
	}
};

// 定期同步播放位置
let positionSyncTimer = null;

const startPositionSync = () => {
	if (positionSyncTimer) {
		clearInterval(positionSyncTimer);
	}

	// 每5秒同步一次播放位置（仅在播放时）
	positionSyncTimer = setInterval(() => {
		if (state.isPlaying && playerState.currentTime > 0) {
			syncPlayState();
		}
	}, 5000);
};

const stopPositionSync = () => {
	if (positionSyncTimer) {
		clearInterval(positionSyncTimer);
		positionSyncTimer = null;
	}
};

// 状态同步
const syncPlayState = async () => {
	try {
		// 获取认证信息
		const auth = getStoredAuth();
		if (!auth || !auth.token) {
			console.warn('未登录，无法同步状态');
			return;
		}

		// 获取服务器URL
		const serverUrl = connectionState.serverUrl || uni.getStorageSync('serverConfig')?.url;
		if (!serverUrl) {
			console.warn('服务器地址未配置，无法同步状态');
			return;
		}

		// 准备同步数据
		const syncData = {
			current_index: state.currentIndex,
			is_playing: state.isPlaying,
			current_position: playerState.currentTime || 0
		};

		// console.log('同步播放状态到服务器:', syncData)

		// 尝试使用WebSocket发送
		if (connectionState.websocketConnected && typeof connectionState.sendMessage === 'function') {
			connectionState.sendMessage({
				type: 'sync_state',
				data: syncData
			});
		} else {
			// 如果WebSocket不可用，使用HTTP轮询更新
			const safeUniqueId = getSafeUserFingerprint();

			// 验证指纹是否为ASCII安全
			if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
				console.error('指纹包含非ASCII字符:', safeUniqueId);
				return;
			}

			uni.request({
				url: `${serverUrl}/api/poll/update-play-state`,
				method: 'POST',
				header: {
					Authorization: `Bearer ${auth.token}`,
					'Content-Type': 'application/json',
					'X-User-Fingerprint': safeUniqueId
				},
				data: {
					is_playing: state.isPlaying,
					position: playerState.currentTime || 0
				},
				success: (res) => {
					if (res.statusCode === 200) {
						console.log('播放状态同步成功');
					} else {
						console.warn('播放状态同步失败:', res.statusCode);
					}
				},
				fail: (error) => {
					console.error('播放状态同步请求失败:', error);
				}
			});
		}
	} catch (error) {
		console.error('状态同步失败:', error);
	}
};

// 同步歌曲切换到服务器
const syncSongChange = async (index) => {
	try {
		// 获取认证信息
		const auth = getStoredAuth();
		if (!auth || !auth.token) {
			console.warn('未登录，无法同步歌曲切换');
			return;
		}

		// 获取服务器URL
		const serverUrl = connectionState.serverUrl || uni.getStorageSync('serverConfig')?.url;
		if (!serverUrl) {
			console.warn('服务器地址未配置，无法同步歌曲切换');
			return;
		}

		console.log('同步歌曲切换到服务器:', index); // 尝试使用WebSocket发送
		if (connectionState.websocketConnected && typeof connectionState.sendMessage === 'function') {
			connectionState.sendMessage({
				type: 'change_song',
				data: { index: index }
			});
		} else {
			// 如果WebSocket不可用，使用HTTP轮询更新
			const safeUniqueId = getSafeUserFingerprint();

			// 验证指纹是否为ASCII安全
			if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
				console.error('指纹包含非ASCII字符:', safeUniqueId);
				return;
			}
			uni.request({
				url: `${serverUrl}/api/poll/change-song`,
				method: 'POST',
				header: {
					Authorization: `Bearer ${auth.token}`,
					'Content-Type': 'application/json',
					'X-User-Fingerprint': safeUniqueId
				},
				data: {
					index: index
				},
				success: (res) => {
					if (res.statusCode === 200) {
						console.log('歌曲切换同步成功');
					} else {
						console.warn('歌曲切换同步失败:', res.statusCode);
					}
				},
				fail: (error) => {
					console.error('歌曲切换同步请求失败:', error);
				}
			});
		}
	} catch (error) {
		console.error('歌曲切换同步失败:', error);
	}
};

const handlePlayStateChange = (data) => {
	// 处理服务器发送的播放状态变化
	console.log('收到播放状态变化:', data);

	if (data && typeof data === 'object') {
		// 更新本地状态
		if (typeof data.is_playing !== 'undefined') {
			state.isPlaying = data.is_playing;
		}

		if (typeof data.current_index !== 'undefined') {
			state.currentIndex = data.current_index;
		}

		if (typeof data.current_position !== 'undefined') {
			// 更新播放位置
			if (Math.abs(data.current_position - (playerState.currentTime || 0)) > 10) {
				// 只有当位置差异较大时才同步，避免频繁调整
				playerState.currentTime = data.current_position;
			}
		}

		if (typeof data.connected_clients !== 'undefined') {
			console.log('📊 [WebSocket] 更新在线用户数:', data.connected_clients, '(来源: WebSocket状态更新)');
			connectedClients.value = data.connected_clients;
		}
	}
};

const handlePlaylistUpdate = (data) => {
	// 处理播放列表更新
	console.log('收到播放列表更新:', data);

	if (data && data.playlist && Array.isArray(data.playlist)) {
		state.playlist = data.playlist;

		// 更新其他状态
		if (typeof data.current_index !== 'undefined') {
			state.currentIndex = data.current_index;
		}
		if (typeof data.is_playing !== 'undefined') {
			state.isPlaying = data.is_playing;
		}

		if (typeof data.connected_clients !== 'undefined') {
			console.log('📊 [播放列表] 更新在线用户数:', data.connected_clients, '(来源: 播放列表更新)');
			connectedClients.value = data.connected_clients;
		}
	} else {
		// 如果没有直接的播放列表数据，重新加载
		loadPlaylist();
	}
};

// 处理轮询状态更新
const handlePollStateUpdate = async (data) => {
	// console.log('收到轮询状态更新:', data)

	if (data && typeof data === 'object') {
		if (JSON.stringify(state.playlist) !== JSON.stringify(data.playlist)) {
			console.log('收到播放列表更新:', data.playlist);
			// 更新播放列表
			if (data.playlist && Array.isArray(data.playlist)) {
				state.playlist = data.playlist;
			}
		}

		// 更新播放状态
		if (typeof data.is_playing !== 'undefined') {
			if (data.is_playing !== state.isPlaying) {
				console.log('收到播放状态更新:', data.is_playing);
				await togglePlay();
				// state.isPlaying = data.is_playing;
			}
		}

		// 更新当前索引
		if (typeof data.current_index !== 'undefined') {
			if (state.currentIndex !== data.current_index) {
				console.log('收到当前索引更新:', data.current_index);
				state.currentIndex = data.current_index;
				// await playSong(data.current_index)
				// 停止当前播放
				// if (state.isPlaying) {
				//   await stopMusic()
				// }

				// 播放新歌曲
				await playMusic(playlist.value[state.currentIndex]);
				state.isPlaying = true;
				state.isPaused = false;
				playerState.isPlaying = true;
				playerState.isPaused = false;
			}
		}

		// 更新播放位置（只有当差异较大时）
		if (typeof data.current_position !== 'undefined') {
			// const currentPos = playerState.currentTime || 0;
			// if (Math.abs(data.current_position - currentPos) > 10) {
			// 	console.log('收到播放位置更新:', data.current_position);
			// 	// 位置差异超过3秒才同步，避免频繁调整
			// 	playerState.currentTime = data.current_position;
			// }
		}

		// 更新在线用户数
		if (typeof data.connected_clients !== 'undefined') {
			// console.log('收到播放列表更新:', data.playlist)
			// console.log('📊 [轮询状态] 更新在线用户数:', data.connected_clients, '(来源: 轮询状态更新)')
			connectedClients.value = data.connected_clients;
		}
	}
};

// 处理轮询客户端数量更新
const handlePollClientsUpdate = (data) => {
	// console.log('收到轮询客户端数量更新:', data)

	if (data && typeof data.connected_clients !== 'undefined') {
		// console.log('📊 [轮询客户端] 更新在线用户数:', data.connected_clients, '(来源: 轮询客户端数量)')
		connectedClients.value = data.connected_clients;
	}
};

// 上传相关
const showUploadDialog = () => {
	showUpload.value = true;
};

const hideUploadDialog = () => {
	showUpload.value = false;
};

const selectMusicFile = () => {
	// #ifdef H5
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.mp3,.wav,.flac,.m4a';
	input.onchange = handleFileSelect;
	input.click();
	// #endif

	// #ifndef H5
	uni.chooseFile({
		count: 1,
		type: 'file',
		extension: ['mp3', 'wav', 'flac', 'm4a'],
		success: handleFileSelect
	});
	// #endif
};

const handleFileSelect = async (res) => {
	console.log('选择的文件:', res);

	let file = null;

	// #ifdef H5
	if (res.target && res.target.files && res.target.files[0]) {
		file = res.target.files[0];
		console.log('H5选择的文件:', file);
	}
	// #endif

	// #ifndef H5
	if (res && res.tempFiles && res.tempFiles[0]) {
		file = res.tempFiles[0];
		console.log('小程序选择的文件:', file);
	}
	// #endif

	if (!file) {
		console.error('未找到有效文件');
		uni.showToast({
			title: '未选择有效文件',
			icon: 'error'
		});
		return;
	}

	try {
		hideUploadDialog();
		uni.showLoading({
			title: '上传中...'
		});
		await uploadMusicFile(file);

		// 刷新播放列表
		await getPlaylist();

		uni.hideLoading();
		uni.showToast({
			title: '上传成功',
			icon: 'success'
		});

		// 短暂延迟后关闭弹窗，让用户看到成功提示
		setTimeout(() => {
			hideUploadDialog();
		}, 1500);
	} catch (error) {
		console.error('上传失败:', error);
		uni.hideLoading();

		// 上传失败时，显示错误信息并询问用户是否重新选择
		uni.showModal({
			title: '上传失败',
			content: `上传失败: ${error.message || '未知错误'}\n\n是否重新选择文件？`,
			confirmText: '重新选择',
			cancelText: '关闭',
			success: (res) => {
				if (res.confirm) {
					// 用户选择重新选择文件，保持弹窗打开
					return;
				} else {
					// 用户选择关闭，关闭上传弹窗
					hideUploadDialog();
				}
			}
		});
	}
};

// 上传音乐文件
const uploadMusicFile = async (file) => {
	const auth = getStoredAuth();

	if (!auth || !auth.token) {
		throw new Error('未登录');
	}

	// 获取服务器URL
	const serverUrl = connectionState.serverUrl || uni.getStorageSync('serverConfig')?.url;
	if (!serverUrl) {
		throw new Error('服务器地址未配置');
	}
	console.log('开始上传文件:', file.name || file.fileName, '大小:', file.size);
	console.log('服务器地址:', serverUrl);
	// #ifdef H5
	// H5环境使用fetch上传
	const formData = new FormData();
	formData.append('file', file);

	const safeUniqueId = getSafeUserFingerprint();

	// 验证指纹是否为ASCII安全
	if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
		console.error('指纹包含非ASCII字符:', safeUniqueId);
		throw new Error('Fingerprint contains non-ASCII characters');
	}
	const response = await fetch(`${serverUrl}/api/upload`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${auth.token}`,
			'X-User-Fingerprint': safeUniqueId
		},
		body: formData
	});

	if (!response.ok) {
		throw new Error(`上传失败: HTTP ${response.status}`);
	}
	const result = await response.json();
	console.log('上传成功:', result);
	return result;
	// #endif
	// #ifndef H5
	// 小程序/App环境使用uni.uploadFile
	return new Promise((resolve, reject) => {
		const safeUniqueId = getSafeUserFingerprint();

		// 验证指纹是否为ASCII安全
		if (!/^[a-zA-Z0-9_-]+$/.test(safeUniqueId)) {
			console.error('指纹包含非ASCII字符:', safeUniqueId);
			reject(new Error('Fingerprint contains non-ASCII characters'));
			return;
		}

		uni.uploadFile({
			url: `${serverUrl}/api/upload`,
			filePath: file.path,
			name: 'file',
			header: {
				Authorization: `Bearer ${auth.token}`,
				'X-User-Fingerprint': safeUniqueId
			},
			success: (uploadRes) => {
				console.log('上传响应:', uploadRes);
				if (uploadRes.statusCode === 200) {
					const result = JSON.parse(uploadRes.data);
					console.log('上传成功:', result);
					resolve(result);
				} else {
					console.error('上传失败，状态码:', uploadRes.statusCode);
					reject(new Error(`上传失败: HTTP ${uploadRes.statusCode}`));
				}
			},
			fail: (error) => {
				console.error('上传请求失败:', error);
				reject(error);
			}
		});
	});
	// #endif
};

// 退出登录
const logout = async () => {
	try {
		uni.showModal({
			title: '确认退出',
			content: '确定要退出登录吗？',
			success: async (res) => {
				if (res.confirm) {
					await userLogout(); // 停止播放和断开连接
					if (state.isPlaying) {
						await stopMusic();
					}
					disconnect();

					// 跳转到登录页
					uni.redirectTo({
						url: '/pages/userLogin/userLogin'
					});
				}
			}
		});
	} catch (error) {
		console.error('退出登录失败:', error);
	}
};

// 刷新播放列表
const refreshPlaylist = () => {
	loadPlaylist();
};

// 处理音频控制器状态变化
const handlePlayerStateChange = (data) => {
	console.log('收到音频控制器状态变化:', data);

	if (data && typeof data === 'object') {
		// 同步播放状态
		if (typeof data.isPlaying !== 'undefined') {
			state.isPlaying = data.isPlaying;
			// 也需要同步playerState.isPlaying，确保状态一致
			playerState.isPlaying = data.isPlaying;
		}

		if (typeof data.isPaused !== 'undefined') {
			// 同步暂停状态
			playerState.isPaused = data.isPaused;
		}
	}
};

// 处理音频时间更新
const handlePlayerTimeUpdate = (data) => {
	if (data && typeof data === 'object') {
		// 更新播放时间和总时长（不需要打印日志，避免频繁输出）
		if (typeof data.currentTime !== 'undefined') {
			playerState.currentTime = data.currentTime;
		}

		if (typeof data.duration !== 'undefined') {
			playerState.duration = data.duration;
		}
	}
};

// 调试用户指纹
const debugFingerprint = () => {
	try {
		const fullId = getSafeUserFingerprint();
		const shortId = getShortUserId();

		console.log('=== 用户指纹调试信息 ===');
		console.log('安全用户指纹:', fullId);
		console.log('简短用户ID:', shortId);
		console.log('当前在线用户数:', connectedClients.value);
		console.log('=== 指纹调试结束 ===');

		uni.showModal({
			title: '用户指纹信息',
			content: `完整ID: ${fullId}\n简短ID: ${shortId}\n在线用户: ${connectedClients.value}`,
			showCancel: false
		});
	} catch (error) {
		console.error('调试用户指纹失败:', error);
	}
};

// 显示在线用户详情
const showOnlineUsersDetail = async () => {
	try {
		console.log('获取在线用户详情...');

		const auth = getStoredAuth();
		if (!auth || !auth.token) {
			uni.showToast({ title: '未登录', icon: 'error' });
			return;
		}

		const serverUrl = connectionState.serverUrl || uni.getStorageSync('serverConfig')?.url;
		if (!serverUrl) {
			uni.showToast({ title: '服务器未配置', icon: 'error' });
			return;
		}

		const safeUniqueId = getSafeUserFingerprint();

		uni.showLoading({ title: '获取用户信息...' });

		const response = await new Promise((resolve, reject) => {
			uni.request({
				url: `${serverUrl}/api/online-users`,
				method: 'GET',
				header: {
					Authorization: `Bearer ${auth.token}`,
					'X-User-Fingerprint': safeUniqueId,
					'Content-Type': 'application/json'
				},
				success: resolve,
				fail: reject
			});
		});

		uni.hideLoading();

		if (response.statusCode === 200) {
			const data = response.data;
			console.log('在线用户信息:', data);

			let content = `在线用户数: ${data.count}\nWebSocket连接数: ${data.websocket_connections}\n\n用户列表:\n`;

			if (data.users && Object.keys(data.users).length > 0) {
				Object.entries(data.users).forEach(([fingerprint, userInfo], index) => {
					const loginTime = new Date(userInfo.login_time).toLocaleString();
					const lastSeen = new Date(userInfo.last_seen).toLocaleString();
					content += `${index + 1}. ${fingerprint}\n   登录: ${loginTime}\n   活跃: ${lastSeen}\n   IP: ${userInfo.ip}\n\n`;
				});
			} else {
				content += '暂无在线用户';
			}

			uni.showModal({
				title: '在线用户详情',
				content: content,
				showCancel: false,
				confirmText: '关闭'
			});
		} else {
			console.error('获取在线用户失败:', response);
			uni.showToast({ title: '获取失败', icon: 'error' });
		}
	} catch (error) {
		uni.hideLoading();
		console.error('获取在线用户详情失败:', error);
		uni.showToast({ title: '网络错误', icon: 'error' });
	}
};

// 手动清理离线用户
const cleanupOfflineUsers = async () => {
	try {
		console.log('手动清理离线用户...');

		const auth = getStoredAuth();
		if (!auth || !auth.token) {
			uni.showToast({ title: '未登录', icon: 'error' });
			return;
		}

		const serverUrl = connectionState.serverUrl || uni.getStorageSync('serverConfig')?.url;
		if (!serverUrl) {
			uni.showToast({ title: '服务器未配置', icon: 'error' });
			return;
		}

		const safeUniqueId = getSafeUserFingerprint();

		uni.showLoading({ title: '清理中...' });

		const response = await new Promise((resolve, reject) => {
			uni.request({
				url: `${serverUrl}/api/cleanup-offline`,
				method: 'POST',
				header: {
					Authorization: `Bearer ${auth.token}`,
					'X-User-Fingerprint': safeUniqueId,
					'Content-Type': 'application/json'
				},
				success: resolve,
				fail: reject
			});
		});

		uni.hideLoading();

		if (response.statusCode === 200) {
			const data = response.data;
			console.log('清理结果:', data);

			uni.showToast({
				title: `清理了 ${data.cleaned_count} 个过期用户`,
				icon: 'success'
			});

			// 刷新在线用户数
			setTimeout(() => {
				debugOnlineUsers();
			}, 1000);
		} else {
			console.error('清理失败:', response);
			uni.showToast({ title: '清理失败', icon: 'error' });
		}
	} catch (error) {
		uni.hideLoading();
		console.error('清理离线用户失败:', error);
		uni.showToast({ title: '网络错误', icon: 'error' });
	}
};

// 调试在线用户数问题
const debugOnlineUsers = () => {
	try {
		console.log('=== 在线用户数调试 ===');
		console.log('当前显示的在线用户数:', connectedClients.value);
		console.log('连接状态:', connectionStatus.value);
		console.log('WebSocket连接状态:', connectionState.websocketConnected);
		console.log('轮询状态:', connectionState.pollingActive);

		// 测试指纹安全性
		const fingerprintSafe = testFingerprintSafety();
		console.log('指纹安全性测试结果:', fingerprintSafe);

		// 手动触发一次客户端数量轮询
		if (connectionState.pollingActive) {
			console.log('手动触发客户端数量轮询...');
			const serverUrl = connectionState.serverUrl;
			const token = uni.getStorageSync('token');
			if (serverUrl && token) {
				pollingManager.pollClients(serverUrl, token);
			} else {
				console.error('缺少服务器URL或token');
			}
		} else {
			console.log('轮询未激活，尝试激活轮询...');
			// 尝试从存储中获取服务器配置
			const rawServerConfig = uni.getStorageSync('serverConfig');
			if (rawServerConfig) {
				let serverUrl = '';

				// 根据配置格式构建服务器URL
				if (rawServerConfig.serverHost) {
					// 新格式配置
					const protocol = rawServerConfig.useHttps ? 'https' : 'http';
					const port = rawServerConfig.serverPort ? ':' + rawServerConfig.serverPort : '';
					serverUrl = `${protocol}://${rawServerConfig.serverHost}${port}`;
				} else if (rawServerConfig.url) {
					// 旧格式配置，需要转换WebSocket URL为HTTP URL
					serverUrl = rawServerConfig.url.replace(/^ws/, 'http');
				}

				if (serverUrl) {
					console.log('尝试重新连接到服务器:', serverUrl);
					connect(serverUrl);
				} else {
					console.error('无法构建服务器URL');
				}
			} else {
				console.error('未找到服务器配置');
			}
		}

		uni.showModal({
			title: '在线用户数调试',
			content: `当前在线: ${connectedClients.value}\n连接状态: ${connectionStatus.value}\n轮询: ${connectionState.pollingActive ? '激活' : '未激活'}\nWebSocket: ${
				connectionState.websocketConnected ? '连接' : '断开'
			}`,
			showCancel: false
		});

		console.log('=== 调试结束 ===');
	} catch (error) {
		console.error('调试在线用户数失败:', error);
	}
};

// 在页面调试中测试指纹安全性
const testFingerprintSafety = () => {
	try {
		const fingerprint = getSafeUserFingerprint();
		console.log('=== 指纹安全性测试 ===');
		console.log('生成的指纹:', fingerprint);
		console.log('指纹长度:', fingerprint.length);

		// 测试ASCII安全性
		const isAsciiSafe = /^[a-zA-Z0-9_-]+$/.test(fingerprint);
		console.log('ASCII安全性:', isAsciiSafe ? '✅ 通过' : '❌ 失败');

		// 测试字符码范围
		let hasNonAscii = false;
		for (let i = 0; i < fingerprint.length; i++) {
			const charCode = fingerprint.charCodeAt(i);
			if (charCode > 127) {
				console.log(`❌ 发现非ASCII字符: "${fingerprint[i]}" (码点: ${charCode}) 位置: ${i}`);
				hasNonAscii = true;
			}
		}

		if (!hasNonAscii) {
			console.log('✅ 所有字符都在ASCII范围内');
		}

		console.log('=== 测试结束 ===');
		return isAsciiSafe && !hasNonAscii;
	} catch (error) {
		console.error('指纹安全性测试失败:', error);
		return false;
	}
};

// 测试指纹头发送
const testFingerprintHeader = async () => {
	try {
		console.log('=== 测试指纹头发送 ===');

		const safeUniqueId = getSafeUserFingerprint();
		console.log('当前指纹:', safeUniqueId);

		const token = uni.getStorageSync('token');
		const serverUrl = connectionState.serverUrl;

		if (!serverUrl || !token) {
			console.error('缺少服务器URL或token');
			uni.showModal({
				title: '测试失败',
				content: '缺少服务器URL或token配置',
				showCancel: false
			});
			return;
		}

		// 测试步骤1：基础指纹测试接口
		try {
			console.log('🧪 步骤1: 测试后端指纹接口...');
			const testResponse = await uni.request({
				url: `${serverUrl}/api/test/fingerprint`,
				method: 'GET',
				header: {
					Authorization: `Bearer ${token}`,
					'X-User-Fingerprint': safeUniqueId
				}
			});

			if (testResponse.statusCode === 200) {
				console.log('✅ 后端指纹测试成功:', testResponse.data);
			} else {
				console.log('⚠️ 后端指纹测试响应异常:', testResponse.statusCode, testResponse.data);
			}
		} catch (e) {
			console.log('❌ 后端指纹测试接口不存在或出错:', e.message);
		}

		// 测试步骤2：客户端数量接口
		try {
			console.log('🧪 步骤2: 测试客户端数量接口...');
			const clientsResponse = await uni.request({
				url: `${serverUrl}/api/poll/clients`,
				method: 'GET',
				header: {
					Authorization: `Bearer ${token}`,
					'X-User-Fingerprint': safeUniqueId
				}
			});

			console.log('客户端数量响应:', clientsResponse.data);

			// 测试步骤3：调试指纹详情接口
			try {
				console.log('🧪 步骤3: 测试指纹详情接口...');
				const debugResponse = await uni.request({
					url: `${serverUrl}/api/debug/fingerprints`,
					method: 'GET',
					header: {
						Authorization: `Bearer ${token}`,
						'X-User-Fingerprint': safeUniqueId
					}
				});

				if (debugResponse.statusCode === 200) {
					console.log('✅ 指纹详情获取成功:', debugResponse.data);

					const data = debugResponse.data;
					const fingerprintCount = data.active_fingerprints || 0;
					const websocketCount = data.websocket_clients || 0;

					uni.showModal({
						title: '指纹头测试结果',
						content:
							`指纹: ${safeUniqueId.substring(0, 16)}...\n` +
							`指纹用户数: ${fingerprintCount}\n` +
							`WebSocket数: ${websocketCount}\n` +
							`显示在线数: ${clientsResponse.data?.connected_clients || 0}\n` +
							`后端指纹功能: ${fingerprintCount > 0 ? '✅已实现' : '❌未实现'}`,
						showCancel: false
					});
				} else {
					console.log('⚠️ 指纹详情接口响应异常:', debugResponse.statusCode);
				}
			} catch (e) {
				console.log('❌ 指纹详情接口不存在或出错:', e.message);

				uni.showModal({
					title: '指纹头测试结果',
					content:
						`指纹: ${safeUniqueId.substring(0, 16)}...\n` + `基础测试: 成功\n` + `在线用户数: ${clientsResponse.data?.connected_clients || 0}\n` + `后端指纹功能: ❌需要实现`,
					showCancel: false
				});
			}
		} catch (error) {
			console.error('客户端数量测试失败:', error);
			uni.showModal({
				title: '测试失败',
				content: `网络请求失败：${error.message}`,
				showCancel: false
			});
		}

		console.log('=== 测试结束 ===');
	} catch (error) {
		console.error('测试指纹头失败:', error);
		uni.showModal({
			title: '测试异常',
			content: `测试过程出错：${error.message}`,
			showCancel: false
		});
	}
};

// 切换在线用户数监控
const toggleOnlineMonitor = () => {
	if (monitoringOnline.value) {
		stopOnlineMonitor();
	} else {
		startOnlineMonitor();
	}
};

// 开始监控在线用户数
const startOnlineMonitor = () => {
	try {
		monitoringOnline.value = true;
		onlineHistory.value = [];

		console.log('🔍 开始监控在线用户数...');

		// 立即记录一次
		recordOnlineCount();

		// 每10秒记录一次
		const monitorInterval = setInterval(() => {
			if (!monitoringOnline.value) {
				clearInterval(monitorInterval);
				return;
			}
			recordOnlineCount();
		}, 10000);

		// 保存定时器ID到全局，以便停止时清理
		window.onlineMonitorInterval = monitorInterval;

		uni.showToast({
			title: '开始监控在线用户数',
			icon: 'none',
			duration: 2000
		});
	} catch (error) {
		console.error('启动在线监控失败:', error);
	}
};

// 停止监控在线用户数
const stopOnlineMonitor = () => {
	try {
		monitoringOnline.value = false;

		if (window.onlineMonitorInterval) {
			clearInterval(window.onlineMonitorInterval);
			window.onlineMonitorInterval = null;
		}

		console.log('📊 在线用户数监控已停止');
		console.log('📈 监控历史:', onlineHistory.value);

		// 分析监控结果
		if (onlineHistory.value.length > 0) {
			const counts = onlineHistory.value.map((item) => item.count);
			const minCount = Math.min(...counts);
			const maxCount = Math.max(...counts);
			const avgCount = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);

			uni.showModal({
				title: '监控结果',
				content: `监控时长: ${onlineHistory.value.length * 10}秒\n最小值: ${minCount}\n最大值: ${maxCount}\n平均值: ${avgCount}\n\n${
					minCount === maxCount ? '用户数稳定' : '用户数有变化'
				}`,
				showCancel: false
			});
		}
	} catch (error) {
		console.error('停止在线监控失败:', error);
	}
};

// 记录当前在线用户数
const recordOnlineCount = () => {
	try {
		const currentTime = new Date().toLocaleTimeString();
		const currentCount = connectedClients.value;

		const record = {
			time: currentTime,
			count: currentCount,
			timestamp: Date.now()
		};

		onlineHistory.value.push(record);

		// 保持最近20条记录
		if (onlineHistory.value.length > 20) {
			onlineHistory.value.shift();
		}

		console.log(`📊 [${currentTime}] 在线用户数: ${currentCount}`);

		// 检测用户数变化
		if (onlineHistory.value.length >= 2) {
			const prevCount = onlineHistory.value[onlineHistory.value.length - 2].count;
			if (currentCount !== prevCount) {
				console.log(`📈 用户数变化: ${prevCount} → ${currentCount}`);
			}
		}
	} catch (error) {
		console.error('记录在线用户数失败:', error);
	}
};

// 后端修复提醒
const showBackendFixReminder = () => {
	uni.showModal({
		title: '开发提醒',
		content: '后端需要实现以下功能：\n1. 处理X-User-Fingerprint头部\n2. 基于指纹统计在线用户\n3. 在所有API响应中返回connected_clients字段\n\n当前显示为模拟数据',
		showCancel: true,
		cancelText: '知道了',
		confirmText: '查看日志',
		success: (res) => {
			if (res.confirm) {
				console.log('=== 后端修复清单 ===');
				console.log('1. 在Flask应用中添加用户指纹处理');
				console.log('2. 实现在线用户缓存/存储机制');
				console.log('3. 在/api/poll/clients等接口返回真实用户数');
				console.log('4. 处理用户进入/离开事件');
				console.log('=== 清单结束 ===');
			}
		}
	});
};
</script>

<style scoped>
.music-player {
	min-height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	flex-direction: column;
}

.header {
	background: rgba(255, 255, 255, 0.1);
	padding: 60rpx 40rpx 30rpx;
	backdrop-filter: blur(10rpx);
}

.header-content {
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 20rpx;
}

.header-title {
	font-size: 44rpx;
	font-weight: bold;
	color: #fff;
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 20rpx;
	flex-wrap: wrap;
}

.online-badge {
	display: flex;
	align-items: center;
	gap: 10rpx;
	background: rgba(255, 255, 255, 0.2);
	padding: 12rpx 20rpx;
	border-radius: 40rpx;
}

.user-icon {
	font-size: 28rpx;
}

.user-count {
	font-size: 32rpx;
	font-weight: bold;
	color: #fff;
}

.badge-text {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.9);
}

.logout-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(255, 71, 87, 0.3);
	color: #fff;
	border: none;
	border-radius: 30rpx;
	padding: 12rpx 20rpx;
	font-size: 24rpx;
}

.btn-icon {
	font-size: 28rpx;
}

.btn-text {
	font-size: 24rpx;
}

.debug-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(255, 193, 7, 0.3);
	color: #fff;
	border: none;
	border-radius: 30rpx;
	padding: 12rpx 20rpx;
	font-size: 24rpx;
	margin-left: 10rpx;
}

.fingerprint-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(108, 117, 125, 0.3);
	color: #fff;
	border: none;
	border-radius: 30rpx;
	padding: 12rpx 20rpx;
	font-size: 24rpx;
	margin-left: 10rpx;
}

.clear-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(220, 53, 69, 0.3);
	color: #fff;
	border: none;
	border-radius: 30rpx;
	padding: 12rpx 20rpx;
	font-size: 24rpx;
	margin-left: 10rpx;
}

.system-test-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(0, 123, 255, 0.3);
	color: #fff;
	border: none;
	border-radius: 30rpx;
	padding: 12rpx 20rpx;
	font-size: 24rpx;
	margin-left: 10rpx;
}

.monitor-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(40, 167, 69, 0.3);
	color: #fff;
	border: none;
	border-radius: 30rpx;
	padding: 12rpx 20rpx;
	font-size: 24rpx;
	margin-left: 10rpx;
}

.users-detail-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(102, 126, 234, 0.3);
	color: #fff;
	border: none;
	border-radius: 30rpx;
	padding: 12rpx 20rpx;
	font-size: 24rpx;
	margin-left: 10rpx;
}

.cleanup-users-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(255, 87, 34, 0.3);
	color: #fff;
	border: none;
	border-radius: 30rpx;
	padding: 12rpx 20rpx;
	font-size: 24rpx;
	margin-left: 10rpx;
}

.player-section {
	flex-shrink: 0;
	padding: 40rpx;
}

.player-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 24rpx;
	padding: 40rpx;
	box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
	backdrop-filter: blur(10rpx);
}

.current-song {
	text-align: center;
	margin-bottom: 40rpx;
}

.song-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	display: block;
	margin-bottom: 10rpx;
}

.status-info {
	display: flex;
	flex-direction: column;
	gap: 5rpx;
}

.status-info {
	display: flex;
	flex-direction: column;
	gap: 5rpx;
}

.connection-status {
	font-size: 24rpx;
	color: #999;
	display: block;
}

.user-fingerprint {
	font-size: 22rpx;
	color: #ccc;
	display: block;
}

.user-fingerprint {
	font-size: 22rpx;
	color: #ccc;
	display: block;
}

.progress-section {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-bottom: 40rpx;
}

.time {
	font-size: 24rpx;
	color: #666;
	width: 80rpx;
	text-align: center;
}

.progress-slider {
	flex: 1;
}

.controls {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 30rpx;
}

.control-btn,
.play-btn {
	width: 80rpx;
	height: 80rpx;
	background: #f8f9fa;
	border: 2rpx solid #eee;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
}

.play-btn {
	width: 100rpx;
	height: 100rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border: none;
	font-size: 40rpx;
}

.play-btn:disabled {
	background: #ccc;
}

.control-btn:disabled {
	background: #f5f5f5;
	color: #ccc;
	border-color: #f0f0f0;
}

.shuffle-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(103, 126, 234, 0.1);
	color: #667eea;
	border: 2rpx solid rgba(103, 126, 234, 0.3);
	border-radius: 30rpx;
	padding: 16rpx 24rpx;
	font-size: 24rpx;
}

.shuffle-btn:disabled {
	background: #f5f5f5;
	color: #ccc;
	border-color: #f0f0f0;
}

.playlist-section {
	flex: 1;
	background: rgba(255, 255, 255, 0.95);
	margin: 0 40rpx 40rpx;
	border-radius: 24rpx 24rpx 0 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.playlist-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 30rpx 40rpx;
	border-bottom: 1rpx solid #eee;
	background: #fff;
}

.playlist-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.upload-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border: none;
	border-radius: 30rpx;
	padding: 16rpx 24rpx;
	font-size: 24rpx;
}

.playlist-content {
	flex: 1;
	overflow: hidden;
}

.empty-playlist {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx 40rpx;
	text-align: center;
}

.empty-icon {
	font-size: 120rpx;
	margin-bottom: 30rpx;
}

.empty-text {
	font-size: 32rpx;
	color: #666;
	margin-bottom: 15rpx;
	display: block;
}

.empty-tip {
	font-size: 24rpx;
	color: #999;
	display: block;
}

.song-list {
	height: 600rpx;
}

.song-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 25rpx 40rpx;
	border-bottom: 1rpx solid #f5f5f5;
	transition: background-color 0.3s ease;
}

.song-item.active {
	background: rgba(103, 126, 234, 0.1);
	border-bottom-color: rgba(103, 126, 234, 0.3);
}

.song-info {
	display: flex;
	align-items: center;
	gap: 20rpx;
	flex: 1;
}

.song-index {
	width: 60rpx;
	text-align: center;
	font-size: 28rpx;
	color: #999;
}

.song-details {
	flex: 1;
}

.song-name {
	font-size: 30rpx;
	color: #333;
	display: block;
	margin-bottom: 8rpx;
}

.song-format {
	font-size: 22rpx;
	color: #999;
	display: block;
}

.song-actions {
	display: flex;
	align-items: center;
	gap: 15rpx;
}

.playing-indicator {
	width: 50rpx;
	height: 50rpx;
	background: rgba(46, 213, 115, 0.2);
	border: 2rpx solid rgba(46, 213, 115, 0.5);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20rpx;
}

.delete-btn {
	width: 50rpx;
	height: 50rpx;
	background: rgba(255, 71, 87, 0.1);
	border: 2rpx solid rgba(255, 71, 87, 0.3);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20rpx;
}

/* 上传对话框 */
.upload-dialog {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
}

.dialog-mask {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
}

.dialog-content {
	background: #fff;
	border-radius: 24rpx;
	margin: 40rpx;
	max-width: 600rpx;
	width: 100%;
	position: relative;
	z-index: 1001;
}

.dialog-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 40rpx 40rpx 20rpx;
	border-bottom: 1rpx solid #eee;
}

.dialog-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
}

.dialog-close {
	width: 60rpx;
	height: 60rpx;
	background: #f5f5f5;
	border: none;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24rpx;
	color: #999;
}

.dialog-body {
	padding: 40rpx;
	text-align: center;
}

.upload-tips {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 40rpx;
	display: block;
}

.file-select-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 15rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border: none;
	border-radius: 16rpx;
	padding: 30rpx 60rpx;
	font-size: 32rpx;
	width: 100%;
}

.select-icon {
	font-size: 36rpx;
}
</style>
