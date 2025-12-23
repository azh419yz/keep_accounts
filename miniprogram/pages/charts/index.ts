Component({
  data: {
    type: 'expense', // 'expense' | 'income'
    period: 'month', // 'week' | 'month' | 'year'
    summaryAmount: '4,520.00',
    monthTags: [
      { label: '8月', active: false },
      { label: '9月', active: false },
      { label: '10月', active: false },
      { label: '上月', active: false },
      { label: '本月', active: true },
    ],
  },

  lifetimes: {
    attached() {
      this.updateMonthTags()
    },
  },

  methods: {
    // 切换支出/收入
    onTypeChange(e: WechatMiniprogram.TouchEvent) {
      const type = e.currentTarget.dataset.type as 'expense' | 'income'
      this.setData({ type })
      // 这里可以根据 type 更新数据
      wx.showToast({
        title: type === 'expense' ? '已切换到支出' : '已切换到收入',
        icon: 'none',
        duration: 1500,
      })
    },

    // 切换周/月/年
    onPeriodChange(e: WechatMiniprogram.CustomEvent) {
      const period = e.detail.value as 'week' | 'month' | 'year'
      this.setData({ period })
      this.updateMonthTags()
      wx.showToast({
        title: period === 'week' ? '周视图' : period === 'month' ? '月视图' : '年视图',
        icon: 'none',
        duration: 1500,
      })
    },

    // 点击月份标签
    onMonthTagTap(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number
      const monthTags = this.data.monthTags.map((tag, i) => ({
        ...tag,
        active: i === index,
      }))
      this.setData({ monthTags })
      wx.showToast({
        title: `已选择 ${monthTags[index].label}`,
        icon: 'none',
        duration: 1500,
      })
    },

    // 根据当前周期更新月份标签
    updateMonthTags() {
      const now = new Date()
      const period = this.data.period
      let tags: Array<{ label: string; active: boolean }> = []

      if (period === 'month') {
        // 月视图：显示最近5个月
        for (let i = 4; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const label = i === 0 ? '本月' : i === 1 ? '上月' : `${date.getMonth() + 1}月`
          tags.push({ label, active: i === 0 })
        }
      } else if (period === 'week') {
        // 周视图：显示最近5周
        tags = [
          { label: '46周', active: false },
          { label: '47周', active: false },
          { label: '48周', active: false },
          { label: '49周', active: false },
          { label: '上周', active: false },
        ]
      } else {
        // 年视图：显示最近5年
        const currentYear = now.getFullYear()
        for (let i = 4; i >= 0; i--) {
          const year = currentYear - i
          const label = i === 0 ? '今年' : i === 1 ? '去年' : `${year}年`
          tags.push({ label, active: i === 0 })
        }
      }

      this.setData({ monthTags: tags })
    },
  },
})


