'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TransactionWithCategory } from '@/types';
import { AMOUNT_LIMITS } from '@/lib/constants';

export interface TransactionFormState {
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  description: string;
  selectedCategory: string;
  selectedGroup: string;
}

export interface TransactionFormErrors {
  amountError: string;
  descriptionError: string;
  categoryError: string;
}

export interface TransactionFormData {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  categoryId: string;
  groupId: string;
}

interface UseTransactionFormOptions {
  initialTransaction?: TransactionWithCategory | null;
  mode?: 'add' | 'edit';
}

export function useTransactionForm(options: UseTransactionFormOptions = {}) {
  const { initialTransaction, mode = 'add' } = options;

  // Form state
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  // Error state
  const [amountError, setAmountError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Initialize form with transaction data (for edit mode)
  useEffect(() => {
    if (initialTransaction && mode === 'edit') {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toLocaleString('ko-KR'));
      setDescription(initialTransaction.description || '');
      setSelectedCategory(initialTransaction.categoryId || '');
      setSelectedGroup(initialTransaction.groupId || '');
    }
  }, [initialTransaction, mode]);

  const handleAmountChange = useCallback((value: string) => {
    const rawValue = value.replace(/,/g, '');

    if (rawValue === '') {
      setAmount('');
      setAmountError('');
      return;
    }

    if (!/^\d+$/.test(rawValue)) {
      setAmountError('숫자만 입력할 수 있습니다');
      return;
    }

    if (parseInt(rawValue) === 0) {
      setAmountError('0보다 큰 금액을 입력하세요');
      setAmount(rawValue);
      return;
    }

    if (parseInt(rawValue) > AMOUNT_LIMITS.TRANSACTION_MAX) {
      setAmountError('1000억 원을 초과할 수 없습니다');
      return;
    }

    const formattedValue = parseInt(rawValue).toLocaleString('ko-KR');
    setAmount(formattedValue);
    setAmountError('');
  }, []);

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    if (value.trim()) {
      setDescriptionError('');
    }
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setCategoryError('');
  }, []);

  const handleGroupChange = useCallback((groupId: string) => {
    setSelectedGroup(groupId);
  }, []);

  const handleTypeChange = useCallback((newType: 'INCOME' | 'EXPENSE') => {
    setType(newType);
    setSelectedCategory(''); // Reset category when type changes
  }, []);

  const validate = useCallback((): boolean => {
    let hasError = false;

    if (!amount || amountError) {
      setAmountError('금액을 입력해주세요');
      hasError = true;
    }

    if (!description || description.trim() === '') {
      setDescriptionError('내용을 입력해주세요');
      hasError = true;
    }

    if (!selectedCategory) {
      setCategoryError('카테고리를 선택해주세요');
      hasError = true;
    }

    return !hasError;
  }, [amount, amountError, description, selectedCategory]);

  const getFormData = useCallback((): TransactionFormData => {
    return {
      type,
      amount: parseInt(amount.replace(/,/g, '')),
      description: description.trim(),
      categoryId: selectedCategory,
      groupId: selectedGroup,
    };
  }, [type, amount, description, selectedCategory, selectedGroup]);

  const reset = useCallback(() => {
    setType('EXPENSE');
    setAmount('');
    setDescription('');
    setSelectedCategory('');
    setSelectedGroup('');
    setAmountError('');
    setDescriptionError('');
    setCategoryError('');
  }, []);

  return {
    // Form state
    formState: {
      type,
      amount,
      description,
      selectedCategory,
      selectedGroup,
    },
    // Errors
    errors: {
      amountError,
      descriptionError,
      categoryError,
    },
    // Setters
    setters: {
      setType: handleTypeChange,
      setAmount: handleAmountChange,
      setDescription: handleDescriptionChange,
      setCategory: handleCategoryChange,
      setGroup: handleGroupChange,
    },
    // Actions
    validate,
    getFormData,
    reset,
  };
}
