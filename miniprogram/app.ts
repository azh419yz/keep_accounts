// app.ts
App<IAppOption>({
  globalData: {
    user: null,
    openid: '',
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云开发能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-0glcgvwje124f1db',
        traceUser: true,
      })
    }

    // 读取本地缓存的用户信息（保持登录态）
    const cachedUser = wx.getStorageSync('ka_user')
    const cachedOpenid = wx.getStorageSync('ka_openid')
    if (cachedUser && cachedOpenid) {
      this.globalData.user = cachedUser
      this.globalData.openid = cachedOpenid
    }
  },
})