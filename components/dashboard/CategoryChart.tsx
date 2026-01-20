'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatNumber } from '@/utils/formatters';
import { CurrencyDisplay } from '@/components/transactions/TransactionItem';

interface CategoryData {
  id: string;
  name: string;
  icon: string | null;
  amount: number;
  count: number;
  colorIndex: number;
}

interface CategoryChartProps {
  categories: CategoryData[];
  totalExpense: number;
  isLoading: boolean;
  onCategoryClick: (categoryId: string) => void;
}

const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#FBBF24', '#A855F7', '#F472B6'];
const BG_COLORS = [
  'bg-[var(--glow-mint)]',
  'bg-[var(--glow-coral)]',
  'bg-[var(--glow-blue)]',
  'bg-[rgba(251,191,36,0.15)]',
  'bg-[var(--glow-purple)]',
  'bg-[rgba(244,114,182,0.15)]',
];

export default function CategoryChart({
  categories,
  totalExpense,
  isLoading,
  onCategoryClick,
}: CategoryChartProps) {
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

  return (
    <>
      {/* Donut Chart */}
      <div
        className="flex justify-center items-center relative"
        style={{ marginBottom: '24px', height: '200px', pointerEvents: 'none' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart style={{ outline: 'none' }}>
            <Pie
              data={categories.map((category) => ({
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
              {categories.map((category, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[category.colorIndex % COLORS.length]}
                  opacity={0.9}
                />
              ))}
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
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center bg-bg-secondary rounded-[12px] sm:rounded-[14px] cursor-pointer transition-all hover:bg-bg-card-hover hover:translate-x-1"
            style={{ padding: '12px' }}
            onClick={() => onCategoryClick(category.id)}
          >
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-xl ${BG_COLORS[category.colorIndex % BG_COLORS.length]}`}
              style={{ marginRight: '12px' }}
            >
              {category.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm sm:text-[15px] font-medium truncate" style={{ marginBottom: '2px' }}>
                {category.name}
              </div>
              <div className="text-xs sm:text-[13px] text-text-muted">{category.count}건</div>
            </div>
            <div className="font-mono text-sm sm:text-base font-semibold">
              <CurrencyDisplay amount={`₩${formatNumber(category.amount)}`} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
