const fs = require('fs')
const path = require('path')

console.log('=== Vue CLI 环境变量测试 ===')
console.log('当前目录:', process.cwd())
console.log('NODE_ENV:', process.env.NODE_ENV)

// 检查环境文件是否存在
const envFiles = [
  '.env.development',
  '.env.production', 
  '.env.local',
  '.env'
]

envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ 找到环境文件: ${file}`)
    const content = fs.readFileSync(filePath, 'utf8')
    console.log(`内容:\n${content}`)
  } else {
    console.log(`❌ 未找到: ${file}`)
  }
})

// 检查所有 VUE_APP_ 环境变量
console.log('\n=== 所有 VUE_APP_ 变量 ===')
Object.keys(process.env)
  .filter(key => key.startsWith('VUE_APP_'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`)
  })

console.log('\n=== 直接读取变量 ===')
console.log('VUE_APP_API_BASE_URL:', process.env.VUE_APP_API_BASE_URL)
console.log('VUE_APP_SOCKET_URL:', process.env.VUE_APP_SOCKET_URL)
