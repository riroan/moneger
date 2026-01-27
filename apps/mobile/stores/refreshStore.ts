import { create } from 'zustand';

interface RefreshState {
  // Timestamp to trigger refresh
  lastTransactionUpdate: number;

  // Trigger a refresh
  triggerRefresh: () => void;
}

export const useRefreshStore = create<RefreshState>((set) => ({
  lastTransactionUpdate: 0,

  triggerRefresh: () => {
    set({ lastTransactionUpdate: Date.now() });
  },
}));
