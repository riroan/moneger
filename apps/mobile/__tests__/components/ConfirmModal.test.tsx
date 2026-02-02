import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ConfirmModal from '../../components/modals/ConfirmModal';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

describe('ConfirmModal', () => {
  const defaultProps = {
    visible: true,
    title: '삭제 확인',
    message: '이 작업을 진행하시겠습니까?',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with title and message', () => {
    const { getByText } = render(<ConfirmModal {...defaultProps} />);

    expect(getByText('삭제 확인')).toBeTruthy();
    expect(getByText('이 작업을 진행하시겠습니까?')).toBeTruthy();
  });

  it('should render default button texts', () => {
    const { getByText } = render(<ConfirmModal {...defaultProps} />);

    expect(getByText('취소')).toBeTruthy();
    expect(getByText('확인')).toBeTruthy();
  });

  it('should render custom button texts', () => {
    const { getByText } = render(
      <ConfirmModal
        {...defaultProps}
        confirmText="삭제"
        cancelText="돌아가기"
      />
    );

    expect(getByText('삭제')).toBeTruthy();
    expect(getByText('돌아가기')).toBeTruthy();
  });

  it('should call onConfirm when confirm button is pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <ConfirmModal {...defaultProps} onConfirm={onConfirm} />
    );

    fireEvent.press(getByText('확인'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <ConfirmModal {...defaultProps} onCancel={onCancel} />
    );

    fireEvent.press(getByText('취소'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should not render when visible is false', () => {
    const { queryByText } = render(
      <ConfirmModal {...defaultProps} visible={false} />
    );

    expect(queryByText('삭제 확인')).toBeNull();
  });

  it('should show loading indicator when isLoading is true', () => {
    const { queryByText, UNSAFE_root } = render(
      <ConfirmModal {...defaultProps} isLoading={true} />
    );

    // Confirm button text should not be visible when loading
    // ActivityIndicator should be present instead
    const activityIndicators = UNSAFE_root.findAllByType('ActivityIndicator');
    expect(activityIndicators.length).toBeGreaterThan(0);
  });

  it('should disable buttons when isLoading is true', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getByText } = render(
      <ConfirmModal
        {...defaultProps}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isLoading={true}
      />
    );

    fireEvent.press(getByText('취소'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should render with danger styling when isDanger is true', () => {
    const { UNSAFE_root } = render(
      <ConfirmModal {...defaultProps} isDanger={true} confirmText="삭제" />
    );

    // Component should render without errors
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render with custom title', () => {
    const { getByText } = render(
      <ConfirmModal {...defaultProps} title="로그아웃" />
    );

    expect(getByText('로그아웃')).toBeTruthy();
  });

  it('should render with custom message', () => {
    const { getByText } = render(
      <ConfirmModal {...defaultProps} message="정말로 삭제하시겠습니까?" />
    );

    expect(getByText('정말로 삭제하시겠습니까?')).toBeTruthy();
  });

  it('should render both buttons', () => {
    const { getAllByText, getByText } = render(<ConfirmModal {...defaultProps} />);

    // Both cancel and confirm buttons should be present
    expect(getByText('취소')).toBeTruthy();
    expect(getByText('확인')).toBeTruthy();
  });
});
