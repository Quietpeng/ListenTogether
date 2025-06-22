<template>
  <div>
    <h2>环境变量测试</h2>
    <div>NODE_ENV: {{ nodeEnv }}</div>
    <div>VUE_APP_API_BASE_URL: {{ apiBaseUrl }}</div>
    <div>VUE_APP_SOCKET_URL: {{ socketUrl }}</div>
    <div>所有process.env: {{ allEnv }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const nodeEnv = ref('')
const apiBaseUrl = ref('')
const socketUrl = ref('')
const allEnv = ref({})

onMounted(() => {
  console.log('测试组件中的环境变量:')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('VUE_APP_API_BASE_URL:', process.env.VUE_APP_API_BASE_URL)
  console.log('VUE_APP_SOCKET_URL:', process.env.VUE_APP_SOCKET_URL)
  console.log('全部 process.env:', process.env)
  
  nodeEnv.value = process.env.NODE_ENV || 'undefined'
  apiBaseUrl.value = process.env.VUE_APP_API_BASE_URL || 'undefined'
  socketUrl.value = process.env.VUE_APP_SOCKET_URL || 'undefined'
  allEnv.value = process.env
})
</script>
