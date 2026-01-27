import { useAppStore } from '../useAppStore';

describe('useAppStore', () => {
  const initialDate = new Date(2024, 5, 1); // June 2024

  beforeEach(() => {
    useAppStore.setState({
      currentDate: initialDate,
      activeTab: 'dashboard',
      isMobile: false,
    });
  });

  describe('setCurrentDate', () => {
    it('should update currentDate', () => {
      const newDate = new Date(2024, 6, 1);
      useAppStore.getState().setCurrentDate(newDate);

      expect(useAppStore.getState().currentDate).toEqual(newDate);
    });
  });

  describe('setActiveTab', () => {
    it('should update activeTab to transactions', () => {
      useAppStore.getState().setActiveTab('transactions');
      expect(useAppStore.getState().activeTab).toBe('transactions');
    });

    it('should update activeTab to savings', () => {
      useAppStore.getState().setActiveTab('savings');
      expect(useAppStore.getState().activeTab).toBe('savings');
    });

    it('should update activeTab to dashboard', () => {
      useAppStore.setState({ activeTab: 'transactions' });
      useAppStore.getState().setActiveTab('dashboard');
      expect(useAppStore.getState().activeTab).toBe('dashboard');
    });
  });

  describe('setIsMobile', () => {
    it('should update isMobile to true', () => {
      useAppStore.getState().setIsMobile(true);
      expect(useAppStore.getState().isMobile).toBe(true);
    });

    it('should update isMobile to false', () => {
      useAppStore.setState({ isMobile: true });
      useAppStore.getState().setIsMobile(false);
      expect(useAppStore.getState().isMobile).toBe(false);
    });
  });

  describe('goToPreviousMonth', () => {
    it('should go to previous month', () => {
      useAppStore.getState().goToPreviousMonth();

      const state = useAppStore.getState();
      expect(state.currentDate.getFullYear()).toBe(2024);
      expect(state.currentDate.getMonth()).toBe(4); // May (0-indexed)
    });

    it('should handle year change when going from January', () => {
      useAppStore.setState({ currentDate: new Date(2024, 0, 1) }); // January 2024
      useAppStore.getState().goToPreviousMonth();

      const state = useAppStore.getState();
      expect(state.currentDate.getFullYear()).toBe(2023);
      expect(state.currentDate.getMonth()).toBe(11); // December
    });
  });

  describe('goToNextMonth', () => {
    it('should go to next month if not exceeding current month', () => {
      // Set current date to a past month
      useAppStore.setState({ currentDate: new Date(2020, 5, 1) }); // June 2020
      useAppStore.getState().goToNextMonth();

      const state = useAppStore.getState();
      expect(state.currentDate.getFullYear()).toBe(2020);
      expect(state.currentDate.getMonth()).toBe(6); // July
    });

    it('should handle year change when going from December', () => {
      useAppStore.setState({ currentDate: new Date(2020, 11, 1) }); // December 2020
      useAppStore.getState().goToNextMonth();

      const state = useAppStore.getState();
      expect(state.currentDate.getFullYear()).toBe(2021);
      expect(state.currentDate.getMonth()).toBe(0); // January
    });
  });

  describe('goToMonth', () => {
    it('should go to specific month', () => {
      useAppStore.getState().goToMonth(2023, 11); // December 2023

      const state = useAppStore.getState();
      expect(state.currentDate.getFullYear()).toBe(2023);
      expect(state.currentDate.getMonth()).toBe(11);
    });

    it('should set day to 1', () => {
      useAppStore.getState().goToMonth(2024, 2);

      const state = useAppStore.getState();
      expect(state.currentDate.getDate()).toBe(1);
    });
  });
});
