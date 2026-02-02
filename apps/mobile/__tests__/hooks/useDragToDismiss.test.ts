import { renderHook, act } from '@testing-library/react-native';
import { useDragToDismiss } from '../../hooks/useDragToDismiss';

describe('useDragToDismiss', () => {
  it('should return translateY, panResponder, and resetPosition', () => {
    const onDismiss = jest.fn();
    const { result } = renderHook(() => useDragToDismiss(onDismiss));

    expect(result.current.translateY).toBeDefined();
    expect(result.current.panResponder).toBeDefined();
    expect(result.current.resetPosition).toBeDefined();
    expect(typeof result.current.resetPosition).toBe('function');
  });

  it('should initialize translateY with value 0', () => {
    const onDismiss = jest.fn();
    const { result } = renderHook(() => useDragToDismiss(onDismiss));

    // Animated.Value has __getValue method in testing
    // @ts-ignore
    const value = result.current.translateY.__getValue?.() ?? 0;
    expect(value).toBe(0);
  });

  it('should reset position to 0', () => {
    const onDismiss = jest.fn();
    const { result } = renderHook(() => useDragToDismiss(onDismiss));

    act(() => {
      result.current.resetPosition();
    });

    // After reset, translateY should be 0
    // @ts-ignore
    const value = result.current.translateY.__getValue?.() ?? 0;
    expect(value).toBe(0);
  });

  it('should accept custom threshold option', () => {
    const onDismiss = jest.fn();
    const { result } = renderHook(() =>
      useDragToDismiss(onDismiss, { threshold: 200 })
    );

    expect(result.current.panResponder).toBeDefined();
  });

  it('should accept onDismissStart callback option', () => {
    const onDismiss = jest.fn();
    const onDismissStart = jest.fn();
    const { result } = renderHook(() =>
      useDragToDismiss(onDismiss, { onDismissStart })
    );

    expect(result.current.panResponder).toBeDefined();
  });

  it('should have panResponder with handlers', () => {
    const onDismiss = jest.fn();
    const { result } = renderHook(() => useDragToDismiss(onDismiss));

    expect(result.current.panResponder.panHandlers).toBeDefined();
  });

  it('should maintain same translateY reference across renders', () => {
    const onDismiss = jest.fn();
    const { result, rerender } = renderHook(() => useDragToDismiss(onDismiss));

    const initialTranslateY = result.current.translateY;
    rerender({});
    expect(result.current.translateY).toBe(initialTranslateY);
  });

  it('should maintain same panResponder reference across renders', () => {
    const onDismiss = jest.fn();
    const { result, rerender } = renderHook(() => useDragToDismiss(onDismiss));

    const initialPanResponder = result.current.panResponder;
    rerender({});
    expect(result.current.panResponder).toBe(initialPanResponder);
  });
});
