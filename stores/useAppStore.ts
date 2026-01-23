import { create } from 'zustand';

export type ActiveTab = 'dashboard' | 'transactions' | 'savings';

interface AppState {
  currentDate: Date;
  activeTab: ActiveTab;
  isMobile: boolean;
}

interface AppActions {
  setCurrentDate: (date: Date) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setIsMobile: (isMobile: boolean) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToMonth: (year: number, month: number) => void;
}

type AppStore = AppState & AppActions;

const getInitialDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export const useAppStore = create<AppStore>((set, get) => ({
  currentDate: getInitialDate(),
  activeTab: 'dashboard',
  isMobile: false,

  setCurrentDate: (date) => set({ currentDate: date }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setIsMobile: (isMobile) => set({ isMobile }),

  goToPreviousMonth: () => {
    const { currentDate } = get();
    set({ currentDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1) });
  },

  goToNextMonth: () => {
    const { currentDate } = get();
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const now = new Date();
    if (next <= new Date(now.getFullYear(), now.getMonth(), 1)) {
      set({ currentDate: next });
    }
  },

  goToMonth: (year, month) => {
    set({ currentDate: new Date(year, month, 1) });
  },
}));
