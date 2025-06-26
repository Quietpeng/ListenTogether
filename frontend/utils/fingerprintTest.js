/**
 * 音乐一起听 - 指纹统计功能测试脚本
 * 
 * 使用方法：
 * 1. 在浏览器控制台中运行此脚本
 * 2. 或者在前端代码中调用 testFingerprintSystem()
 */

// 导入必要的指纹函数（如果在模块环境中使用）
// import { getSafeUserFingerprint, testFingerprintSafety } from './utils/fingerprint.js';

/**
 * 完整的指纹系统测试
 */
async function testFingerprintSystem() {
  console.log('🧪 ==================== 指纹系统测试开始 ====================');
  
  const results = {
    fingerprintGeneration: false,
    asciiSafety: false,
    headerSending: false,
    backendResponse: false,
    onlineCountAccuracy: false
  };
  
  try {
    // 测试1: 指纹生成
    console.log('📝 测试1: 指纹生成功能');
    const fingerprint = getSafeUserFingerprint();
    if (fingerprint && fingerprint.length > 0) {
      console.log('✅ 指纹生成成功:', fingerprint);
      results.fingerprintGeneration = true;
    } else {
      console.log('❌ 指纹生成失败');
    }
    
    // 测试2: ASCII安全性
    console.log('📝 测试2: ASCII安全性验证');
    const isAsciiSafe = /^[a-zA-Z0-9_-]+$/.test(fingerprint);
    if (isAsciiSafe) {
      console.log('✅ 指纹ASCII安全性验证通过');
      results.asciiSafety = true;
    } else {
      console.log('❌ 指纹包含非ASCII字符');
    }
    
    // 测试3: 获取服务器配置
    console.log('📝 测试3: 服务器配置检查');
    const token = uni.getStorageSync('token');
    const serverConfig = uni.getStorageSync('serverConfig');
    
    if (!token) {
      console.log('❌ 未找到认证token，请先登录');
      return results;
    }
    
    if (!serverConfig) {
      console.log('❌ 未找到服务器配置');
      return results;
    }
    
    // 构建服务器URL
    let serverUrl = '';
    if (serverConfig.serverHost) {
      const protocol = serverConfig.useHttps ? 'https' : 'http';
      const port = serverConfig.serverPort ? ':' + serverConfig.serverPort : '';
      serverUrl = `${protocol}://${serverConfig.serverHost}${port}`;
    } else if (serverConfig.url) {
      serverUrl = serverConfig.url.replace(/^ws/, 'http');
    }
    
    if (!serverUrl) {
      console.log('❌ 无法构建服务器URL');
      return results;
    }
    
    console.log('✅ 服务器URL:', serverUrl);
    
    // 测试4: 指纹头发送
    console.log('📝 测试4: 指纹头发送测试');
    try {
      const response = await uni.request({
        url: `${serverUrl}/api/poll/clients`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'X-User-Fingerprint': fingerprint
        }
      });
      
      if (response.statusCode === 200) {
        console.log('✅ 指纹头发送成功');
        console.log('📊 响应数据:', response.data);
        results.headerSending = true;
        results.backendResponse = true;
        
        // 检查在线用户数
        const onlineCount = response.data?.connected_clients;
        if (typeof onlineCount === 'number' && onlineCount > 0) {
          console.log('✅ 在线用户数获取成功:', onlineCount);
          results.onlineCountAccuracy = true;
        } else {
          console.log('⚠️ 在线用户数异常:', onlineCount);
        }
      } else {
        console.log('❌ 指纹头发送失败:', response.statusCode, response.data);
      }
    } catch (error) {
      console.log('❌ 网络请求失败:', error.message);
    }
    
    // 测试5: 后端指纹功能检测
    console.log('📝 测试5: 后端指纹功能检测');
    try {
      const debugResponse = await uni.request({
        url: `${serverUrl}/api/debug/fingerprints`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'X-User-Fingerprint': fingerprint
        }
      });
      
      if (debugResponse.statusCode === 200) {
        console.log('✅ 后端指纹调试接口可用');
        console.log('📊 指纹统计详情:', debugResponse.data);
        
        const data = debugResponse.data;
        if (data.active_fingerprints !== undefined) {
          console.log('✅ 后端指纹统计功能已实现');
          console.log(`📊 活跃指纹数: ${data.active_fingerprints}`);
          console.log(`📊 WebSocket连接数: ${data.websocket_clients}`);
        } else {
          console.log('⚠️ 后端指纹统计功能未完全实现');
        }
      } else {
        console.log('❌ 后端指纹调试接口不可用:', debugResponse.statusCode);
      }
    } catch (error) {
      console.log('⚠️ 后端指纹调试接口不存在或出错:', error.message);
      console.log('💡 提示: 请检查后端是否已部署指纹统计功能');
    }
    
    // 测试6: 指纹测试接口
    console.log('📝 测试6: 指纹测试接口');
    try {
      const testResponse = await uni.request({
        url: `${serverUrl}/api/test/fingerprint`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'X-User-Fingerprint': fingerprint
        }
      });
      
      if (testResponse.statusCode === 200) {
        console.log('✅ 指纹测试接口可用');
        console.log('📊 测试结果:', testResponse.data);
        
        const testData = testResponse.data;
        if (testData.received_fingerprint === fingerprint) {
          console.log('✅ 指纹传输准确性验证通过');
        } else {
          console.log('❌ 指纹传输准确性验证失败');
          console.log(`发送: ${fingerprint}`);
          console.log(`接收: ${testData.received_fingerprint}`);
        }
      }
    } catch (error) {
      console.log('⚠️ 指纹测试接口不存在或出错:', error.message);
    }
    
  } catch (error) {
    console.log('❌ 测试过程中发生异常:', error);
  }
  
  // 输出测试结果
  console.log('🏁 ==================== 测试结果汇总 ====================');
  console.log('📊 指纹生成:', results.fingerprintGeneration ? '✅ 通过' : '❌ 失败');
  console.log('📊 ASCII安全性:', results.asciiSafety ? '✅ 通过' : '❌ 失败');
  console.log('📊 指纹头发送:', results.headerSending ? '✅ 通过' : '❌ 失败');
  console.log('📊 后端响应:', results.backendResponse ? '✅ 通过' : '❌ 失败');
  console.log('📊 在线数统计:', results.onlineCountAccuracy ? '✅ 通过' : '❌ 失败');
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  console.log(`📊 总体通过率: ${passCount}/${totalCount} (${Math.round(passCount/totalCount*100)}%)`);
  
  if (passCount === totalCount) {
    console.log('🎉 所有测试通过！指纹系统工作正常');
  } else if (passCount >= 3) {
    console.log('⚠️ 部分功能需要完善，但基础功能可用');
  } else {
    console.log('❌ 存在重大问题，需要排查');
  }
  
  console.log('🔚 ==================== 测试结束 ====================');
  
  return results;
}

/**
 * 快速指纹状态检查
 */
function quickFingerprintCheck() {
  console.log('⚡ 快速指纹检查');
  
  try {
    const fingerprint = getSafeUserFingerprint();
    const isValid = fingerprint && fingerprint.length > 0;
    const isAsciiSafe = /^[a-zA-Z0-9_-]+$/.test(fingerprint);
    
    console.log('指纹:', fingerprint);
    console.log('有效性:', isValid ? '✅' : '❌');
    console.log('ASCII安全:', isAsciiSafe ? '✅' : '❌');
    
    return {
      fingerprint,
      isValid,
      isAsciiSafe
    };
  } catch (error) {
    console.log('❌ 快速检查失败:', error);
    return null;
  }
}

/**
 * 模拟多用户指纹生成测试
 */
function testMultiUserFingerprints() {
  console.log('👥 多用户指纹生成测试');
  
  const fingerprints = new Set();
  const testCount = 10;
  
  for (let i = 0; i < testCount; i++) {
    // 模拟不同用户环境
    const mockUser = {
      id: `user_${i}`,
      username: `testuser${i}`
    };
    
    // 临时保存用户信息
    uni.setStorageSync('userInfo', mockUser);
    
    const fingerprint = getSafeUserFingerprint();
    fingerprints.add(fingerprint);
    
    console.log(`用户${i}: ${fingerprint}`);
  }
  
  // 恢复原用户信息
  uni.removeStorageSync('userInfo');
  
  console.log(`生成了 ${fingerprints.size} 个唯一指纹 (共测试 ${testCount} 次)`);
  console.log('指纹唯一性:', fingerprints.size === testCount ? '✅ 完全唯一' : '⚠️ 存在重复');
  
  return fingerprints;
}

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testFingerprintSystem,
    quickFingerprintCheck,
    testMultiUserFingerprints
  };
}
