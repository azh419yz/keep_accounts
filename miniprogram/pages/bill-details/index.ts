const app = getApp<IAppOption>()

interface MonthStats {
    month: number
    income: number
    expense: number
    balance: number
    incomeStr: string
    expenseStr: string
    balanceStr: string
}

interface YearStats {
    year: number
    income: number
    expense: number
    balance: number
    incomeStr: string
    expenseStr: string
    balanceStr: string
}

Page({
    data: {
        billType: 'month' as 'month' | 'year',
        selectedYear: new Date().getFullYear(),
        yearPickerVisible: false,
        yearOptions: [] as Array<{ label: string; value: number }>,

        // Stats for current year view
        yearStats: {
            income: 0,
            expense: 0,
            balance: 0,
            incomeStr: '0.00',
            expenseStr: '0.00',
            balanceStr: '0.00'
        },
        monthList: [] as MonthStats[],

        // Stats for all years view
        totalStats: {
            income: 0,
            expense: 0,
            balance: 0,
            incomeStr: '0.00',
            expenseStr: '0.00',
            balanceStr: '0.00'
        },
        yearList: [] as YearStats[]
    },

    onLoad() {
        this.initYearOptions()
        this.fetchData()
    },

    // Initialize year options (current year back to 2020)
    initYearOptions() {
        const currentYear = new Date().getFullYear()
        const options = []
        for (let i = 0; i < 10; i++) {
            options.push({ label: `${currentYear - i}年`, value: currentYear - i })
        }
        this.setData({ yearOptions: options })
    },

    onBack() {
        wx.navigateBack()
    },

    onSwitchType(e: WechatMiniprogram.TouchEvent) {
        const type = e.currentTarget.dataset.type
        if (type !== this.data.billType) {
            this.setData({ billType: type })
            this.fetchData()
        }
    },

    onShowYearPicker() {
        this.setData({ yearPickerVisible: true })
    },

    onHideYearPicker() {
        this.setData({ yearPickerVisible: false })
    },

    onYearChange(e: any) {
        const value = e.detail.value[0]
        this.setData({
            selectedYear: value,
            yearPickerVisible: false
        })
        this.fetchData()
    },

    fetchData() {
        if (this.data.billType === 'month') {
            this.fetchMonthData()
        } else {
            this.fetchYearData()
        }
    },

    // Fetch monthly data for selected year
    fetchMonthData() {
        wx.showLoading({ title: '加载中...' })
        const db = wx.cloud.database()
        const _ = db.command
        const year = this.data.selectedYear

        const startDate = `${year}-01-01`
        const endDate = `${year + 1}-01-01`

        db.collection('ka_bills')
            .where({
                date: _.gte(startDate).and(_.lt(endDate))
            })
            .orderBy('date', 'desc')
            .get()
            .then(res => {
                const bills = res.data as any[]
                this.processMonthData(bills)
                wx.hideLoading()
            })
            .catch(err => {
                console.error(err)
                wx.hideLoading()
            })
    },

    processMonthData(bills: any[]) {
        const monthMap = new Map<number, MonthStats>()
        let yearIncome = 0
        let yearExpense = 0

        // Initialize all months
        for (let i = 1; i <= 12; i++) {
            monthMap.set(i, {
                month: i,
                income: 0,
                expense: 0,
                balance: 0,
                incomeStr: '0.00',
                expenseStr: '0.00',
                balanceStr: '0.00'
            })
        }

        bills.forEach(bill => {
            const date = new Date(bill.date)
            const month = date.getMonth() + 1
            const stats = monthMap.get(month)!

            if (bill.type === 'income') {
                stats.income += bill.amount
                yearIncome += bill.amount
            } else {
                stats.expense += bill.amount
                yearExpense += bill.amount
            }
        })

        const monthList = Array.from(monthMap.values())
            .map(item => {
                item.balance = item.income - item.expense
                item.incomeStr = item.income.toFixed(2)
                item.expenseStr = item.expense.toFixed(2)
                item.balanceStr = item.balance.toFixed(2)
                return item
            })
            .sort((a, b) => b.month - a.month)
        // Filter out months with no data if desired, or keep all
        // .filter(m => m.income > 0 || m.expense > 0)

        const yearBalance = yearIncome - yearExpense

        this.setData({
            monthList,
            yearStats: {
                income: yearIncome,
                expense: yearExpense,
                balance: yearBalance,
                incomeStr: yearIncome.toFixed(2),
                expenseStr: yearExpense.toFixed(2),
                balanceStr: yearBalance.toFixed(2)
            }
        })
    },

    // Fetch all historical data grouped by year
    fetchYearData() {
        wx.showLoading({ title: '加载中...' })
        const db = wx.cloud.database()

        db.collection('ka_bills')
            .orderBy('date', 'desc')
            .get()
            .then(res => {
                const bills = res.data as any[]
                this.processYearData(bills)
                wx.hideLoading()
            })
            .catch(err => {
                console.error(err)
                wx.hideLoading()
            })
    },

    processYearData(bills: any[]) {
        const yearMap = new Map<number, YearStats>()
        let totalIncome = 0
        let totalExpense = 0

        bills.forEach(bill => {
            const date = new Date(bill.date)
            const year = date.getFullYear()

            if (!yearMap.has(year)) {
                yearMap.set(year, {
                    year,
                    income: 0,
                    expense: 0,
                    balance: 0,
                    incomeStr: '0.00',
                    expenseStr: '0.00',
                    balanceStr: '0.00'
                })
            }

            const stats = yearMap.get(year)!

            if (bill.type === 'income') {
                stats.income += bill.amount
                totalIncome += bill.amount
            } else {
                stats.expense += bill.amount
                totalExpense += bill.amount
            }
        })

        const yearList = Array.from(yearMap.values())
            .map(item => {
                item.balance = item.income - item.expense
                item.incomeStr = item.income.toFixed(2)
                item.expenseStr = item.expense.toFixed(2)
                item.balanceStr = item.balance.toFixed(2)
                return item
            })
            .sort((a, b) => b.year - a.year)

        const totalBalance = totalIncome - totalExpense

        this.setData({
            yearList,
            totalStats: {
                income: totalIncome,
                expense: totalExpense,
                balance: totalBalance,
                incomeStr: totalIncome.toFixed(2),
                expenseStr: totalExpense.toFixed(2),
                balanceStr: totalBalance.toFixed(2)
            }
        })
    }
})
