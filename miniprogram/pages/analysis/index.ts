Component({
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    monthText: '',
    daysTracking: 0,
    monthIncome: '0.00',
    monthExpense: '0.00',
    monthBalance: '0.00',
    balanceChange: '',
    balanceChangeType: 'same' as 'increase' | 'decrease' | 'same',
  },

  pageLifetimes: {
    show() {
      this.initData()
      this.fetchMonthlyData()
      this.calculateDaysTracking()
    }
  },

  methods: {
    initData() {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      this.setData({
        currentYear: year,
        currentMonth: month,
        monthText: `${month}月`
      })
    },

    // Fetch current month's bills
    fetchMonthlyData() {
      wx.showLoading({ title: '加载中...' })
      const db = wx.cloud.database()
      const _ = db.command

      const { currentYear, currentMonth } = this.data

      // Current month range
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      let nextMonth = currentMonth + 1
      let nextYear = currentYear
      if (nextMonth > 12) {
        nextMonth = 1
        nextYear++
      }
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

      // Fetch current month bills
      db.collection('ka_bills')
        .where({
          date: _.gte(startDate).and(_.lt(endDate))
        })
        .get()
        .then(res => {
          const currentBills = res.data as any[]

          // Fetch last month bills for comparison
          let lastMonth = currentMonth - 1
          let lastYear = currentYear
          if (lastMonth < 1) {
            lastMonth = 12
            lastYear--
          }

          const lastStartDate = `${lastYear}-${String(lastMonth).padStart(2, '0')}-01`
          const lastEndDate = startDate

          return db.collection('ka_bills')
            .where({
              date: _.gte(lastStartDate).and(_.lt(lastEndDate))
            })
            .get()
            .then(lastRes => {
              this.calculateStats(currentBills, lastRes.data as any[])
              wx.hideLoading()
            })
        })
        .catch(err => {
          console.error('加载失败', err)
          wx.hideLoading()
          wx.showToast({ title: '加载失败', icon: 'none' })
        })
    },

    // Calculate statistics
    calculateStats(currentBills: any[], lastBills: any[]) {
      // Current month stats
      const monthIncome = currentBills
        .filter(b => b.type === 'income')
        .reduce((sum, b) => sum + b.amount, 0)

      const monthExpense = currentBills
        .filter(b => b.type === 'expense')
        .reduce((sum, b) => sum + b.amount, 0)

      const monthBalance = monthIncome - monthExpense

      // Last month stats
      const lastIncome = lastBills
        .filter(b => b.type === 'income')
        .reduce((sum, b) => sum + b.amount, 0)

      const lastExpense = lastBills
        .filter(b => b.type === 'expense')
        .reduce((sum, b) => sum + b.amount, 0)

      const lastBalance = lastIncome - lastExpense

      // Calculate change
      let balanceChange = ''
      let balanceChangeType: 'increase' | 'decrease' | 'same' = 'same'

      if (lastBalance !== 0) {
        const changePercent = ((monthBalance - lastBalance) / Math.abs(lastBalance)) * 100
        if (changePercent > 0) {
          balanceChange = `+${changePercent.toFixed(1)}%`
          balanceChangeType = 'increase'
        } else if (changePercent < 0) {
          balanceChange = `${changePercent.toFixed(1)}%`
          balanceChangeType = 'decrease'
        } else {
          balanceChange = '0%'
        }
      } else if (monthBalance > 0) {
        balanceChange = '+100%'
        balanceChangeType = 'increase'
      }

      this.setData({
        monthIncome: monthIncome.toFixed(2),
        monthExpense: monthExpense.toFixed(2),
        monthBalance: monthBalance.toFixed(2),
        balanceChange,
        balanceChangeType
      })
    },

    // Calculate days tracking
    calculateDaysTracking() {
      const db = wx.cloud.database()

      db.collection('ka_bills')
        .orderBy('timestamp', 'asc')
        .limit(1)
        .get()
        .then(res => {
          if (res.data.length > 0) {
            const firstBill = res.data[0] as any
            const firstDate = new Date(firstBill.date)
            const now = new Date()
            const diffTime = Math.abs(now.getTime() - firstDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            this.setData({ daysTracking: diffDays })
          }
        })
        .catch(err => {
          console.error('计算记账天数失败', err)
        })
    },

    // Go to bill details page
    onGoDetail() {
      wx.navigateTo({
        url: '/pages/bill-details/index'
      })
    },

    // 设置预算
    onSetBudget() {
      wx.showModal({
        title: '设置预算',
        content: '预算功能暂未实现，后续版本将支持设置月度预算。',
        showCancel: false,
      })
    },
  },
})
