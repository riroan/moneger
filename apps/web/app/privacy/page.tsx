'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { useTheme } from '@/contexts/ThemeContext';
import { MdDarkMode, MdLightMode } from 'react-icons/md';
import Footer from '@/components/layout/Footer';

export default function PrivacyPage() {
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
            개인정보 처리방침
          </h1>
          <span className="inline-block px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-sm text-emerald-700">
            시행일: 2026년 1월 26일
          </span>
        </div>

        {/* Intro */}
        <div className="p-6 bg-white rounded-3xl shadow-lg mb-8 text-[15px] text-slate-600 animate-[fadeInUp_0.6s_ease-out]">
          <p>
            MONEGER(이하 &quot;서비스&quot;)는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수합니다.
            본 개인정보 처리방침을 통해 이용자의 개인정보가 어떻게 수집·이용되고 보호되는지 안내드립니다.
          </p>
        </div>

        {/* Section 1 */}
        <Section num={1} title="수집하는 개인정보">
          <h3 className="text-[15px] font-semibold text-text-primary mt-5 mb-3">필수 수집 항목</h3>
          <div className="overflow-x-auto my-4">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="p-3 text-left border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
                    수집 시점
                  </th>
                  <th className="p-3 text-left border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
                    수집 항목
                  </th>
                  <th className="p-3 text-left border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
                    수집 목적
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-gray-200 bg-white">회원가입</td>
                  <td className="p-3 border border-gray-200 bg-white">
                    이메일, 비밀번호 (단방향 암호화), 닉네임
                  </td>
                  <td className="p-3 border border-gray-200 bg-white">회원 식별 및 서비스 제공</td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 bg-white">서비스 이용</td>
                  <td className="p-3 border border-gray-200 bg-white">
                    수입·지출 내역, 카테고리, 예산 정보
                  </td>
                  <td className="p-3 border border-gray-200 bg-white">서비스 제공</td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 bg-white">자동 수집</td>
                  <td className="p-3 border border-gray-200 bg-white">
                    기기정보, 접속 로그, IP 주소
                  </td>
                  <td className="p-3 border border-gray-200 bg-white">서비스 개선 및 오류 분석</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Section 2 */}
        <Section num={2} title="개인정보 보유 기간">
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li><strong className="text-text-primary">회원 정보:</strong> 회원 탈퇴 시까지</li>
            <li><strong className="text-text-primary">서비스 이용 기록:</strong> 회원 탈퇴 시 즉시 삭제</li>
            <li><strong className="text-text-primary">접속 로그:</strong> 3개월 (통신비밀보호법)</li>
          </ul>
          <p className="text-sm mb-3">
            회원 탈퇴 시 개인정보는 즉시 파기됩니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관 후 파기합니다.
          </p>
        </Section>

        {/* Section 3 */}
        <Section num={3} title="개인정보 제3자 제공">
          <p className="text-sm mb-3">
            서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
          </p>
          <p className="text-sm mb-3">다만, 아래의 경우는 예외로 합니다:</p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 따라 수사기관의 요청이 있는 경우</li>
          </ul>
        </Section>

        {/* Section 4 */}
        <Section num={4} title="이용자의 권리">
          <p className="text-sm mb-3">이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li><strong className="text-text-primary">열람:</strong> 본인의 개인정보 열람 요청</li>
            <li><strong className="text-text-primary">정정:</strong> 잘못된 정보의 정정 요청</li>
            <li><strong className="text-text-primary">삭제:</strong> 개인정보 삭제 요청</li>
            <li><strong className="text-text-primary">탈퇴:</strong> 앱 내 설정에서 회원 탈퇴</li>
          </ul>
          <p className="text-sm mb-3">
            이용자는 개인정보보호법 등 관계 법령에 따라 개인정보에 대한 권리를 행사할 수 있습니다.
          </p>
        </Section>

        {/* Section 5 */}
        <Section num={5} title="개인정보 보호 조치">
          <p className="text-sm mb-3">
            서비스는 이용자의 개인정보를 안전하게 보호하기 위해 다음과 같은 기술적·관리적 조치를 취하고 있습니다.
          </p>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>비밀번호는 단방향 암호화되어 저장됩니다.</li>
            <li>개인정보 전송 시 SSL/TLS 암호화 통신을 적용합니다.</li>
            <li>개인정보에 대한 접근 권한을 최소한의 인원으로 제한합니다.</li>
          </ul>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl my-4 text-[13px] text-amber-700">
            단, 이용자의 부주의로 인한 개인정보 유출에 대해서는 서비스가 책임을 지지 않습니다.
          </div>
        </Section>

        {/* Section 6 */}
        <Section num={6} title="로컬 스토리지">
          <p className="text-sm mb-3">
            서비스는 로그인 유지 및 사용자 설정 저장을 위해 브라우저 로컬 스토리지를 사용합니다.
          </p>
          <div className="overflow-x-auto my-4">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="p-3 text-left border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
                    저장 항목
                  </th>
                  <th className="p-3 text-left border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
                    용도
                  </th>
                  <th className="p-3 text-left border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
                    삭제 시점
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-gray-200 bg-white">userId, userName, userEmail</td>
                  <td className="p-3 border border-gray-200 bg-white">로그인 상태 유지</td>
                  <td className="p-3 border border-gray-200 bg-white">로그아웃 시 자동 삭제</td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 bg-white">theme</td>
                  <td className="p-3 border border-gray-200 bg-white">다크/라이트 모드 설정</td>
                  <td className="p-3 border border-gray-200 bg-white">브라우저 데이터 삭제 시</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul className="list-disc pl-5 my-3 space-y-2 text-sm">
            <li>
              <strong className="text-text-primary">거부 방법:</strong> 브라우저 설정에서 &quot;사이트 데이터&quot; 또는 &quot;로컬 스토리지&quot;를 삭제하거나 차단할 수 있습니다.
            </li>
            <li>로컬 스토리지를 차단하면 로그인 상태 유지 및 테마 설정 기능을 사용할 수 없습니다.</li>
          </ul>
          <p className="text-sm text-text-secondary">
            본 서비스는 쿠키를 사용하지 않습니다.
          </p>
        </Section>

        {/* Section 7 */}
        <Section num={7} title="처리방침 변경">
          <p className="text-sm mb-3">
            개인정보 처리방침이 변경되는 경우 시행 7일 전부터 화면 내 알림을 통해 안내드립니다.
          </p>
        </Section>

        {/* Section 8 */}
        <Section num={8} title="문의">
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl my-4">
            <h4 className="text-sm font-semibold text-emerald-900 mb-2">개인정보 관련 문의</h4>
            <p className="text-sm text-emerald-800">
              이메일:{' '}
              <a href="mailto:riroan@naver.com" className="text-emerald-700 hover:underline">
                riroan@naver.com
              </a>
            </p>
          </div>
        </Section>

        <Footer />
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
