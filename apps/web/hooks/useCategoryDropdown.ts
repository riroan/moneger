'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Category } from '@/types';

interface UseCategoryDropdownOptions {
  categories: Category[];
  type: 'INCOME' | 'EXPENSE';
}

export function useCategoryDropdown({ categories, type }: UseCategoryDropdownOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter categories by type
  const currentCategories = useMemo(
    () => categories.filter((cat) => cat.type === type),
    [categories, type]
  );

  // Filter by search
  const filteredCategories = useMemo(
    () =>
      currentCategories.filter(
        (cat) =>
          cat.name.toLowerCase().includes(search.toLowerCase()) ||
          (cat.icon && cat.icon.includes(search))
      ),
    [currentCategories, search]
  );

  // Handle outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const open = useCallback(() => {
    setIsOpen(true);
    setSearch('');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (!isOpen) {
      setIsOpen(true);
    }
  }, [isOpen]);

  return {
    isOpen,
    search,
    dropdownRef,
    currentCategories,
    filteredCategories,
    open,
    close,
    toggle,
    setSearch: handleSearchChange,
  };
}
