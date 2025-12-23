interface BillItem {
  id: string
  type: 'expense' | 'income'
  title: string
  category: string
  categoryClass: string
  icon: string
  remark: string
  amount: string
  time: string
  date: string
}

interface BillGroup {
  date: string
  dateText: string
  weekday: string
  dayNetTotal: string
  dayNetType: 'expense' | 'income'
  bills: BillItem[]
}

Component({
  data: {
    currentYear: 2025,
    currentMonth: 12,
    currentMonthText: '2025年 12月',
    pickerDate: '2025-12',
    maxDate: '',
    monthExpense: '0.00',
    monthIncome: '0.00',
    expenseChange: '0%', // 暂不计算环比
    incomeChange: '0%',
    billGroups: [] as BillGroup[],
    deleteBtnConfig: [
      {
        text: '删除',
        style: 'background-color: #ef4444; color: #fff; width: 144rpx; display: flex; align-items: center; justify-content: center;',
        className: 'swipe-delete-btn',
      },
    ],
    // Interaction State
    showCategoryPicker: false,
    showAmountInput: false,
    editingBill: null as any, // Current editing bill object
    inputAmount: '0.00',
    inputCategoryName: '',
    inputDate: '',
    inputType: 'expense',
    editingRemarkId: '', // ID of the bill currently editing remark
    remarkInputValue: '', // Temporary remark value
    // Pull-to-refresh state
    isAtBottom: false,
    isAtTop: false,
    touchStartY: null as number | null,
    isPulling: false,
    pullDistance: 0,
    pullHint: '',
    pullDownHint: '',
  },

  pageLifetimes: {
    show() {
      if (typeof this.getTabBar === 'function' &&
        this.getTabBar()) {
        this.getTabBar().setData({
          selected: 0 // 假设明细是第一个tab
        })
      }
      this.fetchBills()
    }
  },

  lifetimes: {
    attached() {
      // 设置最大日期为当前年月
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')

      // 初始化为当前日期
      this.setData({
        maxDate: `${year}-${month}`,
        currentYear: year,
        currentMonth: now.getMonth() + 1,
        currentMonthText: `${year}年 ${month}月`,
        pickerDate: `${year}-${month}`
      })
      // attached时可能show也会触发，这里可以依赖show
    },
  },

  methods: {
    // 获取账单数据
    fetchBills() {
      wx.showLoading({ title: '加载中...' })
      const db = wx.cloud.database()
      const _ = db.command

      const year = this.data.currentYear
      const month = this.data.currentMonth

      // 构造月份起止时间字符串用于匹配 date 字段 "YYYY-MM"
      // 或者使用 timestamp 范围查询
      // 这里数据结构中 date存的是 "YYYY-MM-DD"
      // 我们可以用正则或者字符串前缀匹配，云开发正则查询可能较慢，建议用范围

      // 当月第一天
      const startStr = `${year}-${String(month).padStart(2, '0')}-01`
      // 下个月第一天
      let nextMonthYear = year
      let nextMonth = month + 1
      if (nextMonth > 12) {
        nextMonth = 1
        nextMonthYear++
      }
      const endStr = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`

      db.collection('ka_bills')
        .where({
          date: _.gte(startStr).and(_.lt(endStr))
        })
        .orderBy('timestamp', 'desc') // 按时间倒序
        .get()
        .then(res => {
          this.processBills(res.data as any[])
          wx.hideLoading()
        })
        .catch(err => {
          console.error('加载失败', err)
          wx.hideLoading()
          wx.showToast({ title: '加载失败', icon: 'none' })
        })
    },

    // 处理账单数据
    processBills(bills: any[]) {
      // 计算月度收支
      const monthIncome = bills
        .filter(b => b.type === 'income')
        .reduce((sum, b) => sum + b.amount, 0)

      const monthExpense = bills
        .filter(b => b.type === 'expense')
        .reduce((sum, b) => sum + b.amount, 0)

      // 按日期分组
      const groupsMap = new Map<string, any[]>()
      bills.forEach(bill => {
        if (!groupsMap.has(bill.date)) {
          groupsMap.set(bill.date, [])
        }
        groupsMap.get(bill.date)!.push(bill)
      })

      // 转换为View Model
      const billGroups: BillGroup[] = Array.from(groupsMap.entries())
        .map(([date, dayBills]) => {
          const dateObj = new Date(date)
          const month = dateObj.getMonth() + 1
          const day = dateObj.getDate()
          const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
          const weekday = weekdays[dateObj.getDay()]

          // 计算当日
          const dayExpense = dayBills
            .filter(b => b.type === 'expense')
            .reduce((sum, b) => sum + b.amount, 0)

          const dayIncome = dayBills
            .filter(b => b.type === 'income')
            .reduce((sum, b) => sum + b.amount, 0)

          const net = dayIncome - dayExpense
          const dayNetType = (net >= 0 ? 'income' : 'expense') as 'expense' | 'income'
          // 格式化金额，正数加+，负数自带-
          // 注意：dayExpense是正数，Income - Expense 得到的结果：
          // 如果支出 > 收入，net是负数，toFixed(2) 会变成 "-100.00"
          // 如果收入 > 支出，net是正数，toFixed(2) 会变成 "100.00"，需手动补+
          const sign = net > 0 ? '+' : ''
          const dayNetTotal = `${sign}${net.toFixed(2)}`

          return {
            date,
            dateText: `${month}月${day}日`,
            weekday,
            dayNetTotal,
            dayNetType,
            bills: dayBills.map(b => ({
              id: b._id, // 注意数据库是 _id
              type: b.type,
              title: b.categoryName, // 简单用分类名做标题
              category: b.categoryName,
              categoryClass: b.categoryClass,
              icon: b.categoryIcon || '💰', // 兼容旧数据或fallback
              remark: b.remark,
              amount: b.amount.toFixed(2),
              time: b.time,
              date: b.date
            }))
          }
        })
        // 按日期倒序 (map遍历顺序不一定保证，所以再排一次)
        .sort((a, b) => b.date.localeCompare(a.date))

      this.setData({
        billGroups,
        monthExpense: monthExpense.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        monthIncome: monthIncome.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        // 环比暂未实现，设为null或默认
        expenseChange: '',
        incomeChange: ''
      })
    },

    // 月份选择器变化
    onMonthPickerChange(e: WechatMiniprogram.PickerChange) {
      const dateStr = e.detail.value as string
      // dateStr 格式为 "2025-12"
      const [yearStr, monthStr] = dateStr.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10)

      this.setData({
        currentYear: year,
        currentMonth: month,
        currentMonthText: `${year}年 ${month}月`,
        pickerDate: dateStr,
      }, () => {
        this.fetchBills()
      })
    },

    // --- Scroll-based Month Navigation ---

    onScrollToLower() {
      // Mark that we've reached the bottom
      this.setData({ isAtBottom: true })
    },

    onScrollToUpper() {
      // Mark that we've reached the top
      this.setData({ isAtTop: true })
    },

    onTouchStart(e: WechatMiniprogram.TouchEvent) {
      if (!this.data.isAtBottom && !this.data.isAtTop) return

      this.setData({
        touchStartY: e.touches[0].pageY,
        isPulling: false,
        pullDistance: 0
      })
    },

    onTouchMove(e: WechatMiniprogram.TouchEvent) {
      if ((!this.data.isAtBottom && !this.data.isAtTop) || !this.data.touchStartY) return

      const currentY = e.touches[0].pageY
      const distance = this.data.touchStartY - currentY

      // Pull up (positive distance) at bottom
      if (this.data.isAtBottom && distance > 0) {
        this.setData({
          pullDistance: distance,
          isPulling: distance > 30,
          pullHint: distance > 30 ? '松开可查看上月数据' : '上滑查看上月数据',
          pullDownHint: ''
        })
      }
      // Pull down (negative distance) at top
      else if (this.data.isAtTop && distance < 0) {
        const absDistance = Math.abs(distance)

        // Check if already at current month
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        const isCurrentMonth = this.data.currentYear === currentYear && this.data.currentMonth === currentMonth

        if (isCurrentMonth) {
          this.setData({
            pullDownHint: '已是当前月份',
            pullHint: ''
          })
        } else {
          this.setData({
            pullDistance: absDistance,
            isPulling: absDistance > 30,
            pullDownHint: absDistance > 30 ? '松开可查看下月数据' : '下滑查看下月数据',
            pullHint: ''
          })
        }
      }
    },

    onTouchEnd() {
      if (!this.data.isAtBottom && !this.data.isAtTop) return

      const shouldLoadPrev = this.data.isAtBottom && this.data.isPulling && this.data.pullDistance > 30
      const shouldLoadNext = this.data.isAtTop && this.data.isPulling && this.data.pullDistance > 30

      // Reset pull state
      this.setData({
        touchStartY: null,
        isPulling: false,
        pullDistance: 0,
        pullHint: '',
        pullDownHint: '',
        isAtBottom: false,
        isAtTop: false
      })

      if (shouldLoadPrev) {
        this.switchMonth(-1)
      } else if (shouldLoadNext) {
        this.switchMonth(1)
      }
    },

    switchMonth(offset: number) {
      let year = this.data.currentYear
      let month = this.data.currentMonth + offset

      // Handle month overflow/underflow
      if (month > 12) {
        month = 1
        year++
      } else if (month < 1) {
        month = 12
        year--
      }

      const monthStr = String(month).padStart(2, '0')

      this.setData({
        currentYear: year,
        currentMonth: month,
        currentMonthText: `${year}年 ${monthStr}月`,
        pickerDate: `${year}-${monthStr}`
      }, () => {
        this.fetchBills()
      })
    },

    // --- Interaction Handlers ---

    // 0. Add Record
    onAddRecord() {
      this.setData({
        editingBill: null, // Reset editing
        inputType: 'expense', // Default
        showCategoryPicker: true
      })
    },

    // 1. Edit Category (or Add)
    onEditCategory(e: WechatMiniprogram.TouchEvent) {
      const billId = e.currentTarget.dataset.billId
      const bill = this.findBill(billId)
      if (bill) {
        this.setData({
          editingBill: bill,
          inputType: bill.type,
          showCategoryPicker: true
        })
      }
    },

    onCategoryPickerClose() {
      this.setData({ showCategoryPicker: false })
    },

    onCategorySelected(e: any) {
      const { categoryId, category, type } = e.detail // Fixed destructuring

      const bill = this.data.editingBill
      if (bill) {
        // Edit Mode: Update DB
        const db = wx.cloud.database()
        wx.showLoading({ title: '保存中' })
        db.collection('ka_bills').doc(bill.id).update({
          data: {
            categoryId: categoryId,
            categoryName: category.name,
            categoryIcon: category.icon,
            categoryClass: category.class,
            type: type
          },
          success: () => {
            wx.hideLoading()
            this.fetchBills()
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      } else {
        // Add Mode: Continue to Amount Input
        this.setData({
          inputCategoryName: category.name,
          inputCategoryId: categoryId, // Need to store temporary
          inputCategory: category,
          inputType: type,
          inputAmount: '0.00', // Reset
          inputDate: '', // will init in component
          showAmountInput: true
        })
      }
    },

    // 2. Edit Amount
    onEditAmount(e: WechatMiniprogram.TouchEvent) {
      const billId = e.currentTarget.dataset.billId
      const bill = this.findBill(billId)
      console.log('Edit Amount', bill)
      if (bill) {
        this.setData({
          editingBill: bill,
          inputAmount: bill.amount,
          inputCategoryName: bill.category,
          inputDate: bill.date,
          inputType: bill.type,
          showAmountInput: true
        })
      }
    },

    onAmountInputClose() {
      this.setData({ showAmountInput: false })
    },

    onAmountConfirmed(e: any) {
      const { amount, date } = e.detail
      const bill = this.data.editingBill
      const now = new Date()
      const [year, month, day] = date.split('-').map(Number)
      const targetDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds())
      const timeStr = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`

      const db = wx.cloud.database()

      if (bill) {
        // Edit Mode
        wx.showLoading({ title: '保存中' })
        db.collection('ka_bills').doc(bill.id).update({
          data: {
            amount: amount,
            date: date,
            time: timeStr,
            timestamp: targetDate.getTime()
          },
          success: () => {
            wx.hideLoading()
            this.fetchBills()
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      } else {
        // Add Mode
        const category = this.data.inputCategory
        wx.showLoading({ title: '保存中' })
        db.collection('ka_bills').add({
          data: {
            type: this.data.inputType,
            amount: amount,
            categoryId: this.data.inputCategoryId,
            categoryName: category.name,
            categoryIcon: category.icon, // Fixed
            categoryClass: category.class,
            date: date,
            time: timeStr,
            timestamp: targetDate.getTime(),
            remark: '' // Default empty logic
          },
          success: () => {
            wx.hideLoading()
            wx.showToast({ title: '记账成功', icon: 'success' })
            this.fetchBills()
            this.setData({ showAmountInput: false })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      }
    },

    // 3. Edit Remark
    onEditRemark(e: WechatMiniprogram.TouchEvent) {
      const billId = e.currentTarget.dataset.billId
      const remark = e.currentTarget.dataset.remark
      this.setData({
        editingRemarkId: billId,
        remarkInputValue: remark
      })
    },

    onRemarkInput(e: any) {
      this.setData({ remarkInputValue: e.detail.value })
    },

    onRemarkConfirm(e: any) {
      // Save remark
      const billId = this.data.editingRemarkId // currently editing
      // If triggered by blur, might click other things.
      // e.type === 'confirm' from input
      this.saveRemark(billId, this.data.remarkInputValue)
    },

    onRemarkBlur(e: any) {
      // Optional: Save on blur
      if (this.data.editingRemarkId) {
        this.saveRemark(this.data.editingRemarkId, this.data.remarkInputValue)
      }
    },

    saveRemark(billId: string, remark: string) {
      if (!billId) return

      this.setData({ editingRemarkId: '' }) // Exit edit mode immediately

      const db = wx.cloud.database()
      db.collection('ka_bills').doc(billId).update({
        data: { remark: remark },
        success: () => {
          // Local update optimization possible, for now fetch
          this.fetchBills()
        }
      })
    },

    // Helper
    findBill(id: string) {
      for (const group of this.data.billGroups) {
        const bill = group.bills.find(b => b.id === id)
        if (bill) return bill
      }
      return null
    },

    // 左滑删除按钮点击
    onSwipeCellClick(e: WechatMiniprogram.CustomEvent) {
      // 兼容处理
      const item = e.detail.item || e.detail

      if (item && item.text === '删除') {
        const billId = e.currentTarget.dataset.billId as string

        wx.showModal({
          title: '确认删除',
          content: '确定要删除这条记录吗？',
          success: (res) => {
            if (res.confirm) {
              this.deleteBill(billId)
            }
          },
        })
      }
    },

    // 删除账单
    deleteBill(billId: string) {
      wx.showLoading({ title: '删除中' })
      const db = wx.cloud.database()
      db.collection('ka_bills').doc(billId).remove()
        .then(() => {
          wx.hideLoading()
          wx.showToast({ title: '已删除' })
          this.fetchBills() // 重新加载
        })
        .catch(err => {
          wx.hideLoading()
          console.error('删除失败', err)
          wx.showToast({ title: '删除失败', icon: 'none' })
        })
    },
  },
})
