import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 데이터베이스 연결 테스트
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      message: 'Server is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: 'Server is running but database connection failed',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
