import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { apiHandler } from '@/lib/api-utils';
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

const REPORT_RANGE_MONTHS = 6;

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

export const POST = apiHandler('generate asset AI summary', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, month, regenerate = false } = body ?? {};

  if (!userId || typeof userId !== 'string') {
    return errorNoStore('userId is required', 400);
  }
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
      return successNoStore({
        text: cached.text,
        generatedAt: cached.generatedAt.toISOString(),
        source: cached.source as AiSummarySource,
      });
    }
  }

  const report = await getMonthlyAssetReport(userId, monthKey, REPORT_RANGE_MONTHS);
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

  return successNoStore({
    text: row.text,
    generatedAt: row.generatedAt.toISOString(),
    source: row.source as AiSummarySource,
  });
});
