const accountApp = getApp<IAppOption>()

Component({
  data: {
    defaultAvatar: '../../images/avatar.png',
    accountId: '',
    saving: false,
    // 是否更换过头像（决定是否需要上传）
    avatarDirty: false,
    // 当前账号设置在云端的头像 fileID（cloud:// 开头）
    avatarFileId: '',
    form: {
      avatarUrl: '',
      nickName: '',
      gender: '0',
      mobile: '',
      contact: '',
    },
  },

  lifetimes: {
    attached() {
      const user = accountApp.globalData.user as WechatMiniprogram.UserInfo | null
      const openid = accountApp.globalData.openid || wx.getStorageSync('ka_openid') || ''
      const cachedUser = (wx.getStorageSync('ka_user') ||
        user) as WechatMiniprogram.UserInfo | null

      this.setData({
        accountId: openid,
      })

      if (cachedUser) {
        this.setData({
          'form.avatarUrl': cachedUser.avatarUrl,
          'form.nickName': cachedUser.nickName,
          // 微信 userInfo.gender: 0 未知, 1 男, 2 女
          'form.gender': String(cachedUser.gender ?? 0),
        })
      }

      // 如果已经登录，尝试从云数据库加载账号设置（不覆盖登录注册字段）
      if (openid && wx.cloud) {
        const db = wx.cloud.database()
        const userCollection = db.collection('ka_users')
        userCollection
          .where({ _openid: openid })
          .get()
          .then((res) => {
            if (!res.data.length) return
            const doc = res.data[0] as any
            const avatarUrl = doc.avatarUrl || ''
            const formUpdates: Record<string, any> = {}

            if (avatarUrl) {
              formUpdates['form.avatarUrl'] = avatarUrl
            }
            if (doc.nickName) {
              formUpdates['form.nickName'] = doc.nickName
            }
            if (typeof doc.gender !== 'undefined') {
              formUpdates['form.gender'] = String(doc.gender)
            }
            if (doc.mobile) {
              formUpdates['form.mobile'] = doc.mobile
            }
            if (doc.contact) {
              formUpdates['form.contact'] = doc.contact
            }

            this.setData({
              ...formUpdates,
            })
          })
          .catch((err) => {
            console.error('load accountProfile error', err)
          })
      }
    },
  },

  methods: {
    onCopyId() {
      if (!this.data.accountId) {
        wx.showToast({
          title: '暂无账号 ID',
          icon: 'none',
        })
        return
      }
      wx.setClipboardData({
        data: this.data.accountId,
        success: () => {
          wx.showToast({
            title: '已复制',
            icon: 'success',
          })
        },
      })
    },

    onChooseAvatar() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const filePath = res.tempFiles[0]?.tempFilePath
          if (filePath) {
            this.setData({
              'form.avatarUrl': filePath,
              avatarDirty: true,
            })
          }
        },
      })
    },

    onNickNameChange(e: WechatMiniprogram.Input) {
      this.setData({
        'form.nickName': e.detail.value,
      })
    },

    onGenderChange(e: WechatMiniprogram.RadioGroupChange) {
      this.setData({
        'form.gender': e.detail.value,
      })
    },

    onMobileChange(e: WechatMiniprogram.Input) {
      this.setData({
        'form.mobile': e.detail.value,
      })
    },

    onContactChange(e: WechatMiniprogram.Input) {
      this.setData({
        'form.contact': e.detail.value,
      })
    },

    async onSave() {
      if (this.data.saving) return

      if (!this.data.accountId) {
        wx.showToast({
          title: '请先登录',
          icon: 'none',
        })
        return
      }

      if (!wx.cloud) {
        wx.showModal({
          title: '提示',
          content: '当前基础库版本过低，无法使用云开发账号设置，请升级微信版本后重试。',
          showCancel: false,
        })
        return
      }

      if (!this.data.form.nickName) {
        wx.showToast({
          title: '请填写昵称',
          icon: 'none',
        })
        return
      }

      this.setData({ saving: true })

      try {
        const openid = this.data.accountId
        // 当前头像（可能是 cloud fileID，也可能是本地路径）
        let avatarUrl = this.data.form.avatarUrl

        // 如果用户更换了头像，则上传到云存储 /avatars 目录，文件名使用 openid 保证唯一
        if (this.data.avatarDirty && this.data.form.avatarUrl) {
          const filePath = this.data.form.avatarUrl
          const extMatch = filePath.match(/\.[^.]+$/)
          const ext = extMatch ? extMatch[0] : '.jpg'
          const cloudPath = `avatars/${openid}${ext}`

          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath,
          })

          avatarUrl = uploadRes.fileID
        }

        const db = wx.cloud.database()
        const userCollection = db.collection('ka_users')
        const now = Date.now()

        // 只更新 accountProfile 字段，避免覆盖登录注册使用的字段
        const existed = await userCollection.where({ _openid: openid }).get()
        if (existed.data.length === 0) {
          // 极端情况：没走过登录流程，也保证能落一条账号设置记录
          await userCollection.add({
            data: {
              nickName: this.data.form.nickName,
              gender: Number(this.data.form.gender) as 0 | 1 | 2,
              mobile: this.data.form.mobile,
              contact: this.data.form.contact,
              avatarUrl: avatarUrl || '',
              updatedAt: now,
              createdAt: now,
              lastLoginAt: now,
            },
          })
        } else {
          const userId = existed.data[0]._id as string
          await userCollection.doc(userId).update({
            data: {
              nickName: this.data.form.nickName,
              gender: Number(this.data.form.gender) as 0 | 1 | 2,
              mobile: this.data.form.mobile,
              contact: this.data.form.contact,
              avatarUrl: avatarUrl || '',
              updatedAt: now,
            },
          })
        }

        // 更新前端全局 user 信息以便 UI 立即生效（不改云端登录信息字段）
        const originUser = (accountApp.globalData.user ||
          wx.getStorageSync('ka_user') || {
          country: '',
          province: '',
          city: '',
          language: 'zh_CN',
        }) as WechatMiniprogram.UserInfo

        const newUserInfo: WechatMiniprogram.UserInfo = {
          ...originUser,
          nickName: this.data.form.nickName,
          avatarUrl: avatarUrl || this.data.defaultAvatar,
          gender: Number(this.data.form.gender) as 0 | 1 | 2,
        }

        accountApp.globalData.user = newUserInfo
        wx.setStorageSync('ka_user', newUserInfo)

        this.setData({
          saving: false,
          avatarDirty: false,
          'form.avatarUrl': avatarUrl,
        })

        wx.showToast({
          title: '已保存',
          icon: 'success',
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } catch (e) {
        console.error('save account settings error', e)
        this.setData({ saving: false })
        wx.showToast({
          title: '保存失败，请稍后重试',
          icon: 'none',
        })
      }
    },

    onLogout() {
      // 直接复用个人中心退出逻辑：只清本地，不删云端
      wx.showModal({
        title: '确定退出登录？',
        content: '退出后不会删除云端数据，下次可继续登录使用。',
        success: (res) => {
          if (!res.confirm) return

          accountApp.globalData.user = null
          accountApp.globalData.openid = ''
          wx.removeStorageSync('ka_user')
          wx.removeStorageSync('ka_openid')

          wx.showToast({
            title: '已退出登录',
            icon: 'none',
          })

          // 返回“我的”页并刷新视图
          wx.navigateBack()
        },
      })
    },

    onDeleteAccount() {
      wx.showModal({
        title: '确定注销账号？',
        content:
          '注销后将删除与你账号相关的云端数据（示意），该操作不可恢复，请谨慎操作。',
        confirmText: '仍要注销',
        confirmColor: '#ef4444',
        success: (res) => {
          if (!res.confirm) return

          // 这里暂时只做前端提示，不实际删除云端数据
          wx.showToast({
            title: '已提交注销申请（示意）',
            icon: 'none',
          })
        },
      })
    },
  },
})


