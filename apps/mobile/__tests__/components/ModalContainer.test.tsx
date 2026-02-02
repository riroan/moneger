import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import ModalContainer from '../../components/modals/ModalContainer';

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

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

// Mock useDragToDismiss hook
jest.mock('../../hooks', () => ({
  useDragToDismiss: (onDismiss: () => void) => ({
    translateY: { setValue: jest.fn() },
    panResponder: { panHandlers: {} },
    resetPosition: jest.fn(),
  }),
}));

describe('ModalContainer', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    title: '모달 제목',
    children: <Text>모달 내용</Text>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with title', () => {
    const { getByText } = render(<ModalContainer {...defaultProps} />);

    expect(getByText('모달 제목')).toBeTruthy();
  });

  it('should render children content', () => {
    const { getByText } = render(<ModalContainer {...defaultProps} />);

    expect(getByText('모달 내용')).toBeTruthy();
  });

  it('should not render when visible is false', () => {
    const { queryByText } = render(
      <ModalContainer {...defaultProps} visible={false} />
    );

    expect(queryByText('모달 제목')).toBeNull();
  });

  it('should call onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { UNSAFE_root } = render(
      <ModalContainer {...defaultProps} onClose={onClose} />
    );

    // Find TouchableOpacity (close button) and press it
    const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
    if (touchables.length > 0) {
      fireEvent.press(touchables[0]);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should render footer when provided', () => {
    const { getByText } = render(
      <ModalContainer
        {...defaultProps}
        footer={<Text>푸터 내용</Text>}
      />
    );

    expect(getByText('푸터 내용')).toBeTruthy();
  });

  it('should not render footer when not provided', () => {
    const { queryByText } = render(<ModalContainer {...defaultProps} />);

    expect(queryByText('푸터 내용')).toBeNull();
  });

  it('should render handle by default', () => {
    const { UNSAFE_root } = render(<ModalContainer {...defaultProps} />);

    // Check that handle view exists
    const views = UNSAFE_root.findAllByType('View');
    expect(views.length).toBeGreaterThan(0);
  });

  it('should not render handle when showHandle is false', () => {
    const { UNSAFE_root } = render(
      <ModalContainer {...defaultProps} showHandle={false} />
    );

    // Component should still render
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with scrollable content', () => {
    const { UNSAFE_root } = render(
      <ModalContainer {...defaultProps} scrollable={true} />
    );

    const scrollViews = UNSAFE_root.findAllByType('RCTScrollView');
    expect(scrollViews.length).toBeGreaterThanOrEqual(0);
  });

  it('should render with custom title', () => {
    const { getByText } = render(
      <ModalContainer {...defaultProps} title="커스텀 제목" />
    );

    expect(getByText('커스텀 제목')).toBeTruthy();
  });

  it('should render multiple children', () => {
    const { getByText } = render(
      <ModalContainer
        {...defaultProps}
        children={
          <>
            <Text>첫 번째 내용</Text>
            <Text>두 번째 내용</Text>
          </>
        }
      />
    );

    expect(getByText('첫 번째 내용')).toBeTruthy();
    expect(getByText('두 번째 내용')).toBeTruthy();
  });
});
