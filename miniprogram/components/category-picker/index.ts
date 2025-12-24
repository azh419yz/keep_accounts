import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../config/categories';

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
    categories: EXPENSE_CATEGORIES
  },

  observers: {
    'initialType': function (val) {
      if (val) {
        this.setData({
          type: val,
          categories: val === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
        })
      }
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
      this.setData({
        type,
        categories: type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
      })
    },

    onSelect(e: any) {
      const { id, item } = e.currentTarget.dataset
      this.triggerEvent('select', { categoryId: id, category: item, type: this.data.type })
      // Auto close handled by parent or here? Request says "auto complete save and close"
      this.triggerEvent('close')
    }
  }
})
