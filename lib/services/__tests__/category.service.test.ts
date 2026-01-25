import { prisma } from '@/lib/prisma';
import {
  getCategories,
  findCategory,
  findDuplicateCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../category.service';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('category.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    const mockCategories = [
      { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️', userId: 'user-1' },
      { id: 'cat-2', name: '교통비', type: 'EXPENSE', color: '#3B82F6', icon: '🚗', userId: 'user-1' },
    ];

    it('사용자의 모든 카테고리를 조회해야 함', async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const result = await getCategories('user-1');

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockCategories);
    });

    it('타입으로 필터링하여 카테고리를 조회해야 함', async () => {
      const expenseCategories = mockCategories.filter((c) => c.type === 'EXPENSE');
      (prisma.category.findMany as jest.Mock).mockResolvedValue(expenseCategories);

      const result = await getCategories('user-1', 'EXPENSE');

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null, type: 'EXPENSE' },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(expenseCategories);
    });

    it('빈 배열을 반환할 수 있음', async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getCategories('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('findCategory', () => {
    const mockCategory = {
      id: 'cat-1',
      name: '식비',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: '🍽️',
      userId: 'user-1',
    };

    it('카테고리를 찾아야 함', async () => {
      (prisma.category.findFirst as jest.Mock).mockResolvedValue(mockCategory);

      const result = await findCategory('cat-1', 'user-1');

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-1', userId: 'user-1', deletedAt: null },
      });
      expect(result).toEqual(mockCategory);
    });

    it('존재하지 않는 카테고리는 null을 반환해야 함', async () => {
      (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await findCategory('invalid-id', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('findDuplicateCategory', () => {
    it('중복 카테고리를 찾아야 함', async () => {
      const mockCategory = { id: 'cat-1', name: '식비', type: 'EXPENSE', userId: 'user-1' };
      (prisma.category.findFirst as jest.Mock).mockResolvedValue(mockCategory);

      const result = await findDuplicateCategory('user-1', '식비', 'EXPENSE');

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', name: '식비', type: 'EXPENSE', deletedAt: null },
      });
      expect(result).toEqual(mockCategory);
    });

    it('수정 시 자기 자신을 제외하고 중복 검사해야 함', async () => {
      (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);

      await findDuplicateCategory('user-1', '식비', 'EXPENSE', 'cat-1');

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', name: '식비', type: 'EXPENSE', deletedAt: null, id: { not: 'cat-1' } },
      });
    });
  });

  describe('createCategory', () => {
    it('카테고리를 생성해야 함', async () => {
      const mockCreated = {
        id: 'cat-new',
        name: '새 카테고리',
        type: 'EXPENSE',
        color: '#6366F1',
        icon: '💰',
        userId: 'user-1',
        defaultBudget: 100000,
      };
      (prisma.category.create as jest.Mock).mockResolvedValue(mockCreated);

      const result = await createCategory({
        userId: 'user-1',
        name: '새 카테고리',
        type: 'EXPENSE',
        defaultBudget: 100000,
      });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: '새 카테고리',
          type: 'EXPENSE',
          color: '#6366F1',
          icon: '💰',
          defaultBudget: 100000,
        },
      });
      expect(result).toEqual(mockCreated);
    });

    it('INCOME 타입은 defaultBudget을 null로 설정해야 함', async () => {
      const mockCreated = {
        id: 'cat-new',
        name: '급여',
        type: 'INCOME',
        color: '#10B981',
        icon: '💵',
        userId: 'user-1',
        defaultBudget: null,
      };
      (prisma.category.create as jest.Mock).mockResolvedValue(mockCreated);

      await createCategory({
        userId: 'user-1',
        name: '급여',
        type: 'INCOME',
        color: '#10B981',
        icon: '💵',
        defaultBudget: 100000, // INCOME이므로 무시됨
      });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: '급여',
          type: 'INCOME',
          color: '#10B981',
          icon: '💵',
          defaultBudget: null,
        },
      });
    });

    it('기본 색상과 아이콘을 사용해야 함', async () => {
      (prisma.category.create as jest.Mock).mockResolvedValue({});

      await createCategory({
        userId: 'user-1',
        name: '테스트',
        type: 'EXPENSE',
      });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          color: '#6366F1',
          icon: '💰',
        }),
      });
    });
  });

  describe('updateCategory', () => {
    it('카테고리를 수정해야 함', async () => {
      const mockUpdated = { id: 'cat-1', name: '수정된 이름', type: 'EXPENSE' };
      (prisma.category.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await updateCategory('cat-1', { name: '수정된 이름' });

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { name: '수정된 이름' },
      });
      expect(result).toEqual(mockUpdated);
    });

    it('여러 필드를 동시에 수정해야 함', async () => {
      (prisma.category.update as jest.Mock).mockResolvedValue({});

      await updateCategory('cat-1', {
        name: '새 이름',
        color: '#FF0000',
        icon: '🎉',
        defaultBudget: 50000,
      });

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: {
          name: '새 이름',
          color: '#FF0000',
          icon: '🎉',
          defaultBudget: 50000,
        },
      });
    });

    it('undefined 필드는 업데이트하지 않아야 함', async () => {
      (prisma.category.update as jest.Mock).mockResolvedValue({});

      await updateCategory('cat-1', { name: '이름만' });

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { name: '이름만' },
      });
    });
  });

  describe('deleteCategory', () => {
    it('카테고리를 소프트 삭제해야 함', async () => {
      const now = new Date();
      jest.useFakeTimers().setSystemTime(now);

      (prisma.category.update as jest.Mock).mockResolvedValue({ id: 'cat-1', deletedAt: now });

      const result = await deleteCategory('cat-1');

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { deletedAt: now },
      });
      expect(result.deletedAt).toEqual(now);

      jest.useRealTimers();
    });
  });
});
