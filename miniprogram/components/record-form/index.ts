Component({
  properties: {
    billId: {
      type: String,
      value: ''
    },
    initialTarget: {
      type: String,
      value: ''
    }
  },

  data: {
    recordType: 'expense', // 'expense' | 'income'
    selectedCategory: '',
    selectedCategoryName: '',
    amount: '0.00',
    remark: '',
    selectedDate: '',
    pickerDateValue: '',
    showKeyboard: false,
    isCalculating: false,
    categories: [
      { id: 'meal', name: '餐饮', icon: '🍱', class: 'meal' },
      { id: 'shopping', name: '购物', icon: '🛍️', class: 'shopping' },
      { id: 'daily', name: '日用', icon: '🧴', class: 'daily' },
      { id: 'traffic', name: '交通', icon: '🚇', class: 'traffic' },
      { id: 'sport', name: '运动', icon: '🏃‍♂️', class: 'sport' },
      { id: 'play', name: '娱乐', icon: '🎮', class: 'play' },
      { id: 'comm', name: '通讯', icon: '📞', class: 'comm' },
      { id: 'cloth', name: '服饰', icon: '👕', class: 'cloth' },
      { id: 'house', name: '住房', icon: '🏠', class: 'house' },
      { id: 'travel', name: '旅行', icon: '✈️', class: 'travel' },
      { id: 'digital', name: '数码', icon: '📱', class: 'digital' },
      { id: 'gift', name: '礼金', icon: '🧧', class: 'gift' },
      { id: 'pet', name: '宠物', icon: '🐱', class: 'pet' },
      { id: 'office', name: '办公', icon: '💼', class: 'office' },
      { id: 'other', name: '其他', icon: '🔧', class: 'other' },
    ],
  },

  lifetimes: {
    attached() {
      const billId = this.properties.billId
      if (billId) {
        // 编辑模式：加载数据
        this.loadBillData(billId)
      } else {
        // 新增模式：初始化日期
        this.initDate()
      }
    },
  },

  methods: {
    initDate() {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      this.setData({
        selectedDate: `${month}-${day}`,
        pickerDateValue: `${year}-${month}-${day}`,
      })
    },

    loadBillData(billId: string) {
      wx.showLoading({ title: '加载中...' })
      const db = wx.cloud.database()
      db.collection('ka_bills').doc(billId).get()
        .then(res => {
          const data = res.data
          const dateObj = new Date(data.date)
          const m = String(dateObj.getMonth() + 1).padStart(2, '0')
          const d = String(dateObj.getDate()).padStart(2, '0')

          const shouldShowKeyboard = this.properties.initialTarget !== 'icon'

          this.setData({
            recordType: data.type,
            selectedCategory: data.categoryId,
            selectedCategoryName: data.categoryName,
            amount: data.amount.toFixed(2),
            remark: data.remark || '',
            pickerDateValue: data.date,
            selectedDate: `${m}-${d}`,
            showKeyboard: shouldShowKeyboard // 编辑模式下自动弹出键盘？或者让用户点击
            // 用户说：点击金额弹出... 这里我们默认让他看到信息，点击具体位置再弹？
            // 现有UI逻辑是 选类目 -> 弹窗。
            // 编辑进来，类目已选，按逻辑应该直接弹窗显示金额？
            // 还是先只显示grid，然后选中了该类目...
            // 现有UI：Grid在上面，Popup在下面。如果不弹Popup，下面是空的或者遮罩？
            // 现有Popup是 bottom-sheet.
            // 编辑模式下，最好初始就显示 Popup，因为核心是改金额/备注
          })
          wx.hideLoading()
        })
        .catch(err => {
          console.error(err)
          wx.hideLoading()
          wx.showToast({ title: '加载失败', icon: 'none' })
        })
    },

    // 切换支出/收入
    onRecordTypeChange(e: WechatMiniprogram.TouchEvent) {
      const type = e.currentTarget.dataset.type as 'expense' | 'income'
      this.setData({
        recordType: type,
        // 切换类型不重置类别，只重置金额逻辑可选，也可以重置
      })
    },

    // 取消
    onCancel() {
      wx.navigateBack()
    },

    // 选择类别
    onCategorySelect(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id as string
      const name = e.currentTarget.dataset.name as string
      this.setData({
        selectedCategory: id,
        selectedCategoryName: name,
        showKeyboard: true, // 弹出键盘
      })
    },

    // 监听Popup显隐
    onPopupVisibleChange(e: any) {
      this.setData({
        showKeyboard: e.detail.visible
      })
    },

    // 键盘输入处理
    onKeyTap(e: WechatMiniprogram.TouchEvent) {
      const key = e.currentTarget.dataset.key as string
      let amount = this.data.amount.toString()

      // 如果当前是初始0，且输入的是数字，直接替换
      if (amount === '0.00' && !['.', '+', '-'].includes(key)) {
        amount = key
      } else {
        // 防止多个连续运算符
        const lastChar = amount.slice(-1)
        if (['+', '-'].includes(lastChar) && ['+', '-'].includes(key)) {
          return
        }
        // 防止多个小数点
        if (key === '.') {
          // 简单判断: 如果当前最后一段数字已经有小数点了
          const parts = amount.split(/[\+\-]/)
          const currentPart = parts[parts.length - 1]
          if (currentPart.includes('.')) return
        }

        amount += key
      }

      // 检查是否包含运算符，改变按钮状态
      const hasOperator = /[\+\-]/.test(amount)

      this.setData({
        amount,
        isCalculating: hasOperator
      })
    },

    // 退格
    onBackspace() {
      let amount = this.data.amount.toString()
      if (amount.length > 1) {
        amount = amount.slice(0, -1)
      } else {
        amount = '0.00'
      }

      const hasOperator = /[\+\-]/.test(amount)
      this.setData({
        amount,
        isCalculating: hasOperator
      })
    },

    // 处理"完成"或"="点击
    handleDone() {
      if (this.data.isCalculating) {
        // 执行计算
        try {
          // 注意：eval在小程序中被禁用，需手动解析或使用简单逻辑
          // 这里实现简单解析器
          const result = this.calculateExpression(this.data.amount)
          this.setData({
            amount: result,
            isCalculating: false
          })
        } catch (e) {
          wx.showToast({ title: '计算错误', icon: 'none' })
        }
      } else {
        // 提交
        this.onSubmit()
      }
    },

    // 简单表达式计算
    calculateExpression(expr: string): string {
      // 移除末尾可能的运算符
      if (['+', '-'].includes(expr.slice(-1))) {
        expr = expr.slice(0, -1)
      }

      // 分割数字和运算符
      // 例子: 10+20-5
      // 这里的逻辑需要支持连续运算
      // 先把所有数字提取出来
      const nums = expr.split(/[\+\-]/).map(Number)
      // 提取所有运算符
      const ops = expr.replace(/[0-9\.]/g, '').split('')

      if (nums.length === 0) return '0.00'

      let result = nums[0]
      for (let i = 0; i < ops.length; i++) {
        const nextNum = nums[i + 1]
        if (ops[i] === '+') {
          result += nextNum
        } else if (ops[i] === '-') {
          result -= nextNum
        }
      }

      return Math.max(0, result).toFixed(2) // 保持非负和两位小数
    },

    // 日期选择
    onDatePickerChange(e: WechatMiniprogram.PickerChange) {
      const dateStr = e.detail.value as string
      const date = new Date(dateStr)
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      this.setData({
        selectedDate: `${m}-${d}`,
        pickerDateValue: dateStr,
      })
    },

    // 备注输入
    onRemarkChange(e: WechatMiniprogram.Input) {
      this.setData({ remark: e.detail.value })
    },

    // 完成提交
    onSubmit() {
      if (!this.data.selectedCategory) {
        wx.showToast({
          title: '请选择类别',
          icon: 'none',
        })
        return
      }

      const amount = parseFloat(this.data.amount)
      if (!amount || amount <= 0) {
        wx.showToast({
          title: '请输入有效金额',
          icon: 'none',
        })
        return
      }

      wx.showLoading({ title: '保存中...' })

      const now = new Date()
      // 构造存储用的日期时间对象
      const dateStr = this.data.pickerDateValue
      const [year, month, day] = dateStr.split('-').map(Number)

      const targetDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds())
      const timeStr = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`

      // 获取选中的类别信息
      const category = this.data.categories.find(c => c.id === this.data.selectedCategory)

      const db = wx.cloud.database()
      const dataToSave = {
        type: this.data.recordType,
        amount: amount,
        categoryId: this.data.selectedCategory,
        categoryName: this.data.selectedCategoryName,
        categoryIcon: category?.icon || '',
        categoryClass: category?.class || '',
        date: dateStr,
        time: timeStr,
        timestamp: targetDate.getTime(),
        remark: this.data.remark
      }

      if (this.properties.billId) {
        // 更新逻辑
        db.collection('ka_bills').doc(this.properties.billId).update({
          data: dataToSave,
          success: () => {
            wx.hideLoading()
            wx.showToast({ title: '已修改', icon: 'success' })
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('更新失败', err)
            wx.showToast({ title: '修改失败', icon: 'none' })
          }
        })
      } else {
        // 新增逻辑
        db.collection('ka_bills').add({
          data: dataToSave,
          success: () => {
            wx.hideLoading()
            wx.showToast({
              title: '记账成功',
              icon: 'success',
            })

            setTimeout(() => {
              this.setData({
                selectedCategory: '',
                selectedCategoryName: '',
                amount: '0.00',
                remark: '',
                showKeyboard: false
              })
              wx.navigateBack() // 这里是navigateBack吗？如果是Tab页，Add页面通常是Reset。但用户需求场景可能是从Home进入Add，然后Back。
              // 之前代码是 navigateBack，对于 tabbar 页面这其实无效（除非是 navigated to it）
              // 但用户现在的需求是Edit Mode，Edit Mode肯定是Navigate进来的，Back也对。
              // Add Mode (Tab): navigateBack 无效，需要 Reset state.
              // 让我们区分一下:
              // 如果是Tab页(Add)，navigateBack会失败，所以最好只是 Reset.
            }, 1500)
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('记账失败', err)
            wx.showToast({
              title: '保存失败，请重试',
              icon: 'none'
            })
          }
        })
      }
    },
  },
})


