'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency } from '@moneger/shared';

interface InvestmentsTabProps {
  userId: string;
}

interface Position {
  symbol: string;
  name: string;
  market: string | null;
  currency: string;
  quantity: string;
  marketValueKrw: string;
  unrealizedPnl: string | null;
}
interface Account {
  id: string;
  displayName: string;
  accountType: string;
  asOf: string | null;
  cashKrw: string | null;
  totalEquityKrw: string | null;
  positionsValueKrw: string | null;
  positions: Position[];
}
interface Connection {
  id: string;
  broker: string;
  label: string | null;
  status: string;
  failureReason: string | null;
  accounts: Account[];
}
interface Overview {
  totalEquityKrw: string;
  connections: Connection[];
}

const CARD = 'bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4';
const MUTED_BTN =
  'text-xs text-text-muted hover:text-text-secondary bg-bg-secondary hover:bg-bg-card-hover rounded-lg transition-colors py-1.5 px-2.5';

// 손익 색: 한국 증시 관습 — 이익=빨강(coral)·손실=파랑(blue). 색만으로 표시하지 않고 ▲▼+부호 병행.
function pnlClass(v: number): string {
  return v > 0 ? 'text-accent-coral' : v < 0 ? 'text-accent-blue' : 'text-text-muted';
}
function pnlMark(v: number): string {
  return v > 0 ? '▲' : v < 0 ? '▼' : '·';
}
function signedCurrency(v: number): string {
  const s = formatCurrency(Math.abs(v));
  return v > 0 ? `+${s}` : v < 0 ? `-${s}` : s;
}

export default function InvestmentsTab({ userId }: InvestmentsTabProps) {
  const [data, setData] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchOverview = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/brokerage/overview?userId=${userId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || '불러오기 실패');
      setData(json.data as Overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const handleSync = useCallback(
    async (connectionId: string) => {
      setSyncingId(connectionId);
      try {
        const res = await fetch(`/api/brokerage/connections/${connectionId}/sync`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || '동기화 실패');
        }
        await fetchOverview();
      } catch (e) {
        setError(e instanceof Error ? e.message : '동기화 실패');
      } finally {
        setSyncingId(null);
      }
    },
    [userId, fetchOverview]
  );

  const handleDelete = useCallback(
    async (connectionId: string) => {
      if (!confirm('이 증권사 연결을 삭제할까요? 자격증명은 즉시 삭제되고 과거 스냅샷은 보존됩니다.')) {
        return;
      }
      await fetch(`/api/brokerage/connections/${connectionId}?userId=${userId}`, {
        method: 'DELETE',
      });
      await fetchOverview();
    },
    [userId, fetchOverview]
  );

  if (isLoading) {
    return <div className="text-text-muted text-sm py-8 text-center">불러오는 중...</div>;
  }

  const hasConnections = (data?.connections.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4 animate-[fadeIn_0.5s_ease-out]">
      {/* 총 평가액 히어로 */}
      <section className={CARD}>
        <header className="flex items-center justify-between mb-2">
          <h1 className="text-base sm:text-lg font-semibold flex items-center gap-2">증권 자산</h1>
          <button className={MUTED_BTN} onClick={() => setIsAddOpen((v) => !v)}>
            {isAddOpen ? '닫기' : '증권사 연결 추가'}
          </button>
        </header>
        <div className="text-text-muted text-xs">총 평가액</div>
        <div className="font-mono tabular-nums text-text-primary text-2xl sm:text-3xl mt-0.5">
          {formatCurrency(Number(data?.totalEquityKrw ?? 0))}
        </div>
        {error && <div className="mt-2 text-xs text-accent-coral">{error}</div>}
      </section>

      {isAddOpen && (
        <AddConnectionForm
          userId={userId}
          onDone={async () => {
            setIsAddOpen(false);
            await fetchOverview();
          }}
        />
      )}

      {/* 빈 상태 */}
      {!hasConnections && !isAddOpen && (
        <section className={`${CARD} text-center py-10`}>
          <div className="text-text-secondary text-sm">아직 연결된 증권사가 없습니다.</div>
          <div className="text-text-muted text-xs mt-1">
            한국투자증권 계좌를 연결하면 잔고와 보유 종목을 한 화면에서 볼 수 있어요.
          </div>
          <button
            className="mt-4 bg-accent-blue/20 text-accent-blue font-medium rounded-lg px-3 py-2 text-sm"
            onClick={() => setIsAddOpen(true)}
          >
            증권사 연결하기
          </button>
        </section>
      )}

      {/* 연결별 카드 */}
      {data?.connections.map((conn) => (
        <section key={conn.id} className={CARD}>
          <header className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-base font-semibold flex items-center gap-2">
              {conn.broker === 'KIS' ? '한국투자증권' : conn.broker}
              {conn.label && <span className="text-text-muted text-xs">{conn.label}</span>}
              {conn.status === 'ERROR' && (
                <span className="bg-accent-coral/15 text-accent-coral text-[11px] rounded-lg px-2 py-0.5">
                  연결 오류
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button
                className={MUTED_BTN}
                disabled={syncingId === conn.id}
                onClick={() => handleSync(conn.id)}
              >
                {syncingId === conn.id ? '동기화 중...' : '지금 동기화'}
              </button>
              <button className={MUTED_BTN} onClick={() => handleDelete(conn.id)}>
                삭제
              </button>
            </div>
          </header>

          {conn.status === 'ERROR' && (
            <div className="mb-3 text-xs text-accent-coral">
              마지막 동기화 실패{conn.failureReason ? ` (${conn.failureReason})` : ''}. 자격증명을 확인하세요.
            </div>
          )}

          {conn.accounts.length === 0 && (
            <div className="text-text-muted text-sm py-2">
              아직 동기화 전입니다. &quot;지금 동기화&quot;를 눌러 잔고를 불러오세요.
            </div>
          )}

          {conn.accounts.map((acct) => (
            <AccountBlock key={acct.id} account={acct} />
          ))}
        </section>
      ))}
    </div>
  );
}

function AccountBlock({ account }: { account: Account }) {
  return (
    <div className="border-t border-[var(--border)] pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-text-secondary text-sm">{account.displayName}</div>
          {account.asOf && (
            <div className="text-text-muted text-[11px]">
              기준 {new Date(account.asOf).toLocaleString('ko-KR')}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-text-muted text-[11px]">평가액</div>
          <div className="font-mono tabular-nums text-text-primary text-lg">
            {formatCurrency(Number(account.totalEquityKrw ?? 0))}
          </div>
          <div className="text-text-muted text-[11px] font-mono tabular-nums">
            현금 {formatCurrency(Number(account.cashKrw ?? 0))}
          </div>
        </div>
      </div>

      {account.positions.length === 0 ? (
        <div className="text-text-muted text-xs py-2">보유 종목 없음</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-xs text-left">
                <th className="font-normal py-1">종목</th>
                <th className="font-normal py-1 text-right">수량</th>
                <th className="font-normal py-1 text-right">평가액</th>
                <th className="font-normal py-1 text-right">평가손익</th>
              </tr>
            </thead>
            <tbody>
              {account.positions.map((p) => {
                const pnl = Number(p.unrealizedPnl ?? 0);
                return (
                  <tr key={p.symbol} className="border-t border-[var(--border)]">
                    <td className="py-1.5">
                      <div className="text-text-primary">{p.name}</div>
                      <div className="text-text-muted text-[11px]">
                        {p.symbol}
                        {p.market ? ` · ${p.market}` : ''}
                      </div>
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums text-text-secondary">
                      {p.quantity}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums text-text-primary">
                      {formatCurrency(Number(p.marketValueKrw))}
                    </td>
                    <td className={`py-1.5 text-right font-mono tabular-nums ${pnlClass(pnl)}`}>
                      {p.unrealizedPnl == null ? '-' : `${pnlMark(pnl)} ${signedCurrency(pnl)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddConnectionForm({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void | Promise<void>;
}) {
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [label, setLabel] = useState('');
  const [paper, setPaper] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const credentials = { appKey, appSecret, accountNo, paper };
  const filled = appKey && appSecret && accountNo;

  const inputCls =
    'w-full bg-bg-secondary border border-[var(--border)] rounded-lg px-3 py-2 text-base text-text-primary placeholder:text-text-muted';

  const test = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/brokerage/connections/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, broker: 'KIS', credentials }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || '연결 테스트 실패');
      setMsg({ kind: 'ok', text: '연결 성공' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '연결 테스트 실패' });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/brokerage/connections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, broker: 'KIS', label: label || null, credentials }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || '저장 실패');
      await onDone();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '저장 실패' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={CARD}>
      <h2 className="text-base font-semibold mb-1">한국투자증권 연결</h2>
      <p className="text-text-muted text-xs mb-3">
        KIS Developers에서 발급한 appkey/appsecret과 계좌번호를 입력하세요. 자격증명은 암호화되어
        저장되고 서버에서만 사용되며, 평문은 저장/전송되지 않습니다.
      </p>
      <div className="flex flex-col gap-2">
        <input
          className={inputCls}
          placeholder="appkey"
          value={appKey}
          onChange={(e) => setAppKey(e.target.value)}
          autoComplete="off"
        />
        <input
          className={inputCls}
          placeholder="appsecret"
          type="password"
          value={appSecret}
          onChange={(e) => setAppSecret(e.target.value)}
          autoComplete="off"
        />
        <input
          className={inputCls}
          placeholder="계좌번호 (예: 12345678-01)"
          value={accountNo}
          onChange={(e) => setAccountNo(e.target.value)}
          autoComplete="off"
        />
        <input
          className={inputCls}
          placeholder="별칭 (선택)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <label className="flex items-center gap-2 text-text-secondary text-sm">
          <input type="checkbox" checked={paper} onChange={(e) => setPaper(e.target.checked)} />
          모의투자 계좌
        </label>
      </div>
      {msg && (
        <div className={`mt-2 text-xs ${msg.kind === 'ok' ? 'text-accent-mint' : 'text-accent-coral'}`}>
          {msg.text}
        </div>
      )}
      <div className="flex items-center gap-2 mt-3">
        <button className={MUTED_BTN} disabled={busy || !filled} onClick={test}>
          연결 테스트
        </button>
        <button
          className="bg-accent-blue/20 text-accent-blue font-medium rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
          disabled={busy || !filled}
          onClick={save}
        >
          {busy ? '처리 중...' : '저장'}
        </button>
      </div>
    </section>
  );
}
