import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryExpenseList, CategoryData } from '../../components/home/CategoryExpenseList';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

// Mock shared package
jest.mock('@moneger/shared', () => ({
  formatNumber: (num: number) => num.toLocaleString('ko-KR'),
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock Icons
jest.mock('../../constants/Icons', () => ({
  getIconName: (icon: string | null) => icon || 'category',
}));

// Mock DonutChart
jest.mock('../../components/charts', () => ({
  DonutChart: 'DonutChart',
  DonutChartData: {},
}));

describe('CategoryExpenseList', () => {
  const mockCategories: CategoryData[] = [
    {
      id: '1',
      name: '식비',
      icon: 'restaurant',
      color: '#EF4444',
      total: 500000,
      count: 15,
      budget: 600000,
    },
    {
      id: '2',
      name: '교통비',
      icon: 'directions-car',
      color: '#3B82F6',
      total: 200000,
      count: 10,
      budget: 300000,
    },
    {
      id: '3',
      name: '쇼핑',
      icon: 'shopping-bag',
      color: '#8B5CF6',
      total: 150000,
      count: 5,
    },
  ];

  const defaultProps = {
    categories: mockCategories,
    selectedIndex: null,
    onSelectIndex: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render title', () => {
    const { getByText } = render(<CategoryExpenseList {...defaultProps} />);

    expect(getByText('카테고리별 지출')).toBeTruthy();
  });

  it('should render all categories', () => {
    const { getByText } = render(<CategoryExpenseList {...defaultProps} />);

    expect(getByText('식비')).toBeTruthy();
    expect(getByText('교통비')).toBeTruthy();
    expect(getByText('쇼핑')).toBeTruthy();
  });

  it('should render category amounts', () => {
    const { getByText } = render(<CategoryExpenseList {...defaultProps} />);

    expect(getByText('₩500,000')).toBeTruthy();
    expect(getByText('₩200,000')).toBeTruthy();
    expect(getByText('₩150,000')).toBeTruthy();
  });

  it('should render category counts', () => {
    const { getByText } = render(<CategoryExpenseList {...defaultProps} />);

    expect(getByText('15건')).toBeTruthy();
    expect(getByText('10건')).toBeTruthy();
    expect(getByText('5건')).toBeTruthy();
  });

  it('should render budget info when available', () => {
    const { getByText } = render(<CategoryExpenseList {...defaultProps} />);

    expect(getByText('예산: ₩600,000')).toBeTruthy();
    expect(getByText('예산: ₩300,000')).toBeTruthy();
  });

  it('should render budget usage percentage', () => {
    const { getByText } = render(<CategoryExpenseList {...defaultProps} />);

    expect(getByText('83% 사용')).toBeTruthy(); // 500000/600000 = 83%
    expect(getByText('67% 사용')).toBeTruthy(); // 200000/300000 = 67%
  });

  it('should call onSelectIndex when category is pressed', () => {
    const onSelectIndex = jest.fn();
    const { getByText } = render(
      <CategoryExpenseList {...defaultProps} onSelectIndex={onSelectIndex} />
    );

    fireEvent.press(getByText('식비'));

    expect(onSelectIndex).toHaveBeenCalledWith(0);
  });

  it('should deselect when pressing selected category', () => {
    const onSelectIndex = jest.fn();
    const { getByText } = render(
      <CategoryExpenseList
        {...defaultProps}
        selectedIndex={0}
        onSelectIndex={onSelectIndex}
      />
    );

    fireEvent.press(getByText('식비'));

    expect(onSelectIndex).toHaveBeenCalledWith(null);
  });

  it('should show empty state when no categories', () => {
    const { getByText } = render(
      <CategoryExpenseList
        categories={[]}
        selectedIndex={null}
        onSelectIndex={jest.fn()}
      />
    );

    expect(getByText('이번 달 지출 내역이 없습니다')).toBeTruthy();
  });

  it('should render categories without budget', () => {
    const categoriesNoBudget = mockCategories.map((c) => ({
      ...c,
      budget: undefined,
    }));

    const { getByText, queryByText } = render(
      <CategoryExpenseList
        categories={categoriesNoBudget}
        selectedIndex={null}
        onSelectIndex={jest.fn()}
      />
    );

    expect(getByText('식비')).toBeTruthy();
    expect(queryByText('예산:')).toBeNull();
  });

  it('should handle category with null color', () => {
    const categoriesNoColor: CategoryData[] = [
      {
        id: '1',
        name: '기타',
        icon: null,
        color: null,
        total: 100000,
        count: 3,
      },
    ];

    const { getByText } = render(
      <CategoryExpenseList
        categories={categoriesNoColor}
        selectedIndex={null}
        onSelectIndex={jest.fn()}
      />
    );

    expect(getByText('기타')).toBeTruthy();
  });

  it('should show high budget usage color when over 90%', () => {
    const highUsageCategories: CategoryData[] = [
      {
        id: '1',
        name: '식비',
        icon: 'restaurant',
        color: '#EF4444',
        total: 95000,
        count: 10,
        budget: 100000,
      },
    ];

    const { getByText } = render(
      <CategoryExpenseList
        categories={highUsageCategories}
        selectedIndex={null}
        onSelectIndex={jest.fn()}
      />
    );

    expect(getByText('95% 사용')).toBeTruthy();
  });

  it('should select second category when pressed', () => {
    const onSelectIndex = jest.fn();
    const { getByText } = render(
      <CategoryExpenseList {...defaultProps} onSelectIndex={onSelectIndex} />
    );

    fireEvent.press(getByText('교통비'));

    expect(onSelectIndex).toHaveBeenCalledWith(1);
  });
});
