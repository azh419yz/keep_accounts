const app = getApp<IAppOption>()

interface IUserDoc {
  _id?: string
  _openid?: string
  nickName: string
  avatarUrl: string
  gender?: number
  city?: string
  province?: string
  country?: string
  createdAt: number
  lastLoginAt: number
}

Component({
  data: {
    loading: false,
    hasLogin: false,
    userInfo: null as WechatMiniprogram.UserInfo | null,
  },

  lifetimes: {
    attached() {
      this.syncUserFromGlobal()
    },
  },

  pageLifetimes: {
    show() {
      // 每次从“账号设置”等页面返回时，刷新一下登录信息
      this.syncUserFromGlobal()
    },
  },

  methods: {
    syncUserFromGlobal() {
      // 从全局或本地缓存恢复登录态
      const globalUser = app.globalData.user as WechatMiniprogram.UserInfo | null
      const cachedUser = wx.getStorageSync('ka_user') as WechatMiniprogram.UserInfo | null
      const user = globalUser || cachedUser

      if (user) {
        this.setData({
          hasLogin: true,
          userInfo: user,
        })
      } else {
        this.setData({
          hasLogin: false,
          userInfo: null,
        })
      }
    },
    // 点击微信一键登录
    async onTapLogin() {
      if (this.data.loading) return

      if (!wx.cloud) {
        wx.showModal({
          title: '提示',
          content: '当前基础库版本过低，无法使用云开发登录，请升级微信版本后重试。',
          showCancel: false,
        })
        return
      }

      try {
        this.setData({ loading: true })

        // 1. 获取用户头像昵称等公开信息
        const profileRes = await this.getUserProfile()

        // 2. 云函数获取 openid
        const loginRes = await wx.cloud.callFunction<{ openid: string }>({
          name: 'login',
        })
        const openid = (loginRes.result as any).openid

        if (!openid) {
          throw new Error('未获取到 openid')
        }

        // 3. 在云数据库中查找 / 注册用户
        const db = wx.cloud.database()
        const userCollection = db.collection('ka_users')

        const now = Date.now()
        const userBase: IUserDoc = {
          nickName: profileRes.userInfo.nickName,
          avatarUrl: profileRes.userInfo.avatarUrl,
          gender: profileRes.userInfo.gender,
          city: profileRes.userInfo.city,
          province: profileRes.userInfo.province,
          country: profileRes.userInfo.country,
          createdAt: now,
          lastLoginAt: now,
        }

        const existed = await userCollection.where({ _openid: openid }).get()

        if (existed.data.length === 0) {
          // 新用户：插入一条记录
          await userCollection.add({
            data: userBase,
          })
          // 新用户使用微信资料作为初始资料
          this.setData({
            hasLogin: true,
            userInfo: profileRes.userInfo,
          })
          app.globalData.user = profileRes.userInfo
          wx.setStorageSync('ka_user', profileRes.userInfo)

        } else {
          // 老用户：只更新登录时间
          // 不覆盖昵称头像，因为用户可能在账号设置里改过
          const userDoc = existed.data[0] as IUserDoc
          const userId = userDoc._id
          await userCollection.doc(userId as string).update({
            data: {
              lastLoginAt: now,
            },
          })

          // 使用数据库里的最新资料更新本地状态
          // 构造符合 WechatMiniprogram.UserInfo 接口的对象，优先用数据库的
          const dbUserInfo: WechatMiniprogram.UserInfo = {
            nickName: userDoc.nickName,
            avatarUrl: userDoc.avatarUrl,
            gender: (userDoc.gender ?? 0) as 0 | 1 | 2,
            city: userDoc.city ?? '',
            province: userDoc.province ?? '',
            country: userDoc.country ?? '',
            language: 'zh_CN' // 默认补一个
          }

          this.setData({
            hasLogin: true,
            userInfo: dbUserInfo,
          })
          app.globalData.user = dbUserInfo
          wx.setStorageSync('ka_user', dbUserInfo)
        }

        // 4. 全局保存 openid
        app.globalData.openid = openid
        wx.setStorageSync('ka_openid', openid)

        wx.showToast({
          title: '登录成功',
          icon: 'success',
        })
      } catch (e) {
        console.error('login error', e)
        wx.showToast({
          title: '登录失败，请稍后重试',
          icon: 'none',
        })
      } finally {
        this.setData({ loading: false })
      }
    },

    // 退出登录：只清本地缓存，不删云端数据
    onTapLogout() {
      wx.showModal({
        title: '确定退出登录？',
        content: '退出后不会删除云端数据，下次可继续登录使用。',
        success: (res) => {
          if (!res.confirm) return

          app.globalData.user = null
          app.globalData.openid = ''
          wx.removeStorageSync('ka_user')
          wx.removeStorageSync('ka_openid')

          this.setData({
            hasLogin: false,
            userInfo: null,
          })

          wx.showToast({
            title: '已退出登录',
            icon: 'none',
          })
        },
      })
    },

    // 进入账号设置页面
    onTapAccountSettings() {
      if (!this.data.hasLogin || !this.data.userInfo) {
        wx.showToast({
          title: '请先登录',
          icon: 'none',
        })
        return
      }
      wx.navigateTo({
        url: '/pages/account/index',
      })
    },

    // 封装 wx.getUserProfile 为 Promise
    getUserProfile(): Promise<WechatMiniprogram.GetUserProfileSuccessCallbackResult> {
      return new Promise((resolve, reject) => {
        wx.getUserProfile({
          // 注意：desc 文案长度需在微信要求的范围内（4-32 个字符）
          desc: '用于获取头像和昵称',
          lang: 'zh_CN',
          success: resolve,
          fail: reject,
        })
      })
    },
  },
})


