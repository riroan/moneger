import { render, screen, fireEvent } from '@testing-library/react';
import FAB from '../layout/FAB';

describe('FAB', () => {
  it('should render the FAB button', () => {
    render(<FAB onClick={jest.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('+');
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<FAB onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be visible by default', () => {
    render(<FAB onClick={jest.fn()} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should be visible when visible prop is true', () => {
    render(<FAB onClick={jest.fn()} visible={true} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should not render when visible prop is false', () => {
    render(<FAB onClick={jest.fn()} visible={false} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should have fixed positioning class', () => {
    render(<FAB onClick={jest.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('fixed');
  });

  it('should have gradient background class', () => {
    render(<FAB onClick={jest.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gradient-to-br');
  });
});
