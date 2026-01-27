import { GET } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('데이터베이스 연결이 성공하면 ok 상태를 반환해야 함', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.message).toBe('Server is running');
    expect(data.database).toBe('connected');
    expect(data.timestamp).toBeDefined();
  });

  it('데이터베이스 연결 실패 시 503 에러를 반환해야 함', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('error');
    expect(data.message).toBe('Server is running but database connection failed');
    expect(data.database).toBe('disconnected');
    expect(data.error).toBe('Connection failed');
  });
});
