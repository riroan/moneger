import { MaterialIcons } from '@expo/vector-icons';

// MaterialIcons 컴포넌트의 name prop 타입
export type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

// 아이콘 매핑 (아이콘 ID -> MaterialIcons name)
// 웹의 react-icons/md와 동일한 아이콘을 @expo/vector-icons로 매핑
export const ICON_MAP: Record<string, MaterialIconName> = {
  star: 'star',
  box: 'inventory',
  restaurant: 'restaurant',
  car: 'directions-car',
  home: 'home',
  work: 'work',
  game: 'sports-esports',
  movie: 'movie',
  cart: 'shopping-cart',
  money: 'attach-money',
  card: 'credit-card',
  hospital: 'local-hospital',
  book: 'menu-book',
  flight: 'flight',
  gift: 'card-giftcard',
  cafe: 'local-cafe',
  food: 'fastfood',
  person: 'person',
  heart: 'favorite',
  bag: 'shopping-bag',
  payment: 'payments',
  music: 'music-note',
  fitness: 'fitness-center',
  pet: 'pets',
  savings: 'savings',
};

// 아이콘 ID 목록 (DB에 저장되는 값)
export const ICON_LIST = Object.keys(ICON_MAP);

// 색상 목록 (웹과 동일)
export const COLOR_LIST = [
  { name: '빨강', value: '#EF4444' },
  { name: '주황', value: '#F97316' },
  { name: '노랑', value: '#FBBF24' },
  { name: '라임', value: '#84CC16' },
  { name: '초록', value: '#10B981' },
  { name: '청록', value: '#14B8A6' },
  { name: '하늘', value: '#06B6D4' },
  { name: '파랑', value: '#3B82F6' },
  { name: '남색', value: '#6366F1' },
  { name: '보라', value: '#A855F7' },
  { name: '분홍', value: '#EC4899' },
  { name: '회색', value: '#6B7280' },
];

// 아이콘 ID로 MaterialIcons name 가져오기
export const getIconName = (iconId: string | null | undefined): MaterialIconName => {
  if (!iconId || !ICON_MAP[iconId]) {
    return 'attach-money'; // 기본 아이콘
  }
  return ICON_MAP[iconId];
};

// UI 아이콘 (섹션 헤더, 요약 카드 등에서 사용)
export const UI_ICONS = {
  // Summary cards
  income: 'trending-up' as MaterialIconName,
  expense: 'trending-down' as MaterialIconName,
  savings: 'savings' as MaterialIconName,
  balance: 'account-balance-wallet' as MaterialIconName,

  // Section headers
  today: 'today' as MaterialIconName,
  history: 'history' as MaterialIconName,
  pieChart: 'pie-chart' as MaterialIconName,

  // Empty states
  receipt: 'receipt-long' as MaterialIconName,

  // Navigation
  chevronRight: 'chevron-right' as MaterialIconName,

  // Transaction types
  transactionIncome: 'arrow-downward' as MaterialIconName,
  transactionExpense: 'arrow-upward' as MaterialIconName,
};
