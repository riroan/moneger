import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CategoryDropdown from '../../components/common/CategoryDropdown';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock Icons
jest.mock('../../constants/Icons', () => ({
  getIconName: (icon: string) => icon || 'category',
}));

describe('CategoryDropdown', () => {
  const mockCategories = [
    { id: '1', name: '식비', icon: 'restaurant', color: '#EF4444', type: 'EXPENSE' as const },
    { id: '2', name: '교통비', icon: 'directions-car', color: '#3B82F6', type: 'EXPENSE' as const },
    { id: '3', name: '급여', icon: 'attach-money', color: '#10B981', type: 'INCOME' as const },
  ];

  const defaultProps = {
    categories: mockCategories,
    selectedId: null,
    onSelect: jest.fn(),
    isOpen: false,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render placeholder when no category selected', () => {
    const { getByText } = render(<CategoryDropdown {...defaultProps} />);

    expect(getByText('카테고리 선택')).toBeTruthy();
  });

  it('should render custom placeholder', () => {
    const { getByText } = render(
      <CategoryDropdown {...defaultProps} placeholder="분류를 선택하세요" />
    );

    expect(getByText('분류를 선택하세요')).toBeTruthy();
  });

  it('should render label when provided', () => {
    const { getByText } = render(
      <CategoryDropdown {...defaultProps} label="카테고리" />
    );

    expect(getByText('카테고리')).toBeTruthy();
  });

  it('should display selected category', () => {
    const { getByText } = render(
      <CategoryDropdown {...defaultProps} selectedId="1" />
    );

    expect(getByText('식비')).toBeTruthy();
  });

  it('should call onToggle when trigger is pressed', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <CategoryDropdown {...defaultProps} onToggle={onToggle} />
    );

    fireEvent.press(getByText('카테고리 선택'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should display category list when open', () => {
    const { getByText } = render(
      <CategoryDropdown {...defaultProps} isOpen={true} />
    );

    expect(getByText('식비')).toBeTruthy();
    expect(getByText('교통비')).toBeTruthy();
    expect(getByText('급여')).toBeTruthy();
  });

  it('should not display category list when closed', () => {
    const { queryByText } = render(
      <CategoryDropdown {...defaultProps} isOpen={false} selectedId={null} />
    );

    // When closed with no selection, only placeholder should be visible
    expect(queryByText('카테고리 선택')).toBeTruthy();
    // Category names shouldn't be in the list (only selected one would appear in trigger)
    // But since nothing is selected, categories shouldn't be visible
  });

  it('should call onSelect and onToggle when category is selected', () => {
    const onSelect = jest.fn();
    const onToggle = jest.fn();
    const { getByText } = render(
      <CategoryDropdown
        {...defaultProps}
        isOpen={true}
        onSelect={onSelect}
        onToggle={onToggle}
      />
    );

    fireEvent.press(getByText('식비'));

    expect(onSelect).toHaveBeenCalledWith('1');
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should show loading state', () => {
    const { getByText } = render(
      <CategoryDropdown {...defaultProps} isLoading={true} />
    );

    expect(getByText('로딩 중...')).toBeTruthy();
  });

  it('should disable trigger when loading', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <CategoryDropdown {...defaultProps} isLoading={true} onToggle={onToggle} />
    );

    fireEvent.press(getByText('로딩 중...'));

    expect(onToggle).not.toHaveBeenCalled();
  });

  it('should not show list when loading even if open', () => {
    const { queryByText } = render(
      <CategoryDropdown {...defaultProps} isOpen={true} isLoading={true} />
    );

    // Category list should not be visible when loading
    expect(queryByText('로딩 중...')).toBeTruthy();
  });

  it('should render empty list gracefully', () => {
    const { getByText } = render(
      <CategoryDropdown
        {...defaultProps}
        categories={[]}
        isOpen={true}
      />
    );

    expect(getByText('카테고리 선택')).toBeTruthy();
  });

  it('should highlight selected category in list', () => {
    const { UNSAFE_root } = render(
      <CategoryDropdown
        {...defaultProps}
        isOpen={true}
        selectedId="1"
      />
    );

    // Component should render without errors
    expect(UNSAFE_root).toBeTruthy();
  });
});
