import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

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

    // 거래 업데이트
    const updatedTransaction = await prisma.transaction.update({
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

    return NextResponse.json({
      success: true,
      data: updatedTransaction,
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
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

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

    // Soft Delete - deletedAt 필드에 현재 시간 설정
    await prisma.transaction.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
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
