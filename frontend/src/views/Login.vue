<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>音乐一起听</h2>
          <p>请输入密码登录</p>
        </div>
      </template>
      
      <el-form ref="loginForm" :model="loginData" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="password">
          <el-input
            v-model="loginData.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            size="large" 
            style="width: 100%"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-info">
        <p><strong>开发者:</strong> QuietPeng</p>
        <p>登录有效期：30天</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import api from '../utils/api'

const router = useRouter()
const loginForm = ref(null)
const loading = ref(false)

const loginData = reactive({
  password: ''
})

const rules = {
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginForm.value) return
  
  const valid = await loginForm.value.validate().catch(() => false)
  if (!valid) return
  
  loading.value = true
  
  try {
    const response = await api.post('/login', {
      password: loginData.password
    })
    
    const { token, message } = response.data
    localStorage.setItem('token', token)
    
    ElMessage.success(message || '登录成功')
    router.push('/player')
  } catch (error) {
    console.error('登录失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0 0 10px 0;
  color: #303133;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.login-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  text-align: center;
  font-size: 12px;
  color: #909399;
}

.login-info p {
  margin: 5px 0;
}
</style>
