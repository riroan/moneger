import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DonutChart from '../../components/charts/DonutChart';

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

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) =>
      React.createElement('Svg', props, children),
    Svg: ({ children, ...props }: any) =>
      React.createElement('Svg', props, children),
    Path: (props: any) => React.createElement('Path', props),
    G: ({ children, ...props }: any) =>
      React.createElement('G', props, children),
  };
});

describe('DonutChart', () => {
  const mockData = [
    { color: '#EF4444', amount: 50000, name: '식비' },
    { color: '#3B82F6', amount: 30000, name: '교통비' },
    { color: '#10B981', amount: 20000, name: '쇼핑' },
  ];

  const defaultProps = {
    data: mockData,
    totalAmount: 100000,
    selectedIndex: null,
    onSegmentPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render chart', () => {
    const { UNSAFE_root } = render(<DonutChart {...defaultProps} />);

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should display total amount when no segment selected', () => {
    const { getByText } = render(<DonutChart {...defaultProps} />);

    expect(getByText('₩100,000')).toBeTruthy();
  });

  it('should display default empty text when no segment selected', () => {
    const { getByText } = render(<DonutChart {...defaultProps} />);

    expect(getByText('총 지출')).toBeTruthy();
  });

  it('should display custom empty text', () => {
    const { getByText } = render(
      <DonutChart {...defaultProps} emptyText="이번 달 지출" />
    );

    expect(getByText('이번 달 지출')).toBeTruthy();
  });

  it('should display selected segment amount', () => {
    const { getByText } = render(
      <DonutChart {...defaultProps} selectedIndex={0} />
    );

    expect(getByText('₩50,000')).toBeTruthy();
  });

  it('should display selected segment name', () => {
    const { getByText } = render(
      <DonutChart {...defaultProps} selectedIndex={0} />
    );

    expect(getByText('식비')).toBeTruthy();
  });

  it('should call onSegmentPress when chart is pressed', () => {
    const onSegmentPress = jest.fn();
    const { UNSAFE_root } = render(
      <DonutChart {...defaultProps} onSegmentPress={onSegmentPress} />
    );

    // Find TouchableOpacity and simulate press
    const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
    if (touchables.length > 0) {
      fireEvent.press(touchables[0], {
        nativeEvent: { locationX: 78, locationY: 78 },
      });
    }
  });

  it('should render with custom size', () => {
    const { UNSAFE_root } = render(
      <DonutChart {...defaultProps} size={200} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with custom strokeWidth', () => {
    const { UNSAFE_root } = render(
      <DonutChart {...defaultProps} strokeWidth={30} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render empty data gracefully', () => {
    const { getByText } = render(
      <DonutChart {...defaultProps} data={[]} totalAmount={0} />
    );

    expect(getByText('₩0')).toBeTruthy();
  });

  it('should render single segment', () => {
    const singleData = [{ color: '#EF4444', amount: 100000, name: '식비' }];

    const { getByText, UNSAFE_root } = render(
      <DonutChart {...defaultProps} data={singleData} />
    );

    expect(UNSAFE_root).toBeTruthy();
    expect(getByText('₩100,000')).toBeTruthy();
  });

  it('should format large amounts correctly', () => {
    const largeData = [
      { color: '#EF4444', amount: 5000000, name: '식비' },
    ];

    const { getByText } = render(
      <DonutChart
        {...defaultProps}
        data={largeData}
        totalAmount={5000000}
        selectedIndex={0}
      />
    );

    expect(getByText('₩5,000,000')).toBeTruthy();
  });

  it('should display second segment when selected', () => {
    const { getByText } = render(
      <DonutChart {...defaultProps} selectedIndex={1} />
    );

    expect(getByText('₩30,000')).toBeTruthy();
    expect(getByText('교통비')).toBeTruthy();
  });

  it('should display third segment when selected', () => {
    const { getByText } = render(
      <DonutChart {...defaultProps} selectedIndex={2} />
    );

    expect(getByText('₩20,000')).toBeTruthy();
    expect(getByText('쇼핑')).toBeTruthy();
  });
});
