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

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)  # 生成随机密钥
CORS(app, origins=["*"])  # 允许跨域
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
connected_clients = set()

# 初始化认证文件
def initialize_auth():
    if not os.path.exists(AUTH_FILE):
        # 创建默认强密码
        default_password = "MusicTogether2024!@#"
        hashed_password = hashlib.sha256(default_password.encode()).hexdigest()
        auth_data = {
            "password_hash": hashed_password,
            "created_at": datetime.now().isoformat()
        }
        with open(AUTH_FILE, 'w', encoding='utf-8') as f:
            json.dump(auth_data, f, ensure_ascii=False, indent=4)
        print(f"默认密码已创建: {default_password}")

# 验证密码
def verify_password(password):
    try:
        with open(AUTH_FILE, 'r', encoding='utf-8') as f:
            auth_data = json.load(f)
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        return password_hash == auth_data['password_hash']
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
    state = {
        "playlist": sorted(playlist, key=lambda x: x['order']),
        "current_index": current_index,
        "is_playing": is_playing,
        "current_position": current_position,
        "connected_clients": len(connected_clients),
        "timestamp": datetime.now().isoformat()
    }
    socketio.emit('state_update', state)
    save_to_json()

# 认证相关路由
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    password = data.get('password')
    
    if not password:
        return jsonify({'error': '密码不能为空'}), 400
    
    if verify_password(password):
        token = generate_token()
        return jsonify({
            'token': token,
            'message': '登录成功',
            'expires_in': 30 * 24 * 3600  # 30天，秒为单位
        })
    else:
        return jsonify({'error': '密码错误'}), 401

@app.route('/api/verify-token', methods=['POST'])
@token_required
def verify_token():
    return jsonify({'message': 'Token有效'})

# 播放列表相关路由
@app.route('/api/songs', methods=['GET'])
@token_required
def get_songs():
    return jsonify({
        "playlist": sorted(playlist, key=lambda x: x['order']),
        "current_index": current_index,
        "is_playing": is_playing,
        "current_position": current_position
    })

@app.route('/api/upload', methods=['POST'])
@token_required
def upload_song():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # 检查文件格式
    allowed_extensions = {'.mp3', '.wav', '.flac', '.m4a'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        return jsonify({'error': '不支持的文件格式'}), 400

    filename = file.filename
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    synchronize_with_storage()
    broadcast_state()
    return jsonify({'message': 'Upload successful'})

@app.route('/api/delete/<int:index>', methods=['DELETE'])
@token_required
def delete_song(index):
    global playlist, current_index
    if 0 <= index < len(playlist):
        song = playlist[index]
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{song['name']}.{song['format']}")
        if os.path.exists(file_path):
            os.remove(file_path)
        playlist.pop(index)
        
        # 调整当前索引
        if current_index >= index:
            current_index = max(0, current_index - 1)
        
        # 重新排序
        for i, song in enumerate(playlist):
            song['order'] = i
            
        broadcast_state()
        return jsonify({'message': 'Delete successful'})
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
            
        return jsonify({
            "url": f"http://localhost:8080/api/music/storage/{playlist[index]['name']}.{playlist[index]['format']}?token={token}",
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

# 音乐文件下载 - 支持URL参数token验证
@app.route('/api/music/storage/<filename>', methods=['GET'])
def download_file(filename):
    # 检查 Authorization 头
    token = request.headers.get('Authorization')
    
    # 如果没有Authorization头，检查URL参数中的token
    if not token:
        token = request.args.get('token')
    
    # 验证token
    if token:
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            # Token有效，返回文件
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            pass
    
    # Token无效或缺失，返回401
    return jsonify({'error': 'Unauthorized access to music file'}), 401

# WebSocket事件处理
@socketio.on('connect')
def handle_connect():
    print(f'客户端已连接: {request.sid}')
    connected_clients.add(request.sid)
    join_room('music_room')
    print(f'当前在线用户数: {len(connected_clients)}')
    
    # 发送当前状态给新连接的客户端
    emit('state_update', {
        "playlist": sorted(playlist, key=lambda x: x['order']),
        "current_index": current_index,
        "is_playing": is_playing,
        "current_position": current_position,
        "connected_clients": len(connected_clients),
        "timestamp": datetime.now().isoformat()
    })
    
    # 广播用户数变化给所有客户端
    broadcast_state()

@socketio.on('disconnect')
def handle_disconnect():
    print(f'客户端已断开连接: {request.sid}')
    connected_clients.discard(request.sid)
    leave_room('music_room')
    print(f'当前在线用户数: {len(connected_clients)}')
    
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
