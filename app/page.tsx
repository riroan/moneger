'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
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
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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
    setAmount(value);

    // 빈 값인 경우
    if (value === '') {
      setAmountError('');
      return;
    }

    // 숫자가 아닌 경우
    if (!/^\d+$/.test(value)) {
      setAmountError('숫자만 입력할 수 있습니다');
      return;
    }

    // 0인 경우
    if (parseInt(value) === 0) {
      setAmountError('0보다 큰 금액을 입력하세요');
      return;
    }

    setAmountError('');
  };

  const categories = {
    EXPENSE: [
      { value: 'auto', label: '🤖 자동' },
      { value: 'food', label: '🍽️ 식비' },
      { value: 'transport', label: '🚇 교통비' },
      { value: 'loan', label: '🏠 대출이자' },
      { value: 'subscription', label: '🎮 구독서비스' },
      { value: 'travel', label: '✈️ 여행' },
      { value: 'beauty', label: '💄 미용/뷰티' },
    ],
    INCOME: [
      { value: 'auto', label: '🤖 자동' },
      { value: 'salary', label: '💼 급여' },
      { value: 'bonus', label: '🎁 상여금' },
      { value: 'investment', label: '📈 투자수익' },
      { value: 'etc', label: '💰 기타수입' },
    ],
  };

  // Mock transaction data
  const mockTransactions = [
    { id: 1, type: 'INCOME' as const, amount: 3000000, description: '급여', category: 'salary', date: new Date(2026, 0, 15) },
    { id: 2, type: 'INCOME' as const, amount: 500000, description: '상여금', category: 'bonus', date: new Date(2026, 0, 20) },
    { id: 3, type: 'EXPENSE' as const, amount: 338752, description: '대출이자', category: 'loan', date: new Date(2026, 0, 5) },
    { id: 4, type: 'EXPENSE' as const, amount: 150000, description: '식비', category: 'food', date: new Date(2026, 0, 10) },
    { id: 5, type: 'EXPENSE' as const, amount: 80000, description: '교통비', category: 'transport', date: new Date(2026, 0, 12) },
    { id: 6, type: 'EXPENSE' as const, amount: 45000, description: '구독서비스', category: 'subscription', date: new Date(2026, 0, 14) },
    { id: 7, type: 'EXPENSE' as const, amount: 200000, description: '쇼핑', category: 'beauty', date: new Date(2026, 0, 18) },
  ];

  // Calculate summary statistics
  const currentMonthTransactions = mockTransactions.filter(tx => {
    return tx.date.getFullYear() === currentDate.getFullYear() &&
           tx.date.getMonth() === currentDate.getMonth();
  });

  const totalIncome = currentMonthTransactions
    .filter(tx => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = currentMonthTransactions
    .filter(tx => tx.type === 'EXPENSE')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = totalIncome - totalExpense;
  const savingsGoal = 2000000;
  const actualSavings = Math.max(0, balance);
  const savingsRate = Math.min(100, Math.round((actualSavings / savingsGoal) * 100));

  // Calculate category statistics
  const categoryStats = currentMonthTransactions
    .filter(tx => tx.type === 'EXPENSE')
    .reduce((acc, tx) => {
      if (!acc[tx.category]) {
        acc[tx.category] = { count: 0, total: 0 };
      }
      acc[tx.category].count++;
      acc[tx.category].total += tx.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

  const maxCategoryAmount = Math.max(...Object.values(categoryStats).map(s => s.total), 1);

  const categoryList = [
    { icon: '🏠', name: '대출이자', category: 'loan' },
    { icon: '🍽️', name: '식비', category: 'food' },
    { icon: '🚇', name: '교통비', category: 'transport' },
    { icon: '🎮', name: '구독서비스', category: 'subscription' },
    { icon: '✈️', name: '여행', category: 'travel' },
    { icon: '💄', name: '미용/뷰티', category: 'beauty' }
  ].map((cat, i) => {
    const stats = categoryStats[cat.category] || { count: 0, total: 0 };
    const width = Math.round((stats.total / maxCategoryAmount) * 100);
    return {
      ...cat,
      count: stats.count,
      amount: stats.total,
      width: width || 0,
      colorIndex: i
    };
  }).filter(cat => cat.count > 0);

  // Calculate budget usage
  const monthlyBudget = 2000000;
  const budgetUsed = totalExpense;
  const budgetUsagePercent = Math.min(100, Math.round((budgetUsed / monthlyBudget) * 100));
  const budgetRemaining = Math.max(0, monthlyBudget - budgetUsed);

  // Prepare recent transactions (sorted by date, most recent first)
  const recentTransactions = [...currentMonthTransactions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

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
          padding: '32px'
        }}
      >
        {/* Header */}
        <header
          className="flex justify-between items-center animate-[fadeInDown_0.6s_ease-out]"
          style={{ marginBottom: '40px' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-mint to-accent-blue rounded-[14px] flex items-center justify-center text-2xl shadow-[0_8px_32px_var(--glow-mint)]">
              💰
            </div>
            <span className="text-2xl font-bold bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent tracking-tight">
              MONEGER
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div ref={datePickerRef} className="flex items-center bg-bg-card border border-[var(--border)] rounded-xl relative select-none" style={{ padding: '10px 20px', gap: '12px' }}>
              <button
                onClick={handlePreviousMonth}
                className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer"
              >
                ◀
              </button>
              <span
                onClick={handleDatePickerToggle}
                className="text-base font-semibold min-w-[120px] text-center cursor-pointer"
              >
                {formatYearMonth(currentDate)}
              </span>
              <button
                onClick={handleNextMonth}
                className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer"
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
                      className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer w-8 h-8 flex items-center justify-center"
                    >
                      ▶
                    </button>
                  </div>

                  {/* Month Grid */}
                  <div className="grid grid-cols-4" style={{ gap: '8px' }}>
                    {Array.from({ length: 12 }, (_, i) => i).map(month => {
                      const isSelected = currentDate.getFullYear() === pickerYear && currentDate.getMonth() === month;
                      return (
                        <button
                          key={month}
                          onClick={() => handleMonthSelect(pickerYear, month)}
                          className={`rounded-[8px] font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                              : 'bg-bg-secondary text-text-secondary hover:bg-bg-card-hover'
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
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-purple to-accent-coral flex items-center justify-center font-semibold cursor-pointer transition-transform hover:scale-105"
              >
                김
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
                    <div className="font-semibold text-text-primary" style={{ fontSize: '14px' }}>김철수</div>
                    <div className="text-text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>user@example.com</div>
                  </div>
                  <div style={{ padding: '6px 0' }}>
                    <button
                      className="w-full text-left text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                      style={{ padding: '10px 14px', fontSize: '14px' }}
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        // TODO: Navigate to profile settings
                      }}
                    >
                      ⚙️ 설정
                    </button>
                    <button
                      className="w-full text-left text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                      style={{ padding: '10px 14px', fontSize: '14px' }}
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        // TODO: Handle logout
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

        {/* Summary Cards */}
        <div
          className="grid grid-cols-4"
          style={{ gap: '20px', marginBottom: '32px' }}
        >
          {[
            { type: 'income', icon: '💼', label: '이번 수입', amount: `₩${formatNumber(totalIncome)}`, change: `${currentMonthTransactions.filter(tx => tx.type === 'INCOME').length}건의 수입`, positive: true },
            { type: 'expense', icon: '💳', label: '이번 지출', amount: `₩${formatNumber(totalExpense)}`, change: `${currentMonthTransactions.filter(tx => tx.type === 'EXPENSE').length}건의 지출`, positive: false },
            { type: 'savings', icon: '🏦', label: '저축', amount: `₩${formatNumber(actualSavings)}`, change: `목표의 ${savingsRate}%`, positive: actualSavings >= savingsGoal },
            { type: 'balance', icon: '✨', label: '남은 금액', amount: `₩${formatNumber(balance)}`, change: balance > 0 ? '여유 자산' : '적자', positive: balance > 0 }
          ].map((card, i) => (
            <div
              key={card.type}
              className={`bg-bg-card border border-[var(--border)] rounded-[20px] relative overflow-hidden transition-all hover:translate-y-[-4px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] animate-[fadeInUp_0.6s_ease-out_backwards] [animation-delay:${(i + 1) * 100}ms] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:rounded-t-[20px] ${
                card.type === 'income' ? 'before:bg-gradient-to-r before:from-accent-mint before:to-accent-blue' :
                card.type === 'expense' ? 'before:bg-gradient-to-r before:from-accent-coral before:to-accent-yellow' :
                card.type === 'savings' ? 'before:bg-gradient-to-r before:from-accent-blue before:to-accent-purple' :
                'before:bg-gradient-to-r before:from-accent-purple before:to-accent-mint'
              }`}
              style={{ padding: '24px' }}
            >
              <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] ${
                card.type === 'income' ? 'bg-[var(--glow-mint)] text-accent-mint' :
                card.type === 'expense' ? 'bg-[var(--glow-coral)] text-accent-coral' :
                card.type === 'savings' ? 'bg-[var(--glow-blue)] text-accent-blue' :
                'bg-[var(--glow-purple)] text-accent-purple'
              }`}
                style={{ marginBottom: '16px' }}
              >
                {card.icon}
              </div>
              <div className="text-sm text-text-secondary font-medium" style={{ marginBottom: '8px' }}>{card.label}</div>
              <div className={`font-mono font-bold tracking-tight ${
                card.type === 'income' ? 'text-accent-mint' :
                card.type === 'expense' ? 'text-accent-coral' :
                card.type === 'savings' ? 'text-accent-blue' :
                'text-accent-purple'
              }`}
                style={{ fontSize: 'clamp(20px, 2vw, 28px)' }}
              >
                {formatCurrency(card.amount)}
              </div>
              <div className={`inline-flex items-center gap-1 text-[13px] rounded-lg font-medium ${
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
        <div className="grid grid-cols-[1fr_380px]" style={{ gap: '24px' }}>
          {/* Left Panel - Categories */}
          <div className="bg-bg-card border border-[var(--border)] rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards]" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
              <h2 className="text-lg font-semibold flex items-center gap-2.5">
                <span className="text-xl">📊</span> 카테고리별 지출
              </h2>
              <div className="flex gap-2">
                {['생활비', '고정비'].map((tab) => (
                  <button
                    key={tab}
                    className={`rounded-[10px] text-sm font-medium transition-all ${
                      tab === '생활비'
                        ? 'bg-[var(--glow-mint)] text-accent-mint'
                        : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                    }`}
                    style={{ padding: '10px 20px' }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: '12px' }}>
              {categoryList.length > 0 ? categoryList.map((category) => (
                <div
                  key={category.category}
                  className="flex items-center bg-bg-secondary rounded-[14px] cursor-pointer transition-all hover:bg-bg-card-hover hover:translate-x-1"
                  style={{ padding: '16px' }}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                    ['bg-[var(--glow-mint)]', 'bg-[var(--glow-coral)]', 'bg-[var(--glow-blue)]', 'bg-[rgba(251,191,36,0.15)]', 'bg-[var(--glow-purple)]', 'bg-[rgba(244,114,182,0.15)]'][category.colorIndex]
                  }`} style={{ marginRight: '14px' }}>
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-[15px] font-medium" style={{ marginBottom: '4px' }}>{category.name}</div>
                    <div className="text-[13px] text-text-muted">{category.count}건</div>
                  </div>
                  <div className="font-mono text-base font-semibold" style={{ marginRight: '16px' }}>{formatCurrency(`₩${formatNumber(category.amount)}`)}</div>
                  <div className="w-20 h-1.5 bg-bg-primary rounded-[3px] overflow-hidden">
                    <div
                      className={`h-full rounded-[3px] transition-all duration-[600ms] ${
                        ['bg-accent-mint', 'bg-accent-coral', 'bg-accent-blue', 'bg-accent-yellow', 'bg-accent-purple', 'bg-[#f472b6]'][category.colorIndex]
                      }`}
                      style={{ width: `${category.width}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="text-center text-text-muted py-8">
                  이번 달 지출 내역이 없습니다
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="flex flex-col" style={{ gap: '24px' }}>
            {/* Budget Progress */}
            <div className="bg-bg-card border border-[var(--border)] rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards]" style={{ padding: '24px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
                <h2 className="text-lg font-semibold flex items-center gap-2.5">
                  <span className="text-xl">🎯</span> 예산 달성률
                </h2>
              </div>

              <div className="flex justify-center py-5">
                <div className="relative w-[180px] h-[180px]">
                  <svg className="transform -rotate-90" width="180" height="180" viewBox="0 0 180 180">
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: 'var(--accent-mint)' }} />
                        <stop offset="100%" style={{ stopColor: 'var(--accent-blue)' }} />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="90"
                      cy="90"
                      r="70"
                      fill="none"
                      stroke="var(--bg-secondary)"
                      strokeWidth="12"
                    />
                    <circle
                      cx="90"
                      cy="90"
                      r="70"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray="439.8"
                      strokeDashoffset={439.8 * (1 - budgetUsagePercent / 100)}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className={`font-mono text-4xl font-bold ${budgetUsagePercent > 100 ? 'text-accent-coral' : 'text-accent-mint'}`}>{budgetUsagePercent}%</div>
                    <div className="text-[13px] text-text-secondary mt-1">예산 사용</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col" style={{ gap: '12px', marginTop: '8px' }}>
                <div className="bg-bg-secondary rounded-xl text-center" style={{ padding: '16px' }}>
                  <div className={`font-mono text-xl font-bold ${budgetRemaining > 0 ? 'text-accent-mint' : 'text-accent-coral'}`} style={{ marginBottom: '4px' }}>{formatCurrency(`₩${formatNumber(budgetRemaining)}`)}</div>
                  <div className="text-xs text-text-muted">여유 예산</div>
                </div>
                <div className="bg-bg-secondary rounded-xl text-center" style={{ padding: '16px' }}>
                  <div className="font-mono text-xl font-bold text-accent-coral" style={{ marginBottom: '4px' }}>{formatCurrency(`₩${formatNumber(budgetUsed)}`)}</div>
                  <div className="text-xs text-text-muted">사용 금액</div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-bg-card border border-[var(--border)] rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards]" style={{ padding: '24px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
                <h2 className="text-lg font-semibold flex items-center gap-2.5">
                  <span className="text-xl">📝</span> 최근 거래
                </h2>
              </div>

              <div className="flex flex-col" style={{ gap: '12px' }}>
                {recentTransactions.length > 0 ? recentTransactions.map((tx) => {
                  const categoryInfo = categories[tx.type].find(c => c.value === tx.category);
                  const icon = categoryInfo?.label.split(' ')[0] || '💰';
                  const formatDate = (date: Date) => {
                    const month = date.getMonth() + 1;
                    const day = date.getDate();
                    return `${month}월 ${day}일`;
                  };

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center bg-bg-secondary rounded-[14px] transition-colors hover:bg-bg-card-hover"
                      style={{ padding: '14px' }}
                    >
                      <div className="w-10 h-10 rounded-[10px] bg-bg-card flex items-center justify-center text-lg" style={{ marginRight: '12px' }}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ marginBottom: '2px' }}>{tx.description}</div>
                        <div className="text-xs text-text-muted">{formatDate(tx.date)}</div>
                      </div>
                      <div className={`font-mono text-[15px] font-semibold ${
                        tx.type === 'EXPENSE' ? 'text-accent-coral' : 'text-accent-mint'
                      }`}>
                        {formatCurrency(`${tx.type === 'EXPENSE' ? '-' : '+'}₩${formatNumber(tx.amount)}`)}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center text-text-muted py-8">
                    거래 내역이 없습니다
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-[18px] bg-gradient-to-br from-accent-mint to-accent-blue border-none text-bg-primary text-[28px] cursor-pointer shadow-[0_8px_32px_var(--glow-mint)] transition-all hover:scale-110 hover:rotate-90 hover:shadow-[0_12px_48px_var(--glow-mint)] z-[100] flex items-center justify-center">
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
              <h2 className="text-xl font-bold">거래 추가</h2>
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
            <form className="flex flex-col" style={{ gap: '20px' }}>
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
                  placeholder="거래 내용을 입력하세요"
                  className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] text-text-primary focus:outline-none focus:border-accent-mint transition-colors"
                  style={{ padding: '14px 16px' }}
                />
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
                    className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] text-text-primary focus:outline-none focus:border-accent-mint transition-colors cursor-pointer text-left flex items-center justify-between"
                    style={{ padding: '14px 16px' }}
                  >
                    <span className={selectedCategory ? 'text-text-primary' : 'text-text-muted'}>
                      {selectedCategory
                        ? categories[transactionType].find(c => c.value === selectedCategory)?.label
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
                      className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-[var(--border)] rounded-[12px] overflow-hidden z-10"
                      style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' }}
                    >
                      {categories[transactionType].map((category) => (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(category.value);
                            setIsCategoryOpen(false);
                          }}
                          className="w-full text-left hover:bg-bg-card-hover transition-colors text-text-primary border-b border-[var(--border)] last:border-b-0 cursor-pointer"
                          style={{ padding: '12px 16px', fontSize: '15px' }}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
                  style={{ padding: '14px' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={`flex-1 rounded-[12px] font-medium transition-all hover:shadow-lg cursor-pointer ${
                    transactionType === 'EXPENSE'
                      ? 'bg-gradient-to-br from-accent-coral to-accent-yellow'
                      : 'bg-gradient-to-br from-accent-mint to-accent-blue'
                  } text-bg-primary`}
                  style={{ padding: '14px' }}
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
