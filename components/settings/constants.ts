import {
  MdRestaurant,
  MdDirectionsCar,
  MdHome,
  MdWork,
  MdSportsEsports,
  MdMovie,
  MdShoppingCart,
  MdAttachMoney,
  MdCreditCard,
  MdLocalHospital,
  MdMenuBook,
  MdFlight,
  MdCardGiftcard,
  MdLocalCafe,
  MdFastfood,
  MdPerson,
  MdFavorite,
  MdShoppingBag,
  MdPayments,
  MdMusicNote,
  MdFitnessCenter,
  MdPets,
  MdStar,
  MdInventory,
} from 'react-icons/md';
import { IconType } from 'react-icons';

// 아이콘 매핑 (아이콘 ID -> React Icon 컴포넌트)
export const ICON_MAP: Record<string, IconType> = {
  star: MdStar,
  box: MdInventory,
  restaurant: MdRestaurant,
  car: MdDirectionsCar,
  home: MdHome,
  work: MdWork,
  game: MdSportsEsports,
  movie: MdMovie,
  cart: MdShoppingCart,
  money: MdAttachMoney,
  card: MdCreditCard,
  hospital: MdLocalHospital,
  book: MdMenuBook,
  flight: MdFlight,
  gift: MdCardGiftcard,
  cafe: MdLocalCafe,
  food: MdFastfood,
  person: MdPerson,
  heart: MdFavorite,
  bag: MdShoppingBag,
  payment: MdPayments,
  music: MdMusicNote,
  fitness: MdFitnessCenter,
  pet: MdPets,
};

// 아이콘 ID 목록 (DB에 저장되는 값)
export const ICON_LIST = Object.keys(ICON_MAP);

// 색상 목록
export const COLOR_LIST = [
  { name: '빨강', value: '#EF4444' },
  { name: '주황', value: '#F97316' },
  { name: '노랑', value: '#FBBF24' },
  { name: '초록', value: '#10B981' },
  { name: '파랑', value: '#3B82F6' },
  { name: '보라', value: '#A855F7' },
  { name: '분홍', value: '#EC4899' },
  { name: '회색', value: '#6B7280' },
];

// 아이콘 ID로 React Icon 컴포넌트 가져오기
export const getIconComponent = (iconId: string | null | undefined): IconType => {
  if (!iconId || !ICON_MAP[iconId]) {
    return MdAttachMoney; // 기본 아이콘
  }
  return ICON_MAP[iconId];
};
