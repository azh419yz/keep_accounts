Component({
  data: {
    type: 'expense' as 'expense' | 'income',
    period: 'week' as 'week' | 'month' | 'year',
    summaryAmount: '0.00',
    dailyAverage: '0.00',
    totalAmount: 0,
    monthTags: [] as Array<{
      label: string;
      active: boolean;
      year?: number;
      month?: number;
      week?: number;
      startDate?: string;
      endDate?: string;
    }>,
    chartData: [] as Array<{ label: string; amount: number; percentage: number }>,
    rankingData: [] as Array<{
      categoryName: string;
      categoryIcon: string;
      amount: string;
      count: number;
      percentage: number
    }>,
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth() + 1,
    selectedWeek: 0,
    selectedStartDate: '',
    selectedEndDate: '',
  },

  pageLifetimes: {
    show() {
      this.updateMonthTags()
      this.fetchChartData()
    }
  },

  lifetimes: {
    attached() {
      this.updateMonthTags()
    },
  },

  methods: {
    // Helper: Get ISO week number
    getWeekNumber(date: Date): number {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      const dayNum = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    },

    // Helper: Get Monday of a given week
    getMonday(year: number, week: number): Date {
      const jan4 = new Date(year, 0, 4)
      const jan4Day = jan4.getDay() || 7
      const monday = new Date(jan4)
      monday.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7)
      return monday
    },

    // Helper: Get week date range (Monday to Sunday)
    getWeekDateRange(year: number, week: number): { start: string; end: string } {
      const monday = this.getMonday(year, week)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      const formatDate = (d: Date) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }

      return {
        start: formatDate(monday),
        end: formatDate(sunday)
      }
    },

    // Fetch bills data
    fetchChartData() {
      wx.showLoading({ title: '加载中...' })
      const db = wx.cloud.database()
      const _ = db.command

      const { selectedStartDate, selectedEndDate, period } = this.data

      // Use stored date range
      let startDate = selectedStartDate
      let endDate = selectedEndDate

      // Fallback if dates not set
      if (!startDate || !endDate) {
        const now = new Date()
        if (period === 'month') {
          const year = now.getFullYear()
          const month = now.getMonth() + 1
          startDate = `${year}-${String(month).padStart(2, '0')}-01`
          let nextMonth = month + 1
          let nextYear = year
          if (nextMonth > 12) {
            nextMonth = 1
            nextYear++
          }
          endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
        } else if (period === 'week') {
          const weekNum = this.getWeekNumber(now)
          const range = this.getWeekDateRange(now.getFullYear(), weekNum)
          startDate = range.start
          const endDateObj = new Date(range.end)
          endDateObj.setDate(endDateObj.getDate() + 1)
          endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`
        } else {
          startDate = `${now.getFullYear()}-01-01`
          endDate = `${now.getFullYear() + 1}-01-01`
        }
      }

      db.collection('ka_bills')
        .where({
          date: _.gte(startDate).and(_.lt(endDate)),
          type: this.data.type
        })
        .orderBy('timestamp', 'desc')
        .get()
        .then(res => {
          this.processChartData(res.data as any[])
          this.processRankingData(res.data as any[])
          wx.hideLoading()
        })
        .catch(err => {
          console.error('加载失败', err)
          wx.hideLoading()
          wx.showToast({ title: '加载失败', icon: 'none' })
        })
    },

    // Process data for chart display
    processChartData(bills: any[]) {
      const { period, selectedStartDate } = this.data
      let chartData: Array<{ label: string; amount: number; percentage: number }> = []

      // Generate labels based on period (no actual data grouping for now)
      if (period === 'week') {
        // Generate Mon-Sun date labels
        if (selectedStartDate) {
          const monday = new Date(selectedStartDate)
          for (let i = 0; i < 7; i++) {
            const date = new Date(monday)
            date.setDate(monday.getDate() + i)
            const label = `${date.getMonth() + 1}-${date.getDate()}`
            chartData.push({ label, amount: 0, percentage: 0 })
          }
        }
      } else if (period === 'month') {
        // Generate day labels (01, 05, 10, 15, 20, 25, last day)
        const daysInMonth = new Date(this.data.selectedYear, this.data.selectedMonth, 0).getDate()
        const keyDays = [1, 5, 10, 15, 20, 25, daysInMonth]
        keyDays.forEach(day => {
          chartData.push({ label: String(day).padStart(2, '0'), amount: 0, percentage: 0 })
        })
      } else if (period === 'year') {
        // Generate month labels (1-12)
        for (let month = 1; month <= 12; month++) {
          chartData.push({ label: String(month), amount: 0, percentage: 0 })
        }
      }

      // Calculate summary
      const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0)
      const daysInMonth = new Date(this.data.selectedYear, this.data.selectedMonth, 0).getDate()
      const dailyAverage = totalAmount / daysInMonth

      this.setData({
        chartData,
        totalAmount,
        summaryAmount: totalAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        dailyAverage: dailyAverage.toFixed(2)
      })
    },

    // Process data for ranking display
    processRankingData(bills: any[]) {
      const categoryMap = new Map<string, { amount: number; count: number; icon: string }>()

      bills.forEach(bill => {
        const existing = categoryMap.get(bill.categoryName) || { amount: 0, count: 0, icon: bill.categoryIcon || '💰' }
        categoryMap.set(bill.categoryName, {
          amount: existing.amount + bill.amount,
          count: existing.count + 1,
          icon: bill.categoryIcon || existing.icon
        })
      })

      const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0)

      const rankingData = Array.from(categoryMap.entries())
        .map(([categoryName, data]) => ({
          categoryName,
          categoryIcon: data.icon,
          amount: data.amount.toFixed(2),
          count: data.count,
          percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0
        }))
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
        .slice(0, 10) // Top 10

      this.setData({ rankingData })
    },

    // 切换支出/收入
    onTypeChange(e: WechatMiniprogram.TouchEvent) {
      const type = e.currentTarget.dataset.type as 'expense' | 'income'
      this.setData({ type }, () => {
        this.fetchChartData()
      })
    },

    // 切换周/月/年
    onPeriodChange(e: WechatMiniprogram.CustomEvent) {
      const period = e.detail.value as 'week' | 'month' | 'year'
      this.setData({ period }, () => {
        this.updateMonthTags()
        this.fetchChartData()
      })
    },

    // 点击月份标签
    onMonthTagTap(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number
      const selectedTag = this.data.monthTags[index]

      const monthTags = this.data.monthTags.map((tag, i) => ({
        ...tag,
        active: i === index,
      }))

      this.setData({
        monthTags,
        selectedYear: selectedTag.year || this.data.selectedYear,
        selectedMonth: selectedTag.month || this.data.selectedMonth,
        selectedWeek: selectedTag.week || this.data.selectedWeek,
        selectedStartDate: selectedTag.startDate || this.data.selectedStartDate,
        selectedEndDate: selectedTag.endDate || this.data.selectedEndDate
      }, () => {
        this.fetchChartData()
      })
    },

    // 根据当前周期更新月份标签
    updateMonthTags() {
      const now = new Date()
      const period = this.data.period
      let tags: Array<{
        label: string;
        active: boolean;
        year?: number;
        month?: number;
        week?: number;
        startDate?: string;
        endDate?: string;
      }> = []

      if (period === 'week') {
        // 周视图：显示最近5周
        const currentWeek = this.getWeekNumber(now)
        const currentYear = now.getFullYear()

        for (let i = 4; i >= 0; i--) {
          const weekNum = currentWeek - i
          const range = this.getWeekDateRange(currentYear, weekNum)
          const endDateObj = new Date(range.end)
          endDateObj.setDate(endDateObj.getDate() + 1)
          const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`

          let label: string
          if (i === 0) label = '本周'
          else if (i === 1) label = '上周'
          else label = `第${weekNum}周`

          tags.push({
            label,
            active: i === 0,
            year: currentYear,
            week: weekNum,
            startDate: range.start,
            endDate
          })
        }

        // Set initial selected dates for current week
        const currentTag = tags[tags.length - 1]
        this.setData({
          selectedYear: currentTag.year!,
          selectedWeek: currentTag.week!,
          selectedStartDate: currentTag.startDate!,
          selectedEndDate: currentTag.endDate!
        })
      } else if (period === 'month') {
        // 月视图：显示最近5个月
        for (let i = 4; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const label = i === 0 ? '本月' : i === 1 ? '上月' : `${month}月`

          const startDate = `${year}-${String(month).padStart(2, '0')}-01`
          let nextMonth = month + 1
          let nextYear = year
          if (nextMonth > 12) {
            nextMonth = 1
            nextYear++
          }
          const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

          tags.push({ label, active: i === 0, year, month, startDate, endDate })
        }

        // Set initial selected dates for current month
        const currentTag = tags[tags.length - 1]
        this.setData({
          selectedYear: currentTag.year!,
          selectedMonth: currentTag.month!,
          selectedStartDate: currentTag.startDate!,
          selectedEndDate: currentTag.endDate!
        })
      } else {
        // 年视图：显示最近5年
        const currentYear = now.getFullYear()
        for (let i = 4; i >= 0; i--) {
          const year = currentYear - i
          const label = i === 0 ? '今年' : i === 1 ? '去年' : `${year}年`
          const startDate = `${year}-01-01`
          const endDate = `${year + 1}-01-01`

          tags.push({ label, active: i === 0, year, startDate, endDate })
        }

        // Set initial selected dates for current year
        const currentTag = tags[tags.length - 1]
        this.setData({
          selectedYear: currentTag.year!,
          selectedStartDate: currentTag.startDate!,
          selectedEndDate: currentTag.endDate!
        })
      }

      this.setData({ monthTags: tags })
    },
  },
})


