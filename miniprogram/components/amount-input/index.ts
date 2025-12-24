Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    categoryName: {
      type: String,
      value: ''
    },
    type: { // expense or income
      type: String,
      value: 'expense'
    },
    initialAmount: {
      type: String,
      value: '0.00'
    },
    initialDate: {
      type: String,
      value: ''
    }
  },

  data: {
    amount: '0.00',
    pickerDateValue: '',
    selectedDate: '',
    isCalculating: false
  },

  observers: {
    'initialAmount': function (val) {
      if (val) this.setData({ amount: val })
    },
    'initialDate': function (val) {
      if (val) {
        this.setData({ pickerDateValue: val })
        this.formatDate(val)
      } else {
        this.initDate()
      }
    }
  },

  lifetimes: {
    attached() {
      if (!this.properties.initialDate) {
        this.initDate()
      }
    }
  },

  methods: {
    initDate() {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      this.setData({
        pickerDateValue: dateStr
      })
      this.formatDate(dateStr)
    },

    formatDate(dateStr: string) {
      const [m, d] = dateStr.split('-')
      this.setData({
        selectedDate: `${m}-${d}`
      })
    },

    onVisibleChange(e: any) {
      this.triggerEvent('close')
    },

    // 键盘输入处理 (Copied from record-form)
    onKeyTap(e: WechatMiniprogram.TouchEvent) {
      const key = e.currentTarget.dataset.key as string
      let amount = this.data.amount.toString()

      // 如果当前是初始0，且输入的是数字，直接替换
      if (amount === '0.00' && !['.', '+', '-'].includes(key)) {
        amount = key
      } else {
        const lastChar = amount.slice(-1)
        if (['+', '-'].includes(lastChar) && ['+', '-'].includes(key)) {
          return
        }
        if (key === '.') {
          const parts = amount.split(/[\+\-]/)
          const currentPart = parts[parts.length - 1]
          if (currentPart.includes('.')) return
        }
        amount += key
      }

      const hasOperator = /[\+\-]/.test(amount)
      this.setData({ amount, isCalculating: hasOperator })
    },

    onBackspace() {
      let amount = this.data.amount.toString()
      if (amount.length > 1) {
        amount = amount.slice(0, -1)
      } else {
        amount = '0.00'
      }
      const hasOperator = /[\+\-]/.test(amount)
      this.setData({ amount, isCalculating: hasOperator })
    },

    handleDone() {
      if (this.data.isCalculating) {
        try {
          const result = this.calculateExpression(this.data.amount)
          this.setData({ amount: result, isCalculating: false })
        } catch (e) { }
      } else {
        // Return result
        this.triggerEvent('confirm', {
          amount: parseFloat(this.data.amount),
          date: this.data.pickerDateValue
        })
        this.triggerEvent('close')
      }
    },

    calculateExpression(expr: string): string {
      if (['+', '-'].includes(expr.slice(-1))) {
        expr = expr.slice(0, -1)
      }
      const nums = expr.split(/[\+\-]/).map(Number)
      const ops = expr.replace(/[0-9\.]/g, '').split('')

      if (nums.length === 0) return '0.00'

      let result = nums[0]
      for (let i = 0; i < ops.length; i++) {
        const nextNum = nums[i + 1]
        if (ops[i] === '+') result += nextNum
        else if (ops[i] === '-') result -= nextNum
      }
      return Math.max(0, result).toFixed(2)
    },

    onDatePickerChange(e: WechatMiniprogram.PickerChange) {
      const dateStr = e.detail.value as string
      this.setData({ pickerDateValue: dateStr })
      this.formatDate(dateStr)
    }
  }
})
