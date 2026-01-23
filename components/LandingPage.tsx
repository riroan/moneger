'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MdLock,
  MdLightMode,
  MdDarkMode,
  MdAttachMoney,
  MdCreditCard,
  MdTrendingUp,
  MdAccountBalanceWallet,
  MdMovie,
  MdRestaurant,
  MdHome,
  MdAccessTime,
  MdRocketLaunch,
  MdSavings,
  MdInventory,
  MdPieChart,
  MdHistory
} from 'react-icons/md';
import { FaMoneyBillWave, FaCreditCard, FaChartLine } from 'react-icons/fa';

const LandingPage = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Theme colors
  const theme = {
    bg: isDark ? '#0b1120' : '#f8fafc',
    bgNav: isDark ? 'rgba(11, 17, 32, 0.8)' : 'rgba(248, 250, 252, 0.8)',
    bgCard: isDark ? 'rgba(22, 28, 45, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    bgCardAlt: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(241, 245, 249, 0.95)',
    bgBadge: isDark ? '#161c2d' : '#e2e8f0',
    bgSecondary: isDark ? '#161c2d' : '#e2e8f0',
    bgCategoryItem: isDark ? '#0f1521' : '#f1f5f9',
    text: isDark ? 'white' : '#0f172a',
    textSecondary: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.6)',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.4)',
    textVeryMuted: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.3)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    borderLight: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    chartBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };

  const features = [
    {
      icon: <FaMoneyBillWave size={24} />,
      title: '수입 관리',
      description: '다양한 수입원을 등록하고 현금 흐름을 한눈에 파악하세요',
      underlineColor: '#10B981',
      iconColor: 'white',
      iconBgColor: '#10B981',
      stat: '500,000',
      statLabel: '이번 달 수입',
      prefix: '₩'
    },
    {
      icon: <FaCreditCard size={24} />,
      title: '지출 분석',
      description: '카테고리별 지출을 자동 분류하고 소비 패턴을 분석하세요',
      underlineColor: '#EF4444',
      iconColor: 'white',
      iconBgColor: '#B91C1C',
      stat: '200,000',
      statLabel: '이번 달 지출',
      prefix: '₩'
    },
    {
      icon: <FaChartLine size={24} />,
      title: '저축 목표',
      description: '목표를 설정하고 저축 현황을 시각적으로 추적하세요',
      underlineColor: '#06B6D4',
      iconColor: 'white',
      iconBgColor: '#0891B2',
      stat: '200,000',
      statLabel: '이번 달 저축',
      prefix: '₩'
    },
    {
      icon: <MdAccountBalanceWallet size={24} />,
      title: '잔액 관리',
      description: '전월 대비 잔액 변화를 확인하고 재정 상태를 파악하세요',
      underlineColor: '#a78bfa',
      iconColor: 'white',
      iconBgColor: '#a78bfa',
      stat: '100,000',
      statLabel: '지난달 대비',
      prefix: '₩'
    }
  ];

  const categories = [
    { name: '기타지출', amount: 150000, percent: 75, color: '#f472b6', icon: <MdInventory size={18} /> },
    { name: '문화생활', amount: 30000, percent: 15, color: '#22d3ee', icon: <MdMovie size={18} /> },
    { name: '식비', amount: 20000, percent: 10, color: '#4ade80', icon: <MdRestaurant size={18} /> },
  ];

  const recentHistory = [
    { name: '적금', date: '2026.1.25 10:00', amount: -200000 },
    { name: '식비', date: '2026.1.20 10:23', amount: -20000 },
    { name: '월급', date: '2026.1.10 09:00', amount: 200000 },
  ];

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.text,
      overflowX: 'hidden' as const,
      fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
      transition: 'background-color 0.3s ease, color 0.3s ease',
    },
    nav: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backgroundColor: theme.bgNav,
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${theme.border}`,
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
    },
    navInner: {
      maxWidth: '1152px',
      margin: '0 auto',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    logo: {
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      background: 'linear-gradient(to bottom, #2dd4bf, #22d3ee, #06b6d4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(34, 211, 238, 0.2)',
    },
    logoInner: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      border: '2px solid rgba(255, 255, 255, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeToggle: {
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      backgroundColor: theme.bgSecondary,
      border: `1px solid ${theme.borderLight}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
    },
    startButton: {
      padding: '10px 20px',
      background: 'linear-gradient(to right, #06b6d4, #2dd4bf)',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 600,
      color: '#111827',
      border: 'none',
      cursor: 'pointer',
    },
    hero: {
      position: 'relative' as const,
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      paddingTop: '80px',
      paddingBottom: '80px',
    },
    heroInner: {
      maxWidth: '1152px',
      margin: '0 auto',
      padding: '0 24px',
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '48px',
      alignItems: 'center',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '9999px',
      backgroundColor: theme.bgBadge,
      border: `1px solid ${theme.borderLight}`,
      marginBottom: '24px',
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
    },
    badgeDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#34d399',
      animation: 'pulse 2s infinite',
    },
    heading: {
      fontSize: '48px',
      fontWeight: 800,
      lineHeight: 1.1,
      marginBottom: '24px',
    },
    gradientText: {
      background: 'linear-gradient(to right, #22d3ee, #2dd4bf, #67e8f9)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    description: {
      fontSize: '18px',
      color: theme.textMuted,
      marginBottom: '32px',
      lineHeight: 1.6,
      maxWidth: '480px',
      transition: 'color 0.3s ease',
    },
    buttonGroup: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '16px',
      marginBottom: '40px',
    },
    primaryButton: {
      padding: '16px 32px',
      background: 'linear-gradient(to right, #06b6d4, #2dd4bf)',
      borderRadius: '16px',
      fontWeight: 600,
      color: '#111827',
      border: 'none',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      textDecoration: 'none',
    },
    secondaryButton: {
      padding: '16px 32px',
      borderRadius: '16px',
      fontWeight: 600,
      color: theme.textSecondary,
      backgroundColor: theme.bgSecondary,
      border: `1px solid ${theme.borderLight}`,
      cursor: 'pointer',
      textDecoration: 'none',
      transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
    },
    stats: {
      display: 'flex',
      gap: '32px',
    },
    statItem: {
      textAlign: 'center' as const,
    },
    statValue: {
      fontSize: '24px',
      fontWeight: 700,
      lineHeight: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statLabel: {
      fontSize: '14px',
      color: theme.textMuted,
      transition: 'color 0.3s ease',
      whiteSpace: 'nowrap' as const,
    },
    statDivider: {
      width: '1px',
      backgroundColor: theme.borderLight,
      transition: 'background-color 0.3s ease',
    },
    previewContainer: {
      position: 'relative' as const,
    },
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      marginBottom: '16px',
    },
    statCard: {
      background: `linear-gradient(145deg, ${theme.bgCard}, ${theme.bgCardAlt})`,
      border: `1px solid ${theme.border}`,
      borderRadius: '16px',
      padding: '16px',
      position: 'relative' as const,
      overflow: 'hidden',
      transition: 'background 0.3s ease, border-color 0.3s ease',
    },
    statCardLine: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: '3px',
    },
    mainCard: {
      background: `linear-gradient(145deg, ${theme.bgCard}, ${theme.bgCardAlt})`,
      border: `1px solid ${theme.border}`,
      borderRadius: '20px',
      padding: '20px',
      transition: 'background 0.3s ease, border-color 0.3s ease',
    },
    floatingCard: {
      position: 'absolute' as const,
      background: `linear-gradient(145deg, ${theme.bgCard}, ${theme.bgCardAlt})`,
      border: `1px solid ${theme.border}`,
      borderRadius: '16px',
      padding: '16px',
      zIndex: 20,
      overflow: 'hidden',
      transition: 'background 0.3s ease, border-color 0.3s ease',
    },
    iconBox: {
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: {
      position: 'relative' as const,
      padding: '96px 0',
    },
    sectionInner: {
      maxWidth: '1152px',
      margin: '0 auto',
      padding: '0 24px',
    },
    sectionTitle: {
      fontSize: '32px',
      fontWeight: 700,
      marginBottom: '16px',
      textAlign: 'center' as const,
    },
    sectionDesc: {
      color: theme.textMuted,
      maxWidth: '480px',
      margin: '0 auto 56px',
      textAlign: 'center' as const,
      transition: 'color 0.3s ease',
    },
    featureGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
    },
    featureCard: {
      background: `linear-gradient(145deg, ${theme.bgCard}, ${theme.bgCardAlt})`,
      border: `1px solid ${theme.border}`,
      borderRadius: '20px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative' as const,
      overflow: 'hidden',
    },
    footer: {
      borderTop: `1px solid ${theme.border}`,
      padding: '40px 0',
      transition: 'border-color 0.3s ease',
    },
    footerInner: {
      maxWidth: '1152px',
      margin: '0 auto',
      padding: '0 24px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '24px',
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        html {
          scroll-behavior: smooth;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .float-animation {
          animation: float 6s ease-in-out infinite;
        }

        .float-animation-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: -3s;
        }

        .slide-up {
          animation: slideUp 0.8s ease-out forwards;
        }

        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .feature-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .detail-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .feature-grid {
            grid-template-columns: 1fr !important;
          }
          .preview-card-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
            margin-left: -16px !important;
            margin-right: -16px !important;
          }
          .preview-card-grid > div {
            min-width: 0 !important;
          }
          .stats-row {
            gap: 16px !important;
          }
        }
      `}</style>

      {/* 배경 글로우 */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '25%',
          width: '320px',
          height: '320px',
          backgroundColor: isDark ? 'rgba(34, 211, 238, 0.1)' : 'rgba(34, 211, 238, 0.15)',
          borderRadius: '50%',
          filter: 'blur(120px)',
          transition: 'background-color 0.3s ease',
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '25%',
          width: '384px',
          height: '384px',
          backgroundColor: isDark ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0.12)',
          borderRadius: '50%',
          filter: 'blur(140px)',
          transition: 'background-color 0.3s ease',
        }} />
      </div>

      {/* 네비게이션 */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ ...styles.logo, cursor: 'pointer' }} onClick={() => window.location.reload()}>
              <div style={styles.logoInner}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>M</span>
              </div>
            </div>
            {!isMobile && <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.025em' }}>MONEGER</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button style={styles.themeToggle} onClick={toggleTheme} aria-label="테마 전환">
              {isDark ? (
                <MdLightMode size={20} color="#fbbf24" />
              ) : (
                <MdDarkMode size={20} color="#64748b" />
              )}
            </button>
            <Link href="/login" style={styles.startButton}>
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section style={styles.hero}>
        <div style={styles.heroInner} className="hero-grid">
          {/* 왼쪽: 텍스트 */}
          <div className="slide-up">
            <div style={{ ...styles.badge, marginTop: isMobile ? '24px' : '0' }}>
              <span style={styles.badgeDot} />
              <span style={{ fontSize: '14px', color: theme.textSecondary, transition: 'color 0.3s ease' }}>당신의 재정 파트너</span>
            </div>

            <h1 style={styles.heading}>
              <span style={styles.gradientText}>스마트한</span>
              <br />
              자산 관리의 시작
            </h1>

            <p style={styles.description}>
              수입과 지출을 한눈에 파악하고, 카테고리별 예산을 설정하여
              체계적인 자산 관리를 시작하세요.
            </p>

            <div style={styles.buttonGroup}>
              <Link href="/login" style={styles.primaryButton}>
                무료로 시작하기
                <span>→</span>
              </Link>
              <a href="#features" style={styles.secondaryButton}>
                둘러보기
              </a>
            </div>

            <div style={styles.stats} className="stats-row">
              <div style={styles.statItem}>
                <div style={{ ...styles.statValue, color: '#22d3ee' }}>100%</div>
                <div style={styles.statLabel}>무료 이용</div>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <div style={{ ...styles.statValue, color: '#a78bfa' }}>0</div>
                <div style={styles.statLabel}>광고 없음</div>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <div style={{ ...styles.statValue, color: '#4ade80' }}><MdLock size={24} /></div>
                <div style={styles.statLabel}>데이터 보안</div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 앱 미리보기 */}
          <div style={styles.previewContainer} className="slide-up">
            {/* 상단 통계 카드들 */}
            <div style={{ ...styles.cardGrid, ...(isMobile && { marginLeft: '-12px', marginRight: '-12px' }) }}>
              {/* 수입 카드 */}
              <div style={styles.statCard} className="float-animation">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ ...styles.iconBox, backgroundColor: '#10B981' }}>
                    <FaMoneyBillWave size={20} color="white" />
                  </div>
                  <span style={{ fontSize: '12px', color: theme.textMuted, transition: 'color 0.3s ease', whiteSpace: 'nowrap' }}>이번 달 수입</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>₩500,000</div>
                <div style={{ marginTop: '8px', display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
                  2건의 수입
                </div>
                <div style={{ ...styles.statCardLine, background: '#10B981' }} />
              </div>

              {/* 지출 카드 */}
              <div style={{ ...styles.statCard, position: 'relative' as const, zIndex: isMobile ? 25 : 'auto' }} className="float-animation-delayed">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ ...styles.iconBox, backgroundColor: '#B91C1C' }}>
                    <FaCreditCard size={20} color="white" />
                  </div>
                  <span style={{ fontSize: '12px', color: theme.textMuted, transition: 'color 0.3s ease', whiteSpace: 'nowrap' }}>이번 달 지출</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>₩200,000</div>
                <div style={{ marginTop: '8px', display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                  12건의 지출
                </div>
                <div style={{ ...styles.statCardLine, background: 'linear-gradient(90deg, #ef4444, #dc2626)' }} />
              </div>
            </div>

            {/* 메인 카드 - 카테고리별 지출 */}
            <div style={styles.mainCard} className="float-animation">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <MdPieChart size={20} color="#60a5fa" />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>카테고리별 지출</span>
              </div>

              {/* 도넛 차트 */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div style={{ position: 'relative', width: '144px', height: '144px' }}>
                  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke={theme.chartBg} strokeWidth="12"/>
                    {categories.map((cat, idx) => {
                      const total = categories.reduce((a, b) => a + b.amount, 0);
                      const percent = (cat.amount / total) * 100;
                      const offset = categories.slice(0, idx).reduce((a, b) => a + (b.amount / total) * 100, 0);
                      return (
                        <circle
                          key={idx}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={cat.color}
                          strokeWidth="12"
                          strokeDasharray={`${percent * 2.39} 239`}
                          strokeDashoffset={`${-offset * 2.39}`}
                        />
                      );
                    })}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700 }}>200,000</span>
                    <span style={{ fontSize: '10px', color: theme.textMuted, transition: 'color 0.3s ease' }}>총 지출</span>
                  </div>
                </div>
              </div>

              {/* 카테고리 리스트 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {categories.slice(0, 3).map((cat, idx) => {
                  const barColor = cat.percent > 50 ? '#ef4444' : '#4ade80';
                  return (
                  <div key={idx} style={{ backgroundColor: theme.bgCategoryItem, borderRadius: '12px', padding: '12px', transition: 'background-color 0.3s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${cat.color}20`, color: cat.color }}>
                          {cat.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>{cat.name}</div>
                          <div style={{ fontSize: '10px', color: theme.textMuted, transition: 'color 0.3s ease' }}>1건</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>₩{cat.amount.toLocaleString()}</div>
                        <div style={{ fontSize: '10px', color: barColor }}>
                          ({cat.percent}%)
                        </div>
                      </div>
                    </div>
                    <div style={{ height: '4px', backgroundColor: theme.chartBg, borderRadius: '9999px', overflow: 'hidden', transition: 'background-color 0.3s ease' }}>
                      <div style={{ height: '100%', borderRadius: '9999px', width: `${Math.min(cat.percent, 100)}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* 플로팅 카드 - 최근 내역 */}
            <div style={{ ...styles.floatingCard, bottom: '-16px', left: '-16px', width: '208px', zIndex: 20 }} className="float-animation">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <MdHistory size={16} color="#4ade80" />
                <span style={{ fontSize: '12px', fontWeight: 500 }}>최근 내역</span>
              </div>
              {recentHistory.map((item, idx) => {
                const isFood = item.name === '식비';
                const isIncome = item.amount > 0;
                const iconBg = isIncome ? 'rgba(16, 185, 129, 0.2)' : isFood ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 211, 238, 0.2)';
                const iconColor = isIncome ? '#10B981' : isFood ? '#ef4444' : '#22d3ee';
                const getIcon = () => {
                  if (isIncome) return <FaMoneyBillWave size={14} color={iconColor} />;
                  if (isFood) return <MdRestaurant size={14} color={iconColor} />;
                  return <MdSavings size={14} color={iconColor} />;
                };
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${theme.border}`, transition: 'border-color 0.3s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getIcon()}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: '9px', color: theme.textVeryMuted, transition: 'color 0.3s ease' }}>{item.date}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: iconColor }}>
                      {isIncome ? '+' : '-'}₩{Math.abs(item.amount).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 플로팅 카드 - 저축 */}
            <div style={{ ...styles.floatingCard, bottom: '-20px', right: '-20px', width: '160px', zIndex: 30 }} className="float-animation-delayed">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#0891B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaChartLine size={14} color="white" />
                </div>
                <span style={{ fontSize: '11px', color: theme.textMuted, transition: 'color 0.3s ease' }}>저축</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>₩200,000</div>
              <div style={{ marginTop: '4px', display: 'inline-block', padding: '3px 8px', borderRadius: '9999px', fontSize: '9px', backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#22d3ee' }}>1건의 저축</div>
              <div style={{ position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: '3px', background: '#06B6D4' }} />
            </div>
          </div>
        </div>
      </section>

      {/* 기능 소개 섹션 */}
      <section id="features" style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>
            모든 것을 <span style={styles.gradientText}>한 곳에서</span>
          </h2>
          <p style={styles.sectionDesc}>
            복잡한 자산 관리를 간단하게. MONEGER와 함께 재정 목표를 달성하세요.
          </p>

          <div style={styles.featureGrid} className="feature-grid">
            {features.map((feature, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.featureCard,
                  borderColor: activeFeature === idx ? theme.borderLight : theme.border,
                  boxShadow: activeFeature === idx ? `0 20px 40px ${feature.underlineColor}15` : 'none',
                }}
                onMouseEnter={() => setActiveFeature(idx)}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', backgroundColor: feature.iconBgColor, color: feature.iconColor }}>
                  {feature.icon}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>{feature.prefix}{feature.stat}</div>
                  <div style={{ fontSize: '10px', color: theme.textVeryMuted, transition: 'color 0.3s ease' }}>{feature.statLabel}</div>
                </div>
                <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>{feature.title}</h3>
                <p style={{ fontSize: '12px', color: theme.textMuted, lineHeight: 1.5, transition: 'color 0.3s ease' }}>{feature.description}</p>
                {/* 색상 밑줄 */}
                <div style={{ ...styles.statCardLine, background: `linear-gradient(90deg, ${feature.underlineColor}, ${feature.underlineColor}80)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section style={styles.section}>
        <div style={{ maxWidth: '768px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ ...styles.mainCard, padding: '40px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, rgba(34, 211, 238, 0.05), rgba(168, 85, 247, 0.05), rgba(244, 114, 182, 0.05))' }} />

            <div style={{ position: 'relative', zIndex: 10 }}>
              <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', borderRadius: '16px', background: 'linear-gradient(to bottom, #2dd4bf, #22d3ee, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(34, 211, 238, 0.25)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '20px' }}>M</span>
                </div>
              </div>

              <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>지금 바로 시작하세요</h2>
              <p style={{ color: theme.textMuted, marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px', transition: 'color 0.3s ease' }}>
                간단한 회원가입 후 모든 기능을 무료로 이용하세요.
              </p>

              <Link href="/login" style={{ ...styles.primaryButton, display: 'inline-flex' }}>
                시작하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(to bottom, #2dd4bf, #22d3ee, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '10px' }}>M</span>
              </div>
            </div>
            <span style={{ fontWeight: 600 }}>MONEGER</span>
          </div>

          <div style={{ fontSize: '14px', color: theme.textVeryMuted, transition: 'color 0.3s ease' }}>
            © 2026 MONEGER. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
