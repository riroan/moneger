'use client';

import { useState, memo, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatNumber } from '@/utils/formatters';
import { CurrencyDisplay } from '@/components/transactions/TransactionItem';
import { getIconComponent } from '@/components/settings/constants';

interface CategoryData {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  count: number;
  budget?: number;
  budgetUsagePercent?: number;
}

interface CategoryChartProps {
  categories: CategoryData[];
  totalExpense: number;
  isLoading: boolean;
  onCategoryClick: (categoryId: string) => void;
}

const DEFAULT_COLOR = '#6B7280';

function CategoryChart({
  categories,
  totalExpense,
  isLoading,
  onCategoryClick,
}: CategoryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="text-center text-text-muted py-8">
        로딩 중...
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center text-text-muted py-8">
        이번 달 지출 내역이 없습니다
      </div>
    );
  }

  // chartData 메모이제이션
  const chartData = useMemo(() =>
    categories.map((category, index) => ({
      name: category.name,
      value: category.amount,
      color: category.color || DEFAULT_COLOR,
      index,
    })),
    [categories]
  );

  // 아이콘 컴포넌트 맵 메모이제이션
  const iconMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getIconComponent>>();
    categories.forEach((cat) => {
      map.set(cat.id, getIconComponent(cat.icon));
    });
    return map;
  }, [categories]);

  return (
    <>
      {/* Donut Chart */}
      <div
        className="flex justify-center items-center relative"
        style={{ marginBottom: '24px', height: '200px' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart style={{ outline: 'none' }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={hoveredIndex !== null ? 47 : 50}
              outerRadius={80}
              paddingAngle={1}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={hoveredIndex === null || hoveredIndex === index ? 0.9 : 0.4}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
          {hoveredIndex !== null ? (
            <>
              <div className="font-bold text-text-primary text-sm sm:text-base">
                {formatNumber(categories[hoveredIndex].amount)}
              </div>
              <div className="text-[10px] sm:text-xs text-text-muted" style={{ marginTop: '2px' }}>
                {categories[hoveredIndex].name}
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-text-primary text-sm sm:text-base">
                {formatNumber(totalExpense)}
              </div>
              <div className="text-[10px] sm:text-xs text-text-muted" style={{ marginTop: '2px' }}>
                총 지출
              </div>
            </>
          )}
        </div>
      </div>

      {/* Category List */}
      <div className="flex flex-col" style={{ gap: '8px' }}>
        {categories.map((category, index) => {
          const usagePercent = category.budgetUsagePercent ?? 0;
          const isHovered = hoveredIndex === index;
          const IconComponent = iconMap.get(category.id) || getIconComponent(null);
          const categoryColor = category.color || DEFAULT_COLOR;

          return (
            <div
              key={category.id}
              className={`bg-bg-secondary rounded-[12px] sm:rounded-[14px] cursor-pointer transition-all ${
                isHovered ? 'bg-bg-card-hover translate-x-1 ring-2 ring-offset-2 ring-offset-bg-card' : 'hover:bg-bg-card-hover hover:translate-x-1'
              }`}
              style={{
                padding: '12px',
                ...(isHovered && {
                  boxShadow: `0 0 0 2px var(--bg-card), 0 0 0 4px ${categoryColor}40`
                })
              }}
              onClick={() => onCategoryClick(category.id)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center">
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-xl transition-transform ${isHovered ? 'scale-110' : ''}`}
                  style={{ marginRight: '12px', backgroundColor: `${categoryColor}20`, color: categoryColor }}
                >
                  <IconComponent />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm sm:text-[15px] font-medium truncate" style={{ marginBottom: '2px' }}>
                    {category.name}
                  </div>
                  <div className="text-xs sm:text-[13px] text-text-muted">{category.count}건</div>
                </div>
                <div className="text-right">
                  <div className="text-sm sm:text-base font-semibold">
                    <CurrencyDisplay amount={`₩${formatNumber(category.amount)}`} />
                  </div>
                  {category.budget !== undefined && category.budget > 0 && (
                    <div className="text-[10px] sm:text-xs text-text-muted">
                      / <span style={{ marginRight: '1px' }}>₩</span>{formatNumber(category.budget)}{' '}
                      <span
                        className="font-medium"
                        style={{
                          color: usagePercent >= 90
                            ? 'var(--accent-coral)'
                            : usagePercent >= 66
                            ? 'var(--accent-yellow)'
                            : 'var(--accent-mint)'
                        }}
                      >
                        ({usagePercent}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Budget Progress Bar */}
              {category.budget !== undefined && category.budget > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div
                    className="w-full h-2 bg-bg-card rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        usagePercent >= 90
                          ? 'bg-accent-coral'
                          : usagePercent >= 66
                          ? 'bg-accent-yellow'
                          : 'bg-accent-mint'
                      }`}
                      style={{ width: `${Math.max(Math.min(usagePercent, 100), category.amount > 0 ? 1 : 0)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default memo(CategoryChart);
