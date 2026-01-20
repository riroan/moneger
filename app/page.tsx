'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function Home() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(() => {
    // Initialize with a fixed date to avoid hydration mismatch
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [descriptionError, setDescriptionError] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [dailyBalances, setDailyBalances] = useState<any[]>([]);
  const [isLoadingDailyBalances, setIsLoadingDailyBalances] = useState(false);
  const [lastMonthBalance, setLastMonthBalance] = useState<number>(0);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions'>('dashboard');

  // 전체 내역 탭 상태
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [isLoadingAllTransactions, setIsLoadingAllTransactions] = useState(false);
  const [allTransactionsNextCursor, setAllTransactionsNextCursor] = useState<string | null>(null);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isIncomeCategoryOpen, setIsIncomeCategoryOpen] = useState(true);
  const [isExpenseCategoryOpen, setIsExpenseCategoryOpen] = useState(true);
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'expensive' | 'cheapest'>('recent');

  const datePickerRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const transactionsEndRef = useRef<HTMLDivElement>(null);

  // 모달이 열렸을 때 body 스크롤 비활성화
  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isDeleteConfirmOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isEditModalOpen, isDeleteConfirmOpen]);

  // 인증 확인
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    const storedUserEmail = localStorage.getItem('userEmail');

    if (!storedUserId) {
      router.push('/login');
      return;
    }

    setUserId(storedUserId);
    setUserName(storedUserName || '');
    setUserEmail(storedUserEmail || '');
    setIsLoading(false);
  }, [router]);

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  // 카테고리 데이터 가져오기 및 시드
  useEffect(() => {
    if (!userId) return;

    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        // 먼저 카테고리 조회
        const response = await fetch(`/api/categories?userId=${userId}`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
          setCategories(data.data);
        } else {
          // 카테고리가 없으면 기본 카테고리 생성
          const seedResponse = await fetch('/api/categories/seed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          });

          const seedData = await seedResponse.json();
          if (seedData.success) {
            setCategories(seedData.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [userId]);

  // 요약 통계 데이터 가져오기
  useEffect(() => {
    if (!userId) return;

    const fetchSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const response = await fetch(`/api/transactions/summary?userId=${userId}&year=${year}&month=${month}`);
        const data = await response.json();

        if (data.success) {
          setSummary(data.data);
        }

        // 지난달 잔액 가져오기
        const lastMonth = new Date(currentDate);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastYear = lastMonth.getFullYear();
        const lastMonthNum = lastMonth.getMonth() + 1;

        const lastMonthResponse = await fetch(`/api/transactions/summary?userId=${userId}&year=${lastYear}&month=${lastMonthNum}`);
        const lastMonthData = await lastMonthResponse.json();

        if (lastMonthData.success) {
          setLastMonthBalance(lastMonthData.data.summary.balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch summary:', error);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [userId, currentDate]);

  // 최근 거래 데이터 가져오기
  useEffect(() => {
    if (!userId) return;

    const fetchRecentTransactions = async () => {
      setIsLoadingTransactions(true);
      try {
        const response = await fetch(`/api/transactions/recent?userId=${userId}&limit=5`);
        const data = await response.json();

        if (data.success) {
          setRecentTransactions(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch recent transactions:', error);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    fetchRecentTransactions();
  }, [userId]);

  // 일별 잔액 추이 데이터 가져오기
  useEffect(() => {
    if (!userId) return;

    const fetchDailyBalances = async () => {
      setIsLoadingDailyBalances(true);
      try {
        const response = await fetch(`/api/daily-balance?userId=${userId}&days=5`);
        const data = await response.json();

        if (data.success) {
          setDailyBalances(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch daily balances:', error);
      } finally {
        setIsLoadingDailyBalances(false);
      }
    };

    fetchDailyBalances();
  }, [userId]);

  // 전체 내역 불러오기 함수
  const fetchAllTransactions = async (cursor?: string | null, reset?: boolean) => {
    if (!userId) return;
    if (isLoadingAllTransactions) return;

    setIsLoadingAllTransactions(true);
    try {
      const params = new URLSearchParams({
        userId,
        limit: '20',
      });

      if (cursor && !reset) {
        params.append('cursor', cursor);
      }

      if (filterType !== 'ALL') {
        params.append('type', filterType);
      }

      if (filterCategories.length > 0) {
        filterCategories.forEach(catId => {
          params.append('categoryId', catId);
        });
      }

      if (searchKeyword.trim()) {
        params.append('search', searchKeyword.trim());
      }

      params.append('sort', sortOrder);

      const response = await fetch(`/api/transactions?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        if (reset) {
          setAllTransactions(data.data);
        } else {
          setAllTransactions(prev => [...prev, ...data.data]);
        }
        setAllTransactionsNextCursor(data.nextCursor);
        setHasMoreTransactions(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch all transactions:', error);
    } finally {
      setIsLoadingAllTransactions(false);
    }
  };

  // 전체 내역 탭이 활성화될 때 데이터 불러오기
  useEffect(() => {
    if (activeTab === 'transactions' && userId && allTransactions.length === 0) {
      fetchAllTransactions(null, true);
    }
  }, [activeTab, userId]);

  // 필터가 변경될 때 데이터 다시 불러오기
  useEffect(() => {
    if (activeTab === 'transactions' && userId) {
      setAllTransactions([]);
      setAllTransactionsNextCursor(null);
      setHasMoreTransactions(true);
      fetchAllTransactions(null, true);
    }
  }, [filterType, filterCategories, sortOrder]);

  // 검색어 디바운스 처리
  useEffect(() => {
    if (activeTab !== 'transactions' || !userId) return;

    const timer = setTimeout(() => {
      setAllTransactions([]);
      setAllTransactionsNextCursor(null);
      setHasMoreTransactions(true);
      fetchAllTransactions(null, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 무한 스크롤 - Intersection Observer
  useEffect(() => {
    if (activeTab !== 'transactions') return;
    if (!transactionsEndRef.current) return;
    if (!hasMoreTransactions) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreTransactions && !isLoadingAllTransactions) {
          fetchAllTransactions(allTransactionsNextCursor);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(transactionsEndRef.current);

    return () => observer.disconnect();
  }, [activeTab, hasMoreTransactions, isLoadingAllTransactions, allTransactionsNextCursor]);

  // Close date picker when clicking outside
  useEffect(() => {
    if (!isDatePickerOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePickerOpen]);

  // Close profile menu when clicking outside
  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const handlePreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);

      // 미래 날짜로 이동하지 않도록 체크
      const now = new Date();
      if (newDate.getFullYear() > now.getFullYear() ||
          (newDate.getFullYear() === now.getFullYear() && newDate.getMonth() > now.getMonth())) {
        return prev;
      }

      return newDate;
    });
  };

  const formatYearMonth = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const handleMonthSelect = (year: number, month: number) => {
    const newDate = new Date(year, month, 1);
    setCurrentDate(newDate);
    setIsDatePickerOpen(false);
  };

  const handlePreviousYear = () => {
    setPickerYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setPickerYear(prev => prev + 1);
  };

  const handleDatePickerToggle = () => {
    if (!isDatePickerOpen) {
      setPickerYear(currentDate.getFullYear());
    }
    setIsDatePickerOpen(!isDatePickerOpen);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 콤마 제거
    const rawValue = value.replace(/,/g, '');

    // 빈 값인 경우
    if (rawValue === '') {
      setAmount('');
      setAmountError('');
      return;
    }

    // 숫자가 아닌 경우
    if (!/^\d+$/.test(rawValue)) {
      setAmountError('숫자만 입력할 수 있습니다');
      return;
    }

    // 0인 경우
    if (parseInt(rawValue) === 0) {
      setAmountError('0보다 큰 금액을 입력하세요');
      setAmount(rawValue);
      return;
    }

    // 콤마 추가하여 저장
    const formattedValue = parseInt(rawValue).toLocaleString('ko-KR');
    setAmount(formattedValue);
    setAmountError('');
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
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

    if (hasError) {
      return;
    }

    if (!userId) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 콤마 제거 후 숫자로 변환
      const rawAmount = amount.replace(/,/g, '');

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type: transactionType,
          amount: parseInt(rawAmount),
          description: description || null,
          categoryId: selectedCategory || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '거래 추가에 실패했습니다');
      }

      // 성공 시 모달 닫고 폼 리셋
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      setSelectedCategory('');
      setAmountError('');
      setDescriptionError('');
      setCategoryError('');

      // 최근 거래 목록 새로고침
      const recentResponse = await fetch(`/api/transactions/recent?userId=${userId}&limit=5`);
      const recentData = await recentResponse.json();
      if (recentData.success) {
        setRecentTransactions(recentData.data);
      }

      // 요약 통계 새로고침
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const summaryResponse = await fetch(`/api/transactions/summary?userId=${userId}&year=${year}&month=${month}`);
      const summaryData = await summaryResponse.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert(error instanceof Error ? error.message : '거래 추가에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 거래 수정 핸들러
  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !editingTransaction) {
      return;
    }

    // 유효성 검사
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

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const rawAmount = amount.replace(/,/g, '');

      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type: transactionType,
          amount: parseInt(rawAmount),
          description: description || null,
          categoryId: selectedCategory || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '거래 수정에 실패했습니다');
      }

      // 성공 시 모달 닫고 폼 리셋
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      setAmount('');
      setDescription('');
      setSelectedCategory('');
      setAmountError('');
      setDescriptionError('');
      setCategoryError('');

      // 최근 거래 목록 새로고침
      const recentResponse = await fetch(`/api/transactions/recent?userId=${userId}&limit=5`);
      const recentData = await recentResponse.json();
      if (recentData.success) {
        setRecentTransactions(recentData.data);
      }

      // 요약 통계 새로고침
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const summaryResponse = await fetch(`/api/transactions/summary?userId=${userId}&year=${year}&month=${month}`);
      const summaryData = await summaryResponse.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }
    } catch (error) {
      console.error('Failed to update transaction:', error);
      alert(error instanceof Error ? error.message : '거래 수정에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 거래 삭제 핸들러
  const handleDeleteTransaction = async () => {
    if (!userId || !editingTransaction) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '거래 삭제에 실패했습니다');
      }

      // 성공 시 모달 닫고 폼 리셋
      setIsDeleteConfirmOpen(false);
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      setAmount('');
      setDescription('');
      setSelectedCategory('');
      setAmountError('');
      setDescriptionError('');
      setCategoryError('');

      // 최근 거래 목록 새로고침
      const recentResponse = await fetch(`/api/transactions/recent?userId=${userId}&limit=5`);
      const recentData = await recentResponse.json();
      if (recentData.success) {
        setRecentTransactions(recentData.data);
      }

      // 요약 통계 새로고침
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const summaryResponse = await fetch(`/api/transactions/summary?userId=${userId}&year=${year}&month=${month}`);
      const summaryData = await summaryResponse.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert(error instanceof Error ? error.message : '거래 삭제에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 현재 거래 타입에 해당하는 카테고리 필터링
  const currentCategories = categories.filter(cat => cat.type === transactionType);

  // API 데이터 또는 기본값 사용
  const totalIncome = summary?.summary?.totalIncome || 0;
  const totalExpense = summary?.summary?.totalExpense || 0;
  const balance = summary?.summary?.netAmount || 0;
  const monthlyBudget = summary?.budget?.amount || 0;
  const budgetUsed = summary?.budget?.used || 0;
  const budgetRemaining = summary?.budget?.remaining || 0;
  const budgetUsagePercent = summary?.budget?.usagePercent || 0;
  const categoryList = summary?.categories || [];
  const maxCategoryAmount = categoryList.length > 0
    ? Math.max(...categoryList.map((c: any) => c.total), 1)
    : 1;

  // 카테고리 리스트 가공 (너비 퍼센트와 색상 인덱스 추가)
  const categoryListWithWidth = categoryList.map((cat: any, index: number) => ({
    ...cat,
    width: Math.round((cat.total / maxCategoryAmount) * 100) || 0,
    colorIndex: index % 6, // 6개 색상 순환
    amount: cat.total, // API에서 total로 오지만 UI에서는 amount로 사용
  }));

  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR');
  };

  const formatCurrency = (amount: string) => {
    // +, - 기호가 있는지 확인
    const hasSign = amount.startsWith('+') || amount.startsWith('-');
    const sign = hasSign ? amount.charAt(0) : '';
    const rest = hasSign ? amount.slice(1) : amount;

    // ₩ 기호 분리
    const currencySymbol = rest.charAt(0);
    const number = rest.slice(1);

    return (
      <>
        {sign && <span style={{ fontSize: '1.3em', marginRight: '0.15em', verticalAlign: 'baseline', transform: 'translateY(0.05em)', display: 'inline-block' }}>{sign}</span>}
        <span style={{ whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '0.7em', marginRight: '0.25em', display: 'inline-block' }}>{currencySymbol}</span>
          {number}
        </span>
      </>
    );
  };

  // 스파크라인 생성 함수
  const generateSparkline = (balances: any[]) => {
    if (!balances || balances.length === 0) return '▂▂▂▂▂';

    const values = balances.map(b => b.balance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) return '▃▃▃▃▃'; // 모두 같은 값

    const chars = ['▁', '▂', '▃', '▅', '▆', '▇', '█'];

    return values.map(value => {
      const normalized = (value - min) / range;
      const index = Math.floor(normalized * (chars.length - 1));
      return chars[index];
    }).join('');
  };

  // 5일 추이 계산
  const calculateTrend = () => {
    if (!dailyBalances || dailyBalances.length === 0) {
      return { sparkline: '▂▂▂▂▂', avgBalance: 0, changePercent: 0, changeAmount: 0 };
    }

    const sparkline = generateSparkline(dailyBalances);
    const values = dailyBalances.map(b => b.balance);
    const avgBalance = values.reduce((a, b) => a + b, 0) / values.length;

    const firstBalance = values[0];
    const lastBalance = values[values.length - 1];
    const changeAmount = lastBalance - firstBalance;
    const changePercent = firstBalance !== 0 ? (changeAmount / Math.abs(firstBalance)) * 100 : 0;

    return { sparkline, avgBalance, changePercent, changeAmount };
  };

  // 로딩 중일 때는 빈 화면 표시
  if (isLoading) {
    return null;
  }

  return (
    <>
      <div className="noise-overlay" />
      <div className="gradient-orb orb-1" />
      <div className="gradient-orb orb-2" />

      <div
        className="relative z-10"
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '16px'
        }}
      >
        {/* Header */}
        <header
          className="flex justify-between items-center animate-[fadeInDown_0.6s_ease-out]"
          style={{ marginBottom: '24px' }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-accent-mint to-accent-blue rounded-[12px] sm:rounded-[14px] flex items-center justify-center text-xl sm:text-2xl shadow-[0_8px_32px_var(--glow-mint)]">
              💰
            </div>
            <span className="hidden sm:block text-xl sm:text-2xl font-bold bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent tracking-tight">
              MONEGER
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div ref={datePickerRef} className="flex items-center bg-bg-card border border-[var(--border)] rounded-xl relative select-none" style={{ padding: '8px 12px', gap: '8px' }}>
              <button
                onClick={handlePreviousMonth}
                className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-lg cursor-pointer"
              >
                ◀
              </button>
              <span
                onClick={handleDatePickerToggle}
                className="text-sm sm:text-base font-semibold min-w-[80px] sm:min-w-[120px] text-center cursor-pointer"
              >
                {formatYearMonth(currentDate)}
              </span>
              <button
                onClick={handleNextMonth}
                disabled={(() => {
                  const nextMonth = new Date(currentDate);
                  nextMonth.setMonth(currentDate.getMonth() + 1);
                  const now = new Date();
                  return nextMonth.getFullYear() > now.getFullYear() ||
                    (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() > now.getMonth());
                })()}
                className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▶
              </button>

              {/* Date Picker Dropdown */}
              {isDatePickerOpen && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 bg-bg-card border border-[var(--border)] rounded-[16px] z-50 select-none"
                  style={{
                    width: '320px',
                    padding: '20px',
                    marginTop: '3px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {/* Year Navigation */}
                  <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                    <button
                      onClick={handlePreviousYear}
                      className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer w-8 h-8 flex items-center justify-center"
                    >
                      ◀
                    </button>
                    <div className="text-text-primary font-semibold" style={{ fontSize: '16px' }}>
                      {pickerYear}년
                    </div>
                    <button
                      onClick={handleNextYear}
                      disabled={pickerYear >= new Date().getFullYear()}
                      className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▶
                    </button>
                  </div>

                  {/* Month Grid */}
                  <div className="grid grid-cols-4" style={{ gap: '8px' }}>
                    {Array.from({ length: 12 }, (_, i) => i).map(month => {
                      const isSelected = currentDate.getFullYear() === pickerYear && currentDate.getMonth() === month;
                      const now = new Date();
                      const isFuture = pickerYear > now.getFullYear() ||
                        (pickerYear === now.getFullYear() && month > now.getMonth());
                      return (
                        <button
                          key={month}
                          onClick={() => handleMonthSelect(pickerYear, month)}
                          disabled={isFuture}
                          className={`rounded-[8px] font-medium transition-all ${
                            isFuture
                              ? 'bg-bg-secondary text-text-muted opacity-30 cursor-not-allowed'
                              : isSelected
                              ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary cursor-pointer'
                              : 'bg-bg-secondary text-text-secondary hover:bg-bg-card-hover cursor-pointer'
                          }`}
                          style={{ padding: '10px 0', fontSize: '14px' }}
                        >
                          {month + 1}월
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent-purple to-accent-coral flex items-center justify-center font-semibold text-sm sm:text-base cursor-pointer transition-transform hover:scale-105"
              >
                {userName ? userName.charAt(0) : (userEmail ? userEmail.charAt(0) : '?')}
              </button>

              {/* Profile Menu Dropdown */}
              {isProfileMenuOpen && (
                <div
                  className="absolute top-full right-0 bg-bg-card border border-[var(--border)] rounded-[12px] overflow-hidden select-none z-[300]"
                  style={{
                    marginTop: '8px',
                    minWidth: '180px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className="border-b border-[var(--border)]" style={{ padding: '12px 14px' }}>
                    <div className="font-semibold text-text-primary" style={{ fontSize: '14px' }}>{userName || '사용자'}</div>
                    <div className="text-text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>{userEmail}</div>
                  </div>
                  <div style={{ padding: '6px 0' }}>
                    <button
                      className="w-full text-left text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                      style={{ padding: '10px 14px', fontSize: '14px' }}
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        router.push('/settings');
                      }}
                    >
                      ⚙️ 설정
                    </button>
                    <button
                      className="w-full text-left text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                      style={{ padding: '10px 14px', fontSize: '14px' }}
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      🚪 로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Tab Bar */}
        <div className="animate-[fadeInUp_0.5s_ease-out]" style={{ marginBottom: '24px' }}>
          <nav className="flex gap-2 bg-bg-card border border-[var(--border)] rounded-[12px] p-1 w-full sm:w-fit">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-[10px] transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              style={{ padding: '12px 20px' }}
            >
              <span className="text-base">📊</span>
              <span className="font-medium text-sm">대시보드</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-[10px] transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              style={{ padding: '12px 20px' }}
            >
              <span className="text-base">📝</span>
              <span className="font-medium text-sm">전체 내역</span>
            </button>
          </nav>
        </div>

        {activeTab === 'dashboard' && (
          <>
        {/* Summary Cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3"
          style={{ gap: '12px', marginBottom: '24px' }}
        >
          {[
            { type: 'income', icon: '💼', label: '이번 달 수입', amount: `₩${formatNumber(totalIncome)}`, change: `${summary?.transactionCount?.income || 0}건의 수입`, positive: true },
            { type: 'expense', icon: '💳', label: '이번 달 지출', amount: `₩${formatNumber(totalExpense)}`, change: `${summary?.transactionCount?.expense || 0}건의 지출`, positive: false },
            { type: 'balance', icon: '✨', label: '남은 금액', amount: `₩${formatNumber(balance)}`, change: `지난달 대비 ${balance - lastMonthBalance >= 0 ? '+' : ''}₩${formatNumber(Math.abs(balance - lastMonthBalance))}`, positive: balance - lastMonthBalance >= 0 }
          ].map((card, i) => (
            <div
              key={card.type}
              className={`bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] relative overflow-hidden transition-all hover:translate-y-[-4px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] animate-[fadeInUp_0.6s_ease-out_backwards] [animation-delay:${(i + 1) * 100}ms] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:rounded-t-[20px] ${
                card.type === 'income' ? 'before:bg-gradient-to-r before:from-accent-mint before:to-accent-blue' :
                card.type === 'expense' ? 'before:bg-gradient-to-r before:from-accent-coral before:to-accent-yellow' :
                card.type === 'savings' ? 'before:bg-gradient-to-r before:from-accent-blue before:to-accent-purple' :
                card.type === 'trend' ? 'before:bg-gradient-to-r before:from-accent-purple before:to-accent-mint' :
                'before:bg-gradient-to-r before:from-accent-purple before:to-accent-mint'
              }`}
              style={{ padding: '16px' }}
            >
              <div className="flex items-center gap-4 sm:block">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] flex items-center justify-center text-lg sm:text-[22px] flex-shrink-0 ${
                  card.type === 'income' ? 'bg-[var(--glow-mint)] text-accent-mint' :
                  card.type === 'expense' ? 'bg-[var(--glow-coral)] text-accent-coral' :
                  card.type === 'savings' ? 'bg-[var(--glow-blue)] text-accent-blue' :
                  card.type === 'trend' ? 'bg-[var(--glow-purple)] text-accent-purple' :
                  'bg-[var(--glow-purple)] text-accent-purple'
                }`}
                  style={{ marginBottom: '0' }}
                >
                  {card.icon}
                </div>
                <div className="flex-1 sm:mt-8">
                  <div className="text-xs sm:text-sm text-text-secondary font-medium mb-0.5 sm:mb-1">{card.label}</div>
                  <div className={`font-mono font-bold tracking-tight text-lg sm:text-2xl ${
                    card.type === 'income' ? 'text-accent-mint' :
                    card.type === 'expense' ? 'text-accent-coral' :
                    card.type === 'savings' ? 'text-accent-blue' :
                    card.type === 'trend' ? 'text-accent-purple' :
                    'text-accent-purple'
                  }`}
                  >
                    {card.type === 'trend' ? card.amount : formatCurrency(card.amount)}
                  </div>
                </div>
              </div>
              <div className={`hidden sm:inline-flex items-center gap-1 text-[13px] rounded-lg font-medium ${
                card.positive ? 'bg-[var(--glow-mint)] text-accent-mint' : 'bg-[var(--glow-coral)] text-accent-coral'
              }`}
                style={{ marginTop: '12px', padding: '8px 12px' }}
              >
                {card.change}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]" style={{ gap: '16px' }}>
          {/* Left Panel - Categories */}
          <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards] order-2 lg:order-1" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <span className="text-lg sm:text-xl">📊</span> 카테고리별 지출
              </h2>
            </div>

            {isLoadingSummary ? (
              <div className="text-center text-text-muted py-8">
                로딩 중...
              </div>
            ) : categoryListWithWidth.length > 0 ? (
              <>
                {/* Donut Chart */}
                <div className="flex justify-center items-center relative" style={{ marginBottom: '24px', height: '200px', pointerEvents: 'none' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart style={{ outline: 'none' }}>
                      <Pie
                        data={categoryListWithWidth.map((category: any) => ({
                          name: category.name,
                          value: category.amount,
                          colorIndex: category.colorIndex,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={1}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        isAnimationActive={false}
                      >
                        {categoryListWithWidth.map((category: any, index: number) => {
                          const colors = ['#10B981', '#EF4444', '#3B82F6', '#FBBF24', '#A855F7', '#F472B6'];
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={colors[category.colorIndex % colors.length]}
                              opacity={0.9}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <div className="font-bold text-text-primary text-sm sm:text-base">
                      {formatNumber(totalExpense)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-text-muted" style={{ marginTop: '2px' }}>
                      총 지출
                    </div>
                  </div>
                </div>

                {/* Category List */}
                <div className="flex flex-col" style={{ gap: '8px' }}>
                  {categoryListWithWidth.map((category: any) => (
                    <div
                      key={category.id}
                      className="flex items-center bg-bg-secondary rounded-[12px] sm:rounded-[14px] cursor-pointer transition-all hover:bg-bg-card-hover hover:translate-x-1"
                      style={{ padding: '12px' }}
                      onClick={() => {
                        setFilterType('EXPENSE');
                        setFilterCategories([category.id]);
                        setSortOrder('recent');
                        setSearchKeyword('');
                        setActiveTab('transactions');
                      }}
                    >
                      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-xl ${
                        ['bg-[var(--glow-mint)]', 'bg-[var(--glow-coral)]', 'bg-[var(--glow-blue)]', 'bg-[rgba(251,191,36,0.15)]', 'bg-[var(--glow-purple)]', 'bg-[rgba(244,114,182,0.15)]'][category.colorIndex]
                      }`} style={{ marginRight: '12px' }}>
                        {category.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-[15px] font-medium truncate" style={{ marginBottom: '2px' }}>{category.name}</div>
                        <div className="text-xs sm:text-[13px] text-text-muted">{category.count}건</div>
                      </div>
                      <div className="font-mono text-sm sm:text-base font-semibold">{formatCurrency(`₩${formatNumber(category.amount)}`)}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-text-muted py-8">
                이번 달 지출 내역이 없습니다
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="flex flex-col order-1 lg:order-2" style={{ gap: '16px' }}>
            {/* Recent Transactions */}
            <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards]" style={{ padding: '16px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <span className="text-lg sm:text-xl">📝</span> 최근 내역
                </h2>
              </div>

              <div className="flex flex-col" style={{ gap: '8px' }}>
                {isLoadingTransactions ? (
                  <div className="text-center text-text-muted py-6">
                    로딩 중...
                  </div>
                ) : recentTransactions.length > 0 ? recentTransactions.map((tx) => {
                  const icon = tx.category?.icon || '💰';
                  const formatDate = (dateStr: string) => {
                    const date = new Date(dateStr);
                    const year = date.getFullYear();
                    const month = date.getMonth() + 1;
                    const day = date.getDate();
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    return `${year}.${month}.${day} ${hours}:${minutes}`;
                  };

                  return (
                    <div
                      key={tx.id}
                      className="bg-bg-secondary rounded-[12px] sm:rounded-[14px] transition-colors hover:bg-bg-card-hover cursor-pointer"
                      style={{ padding: '12px' }}
                      onClick={() => {
                        setEditingTransaction(tx);
                        setTransactionType(tx.type);
                        setAmount(tx.amount.toLocaleString('ko-KR'));
                        setDescription(tx.description || '');
                        setSelectedCategory(tx.categoryId || '');
                        setSelectedDate(new Date(tx.date));
                        setIsEditModalOpen(true);
                      }}
                    >
                      <div className="flex items-center">
                        {/* 아이콘 */}
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-[10px] bg-bg-card flex items-center justify-center text-base sm:text-lg flex-shrink-0" style={{ marginRight: '12px' }}>
                          {icon}
                        </div>
                        {/* 내용 영역 */}
                        <div className="flex-1 min-w-0">
                          {/* 상단: 내용 + 금액 */}
                          <div className="flex items-center justify-between">
                            <div className="text-sm sm:text-[15px] font-medium truncate flex-1 min-w-0" style={{ marginRight: '12px' }}>
                              {tx.description || tx.category?.name || '거래'}
                            </div>
                            <div className={`font-mono text-sm sm:text-base font-semibold whitespace-nowrap ${
                              tx.type === 'EXPENSE' ? 'text-accent-coral' : 'text-accent-mint'
                            }`}>
                              {formatCurrency(`${tx.type === 'EXPENSE' ? '-' : '+'}₩${formatNumber(tx.amount)}`)}
                            </div>
                          </div>
                          {/* 하단: 시간 + 카테고리 */}
                          <div className="flex items-center justify-between text-xs sm:text-[13px] text-text-muted">
                            <span>{formatDate(tx.date)}</span>
                            <span>{tx.category?.name || '미분류'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center text-text-muted py-6">
                    거래 내역이 없습니다
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {activeTab === 'transactions' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] animate-[fadeIn_0.5s_ease-out]" style={{ gap: '16px' }}>
            {/* 왼쪽 필터 패널 */}
            <div className="lg:block">
              {/* 모바일 필터 토글 */}
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="lg:hidden w-full bg-bg-card border border-[var(--border)] rounded-[12px] flex items-center justify-between cursor-pointer"
                style={{ padding: '12px 16px', marginBottom: '12px' }}
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  <span>🔍</span> 필터 {(filterType !== 'ALL' || filterCategories.length > 0 || searchKeyword || sortOrder !== 'recent') && <span className="text-accent-mint">(적용됨)</span>}
                </span>
                <span className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* 필터 내용 */}
              <div className={`${isFilterOpen ? 'block' : 'hidden'} lg:block bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px]`} style={{ padding: '16px' }}>
                <h3 className="text-base font-semibold flex items-center gap-2" style={{ marginBottom: '16px' }}>
                  <span>🔍</span> 필터
                </h3>

                {/* 검색 */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>검색</label>
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="내역 검색..."
                    className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary text-sm focus:outline-none focus:border-accent-blue transition-colors"
                    style={{ padding: '10px 12px' }}
                  />
                </div>

                {/* 거래 유형 */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>거래 유형</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'ALL', label: '전체' },
                      { value: 'INCOME', label: '수입' },
                      { value: 'EXPENSE', label: '지출' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilterType(option.value as 'ALL' | 'INCOME' | 'EXPENSE')}
                        className={`flex-1 rounded-[8px] text-sm font-medium transition-all cursor-pointer ${
                          filterType === option.value
                            ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                            : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                        }`}
                        style={{ padding: '8px 12px' }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 정렬 */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>정렬</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'recent', label: '최근 순' },
                      { value: 'oldest', label: '오래된 순' },
                      { value: 'expensive', label: '금액 높은 순' },
                      { value: 'cheapest', label: '금액 낮은 순' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortOrder(option.value as 'recent' | 'oldest' | 'expensive' | 'cheapest')}
                        className={`rounded-[8px] text-sm font-medium transition-all cursor-pointer ${
                          sortOrder === option.value
                            ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                            : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                        }`}
                        style={{ padding: '8px 12px' }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 카테고리 */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>
                    카테고리 {filterCategories.length > 0 && <span className="text-accent-mint">({filterCategories.length})</span>}
                  </label>
                  <div className="flex flex-col gap-2">
                    {/* 수입 카테고리 */}
                    {(filterType === 'ALL' || filterType === 'INCOME') && (
                      <div className="bg-bg-secondary rounded-[10px] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setIsIncomeCategoryOpen(!isIncomeCategoryOpen)}
                          className="w-full flex items-center justify-between text-left cursor-pointer hover:bg-bg-card-hover transition-colors"
                          style={{ padding: '10px 12px' }}
                        >
                          <span className="text-sm font-medium text-accent-mint flex items-center gap-2">
                            <span>💼</span> 수입
                            <span className="text-text-muted font-normal">
                              ({categories.filter(c => c.type === 'INCOME').length})
                            </span>
                          </span>
                          <span className="text-text-muted text-xs">
                            {isIncomeCategoryOpen ? '▲' : '▼'}
                          </span>
                        </button>
                        {isIncomeCategoryOpen && (
                          <div className="flex flex-col gap-1" style={{ padding: '0 8px 8px 8px' }}>
                            {categories.filter(c => c.type === 'INCOME').map((cat) => {
                              const isChecked = filterCategories.includes(cat.id);
                              return (
                                <label
                                  key={cat.id}
                                  className="flex items-center gap-2 bg-bg-card rounded-[6px] cursor-pointer hover:bg-bg-card-hover transition-colors"
                                  style={{ padding: '6px 8px' }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setFilterCategories(prev => prev.filter(id => id !== cat.id));
                                      } else {
                                        setFilterCategories(prev => [...prev, cat.id]);
                                      }
                                    }}
                                    className="w-4 h-4 rounded accent-accent-mint cursor-pointer"
                                  />
                                  <span className="text-sm text-text-primary">{cat.icon} {cat.name}</span>
                                </label>
                              );
                            })}
                            {categories.filter(c => c.type === 'INCOME').length === 0 && (
                              <div className="text-xs text-text-muted text-center py-2">
                                수입 카테고리가 없습니다
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 지출 카테고리 */}
                    {(filterType === 'ALL' || filterType === 'EXPENSE') && (
                      <div className="bg-bg-secondary rounded-[10px] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setIsExpenseCategoryOpen(!isExpenseCategoryOpen)}
                          className="w-full flex items-center justify-between text-left cursor-pointer hover:bg-bg-card-hover transition-colors"
                          style={{ padding: '10px 12px' }}
                        >
                          <span className="text-sm font-medium text-accent-coral flex items-center gap-2">
                            <span>💳</span> 지출
                            <span className="text-text-muted font-normal">
                              ({categories.filter(c => c.type === 'EXPENSE').length})
                            </span>
                          </span>
                          <span className="text-text-muted text-xs">
                            {isExpenseCategoryOpen ? '▲' : '▼'}
                          </span>
                        </button>
                        {isExpenseCategoryOpen && (
                          <div className="flex flex-col gap-1" style={{ padding: '0 8px 8px 8px' }}>
                            {categories.filter(c => c.type === 'EXPENSE').map((cat) => {
                              const isChecked = filterCategories.includes(cat.id);
                              return (
                                <label
                                  key={cat.id}
                                  className="flex items-center gap-2 bg-bg-card rounded-[6px] cursor-pointer hover:bg-bg-card-hover transition-colors"
                                  style={{ padding: '6px 8px' }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setFilterCategories(prev => prev.filter(id => id !== cat.id));
                                      } else {
                                        setFilterCategories(prev => [...prev, cat.id]);
                                      }
                                    }}
                                    className="w-4 h-4 rounded accent-accent-mint cursor-pointer"
                                  />
                                  <span className="text-sm text-text-primary">{cat.icon} {cat.name}</span>
                                </label>
                              );
                            })}
                            {categories.filter(c => c.type === 'EXPENSE').length === 0 && (
                              <div className="text-xs text-text-muted text-center py-2">
                                지출 카테고리가 없습니다
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 필터 초기화 */}
                <button
                  onClick={() => {
                    setFilterType('ALL');
                    setFilterCategories([]);
                    setSearchKeyword('');
                    setSortOrder('recent');
                  }}
                  disabled={filterType === 'ALL' && filterCategories.length === 0 && !searchKeyword && sortOrder === 'recent'}
                  className="w-full bg-bg-secondary text-text-secondary hover:text-text-primary rounded-[10px] text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-text-secondary"
                  style={{ padding: '10px 12px' }}
                >
                  필터 초기화
                </button>
              </div>
            </div>

            {/* 오른쪽 거래 내역 리스트 */}
            <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px]" style={{ padding: '16px' }}>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ marginBottom: '16px' }}>
                <span className="text-lg sm:text-xl">📝</span> 전체 거래 내역
                {allTransactions.length > 0 && (
                  <span className="text-sm text-text-muted font-normal">({allTransactions.length}건)</span>
                )}
              </h2>

              <div className="flex flex-col" style={{ gap: '8px' }}>
                {allTransactions.length > 0 ? (
                  <>
                    {allTransactions.map((tx) => {
                      const icon = tx.category?.icon || '💰';
                      const formatDate = (dateStr: string) => {
                        const date = new Date(dateStr);
                        const year = date.getFullYear();
                        const month = date.getMonth() + 1;
                        const day = date.getDate();
                        const hours = date.getHours().toString().padStart(2, '0');
                        const minutes = date.getMinutes().toString().padStart(2, '0');
                        return `${year}.${month}.${day} ${hours}:${minutes}`;
                      };

                      return (
                        <div
                          key={tx.id}
                          className="bg-bg-secondary rounded-[12px] sm:rounded-[14px] transition-colors hover:bg-bg-card-hover cursor-pointer"
                          style={{ padding: '12px' }}
                          onClick={() => {
                            setEditingTransaction(tx);
                            setTransactionType(tx.type);
                            setAmount(tx.amount.toLocaleString('ko-KR'));
                            setDescription(tx.description || '');
                            setSelectedCategory(tx.categoryId || '');
                            setSelectedDate(new Date(tx.date));
                            setIsEditModalOpen(true);
                          }}
                        >
                          <div className="flex items-center">
                            {/* 아이콘 */}
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-[10px] bg-bg-card flex items-center justify-center text-base sm:text-lg flex-shrink-0" style={{ marginRight: '12px' }}>
                              {icon}
                            </div>
                            {/* 내용 영역 */}
                            <div className="flex-1 min-w-0">
                              {/* 상단: 내용 + 금액 */}
                              <div className="flex items-center justify-between">
                                <div className="text-sm sm:text-[15px] font-medium truncate flex-1 min-w-0" style={{ marginRight: '12px' }}>
                                  {tx.description || tx.category?.name || '거래'}
                                </div>
                                <div className={`font-mono text-sm sm:text-base font-semibold whitespace-nowrap ${
                                  tx.type === 'EXPENSE' ? 'text-accent-coral' : 'text-accent-mint'
                                }`}>
                                  {formatCurrency(`${tx.type === 'EXPENSE' ? '-' : '+'}₩${formatNumber(tx.amount)}`)}
                                </div>
                              </div>
                              {/* 하단: 시간 + 카테고리 */}
                              <div className="flex items-center justify-between text-xs sm:text-[13px] text-text-muted">
                                <span>{formatDate(tx.date)}</span>
                                <span>{tx.category?.name || '미분류'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* 무한 스크롤 트리거 */}
                    <div ref={transactionsEndRef} style={{ height: '20px' }} />

                    {/* 로딩 인디케이터 */}
                    {isLoadingAllTransactions && (
                      <div className="text-center text-text-muted py-4">
                        로딩 중...
                      </div>
                    )}
                  </>
                ) : isLoadingAllTransactions ? (
                  <div className="text-center text-text-muted py-8">
                    로딩 중...
                  </div>
                ) : (
                  <div className="text-center text-text-muted py-8">
                    {searchKeyword || filterType !== 'ALL' || filterCategories.length > 0
                      ? '검색 결과가 없습니다'
                      : '거래 내역이 없습니다'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-20 sm:h-20 rounded-[14px] sm:rounded-[18px] bg-gradient-to-br from-accent-mint to-accent-blue border-none text-bg-primary text-[28px] sm:text-[36px] font-light leading-none cursor-pointer shadow-[0_8px_32px_var(--glow-mint)] transition-all hover:scale-110 hover:rotate-90 hover:shadow-[0_12px_48px_var(--glow-mint)] z-[100] flex items-center justify-center"
      >
        +
      </button>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[24px] animate-[fadeIn_0.3s_ease-out]"
            style={{
              width: '90%',
              maxWidth: '520px',
              padding: '32px',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
              <h2 className="text-xl font-bold">내역 추가</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Transaction Type Toggle */}
            <div className="flex gap-3" style={{ marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setTransactionType('EXPENSE');
                  setSelectedCategory('');
                }}
                className={`flex-1 rounded-[12px] font-medium transition-all cursor-pointer ${
                  transactionType === 'EXPENSE'
                    ? 'bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-card-hover'
                }`}
                style={{ padding: '14px' }}
              >
                💳 지출
              </button>
              <button
                onClick={() => {
                  setTransactionType('INCOME');
                  setSelectedCategory('');
                }}
                className={`flex-1 rounded-[12px] font-medium transition-all cursor-pointer ${
                  transactionType === 'INCOME'
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-card-hover'
                }`}
                style={{ padding: '14px' }}
              >
                💼 수입
              </button>
            </div>

            {/* Form Fields */}
            <form className="flex flex-col" style={{ gap: '20px' }} onSubmit={handleSubmitTransaction}>
              {/* Amount */}
              <div>
                <label className="block text-sm text-text-secondary font-medium" style={{ marginBottom: '8px' }}>
                  금액
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={handleAmountChange}
                  className={`w-full bg-bg-secondary border rounded-[12px] text-text-primary font-mono text-lg focus:outline-none transition-colors ${
                    amountError
                      ? 'border-accent-coral focus:border-accent-coral'
                      : 'border-[var(--border)] focus:border-accent-mint'
                  }`}
                  style={{ padding: '14px 16px' }}
                />
                {amountError && (
                  <p className="text-accent-coral text-sm" style={{ marginTop: '6px' }}>
                    {amountError}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-text-secondary font-medium" style={{ marginBottom: '8px' }}>
                  내용
                </label>
                <input
                  type="text"
                  placeholder="예: 점심 식사, 월급 등"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (e.target.value.trim()) {
                      setDescriptionError('');
                    }
                  }}
                  className={`w-full bg-bg-secondary border rounded-[12px] text-text-primary focus:outline-none transition-colors ${
                    descriptionError
                      ? 'border-accent-coral focus:border-accent-coral'
                      : 'border-[var(--border)] focus:border-accent-mint'
                  }`}
                  style={{ padding: '14px 16px' }}
                />
                {descriptionError && (
                  <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                    {descriptionError}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm text-text-secondary font-medium" style={{ marginBottom: '8px' }}>
                  카테고리
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className={`w-full bg-bg-secondary border rounded-[12px] text-text-primary focus:outline-none transition-colors cursor-pointer text-left flex items-center justify-between ${
                      categoryError
                        ? 'border-accent-coral focus:border-accent-coral'
                        : 'border-[var(--border)] focus:border-accent-mint'
                    }`}
                    style={{ padding: '14px 16px' }}
                  >
                    <span className={selectedCategory ? 'text-text-primary' : 'text-text-muted'}>
                      {selectedCategory
                        ? (() => {
                            const cat = currentCategories.find(c => c.id === selectedCategory);
                            return cat ? `${cat.icon} ${cat.name}` : '카테고리 선택';
                          })()
                        : '카테고리 선택'}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform text-text-secondary ${isCategoryOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {isCategoryOpen && (
                    <div
                      className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-10"
                      style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)', maxHeight: '240px' }}
                    >
                      {currentCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setCategoryError('');
                            setIsCategoryOpen(false);
                          }}
                          className="w-full text-left hover:bg-bg-card-hover transition-colors text-text-primary border-b border-[var(--border)] last:border-b-0 cursor-pointer"
                          style={{ padding: '12px 16px', fontSize: '15px' }}
                        >
                          {category.icon} {category.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {categoryError && (
                  <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                    {categoryError}
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setAmount('');
                    setDescription('');
                    setSelectedCategory('');
                    setAmountError('');
                    setDescriptionError('');
                    setCategoryError('');
                  }}
                  className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
                  style={{ padding: '14px' }}
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!amountError || !amount}
                  className={`flex-1 rounded-[12px] font-medium transition-all hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    transactionType === 'EXPENSE'
                      ? 'bg-gradient-to-br from-accent-coral to-accent-yellow'
                      : 'bg-gradient-to-br from-accent-mint to-accent-blue'
                  } text-bg-primary`}
                  style={{ padding: '14px' }}
                >
                  {isSubmitting ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
          onClick={() => {
            setIsEditModalOpen(false);
            setEditingTransaction(null);
            setAmount('');
            setDescription('');
            setSelectedCategory('');
            setAmountError('');
            setDescriptionError('');
            setCategoryError('');
          }}
        >
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-md animate-[fadeInUp_0.3s_ease-out]"
            style={{ padding: '32px', margin: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-text-primary" style={{ marginBottom: '24px' }}>
              내역 수정
            </h2>

            <form onSubmit={handleEditTransaction}>
              {/* Transaction Type Display (Read-only) */}
              <div className="flex rounded-[14px] bg-bg-secondary p-1.5" style={{ marginBottom: '20px' }}>
                <div
                  className={`flex-1 rounded-[10px] font-medium transition-all ${
                    transactionType === 'EXPENSE'
                      ? 'bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary shadow-lg'
                      : 'text-text-secondary'
                  }`}
                  style={{ padding: '10px', textAlign: 'center', opacity: transactionType === 'EXPENSE' ? 1 : 0.5 }}
                >
                  지출
                </div>
                <div
                  className={`flex-1 rounded-[10px] font-medium transition-all ${
                    transactionType === 'INCOME'
                      ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary shadow-lg'
                      : 'text-text-secondary'
                  }`}
                  style={{ padding: '10px', textAlign: 'center', opacity: transactionType === 'INCOME' ? 1 : 0.5 }}
                >
                  수입
                </div>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '20px' }}>
                <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
                  금액
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={handleAmountChange}
                  className={`w-full bg-bg-secondary border ${amountError ? 'border-accent-coral' : 'border-[var(--border)]'} rounded-[12px] text-text-primary font-mono text-lg focus:outline-none focus:border-accent-blue transition-colors`}
                  style={{ padding: '14px 16px' }}
                  placeholder="0"
                />
                {amountError && (
                  <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                    {amountError}
                  </p>
                )}
              </div>

              {/* Description Input */}
              <div style={{ marginBottom: '20px' }}>
                <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
                  내용
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDescriptionError('');
                  }}
                  className={`w-full bg-bg-secondary border ${descriptionError ? 'border-accent-coral' : 'border-[var(--border)]'} rounded-[12px] text-text-primary focus:outline-none focus:border-accent-blue transition-colors`}
                  style={{ padding: '14px 16px' }}
                  placeholder="예: 점심 식사, 월급 등"
                />
                {descriptionError && (
                  <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                    {descriptionError}
                  </p>
                )}
              </div>

              {/* Category Dropdown */}
              <div style={{ marginBottom: '24px' }}>
                <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
                  카테고리
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className={`w-full bg-bg-secondary border ${categoryError ? 'border-accent-coral' : 'border-[var(--border)]'} rounded-[12px] text-left flex items-center justify-between focus:outline-none focus:border-accent-blue transition-colors cursor-pointer`}
                    style={{ padding: '14px 16px' }}
                  >
                    <span className={selectedCategory ? 'text-text-primary' : 'text-text-muted'}>
                      {selectedCategory
                        ? `${currentCategories.find(c => c.id === selectedCategory)?.icon} ${currentCategories.find(c => c.id === selectedCategory)?.name}`
                        : '카테고리 선택'}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform text-text-secondary ${isCategoryOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {isCategoryOpen && (
                    <div
                      className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-10"
                      style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)', maxHeight: '240px' }}
                    >
                      {currentCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setCategoryError('');
                            setIsCategoryOpen(false);
                          }}
                          className="w-full text-left hover:bg-bg-card-hover transition-colors text-text-primary border-b border-[var(--border)] last:border-b-0 cursor-pointer"
                          style={{ padding: '12px 16px', fontSize: '15px' }}
                        >
                          {category.icon} {category.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {categoryError && (
                  <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                    {categoryError}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTransaction(null);
                    setAmount('');
                    setDescription('');
                    setSelectedCategory('');
                    setAmountError('');
                    setDescriptionError('');
                    setCategoryError('');
                  }}
                  className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
                  style={{ padding: '14px' }}
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="flex-1 bg-gradient-to-br from-accent-coral to-red-600 text-bg-primary rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ padding: '14px' }}
                  disabled={isSubmitting}
                >
                  삭제
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!amountError || !amount}
                  className={`flex-1 rounded-[12px] font-medium transition-all hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    transactionType === 'EXPENSE'
                      ? 'bg-gradient-to-br from-accent-coral to-accent-yellow'
                      : 'bg-gradient-to-br from-accent-mint to-accent-blue'
                  } text-bg-primary`}
                  style={{ padding: '14px' }}
                >
                  {isSubmitting ? '수정 중...' : '수정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[300] animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out]"
            style={{ padding: '32px', margin: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center" style={{ marginBottom: '24px' }}>
              <div className="w-16 h-16 rounded-full bg-[var(--glow-coral)] flex items-center justify-center text-3xl" style={{ marginBottom: '16px' }}>
                ⚠️
              </div>
              <h2 className="text-xl font-bold text-text-primary" style={{ marginBottom: '8px' }}>
                내역 삭제
              </h2>
              <p className="text-sm text-text-secondary text-center">
                이 내역을 정말 삭제하시겠습니까?<br />
                삭제된 내역은 복구할 수 없습니다.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
                style={{ padding: '14px' }}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteTransaction}
                className="flex-1 bg-gradient-to-br from-accent-coral to-red-600 text-bg-primary rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: '14px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
