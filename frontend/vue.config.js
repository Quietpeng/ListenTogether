const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')

// 手动加载环境变量
const loadEnvVariables = () => {
  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.development.local'
  ]
  
  const envVars = {}
  
  envFiles.forEach(file => {
    const envPath = path.resolve(__dirname, file)
    if (fs.existsSync(envPath)) {
      console.log(`加载环境文件: ${file}`)
      const envConfig = dotenv.parse(fs.readFileSync(envPath))
      Object.assign(envVars, envConfig)
      console.log(`从 ${file} 加载的变量:`, envConfig)
    }
  })
  
  return envVars
}

const envVars = loadEnvVariables()

// 设置到 process.env
Object.keys(envVars).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = envVars[key]
  }
})

console.log('最终环境变量:', {
  NODE_ENV: process.env.NODE_ENV,
  VUE_APP_API_BASE_URL: process.env.VUE_APP_API_BASE_URL,
  VUE_APP_SOCKET_URL: process.env.VUE_APP_SOCKET_URL
})

module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  devServer: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: 'all'
  },
  publicPath: '/',
  outputDir: 'dist',
  assetsDir: 'static',
  
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        'process.env.VUE_APP_API_BASE_URL': JSON.stringify(process.env.VUE_APP_API_BASE_URL),
        'process.env.VUE_APP_SOCKET_URL': JSON.stringify(process.env.VUE_APP_SOCKET_URL)
      })
    ]
  }
})
