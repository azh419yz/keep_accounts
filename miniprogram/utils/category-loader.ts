
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, Category } from '../config/categories';

export async function loadUserCategories(type: 'expense' | 'income'): Promise<Category[]> {
    const defaultCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    let displayCategories = [...defaultCategories];

    const openid = wx.getStorageSync('ka_openid');
    if (openid) {
        try {
            const db = wx.cloud.database();
            const res = await db.collection('ka_user_settings').doc(openid).get().catch(() => null);

            if (res && res.data) {
                const orderKey = type === 'expense' ? 'expenseCategoryOrder' : 'incomeCategoryOrder';
                const orderList = res.data[orderKey];

                if (orderList && orderList.length > 0) {
                    const orderedCats: Category[] = [];
                    const map = new Map(defaultCategories.map(c => [c.id, c]));

                    orderList.forEach((id: string) => {
                        const cat = map.get(id);
                        if (cat) {
                            orderedCats.push(cat);
                        }
                    });

                    displayCategories = orderedCats;
                }
            }
        } catch (e) {
            console.error('Load settings failed', e);
        }
    }

    return displayCategories;
}
