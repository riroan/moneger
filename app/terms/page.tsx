'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { useTheme } from '@/contexts/ThemeContext';
import { MdDarkMode, MdLightMode } from 'react-icons/md';

export default function TermsPage() {
  const router = useRouter();
  const { userId, userName, userEmail, initAuth } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <div className="noise-overlay" />
      <div className="gradient-orb orb-1" />
      <div className="gradient-orb orb-2" />

      <div className="relative z-10 max-w-[800px] mx-auto p-6 sm:p-10">
        {/* Header */}
        <header className="flex justify-between items-center animate-[fadeInDown_0.6s_ease-out] mb-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo.svg"
              alt="MONEGER"
              width={48}
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] shadow-[0_8px_32px_var(--glow-mint)]"
            />
            <span className="hidden sm:block text-xl sm:text-2xl font-bold bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent tracking-tight">
              MONEGER
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {userId ? (
              <button
                onClick={() => router.push('/')}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent-purple to-accent-coral flex items-center justify-center font-semibold text-sm sm:text-base cursor-pointer transition-transform hover:scale-105"
              >
                {userName ? userName.charAt(0) : (userEmail ? userEmail.charAt(0) : '?')}
              </button>
            ) : (
              <>
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-bg-card border border-[var(--border)] flex items-center justify-center cursor-pointer transition-all hover:bg-bg-card-hover"
                >
                  {theme === 'dark' ? (
                    <MdDarkMode className="text-lg sm:text-xl text-text-secondary" />
                  ) : (
                    <MdLightMode className="text-lg sm:text-xl text-text-secondary" />
                  )}
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent-mint to-accent-blue text-white text-sm font-semibold cursor-pointer transition-transform hover:scale-105"
                >
                  시작하기
                </button>
              </>
            )}
          </div>
        </header>

        {/* Page Title */}
        <div className="text-center mb-8 animate-[fadeInUp_0.5s_ease-out]">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
            이용약관
          </h1>
          <span className="inline-block px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-sm text-emerald-700">
            시행일: 2026년 1월 26일
          </span>
        </div>

        {/* Intro */}
        <div className="p-6 bg-white rounded-3xl shadow-lg mb-8 text-[15px] text-slate-600 animate-[fadeInUp_0.6s_ease-out]">
          <p>
            본 약관은 MONEGER(이하 &quot;서비스&quot;)의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            서비스 이용을 위해 회원가입을 진행하는 경우 본 약관에 동의한 것으로 봅니다.
          </p>
        </div>

        {/* Section 1 */}
        <Section num={1} title="정의">
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li><strong className="text-text-primary">&quot;서비스&quot;</strong>란 MONEGER가 제공하는 가계부 및 자산관리 관련 모든 서비스를 의미합니다.</li>
            <li><strong className="text-text-primary">&quot;이용자&quot;</strong>란 본 약관에 따라 서비스를 이용하는 회원을 의미합니다.</li>
            <li><strong className="text-text-primary">&quot;회원&quot;</strong>이란 서비스에 가입하여 계정을 생성한 이용자를 의미합니다.</li>
            <li><strong className="text-text-primary">&quot;콘텐츠&quot;</strong>란 이용자가 서비스 내에 입력한 수입, 지출, 예산 등의 모든 정보를 의미합니다.</li>
          </ul>
        </Section>

        {/* Section 2 */}
        <Section num={2} title="약관의 효력 및 변경">
          <p className="text-sm mb-3">
            본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.
          </p>
          <p className="text-sm mb-3">
            서비스는 필요한 경우 관련 법령을 위반하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.
          </p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>약관 변경 시 시행일 7일 전부터 공지합니다.</li>
            <li>이용자에게 불리한 변경의 경우 30일 전부터 공지합니다.</li>
            <li>변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
          </ul>
        </Section>

        {/* Section 3 */}
        <Section num={3} title="회원가입 및 계정">
          <p className="text-sm mb-3">
            회원가입은 이용자가 약관에 동의하고 가입 양식에 따라 정보를 기입한 후 가입 신청을 하면 완료됩니다.
          </p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>이용자는 정확한 정보를 제공해야 하며, 허위 정보 기입 시 서비스 이용이 제한될 수 있습니다.</li>
            <li>계정 정보(이메일, 비밀번호)의 관리 책임은 이용자에게 있습니다.</li>
            <li>계정을 타인에게 양도하거나 공유할 수 없습니다.</li>
          </ul>
        </Section>

        {/* Section 4 */}
        <Section num={4} title="서비스 제공">
          <p className="text-sm mb-3">서비스는 다음과 같은 기능을 제공합니다:</p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>수입 및 지출 내역 기록</li>
            <li>카테고리별 지출 관리</li>
            <li>예산 설정 및 관리</li>
            <li>통계 및 분석 기능</li>
            <li>기타 가계부 관련 부가 서비스</li>
          </ul>
          <p className="text-sm mb-3">
            서비스는 연중무휴 24시간 제공을 원칙으로 하나, 시스템 점검 등의 사유로 일시 중단될 수 있습니다.
          </p>
        </Section>

        {/* Section 5 */}
        <Section num={5} title="서비스 변경 및 중단">
          <p className="text-sm mb-3">
            서비스는 운영상, 기술상의 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.
          </p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>서비스 변경 또는 중단 시 사전에 공지합니다.</li>
            <li>무료로 제공되는 서비스의 변경 또는 중단에 대해 별도의 보상을 하지 않습니다.</li>
          </ul>
        </Section>

        {/* Section 6 */}
        <Section num={6} title="이용자의 의무">
          <p className="text-sm mb-3">이용자는 다음 행위를 하여서는 안 됩니다:</p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>
            <li>서비스의 정상적인 운영을 방해하는 행위</li>
            <li>서비스를 이용하여 법령에 위반되는 행위</li>
            <li>서비스의 정보를 무단으로 수집, 복제, 배포하는 행위</li>
            <li>서비스에 악성코드나 바이러스를 유포하는 행위</li>
            <li>기타 서비스의 건전한 운영을 저해하는 행위</li>
          </ul>
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl my-4 text-[13px] text-red-700">
            위 의무를 위반한 경우, 서비스 이용이 제한되거나 계정이 삭제될 수 있습니다.
          </div>
        </Section>

        {/* Section 7 */}
        <Section num={7} title="콘텐츠의 권리 및 관리">
          <p className="text-sm mb-3">
            이용자가 서비스 내에 입력한 콘텐츠의 저작권은 이용자에게 귀속됩니다.
          </p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>서비스는 이용자의 콘텐츠를 서비스 운영 목적 외에 사용하지 않습니다.</li>
            <li>서비스는 서비스 품질 개선 및 기능 제공을 위해 콘텐츠를 비식별화된 형태로 활용할 수 있습니다.</li>
            <li>회원 탈퇴 시 이용자의 콘텐츠는 즉시 삭제됩니다.</li>
            <li>단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관될 수 있습니다.</li>
          </ul>
        </Section>

        {/* Section 8 */}
        <Section num={8} title="회원 탈퇴">
          <p className="text-sm mb-3">
            이용자는 언제든지 서비스 내 설정을 통해 회원 탈퇴를 요청할 수 있습니다.
          </p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>탈퇴 요청 시 계정 및 모든 데이터는 즉시 삭제됩니다.</li>
            <li>삭제된 데이터는 복구가 불가능합니다.</li>
          </ul>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl my-4 text-[13px] text-amber-700">
            탈퇴 전 필요한 데이터는 반드시 백업해주세요. 삭제된 데이터는 복구할 수 없습니다.
          </div>
        </Section>

        {/* Section 9 */}
        <Section num={9} title="면책조항">
          <p className="text-sm mb-3">서비스는 다음과 같은 경우에 책임을 지지 않습니다:</p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>천재지변, 전쟁, 기간통신사업자의 서비스 중단 등 불가항력으로 인한 서비스 중단</li>
            <li>이용자의 귀책사유로 인한 서비스 이용 장애</li>
            <li>이용자가 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 경우</li>
            <li>이용자가 입력한 정보의 정확성, 신뢰성에 관한 사항</li>
            <li>이용자 간 또는 이용자와 제3자 간의 분쟁</li>
            <li>이용자의 부주의로 인한 계정 정보 유출 및 데이터 손실</li>
          </ul>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl my-4 text-[13px] text-amber-700">
            서비스는 금융 자문을 제공하지 않습니다. 서비스에서 제공하는 정보는 참고용이며, 재무적 결정은 이용자 본인의 판단과 책임 하에 이루어져야 합니다.
          </div>
        </Section>

        {/* Section 10 */}
        <Section num={10} title="지적재산권">
          <p className="text-sm mb-3">
            서비스의 디자인, 로고, 소프트웨어, 기술 등 모든 지적재산권은 서비스에 귀속됩니다.
          </p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>이용자는 서비스의 지적재산을 무단으로 복제, 배포, 수정할 수 없습니다.</li>
            <li>서비스 이용이 이용자에게 지적재산권을 부여하는 것은 아닙니다.</li>
          </ul>
        </Section>

        {/* Section 11 */}
        <Section num={11} title="분쟁 해결">
          <p className="text-sm mb-3">
            본 약관과 관련된 분쟁은 대한민국 법률에 따라 해결됩니다.
          </p>
          <p className="text-sm mb-3">
            서비스와 이용자 간에 발생한 분쟁에 대해 소송이 제기되는 경우, 민사소송법상의 관할법원으로 합니다.
          </p>
        </Section>

        {/* Section 12 */}
        <Section num={12} title="문의">
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl my-4">
            <h4 className="text-sm font-semibold text-emerald-900 mb-2">이용약관 관련 문의</h4>
            <p className="text-sm text-emerald-800">
              이메일:{' '}
              <a href="mailto:riroan@naver.com" className="text-emerald-700 hover:underline">
                riroan@naver.com
              </a>
            </p>
          </div>
        </Section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center animate-[fadeInUp_1.3s_ease-out]">
          <p className="text-[13px] text-text-muted">
            © 2026 MONEGER. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
}

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 animate-[fadeInUp_0.7s_ease-out]">
      <h2 className="text-lg font-semibold text-text-primary mb-4 pb-3 border-b border-white/10 flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-7 h-7 bg-gradient-to-br from-accent-mint to-accent-blue rounded-lg text-sm text-white">
          {num}
        </span>
        {title}
      </h2>
      <div className="text-text-secondary">{children}</div>
    </section>
  );
}
