import React from 'react';
import { render } from '@testing-library/react-native';
import ProgressBar from '../../components/common/ProgressBar';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

describe('ProgressBar', () => {
  it('should render correctly with default props', () => {
    const { UNSAFE_root } = render(<ProgressBar progress={50} />);

    // Component should render without errors
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should clamp progress to 0 when negative', () => {
    const { UNSAFE_root } = render(<ProgressBar progress={-10} />);

    // Find the progress view (second child view)
    const views = UNSAFE_root.findAllByType('View');
    const progressView = views.find((view: { props: { style?: { width?: string } } }) => {
      const style = view.props.style;
      return style && typeof style === 'object' && style.width !== undefined;
    });

    expect(progressView?.props.style.width).toBe('0%');
  });

  it('should clamp progress to 100 when exceeding 100', () => {
    const { UNSAFE_root } = render(<ProgressBar progress={150} />);

    const views = UNSAFE_root.findAllByType('View');
    const progressView = views.find((view: { props: { style?: { width?: string } } }) => {
      const style = view.props.style;
      return style && typeof style === 'object' && style.width !== undefined;
    });

    expect(progressView?.props.style.width).toBe('100%');
  });

  it('should render with correct progress width', () => {
    const { UNSAFE_root } = render(<ProgressBar progress={75} />);

    const views = UNSAFE_root.findAllByType('View');
    const progressView = views.find((view: { props: { style?: { width?: string } } }) => {
      const style = view.props.style;
      return style && typeof style === 'object' && style.width !== undefined;
    });

    expect(progressView?.props.style.width).toBe('75%');
  });

  it('should apply custom height', () => {
    const { UNSAFE_root } = render(<ProgressBar progress={50} height={12} />);

    const views = UNSAFE_root.findAllByType('View');
    const containerView = views.find((view: { props: { style?: { height?: number; overflow?: string } } }) => {
      const style = view.props.style;
      return style && typeof style === 'object' && style.height === 12 && style.overflow === 'hidden';
    });

    expect(containerView).toBeTruthy();
  });

  it('should apply custom borderRadius', () => {
    const { UNSAFE_root } = render(<ProgressBar progress={50} borderRadius={8} />);

    const views = UNSAFE_root.findAllByType('View');
    const containerView = views.find((view: { props: { style?: { borderRadius?: number; overflow?: string } } }) => {
      const style = view.props.style;
      return style && typeof style === 'object' && style.borderRadius === 8 && style.overflow === 'hidden';
    });

    expect(containerView).toBeTruthy();
  });

  it('should apply custom backgroundColor', () => {
    const { UNSAFE_root } = render(
      <ProgressBar progress={50} backgroundColor="#ff0000" />
    );

    const views = UNSAFE_root.findAllByType('View');
    const containerView = views.find((view: { props: { style?: { backgroundColor?: string; overflow?: string } } }) => {
      const style = view.props.style;
      return style && typeof style === 'object' && style.backgroundColor === '#ff0000' && style.overflow === 'hidden';
    });

    expect(containerView).toBeTruthy();
  });

  it('should apply custom progressColor', () => {
    const { UNSAFE_root } = render(
      <ProgressBar progress={50} progressColor="#00ff00" />
    );

    const views = UNSAFE_root.findAllByType('View');
    const progressView = views.find((view: { props: { style?: { backgroundColor?: string; width?: string } } }) => {
      const style = view.props.style;
      return style && typeof style === 'object' && style.backgroundColor === '#00ff00' && style.width !== undefined;
    });

    expect(progressView).toBeTruthy();
  });

  it('should render 0% progress', () => {
    const { UNSAFE_root } = render(<ProgressBar progress={0} />);

    const views = UNSAFE_root.findAllByType('View');
    const progressView = views.find((view: { props: { style?: { width?: string } } }) => {
      const style = view.props.style;
      return style && typeof style === 'object' && style.width !== undefined;
    });

    expect(progressView?.props.style.width).toBe('0%');
  });

  it('should render 100% progress', () => {
    const { UNSAFE_root } = render(<ProgressBar progress={100} />);

    const views = UNSAFE_root.findAllByType('View');
    const progressView = views.find((view: { props: { style?: { width?: string } } }) => {
      const style = view.props.style;
      return style && typeof style === 'object' && style.width !== undefined;
    });

    expect(progressView?.props.style.width).toBe('100%');
  });
});
