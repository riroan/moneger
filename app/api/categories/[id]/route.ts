import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

// PATCH /api/categories/[id] - 카테고리 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, name, type, color, icon } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 카테고리 존재 여부 확인
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // 업데이트할 데이터 구성
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      updateData.type = type;
    }
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    // 이름과 타입이 변경되는 경우 중복 확인
    if (name && type) {
      const duplicate = await prisma.category.findFirst({
        where: {
          id: { not: id },
          userId,
          name,
          type,
          deletedAt: null,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: '이미 존재하는 카테고리입니다' },
          { status: 409 }
        );
      }
    }

    // 카테고리 업데이트
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Failed to update category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - 카테고리 삭제 (soft delete)
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

    // 카테고리 존재 여부 확인
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
