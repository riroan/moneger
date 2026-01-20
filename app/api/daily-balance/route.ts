import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/daily-balance - 일별 잔액 스냅샷 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, date, balance, income, expense } = body;

    // 유효성 검사
    if (!userId || !date) {
      return NextResponse.json(
        { error: 'userId and date are required' },
        { status: 400 }
      );
    }

    // 해당 날짜의 기존 스냅샷이 있는지 확인
    const existingSnapshot = await prisma.dailyBalance.findUnique({
      where: {
        userId_date: {
          userId,
          date: new Date(date),
        },
      },
    });

    let dailyBalance;

    if (existingSnapshot) {
      // 기존 스냅샷 업데이트
      dailyBalance = await prisma.dailyBalance.update({
        where: {
          userId_date: {
            userId,
            date: new Date(date),
          },
        },
        data: {
          balance: balance ?? 0,
          income: income ?? 0,
          expense: expense ?? 0,
        },
      });
    } else {
      // 새 스냅샷 생성
      dailyBalance = await prisma.dailyBalance.create({
        data: {
          userId,
          date: new Date(date),
          balance: balance ?? 0,
          income: income ?? 0,
          expense: expense ?? 0,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: dailyBalance,
        message: '일별 잔액이 저장되었습니다',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Daily balance save failed:', error);
    return NextResponse.json(
      { error: '일별 잔액 저장 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// GET /api/daily-balance?userId=xxx&days=5 - 최근 N일 잔액 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '5', 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 최근 N일 데이터 조회
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const dailyBalances = await prisma.dailyBalance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // 데이터가 없으면 현재 거래 데이터로부터 계산
    if (dailyBalances.length === 0) {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      // 최근 N일간의 거래 데이터 조회
      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          deletedAt: null,
        },
        orderBy: {
          date: 'asc',
        },
      });

      // 일별로 그룹화하여 계산
      const dailyData: { [key: string]: { income: number; expense: number; balance: number } } = {};

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        dailyData[dateKey] = { income: 0, expense: 0, balance: 0 };
      }

      // 거래 데이터로부터 일별 수입/지출 계산
      transactions.forEach((transaction) => {
        const dateKey = new Date(transaction.date).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          if (transaction.type === 'INCOME') {
            dailyData[dateKey].income += transaction.amount;
          } else {
            dailyData[dateKey].expense += transaction.amount;
          }
        }
      });

      // 누적 잔액 계산
      let cumulativeBalance = 0;
      const result = Object.keys(dailyData)
        .sort()
        .map((dateKey) => {
          const { income, expense } = dailyData[dateKey];
          cumulativeBalance += income - expense;
          return {
            date: new Date(dateKey),
            balance: cumulativeBalance,
            income,
            expense,
          };
        });

      return NextResponse.json(
        {
          success: true,
          data: result,
          message: '거래 데이터로부터 계산된 잔액입니다',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: dailyBalances,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Daily balance fetch failed:', error);
    return NextResponse.json(
      { error: '일별 잔액 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
