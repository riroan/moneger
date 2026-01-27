import { renderHook, act } from '@testing-library/react';
import { useTransactionForm } from '../useTransactionForm';
import type { TransactionWithCategory } from '@/types';

describe('useTransactionForm', () => {
  describe('initial state', () => {
    it('should have default values in add mode', () => {
      const { result } = renderHook(() => useTransactionForm());

      expect(result.current.formState.type).toBe('EXPENSE');
      expect(result.current.formState.amount).toBe('');
      expect(result.current.formState.description).toBe('');
      expect(result.current.formState.selectedCategory).toBe('');
    });

    it('should initialize with transaction data in edit mode', () => {
      const transaction: TransactionWithCategory = {
        id: '1',
        userId: 'user-1',
        type: 'INCOME',
        amount: 50000,
        description: '급여',
        date: new Date(),
        categoryId: 'cat-1',
        savingsGoalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: {
          id: 'cat-1',
          name: '급여',
          icon: 'money',
          color: '#10B981',
          type: 'INCOME',
          userId: 'user-1',
          defaultBudget: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      };

      const { result } = renderHook(() =>
        useTransactionForm({ initialTransaction: transaction, mode: 'edit' })
      );

      expect(result.current.formState.type).toBe('INCOME');
      expect(result.current.formState.amount).toBe('50,000');
      expect(result.current.formState.description).toBe('급여');
      expect(result.current.formState.selectedCategory).toBe('cat-1');
    });
  });

  describe('handleAmountChange', () => {
    it('should format amount with commas', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setAmount('1234567');
      });

      expect(result.current.formState.amount).toBe('1,234,567');
      expect(result.current.errors.amountError).toBe('');
    });

    it('should clear amount when empty string', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setAmount('1000');
      });

      act(() => {
        result.current.setters.setAmount('');
      });

      expect(result.current.formState.amount).toBe('');
    });

    it('should show error for non-numeric input', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setAmount('abc');
      });

      expect(result.current.errors.amountError).toBe('숫자만 입력할 수 있습니다');
    });

    it('should show error for zero amount', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setAmount('0');
      });

      expect(result.current.errors.amountError).toBe('0보다 큰 금액을 입력하세요');
    });

    it('should show error for amount exceeding 1000억', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setAmount('100000000001');
      });

      expect(result.current.errors.amountError).toBe('1000억 원을 초과할 수 없습니다');
    });
  });

  describe('handleDescriptionChange', () => {
    it('should update description', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setDescription('점심 식사');
      });

      expect(result.current.formState.description).toBe('점심 식사');
    });

    it('should clear error when description is entered', () => {
      const { result } = renderHook(() => useTransactionForm());

      // First validate to set error
      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.descriptionError).toBe('내용을 입력해주세요');

      // Then enter description
      act(() => {
        result.current.setters.setDescription('점심');
      });

      expect(result.current.errors.descriptionError).toBe('');
    });
  });

  describe('handleCategoryChange', () => {
    it('should update selected category', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setCategory('cat-1');
      });

      expect(result.current.formState.selectedCategory).toBe('cat-1');
    });

    it('should clear category error when category is selected', () => {
      const { result } = renderHook(() => useTransactionForm());

      // First validate to set error
      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.categoryError).toBe('카테고리를 선택해주세요');

      // Then select category
      act(() => {
        result.current.setters.setCategory('cat-1');
      });

      expect(result.current.errors.categoryError).toBe('');
    });
  });

  describe('handleTypeChange', () => {
    it('should update type and reset category', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setCategory('cat-1');
      });

      act(() => {
        result.current.setters.setType('INCOME');
      });

      expect(result.current.formState.type).toBe('INCOME');
      expect(result.current.formState.selectedCategory).toBe('');
    });
  });

  describe('validate', () => {
    it('should return false and set errors when form is empty', () => {
      const { result } = renderHook(() => useTransactionForm());

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid).toBe(false);
      expect(result.current.errors.amountError).toBe('금액을 입력해주세요');
      expect(result.current.errors.descriptionError).toBe('내용을 입력해주세요');
      expect(result.current.errors.categoryError).toBe('카테고리를 선택해주세요');
    });

    it('should return true when form is valid', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setAmount('10000');
        result.current.setters.setDescription('점심');
        result.current.setters.setCategory('cat-1');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid).toBe(true);
    });
  });

  describe('getFormData', () => {
    it('should return form data', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setType('INCOME');
        result.current.setters.setAmount('50,000');
        result.current.setters.setDescription('급여');
        result.current.setters.setCategory('cat-1');
      });

      const formData = result.current.getFormData();

      expect(formData.type).toBe('INCOME');
      expect(formData.amount).toBe(50000);
      expect(formData.description).toBe('급여');
      expect(formData.categoryId).toBe('cat-1');
    });
  });

  describe('reset', () => {
    it('should reset all form state', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setters.setType('INCOME');
        result.current.setters.setAmount('50000');
        result.current.setters.setDescription('급여');
        result.current.setters.setCategory('cat-1');
        result.current.validate(); // Set some potential errors
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.formState.type).toBe('EXPENSE');
      expect(result.current.formState.amount).toBe('');
      expect(result.current.formState.description).toBe('');
      expect(result.current.formState.selectedCategory).toBe('');
      expect(result.current.errors.amountError).toBe('');
      expect(result.current.errors.descriptionError).toBe('');
      expect(result.current.errors.categoryError).toBe('');
    });
  });
});
