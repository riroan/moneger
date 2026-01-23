import { render, screen, fireEvent } from '@testing-library/react';
import AmountInput from '../forms/AmountInput';

describe('AmountInput', () => {
  it('should render with label', () => {
    render(<AmountInput value="" onChange={jest.fn()} />);

    expect(screen.getByText('금액')).toBeInTheDocument();
  });

  it('should render currency symbol', () => {
    render(<AmountInput value="" onChange={jest.fn()} />);

    expect(screen.getByText('₩')).toBeInTheDocument();
  });

  it('should display value in input', () => {
    render(<AmountInput value="10,000" onChange={jest.fn()} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('10,000');
  });

  it('should call onChange when input changes', () => {
    const handleChange = jest.fn();
    render(<AmountInput value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '5000' } });

    expect(handleChange).toHaveBeenCalledWith('5000');
  });

  it('should display error message when error prop is provided', () => {
    render(<AmountInput value="" onChange={jest.fn()} error="금액을 입력해주세요" />);

    expect(screen.getByText('금액을 입력해주세요')).toBeInTheDocument();
  });

  it('should not display error message when no error', () => {
    render(<AmountInput value="" onChange={jest.fn()} />);

    expect(screen.queryByText('금액을 입력해주세요')).not.toBeInTheDocument();
  });

  it('should have error styling when error is present', () => {
    render(<AmountInput value="" onChange={jest.fn()} error="에러" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-accent-coral');
  });

  it('should use custom placeholder', () => {
    render(<AmountInput value="" onChange={jest.fn()} placeholder="금액 입력" />);

    const input = screen.getByPlaceholderText('금액 입력');
    expect(input).toBeInTheDocument();
  });

  it('should use default placeholder when not provided', () => {
    render(<AmountInput value="" onChange={jest.fn()} />);

    const input = screen.getByPlaceholderText('0');
    expect(input).toBeInTheDocument();
  });

  it('should have numeric input mode', () => {
    render(<AmountInput value="" onChange={jest.fn()} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputMode', 'numeric');
  });
});
