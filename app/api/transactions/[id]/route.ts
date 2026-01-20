import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

// 일별 스냅샷 업데이트 함수
async function updateDailyBalance(userId: string, date: Date) {
  try {
    // 해당 날짜의 자정으로 설정
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // 해당 날짜까지의 모든 거래 조회
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          lte: targetDate,
        },
        deletedAt: null,
      },
    });

    // 해당 날짜의 거래만 조회
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dayTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: targetDate,
          lte: endOfDay,
        },
        deletedAt: null,
      },
    });

    // 누적 잔액 계산
    let balance = 0;
    allTransactions.forEach((tx) => {
      if (tx.type === 'INCOME') {
        balance += tx.amount;
      } else {
        balance -= tx.amount;
      }
    });

    // 해당 일의 수입/지출 계산
    let dailyIncome = 0;
    let dailyExpense = 0;
    dayTransactions.forEach((tx) => {
      if (tx.type === 'INCOME') {
        dailyIncome += tx.amount;
      } else {
        dailyExpense += tx.amount;
      }
    });

    // DailyBalance 업데이트 또는 생성
    await prisma.dailyBalance.upsert({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
      update: {
        balance,
        income: dailyIncome,
        expense: dailyExpense,
      },
      create: {
        userId,
        date: targetDate,
        balance,
        income: dailyIncome,
        expense: dailyExpense,
      },
    });

    console.log(`Daily balance updated for ${targetDate.toISOString().split('T')[0]}: balance=${balance}`);
  } catch (error) {
    console.error('Failed to update daily balance:', error);
  }
}

// PATCH /api/transactions/[id] - 거래 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, type, amount, description, categoryId, date } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 거래가 존재하는지 확인
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // 업데이트할 데이터 구성
    const updateData: any = {};

    if (type !== undefined) {
      if (type !== 'INCOME' && type !== 'EXPENSE') {
        return NextResponse.json(
          { error: 'type must be INCOME or EXPENSE' },
          { status: 400 }
        );
      }
      updateData.type = type;
    }

    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { error: 'amount must be greater than 0' },
          { status: 400 }
        );
      }
      updateData.amount = parseFloat(amount);
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (date !== undefined) {
      updateData.date = new Date(date);
    }

    // 카테고리 업데이트
    if (categoryId !== undefined) {
      if (categoryId === null) {
        updateData.categoryId = null;
      } else {
        // 카테고리가 존재하고 타입이 일치하는지 확인
        const targetType = type || existingTransaction.type;
        const category = await prisma.category.findFirst({
          where: {
            id: categoryId,
            userId,
            type: targetType,
            deletedAt: null,
          },
        });

        if (!category) {
          return NextResponse.json(
            { error: 'Invalid category or category type mismatch' },
            { status: 400 }
          );
        }

        updateData.categoryId = categoryId;
      }
    }

    // 트랜잭션으로 거래 업데이트와 일별 잔액 업데이트를 원자적으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 거래 업데이트
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
              icon: true,
            },
          },
        },
      });

      // 일별 잔액 업데이트 헬퍼 함수 (트랜잭션 내부용)
      const updateDailyBalanceInTx = async (targetUserId: string, targetDateInput: Date) => {
        const targetDate = new Date(targetDateInput);
        targetDate.setHours(0, 0, 0, 0);

        // 해당 날짜까지의 모든 거래 조회
        const allTransactions = await tx.transaction.findMany({
          where: {
            userId: targetUserId,
            date: {
              lte: targetDate,
            },
            deletedAt: null,
          },
        });

        // 해당 날짜의 거래만 조회
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const dayTransactions = await tx.transaction.findMany({
          where: {
            userId: targetUserId,
            date: {
              gte: targetDate,
              lte: endOfDay,
            },
            deletedAt: null,
          },
        });

        // 누적 잔액 계산
        let balance = 0;
        allTransactions.forEach((t) => {
          if (t.type === 'INCOME') {
            balance += t.amount;
          } else {
            balance -= t.amount;
          }
        });

        // 해당 일의 수입/지출 계산
        let dailyIncome = 0;
        let dailyExpense = 0;
        dayTransactions.forEach((t) => {
          if (t.type === 'INCOME') {
            dailyIncome += t.amount;
          } else {
            dailyExpense += t.amount;
          }
        });

        // DailyBalance 업데이트 또는 생성
        await tx.dailyBalance.upsert({
          where: {
            userId_date: {
              userId: targetUserId,
              date: targetDate,
            },
          },
          update: {
            balance,
            income: dailyIncome,
            expense: dailyExpense,
          },
          create: {
            userId: targetUserId,
            date: targetDate,
            balance,
            income: dailyIncome,
            expense: dailyExpense,
          },
        });
      };

      // 일별 스냅샷 업데이트 (기존 날짜와 새 날짜 모두)
      await updateDailyBalanceInTx(userId, existingTransaction.date);
      if (date && new Date(date).toDateString() !== existingTransaction.date.toDateString()) {
        await updateDailyBalanceInTx(userId, new Date(date));
      }

      return updatedTransaction;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Transaction updated successfully',
    });
  } catch (error) {
    console.error('Failed to update transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id] - 거래 삭제 (Soft Delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 거래가 존재하는지 확인
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // 트랜잭션으로 거래 삭제와 일별 잔액 업데이트를 원자적으로 처리
    await prisma.$transaction(async (tx) => {
      // Soft Delete - deletedAt 필드에 현재 시간 설정
      await tx.transaction.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      // 일별 잔액 업데이트
      const targetDate = new Date(existingTransaction.date);
      targetDate.setHours(0, 0, 0, 0);

      // 해당 날짜까지의 모든 거래 조회
      const allTransactions = await tx.transaction.findMany({
        where: {
          userId,
          date: {
            lte: targetDate,
          },
          deletedAt: null,
        },
      });

      // 해당 날짜의 거래만 조회
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const dayTransactions = await tx.transaction.findMany({
        where: {
          userId,
          date: {
            gte: targetDate,
            lte: endOfDay,
          },
          deletedAt: null,
        },
      });

      // 누적 잔액 계산
      let balance = 0;
      allTransactions.forEach((t) => {
        if (t.type === 'INCOME') {
          balance += t.amount;
        } else {
          balance -= t.amount;
        }
      });

      // 해당 일의 수입/지출 계산
      let dailyIncome = 0;
      let dailyExpense = 0;
      dayTransactions.forEach((t) => {
        if (t.type === 'INCOME') {
          dailyIncome += t.amount;
        } else {
          dailyExpense += t.amount;
        }
      });

      // DailyBalance 업데이트 또는 생성
      await tx.dailyBalance.upsert({
        where: {
          userId_date: {
            userId,
            date: targetDate,
          },
        },
        update: {
          balance,
          income: dailyIncome,
          expense: dailyExpense,
        },
        create: {
          userId,
          date: targetDate,
          balance,
          income: dailyIncome,
          expense: dailyExpense,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
