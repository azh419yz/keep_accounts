Component({
  data: {
    recordType: 'expense', // 'expense' | 'income'
    selectedCategory: '',
    selectedCategoryName: '',
    amount: '0.00',
    remark: '',
    selectedDate: '',
    categories: [
      { id: 'meal', name: '餐饮', icon: '🍱', class: 'meal' },
      { id: 'shopping', name: '购物', icon: '🛍️', class: 'shopping' },
      { id: 'daily', name: '日用', icon: '🧴', class: 'daily' },
      { id: 'traffic', name: '交通', icon: '🚇', class: 'traffic' },
      { id: 'sport', name: '运动', icon: '🏃‍♂️', class: 'sport' },
      { id: 'play', name: '娱乐', icon: '🎮', class: 'play' },
      { id: 'house', name: '住房', icon: '🏠', class: 'house' },
      { id: 'more', name: '更多', icon: '➕', class: 'more' },
    ],
  },

  lifetimes: {
    attached() {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      this.setData({
        selectedDate: `${month}-${day}`,
        pickerDateValue: `${year}-${month}-${day}`,
      })
    },
  },

  methods: {
    // 切换支出/收入
    onRecordTypeChange(e: WechatMiniprogram.TouchEvent) {
      const type = e.currentTarget.dataset.type as 'expense' | 'income'
      this.setData({
        recordType: type,
        selectedCategory: '',
        selectedCategoryName: '',
        amount: '0.00',
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
      })
    },

    // 数字键盘输入
    onKeyTap(e: WechatMiniprogram.TouchEvent) {
      const key = e.currentTarget.dataset.key as string
      let amount = this.data.amount

      if (key === '.') {
        if (amount.includes('.')) {
          return // 已有小数点，不处理
        }
        amount = amount === '0.00' ? '0.' : amount + '.'
      } else {
        if (amount === '0.00' || amount === '0') {
          amount = key
        } else {
          amount = amount + key
        }
      }

      // 格式化金额（保留两位小数）
      if (amount.includes('.')) {
        const parts = amount.split('.')
        if (parts[1].length > 2) {
          parts[1] = parts[1].substring(0, 2)
        }
        amount = parts.join('.')
      }

      this.setData({ amount })
    },

    // 退格
    onBackspace() {
      let amount = this.data.amount
      if (amount.length > 1) {
        amount = amount.slice(0, -1)
      } else {
        amount = '0.00'
      }
      this.setData({ amount })
    },

    // 日期选择（使用 picker 组件，在 wxml 中绑定）
    onDatePickerChange(e: WechatMiniprogram.PickerChange) {
      const dateStr = e.detail.value as string
      // dateStr 格式为 "2025-12-22"
      const date = new Date(dateStr)
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      this.setData({
        selectedDate: `${m}-${d}`,
        pickerDateValue: dateStr,
      })
    },

    // 加法计算
    onAdd() {
      wx.showModal({
        title: '计算功能',
        content: '请输入要相加的金额',
        editable: true,
        placeholderText: '0.00',
        success: (res) => {
          if (res.confirm && res.content) {
            const addValue = parseFloat(res.content) || 0
            const current = parseFloat(this.data.amount) || 0
            const result = (current + addValue).toFixed(2)
            this.setData({ amount: result })
          }
        },
      })
    },

    // 减法计算
    onSubtract() {
      wx.showModal({
        title: '计算功能',
        content: '请输入要相减的金额',
        editable: true,
        placeholderText: '0.00',
        success: (res) => {
          if (res.confirm && res.content) {
            const subValue = parseFloat(res.content) || 0
            const current = parseFloat(this.data.amount) || 0
            const result = Math.max(0, current - subValue).toFixed(2)
            this.setData({ amount: result })
          }
        },
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

      // 这里可以保存到云数据库
      wx.showToast({
        title: '记账成功',
        icon: 'success',
      })

      // 重置表单
      setTimeout(() => {
        this.setData({
          selectedCategory: '',
          selectedCategoryName: '',
          amount: '0.00',
          remark: '',
        })
        wx.navigateBack()
      }, 1500)
    },
  },
})


