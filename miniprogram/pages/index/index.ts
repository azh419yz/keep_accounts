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
  type: 'expense' | 'income'
  dayTotal: string
  bills: BillItem[]
}

Component({
  data: {
    currentYear: 2025,
    currentMonth: 12,
    currentMonthText: '2025年 12月',
    pickerDate: '2025-12',
    maxDate: '',
    monthExpense: '4,520.00',
    monthIncome: '8,800.00',
    expenseChange: '-5.8%',
    incomeChange: '+12.3%',
    billGroups: [] as BillGroup[],
    deleteBtnConfig: [
      {
        text: '删除',
        className: 'swipe-delete-btn',
      },
    ],
  },

  lifetimes: {
    attached() {
      // 设置最大日期为当前年月
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      this.setData({
        maxDate: `${year}-${month}`,
      })
      this.loadMockData()
    },
  },

  methods: {
    // 加载mock数据
    loadMockData() {
      const mockBills: BillItem[] = [
        {
          id: '1',
          type: 'expense',
          title: '午餐',
          category: '餐饮',
          categoryClass: 'meal',
          icon: '🍱',
          remark: '公司附近快餐',
          amount: '32.00',
          time: '12:08',
          date: '2025-12-22',
        },
        {
          id: '2',
          type: 'expense',
          title: '地铁',
          category: '交通',
          categoryClass: 'traffic',
          icon: '🚇',
          remark: '上班',
          amount: '6.00',
          time: '08:42',
          date: '2025-12-22',
        },
        {
          id: '3',
          type: 'expense',
          title: '水电费',
          category: '日用',
          categoryClass: 'bill',
          icon: '🧾',
          remark: '12月账单',
          amount: '320.00',
          time: '21:10',
          date: '2025-12-21',
        },
        {
          id: '4',
          type: 'expense',
          title: '游戏充值',
          category: '娱乐',
          categoryClass: 'game',
          icon: '🎮',
          remark: '周末',
          amount: '120.00',
          time: '18:05',
          date: '2025-12-21',
        },
        {
          id: '5',
          type: 'income',
          title: '工资',
          category: '收入',
          categoryClass: 'income',
          icon: '💰',
          remark: '12月工资',
          amount: '8,000.00',
          time: '10:00',
          date: '2025-12-20',
        },
      ]

      // 按日期分组
      const groupsMap = new Map<string, BillItem[]>()
      mockBills.forEach((bill) => {
        if (!groupsMap.has(bill.date)) {
          groupsMap.set(bill.date, [])
        }
        groupsMap.get(bill.date)!.push(bill)
      })

      // 转换为分组数据
      const billGroups: BillGroup[] = Array.from(groupsMap.entries())
        .map(([date, bills]) => {
          const dateObj = new Date(date)
          const month = dateObj.getMonth() + 1
          const day = dateObj.getDate()
          const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
          const weekday = weekdays[dateObj.getDay()]

          // 计算当日总额
          const dayTotal = bills
            .reduce((sum, bill) => {
              const amount = parseFloat(bill.amount.replace(/,/g, ''))
              return sum + (bill.type === 'expense' ? -amount : amount)
            }, 0)
            .toFixed(2)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',')

          // 判断当日主要类型（支出或收入）
          const expenseTotal = bills
            .filter((b) => b.type === 'expense')
            .reduce((sum, b) => sum + parseFloat(b.amount.replace(/,/g, '')), 0)
          const incomeTotal = bills
            .filter((b) => b.type === 'income')
            .reduce((sum, b) => sum + parseFloat(b.amount.replace(/,/g, '')), 0)
          const mainType = expenseTotal > incomeTotal ? 'expense' : 'income'

          return {
            date,
            dateText: `${month}月${day}日`,
            weekday,
            type: mainType,
            dayTotal: Math.abs(parseFloat(dayTotal.replace(/,/g, '')))
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ','),
            bills: bills.sort((a, b) => b.time.localeCompare(a.time)), // 按时间倒序
          }
        })
        .sort((a, b) => b.date.localeCompare(a.date)) // 按日期倒序

      this.setData({ billGroups })
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
      })

      // 这里可以重新加载该月份的数据
      wx.showToast({
        title: `已切换到${month}月`,
        icon: 'none',
        duration: 1500,
      })
    },

    // 左滑删除按钮点击
    onSwipeCellClick(e: WechatMiniprogram.CustomEvent) {
      const { action, data } = e.detail
      if (action === 'right' && data?.text === '删除') {
        const billId = e.currentTarget.dataset.billId as string
        const date = e.currentTarget.dataset.date as string

        wx.showModal({
          title: '确认删除',
          content: '确定要删除这条记录吗？',
          success: (res) => {
            if (res.confirm) {
              this.deleteBill(billId, date)
            }
          },
        })
      }
    },

    // 删除账单
    deleteBill(billId: string, date: string) {
      const billGroups = this.data.billGroups.map((group) => {
        if (group.date === date) {
          const bills = group.bills.filter((bill) => bill.id !== billId)

          if (bills.length === 0) {
            return null // 标记为空组，后续过滤
          }

          // 重新计算当日总额
          const dayTotal = bills
            .reduce((sum, bill) => {
              const amount = parseFloat(bill.amount.replace(/,/g, ''))
              return sum + (bill.type === 'expense' ? -amount : amount)
            }, 0)
            .toFixed(2)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',')

          const expenseTotal = bills
            .filter((b) => b.type === 'expense')
            .reduce((sum, b) => sum + parseFloat(b.amount.replace(/,/g, '')), 0)
          const incomeTotal = bills
            .filter((b) => b.type === 'income')
            .reduce((sum, b) => sum + parseFloat(b.amount.replace(/,/g, '')), 0)
          const mainType = expenseTotal > incomeTotal ? 'expense' : 'income'

          return {
            ...group,
            type: mainType,
            dayTotal: Math.abs(parseFloat(dayTotal.replace(/,/g, '')))
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ','),
            bills,
          }
        }
        return group
      })

      // 过滤掉空组
      const filteredGroups = billGroups.filter((g) => g !== null) as BillGroup[]

      this.setData({ billGroups: filteredGroups })

      wx.showToast({
        title: '已删除',
        icon: 'success',
      })

      // 这里可以调用云数据库删除接口
      // if (wx.cloud) {
      //   const db = wx.cloud.database()
      //   db.collection('ka_bills').doc(billId).remove()
      // }
    },
  },
})
