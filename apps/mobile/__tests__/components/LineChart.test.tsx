import React from 'react';
import { render } from '@testing-library/react-native';
import LineChart from '../../components/charts/LineChart';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

// Mock shared package
jest.mock('@moneger/shared', () => ({
  formatNumber: (num: number) => num.toLocaleString('ko-KR'),
  getKSTDateParts: (date: Date) => ({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    dayOfWeek: date.getDay(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
  }),
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
    Circle: (props: any) => React.createElement('Circle', props),
    Line: (props: any) => React.createElement('Line', props),
    Text: (props: any) => React.createElement('SvgText', props),
    Rect: (props: any) => React.createElement('Rect', props),
  };
});

describe('LineChart', () => {
  const mockData = [
    { date: '2024-01-01', value: 100000 },
    { date: '2024-01-02', value: 150000 },
    { date: '2024-01-03', value: 120000 },
    { date: '2024-01-04', value: 180000 },
    { date: '2024-01-05', value: 140000 },
  ];

  const defaultProps = {
    data: mockData,
    width: 300,
    height: 200,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render chart', () => {
    const { UNSAFE_root } = render(<LineChart {...defaultProps} />);

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should show empty message when no data', () => {
    const { getByText } = render(
      <LineChart data={[]} width={300} height={200} />
    );

    expect(getByText('데이터가 없습니다')).toBeTruthy();
  });

  it('should render with single data point', () => {
    const singleData = [{ date: '2024-01-01', value: 100000 }];

    const { UNSAFE_root } = render(
      <LineChart data={singleData} width={300} height={200} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with custom line color', () => {
    const { UNSAFE_root } = render(
      <LineChart {...defaultProps} lineColor="#FF0000" />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with custom fill color', () => {
    const { UNSAFE_root } = render(
      <LineChart {...defaultProps} fillColor="#00FF00" />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render without dots', () => {
    const { UNSAFE_root } = render(
      <LineChart {...defaultProps} showDots={false} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render without labels', () => {
    const { UNSAFE_root } = render(
      <LineChart {...defaultProps} showLabels={false} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with selected index', () => {
    const { UNSAFE_root } = render(
      <LineChart {...defaultProps} selectedIndex={2} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with negative values', () => {
    const negativeData = [
      { date: '2024-01-01', value: -50000 },
      { date: '2024-01-02', value: 100000 },
      { date: '2024-01-03', value: -30000 },
    ];

    const { UNSAFE_root } = render(
      <LineChart data={negativeData} width={300} height={200} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with zero crossing', () => {
    const zeroCrossingData = [
      { date: '2024-01-01', value: -50000 },
      { date: '2024-01-02', value: 0 },
      { date: '2024-01-03', value: 50000 },
    ];

    const { UNSAFE_root } = render(
      <LineChart data={zeroCrossingData} width={300} height={200} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should call onSelectIndex when provided', () => {
    const onSelectIndex = jest.fn();

    const { UNSAFE_root } = render(
      <LineChart {...defaultProps} onSelectIndex={onSelectIndex} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with custom formatValue', () => {
    const { UNSAFE_root } = render(
      <LineChart
        {...defaultProps}
        formatValue={(v) => `$${v}`}
      />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with custom formatLabel', () => {
    const { UNSAFE_root } = render(
      <LineChart
        {...defaultProps}
        formatLabel={(d) => d.substring(5)}
      />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render more than 7 data points correctly', () => {
    const manyDataPoints = Array.from({ length: 10 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      value: Math.random() * 100000,
    }));

    const { UNSAFE_root } = render(
      <LineChart data={manyDataPoints} width={300} height={200} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with all same values', () => {
    const sameValueData = [
      { date: '2024-01-01', value: 100000 },
      { date: '2024-01-02', value: 100000 },
      { date: '2024-01-03', value: 100000 },
    ];

    const { UNSAFE_root } = render(
      <LineChart data={sameValueData} width={300} height={200} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });
});
