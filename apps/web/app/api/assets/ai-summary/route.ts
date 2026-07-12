import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authenticatedHandler } from '@/lib/auth-handler';
import { prisma } from '@/lib/prisma';
import { hasFeature } from '@/lib/entitlements';
import {
  buildAiFacts,
  buildMessages,
  sanitize,
  templateSummary,
  type AiSummarySource,
} from '@/lib/services/ai-summary';
import { getMonthlyAssetReport } from '@/lib/services/monthly-asset.service';
import { parseMonthKey } from '@/lib/utils/asset-month';

export const maxDuration = 15;

const REPORT_RANGE_MONTHS = 2;

function noStoreJson<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function successNoStore<T>(data: T, status = 200): NextResponse {
  return noStoreJson({ success: true, data }, status);
}

function errorNoStore(error: string, status = 400): NextResponse {
  return noStoreJson({ error }, status);
}

function serializeSummary(row: { text: string; generatedAt: Date; source: string }) {
  return {
    text: row.text,
    generatedAt: row.generatedAt.toISOString(),
    source: row.source as AiSummarySource,
  };
}

export const GET = authenticatedHandler('fetch asset AI summary', async (request, { userId }) => {
  const month = request.nextUrl.searchParams.get('month');

  if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
    return errorNoStore('month must be YYYY-MM', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });
  if (!user) {
    return errorNoStore('User not found', 404);
  }
  if (!hasFeature(user, 'AI_SUMMARY')) {
    return errorNoStore('feature_not_entitled', 403);
  }

  const monthKey = parseMonthKey(month);
  if (Number.isNaN(monthKey.getTime())) {
    return errorNoStore('invalid month', 400);
  }

  const cached = await prisma.assetAiSummary.findUnique({
    where: { userId_month: { userId, month: monthKey } },
  });

  return successNoStore(cached ? serializeSummary(cached) : null);
});

export const POST = authenticatedHandler('generate asset AI summary', async (request, { userId }) => {
  const body = await request.json();
  const { month, regenerate = false } = body ?? {};

  if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
    return errorNoStore('month must be YYYY-MM', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });
  if (!user) {
    return errorNoStore('User not found', 404);
  }
  if (!hasFeature(user, 'AI_SUMMARY')) {
    return errorNoStore('feature_not_entitled', 403);
  }
  if (!process.env.OPENAI_API_KEY) {
    return errorNoStore('ai_unavailable', 503);
  }

  const monthKey = parseMonthKey(month);
  if (Number.isNaN(monthKey.getTime())) {
    return errorNoStore('invalid month', 400);
  }

  if (!regenerate) {
    const cached = await prisma.assetAiSummary.findUnique({
      where: { userId_month: { userId, month: monthKey } },
    });
    if (cached) {
      return successNoStore(serializeSummary(cached));
    }
  }

  const report = await getMonthlyAssetReport(userId, monthKey, REPORT_RANGE_MONTHS, { detail: 'summary' });
  const facts = buildAiFacts(report);
  const messages = buildMessages(facts);
  let text = templateSummary(facts);
  let source: AiSummarySource = 'template';

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 10_000 });
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages,
      temperature: 0.4,
    });
    const candidate = completion.choices[0]?.message?.content ?? '';
    const sanitized = sanitize(candidate);
    if (sanitized.ok) {
      text = sanitized.text;
      source = 'ai';
    }
  } catch {
    text = templateSummary(facts);
    source = 'template';
  }

  const generatedAt = new Date();
  const row = await prisma.assetAiSummary.upsert({
    where: { userId_month: { userId, month: monthKey } },
    update: { text, source, generatedAt },
    create: { userId, month: monthKey, text, source, generatedAt },
  });

  return successNoStore(serializeSummary(row));
});
