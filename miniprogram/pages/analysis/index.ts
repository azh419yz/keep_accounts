Component({
  data: {},

  methods: {
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


