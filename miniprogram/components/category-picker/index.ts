Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    selectedId: {
      type: String,
      value: ''
    },
    initialType: {
      type: String,
      value: 'expense'
    }
  },

  data: {
    type: 'expense',
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
    ]
  },

  observers: {
    'initialType': function (val) {
      if (val) this.setData({ type: val })
    },
    'selectedId': function (val) {
      if (val) this.setData({ selected: val })
    }
  },

  methods: {
    onVisibleChange(e: any) {
      this.triggerEvent('close')
    },

    onTypeChange(e: any) {
      const type = e.currentTarget.dataset.type
      this.setData({ type })
    },

    onSelect(e: any) {
      const { id, item } = e.currentTarget.dataset
      this.triggerEvent('select', { categoryId: id, category: item, type: this.data.type })
      // Auto close handled by parent or here? Request says "auto complete save and close"
      this.triggerEvent('close')
    }
  }
})
