from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
import os
import json
import random
import jwt
import hashlib
from datetime import datetime, timedelta
from functools import wraps
import secrets
from urllib.parse import unquote
import traceback
import tempfile
import time

app = Flask(__name__)
# 优化CORS配置，允许所有方法和头部
CORS(app, origins=["*"], supports_credentials=True, allow_headers="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# 使用固定的SECRET_KEY，确保重启后token仍然有效
SECRET_KEY_FILE = './secret_key.txt'
if os.path.exists(SECRET_KEY_FILE):
    with open(SECRET_KEY_FILE, 'r') as f:
        app.config['SECRET_KEY'] = f.read().strip()
else:
    # 首次启动，生成并保存SECRET_KEY
    secret_key = secrets.token_hex(32)
    with open(SECRET_KEY_FILE, 'w') as f:
        f.write(secret_key)
    app.config['SECRET_KEY'] = secret_key
    print(f"首次启动，已生成并保存SECRET_KEY")

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# 配置
MUSIC_DIR = '../music/storage'  # 音乐文件存储路径
INFO_FILE = '../music/songs.json'  # 存储音乐信息的JSON文件
AUTH_FILE = './auth.json'  # 存储密码的文件
UPLOAD_FOLDER = MUSIC_DIR
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 全局变量
playlist = []
current_index = 0
is_playing = False
current_position = 0  # 当前播放位置（秒）
last_update_time = datetime.now()

# 连接的客户端
connected_clients = set()  # WebSocket连接的sid
active_fingerprints = {}   # 基于指纹的活跃用户 {fingerprint: last_seen_time}
client_fingerprints = {}   # 客户端SID到指纹的映射 {sid: fingerprint}

# 初始化认证文件
def initialize_auth():
    if not os.path.exists(AUTH_FILE):
        # 创建默认强密码
        default_password = "MusicTogether2024!@#"
        hashed_password = hashlib.sha256(default_password.encode()).hexdigest()
        auth_data = {
            "password_hash": hashed_password,
            "created_at": datetime.now().isoformat(),
            "online_users": {},  # 在线用户记录 {user_id: {login_time, last_seen, user_agent, ip, fingerprint}}
            "login_history": []  # 登录历史记录
        }
        with open(AUTH_FILE, 'w', encoding='utf-8') as f:
            json.dump(auth_data, f, ensure_ascii=False, indent=4)
        print(f"🔑 默认密码: {default_password}")
    else:
        # 确保现有文件包含必要的字段
        try:
            auth_data = load_auth_data()
            if 'online_users' not in auth_data:
                auth_data['online_users'] = {}
            if 'login_history' not in auth_data:
                auth_data['login_history'] = []
            if 'password_hash' not in auth_data:
                # 如果缺少密码，重新设置默认密码
                default_password = "MusicTogether2024!@#"
                auth_data['password_hash'] = hashlib.sha256(default_password.encode()).hexdigest()
                print(f"🔑 恢复默认密码: {default_password}")
            save_auth_data(auth_data)
        except Exception as e:
            print(f"⚠️ 修复认证文件失败: {e}")
            # 如果文件损坏，重新创建
            initialize_auth()

# 加载认证数据
def load_auth_data():
    try:
        with open(AUTH_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

# 保存认证数据（跨平台文件安全写入）
import tempfile
import shutil
import time

def save_auth_data(auth_data):
    """
    跨平台的安全文件写入，使用临时文件 + 原子操作
    """
    max_retries = 3
    retry_delay = 0.1
    
    for attempt in range(max_retries):
        try:
            # 创建临时文件
            temp_dir = os.path.dirname(AUTH_FILE)
            temp_file = tempfile.NamedTemporaryFile(
                mode='w', 
                delete=False, 
                suffix='.tmp',
                dir=temp_dir,
                encoding='utf-8'
            )
            
            # 写入数据到临时文件
            json.dump(auth_data, temp_file, ensure_ascii=False, indent=4)
            temp_file.flush()
            temp_file.close()
            
            # 原子性替换原文件
            if os.path.exists(AUTH_FILE):
                # Windows 需要先删除目标文件
                backup_file = AUTH_FILE + '.backup'
                if os.path.exists(backup_file):
                    os.unlink(backup_file)
                os.rename(AUTH_FILE, backup_file)
            
            os.rename(temp_file.name, AUTH_FILE)
            
            # 删除备份文件
            if os.path.exists(AUTH_FILE + '.backup'):
                os.unlink(AUTH_FILE + '.backup')
            
            return True
            
        except Exception as e:
            print(f"⚠️ 保存认证数据失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            
            # 清理临时文件
            try:
                if 'temp_file' in locals() and os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)
            except:
                pass
            
            # 如果不是最后一次尝试，等待后重试
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2  # 指数退避
            else:
                # 尝试恢复备份文件
                backup_file = AUTH_FILE + '.backup'
                if os.path.exists(backup_file) and not os.path.exists(AUTH_FILE):
                    try:
                        os.rename(backup_file, AUTH_FILE)
                        print("📁 已从备份恢复认证文件")
                    except:
                        pass
                return False
    
    return False

# 从完整指纹中提取用户标识符
def extract_user_id(fingerprint):
    """
    从指纹中提取用户标识符
    例如: fp_671027912_mcd2sekw -> fp_671027912
    """
    if not fingerprint:
        return 'unknown'
    
    # 分割指纹，取前两部分
    parts = fingerprint.split('_')
    if len(parts) >= 3:
        return f"{parts[0]}_{parts[1]}"
    return fingerprint

# 记录用户登录
def record_user_login(fingerprint, user_agent=None, ip=None):
    auth_data = load_auth_data()
    
    if 'online_users' not in auth_data:
        auth_data['online_users'] = {}
    if 'login_history' not in auth_data:
        auth_data['login_history'] = []
    
    # 提取用户ID
    user_id = extract_user_id(fingerprint)
    current_time = datetime.now().isoformat()
    
    user_info = {
        'login_time': current_time,
        'last_seen': current_time,
        'user_agent': user_agent or 'Unknown',
        'ip': ip or 'Unknown',
        'fingerprint': fingerprint,
        'user_id': user_id
    }
    
    # 使用用户ID作为键，避免重复计数
    auth_data['online_users'][user_id] = user_info
    
    save_auth_data(auth_data)
    print(f"✅ 用户登录: {user_id}")

# 更新用户最后活跃时间
def update_user_activity(fingerprint):
    auth_data = load_auth_data()
    
    if 'online_users' not in auth_data:
        auth_data['online_users'] = {}
    
    user_id = extract_user_id(fingerprint)
    
    if user_id in auth_data['online_users']:
        auth_data['online_users'][user_id]['last_seen'] = datetime.now().isoformat()
        # 更新完整指纹信息
        auth_data['online_users'][user_id]['fingerprint'] = fingerprint
        save_auth_data(auth_data)

# 移除离线用户
def remove_offline_user(fingerprint):
    auth_data = load_auth_data()
    
    if 'online_users' not in auth_data:
        return
    
    user_id = extract_user_id(fingerprint)
    
    if user_id in auth_data['online_users']:
        del auth_data['online_users'][user_id]
        save_auth_data(auth_data)
        print(f"❌ 用户离线: {user_id}")

# 清理过期的在线用户（超过30秒无心跳）
def cleanup_expired_users():
    auth_data = load_auth_data()
    
    if 'online_users' not in auth_data:
        return 0
    
    if 'login_history' not in auth_data:
        auth_data['login_history'] = []
    
    current_time = datetime.now()
    expired_users = []
    
    for user_id, user_info in auth_data['online_users'].items():
        try:
            last_seen = datetime.fromisoformat(user_info['last_seen'])
            if (current_time - last_seen).total_seconds() > 30:  # 30秒超时
                expired_users.append(user_id)
        except:
            expired_users.append(user_id)  # 无效的时间格式也移除
    
    # 将过期用户移动到历史记录
    for user_id in expired_users:
        user_info = auth_data['online_users'][user_id]
        
        # 添加到登录历史
        logout_record = {
            'user_id': user_id,
            'fingerprint': user_info.get('fingerprint', ''),
            'login_time': user_info.get('login_time', ''),
            'logout_time': current_time.isoformat(),
            'last_seen': user_info.get('last_seen', ''),
            'user_agent': user_info.get('user_agent', 'Unknown'),
            'ip': user_info.get('ip', 'Unknown'),
            'session_duration': ''
        }
        
        # 计算会话持续时间
        try:
            login_time = datetime.fromisoformat(user_info.get('login_time', ''))
            session_duration = (current_time - login_time).total_seconds()
            logout_record['session_duration'] = f"{session_duration:.0f} 秒"
        except:
            logout_record['session_duration'] = 'Unknown'
        
        auth_data['login_history'].append(logout_record)
        
        # 从在线用户中移除
        del auth_data['online_users'][user_id]
        print(f"⏰ 用户超时离线: {user_id} (会话: {logout_record['session_duration']})")
    
    # 保留最近500条登录历史
    if len(auth_data['login_history']) > 500:
        auth_data['login_history'] = auth_data['login_history'][-500:]
    
    if expired_users:
        save_auth_data(auth_data)
    
    return len(expired_users)

# 获取在线用户数和详细信息
def get_online_users_info():
    # 先清理过期用户
    cleanup_expired_users()
    
    auth_data = load_auth_data()
    online_users = auth_data.get('online_users', {})
    
    return {
        'count': len(online_users),
        'users': online_users,
        'websocket_connections': len(connected_clients)
    }

# 验证密码
def verify_password(password):
    try:
        auth_data = load_auth_data()
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        return password_hash == auth_data.get('password_hash', '')
    except:
        return False

# 生成token
def generate_token(user_id='user'):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=30),  # 30天有效期
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

# 验证token装饰器
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            
            # 不再在这里自动更新用户活跃时间，由心跳接口负责
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(*args, **kwargs)
    return decorated

# 从目录加载歌曲
def load_songs_from_storage():
    if not os.path.exists(UPLOAD_FOLDER):
        return []
    files = os.listdir(UPLOAD_FOLDER)
    return [
        {"name": os.path.splitext(file)[0], "filename": file, "order": idx, "format": os.path.splitext(file)[1][1:]}
        for idx, file in enumerate(files) if os.path.splitext(file)[1].lower() in ['.mp3', '.wav', '.flac', '.m4a']
    ]

# 同步文件夹和JSON文件
def synchronize_with_storage():
    global playlist
    if not os.path.exists(UPLOAD_FOLDER):
        playlist = []
        save_to_json()
        return
        
    files_in_storage = set(file for file in os.listdir(UPLOAD_FOLDER))
    files_in_playlist = set(f"{song['name']}.{song['format']}" for song in playlist)

    # 找出新增和缺失的文件
    new_files = files_in_storage - files_in_playlist
    missing_files = files_in_playlist - files_in_storage

    # 添加新增的文件
    for file in new_files:
        if os.path.splitext(file)[1].lower() in ['.mp3', '.wav', '.flac', '.m4a']:
            playlist.append({
                "name": os.path.splitext(file)[0],
                "order": len(playlist),
                "format": os.path.splitext(file)[1][1:]
            })

    # 移除缺失的文件
    playlist = [song for song in playlist if f"{song['name']}.{song['format']}" not in missing_files]

    # 按顺序排序并保存
    playlist.sort(key=lambda x: x['order'])
    save_to_json()

# 初始化播放列表
def initialize_playlist():
    global playlist, current_index, is_playing

    if not os.path.exists(INFO_FILE):
        playlist = load_songs_from_storage()
        current_index = 0
        is_playing = False
        save_to_json()
        synchronize_with_storage()
    else:
        try:
            synchronize_with_storage()
            with open(INFO_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                playlist = data.get('playlist', [])
                current_index = data.get('current_index', 0)
                is_playing = data.get('is_playing', False)
        except (json.JSONDecodeError, FileNotFoundError):
            print("JSON 文件无效或为空，重新初始化...")
            playlist = load_songs_from_storage()
            current_index = 0
            is_playing = False
            save_to_json()

# 保存当前状态到JSON文件
def save_to_json():
    data = {
        "playlist": sorted(playlist, key=lambda x: x['order']),
        "current_index": current_index,
        "is_playing": is_playing,
        "current_position": current_position,
        "last_update_time": last_update_time.isoformat()
    }
    with open(INFO_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# 广播状态更新
def broadcast_state():
    online_info = get_online_users_info()
    state = {
        "playlist": sorted(playlist, key=lambda x: x['order']),
        "current_index": current_index,
        "is_playing": is_playing,
        "current_position": current_position,
        "connected_clients": online_info['count'],  # 使用实际的在线用户数
        "websocket_connections": online_info['websocket_connections'],
        "timestamp": datetime.now().isoformat()
    }
    socketio.emit('state_update', state)
    save_to_json()

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        # 预检请求直接返回200
        return '', 200
    data = request.get_json()
    password = data.get('password')
    
    if not password:
        return jsonify({'error': '密码不能为空'}), 400
    
    if verify_password(password):
        # 获取用户指纹
        fingerprint = request.headers.get('X-User-Fingerprint', 'unknown')
        user_id = extract_user_id(fingerprint)
        
        token = generate_token()
        
        print(f"🔐 用户登录: {user_id}")
        
        return jsonify({
            'token': token,
            'message': '登录成功',
            'expires_in': 30 * 24 * 3600,  # 30天，秒为单位
            'user_id': user_id,  # 返回简化的用户ID
            'heartbeat_interval': 10  # 告知客户端心跳间隔
        })
    else:
        return jsonify({'error': '密码错误'}), 401

# 新增/login路由，兼容前端直接请求/login
@app.route('/login', methods=['POST', 'OPTIONS'])
def login_compat():
    # 复用/api/login逻辑
    return login()

@app.route('/api/verify-token', methods=['POST'])
@token_required
def verify_token():
    return jsonify({'message': 'Token有效'})

@app.route('/api/token-status', methods=['GET'])
def check_token_status():
    """
    检查token状态，不使用@token_required装饰器
    返回token的详细状态信息
    """
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({
            'valid': False, 
            'error': 'Token is missing',
            'need_login': True
        }), 200  # 返回200而不是401，让前端处理
    
    try:
        if token.startswith('Bearer '):
            token = token[7:]
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        
        # 检查token是否即将过期（24小时内）
        exp_timestamp = data.get('exp', 0)
        current_timestamp = datetime.utcnow().timestamp()
        expires_soon = (exp_timestamp - current_timestamp) < 24 * 3600  # 24小时
        
        return jsonify({
            'valid': True,
            'user_id': data.get('user_id', 'unknown'),
            'expires_at': datetime.fromtimestamp(exp_timestamp).isoformat(),
            'expires_soon': expires_soon,
            'need_login': False
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({
            'valid': False,
            'error': 'Token has expired',
            'need_login': True
        }), 200
    except jwt.InvalidTokenError as e:
        return jsonify({
            'valid': False,
            'error': f'Token is invalid: {str(e)}',
            'need_login': True
        }), 200

# 音频文件服务路由
@app.route('/api/music/storage/<path:filename>', methods=['GET'])
def serve_audio_file(filename):
    """
    提供音频文件服务，支持URL解码和详细日志输出
    支持两种文件名格式：
    1. 直接的filename（如 "song.mp3"）
    2. name.format格式（如 "song.mp3"）
    """
    try:
        # 手动验证token - 支持查询参数和Authorization头
        token = request.args.get('token') or request.headers.get('Authorization')
        if not token:
            print(f"[音频文件服务] 错误: Token缺失")
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            print(f"[音频文件服务] Token验证成功，用户: {data.get('user_id', 'unknown')}")
        except jwt.ExpiredSignatureError:
            print(f"[音频文件服务] 错误: Token已过期")
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError as e:
            print(f"[音频文件服务] 错误: Token无效 - {str(e)}")
            return jsonify({'error': 'Token is invalid'}), 401
        
        # URL解码文件名
        decoded_filename = unquote(filename)
        print(f"[音频文件服务] 原始filename: {filename}")
        print(f"[音频文件服务] 解码后filename: {decoded_filename}")
        
        # 构建完整文件路径
        file_path = os.path.join(MUSIC_DIR, decoded_filename)
        print(f"[音频文件服务] MUSIC_DIR: {MUSIC_DIR}")
        print(f"[音频文件服务] 查找文件路径: {file_path}")
        print(f"[音频文件服务] 文件路径绝对路径: {os.path.abspath(file_path)}")
        
        # 检查文件是否存在
        if not os.path.exists(file_path):
            print(f"[音频文件服务] 错误: 文件不存在 - {file_path}")
            
            # 列出目录中的所有文件用于调试
            if os.path.exists(MUSIC_DIR):
                files_in_dir = os.listdir(MUSIC_DIR)
                print(f"[音频文件服务] 目录 {MUSIC_DIR} 中的文件: {files_in_dir}")
                
                # 尝试模糊匹配文件名（忽略大小写）
                decoded_lower = decoded_filename.lower()
                for file_in_dir in files_in_dir:
                    if file_in_dir.lower() == decoded_lower:
                        print(f"[音频文件服务] 找到大小写不匹配的文件: {file_in_dir}")
                        # 使用找到的文件名
                        file_path = os.path.join(MUSIC_DIR, file_in_dir)
                        decoded_filename = file_in_dir
                        break
                else:
                    print(f"[音频文件服务] 未找到匹配的文件，请求的文件: {decoded_filename}")
                    return jsonify({'error': 'File not found'}), 404
            else:
                print(f"[音频文件服务] 错误: 音乐目录不存在 - {MUSIC_DIR}")
                return jsonify({'error': 'Music directory not found'}), 404
        
        # 检查是否是文件（而不是目录）
        if not os.path.isfile(file_path):
            print(f"[音频文件服务] 错误: 路径不是文件 - {file_path}")
            return jsonify({'error': 'Path is not a file'}), 404
        
        # 获取文件信息
        file_size = os.path.getsize(file_path)
        print(f"[音频文件服务] 文件大小: {file_size} 字节")
        
        # 确定Content-Type
        content_type = 'audio/mpeg'  # 默认
        file_ext = os.path.splitext(decoded_filename)[1].lower()
        if file_ext == '.wav':
            content_type = 'audio/wav'
        elif file_ext == '.flac':
            content_type = 'audio/flac'
        elif file_ext == '.m4a':
            content_type = 'audio/mp4'
        elif file_ext == '.ogg':
            content_type = 'audio/ogg'
        
        print(f"[音频文件服务] 文件扩展名: {file_ext}, Content-Type: {content_type}")
        print(f"[音频文件服务] 开始发送文件: {decoded_filename}")
        
        # 发送文件
        return send_from_directory(
            directory=os.path.abspath(MUSIC_DIR),
            path=decoded_filename,  # 使用解码后的文件名
            mimetype=content_type,
            as_attachment=False,
            conditional=True  # 支持Range请求，用于音频流
        )
        
    except Exception as e:
        print(f"[音频文件服务] 异常: {str(e)}")
        print(f"[音频文件服务] 异常类型: {type(e).__name__}")
        print(f"[音频文件服务] 异常堆栈: {traceback.format_exc()}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# 调试路由 - 检查音乐目录和播放列表状态
@app.route('/api/debug/storage', methods=['GET'])
@token_required
def debug_storage():
    """
    调试路由，检查音乐目录和播放列表状态
    """
    try:
        debug_info = {
            'MUSIC_DIR': MUSIC_DIR,
            'MUSIC_DIR_abs': os.path.abspath(MUSIC_DIR),
            'MUSIC_DIR_exists': os.path.exists(MUSIC_DIR),
            'files_in_storage': [],
            'playlist': playlist,
            'current_index': current_index,
            'is_playing': is_playing
        }
        
        if os.path.exists(MUSIC_DIR):
            files = os.listdir(MUSIC_DIR)
            for file in files:
                file_path = os.path.join(MUSIC_DIR, file)
                debug_info['files_in_storage'].append({
                    'filename': file,
                    'is_file': os.path.isfile(file_path),
                    'size': os.path.getsize(file_path) if os.path.isfile(file_path) else 0,
                    'extension': os.path.splitext(file)[1].lower()
                })
        
        print(f"[调试] 存储目录信息: {debug_info}")
        return jsonify(debug_info)
        
    except Exception as e:
        print(f"[调试] 异常: {str(e)}")
        return jsonify({'error': f'Debug error: {str(e)}'}), 500

# 播放列表相关路由
@app.route('/api/songs', methods=['GET'])
@token_required
def get_songs():
    online_info = get_online_users_info()
    return jsonify({
        "playlist": sorted(playlist, key=lambda x: x['order']),
        "current_index": current_index,
        "is_playing": is_playing,
        "current_position": current_position,
        "connected_clients": online_info['count'],
        "websocket_connections": online_info['websocket_connections']
    })

@app.route('/api/upload', methods=['POST'])
@token_required
def upload_song():
    print(f"[文件上传] 收到上传请求")
    
    if 'file' not in request.files:
        print(f"[文件上传] 错误: 请求中没有文件部分")
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        print(f"[文件上传] 错误: 没有选择文件")
        return jsonify({'error': 'No selected file'}), 400

    print(f"[文件上传] 文件名: {file.filename}")
    
    # 检查文件格式
    allowed_extensions = {'.mp3', '.wav', '.flac', '.m4a'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    print(f"[文件上传] 文件扩展名: {file_ext}")
    
    if file_ext not in allowed_extensions:
        print(f"[文件上传] 错误: 不支持的文件格式 - {file_ext}")
        return jsonify({'error': '不支持的文件格式'}), 400

    filename = file.filename
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    print(f"[文件上传] 保存路径: {file_path}")
    
    try:
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        print(f"[文件上传] 文件保存成功，大小: {file_size} 字节")
        
        # 同步存储并广播状态
        synchronize_with_storage()
        broadcast_state()
        
        print(f"[文件上传] 播放列表已更新，当前歌曲数: {len(playlist)}")
        return jsonify({'message': 'Upload successful', 'filename': filename, 'size': file_size})
        
    except Exception as e:
        print(f"[文件上传] 异常: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@app.route('/api/delete/<int:index>', methods=['DELETE'])
@token_required
def delete_song(index):
    global playlist, current_index
    
    print(f"[删除歌曲] 收到删除请求，索引: {index}")
    print(f"[删除歌曲] 当前播放列表长度: {len(playlist)}")
    
    if 0 <= index < len(playlist):
        song = playlist[index]
        print(f"[删除歌曲] 要删除的歌曲: {song['name']}.{song['format']}")
        
        # 构建文件路径 - 使用实际存储的文件名格式
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{song['name']}.{song['format']}")
        print(f"[删除歌曲] 文件路径: {file_path}")
        
        # 检查文件是否存在并删除
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"[删除歌曲] 文件删除成功: {file_path}")
            except Exception as e:
                print(f"[删除歌曲] 文件删除失败: {str(e)}")
                return jsonify({'error': f'Failed to delete file: {str(e)}'}), 500
        else:
            print(f"[删除歌曲] 警告: 文件不存在 - {file_path}")
            # 列出目录中的文件以便调试
            if os.path.exists(app.config['UPLOAD_FOLDER']):
                files_in_dir = os.listdir(app.config['UPLOAD_FOLDER'])
                print(f"[删除歌曲] 目录中的文件: {files_in_dir}")
        
        # 从播放列表中移除
        removed_song = playlist.pop(index)
        print(f"[删除歌曲] 从播放列表移除: {removed_song}")
        
        # 调整当前索引
        old_current_index = current_index
        if current_index >= index:
            current_index = max(0, current_index - 1)
        print(f"[删除歌曲] 当前播放索引调整: {old_current_index} -> {current_index}")
        
        # 重新排序
        for i, song in enumerate(playlist):
            song['order'] = i
        
        print(f"[删除歌曲] 播放列表重新排序完成，剩余歌曲数: {len(playlist)}")
        
        # 广播状态更新
        broadcast_state()
        
        return jsonify({
            'message': 'Delete successful',
            'deleted_song': removed_song['name'],
            'remaining_count': len(playlist),
            'new_current_index': current_index
        })
    else:
        print(f"[删除歌曲] 错误: 无效的索引 {index}，播放列表长度: {len(playlist)}")
        return jsonify({'error': 'Song not found'}), 404

@app.route('/api/play/<int:index>', methods=['POST'])
@token_required
def play_song(index):
    global current_index, is_playing, current_position, last_update_time
    if 0 <= index < len(playlist):
        current_index = index
        is_playing = True
        current_position = 0
        last_update_time = datetime.now()
        broadcast_state()
          # 从Authorization头获取token
        token = request.headers.get('Authorization', '')
        if token.startswith('Bearer '):
            token = token[7:]
        
        # 动态构建音频URL
        host = request.host
        scheme = 'https' if request.is_secure else 'http'
        audio_url = f"{scheme}://{host}/api/music/storage/{playlist[index]['name']}.{playlist[index]['format']}?token={token}"
            
        return jsonify({
            "url": audio_url,
            "message": "播放成功"
        })
    return jsonify({'error': 'Invalid song index'}), 400

@app.route('/api/pause', methods=['POST'])
@token_required
def pause_song():
    global is_playing
    is_playing = False
    broadcast_state()
    return jsonify({'message': 'Paused song'})

@app.route('/api/resume', methods=['POST'])
@token_required
def resume_song():
    global is_playing, last_update_time
    is_playing = True
    last_update_time = datetime.now()
    broadcast_state()
    return jsonify({'message': 'Resumed song'})

@app.route('/api/prev', methods=['POST'])
@token_required
def prev_song():
    global current_index
    if current_index > 0:
        current_index -= 1
    else:
        current_index = len(playlist) - 1 if playlist else 0
    return play_song(current_index)

@app.route('/api/next', methods=['POST'])
@token_required
def next_song():
    global current_index
    if current_index < len(playlist) - 1:
        current_index += 1
    else:
        current_index = 0
    return play_song(current_index)

@app.route('/api/shuffle', methods=['POST'])
@token_required
def shuffle_playlist():
    global playlist, current_index, is_playing, current_position, last_update_time
    if not playlist:
        return jsonify({'error': 'Playlist is empty'}), 400
        
    random.shuffle(playlist)
    for i, song in enumerate(playlist):
        song['order'] = i
    
    # 重置播放状态，从第一首开始播放
    current_index = 0
    is_playing = True
    current_position = 0
    last_update_time = datetime.now()
    
    save_to_json()
    broadcast_state()
    
    return jsonify({
        'message': 'Playlist shuffled and playing first song',
        'current_song': playlist[0]['name'] if playlist else None,
        'current_index': current_index,
        'is_playing': is_playing
    })

@app.route('/api/sync-position', methods=['POST'])
@token_required
def sync_position():
    global current_position, last_update_time
    data = request.get_json()
    current_position = data.get('position', 0)
    last_update_time = datetime.now()
    socketio.emit('position_sync', {
        'position': current_position,
        'timestamp': last_update_time.isoformat()
    })
    return jsonify({'message': 'Position synced'})

@app.route('/api/poll/update-position', methods=['POST'])
@token_required
def poll_update_position():
    """
    轮询接口：更新当前播放位置
    用于不支持WebSocket的客户端更新播放位置
    """
    global current_position, last_update_time
    data = request.get_json()
    new_position = data.get('position', 0)
    
    # 只有在位置变化较大时才更新，与WebSocket的同步逻辑一致
    if abs(new_position - current_position) > 1:
        current_position = new_position
        last_update_time = datetime.now()
        # 通过WebSocket广播新位置，确保所有客户端都能同步
        socketio.emit('position_sync', {
            'position': current_position,
            'timestamp': last_update_time.isoformat()
        }, room='music_room')
        return jsonify({'message': 'Position updated and broadcasted', 'success': True})
    
    return jsonify({'message': 'No significant change in position', 'success': True})

@app.route('/api/poll/update-play-state', methods=['POST'])
@token_required
def poll_update_play_state():
    """
    轮询接口：更新播放状态(播放/暂停)
    用于不支持WebSocket的客户端更新播放状态
    """
    global is_playing, last_update_time
    data = request.get_json()
    play_state = data.get('is_playing')
    
    if play_state is not None:
        is_playing = play_state
        last_update_time = datetime.now()
        # 广播状态更新
        broadcast_state()
        return jsonify({'message': 'Play state updated', 'success': True})
    
    return jsonify({'error': 'Missing play state parameter'}, 400)

@app.route('/api/poll/change-song', methods=['POST'])
@token_required
def poll_change_song():
    """
    轮询接口：切换当前播放的歌曲
    用于不支持WebSocket的客户端切换歌曲
    """
    global current_index, is_playing, current_position, last_update_time
    data = request.get_json()
    index = data.get('index')
    
    if index is not None and 0 <= index < len(playlist):
        current_index = index
        is_playing = True
        current_position = 0
        last_update_time = datetime.now()
          # 广播状态更新
        broadcast_state()
        
        # 从Authorization头获取token
        token = request.headers.get('Authorization', '')
        if token.startswith('Bearer '):
            token = token[7:]
        
        # 动态构建音频URL
        host = request.host
        scheme = 'https' if request.is_secure else 'http'
        audio_url = f"{scheme}://{host}/api/music/storage/{playlist[index]['name']}.{playlist[index]['format']}?token={token}"
            
        return jsonify({
            "url": audio_url,
            "message": "播放成功",
            "success": True
        })
    
    return jsonify({'error': 'Invalid song index'}, 400)

# WebSocket事件处理
@socketio.on('connect')
def handle_connect():
    print(f'客户端已连接: {request.sid}')
    connected_clients.add(request.sid)
    
    # 从连接参数中获取用户指纹
    fingerprint = request.args.get('fingerprint', 'unknown')
    if fingerprint != 'unknown':
        client_fingerprints[request.sid] = fingerprint
        # 更新用户活跃时间
        update_user_activity(fingerprint)
        print(f'用户指纹: {fingerprint[:8]}... 已连接WebSocket')
    
    join_room('music_room')
    
    online_info = get_online_users_info()
    print(f'当前在线用户数: {online_info["count"]} (WebSocket连接: {len(connected_clients)})')
    
    # 发送当前状态给新连接的客户端
    emit('state_update', {
        "playlist": sorted(playlist, key=lambda x: x['order']),
        "current_index": current_index,
        "is_playing": is_playing,
        "current_position": current_position,
        "connected_clients": online_info['count'],
        "websocket_connections": online_info['websocket_connections'],
        "timestamp": datetime.now().isoformat()
    })
    
    # 广播用户数变化给所有客户端
    broadcast_state()

@socketio.on('disconnect')
def handle_disconnect():
    print(f'客户端已断开连接: {request.sid}')
    
    # 获取用户指纹
    fingerprint = client_fingerprints.get(request.sid)
    if fingerprint:
        # 检查该用户是否还有其他WebSocket连接
        other_connections = [sid for sid, fp in client_fingerprints.items() if fp == fingerprint and sid != request.sid]
        if not other_connections:
            # 如果没有其他连接，标记用户为离线
            remove_offline_user(fingerprint)
            print(f'用户 {fingerprint[:8]}... 完全离线')
        else:
            print(f'用户 {fingerprint[:8]}... 还有 {len(other_connections)} 个其他连接')
        
        # 移除sid到指纹的映射
        del client_fingerprints[request.sid]
    
    connected_clients.discard(request.sid)
    leave_room('music_room')
    
    online_info = get_online_users_info()
    print(f'当前在线用户数: {online_info["count"]} (WebSocket连接: {len(connected_clients)})')
    
    # 广播用户数变化给所有客户端
    broadcast_state()

@socketio.on('sync_position')
def handle_sync_position(data):
    global current_position, last_update_time
    new_position = data.get('position', 0)
    
    # 只有在位置变化较大时才更新和广播
    if abs(new_position - current_position) > 1:  # 相差超过1秒才同步
        current_position = new_position
        last_update_time = datetime.now()
        print(f'位置同步: {current_position}秒')
        
        # 广播位置同步给其他客户端
        emit('position_sync', {
            'position': current_position,
            'timestamp': last_update_time.isoformat()
        }, room='music_room', include_self=False)
    else:
        print(f'忽略微小位置变化: {new_position} -> {current_position}')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/api/poll/state', methods=['GET'])
@token_required
def poll_state():
    """
    轮询接口：获取当前播放状态，包括播放列表、当前索引、播放状态等
    用于不支持WebSocket的客户端获取完整的播放状态
    """
    online_info = get_online_users_info()
    return jsonify({
        "playlist": sorted(playlist, key=lambda x: x['order']),
        "current_index": current_index,
        "is_playing": is_playing,
        "current_position": current_position,
        "connected_clients": online_info['count'],
        "websocket_connections": online_info['websocket_connections'],
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/poll/position', methods=['GET'])
@token_required
def poll_position():
    """
    轮询接口：获取当前播放位置
    用于不支持WebSocket的客户端同步播放位置
    """
    # 如果正在播放，计算预估的当前位置
    estimated_position = current_position
    if is_playing:
        # 计算从上次更新到现在经过的秒数
        elapsed = (datetime.now() - last_update_time).total_seconds()
        estimated_position += elapsed
    
    return jsonify({
        "position": estimated_position,
        "is_playing": is_playing,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/poll/clients', methods=['GET'])
@token_required
def poll_clients():
    """
    轮询接口：获取当前连接的客户端数量
    用于不支持WebSocket的客户端了解在线用户数
    """
    online_info = get_online_users_info()
    return jsonify({
        "connected_clients": online_info['count'],
        "websocket_connections": online_info['websocket_connections'],
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/online-users', methods=['GET'])
@token_required
def get_online_users():
    """
    获取在线用户详细信息
    """
    online_info = get_online_users_info()
    
    # 简化用户信息以保护隐私
    simplified_users = {}
    for fingerprint, user_info in online_info['users'].items():
        simplified_users[fingerprint[:8] + '...'] = {
            'login_time': user_info['login_time'],
            'last_seen': user_info['last_seen'],
            'user_agent_short': user_info['user_agent'][:50] + '...' if len(user_info['user_agent']) > 50 else user_info['user_agent'],
            'ip': user_info['ip']
        }
    
    return jsonify({
        "count": online_info['count'],
        "websocket_connections": online_info['websocket_connections'], 
        "users": simplified_users,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/heartbeat', methods=['POST'])
@token_required
def heartbeat():
    """
    用户心跳接口 - 客户端每10秒调用一次来维持在线状态
    """
    try:
        fingerprint = request.headers.get('X-User-Fingerprint', 'unknown')
        user_agent = request.headers.get('User-Agent', 'Unknown')
        ip = request.remote_addr or 'Unknown'
        
        if fingerprint == 'unknown':
            return jsonify({'error': '缺少用户指纹'}), 400
        
        # 提取用户ID
        user_id = extract_user_id(fingerprint)
        
        # 更新用户活跃时间
        auth_data = load_auth_data()
        
        if 'online_users' not in auth_data:
            auth_data['online_users'] = {}
        
        current_time = datetime.now().isoformat()
        
        if user_id in auth_data['online_users']:
            # 更新现有用户的活跃时间
            auth_data['online_users'][user_id]['last_seen'] = current_time
            auth_data['online_users'][user_id]['fingerprint'] = fingerprint  # 更新完整指纹
        else:
            # 新用户心跳（可能是登录后的首次心跳）
            auth_data['online_users'][user_id] = {
                'login_time': current_time,
                'last_seen': current_time,
                'user_agent': user_agent,
                'ip': ip,
                'fingerprint': fingerprint,
                'user_id': user_id
            }
            print(f"💓 新用户心跳: {user_id}")
        
        save_auth_data(auth_data)
        
        # 清理过期用户
        cleanup_expired_users()
        
        # 返回当前在线用户数
        online_info = get_online_users_info()
        
        return jsonify({
            'message': '心跳成功',
            'online_count': online_info['count'],
            'timestamp': current_time
        })
        
    except Exception as e:
        print(f"⚠️ 心跳处理失败: {e}")
        return jsonify({'error': '心跳处理失败'}), 500

@app.route('/api/cleanup-offline', methods=['POST'])
@token_required
def cleanup_offline():
    """
    手动清理离线用户
    """
    cleaned_count = cleanup_expired_users()
    return jsonify({
        "message": f"清理了 {cleaned_count} 个过期用户",
        "cleaned_count": cleaned_count,
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    # 确保音乐存储目录存在
    os.makedirs(MUSIC_DIR, exist_ok=True)
    # 初始化认证系统
    initialize_auth()
    # 初始化播放列表
    initialize_playlist()
    # 运行Flask-SocketIO服务
    print("后端服务启动中...")
    print("默认密码: MusicTogether2024!@#")
    socketio.run(app, host='0.0.0.0', port=8080, debug=False)
