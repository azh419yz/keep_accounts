export interface Category {
    id: string;
    name: string;
    icon: string;
    class: string;
}

export const EXPENSE_CATEGORIES: Category[] = [
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
];

export const INCOME_CATEGORIES: Category[] = [
    { id: 'salary', name: '工资', icon: '💰', class: 'salary' },
    { id: 'bonus', name: '奖金', icon: '🧧', class: 'gift' },
    { id: 'investment', name: '理财', icon: '📈', class: 'traffic' },
    { id: 'parttime', name: '兼职', icon: '🔨', class: 'daily' },
    { id: 'gift_in', name: '礼金', icon: '🎁', class: 'play' },
    { id: 'other_in', name: '其他', icon: '🔧', class: 'other' },
];
