// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化 cloud（环境 ID 与前端保持一致）
cloud.init({
  env: 'cloud1-0glcgvwje124f1db',
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // 这里只做登录鉴权，返回 openid / appid / unionid
  // 前端根据 openid 在数据库中进行用户注册/登录
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID || '',
  }
}


