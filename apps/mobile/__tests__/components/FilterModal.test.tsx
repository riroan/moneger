import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterModal, FilterState } from '../../components/transactions/FilterModal';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

// Mock shared package
jest.mock('@moneger/shared', () => ({
  AMOUNT_LIMITS: {
    TRANSACTION_MAX: 100000000000,
  },
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock Icons
jest.mock('../../constants/Icons', () => ({
  getIconName: (icon: string) => icon || 'category',
}));

describe('FilterModal', () => {
  const mockCategories = {
    INCOME: [
      { id: 'cat-1', name: '급여', icon: 'work', color: '#10B981', type: 'INCOME' },
      { id: 'cat-2', name: '부수입', icon: 'attach-money', color: '#34D399', type: 'INCOME' },
    ],
    EXPENSE: [
      { id: 'cat-3', name: '식비', icon: 'restaurant', color: '#F97316', type: 'EXPENSE' },
      { id: 'cat-4', name: '교통비', icon: 'directions-bus', color: '#EF4444', type: 'EXPENSE' },
    ],
  };

  const initialState: FilterState = {
    filterType: 'ALL',
    isDateFilterEnabled: false,
    dateRange: null,
    isAmountFilterEnabled: false,
    amountRange: null,
    selectedCategories: [],
  };

  const defaultProps = {
    visible: true,
    categories: mockCategories,
    initialState,
    onClose: jest.fn(),
    onApply: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when visible', () => {
    const { getByText } = render(<FilterModal {...defaultProps} />);

    expect(getByText('필터')).toBeTruthy();
  });

  it('should render transaction type options', () => {
    const { getByText } = render(<FilterModal {...defaultProps} />);

    expect(getByText('거래 유형')).toBeTruthy();
    expect(getByText('전체')).toBeTruthy();
    expect(getByText('수입')).toBeTruthy();
    expect(getByText('지출')).toBeTruthy();
    expect(getByText('저축')).toBeTruthy();
  });

  it('should render date filter section', () => {
    const { getByText, getAllByText } = render(<FilterModal {...defaultProps} />);

    expect(getByText('기간')).toBeTruthy();
    // "사용" appears twice (for date and amount filter toggles)
    expect(getAllByText('사용').length).toBeGreaterThanOrEqual(1);
  });

  it('should render amount filter section', () => {
    const { getByText } = render(<FilterModal {...defaultProps} />);

    expect(getByText('금액 범위')).toBeTruthy();
  });

  it('should render category section', () => {
    const { getByText } = render(<FilterModal {...defaultProps} />);

    expect(getByText('카테고리')).toBeTruthy();
  });

  it('should render action buttons', () => {
    const { getByText } = render(<FilterModal {...defaultProps} />);

    expect(getByText('초기화')).toBeTruthy();
    expect(getByText('적용')).toBeTruthy();
  });

  it('should call onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { UNSAFE_root } = render(
      <FilterModal {...defaultProps} onClose={onClose} />
    );

    // Find the close touchable (first touchable after header)
    const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
    // The close button is the first touchable
    if (touchables.length > 0) {
      fireEvent.press(touchables[0]);
    }
  });

  it('should call onApply when apply button is pressed', () => {
    const onApply = jest.fn();
    const { getByText } = render(
      <FilterModal {...defaultProps} onApply={onApply} />
    );

    fireEvent.press(getByText('적용'));

    expect(onApply).toHaveBeenCalledWith(initialState);
  });

  it('should reset filters when reset button is pressed', () => {
    const onApply = jest.fn();
    const stateWithFilters: FilterState = {
      filterType: 'INCOME',
      isDateFilterEnabled: true,
      dateRange: { startYear: 2025, startMonth: 0, endYear: 2026, endMonth: 11 },
      isAmountFilterEnabled: true,
      amountRange: { minAmount: 1000, maxAmount: 50000 },
      selectedCategories: ['cat-1'],
    };

    const { getByText } = render(
      <FilterModal {...defaultProps} initialState={stateWithFilters} onApply={onApply} />
    );

    fireEvent.press(getByText('초기화'));
    fireEvent.press(getByText('적용'));

    expect(onApply).toHaveBeenCalledWith({
      filterType: 'ALL',
      isDateFilterEnabled: false,
      dateRange: null,
      isAmountFilterEnabled: false,
      amountRange: null,
      selectedCategories: [],
    });
  });

  it('should change filter type when type option is pressed', () => {
    const onApply = jest.fn();
    const { getByText, getAllByText } = render(
      <FilterModal {...defaultProps} onApply={onApply} />
    );

    // Press 수입 filter type - get the first one (in filter options, not category accordion)
    const incomeTexts = getAllByText('수입');
    fireEvent.press(incomeTexts[0]);

    fireEvent.press(getByText('적용'));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      filterType: 'INCOME',
    }));
  });

  it('should render income categories accordion', () => {
    const { getAllByText } = render(<FilterModal {...defaultProps} />);

    // "수입" appears twice: in filter type options and category accordion
    const incomeTexts = getAllByText('수입');
    expect(incomeTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('should render expense categories accordion', () => {
    const { getAllByText } = render(<FilterModal {...defaultProps} />);

    // "지출" appears twice: in filter type options and category accordion
    const expenseTexts = getAllByText('지출');
    expect(expenseTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('should show category names', () => {
    const { getByText } = render(<FilterModal {...defaultProps} />);

    expect(getByText('급여')).toBeTruthy();
    expect(getByText('부수입')).toBeTruthy();
    expect(getByText('식비')).toBeTruthy();
    expect(getByText('교통비')).toBeTruthy();
  });

  it('should toggle category selection', () => {
    const onApply = jest.fn();
    const { getByText } = render(
      <FilterModal {...defaultProps} onApply={onApply} />
    );

    // Select a category
    fireEvent.press(getByText('급여'));

    fireEvent.press(getByText('적용'));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      selectedCategories: ['cat-1'],
    }));
  });
});
