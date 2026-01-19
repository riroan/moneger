import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage from '../page';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

describe('LoginPage', () => {
  let mockPush: jest.Mock;
  let localStorageSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    // Spy on localStorage.setItem
    localStorageSpy = jest.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    localStorageSpy.mockRestore();
  });

  it('로그인 폼이 렌더링되어야 함', () => {
    render(<LoginPage />);

    // 로그인 폼의 주요 요소들이 렌더링되는지 확인
    expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
    expect(screen.getByText('MONEGER')).toBeInTheDocument();
    expect(screen.getByText('스마트한 가계부 관리')).toBeInTheDocument();
  });

  it('이메일과 비밀번호를 입력할 수 있어야 함', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('example@email.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0]; // 첫 번째가 비밀번호 입력 필드

    // 이메일 입력
    await user.type(emailInput, 'test@example.com');
    expect(emailInput).toHaveValue('test@example.com');

    // 비밀번호 입력
    await user.type(passwordInput, 'Password123!');
    expect(passwordInput).toHaveValue('Password123!');
  });

  it('성공적으로 로그인하면 메인 페이지로 이동해야 함', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Mock 성공 응답
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: '테스트 사용자',
          },
        },
      }),
    });

    const emailInput = screen.getByPlaceholderText('example@email.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const loginButton = screen.getByRole('button', { name: '로그인' });

    // 폼 입력
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123!');

    // 로그인 버튼 클릭
    await user.click(loginButton);

    // 메인 페이지로 이동했는지 확인
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    // localStorage에 userId가 저장되었는지 확인
    expect(localStorageSpy).toHaveBeenCalledWith('userId', '1');
    expect(localStorageSpy).toHaveBeenCalledWith('userName', '테스트 사용자');
    expect(localStorageSpy).toHaveBeenCalledWith('userEmail', 'test@example.com');
  });

  it('로그인 실패 시 에러 메시지를 표시해야 함', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Mock 실패 응답
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다',
      }),
    });

    const emailInput = screen.getByPlaceholderText('example@email.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const loginButton = screen.getByRole('button', { name: '로그인' });

    // 폼 입력
    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'Wrong123!');

    // 로그인 버튼 클릭
    await user.click(loginButton);

    // 에러 메시지가 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByText('이메일 또는 비밀번호가 올바르지 않습니다')).toBeInTheDocument();
    });

    // 메인 페이지로 이동하지 않았는지 확인
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('회원가입 링크를 클릭하면 회원가입 폼으로 전환되어야 함', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // 초기에는 로그인 폼
    expect(screen.getByText('스마트한 가계부 관리')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();

    // 회원가입 링크 클릭
    const signupLink = screen.getByText('회원가입');
    await user.click(signupLink);

    // 회원가입 폼으로 전환 확인
    await waitFor(() => {
      expect(screen.getByText('새로운 계정을 만드세요')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '회원가입' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('홍길동')).toBeInTheDocument(); // 이름 필드가 나타남
    });
  });

  it('비밀번호 표시/숨기기 토글이 작동해야 함', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0] as HTMLInputElement;
    const toggleButtons = screen.getAllByLabelText(/비밀번호/);
    const toggleButton = toggleButtons[0]; // 첫 번째 토글 버튼

    // 초기 상태: password type
    expect(passwordInput.type).toBe('password');

    // 토글 버튼 클릭 - 비밀번호 보기
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    // 다시 토글 - 비밀번호 숨기기
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });
});
