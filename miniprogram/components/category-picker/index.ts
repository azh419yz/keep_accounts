import { Category } from '../../config/categories';
import { loadUserCategories } from '../../utils/category-loader';

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
    categories: [] as Category[]
  },

  observers: {
    'initialType': function (val) {
      if (val) {
        this.setData({ type: val });
        this.loadCategories(val);
      }
    },
    'available': function (val) { // Watch visibility to refresh? Maybe overkill but safer if settings changed.
      if (val) {
        this.loadCategories(this.data.type);
      }
    },
    'selectedId': function (_val) {
      // if (val) this.setData({ selected: val }) // 'selected' data propert missing in original?
    }
  },

  lifetimes: {
    attached() {
      this.loadCategories(this.data.type);
    }
  },

  methods: {
    async loadCategories(type: string) {
      const t = (type === 'expense' || type === 'income') ? type : 'expense';
      const categories = await loadUserCategories(t);
      this.setData({ categories });
    },

    onVisibleChange() {
      this.triggerEvent('close')
    },

    onTypeChange(e: any) {
      const type = e.currentTarget.dataset.type
      this.setData({ type });
      this.loadCategories(type);
    },

    onSelect(e: any) {
      const { id, item } = e.currentTarget.dataset
      this.triggerEvent('select', { categoryId: id, category: item, type: this.data.type })
      this.triggerEvent('close')
    }
  }
})
