import { MdHome, MdDirectionsCar, MdSchool, MdFlight, MdDevices, MdSavings } from 'react-icons/md';
import { FaGift, FaHeartbeat } from 'react-icons/fa';

export const GOAL_ICONS = [
  { id: 'home', icon: MdHome, label: '내 집' },
  { id: 'car', icon: MdDirectionsCar, label: '자동차' },
  { id: 'school', icon: MdSchool, label: '교육' },
  { id: 'travel', icon: MdFlight, label: '여행' },
  { id: 'device', icon: MdDevices, label: '전자기기' },
  { id: 'gift', icon: FaGift, label: '선물' },
  { id: 'health', icon: FaHeartbeat, label: '건강' },
  { id: 'savings', icon: MdSavings, label: '저축' },
] as const;

export const GOAL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  home: MdHome,
  car: MdDirectionsCar,
  school: MdSchool,
  travel: MdFlight,
  device: MdDevices,
  gift: FaGift,
  health: FaHeartbeat,
  savings: MdSavings,
};

export function getGoalIcon(iconId: string): React.ComponentType<{ className?: string }> {
  return GOAL_ICON_MAP[iconId] || MdSavings;
}
