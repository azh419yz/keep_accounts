import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, Category } from '../../config/categories';

Page({
  data: {
    type: 'expense', // 'expense' | 'income'
    selectedCategories: [] as Category[],
    moreCategories: [] as Category[],

    // Drag Data
    dragging: false,
    dragIndex: -1,
    dragItem: null as Category | null,
    dragY: 0,
    dragX: 0,
    listTop: 0,
    itemHeight: 0
  },

  onLoad() {
    this.setData({ type: 'expense' });
    this.loadCategories();
  },

  // 切换类型
  onTypeChange(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type;
    if (type !== this.data.type) {
      this.setData({ type }, () => {
        this.loadCategories();
      });
    }
  },

  // 加载类别配置
  async loadCategories() {
    wx.showLoading({ title: '加载配置...' });
    const { type } = this.data;
    const defaultCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

    try {
      const db = wx.cloud.database();
      const openid = wx.getStorageSync('ka_openid');

      let userSettings: any = null;
      if (openid) {
        try {
          const res = await db.collection('ka_user_settings').doc(openid).get();
          userSettings = res.data;
        } catch (e) {
          // ignore
        }
      }

      let selected: Category[] = [];
      let more: Category[] = [];

      if (userSettings) {
        const orderKey = type === 'expense' ? 'expenseCategoryOrder' : 'incomeCategoryOrder';
        const orderList = userSettings[orderKey] as string[]; // List of IDs

        if (orderList && orderList.length > 0) {
          const map = new Map(defaultCategories.map(c => [c.id, c]));

          // Add ordered items to selected
          orderList.forEach(id => {
            const cat = map.get(id);
            if (cat) {
              selected.push(cat);
              map.delete(id);
            }
          });

          // Remaining items go to more
          map.forEach(cat => {
            more.push(cat);
          });
        } else {
          selected = [...defaultCategories];
        }
      } else {
        selected = [...defaultCategories];
      }

      this.setData({
        selectedCategories: selected,
        moreCategories: more
      });

    } catch (err) {
      console.error(err);
      this.setData({
        selectedCategories: [...defaultCategories],
        moreCategories: []
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 移除类别（移到更多）
  onRemove(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index;
    const { selectedCategories, moreCategories } = this.data;
    const item = selectedCategories[index];

    const newSelected = [...selectedCategories];
    newSelected.splice(index, 1);

    const newMore = [item, ...moreCategories]; // Prepend to more

    this.setData({
      selectedCategories: newSelected,
      moreCategories: newMore
    });
  },

  // 添加类别（移到已选）
  onAdd(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index;
    const { selectedCategories, moreCategories } = this.data;
    const item = moreCategories[index];

    const newMore = [...moreCategories];
    newMore.splice(index, 1);

    const newSelected = [...selectedCategories, item]; // Append to selected

    this.setData({
      selectedCategories: newSelected,
      moreCategories: newMore
    });
  },

  // 长按开始拖动
  onLongPress(e: any) {
    const index = e.currentTarget.dataset.index;
    const { selectedCategories } = this.data;
    const item = selectedCategories[index];
    const { clientX, clientY } = e.touches[0];

    // Creates a query to get list position
    const query = this.createSelectorQuery();
    query.select('.selected-list').boundingClientRect();
    query.select('.selected-item').boundingClientRect();
    query.exec((res) => {
      if (res[0] && res[1]) {
        const listRect = res[0];
        const itemRect = res[1];

        this.setData({
          dragging: true,
          dragIndex: index,
          dragItem: item,
          dragX: clientX,
          dragY: clientY,
          listTop: listRect.top,
          itemHeight: itemRect.height
        });

        wx.vibrateShort({ type: 'heavy' });
      }
    });
  },

  // 拖动中
  onTouchMove(e: any) {
    if (!this.data.dragging) return;

    const { clientX, clientY } = e.touches[0];
    const { listTop, itemHeight, dragIndex, selectedCategories } = this.data;

    // Update ghost position
    this.setData({
      dragX: clientX,
      dragY: clientY
    });

    // Calculate potential new index
    // Relative Y in list
    const relativeY = clientY - listTop;
    // Index
    let newIndex = Math.floor(relativeY / itemHeight);

    // Clamp
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= selectedCategories.length) newIndex = selectedCategories.length - 1;

    if (newIndex !== dragIndex) {
      // Swap logic
      const list = [...selectedCategories];
      const item = list[dragIndex];

      // Move item
      list.splice(dragIndex, 1);
      list.splice(newIndex, 0, item);

      this.setData({
        selectedCategories: list,
        dragIndex: newIndex
      });

      wx.vibrateShort({ type: 'light' });
    }
  },

  // 拖动结束
  onTouchEnd() {
    if (!this.data.dragging) return;
    this.setData({
      dragging: false,
      dragItem: null,
      dragIndex: -1
    });
  },

  // 保存配置
  async onSave() {
    wx.showLoading({ title: '保存中...' });
    const { type, selectedCategories } = this.data;
    // Only save selected IDs
    const enabledIds = selectedCategories.map(c => c.id);

    const db = wx.cloud.database();
    const openid = wx.getStorageSync('ka_openid');

    if (!openid) {
      wx.hideLoading();
      wx.showToast({ title: '未登录', icon: 'none' });
      return;
    }

    const orderKey = type === 'expense' ? 'expenseCategoryOrder' : 'incomeCategoryOrder';

    try {
      const res = await db.collection('ka_user_settings').doc(openid).get().catch(() => null);

      if (res && res.data) {
        await db.collection('ka_user_settings').doc(openid).update({
          data: {
            [orderKey]: enabledIds
          }
        });
      } else {
        await db.collection('ka_user_settings').add({
          data: {
            _id: openid,
            [orderKey]: enabledIds
          }
        });
      }

      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);

    } catch (err) {
      console.error(err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
});
